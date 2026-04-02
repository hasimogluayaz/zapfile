"use client";

import { useState } from "react";
import ToolLayout from "@/components/ToolLayout";

interface Stat {
  label: string;
  value: string;
}

function analyzeText(text: string): Stat[] {
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
    words > 0
      ? (charactersNoSpaces / words).toFixed(1)
      : "0";

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

  return [
    { label: "Characters", value: characters.toLocaleString() },
    { label: "Characters (no spaces)", value: charactersNoSpaces.toLocaleString() },
    { label: "Words", value: words.toLocaleString() },
    { label: "Sentences", value: sentences.toLocaleString() },
    { label: "Paragraphs", value: paragraphs.toLocaleString() },
    { label: "Avg Word Length", value: avgWordLength },
    { label: "Reading Time", value: words === 0 ? "0s" : readingTime },
    { label: "Speaking Time", value: words === 0 ? "0s" : speakingTime },
  ];
}

export default function WordCounterPage() {
  const [text, setText] = useState("");

  const stats = analyzeText(text);

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
            <label className="text-sm font-medium text-brand-muted">
              Enter or paste your text
            </label>
            {text.length > 0 && (
              <button
                onClick={handleClear}
                className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-brand-muted hover:bg-white/10 hover:text-brand-text transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start typing or paste your text here..."
            rows={10}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-indigo/40 text-sm leading-relaxed resize-none transition-colors"
          />
        </div>

        {/* Statistics grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="glass rounded-2xl p-5 text-center"
            >
              <p className="text-2xl sm:text-3xl font-bold gradient-text">
                {stat.value}
              </p>
              <p className="text-sm text-brand-muted mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </ToolLayout>
  );
}
