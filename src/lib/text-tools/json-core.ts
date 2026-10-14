/**
 * Lossless JSON parser used by the JSON formatter, YAML (JSON → YAML) and CSV (JSON → CSV) tools.
 *
 * - Objects become `Map`s so key order is exactly the source order (plain objects would move
 *   integer-like keys such as "10" to the front) and so the result survives `postMessage`.
 * - Numbers whose text would not survive `Number()` → `String()` unchanged (1.50, 1e5, big IDs)
 *   are kept as `{ n: "<source text>" }`; every plain object in the tree is such a number.
 * - Errors carry a code, offset, line and column instead of an engine-specific message.
 * - Duplicate keys (last value wins, first position kept, like JSON.parse) and numbers that JSON.parse would round are reported.
 */
import { offsetToLineCol } from "./position";

export interface LosslessNumber {
  n: string;
}
export type JVal = null | boolean | number | string | LosslessNumber | JVal[] | Map<string, JVal>;

export type JsonErrorCode =
  | "empty"
  | "expectedValue"
  | "unexpectedEnd"
  | "expectedColon"
  | "expectedCommaOrBrace"
  | "expectedCommaOrBracket"
  | "expectedKey"
  | "trailingComma"
  | "invalidNumber"
  | "invalidEscape"
  | "unterminatedString"
  | "controlChar"
  | "extraData"
  | "tooDeep";

export interface JsonError {
  code: JsonErrorCode;
  /** Short description of what was found, e.g. `'` or `}` or `end of input`. */
  token: string;
  offset: number;
  line: number;
  col: number;
}

export interface JsonDuplicate {
  key: string;
  line: number;
}

export type JsonParseResult =
  | {
      ok: true;
      value: JVal;
      /** Numbers JSON.parse would round (above 2^53, more than 17 significant digits, overflow). */
      lossyNumbers: number;
      duplicates: JsonDuplicate[];
      duplicateCount: number;
    }
  | { ok: false; error: JsonError };

export function isLossless(v: unknown): v is LosslessNumber {
  return typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Map);
}

class ParseFail extends Error {
  constructor(public code: JsonErrorCode, public offset: number) {
    super(code);
  }
}

const NUM_RE = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
const MAX_DEPTH = 4000;

function isLossyNumber(text: string, n: number): boolean {
  if (!Number.isFinite(n)) return true;
  const m = /^-?(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(text);
  if (!m) return false;
  const digits = (m[1] + (m[2] ?? "")).replace(/^0+/, "").replace(/0+$/, "");
  if (digits.length <= 15) return false;
  if (digits.length > 17) return true;
  // 16–17 significant digits: compare against what the double actually holds.
  const held = Math.abs(n).toPrecision(digits.length).replace(/e.*$/, "").replace(".", "").replace(/^0+/, "").replace(/0+$/, "");
  return held !== digits;
}

export function parseJson(text: string): JsonParseResult {
  let i = 0;
  const len = text.length;
  let lossyNumbers = 0;
  const duplicates: JsonDuplicate[] = [];
  let duplicateCount = 0;

  const ws = () => {
    while (i < len) {
      const c = text.charCodeAt(i);
      if (c === 32 || c === 10 || c === 13 || c === 9) i++;
      else break;
    }
  };

  const parseString = (): string => {
    // text[i] === '"'
    const start = i;
    i++;
    let out = "";
    let segStart = i;
    while (true) {
      if (i >= len) throw new ParseFail("unterminatedString", start);
      const c = text.charCodeAt(i);
      if (c === 34) {
        out += text.slice(segStart, i);
        i++;
        return out;
      }
      if (c === 92) {
        out += text.slice(segStart, i);
        const e = text[i + 1];
        switch (e) {
          case '"': out += '"'; break;
          case "\\": out += "\\"; break;
          case "/": out += "/"; break;
          case "b": out += "\b"; break;
          case "f": out += "\f"; break;
          case "n": out += "\n"; break;
          case "r": out += "\r"; break;
          case "t": out += "\t"; break;
          case "u": {
            const hex = text.slice(i + 2, i + 6);
            if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw new ParseFail("invalidEscape", i);
            out += String.fromCharCode(parseInt(hex, 16));
            i += 4;
            break;
          }
          default:
            if (i + 1 >= len) throw new ParseFail("unterminatedString", start);
            throw new ParseFail("invalidEscape", i);
        }
        i += 2;
        segStart = i;
        continue;
      }
      if (c < 0x20) {
        throw new ParseFail("controlChar", i);
      }
      i++;
    }
  };

  const parseValue = (depth: number): JVal => {
    if (depth > MAX_DEPTH) throw new ParseFail("tooDeep", i);
    ws();
    if (i >= len) throw new ParseFail("unexpectedEnd", i);
    const c = text[i];
    if (c === "{") {
      i++;
      const map = new Map<string, JVal>();
      ws();
      if (text[i] === "}") {
        i++;
        return map;
      }
      while (true) {
        ws();
        if (i >= len) throw new ParseFail("unexpectedEnd", i);
        if (text[i] !== '"') {
          if (text[i] === "}") throw new ParseFail("trailingComma", i);
          throw new ParseFail("expectedKey", i);
        }
        const keyOffset = i;
        const key = parseString();
        ws();
        if (i >= len) throw new ParseFail("unexpectedEnd", i);
        if (text[i] !== ":") throw new ParseFail("expectedColon", i);
        i++;
        const v = parseValue(depth + 1);
        if (map.has(key)) {
          duplicateCount++;
          if (duplicates.length < 100) duplicates.push({ key, line: offsetToLineCol(text, keyOffset).line });
        }
        map.set(key, v);
        ws();
        if (i >= len) throw new ParseFail("unexpectedEnd", i);
        if (text[i] === ",") {
          i++;
          continue;
        }
        if (text[i] === "}") {
          i++;
          return map;
        }
        throw new ParseFail("expectedCommaOrBrace", i);
      }
    }
    if (c === "[") {
      i++;
      const arr: JVal[] = [];
      ws();
      if (text[i] === "]") {
        i++;
        return arr;
      }
      while (true) {
        ws();
        if (text[i] === "]") throw new ParseFail("trailingComma", i);
        arr.push(parseValue(depth + 1));
        ws();
        if (i >= len) throw new ParseFail("unexpectedEnd", i);
        if (text[i] === ",") {
          i++;
          continue;
        }
        if (text[i] === "]") {
          i++;
          return arr;
        }
        throw new ParseFail("expectedCommaOrBracket", i);
      }
    }
    if (c === '"') return parseString();
    if (c === "-" || (c >= "0" && c <= "9")) {
      NUM_RE.lastIndex = i;
      const m = NUM_RE.exec(text);
      if (!m) throw new ParseFail("invalidNumber", i);
      const after = text[i + m[0].length];
      if (after && /[0-9.eE+\-a-zA-Z_]/.test(after)) throw new ParseFail("invalidNumber", i);
      const s = m[0];
      i += s.length;
      const n = Number(s);
      if (isLossyNumber(s, n)) lossyNumbers++;
      return String(n) === s ? n : { n: s };
    }
    if (text.startsWith("true", i)) {
      i += 4;
      return true;
    }
    if (text.startsWith("false", i)) {
      i += 5;
      return false;
    }
    if (text.startsWith("null", i)) {
      i += 4;
      return null;
    }
    throw new ParseFail("expectedValue", i);
  };

  try {
    if (text.charCodeAt(0) === 0xfeff) i = 1;
    ws();
    if (i >= len) throw new ParseFail("empty", i);
    const value = parseValue(0);
    ws();
    if (i < len) throw new ParseFail("extraData", i);
    return { ok: true, value, lossyNumbers, duplicates, duplicateCount };
  } catch (e) {
    let code: JsonErrorCode;
    let offset: number;
    if (e instanceof ParseFail) {
      code = e.code;
      offset = e.offset;
    } else if (e instanceof RangeError) {
      code = "tooDeep";
      offset = i;
    } else throw e;
    const pos = offsetToLineCol(text, offset);
    return { ok: false, error: { code, token: describeToken(text, offset), offset, ...pos } };
  }
}

function describeToken(text: string, offset: number): string {
  if (offset >= text.length) return "EOF";
  const m = /^[A-Za-z_$][\w$]*/.exec(text.slice(offset, offset + 24));
  if (m) return m[0];
  const ch = text[offset];
  if (ch === "\n" || ch === "\r") return "\\n";
  if (ch === "\t") return "\\t";
  return ch;
}

/* ---------- Serialisation ---------- */

export interface StringifyOptions {
  indent: string; // "" = minified
  sortKeys?: boolean;
}

export function stringifyJson(value: JVal, opts: StringifyOptions): string {
  const { indent, sortKeys } = opts;
  const nl = indent ? "\n" : "";
  const colon = indent ? ": " : ":";
  const SIMPLE = /^[^"\\\u0000-\u001f\u2028\u2029]*$/;
  const str = (s: string) => (s.length < 200 && SIMPLE.test(s) ? '"' + s + '"' : JSON.stringify(s));

  const write = (v: JVal, pad: string): string => {
    if (v === null) return "null";
    switch (typeof v) {
      case "string":
        return str(v);
      case "number":
        return Number.isFinite(v) ? String(v) : "null";
      case "boolean":
        return v ? "true" : "false";
    }
    if (Array.isArray(v)) {
      if (v.length === 0) return "[]";
      const inner = pad + indent;
      let s = "[" + nl;
      for (let k = 0; k < v.length; k++) {
        s += inner + write(v[k], inner) + (k < v.length - 1 ? "," + nl : nl);
      }
      return s + pad + "]";
    }
    if (v instanceof Map) {
      if (v.size === 0) return "{}";
      const inner = pad + indent;
      let s = "{" + nl;
      let idx = 0;
      const last = v.size - 1;
      if (sortKeys) {
        const keys = Array.from(v.keys()).sort(compareKeys);
        for (const k of keys) s += inner + str(k) + colon + write(v.get(k) as JVal, inner) + (idx++ < last ? "," + nl : nl);
      } else {
        v.forEach((val, k) => {
          s += inner + str(k) + colon + write(val, inner) + (idx++ < last ? "," + nl : nl);
        });
      }
      return s + pad + "}";
    }
    return v.n;
  };
  return write(value, "");
}

export function compareKeys(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Converts to plain JS values. Big integers become BigInt (for YAML) or stay text. */
export function toPlain(v: JVal, big: "bigint" | "number" | "string" = "number"): unknown {
  if (v === null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map((x) => toPlain(x, big));
  if (v instanceof Map) {
    const o: Record<string, unknown> = {};
    v.forEach((val, k) => {
      Object.defineProperty(o, k, { value: toPlain(val, big), enumerable: true, writable: true, configurable: true });
    });
    return o;
  }
  if (big === "string") return v.n;
  if (big === "bigint" && /^-?\d+$/.test(v.n)) {
    const n = Number(v.n);
    return Number.isSafeInteger(n) ? n : BigInt(v.n);
  }
  return Number(v.n);
}

/** Counts nodes so the UI can describe the document. */
export function jsonStats(v: JVal): { keys: number; depth: number } {
  let keys = 0;
  let depth = 0;
  const walk = (x: JVal, d: number) => {
    if (d > depth) depth = d;
    if (Array.isArray(x)) x.forEach((y) => walk(y, d + 1));
    else if (x instanceof Map) {
      keys += x.size;
      x.forEach((y) => walk(y, d + 1));
    }
  };
  walk(v, 0);
  return { keys, depth };
}
