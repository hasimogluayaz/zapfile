"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";

type Conversion = {
  label: string;
  key: string;
  fn: (text: string) => string;
};

function toTitleCase(text: string): string {
  return text.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function toSentenceCase(text: string): string {
  return text
    .toLowerCase()
    .replace(/(^\s*\w|[.!?]\s+\w)/g, (c) => c.toUpperCase());
}

function toCamelCase(text: string): string {
  return text
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .map((word, i) =>
      i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    )
    .join("");
}

function toPascalCase(text: string): string {
  return text
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join("");
}

function toSnakeCase(text: string): string {
  return text
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .join("_")
    .toLowerCase();
}

function toKebabCase(text: string): string {
  return text
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .split(/\s+/)
    .join("-")
    .toLowerCase();
}

function reverseText(text: string): string {
  return text.split("").reverse().join("");
}

function removeExtraSpaces(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

const CONVERSIONS: Conversion[] = [
  { label: "UPPERCASE", key: "upper", fn: (t) => t.toUpperCase() },
  { label: "lowercase", key: "lower", fn: (t) => t.toLowerCase() },
  { label: "Title Case", key: "title", fn: toTitleCase },
  { label: "Sentence case", key: "sentence", fn: toSentenceCase },
  { label: "camelCase", key: "camel", fn: toCamelCase },
  { label: "PascalCase", key: "pascal", fn: toPascalCase },
  { label: "snake_case", key: "snake", fn: toSnakeCase },
  { label: "kebab-case", key: "kebab", fn: toKebabCase },
  { label: "Reverse Text", key: "reverse", fn: reverseText },
  { label: "Remove Extra Spaces", key: "spaces", fn: removeExtraSpaces },
];

export default function TextCasePage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [activeConversion, setActiveConversion] = useState<string | null>(null);

  const applyConversion = (conv: Conversion) => {
    const result = conv.fn(input);
    setOutput(result);
    setActiveConversion(conv.key);
  };

  const copyOutput = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const swapTexts = () => {
    setInput(output);
    setOutput("");
    setActiveConversion(null);
  };

  const charDiff = output.length - input.length;

  return (
    <ToolLayout
      toolName="Text Case Converter"
      toolDescription="Convert text between uppercase, lowercase, camelCase, snake_case and more"
    >
      <div className="space-y-6">
        {/* Input */}
        <div className="glass rounded-xl p-6">
          <label className="block text-sm font-medium text-t-secondary mb-3">Input Text</label>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (activeConversion) {
                const conv = CONVERSIONS.find((c) => c.key === activeConversion);
                if (conv) setOutput(conv.fn(e.target.value));
              }
            }}
            placeholder="Paste or type your text here..."
            rows={5}
            className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border text-t-primary focus:outline-none focus:border-accent/50 resize-y placeholder:text-t-tertiary"
          />
          <div className="text-xs text-t-tertiary mt-1">{input.length} characters</div>
        </div>

        {/* Conversion Buttons */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-sm font-semibold text-t-secondary mb-3">Convert To</h3>
          <div className="flex flex-wrap gap-2">
            {CONVERSIONS.map((conv) => (
              <button
                key={conv.key}
                onClick={() => applyConversion(conv)}
                disabled={!input}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  activeConversion === conv.key
                    ? "bg-indigo-500/20 border border-indigo-500/50 text-indigo-400"
                    : "px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors"
                }`}
              >
                {conv.label}
              </button>
            ))}
          </div>
        </div>

        {/* Output */}
        {output && (
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-t-secondary">Result</label>
                {charDiff !== 0 && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-mono ${
                      charDiff > 0
                        ? "bg-green-500/10 text-green-400"
                        : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {charDiff > 0 ? "+" : ""}{charDiff} chars
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={swapTexts}
                  className="px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors text-sm"
                  title="Use result as input"
                >
                  ⇅ Swap
                </button>
                <button
                  onClick={copyOutput}
                  className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-all text-sm"
                >
                  Copy Result
                </button>
              </div>
            </div>
            <textarea
              value={output}
              readOnly
              rows={5}
              className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border text-t-primary focus:outline-none resize-y font-mono text-sm cursor-text select-all"
            />
            <div className="text-xs text-t-tertiary mt-1">{output.length} characters</div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
