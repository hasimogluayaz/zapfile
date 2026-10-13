/**
 * Words with their boxes (points, page's visible frame, origin top-left), in reading order, for
 * every page of a PDF. Used by Compare PDF and Redact PDF.
 */
import type { PDFDocumentProxy } from "pdfjs-dist";
import { extractPage } from "./extract";
import { groupLines, usableGlyphs } from "./layout";

export interface Word {
  text: string;
  page: number;
  x0: number;
  x1: number;
  top: number;
  bottom: number;
}

export interface DocText {
  words: Word[];
  /** Word index ranges [start, end) per text line. */
  lines: [number, number][];
}

/** Words with boxes, in reading order, from every page. */
export async function readWords(pdf: PDFDocumentProxy, onPage: (n: number) => void): Promise<DocText> {
  const words: Word[] = [];
  const lines: [number, number][] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    onPage(n);
    const { page } = await extractPage(pdf, n, { images: false });
    for (const line of groupLines(usableGlyphs(page).glyphs)) {
      const start = words.length;
      let cur: Word | null = null;
      let last: { x1: number; size: number } | null = null;
      for (const g of line.glyphs) {
        const gap = last ? g.x0 - last.x1 : 0;
        if (g.space || (last && gap > Math.max(g.size, last.size) * 0.2)) {
          if (cur) words.push(cur);
          cur = null;
        }
        if (!g.space && g.text.trim()) {
          if (cur) {
            cur.text += g.text;
            cur.x1 = Math.max(cur.x1, g.x1);
            cur.top = Math.min(cur.top, g.y - g.size * 0.82);
            cur.bottom = Math.max(cur.bottom, g.y + g.size * 0.24);
          } else cur = { text: g.text, page: n, x0: g.x0, x1: g.x1, top: g.y - g.size * 0.82, bottom: g.y + g.size * 0.24 };
        }
        last = { x1: g.x1, size: g.size };
      }
      if (cur) words.push(cur);
      if (words.length > start) lines.push([start, words.length]);
    }
    await new Promise((r) => setTimeout(r, 0));
  }
  return { words, lines };
}

