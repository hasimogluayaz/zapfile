/**
 * Word-level comparison of two PDFs' text. Lines are diffed first (fast, and keeps unrelated
 * edits apart), then words inside each changed block. Every word keeps its page and box so
 * changes can be highlighted on the rendered pages. Pure.
 */
import { diffArrays } from "diff";

export interface Word {
  text: string;
  page: number;
  /** Box in points, page's visible frame, origin top-left. */
  x0: number;
  x1: number;
  top: number;
  bottom: number;
}

export interface DocText {
  words: Word[];
  /** Word index ranges [start, end) per text line, in reading order. */
  lines: [number, number][];
}

export interface Change {
  /** Word ranges [start, end) in A (removed) and B (added); empty range = nothing on that side. */
  a: [number, number];
  b: [number, number];
}

export interface Comparison {
  /** 1 = word differs. */
  aMark: Uint8Array;
  bMark: Uint8Array;
  changes: Change[];
  aWords: number;
  bWords: number;
}

const norm = (s: string) => s.normalize("NFKC").replace(/\s+/g, " ").trim();

export function compareDocs(A: DocText, B: DocText, ignoreCase = false): Comparison {
  const key = (s: string) => (ignoreCase ? norm(s).toLocaleLowerCase() : norm(s));
  const lineText = (d: DocText, l: [number, number]) => key(d.words.slice(l[0], l[1]).map((w) => w.text).join(" "));
  const aLines = A.lines.map((l) => lineText(A, l));
  const bLines = B.lines.map((l) => lineText(B, l));
  const aMark = new Uint8Array(A.words.length);
  const bMark = new Uint8Array(B.words.length);
  const changes: Change[] = [];

  const parts = diffArrays(aLines, bLines);
  let ai = 0, bi = 0;
  // Collect consecutive removed/added line runs into one block, then word-diff that block.
  let pendA: [number, number] | null = null, pendB: [number, number] | null = null;
  const flush = () => {
    if (!pendA && !pendB) return;
    const aw: [number, number] = pendA ? [A.lines[pendA[0]]![0], A.lines[pendA[1] - 1]![1]] : [0, 0];
    const bw: [number, number] = pendB ? [B.lines[pendB[0]]![0], B.lines[pendB[1] - 1]![1]] : [0, 0];
    wordDiff(A, B, aw, bw, aMark, bMark, changes, key, !!pendA, !!pendB);
    pendA = pendB = null;
  };
  for (const part of parts) {
    const n = part.count ?? part.value.length;
    if (part.removed) {
      pendA = [ai, ai + n];
      ai += n;
    } else if (part.added) {
      pendB = [bi, bi + n];
      bi += n;
    } else {
      flush();
      ai += n;
      bi += n;
    }
  }
  flush();
  return { aMark, bMark, changes, aWords: A.words.length, bWords: B.words.length };
}

function wordDiff(
  A: DocText,
  B: DocText,
  aw: [number, number],
  bw: [number, number],
  aMark: Uint8Array,
  bMark: Uint8Array,
  changes: Change[],
  key: (s: string) => string,
  hasA: boolean,
  hasB: boolean,
) {
  if (!hasA || !hasB) {
    const range: [number, number] = hasA ? aw : bw;
    (hasA ? aMark : bMark).fill(1, range[0], range[1]);
    changes.push(hasA ? { a: aw, b: [0, 0] } : { a: [0, 0], b: bw });
    return;
  }
  const aT = A.words.slice(aw[0], aw[1]).map((w) => key(w.text));
  const bT = B.words.slice(bw[0], bw[1]).map((w) => key(w.text));
  let ai = aw[0], bi = bw[0];
  let cur: Change | null = null;
  for (const part of diffArrays(aT, bT)) {
    const n = part.count ?? part.value.length;
    if (part.removed) {
      aMark.fill(1, ai, ai + n);
      cur ??= { a: [ai, ai], b: [bi, bi] };
      cur.a[1] = ai + n;
      ai += n;
    } else if (part.added) {
      bMark.fill(1, bi, bi + n);
      cur ??= { a: [ai, ai], b: [bi, bi] };
      cur.b[1] = bi + n;
      bi += n;
    } else {
      if (cur) changes.push(cur);
      cur = null;
      ai += n;
      bi += n;
    }
  }
  if (cur) changes.push(cur);
}

/** Merge highlighted words on one line into continuous bars. */
export function highlightBoxes(words: Word[], mark: Uint8Array, page: number): { x: number; y: number; w: number; h: number }[] {
  const out: { x: number; y: number; w: number; h: number }[] = [];
  let cur: { x0: number; x1: number; top: number; bottom: number } | null = null;
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    if (w.page !== page || !mark[i]) {
      if (cur) out.push({ x: cur.x0, y: cur.top, w: cur.x1 - cur.x0, h: cur.bottom - cur.top });
      cur = null;
      continue;
    }
    if (cur && Math.abs(w.top - cur.top) < (cur.bottom - cur.top) * 0.5 && w.x0 >= cur.x0 - 1 && w.x0 - cur.x1 < (cur.bottom - cur.top) * 1.5) {
      cur.x1 = Math.max(cur.x1, w.x1);
      cur.top = Math.min(cur.top, w.top);
      cur.bottom = Math.max(cur.bottom, w.bottom);
    } else {
      if (cur) out.push({ x: cur.x0, y: cur.top, w: cur.x1 - cur.x0, h: cur.bottom - cur.top });
      cur = { x0: w.x0, x1: w.x1, top: w.top, bottom: w.bottom };
    }
  }
  if (cur) out.push({ x: cur.x0, y: cur.top, w: cur.x1 - cur.x0, h: cur.bottom - cur.top });
  return out;
}
