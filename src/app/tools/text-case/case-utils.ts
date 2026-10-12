/**
 * Unicode-aware case conversions. Pure functions (testable in Node).
 * `lang` is a BCP 47 tag used for locale-sensitive casing (Turkish İ/ı etc.),
 * or undefined for language-neutral Unicode rules.
 */

const SEP = new RegExp("[^\\p{L}\\p{M}\\p{N}]+", "u");
// lower→Upper ("fooBar"), UPPER→Upper+lower ("XMLHttp"), letter↔digit stays together.
const CASE_BREAK = new RegExp("(?<=[\\p{Ll}\\p{N}])(?=\\p{Lu})|(?<=\\p{Lu})(?=\\p{Lu}\\p{Ll})", "u");

/** Split into words on separators (space, -, _, ., /…) and on camelCase transitions. */
export function splitWords(text: string): string[] {
  const out: string[] = [];
  for (const chunk of text.split(SEP)) {
    if (!chunk) continue;
    for (const w of chunk.split(CASE_BREAK)) if (w) out.push(w);
  }
  return out;
}

const up = (s: string, lang?: string) => (lang ? s.toLocaleUpperCase(lang) : s.toUpperCase());
const low = (s: string, lang?: string) => (lang ? s.toLocaleLowerCase(lang) : s.toLowerCase());

/** First grapheme upper-cased, rest lower-cased. */
export function capitalize(word: string, lang?: string): string {
  if (!word) return word;
  const first = Array.from(word)[0];
  return up(first, lang) + low(word.slice(first.length), lang);
}

const EN_SMALL = new Set(
  "a an and as at but by en for if in nor of on or per the to v vs via up".split(" "),
);

const WORD_RE = new RegExp("[\\p{L}\\p{M}\\p{N}]+(?:['’][\\p{L}\\p{M}]+)*", "gu");

export function titleCase(text: string, lang?: string): string {
  const english = !lang || lang.toLowerCase().startsWith("en");
  const matches = Array.from(text.matchAll(WORD_RE));
  let i = 0;
  return text.replace(WORD_RE, (word, offset: number) => {
    const idx = i++;
    const isFirst = idx === 0;
    const isLast = idx === matches.length - 1;
    // A word right after ":" or a sentence end starts a new phrase.
    const before = text.slice(Math.max(0, offset - 3), offset);
    const phraseStart = /[:.!?…]\s*$/.test(before);
    const lower = low(word, lang);
    if (english && !isFirst && !isLast && !phraseStart && EN_SMALL.has(lower)) return lower;
    return capitalize(word, lang);
  });
}

const SENTENCE_START = new RegExp("(^|[.!?…。！？]\\s+|\\n\\s*)(\\p{L})", "gu");

export function sentenceCase(text: string, lang?: string): string {
  return low(text, lang).replace(SENTENCE_START, (_m, pre: string, ch: string) => pre + up(ch, lang));
}

export function camelCase(text: string, lang?: string): string {
  return splitWords(text)
    .map((w, i) => (i === 0 ? low(w, lang) : capitalize(w, lang)))
    .join("");
}

export function pascalCase(text: string, lang?: string): string {
  return splitWords(text).map((w) => capitalize(w, lang)).join("");
}

export function joinCase(text: string, sep: string, upper: boolean, lang?: string): string {
  return splitWords(text)
    .map((w) => (upper ? up(w, lang) : low(w, lang)))
    .join(sep);
}

export function reverseGraphemes(text: string): string {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(seg.segment(text), (s) => s.segment).reverse().join("");
  }
  return Array.from(text).reverse().join("");
}

export function cleanSpaces(text: string): string {
  return text
    .split("\n")
    .map((l) => l.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function alternatingCase(text: string, lang?: string): string {
  let i = 0;
  return Array.from(text)
    .map((ch) => {
      if (low(ch, lang) === up(ch, lang)) return ch;
      return i++ % 2 === 0 ? low(ch, lang) : up(ch, lang);
    })
    .join("");
}

export function inverseCase(text: string, lang?: string): string {
  return Array.from(text)
    .map((ch) => {
      const u = up(ch, lang);
      return ch === u ? low(ch, lang) : u;
    })
    .join("");
}

/** Applies a word-based transform per line so multi-line input keeps its lines. */
export function perLine(text: string, fn: (line: string) => string): string {
  return text.split("\n").map(fn).join("\n");
}
