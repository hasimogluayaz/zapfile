/// <reference lib="webworker" />
/**
 * Runs a regular expression off the main thread. The page enforces a hard
 * timeout by terminating this worker, so catastrophic patterns like `(a+)+$`
 * can never freeze the tab.
 */

export interface RegexRequest {
  id: number;
  pattern: string;
  flags: string;
  text: string;
  replacement: string | null;
  maxMatches: number;
}

/** Flat match record: [start, end, g1start, g1end, g2start, g2end, ...]; -1 = group did not participate. */
export type RegexMatch = number[];

export type RegexResponse =
  | {
      id: number;
      ok: true;
      matches: RegexMatch[];
      capped: boolean;
      replaced: string | null;
      ms: number;
    }
  | { id: number; ok: false; error: string };

function advance(text: string, index: number, unicode: boolean): number {
  if (unicode && index < text.length - 1) {
    const c = text.charCodeAt(index);
    if (c >= 0xd800 && c <= 0xdbff) {
      const d = text.charCodeAt(index + 1);
      if (d >= 0xdc00 && d <= 0xdfff) return index + 2;
    }
  }
  return index + 1;
}

function flatten(m: RegExpExecArray): RegexMatch {
  const out: number[] = [m.index, m.index + m[0].length];
  const ind = (m as RegExpExecArray & { indices?: ([number, number] | undefined)[] }).indices;
  for (let g = 1; g < m.length; g++) {
    const r = ind?.[g];
    if (r) out.push(r[0], r[1]);
    else out.push(-1, -1);
  }
  return out;
}

self.onmessage = (e: MessageEvent<RegexRequest>) => {
  const { id, pattern, flags, text, replacement, maxMatches } = e.data;
  const t0 = performance.now();
  try {
    const re = new RegExp(pattern, flags.includes("d") ? flags : flags + "d");
    const matches: RegexMatch[] = [];
    let capped = false;
    if (re.global) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        if (matches.length >= maxMatches) {
          capped = true;
          break;
        }
        matches.push(flatten(m));
        if (m[0].length === 0) re.lastIndex = advance(text, re.lastIndex, re.unicode);
      }
    } else {
      re.lastIndex = 0;
      const m = re.exec(text);
      if (m) matches.push(flatten(m));
    }
    let replaced: string | null = null;
    if (replacement !== null) {
      replaced = text.replace(new RegExp(pattern, flags.replace("d", "")), replacement);
    }
    const res: RegexResponse = { id, ok: true, matches, capped, replaced, ms: performance.now() - t0 };
    (self as unknown as Worker).postMessage(res);
  } catch (err) {
    const res: RegexResponse = { id, ok: false, error: err instanceof Error ? err.message : String(err) };
    (self as unknown as Worker).postMessage(res);
  }
};
