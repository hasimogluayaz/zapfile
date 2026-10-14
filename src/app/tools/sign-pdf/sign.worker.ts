/// <reference lib="webworker" />
import { PDFDocument, degrees, rgb, type PDFFont, type PDFImage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { hexToRgb01, makeFrame, toUser } from "@/lib/pdf-stamp/geometry";
import type { PdfFontKey } from "@/lib/pdf-stamp/fonts";
import type { SignRequest } from "./sign";

const w = self as unknown as DedicatedWorkerGlobalScope;

w.onmessage = async (e: MessageEvent<SignRequest>) => {
  const { bytes, items, images, fonts } = e.data;
  try {
    let doc: PDFDocument;
    try {
      doc = await PDFDocument.load(bytes, { updateMetadata: false });
    } catch {
      w.postMessage({ type: "error", code: "load" });
      return;
    }
    doc.registerFontkit(fontkit);
    const embedded = new Map<string, PDFImage>();
    for (const [key, data] of Object.entries(images)) embedded.set(key, await doc.embedPng(data));
    const fontCache = new Map<PdfFontKey, PDFFont>();
    for (const [key, data] of Object.entries(fonts)) if (data) fontCache.set(key as PdfFontKey, await doc.embedFont(data, { subset: true }));
    const pages = doc.getPages();
    for (const it of items) {
      const page = pages[it.page - 1];
      if (!page) continue;
      const crop = page.getCropBox();
      const f = makeFrame({ x: crop.x, y: crop.y, width: crop.width, height: crop.height }, page.getRotation().angle);
      if (it.kind === "image") {
        const img = embedded.get(it.image);
        if (!img) continue;
        // Bottom-left corner in the visible frame (y up).
        const at = toUser(it.x, f.height - (it.y + it.h), f);
        page.drawImage(img, { x: at.x, y: at.y, width: it.w, height: it.h, rotate: degrees(at.angle) });
      } else {
        const font = fontCache.get(it.font);
        if (!font || !it.text) continue;
        const ascent = font.heightAtSize(it.size, { descender: false });
        const at = toUser(it.x, f.height - (it.y + ascent), f);
        const [r, g, b] = hexToRgb01(it.color);
        page.drawText(it.text, { x: at.x, y: at.y, size: it.size, font, color: rgb(r, g, b), rotate: degrees(at.angle) });
      }
    }
    const out = await doc.save({ useObjectStreams: true });
    w.postMessage({ type: "done", bytes: out, kind: "pdf" }, [out.buffer]);
  } catch (error) {
    w.postMessage({ type: "error", code: "fail", message: error instanceof Error ? error.message : String(error) });
  }
};
