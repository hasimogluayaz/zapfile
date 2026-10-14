"use client";

import { useDeferredValue, useMemo } from "react";
import ToolLayout from "@/components/ToolLayout";
import { sectionTitle } from "@/components/ui/controls";
import { useI18n } from "@/lib/i18n";
import { useStoredText } from "@/lib/text-tools/hooks";
import { SavedNote, smallButton } from "@/lib/text-tools/ui";
import { formatFileSize } from "@/lib/utils";
import { analyze, smsInfo, xLength } from "./count-core";

interface Limit {
  id: "twitter" | "instagram" | "linkedin" | "facebook" | "meta" | "title";
  limit: number;
  /** Which count the platform uses. */
  measure: "x" | "chars";
  labelKey: string;
}

const LIMITS: Limit[] = [
  { id: "twitter", limit: 280, measure: "x", labelKey: "cc.platform.twitter" },
  { id: "instagram", limit: 2200, measure: "chars", labelKey: "cc.platform.instagram" },
  { id: "linkedin", limit: 3000, measure: "chars", labelKey: "cc.platform.linkedin" },
  { id: "facebook", limit: 63206, measure: "chars", labelKey: "cc.platform.facebook" },
  { id: "title", limit: 60, measure: "chars", labelKey: "wc.v2.seoTitle" },
  { id: "meta", limit: 160, measure: "chars", labelKey: "wc.v2.metaDesc" },
];

export default function WordCounterPage() {
  const { t, locale } = useI18n();
  const [text, setText, store] = useStoredText("word-counter");
  // Typing stays instant on very long texts; stats follow a frame later.
  const deferred = useDeferredValue(text);
  const s = useMemo(() => analyze(deferred, locale), [deferred, locale]);
  const x = useMemo(() => xLength(deferred), [deferred]);
  const sms = useMemo(() => smsInfo(deferred), [deferred]);

  const num = (n: number, digits = 0) => n.toLocaleString(locale, { maximumFractionDigits: digits });
  const minutes = (m: number) => {
    if (m <= 0) return "0";
    if (m < 1) return new Intl.NumberFormat(locale, { style: "unit", unit: "second", unitDisplay: "short" }).format(Math.max(1, Math.round(m * 60)));
    return new Intl.NumberFormat(locale, { style: "unit", unit: "minute", unitDisplay: "short", maximumFractionDigits: 0 }).format(Math.round(m));
  };

  const stats = [
    { label: t("wc.words"), value: num(s.words) },
    { label: t("wc.chars"), value: num(s.chars) },
    { label: t("wc.charsNoSpace"), value: num(s.charsNoSpaces) },
    { label: t("wc.sentences"), value: num(s.sentences) },
    { label: t("wc.paragraphs"), value: num(s.paragraphs) },
    { label: t("cc.lines"), value: num(s.lines) },
    { label: t("wc.readingTime"), value: minutes(s.words / 238) },
    { label: t("wc.speakingTime"), value: minutes(s.words / 150) },
    { label: t("wc.v2.bytes"), value: formatFileSize(s.bytes) },
  ];

  return (
    <ToolLayout toolName={t("tool.word-counter.name")} toolDescription={t("tool.word-counter.desc")}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="glass p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <label htmlFor="wc-text" className="text-[13px] font-medium text-t-secondary">
                {t("wc.enterText")}
              </label>
              {text.length > 0 && (
                <button type="button" onClick={() => setText("")} className={smallButton}>
                  {t("ui.clear")}
                </button>
              )}
            </div>
            <textarea
              id="wc-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("wc.placeholder")}
              rows={12}
              className="w-full resize-y rounded-xl border border-border bg-bg-secondary px-4 py-3 text-[15px] leading-relaxed text-t-primary placeholder:text-t-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            />
            <p className="mt-2 text-[12.5px] text-t-tertiary">
              <SavedNote tooBig={store.tooBigToStore} />
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="glass p-4 text-center">
                <p className="text-2xl font-semibold tabular-nums tracking-tight text-t-primary sm:text-3xl">{stat.value}</p>
                <p className="mt-1 text-[13px] text-t-secondary">{stat.label}</p>
              </div>
            ))}
          </div>

          {(s.top.length > 0 || s.words > 0) && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="glass space-y-2 p-5">
                <p className={sectionTitle}>{t("wc.v2.details")}</p>
                <dl className="grid grid-cols-[1fr_auto] gap-y-1.5 text-[13.5px]">
                  <dt className="text-t-tertiary">{t("wc.avgWordLen")}</dt>
                  <dd className="tabular-nums text-t-primary">{num(s.avgWord, 1)}</dd>
                  <dt className="text-t-tertiary">{t("wc.v2.avgSentence")}</dt>
                  <dd className="tabular-nums text-t-primary">{s.sentences ? num(s.words / s.sentences, 1) : "0"}</dd>
                  <dt className="text-t-tertiary">{t("wc.v2.longestSentence")}</dt>
                  <dd className="tabular-nums text-t-primary">{num(s.longestSentence)}</dd>
                </dl>
                {s.sentences > 0 && s.words / s.sentences > 25 && <p className="text-[12.5px] text-amber-700 dark:text-amber-400">{t("wc.v2.longHint")}</p>}
              </div>
              {s.top.length > 0 && (
                <div className="glass space-y-2 p-5">
                  <p className={sectionTitle}>{t("wc.v2.topWords")}</p>
                  <ul className="space-y-1.5">
                    {s.top.map((w) => (
                      <li key={w.word} className="flex items-center gap-2 text-[13.5px]">
                        <span className="min-w-0 flex-1 truncate text-t-primary">{w.word}</span>
                        <span className="h-1.5 w-20 overflow-hidden rounded-full bg-bg-tertiary">
                          <span className="block h-full bg-t-primary" style={{ width: `${(w.count / s.top[0]!.count) * 100}%` }} />
                        </span>
                        <span className="w-16 text-end tabular-nums text-t-tertiary">
                          {w.count} · {num((w.count / s.words) * 100, 1)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-5 lg:sticky lg:top-20 lg:h-fit">
          <div className="glass p-5 sm:p-6">
            <h3 className={`${sectionTitle} mb-4`}>{t("cc.platformLimits")}</h3>
            <div className="space-y-4">
              {LIMITS.map((p) => {
                const used = p.measure === "x" ? x : s.chars;
                const pct = Math.min((used / p.limit) * 100, 100);
                const over = used > p.limit;
                return (
                  <div key={p.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-[13.5px] text-t-secondary">{t(p.labelKey)}</span>
                      <span className={`text-[13.5px] font-semibold tabular-nums ${over ? "text-red-600 dark:text-red-400" : "text-t-primary"}`}>
                        {over ? `${num(used - p.limit)} ${t("cc.over")}` : `${num(used)} / ${num(p.limit)}`}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-bg-tertiary" role="progressbar" aria-valuemin={0} aria-valuemax={p.limit} aria-valuenow={Math.min(used, p.limit)} aria-label={t(p.labelKey)}>
                      <div className={`h-full rounded-full transition-all duration-300 ${over ? "bg-red-500" : pct > 90 ? "bg-volt" : "bg-t-primary"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[12px] text-t-tertiary">{t("wc.v2.xRule")}</p>
          </div>

          <div className="glass space-y-2 p-5 sm:p-6">
            <h3 className={sectionTitle}>SMS</h3>
            <p className="text-[22px] font-semibold tabular-nums text-t-primary">{sms.segments === 0 ? t("cc.noSms") : t("wc.v2.smsParts", { n: sms.segments })}</p>
            <p className="text-[13px] text-t-secondary">
              {sms.encoding} · {t("wc.v2.smsPer", { n: sms.perSegment })}
            </p>
            {sms.encoding === "UCS-2" && (
              <p className="text-[12.5px] leading-snug text-t-tertiary">
                {t("wc.v2.smsUnicode")} <span className="font-mono text-t-secondary">{sms.offenders.join(" ")}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
