"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  text: string;
  oldLineNum?: number;
  newLineNum?: number;
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split("\n");
  const newLines = newText.split("\n");

  const n = oldLines.length;
  const m = newLines.length;

  // Cap at 1000 lines for performance
  if (n > 1000 || m > 1000) {
    return [
      {
        type: "removed",
        text: `[Input too large: ${n} / ${m} lines. Max 1000 lines per side.]`,
      },
    ];
  }

  // Build LCS table using O(n*m) DP
  const dp: number[][] = Array.from({ length: n + 1 }, () =>
    Array(m + 1).fill(0)
  );

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to produce diff
  const result: DiffLine[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.push({
        type: "unchanged",
        text: oldLines[i - 1],
        oldLineNum: i,
        newLineNum: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({
        type: "added",
        text: newLines[j - 1],
        newLineNum: j,
      });
      j--;
    } else {
      result.push({
        type: "removed",
        text: oldLines[i - 1],
        oldLineNum: i,
      });
      i--;
    }
  }

  return result.reverse();
}

export default function DiffCheckerPage() {
  const [originalText, setOriginalText] = useState("");
  const [modifiedText, setModifiedText] = useState("");
  const [diffResult, setDiffResult] = useState<DiffLine[] | null>(null);

  const handleCompare = () => {
    if (!originalText && !modifiedText) {
      toast.error("Please enter text in at least one field");
      return;
    }
    const result = computeDiff(originalText, modifiedText);
    setDiffResult(result);
    toast.success("Comparison complete!");
  };

  const handleSwap = () => {
    setOriginalText(modifiedText);
    setModifiedText(originalText);
    setDiffResult(null);
    toast.success("Texts swapped");
  };

  const handleClear = () => {
    setOriginalText("");
    setModifiedText("");
    setDiffResult(null);
  };

  const additions = diffResult?.filter((l) => l.type === "added").length ?? 0;
  const deletions = diffResult?.filter((l) => l.type === "removed").length ?? 0;
  const unchanged =
    diffResult?.filter((l) => l.type === "unchanged").length ?? 0;

  return (
    <ToolLayout
      toolName="Diff Checker"
      toolDescription="Compare two texts and highlight differences"
    >
      <div className="space-y-6">
        {/* Text inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass rounded-xl p-6">
            <label className="block text-sm font-medium text-t-secondary mb-2">
              Original Text
            </label>
            <textarea
              value={originalText}
              onChange={(e) => {
                setOriginalText(e.target.value);
                setDiffResult(null);
              }}
              placeholder="Paste your original text here..."
              rows={12}
              spellCheck={false}
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-3 text-t-primary placeholder-t-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono text-sm resize-y"
            />
          </div>

          <div className="glass rounded-xl p-6">
            <label className="block text-sm font-medium text-t-secondary mb-2">
              Modified Text
            </label>
            <textarea
              value={modifiedText}
              onChange={(e) => {
                setModifiedText(e.target.value);
                setDiffResult(null);
              }}
              placeholder="Paste your modified text here..."
              rows={12}
              spellCheck={false}
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-3 text-t-primary placeholder-t-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono text-sm resize-y"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCompare}
            className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg transition-all"
          >
            Compare
          </button>
          <button
            onClick={handleSwap}
            className="px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors"
          >
            Swap
          </button>
          <button
            onClick={handleClear}
            className="px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Results */}
        {diffResult && (
          <div className="space-y-4">
            {/* Statistics */}
            <div className="glass rounded-xl p-6">
              <div className="flex flex-wrap gap-6 text-sm">
                <span className="text-green-400 font-medium">
                  +{additions} addition{additions !== 1 ? "s" : ""}
                </span>
                <span className="text-red-400 font-medium">
                  -{deletions} deletion{deletions !== 1 ? "s" : ""}
                </span>
                <span className="text-t-secondary">
                  {unchanged} unchanged
                </span>
              </div>
            </div>

            {/* Diff output */}
            <div className="glass rounded-xl p-6">
              <h3 className="text-sm font-medium text-t-secondary mb-4">
                Diff Output
              </h3>
              <div className="rounded-lg overflow-hidden border border-border">
                {diffResult.length === 0 ? (
                  <div className="px-4 py-8 text-center text-t-secondary text-sm">
                    Both texts are empty.
                  </div>
                ) : additions === 0 && deletions === 0 ? (
                  <div className="px-4 py-8 text-center text-t-secondary text-sm">
                    No differences found. The texts are identical.
                  </div>
                ) : (
                  <div className="divide-y divide-border text-sm font-mono overflow-x-auto">
                    {diffResult.map((line, idx) => (
                      <div
                        key={idx}
                        className={`flex ${
                          line.type === "added"
                            ? "bg-green-500/10 border-l-2 border-green-500"
                            : line.type === "removed"
                            ? "bg-red-500/10 border-l-2 border-red-500"
                            : "bg-bg-secondary/50 border-l-2 border-transparent"
                        }`}
                      >
                        {/* Line numbers */}
                        <div className="flex-shrink-0 w-10 text-right pr-2 py-1 text-t-tertiary select-none text-xs leading-6">
                          {line.oldLineNum ?? ""}
                        </div>
                        <div className="flex-shrink-0 w-10 text-right pr-2 py-1 text-t-tertiary select-none text-xs leading-6">
                          {line.newLineNum ?? ""}
                        </div>

                        {/* Prefix */}
                        <div
                          className={`flex-shrink-0 w-6 text-center py-1 select-none leading-6 ${
                            line.type === "added"
                              ? "text-green-400"
                              : line.type === "removed"
                              ? "text-red-400"
                              : "text-t-tertiary"
                          }`}
                        >
                          {line.type === "added"
                            ? "+"
                            : line.type === "removed"
                            ? "-"
                            : " "}
                        </div>

                        {/* Content */}
                        <div className="flex-1 py-1 pr-4 text-t-primary leading-6 whitespace-pre">
                          {line.text}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
