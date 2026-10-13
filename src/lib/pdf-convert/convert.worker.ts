/// <reference lib="webworker" />
/**
 * Layout + file writing for PDF → Word / Excel, off the main thread.
 * Receives page models and encoded images from the page, returns the file.
 */
import { buildDocument } from "./layout";
import { writeDocx } from "./docx";
import { writeXlsx, type XlsxOptions } from "./xlsx";
import { writePptx } from "./pptx";
import { buildSlide } from "./slides";
import type { ImageAsset, PageModel } from "./model";

export type ConvertRequest =
  | { kind: "docx"; pages: PageModel[]; assets: ImageAsset[]; title: string; keepPageBreaks: boolean }
  | { kind: "xlsx"; pages: PageModel[]; title: string; options: XlsxOptions }
  | { kind: "pptx"; pages: PageModel[]; assets: ImageAsset[]; title: string };

export type ConvertResponse =
  | { type: "done"; bytes: ArrayBuffer; stats: ConvertStats }
  | { type: "error"; message: string };

export interface ConvertStats {
  paragraphs: number;
  headings: number;
  tables: number;
  images: number;
  lists: number;
  header: boolean;
  footer: boolean;
  scannedPages: number;
  sheets?: number;
  rows?: number;
  slides?: number;
  textBoxes?: number;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (event: MessageEvent<ConvertRequest>) => {
  const req = event.data;
  try {
    if (req.kind === "docx") {
      const doc = buildDocument(req.pages, req.title, { mode: "word" });
      const stats: ConvertStats = { paragraphs: 0, headings: 0, tables: 0, images: 0, lists: 0, header: !!doc.header, footer: !!doc.footer || doc.footerPageNumbers, scannedPages: 0 };
      for (const s of doc.sections) {
        if (s.scanned) stats.scannedPages++;
        for (const b of s.blocks) {
          if (b.kind === "paragraph") {
            stats.paragraphs++;
            if (b.heading) stats.headings++;
            if (b.list) stats.lists++;
          } else if (b.kind === "table") stats.tables++;
          else stats.images += b.items.length;
        }
      }
      const bytes = await writeDocx(doc, req.assets, { keepPageBreaks: req.keepPageBreaks });
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      ctx.postMessage({ type: "done", bytes: buffer, stats } satisfies ConvertResponse, [buffer]);
    } else if (req.kind === "pptx") {
      const { bytes, stats: s } = await writePptx(req.pages.map(buildSlide), req.assets, req.title);
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const stats: ConvertStats = { paragraphs: 0, headings: 0, tables: 0, images: s.images, lists: 0, header: false, footer: false, scannedPages: req.pages.filter((p) => p.scanned).length, slides: s.slides, textBoxes: s.textBoxes };
      ctx.postMessage({ type: "done", bytes: buffer, stats } satisfies ConvertResponse, [buffer]);
    } else {
      const { bytes, sheets, rows, tables } = await writeXlsx(req.pages, req.title, req.options);
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const stats: ConvertStats = { paragraphs: 0, headings: 0, tables, images: 0, lists: 0, header: false, footer: false, scannedPages: req.pages.filter((p) => p.scanned).length, sheets, rows };
      ctx.postMessage({ type: "done", bytes: buffer, stats } satisfies ConvertResponse, [buffer]);
    }
  } catch (error) {
    ctx.postMessage({ type: "error", message: error instanceof Error ? error.message : String(error) } satisfies ConvertResponse);
  }
};
