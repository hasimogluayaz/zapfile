/**
 * Returns the name (or null) of every capturing group in a pattern, in group
 * number order. Mirrors how the JS engine numbers groups: escapes and
 * character classes are skipped, lookarounds and `(?:…)` don't capture.
 */
export function captureGroupNames(pattern: string): (string | null)[] {
  const names: (string | null)[] = [];
  let inClass = 0;
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === "\\") {
      i++;
      continue;
    }
    if (inClass) {
      if (c === "[") inClass++;
      else if (c === "]") inClass--;
      continue;
    }
    if (c === "[") {
      inClass = 1;
      continue;
    }
    if (c !== "(") continue;
    if (pattern[i + 1] !== "?") {
      names.push(null);
      continue;
    }
    // (?<name>…) captures; (?<= and (?<! are lookbehinds
    if (pattern[i + 2] === "<" && pattern[i + 3] !== "=" && pattern[i + 3] !== "!") {
      const close = pattern.indexOf(">", i + 3);
      names.push(close > 0 ? pattern.slice(i + 3, close) : null);
    }
  }
  return names;
}

export const MAX_MATCHES = 10000;
export const MAX_HIGHLIGHTS = 3000;
export const TIMEOUT_MS = 2000;

export interface LibraryPattern {
  labelKey: string;
  pattern: string;
  flags: string;
}

export const LIBRARY: LibraryPattern[] = [
  { labelKey: "regex.email", pattern: "[\\w.%+-]+@[\\w.-]+\\.[A-Za-z]{2,}", flags: "gi" },
  { labelKey: "regex.url", pattern: "https?:\\/\\/[^\\s<>\"']+", flags: "gi" },
  { labelKey: "regex.phone", pattern: "\\+?\\d[\\d\\s().-]{6,}\\d", flags: "g" },
  {
    labelKey: "regex.ipAddress",
    pattern: "\\b(?:(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)\\b",
    flags: "g",
  },
  { labelKey: "regex.date", pattern: "\\d{4}-\\d{2}-\\d{2}", flags: "g" },
  {
    labelKey: "regex.v2.lib.namedDate",
    pattern: "(?<year>\\d{4})-(?<month>0[1-9]|1[0-2])-(?<day>0[1-9]|[12]\\d|3[01])",
    flags: "g",
  },
  { labelKey: "regex.v2.lib.time", pattern: "\\b(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d)?\\b", flags: "g" },
  {
    labelKey: "regex.v2.lib.uuid",
    pattern: "\\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\b",
    flags: "gi",
  },
  { labelKey: "regex.v2.lib.hexColor", pattern: "#(?:[0-9a-f]{3,4}){1,2}\\b", flags: "gi" },
  { labelKey: "regex.v2.lib.number", pattern: "-?\\d+(?:[.,]\\d+)?", flags: "g" },
  { labelKey: "regex.v2.lib.htmlTag", pattern: "<\\/?([a-z][a-z0-9-]*)\\b[^>]*>", flags: "gi" },
  { labelKey: "regex.v2.lib.repeatedWord", pattern: "(?<!\\p{L})(\\p{L}+)\\s+\\1(?!\\p{L})", flags: "giu" },
  { labelKey: "regex.v2.lib.trailingSpace", pattern: "[ \\t]+$", flags: "gm" },
];
