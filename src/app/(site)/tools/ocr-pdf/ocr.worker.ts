/// <reference lib="webworker" />
/**
 * Adds an invisible, searchable text layer (render mode 3) on top of each OCR'd page. The page
 * itself is untouched, so scans keep their exact look; selecting or searching hits the words.
 */
import {
  PDFDocument,
  PDFOperator,
  PDFOperatorNames,
  TextRenderingMode,
  asPDFNumber,
  beginText,
  endText,
  popGraphicsState,
  pushGraphicsState,
  rotateAndSkewTextDegreesAndTranslate,
  setFontAndSize,
  setTextRenderingMode,
  showText,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { makeFrame, toUser } from "@/lib/pdf-stamp/geometry";

const w = self as unknown as DedicatedWorkerGlobalScope;

/** A recognised word: box and baseline in the page's visible frame (points, origin top-left). */
export interface OcrWord {
  text: string;
  x0: number;
  x1: number;
  baseline: number;
  size: number;
}

export interface OcrRequest {
  bytes: ArrayBuffer;
  pages: { page: number; words: OcrWord[] }[];
  font: ArrayBuffer;
}

w.onmessage = async (e: MessageEvent<OcrRequest>) => {
  const { bytes, pages, font: fontBytes } = e.data;
  try {
    let doc: PDFDocument;
    try {
      doc = await PDFDocument.load(bytes, { updateMetadata: false });
    } catch {
      w.postMessage({ type: "error", code: "load" });
      return;
    }
    doc.registerFontkit(fontkit);
    const font = await doc.embedFont(fontBytes, { subset: true });
    const all = doc.getPages();
    for (const p of pages) {
      const page = all[p.page - 1];
      if (!page || !p.words.length) continue;
      const crop = page.getCropBox();
      const f = makeFrame({ x: crop.x, y: crop.y, width: crop.width, height: crop.height }, page.getRotation().angle);
      const key = page.node.newFontDictionary(font.name, font.ref);
      const ops: PDFOperator[] = [pushGraphicsState(), beginText(), setTextRenderingMode(TextRenderingMode.Invisible)];
      for (const wd of p.words) {
        const text = wd.text.replace(/\s+/g, " ").trim();
        if (!text) continue;
        let encoded;
        try {
          encoded = font.encodeText(text);
        } catch {
          continue;
        }
        const size = Math.max(1, wd.size);
        const natural = font.widthOfTextAtSize(text, size);
        // Stretch the invisible word to its box so selections line up with the picture.
        const scale = natural > 0 ? Math.max(10, Math.min(400, ((wd.x1 - wd.x0) / natural) * 100)) : 100;
        const at = toUser(wd.x0, f.height - wd.baseline, f);
        ops.push(
          setFontAndSize(key, size),
          PDFOperator.of(PDFOperatorNames.SetTextHorizontalScaling, [asPDFNumber(scale)]),
          rotateAndSkewTextDegreesAndTranslate(at.angle, 0, 0, at.x, at.y),
          showText(encoded),
        );
      }
      ops.push(endText(), popGraphicsState());
      page.pushOperators(...ops);
    }
    const out = await doc.save({ useObjectStreams: true });
    w.postMessage({ type: "done", bytes: out, kind: "pdf" }, [out.buffer]);
  } catch (error) {
    w.postMessage({ type: "error", code: "fail", message: error instanceof Error ? error.message : String(error) });
  }
};
