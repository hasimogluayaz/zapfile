"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowLeftRight, CheckCircle2, Download, Loader2 } from "lucide-react";
import CsvTable from "@/components/CsvTable";
import ToolLayout from "@/components/ToolLayout";
import { Segmented, Toggle, sectionTitle } from "@/components/ui/controls";
import { downloadBlob } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useLiveTask, useStoredPref, useStoredText, useTaskRunner } from "@/lib/text-tools/hooks";
import { CodeEditor, ErrorBox, OutputPanel, SavedNote, baseName, readTextFile, smallButton } from "@/lib/text-tools/ui";
import type { CsvReq, CsvRes, Delim, Direction } from "./csv-core";

const SAMPLE_CSV = `name,city,joined,active,score
"Yılmaz, Ayşe",İstanbul,2024-03-01,true,92.5
Jean Dupont,Paris,2023-11-12,false,78
"Müller ""Max""",Berlin,2025-01-20,true,
Ana Souza,"São Paulo
Brazil",2022-07-08,true,88`;

const SAMPLE_JSON = `[
  { "id": 1, "name": "Ayşe", "address": { "city": "İstanbul", "zip": "34000" }, "tags": ["admin", "beta"] },
  { "id": 2, "name": "Jean", "address": { "city": "Paris", "zip": "75001" }, "active": true }
]`;

const DELIM_LABEL: Record<string, string> = { ",": ",", ";": ";", "\t": "Tab", "|": "|" };

export default function CsvJsonPage() {
  const { t } = useI18n();
  const [input, setInput, store] = useStoredText("csv-json");
  const [direction, setDirection] = useStoredPref<Direction>("csv.dir", "csv2json", ["csv2json", "json2csv"]);
  const [delimiter, setDelimiter] = useStoredPref<Delim>("csv.delim", "auto", ["auto", ",", ";", "\t", "|"]);
  const [header, setHeader] = useStoredPref<boolean>("csv.header", true);
  const [typed, setTyped] = useStoredPref<boolean>("csv.typed", true);
  const [jsonShape, setJsonShape] = useStoredPref<"array" | "lines">("csv.shape", "array", ["array", "lines"]);
  const [flatten, setFlatten] = useStoredPref<boolean>("csv.flatten", true);
  const [quoteAll, setQuoteAll] = useStoredPref<boolean>("csv.quoteAll", false);
  const [fileBase, setFileBase] = useState("data");

  const runner = useTaskRunner<CsvReq, CsvRes>(
    () => new Worker(new URL("./csv.worker.ts", import.meta.url), { type: "module" }),
    async (req) => (await import("./csv-core")).processCsv(req),
  );
  const req = useMemo<CsvReq | null>(
    () => (input.trim() ? { text: input, direction, delimiter, header, typed, jsonShape, flatten, quoteAll } : null),
    [input, direction, delimiter, header, typed, jsonShape, flatten, quoteAll],
  );
  const { result, pending, failure } = useLiveTask(runner, req, input.length);
  const ok = result && result.ok ? result : null;
  const err = result && !result.ok ? result : null;
  const output = input.trim() && ok ? ok.output : "";
  const toJson = direction === "csv2json";

  const onFile = useCallback(
    async (file: File) => {
      const text = await readTextFile(file, t);
      if (text === null) return;
      setInput(text);
      setFileBase(baseName(file.name) || "data");
      if (/\.(json|jsonl|ndjson)$/i.test(file.name)) setDirection("json2csv");
      else if (/\.(csv|tsv|txt)$/i.test(file.name)) setDirection("csv2json");
      if (/\.tsv$/i.test(file.name)) setDelimiter("\t");
    },
    [setInput, setDirection, setDelimiter, t],
  );

  const swap = () => {
    if (!output) return;
    setInput(output);
    setDirection(toJson ? "json2csv" : "csv2json");
  };

  return (
    <ToolLayout toolName={t("tool.csv-json.name")} toolDescription={t("tool.csv-json.desc")}>
      <div className="space-y-5">
        <div className="glass space-y-4 rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Segmented<Direction>
              label={t("b64.v2.direction")}
              value={direction}
              onChange={setDirection}
              options={[
                { value: "csv2json", label: t("csvjson.csvToJson") },
                { value: "json2csv", label: t("csvjson.jsonToCsv") },
              ]}
            />
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-t-secondary">{t("csvjson.delimiter")}</span>
              <Segmented<Delim>
                label={t("csvjson.delimiter")}
                size="sm"
                value={delimiter}
                onChange={setDelimiter}
                options={[
                  ...(toJson ? [{ value: "auto" as Delim, label: t("ts.v2.auto") }] : []),
                  { value: "," as Delim, label: "," },
                  { value: ";" as Delim, label: ";" },
                  { value: "\t" as Delim, label: "Tab" },
                  { value: "|" as Delim, label: "|" },
                ]}
              />
            </div>
            <div className="flex gap-2 sm:ms-auto">
              <button type="button" className={smallButton} onClick={swap} disabled={!output}>
                <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                {t("ui.swap")}
              </button>
              <button
                type="button"
                className={smallButton}
                onClick={() => {
                  setInput(toJson ? SAMPLE_CSV : SAMPLE_JSON);
                  setFileBase("sample");
                }}
              >
                {t("json.sample")}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {toJson ? (
              <>
                <Toggle checked={header} onChange={setHeader} label={t("csvjson.firstRowHeaders")} />
                <Toggle checked={typed} onChange={setTyped} label={t("csvjson.v2.typed")} description={t("csvjson.v2.typedHint")} />
                <Toggle checked={jsonShape === "lines"} onChange={(v) => setJsonShape(v ? "lines" : "array")} label={t("csvjson.v2.jsonLines")} />
              </>
            ) : (
              <>
                <Toggle checked={flatten} onChange={setFlatten} label={t("csvjson.v2.flatten")} description={t("csvjson.v2.flattenHint")} />
                <Toggle checked={quoteAll} onChange={setQuoteAll} label={t("csvjson.v2.quoteAll")} />
              </>
            )}
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="glass rounded-2xl p-4 sm:p-5">
            <CodeEditor
              label={toJson ? t("csvjson.csvInput") : t("csvjson.jsonInput")}
              value={input}
              onChange={setInput}
              placeholder={toJson ? "name,age\nAyşe,30" : '[{"name":"Ayşe","age":30}]'}
              errorLine={err?.line ?? null}
              onFile={onFile}
              accept={[".csv", ".tsv", ".txt", ".json", ".jsonl", ".ndjson"]}
              onClear={() => setInput("")}
              footer={
                <>
                  {input.trim() && (
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : ok ? <CheckCircle2 className="h-3.5 w-3.5 text-t-primary" aria-hidden="true" /> : null}
                      {pending ? t("textkit.v2.checking") : ok ? t("csvjson.v2.summary", { rows: ok.rows.toLocaleString(), cols: ok.cols }) : ""}
                    </span>
                  )}
                  <SavedNote tooBig={store.tooBigToStore} />
                </>
              }
            />
          </div>
          <div className="glass rounded-2xl p-4 sm:p-5">
            <OutputPanel
              title={toJson ? t("csvjson.jsonOutput") : t("csvjson.csvOutput")}
              text={output}
              filename={`${fileBase}.${toJson ? (jsonShape === "lines" ? "jsonl" : "json") : "csv"}`}
              mime={toJson ? "application/json" : "text/csv"}
              stale={pending}
              placeholder={t("textkit.v2.outputPlaceholder")}
              meta={ok && toJson && delimiter === "auto" ? <span>{t("csvjson.v2.detected", { d: DELIM_LABEL[ok.delimiter] ?? ok.delimiter })}</span> : null}
              actions={
                !toJson && output ? (
                  <button
                    type="button"
                    className={smallButton}
                    title={t("csvjson.v2.excelHint")}
                    onClick={() => downloadBlob(new Blob(["﻿" + output], { type: "text/csv;charset=utf-8" }), `${fileBase}-excel.csv`)}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    Excel
                  </button>
                ) : null
              }
            />
          </div>
        </div>

        {failure && <ErrorBox title={t("textkit.v2.failed")} message={failure} />}
        {err && <ErrorBox title={t("csvjson.error")} message={err.message === "empty" ? t("csvjson.v2.empty") : err.message} line={err.line} source={input} />}
        {ok && ok.warnings.length > 0 && (
          <ErrorBox
            tone="warning"
            title={t("csvjson.v2.warnings", { n: ok.warnings.length })}
            message={
              <ul className="space-y-0.5">
                {ok.warnings.map((w, i) => (
                  <li key={i}>
                    {t("textkit.v2.lineOnly", { line: w.row })} · {w.message}
                  </li>
                ))}
              </ul>
            }
          />
        )}

        {ok && ok.preview.length > 1 && (
          <div className="glass space-y-3 rounded-2xl p-4 sm:p-5">
            <p className={sectionTitle}>{t("csvview.preview")}</p>
            <CsvTable rows={header || !toJson ? ok.preview : [ok.preview[0]!.map((_, i) => `#${i + 1}`), ...ok.preview]} />
            {ok.rows > ok.preview.length - 1 && <p className="text-[12.5px] text-t-tertiary">{t("csvjson.v2.previewLimit", { n: (ok.preview.length - 1).toLocaleString(), total: ok.rows.toLocaleString() })}</p>}
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
