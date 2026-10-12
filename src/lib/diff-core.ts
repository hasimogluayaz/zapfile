/**
 * Line diff engine for the Diff Checker, built on jsdiff (Myers O(ND)).
 * Pure functions — runs in a Web Worker, also usable in Node for tests.
 */
import { diffArrays, diffChars, diffWordsWithSpace } from "diff";

/* ------------------------------------------------------------------ */
/*  Legacy flat API (kept for existing callers)                        */
/* ------------------------------------------------------------------ */

export interface DiffLine {
  type: "added" | "removed" | "unchanged";
  text: string;
  oldLineNum?: number;
  newLineNum?: number;
}

/** Flat line diff with no size cap. Prefer `buildDiffModel` for UI. */
export function computeDiff(oldText: string, newText: string): DiffLine[] {
  const model = buildDiffModel(oldText, newText, { ignoreWhitespace: false, ignoreCase: false, inline: "none" });
  if (!model) return [];
  const out: DiffLine[] = [];
  for (const b of model.blocks) {
    if (b.kind === "eq") {
      for (let i = 0; i < b.count; i++) {
        out.push({ type: "unchanged", text: model.left[b.a + i], oldLineNum: b.a + i + 1, newLineNum: b.b + i + 1 });
      }
    } else {
      for (let i = 0; i < b.aCount; i++) out.push({ type: "removed", text: model.left[b.a + i], oldLineNum: b.a + i + 1 });
      for (let i = 0; i < b.bCount; i++) out.push({ type: "added", text: model.right[b.b + i], newLineNum: b.b + i + 1 });
    }
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Block model                                                        */
/* ------------------------------------------------------------------ */

/** Inline segment: 0 = same, -1 = removed (left side), 1 = added (right side). */
export type Seg = [0 | 1 | -1, string];

export type Block =
  /** `a`/`b` are 0-based start indexes into left/right; `count` lines on each side. */
  | { kind: "eq"; a: number; b: number; count: number }
  /** Changed run: lines a..a+aCount removed, b..b+bCount added. segsA/segsB hold inline diffs for paired lines. */
  | { kind: "chg"; a: number; aCount: number; b: number; bCount: number; segsA: (Seg[] | null)[]; segsB: (Seg[] | null)[] };

export interface DiffOptions {
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
  inline: "word" | "char" | "none";
  /** Abort and return null if the line diff takes longer than this. */
  timeoutMs?: number;
}

export interface DiffModel {
  left: string[];
  right: string[];
  blocks: Block[];
  added: number;
  removed: number;
  unchanged: number;
  /** One side used CRLF/CR line endings and the other didn't (normalised away). */
  lineEndingsDiffer: boolean;
}

export function splitLines(text: string): string[] {
  if (text === "") return [];
  const lines = text.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

export function normaliseNewlines(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

const INLINE_MAX = 4000;

function inlineSegments(a: string, b: string, opts: DiffOptions): [Seg[], Seg[]] | null {
  if (opts.inline === "none" || a.length > INLINE_MAX || b.length > INLINE_MAX) return null;
  const changes =
    opts.inline === "char"
      ? diffChars(a, b, { ignoreCase: opts.ignoreCase })
      : diffWordsWithSpace(a, b, { ignoreCase: opts.ignoreCase });
  const sa: Seg[] = [];
  const sb: Seg[] = [];
  let pa = 0;
  let pb = 0;
  let same = 0;
  for (const c of changes) {
    const len = c.value.length;
    if (c.added) {
      sb.push([1, b.slice(pb, pb + len)]);
      pb += len;
    } else if (c.removed) {
      sa.push([-1, a.slice(pa, pa + len)]);
      pa += len;
    } else {
      // Common tokens carry the new side's text; slice each side so case differences stay visible.
      sa.push([0, a.slice(pa, pa + len)]);
      sb.push([0, b.slice(pb, pb + len)]);
      pa += len;
      pb += len;
      same += len;
    }
  }
  // Lines that share almost nothing read better as plain removed/added lines.
  const longest = Math.max(a.length, b.length);
  if (longest > 0 && same / longest < 0.3) return null;
  return [sa, sb];
}

export function buildDiffModel(oldText: string, newText: string, opts: DiffOptions): DiffModel | null {
  const crA = /\r/.test(oldText);
  const crB = /\r/.test(newText);
  const left = splitLines(normaliseNewlines(oldText));
  const right = splitLines(normaliseNewlines(newText));

  const norm = (s: string) => {
    let r = s;
    if (opts.ignoreWhitespace) r = r.replace(/\s+/g, " ").trim();
    if (opts.ignoreCase) r = r.toLowerCase();
    return r;
  };
  const keysA = opts.ignoreWhitespace || opts.ignoreCase ? left.map(norm) : left;
  const keysB = opts.ignoreWhitespace || opts.ignoreCase ? right.map(norm) : right;

  // Trim the common prefix/suffix first: it's the bulk of most real diffs.
  let pre = 0;
  const minLen = Math.min(keysA.length, keysB.length);
  while (pre < minLen && keysA[pre] === keysB[pre]) pre++;
  let suf = 0;
  while (
    suf < minLen - pre &&
    keysA[keysA.length - 1 - suf] === keysB[keysB.length - 1 - suf]
  ) {
    suf++;
  }
  const midA = keysA.slice(pre, keysA.length - suf);
  const midB = keysB.slice(pre, keysB.length - suf);

  let changes: { count: number; added: boolean; removed: boolean }[];
  if (midA.length === 0 || midB.length === 0) {
    changes = [];
    if (midA.length) changes.push({ count: midA.length, added: false, removed: true });
    if (midB.length) changes.push({ count: midB.length, added: true, removed: false });
  } else {
    const res = opts.timeoutMs
      ? diffArrays(midA, midB, { timeout: opts.timeoutMs })
      : diffArrays(midA, midB);
    if (!res) return null;
    changes = res.map((c) => ({ count: c.count, added: c.added, removed: c.removed }));
  }

  const blocks: Block[] = [];
  let ia = 0;
  let ib = 0;
  let added = 0;
  let removed = 0;
  let unchanged = 0;

  const pushEq = (count: number) => {
    if (count <= 0) return;
    const last = blocks[blocks.length - 1];
    if (last && last.kind === "eq") last.count += count;
    else blocks.push({ kind: "eq", a: ia, b: ib, count });
    ia += count;
    ib += count;
    unchanged += count;
  };

  pushEq(pre);
  for (let k = 0; k < changes.length; k++) {
    const c = changes[k];
    if (!c.added && !c.removed) {
      pushEq(c.count);
      continue;
    }
    // Merge an adjacent removed+added pair into one changed block.
    let aCount = 0;
    let bCount = 0;
    while (k < changes.length && (changes[k].added || changes[k].removed)) {
      if (changes[k].removed) aCount += changes[k].count;
      else bCount += changes[k].count;
      k++;
    }
    k--;
    const pairs = Math.min(aCount, bCount);
    const segsA: (Seg[] | null)[] = [];
    const segsB: (Seg[] | null)[] = [];
    for (let i = 0; i < pairs; i++) {
      const r = inlineSegments(left[ia + i], right[ib + i], opts);
      segsA.push(r ? r[0] : null);
      segsB.push(r ? r[1] : null);
    }
    blocks.push({ kind: "chg", a: ia, aCount, b: ib, bCount, segsA, segsB });
    ia += aCount;
    ib += bCount;
    removed += aCount;
    added += bCount;
  }
  pushEq(suf);

  return { left, right, blocks, added, removed, unchanged, lineEndingsDiffer: crA !== crB };
}
