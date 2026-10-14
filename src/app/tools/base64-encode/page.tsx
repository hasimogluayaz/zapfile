"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Download, FileText, Type, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { Segmented, Toggle, buttonPrimary, sectionTitle } from "@/components/ui/controls";
import { downloadBlob, formatFileSize } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useStoredPref, useStoredText } from "@/lib/text-tools/hooks";
import { ErrorBox, OutputPanel, baseName, smallButton } from "@/lib/text-tools/ui";
import { EXT, decodeBase64, sniff, textToBase64, type EncodeOptions } from "./b64-core";

type Mode = "encode" | "decode";
type Source = "text" | "file";

const MAX_FILE = 100 * 1024 * 1024;

/** File → Base64 with the browser's native encoder (fast, doesn't block typing). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result);
      resolve(s.slice(s.indexOf(",") + 1));
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

function shape(b64: string, o: EncodeOptions): string {
  let out = b64;
  if (o.urlSafe) out = out.replace(/\+/g, "-").replace(/\//g, "_");
  if (!o.padding) out = out.replace(/=+$/, "");
  if (o.wrap) out = out.replace(/(.{76})(?=.)/g, "$1\n");
  return out;
}

export default function Base64Page() {
  const { t } = useI18n();
  const [mode, setMode] = useStoredPref<Mode>("b64.mode", "encode", ["encode", "decode"]);
  const [source, setSource] = useState<Source>("text");
  const [text, setText] = useStoredText("base64");
  const [urlSafe, setUrlSafe] = useStoredPref<boolean>("b64.urlSafe", false);
  const [padding, setPadding] = useStoredPref<boolean>("b64.padding", true);
  const [wrap, setWrap] = useStoredPref<boolean>("b64.wrap", false);
  const [dataUri, setDataUri] = useStoredPref<boolean>("b64.dataUri", false);
  const [file, setFile] = useState<{ file: File; b64: string; mime: string } | null>(null);
  const [fileError, setFileError] = useState(false);

  const opts: EncodeOptions = { urlSafe, padding, wrap };

  const pickFile = async (f: File) => {
    setFileError(false);
    if (f.size > MAX_FILE) {
      setFileError(true);
      return;
    }
    try {
      const b64 = await fileToBase64(f);
      const head = new Uint8Array(await f.slice(0, 512).arrayBuffer());
      setFile({ file: f, b64, mime: f.type || sniff(head) || "application/octet-stream" });
    } catch {
      setFileError(true);
    }
  };

  const encoded = useMemo(() => {
    if (mode !== "encode") return "";
    if (source === "file") {
      if (!file) return "";
      const body = shape(file.b64, opts);
      return dataUri ? `data:${file.mime};base64,${body.replace(/\n/g, "")}` : body;
    }
    return text ? textToBase64(text, opts) : "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, source, file, text, urlSafe, padding, wrap, dataUri]);

  const decoded = useMemo(() => (mode === "decode" && text.trim() ? decodeBase64(text) : null), [mode, text]);

  // Preview decoded images.
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!decoded?.ok || !decoded.mime?.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(new Blob([decoded.bytes as Uint8Array<ArrayBuffer>], { type: decoded.mime }));
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [decoded]);

  const swap = () => {
    if (mode === "encode" && encoded && source === "text") {
      setText(encoded);
      setMode("decode");
    } else if (mode === "decode" && decoded?.ok && decoded.text !== null) {
      setText(decoded.text);
      setMode("encode");
      setSource("text");
    }
  };

  const outName = file ? `${baseName(file.file.name)}.b64.txt` : "base64.txt";

  return (
    <ToolLayout toolName={t("tool.base64-encode.name")} toolDescription={t("tool.base64-encode.desc")}>
      <div className="space-y-5">
        <div className="glass flex flex-wrap items-center gap-x-5 gap-y-3 p-4">
          <Segmented<Mode>
            label={t("b64.v2.direction")}
            value={mode}
            onChange={setMode}
            options={[
              { value: "encode", label: t("b64.v2.encode") },
              { value: "decode", label: t("b64.v2.decode") },
            ]}
          />
          {mode === "encode" && (
            <Segmented<Source>
              label={t("b64.v2.source")}
              size="sm"
              value={source}
              onChange={setSource}
              options={[
                { value: "text", label: t("b64.textInput"), icon: <Type className="h-4 w-4" aria-hidden="true" /> },
                { value: "file", label: t("b64.fileInput"), icon: <FileText className="h-4 w-4" aria-hidden="true" /> },
              ]}
            />
          )}
          {(mode === "decode" || source === "text") && (
            <button type="button" className={`${smallButton} sm:ms-auto`} onClick={swap} disabled={mode === "encode" ? !encoded : !(decoded?.ok && decoded.text !== null)}>
              <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
              {t("b64.v2.swap")}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Input */}
          <div className="glass space-y-3 p-4 sm:p-5">
            {mode === "encode" && source === "file" ? (
              file ? (
                <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <FileText className="h-5 w-5 shrink-0 text-t-tertiary" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-t-primary">{file.file.name}</p>
                    <p className="text-[12.5px] text-t-tertiary">
                      {formatFileSize(file.file.size)} · {file.mime}
                    </p>
                  </div>
                  <button type="button" onClick={() => setFile(null)} aria-label={t("ui.remove")} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-t-tertiary hover:bg-bg-secondary hover:text-t-primary">
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <FileDropzone onFilesSelected={(fs) => fs[0] && pickFile(fs[0])} multiple={false} label={t("b64.dropFile")} />
              )
            ) : (
              <label className="block">
                <span className="mb-2 block text-[13px] font-medium text-t-secondary">{mode === "encode" ? t("b64.v2.plainText") : t("b64.v2.base64Input")}</span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={mode === "encode" ? t("b64.textToEncode") : t("b64.base64ToDecode")}
                  spellCheck={false}
                  dir="ltr"
                  className="block h-[320px] w-full resize-y rounded-xl border border-border bg-bg-secondary px-3 py-3 font-mono text-[13px] leading-5 text-t-primary placeholder:text-t-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                />
              </label>
            )}
            {fileError && <p className="text-[13px] text-red-700 dark:text-red-400">{t("b64.v2.fileTooBig", { size: formatFileSize(MAX_FILE) })}</p>}
            {mode === "encode" && (
              <div className="space-y-3 border-t border-border pt-3">
                <p className={sectionTitle}>{t("ui.settings")}</p>
                <Toggle checked={urlSafe} onChange={setUrlSafe} label={t("b64.v2.urlSafe")} description={t("b64.v2.urlSafeHint")} />
                <Toggle checked={padding} onChange={setPadding} label={t("b64.v2.padding")} />
                <Toggle checked={wrap} onChange={setWrap} label={t("b64.v2.wrap")} description={t("b64.v2.wrapHint")} />
                {source === "file" && <Toggle checked={dataUri} onChange={setDataUri} label={t("b64.v2.dataUri")} description={t("b64.v2.dataUriHint")} />}
              </div>
            )}
            {mode === "decode" && <p className="text-[12.5px] text-t-tertiary">{t("b64.v2.decodeHint")}</p>}
          </div>

          {/* Output */}
          <div className="glass p-4 sm:p-5">
            {mode === "encode" ? (
              <OutputPanel
                title={t("b64.base64Output")}
                text={encoded}
                filename={outName}
                mime="text/plain"
                placeholder={t("textkit.v2.outputPlaceholder")}
                meta={encoded ? <span className="tabular-nums">{t("b64.v2.chars", { n: encoded.length.toLocaleString() })}</span> : null}
              />
            ) : decoded?.ok ? (
              decoded.text !== null ? (
                <OutputPanel title={t("b64.decodedText")} text={decoded.text} filename="decoded.txt" mime="text/plain" meta={decoded.urlSafe ? <span>Base64URL</span> : null} />
              ) : (
                <div className="space-y-4">
                  <p className="text-[13px] font-medium text-t-secondary">{t("b64.v2.binary")}</p>
                  {preview && (
                    <div className="flex justify-center rounded-xl border border-border bg-bg-secondary p-3" style={{ background: "repeating-conic-gradient(#e5e5e5 0% 25%, #fff 0% 50%) 50% / 16px 16px" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview} alt="" className="max-h-64 max-w-full object-contain" />
                    </div>
                  )}
                  <p className="text-[14px] text-t-primary">
                    {decoded.mime ?? t("b64.v2.unknownType")} · {formatFileSize(decoded.bytes.length)}
                  </p>
                  <button
                    type="button"
                    className={buttonPrimary}
                    onClick={() => downloadBlob(new Blob([decoded.bytes as Uint8Array<ArrayBuffer>], { type: decoded.mime ?? "application/octet-stream" }), `decoded.${(decoded.mime && EXT[decoded.mime]) || "bin"}`)}
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {t("b64.v2.downloadFile")}
                  </button>
                </div>
              )
            ) : decoded && !decoded.ok ? (
              <ErrorBox
                title={t("b64.invalidBase64")}
                message={decoded.reason === "badChar" ? t("b64.v2.badChar", { char: JSON.stringify(decoded.char), pos: decoded.index + 1 }) : t("b64.v2.badLength")}
              />
            ) : (
              <OutputPanel title={t("b64.decodedText")} text="" filename="decoded.txt" mime="text/plain" placeholder={t("textkit.v2.outputPlaceholder")} />
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
