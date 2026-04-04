"use client";

import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";

interface MatchResult {
  index: number;
  value: string;
  groups: string[];
}

const COMMON_PATTERNS = [
  { label: "Email", pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}" },
  { label: "URL", pattern: "https?:\\/\\/[^\\s]+" },
  { label: "Phone", pattern: "\\+?[\\d\\s-()]{7,15}" },
  { label: "IP Address", pattern: "\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}" },
  { label: "Date", pattern: "\\d{4}-\\d{2}-\\d{2}" },
];

export default function RegexTesterPage() {
  const [pattern, setPattern] = useState("");
  const [testString, setTestString] = useState("");
  const [flags, setFlags] = useState({ g: true, i: false, m: false, s: false });

  const toggleFlag = (flag: keyof typeof flags) => {
    setFlags((prev) => ({ ...prev, [flag]: !prev[flag] }));
  };

  const flagString = Object.entries(flags)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join("");

  const { regex, error } = useMemo(() => {
    if (!pattern) return { regex: null, error: "" };
    try {
      const r = new RegExp(pattern, flagString);
      return { regex: r, error: "" };
    } catch (e) {
      return { regex: null, error: e instanceof Error ? e.message : "Invalid regex" };
    }
  }, [pattern, flagString]);

  const matches: MatchResult[] = useMemo(() => {
    if (!regex || !testString) return [];
    const results: MatchResult[] = [];
    if (flags.g) {
      let match: RegExpExecArray | null;
      const r = new RegExp(regex.source, regex.flags);
      while ((match = r.exec(testString)) !== null) {
        results.push({
          index: match.index,
          value: match[0],
          groups: match.slice(1),
        });
        if (match[0].length === 0) r.lastIndex++;
      }
    } else {
      const match = regex.exec(testString);
      if (match) {
        results.push({
          index: match.index,
          value: match[0],
          groups: match.slice(1),
        });
      }
    }
    return results;
  }, [regex, testString, flags.g]);

  const highlightedText = useMemo(() => {
    if (!regex || !testString || matches.length === 0) return null;
    const parts: { text: string; isMatch: boolean }[] = [];
    let lastIndex = 0;
    for (const m of matches) {
      if (m.index > lastIndex) {
        parts.push({ text: testString.slice(lastIndex, m.index), isMatch: false });
      }
      parts.push({ text: m.value, isMatch: true });
      lastIndex = m.index + m.value.length;
    }
    if (lastIndex < testString.length) {
      parts.push({ text: testString.slice(lastIndex), isMatch: false });
    }
    return parts;
  }, [regex, testString, matches]);

  const clearAll = () => {
    setPattern("");
    setTestString("");
    setFlags({ g: true, i: false, m: false, s: false });
  };

  const insertPattern = (p: string) => {
    setPattern(p);
    toast.success("Pattern inserted!");
  };

  return (
    <ToolLayout
      toolName="Regex Tester"
      toolDescription="Test and debug regular expressions with live matching"
    >
      <div className="space-y-6">
        {/* Pattern Input */}
        <div className="glass rounded-xl p-6">
          <label className="block text-sm text-t-secondary mb-2">Pattern</label>
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder="Enter regex pattern..."
            spellCheck={false}
            className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-3 text-t-primary placeholder-t-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono"
          />

          {/* Flags */}
          <div className="flex items-center gap-4 mt-4">
            <span className="text-sm text-t-secondary">Flags:</span>
            {(["g", "i", "m", "s"] as const).map((flag) => (
              <label key={flag} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={flags[flag]}
                  onChange={() => toggleFlag(flag)}
                  className="sr-only"
                />
                <span
                  className={`px-3 py-1 rounded-lg text-sm font-mono font-medium transition-all ${
                    flags[flag]
                      ? "bg-accent text-white"
                      : "text-t-secondary hover:text-t-primary bg-bg-secondary border border-border"
                  }`}
                >
                  {flag}
                </span>
                <span className="text-xs text-t-tertiary">
                  {flag === "g" && "global"}
                  {flag === "i" && "case-insensitive"}
                  {flag === "m" && "multiline"}
                  {flag === "s" && "dotall"}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Common Patterns */}
        <div className="glass rounded-xl p-6">
          <label className="block text-sm text-t-secondary mb-3">Common Patterns</label>
          <div className="flex flex-wrap gap-2">
            {COMMON_PATTERNS.map((cp) => (
              <button
                key={cp.label}
                onClick={() => insertPattern(cp.pattern)}
                className="px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors text-sm"
              >
                {cp.label}
              </button>
            ))}
          </div>
        </div>

        {/* Test String */}
        <div className="glass rounded-xl p-6">
          <label className="block text-sm text-t-secondary mb-2">Test String</label>
          <textarea
            value={testString}
            onChange={(e) => setTestString(e.target.value)}
            placeholder="Enter test string..."
            rows={8}
            spellCheck={false}
            className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-3 text-t-primary placeholder-t-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono"
          />
        </div>

        {/* Clear Button */}
        <div className="flex justify-end">
          <button
            onClick={clearAll}
            className="px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="glass rounded-xl p-4 border border-red-500/20 bg-red-500/5">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-400">Invalid Regular Expression</p>
                <p className="text-xs text-red-400/70 mt-1 font-mono">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {pattern && testString && !error && (
          <div className="space-y-4">
            {/* Match Count */}
            <div className="glass rounded-xl p-4">
              <p className="text-sm text-t-secondary">
                Matches found:{" "}
                <span className="text-t-primary font-semibold">{matches.length}</span>
              </p>
            </div>

            {/* Highlighted Text */}
            {highlightedText && (
              <div className="glass rounded-xl p-6">
                <label className="block text-sm text-t-secondary mb-2">Highlighted Matches</label>
                <div className="bg-bg-secondary border border-border rounded-lg px-4 py-3 font-mono text-sm whitespace-pre-wrap break-all">
                  {highlightedText.map((part, i) =>
                    part.isMatch ? (
                      <span
                        key={i}
                        className="bg-indigo-500/30 text-indigo-300 border-b-2 border-indigo-400 rounded-sm px-0.5"
                      >
                        {part.text}
                      </span>
                    ) : (
                      <span key={i} className="text-t-primary">{part.text}</span>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Match List */}
            {matches.length > 0 && (
              <div className="glass rounded-xl p-6">
                <label className="block text-sm text-t-secondary mb-3">Match Details</label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {matches.map((m, i) => (
                    <div
                      key={i}
                      className="bg-bg-secondary border border-border rounded-lg px-4 py-2 text-sm"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-t-tertiary">#{i + 1}</span>
                        <span className="text-t-tertiary">Index: {m.index}</span>
                        <span className="text-t-primary font-mono">&quot;{m.value}&quot;</span>
                      </div>
                      {m.groups.length > 0 && (
                        <div className="mt-1 ml-8 text-xs text-t-tertiary">
                          Groups:{" "}
                          {m.groups.map((g, gi) => (
                            <span key={gi} className="text-t-secondary font-mono mr-2">
                              ${gi + 1}=&quot;{g}&quot;
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
