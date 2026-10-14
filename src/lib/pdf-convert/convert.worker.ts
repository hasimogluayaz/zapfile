/// <reference lib="webworker" />
/**
 * Layout + file writing for PDF → Word / Excel, off the main thread.
 * Receives page models and encoded images from the page, returns the file.
 */
import { buildDocument } from "./layout";
import { writeDocx } from "./docx";
import { prefersExactLayout, writeDocxLayout } from "./docx-layout";
import { writeXlsx, type XlsxOptions } from "./xlsx";
import { writePptx } from "./pptx";
import { buildSlide } from "./slides";
import { writeMarkdown } from "./markdown";
import type { ImageAsset, PageModel } from "./model";

export type ConvertRequest =
  | { kind: "docx"; pages: PageModel[]; assets: ImageAsset[]; title: string; keepPageBreaks: boolean; layout: DocxLayout }
  | { kind: "xlsx"; pages: PageModel[]; title: string; options: XlsxOptions }
  | { kind: "pptx"; pages: PageModel[]; assets: ImageAsset[]; title: string }
  | { kind: "md"; pages: PageModel[]; assets: ImageAsset[]; title: string; images: boolean };

/** "auto" picks exact layout for designed documents (brochures, offers) and flowing text otherwise. */
export type DocxLayout = "auto" | "flow" | "exact";

export type ConvertResponse =
  | { type: "done"; bytes: ArrayBuffer; stats: ConvertStats; zip?: boolean; preview?: string }
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
  /** Word file written with every element in its exact place (not reflowed). */
  exactLayout?: boolean;
}

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (event: MessageEvent<ConvertRequest>) => {
  const req = event.data;
  try {
    if (req.kind === "docx" && (req.layout === "exact" || (req.layout !== "flow" && prefersExactLayout(req.pages)))) {
      const { bytes, stats: s } = await writeDocxLayout(req.pages, req.assets, req.title);
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const stats: ConvertStats = { paragraphs: 0, headings: 0, tables: 0, images: s.images, lists: 0, header: false, footer: false, scannedPages: req.pages.filter((p) => p.scanned).length, textBoxes: s.textBoxes, exactLayout: true };
      ctx.postMessage({ type: "done", bytes: buffer, stats } satisfies ConvertResponse, [buffer]);
    } else if (req.kind === "docx" || req.kind === "md") {
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
      if (req.kind === "md") {
        const md = await writeMarkdown(doc, req.assets, req.images);
        const buffer = md.bytes.buffer.slice(md.bytes.byteOffset, md.bytes.byteOffset + md.bytes.byteLength) as ArrayBuffer;
        ctx.postMessage({ type: "done", bytes: buffer, stats, zip: md.zip, preview: md.preview } satisfies ConvertResponse, [buffer]);
        return;
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
