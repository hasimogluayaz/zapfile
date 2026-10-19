/** Sensitive-data finders for Redact PDF. Each returns [start, end) character ranges in `text`. */

export type PatternId = "email" | "phone" | "iban" | "card" | "tckn" | "date";
export const PATTERNS: PatternId[] = ["email", "phone", "iban", "card", "tckn", "date"];

function luhn(digits: string): boolean {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = +digits[digits.length - 1 - i]!;
    if (i % 2) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

/** Turkish identity number checksum. */
function tcknOk(s: string): boolean {
  if (!/^[1-9]\d{10}$/.test(s)) return false;
  const d = s.split("").map(Number);
  const odd = d[0]! + d[2]! + d[4]! + d[6]! + d[8]!;
  const even = d[1]! + d[3]! + d[5]! + d[7]!;
  if ((((odd * 7 - even) % 10) + 10) % 10 !== d[9]) return false;
  return d.slice(0, 10).reduce((a, b) => a + b, 0) % 10 === d[10];
}

const RULES: Record<PatternId, { re: RegExp; ok?: (m: string) => boolean }> = {
  email: { re: /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.\p{L}{2,}/gu },
  phone: { re: /(?<![\p{L}\p{N}])\+?\(?\d{1,4}\)?(?:[\s.-]?\(?\d{2,4}\)?){2,5}(?![\p{L}\p{N}])/gu, ok: (m) => m.replace(/\D/g, "").length >= 9 && m.replace(/\D/g, "").length <= 15 },
  iban: { re: /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]{4}){2,7}(?:[ ]?[A-Z0-9]{1,4})?\b/g },
  card: { re: /\b(?:\d[ -]?){12,18}\d\b/g, ok: (m) => luhn(m.replace(/\D/g, "")) },
  tckn: { re: /\b[1-9]\d{10}\b/g, ok: tcknOk },
  date: { re: /\b\d{1,2}[./-]\d{1,2}[./-](?:\d{4}|\d{2})\b/g },
};

export function findPattern(text: string, id: PatternId): [number, number][] {
  const { re, ok } = RULES[id];
  const out: [number, number][] = [];
  for (const m of text.matchAll(new RegExp(re.source, re.flags))) {
    if (ok && !ok(m[0])) continue;
    out.push([m.index!, m.index! + m[0].length]);
  }
  return out;
}

/** Plain or whole-word search, case-insensitive; or a user regex when `regex` is set. */
export function findText(text: string, query: string, opts: { regex: boolean; wholeWord: boolean }): [number, number][] {
  if (!query.trim()) return [];
  let re: RegExp;
  try {
    const src = opts.regex ? query : query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    re = new RegExp(opts.wholeWord && !opts.regex ? `(?<![\\p{L}\\p{N}])${src}(?![\\p{L}\\p{N}])` : src, "giu");
  } catch {
    return [];
  }
  const out: [number, number][] = [];
  for (const m of text.matchAll(re)) if (m[0]) out.push([m.index!, m.index! + m[0].length]);
  return out;
}
