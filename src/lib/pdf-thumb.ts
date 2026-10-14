import { openPdf } from "./pdfjs";

type PdfDoc = Awaited<ReturnType<typeof openPdf>>;

function abortError(): DOMException {
  return new DOMException("Aborted", "AbortError");
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function devicePixelRatioCapped(): number {
  if (typeof window === "undefined") return 1;
  return Math.min(2, Math.max(1, window.devicePixelRatio || 1));
}

/**
 * Render one page into a fresh canvas.
 * - `fit: "width"` scales the page to `size` device pixels wide.
 * - `fit: "box"` scales the longer side to `size` device pixels.
 * The page's own /Rotate is applied (pdf.js default), so the canvas shows the
 * page as viewers display it.
 */
async function renderPageCanvas(
  pdf: PdfDoc,
  pageIndex1: number,
  size: number,
  fit: "width" | "box",
  signal?: AbortSignal,
): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(pageIndex1);
  try {
    if (signal?.aborted) throw abortError();
    const base = page.getViewport({ scale: 1 });
    const ref = fit === "width" ? base.width : Math.max(base.width, base.height);
    const scale = Math.max(0.01, size / Math.max(1, ref));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil(viewport.width));
    canvas.height = Math.max(1, Math.ceil(viewport.height));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unsupported");
    const task = page.render({ canvas, canvasContext: ctx, viewport });
    const onAbort = () => task.cancel();
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      await task.promise;
    } finally {
      signal?.removeEventListener("abort", onAbort);
    }
    return canvas;
  } finally {
    // Drop the page's parsed resources (fonts, images) from the worker.
    page.cleanup();
  }
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality = 0.82): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        // Release the backing store right away; thumbnails can be numerous.
        canvas.width = 0;
        canvas.height = 0;
        if (blob) resolve(blob);
        else reject(new Error("Could not encode thumbnail"));
      },
      "image/jpeg",
      quality,
    );
  });
}

/**
 * Render the first page of a PDF to a JPEG data URL for thumbnails.
 * Opens and destroys its own pdf.js document; prefer `readPdfCover` or
 * `createPdfThumbnailer` in new code.
 */
export async function pdfFirstPageThumbnail(
  data: ArrayBuffer,
  maxWidth = 132,
): Promise<string> {
  return pdfPageThumbnail(data, 1, maxWidth);
}

/** Render a specific 1-based page index to a JPEG data URL. */
export async function pdfPageThumbnail(
  data: ArrayBuffer,
  pageIndex1: number,
  maxWidth = 96,
): Promise<string> {
  const pdf = await openPdf(data);
  try {
    const canvas = await renderPageCanvas(pdf, pageIndex1, maxWidth, "width");
    const url = canvas.toDataURL("image/jpeg", 0.82);
    canvas.width = 0;
    canvas.height = 0;
    return url;
  } finally {
    void pdf.destroy();
  }
}

/**
 * Open a PDF once, read its page count and render the first page as a small
 * JPEG blob (longer side = `cssBox` CSS pixels at the device pixel ratio).
 * The document is destroyed before returning. The caller owns the blob.
 */
export async function readPdfCover(
  source: Blob | ArrayBuffer,
  cssBox = 72,
): Promise<{ pageCount: number; cover: Blob | null }> {
  const bytes = source instanceof Blob ? await source.arrayBuffer() : source.slice(0);
  const pdf = await openPdf(bytes, {}, { copy: false });
  try {
    const pageCount = pdf.numPages;
    let cover: Blob | null = null;
    try {
      const canvas = await renderPageCanvas(
        pdf,
        1,
        Math.round(cssBox * devicePixelRatioCapped()),
        "box",
      );
      cover = await canvasToJpegBlob(canvas);
    } catch {
      cover = null;
    }
    return { pageCount, cover };
  } finally {
    void pdf.destroy();
  }
}

export interface PdfThumbnailer {
  readonly pageCount: number;
  /**
   * Object URL of a JPEG thumbnail for a 1-based page; the longer side is
   * `cssBox` CSS pixels (rendered at the device pixel ratio, capped at 2x).
   * Results are cached; URLs stay valid until `destroy()`. Aborting before
   * the render starts removes the request from the queue.
   */
  render(page: number, cssBox: number, signal?: AbortSignal): Promise<string>;
  /** Revoke every URL, cancel queued work and destroy the pdf.js document. */
  destroy(): void;
  readonly destroyed: boolean;
}

interface Job {
  key: string;
  page: number;
  px: number;
  resolve: (url: string) => void;
  reject: (error: unknown) => void;
  signal?: AbortSignal;
  onAbort?: () => void;
}

/**
 * Open a PDF once and render page thumbnails lazily, a few at a time.
 * Most recent requests are served first (LIFO), which matches scrolling:
 * the pages the user is looking at now win over ones they scrolled past.
 */
export async function createPdfThumbnailer(
  source: Blob | ArrayBuffer | Uint8Array,
  { concurrency = 2 }: { concurrency?: number } = {},
): Promise<PdfThumbnailer> {
  const bytes =
    source instanceof Blob
      ? await source.arrayBuffer()
      : source instanceof Uint8Array
        ? source.slice()
        : source.slice(0);
  const pdf = await openPdf(bytes, {}, { copy: false });

  const done = new Map<string, string>();
  const inflight = new Map<string, Promise<string>>();
  const queue: Job[] = [];
  let active = 0;
  let destroyed = false;

  const run = async (job: Job) => {
    try {
      const canvas = await renderPageCanvas(pdf, job.page, job.px, "box");
      const blob = await canvasToJpegBlob(canvas);
      if (destroyed) throw abortError();
      const url = URL.createObjectURL(blob);
      done.set(job.key, url);
      job.resolve(url);
    } catch (error) {
      job.reject(destroyed ? abortError() : error);
    } finally {
      inflight.delete(job.key);
    }
  };

  const pump = () => {
    while (!destroyed && active < concurrency && queue.length > 0) {
      const job = queue.pop()!;
      if (job.signal && job.onAbort) job.signal.removeEventListener("abort", job.onAbort);
      active++;
      void run(job).finally(() => {
        active--;
        pump();
      });
    }
  };

  return {
    pageCount: pdf.numPages,
    get destroyed() {
      return destroyed;
    },
    render(page, cssBox, signal) {
      if (destroyed) return Promise.reject(abortError());
      if (page < 1 || page > pdf.numPages) return Promise.reject(new RangeError("page"));
      // Quantise sizes so slightly different layouts share one render.
      const px = Math.ceil((cssBox * devicePixelRatioCapped()) / 16) * 16;
      const key = `${page}@${px}`;
      const cached = done.get(key);
      if (cached) return Promise.resolve(cached);
      const pending = inflight.get(key);
      if (pending) return pending;
      if (signal?.aborted) return Promise.reject(abortError());
      const promise = new Promise<string>((resolve, reject) => {
        const job: Job = { key, page, px, resolve, reject, signal };
        if (signal) {
          job.onAbort = () => {
            const i = queue.indexOf(job);
            if (i >= 0) {
              queue.splice(i, 1);
              inflight.delete(key);
              reject(abortError());
            }
          };
          signal.addEventListener("abort", job.onAbort, { once: true });
        }
        queue.push(job);
      });
      inflight.set(key, promise);
      pump();
      return promise;
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const job of queue.splice(0)) {
        if (job.signal && job.onAbort) job.signal.removeEventListener("abort", job.onAbort);
        job.reject(abortError());
      }
      inflight.clear();
      done.forEach((url) => URL.revokeObjectURL(url));
      done.clear();
      void pdf.destroy();
    },
  };
}
