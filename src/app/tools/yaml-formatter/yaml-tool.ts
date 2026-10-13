import { Document, Scalar, parseAllDocuments, type ToStringOptions } from "yaml";
import { isLossless, parseJson, stringifyJson, type JVal, type JsonErrorCode } from "@/lib/text-tools/json-core";

export type YamlMode = "format" | "yaml2json" | "json2yaml";
export type YamlIndent = "2" | "4";

export interface YamlReq {
  text: string;
  mode: YamlMode;
  indent: YamlIndent;
}

export type YamlError =
  | { kind: "yaml"; message: string; line?: number; col?: number }
  | { kind: "json"; code: JsonErrorCode; token: string; line: number; col: number };

export type YamlRes =
  | { ok: true; output: string; docs: number; warnings: { message: string; line?: number }[] }
  | { ok: false; error: YamlError };

function cleanMessage(msg: string): string {
  // yaml's messages end with " at line X, column Y:\n\n<code frame>"; we show our own frame.
  return msg.split(/ at line \d+, column \d+/)[0].trim();
}

/** YAML (possibly multi-document) → JVal tree that keeps key order and big integers. */
function yamlToJVal(v: unknown): JVal {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" || typeof v === "boolean") return v;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "bigint") return Number.isSafeInteger(Number(v)) ? Number(v) : { n: v.toString() };
  if (Array.isArray(v)) return v.map(yamlToJVal);
  if (v instanceof Set) return Array.from(v, yamlToJVal);
  if (v instanceof Map) {
    const m = new Map<string, JVal>();
    v.forEach((val, k) => {
      const key = typeof k === "string" ? k : k !== null && typeof k === "object" ? JSON.stringify(yamlToJVal(k) instanceof Map ? Object.fromEntries(yamlToJVal(k) as Map<string, JVal>) : k) : String(k);
      m.set(key, yamlToJVal(val));
    });
    return m;
  }
  if (v instanceof Date) return v.toISOString();
  if (v instanceof Uint8Array) {
    let s = "";
    for (let i = 0; i < v.length; i++) s += String.fromCharCode(v[i]);
    return btoa(s);
  }
  if (typeof v === "object") {
    const m = new Map<string, JVal>();
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) m.set(k, yamlToJVal(val));
    return m;
  }
  return String(v);
}

/** JSON tree → values the yaml library stringifies faithfully (Maps keep order, BigInt keeps digits). */
function jvalToYaml(v: JVal): unknown {
  if (Array.isArray(v)) return v.map(jvalToYaml);
  if (v instanceof Map) {
    const m = new Map<string, unknown>();
    v.forEach((val, k) => m.set(k, jvalToYaml(val)));
    return m;
  }
  if (isLossless(v)) {
    if (/^-?\d+$/.test(v.n)) return BigInt(v.n);
    const n = Number(v.n);
    const frac = /\.(\d+)(?![eE])$/.exec(v.n);
    if (frac && Number.isFinite(n)) {
      const s = new Scalar(n);
      s.minFractionDigits = frac[1].length; // keeps 1.50 as 1.50
      return s;
    }
    return n;
  }
  return v;
}

export function processYaml(req: YamlReq): YamlRes {
  const indent = Number(req.indent);
  const toStr: ToStringOptions = { indent, lineWidth: 0, minContentWidth: 0, flowCollectionPadding: false };

  if (req.mode === "json2yaml") {
    const parsed = parseJson(req.text);
    if (!parsed.ok) {
      const e = parsed.error;
      return { ok: false, error: { kind: "json", code: e.code, token: e.token, line: e.line, col: e.col } };
    }
    // YAML 1.2 output that also stays safe for 1.1 parsers: strings like "yes", "on"
    // or "0755" get quoted so they can't be misread as booleans or numbers.
    const doc = new Document(jvalToYaml(parsed.value), { version: "1.2", compat: "yaml-1.1" });
    const output = doc.toString(toStr);
    return { ok: true, output, docs: 1, warnings: [] };
  }

  const docs = parseAllDocuments(req.text, { prettyErrors: true, intAsBigInt: req.mode === "yaml2json" });
  const list = Array.isArray(docs) ? docs : [];
  const warnings: { message: string; line?: number }[] = [];
  for (const d of list) {
    if (d.errors.length) {
      const e = d.errors[0];
      return {
        ok: false,
        error: { kind: "yaml", message: cleanMessage(e.message), line: e.linePos?.[0].line, col: e.linePos?.[0].col },
      };
    }
    for (const w of d.warnings) {
      if (warnings.length < 20) warnings.push({ message: cleanMessage(w.message), line: w.linePos?.[0].line });
    }
  }

  if (req.mode === "format") {
    const output = list.map((d) => d.toString(toStr)).join("");
    return { ok: true, output, docs: list.length, warnings };
  }

  // YAML → JSON: one document → its value, several → an array of documents.
  const values: JVal[] = [];
  for (const d of list) {
    try {
      values.push(yamlToJVal(d.toJS({ mapAsMap: true, maxAliasCount: 1000 })));
    } catch (e) {
      return { ok: false, error: { kind: "yaml", message: e instanceof Error ? e.message : String(e) } };
    }
  }
  const value: JVal = values.length === 1 ? values[0] : values;
  return { ok: true, output: stringifyJson(value, { indent: " ".repeat(indent) }), docs: list.length, warnings };
}

