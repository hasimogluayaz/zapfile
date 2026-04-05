"use client";

import { useState, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

type Mode = "csv-to-json" | "json-to-csv";
type Delimiter = "," | "\t" | ";";

function parseCSV(text: string, delimiter: Delimiter, hasHeaders: boolean): unknown {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];

  const parseRow = (row: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (inQuotes) {
        if (ch === '"' && row[i + 1] === '"') {
          current += '"';
          i++;
        } else if (ch === '"') {
          inQuotes = false;
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === delimiter) {
          result.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  };

  const rows = lines.map(parseRow);

  if (hasHeaders && rows.length > 1) {
    const headers = rows[0];
    return rows.slice(1).map((row) => {
      const obj: Record<string, string> = {};
      headers.forEach((header, i) => {
        obj[header] = row[i] ?? "";
      });
      return obj;
    });
  }

  return rows;
}

function jsonToCSV(data: unknown): string {
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Input must be a non-empty JSON array");
  }

  if (typeof data[0] === "object" && data[0] !== null && !Array.isArray(data[0])) {
    const headers = Object.keys(data[0]);
    const rows = data.map((item) => {
      return headers.map((h) => {
        const val = String((item as Record<string, unknown>)[h] ?? "");
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(",");
    });
    return [headers.join(","), ...rows].join("\n");
  }

  if (Array.isArray(data[0])) {
    return data.map((row) =>
      (row as unknown[]).map((cell) => {
        const val = String(cell ?? "");
        if (val.includes(",") || val.includes('"') || val.includes("\n")) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(",")
    ).join("\n");
  }

  throw new Error("JSON must be an array of objects or array of arrays");
}

export default function CSVJSONPage() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("csv-to-json");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [delimiter, setDelimiter] = useState<Delimiter>(",");
  const [hasHeaders, setHasHeaders] = useState(true);

  const convert = useCallback(() => {
    if (!input.trim()) {
      setOutput("");
      setError("");
      return;
    }

    try {
      if (mode === "csv-to-json") {
        const result = parseCSV(input, delimiter, hasHeaders);
        setOutput(JSON.stringify(result, null, 2));
      } else {
        const parsed = JSON.parse(input);
        setOutput(jsonToCSV(parsed));
      }
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Conversion failed");
      setOutput("");
    }
  }, [input, mode, delimiter, hasHeaders]);

  useEffect(() => {
    const timer = setTimeout(convert, 200);
    return () => clearTimeout(timer);
  }, [convert]);

  const copyToClipboard = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      toast.success(t("ui.copied"));
    } catch {
      toast.error(t("ui.copyFailed"));
    }
  };

  const swapMode = () => {
    const newMode = mode === "csv-to-json" ? "json-to-csv" : "csv-to-json";
    setMode(newMode as Mode);
    setInput(output);
    setOutput("");
    setError("");
  };

  const clearAll = () => {
    setInput("");
    setOutput("");
    setError("");
  };

  return (
    <ToolLayout
      toolName="CSV ↔ JSON"
      toolDescription="Convert between CSV and JSON formats"
    >
      <div className="space-y-6">
        {/* Mode Toggle */}
        <div className="glass rounded-xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => { setMode("csv-to-json"); setOutput(""); setError(""); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === "csv-to-json"
                    ? "bg-accent text-white"
                    : "text-t-secondary hover:text-t-primary bg-bg-secondary border border-border"
                }`}
              >
                {t("csvjson.csvToJson")}
              </button>
              <button
                onClick={() => { setMode("json-to-csv"); setOutput(""); setError(""); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === "json-to-csv"
                    ? "bg-accent text-white"
                    : "text-t-secondary hover:text-t-primary bg-bg-secondary border border-border"
                }`}
              >
                {t("csvjson.jsonToCsv")}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={swapMode}
                className="px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors text-sm"
              >
                {t("ui.swap")}
              </button>
              <button
                onClick={clearAll}
                className="px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors text-sm"
              >
                {t("ui.clear")}
              </button>
            </div>
          </div>

          {/* CSV Options */}
          {mode === "csv-to-json" && (
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <span className="text-sm text-t-secondary">{t("csvjson.delimiter")}</span>
                <div className="flex gap-1">
                  {([
                    { value: ",", labelKey: "csvjson.comma" },
                    { value: "\t", labelKey: "csvjson.tab" },
                    { value: ";", labelKey: "csvjson.semicolon" },
                  ] as { value: Delimiter; labelKey: string }[]).map((d) => (
                    <button
                      key={d.labelKey}
                      onClick={() => setDelimiter(d.value)}
                      className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                        delimiter === d.value
                          ? "bg-accent text-white"
                          : "text-t-secondary hover:text-t-primary bg-bg-secondary border border-border"
                      }`}
                    >
                      {t(d.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasHeaders}
                  onChange={(e) => setHasHeaders(e.target.checked)}
                  className="rounded border-border text-accent focus:ring-accent/50"
                />
                <span className="text-sm text-t-secondary">{t("csvjson.firstRowHeaders")}</span>
              </label>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="glass rounded-xl p-6">
          <label className="block text-sm text-t-secondary mb-2">
            {mode === "csv-to-json" ? t("csvjson.csvInput") : t("csvjson.jsonInput")}
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === "csv-to-json"
                ? "name,age,city\nJohn,30,New York\nJane,25,London"
                : '[{"name":"John","age":30},{"name":"Jane","age":25}]'
            }
            rows={10}
            spellCheck={false}
            className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-3 text-t-primary placeholder-t-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="glass rounded-xl p-4 border border-red-500/20 bg-red-500/5">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-400">{t("csvjson.error")}</p>
                <p className="text-xs text-red-400/70 mt-1 font-mono">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Output */}
        {output && (
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-t-secondary">
                {mode === "csv-to-json" ? t("csvjson.jsonOutput") : t("csvjson.csvOutput")}
              </label>
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors text-sm"
              >
                {t("ui.copy")}
              </button>
            </div>
            <textarea
              value={output}
              readOnly
              rows={10}
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-3 text-t-primary font-mono text-sm resize-y"
            />
            <p className="text-xs text-t-tertiary mt-2">
              {output.length.toLocaleString()} {t("ui.characters")}
            </p>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
