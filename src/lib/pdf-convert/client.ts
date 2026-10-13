/**
 * Main-thread side of PDF → Word / Excel: reads pages with pdf.js (which
 * parses in its own worker), renders vector figures and scanned pages to
 * pictures, then hands everything to convert.worker.ts for layout and file
 * writing. Cancellable at any point; yields between pages so the UI stays
 * responsive.
 */
import type { PDFDocumentProxy } from "pdfjs-dist";
import { openPdf } from "@/lib/pdfjs";
import { PdfLockedError } from "@/lib/pdf-input";
import { extractPage, renderRegion } from "./extract";
import { findFigureRegions } from "./layout";
import type { ImageAsset, PageModel } from "./model";
import type { ConvertRequest, ConvertResponse, ConvertStats } from "./convert.worker";
import type { XlsxOptions } from "./xlsx";

export type { ConvertStats } from "./convert.worker";
export type { XlsxOptions } from "./xlsx";

export interface ConvertProgress {
  phase: "reading" | "writing";
  done: number;
  total: number;
}

export interface ConvertJob {
  kind: "docx" | "xlsx" | "pptx";
  /** 1-based page numbers, or null for all pages. */
  pages: number[] | null;
  keepPageBreaks?: boolean;
  xlsx?: XlsxOptions;
  title: string;
}

export interface ConvertResult {
  blob: Blob;
  stats: ConvertStats;
}

function abortError(): DOMException {
  return new DOMException("Aborted", "AbortError");
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/** Open a PDF for conversion; password-protected files throw PdfLockedError. */
export async function openForConversion(file: Blob): Promise<PDFDocumentProxy> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    return await openPdf(bytes, {}, { copy: false });
  } catch (error) {
    if ((error as { name?: string })?.name === "PasswordException") throw new PdfLockedError();
    throw error;
  }
}

export async function convertPdf(
  pdf: PDFDocumentProxy,
  job: ConvertJob,
  onProgress: (p: ConvertProgress) => void,
  signal: AbortSignal,
): Promise<ConvertResult> {
  const numbers = job.pages ?? Array.from({ length: pdf.numPages }, (_, i) => i + 1);
  const pages: PageModel[] = [];
  const assets: ImageAsset[] = [];
  const withImages = job.kind !== "xlsx";
  for (let i = 0; i < numbers.length; i++) {
    if (signal.aborted) throw abortError();
    onProgress({ phase: "reading", done: i, total: numbers.length });
    const n = numbers[i]!;
    const { page, assets: pageAssets } = await extractPage(pdf, n, { images: withImages, signal });
    if (withImages) {
      if (page.scanned) {
        // A scan without a text layer: keep the whole page as one sharp picture.
        const img = await renderRegion(pdf, n, null, 200, signal);
        const id = `p${n}scan`;
        assets.push({ id, ...img });
        page.images = [{ id, x: 0, y: 0, w: page.width, h: page.height, pxW: img.pxW, pxH: img.pxH, figure: true }];
      } else {
        assets.push(...pageAssets);
        const figures = findFigureRegions(page);
        for (let k = 0; k < figures.length; k++) {
          const r = figures[k]!;
          const img = await renderRegion(pdf, n, r, 220, signal);
          const id = `p${n}fig${k}`;
          assets.push({ id, ...img });
          // Pictures that sit inside the figure are part of the rendering now.
          page.images = page.images.filter((im) => !(im.x >= r.x - 1 && im.y >= r.y - 1 && im.x + im.w <= r.x + r.w + 1 && im.y + im.h <= r.y + r.h + 1));
          page.images.push({ id, x: r.x, y: r.y, w: r.w, h: r.h, pxW: img.pxW, pxH: img.pxH, figure: true });
        }
      }
    }
    pages.push(page);
    await tick();
  }
  if (signal.aborted) throw abortError();
  onProgress({ phase: "writing", done: numbers.length, total: numbers.length });

  // Drop assets no page refers to any more (pictures swallowed by figures).
  const used = new Set(pages.flatMap((p) => p.images.map((im) => im.id)));
  const keep = assets.filter((a) => used.has(a.id));

  return new Promise<ConvertResult>((resolve, reject) => {
    const worker = new Worker(new URL("./convert.worker.ts", import.meta.url), { type: "module" });
    const cleanup = () => {
      signal.removeEventListener("abort", onAbort);
      worker.terminate();
    };
    const onAbort = () => {
      cleanup();
      reject(abortError());
    };
    signal.addEventListener("abort", onAbort, { once: true });
    worker.onmessage = (e: MessageEvent<ConvertResponse>) => {
      cleanup();
      if (e.data.type === "done") {
        const mime = {
          docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        }[job.kind];
        resolve({ blob: new Blob([e.data.bytes], { type: mime }), stats: e.data.stats });
      } else {
        reject(new Error(e.data.message));
      }
    };
    worker.onerror = (e) => {
      cleanup();
      reject(new Error(e.message || "Worker failed"));
    };
    const msg: ConvertRequest =
      job.kind === "docx"
        ? { kind: "docx", pages, assets: keep, title: job.title, keepPageBreaks: job.keepPageBreaks !== false }
        : job.kind === "pptx"
          ? { kind: "pptx", pages, assets: keep, title: job.title }
          : { kind: "xlsx", pages, title: job.title, options: job.xlsx ?? { layout: "page", tablesOnly: false, numbers: true } };
    worker.postMessage(msg, keep.map((a) => a.bytes));
  });
}
