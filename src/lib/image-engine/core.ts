/**
 * Image pipeline shared by the engine worker and the main-thread fallback:
 * decode (EXIF-aware) → crop → rotate/flip → resize (Lanczos3, linear light)
 * → encode with Squoosh codecs (MozJPEG, libwebp, OxiPNG, palette PNG).
 *
 * Works with OffscreenCanvas (worker) or a DOM canvas (old Safari fallback).
 */
import type { EncodeSettings, ImageJob, ImageJobResult, QrResult, ResizeSpec, Transform } from "./types";

type AnyCanvas = OffscreenCanvas | HTMLCanvasElement;
type AnyContext = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

export function makeCanvas(width: number, height: number): AnyCanvas {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function context(canvas: AnyCanvas): AnyContext {
  const ctx = canvas.getContext("2d") as AnyContext | null;
  if (!ctx) throw new Error("Canvas 2D is not available");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

async function canvasToBlob(canvas: AnyCanvas, type: string, quality?: number): Promise<Blob> {
  if ("convertToBlob" in canvas) return canvas.convertToBlob({ type, quality });
  return new Promise((resolve, reject) =>
    (canvas as HTMLCanvasElement).toBlob((b) => (b ? resolve(b) : reject(new Error("Encode failed"))), type, quality),
  );
}

// ── Decode ────────────────────────────────────────────────────────────────

export type Source = ImageBitmap;

/**
 * Largest canvas we may allocate. iOS/iPadOS Safari silently fails above
 * 16,777,216 px (it yields blank output), so cap there everywhere WebKit runs.
 */
export const MAX_CANVAS_PIXELS = (() => {
  if (typeof navigator === "undefined") return 16_777_216;
  const ua = navigator.userAgent;
  const webkitOnly = /AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua);
  return webkitOnly || /iPhone|iPad|iPod/.test(ua) ? 16_777_216 : 120_000_000;
})();

/** Decode with EXIF orientation applied, downscaled if it exceeds the canvas budget. */
export async function decode(input: Blob | ImageBitmap): Promise<Source> {
  if (typeof ImageBitmap !== "undefined" && input instanceof ImageBitmap) return input;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(input as Blob, { imageOrientation: "from-image" });
  } catch {
    // Older engines reject the options bag.
    bitmap = await createImageBitmap(input as Blob);
  }
  const pixels = bitmap.width * bitmap.height;
  if (pixels > MAX_CANVAS_PIXELS) {
    const k = Math.sqrt(MAX_CANVAS_PIXELS / pixels) * 0.999;
    const fitted = await shrink(bitmap, Math.floor(bitmap.width * k), Math.floor(bitmap.height * k));
    bitmap.close();
    return fitted;
  }
  return bitmap;
}

/** Downscale a bitmap with the browser's own (fast, off-thread) resampler. */
async function shrink(source: Source, width: number, height: number): Promise<Source> {
  try {
    return await createImageBitmap(source, {
      resizeWidth: Math.max(1, Math.round(width)),
      resizeHeight: Math.max(1, Math.round(height)),
      resizeQuality: "high",
    });
  } catch {
    const canvas = makeCanvas(width, height);
    context(canvas).drawImage(source, 0, 0, canvas.width, canvas.height);
    return createImageBitmap(canvas);
  }
}

// ── Geometry ──────────────────────────────────────────────────────────────

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Output size and (for cover) the centred source region to use. */
export function planResize(srcW: number, srcH: number, spec: ResizeSpec): { width: number; height: number; region: Box } {
  const full: Box = { x: 0, y: 0, width: srcW, height: srcH };
  const W = Math.max(1, Math.round(spec.width || srcW));
  const H = Math.max(1, Math.round(spec.height || srcH));
  const noEnlarge = spec.withoutEnlargement !== false;
  if (spec.fit === "stretch") {
    return { width: noEnlarge ? Math.min(W, srcW) : W, height: noEnlarge ? Math.min(H, srcH) : H, region: full };
  }
  if (spec.fit === "cover") {
    // Crop the source to the target aspect ratio, then scale.
    const target = W / H;
    let rw = srcW;
    let rh = srcW / target;
    if (rh > srcH) {
      rh = srcH;
      rw = srcH * target;
    }
    const region = { x: (srcW - rw) / 2, y: (srcH - rh) / 2, width: rw, height: rh };
    const scale = noEnlarge ? Math.min(1, W / rw) : W / rw;
    return { width: Math.max(1, Math.round(rw * scale)), height: Math.max(1, Math.round(rh * scale)), region };
  }
  let scale = Math.min(W / srcW, H / srcH);
  if (noEnlarge) scale = Math.min(1, scale);
  return { width: Math.max(1, Math.round(srcW * scale)), height: Math.max(1, Math.round(srcH * scale)), region: full };
}

// ── Resampling ────────────────────────────────────────────────────────────

let resizeModule: typeof import("@jsquash/resize") | null = null;

async function lanczos(data: ImageData, width: number, height: number): Promise<ImageData> {
  if (!resizeModule) resizeModule = await import("@jsquash/resize");
  return resizeModule.default(data, {
    width,
    height,
    method: "lanczos3",
    fitMethod: "stretch",
    premultiply: true,
    linearRGB: true,
  });
}

function imageDataOf(source: CanvasImageSource, region: Box): ImageData {
  const canvas = makeCanvas(region.width, region.height);
  const ctx = context(canvas);
  ctx.drawImage(source, region.x, region.y, region.width, region.height, 0, 0, canvas.width, canvas.height);
  return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

/** Scale `region` of `source` to exactly width × height with high quality. */
async function resample(source: Source, region: Box, width: number, height: number): Promise<ImageData> {
  const sameSize = Math.round(region.width) === width && Math.round(region.height) === height;
  if (sameSize) return imageDataOf(source, region);
  let src: Source = source;
  let box = region;
  // Huge downscales: let the browser get within 2× first, so Lanczos works on a
  // reasonable buffer (and we never allocate a 50 MP ImageData).
  const factor = Math.min(region.width / width, region.height / height);
  if (factor > 2.5) {
    const cropped = await createImageBitmap(source, region.x, region.y, region.width, region.height);
    src = await shrink(cropped, width * 2, height * 2);
    cropped.close();
    box = { x: 0, y: 0, width: src.width, height: src.height };
  }
  const data = imageDataOf(src, box);
  if (src !== source) src.close();
  try {
    return await lanczos(data, width, height);
  } catch {
    // WASM unavailable: canvas smoothing is the fallback.
    const canvas = makeCanvas(width, height);
    const ctx = context(canvas);
    const tmp = makeCanvas(data.width, data.height);
    context(tmp).putImageData(data, 0, 0);
    ctx.drawImage(tmp, 0, 0, width, height);
    return ctx.getImageData(0, 0, width, height);
  }
}

// ── Transform ─────────────────────────────────────────────────────────────

function isRightAngle(deg: number) {
  return ((deg % 90) + 90) % 90 === 0;
}

/** Apply crop/rotate/flip/resize; returns RGBA pixels. */
export async function applyTransform(source: Source, transform: Transform = {}): Promise<ImageData> {
  const crop: Box = transform.crop
    ? {
        x: Math.max(0, Math.min(source.width - 1, Math.round(transform.crop.x))),
        y: Math.max(0, Math.min(source.height - 1, Math.round(transform.crop.y))),
        width: Math.round(transform.crop.width),
        height: Math.round(transform.crop.height),
      }
    : { x: 0, y: 0, width: source.width, height: source.height };
  crop.width = Math.max(1, Math.min(crop.width, source.width - crop.x));
  crop.height = Math.max(1, Math.min(crop.height, source.height - crop.y));

  const deg = (((transform.rotate ?? 0) % 360) + 360) % 360;
  const flip = transform.flipH || transform.flipV;
  let current: Source = source;
  let region = crop;

  // Rotation / flip need a new raster; do it before resizing so the resize
  // spec refers to the final orientation.
  if (deg !== 0 || flip) {
    const rad = (deg * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const w = isRightAngle(deg) && deg % 180 !== 0 ? crop.height : Math.ceil(crop.width * cos + crop.height * sin - 1e-6);
    const h = isRightAngle(deg) && deg % 180 !== 0 ? crop.width : Math.ceil(crop.width * sin + crop.height * cos - 1e-6);
    const canvas = makeCanvas(w, h);
    const ctx = context(canvas);
    if (transform.background && !isRightAngle(deg)) {
      ctx.fillStyle = transform.background;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.translate(w / 2, h / 2);
    ctx.rotate(rad);
    ctx.scale(transform.flipH ? -1 : 1, transform.flipV ? -1 : 1);
    ctx.drawImage(source, crop.x, crop.y, crop.width, crop.height, -crop.width / 2, -crop.height / 2, crop.width, crop.height);
    current = await createImageBitmap(canvas);
    region = { x: 0, y: 0, width: w, height: h };
  }

  let out: ImageData;
  if (transform.resize) {
    const plan = planResize(region.width, region.height, transform.resize);
    const r = { ...plan.region, x: plan.region.x + region.x, y: plan.region.y + region.y };
    out = await resample(current, r, plan.width, plan.height);
  } else {
    out = imageDataOf(current, region);
  }
  if (current !== source) current.close();

  if (transform.background) flattenInPlace(out, transform.background);
  return out;
}

// ── Colour helpers ────────────────────────────────────────────────────────

function parseColor(color: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(color.trim());
  if (m) {
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const s = /^#?([0-9a-f]{3})$/i.exec(color.trim());
  if (s) return [0, 1, 2].map((i) => parseInt(s[1][i] + s[1][i], 16)) as [number, number, number];
  return [255, 255, 255];
}

/** Composite every pixel over a solid colour (alpha → 255). */
export function flattenInPlace(data: ImageData, color: string) {
  const [br, bg, bb] = parseColor(color);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const a = px[i + 3];
    if (a === 255) continue;
    const f = a / 255;
    px[i] = px[i] * f + br * (1 - f);
    px[i + 1] = px[i + 1] * f + bg * (1 - f);
    px[i + 2] = px[i + 2] * f + bb * (1 - f);
    px[i + 3] = 255;
  }
}

function hasTransparency(data: ImageData): boolean {
  const px = data.data;
  for (let i = 3; i < px.length; i += 4) if (px[i] < 255) return true;
  return false;
}

// ── Encoders ──────────────────────────────────────────────────────────────

async function encodeJpeg(data: ImageData, quality: number): Promise<Uint8Array> {
  const { default: encode } = await import("@jsquash/jpeg/encode");
  const buf = await encode(data, { quality: Math.round(Math.max(1, Math.min(100, quality * 100))), progressive: true, optimize_coding: true });
  return new Uint8Array(buf);
}

async function encodeWebp(data: ImageData, quality: number): Promise<Uint8Array> {
  const { default: encode } = await import("@jsquash/webp/encode");
  const lossless = quality >= 1;
  const buf = await encode(data, lossless ? { lossless: 1, quality: 100, exact: 0 } : { quality: Math.round(Math.max(1, quality * 100)), method: 4, alpha_quality: 100 });
  return new Uint8Array(buf);
}

async function rawPng(data: ImageData): Promise<Uint8Array> {
  const canvas = makeCanvas(data.width, data.height);
  context(canvas).putImageData(data, 0, 0);
  return new Uint8Array(await (await canvasToBlob(canvas, "image/png")).arrayBuffer());
}

let oxipngModule: { optimise: (data: Uint8Array, level: number, interlace: boolean, optimiseAlpha: boolean) => Uint8Array } | null = null;

async function optimisePng(png: Uint8Array, pixels: number): Promise<Uint8Array> {
  try {
    if (!oxipngModule) {
      // Single-threaded build: the parallel one needs nested-worker thread pools.
      const mod = await import("@jsquash/oxipng/codec/pkg/squoosh_oxipng.js");
      await mod.default();
      oxipngModule = mod as unknown as typeof oxipngModule;
    }
    const level = pixels > 4_000_000 ? 1 : 2;
    const out = oxipngModule!.optimise(png, level, false, true);
    return out.length < png.length ? out : png;
  } catch {
    return png;
  }
}

export async function encode(data: ImageData, settings: EncodeSettings): Promise<{ bytes: Uint8Array; quality: number }> {
  const q = Math.max(0.01, Math.min(1, settings.quality));
  switch (settings.format) {
    case "image/jpeg": {
      if (hasTransparency(data)) flattenInPlace(data, "#ffffff");
      return { bytes: await encodeJpeg(data, q), quality: q };
    }
    case "image/webp":
      return { bytes: await encodeWebp(data, q), quality: q };
    default: {
      const pixels = data.width * data.height;
      if (settings.pngLossy) {
        const { encodePalettePng } = await import("./palette-png");
        const indexed = await encodePalettePng(data, settings.pngColors ?? 256);
        // OxiPNG squeezes a few more percent out of smaller images.
        return { bytes: pixels <= 4_000_000 ? await optimisePng(indexed, pixels) : indexed, quality: 1 };
      }
      const png = await rawPng(data);
      return { bytes: pixels <= 12_000_000 ? await optimisePng(png, pixels) : png, quality: 1 };
    }
  }
}

/** Highest quality whose output fits targetBytes (binary search, ≤7 encodes). */
async function encodeToTarget(data: ImageData, settings: EncodeSettings, targetBytes: number) {
  let lo = 0.05;
  let hi = Math.min(1, settings.quality);
  let best = await encode(cloneData(data), { ...settings, quality: hi });
  if (best.bytes.length <= targetBytes) return best;
  let smallest = best;
  for (let i = 0; i < 7; i++) {
    const mid = (lo + hi) / 2;
    const attempt = await encode(cloneData(data), { ...settings, quality: mid });
    if (attempt.bytes.length < smallest.bytes.length) smallest = attempt;
    if (attempt.bytes.length <= targetBytes) {
      best = attempt;
      lo = mid;
    } else {
      hi = mid;
    }
    if (hi - lo < 0.02) break;
  }
  return best.bytes.length <= targetBytes ? best : smallest;
}

function cloneData(data: ImageData): ImageData {
  return new ImageData(new Uint8ClampedArray(data.data), data.width, data.height);
}

// ── Job ───────────────────────────────────────────────────────────────────

function changesPixels(t: Transform | undefined, srcW: number, srcH: number, outW: number, outH: number) {
  if (!t) return false;
  return Boolean(t.crop || t.flipH || t.flipV || ((t.rotate ?? 0) % 360 !== 0) || outW !== srcW || outH !== srcH);
}

export async function runJob(job: ImageJob): Promise<ImageJobResult> {
  const source = await decode(job.input);
  const sourceWidth = source.width;
  const sourceHeight = source.height;
  try {
    const transform: Transform = { ...job.transform };
    const data = await applyTransform(source, transform);
    const width = data.width;
    const height = data.height;
    const encoded =
      job.encode.targetBytes && job.encode.format !== "image/png"
        ? await encodeToTarget(data, job.encode, job.encode.targetBytes)
        : await encode(data, job.encode);
    let blob: Blob = new Blob([encoded.bytes as BlobPart], { type: job.encode.format });
    let keptOriginal = false;
    if (
      job.keepOriginalIfLarger &&
      job.input instanceof Blob &&
      job.input.type === job.encode.format &&
      blob.size >= job.input.size &&
      !changesPixels(job.transform, sourceWidth, sourceHeight, width, height)
    ) {
      blob = job.input;
      keptOriginal = true;
    }
    return { blob, width, height, sourceWidth, sourceHeight, keptOriginal, quality: encoded.quality };
  } finally {
    if (!(typeof ImageBitmap !== "undefined" && job.input instanceof ImageBitmap)) source.close();
  }
}

/** Small preview image (fast path, browser encoder). */
export async function thumbnail(input: Blob | ImageBitmap, maxSide: number): Promise<{ blob: Blob; width: number; height: number }> {
  const source = await decode(input);
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));
  const small = scale < 1 ? await shrink(source, w, h) : source;
  const canvas = makeCanvas(w, h);
  context(canvas).drawImage(small, 0, 0, w, h);
  if (small !== source) small.close();
  const result = { blob: await canvasToBlob(canvas, "image/webp", 0.85), width: source.width, height: source.height };
  if (!(input instanceof ImageBitmap)) source.close();
  return result;
}

// ── QR ────────────────────────────────────────────────────────────────────

interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<{ rawValue: string; cornerPoints?: { x: number; y: number }[] }[]>;
}

export async function decodeQr(input: Blob | ImageBitmap): Promise<QrResult | null> {
  const source = await decode(input);
  try {
    const BD = (globalThis as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => BarcodeDetectorLike }).BarcodeDetector;
    if (BD) {
      try {
        const found = await new BD({ formats: ["qr_code"] }).detect(source);
        if (found[0]?.rawValue) return { text: found[0].rawValue, corners: found[0].cornerPoints };
      } catch {
        // fall through to jsQR
      }
    }
    const { default: jsQR } = await import("jsqr");
    const longest = Math.max(source.width, source.height);
    // QR finders work best on ~1000 px images; try a few scales.
    const sizes = Array.from(new Set([1000, 1600, 700, longest].filter((s) => s <= longest)));
    for (const size of sizes) {
      const scale = size / longest;
      const w = Math.max(1, Math.round(source.width * scale));
      const h = Math.max(1, Math.round(source.height * scale));
      const c = makeCanvas(w, h);
      const ctx = context(c);
      ctx.drawImage(source, 0, 0, w, h);
      const sized = ctx.getImageData(0, 0, w, h);
      const hit = jsQR(sized.data, sized.width, sized.height, { inversionAttempts: "attemptBoth" });
      if (hit?.data) {
        const loc = hit.location;
        const k = 1 / scale;
        return {
          text: hit.data,
          corners: [loc.topLeftCorner, loc.topRightCorner, loc.bottomRightCorner, loc.bottomLeftCorner].map((p) => ({ x: p.x * k, y: p.y * k })),
        };
      }
    }
    return null;
  } finally {
    if (!(input instanceof ImageBitmap)) source.close();
  }
}
