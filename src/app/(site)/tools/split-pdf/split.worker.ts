/// <reference lib="webworker" />
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { assemblePdf } from "../merge-pdf/pdf-assemble";

const w = self as unknown as DedicatedWorkerGlobalScope;

export interface SplitRequest {
  bytes: ArrayBuffer;
  /** One output file per group; pages are 0-based, in output order. */
  groups: { pages: number[]; name: string }[];
}

w.onmessage = async (e: MessageEvent<SplitRequest>) => {
  const { bytes, groups } = e.data;
  try {
    let src: PDFDocument;
    try {
      src = await PDFDocument.load(bytes, { updateMetadata: false });
    } catch {
      w.postMessage({ type: "error", code: "load" });
      return;
    }
    w.postMessage({ type: "progress", value: 0.1 });
    const outputs: { name: string; bytes: Uint8Array }[] = [];
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      // Bookmarks, links and form fields that belong to the kept pages stay.
      const doc = await assemblePdf([{ doc: src, pages: g.pages, title: g.name }], { partBookmarks: false });
      outputs.push({ name: g.name, bytes: await doc.save({ useObjectStreams: true }) });
      w.postMessage({ type: "progress", value: 0.1 + ((i + 1) / groups.length) * (groups.length > 1 ? 0.7 : 0.9) });
    }
    if (outputs.length === 1) {
      const only = outputs[0];
      w.postMessage({ type: "done", bytes: only.bytes, name: only.name, kind: "pdf" }, [only.bytes.buffer]);
      return;
    }
    const zip = new JSZip();
    for (const o of outputs) zip.file(o.name, o.bytes);
    const out = await zip.generateAsync(
      { type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } },
      (meta) => w.postMessage({ type: "progress", value: 0.8 + (meta.percent / 100) * 0.2 }),
    );
    w.postMessage({ type: "done", bytes: out, kind: "zip" }, [out.buffer]);
  } catch (error) {
    w.postMessage({ type: "error", code: "fail", message: error instanceof Error ? error.message : String(error) });
  }
};
