/**
 * Photo filter pixel pipeline. Pure and resolution-independent (radii scale
 * with the image), so the on-screen proxy and the full-resolution export in
 * the worker produce the same look. No DOM access: runs in workers too.
 */
import { gaussianBlurRGBA } from "@/lib/image-editor-kit-pixels";

export const PRESETS = [
  "original",
  "grayscale",
  "sepia",
  "vintage",
  "bright",
  "contrast",
  "warm",
  "cold",
  "fade",
  "saturate",
  "invert",
  "blur",
] as const;
export type PresetKey = (typeof PRESETS)[number];

export interface Adjust {
  exposure: number; // -100..100 (±2 EV)
  contrast: number; // -100..100
  highlights: number; // -100..100
  shadows: number; // -100..100
  saturation: number; // -100..100
  warmth: number; // -100..100
  tint: number; // -100..100 (green ↔ magenta)
  vignette: number; // 0..100
  sharpen: number; // 0..100
}

export const ADJUST_KEYS = [
  "exposure",
  "contrast",
  "highlights",
  "shadows",
  "saturation",
  "warmth",
  "tint",
  "vignette",
  "sharpen",
] as const satisfies readonly (keyof Adjust)[];

export const ZERO_ADJUST: Adjust = {
  exposure: 0,
  contrast: 0,
  highlights: 0,
  shadows: 0,
  saturation: 0,
  warmth: 0,
  tint: 0,
  vignette: 0,
  sharpen: 0,
};

export interface FilterSettings {
  preset: PresetKey;
  /** 0..100: blend amount, or blur strength for the "blur" preset. */
  intensity: number;
  adjust: Adjust;
}

export function isIdentity(s: FilterSettings): boolean {
  const presetOff = s.preset === "original" || s.intensity === 0;
  return presetOff && ADJUST_KEYS.every((k) => s.adjust[k] === 0);
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/** Per-channel lookup tables for white balance + tone (exposure, curves, contrast). */
function buildLuts(a: Adjust): [Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray] {
  const gain = [1 + a.warmth * 0.0016, 1 - a.tint * 0.0012, 1 - a.warmth * 0.0016];
  const ev = Math.pow(2, (a.exposure / 100) * 2);
  const sh = a.shadows / 100;
  const hi = a.highlights / 100;
  const c = a.contrast / 100;
  const k = c >= 0 ? 1 + c * 0.9 : 1 + c * 0.7;
  return gain.map((g) => {
    const lut = new Uint8ClampedArray(256);
    for (let v = 0; v < 256; v++) {
      let x = clamp01((v / 255) * g);
      if (ev !== 1) {
        const lin = Math.pow(x, 2.2) * ev;
        // Soft shoulder so +EV rolls off instead of clipping hard.
        x = Math.pow(lin > 0.85 ? 0.85 + (1 - Math.exp(-(lin - 0.85) / 0.15)) * 0.15 : lin, 1 / 2.2);
      }
      if (sh) x += sh * 1.25 * x * (1 - x) * (1 - x);
      if (hi) x += hi * 1.25 * x * x * (1 - x);
      if (c) {
        // S-curve for positive contrast, flat line for negative.
        x = clamp01(x);
        if (c > 0) {
          const s = x * x * (3 - 2 * x);
          x = x + (s - x) * c * 0.6;
          x = 0.5 + (x - 0.5) * (1 + c * 0.25);
        } else {
          x = 0.5 + (x - 0.5) * k;
        }
      }
      lut[v] = Math.round(clamp01(x) * 255);
    }
    return lut;
  }) as [Uint8ClampedArray, Uint8ClampedArray, Uint8ClampedArray];
}

const out3 = [0, 0, 0];

/** Preset colour transform for one pixel, written to out3. */
function presetPixel(key: PresetKey, r: number, g: number, b: number): void {
  switch (key) {
    case "grayscale": {
      const y = 0.2126 * r + 0.7152 * g + 0.0722 * b; // Rec. 709 luma
      out3[0] = out3[1] = out3[2] = y;
      return;
    }
    case "sepia":
      out3[0] = r * 0.393 + g * 0.769 + b * 0.189;
      out3[1] = r * 0.349 + g * 0.686 + b * 0.168;
      out3[2] = r * 0.272 + g * 0.534 + b * 0.131;
      return;
    case "vintage": {
      const sr = r * 0.393 + g * 0.769 + b * 0.189;
      const sg = r * 0.349 + g * 0.686 + b * 0.168;
      const sb = r * 0.272 + g * 0.534 + b * 0.131;
      out3[0] = (r * 0.4 + sr * 0.6) * 0.86 + 26;
      out3[1] = (g * 0.4 + sg * 0.6) * 0.86 + 20;
      out3[2] = (b * 0.4 + sb * 0.6) * 0.82 + 18;
      return;
    }
    case "bright":
      out3[0] = 255 * Math.pow(r / 255, 0.72);
      out3[1] = 255 * Math.pow(g / 255, 0.72);
      out3[2] = 255 * Math.pow(b / 255, 0.72);
      return;
    case "contrast": {
      const f = (v: number) => {
        const x = v / 255;
        const s = x * x * (3 - 2 * x);
        return 255 * (0.5 + (x + (s - x) - 0.5) * 1.2);
      };
      out3[0] = f(r);
      out3[1] = f(g);
      out3[2] = f(b);
      return;
    }
    case "warm":
      out3[0] = r * 1.1 + 6;
      out3[1] = g * 1.02;
      out3[2] = b * 0.84;
      return;
    case "cold":
      out3[0] = r * 0.86;
      out3[1] = g * 1.0;
      out3[2] = b * 1.1 + 6;
      return;
    case "fade":
      out3[0] = r * 0.8 + 40;
      out3[1] = g * 0.8 + 40;
      out3[2] = b * 0.8 + 44;
      return;
    case "saturate": {
      const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      out3[0] = y + (r - y) * 1.8;
      out3[1] = y + (g - y) * 1.8;
      out3[2] = y + (b - y) * 1.8;
      return;
    }
    case "invert":
      out3[0] = 255 - r;
      out3[1] = 255 - g;
      out3[2] = 255 - b;
      return;
    default:
      out3[0] = r;
      out3[1] = g;
      out3[2] = b;
  }
}

/**
 * Apply the full pipeline in place. A generator so callers can yield between
 * steps: it yields progress 0..1 after every chunk of rows.
 */
export function* processSteps(data: Uint8ClampedArray, w: number, h: number, s: FilterSettings): Generator<number> {
  const long = Math.max(w, h);
  const a = s.adjust;
  const k = s.intensity / 100;

  // 1. Neighbourhood preset (blur), radius relative to the image.
  if (s.preset === "blur" && k > 0) {
    gaussianBlurRGBA(data, w, h, k * 0.012 * long);
    yield 0.2;
  }

  // 2. Per-pixel colour work.
  const colorPreset = s.preset !== "original" && s.preset !== "blur" && k > 0 ? s.preset : null;
  const tone = a.exposure || a.contrast || a.highlights || a.shadows || a.warmth || a.tint;
  const [lr, lg, lb] = tone ? buildLuts(a) : [null, null, null];
  const satK = 1 + a.saturation / 100;
  const vig = a.vignette / 100 + (s.preset === "vintage" ? 0.45 * k : 0);
  const doSat = satK !== 1;
  if (colorPreset || tone || doSat || vig > 0) {
    const chunk = Math.max(16, Math.floor(400_000 / Math.max(1, w)));
    for (let y0 = 0; y0 < h; y0 += chunk) {
      const y1 = Math.min(h, y0 + chunk);
      for (let y = y0; y < y1; y++) {
        const dy = ((y + 0.5) / h) * 2 - 1;
        let i = y * w * 4;
        for (let x = 0; x < w; x++, i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];
          if (colorPreset) {
            presetPixel(colorPreset, r, g, b);
            r += (out3[0] - r) * k;
            g += (out3[1] - g) * k;
            b += (out3[2] - b) * k;
          }
          if (lr) {
            r = lr[r < 0 ? 0 : r > 255 ? 255 : r | 0];
            g = lg![g < 0 ? 0 : g > 255 ? 255 : g | 0];
            b = lb![b < 0 ? 0 : b > 255 ? 255 : b | 0];
          }
          if (doSat) {
            const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            r = l + (r - l) * satK;
            g = l + (g - l) * satK;
            b = l + (b - l) * satK;
          }
          if (vig > 0) {
            const dx = ((x + 0.5) / w) * 2 - 1;
            const d = Math.sqrt((dx * dx + dy * dy) / 2);
            let t = (d - 0.3) / 0.7;
            if (t > 0) {
              if (t > 1) t = 1;
              const f = 1 - vig * 0.75 * t * t * (3 - 2 * t);
              r *= f;
              g *= f;
              b *= f;
            }
          }
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
        }
      }
      yield 0.2 + 0.6 * (y1 / h);
    }
  }

  // 3. Sharpen (unsharp mask), radius relative to the image.
  if (a.sharpen > 0) {
    const blurred = new Uint8ClampedArray(data);
    gaussianBlurRGBA(blurred, w, h, Math.max(0.7, long * 0.0007));
    yield 0.9;
    const amt = (a.sharpen / 100) * 1.6;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = data[i] + (data[i] - blurred[i]) * amt;
      data[i + 1] = data[i + 1] + (data[i + 1] - blurred[i + 1]) * amt;
      data[i + 2] = data[i + 2] + (data[i + 2] - blurred[i + 2]) * amt;
    }
  }
  yield 1;
}

/** Run the pipeline synchronously (small previews and thumbnails). */
export function processAll(data: Uint8ClampedArray, w: number, h: number, s: FilterSettings): void {
  const it = processSteps(data, w, h, s);
  while (!it.next().done) {
    /* drain */
  }
}
