import type { Tool } from "./tools";
import { toolField } from "./tool-i18n";

/**
 * Lowercase and strip diacritics so "sıkıştır" matches "sikistir",
 * "réduire" matches "reduire", etc.
 */
export function normalizeSearch(text: string): string {
  return text
    .toLocaleLowerCase("en")
    .replace(/ı/g, "i")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Extra keywords so common intents find the right tool in any locale. */
const synonyms: Record<string, string> = {
  "merge-pdf": "combine join birlestir",
  "split-pdf": "extract pages separate bol ayir",
  "pdf-compress": "shrink reduce size smaller kucult sikistir",
  "compress-image": "shrink reduce optimize smaller jpg png webp kucult sikistir",
  "resize-image": "scale dimensions width height boyutlandir",
  "convert-image": "jpg png webp heic avif format donustur",
  "background-remover": "remove bg transparent cutout arka plan sil",
  "qr-generator": "qrcode barcode karekod",
  "qr-scanner": "qrcode read decode camera karekod",
  "json-formatter": "beautify prettify validate minify",
  "word-counter": "count words characters character counter twitter instagram limit kelime karakter say",
  "csv-json": "csv viewer table preview",
  "color-picker": "random color generator harmony complementary palette rastgele renk",
  "password-generator": "password strength checker tester random secure sifre parola guc",
  "image-to-pdf": "jpg to pdf png to pdf photos pdf",
  "pdf-to-images": "pdf to jpg pdf to png",
  "hash-generator": "md5 sha1 sha256 checksum",
  "base64-encode": "decode encode",
  "video-to-gif": "mp4 animation",
  "text-to-speech": "tts voice read aloud seslendir",
  "unit-converter": "length weight temperature",
  "timestamp-converter": "unix epoch date",
};

/**
 * Score a tool against a query. 0 = no match; higher is better.
 * Every query word must match somewhere (name, description, slug, keywords).
 */
export function scoreTool(
  tool: Tool,
  query: string,
  t: (key: string) => string,
): number {
  const q = normalizeSearch(query);
  if (!q) return 0;

  const name = normalizeSearch(toolField(t, tool.slug, tool, "name"));
  const enName = normalizeSearch(tool.name);
  const haystack = [
    name,
    enName,
    normalizeSearch(toolField(t, tool.slug, tool, "desc")),
    normalizeSearch(tool.description),
    tool.slug.replace(/-/g, " "),
    synonyms[tool.slug] ?? "",
    tool.acceptedFormats.join(" ").replace(/\./g, ""),
  ].join(" ");

  const words = q.split(/\s+/).filter(Boolean);
  if (!words.every((w) => haystack.includes(w))) return 0;

  let score = 1;
  if (name === q || enName === q) score += 100;
  if (name.startsWith(q) || enName.startsWith(q)) score += 50;
  if (name.includes(q) || enName.includes(q)) score += 25;
  for (const w of words) {
    if (name.split(/\s+/).some((part) => part.startsWith(w))) score += 10;
  }
  return score;
}

/** Tools matching the query, best match first (stable for equal scores). */
export function searchTools(
  list: Tool[],
  query: string,
  t: (key: string) => string,
): Tool[] {
  if (!query.trim()) return list;
  return list
    .map((tool, index) => ({ tool, index, score: scoreTool(tool, query, t) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((r) => r.tool);
}
