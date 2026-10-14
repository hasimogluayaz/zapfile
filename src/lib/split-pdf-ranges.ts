/**
 * Page-range parsing shared by Split, Merge and Rotate PDF.
 *
 * Accepted tokens (comma/semicolon separated, 1-based):
 *   7        a single page
 *   2-5      pages 2..5            (also 2–5 with an en dash)
 *   5-       page 5 to the last page
 *   -3       page 1 to page 3
 *   all, odd, even, last   (only with `keywords: true`)
 */

export interface PageRange {
  start: number;
  end: number;
}

export interface RangeIssue {
  /** i18n key */
  key: string;
  params?: Record<string, string | number>;
}

export interface RangeParse {
  ranges: PageRange[];
  error: RangeIssue | null;
}

const DASH = /[-‐-―−]/;

export function parsePageRanges(
  input: string,
  total: number,
  { keywords = false }: { keywords?: boolean } = {},
): RangeParse {
  const ranges: PageRange[] = [];
  const tokens = input
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const raw of tokens) {
    const token = raw.replace(/\s+/g, "").toLowerCase();

    if (keywords) {
      if (token === "all") {
        if (total > 0) ranges.push({ start: 1, end: total });
        continue;
      }
      if (token === "last") {
        if (total > 0) ranges.push({ start: total, end: total });
        continue;
      }
      if (token === "odd" || token === "even") {
        for (let p = token === "odd" ? 1 : 2; p <= total; p += 2) ranges.push({ start: p, end: p });
        continue;
      }
    }

    const m = token.match(new RegExp(`^(\\d*)(${DASH.source})?(\\d*)$`));
    if (!m || (!m[1] && !m[3]) || (!m[2] && !m[1])) {
      return { ranges: [], error: { key: "pdfrange.v2.errToken", params: { token: raw } } };
    }
    const hasDash = Boolean(m[2]);
    const start = m[1] ? Number(m[1]) : 1;
    const end = hasDash ? (m[3] ? Number(m[3]) : total) : start;

    for (const n of [start, end]) {
      if (n < 1) return { ranges: [], error: { key: "pdfrange.v2.errZero", params: { token: raw } } };
      if (n > total) {
        return { ranges: [], error: { key: "pdfrange.v2.errPage", params: { n, total } } };
      }
    }
    if (start > end) {
      return {
        ranges: [],
        error: { key: "pdfrange.v2.errOrder", params: { token: raw, fixed: `${end}-${start}` } },
      };
    }
    ranges.push({ start, end });
  }

  return { ranges, error: null };
}

/** "1-3, 5, 8-10" */
export function formatPageRanges(ranges: PageRange[]): string {
  return ranges.map((r) => (r.start === r.end ? `${r.start}` : `${r.start}-${r.end}`)).join(", ");
}

/** Sorted, de-duplicated 1-based pages → contiguous ranges. */
export function compactPages(pages: Iterable<number>): PageRange[] {
  const sorted = Array.from(new Set(pages)).sort((a, b) => a - b);
  const out: PageRange[] = [];
  for (const p of sorted) {
    const last = out[out.length - 1];
    if (last && p === last.end + 1) last.end = p;
    else out.push({ start: p, end: p });
  }
  return out;
}

/** 1-based pages in range order (duplicates kept). */
export function rangesToPages(ranges: PageRange[]): number[] {
  const out: number[] = [];
  for (const r of ranges) for (let p = r.start; p <= r.end; p++) out.push(p);
  return out;
}

export function pagesInRanges(ranges: PageRange[]): Set<number> {
  return new Set(rangesToPages(ranges));
}

/** "pages-2-5" / "page-3" — file-name friendly label for one range. */
export function rangeLabel(range: PageRange): string {
  return range.start === range.end ? `page-${range.start}` : `pages-${range.start}-${range.end}`;
}
