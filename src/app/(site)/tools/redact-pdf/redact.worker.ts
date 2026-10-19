/// <reference lib="webworker" />
import { PDFDocument } from "pdf-lib";

const w = self as unknown as DedicatedWorkerGlobalScope;

export interface RedactRequest {
  bytes: ArrayBuffer;
  /** Flattened replacements: page number, JPEG of the redacted page, visible size in points. */
  pages: { page: number; jpeg: ArrayBuffer; width: number; height: number }[];
  stripMeta: boolean;
}

w.onmessage = async (e: MessageEvent<RedactRequest>) => {
  const { bytes, pages, stripMeta } = e.data;
  try {
    let doc: PDFDocument;
    try {
      doc = await PDFDocument.load(bytes, { updateMetadata: false });
    } catch {
      w.postMessage({ type: "error", code: "load" });
      return;
    }
    // Build a fresh document: copying pages brings only the objects they still use, so the
    // original text and drawings of redacted pages can't linger in the file as orphans.
    const out = await PDFDocument.create();
    const replaced = new Map(pages.map((p) => [p.page - 1, p]));
    const keepIdx = doc.getPageIndices().filter((i) => !replaced.has(i));
    const copied = await out.copyPages(doc, keepIdx);
    let k = 0;
    for (let i = 0; i < doc.getPageCount(); i++) {
      const r = replaced.get(i);
      if (!r) {
        out.addPage(copied[k++]!);
        continue;
      }
      const page = out.addPage([r.width, r.height]);
      const img = await out.embedJpg(r.jpeg);
      page.drawImage(img, { x: 0, y: 0, width: r.width, height: r.height });
    }
    if (!stripMeta) {
      out.setTitle(doc.getTitle() ?? "");
      out.setAuthor(doc.getAuthor() ?? "");
      out.setSubject(doc.getSubject() ?? "");
    }
    out.setProducer("ZapFile");
    out.setCreator("ZapFile Redact PDF");
    const bytesOut = await out.save({ useObjectStreams: true });
    w.postMessage({ type: "done", bytes: bytesOut, kind: "pdf" }, [bytesOut.buffer]);
  } catch (error) {
    w.postMessage({ type: "error", code: "fail", message: error instanceof Error ? error.message : String(error) });
  }
};
