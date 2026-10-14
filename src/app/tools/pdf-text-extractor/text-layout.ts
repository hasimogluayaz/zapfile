/**
 * Turns pdf.js text items into readable text: spaces from real glyph gaps,
 * lines grouped by baseline, multi-column pages read column by column,
 * rotated text read along its own direction and RTL lines ordered right to
 * left. Pure functions (no DOM, no pdf.js import) so they can be unit-tested.
 */

export interface RawTextItem {
  str: string;
  dir?: string;
  /** Text matrix in PDF user space [a, b, c, d, e, f]. */
  transform: number[];
  /** Advance width in user space units, along the text direction. */
  width: number;
  hasEOL?: boolean;
}

export interface PageLayout {
  /** Paragraphs in reading order, each a list of visual lines. */
  paragraphs: string[][];
  /** Most of the text is right-to-left. */
  rtl: boolean;
}

interface Run {
  text: string;
  x0: number;
  x1: number;
  /** Baseline position across the reading direction (grows downward). */
  y: number;
  size: number;
  rtl: boolean;
}

interface Line {
  y: number;
  size: number;
  runs: Run[];
}

interface Segment {
  text: string;
  x0: number;
  x1: number;
  y: number;
  size: number;
  line: number;
  rtl: boolean;
}

const CJK =
  /[⺀-⿟　-〿぀-ヿ㄀-ㄯ㆐-ㇿ㐀-䶿一-鿿豈-﫿︰-﹏＀-￯]|[\uD840-\uD87F][\uDC00-\uDFFF]/;
const RTL_CHAR = /[֐-ࣿיִ-﷿ﹰ-﻿]/g;
const LTR_CHAR = /[A-Za-zÀ-ɏͰ-ϿЀ-ӿ]/g;

export function isCjk(ch: string | undefined): boolean {
  return !!ch && CJK.test(ch);
}

function lastChar(s: string): string | undefined {
  const chars = Array.from(s);
  return chars[chars.length - 1];
}

function firstChar(s: string): string | undefined {
  return Array.from(s)[0];
}

function multiply(m1: number[], m2: number[]): number[] {
  return [
    m1[0]! * m2[0]! + m1[2]! * m2[1]!,
    m1[1]! * m2[0]! + m1[3]! * m2[1]!,
    m1[0]! * m2[2]! + m1[2]! * m2[3]!,
    m1[1]! * m2[2]! + m1[3]! * m2[3]!,
    m1[0]! * m2[4]! + m1[2]! * m2[5]! + m1[4]!,
    m1[1]! * m2[4]! + m1[3]! * m2[5]! + m1[5]!,
  ];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Should a space go between two neighbouring pieces of text separated by `gap`? */
function needsSpace(left: string, right: string, gap: number, size: number): boolean {
  if (/\s$/.test(left) || /^\s/.test(right)) return false;
  if (gap <= size * 0.18) return false;
  return !isCjk(lastChar(left)) && !isCjk(firstChar(right));
}

function joinRuns(runs: Run[], rtl: boolean): string {
  let out = "";
  let prev: Run | null = null;
  for (const run of runs) {
    if (prev) {
      const gap = rtl ? prev.x0 - run.x1 : run.x0 - prev.x1;
      if (needsSpace(out, run.text, gap, Math.max(prev.size, run.size))) out += " ";
    }
    out += run.text;
    prev = run;
  }
  return out.replace(/[ \t ]{2,}/g, " ").trim();
}

/** Build runs in a frame where the page's dominant text direction reads left to right. */
function buildRuns(items: RawTextItem[], viewportTransform: number[]): Run[] {
  type Placed = { item: RawTextItem; m: number[]; angle: number; weight: number };
  const placed: Placed[] = [];
  for (const item of items) {
    if (typeof item.str !== "string" || !Array.isArray(item.transform)) continue;
    if (item.str.trim().length === 0) continue;
    const m = multiply(viewportTransform, item.transform);
    placed.push({ item, m, angle: Math.atan2(m[1]!, m[0]!), weight: item.str.length });
  }
  if (placed.length === 0) return [];

  // Dominant direction, quantised to a quarter turn (rotated pages, landscape
  // content drawn sideways): weigh each item by its text length.
  const votes = [0, 0, 0, 0];
  for (const p of placed) {
    const q = ((Math.round(p.angle / (Math.PI / 2)) % 4) + 4) % 4;
    votes[q]! += p.weight;
  }
  const quarter = votes.indexOf(Math.max(...votes));
  const theta = (quarter * Math.PI) / 2;
  const ux = Math.round(Math.cos(theta));
  const uy = Math.round(Math.sin(theta));
  // In display space (y down) the "down" normal of the reading direction.
  const nx = -uy;
  const ny = ux;

  const runs: Run[] = [];
  for (const { item, m } of placed) {
    const len = Math.hypot(m[0]!, m[1]!) || 1;
    const dx = m[0]! / len;
    const dy = m[1]! / len;
    const size = Math.hypot(m[2]!, m[3]!) || Math.abs(m[3]!) || 10;
    const px = m[4]!;
    const py = m[5]!;
    const ex = px + dx * item.width;
    const ey = py + dy * item.width;
    const a = px * ux + py * uy;
    const b = ex * ux + ey * uy;
    const rtlCount = (item.str.match(RTL_CHAR) || []).length;
    runs.push({
      text: item.str,
      x0: Math.min(a, b),
      x1: Math.max(a, b),
      y: px * nx + py * ny,
      size,
      rtl: item.dir === "rtl" || rtlCount > item.str.length / 2,
    });
  }
  return runs;
}

function groupLines(runs: Run[]): Line[] {
  const sorted = [...runs].sort((a, b) => a.y - b.y || a.x0 - b.x0);
  const lines: Line[] = [];
  for (const run of sorted) {
    let best: Line | null = null;
    let bestDy = Infinity;
    let duplicate = false;
    // Lines are created in baseline order, so only the last few can match.
    for (let i = lines.length - 1; i >= 0 && i >= lines.length - 8; i--) {
      const line = lines[i]!;
      const dy = Math.abs(run.y - line.y);
      if (dy > 0.5 * Math.max(run.size, line.size)) continue;
      let blocked = false;
      for (const other of line.runs) {
        const overlap = Math.min(other.x1, run.x1) - Math.max(other.x0, run.x0);
        const narrower = Math.max(1, Math.min(other.x1 - other.x0, run.x1 - run.x0));
        if (overlap > narrower * 0.3) {
          // Fake-bold / shadow text: the same string drawn again a hair away.
          if (other.text === run.text && Math.abs(other.x0 - run.x0) < run.size * 0.2 && dy < run.size * 0.2) {
            duplicate = true;
          }
          blocked = true;
          break;
        }
      }
      if (duplicate) break;
      if (!blocked && dy < bestDy) {
        best = line;
        bestDy = dy;
      }
    }
    if (duplicate) continue;
    if (best) {
      best.runs.push(run);
      best.size = Math.max(best.size, run.size);
    } else {
      lines.push({ y: run.y, size: run.size, runs: [run] });
    }
  }
  return lines;
}

function lineIsRtl(runs: Run[]): boolean {
  let rtl = 0;
  let ltr = 0;
  for (const run of runs) {
    rtl += (run.text.match(RTL_CHAR) || []).length;
    ltr += (run.text.match(LTR_CHAR) || []).length;
  }
  return rtl > ltr;
}

/** Split each line into segments at wide horizontal gaps (column gutters, table cells). */
function toSegments(lines: Line[]): { segments: Segment[]; rtlLines: number } {
  const segments: Segment[] = [];
  let rtlLines = 0;
  lines.forEach((line, index) => {
    const rtl = lineIsRtl(line.runs);
    if (rtl) rtlLines++;
    const ordered = [...line.runs].sort((a, b) => a.x0 - b.x0);
    let current: Run[] = [];
    const flush = () => {
      if (current.length === 0) return;
      const runs = rtl ? [...current].sort((a, b) => b.x1 - a.x1) : current;
      const text = joinRuns(runs, rtl);
      if (text) {
        segments.push({
          text,
          x0: Math.min(...current.map((r) => r.x0)),
          x1: Math.max(...current.map((r) => r.x1)),
          y: line.y,
          size: Math.max(...current.map((r) => r.size)),
          line: index,
          rtl,
        });
      }
      current = [];
    };
    for (const run of ordered) {
      const prev = current[current.length - 1];
      if (prev && run.x0 - Math.max(...current.map((r) => r.x1)) > 1.6 * Math.max(prev.size, run.size)) flush();
      current.push(run);
    }
    flush();
  });
  return { segments, rtlLines };
}

/** Find column gutters: vertical strips no ordinary text line crosses. */
function findGutters(segments: Segment[], bodySize: number): number[] {
  if (segments.length < 6) return [];
  const left = Math.min(...segments.map((s) => s.x0));
  const right = Math.max(...segments.map((s) => s.x1));
  const span = right - left;
  if (span < bodySize * 16) return [];
  // Wide lines (titles, footers spanning columns) don't define columns.
  const narrow = segments.filter((s) => s.x1 - s.x0 < span * 0.62);
  if (narrow.length < 6) return [];
  const bin = 2;
  const bins = Math.ceil(span / bin) + 1;
  const cover = new Uint16Array(bins);
  for (const s of narrow) {
    const a = Math.max(0, Math.floor((s.x0 - left) / bin));
    const b = Math.min(bins - 1, Math.ceil((s.x1 - left) / bin));
    for (let i = a; i <= b; i++) cover[i]!++;
  }
  const gutters: number[] = [];
  let start = -1;
  for (let i = 0; i <= bins; i++) {
    const empty = i < bins && cover[i] === 0;
    if (empty && start < 0) start = i;
    if (!empty && start >= 0) {
      const width = (i - start) * bin;
      const x = left + ((start + i) / 2) * bin;
      if (start > 0 && i < bins && width >= bodySize * 0.9) gutters.push(x);
      start = -1;
    }
  }
  if (gutters.length === 0 || gutters.length > 3) return [];

  // Every column must hold real running text: several lines that fill
  // most of the column width (tables with short cells don't qualify).
  const edges = [left, ...gutters, right];
  for (let c = 0; c < edges.length - 1; c++) {
    const lo = edges[c]!;
    const hi = edges[c + 1]!;
    const width = hi - lo;
    const inCol = narrow.filter((s) => s.x0 >= lo - 1 && s.x1 <= hi + 1);
    if (width < bodySize * 8 || inCol.length < 3) return [];
    const fill = median(inCol.map((s) => (s.x1 - s.x0) / width));
    if (fill < 0.5) return [];
  }
  return gutters;
}

interface Block {
  lines: Segment[][];
}

function orderBlocks(segments: Segment[], gutters: number[], rtlPage: boolean): Block[] {
  const byLine = (segs: Segment[]) => {
    const map = new Map<number, Segment[]>();
    for (const s of segs) {
      const list = map.get(s.line) ?? [];
      list.push(s);
      map.set(s.line, list);
    }
    return Array.from(map.keys())
      .sort((a, b) => a - b)
      .map((key) => map.get(key)!);
  };
  if (gutters.length === 0) return [{ lines: byLine(segments) }];

  const columnOf = (s: Segment): number => {
    for (let i = 0; i < gutters.length; i++) {
      const g = gutters[i]!;
      if (s.x0 < g && s.x1 > g) return -1; // spans a gutter
      if (s.x1 <= g) return i;
    }
    return gutters.length;
  };

  const blocks: Block[] = [];
  const ordered = [...segments].sort((a, b) => a.y - b.y || a.x0 - b.x0);
  let band: Segment[] = [];
  const flush = () => {
    if (band.length === 0) return;
    const columns = Array.from({ length: gutters.length + 1 }, (_, i) => i);
    if (rtlPage) columns.reverse();
    for (const c of columns) {
      const segs = band.filter((s) => columnOf(s) === c);
      if (segs.length) blocks.push({ lines: byLine(segs) });
    }
    band = [];
  };
  for (const s of ordered) {
    if (columnOf(s) === -1) {
      flush();
      blocks.push({ lines: [[s]] });
    } else {
      band.push(s);
    }
  }
  flush();
  return blocks;
}

function lineText(segs: Segment[]): string {
  const rtl = segs[0]?.rtl ?? false;
  const ordered = [...segs].sort((a, b) => (rtl ? b.x1 - a.x1 : a.x0 - b.x0));
  return ordered.map((s) => s.text).join(" ");
}

function toParagraphs(blocks: Block[], bodySize: number): string[][] {
  const paragraphs: string[][] = [];
  for (const block of blocks) {
    const lines = block.lines.map((segs) => ({
      text: lineText(segs),
      y: segs[0]!.y,
      x0: Math.min(...segs.map((s) => s.x0)),
      x1: Math.max(...segs.map((s) => s.x1)),
      size: Math.max(...segs.map((s) => s.size)),
    }));
    if (lines.length === 0) continue;
    const gaps: number[] = [];
    for (let i = 1; i < lines.length; i++) gaps.push(lines[i]!.y - lines[i - 1]!.y);
    const typicalGap = median(gaps.filter((g) => g > 0)) || bodySize * 1.2;
    const left = Math.min(...lines.map((l) => l.x0));
    let current: string[] = [];
    lines.forEach((line, i) => {
      if (i > 0) {
        const prev = lines[i - 1]!;
        const gap = line.y - prev.y;
        const indented = line.x0 - left > line.size * 1.2 && prev.x0 - left < line.size * 0.5;
        if (gap > typicalGap * 1.5 || gap > line.size * 2.4 || indented || line.size > prev.size * 1.25 || prev.size > line.size * 1.25) {
          if (current.length) paragraphs.push(current);
          current = [];
        }
      }
      current.push(line.text);
    });
    if (current.length) paragraphs.push(current);
  }
  return paragraphs;
}

/** Lay out one page's text items. `viewportTransform` is pdf.js `page.getViewport({ scale: 1 }).transform`. */
export function layoutPage(items: RawTextItem[], viewportTransform: number[]): PageLayout {
  const runs = buildRuns(items, viewportTransform);
  if (runs.length === 0) return { paragraphs: [], rtl: false };
  const lines = groupLines(runs);
  const { segments, rtlLines } = toSegments(lines);
  const bodySize = median(segments.map((s) => s.size)) || 10;
  const rtl = rtlLines > lines.length / 2;
  const gutters = findGutters(segments, bodySize);
  const blocks = orderBlocks(segments, gutters, rtl);
  return { paragraphs: toParagraphs(blocks, bodySize), rtl };
}

/** Join a paragraph's lines into flowing text (de-hyphenates, no spaces between CJK). */
// Built at runtime: the `u` flag is fine in browsers but not for the ES5 tsc target.
const LETTER_HYPHEN_END = new RegExp("\\p{L}-$", "u");
const LOWERCASE_START = new RegExp("^\\p{Ll}", "u");

export function flowParagraph(lines: string[]): string {
  let out = "";
  for (const line of lines) {
    if (!out) {
      out = line;
      continue;
    }
    const last = lastChar(out);
    const first = firstChar(line);
    if (LETTER_HYPHEN_END.test(out) && first && LOWERCASE_START.test(first)) {
      out = out.slice(0, -1) + line;
    } else if (isCjk(last) || isCjk(first)) {
      out += line;
    } else {
      out += " " + line;
    }
  }
  return out;
}

export type TextMode = "flow" | "lines";

export function formatPage(layout: PageLayout, mode: TextMode): string {
  return layout.paragraphs
    .map((p) => (mode === "flow" ? flowParagraph(p) : p.join("\n")))
    .join("\n\n");
}

let wordSegmenter: Intl.Segmenter | null | undefined;
let graphemeSegmenter: Intl.Segmenter | null | undefined;

/** Word count that works for languages without spaces (CJK, Thai) via Intl.Segmenter. */
export function countWords(text: string): number {
  if (!text.trim()) return 0;
  if (wordSegmenter === undefined) {
    wordSegmenter = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "word" }) : null;
  }
  if (!wordSegmenter) return text.trim().split(/\s+/).length;
  let n = 0;
  for (const seg of Array.from(wordSegmenter.segment(text))) if (seg.isWordLike) n++;
  return n;
}

/** User-perceived characters (grapheme clusters), excluding line breaks. */
export function countChars(text: string): number {
  const clean = text.replace(/\n/g, "");
  if (graphemeSegmenter === undefined) {
    graphemeSegmenter =
      typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(undefined, { granularity: "grapheme" }) : null;
  }
  if (!graphemeSegmenter) return Array.from(clean).length;
  return Array.from(graphemeSegmenter.segment(clean)).length;
}
