/**
 * Rebuilds an editable document from positioned glyphs (see extract.ts):
 * lines and styled runs, columns, paragraphs with alignment, indents,
 * spacing, headings and lists, tables (ruled grids with merged cells and
 * shading, and whitespace-aligned tables), images and figures, and running
 * headers/footers that repeat on every page.
 *
 * Pure functions (no DOM, no pdf.js): runs in a worker and in Node tests.
 */
import type {
  Align,
  Block,
  DocumentModel,
  FontInfo,
  Glyph,
  ImageBlock,
  PageModel,
  ParagraphBlock,
  PlacedImage,
  Rule,
  SectionModel,
  TableBlock,
  TableCell,
  TextRun,
} from "./model";

// ── Small helpers ────────────────────────────────────────────────────────────

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

function contains(r: Rect, x: number, y: number, pad = 0): boolean {
  return x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;
}

function overlapArea(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

const CJK = /[⺀-⿟　-〿぀-ヿ㄀-ㄯ㆐-ㇿ㐀-䶿一-鿿豈-﫿︰-﹏＀-￯]/;
const RTL_CHAR = /[֐-ࣿיִ-﷿ﹰ-﻿]/;

function isCjk(ch: string | undefined): boolean {
  return !!ch && CJK.test(ch);
}

// ── Glyph clean-up ───────────────────────────────────────────────────────────

/**
 * Glyphs worth laying out: upright, on the page, without the duplicate copies
 * some PDFs draw for fake bold. When a page is a scan with an invisible OCR
 * layer, that layer becomes the text.
 */
export function usableGlyphs(page: PageModel): { glyphs: Glyph[]; ocrLayer: boolean } {
  const hidden = page.glyphs.filter((g) => g.hidden && !g.space).length;
  const visible = page.glyphs.filter((g) => !g.hidden && !g.space).length;
  const ocrLayer = hidden > 20 && hidden > visible * 2;
  const out: Glyph[] = [];
  const seen = new Map<string, Glyph[]>();
  for (const g of page.glyphs) {
    if (g.rotated) continue;
    if (g.hidden && !ocrLayer) continue;
    if (g.x1 < -2 || g.x0 > page.width + 2 || g.y < -2 || g.y > page.height + 2) continue;
    if (!g.text) continue;
    // Fake bold: the same glyph drawn again a hair away.
    const key = `${g.text}|${Math.round(g.y)}`;
    const near = seen.get(key);
    if (near?.some((o) => Math.abs(o.x0 - g.x0) < g.size * 0.15 && Math.abs(o.y - g.y) < g.size * 0.15)) continue;
    if (near) near.push(g);
    else seen.set(key, [g]);
    out.push(ocrLayer ? { ...g, hidden: false, color: "#000000" } : g);
  }
  return { glyphs: out, ocrLayer };
}

// ── Figures (vector drawings worth keeping as pictures) ─────────────────────

/**
 * Areas of vector drawing (charts, diagrams, logos) that should be rendered as
 * a picture. Decorative boxes around text are not figures.
 */
export function findFigureRegions(page: PageModel): Rect[] {
  const glyphs = page.glyphs.filter((g) => !g.hidden && !g.space && !g.rotated);
  const pageArea = page.width * page.height;
  const rects: (Rect & { segments: number; boxes: number; shapes: number })[] = page.shapes
    .filter((s) => s.w * s.h < pageArea * 0.9)
    .map((s) => ({ x: s.x, y: s.y, w: s.w, h: s.h, segments: s.segments, boxes: 0, shapes: 1 }));
  // Filled boxes with no text on them are chart bars and legend swatches; boxes
  // holding text are cell shading or highlights and stay out.
  for (const b of page.boxes) {
    if (b.w * b.h > pageArea * 0.5 || b.w < 1.5 || b.h < 1.5) continue;
    if (glyphs.some((g) => contains(b, (g.x0 + g.x1) / 2, g.y - g.size * 0.3))) continue;
    rects.push({ x: b.x, y: b.y, w: b.w, h: b.h, segments: 4, boxes: 1, shapes: 0 });
  }
  if (rects.length === 0) return [];
  // Strokes (axes, ticks, bar outlines) glue a chart's parts together, but never make a figure alone.
  for (const r of page.rules) {
    const x = Math.min(r.x0, r.x1);
    const y = Math.min(r.y0, r.y1);
    rects.push({ x, y, w: Math.abs(r.x1 - r.x0), h: Math.abs(r.y1 - r.y0), segments: 1, boxes: 0, shapes: 0 });
  }
  // Merge overlapping / touching shapes (a few points apart).
  const pad = 6;
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < rects.length && !merged; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i]!;
        const b = rects[j]!;
        if (a.x - pad < b.x + b.w && b.x - pad < a.x + a.w && a.y - pad < b.y + b.h && b.y - pad < a.y + a.h) {
          const x = Math.min(a.x, b.x);
          const y = Math.min(a.y, b.y);
          rects[i] = { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y, segments: a.segments + b.segments, boxes: a.boxes + b.boxes, shapes: a.shapes + b.shapes };
          rects.splice(j, 1);
          merged = true;
          break;
        }
      }
    }
  }
  const out: Rect[] = [];
  for (const r of rects) {
    if (r.w < 28 || r.h < 20) continue;
    if (r.w > page.width * 0.97 && r.h > page.height * 0.97) continue; // page background
    const inside = glyphs.filter((g) => contains(r, (g.x0 + g.x1) / 2, g.y)).length;
    const area = r.w * r.h;
    // Lots of text with few drawn segments = a decorated text box, keep it editable.
    if (inside > 0 && (inside > r.segments * 2.5 || inside > 160)) continue;
    if (r.segments < 6 && area < 6000) continue;
    // Without curves a chart needs several bars; one empty box is a frame or a blank cell.
    if (r.shapes === 0 && r.boxes < 3) continue;
    // Pull in labels that sit just outside the drawing (axis titles, legends).
    let x0 = r.x;
    let y0 = r.y;
    let x1 = r.x + r.w;
    let y1 = r.y + r.h;
    for (const g of glyphs) {
      const near = g.x1 > r.x - 30 && g.x0 < r.x + r.w + 30 && g.y > r.y - 14 && g.y - g.size < r.y + r.h + 14;
      if (!near) continue;
      if (contains(r, (g.x0 + g.x1) / 2, g.y)) continue;
      // Only short labels, not running text next to the figure.
      if (g.x1 - g.x0 > 0 && g.size < 14) {
        x0 = Math.min(x0, g.x0);
        x1 = Math.max(x1, g.x1);
        y0 = Math.min(y0, g.y - g.size);
        y1 = Math.max(y1, g.y + g.size * 0.3);
      }
    }
    out.push({ x: x0 - 2, y: y0 - 2, w: x1 - x0 + 4, h: y1 - y0 + 4 });
  }
  return out;
}

// ── Ruled tables ─────────────────────────────────────────────────────────────

interface Seg {
  a: number; // start (x for horizontal, y for vertical)
  b: number; // end
  at: number; // fixed coordinate
}

function mergeSegs(segs: Seg[], tol = 1.5): Seg[] {
  const sorted = [...segs].sort((p, q) => p.at - q.at || p.a - q.a);
  const out: Seg[] = [];
  for (const s of sorted) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.at - s.at) <= tol && s.a <= last.b + 2.5) {
      last.b = Math.max(last.b, s.b);
      last.at = (last.at + s.at) / 2;
    } else {
      out.push({ ...s });
    }
  }
  return out;
}

function cluster(values: number[], tol: number): number[] {
  const s = [...values].sort((a, b) => a - b);
  const out: number[][] = [];
  for (const v of s) {
    const last = out[out.length - 1];
    if (last && v - last[last.length - 1]! <= tol) last.push(v);
    else out.push([v]);
  }
  return out.map((g) => g.reduce((x, y) => x + y, 0) / g.length);
}

export interface GridTable {
  rect: Rect;
  xs: number[];
  ys: number[];
  /** [row][col] → owning cell index, or -1 */
  spans: { r: number; c: number; rs: number; cs: number }[];
  shading: Map<number, string>;
}

/** Tables drawn with ruling lines (or thin filled bars). */
export function findRuledTables(page: PageModel, exclude: Rect[] = []): GridTable[] {
  const excluded = (x0: number, y0: number, x1: number, y1: number) => exclude.some((r) => contains(r, (x0 + x1) / 2, (y0 + y1) / 2, 1));
  const hs: Seg[] = [];
  const vs: Seg[] = [];
  const addRule = (r: Rule) => {
    const dx = r.x1 - r.x0;
    const dy = r.y1 - r.y0;
    if (excluded(r.x0, r.y0, r.x1, r.y1)) return;
    if (dy <= 1.5 && dx > 3) hs.push({ a: r.x0, b: r.x1, at: (r.y0 + r.y1) / 2 });
    else if (dx <= 1.5 && dy > 3) vs.push({ a: r.y0, b: r.y1, at: (r.x0 + r.x1) / 2 });
  };
  page.rules.forEach(addRule);
  // Cell backgrounds drawn edge to edge also outline a grid.
  for (const b of page.boxes) {
    if (b.w > page.width * 0.95 && b.h > page.height * 0.95) continue;
    if (b.w < 6 || b.h < 6) continue;
    if (excluded(b.x, b.y, b.x + b.w, b.y + b.h)) continue;
    hs.push({ a: b.x, b: b.x + b.w, at: b.y }, { a: b.x, b: b.x + b.w, at: b.y + b.h });
    vs.push({ a: b.y, b: b.y + b.h, at: b.x }, { a: b.y, b: b.y + b.h, at: b.x + b.w });
  }
  const H = mergeSegs(hs);
  const V = mergeSegs(vs);
  if (H.length < 2 || V.length < 2) return [];

  // Union-find over intersecting horizontal/vertical segments.
  const n = H.length + V.length;
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i]!)));
  const tol = 2.5;
  for (let i = 0; i < H.length; i++) {
    const h = H[i]!;
    for (let j = 0; j < V.length; j++) {
      const v = V[j]!;
      if (v.at >= h.a - tol && v.at <= h.b + tol && h.at >= v.a - tol && h.at <= v.b + tol) {
        const a = find(i);
        const b = find(H.length + j);
        if (a !== b) parent[a] = b;
      }
    }
  }
  const groups = new Map<number, { h: Seg[]; v: Seg[] }>();
  H.forEach((h, i) => {
    const k = find(i);
    const g = groups.get(k) ?? { h: [], v: [] };
    g.h.push(h);
    groups.set(k, g);
  });
  V.forEach((v, j) => {
    const k = find(H.length + j);
    const g = groups.get(k) ?? { h: [], v: [] };
    g.v.push(v);
    groups.set(k, g);
  });

  const tables: GridTable[] = [];
  for (const { h, v } of Array.from(groups.values())) {
    if (h.length < 2 || v.length < 2) continue;
    const ys = cluster(h.map((s) => s.at), 2.5);
    const xs = cluster(v.map((s) => s.at), 2.5);
    if (ys.length < 2 || xs.length < 2) continue;
    const rect = { x: xs[0]!, y: ys[0]!, w: xs[xs.length - 1]! - xs[0]!, h: ys[ys.length - 1]! - ys[0]! };
    if (rect.w < 30 || rect.h < 10) continue;
    // A single box (one cell) is a frame, not a table: unless it holds a big grid of text we skip it.
    if (xs.length === 2 && ys.length === 2) continue;
    const rows = ys.length - 1;
    const cols = xs.length - 1;
    const covered = (segs: Seg[], at: number, from: number, to: number) => {
      const need = to - from;
      if (need <= 0) return true;
      let got = 0;
      for (const s of segs) {
        if (Math.abs(s.at - at) > 2.5) continue;
        got += Math.max(0, Math.min(s.b, to) - Math.max(s.a, from));
      }
      return got >= need * 0.6;
    };
    const owner: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(-1));
    const spans: GridTable["spans"] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (owner[r]![c] !== -1) continue;
        let cs = 1;
        while (c + cs < cols && !covered(v, xs[c + cs]!, ys[r]!, ys[r + 1]!)) cs++;
        let rs = 1;
        while (r + rs < rows) {
          let open = true;
          for (let k = c; k < c + cs; k++) {
            if (covered(h, ys[r + rs]!, xs[k]!, xs[k + 1]!) || owner[r + rs]![k] !== -1) {
              open = false;
              break;
            }
          }
          if (!open) break;
          rs++;
        }
        const index = spans.length;
        spans.push({ r, c, rs, cs });
        for (let rr = r; rr < r + rs; rr++) for (let cc = c; cc < c + cs; cc++) owner[rr]![cc] = index;
      }
    }
    // Everything merged into one cell: just a frame around text.
    if (spans.length < 2) continue;
    const shading = new Map<number, string>();
    spans.forEach((sp, i) => {
      const cell = { x: xs[sp.c]!, y: ys[sp.r]!, w: xs[sp.c + sp.cs]! - xs[sp.c]!, h: ys[sp.r + sp.rs]! - ys[sp.r]! };
      for (const b of page.boxes) {
        if (overlapArea(cell, b) > cell.w * cell.h * 0.6 && b.w * b.h < cell.w * cell.h * 3) shading.set(i, b.color);
      }
    });
    tables.push({ rect, xs, ys, spans, shading });
  }
  return tables;
}

// ── Lines and runs ───────────────────────────────────────────────────────────

export interface Line {
  glyphs: Glyph[];
  x0: number;
  x1: number;
  /** Baseline. */
  y: number;
  /** Largest font size on the line. */
  size: number;
  text: string;
  rtl: boolean;
}

export function groupLines(glyphs: Glyph[]): Line[] {
  const sorted = [...glyphs].sort((a, b) => a.y - b.y || a.x0 - b.x0);
  const lines: { y: number; size: number; glyphs: Glyph[] }[] = [];
  for (const g of sorted) {
    let best: (typeof lines)[number] | null = null;
    let bestDy = Infinity;
    for (let i = lines.length - 1; i >= 0 && i >= lines.length - 6; i--) {
      const line = lines[i]!;
      const dy = Math.abs(g.y - line.y);
      // Superscripts/subscripts sit up to ~0.4 em off the baseline.
      if (dy > 0.45 * Math.max(line.size, g.size)) continue;
      // Don't pull in a glyph that overlaps one already on the line (another text layer).
      const overlaps = !g.space && line.glyphs.some((o) => !o.space && Math.min(o.x1, g.x1) - Math.max(o.x0, g.x0) > Math.min(o.x1 - o.x0, g.x1 - g.x0) * 0.6 && Math.abs(o.y - g.y) > 0.15 * g.size);
      if (overlaps) continue;
      if (dy < bestDy) {
        best = line;
        bestDy = dy;
      }
    }
    if (best) {
      best.glyphs.push(g);
      if (g.size > best.size) {
        best.size = g.size;
        best.y = g.y;
      }
    } else {
      lines.push({ y: g.y, size: g.size, glyphs: [g] });
    }
  }
  return lines
    .map((l) => {
      const gs = l.glyphs.sort((a, b) => a.x0 - b.x0);
      const visible = gs.filter((g) => !g.space);
      if (visible.length === 0) return null;
      const text = plainText(gs);
      const rtlCount = Array.from(text).filter((c) => RTL_CHAR.test(c)).length;
      return {
        glyphs: gs,
        x0: Math.min(...visible.map((g) => g.x0)),
        x1: Math.max(...visible.map((g) => g.x1)),
        y: l.y,
        size: Math.max(...visible.map((g) => g.size)),
        text,
        rtl: rtlCount > text.length / 3,
      } satisfies Line;
    })
    .filter((l): l is Line => l !== null)
    .sort((a, b) => a.y - b.y || a.x0 - b.x0);
}

function gapNeedsSpace(prev: Glyph, next: Glyph): boolean {
  if (prev.space || next.space) return false;
  const gap = next.x0 - prev.x1;
  const size = Math.max(prev.size, next.size);
  if (gap <= size * 0.17) return false;
  return !isCjk(Array.from(prev.text).pop()) && !isCjk(Array.from(next.text)[0]);
}

function plainText(glyphs: Glyph[]): string {
  let out = "";
  let prev: Glyph | null = null;
  for (const g of glyphs) {
    if (prev && gapNeedsSpace(prev, g)) out += " ";
    out += g.space ? " " : g.text;
    prev = g;
  }
  return out.replace(/\s+/g, " ").trim();
}

/** Split a line into pieces at wide gaps (column gutters, table cells, tab stops). */
export function splitLine(line: Line, factor = 1.6): Line[] {
  const out: Line[] = [];
  let cur: Glyph[] = [];
  let lastX1 = -Infinity;
  const flush = () => {
    const visible = cur.filter((g) => !g.space);
    if (visible.length) {
      // The piece's own baseline: a heading in the next column may set the line's.
      const main = visible.reduce((a, b) => (b.size > a.size ? b : a));
      out.push({
        glyphs: cur,
        x0: Math.min(...visible.map((g) => g.x0)),
        x1: Math.max(...visible.map((g) => g.x1)),
        y: main.y,
        size: main.size,
        text: plainText(cur),
        rtl: line.rtl,
      });
    }
    cur = [];
  };
  for (const g of line.glyphs) {
    if (!g.space && cur.some((c) => !c.space) && g.x0 - lastX1 > factor * Math.max(g.size, line.size * 0.8)) flush();
    cur.push(g);
    if (!g.space) lastX1 = Math.max(lastX1, g.x1);
  }
  flush();
  return out;
}

function hexOk(c: string): string {
  return /^#[0-9a-f]{6}$/i.test(c) ? c.toLowerCase() : "#000000";
}

/** Styled runs of a line (or of several lines joined into one paragraph). */
export function runsOf(lines: Line[], fonts: FontInfo[], joinWith: (prev: Line, next: Line) => string): TextRun[] {
  const runs: TextRun[] = [];
  const push = (text: string, g: Glyph | null, lineSize: number, baseline: number) => {
    if (!text) return;
    const font = g ? fonts[g.font] : undefined;
    let vertAlign: TextRun["vertAlign"];
    if (g && g.size < lineSize * 0.82) {
      if (g.y < baseline - lineSize * 0.18) vertAlign = "superscript";
      else if (g.y > baseline + lineSize * 0.1) vertAlign = "subscript";
    }
    const size = vertAlign ? lineSize : g?.size ?? lineSize;
    const run: TextRun = {
      text,
      underline: g?.underline || undefined,
      font: font?.family ?? "Calibri",
      size: Math.round(size * 2) / 2,
      bold: !!font?.bold,
      italic: !!font?.italic,
      color: hexOk(g?.color ?? "#000000"),
      vertAlign,
    };
    const last = runs[runs.length - 1];
    if (
      last &&
      last.font === run.font &&
      last.size === run.size &&
      last.bold === run.bold &&
      last.italic === run.italic &&
      last.color === run.color &&
      last.vertAlign === run.vertAlign &&
      last.underline === run.underline
    ) {
      last.text += text;
    } else {
      runs.push(run);
    }
  };
  lines.forEach((line, li) => {
    if (li > 0) {
      const sep = joinWith(lines[li - 1]!, line);
      if (sep) {
        const last = runs[runs.length - 1];
        if (last) last.text += sep;
      }
    }
    let prev: Glyph | null = null;
    for (const g of line.glyphs) {
      if (prev) {
        const gap = g.x0 - prev.x1;
        if (!prev.space && !g.space && gap > Math.max(g.size, prev.size) * 2.6) push("\t", prev, line.size, line.y);
        else if (gapNeedsSpace(prev, g)) push(" ", prev, line.size, line.y);
      }
      if (g.space) {
        const last = runs[runs.length - 1];
        if (last && !/\s$/.test(last.text)) last.text += " ";
      } else {
        push(g.text, g, line.size, line.y);
      }
      prev = g;
    }
  });
  // Tidy whitespace without touching tabs.
  for (const r of runs) r.text = r.text.replace(/ {2,}/g, " ");
  if (runs.length) {
    runs[0]!.text = runs[0]!.text.replace(/^ +/, "");
    runs[runs.length - 1]!.text = runs[runs.length - 1]!.text.replace(/ +$/, "");
  }
  return runs.filter((r) => r.text.length > 0);
}

const LETTER_HYPHEN_END = /\p{L}-$/u;
const LOWER_START = /^\p{Ll}/u;

/** How two consecutive lines of one paragraph join: de-hyphenate, no space for CJK. */
function joinLines(prev: Line, next: Line): string {
  const a = prev.text;
  const b = next.text;
  if (LETTER_HYPHEN_END.test(a) && LOWER_START.test(b)) return "\u0000"; // marker: drop the hyphen
  if (isCjk(Array.from(a).pop()) || isCjk(Array.from(b)[0])) return "";
  return " ";
}

export function finishRuns(runs: TextRun[]): TextRun[] {
  // Apply de-hyphenation markers.
  for (let i = 0; i < runs.length; i++) {
    const r = runs[i]!;
    if (r.text.includes("\u0000")) r.text = r.text.replace(/-\u0000/g, "").replace(/\u0000/g, "");
  }
  return runs.filter((r) => r.text.length > 0);
}

// ── Paragraphs ───────────────────────────────────────────────────────────────

// Includes private-use glyphs that Symbol/Wingdings/OpenSymbol bullets map to.
const BULLET_RE = /^([•◦▪▫‣⁃●○■□►▶✓✔➢➤∙·*–—\-\uE000-\uF8FF])\s*/;
const ORDERED_RE = /^(\(?(\d{1,3}|[a-zA-Z]|[ivxlcIVXLC]{1,5})[.)])\s+/;

interface ParaContext {
  fonts: FontInfo[];
  bodySize: number;
  marginLeft: number;
  colLeft: number;
  colRight: number;
}

function lineIsBold(line: Line, fonts: FontInfo[]): boolean {
  const visible = line.glyphs.filter((g) => !g.space);
  return visible.length > 0 && visible.filter((g) => fonts[g.font]?.bold).length >= visible.length * 0.8;
}

function headingLevel(lines: Line[], ctx: ParaContext): number {
  if (lines.length > 3) return 0;
  const size = median(lines.map((l) => l.size));
  const text = lines.map((l) => l.text).join(" ");
  if (text.length > 160 || text.length < 2) return 0;
  if (/[.,;:]$/.test(text) && size < ctx.bodySize * 1.35) return 0;
  const bold = lines.every((l) => lineIsBold(l, ctx.fonts));
  if (size >= ctx.bodySize * 1.6) return 1;
  if (size >= ctx.bodySize * 1.25) return 2;
  if ((size >= ctx.bodySize * 1.1 && bold) || (bold && lines.length === 1 && text.length < 90 && size >= ctx.bodySize * 0.98 && !/[.!?]$/.test(text))) return 3;
  return 0;
}

function alignmentOf(lines: Line[], left: number, right: number): Align {
  const width = right - left;
  if (width <= 0) return "left";
  const mid = (left + right) / 2;
  const off = lines.map((l) => ({ l: l.x0 - left, r: right - l.x1, c: Math.abs((l.x0 + l.x1) / 2 - mid) }));
  const tol = Math.max(3, width * 0.012);
  const allCentered = off.every((o) => o.c < tol * 1.6);
  if (allCentered && off.some((o) => o.l > width * 0.06)) return "center";
  const allRight = off.every((o) => o.r < tol);
  if (allRight && off.some((o) => o.l > width * 0.08)) return "right";
  if (lines.length >= 2) {
    const body = off.slice(0, -1);
    if (body.every((o) => o.r < tol && o.l < tol + lines[0]!.size * 4)) return "justify";
  }
  return "left";
}

/** x where the text after a list marker of `chars` characters starts. */
function xAfterPrefix(line: Line, chars: number): number | null {
  let seen = 0;
  for (const g of line.glyphs) {
    if (g.space) continue;
    if (seen >= chars) return g.x0;
    seen += Array.from(g.text).length;
  }
  return null;
}

function makeParagraph(lines: Line[], ctx: ParaContext, spaceBefore: number, lineGap: number): ParagraphBlock {
  let runs = finishRuns(runsOf(lines, ctx.fonts, joinLines));
  const first = lines[0]!;
  const restLeft = lines.length > 1 ? Math.min(...lines.slice(1).map((l) => l.x0)) : first.x0;
  let indent = Math.max(0, restLeft - ctx.marginLeft);
  let firstLine = first.x0 - restLeft;
  const align = alignmentOf(lines, ctx.colLeft, ctx.colRight);
  if (align === "center" || align === "right") {
    indent = 0;
    firstLine = 0;
  }
  const size = median(lines.map((l) => l.size)) || ctx.bodySize;
  const lineSpacing = lines.length > 1 ? Math.min(3, Math.max(1, Math.round((lineGap / (size * 1.2)) * 20) / 20)) : 1;

  let list: ParagraphBlock["list"];
  const text = runs.map((r) => r.text).join("");
  // "1. Introduction" set large or bold is a heading, not a list item.
  const heading = headingLevel(lines, ctx);
  const bullet = heading ? null : text.match(BULLET_RE);
  const ordered = heading || bullet ? null : text.match(ORDERED_RE);
  // A dash at the start of a sentence-y line is a bullet only when lines line up as a list.
  if (bullet && (bullet[1] !== "-" || lines.length === 1 || restLeft > first.x0 + size * 0.5)) {
    // Drop the bullet glyph: Word draws its own.
    let remove = bullet[0]!.length;
    while (remove > 0 && runs.length) {
      const r = runs[0]!;
      if (r.text.length <= remove) {
        remove -= r.text.length;
        runs.shift();
      } else {
        r.text = r.text.slice(remove);
        remove = 0;
      }
    }
    runs = runs.filter((r) => r.text.length > 0);
    const textStart = lines.length > 1 ? restLeft : xAfterPrefix(first, bullet[1]!.length) ?? first.x0 + size * 1.2;
    list = { ordered: false, level: Math.min(4, Math.max(0, Math.floor((first.x0 - ctx.colLeft + 4) / 27))) };
    indent = Math.max(0, textStart - ctx.marginLeft);
    firstLine = 0;
  } else if (ordered) {
    // Keep the original numbering text (it may skip or restart); use a hanging indent.
    const textStart = lines.length > 1 ? restLeft : xAfterPrefix(first, ordered[1]!.length) ?? first.x0 + size * 1.6;
    indent = Math.max(0, textStart - ctx.marginLeft);
    firstLine = first.x0 - (ctx.marginLeft + indent);
    list = undefined;
    // A tab after the number lines the text up on the hanging indent, as Word lists do.
    if (firstLine < -2) {
      let at = ordered[1]!.length;
      for (const r of runs) {
        if (at > r.text.length) {
          at -= r.text.length;
          continue;
        }
        const tail = r.text.slice(at);
        const ws = tail.match(/^[ \t]+/);
        if (ws) r.text = r.text.slice(0, at) + "\t" + tail.slice(ws[0].length);
        break;
      }
    }
  }
  return {
    kind: "paragraph",
    runs,
    align,
    indent: Math.round(indent * 10) / 10,
    firstLine: Math.round(Math.max(-indent, firstLine) * 10) / 10,
    spaceBefore: Math.round(Math.min(72, Math.max(0, spaceBefore)) * 10) / 10,
    lineSpacing,
    heading: list ? 0 : heading,
    list,
    rtl: lines.filter((l) => l.rtl).length > lines.length / 2,
  };
}

/** Split a column's lines into paragraphs. */
function paragraphsFrom(lines: Line[], ctx: ParaContext, firstSpaceBefore: number): ParagraphBlock[] {
  if (lines.length === 0) return [];
  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    const g = lines[i]!.y - lines[i - 1]!.y;
    if (g > 0 && Math.abs(lines[i]!.size - lines[i - 1]!.size) < 0.5) gaps.push(g);
  }
  const typical = median(gaps) || ctx.bodySize * 1.2;
  const out: ParagraphBlock[] = [];
  let cur: Line[] = [];
  let spaceBefore = firstSpaceBefore;
  const width = ctx.colRight - ctx.colLeft;
  const flush = (nextGap: number) => {
    if (cur.length) {
      const lg = cur.length > 1 ? median(cur.slice(1).map((l, i) => l.y - cur[i]!.y)) : typical;
      out.push(makeParagraph(cur, ctx, spaceBefore, lg));
      spaceBefore = nextGap;
    }
    cur = [];
  };
  lines.forEach((line, i) => {
    if (i === 0) {
      cur.push(line);
      return;
    }
    const prev = lines[i - 1]!;
    const gap = line.y - prev.y;
    const extra = Math.max(0, gap - typical);
    const sizeChange = line.size > prev.size * 1.15 || prev.size > line.size * 1.15;
    const boldChange = lineIsBold(line, ctx.fonts) !== lineIsBold(prev, ctx.fonts) && (prev.text.length < 90 || line.text.length < 90);
    const startsList = BULLET_RE.test(line.text) || ORDERED_RE.test(line.text);
    const indented = line.x0 - prev.x0 > line.size * 0.9;
    const prevShort = prev.x1 < ctx.colRight - Math.max(line.size * 3, width * 0.12);
    const sentenceEnd = /[.!?:;。！？]["'”’)]?$/.test(prev.text);
    const capitalStart = /^[\p{Lu}\p{N}"“'‘(]/u.test(line.text);
    const centeredPair = alignmentOf([prev], ctx.colLeft, ctx.colRight) === "center" && alignmentOf([line], ctx.colLeft, ctx.colRight) !== "center";
    const brk =
      gap > typical * 1.35 ||
      gap < 0 ||
      sizeChange ||
      boldChange ||
      startsList ||
      (indented && !BULLET_RE.test(cur[0]?.text ?? "")) ||
      (prevShort && sentenceEnd && capitalStart) ||
      (prevShort && sentenceEnd && extra > 0.5) ||
      centeredPair;
    // Continuation lines of a bullet are indented to the text, not a new paragraph.
    const bulletContinuation = cur.length > 0 && (BULLET_RE.test(cur[0]!.text) || ORDERED_RE.test(cur[0]!.text)) && !startsList && gap <= typical * 1.35 && line.x0 > cur[0]!.x0 + line.size * 0.4 && !sizeChange;
    if (brk && !bulletContinuation) flush(extra);
    cur.push(line);
  });
  flush(0);
  return out;
}

// ── Whitespace-aligned tables ────────────────────────────────────────────────

interface AlignedTable {
  start: number;
  end: number; // exclusive line index
  cols: number[]; // column left edges
}

/** Find runs of lines whose pieces line up in columns. */
function findAlignedTables(lines: Line[], minRows: number, minCols: number): AlignedTable[] {
  const pieces = lines.map((l) => splitLine(l, 1.5));
  const out: AlignedTable[] = [];
  let i = 0;
  while (i < lines.length) {
    if (pieces[i]!.length < minCols) {
      i++;
      continue;
    }
    let j = i + 1;
    const sizes = lines[i]!.size;
    while (j < lines.length && pieces[j]!.length >= 2 && lines[j]!.y - lines[j - 1]!.y < sizes * 3.2) j++;
    if (j - i >= minRows) {
      const starts = pieces.slice(i, j).flatMap((p) => p.map((s) => s.x0));
      const ends = pieces.slice(i, j).flatMap((p) => p.map((s) => s.x1));
      const rows = j - i;
      const colStarts = cluster(starts, 6).filter((x) => starts.filter((s) => Math.abs(s - x) < 6).length >= Math.max(2, rows * 0.5));
      const colEnds = cluster(ends, 6).filter((x) => ends.filter((s) => Math.abs(s - x) < 6).length >= Math.max(2, rows * 0.5));
      // Right-aligned number columns line up on their right edge instead.
      const alignedCols = Math.max(colStarts.length, colEnds.length);
      if (alignedCols >= minCols) {
        // Column boundaries: gaps that no piece crosses.
        const left = Math.min(...lines.slice(i, j).map((l) => l.x0));
        const right = Math.max(...lines.slice(i, j).map((l) => l.x1));
        const bin = 1;
        const cover = new Uint16Array(Math.ceil(right - left) + 2);
        for (const p of pieces.slice(i, j).flat()) {
          for (let x = Math.floor(p.x0 - left); x <= Math.ceil(p.x1 - left); x += bin) cover[x] = (cover[x] ?? 0) + 1;
        }
        const cols = [left];
        let inGap = false;
        let gapStart = 0;
        for (let x = 0; x < cover.length; x++) {
          if (cover[x] === 0 && !inGap) {
            inGap = true;
            gapStart = x;
          } else if (cover[x] !== 0 && inGap) {
            inGap = false;
            if (x - gapStart >= 4) cols.push(left + x - 0.5);
          }
        }
        if (cols.length >= minCols) {
          out.push({ start: i, end: j, cols });
          i = j;
          continue;
        }
      }
    }
    i++;
  }
  return out;
}

function alignedTableBlock(lines: Line[], cols: number[], ctx: ParaContext, spaceBefore: number): TableBlock {
  const right = Math.max(...lines.map((l) => l.x1));
  const edges = [...cols, right + 2];
  const rows = lines.map((line) => {
    const pieces = splitLine(line, 1.5);
    const cells: TableCell[] = cols.map(() => ({ paragraphs: [], colSpan: 1, rowSpan: 1, text: "" }));
    const buckets: Line[][] = cols.map(() => []);
    for (const p of pieces) {
      let c = 0;
      for (let k = 0; k < cols.length; k++) if (p.x0 >= cols[k]! - 3) c = k;
      buckets[c]!.push(p);
    }
    buckets.forEach((b, c) => {
      if (!b.length) return;
      const merged: Line = { ...b[0]!, glyphs: b.flatMap((p) => p.glyphs), x0: Math.min(...b.map((p) => p.x0)), x1: Math.max(...b.map((p) => p.x1)), text: b.map((p) => p.text).join(" ") };
      const cellCtx = { ...ctx, marginLeft: edges[c]!, colLeft: edges[c]!, colRight: edges[c + 1]! - 4 };
      cells[c]!.paragraphs = [makeParagraph([merged], cellCtx, 0, merged.size * 1.2)];
      cells[c]!.text = merged.text;
    });
    return { height: line.size * 1.5, cells };
  });
  return {
    kind: "table",
    columns: edges.slice(1).map((e, k) => Math.max(18, e - edges[k]!)),
    rows,
    ruled: false,
    indent: Math.max(0, cols[0]! - ctx.marginLeft),
    spaceBefore,
  };
}

// ── Page layout ──────────────────────────────────────────────────────────────

type Item =
  | { kind: "rule"; rule: Rule; rect: Rect }
  | { kind: "text"; line: Line; rect: Rect }
  | { kind: "table"; table: GridTable; rect: Rect }
  | { kind: "image"; image: PlacedImage; rect: Rect };

export function findGutters(segments: Line[], bodySize: number, left: number, right: number): number[] {
  if (segments.length < 8) return [];
  const span = right - left;
  if (span < bodySize * 16) return [];
  const narrow = segments.filter((s) => s.x1 - s.x0 < span * 0.62);
  if (narrow.length < 8) return [];
  const bins = Math.ceil(span / 2) + 1;
  const cover = new Uint16Array(bins);
  for (const s of narrow) {
    const a = Math.max(0, Math.floor((s.x0 - left) / 2));
    const b = Math.min(bins - 1, Math.ceil((s.x1 - left) / 2));
    for (let i = a; i <= b; i++) cover[i]!++;
  }
  // A few crossing lines (titles, centred captions) may cross a real gutter.
  const allowed = Math.max(1, Math.floor(narrow.length * 0.04));
  const gutters: number[] = [];
  let start = -1;
  for (let i = 0; i <= bins; i++) {
    const empty = i < bins && cover[i]! <= allowed;
    if (empty && start < 0) start = i;
    if (!empty && start >= 0) {
      const width = (i - start) * 2;
      if (start > 0 && i < bins && width >= bodySize * 0.9) gutters.push(left + ((start + i) / 2) * 2);
      start = -1;
    }
  }
  if (gutters.length === 0 || gutters.length > 3) return [];
  const edges = [left, ...gutters, right];
  for (let c = 0; c < edges.length - 1; c++) {
    const lo = edges[c]!;
    const hi = edges[c + 1]!;
    const inCol = narrow.filter((s) => s.x0 >= lo - 1 && s.x1 <= hi + 1);
    if (hi - lo < bodySize * 8 || inCol.length < 4) return [];
    if (median(inCol.map((s) => (s.x1 - s.x0) / (hi - lo))) < 0.55) return [];
  }
  return gutters;
}

export interface LayoutOptions {
  /** Word: conservative aligned-table detection. Excel: aggressive. */
  mode: "word" | "excel";
}

interface PageContext {
  page: PageModel;
  bodySize: number;
  remove: (line: Line) => boolean;
}

function buildGridTableBlock(t: GridTable, glyphs: Glyph[], ctx: ParaContext, spaceBefore: number): TableBlock {
  const rows = t.ys.length - 1;
  const cellGlyphs = t.spans.map(() => [] as Glyph[]);
  for (const g of glyphs) {
    const cx = (g.x0 + g.x1) / 2;
    const cy = g.y - g.size * 0.3;
    t.spans.forEach((sp, i) => {
      if (cx >= t.xs[sp.c]! && cx <= t.xs[sp.c + sp.cs]! && cy >= t.ys[sp.r]! && cy <= t.ys[sp.r + sp.rs]!) cellGlyphs[i]!.push(g);
    });
  }
  const grid: TableCell[][] = Array.from({ length: rows }, () => []);
  t.spans.forEach((sp, i) => {
    const x0 = t.xs[sp.c]!;
    const x1 = t.xs[sp.c + sp.cs]!;
    const lines = groupLines(cellGlyphs[i]!);
    const cellCtx: ParaContext = { ...ctx, marginLeft: x0 + 3, colLeft: x0 + 3, colRight: x1 - 3 };
    const paragraphs = paragraphsFrom(lines, cellCtx, 0).map((p) => ({ ...p, heading: 0, spaceBefore: 0 }));
    const cell: TableCell = {
      paragraphs,
      colSpan: sp.cs,
      rowSpan: sp.rs,
      shading: t.shading.get(i),
      text: lines.map((l) => l.text).join("\n"),
    };
    grid[sp.r]![sp.c] = cell;
    // Vertical merge continuations.
    for (let r = sp.r + 1; r < sp.r + sp.rs; r++) {
      grid[r]![sp.c] = { paragraphs: [], colSpan: sp.cs, rowSpan: 0, text: "", shading: cell.shading };
    }
  });
  return {
    kind: "table",
    columns: t.xs.slice(1).map((x, k) => Math.max(8, x - t.xs[k]!)),
    rows: grid.map((cells, r) => ({
      height: t.ys[r + 1]! - t.ys[r]!,
      // Sparse by column index; filter keeps column order and drops spanned slots.
      cells: cells.filter(Boolean),
    })),
    ruled: true,
    indent: Math.max(0, t.xs[0]! - ctx.marginLeft),
    spaceBefore,
  };
}

function paragraphText(p: ParagraphBlock): string {
  return p.runs.map((r) => r.text).join("");
}

/** `b` reads as the rest of `a`'s sentence (text broken by a column change). */
function continuesInto(a: ParagraphBlock, b: ParagraphBlock): boolean {
  if (a.heading || b.heading || a.list || b.list || !a.runs.length || !b.runs.length) return false;
  const end = paragraphText(a).trimEnd();
  const start = paragraphText(b).trimStart();
  if (!end || !start || /[.!?:;。！？]["'”’)]*$/.test(end)) return false;
  return LOWER_START.test(start) || LETTER_HYPHEN_END.test(end);
}

function joinParagraphs(a: ParagraphBlock, b: ParagraphBlock): void {
  const last = a.runs[a.runs.length - 1]!;
  last.text = last.text.replace(/\s+$/, "");
  if (LETTER_HYPHEN_END.test(last.text) && LOWER_START.test(paragraphText(b).trimStart())) last.text = last.text.slice(0, -1);
  else last.text += " ";
  const runs = b.runs.map((r) => ({ ...r }));
  runs[0]!.text = runs[0]!.text.replace(/^\s+/, "");
  a.runs = finishRuns([...a.runs, ...runs]);
  if (b.align === "justify" || a.align === "justify") a.align = "justify";
}

function layoutPage(pc: PageContext, options: LayoutOptions, figures: Rect[]): { section: SectionModel; contentLines: Line[] } {
  const { page, bodySize } = pc;
  const { glyphs: all, ocrLayer } = usableGlyphs(page);
  const fonts = page.fonts;
  const images = page.images.filter((im) => {
    // An OCR'd scan: the background scan is replaced by its text layer.
    if (ocrLayer && im.w * im.h > page.width * page.height * 0.4 && !im.figure) return false;
    return true;
  });
  const figureRects = images.filter((im) => im.figure).map((im) => ({ x: im.x, y: im.y, w: im.w, h: im.h }));
  // Vector figures not rendered as pictures (Excel, tests) still keep their drawing out of tables.
  const tables = findRuledTables(page, [...figureRects, ...figures]);
  const inFigure = (g: Glyph) => figureRects.some((r) => contains(r, (g.x0 + g.x1) / 2, g.y - g.size * 0.3));
  const inTable = (g: Glyph) => tables.findIndex((t) => contains(t.rect, (g.x0 + g.x1) / 2, g.y - g.size * 0.3, 1));
  const tableGlyphs = tables.map(() => [] as Glyph[]);
  const flow: Glyph[] = [];
  for (const g of all) {
    if (inFigure(g)) continue;
    const t = inTable(g);
    if (t >= 0) tableGlyphs[t]!.push(g);
    else flow.push(g);
  }
  // Images inside a ruled table cell are left out of the flow (rare; logos in headers).
  const flowImages = images.filter((im) => !tables.some((t) => contains(t.rect, im.x + im.w / 2, im.y + im.h / 2)));

  // Thin lines right under text are underlines; long free-standing ones are rules.
  const tableRects = tables.map((t) => t.rect);
  const horizontal = page.rules.filter(
    (r) => r.y1 - r.y0 <= 1.5 && r.x1 - r.x0 > 3 && !tableRects.some((tr) => contains(tr, (r.x0 + r.x1) / 2, r.y0, 2)) && !figureRects.some((fr) => contains(fr, (r.x0 + r.x1) / 2, r.y0)),
  );
  const freeRules: Rule[] = [];
  for (const r of horizontal) {
    const under = flow.filter((g) => !g.space && g.x1 > r.x0 - 1 && g.x0 < r.x1 + 1 && r.y0 >= g.y - g.size * 0.05 && r.y0 <= g.y + g.size * 0.3);
    const span = under.length ? Math.max(...under.map((g) => g.x1)) - Math.min(...under.map((g) => g.x0)) : 0;
    if (under.length && span >= (r.x1 - r.x0) * 0.6) {
      for (const g of under) g.underline = true;
    } else if (r.x1 - r.x0 > 40 && r.width <= 6) {
      // The same line is often drawn twice (fill + stroke); keep one.
      if (!freeRules.some((f) => Math.abs(f.y0 - r.y0) < 2 && Math.abs(f.x0 - r.x0) < 2 && Math.abs(f.x1 - r.x1) < 2)) freeRules.push(r);
    }
  }

  const lines = groupLines(flow).filter((l) => !pc.remove(l));

  // Section margins from the content box.
  const contentX0 = Math.min(...lines.map((l) => l.x0), ...tables.map((t) => t.rect.x), ...flowImages.map((im) => im.x), page.width * 0.2);
  const contentX1 = Math.max(...lines.map((l) => l.x1), ...tables.map((t) => t.rect.x + t.rect.w), ...flowImages.map((im) => im.x + im.w), page.width * 0.8);
  const contentY0 = Math.min(...lines.map((l) => l.y - l.size), ...tables.map((t) => t.rect.y), ...flowImages.map((im) => im.y), page.height * 0.1);
  const contentY1 = Math.max(...lines.map((l) => l.y + l.size * 0.3), ...tables.map((t) => t.rect.y + t.rect.h), ...flowImages.map((im) => im.y + im.h), page.height * 0.9);
  const marginLeft = Math.min(108, Math.max(18, Math.floor(contentX0 - 1)));
  const marginRight = Math.min(108, Math.max(18, Math.floor(page.width - contentX1 - 1)));
  const marginTop = Math.min(108, Math.max(18, Math.floor(contentY0 - 2)));
  const marginBottom = Math.min(108, Math.max(18, Math.floor(page.height - contentY1 - 2)));

  // Build items: text segments, tables, images.
  const segments = lines.flatMap((l) => splitLine(l));
  const items: Item[] = [
    ...segments.map((s) => ({ kind: "text" as const, line: s, rect: { x: s.x0, y: s.y - s.size, w: s.x1 - s.x0, h: s.size * 1.25 } })),
    ...tables.map((t) => ({ kind: "table" as const, table: t, rect: t.rect })),
    ...flowImages.map((im) => ({ kind: "image" as const, image: im, rect: { x: im.x, y: im.y, w: im.w, h: im.h } })),
    ...freeRules.map((r) => ({ kind: "rule" as const, rule: r, rect: { x: r.x0, y: r.y0 - 0.5, w: r.x1 - r.x0, h: 1 } })),
  ];
  const left = Math.min(...items.map((it) => it.rect.x), marginLeft);
  const right = Math.max(...items.map((it) => it.rect.x + it.rect.w), page.width - marginRight);
  const gutters = findGutters(segments, bodySize, left, right);
  const columnOf = (r: Rect): number => {
    for (let i = 0; i < gutters.length; i++) {
      const g = gutters[i]!;
      if (r.x < g - 1 && r.x + r.w > g + 1) return -1;
      if (r.x + r.w <= g + 1) return i;
    }
    return gutters.length;
  };

  // Reading order: bands separated by full-width items; inside a band, column by column.
  const sorted = [...items].sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
  const ordered: { col: number; items: Item[] }[] = [];
  let band: Item[] = [];
  const flushBand = () => {
    if (!band.length) return;
    // A line or two of a spanning block that happens not to cross the gutter (the
    // short last line of a two-line title) belongs with the spanning text above.
    const prev = ordered[ordered.length - 1];
    const top = Math.min(...band.map((it) => it.rect.y));
    const bottom = Math.max(...band.map((it) => it.rect.y + it.rect.h));
    if (prev && prev.col === -1 && band.every((it) => it.kind === "text") && new Set(band.map((it) => columnOf(it.rect))).size === 1 && bottom - top < bodySize * 3.2) {
      const above = prev.items[prev.items.length - 1]!;
      if (above.kind === "text" && top - (above.rect.y + above.rect.h) < above.rect.h) {
        prev.items.push(...band);
        band = [];
        return;
      }
    }
    const cols = Array.from({ length: gutters.length + 1 }, (_, i) => i);
    for (const c of cols) {
      const inCol = band.filter((it) => columnOf(it.rect) === c);
      if (inCol.length) ordered.push({ col: c, items: inCol });
    }
    band = [];
  };
  for (const it of sorted) {
    if (gutters.length && columnOf(it.rect) === -1) {
      flushBand();
      const last = ordered[ordered.length - 1];
      // Consecutive full-width lines (a two-line title) form one group so they join into one paragraph.
      if (last && last.col === -1 && it.kind === "text" && last.items[last.items.length - 1]!.kind === "text") last.items.push(it);
      else ordered.push({ col: -1, items: [it] });
    } else {
      band.push(it);
    }
  }
  flushBand();

  const edges = [left, ...gutters, right];
  // Each column's own text edges (not the gutter centre), so justified text is recognised.
  const boundsOf = (segs: Line[], l: number, r: number) =>
    segs.length ? { l: Math.min(...segs.map((s) => s.x0)), r: Math.max(...segs.map((s) => s.x1)) } : { l, r };
  const colBounds = edges.slice(0, -1).map((_, c) =>
    boundsOf(gutters.length ? segments.filter((s) => columnOf({ x: s.x0, y: 0, w: s.x1 - s.x0, h: 0 }) === c) : segments, edges[c]!, edges[c + 1]!),
  );
  const fullBounds = boundsOf(segments, left, right);
  const blocks: Block[] = [];
  let prevBottom: number | null = null;
  const spaceFor = (top: number) => (prevBottom === null ? 0 : Math.max(0, top - prevBottom - 2));

  let prevGroup: { col: number; end: number } | null = null;
  for (const group of ordered) {
    const groupStart = blocks.length;
    const colLeft = group.col < 0 ? fullBounds.l : colBounds[group.col]!.l;
    const colRight = group.col < 0 ? fullBounds.r : colBounds[group.col]!.r;
    // Columns reflow into the page width in Word, so indents count from the column's edge.
    const baseLeft = group.col >= 0 && gutters.length ? colLeft : marginLeft;
    const ctx: ParaContext = { fonts, bodySize, marginLeft: baseLeft, colLeft, colRight };
    // Re-join this column's text segments into lines (one per baseline).
    let pendingText: Line[] = [];
    const flushText = () => {
      if (!pendingText.length) return;
      const byBaseline: Line[] = [];
      for (const s of pendingText.sort((a, b) => a.y - b.y || a.x0 - b.x0)) {
        const last = byBaseline[byBaseline.length - 1];
        if (last && Math.abs(last.y - s.y) < s.size * 0.35) {
          last.glyphs = [...last.glyphs, ...s.glyphs].sort((a, b) => a.x0 - b.x0);
          last.x0 = Math.min(last.x0, s.x0);
          last.x1 = Math.max(last.x1, s.x1);
          last.size = Math.max(last.size, s.size);
          last.text = plainText(last.glyphs);
        } else {
          byBaseline.push({ ...s, glyphs: [...s.glyphs] });
        }
      }
      // Whitespace tables first (they are never paragraphs).
      const aligned = findAlignedTables(byBaseline, options.mode === "excel" ? 2 : 3, options.mode === "excel" ? 2 : 3);
      let cursor = 0;
      const emitParas = (ls: Line[]) => {
        if (!ls.length) return;
        const first = ls[0]!;
        const sb = spaceFor(first.y - first.size);
        blocks.push(...paragraphsFrom(ls, ctx, sb));
        const last = ls[ls.length - 1]!;
        prevBottom = last.y + last.size * 0.3;
      };
      for (const at of aligned) {
        emitParas(byBaseline.slice(cursor, at.start));
        const tl = byBaseline.slice(at.start, at.end);
        const first = tl[0]!;
        blocks.push(alignedTableBlock(tl, at.cols, ctx, spaceFor(first.y - first.size)));
        const last = tl[tl.length - 1]!;
        prevBottom = last.y + last.size * 0.3;
        cursor = at.end;
      }
      emitParas(byBaseline.slice(cursor));
      pendingText = [];
    };
    // Group consecutive images that share a row into one image block.
    for (let k = 0; k < group.items.length; k++) {
      const it = group.items[k]!;
      if (it.kind === "text") {
        pendingText.push(it.line);
        continue;
      }
      flushText();
      if (it.kind === "rule") {
        const last = blocks[blocks.length - 1];
        const border = { color: it.rule.color, width: Math.max(0.5, Math.min(6, it.rule.width)) };
        if (last && last.kind === "paragraph" && !last.borderBottom && prevBottom !== null && it.rect.y - prevBottom < 18) {
          last.borderBottom = { ...border, space: Math.max(1, it.rect.y - prevBottom) };
        } else {
          blocks.push({ kind: "paragraph", runs: [], align: "left", indent: Math.max(0, it.rect.x - baseLeft), firstLine: 0, spaceBefore: spaceFor(it.rect.y - 6), lineSpacing: 1, heading: 0, rtl: false, borderBottom: border });
        }
        prevBottom = it.rect.y + 1;
        continue;
      }
      if (it.kind === "table") {
        const ti = tables.indexOf(it.table);
        blocks.push(buildGridTableBlock(it.table, tableGlyphs[ti] ?? [], ctx, spaceFor(it.rect.y)));
        prevBottom = it.rect.y + it.rect.h;
      } else {
        const row: PlacedImage[] = [it.image];
        while (k + 1 < group.items.length) {
          const next = group.items[k + 1]!;
          if (next.kind !== "image") break;
          const overlapY = Math.min(next.rect.y + next.rect.h, it.rect.y + it.rect.h) - Math.max(next.rect.y, it.rect.y);
          if (overlapY < Math.min(next.rect.h, it.rect.h) * 0.5) break;
          row.push(next.image);
          k++;
        }
        row.sort((a, b) => a.x - b.x);
        const rowLeft = Math.min(...row.map((im) => im.x));
        const rowRight = Math.max(...row.map((im) => im.x + im.w));
        const top = Math.min(...row.map((im) => im.y));
        const textWidth = page.width - marginLeft - marginRight;
        const total = row.reduce((s, im) => s + im.w, 0);
        const k2 = total > textWidth ? textWidth / total : 1;
        const mid = (rowLeft + rowRight) / 2;
        const align: Align = Math.abs(mid - (colLeft + colRight) / 2) < 12 && rowLeft - colLeft > 20 ? "center" : "left";
        const block: ImageBlock = {
          kind: "image",
          items: row.map((im) => ({ id: im.id, w: im.w * k2, h: im.h * k2 })),
          indent: align === "center" ? 0 : Math.max(0, rowLeft - baseLeft),
          align,
          spaceBefore: spaceFor(top),
        };
        blocks.push(block);
        prevBottom = Math.max(...row.map((im) => im.y + im.h));
      }
    }
    flushText();
    // A paragraph running from the foot of one column to the top of the next.
    if (prevGroup && group.col > 0 && prevGroup.col === group.col - 1 && prevGroup.end === groupStart && groupStart > 0) {
      const a = blocks[groupStart - 1];
      const b = blocks[groupStart];
      if (a && b && a.kind === "paragraph" && b.kind === "paragraph" && continuesInto(a, b)) {
        joinParagraphs(a, b);
        blocks.splice(groupStart, 1);
      }
    }
    prevGroup = { col: group.col, end: blocks.length };
  }

  return {
    section: {
      width: page.width,
      height: page.height,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      blocks,
      pageBreakBefore: page.index > 0,
      scanned: page.scanned && !ocrLayer,
    },
    contentLines: lines,
  };
}

// ── Running headers / footers ────────────────────────────────────────────────

function normalizeRunning(text: string): string {
  return text.replace(/\d+/g, "#").replace(/\s+/g, " ").trim().toLowerCase();
}

interface Running {
  header: string | null;
  footer: string | null;
  footerPageNumbers: boolean;
  isRunning: (page: PageModel, line: Line) => boolean;
}

export function runningLines(pages: PageModel[]): (page: PageModel, line: Line) => boolean {
  return detectRunning(pages).isRunning;
}

function detectRunning(pages: PageModel[]): Running {
  const none: Running = { header: null, footer: null, footerPageNumbers: false, isRunning: () => false };
  if (pages.length < 2) {
    // A lone page number at the very bottom is still noise in an editable document.
    return {
      ...none,
      isRunning: (page, line) => line.y > page.height * 0.92 && /^[-–—\s]*(page\s*)?\d+(\s*(\/|of)\s*\d+)?[-–—\s]*$/i.test(line.text),
    };
  }
  const zone = (page: PageModel, line: Line) =>
    line.y - line.size < page.height * 0.1 ? "top" : line.y > page.height * 0.9 ? "bottom" : null;
  const counts = new Map<string, { n: number; sample: string; pages: Set<number>; digits: boolean }>();
  for (const page of pages) {
    const { glyphs } = usableGlyphs(page);
    const lines = groupLines(glyphs.filter((g) => g.y < page.height * 0.12 || g.y > page.height * 0.88));
    for (const line of lines) {
      const z = zone(page, line);
      if (!z) continue;
      const key = `${z}|${normalizeRunning(line.text)}`;
      const entry = counts.get(key) ?? { n: 0, sample: line.text, pages: new Set<number>(), digits: /\d/.test(line.text) };
      if (!entry.pages.has(page.index)) {
        entry.pages.add(page.index);
        entry.n++;
      }
      counts.set(key, entry);
    }
  }
  const threshold = Math.max(2, Math.ceil(pages.length * 0.5));
  const running = new Set<string>();
  let header: string | null = null;
  let footer: string | null = null;
  let footerPageNumbers = false;
  for (const [key, entry] of Array.from(counts.entries())) {
    if (entry.n < threshold) continue;
    running.add(key);
    const isPageNumberOnly = /^[-–—\s]*(page\s*|sayfa\s*|seite\s*|página\s*)?#(\s*(\/|of|von|de|sur)\s*#)?[-–—\s]*$/i.test(key.split("|")[1] ?? "");
    if (key.startsWith("top|") && !header && !isPageNumberOnly) header = entry.sample;
    if (key.startsWith("bottom|")) {
      if (entry.digits && /#/.test(key)) footerPageNumbers = true;
      if (!isPageNumberOnly && !footer) footer = entry.sample.replace(/\b\d+\b\s*$/, "").trim() || null;
    }
  }
  return {
    header,
    footer,
    footerPageNumbers,
    isRunning: (page, line) => {
      const z = zone(page, line);
      return !!z && running.has(`${z}|${normalizeRunning(line.text)}`);
    },
  };
}

// ── Document ─────────────────────────────────────────────────────────────────

function bodyFontOf(pages: PageModel[]): { font: string; size: number } {
  const weight = new Map<string, number>();
  const sizes: number[] = [];
  for (const p of pages) {
    for (const g of p.glyphs) {
      if (g.space || g.hidden || g.rotated) continue;
      sizes.push(Math.round(g.size * 2) / 2);
      const f = p.fonts[g.font]?.family ?? "Calibri";
      weight.set(f, (weight.get(f) ?? 0) + 1);
      if (sizes.length > 200_000) break;
    }
  }
  let font = "Calibri";
  let best = 0;
  weight.forEach((n, f) => {
    if (n > best) {
      best = n;
      font = f;
    }
  });
  // Mode of sizes = body text.
  const freq = new Map<number, number>();
  for (const s of sizes) freq.set(s, (freq.get(s) ?? 0) + 1);
  let size = 11;
  let top = 0;
  freq.forEach((n, s) => {
    if (n > top) {
      top = n;
      size = s;
    }
  });
  return { font, size };
}

export function buildDocument(pages: PageModel[], title: string, options: LayoutOptions = { mode: "word" }): DocumentModel {
  const { font, size } = bodyFontOf(pages);
  const running = options.mode === "word" ? detectRunning(pages) : { header: null, footer: null, footerPageNumbers: false, isRunning: () => false };
  const sections = pages.map((page) => {
    const { section } = layoutPage({ page, bodySize: size, remove: (line) => running.isRunning(page, line) }, options, options.mode === "excel" ? findFigureRegions(page) : []);
    return section;
  });
  return {
    sections,
    header: running.header,
    footer: running.footer,
    footerPageNumbers: running.footerPageNumbers,
    title,
    bodyFont: font,
    bodySize: size,
  };
}

// ── Excel: tables and text rows in reading order ────────────────────────────

export type SheetItem =
  | { kind: "table"; y: number; table: TableBlock; boldRows: Set<number> }
  | { kind: "row"; y: number; cells: { text: string; bold: boolean }[] };

/** Everything on a page as sheet rows: ruled and aligned tables plus remaining text lines, in reading order. */
export function sheetItems(page: PageModel, isRunning: (page: PageModel, line: Line) => boolean = () => false): SheetItem[] {
  const { glyphs } = usableGlyphs(page);
  const fonts = page.fonts;
  const bodySize = median(glyphs.map((g) => g.size)) || 10;
  const figures = findFigureRegions(page);
  const tables = findRuledTables(page, figures);
  const tableGlyphs = tables.map(() => [] as Glyph[]);
  const rest: Glyph[] = [];
  for (const g of glyphs) {
    // Axis labels and legends of a chart are not data rows.
    if (figures.some((r) => contains(r, (g.x0 + g.x1) / 2, g.y - g.size * 0.3))) continue;
    const t = tables.findIndex((tb) => contains(tb.rect, (g.x0 + g.x1) / 2, g.y - g.size * 0.3, 1));
    if (t >= 0) tableGlyphs[t]!.push(g);
    else rest.push(g);
  }
  const ctx: ParaContext = { fonts, bodySize, marginLeft: 0, colLeft: 0, colRight: page.width };

  // Multi-column text is read column by column inside each band (bands are split by
  // anything spanning the gutters), like the Word converter does.
  // Running headers, footers and page numbers are not content.
  // (A repeated multi-column line is more likely a table header carried over each page; keep it.)
  const lines = groupLines(rest).filter((l) => !(isRunning(page, l) && splitLine(l, 1.5).length === 1));
  const segments = lines.flatMap((l) => splitLine(l));
  const left = segments.length ? Math.min(...segments.map((s) => s.x0)) : 0;
  const right = segments.length ? Math.max(...segments.map((s) => s.x1)) : page.width;
  const gutters = segments.length ? findGutters(segments, bodySize, left, right) : [];
  const colOf = (x0: number, x1: number): number => {
    for (let i = 0; i < gutters.length; i++) {
      const g = gutters[i]!;
      if (x0 < g - 1 && x1 > g + 1) return -1;
      if (x1 <= g + 1) return i;
    }
    return gutters.length;
  };
  const streams: Line[][] = Array.from({ length: gutters.length + 1 }, () => []);
  const spanning: Line[] = [];
  for (const l of lines) {
    if (!gutters.length) {
      streams[0]!.push(l);
      continue;
    }
    const pieces = splitLine(l);
    if (pieces.some((p) => colOf(p.x0, p.x1) === -1)) {
      spanning.push(l);
      continue;
    }
    streams.forEach((stream, c) => {
      const ps = pieces.filter((p) => colOf(p.x0, p.x1) === c);
      if (!ps.length) return;
      const gs = ps.flatMap((p) => p.glyphs).sort((a, b) => a.x0 - b.x0);
      stream.push({ glyphs: gs, x0: Math.min(...ps.map((p) => p.x0)), x1: Math.max(...ps.map((p) => p.x1)), y: ps[0]!.y, size: Math.max(...ps.map((p) => p.size)), text: plainText(gs), rtl: l.rtl });
    });
  }
  const breakers = [...spanning.map((l) => l.y - l.size), ...tables.filter((t) => colOf(t.rect.x, t.rect.x + t.rect.w) === -1 || !gutters.length).map((t) => t.rect.y)].sort((a, b) => a - b);
  const keyOf = (y: number, col: number): number[] => {
    let band = 0;
    for (const b of breakers) if (b <= y + 0.01) band++;
    return [band, col, y];
  };

  const keyed: { key: number[]; item: SheetItem }[] = [];
  tables.forEach((t, i) => {
    const block = buildGridTableBlock(t, tableGlyphs[i]!, ctx, 0);
    const boldRows = new Set<number>();
    block.rows.forEach((row, r) => {
      const runs = row.cells.flatMap((c) => c.paragraphs.flatMap((p) => p.runs)).filter((run) => run.text.trim());
      if (runs.length && runs.every((run) => run.bold)) boldRows.add(r);
    });
    const col = gutters.length ? colOf(t.rect.x, t.rect.x + t.rect.w) : -1;
    keyed.push({ key: keyOf(t.rect.y, col), item: { kind: "table", y: t.rect.y, table: block, boldRows } });
  });

  const cellText = (text: string) => text.replace(/^[\uE000-\uF8FF]\s*/, "• ");
  const rowsOf = (ls: Line[], col: number) => {
    if (!ls.length) return;
    const sLeft = Math.min(...ls.map((l) => l.x0));
    const sRight = Math.max(...ls.map((l) => l.x1));
    const isFull = (l: Line) => l.x1 >= sRight - l.size && l.x0 <= sLeft + l.size * 2.5;
    const isProse = (l: Line | undefined) => !!l && isFull(l) && splitLine(l, 1.5).length === 1;
    ls.forEach((l, i) => {
      let pieces = splitLine(l, 1.5);
      // Justified prose stretches its word gaps; that is one cell, not a row of cells.
      if (pieces.length > 1 && isFull(l)) {
        const widest = pieces.slice(1).reduce((m, p, k) => Math.max(m, p.x0 - pieces[k]!.x1), 0);
        const words = pieces.every((p) => !p.text.includes(" "));
        if (widest < l.size * 3.5 || (words && (isProse(ls[i - 1]) || isProse(ls[i + 1])))) pieces = [l];
      }
      keyed.push({ key: keyOf(l.y, col), item: { kind: "row", y: l.y, cells: pieces.map((p) => ({ text: cellText(p.text), bold: lineIsBold(p, fonts) })) } });
    });
  };
  const fromStream = (ls: Line[], col: number) => {
    const aligned = findAlignedTables(ls, 2, 2);
    let cursor = 0;
    for (const at of aligned) {
      rowsOf(ls.slice(cursor, at.start), col);
      const tl = ls.slice(at.start, at.end);
      const block = alignedTableBlock(tl, at.cols, ctx, 0);
      const boldRows = new Set<number>();
      tl.forEach((l, r) => {
        if (lineIsBold(l, fonts)) boldRows.add(r);
      });
      const y = tl[0]!.y - tl[0]!.size;
      keyed.push({ key: keyOf(tl[0]!.y, col), item: { kind: "table", y, table: block, boldRows } });
      cursor = at.end;
    }
    rowsOf(ls.slice(cursor), col);
  };
  streams.forEach((ls, c) => fromStream(ls, gutters.length ? c : 0));
  rowsOf(spanning, -1);
  keyed.sort((a, b) => a.key[0]! - b.key[0]! || a.key[1]! - b.key[1]! || a.key[2]! - b.key[2]!);
  return keyed.map((k) => k.item);
}
