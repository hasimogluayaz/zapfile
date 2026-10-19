/** Text statistics that work for every script (Intl.Segmenter), plus X and SMS rules. */

export interface Stats {
  chars: number;
  charsNoSpaces: number;
  words: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  bytes: number;
  avgWord: number;
  longestSentence: number;
  top: { word: string; count: number }[];
}

const seg = (locale: string, granularity: "grapheme" | "word" | "sentence") =>
  typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter(locale, { granularity }) : null;

export function analyze(text: string, locale: string): Stats {
  const g = seg(locale, "grapheme");
  const graphemes = (s: string) => (g ? Array.from(g.segment(s)).length : Array.from(s).length);
  const w = seg(locale, "word");
  const words: string[] = [];
  // A link or e-mail address is one word, not "https", "example", "com".
  const forWords = text.replace(/https?:\/\/\S+|\b[\w.+-]+@[\w-]+(\.[\w-]+)+\b|\bwww\.\S+/gi, " zflinkzf ");
  if (w) {
    for (const s of w.segment(forWords)) if (s.isWordLike) words.push(s.segment);
  } else {
    words.push(...forWords.split(/\s+/).filter(Boolean));
  }
  const sentenceSeg = seg(locale, "sentence");
  const sentences = sentenceSeg ? Array.from(sentenceSeg.segment(text)).map((s) => s.segment).filter((s) => /\p{L}|\p{N}/u.test(s)) : text.split(/[.!?…。！？]+/).filter((s) => s.trim());
  let longestSentence = 0;
  if (w) {
    for (const s of sentences) {
      let n = 0;
      for (const x of w.segment(s)) if (x.isWordLike) n++;
      longestSentence = Math.max(longestSentence, n);
    }
  }
  const freq = new Map<string, number>();
  for (const word of words) {
    const k = word.toLocaleLowerCase(locale);
    // Skip very short words and numbers: they are rarely the interesting keywords.
    if (Array.from(k).length < 3 && !/[぀-ヿ㐀-鿿]/.test(k)) continue;
    if (/^\p{N}+$/u.test(k) || k === "zflinkzf") continue;
    freq.set(k, (freq.get(k) ?? 0) + 1);
  }
  const top = Array.from(freq, ([word, count]) => ({ word, count }))
    .filter((x) => x.count > 1)
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, 10);
  const noSpace = text.replace(/\s/g, "");
  return {
    chars: graphemes(text),
    charsNoSpaces: graphemes(noSpace),
    words: words.length,
    sentences: sentences.length,
    paragraphs: text.trim() ? text.split(/\n\s*\n/).filter((p) => p.trim()).length : 0,
    lines: text ? text.split("\n").length : 0,
    bytes: new TextEncoder().encode(text).length,
    avgWord: words.length ? words.reduce((n, x) => n + graphemes(x), 0) / words.length : 0,
    longestSentence,
    top,
  };
}

/** X (Twitter) weighted length: URLs count 23, CJK and emoji count 2. */
export function xLength(text: string): number {
  let n = 0;
  const urlRe = /https?:\/\/\S+|\b(?:[a-z0-9-]+\.)+(?:com|net|org|io|co|xyz|dev|app|ai|me|tr|de|uk|fr)\b(?:\/\S*)?/gi;
  const rest = text.replace(urlRe, () => {
    n += 23;
    return "";
  });
  const g = seg("en", "grapheme");
  const parts = g ? Array.from(g.segment(rest), (s) => s.segment) : Array.from(rest);
  for (const ch of parts) {
    const cp = ch.codePointAt(0)!;
    const light = cp <= 4351 || (cp >= 8192 && cp <= 8205) || (cp >= 8208 && cp <= 8223) || (cp >= 8242 && cp <= 8247);
    n += light && ch.length === 1 ? 1 : light && !/\p{Extended_Pictographic}/u.test(ch) ? 1 : 2;
  }
  return n;
}

const GSM = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM_EXT = "^{}\\[~]|€\f";

export interface SmsInfo {
  encoding: "GSM-7" | "UCS-2";
  units: number;
  segments: number;
  perSegment: number;
  /** Characters forcing UCS-2 (first few). */
  offenders: string[];
}

export function smsInfo(text: string): SmsInfo {
  let units = 0;
  const offenders = new Set<string>();
  for (const ch of text) {
    if (GSM.includes(ch)) units += 1;
    else if (GSM_EXT.includes(ch)) units += 2;
    else offenders.add(ch);
  }
  if (offenders.size === 0) {
    const per = units <= 160 ? 160 : 153;
    return { encoding: "GSM-7", units, segments: units === 0 ? 0 : Math.ceil(units / per), perSegment: per, offenders: [] };
  }
  const u16 = text.length;
  const per = u16 <= 70 ? 70 : 67;
  return { encoding: "UCS-2", units: u16, segments: Math.ceil(u16 / per), perSegment: per, offenders: Array.from(offenders).slice(0, 8) };
}
