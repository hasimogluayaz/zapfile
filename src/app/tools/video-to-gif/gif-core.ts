/**
 * Pure GIF helpers shared by the encoder worker (and testable in Node).
 * Encoding itself is done by `gifenc` (LZW + container); this file only adds
 * palette sampling, Floyd–Steinberg dithering and frame timing.
 */
import { GIFEncoder, applyPalette, quantize, type GIFEncoderInstance, type Palette } from "gifenc";

export type PaletteMode = "global" | "local";

export interface GifJob {
  width: number;
  height: number;
  colors: number;
  mode: PaletteMode;
  dither: boolean;
  /** gifenc convention: 0 = loop forever, -1 = play once (no NETSCAPE block), n = n extra plays. */
  repeat: number;
  /** Delay of each frame in centiseconds. */
  delaysCs: number[];
}

/** Map a UI loop choice to gifenc's `repeat` option. */
export function repeatFor(loop: "forever" | "once" | number): number {
  if (loop === "forever") return 0;
  if (loop === "once") return -1;
  return Math.max(0, Math.round(loop) - 1);
}

/**
 * Per-frame delays in centiseconds that add up exactly to the clip length,
 * so 15 fps (6.67 cs) doesn't drift to 7 cs × n.
 */
export function frameDelaysCs(frameCount: number, fps: number): number[] {
  const per = 100 / fps;
  const out: number[] = [];
  for (let i = 0; i < frameCount; i++) {
    out.push(Math.max(2, Math.round((i + 1) * per) - Math.round(i * per)));
  }
  return out;
}

/** Build one palette from several sample frames (subsampled to ~600k pixels). */
export function paletteFromSamples(samples: Uint8ClampedArray[], colors: number): Palette {
  const total = samples.reduce((n, s) => n + s.length / 4, 0);
  const budget = 600_000;
  const step = Math.max(1, Math.ceil(total / budget));
  const out = new Uint8ClampedArray(Math.ceil(total / step) * 4 + 4);
  let o = 0;
  for (const s of samples) {
    for (let p = 0; p < s.length; p += 4 * step) {
      out[o++] = s[p];
      out[o++] = s[p + 1];
      out[o++] = s[p + 2];
      out[o++] = 255;
    }
  }
  return quantize(out.subarray(0, o), colors);
}

function nearest(palette: Palette, r: number, g: number, b: number): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < palette.length; i++) {
    const c = palette[i];
    const dr = r - c[0];
    const dg = g - c[1];
    const db = b - c[2];
    const d = dr * dr * 2 + dg * dg * 4 + db * db * 3;
    if (d < bestD) {
      bestD = d;
      best = i;
      if (d === 0) break;
    }
  }
  return best;
}

/** Floyd–Steinberg dithering onto a fixed palette (serpentine scan). */
export function ditherToPalette(rgba: Uint8ClampedArray, width: number, height: number, palette: Palette): Uint8Array {
  const out = new Uint8Array(width * height);
  const cache = new Int16Array(1 << 18).fill(-1); // 6 bits per channel
  let cur = new Float32Array((width + 2) * 3);
  let next = new Float32Array((width + 2) * 3);
  const strength = 0.85; // a little under 1 keeps noise (and file size) down
  for (let y = 0; y < height; y++) {
    next.fill(0);
    const ltr = (y & 1) === 0;
    for (let n = 0; n < width; n++) {
      const x = ltr ? n : width - 1 - n;
      const i = y * width + x;
      const p = i * 4;
      const e = (x + 1) * 3;
      const r = Math.max(0, Math.min(255, rgba[p] + cur[e]));
      const g = Math.max(0, Math.min(255, rgba[p + 1] + cur[e + 1]));
      const b = Math.max(0, Math.min(255, rgba[p + 2] + cur[e + 2]));
      const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
      let idx = cache[key];
      if (idx < 0) {
        idx = nearest(palette, r, g, b);
        cache[key] = idx;
      }
      out[i] = idx;
      const c = palette[idx];
      const er = (r - c[0]) * strength;
      const eg = (g - c[1]) * strength;
      const eb = (b - c[2]) * strength;
      const fwd = ltr ? 3 : -3;
      // right (in scan direction)
      cur[e + fwd] += (er * 7) / 16;
      cur[e + fwd + 1] += (eg * 7) / 16;
      cur[e + fwd + 2] += (eb * 7) / 16;
      // below-back, below, below-forward
      next[e - fwd] += (er * 3) / 16;
      next[e - fwd + 1] += (eg * 3) / 16;
      next[e - fwd + 2] += (eb * 3) / 16;
      next[e] += (er * 5) / 16;
      next[e + 1] += (eg * 5) / 16;
      next[e + 2] += (eb * 5) / 16;
      next[e + fwd] += er / 16;
      next[e + fwd + 1] += eg / 16;
      next[e + fwd + 2] += eb / 16;
    }
    const tmp = cur;
    cur = next;
    next = tmp;
  }
  return out;
}

/** Streaming encoder: feed frames in order, then `finish()`. */
export class GifStream {
  private enc: GIFEncoderInstance = GIFEncoder();
  private palette: Palette | null = null;
  private index = 0;

  constructor(private job: GifJob) {}

  /** Global mode: build the shared palette from sample frames before the first frame. */
  setSamples(samples: Uint8ClampedArray[]) {
    if (this.job.mode === "global" && samples.length) this.palette = paletteFromSamples(samples, this.job.colors);
  }

  addFrame(rgba: Uint8ClampedArray) {
    const { width, height, colors, mode, dither, repeat, delaysCs } = this.job;
    let palette: Palette;
    if (mode === "local" || !this.palette) {
      palette = quantize(rgba, colors);
      if (mode === "global") this.palette = palette; // no samples: first frame defines it
    } else {
      palette = this.palette;
    }
    const indexed = dither ? ditherToPalette(rgba, width, height, palette) : applyPalette(rgba, palette);
    const first = this.index === 0;
    const delay = (delaysCs[this.index] ?? delaysCs[delaysCs.length - 1] ?? 10) * 10;
    this.enc.writeFrame(indexed, width, height, {
      // Global mode: palette only on frame 0 (becomes the global table).
      // Local mode: every frame carries its own table.
      palette: first || mode === "local" ? palette : undefined,
      delay,
      repeat,
    });
    this.index++;
  }

  finish(): Uint8Array {
    this.enc.finish();
    return this.enc.bytes();
  }
}
