/** CSV ⇄ JSON with papaparse (RFC 4180: quoted fields, embedded newlines). Runs in a worker. */
import Papa from "papaparse";

export type Direction = "csv2json" | "json2csv";
export type Delim = "auto" | "," | ";" | "\t" | "|";

export interface CsvReq {
  text: string;
  direction: Direction;
  delimiter: Delim;
  header: boolean;
  /** Numbers, booleans and empty → null. */
  typed: boolean;
  /** csv2json: array of objects/arrays or JSON Lines. */
  jsonShape: "array" | "lines";
  /** json2csv: nested objects flattened with dots. */
  flatten: boolean;
  quoteAll: boolean;
}

export type CsvRes =
  | { ok: true; output: string; preview: string[][]; rows: number; cols: number; delimiter: string; warnings: { row: number; message: string }[] }
  | { ok: false; message: string; line?: number };

const PREVIEW_ROWS = 500;

function typedValue(v: string): unknown {
  const s = v.trim();
  if (s === "") return null;
  if (/^(true|false)$/i.test(s)) return s.toLowerCase() === "true";
  // Leading zeros (IDs, postcodes) and huge integers stay strings.
  if (/^-?(0|[1-9]\d{0,14})(\.\d+)?([eE][-+]?\d+)?$/.test(s)) return Number(s);
  return v;
}

function flattenObj(obj: unknown, prefix: string, out: Record<string, unknown>) {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    const entries = Object.entries(obj as Record<string, unknown>);
    if (!entries.length && prefix) out[prefix] = "";
    for (const [k, v] of entries) flattenObj(v, prefix ? `${prefix}.${k}` : k, out);
  } else if (Array.isArray(obj)) {
    out[prefix] = obj.every((x) => x === null || typeof x !== "object") ? obj.join("; ") : JSON.stringify(obj);
  } else {
    out[prefix] = obj;
  }
}

export function processCsv(req: CsvReq): CsvRes {
  if (req.direction === "csv2json") {
    const res = Papa.parse<string[]>(req.text.replace(/^﻿/, ""), {
      delimiter: req.delimiter === "auto" ? "" : req.delimiter,
      skipEmptyLines: "greedy",
    });
    const rows = res.data;
    if (!rows.length) return { ok: false, message: "empty" };
    const warnings = res.errors.slice(0, 10).map((e) => ({ row: (e.row ?? 0) + 1, message: e.message }));
    const width = Math.max(...rows.map((r) => r.length));
    let value: unknown[];
    if (req.header) {
      const seen = new Map<string, number>();
      // Blank or repeated headers get unique names so no column is lost.
      const headers = Array.from({ length: width }, (_, i) => {
        let h = (rows[0]![i] ?? "").trim() || `column${i + 1}`;
        const n = seen.get(h) ?? 0;
        seen.set(h, n + 1);
        if (n) h = `${h}_${n + 1}`;
        return h;
      });
      value = rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, req.typed ? typedValue(r[i] ?? "") : (r[i] ?? "")])));
    } else {
      value = rows.map((r) => (req.typed ? r.map(typedValue) : r));
    }
    const output = req.jsonShape === "lines" ? value.map((v) => JSON.stringify(v)).join("\n") + "\n" : JSON.stringify(value, null, 2);
    return {
      ok: true,
      output,
      preview: rows.slice(0, PREVIEW_ROWS + 1),
      rows: req.header ? rows.length - 1 : rows.length,
      cols: width,
      delimiter: res.meta.delimiter,
      warnings,
    };
  }

  // JSON → CSV: an array of objects, an array of arrays, a single object or JSON Lines.
  let data: unknown;
  const text = req.text.trim();
  try {
    data = JSON.parse(text);
  } catch (e) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    try {
      data = lines.map((l) => JSON.parse(l));
    } catch {
      const m = /position (\d+)/.exec(String(e));
      const line = m ? text.slice(0, Number(m[1])).split("\n").length : undefined;
      return { ok: false, message: e instanceof Error ? e.message : String(e), line };
    }
  }
  if (!Array.isArray(data)) {
    // {"items":[…]} → use the first array property; a single object → one row.
    const firstArray = data && typeof data === "object" ? Object.values(data as object).find(Array.isArray) : undefined;
    data = firstArray ?? [data];
  }
  const arr = data as unknown[];
  let table: string[][];
  if (arr.every(Array.isArray)) {
    table = (arr as unknown[][]).map((r) => r.map((v) => (v === null || v === undefined ? "" : typeof v === "object" ? JSON.stringify(v) : String(v))));
  } else {
    const flat = arr.map((item) => {
      const o: Record<string, unknown> = {};
      if (req.flatten) flattenObj(item, "", o);
      else if (item && typeof item === "object") Object.assign(o, item);
      else o.value = item;
      return o;
    });
    // Union of keys in first-seen order.
    const keys: string[] = [];
    const seen = new Set<string>();
    for (const o of flat) {
      for (const k of Object.keys(o)) {
        if (seen.has(k)) continue;
        seen.add(k);
        keys.push(k);
      }
    }
    table = [keys, ...flat.map((o) => keys.map((k) => (o[k] === null || o[k] === undefined ? "" : typeof o[k] === "object" ? JSON.stringify(o[k]) : String(o[k]))))];
  }
  const delimiter = req.delimiter === "auto" ? "," : req.delimiter;
  const output = Papa.unparse(table, { delimiter, quotes: req.quoteAll, newline: "\r\n" });
  return { ok: true, output, preview: table.slice(0, PREVIEW_ROWS + 1), rows: table.length - 1, cols: table[0]?.length ?? 0, delimiter, warnings: [] };
}
