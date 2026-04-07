"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";
import { computeDiff, type DiffLine } from "@/lib/diff-core";

export default function DiffCheckerPage() {
  const { t } = useI18n();
  const workerRef = useRef<Worker | null>(null);
  const [originalText, setOriginalText] = useState("");
  const [modifiedText, setModifiedText] = useState("");
  const [diffResult, setDiffResult] = useState<DiffLine[] | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../../../workers/diff.worker.ts", import.meta.url),
    );
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const applyDiffResult = (result: DiffLine[]) => {
    setDiffResult(result);
    toast.success(t("diff.complete"));
  };

  const handleCompare = () => {
    if (!originalText && !modifiedText) {
      toast.error(t("diff.enterText"));
      return;
    }

    const runMain = () => applyDiffResult(computeDiff(originalText, modifiedText));

    const w = workerRef.current;
    if (!w) {
      runMain();
      return;
    }

    setIsComparing(true);

    const onMessage = (ev: MessageEvent) => {
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      const payload = ev.data as
        | { ok: true; diffResult: DiffLine[] }
        | { ok: false; error?: string };
      setIsComparing(false);
      if (payload.ok) {
        applyDiffResult(payload.diffResult);
      } else {
        runMain();
      }
    };

    const onError = () => {
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      setIsComparing(false);
      runMain();
    };

    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);
    w.postMessage({ original: originalText, modified: modifiedText });
  };

  const handleSwap = () => {
    setOriginalText(modifiedText);
    setModifiedText(originalText);
    setDiffResult(null);
    toast.success(t("diff.swapped"));
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
              {t("diff.original")}
            </label>
            <textarea
              value={originalText}
              onChange={(e) => {
                setOriginalText(e.target.value);
                setDiffResult(null);
              }}
              placeholder={t("diff.pasteOriginal")}
              rows={12}
              spellCheck={false}
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-3 text-t-primary placeholder-t-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono text-sm resize-y"
            />
          </div>

          <div className="glass rounded-xl p-6">
            <label className="block text-sm font-medium text-t-secondary mb-2">
              {t("diff.modified")}
            </label>
            <textarea
              value={modifiedText}
              onChange={(e) => {
                setModifiedText(e.target.value);
                setDiffResult(null);
              }}
              placeholder={t("diff.pasteModified")}
              rows={12}
              spellCheck={false}
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-3 text-t-primary placeholder-t-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono text-sm resize-y"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleCompare}
            disabled={isComparing}
            className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isComparing ? t("diff.comparing") : t("ui.compare")}
          </button>
          <button
            type="button"
            onClick={handleSwap}
            disabled={isComparing}
            className="px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors disabled:opacity-50"
          >
            {t("ui.swap")}
          </button>
          <button
            type="button"
            onClick={handleClear}
            disabled={isComparing}
            className="px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors disabled:opacity-50"
          >
            {t("ui.clear")}
          </button>
        </div>

        {/* Results */}
        {diffResult && (
          <div className="space-y-4">
            {/* Statistics */}
            <div className="glass rounded-xl p-6">
              <div className="flex flex-wrap gap-6 text-sm">
                <span className="text-green-400 font-medium">
                  +{additions}{" "}
                  {additions !== 1 ? t("diff.additions") : t("diff.addition")}
                </span>
                <span className="text-red-400 font-medium">
                  -{deletions}{" "}
                  {deletions !== 1 ? t("diff.deletions") : t("diff.deletion")}
                </span>
                <span className="text-t-secondary">
                  {unchanged} {t("diff.unchanged")}
                </span>
              </div>
            </div>

            {/* Diff output */}
            <div className="glass rounded-xl p-6">
              <h3 className="text-sm font-medium text-t-secondary mb-4">
                {t("diff.output")}
              </h3>
              <div className="rounded-lg overflow-hidden border border-border">
                {diffResult.length === 0 ? (
                  <div className="px-4 py-8 text-center text-t-secondary text-sm">
                    {t("diff.empty")}
                  </div>
                ) : additions === 0 && deletions === 0 ? (
                  <div className="px-4 py-8 text-center text-t-secondary text-sm">
                    {t("diff.identical")}
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
