/**
 * PDF → PowerPoint: every page becomes a slide whose parts keep their position.
 * Text lines are grouped into editable text boxes (one paragraph per line, so line breaks and
 * spacing match the PDF), filled boxes become rectangles, strokes become lines, and pictures
 * plus rendered vector figures (charts, diagrams, scans) become images. Pure: runs in the worker.
 */
import { finishRuns, groupLines, runsOf, splitLine, usableGlyphs, type Line } from "./layout";
import type { Align, PageModel, TextRun } from "./model";

export interface SlideText {
  kind: "text";
  x: number;
  y: number;
  w: number;
  h: number;
  align: Align;
  /** One entry per line: its runs and the distance from the previous baseline (points). */
  lines: { runs: TextRun[]; pitch: number }[];
}
export interface SlideRect {
  kind: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}
export interface SlideLine {
  kind: "line";
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  width: number;
  color: string;
}
export interface SlideImage {
  kind: "image";
  x: number;
  y: number;
  w: number;
  h: number;
  id: string;
}
export type SlideItem = SlideText | SlideRect | SlideLine | SlideImage;

export interface SlideModel {
  width: number;
  height: number;
  items: SlideItem[];
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const inside = (r: Rect, x: number, y: number, pad = 1) => x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;

/** Lines that belong to one text box: same column, regular spacing, similar size. */
function groupBlocks(pieces: Line[]): Line[][] {
  const blocks: Line[][] = [];
  for (const p of [...pieces].sort((a, b) => a.y - b.y || a.x0 - b.x0)) {
    let best: Line[] | null = null;
    for (const b of blocks) {
      const last = b[b.length - 1]!;
      const dy = p.y - last.y;
      if (dy <= 0 || dy > Math.max(p.size, last.size) * 1.75) continue;
      const ratio = p.size / last.size;
      if (ratio < 0.72 || ratio > 1.38) continue;
      const left = Math.abs(p.x0 - last.x0) < last.size * 0.9;
      const center = Math.abs((p.x0 + p.x1) / 2 - (last.x0 + last.x1) / 2) < last.size * 1.2;
      const right = Math.abs(p.x1 - last.x1) < last.size * 0.9;
      const overlap = Math.min(p.x1, last.x1) - Math.max(p.x0, last.x0) > Math.min(p.x1 - p.x0, last.x1 - last.x0) * 0.5;
      if (!(left || center || right) || !overlap) continue;
      // Regular spacing inside a paragraph: a much bigger gap starts a new box.
      if (b.length > 1) {
        const prevGap = last.y - b[b.length - 2]!.y;
        if (dy > prevGap * 1.45) continue;
      }
      best = b;
      break;
    }
    if (best) best.push(p);
    else blocks.push([p]);
  }
  return blocks;
}

/** Symbol/Wingdings bullets map to private-use code points no other font draws: use a real bullet. */
function bulletFix(runs: TextRun[]): TextRun[] {
  for (const r of runs) r.text = r.text.replace(/[\uE000-\uF8FF]/g, "•");
  // A list bullet sits apart from its text in the PDF (a tab stop, not a space character): keep a gap.
  const i = runs.findIndex((r) => r.text.trim());
  const first = runs[i];
  if (first) {
    const bullet = /^(\s*[•◦▪▫●○■□➢➤►✓✔–-])/u;
    const next = runs[i + 1]?.text ?? "";
    // The bullet glued to its text, in one run or as a run of its own (often another font).
    if (/^\s*[•◦▪▫●○■□➢➤►✓✔–-]$/u.test(first.text) && /^[^\s\d]/.test(next)) first.text += "\u00A0\u00A0";
    else first.text = first.text.replace(new RegExp(bullet.source + "(?=[^\\s\\d])", "u"), "$1\u00A0\u00A0");
  }
  return runs;
}

function alignOf(lines: Line[]): Align {
  if (lines.length < 2) return "left";
  const lefts = lines.map((l) => l.x0), rights = lines.map((l) => l.x1), centers = lines.map((l) => (l.x0 + l.x1) / 2);
  const spread = (v: number[]) => Math.max(...v) - Math.min(...v);
  const tol = lines[0]!.size * 0.6;
  if (spread(lefts) < tol) return "left";
  if (spread(centers) < tol) return "center";
  if (spread(rights) < tol) return "right";
  return "left";
}

export function buildSlide(page: PageModel): SlideModel {
  const items: SlideItem[] = [];
  const figures: Rect[] = page.images.filter((im) => im.figure);
  const inFigure = (x: number, y: number) => figures.some((f) => inside(f, x, y));
  const pageArea = page.width * page.height;

  // Background and filled shapes first (z-order), largest first.
  for (const b of [...page.boxes].sort((a, b) => b.w * b.h - a.w * a.h)) {
    if (b.w < 0.8 || b.h < 0.8) continue;
    if (inFigure(b.x + b.w / 2, b.y + b.h / 2) && b.w * b.h < pageArea * 0.5) continue;
    items.push({ kind: "rect", x: b.x, y: b.y, w: b.w, h: b.h, color: b.color });
  }
  for (const im of page.images) items.push({ kind: "image", x: im.x, y: im.y, w: im.w, h: im.h, id: im.id });
  for (const r of page.rules) {
    if (inFigure((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2)) continue;
    items.push({ kind: "line", x0: r.x0, y0: r.y0, x1: r.x1, y1: r.y1, width: Math.max(0.25, r.width), color: r.color });
  }

  if (!page.scanned) {
    const { glyphs } = usableGlyphs(page);
    const kept = glyphs.filter((g) => !inFigure((g.x0 + g.x1) / 2, g.y - g.size * 0.3));
    const pieces = groupLines(kept).flatMap((l) => splitLine(l, 1.6));
    for (const block of groupBlocks(pieces)) {
      const x0 = Math.min(...block.map((l) => l.x0));
      const x1 = Math.max(...block.map((l) => l.x1));
      const first = block[0]!, last = block[block.length - 1]!;
      const lines = block.map((l, i) => ({
        runs: bulletFix(finishRuns(runsOf([l], page.fonts, () => ""))),
        pitch: i > 0 ? l.y - block[i - 1]!.y : l.size * 1.2,
      }));
      if (!lines.some((l) => l.runs.length)) continue;
      // Substituted fonts can be a little wider: give the box some room so lines don't wrap.
      const w = (x1 - x0) * 1.04 + first.size * 0.4;
      const align = alignOf(block);
      const x = align === "center" ? (x0 + x1) / 2 - w / 2 : align === "right" ? x1 - w + first.size * 0.2 : x0 - first.size * 0.2;
      const top = first.y - first.size * 0.95;
      items.push({ kind: "text", x, y: top, w, h: last.y - top + last.size * 0.3, align, lines });
    }
  }
  return { width: page.width, height: page.height, items };
}
