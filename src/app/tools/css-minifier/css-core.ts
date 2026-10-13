/** CSS minify (csso) and a token-aware beautifier that never changes meaning. Runs in a worker. */
import { minify } from "csso";

export type CssMode = "minify" | "beautify";

export interface CssReq {
  text: string;
  mode: CssMode;
  /** csso structural optimisations (merge rules, shorthand). */
  restructure: boolean;
  keepComments: boolean;
  indent: "2" | "4" | "tab";
}

export type CssRes =
  | { ok: true; output: string; rules: number; nestingFallback?: boolean }
  | { ok: false; message: string; line?: number; col?: number };

/** Split CSS into comments, strings, url(...) and other text, tracking parentheses. */
function beautify(css: string, unit: string, keepComments: boolean): { out: string; rules: number } {
  const out: string[] = [];
  let depth = 0;
  let buf = "";
  let paren = 0;
  let rules = 0;
  const pad = () => unit.repeat(depth);
  const collapse = (s: string) => s.replace(/\s+/g, " ").trim();
  const flushDecl = () => {
    const s = collapse(buf);
    buf = "";
    if (!s) return;
    if (s.startsWith("@") || depth === 0) {
      out.push(pad() + s + ";");
      return;
    }
    const i = s.indexOf(":");
    out.push(pad() + (i > 0 ? `${s.slice(0, i).trim()}: ${s.slice(i + 1).trim()}` : s) + ";");
  };
  for (let i = 0; i < css.length; i++) {
    const c = css[i]!;
    if (c === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      const stop = end < 0 ? css.length : end + 2;
      if (keepComments) {
        if (buf.trim()) buf += css.slice(i, stop);
        else out.push(pad() + css.slice(i, stop).trim());
      }
      i = stop - 1;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== c) j += css[j] === "\\" ? 2 : 1;
      buf += css.slice(i, j + 1);
      i = j;
      continue;
    }
    if (c === "(") paren++;
    if (c === ")") paren = Math.max(0, paren - 1);
    if (paren > 0) {
      buf += c;
      continue;
    }
    if (c === "{") {
      const head = collapse(buf);
      buf = "";
      // One selector per line for selector lists (not inside at-rule preludes).
      const sel = head.startsWith("@") ? head : splitTop(head).join(`,\n${pad()}`);
      if (out.length && depth === 0 && out[out.length - 1] !== "") out.push("");
      out.push(`${pad()}${sel} {`);
      depth++;
      rules++;
    } else if (c === "}") {
      flushDecl();
      depth = Math.max(0, depth - 1);
      out.push(`${pad()}}`);
    } else if (c === ";") {
      flushDecl();
    } else {
      buf += c;
    }
  }
  flushDecl();
  return { out: out.join("\n").replace(/\n{3,}/g, "\n\n") + "\n", rules };
}

/** Whitespace-only minification on the same tokenizer (used for CSS nesting, which csso doesn't support). */
function compact(css: string): string {
  const pretty = beautify(css, "", false).out;
  // The beautifier put every token boundary on its own line; join them back tightly.
  return pretty
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("")
    .replace(/: /g, (m, off: number, all: string) => (isInsideString(all, off) ? m : ":"))
    .replace(/ \{/g, "{")
    .replace(/,(?=\S)/g, ",")
    .replace(/;\}/g, "}");
}

function isInsideString(s: string, at: number): boolean {
  let q = "";
  for (let i = 0; i < at; i++) {
    const c = s[i]!;
    if (q) {
      if (c === "\\") i++;
      else if (c === q) q = "";
    } else if (c === '"' || c === "'") q = c;
  }
  return !!q;
}

/** Native CSS nesting: a rule block inside a style rule (not inside @media etc.). */
function hasNesting(css: string): boolean {
  const stack: boolean[] = [];
  let buf = "";
  let q = "";
  for (let i = 0; i < css.length; i++) {
    const c = css[i]!;
    if (q) {
      if (c === "\\") i++;
      else if (c === q) q = "";
      continue;
    }
    if (c === '"' || c === "'") q = c;
    else if (c === "/" && css[i + 1] === "*") {
      const e = css.indexOf("*/", i + 2);
      i = e < 0 ? css.length : e + 1;
    } else if (c === "{") {
      const isAt = buf.trim().startsWith("@");
      if (stack.length && stack[stack.length - 1] === false && !isAt) return true;
      stack.push(isAt);
      buf = "";
    } else if (c === "}") {
      stack.pop();
      buf = "";
    } else if (c === ";") buf = "";
    else buf += c;
  }
  return false;
}

/** Split on commas that are not inside parentheses or brackets. */
function splitTop(s: string): string[] {
  const parts: string[] = [];
  let d = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(" || ch === "[") d++;
    if (ch === ")" || ch === "]") d--;
    if (ch === "," && d === 0) {
      parts.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

export function processCss(req: CssReq): CssRes {
  if (req.mode === "beautify") {
    const unit = req.indent === "tab" ? "\t" : " ".repeat(Number(req.indent));
    const { out, rules } = beautify(req.text, unit, req.keepComments);
    return { ok: true, output: out, rules };
  }
  if (hasNesting(req.text)) {
    const out = compact(req.text);
    return { ok: true, output: out, rules: (out.match(/\{/g) ?? []).length, nestingFallback: true };
  }
  try {
    const res = minify(req.text, { restructure: req.restructure, comments: req.keepComments ? "exclamation" : false });
    return { ok: true, output: res.css, rules: (res.css.match(/\{/g) ?? []).length };
  } catch (e) {
    const err = e as { message?: string; line?: number; column?: number };
    return { ok: false, message: (err.message ?? String(e)).split("\n")[0]!, line: err.line, col: err.column };
  }
}
