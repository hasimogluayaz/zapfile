/**
 * Shared helpers for the image tools (resize, convert, rotate, crop):
 * format choice, collision-free names, alpha/animation detection, main-thread
 * decode fallbacks (HEIC on Safari) and feature-detected AVIF encoding.
 *
 * Heavy pixel work goes through `@/lib/image-engine`; everything here is
 * either tiny (thumbnail-sized) or a single GPU drawImage.
 */
import { extensionFor, type OutputFormat } from "@/lib/image-engine";
import { getFileExtension, getFileNameWithoutExtension } from "@/lib/utils";

export type { OutputFormat };
export type AnyFormat = OutputFormat | "image/avif";

/** Largest side we allow for an output image. */
export const MAX_SIDE = 8192;

/** iOS/iPadOS Safari silently fails above 16.7 MP canvases; elsewhere allow more. */
export const MAX_PIXELS = (() => {
  if (typeof navigator === "undefined") return 16_777_216;
  const ua = navigator.userAgent;
  const webkitOnly = /AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua);
  return webkitOnly || /iPhone|iPad|iPod/.test(ua) ? 16_777_216 : 100_000_000;
})();

export function formatLabel(f: AnyFormat): string {
  if (f === "image/jpeg") return "JPG";
  if (f === "image/webp") return "WebP";
  if (f === "image/avif") return "AVIF";
  return "PNG";
}

export function extOf(f: AnyFormat): string {
  return f === "image/avif" ? "avif" : extensionFor(f);
}

/** Lower-case extension without the dot ("jpg", "heic", …). */
export function kindOf(file: File): string {
  const ext = getFileExtension(file.name).replace(".", "");
  if (ext === "jpeg" || ext === "jfif") return "jpg";
  if (ext === "heif") return "heic";
  if (ext) return ext;
  return (file.type.split("/")[1] ?? "").replace("jpeg", "jpg");
}

export function sourceLabel(file: File): string {
  const k = kindOf(file);
  return k === "webp" ? "WebP" : k.toUpperCase();
}

/** Formats that can carry an alpha channel. */
export function canHaveAlpha(file: File): boolean {
  return ["png", "webp", "gif", "avif", "bmp", "ico", "svg"].includes(kindOf(file));
}

/**
 * "Keep format": the input's own format when we can write it, otherwise the
 * closest one that keeps quality and transparency (GIF/BMP → PNG, AVIF → WebP).
 */
export function keepFormatFor(file: File, hasAlpha?: boolean): OutputFormat {
  const k = kindOf(file);
  if (k === "jpg") return "image/jpeg";
  if (k === "png") return "image/png";
  if (k === "webp") return "image/webp";
  if (k === "avif") return "image/webp";
  if (k === "heic") return hasAlpha ? "image/png" : "image/jpeg";
  return "image/png";
}

/** Returns a function that hands out names unique within one download set. */
export function uniqueNamer() {
  const used = new Set<string>();
  return (name: string) => {
    let candidate = name;
    const dot = name.lastIndexOf(".");
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : "";
    for (let n = 2; used.has(candidate.toLowerCase()); n++) candidate = `${base} (${n})${ext}`;
    used.add(candidate.toLowerCase());
    return candidate;
  };
}

export function outputName(file: File, suffix: string, format: AnyFormat): string {
  return `${getFileNameWithoutExtension(file.name)}${suffix}.${extOf(format)}`;
}

/** STORE-only ZIP (images are already compressed). */
export async function zipFiles(entries: { name: string; blob: Blob }[]): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const name = uniqueNamer();
  for (const e of entries) zip.file(name(e.name), e.blob);
  return zip.generateAsync({ type: "blob", compression: "STORE" });
}

// ── Canvas helpers (main thread, small or single-draw only) ───────────────

type Canvas2D = OffscreenCanvas | HTMLCanvasElement;

export function makeCanvas(w: number, h: number): Canvas2D {
  const width = Math.max(1, Math.round(w));
  const height = Math.max(1, Math.round(h));
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(width, height);
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  return c;
}

export function ctx2d(c: Canvas2D) {
  const ctx = c.getContext("2d") as CanvasRenderingContext2D | null;
  if (!ctx) throw new Error("Canvas 2D unavailable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

export function canvasBlob(c: Canvas2D, type: string, quality?: number): Promise<Blob> {
  if ("convertToBlob" in c) return c.convertToBlob({ type, quality });
  return new Promise((resolve, reject) =>
    (c as HTMLCanvasElement).toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), type, quality),
  );
}

/** True when a (thumbnail-sized) image has any pixel that isn't fully opaque. */
export async function detectAlpha(blob: Blob): Promise<boolean> {
  try {
    const bmp = await createImageBitmap(blob);
    const c = makeCanvas(bmp.width, bmp.height);
    const ctx = ctx2d(c);
    ctx.drawImage(bmp, 0, 0);
    bmp.close();
    const px = ctx.getImageData(0, 0, c.width, c.height).data;
    for (let i = 3; i < px.length; i += 4) if (px[i] < 255) return true;
    return false;
  } catch {
    return false;
  }
}

/** Decode on the main thread (covers formats the worker can't, e.g. HEIC in Safari), EXIF-aware and pixel-capped. */
export async function decodeOnMain(file: Blob, maxPixels = MAX_PIXELS): Promise<ImageBitmap> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      bmp = await createImageBitmap(img);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  const px = bmp.width * bmp.height;
  if (px > maxPixels) {
    const k = Math.sqrt(maxPixels / px) * 0.999;
    const small = await createImageBitmap(bmp, {
      resizeWidth: Math.max(1, Math.floor(bmp.width * k)),
      resizeHeight: Math.max(1, Math.floor(bmp.height * k)),
      resizeQuality: "high",
    });
    bmp.close();
    return small;
  }
  return bmp;
}

// ── Animation detection ───────────────────────────────────────────────────

/** True for animated GIF, animated WebP and APNG (only the first frame survives conversion). */
export async function isAnimated(file: File): Promise<boolean> {
  const k = kindOf(file);
  try {
    if (k === "webp") {
      const b = new Uint8Array(await file.slice(0, 32).arrayBuffer());
      const tag = String.fromCharCode(b[12], b[13], b[14], b[15]);
      return tag === "VP8X" && (b[20] & 0x02) !== 0;
    }
    if (k === "png") {
      const b = new Uint8Array(await file.slice(0, Math.min(file.size, 1 << 20)).arrayBuffer());
      let p = 8;
      while (p + 8 <= b.length) {
        const len = ((b[p] << 24) | (b[p + 1] << 16) | (b[p + 2] << 8) | b[p + 3]) >>> 0;
        const type = String.fromCharCode(b[p + 4], b[p + 5], b[p + 6], b[p + 7]);
        if (type === "acTL") return true;
        if (type === "IDAT") return false;
        p += 12 + len;
      }
      return false;
    }
    if (k === "gif") return countGifFrames(new Uint8Array(await file.arrayBuffer()), 2) > 1;
  } catch {
    return false;
  }
  return false;
}

function countGifFrames(b: Uint8Array, stopAt: number): number {
  if (b.length < 13) return 0;
  let p = 13;
  if (b[10] & 0x80) p += 3 * (1 << ((b[10] & 0x07) + 1));
  let frames = 0;
  const skipSubBlocks = () => {
    while (p < b.length) {
      const n = b[p++];
      if (n === 0) return;
      p += n;
    }
  };
  while (p < b.length) {
    const tag = b[p++];
    if (tag === 0x3b) break;
    if (tag === 0x21) {
      p++; // label
      skipSubBlocks();
    } else if (tag === 0x2c) {
      frames++;
      if (frames >= stopAt) return frames;
      const flags = b[p + 8];
      p += 9;
      if (flags & 0x80) p += 3 * (1 << ((flags & 0x07) + 1));
      p++; // LZW min code size
      skipSubBlocks();
    } else break;
  }
  return frames;
}

// ── AVIF (browser encoder, only where the browser really has one) ─────────

let avifSupport: Promise<boolean> | null = null;

export function supportsAvifEncode(): Promise<boolean> {
  if (!avifSupport) {
    avifSupport = (async () => {
      try {
        const c = makeCanvas(2, 2);
        ctx2d(c).fillRect(0, 0, 2, 2);
        const b = await canvasBlob(c, "image/avif", 0.8);
        return b.type === "image/avif";
      } catch {
        return false;
      }
    })();
  }
  return avifSupport;
}

/** Encode to AVIF with the browser's encoder (async; the browser encodes off the main thread). */
export async function encodeAvif(source: Blob | ImageBitmap, quality: number, background?: string): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = source instanceof Blob ? await decodeOnMain(source) : source;
  try {
    const c = makeCanvas(bmp.width, bmp.height);
    const ctx = ctx2d(c);
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, c.width, c.height);
    }
    ctx.drawImage(bmp, 0, 0);
    const blob = await canvasBlob(c, "image/avif", quality);
    if (blob.type !== "image/avif") throw new Error("AVIF encoding is not supported");
    return { blob, width: c.width, height: c.height };
  } finally {
    bmp.close();
  }
}

// ── Geometry ──────────────────────────────────────────────────────────────

/** Fit (w, h) within MAX_SIDE and the canvas pixel budget, keeping aspect. */
export function clampDims(w: number, h: number): { w: number; h: number; limited: boolean } {
  let k = 1;
  if (Math.max(w, h) > MAX_SIDE) k = MAX_SIDE / Math.max(w, h);
  if (w * k * h * k > MAX_PIXELS) k = Math.min(k, Math.sqrt(MAX_PIXELS / (w * h)));
  if (k >= 1) return { w: Math.max(1, Math.round(w)), h: Math.max(1, Math.round(h)), limited: false };
  return { w: Math.max(1, Math.floor(w * k)), h: Math.max(1, Math.floor(h * k)), limited: true };
}

/**
 * Scale factor for the largest axis-aligned rectangle with the same aspect
 * ratio as w×h that fits inside w×h rotated by `deg` (straighten auto-crop).
 */
export function inscribedScale(w: number, h: number, deg: number): number {
  const rad = (deg * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  return Math.min(w / (w * c + h * s), h / (w * s + h * c));
}

export function rotatedBox(w: number, h: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  const c = Math.abs(Math.cos(rad));
  const s = Math.abs(Math.sin(rad));
  return { w: Math.max(1, Math.ceil(w * c + h * s - 1e-6)), h: Math.max(1, Math.ceil(w * s + h * c - 1e-6)) };
}
