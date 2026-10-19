/// <reference lib="webworker" />
import { PDFDocument } from "pdf-lib";
import { makeFrame, toUser } from "@/lib/pdf-stamp/geometry";

const w = self as unknown as DedicatedWorkerGlobalScope;

/** Crop rectangle per page (1-based key) in the visible frame: points, origin top-left, y down. */
export interface CropRequest {
  bytes: ArrayBuffer;
  rects: Record<number, { x: number; y: number; w: number; h: number }>;
}

w.onmessage = async (e: MessageEvent<CropRequest>) => {
  const { bytes, rects } = e.data;
  try {
    let doc: PDFDocument;
    try {
      doc = await PDFDocument.load(bytes, { updateMetadata: false });
    } catch {
      w.postMessage({ type: "error", code: "load" });
      return;
    }
    doc.getPages().forEach((page, i) => {
      const r = rects[i + 1];
      if (!r) return;
      const crop = page.getCropBox();
      const f = makeFrame({ x: crop.x, y: crop.y, width: crop.width, height: crop.height }, page.getRotation().angle);
      const a = toUser(r.x, f.height - r.y, f);
      const b = toUser(r.x + r.w, f.height - (r.y + r.h), f);
      const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), width = Math.abs(a.x - b.x), height = Math.abs(a.y - b.y);
      if (width < 1 || height < 1) return;
      // Media box too, so printing and every viewer show the same area.
      page.setMediaBox(x, y, width, height);
      page.setCropBox(x, y, width, height);
      page.setTrimBox(x, y, width, height);
      page.setBleedBox(x, y, width, height);
    });
    const out = await doc.save({ useObjectStreams: true });
    w.postMessage({ type: "done", bytes: out, kind: "pdf" }, [out.buffer]);
  } catch (error) {
    w.postMessage({ type: "error", code: "fail", message: error instanceof Error ? error.message : String(error) });
  }
};
