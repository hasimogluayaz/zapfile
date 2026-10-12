/**
 * Render one pdf.js page to an ImageBitmap with a canvas-size cap, freeing
 * the canvas straight away. Used by PDF to Images and the PDF compressor's
 * "flatten pages" mode; the bitmap is then encoded by the image engine.
 */
import type { PDFPageProxy } from "pdfjs-dist/types/src/display/api";

/**
 * Largest canvas we render. iOS/iPadOS Safari silently produces a blank
 * canvas above 16,777,216 px; elsewhere we stop at ~36 MP (A4 at 600 DPI)
 * to keep memory sane on phones and low-end laptops.
 */
export const MAX_RENDER_PIXELS = (() => {
  if (typeof navigator === "undefined") return 16_777_216;
  const ua = navigator.userAgent;
  const webkitOnly = /AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua);
  return webkitOnly || /iPhone|iPad|iPod/.test(ua) ? 16_777_216 : 36_000_000;
})();

/** Scale to render at so the canvas stays within MAX_RENDER_PIXELS. */
export function cappedScale(widthPt: number, heightPt: number, scale: number): { scale: number; capped: boolean } {
  const pixels = widthPt * scale * heightPt * scale;
  if (pixels <= MAX_RENDER_PIXELS) return { scale, capped: false };
  return { scale: scale * Math.sqrt(MAX_RENDER_PIXELS / pixels) * 0.999, capped: true };
}

export class RenderAbortError extends Error {
  constructor() {
    super("Aborted");
    this.name = "AbortError";
  }
}

/**
 * Render `page` at `scale` (1 = 72 DPI) onto `background` (any CSS colour;
 * "transparent" keeps the alpha channel).
 */
export async function renderPageToBitmap(
  page: PDFPageProxy,
  scale: number,
  background: string,
  signal?: AbortSignal,
): Promise<{ bitmap: ImageBitmap; width: number; height: number; capped: boolean }> {
  if (signal?.aborted) throw new RenderAbortError();
  const base = page.getViewport({ scale: 1 });
  const fitted = cappedScale(base.width, base.height, scale);
  const viewport = page.getViewport({ scale: fitted.scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext("2d", { alpha: background === "transparent" });
  if (!ctx) throw new Error("Canvas unavailable");
  const task = page.render({
    canvas,
    canvasContext: ctx,
    viewport,
    background: background === "transparent" ? "rgba(0,0,0,0)" : background,
  });
  const onAbort = () => task.cancel();
  signal?.addEventListener("abort", onAbort, { once: true });
  try {
    await task.promise;
    if (signal?.aborted) throw new RenderAbortError();
    const bitmap = await createImageBitmap(canvas);
    return { bitmap, width: canvas.width, height: canvas.height, capped: fitted.capped };
  } catch (error) {
    if (signal?.aborted) throw new RenderAbortError();
    throw error;
  } finally {
    signal?.removeEventListener("abort", onAbort);
    // Release the backing store now instead of waiting for GC (matters on iOS).
    canvas.width = 0;
    canvas.height = 0;
    page.cleanup();
  }
}

/** Let the browser paint between heavy steps. */
export function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
