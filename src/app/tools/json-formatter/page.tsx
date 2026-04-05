"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

type IndentType = "2" | "4" | "tab";

export default function JSONFormatterPage() {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [indent, setIndent] = useState<IndentType>("2");

  const getIndent = (): string | number => {
    switch (indent) {
      case "2":
        return 2;
      case "4":
        return 4;
      case "tab":
        return "\t";
    }
  };

  const handleFormat = () => {
    if (!input.trim()) {
      setError(t("json.enterJson"));
      setOutput("");
      return;
    }
    try {
      const parsed = JSON.parse(input);
      const formatted = JSON.stringify(parsed, null, getIndent());
      setOutput(formatted);
      setError("");
      toast.success(t("json.formatSuccess"));
    } catch (e) {
      const message =
        e instanceof SyntaxError ? e.message : t("json.invalidJson");
      setError(message);
      setOutput("");
      toast.error(t("json.invalidJson"));
    }
  };

  const handleMinify = () => {
    if (!input.trim()) {
      setError(t("json.enterJson"));
      setOutput("");
      return;
    }
    try {
      const parsed = JSON.parse(input);
      const minified = JSON.stringify(parsed);
      setOutput(minified);
      setError("");
      toast.success(t("json.minifySuccess"));
    } catch (e) {
      const message =
        e instanceof SyntaxError ? e.message : t("json.invalidJson");
      setError(message);
      setOutput("");
      toast.error(t("json.invalidJson"));
    }
  };

  const handleValidate = () => {
    if (!input.trim()) {
      setError(t("json.enterJson"));
      setOutput("");
      return;
    }
    try {
      JSON.parse(input);
      setError("");
      setOutput("");
      toast.success(t("json.validJson"));
    } catch (e) {
      const message =
        e instanceof SyntaxError ? e.message : t("json.invalidJson");
      setError(message);
      setOutput("");
      toast.error(t("json.invalidJson"));
    }
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
    setInput("");
    setOutput("");
    setError("");
  };

  const loadSample = () => {
    const sample = JSON.stringify(
      {
        name: "ZapFile",
        version: "1.0.0",
        description: "Free online file tools",
        features: ["JSON Formatter", "Base64 Encoder", "QR Generator"],
        settings: { theme: "dark", language: "en", notifications: true },
      },
      null,
      2
    );
    setInput(sample);
    setOutput("");
    setError("");
  };

  return (
    <ToolLayout
      toolName="JSON Formatter & Validator"
      toolDescription="Format, minify, and validate JSON data instantly. All processing happens in your browser."
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="glass rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Indentation options */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-brand-muted">{t("ui.indent")}</span>
              <div className="flex gap-1.5">
                {(
                  [
                    { value: "2", label: "2 Spaces" },
                    { value: "4", label: "4 Spaces" },
                    { value: "tab", label: "Tabs" },
                  ] as { value: IndentType; label: string }[]
                ).map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setIndent(option.value)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                      indent === option.value
                        ? "bg-brand-indigo text-white shadow-lg shadow-brand-indigo/25"
                        : "bg-white/[0.04] text-brand-muted hover:bg-white/[0.08] hover:text-brand-text"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={loadSample}
                className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] text-brand-muted hover:bg-white/[0.08] hover:text-brand-text transition-all font-medium"
              >
                {t("json.sample")}
              </button>
              <button
                onClick={clearAll}
                className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] text-brand-muted hover:bg-white/[0.08] hover:text-brand-text transition-all font-medium"
              >
                {t("ui.clear")}
              </button>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="glass rounded-2xl p-6">
          <label className="block text-sm text-brand-muted mb-2">
            {t("json.inputJson")}
          </label>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError("");
            }}
            placeholder='{"key": "value", "array": [1, 2, 3]}'
            rows={10}
            spellCheck={false}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-indigo/40 font-mono text-sm resize-y"
          />
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={handleFormat}
            className="py-3 rounded-xl text-sm font-semibold transition-all bg-gradient-brand text-white shadow-lg shadow-brand-indigo/25 hover:shadow-brand-indigo/40"
          >
            {t("ui.format")}
          </button>
          <button
            onClick={handleMinify}
            className="py-3 rounded-xl text-sm font-semibold transition-all bg-gradient-brand text-white shadow-lg shadow-brand-indigo/25 hover:shadow-brand-indigo/40"
          >
            {t("ui.minify")}
          </button>
          <button
            onClick={handleValidate}
            className="py-3 rounded-xl text-sm font-semibold transition-all bg-white/[0.04] text-brand-muted hover:bg-white/[0.08] hover:text-brand-text border border-white/[0.08]"
          >
            {t("ui.validate")}
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="glass rounded-2xl p-4 border border-red-500/20 bg-red-500/5">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-400 mt-0.5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-400">
                  {t("json.invalidJson")}
                </p>
                <p className="text-xs text-red-400/70 mt-1 font-mono">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Output */}
        {output && (
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-brand-muted">Output</label>
              <div className="flex gap-2">
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-1.5 text-xs rounded-lg bg-brand-indigo/20 text-brand-indigo hover:bg-brand-indigo/30 transition-colors font-medium"
                >
                  {t("ui.copy")}
                </button>
                <button
                  onClick={() => {
                    setInput(output);
                    setOutput("");
                    setError("");
                  }}
                  className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.04] text-brand-muted hover:bg-white/[0.08] hover:text-brand-text transition-colors font-medium"
                >
                  {t("json.useAsInput")}
                </button>
              </div>
            </div>
            <textarea
              value={output}
              readOnly
              rows={10}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-brand-text font-mono text-sm resize-y"
            />
            <p className="text-xs text-brand-muted mt-2">
              {output.length.toLocaleString()} characters
            </p>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
