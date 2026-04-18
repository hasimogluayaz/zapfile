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
      toast.success(t("ui.copied"), { duration: 4000 });
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

  const indentOptions: { value: IndentType; labelKey: string }[] = [
    { value: "2", labelKey: "json.indent2" },
    { value: "4", labelKey: "json.indent4" },
    { value: "tab", labelKey: "json.indentTab" },
  ];

  return (
    <ToolLayout
      toolName={t("tool.json-formatter.name")}
      toolDescription={t("tool.json-formatter.desc")}
    >
      <div className="space-y-6">
        <div className="glass rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-t-secondary">{t("ui.indent")}</span>
              <div className="flex gap-1.5 flex-wrap">
                {indentOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setIndent(option.value)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                      indent === option.value
                        ? "bg-accent text-white shadow-md shadow-accent/25"
                        : "bg-bg-secondary text-t-secondary hover:bg-bg-tertiary hover:text-t-primary border border-border"
                    }`}
                  >
                    {t(option.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={loadSample}
                className="px-3 py-1.5 text-xs rounded-lg bg-bg-secondary text-t-secondary hover:bg-bg-tertiary hover:text-t-primary transition-all font-medium border border-border"
              >
                {t("json.sample")}
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="px-3 py-1.5 text-xs rounded-lg bg-bg-secondary text-t-secondary hover:bg-bg-tertiary hover:text-t-primary transition-all font-medium border border-border"
              >
                {t("ui.clear")}
              </button>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-6">
          <label className="block text-sm text-t-secondary mb-2">
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
            className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border text-t-primary placeholder:text-t-tertiary focus:outline-none focus:border-accent/50 font-mono text-sm resize-y"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={handleFormat}
            className="py-3 rounded-xl text-sm font-semibold transition-all bg-accent text-white shadow-lg shadow-accent/25 hover:bg-accent-hover"
          >
            {t("ui.format")}
          </button>
          <button
            type="button"
            onClick={handleMinify}
            className="py-3 rounded-xl text-sm font-semibold transition-all bg-accent text-white shadow-lg shadow-accent/25 hover:bg-accent-hover"
          >
            {t("ui.minify")}
          </button>
          <button
            type="button"
            onClick={handleValidate}
            className="py-3 rounded-xl text-sm font-semibold transition-all bg-bg-secondary text-t-secondary hover:bg-bg-tertiary hover:text-t-primary border border-border"
          >
            {t("ui.validate")}
          </button>
        </div>

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

        {output && (
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-t-secondary">{t("json.output")}</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyToClipboard}
                  className="px-3 py-1.5 text-xs rounded-lg bg-accent/15 text-accent hover:bg-accent/25 transition-colors font-medium border border-accent/30"
                >
                  {t("ui.copy")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInput(output);
                    setOutput("");
                    setError("");
                  }}
                  className="px-3 py-1.5 text-xs rounded-lg bg-bg-secondary text-t-secondary hover:bg-bg-tertiary hover:text-t-primary transition-colors font-medium border border-border"
                >
                  {t("json.useAsInput")}
                </button>
              </div>
            </div>
            <textarea
              value={output}
              readOnly
              rows={10}
              className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border text-t-primary font-mono text-sm resize-y"
            />
            <p className="text-xs text-t-tertiary mt-2">
              {t("json.charCount", { count: output.length.toLocaleString() })}
            </p>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
