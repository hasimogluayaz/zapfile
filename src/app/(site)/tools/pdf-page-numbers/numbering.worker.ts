/// <reference lib="webworker" />
/**
 * Writes page numbers into a PDF off the main thread. Labels are drawn with a
 * PDF standard font (real, selectable text); characters that font can't
 * encode (Cyrillic, Greek extensions, CJK, Arabic…) are rendered with the
 * system font at 288 dpi and placed as images, each distinct run embedded once.
 */
import { PDFDocument, StandardFonts, degrees, rgb, type PDFImage } from "pdf-lib";
import {
  CSS_FONT,
  RASTER_SCALE,
  canvasMetrics,
  hexToRgb01,
  isNumbered,
  labelFor,
  measureLabel,
  normalizeRotation,
  placeLabel,
  toUserSpace,
  visibleSize,
  type Measurer,
  type NumberingRequest,
  type NumberingResponse,
} from "./numbering";

declare const self: DedicatedWorkerGlobalScope;

class UnicodeUnsupported extends Error {}

const post = (msg: NumberingResponse, transfer: Transferable[] = []) => self.postMessage(msg, transfer);

self.onmessage = async (event: MessageEvent<NumberingRequest>) => {
  const { bytes, options } = event.data;
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { updateMetadata: false });
  } catch (error) {
    post({ type: "error", code: "invalid", message: String(error) });
    return;
  }
  try {
    const font = await doc.embedFont(StandardFonts[options.font]);
    const charset = new Set(font.getCharacterSet());
    let measureCtx: OffscreenCanvasRenderingContext2D | null = null;
    const ctx2d = () => {
      if (!measureCtx) {
        if (typeof OffscreenCanvas === "undefined") throw new UnicodeUnsupported();
        measureCtx = new OffscreenCanvas(1, 1).getContext("2d");
        if (!measureCtx) throw new UnicodeUnsupported();
      }
      return measureCtx;
    };
    const ascentAt = (size: number) => font.heightAtSize(size, { descender: false });
    const measurer: Measurer = {
      charset,
      vector: (text, size) => ({
        width: font.widthOfTextAtSize(text, size),
        ascent: ascentAt(size),
        descent: font.heightAtSize(size) - ascentAt(size),
      }),
      raster: (text, size) => canvasMetrics(ctx2d(), text, size, options.font),
    };

    const [r, g, b] = hexToRgb01(options.color);
    const color = rgb(r, g, b);
    const images = new Map<string, { image: PDFImage; width: number; height: number; below: number; left: number }>();
    const rasterRun = async (text: string, ascent: number, width: number) => {
      const hit = images.get(text);
      if (hit) return hit;
      const S = RASTER_SCALE;
      const pad = 2;
      const metrics = canvasMetrics(ctx2d(), text, options.size, options.font);
      const top = Math.ceil(Math.max(ascent, metrics.ascent) * S) + pad;
      const w = Math.ceil(Math.max(width, metrics.width) * S) + pad * 2;
      const h = top + Math.ceil(metrics.descent * S) + pad;
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new UnicodeUnsupported();
      ctx.font = `${options.size * S}px ${CSS_FONT[options.font]}`;
      ctx.fillStyle = options.color;
      ctx.textBaseline = "alphabetic";
      ctx.fillText(text, pad, top);
      const blob = await canvas.convertToBlob({ type: "image/png" });
      const image = await doc.embedPng(await blob.arrayBuffer());
      const entry = { image, width: w / S, height: h / S, below: (h - top) / S, left: pad / S };
      images.set(text, entry);
      return entry;
    };

    const pages = doc.getPages();
    const pageCount = pages.length;
    const first = Math.max(1, options.firstPage);
    const last = Math.min(pageCount, options.lastPage);
    const total = Math.max(1, last - first + 1);
    let done = 0;
    let lastPost = 0;
    for (let i = first; i <= last; i++) {
      if (!isNumbered(options, i)) continue;
      const page = pages[i - 1]!;
      const box = page.getCropBox();
      const rotation = normalizeRotation(page.getRotation().angle);
      const vis = visibleSize(box, rotation);
      const label = labelFor(options, i, pageCount);
      const pieces = measureLabel(label, options.size, measurer);
      const place = placeLabel(pieces, vis.width, vis.height, options, i);
      let cursor = place.x;
      for (const piece of pieces) {
        if (!piece.text.trim()) {
          cursor += piece.width;
          continue;
        }
        if (piece.raster) {
          const img = await rasterRun(piece.text, place.ascent, piece.width);
          const at = toUserSpace(cursor - img.left, place.baseline - img.below, box, rotation);
          page.drawImage(img.image, {
            x: at.x,
            y: at.y,
            width: img.width,
            height: img.height,
            rotate: degrees(at.angle),
            opacity: options.opacity,
          });
        } else {
          const at = toUserSpace(cursor, place.baseline, box, rotation);
          page.drawText(piece.text, {
            x: at.x,
            y: at.y,
            size: options.size,
            font,
            color,
            opacity: options.opacity,
            rotate: degrees(at.angle),
          });
        }
        cursor += piece.width;
      }
      done++;
      const now = Date.now();
      if (now - lastPost > 60) {
        lastPost = now;
        post({ type: "progress", done, total });
      }
    }
    post({ type: "progress", done: total, total });
    const out = await doc.save();
    const buf = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
    post({ type: "done", bytes: buf }, [buf]);
  } catch (error) {
    if (error instanceof UnicodeUnsupported) post({ type: "error", code: "unicode", message: "OffscreenCanvas unavailable" });
    else post({ type: "error", code: "generic", message: error instanceof Error ? error.message : String(error) });
  }
};
