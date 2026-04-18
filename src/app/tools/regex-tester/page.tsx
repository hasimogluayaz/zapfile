"use client";

import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

interface MatchResult {
  index: number;
  value: string;
  groups: string[];
}

const COMMON_PATTERN_DEFS = [
  {
    labelKey: "regex.email",
    pattern: "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}",
  },
  { labelKey: "regex.url", pattern: "https?:\\/\\/[^\\s]+" },
  { labelKey: "regex.phone", pattern: "\\+?[\\d\\s-()]{7,15}" },
  {
    labelKey: "regex.ipAddress",
    pattern: "\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}",
  },
  { labelKey: "regex.date", pattern: "\\d{4}-\\d{2}-\\d{2}" },
];

const GROUP_COLORS = [
  {
    bg: "bg-indigo-500/30",
    text: "text-indigo-300",
    border: "border-indigo-400",
    dot: "bg-indigo-400",
  },
  {
    bg: "bg-emerald-500/30",
    text: "text-emerald-300",
    border: "border-emerald-400",
    dot: "bg-emerald-400",
  },
  {
    bg: "bg-amber-500/30",
    text: "text-amber-300",
    border: "border-amber-400",
    dot: "bg-amber-400",
  },
  {
    bg: "bg-rose-500/30",
    text: "text-rose-300",
    border: "border-rose-400",
    dot: "bg-rose-400",
  },
  {
    bg: "bg-cyan-500/30",
    text: "text-cyan-300",
    border: "border-cyan-400",
    dot: "bg-cyan-400",
  },
  {
    bg: "bg-purple-500/30",
    text: "text-purple-300",
    border: "border-purple-400",
    dot: "bg-purple-400",
  },
];

export default function RegexTesterPage() {
  const { t } = useI18n();
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
      return {
        regex: null,
        error: e instanceof Error ? e.message : "Invalid regex",
      };
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

  // Build highlighted parts with capture group sub-highlighting
  const highlightedParts = useMemo(() => {
    if (!regex || !testString || matches.length === 0) return null;

    // Re-run regex to get full match objects with group spans
    const parts: { text: string; isMatch: boolean; groupIndex?: number }[] = [];
    let lastIndex = 0;

    const r = new RegExp(
      regex.source,
      regex.flags.includes("g") ? regex.flags : regex.flags + "g",
    );
    let match: RegExpExecArray | null;
    const allMatches: RegExpExecArray[] = [];
    while ((match = r.exec(testString)) !== null) {
      allMatches.push(match);
      if (match[0].length === 0) r.lastIndex++;
      if (!flags.g) break;
    }

    for (const m of allMatches) {
      // Text before match
      if (m.index > lastIndex) {
        parts.push({
          text: testString.slice(lastIndex, m.index),
          isMatch: false,
        });
      }

      // If match has groups, highlight each group within the match
      if (m.length > 1) {
        // Find group positions within the match
        const matchStr = m[0];
        let innerOffset = 0;
        const groupParts: {
          text: string;
          isMatch: boolean;
          groupIndex?: number;
        }[] = [];

        for (let gi = 1; gi < m.length; gi++) {
          if (m[gi] === undefined) continue;
          const groupVal = m[gi];
          const groupPos = matchStr.indexOf(groupVal, innerOffset);
          if (groupPos === -1) continue;

          // Text before this group (still part of match)
          if (groupPos > innerOffset) {
            groupParts.push({
              text: matchStr.slice(innerOffset, groupPos),
              isMatch: true,
            });
          }
          // The group itself
          groupParts.push({
            text: groupVal,
            isMatch: true,
            groupIndex: gi - 1,
          });
          innerOffset = groupPos + groupVal.length;
        }
        // Remaining match text after all groups
        if (innerOffset < matchStr.length) {
          groupParts.push({ text: matchStr.slice(innerOffset), isMatch: true });
        }

        if (groupParts.length === 0) {
          parts.push({ text: m[0], isMatch: true });
        } else {
          parts.push(...groupParts);
        }
      } else {
        parts.push({ text: m[0], isMatch: true });
      }

      lastIndex = m.index + m[0].length;
    }

    if (lastIndex < testString.length) {
      parts.push({ text: testString.slice(lastIndex), isMatch: false });
    }
    return parts;
  }, [regex, testString, matches, flags.g]);

  const clearAll = () => {
    setPattern("");
    setTestString("");
    setFlags({ g: true, i: false, m: false, s: false });
  };

  const insertPattern = (p: string) => {
    setPattern(p);
    toast.success(t("regex.inserted"));
  };

  return (
    <ToolLayout
      toolName="Regex Tester"
      toolDescription="Test and debug regular expressions with live matching"
    >
      <div className="space-y-6">
        {/* Pattern Input */}
        <div className="glass rounded-xl p-6">
          <label className="block text-sm text-t-secondary mb-2">
            {t("regex.pattern")}
          </label>
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            placeholder={t("regex.enterPattern")}
            spellCheck={false}
            className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-3 text-t-primary placeholder-t-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono"
          />

          {/* Flags */}
          <div className="flex items-center gap-4 mt-4">
            <span className="text-sm text-t-secondary">{t("regex.flags")}</span>
            {(["g", "i", "m", "s"] as const).map((flag) => (
              <label
                key={flag}
                className="flex items-center gap-1.5 cursor-pointer"
              >
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
                  {flag === "g" && t("regex.global")}
                  {flag === "i" && t("regex.caseInsensitive")}
                  {flag === "m" && t("regex.multiline")}
                  {flag === "s" && t("regex.dotall")}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Common Patterns */}
        <div className="glass rounded-xl p-6">
          <label className="block text-sm text-t-secondary mb-3">
            {t("regex.commonPatterns")}
          </label>
          <div className="flex flex-wrap gap-2">
            {COMMON_PATTERN_DEFS.map((cp) => (
              <button
                key={cp.labelKey}
                onClick={() => insertPattern(cp.pattern)}
                className="px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors text-sm"
              >
                {t(cp.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Test String */}
        <div className="glass rounded-xl p-6">
          <label className="block text-sm text-t-secondary mb-2">
            {t("regex.testString")}
          </label>
          <textarea
            value={testString}
            onChange={(e) => setTestString(e.target.value)}
            placeholder={t("regex.enterTest")}
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
            {t("ui.clear")}
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="glass rounded-xl p-4 border border-red-500/20 bg-red-500/5">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-400 mt-0.5 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-red-400">
                  {t("regex.invalid")}
                </p>
                <p className="text-xs text-red-400/70 mt-1 font-mono">
                  {error}
                </p>
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
                {t("regex.matchesFound")}{" "}
                <span className="text-t-primary font-semibold">
                  {matches.length}
                </span>
              </p>
            </div>

            {/* Highlighted Text */}
            {highlightedParts && (
              <div className="glass rounded-xl p-6">
                <label className="block text-sm text-t-secondary mb-2">
                  {t("regex.highlighted")}
                </label>
                <div className="bg-bg-secondary border border-border rounded-lg px-4 py-3 font-mono text-sm whitespace-pre-wrap break-all">
                  {highlightedParts.map((part, i) => {
                    if (!part.isMatch) {
                      return (
                        <span key={i} className="text-t-primary">
                          {part.text}
                        </span>
                      );
                    }
                    if (part.groupIndex !== undefined) {
                      const gc =
                        GROUP_COLORS[part.groupIndex % GROUP_COLORS.length];
                      return (
                        <span
                          key={i}
                          className={`${gc.bg} ${gc.text} border-b-2 ${gc.border} rounded-sm px-0.5`}
                          title={t("regex.groupN", { n: part.groupIndex + 1 })}
                        >
                          {part.text}
                        </span>
                      );
                    }
                    return (
                      <span
                        key={i}
                        className="bg-indigo-500/30 text-indigo-300 border-b-2 border-indigo-400 rounded-sm px-0.5"
                      >
                        {part.text}
                      </span>
                    );
                  })}
                </div>

                {/* Group legend */}
                {matches.some((m) => m.groups.length > 0) && (
                  <div className="mt-3 flex flex-wrap gap-3">
                    {matches[0].groups.map((_, gi) => {
                      const gc = GROUP_COLORS[gi % GROUP_COLORS.length];
                      return (
                        <div
                          key={gi}
                          className="flex items-center gap-1.5 text-xs text-t-tertiary"
                        >
                          <span className={`w-3 h-3 rounded-sm ${gc.dot}`} />
                          <span>{t("regex.groupN", { n: gi + 1 })}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Match List */}
            {matches.length > 0 && (
              <div className="glass rounded-xl p-6">
                <label className="block text-sm text-t-secondary mb-3">
                  {t("regex.matchDetails")}
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {matches.map((m, i) => (
                    <div
                      key={i}
                      className="bg-bg-secondary border border-border rounded-lg px-4 py-2 text-sm"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-t-tertiary">#{i + 1}</span>
                        <span className="text-t-tertiary">
                          Index: {m.index}
                        </span>
                        <span className="text-t-primary font-mono">
                          &quot;{m.value}&quot;
                        </span>
                      </div>
                      {m.groups.length > 0 && (
                        <div className="mt-1 ml-8 text-xs text-t-tertiary flex flex-wrap gap-2">
                          {t("regex.groups")}{" "}
                          {m.groups.map((g, gi) => {
                            const gc = GROUP_COLORS[gi % GROUP_COLORS.length];
                            return (
                              <span
                                key={gi}
                                className="inline-flex items-center gap-1"
                              >
                                <span
                                  className={`w-2 h-2 rounded-sm ${gc.dot}`}
                                />
                                <span className="text-t-secondary font-mono">
                                  ${gi + 1}=&quot;{g}&quot;
                                </span>
                              </span>
                            );
                          })}
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
