"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, CornerDownLeft, Loader2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import { Segmented, Toggle } from "@/components/ui/controls";
import { formatFileSize } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useLiveTask, useStoredPref, useStoredText, useTaskRunner } from "@/lib/text-tools/hooks";
import { CodeEditor, ErrorBox, OutputPanel, SavedNote, baseName, readTextFile, smallButton } from "@/lib/text-tools/ui";
import type { CssMode, CssReq, CssRes } from "./css-core";

const SAMPLE = `/* Buttons */
.btn, .btn:hover {
  padding: 0px 16px;
  color: #ffffff;
  background-color: #16181d;
  width: calc(100% - 2rem);
}

.btn::after { content: "→ : next"; margin-left: 0.50em; }

@media (max-width: 600px) {
  .btn { padding: 0px 12px; color: #ffffff; }
}
`;

/** Gzip size, as a server would send it. */
async function gzipSize(text: string): Promise<number | null> {
  if (typeof CompressionStream === "undefined" || !text) return null;
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"));
  return (await new Response(stream).arrayBuffer()).byteLength;
}

export default function CssMinifierPage() {
  const { t } = useI18n();
  const [input, setInput, store] = useStoredText("css-minifier");
  const [mode, setMode] = useStoredPref<CssMode>("css.mode", "minify", ["minify", "beautify"]);
  const [restructure, setRestructure] = useStoredPref<boolean>("css.restructure", true);
  const [keepComments, setKeepComments] = useStoredPref<boolean>("css.comments", false);
  const [indent, setIndent] = useStoredPref<"2" | "4" | "tab">("css.indent", "2", ["2", "4", "tab"]);
  const [fileBase, setFileBase] = useState("styles");
  const [gz, setGz] = useState<{ before: number | null; after: number | null }>({ before: null, after: null });

  const runner = useTaskRunner<CssReq, CssRes>(() => new Worker(new URL("./css.worker.ts", import.meta.url), { type: "module" }), async (req) => (await import("./css-core")).processCss(req));
  const req = useMemo<CssReq | null>(() => (input.trim() ? { text: input, mode, restructure, keepComments, indent } : null), [input, mode, restructure, keepComments, indent]);
  const { result, pending, failure } = useLiveTask(runner, req, input.length);

  const ok = result && result.ok ? result : null;
  const output = input.trim() && ok ? ok.output : "";
  const inBytes = useMemo(() => new Blob([input]).size, [input]);
  const outBytes = useMemo(() => new Blob([output]).size, [output]);

  useEffect(() => {
    let live = true;
    Promise.all([gzipSize(input), gzipSize(output)]).then(([before, after]) => live && setGz({ before, after }));
    return () => {
      live = false;
    };
  }, [input, output]);

  const onFile = useCallback(
    async (file: File) => {
      const text = await readTextFile(file, t);
      if (text === null) return;
      setInput(text);
      setFileBase(baseName(file.name).replace(/\.min$/, "") || "styles");
    },
    [setInput, t],
  );

  const saved = inBytes > 0 && outBytes > 0 ? Math.round(((inBytes - outBytes) / inBytes) * 100) : 0;

  return (
    <ToolLayout toolName={t("tool.css-minifier.name")} toolDescription={t("tool.css-minifier.desc")}>
      <div className="space-y-5">
        <div className="glass flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl p-4">
          <Segmented<CssMode>
            label={t("textkit.v2.view")}
            value={mode}
            onChange={setMode}
            options={[
              { value: "minify", label: t("css.minify") },
              { value: "beautify", label: t("css.beautify") },
            ]}
          />
          {mode === "minify" ? (
            <Toggle checked={restructure} onChange={setRestructure} label={t("css.v2.restructure")} />
          ) : (
            <Segmented<"2" | "4" | "tab">
              label={t("ui.indent")}
              size="sm"
              value={indent}
              onChange={setIndent}
              options={[
                { value: "2", label: t("json.indent2") },
                { value: "4", label: t("json.indent4") },
                { value: "tab", label: t("json.indentTab") },
              ]}
            />
          )}
          <Toggle checked={keepComments} onChange={setKeepComments} label={mode === "minify" ? t("css.v2.keepLicense") : t("xml.v2.keepComments")} />
          <button
            type="button"
            className={`${smallButton} sm:ms-auto`}
            onClick={() => {
              setInput(SAMPLE);
              setFileBase("sample");
            }}
          >
            {t("json.sample")}
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="glass rounded-2xl p-4 sm:p-5">
            <CodeEditor
              label={t("css.input")}
              value={input}
              onChange={setInput}
              placeholder={t("css.ui.pasteHere")}
              errorLine={result && !result.ok ? (result.line ?? null) : null}
              onFile={onFile}
              accept={[".css", ".scss", ".less", ".txt", "text/css"]}
              onClear={() => setInput("")}
              footer={
                <>
                  {input.trim() && (
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : ok ? <CheckCircle2 className="h-3.5 w-3.5 text-t-primary" aria-hidden="true" /> : null}
                      {pending ? t("textkit.v2.checking") : formatFileSize(inBytes)}
                    </span>
                  )}
                  <SavedNote tooBig={store.tooBigToStore} />
                </>
              }
            />
          </div>
          <div className="glass rounded-2xl p-4 sm:p-5">
            <OutputPanel
              title={t("css.output")}
              text={output}
              filename={`${fileBase}${mode === "minify" ? ".min" : ""}.css`}
              mime="text/css"
              stale={pending}
              placeholder={t("css.ui.outputPlaceholder")}
              meta={
                ok && input.trim() ? (
                  <span className="tabular-nums">
                    {mode === "minify" && saved > 0 ? t("css.v2.saved", { pct: saved, size: formatFileSize(inBytes - outBytes) }) : null}
                    {gz.after !== null ? ` · gzip ${formatFileSize(gz.after)}` : ""}
                    {gz.before !== null && gz.after !== null && mode === "minify" ? ` (${formatFileSize(gz.before)} → ${formatFileSize(gz.after)})` : ""}
                  </span>
                ) : null
              }
              actions={
                output ? (
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
          </div>
        </div>

        {failure && <ErrorBox title={t("textkit.v2.failed")} message={failure} />}
        {result && !result.ok && <ErrorBox title={t("css.v2.parseError")} message={result.message} line={result.line} col={result.col} source={input} />}
        {ok?.nestingFallback && <ErrorBox tone="warning" title={t("css.v2.nestingTitle")} message={t("css.v2.nestingBody")} />}
        <p className="text-[12.5px] text-t-tertiary">{mode === "minify" ? t("css.v2.minifyNote") : t("css.v2.beautifyNote")}</p>
      </div>
    </ToolLayout>
  );
}
