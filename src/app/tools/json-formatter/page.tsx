"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, CornerDownLeft, Loader2, Undo2, Wand2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import { Segmented, Toggle } from "@/components/ui/controls";
import { useI18n } from "@/lib/i18n";
import { useLiveTask, useStoredPref, useStoredText, useTaskRunner } from "@/lib/text-tools/hooks";
import {
  CodeEditor,
  CopyButton,
  ErrorBox,
  OutputPanel,
  SavedNote,
  baseName,
  readTextFile,
  smallButton,
  type CodeEditorHandle,
} from "@/lib/text-tools/ui";
import { processJson, type JsonIndent, type JsonReq, type JsonRes, type JsonView } from "./json-tool";
import { repairChangeCount, repairJson, type RepairReport } from "./repair";
import JsonTree from "./JsonTree";

const SAMPLE = `{
  "name": "ZapFile",
  "version": "2.0.0",
  "orderId": 12345678901234567890,
  "price": 19.90,
  "tags": ["json", "formatter", "free"],
  "settings": { "theme": "dark", "language": "en", "notifications": true },
  "owner": null
}`;

export default function JSONFormatterPage() {
  const { t } = useI18n();
  const [input, setInputRaw, store] = useStoredText("json-formatter");
  const [view, setView] = useStoredPref<JsonView>("json.view", "format", ["format", "minify", "tree"]);
  const [indent, setIndent] = useStoredPref<JsonIndent>("json.indent", "2", ["2", "4", "tab"]);
  const [sortKeys, setSortKeys] = useStoredPref<boolean>("json.sortKeys", false);
  const [fileBase, setFileBase] = useState("data");
  const [repair, setRepair] = useState<{ report: RepairReport; previous: string } | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const editorRef = useRef<CodeEditorHandle>(null);

  const runner = useTaskRunner<JsonReq, JsonRes>(
    () => new Worker(new URL("./json.worker.ts", import.meta.url), { type: "module" }),
    processJson,
  );
  const req = useMemo<JsonReq | null>(
    () => (input.trim() ? { text: input, indent, view, sortKeys } : null),
    [input, indent, view, sortKeys],
  );
  const { result, pending, failure } = useLiveTask(runner, req, input.length);

  const setInput = useCallback(
    (v: string) => {
      setInputRaw(v);
      setRepair(null);
    },
    [setInputRaw],
  );

  const onFile = useCallback(
    async (file: File) => {
      const text = await readTextFile(file, t);
      if (text === null) return;
      setInput(text);
      setFileBase(baseName(file.name) || "data");
      setSelectedPath(null);
    },
    [setInput, t],
  );

  const runRepair = () => {
    const report = repairJson(input);
    if (repairChangeCount(report) === 0) {
      toast(t("json.v2.nothingToRepair"));
      return;
    }
    setInputRaw(report.text);
    setRepair({ report, previous: input });
  };

  const error = result && !result.ok ? result.error : null;
  const ok = result && result.ok ? result : null;
  const output = input.trim() && ok ? ok.output : "";

  const repairParts = repair
    ? [
        repair.report.comments && t("json.v2.fixComments", { count: repair.report.comments }),
        repair.report.trailingCommas && t("json.v2.fixTrailing", { count: repair.report.trailingCommas }),
        repair.report.singleQuotes && t("json.v2.fixQuotes", { count: repair.report.singleQuotes }),
        repair.report.unquotedKeys && t("json.v2.fixKeys", { count: repair.report.unquotedKeys }),
        repair.report.literals && t("json.v2.fixLiterals", { count: repair.report.literals }),
      ].filter(Boolean)
    : [];

  return (
    <ToolLayout toolName={t("tool.json-formatter.name")} toolDescription={t("tool.json-formatter.desc")}>
      <div className="space-y-5">
        <div className="glass flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl p-4">
          <Segmented<JsonView>
            label={t("textkit.v2.view")}
            value={view}
            onChange={setView}
            options={[
              { value: "format", label: t("ui.format") },
              { value: "minify", label: t("ui.minify") },
              { value: "tree", label: t("json.v2.tree") },
            ]}
          />
          <Segmented<JsonIndent>
            label={t("ui.indent")}
            size="sm"
            value={indent}
            onChange={setIndent}
            options={[
              { value: "2", label: t("json.indent2"), disabled: view === "minify" },
              { value: "4", label: t("json.indent4"), disabled: view === "minify" },
              { value: "tab", label: t("json.indentTab"), disabled: view === "minify" },
            ]}
          />
          <Toggle checked={sortKeys} onChange={setSortKeys} label={t("json.v2.sortKeys")} />
          <div className="flex flex-wrap gap-2 sm:ms-auto">
            <button type="button" className={smallButton} onClick={runRepair} disabled={!input.trim()}>
              <Wand2 className="h-4 w-4" aria-hidden="true" />
              {t("json.v2.repair")}
            </button>
            <button
              type="button"
              className={smallButton}
              onClick={() => {
                setInput(SAMPLE);
                setFileBase("sample");
              }}
            >
              {t("json.sample")}
            </button>
          </div>
        </div>

        {repair && (
          <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-4 text-[13.5px]">
            <Wand2 className="h-5 w-5 shrink-0 text-t-secondary" aria-hidden="true" />
            <span className="min-w-0 flex-1 text-t-primary">
              <span className="font-semibold">{t("json.v2.repaired")}</span> {repairParts.join(" · ")}
            </span>
            <button
              type="button"
              className={smallButton}
              onClick={() => {
                setInputRaw(repair.previous);
                setRepair(null);
              }}
            >
              <Undo2 className="h-4 w-4" aria-hidden="true" />
              {t("json.v2.undoRepair")}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="glass rounded-2xl p-4 sm:p-5">
            <CodeEditor
              ref={editorRef}
              label={t("json.inputJson")}
              value={input}
              onChange={setInput}
              placeholder='{"key": "value", "array": [1, 2, 3]}'
              errorLine={error && error.code !== "empty" ? error.line : null}
              onFile={onFile}
              accept={[".json", ".geojson", ".jsonc", ".txt", "application/json"]}
              onClear={() => {
                setInput("");
                setSelectedPath(null);
              }}
              footer={
                <>
                  {input.trim() && (
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      {pending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : ok ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-t-primary" aria-hidden="true" />
                      ) : null}
                      {pending ? t("textkit.v2.checking") : ok ? t("json.validJson") : error ? t("json.invalidJson") : ""}
                    </span>
                  )}
                  <SavedNote tooBig={store.tooBigToStore} />
                </>
              }
            />
          </div>

          <div className="glass rounded-2xl p-4 sm:p-5">
            <OutputPanel
              title={t("json.output")}
              text={output}
              filename={`${fileBase}.${view === "minify" ? "min" : "formatted"}.json`}
              mime="application/json"
              stale={pending}
              placeholder={t("textkit.v2.outputPlaceholder")}
              meta={ok && input.trim() ? <span>{t("json.v2.summary", { keys: ok.keys.toLocaleString(), depth: ok.depth })}</span> : null}
              view={
                view === "tree" && ok?.value !== undefined && input.trim() ? (
                  <JsonTree value={ok.value} selected={selectedPath} onSelect={setSelectedPath} />
                ) : undefined
              }
              actions={
                view !== "tree" && output ? (
                  <button
                    type="button"
                    className={smallButton}
                    onClick={() => {
                      setInput(output);
                      toast.success(t("json.v2.usedAsInput"));
                    }}
                  >
                    <CornerDownLeft className="h-4 w-4" aria-hidden="true" />
                    {t("json.useAsInput")}
                  </button>
                ) : null
              }
            />
            {view === "tree" && selectedPath && ok && (
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2">
                <span className="text-[12.5px] text-t-tertiary">{t("json.v2.path")}</span>
                <code dir="ltr" className="min-w-0 flex-1 truncate font-mono text-[13px] text-t-primary">
                  {selectedPath}
                </code>
                <CopyButton getText={() => selectedPath} />
              </div>
            )}
          </div>
        </div>

        {failure && <ErrorBox title={t("textkit.v2.failed")} message={failure} />}

        {error && (
          <ErrorBox
            title={t("json.invalidJson")}
            message={t(`textkit.v2.json.err.${error.code}`, { token: error.token })}
            line={error.code === "empty" ? undefined : error.line}
            col={error.col}
            source={input}
            onReveal={() => editorRef.current?.reveal(error.line, error.col)}
            action={
              <button type="button" className={smallButton} onClick={runRepair}>
                <Wand2 className="h-4 w-4" aria-hidden="true" />
                {t("json.v2.tryRepair")}
              </button>
            }
          />
        )}

        {ok && ok.lossyNumbers > 0 && (
          <ErrorBox tone="warning" title={t("json.v2.bigNumbersTitle", { count: ok.lossyNumbers })} message={t("json.v2.bigNumbersBody")} />
        )}

        {ok && ok.duplicateCount > 0 && (
          <ErrorBox
            tone="warning"
            title={t("json.v2.duplicatesTitle", { count: ok.duplicateCount })}
            message={
              <>
                <p>{t("json.v2.duplicatesBody")}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ok.duplicates.slice(0, 8).map((d, i) => (
                    <button
                      key={`${d.key}-${d.line}-${i}`}
                      type="button"
                      className={smallButton}
                      onClick={() => editorRef.current?.reveal(d.line)}
                    >
                      <span className="font-mono">&quot;{d.key.length > 24 ? d.key.slice(0, 24) + "…" : d.key}&quot;</span>
                      <span className="text-t-tertiary">{t("textkit.v2.lineOnly", { line: d.line })}</span>
                    </button>
                  ))}
                </div>
              </>
            }
          />
        )}
      </div>
    </ToolLayout>
  );
}
