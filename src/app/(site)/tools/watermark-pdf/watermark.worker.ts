/// <reference lib="webworker" />
import { PDFDocument, degrees, rgb, type PDFFont, type PDFImage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { hexToRgb01, makeFrame, placements, rotateVec, textBlock, toUser } from "@/lib/pdf-stamp/geometry";
import { MARGIN, TILE_GAP, type WatermarkRequest } from "./watermark";

const w = self as unknown as DedicatedWorkerGlobalScope;

w.onmessage = async (e: MessageEvent<WatermarkRequest>) => {
  const { bytes, options: o, image, fontBytes } = e.data;
  try {
    let doc: PDFDocument;
    try {
      doc = await PDFDocument.load(bytes, { updateMetadata: false });
    } catch {
      w.postMessage({ type: "error", code: "load" });
      return;
    }
    doc.registerFontkit(fontkit);
    let font: PDFFont | null = null;
    let img: PDFImage | null = null;
    if (o.kind === "text") font = await doc.embedFont(fontBytes!, { subset: true });
    else if (image) img = image.type === "png" ? await doc.embedPng(image.bytes) : await doc.embedJpg(image.bytes);
    const [r, g, b] = hexToRgb01(o.color);
    const lines = o.text.split(/\r?\n/);
    const wanted = o.pages ? new Set(o.pages) : null;
    const pages = doc.getPages();
    pages.forEach((page, i) => {
      if (wanted && !wanted.has(i + 1)) return;
      const crop = page.getCropBox();
      const f = makeFrame({ x: crop.x, y: crop.y, width: crop.width, height: crop.height }, page.getRotation().angle);
      const margin = f.width * MARGIN, gap = f.width * TILE_GAP;
      if (font) {
        const size = Math.max(4, f.width * o.size);
        const ascent = font.heightAtSize(size, { descender: false });
        const descent = font.heightAtSize(size) - ascent;
        const block = textBlock(lines.map((l) => font!.widthOfTextAtSize(l, size)), size, ascent, descent);
        for (const c of placements(f.width, f.height, block.w, block.h, o.rotation, o.where, margin, gap)) {
          block.lines.forEach((ln, k) => {
            if (!lines[k]) return;
            const [dx, dy] = rotateVec(ln.dx, ln.dy, o.rotation);
            const at = toUser(c.x + dx, c.y + dy, f);
            page.drawText(lines[k]!, { x: at.x, y: at.y, size, font: font!, color: rgb(r, g, b), opacity: o.opacity, rotate: degrees(at.angle + o.rotation) });
          });
        }
      } else if (img && image) {
        const iw = f.width * o.imageScale, ih = (iw * image.height) / image.width;
        for (const c of placements(f.width, f.height, iw, ih, o.rotation, o.where, margin, gap)) {
          const [dx, dy] = rotateVec(-iw / 2, -ih / 2, o.rotation);
          const at = toUser(c.x + dx, c.y + dy, f);
          page.drawImage(img, { x: at.x, y: at.y, width: iw, height: ih, opacity: o.opacity, rotate: degrees(at.angle + o.rotation) });
        }
      }
      if (i % 10 === 0) w.postMessage({ type: "progress", value: (i + 1) / pages.length });
    });
    const out = await doc.save({ useObjectStreams: true });
    w.postMessage({ type: "done", bytes: out, kind: "pdf" }, [out.buffer]);
  } catch (error) {
    w.postMessage({ type: "error", code: "fail", message: error instanceof Error ? error.message : String(error) });
  }
};
