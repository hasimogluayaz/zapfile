/// <reference lib="webworker" />
/**
 * Repair a damaged PDF by re-reading every object it can find (pdf-lib parses objects one by one
 * rather than trusting the cross-reference table) and writing a clean file with a fresh xref.
 * With `images`, builds a new PDF from page pictures rendered by pdf.js (the most tolerant reader).
 */
import { PDFDict, PDFDocument, PDFName, PDFParser, PDFWriter, type PDFRef } from "pdf-lib";

const w = self as unknown as DedicatedWorkerGlobalScope;

export type RepairRequest =
  | { kind: "rebuild"; bytes: ArrayBuffer }
  | { kind: "images"; pages: { jpeg: ArrayBuffer; width: number; height: number }[] };

/**
 * Salvage a file whose catalog or page tree is gone (typically cut off before the end): parse every
 * complete object, collect the page dictionaries in object order, and give them a new page tree.
 */
async function salvage(bytes: ArrayBuffer): Promise<PDFDocument | null> {
  let data = new Uint8Array(bytes);
  // Drop a half-written last object so the parser doesn't stumble on it.
  const tail = new TextDecoder("latin1").decode(data.subarray(Math.max(0, data.length - 4_000_000)));
  const end = tail.lastIndexOf("endobj");
  if (end >= 0) data = data.subarray(0, data.length - tail.length + end + 6);
  const ctx = await PDFParser.forBytesWithOptions(data, Infinity, false, false).parseDocument();
  const pages: [PDFRef, PDFDict][] = [];
  for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
    if (obj instanceof PDFDict && obj.get(PDFName.of("Type")) === PDFName.of("Page")) pages.push([ref, obj]);
  }
  if (!pages.length) return null;
  const tree = ctx.register(ctx.obj({ Type: "Pages", Kids: pages.map(([r]) => r), Count: pages.length }));
  for (const [, p] of pages) p.set(PDFName.of("Parent"), tree);
  ctx.trailerInfo.Root = ctx.register(ctx.obj({ Type: "Catalog", Pages: tree }));
  const rebuilt = await PDFWriter.forContext(ctx, 50).serializeToBuffer();
  return PDFDocument.load(rebuilt, { ignoreEncryption: true, throwOnInvalidObject: false, updateMetadata: false });
}

w.onmessage = async (e: MessageEvent<RepairRequest>) => {
  const req = e.data;
  try {
    if (req.kind === "rebuild") {
      let src: PDFDocument | null = null;
      try {
        src = await PDFDocument.load(req.bytes, { ignoreEncryption: true, throwOnInvalidObject: false, updateMetadata: false });
        if (src.getPageCount() === 0) src = null;
      } catch {
        src = null;
      }
      if (!src) {
        try {
          src = await salvage(req.bytes);
        } catch {
          src = null;
        }
      }
      if (!src) {
        w.postMessage({ type: "error", code: "load" });
        return;
      }
      // Copy the pages that still resolve into a new document; broken ones are skipped.
      const out = await PDFDocument.create();
      let lost = 0;
      for (const i of src.getPageIndices()) {
        try {
          const [p] = await out.copyPages(src, [i]);
          out.addPage(p!);
        } catch {
          lost++;
        }
      }
      if (out.getPageCount() === 0) {
        w.postMessage({ type: "error", code: "empty" });
        return;
      }
      try {
        out.setTitle(src.getTitle() ?? "");
        out.setAuthor(src.getAuthor() ?? "");
      } catch {
        /* unreadable info dictionary */
      }
      const bytes = await out.save({ useObjectStreams: true });
      w.postMessage({ type: "done", bytes, kind: "pdf", name: String(lost) }, [bytes.buffer]);
    } else {
      const out = await PDFDocument.create();
      for (const p of req.pages) {
        const img = await out.embedJpg(p.jpeg);
        out.addPage([p.width, p.height]).drawImage(img, { x: 0, y: 0, width: p.width, height: p.height });
      }
      const bytes = await out.save({ useObjectStreams: true });
      w.postMessage({ type: "done", bytes, kind: "pdf", name: "0" }, [bytes.buffer]);
    }
  } catch (error) {
    w.postMessage({ type: "error", code: "fail", message: error instanceof Error ? error.message : String(error) });
  }
};
