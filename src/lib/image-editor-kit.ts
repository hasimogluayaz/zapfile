/**
 * Shared canvas helpers for the interactive image editors (watermark, blur,
 * photo filter, meme): EXIF-aware decoding with the WebKit canvas budget,
 * screen-sized editing proxies, edge-extended blur that works without
 * `ctx.filter` (older Safari), and final encoding through the image engine.
 */
import { gaussianBlurRGBA } from "./image-editor-kit-pixels";
import { processImage, type OutputFormat } from "./image-engine";

export type FormatChoice = "original" | OutputFormat;

/**
 * Largest canvas we may allocate. iOS/iPadOS Safari silently produces blank
 * output above 16,777,216 px, so cap there wherever WebKit runs.
 */
export function maxCanvasPixels(): number {
  if (typeof navigator === "undefined") return 16_777_216;
  const ua = navigator.userAgent;
  const webkitOnly = /AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua);
  return webkitOnly || /iPhone|iPad|iPod/.test(ua) ? 16_777_216 : 120_000_000;
}

export function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(width));
  c.height = Math.max(1, Math.round(height));
  return c;
}

export function ctx2d(canvas: HTMLCanvasElement, opts?: CanvasRenderingContext2DSettings): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", opts);
  if (!ctx) throw new Error("Canvas 2D is not available");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

/** Free a canvas' backing store right away (matters on iOS). */
export function releaseCanvas(canvas: HTMLCanvasElement | null | undefined) {
  if (!canvas) return;
  canvas.width = 0;
  canvas.height = 0;
}

/** Resize a bitmap; falls back to a canvas when resize options are ignored. */
export async function resizeBitmap(src: ImageBitmap | HTMLCanvasElement, width: number, height: number): Promise<ImageBitmap> {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  try {
    const out = await createImageBitmap(src, { resizeWidth: w, resizeHeight: h, resizeQuality: "high" });
    if (out.width === w && out.height === h) return out;
    out.close();
  } catch {
    /* fall through */
  }
  // Step down by halves for a clean downscale.
  let cur: CanvasImageSource = src;
  let cw = src.width;
  let ch = src.height;
  const temps: HTMLCanvasElement[] = [];
  while (cw / 2 >= w && ch / 2 >= h) {
    const next = makeCanvas(cw / 2, ch / 2);
    ctx2d(next).drawImage(cur, 0, 0, next.width, next.height);
    temps.push(next);
    cur = next;
    cw = next.width;
    ch = next.height;
  }
  const final = makeCanvas(w, h);
  ctx2d(final).drawImage(cur, 0, 0, w, h);
  const bmp = await createImageBitmap(final);
  temps.forEach(releaseCanvas);
  releaseCanvas(final);
  return bmp;
}

export interface DecodedImage {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  /** Size before any canvas-budget downscale. */
  naturalWidth: number;
  naturalHeight: number;
  /** True when the browser's canvas limit forced a smaller working size. */
  capped: boolean;
}

async function bitmapViaImg(blob: Blob): Promise<ImageBitmap> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return await createImageBitmap(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Decode with EXIF orientation applied, capped to the canvas budget. */
export async function decodeImage(blob: Blob): Promise<DecodedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" });
  } catch {
    try {
      bitmap = await createImageBitmap(blob);
    } catch {
      bitmap = await bitmapViaImg(blob); // e.g. SVG or engines without blob decoding
    }
  }
  const nw = bitmap.width;
  const nh = bitmap.height;
  const limit = maxCanvasPixels();
  if (nw * nh > limit) {
    const k = Math.sqrt(limit / (nw * nh)) * 0.999;
    const fitted = await resizeBitmap(bitmap, Math.floor(nw * k), Math.floor(nh * k));
    bitmap.close();
    return { bitmap: fitted, width: fitted.width, height: fitted.height, naturalWidth: nw, naturalHeight: nh, capped: true };
  }
  return { bitmap, width: nw, height: nh, naturalWidth: nw, naturalHeight: nh, capped: false };
}

/** Long side for the editing proxy: about the on-screen size × devicePixelRatio. */
export function proxyLongSide(max = 2400): number {
  if (typeof window === "undefined") return 1600;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const screenSide = Math.max(window.innerWidth, window.innerHeight) * 0.85;
  return Math.round(Math.min(max, Math.max(960, screenSide * dpr)));
}

/** Screen-sized copy of a bitmap for real-time editing (always a new bitmap). */
export async function makeProxy(bitmap: ImageBitmap, longSide = proxyLongSide()): Promise<ImageBitmap> {
  const long = Math.max(bitmap.width, bitmap.height);
  if (long <= longSide) return createImageBitmap(bitmap);
  const k = longSide / long;
  return resizeBitmap(bitmap, bitmap.width * k, bitmap.height * k);
}

let filterSupport: boolean | null = null;

/** True when `ctx.filter = "blur()"` really blurs (not the case on some Safari). */
export function supportsCanvasFilter(): boolean {
  if (filterSupport !== null) return filterSupport;
  try {
    const src = makeCanvas(9, 1);
    const s = ctx2d(src);
    s.fillStyle = "#000";
    s.fillRect(0, 0, 9, 1);
    s.fillStyle = "#fff";
    s.fillRect(4, 0, 1, 1);
    const dst = makeCanvas(9, 1);
    const d = ctx2d(dst, { willReadFrequently: true });
    if (!("filter" in d)) return (filterSupport = false);
    d.filter = "blur(2px)";
    d.drawImage(src, 0, 0);
    const px = d.getImageData(2, 0, 1, 1).data;
    filterSupport = px[0] > 0;
  } catch {
    filterSupport = false;
  }
  return filterSupport;
}

/** Blur a whole canvas (transparent outside its edges). Returns a new canvas. */
export function blurCanvas(work: HTMLCanvasElement, radius: number): HTMLCanvasElement {
  const out = makeCanvas(work.width, work.height);
  if (radius < 0.3) {
    ctx2d(out).drawImage(work, 0, 0);
    return out;
  }
  if (supportsCanvasFilter()) {
    const c = ctx2d(out);
    c.filter = `blur(${radius}px)`;
    c.drawImage(work, 0, 0);
    c.filter = "none";
    return out;
  }
  // No ctx.filter (some Safari): downscale so the radius is ~2 px, box-blur there, upscale smoothly.
  const f = Math.max(1, radius / 2);
  const sw = Math.max(2, Math.round(work.width / f));
  const sh = Math.max(2, Math.round(work.height / f));
  const small = makeCanvas(sw, sh);
  const sc = ctx2d(small, { willReadFrequently: true });
  sc.drawImage(work, 0, 0, sw, sh);
  const img = sc.getImageData(0, 0, sw, sh);
  gaussianBlurRGBA(img.data, sw, sh, Math.max(0.6, radius / f));
  sc.putImageData(img, 0, 0);
  ctx2d(out).drawImage(small, 0, 0, out.width, out.height);
  releaseCanvas(small);
  return out;
}

/**
 * Gaussian blur of a rectangle of `src`, with the image edges extended
 * (stretched) instead of fading to transparent. Large radii are computed at a
 * reduced scale (visually identical, far less memory — matters on iOS).
 * Returns a w×h canvas.
 */
export function blurRect(
  src: CanvasImageSource,
  srcW: number,
  srcH: number,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
): HTMLCanvasElement {
  x = Math.round(x);
  y = Math.round(y);
  w = Math.max(1, Math.round(w));
  h = Math.max(1, Math.round(h));
  const out = makeCanvas(w, h);
  const pad = Math.ceil(Math.max(1, radius) * 3);
  const ax0 = Math.max(0, x - pad);
  const ay0 = Math.max(0, y - pad);
  const ax1 = Math.min(srcW, x + w + pad);
  const ay1 = Math.min(srcH, y + h + pad);
  const aw = ax1 - ax0;
  const ah = ay1 - ay0;
  if (aw <= 0 || ah <= 0) return out;
  const f = Math.max(1, radius / 4);
  const work = makeCanvas((w + pad * 2) / f, (h + pad * 2) / f);
  const wc = ctx2d(work);
  const dx = Math.round((ax0 - (x - pad)) / f);
  const dy = Math.round((ay0 - (y - pad)) / f);
  const dw = Math.max(1, Math.min(work.width - dx, Math.round(aw / f)));
  const dh = Math.max(1, Math.min(work.height - dy, Math.round(ah / f)));
  wc.drawImage(src, ax0, ay0, aw, ah, dx, dy, dw, dh);
  wc.imageSmoothingEnabled = false;
  const rightGap = work.width - (dx + dw);
  const bottomGap = work.height - (dy + dh);
  if (dx > 0) wc.drawImage(work, dx, dy, 1, dh, 0, dy, dx, dh);
  if (rightGap > 0) wc.drawImage(work, dx + dw - 1, dy, 1, dh, dx + dw, dy, rightGap, dh);
  if (dy > 0) wc.drawImage(work, 0, dy, work.width, 1, 0, 0, work.width, dy);
  if (bottomGap > 0) wc.drawImage(work, 0, dy + dh - 1, work.width, 1, 0, dy + dh, work.width, bottomGap);
  const blurred = blurCanvas(work, radius / f);
  ctx2d(out).drawImage(blurred, pad / f, pad / f, w / f, h / f, 0, 0, w, h);
  releaseCanvas(work);
  releaseCanvas(blurred);
  return out;
}

export const SUPPORTED_OUT: OutputFormat[] = ["image/jpeg", "image/png", "image/webp"];

/** Output type for a source file and the user's choice (GIF/BMP/etc. keep → PNG). */
export function resolveFormat(sourceType: string, choice: FormatChoice): OutputFormat {
  if (choice !== "original") return choice;
  return (SUPPORTED_OUT as string[]).includes(sourceType) ? (sourceType as OutputFormat) : "image/png";
}

/** Encode a rendered canvas through the off-main-thread image engine. */
export async function encodeCanvas(
  canvas: HTMLCanvasElement,
  format: OutputFormat,
  quality: number,
  signal?: AbortSignal,
): Promise<Blob> {
  return encodeBitmap(await createImageBitmap(canvas), format, quality, signal);
}

/** Encode (and consume) a bitmap through the off-main-thread image engine. */
export async function encodeBitmap(
  bitmap: ImageBitmap,
  format: OutputFormat,
  quality: number,
  signal?: AbortSignal,
): Promise<Blob> {
  try {
    const result = await processImage(
      // The engine accepts decoded bitmaps directly (transferred to its worker).
      { input: bitmap as unknown as Blob, encode: { format, quality } },
      signal,
    );
    return result.blob;
  } finally {
    bitmap.close();
  }
}

/** Yield to the event loop so progress paints and input stays responsive. */
export function nextFrame(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => setTimeout(resolve, 0));
    else setTimeout(resolve, 0);
  });
}

/** Name collisions inside ZIPs get "-2", "-3"… */
export function uniqueName(name: string, used: Set<string>): string {
  if (!used.has(name.toLowerCase())) {
    used.add(name.toLowerCase());
    return name;
  }
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  for (let i = 2; ; i++) {
    const candidate = `${base}-${i}${ext}`;
    if (!used.has(candidate.toLowerCase())) {
      used.add(candidate.toLowerCase());
      return candidate;
    }
  }
}

/** Family stack of the self-hosted Geist font (always available in-page). */
export function builtInFontFamily(): string {
  if (typeof document === "undefined") return "system-ui, sans-serif";
  const v = getComputedStyle(document.documentElement).getPropertyValue("--font-sans").trim();
  return `${v ? `${v}, ` : ""}system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", sans-serif`;
}

/** Wait until the given CSS font shorthand can be drawn on canvas. */
export async function ensureFont(font: string, sample = "AaBb"): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  try {
    await Promise.race([
      (async () => {
        await document.fonts.ready;
        await document.fonts.load(font, sample);
      })(),
      new Promise((resolve) => setTimeout(resolve, 2500)),
    ]);
  } catch {
    /* draw with whatever is available */
  }
}
