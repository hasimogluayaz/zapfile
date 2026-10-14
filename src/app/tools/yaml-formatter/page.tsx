"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ArrowLeftRight, CheckCircle2, Loader2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import { Segmented } from "@/components/ui/controls";
import { useI18n } from "@/lib/i18n";
import { useLiveTask, useStoredPref, useStoredText, useTaskRunner } from "@/lib/text-tools/hooks";
import { CodeEditor, ErrorBox, OutputPanel, SavedNote, baseName, readTextFile, smallButton, type CodeEditorHandle } from "@/lib/text-tools/ui";
import type { YamlIndent, YamlMode, YamlReq, YamlRes } from "./yaml-tool";

const SAMPLE_YAML = `# Deployment settings
app:
  name: zapfile
  version: "2.0"
  replicas: 3
  ports: [80, 443]
  env:
    - name: NODE_ENV
      value: production
    - name: REGION
      value: eu-west-1
  features: {darkMode: true, beta: no}
`;

const SAMPLE_JSON = `{"app":{"name":"zapfile","version":"2.0","replicas":3,"ports":[80,443],"enabled":true,"mode":"on","zip":"0755"}}`;

export default function YAMLFormatterPage() {
  const { t } = useI18n();
  const [input, setInput, store] = useStoredText("yaml-formatter");
  const [mode, setMode] = useStoredPref<YamlMode>("yaml.mode", "format", ["format", "yaml2json", "json2yaml"]);
  const [indent, setIndent] = useStoredPref<YamlIndent>("yaml.indent", "2", ["2", "4"]);
  const [fileBase, setFileBase] = useState("data");
  const editorRef = useRef<CodeEditorHandle>(null);

  const runner = useTaskRunner<YamlReq, YamlRes>(
    () => new Worker(new URL("./yaml.worker.ts", import.meta.url), { type: "module" }),
    async (req) => (await import("./yaml-tool")).processYaml(req),
  );
  const req = useMemo<YamlReq | null>(() => (input.trim() ? { text: input, mode, indent } : null), [input, mode, indent]);
  const { result, pending, failure } = useLiveTask(runner, req, input.length);

  const onFile = useCallback(
    async (file: File) => {
      const text = await readTextFile(file, t);
      if (text === null) return;
      setInput(text);
      setFileBase(baseName(file.name) || "data");
      // Opening a .json file most likely means "convert this to YAML".
      if (/\.json$/i.test(file.name)) setMode("json2yaml");
      else if (mode === "json2yaml") setMode("format");
    },
    [setInput, setMode, mode, t],
  );

  const ok = result && result.ok ? result : null;
  const error = result && !result.ok ? result.error : null;
  const output = input.trim() && ok ? ok.output : "";
  const jsonIn = mode === "json2yaml";
  const jsonOut = mode === "yaml2json";

  // Swap: take the output as the new input and flip the direction.
  const swap = () => {
    if (!output) return;
    setInput(output);
    setMode(mode === "yaml2json" ? "json2yaml" : mode === "json2yaml" ? "yaml2json" : "format");
    toast.success(t("yaml.v2.swapped"));
  };

  return (
    <ToolLayout toolName={t("tool.yaml-formatter.name")} toolDescription={t("tool.yaml-formatter.desc")}>
      <div className="space-y-5">
        <div className="glass flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl p-4">
          <Segmented<YamlMode>
            label={t("yaml.mode")}
            value={mode}
            onChange={setMode}
            options={[
              { value: "format", label: t("ui.format") },
              { value: "yaml2json", label: "YAML → JSON" },
              { value: "json2yaml", label: "JSON → YAML" },
            ]}
          />
          <Segmented<YamlIndent>
            label={t("ui.indent")}
            size="sm"
            value={indent}
            onChange={setIndent}
            options={[
              { value: "2", label: t("json.indent2") },
              { value: "4", label: t("json.indent4") },
            ]}
          />
          <div className="flex flex-wrap gap-2 sm:ms-auto">
            <button
              type="button"
              className={smallButton}
              onClick={() => {
                setInput(jsonIn ? SAMPLE_JSON : SAMPLE_YAML);
                setFileBase("sample");
              }}
            >
              {t("json.sample")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="glass rounded-2xl p-4 sm:p-5">
            <CodeEditor
              ref={editorRef}
              label={jsonIn ? t("yaml.jsonInput") : t("yaml.yamlInput")}
              value={input}
              onChange={setInput}
              placeholder={jsonIn ? '{"key": "value"}' : "key: value\nlist:\n  - one\n  - two"}
              errorLine={error?.kind === "json" ? error.line : error?.line ?? null}
              onFile={onFile}
              accept={[".yaml", ".yml", ".json", ".txt"]}
              onClear={() => setInput("")}
              footer={
                <>
                  {input.trim() && (
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : ok ? <CheckCircle2 className="h-3.5 w-3.5 text-t-primary" aria-hidden="true" /> : null}
                      {pending ? t("textkit.v2.checking") : ok ? (jsonIn ? t("json.validJson") : t("yaml.v2.valid")) : error ? (jsonIn ? t("yaml.invalidJson") : t("yaml.invalidYaml")) : ""}
                    </span>
                  )}
                  <SavedNote tooBig={store.tooBigToStore} />
                </>
              }
            />
          </div>

          <div className="glass rounded-2xl p-4 sm:p-5">
            <OutputPanel
              title={t("ui.output")}
              text={output}
              filename={`${fileBase}.${jsonOut ? "json" : "yaml"}`}
              mime={jsonOut ? "application/json" : "application/yaml"}
              stale={pending}
              placeholder={t("textkit.v2.outputPlaceholder")}
              meta={ok && ok.docs > 1 ? <span>{t("yaml.v2.docs", { n: ok.docs })}</span> : null}
              actions={
                output ? (
                  <button type="button" className={smallButton} onClick={swap}>
                    <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                    {t("yaml.v2.swap")}
                  </button>
                ) : null
              }
            />
          </div>
        </div>

        {failure && <ErrorBox title={t("textkit.v2.failed")} message={failure} />}

        {error &&
          (error.kind === "json" ? (
            <ErrorBox
              title={t("yaml.invalidJson")}
              message={t(`textkit.v2.json.err.${error.code}`, { token: error.token })}
              line={error.code === "empty" ? undefined : error.line}
              col={error.col}
              source={input}
              onReveal={() => editorRef.current?.reveal(error.line, error.col)}
            />
          ) : (
            <ErrorBox
              title={t("yaml.invalidYaml")}
              message={error.message}
              line={error.line}
              col={error.col}
              source={input}
              onReveal={error.line ? () => editorRef.current?.reveal(error.line!, error.col) : undefined}
            />
          ))}

        {ok && ok.warnings.length > 0 && (
          <ErrorBox
            tone="warning"
            title={t("yaml.v2.warnings", { n: ok.warnings.length })}
            message={
              <ul className="space-y-1">
                {ok.warnings.slice(0, 6).map((w, i) => (
                  <li key={i}>
                    {w.line ? <span className="text-t-tertiary">{t("textkit.v2.lineOnly", { line: w.line })} · </span> : null}
                    {w.message}
                  </li>
                ))}
              </ul>
            }
          />
        )}

        {jsonIn && ok && <p className="text-[12.5px] text-t-tertiary">{t("yaml.v2.quotedNote")}</p>}
      </div>
    </ToolLayout>
  );
}
