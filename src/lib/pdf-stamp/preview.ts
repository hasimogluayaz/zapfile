import type { PDFDocumentProxy } from "pdfjs-dist";

export interface PagePreview {
  bitmap: ImageBitmap;
  /** Visible page size in points. */
  widthPt: number;
  heightPt: number;
  /** Bitmap pixels per point. */
  scale: number;
}

/** Render a page (as viewers show it: crop box, /Rotate) so its width is `pxWidth` pixels. */
export async function renderPagePreview(pdf: PDFDocumentProxy, pageNumber: number, pxWidth: number): Promise<PagePreview> {
  const page = await pdf.getPage(pageNumber);
  try {
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(4, pxWidth / base.width);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(viewport.width));
    canvas.height = Math.max(1, Math.round(viewport.height));
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvas, canvasContext: ctx, viewport }).promise;
    const bitmap = await createImageBitmap(canvas);
    canvas.width = canvas.height = 0;
    return { bitmap, widthPt: base.width, heightPt: base.height, scale };
  } finally {
    page.cleanup();
  }
}
