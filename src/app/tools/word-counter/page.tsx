"use client";

import { useMemo, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

interface PlatformLimit {
  id: "twitter" | "instagram" | "linkedin" | "facebook" | "sms";
  limit: number;
}

const PLATFORMS: PlatformLimit[] = [
  { id: "twitter", limit: 280 },
  { id: "instagram", limit: 2200 },
  { id: "linkedin", limit: 3000 },
  { id: "facebook", limit: 63206 },
  { id: "sms", limit: 160 },
];

/** Count user-perceived characters, so an emoji or "é" counts as one. */
function countGraphemes(text: string): number {
  if (!text) return 0;
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
    return Array.from(seg.segment(text)).length;
  }
  return Array.from(text).length;
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0s";
  if (minutes < 1) return `${Math.ceil(minutes * 60)}s`;
  const m = Math.floor(minutes);
  const s = Math.round((minutes - m) * 60);
  return s ? `${m}m ${s}s` : `${m}m`;
}

function analyzeText(text: string) {
  const trimmed = text.trim();
  const characters = countGraphemes(text);
  const charactersNoSpaces = countGraphemes(text.replace(/\s/g, ""));
  const words = trimmed === "" ? 0 : trimmed.split(/\s+/).length;
  const lines = text === "" ? 0 : text.split("\n").length;
  const sentences =
    trimmed === "" ? 0 : text.split(/[.!?…]+/).filter((s) => s.trim().length > 0).length;
  const paragraphs =
    trimmed === "" ? 0 : text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
  const avgWordLength = words > 0 ? (charactersNoSpaces / words).toFixed(1) : "0";

  return {
    characters,
    charactersNoSpaces,
    words,
    lines,
    sentences,
    paragraphs,
    avgWordLength,
    readingTime: formatDuration(words / 200),
    speakingTime: formatDuration(words / 130),
  };
}

export default function WordCounterPage() {
  const { t } = useI18n();
  const [text, setText] = useState("");

  const raw = useMemo(() => analyzeText(text), [text]);

  const stats = [
    { label: t("wc.words"), value: raw.words.toLocaleString() },
    { label: t("wc.chars"), value: raw.characters.toLocaleString() },
    { label: t("wc.charsNoSpace"), value: raw.charactersNoSpaces.toLocaleString() },
    { label: t("wc.sentences"), value: raw.sentences.toLocaleString() },
    { label: t("wc.paragraphs"), value: raw.paragraphs.toLocaleString() },
    { label: t("cc.lines"), value: raw.lines.toLocaleString() },
    { label: t("wc.avgWordLen"), value: raw.avgWordLength },
    { label: t("wc.readingTime"), value: raw.readingTime },
    { label: t("wc.speakingTime"), value: raw.speakingTime },
  ];

  const smsLabel = (chars: number) =>
    chars === 0 ? t("cc.noSms") : t("cc.sms", { n: Math.ceil(chars / 160), chars });

  return (
    <ToolLayout
      toolName="Word & Character Counter"
      toolDescription="Count words, characters, sentences and paragraphs, check social media limits and estimate reading time."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <div className="glass p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between">
              <label htmlFor="wc-text" className="text-sm font-medium text-t-secondary">
                {t("wc.enterText")}
              </label>
              {text.length > 0 && (
                <button
                  onClick={() => setText("")}
                  className="rounded-lg bg-bg-secondary px-3 py-1.5 text-xs text-t-secondary transition-colors hover:bg-bg-tertiary hover:text-t-primary"
                >
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
              className="w-full resize-y rounded-xl border border-border bg-bg-secondary px-4 py-3 text-[15px] leading-relaxed text-t-primary transition-colors placeholder:text-t-tertiary focus:border-t-primary/40 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="glass p-4 text-center">
                <p className="text-2xl font-semibold tabular-nums tracking-tight text-t-primary sm:text-3xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-[13px] text-t-secondary">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="glass h-fit p-5 sm:p-6 lg:sticky lg:top-20">
          <h3 className="mb-4 text-sm font-semibold text-t-primary">{t("cc.platformLimits")}</h3>
          <div className="space-y-4">
            {PLATFORMS.map((platform) => {
              const used = raw.characters;
              const pct = Math.min((used / platform.limit) * 100, 100);
              const over = used > platform.limit;
              return (
                <div key={platform.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-sm text-t-secondary">
                      {t(`cc.platform.${platform.id}`)}
                    </span>
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        over ? "text-red-600 dark:text-red-400" : "text-t-primary"
                      }`}
                    >
                      {over
                        ? `${(used - platform.limit).toLocaleString()} ${t("cc.over")}`
                        : platform.id === "sms"
                          ? smsLabel(used)
                          : `${used.toLocaleString()} / ${platform.limit.toLocaleString()}`}
                    </span>
                  </div>
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-bg-tertiary"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={platform.limit}
                    aria-valuenow={Math.min(used, platform.limit)}
                    aria-label={t(`cc.platform.${platform.id}`)}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        over ? "bg-red-500" : pct > 90 ? "bg-volt" : "bg-t-primary"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
