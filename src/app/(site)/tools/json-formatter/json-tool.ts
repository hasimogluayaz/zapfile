import { jsonStats, parseJson, stringifyJson, type JVal, type JsonDuplicate, type JsonError } from "@/lib/text-tools/json-core";

export type JsonIndent = "2" | "4" | "tab";
export type JsonView = "format" | "minify" | "tree";

export interface JsonReq {
  text: string;
  indent: JsonIndent;
  view: JsonView;
  sortKeys: boolean;
}

export type JsonRes =
  | {
      ok: true;
      output: string;
      /** Only sent for the tree view. */
      value?: JVal;
      lossyNumbers: number;
      duplicates: JsonDuplicate[];
      duplicateCount: number;
      keys: number;
      depth: number;
    }
  | { ok: false; error: JsonError };

export function indentString(i: JsonIndent): string {
  return i === "tab" ? "\t" : " ".repeat(Number(i));
}

export function processJson(req: JsonReq): JsonRes {
  const parsed = parseJson(req.text);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const output = stringifyJson(parsed.value, {
    indent: req.view === "minify" ? "" : indentString(req.indent),
    sortKeys: req.sortKeys,
  });
  const { keys, depth } = jsonStats(parsed.value);
  return {
    ok: true,
    output,
    value: req.view === "tree" ? parsed.value : undefined,
    lossyNumbers: parsed.lossyNumbers,
    duplicates: parsed.duplicates,
    duplicateCount: parsed.duplicateCount,
    keys,
    depth,
  };
}
