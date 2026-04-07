"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

type BaseKey = "decimal" | "binary" | "hex" | "octal";

interface BaseValues {
  decimal: string;
  binary: string;
  hex: string;
  octal: string;
}

const EMPTY: BaseValues = { decimal: "", binary: "", hex: "", octal: "" };

function fromDecimal(n: bigint): BaseValues {
  if (n < BigInt(0)) {
    // Handle negative by showing two's complement is complex; just show signed decimal
    return {
      decimal: n.toString(10),
      binary: "—",
      hex: "—",
      octal: "—",
    };
  }
  return {
    decimal: n.toString(10),
    binary: n.toString(2),
    hex: n.toString(16).toUpperCase(),
    octal: n.toString(8),
  };
}

function parseInput(value: string, base: number): bigint | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  try {
    const result = BigInt(`0${base === 16 ? "x" : base === 8 ? "o" : base === 2 ? "b" : ""}${trimmed}`);
    return result;
  } catch {
    return null;
  }
}

export default function BaseConverterPage() {
  const { t } = useI18n();
  const [values, setValues] = useState<BaseValues>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  const baseConfig: { key: BaseKey; label: string; base: number; placeholder: string }[] = [
    { key: "decimal", label: t("base.decimal"), base: 10, placeholder: "255" },
    { key: "binary",  label: t("base.binary"),  base: 2,  placeholder: "11111111" },
    { key: "hex",     label: t("base.hex"),      base: 16, placeholder: "FF" },
    { key: "octal",   label: t("base.octal"),    base: 8,  placeholder: "377" },
  ];

  const handleChange = (key: BaseKey, raw: string) => {
    setError(null);

    // Allow empty
    if (raw.trim() === "") {
      setValues(EMPTY);
      return;
    }

    const cfg = baseConfig.find((c) => c.key === key)!;
    const parsed = parseInput(raw, cfg.base);

    if (parsed === null) {
      setError(t("base.invalid"));
      // Keep the typed value visible but blank the others
      setValues({ ...EMPTY, [key]: raw });
      return;
    }

    setValues(fromDecimal(parsed));
  };

  const copyValue = async (val: string, label: string) => {
    if (!val || val === "—") return;
    try {
      await navigator.clipboard.writeText(val);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <ToolLayout
      toolName={t("tool.base-converter.name")}
      toolDescription={t("tool.base-converter.desc")}
    >
      <div className="space-y-8">
        <div className="glass rounded-2xl p-6">
          <p className="text-sm text-brand-muted mb-6">
            {t("base.input")}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {baseConfig.map(({ key, label, placeholder }) => (
              <div key={key} className="space-y-2">
                <label className="block text-sm font-medium text-brand-muted">
                  {label}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={values[key]}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder={placeholder}
                    spellCheck={false}
                    className="w-full px-4 py-3 pr-10 rounded-xl bg-white/[0.04] border border-white/[0.08] text-brand-text placeholder:text-brand-muted/40 focus:outline-none focus:border-brand-indigo/40 font-mono text-sm transition-colors"
                  />
                  {values[key] && values[key] !== "—" && (
                    <button
                      onClick={() => copyValue(values[key], label)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
                      aria-label={`Copy ${label}`}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <p className="mt-4 text-sm text-red-400">{error}</p>
          )}
        </div>

        {/* Summary card — only shown when a valid value is present */}
        {values.decimal !== "" && values.decimal !== "—" && !error && (
          <div className="glass rounded-2xl p-6">
            <h3 className="text-sm font-semibold text-brand-text mb-4">
              {t("base.results")}
            </h3>
            <div className="space-y-3">
              {baseConfig.map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08]"
                >
                  <span className="text-xs font-semibold text-brand-muted w-24 shrink-0">
                    {label}
                  </span>
                  <span className="font-mono text-sm text-brand-text flex-1 break-all">
                    {values[key]}
                  </span>
                  <button
                    onClick={() => copyValue(values[key], label)}
                    className="shrink-0 text-brand-muted hover:text-brand-text transition-colors"
                    aria-label={`Copy ${label}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
