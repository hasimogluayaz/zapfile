/**
 * Lossless XML formatter / minifier / validator. Text, attribute values,
 * CDATA, comments, DOCTYPE and processing instructions are copied verbatim,
 * so formatting never changes what the document means (unlike re-serializing
 * a DOM, which drops CDATA and unescapes entities). Runs in a worker.
 */
import { offsetToLineCol } from "@/lib/text-tools/position";

export type XmlMode = "format" | "minify";
export type XmlIndent = "2" | "4" | "tab";

export interface XmlReq {
  text: string;
  mode: XmlMode;
  indent: XmlIndent;
  keepComments: boolean;
}

export type XmlErrCode = "unclosedTag" | "mismatch" | "unexpectedClose" | "unclosedConstruct" | "badAttr" | "multipleRoots" | "noRoot" | "textOutside" | "badEntity" | "ltInText";

export type XmlRes =
  | { ok: true; output: string; elements: number; depth: number; attributes: number }
  | { ok: false; error: { code: XmlErrCode; line: number; col: number; name?: string; expected?: string } };

type Tok =
  | { k: "open"; name: string; raw: string; self: boolean; at: number }
  | { k: "close"; name: string; raw: string; at: number }
  | { k: "text"; raw: string; at: number }
  | { k: "other"; raw: string; kind: "comment" | "cdata" | "pi" | "doctype"; at: number };

class Fail extends Error {
  constructor(
    public code: XmlErrCode,
    public at: number,
    public tag?: string,
    public expected?: string,
  ) {
    super(code);
  }
}

const NAME = /^[A-Za-z_:À-￿][\w.\-:·À-￿]*/;

function tokenize(s: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const n = s.length;
  const until = (end: string, from: number, at: number) => {
    const j = s.indexOf(end, from);
    if (j < 0) throw new Fail("unclosedConstruct", at, undefined, end);
    return j + end.length;
  };
  while (i < n) {
    if (s[i] !== "<") {
      const j = s.indexOf("<", i);
      const end = j < 0 ? n : j;
      out.push({ k: "text", raw: s.slice(i, end), at: i });
      i = end;
      continue;
    }
    if (s.startsWith("<!--", i)) {
      const e = until("-->", i + 4, i);
      out.push({ k: "other", raw: s.slice(i, e), kind: "comment", at: i });
      i = e;
    } else if (s.startsWith("<![CDATA[", i)) {
      const e = until("]]>", i + 9, i);
      out.push({ k: "other", raw: s.slice(i, e), kind: "cdata", at: i });
      i = e;
    } else if (s.startsWith("<?", i)) {
      const e = until("?>", i + 2, i);
      out.push({ k: "other", raw: s.slice(i, e), kind: "pi", at: i });
      i = e;
    } else if (/^<!DOCTYPE/i.test(s.slice(i, i + 9))) {
      // Internal subsets may contain '>' inside [ … ].
      let j = i + 9;
      let depth = 0;
      for (; j < n; j++) {
        if (s[j] === "[") depth++;
        else if (s[j] === "]") depth--;
        else if (s[j] === ">" && depth <= 0) break;
      }
      if (j >= n) throw new Fail("unclosedConstruct", i, undefined, ">");
      out.push({ k: "other", raw: s.slice(i, j + 1), kind: "doctype", at: i });
      i = j + 1;
    } else if (s[i + 1] === "/") {
      const m = NAME.exec(s.slice(i + 2));
      if (!m) throw new Fail("unclosedTag", i);
      let j = i + 2 + m[0].length;
      while (j < n && /\s/.test(s[j]!)) j++;
      if (s[j] !== ">") throw new Fail("unclosedTag", i, m[0]);
      out.push({ k: "close", name: m[0], raw: `</${m[0]}>`, at: i });
      i = j + 1;
    } else {
      const m = NAME.exec(s.slice(i + 1));
      if (!m) throw new Fail("ltInText", i);
      // Scan attributes respecting quotes.
      let j = i + 1 + m[0].length;
      let quote = "";
      for (; j < n; j++) {
        const c = s[j]!;
        if (quote) {
          if (c === quote) quote = "";
          else if (c === "<") throw new Fail("badAttr", j, m[0]);
        } else if (c === '"' || c === "'") quote = c;
        else if (c === ">") break;
      }
      if (j >= n) throw new Fail("unclosedTag", i, m[0]);
      const inner = s.slice(i + 1 + m[0].length, j);
      const self = inner.trimEnd().endsWith("/");
      const attrText = self ? inner.trimEnd().slice(0, -1) : inner;
      const attrs = attrText.trim();
      if (attrs && !/^(?:[A-Za-z_:À-￿][\w.\-:À-￿]*\s*=\s*(?:"[^"]*"|'[^']*')\s*)+$/.test(attrs)) throw new Fail("badAttr", i, m[0]);
      // Normalise the space between attributes, keep values verbatim.
      const normAttrs = attrs.replace(/\s*=\s*/g, "=").match(/[^\s=]+=(?:"[^"]*"|'[^']*')/g) ?? [];
      out.push({ k: "open", name: m[0], raw: `<${m[0]}${normAttrs.length ? " " + normAttrs.join(" ") : ""}${self ? "/>" : ">"}`, self, at: i });
      i = j + 1;
    }
  }
  return out;
}

const ENTITY = /&(?:[A-Za-z_][\w.-]*|#\d+|#x[0-9a-fA-F]+);/y;

function checkText(raw: string, at: number) {
  for (let i = raw.indexOf("&"); i >= 0; i = raw.indexOf("&", i + 1)) {
    ENTITY.lastIndex = i;
    if (!ENTITY.test(raw)) throw new Fail("badEntity", at + i);
  }
}

export function processXml(req: XmlReq): XmlRes {
  const src = req.text.replace(/^﻿/, "");
  let toks: Tok[];
  try {
    toks = tokenize(src);
    // Well-formedness: matching tags, one root, no stray text.
    const stack: { name: string; at: number }[] = [];
    let roots = 0;
    for (const t of toks) {
      if (t.k === "open") {
        if (!stack.length) {
          roots++;
          if (roots > 1) throw new Fail("multipleRoots", t.at);
        }
        if (!t.self) stack.push({ name: t.name, at: t.at });
      } else if (t.k === "close") {
        const top = stack.pop();
        if (!top) throw new Fail("unexpectedClose", t.at, t.name);
        if (top.name !== t.name) throw new Fail("mismatch", t.at, t.name, top.name);
      } else if (t.k === "text") {
        if (!stack.length && t.raw.trim()) throw new Fail("textOutside", t.at + (t.raw.length - t.raw.trimStart().length));
        checkText(t.raw, t.at);
      } else if (t.kind === "cdata" && !stack.length) {
        throw new Fail("textOutside", t.at);
      }
    }
    if (stack.length) throw new Fail("unclosedTag", stack[stack.length - 1]!.at, stack[stack.length - 1]!.name);
    if (!roots) throw new Fail("noRoot", 0);
  } catch (e) {
    if (e instanceof Fail) {
      const pos = offsetToLineCol(src, e.at);
      return { ok: false, error: { code: e.code, line: pos.line, col: pos.col, name: e.tag, expected: e.expected } };
    }
    throw e;
  }

  let elements = 0;
  let attributes = 0;
  for (const t of toks) {
    if (t.k === "open") {
      elements++;
      attributes += (t.raw.match(/=(?:"[^"]*"|'[^']*')/g) ?? []).length;
    }
  }
  const unit = req.indent === "tab" ? "\t" : " ".repeat(Number(req.indent));
  const list = req.keepComments ? toks : toks.filter((t) => !(t.k === "other" && t.kind === "comment"));

  if (req.mode === "minify") {
    let out = "";
    for (const t of list) {
      if (t.k === "text") {
        // Whitespace-only text between tags is insignificant; real text is kept as is.
        if (t.raw.trim()) out += t.raw;
      } else out += t.raw;
    }
    return { ok: true, output: out, elements, depth: depthOf(list), attributes };
  }

  // Format: one node per line, but elements whose content is mixed text and
  // markup (e.g. <p>Hello <b>world</b></p>) are kept on one line so spacing in
  // the text is preserved.
  const lines: string[] = [];
  let depth = 0;
  for (let i = 0; i < list.length; i++) {
    const t = list[i]!;
    const pad = unit.repeat(depth);
    if (t.k === "text") {
      if (!t.raw.trim()) continue;
      lines.push(pad + t.raw.trim());
    } else if (t.k === "other") {
      lines.push(pad + t.raw);
    } else if (t.k === "close") {
      depth--;
      lines.push(unit.repeat(depth) + `</${t.name}>`);
    } else if (t.self) {
      lines.push(pad + t.raw);
    } else {
      // Look ahead to the matching close tag, noting what the direct children are.
      let j = i + 1;
      let level = 0;
      let directText = false;
      let directMarkup = false;
      for (; j < list.length; j++) {
        const u = list[j]!;
        if (u.k === "close") {
          if (level === 0) break;
          level--;
          continue;
        }
        if (level === 0) {
          // CDATA is text: moving it to its own line would add whitespace to the content.
          if (u.k === "text") directText ||= !!u.raw.trim();
          else if (u.k === "other" && u.kind === "cdata") directText = true;
          else directMarkup = true;
        }
        if (u.k === "open" && !u.self) level++;
      }
      const inner = list.slice(i + 1, j);
      if (!directMarkup) {
        // <a>text</a> or <a></a> on one line (text kept verbatim).
        lines.push(pad + t.raw + inner.map((u) => u.raw).join("") + `</${t.name}>`);
        i = j;
      } else if (directText) {
        // Mixed content: reformatting would change the text's spacing.
        lines.push(pad + t.raw + inner.map((u) => u.raw).join("") + `</${t.name}>`);
        i = j;
      } else {
        lines.push(pad + t.raw);
        depth++;
      }
    }
  }
  return { ok: true, output: lines.join("\n") + "\n", elements, depth: depthOf(list), attributes };
}

function depthOf(toks: Tok[]): number {
  let d = 0;
  let max = 0;
  for (const t of toks) {
    if (t.k === "open" && !t.self) max = Math.max(max, ++d);
    else if (t.k === "close") d--;
  }
  return max;
}
