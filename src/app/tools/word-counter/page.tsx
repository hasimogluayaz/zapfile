"use client";

import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

interface Stat {
  label: string;
  value: string;
}

function analyzeText(text: string) {
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, "").length;

  const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

  const sentences =
    text.trim() === ""
      ? 0
      : text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;

  const paragraphs =
    text.trim() === ""
      ? 0
      : text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length ||
        (text.trim().length > 0 ? 1 : 0);

  const avgWordLength =
    words > 0 ? (charactersNoSpaces / words).toFixed(1) : "0";

  const readingTimeMinutes = words / 200;
  const readingTime =
    readingTimeMinutes < 1
      ? `${Math.ceil(readingTimeMinutes * 60)}s`
      : `${Math.ceil(readingTimeMinutes)} min`;

  const speakingTimeMinutes = words / 130;
  const speakingTime =
    speakingTimeMinutes < 1
      ? `${Math.ceil(speakingTimeMinutes * 60)}s`
      : `${Math.ceil(speakingTimeMinutes)} min`;

  return { characters, charactersNoSpaces, words, sentences, paragraphs, avgWordLength, readingTime, speakingTime };
}

export default function WordCounterPage() {
  const { t } = useI18n();
  const [text, setText] = useState("");

  const raw = analyzeText(text);

  const stats: Stat[] = [
    { label: t("wc.chars"), value: raw.characters.toLocaleString() },
    { label: t("wc.charsNoSpace"), value: raw.charactersNoSpaces.toLocaleString() },
    { label: t("wc.words"), value: raw.words.toLocaleString() },
    { label: t("wc.sentences"), value: raw.sentences.toLocaleString() },
    { label: t("wc.paragraphs"), value: raw.paragraphs.toLocaleString() },
    { label: t("wc.avgWordLen"), value: raw.avgWordLength },
    { label: t("wc.readingTime"), value: raw.words === 0 ? "0s" : raw.readingTime },
    { label: t("wc.speakingTime"), value: raw.words === 0 ? "0s" : raw.speakingTime },
  ];

  const handleClear = () => {
    setText("");
  };

  return (
    <ToolLayout
      toolName="Word Counter & Text Analyzer"
      toolDescription="Count words, characters, sentences, paragraphs, and estimate reading and speaking time. All processing happens in your browser."
    >
      <div className="space-y-6">
        {/* Text input */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-t-secondary">
              {t("wc.enterText")}
            </label>
            {text.length > 0 && (
              <button
                onClick={handleClear}
                className="px-3 py-1.5 text-xs rounded-lg bg-bg-secondary text-t-secondary hover:bg-bg-tertiary hover:text-t-primary transition-colors"
              >
                {t("ui.clear")}
              </button>
            )}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("wc.placeholder")}
            rows={10}
            className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border text-t-primary placeholder:text-t-tertiary focus:outline-none focus:border-accent text-sm leading-relaxed resize-none transition-colors"
          />
        </div>

        {/* Statistics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="glass rounded-2xl p-5 text-center">
              <p className="text-2xl sm:text-3xl font-bold gradient-text">
                {stat.value}
              </p>
              <p className="text-sm text-t-secondary mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </ToolLayout>
  );
}
