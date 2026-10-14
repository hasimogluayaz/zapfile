/**
 * Data model shared by the PDF → Word / Excel converters.
 *
 * `extract.ts` (main thread, pdf.js) turns each page into a `PageModel`:
 * positioned glyphs with their real font, size, weight and colour, ruling
 * lines and filled boxes (table borders, cell shading) and images. Everything
 * is in display coordinates: PDF points, origin top-left, y down, page
 * rotation already applied. `layout.ts` (worker) rebuilds paragraphs, tables
 * and figures from it; `docx.ts` / `xlsx.ts` write the files.
 */

export interface Glyph {
  /** Unicode text of the glyph (may be more than one code point, e.g. ligatures). */
  text: string;
  /** Left / right edge along the baseline. */
  x0: number;
  x1: number;
  /** Baseline y. */
  y: number;
  /** Font size in points (as rendered). */
  size: number;
  /** Index into PageModel.fonts. */
  font: number;
  /** #rrggbb */
  color: string;
  /** Glyph is a space (word separator). */
  space: boolean;
  /** Text is invisible (render mode 3): typically an OCR layer over a scan. */
  hidden: boolean;
  /** Text runs vertically or is rotated more than a few degrees. */
  rotated: boolean;
  /** Set by layout when a drawn line sits right under the glyph. */
  underline?: boolean;
}

export interface FontInfo {
  /** Family name for Word, e.g. "Times New Roman". */
  family: string;
  bold: boolean;
  italic: boolean;
  monospace: boolean;
  serif: boolean;
}

/** A straight stroke (or a very thin filled box) — candidate table rule. */
export interface Rule {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  /** Stroke width in points. */
  width: number;
  color: string;
}

/** A filled rectangle (cell shading, coloured boxes, highlight). */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

/** Bounding box of vector drawing that isn't a rule or box (curves, charts, logos). */
export interface Shape {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Number of path segments, a rough measure of complexity. */
  segments: number;
}

export interface PlacedImage {
  /** A rendered vector figure (chart, diagram): text inside it is part of the picture. */
  figure?: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Key into the images map sent alongside the pages. */
  id: string;
  /** Pixel size of the encoded image. */
  pxW: number;
  pxH: number;
}

export interface PageModel {
  index: number;
  width: number;
  height: number;
  glyphs: Glyph[];
  fonts: FontInfo[];
  rules: Rule[];
  boxes: Box[];
  shapes: Shape[];
  images: PlacedImage[];
  /** Page has no real text but has a large image: a scan. */
  scanned: boolean;
}

/** Encoded image bytes, keyed by PlacedImage.id. */
export interface ImageAsset {
  id: string;
  bytes: ArrayBuffer;
  mime: "image/png" | "image/jpeg";
  pxW: number;
  pxH: number;
}

// ── Output document model (built by layout.ts) ──────────────────────────────

export interface TextRun {
  text: string;
  font: string;
  /** Points. */
  size: number;
  bold: boolean;
  italic: boolean;
  color: string;
  underline?: boolean;
  /** Superscript / subscript. */
  vertAlign?: "superscript" | "subscript";
}

export type Align = "left" | "center" | "right" | "justify";

export interface ParagraphBlock {
  kind: "paragraph";
  runs: TextRun[];
  align: Align;
  /** Points from the left margin. */
  indent: number;
  /** First-line indent relative to `indent` (negative = hanging). */
  firstLine: number;
  /** Points of space before the paragraph. */
  spaceBefore: number;
  /** Line spacing as a multiple of single spacing. */
  lineSpacing: number;
  /** 1–3 for headings, 0 for body text. */
  heading: number;
  list?: { ordered: boolean; level: number };
  rtl: boolean;
  /** A horizontal rule drawn under the paragraph (or standing alone). */
  borderBottom?: { color: string; width: number; /** Points between the text and the line. */ space?: number };
}

export interface TableCell {
  paragraphs: ParagraphBlock[];
  /** Columns spanned. */
  colSpan: number;
  /** Rows spanned (first cell of a vertical merge); 0 = continuation of a merge above. */
  rowSpan: number;
  shading?: string;
  /** Plain text of the cell (for Excel). */
  text: string;
}

export interface TableBlock {
  kind: "table";
  /** Column widths in points. */
  columns: number[];
  rows: { height: number; cells: TableCell[] }[];
  /** Borders were drawn in the PDF (false = whitespace-aligned table). */
  ruled: boolean;
  indent: number;
  spaceBefore: number;
}

export interface ImageBlock {
  kind: "image";
  /** Images on one row, left to right; display size in points. */
  items: { id: string; w: number; h: number }[];
  indent: number;
  align: Align;
  spaceBefore: number;
}

export type Block = ParagraphBlock | TableBlock | ImageBlock;

export interface SectionModel {
  /** Page size and margins in points. */
  width: number;
  height: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  blocks: Block[];
  /** Start this section on a new page. */
  pageBreakBefore: boolean;
  /** Page was a scan without a text layer: it holds just the page image. */
  scanned: boolean;
}

export interface DocumentModel {
  sections: SectionModel[];
  /** Running header / footer text found on most pages (moved out of the body). */
  header: string | null;
  footer: string | null;
  /** The footer contained page numbers. */
  footerPageNumbers: boolean;
  title: string;
  bodyFont: string;
  bodySize: number;
}
