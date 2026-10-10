import { openPdf } from "./pdfjs";

/**
 * Render the first page of a PDF to a JPEG data URL for thumbnails.
 * Uses the shared same-origin pdf.js loader.
 */
export async function pdfFirstPageThumbnail(
  data: ArrayBuffer,
  maxWidth = 132,
): Promise<string> {
  const pdf = await openPdf(data);
  const page = await pdf.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const scale = maxWidth / base.width;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.82);
}

/** Render a specific 1-based page index to a JPEG data URL. */
export async function pdfPageThumbnail(
  data: ArrayBuffer,
  pageIndex1: number,
  maxWidth = 96,
): Promise<string> {
  const pdf = await openPdf(data);
  const page = await pdf.getPage(pageIndex1);
  const base = page.getViewport({ scale: 1 });
  const scale = maxWidth / base.width;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");
  await page.render({ canvas, canvasContext: ctx, viewport }).promise;
  return canvas.toDataURL("image/jpeg", 0.82);
}
