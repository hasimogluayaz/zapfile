"use client";

import { useState, useRef } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

type Mode = "minify" | "beautify";

// ─── Pure-JS CSS processors ───────────────────────────────────────

function minifyCSS(css: string): string {
  return css
    // Remove single-line comments
    .replace(/\/\*[\s\S]*?\*\//g, "")
    // Collapse newlines and tabs to spaces
    .replace(/[\r\n\t]+/g, " ")
    // Collapse multiple spaces
    .replace(/\s{2,}/g, " ")
    // Remove spaces around structural characters
    .replace(/\s*([{}:;,>~+])\s*/g, "$1")
    // Remove trailing semicolons before closing brace
    .replace(/;}/g, "}")
    // Remove leading/trailing whitespace
    .trim();
}

function beautifyCSS(css: string): string {
  // First strip to a clean baseline
  const base = css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*([{}:;,])\s*/g, "$1")
    .trim();

  let result = "";
  let indent = 0;
  const INDENT = "  ";

  for (let i = 0; i < base.length; i++) {
    const ch = base[i];

    if (ch === "{") {
      result += " {\n";
      indent++;
      result += INDENT.repeat(indent);
    } else if (ch === "}") {
      // Remove trailing space/indent if line is empty
      result = result.trimEnd();
      result += "\n}\n\n";
      indent = Math.max(0, indent - 1);
    } else if (ch === ";") {
      result += ";\n";
      if (i + 1 < base.length && base[i + 1] !== "}") {
        result += INDENT.repeat(indent);
      }
    } else if (ch === ",") {
      // For selector lists, keep on new line
      result += ",\n" + INDENT.repeat(indent);
    } else if (ch === ":") {
      // Separate property from value with a space
      result += ": ";
    } else {
      result += ch;
    }
  }

  // Clean up extra blank lines (more than 2 consecutive)
  return result.replace(/\n{3,}/g, "\n\n").trim();
}

function byteLength(str: string): number {
  return new Blob([str]).size;
}

export default function CssMinifierPage() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("minify");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inputBytes = byteLength(input);
  const outputBytes = byteLength(output);
  const savedPercent =
    inputBytes > 0 && outputBytes > 0
      ? Math.max(0, Math.round(((inputBytes - outputBytes) / inputBytes) * 100))
      : 0;
  const savedBytes = Math.max(0, inputBytes - outputBytes);

  const process = (text: string, m: Mode) => {
    if (!text.trim()) {
      toast.error("Please enter some CSS first.");
      return;
    }
    const result = m === "minify" ? minifyCSS(text) : beautifyCSS(text);
    setOutput(result);
  };

  const handleProcess = () => process(input, mode);

  const handleModeChange = (m: Mode) => {
    setMode(m);
    if (output) process(input, m);
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      toast.success(t("ui.copied"));
    } catch {
      toast.error(t("ui.copyFailed"));
    }
  };

  const handleClear = () => {
    setInput("");
    setOutput("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".css")) {
      toast.error("Please select a .css file.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      setInput(text);
      setOutput("");
    };
    reader.onerror = () => toast.error("Failed to read file.");
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <ToolLayout
      toolName={t("tool.css-minifier.name")}
      toolDescription={t("tool.css-minifier.desc")}
    >
      <div className="space-y-6">
        {/* Mode tabs + Upload */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2">
              {(["minify", "beautify"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => handleModeChange(m)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all capitalize ${
                    mode === m
                      ? "bg-brand-indigo/20 border border-brand-indigo text-brand-text"
                      : "bg-white/[0.04] border border-white/[0.08] text-brand-muted hover:border-white/20"
                  }`}
                >
                  {m === "minify" ? t("css.minify") : t("css.beautify")}
                </button>
              ))}
            </div>

            {/* File upload */}
            <label className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-brand-muted bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-brand-text transition-all">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 3 3 0 013.808 3.397A3.75 3.75 0 0118 19.5H6.75z"
                  />
                </svg>
                Upload .css
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".css"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Input / Output columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Input */}
          <div className="glass rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-brand-text">
                {t("css.input")}
              </span>
              <span className="text-xs text-brand-muted font-mono">
                {input.length} {t("css.chars")}
              </span>
            </div>
            <textarea
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setOutput("");
              }}
              placeholder="/* Paste your CSS here */"
              rows={16}
              spellCheck={false}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-indigo/40 resize-none font-mono text-xs flex-1"
            />
          </div>

          {/* Output */}
          <div className="glass rounded-2xl p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-brand-text">
                {t("css.output")}
              </span>
              <span className="text-xs text-brand-muted font-mono">
                {output.length} {t("css.chars")}
              </span>
            </div>
            <textarea
              value={output}
              readOnly
              placeholder="Output will appear here…"
              rows={16}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-brand-muted resize-none font-mono text-xs flex-1 cursor-default select-all"
            />
          </div>
        </div>

        {/* Stats bar */}
        {output && inputBytes > 0 && (
          <div className="glass rounded-2xl p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-brand-muted">Input:</span>
              <span className="text-xs font-mono text-brand-text font-semibold">
                {inputBytes.toLocaleString()} bytes
              </span>
            </div>
            <div className="text-brand-muted/40 hidden sm:block">→</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-brand-muted">Output:</span>
              <span className="text-xs font-mono text-brand-text font-semibold">
                {outputBytes.toLocaleString()} bytes
              </span>
            </div>
            {savedBytes > 0 && (
              <>
                <div className="text-brand-muted/40 hidden sm:block">·</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-emerald-400">
                    {t("css.saved")
                      .replace("{n}", String(savedPercent))
                      .replace("{bytes}", savedBytes.toLocaleString())}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleProcess}
            className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-brand hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {mode === "minify" ? t("css.minify") : t("css.beautify")}
          </button>
          <button
            onClick={handleCopy}
            disabled={!output}
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-brand-text bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            {t("css.copy")}
          </button>
          <button
            onClick={handleClear}
            className="px-6 py-3 rounded-xl font-semibold text-brand-text bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all"
          >
            {t("css.clear")}
          </button>
        </div>
      </div>
    </ToolLayout>
  );
}
