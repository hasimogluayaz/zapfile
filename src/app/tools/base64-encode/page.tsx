"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { useI18n } from "@/lib/i18n";

type Mode = "encode" | "decode";
type InputType = "text" | "file";

export default function Base64Page() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("encode");
  const [inputType, setInputType] = useState<InputType>("text");
  const [textInput, setTextInput] = useState("");
  const [output, setOutput] = useState("");
  const [fileName, setFileName] = useState("");

  const handleEncode = (text: string) => {
    setTextInput(text);
    if (!text) {
      setOutput("");
      return;
    }
    try {
      if (mode === "encode") {
        setOutput(btoa(unescape(encodeURIComponent(text))));
      } else {
        setOutput(decodeURIComponent(escape(atob(text))));
      }
    } catch {
      setOutput(mode === "decode" ? t("b64.invalidBase64") : "");
    }
  };

  const handleFileSelected = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data:...;base64, prefix
      const base64 = result.split(",")[1] || result;
      setOutput(base64);
      toast.success(t("b64.ui.fileEncoded", { kb: (base64.length / 1024).toFixed(1) }));
    };
    reader.readAsDataURL(file);
  };

  const copyToClipboard = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      toast.success(t("ui.copied"));
    } catch {
      toast.error(t("ui.copyFailed"));
    }
  };

  const clearAll = () => {
    setTextInput("");
    setOutput("");
    setFileName("");
  };

  return (
    <ToolLayout
      toolName="Base64 Encoder/Decoder"
      toolDescription="Encode text or files to Base64 and decode Base64 strings back to text."
    >
      <div className="space-y-6">
        {/* Mode toggle */}
        <div className="glass rounded-xl p-4">
          <div className="grid grid-cols-2 gap-2">
            {(["encode", "decode"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setOutput("");
                  setTextInput("");
                }}
                className={`py-3 rounded-xl text-sm font-semibold transition-all capitalize ${
                  mode === m
                    ? "bg-accent text-on-accent shadow-sm"
                    : "bg-bg-secondary text-t-secondary hover:bg-bg-tertiary hover:text-t-primary"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Encode: input type */}
        {mode === "encode" && (
          <div className="glass rounded-xl p-4">
            <div className="grid grid-cols-2 gap-2">
              {(["text", "file"] as InputType[]).map((inp) => (
                <button
                  key={inp}
                  onClick={() => {
                    setInputType(inp);
                    clearAll();
                  }}
                  className={`py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                    inputType === inp
                      ? "bg-bg-tertiary text-t-primary"
                      : "text-t-secondary hover:text-t-primary"
                  }`}
                >
                  {inp === "text" ? t("b64.textInput") : t("b64.fileInput")}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        {mode === "encode" && inputType === "file" ? (
          <div className="space-y-4">
            <FileDropzone
              onFilesSelected={handleFileSelected}
              formats={[t("b64.ui.anyFile")]}
              label={t("b64.dropFile")}
            />
            {fileName && (
              <p className="text-sm text-t-secondary text-center">
                Encoded: {fileName}
              </p>
            )}
          </div>
        ) : (
          <div className="glass rounded-xl p-6">
            <label className="block text-sm text-t-secondary mb-2">
              {mode === "encode" ? t("b64.textToEncode") : t("b64.base64ToDecode")}
            </label>
            <textarea
              value={textInput}
              onChange={(e) => handleEncode(e.target.value)}
              placeholder={mode === "encode" ? t("b64.textToEncode") : t("b64.base64ToDecode")}
              rows={5}
              className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border text-t-primary placeholder:text-t-tertiary/50 focus:outline-none focus:border-accent/50 font-mono text-sm resize-none"
            />
          </div>
        )}

        {/* Output */}
        {output && (
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-t-secondary">
                {mode === "encode" ? t("b64.base64Output") : t("b64.decodedText")}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-1.5 text-xs rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
                >
                  {t("ui.copy")}
                </button>
                <button
                  onClick={clearAll}
                  className="px-3 py-1.5 text-xs rounded-lg bg-bg-secondary text-t-secondary hover:bg-bg-tertiary hover:text-t-primary transition-colors"
                >
                  {t("ui.clear")}
                </button>
              </div>
            </div>
            <textarea
              value={output}
              readOnly
              rows={5}
              className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border text-t-primary font-mono text-sm resize-none"
            />
            <p className="text-xs text-t-secondary mt-2">
              {output.length.toLocaleString()} characters
            </p>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
