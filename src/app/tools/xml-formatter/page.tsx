"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, CornerDownLeft, Loader2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import { Segmented, Toggle } from "@/components/ui/controls";
import { useI18n } from "@/lib/i18n";
import { useLiveTask, useStoredPref, useStoredText, useTaskRunner } from "@/lib/text-tools/hooks";
import { CodeEditor, ErrorBox, OutputPanel, SavedNote, baseName, readTextFile, smallButton, type CodeEditorHandle } from "@/lib/text-tools/ui";
import { processXml, type XmlIndent, type XmlMode, type XmlReq, type XmlRes } from "./xml-core";

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<catalog><!-- Books --><book id="bk101" lang="en"><author>Gambardella, Matthew</author><title>XML Developer's Guide</title><price currency="USD">44.95</price><description>An in-depth look at creating applications with <b>XML</b> &amp; friends.</description></book><book id="bk102"><author>Ralls, Kim</author><title>Midnight Rain</title><price currency="EUR">5.95</price><code><![CDATA[if (a < b && c) return;]]></code></book></catalog>`;

export default function XMLFormatterPage() {
  const { t } = useI18n();
  const [input, setInput, store] = useStoredText("xml-formatter");
  const [mode, setMode] = useStoredPref<XmlMode>("xml.mode", "format", ["format", "minify"]);
  const [indent, setIndent] = useStoredPref<XmlIndent>("xml.indent", "2", ["2", "4", "tab"]);
  const [keepComments, setKeepComments] = useStoredPref<boolean>("xml.comments", true);
  const [fileBase, setFileBase] = useState("data");
  const editorRef = useRef<CodeEditorHandle>(null);

  const runner = useTaskRunner<XmlReq, XmlRes>(() => new Worker(new URL("./xml.worker.ts", import.meta.url), { type: "module" }), processXml);
  const req = useMemo<XmlReq | null>(() => (input.trim() ? { text: input, mode, indent, keepComments } : null), [input, mode, indent, keepComments]);
  const { result, pending, failure } = useLiveTask(runner, req, input.length);

  const onFile = useCallback(
    async (file: File) => {
      const text = await readTextFile(file, t);
      if (text === null) return;
      setInput(text);
      setFileBase(baseName(file.name) || "data");
    },
    [setInput, t],
  );

  const ok = result && result.ok ? result : null;
  const error = result && !result.ok ? result.error : null;
  const output = input.trim() && ok ? ok.output : "";

  return (
    <ToolLayout toolName={t("tool.xml-formatter.name")} toolDescription={t("tool.xml-formatter.desc")}>
      <div className="space-y-5">
        <div className="glass flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl p-4">
          <Segmented<XmlMode>
            label={t("textkit.v2.view")}
            value={mode}
            onChange={setMode}
            options={[
              { value: "format", label: t("ui.format") },
              { value: "minify", label: t("ui.minify") },
            ]}
          />
          <Segmented<XmlIndent>
            label={t("ui.indent")}
            size="sm"
            value={indent}
            onChange={setIndent}
            options={[
              { value: "2", label: t("json.indent2"), disabled: mode === "minify" },
              { value: "4", label: t("json.indent4"), disabled: mode === "minify" },
              { value: "tab", label: t("json.indentTab"), disabled: mode === "minify" },
            ]}
          />
          <Toggle checked={keepComments} onChange={setKeepComments} label={t("xml.v2.keepComments")} />
          <div className="flex flex-wrap gap-2 sm:ms-auto">
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

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="glass rounded-2xl p-4 sm:p-5">
            <CodeEditor
              ref={editorRef}
              label={t("xml.xmlInput")}
              value={input}
              onChange={setInput}
              placeholder="<root><item id=&quot;1&quot;>…</item></root>"
              errorLine={error ? error.line : null}
              onFile={onFile}
              accept={[".xml", ".svg", ".xsl", ".xslt", ".rss", ".atom", ".plist", ".xaml", ".config", ".csproj", ".txt"]}
              onClear={() => setInput("")}
              footer={
                <>
                  {input.trim() && (
                    <span className="inline-flex items-center gap-1.5 font-medium">
                      {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : ok ? <CheckCircle2 className="h-3.5 w-3.5 text-t-primary" aria-hidden="true" /> : null}
                      {pending ? t("textkit.v2.checking") : ok ? t("xml.validXml") : error ? t("xml.invalidXml") : ""}
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
              filename={`${fileBase}${mode === "minify" ? ".min" : ""}.xml`}
              mime="application/xml"
              stale={pending}
              placeholder={t("textkit.v2.outputPlaceholder")}
              meta={ok && input.trim() ? <span>{t("xml.v2.summary", { elements: ok.elements.toLocaleString(), attributes: ok.attributes.toLocaleString(), depth: ok.depth })}</span> : null}
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
        {error && (
          <ErrorBox
            title={t("xml.invalidXml")}
            message={t(`xml.v2.err.${error.code}`, { name: error.name ?? "", expected: error.expected ?? "" })}
            line={error.line}
            col={error.col}
            source={input}
            onReveal={() => editorRef.current?.reveal(error.line, error.col)}
          />
        )}
        <p className="text-[12.5px] text-t-tertiary">{t("xml.v2.lossless")}</p>
      </div>
    </ToolLayout>
  );
}
