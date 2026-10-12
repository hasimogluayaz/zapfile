"use client";

import { useDeferredValue, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ArrowUpDown, Check, Copy } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import { Segmented, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { useI18n } from "@/lib/i18n";
import { LOCALE_LABELS } from "@/lib/locales";
import {
  alternatingCase,
  camelCase,
  cleanSpaces,
  inverseCase,
  joinCase,
  pascalCase,
  perLine,
  reverseGraphemes,
  sentenceCase,
  titleCase,
} from "./case-utils";

type Key =
  | "upper"
  | "lower"
  | "title"
  | "sentence"
  | "camel"
  | "pascal"
  | "snake"
  | "kebab"
  | "constant"
  | "dot"
  | "alternating"
  | "inverse"
  | "reverse"
  | "spaces";

interface Conversion {
  key: Key;
  /** i18n key for prose cases; code-style names are shown verbatim. */
  labelKey?: string;
  label?: string;
  /** Uses language-specific casing rules (code cases always use neutral rules). */
  localeAware: boolean;
  fn: (text: string, lang?: string) => string;
}

const CONVERSIONS: Conversion[] = [
  { key: "upper", labelKey: "case.ui.upper", localeAware: true, fn: (s, l) => (l ? s.toLocaleUpperCase(l) : s.toUpperCase()) },
  { key: "lower", labelKey: "case.ui.lower", localeAware: true, fn: (s, l) => (l ? s.toLocaleLowerCase(l) : s.toLowerCase()) },
  { key: "title", labelKey: "case.ui.title", localeAware: true, fn: titleCase },
  { key: "sentence", labelKey: "case.ui.sentence", localeAware: true, fn: sentenceCase },
  { key: "camel", label: "camelCase", localeAware: false, fn: (s) => perLine(s, (l) => camelCase(l)) },
  { key: "pascal", label: "PascalCase", localeAware: false, fn: (s) => perLine(s, (l) => pascalCase(l)) },
  { key: "snake", label: "snake_case", localeAware: false, fn: (s) => perLine(s, (l) => joinCase(l, "_", false)) },
  { key: "kebab", label: "kebab-case", localeAware: false, fn: (s) => perLine(s, (l) => joinCase(l, "-", false)) },
  { key: "constant", label: "CONSTANT_CASE", localeAware: false, fn: (s) => perLine(s, (l) => joinCase(l, "_", true)) },
  { key: "dot", label: "dot.case", localeAware: false, fn: (s) => perLine(s, (l) => joinCase(l, ".", false)) },
  { key: "alternating", labelKey: "case.v2.alternating", localeAware: true, fn: alternatingCase },
  { key: "inverse", labelKey: "case.v2.inverse", localeAware: true, fn: inverseCase },
  { key: "reverse", labelKey: "case.ui.reverse", localeAware: false, fn: (s) => reverseGraphemes(s) },
  { key: "spaces", labelKey: "case.ui.spaces", localeAware: false, fn: (s) => cleanSpaces(s) },
];

const PREVIEW_CHARS = 400;

export default function TextCasePage() {
  const { t, locale } = useI18n();
  const [input, setInput] = useState("");
  const [active, setActive] = useState<Key>("title");
  const [rules, setRules] = useState<"locale" | "neutral">("locale");
  const deferred = useDeferredValue(input);
  const lang = rules === "locale" ? locale : undefined;

  const label = (c: Conversion) => (c.labelKey ? t(c.labelKey) : c.label ?? c.key);
  const run = (c: Conversion, text: string) => c.fn(text, c.localeAware ? lang : undefined);

  // Every card shows a live preview of the first few hundred characters.
  const previews = useMemo(() => {
    const head = deferred.slice(0, PREVIEW_CHARS);
    const out = {} as Record<Key, string>;
    for (const c of CONVERSIONS) out[c.key] = run(c, head);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferred, lang]);

  const activeConv = CONVERSIONS.find((c) => c.key === active)!;
  const output = useMemo(() => run(activeConv, deferred), [activeConv, deferred, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const copy = async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("ui.copied"));
    } catch {
      toast.error(t("ui.copyFailed"));
    }
  };

  const graphemes = (s: string) => {
    if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
      let n = 0;
      for (const _ of new Intl.Segmenter(locale, { granularity: "grapheme" }).segment(s)) n++; // eslint-disable-line @typescript-eslint/no-unused-vars
      return n;
    }
    return Array.from(s).length;
  };
  const inCount = useMemo(() => graphemes(deferred), [deferred]); // eslint-disable-line react-hooks/exhaustive-deps
  const outCount = useMemo(() => graphemes(output), [output]); // eslint-disable-line react-hooks/exhaustive-deps
  const diff = outCount - inCount;

  return (
    <ToolLayout
      toolName="Text Case Converter"
      toolDescription="Convert text between uppercase, lowercase, camelCase, snake_case and more"
    >
      <div className="space-y-5">
        <section className="glass p-5 sm:p-6">
          <div className="mb-2 flex items-center justify-between gap-3">
            <label htmlFor="case-in" className="text-sm font-medium text-t-secondary">
              {t("case.ui.inputText")}
            </label>
            {input && (
              <button
                type="button"
                onClick={() => setInput("")}
                className="min-h-[36px] rounded-lg px-2.5 text-[13px] text-t-secondary hover:bg-bg-secondary hover:text-t-primary"
              >
                {t("ui.clear")}
              </button>
            )}
          </div>
          <textarea
            id="case-in"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("case.ui.placeholder")}
            rows={6}
            className="w-full resize-y rounded-xl border border-border bg-bg-secondary px-4 py-3 text-[15px] leading-relaxed text-t-primary placeholder:text-t-tertiary focus:border-t-primary/40 focus:outline-none"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs tabular-nums text-t-tertiary">{t("json.charCount", { count: inCount })}</span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] text-t-secondary">{t("case.v2.rules")}</span>
              <Segmented<"locale" | "neutral">
                label={t("case.v2.rules")}
                size="sm"
                value={rules}
                onChange={setRules}
                options={[
                  { value: "locale", label: LOCALE_LABELS[locale] ?? locale },
                  { value: "neutral", label: t("case.v2.neutral") },
                ]}
              />
            </div>
          </div>
          <p className="mt-2 text-[12.5px] text-t-tertiary">{t("case.v2.rulesHint")}</p>
        </section>

        <section>
          <h2 className={`${sectionTitle} mb-3`}>{t("case.ui.convertTo")}</h2>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label={t("case.ui.convertTo")}>
            {CONVERSIONS.map((c) => {
              const selected = c.key === active;
              return (
                <div
                  key={c.key}
                  className={`group relative flex min-w-0 flex-col rounded-xl border p-3 transition-colors ${
                    selected ? "border-t-primary/50 bg-surface shadow-sm" : "border-border bg-bg-secondary hover:border-t-primary/25"
                  }`}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setActive(c.key)}
                    className="flex min-h-[44px] flex-col items-start gap-1 rounded-lg pe-10 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt"
                  >
                    <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-t-primary">
                      {selected && <Check className="h-3.5 w-3.5" aria-hidden />}
                      <span className={c.labelKey ? "" : "font-mono"}>{label(c)}</span>
                    </span>
                    <span className="line-clamp-2 w-full break-words font-mono text-[12.5px] text-t-tertiary">
                      {previews[c.key] || "—"}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => copy(run(c, input))}
                    disabled={!input}
                    aria-label={`${t("ui.copy")}: ${label(c)}`}
                    className="absolute end-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-lg text-t-tertiary transition-colors hover:bg-bg-tertiary hover:text-t-primary disabled:opacity-30"
                  >
                    <Copy className="h-4 w-4" aria-hidden />
                  </button>
                </div>
              );
            })}
          </div>
        </section>

        <section className="glass p-5 sm:p-6">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-medium text-t-secondary">
                {t("ui.result")} · <span className={activeConv.labelKey ? "" : "font-mono"}>{label(activeConv)}</span>
              </h2>
              {diff !== 0 && input && (
                <span className="rounded-full bg-bg-secondary px-2 py-0.5 font-mono text-xs text-t-secondary">
                  {t("pwcheck.ui.charsCount", { n: `${diff > 0 ? "+" : ""}${diff}` })}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setInput(output)}
                disabled={!output || output === input}
                className={buttonSecondary}
                title={t("case.ui.useAsInput")}
              >
                <ArrowUpDown className="h-4 w-4" aria-hidden />
                {t("case.ui.useAsInput")}
              </button>
              <button type="button" onClick={() => copy(output)} disabled={!output} className={`${buttonPrimary} !py-2.5 !text-[14px]`}>
                <Copy className="h-4 w-4" aria-hidden />
                {t("ui.copy")}
              </button>
            </div>
          </div>
          <textarea
            value={output}
            readOnly
            rows={6}
            aria-label={t("ui.result")}
            placeholder={t("case.v2.outputHint")}
            className="w-full resize-y rounded-xl border border-border bg-bg-secondary px-4 py-3 font-mono text-[14px] leading-relaxed text-t-primary placeholder:text-t-tertiary focus:outline-none"
          />
          <p className="mt-1 text-xs tabular-nums text-t-tertiary">{t("json.charCount", { count: outCount })}</p>
        </section>
      </div>
    </ToolLayout>
  );
}
