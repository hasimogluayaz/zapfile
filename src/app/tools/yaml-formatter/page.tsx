"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";

type IndentSize = "2" | "4";
type InputMode = "yaml" | "json";

/* ---------- Simple YAML parser ---------- */

function parseYaml(text: string): unknown {
  const lines = text.split(/\r?\n/);
  const result = parseBlock(lines, 0, 0);
  return result.value;
}

function parseBlock(
  lines: string[],
  start: number,
  _baseIndent: number // eslint-disable-line @typescript-eslint/no-unused-vars
): { value: unknown; nextLine: number } {
  if (start >= lines.length) return { value: null, nextLine: start };

  const firstContent = findNextContent(lines, start);
  if (firstContent >= lines.length) return { value: null, nextLine: firstContent };

  const line = lines[firstContent];
  const trimmed = line.replace(/^\s*/, "");

  // Array
  if (trimmed.startsWith("- ") || trimmed === "-") {
    return parseArray(lines, firstContent, getIndent(line));
  }

  // Object
  if (trimmed.includes(": ") || trimmed.endsWith(":")) {
    return parseObject(lines, firstContent, getIndent(line));
  }

  // Scalar
  return { value: parseScalar(trimmed), nextLine: firstContent + 1 };
}

function parseObject(
  lines: string[],
  start: number,
  baseIndent: number
): { value: Record<string, unknown>; nextLine: number } {
  const obj: Record<string, unknown> = {};
  let i = start;

  while (i < lines.length) {
    const contentIdx = findNextContent(lines, i);
    if (contentIdx >= lines.length) break;

    const line = lines[contentIdx];
    const indent = getIndent(line);
    if (indent < baseIndent) break;
    if (indent > baseIndent) break;

    const trimmed = line.trim();
    if (trimmed.startsWith("- ")) break;

    const colonIdx = trimmed.indexOf(": ");
    const endsWithColon = trimmed.endsWith(":") && !trimmed.endsWith("::") && trimmed.indexOf(":") === trimmed.length - 1;

    if (colonIdx > 0 || endsWithColon) {
      let key: string;
      let valueStr: string;

      if (endsWithColon) {
        key = trimmed.slice(0, -1).trim();
        valueStr = "";
      } else {
        key = trimmed.slice(0, colonIdx).trim();
        valueStr = trimmed.slice(colonIdx + 2).trim();
      }

      // Strip quotes from key
      if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
        key = key.slice(1, -1);
      }

      if (valueStr === "" || valueStr === "|" || valueStr === ">") {
        // Block value - look for nested content
        const nested = parseBlock(lines, contentIdx + 1, indent + 1);
        obj[key] = nested.value;
        i = nested.nextLine;
      } else {
        obj[key] = parseScalar(valueStr);
        i = contentIdx + 1;
      }
    } else {
      i = contentIdx + 1;
    }
  }

  return { value: obj, nextLine: i };
}

function parseArray(
  lines: string[],
  start: number,
  baseIndent: number
): { value: unknown[]; nextLine: number } {
  const arr: unknown[] = [];
  let i = start;

  while (i < lines.length) {
    const contentIdx = findNextContent(lines, i);
    if (contentIdx >= lines.length) break;

    const line = lines[contentIdx];
    const indent = getIndent(line);
    if (indent < baseIndent) break;
    if (indent > baseIndent) {
      i = contentIdx + 1;
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed.startsWith("- ") && trimmed !== "-") break;

    const itemValue = trimmed === "-" ? "" : trimmed.slice(2).trim();

    if (itemValue === "" || itemValue.endsWith(":")) {
      // Nested structure
      if (itemValue.endsWith(":") && itemValue.length > 1) {
        // Inline object start in array item e.g. "- key:"
        const fakeLine = " ".repeat(indent + 2) + itemValue;
        const tempLines = [...lines];
        tempLines[contentIdx] = fakeLine;
        const nested = parseBlock(tempLines, contentIdx, indent + 2);
        arr.push(nested.value);
        i = nested.nextLine;
      } else {
        const nested = parseBlock(lines, contentIdx + 1, indent + 2);
        arr.push(nested.value);
        i = nested.nextLine;
      }
    } else if (itemValue.includes(": ")) {
      // Inline object in array
      const colonIdx = itemValue.indexOf(": ");
      const key = itemValue.slice(0, colonIdx).trim();
      const val = itemValue.slice(colonIdx + 2).trim();

      // Check if there are more key-value pairs at deeper indent
      const subObj: Record<string, unknown> = {};
      subObj[key] = parseScalar(val);

      let j = contentIdx + 1;
      while (j < lines.length) {
        const nextContent = findNextContent(lines, j);
        if (nextContent >= lines.length) break;
        const nextLine = lines[nextContent];
        const nextIndent = getIndent(nextLine);
        if (nextIndent <= indent) break;
        const nextTrimmed = nextLine.trim();
        if (nextTrimmed.startsWith("- ")) break;
        const nextColon = nextTrimmed.indexOf(": ");
        if (nextColon > 0) {
          const nk = nextTrimmed.slice(0, nextColon).trim();
          const nv = nextTrimmed.slice(nextColon + 2).trim();
          subObj[nk] = parseScalar(nv);
        }
        j = nextContent + 1;
      }

      arr.push(Object.keys(subObj).length === 1 && j === contentIdx + 1 ? subObj : subObj);
      i = j;
    } else {
      arr.push(parseScalar(itemValue));
      i = contentIdx + 1;
    }
  }

  return { value: arr, nextLine: i };
}

function parseScalar(value: string): unknown {
  if (value === "null" || value === "~" || value === "") return null;
  if (value === "true" || value === "True" || value === "TRUE") return true;
  if (value === "false" || value === "False" || value === "FALSE") return false;

  // Strip quotes
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }

  // Number
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);

  return value;
}

function getIndent(line: string): number {
  const match = line.match(/^(\s*)/);
  return match ? match[1].length : 0;
}

function findNextContent(lines: string[], start: number): number {
  let i = start;
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      i++;
      continue;
    }
    return i;
  }
  return i;
}

/* ---------- YAML stringifier ---------- */

function stringifyYaml(value: unknown, indentSize: number, level: number = 0): string {
  const indent = " ".repeat(indentSize);
  const prefix = indent.repeat(level);

  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (value.includes("\n") || value.includes(": ") || value.includes("#") ||
        value.startsWith("{") || value.startsWith("[") || value.startsWith("'") ||
        value.startsWith('"') || value === "" ||
        /^(true|false|null|~|yes|no|on|off)$/i.test(value) ||
        /^-?\d/.test(value)) {
      return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
    }
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return value
      .map((item) => {
        const itemStr = stringifyYaml(item, indentSize, level + 1);
        if (typeof item === "object" && item !== null) {
          const lines = itemStr.split("\n");
          const first = lines[0];
          const rest = lines.slice(1).map((l) => indent + l).join("\n");
          return prefix + "- " + first + (rest ? "\n" + rest : "");
        }
        return prefix + "- " + itemStr;
      })
      .join("\n");
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "{}";
    return entries
      .map(([key, val]) => {
        const safeKey = /[:\s#\[\]{},&*?|>!%@`]/.test(key) ? `"${key}"` : key;
        if (typeof val === "object" && val !== null) {
          const nested = stringifyYaml(val, indentSize, level + 1);
          return prefix + safeKey + ":\n" + nested;
        }
        const scalar = stringifyYaml(val, indentSize, level + 1);
        return prefix + safeKey + ": " + scalar;
      })
      .join("\n");
  }

  return String(value);
}

export default function YAMLFormatterPage() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [indentSize, setIndentSize] = useState<IndentSize>("2");
  const [inputMode, setInputMode] = useState<InputMode>("yaml");

  const handleFormat = () => {
    if (!input.trim()) {
      setError("Please enter some YAML to format.");
      setOutput("");
      return;
    }
    try {
      const parsed = parseYaml(input);
      const formatted = stringifyYaml(parsed, parseInt(indentSize));
      setOutput(formatted);
      setError("");
      toast.success("YAML formatted successfully!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid YAML input.");
      setOutput("");
      toast.error("Invalid YAML");
    }
  };

  const handleToJSON = () => {
    if (!input.trim()) {
      setError("Please enter some YAML to convert.");
      setOutput("");
      return;
    }
    try {
      const parsed = parseYaml(input);
      const json = JSON.stringify(parsed, null, parseInt(indentSize));
      setOutput(json);
      setError("");
      setInputMode("yaml");
      toast.success("Converted to JSON!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid YAML input.");
      setOutput("");
      toast.error("Invalid YAML");
    }
  };

  const handleJSONToYAML = () => {
    if (!input.trim()) {
      setError("Please enter some JSON to convert.");
      setOutput("");
      return;
    }
    try {
      const parsed = JSON.parse(input);
      const yaml = stringifyYaml(parsed, parseInt(indentSize));
      setOutput(yaml);
      setError("");
      setInputMode("json");
      toast.success("Converted to YAML!");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON input.");
      setOutput("");
      toast.error("Invalid JSON");
    }
  };

  const copyToClipboard = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      toast.success("Copied to clipboard!");
    } catch {
      toast.error("Failed to copy.");
    }
  };

  const clearAll = () => {
    setInput("");
    setOutput("");
    setError("");
    setInputMode("yaml");
  };

  return (
    <ToolLayout
      toolName="YAML Formatter"
      toolDescription="Format and validate YAML data with JSON conversion"
    >
      <div className="space-y-6">
        {/* Controls */}
        <div className="glass rounded-xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-t-secondary">Indent:</span>
              <div className="flex gap-1.5">
                {(["2", "4"] as IndentSize[]).map((size) => (
                  <button
                    key={size}
                    onClick={() => setIndentSize(size)}
                    className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                      indentSize === size
                        ? "bg-accent text-white"
                        : "text-t-secondary hover:text-t-primary bg-bg-secondary border border-border"
                    }`}
                  >
                    {size} Spaces
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setInputMode(inputMode === "yaml" ? "json" : "yaml")}
                className="px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors text-sm"
              >
                Mode: {inputMode.toUpperCase()}
              </button>
              <button
                onClick={clearAll}
                className="px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors text-sm"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Input */}
        <div className="glass rounded-xl p-6">
          <label className="block text-sm text-t-secondary mb-2">
            {inputMode === "yaml" ? "YAML Input" : "JSON Input"}
          </label>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError("");
            }}
            placeholder={
              inputMode === "yaml"
                ? "name: ZapFile\nversion: 1.0\nfeatures:\n  - formatting\n  - conversion"
                : '{"name": "ZapFile", "version": 1.0}'
            }
            rows={10}
            spellCheck={false}
            className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-3 text-t-primary placeholder-t-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono"
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={handleFormat}
            className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg transition-all"
          >
            Format
          </button>
          <button
            onClick={handleToJSON}
            className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg transition-all"
          >
            To JSON
          </button>
          <button
            onClick={handleJSONToYAML}
            className="px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors"
          >
            JSON to YAML
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="glass rounded-xl p-4 border border-red-500/20 bg-red-500/5">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-400">Error</p>
                <p className="text-xs text-red-400/70 mt-1 font-mono">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Output */}
        {output && (
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-t-secondary">Output</label>
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors text-sm"
              >
                Copy
              </button>
            </div>
            <textarea
              value={output}
              readOnly
              rows={10}
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-3 text-t-primary font-mono text-sm resize-y"
            />
            <p className="text-xs text-t-tertiary mt-2">
              {output.length.toLocaleString()} characters
            </p>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
