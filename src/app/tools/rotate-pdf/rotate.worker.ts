/// <reference lib="webworker" />
import { PDFDocument, degrees } from "pdf-lib";

const w = self as unknown as DedicatedWorkerGlobalScope;

export interface RotateRequest {
  bytes: ArrayBuffer;
  /** Clockwise degrees to ADD to each page's existing rotation (0-based index). */
  deltas: number[];
}

w.onmessage = async (e: MessageEvent<RotateRequest>) => {
  const { bytes, deltas } = e.data;
  try {
    let doc: PDFDocument;
    try {
      doc = await PDFDocument.load(bytes, { updateMetadata: false });
    } catch {
      w.postMessage({ type: "error", code: "load" });
      return;
    }
    w.postMessage({ type: "progress", value: 0.4 });
    const pages = doc.getPages();
    pages.forEach((page, i) => {
      const delta = deltas[i] ?? 0;
      if (delta % 360 === 0) return;
      const current = page.getRotation().angle;
      page.setRotation(degrees((((current + delta) % 360) + 360) % 360));
    });
    w.postMessage({ type: "progress", value: 0.6 });
    const out = await doc.save({ useObjectStreams: true });
    w.postMessage({ type: "done", bytes: out, kind: "pdf" }, [out.buffer]);
  } catch (error) {
    w.postMessage({ type: "error", code: "fail", message: error instanceof Error ? error.message : String(error) });
  }
};
