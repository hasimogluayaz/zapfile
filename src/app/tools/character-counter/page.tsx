"use client";

import { useState, useMemo } from "react";
import ToolLayout from "@/components/ToolLayout";

interface PlatformLimit {
  name: string;
  limit: number;
  color: string;
}

const PLATFORMS: PlatformLimit[] = [
  { name: "Twitter / X", limit: 280, color: "#1DA1F2" },
  { name: "Instagram Caption", limit: 2200, color: "#E1306C" },
  { name: "LinkedIn Post", limit: 3000, color: "#0077B5" },
  { name: "Facebook Post", limit: 63206, color: "#1877F2" },
  { name: "SMS (1 message)", limit: 160, color: "#22c55e" },
];

function getSmsCount(chars: number): string {
  if (chars === 0) return "0 SMS";
  const msgs = Math.ceil(chars / 160);
  return `${msgs} SMS (${chars} chars)`;
}

export default function CharacterCounterPage() {
  const [text, setText] = useState("");

  const stats = useMemo(() => {
    const chars = text.length;
    const charsNoSpaces = text.replace(/\s/g, "").length;
    const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
    const lines = text === "" ? 0 : text.split("\n").length;
    const sentences =
      text.trim() === ""
        ? 0
        : text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length;
    const paragraphs =
      text.trim() === ""
        ? 0
        : text.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length;
    return { chars, charsNoSpaces, words, lines, sentences, paragraphs };
  }, [text]);

  const statItems = [
    { label: "Characters", value: stats.chars },
    { label: "Characters (no spaces)", value: stats.charsNoSpaces },
    { label: "Words", value: stats.words },
    { label: "Lines", value: stats.lines },
    { label: "Sentences", value: stats.sentences },
    { label: "Paragraphs", value: stats.paragraphs },
  ];

  return (
    <ToolLayout
      toolName="Character Counter"
      toolDescription="Count characters, words, lines and check platform limits in real-time"
    >
      <div className="space-y-6">
        {/* Textarea */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-t-secondary">Your Text</label>
            {text.length > 0 && (
              <button
                onClick={() => setText("")}
                className="px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors text-sm"
              >
                Clear
              </button>
            )}
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Start typing or paste your text here..."
            rows={8}
            className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border text-t-primary focus:outline-none focus:border-accent/50 resize-y placeholder:text-t-tertiary font-mono text-sm"
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {statItems.map((item) => (
            <div key={item.label} className="glass rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-t-primary font-mono">
                {item.value.toLocaleString()}
              </div>
              <div className="text-xs text-t-tertiary mt-1">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Platform Limits */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-sm font-semibold text-t-primary mb-4">Platform Limits</h3>
          <div className="space-y-4">
            {PLATFORMS.map((platform) => {
              const used = stats.chars;
              const pct = Math.min((used / platform.limit) * 100, 100);
              const over = used > platform.limit;
              const remaining = platform.limit - used;

              return (
                <div key={platform.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-t-secondary">{platform.name}</span>
                    <span
                      className={`text-sm font-mono font-semibold ${
                        over ? "text-red-400" : "text-green-400"
                      }`}
                    >
                      {over
                        ? `${Math.abs(remaining).toLocaleString()} over`
                        : platform.name === "SMS (1 message)"
                        ? getSmsCount(used)
                        : `${used.toLocaleString()} / ${platform.limit.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: over ? "#ef4444" : platform.color,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-t-tertiary">
                      {Math.round(pct)}% used
                    </span>
                    <span className="text-xs text-t-tertiary">
                      Limit: {platform.limit.toLocaleString()}
                    </span>
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
