/**
 * Explicit "Repair" for almost-JSON (JS object literals, JSON5-ish config, Python dict dumps).
 * Fixes only what is unambiguous and reports every kind of change it made.
 */

export interface RepairReport {
  text: string;
  comments: number;
  trailingCommas: number;
  singleQuotes: number;
  unquotedKeys: number;
  literals: number;
}

const IDENT_START = /[A-Za-z_$]/;
const IDENT_PART = /[\w$]/;
const SPECIAL = /["'\/,A-Za-z_$]/;
const LITERALS: Record<string, string> = {
  True: "true",
  False: "false",
  None: "null",
  undefined: "null",
  NaN: "null",
  Infinity: "null",
};

export function repairJson(src: string): RepairReport {
  const r: RepairReport = { text: "", comments: 0, trailingCommas: 0, singleQuotes: 0, unquotedKeys: 0, literals: 0 };
  const out: string[] = [];
  const n = src.length;
  let i = 0;

  /** Index of the next significant char at or after j (skips whitespace and comments). */
  const peek = (j: number): number => {
    while (j < n) {
      const c = src[j];
      if (c === " " || c === "\t" || c === "\n" || c === "\r") j++;
      else if (c === "/" && src[j + 1] === "/") {
        const e = src.indexOf("\n", j);
        j = e === -1 ? n : e;
      } else if (c === "/" && src[j + 1] === "*") {
        const e = src.indexOf("*/", j + 2);
        j = e === -1 ? n : e + 2;
      } else break;
    }
    return j;
  };

  while (i < n) {
    const c = src[i];
    if (c === '"') {
      // Copy a double-quoted string verbatim.
      let j = i + 1;
      while (j < n && src[j] !== '"' && src[j] !== "\n") j += src[j] === "\\" ? 2 : 1;
      out.push(src.slice(i, Math.min(j + 1, n)));
      i = j + 1;
      continue;
    }
    if (c === "'") {
      let j = i + 1;
      let body = "";
      while (j < n && src[j] !== "'" && src[j] !== "\n") {
        if (src[j] === "\\" && j + 1 < n) {
          body += src[j + 1] === "'" ? "'" : src.slice(j, j + 2);
          j += 2;
        } else {
          body += src[j] === '"' ? '\\"' : src[j];
          j++;
        }
      }
      if (src[j] === "'") {
        out.push('"' + body + '"');
        r.singleQuotes++;
        i = j + 1;
      } else {
        out.push(c);
        i++;
      }
      continue;
    }
    if (c === "/" && (src[i + 1] === "/" || src[i + 1] === "*")) {
      const end = src[i + 1] === "/" ? src.indexOf("\n", i) : src.indexOf("*/", i + 2);
      i = end === -1 ? n : src[i + 1] === "/" ? end : end + 2;
      r.comments++;
      continue;
    }
    if (c === ",") {
      const nx = peek(i + 1);
      if (src[nx] === "}" || src[nx] === "]") {
        r.trailingCommas++;
        i++;
        continue;
      }
      out.push(c);
      i++;
      continue;
    }
    if (IDENT_START.test(c)) {
      let j = i + 1;
      while (j < n && IDENT_PART.test(src[j])) j++;
      const word = src.slice(i, j);
      const nx = peek(j);
      const prev = out.length ? out[out.length - 1] : "";
      const prevChar = prev[prev.length - 1];
      const isKey = src[nx] === ":" && (prevChar === undefined || /[{,\s]/.test(prevChar));
      if (isKey && word !== "true" && word !== "false" && word !== "null") {
        out.push('"' + word + '"');
        r.unquotedKeys++;
      } else if (!isKey && Object.prototype.hasOwnProperty.call(LITERALS, word)) {
        out.push(LITERALS[word]);
        r.literals++;
      } else out.push(word);
      i = j;
      continue;
    }
    // Plain run (punctuation, numbers, whitespace): copy in one slice.
    let j = i + 1;
    while (j < n && !SPECIAL.test(src[j])) j++;
    out.push(src.slice(i, j));
    i = j;
  }
  r.text = out.join("");
  return r;
}

export function repairChangeCount(r: RepairReport) {
  return r.comments + r.trailingCommas + r.singleQuotes + r.unquotedKeys + r.literals;
}
