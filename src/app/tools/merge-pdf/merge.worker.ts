/// <reference lib="webworker" />
import { PDFDocument } from "pdf-lib";
import { assemblePdf } from "./pdf-assemble";

const w = self as unknown as DedicatedWorkerGlobalScope;

export interface MergeRequest {
  sources: { name: string; bytes: ArrayBuffer; pages: number[] | null }[];
  fileBookmarks: boolean;
}

w.onmessage = async (e: MessageEvent<MergeRequest>) => {
  const { sources, fileBookmarks } = e.data;
  try {
    const n = sources.length;
    const parts = [];
    for (let i = 0; i < n; i++) {
      w.postMessage({ type: "progress", value: (i / n) * 0.5, file: i });
      const s = sources[i];
      let doc: PDFDocument;
      try {
        doc = await PDFDocument.load(s.bytes, { updateMetadata: false });
      } catch {
        w.postMessage({ type: "error", code: "load", file: i });
        return;
      }
      const all = doc.getPageIndices();
      const pages = (s.pages ?? all).filter((p) => p >= 0 && p < all.length);
      parts.push({ doc, pages, title: s.name });
    }
    const out = await assemblePdf(parts, {
      partBookmarks: fileBookmarks,
      onPart: (i) => w.postMessage({ type: "progress", value: 0.5 + (i / n) * 0.35, file: i }),
    });
    w.postMessage({ type: "progress", value: 0.88 });
    const bytes = await out.save({ useObjectStreams: true });
    w.postMessage({ type: "done", bytes }, [bytes.buffer]);
  } catch (error) {
    w.postMessage({ type: "error", code: "fail", message: error instanceof Error ? error.message : String(error) });
  }
};
