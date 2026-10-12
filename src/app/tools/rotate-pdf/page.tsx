"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import toast from "react-hot-toast";
import { Check, FileText, RotateCcw, RotateCw, Undo2, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import { buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { pdfInputErrorKey, toEditablePdf } from "@/lib/pdf-input";
import { useI18n } from "@/lib/i18n";
import { PdfPageThumb, usePdfThumbnailer } from "@/lib/pdf-thumb-view";
import { compactPages, formatPageRanges, pagesInRanges, parsePageRanges } from "@/lib/split-pdf-ranges";
import { runWorkerTask } from "../merge-pdf/worker-task";

const THUMB_BOX = 140;

const norm = (deg: number) => (((deg % 360) + 360) % 360) as 0 | 90 | 180 | 270;

export default function RotatePdfPage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [opening, setOpening] = useState(false);
  /** Clockwise degrees added per page (index = page - 1). Unbounded so CSS turns the short way. */
  const [turns, setTurns] = useState<number[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [rangeText, setRangeText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ blob: Blob; name: string; key: string } | null>(null);
  const [gridEl, setGridEl] = useState<HTMLDivElement | null>(null);
  const anchorRef = useRef<number | null>(null);
  const runRef = useRef<AbortController | null>(null);

  const thumbState = usePdfThumbnailer(file);
  const thumbs = thumbState.thumbs;
  const pageCount = thumbs?.pageCount ?? 0;

  useEffect(() => () => runRef.current?.abort(), []);

  useEffect(() => {
    if (thumbState.status === "error") {
      console.error(thumbState.error);
      toast.error(t("rotpdf.loadFail"));
      setFile(null);
    } else if (thumbState.status === "ready") {
      setTurns(new Array(thumbState.thumbs.pageCount).fill(0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumbState.status]);

  const handleFileSelected = useCallback(
    async (files: File[]) => {
      const picked = files[0];
      if (!picked) return;
      setOpening(true);
      try {
        const editable = await toEditablePdf(picked);
        runRef.current?.abort();
        runRef.current = null;
        setProcessing(false);
        setFile(editable);
        setTurns([]);
        setSelected(new Set());
        setRangeText("");
        setResult(null);
        setProgress(0);
        anchorRef.current = null;
      } catch (error) {
        console.error(error);
        toast.error(t(pdfInputErrorKey(error)));
      } finally {
        setOpening(false);
      }
    },
    [t],
  );

  const handleReset = () => {
    runRef.current?.abort();
    runRef.current = null;
    setProcessing(false);
    setFile(null);
    setTurns([]);
    setSelected(new Set());
    setRangeText("");
    setResult(null);
    setProgress(0);
  };

  // ── Selection (text ↔ grid) ──────────────────────────────────
  const parsed = useMemo(
    () => parsePageRanges(rangeText, pageCount, { keywords: true }),
    [rangeText, pageCount],
  );

  const onRangeChange = (text: string) => {
    setRangeText(text);
    anchorRef.current = null;
    const p = parsePageRanges(text, pageCount, { keywords: true });
    if (!p.error) setSelected(pagesInRanges(p.ranges));
  };

  const commitSelection = (next: Set<number>) => {
    setSelected(next);
    setRangeText(formatPageRanges(compactPages(next)));
  };

  const onTileClick = (p: number, e: ReactMouseEvent) => {
    const next = new Set(selected);
    const anchor = anchorRef.current;
    if (e.shiftKey && anchor !== null) {
      const [a, b] = anchor < p ? [anchor, p] : [p, anchor];
      for (let i = a; i <= b; i++) next.add(i);
    } else if (next.has(p)) next.delete(p);
    else next.add(p);
    anchorRef.current = p;
    commitSelection(next);
  };

  const quickSelect = (kind: "all" | "odd" | "even" | "clear") => {
    anchorRef.current = null;
    if (kind === "clear") {
      setSelected(new Set());
      setRangeText("");
      return;
    }
    const next = new Set<number>();
    for (let p = 1; p <= pageCount; p++) {
      if (kind === "all" || (kind === "odd" && p % 2 === 1) || (kind === "even" && p % 2 === 0)) next.add(p);
    }
    commitSelection(next);
  };

  // ── Rotation ────────────────────────────────────────────────
  const rotatePages = (pages: number[] | null, delta: number) => {
    setTurns((prev) => {
      const next = [...prev];
      if (pages === null) for (let i = 0; i < next.length; i++) next[i] += delta;
      else for (const p of pages) if (p >= 1 && p <= next.length) next[p - 1] += delta;
      return next;
    });
  };

  const targets = selected.size > 0 ? Array.from(selected) : null;
  const changed = turns.reduce((n, d) => n + (norm(d) !== 0 ? 1 : 0), 0);
  const deltas = turns.map(norm);
  const settingsKey = deltas.join(",");
  const currentResult = result && result.key === settingsKey ? result : null;

  const handleProcess = async () => {
    if (!file || changed === 0) return;
    const ac = new AbortController();
    runRef.current?.abort();
    runRef.current = ac;
    const key = settingsKey;
    const snapshot = [...deltas];
    setProcessing(true);
    setProgress(0);
    setResult(null);
    try {
      const bytes = await file.arrayBuffer();
      if (ac.signal.aborted) return;
      const res = await runWorkerTask(
        () => new Worker(new URL("./rotate.worker.ts", import.meta.url), { type: "module" }),
        { bytes, deltas: snapshot },
        [bytes],
        (v) => runRef.current === ac && setProgress(Math.round(v * 100)),
        ac.signal,
      );
      if (runRef.current !== ac) return;
      setProgress(100);
      setResult({
        blob: new Blob([res.bytes as BlobPart], { type: "application/pdf" }),
        name: `${getFileNameWithoutExtension(file.name)}_rotated.pdf`,
        key,
      });
      toast.success(t("rotpdf.v2.success", { n: snapshot.filter((d) => d !== 0).length }));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error(error);
      toast.error(t("rotpdf.fail"));
    } finally {
      if (runRef.current === ac) {
        runRef.current = null;
        setProcessing(false);
      }
    }
  };

  const cancel = () => {
    runRef.current?.abort();
    runRef.current = null;
    setProcessing(false);
    setProgress(0);
  };

  const scopeText =
    targets === null
      ? t("rotpdf.v2.scopeAll", { n: pageCount })
      : targets.length === 1
        ? t("rotpdf.v2.scopeOne")
        : t("rotpdf.v2.scopeSelected", { n: targets.length });

  const chip =
    "inline-flex min-h-9 items-center rounded-lg border border-border bg-bg-secondary px-3 text-xs font-medium text-t-secondary transition-colors hover:border-accent/40 hover:text-t-primary";
  const iconBtn =
    "flex h-9 w-9 items-center justify-center rounded-lg text-t-secondary transition-colors hover:bg-bg-tertiary hover:text-t-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent";

  return (
    <ToolLayout
      toolName="Rotate PDF"
      toolDescription="Rotate PDF pages by 90, 180, or 270 degrees clockwise. Rotate all pages at once or select specific pages."
    >
      <div className="space-y-6">
        {!file ? (
          <>
            <FileDropzone
              onFilesSelected={handleFileSelected}
              accept={{ "application/pdf": [".pdf"] }}
              multiple={false}
              label={t("rotatepdf.ui.dropLabel")}
              formats={["pdf"]}
            />
            {opening && <p className="text-sm text-t-secondary">{t("splitpdf.v2.reading")}</p>}
          </>
        ) : (
          <div className="glass rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-bg-secondary">
                  <FileText className="h-5 w-5 text-t-secondary" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-t-primary" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-t-secondary tabular-nums">
                    {formatFileSize(file.size)}
                    {pageCount > 0 && (
                      <>
                        {" "}
                        &middot;{" "}
                        {pageCount !== 1
                          ? t("rotatepdf.ui.pageCountOther", { n: pageCount })
                          : t("rotatepdf.ui.pageCountOne", { n: pageCount })}
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm text-t-secondary transition-colors hover:bg-bg-secondary hover:text-t-primary"
              >
                <X className="h-4 w-4" aria-hidden />
                {t("rotpdf.changeFile")}
              </button>
            </div>

            {thumbState.status === "loading" && (
              <p className="mt-4 text-sm text-t-secondary">{t("split.thumbsLoading")}</p>
            )}

            {pageCount > 0 && (
              <fieldset disabled={processing} className="mt-5 min-w-0 space-y-4 border-t border-border pt-5">
                {/* Rotate toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => rotatePages(targets, -90)} className={buttonSecondary}>
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    {t("rotpdf.v2.left")}
                  </button>
                  <button type="button" onClick={() => rotatePages(targets, 90)} className={buttonSecondary}>
                    <RotateCw className="h-4 w-4" aria-hidden />
                    {t("rotpdf.v2.right")}
                  </button>
                  <button type="button" onClick={() => rotatePages(targets, 180)} className={buttonSecondary}>
                    {t("rotpdf.180")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTurns((prev) => prev.map(() => 0))}
                    disabled={changed === 0}
                    className={buttonSecondary}
                  >
                    <Undo2 className="h-4 w-4" aria-hidden />
                    {t("ui.reset")}
                  </button>
                  <p className="w-full text-[13px] text-t-secondary" aria-live="polite">
                    {scopeText}
                  </p>
                </div>

                {/* Selection */}
                <div className="space-y-2">
                  <label htmlFor="rotateRange" className={sectionTitle}>
                    {t("rotpdf.v2.selectLabel")}
                  </label>
                  <input
                    id="rotateRange"
                    type="text"
                    autoComplete="off"
                    value={rangeText}
                    onChange={(e) => onRangeChange(e.target.value)}
                    placeholder={t("rotatepdf.ui.rangePlaceholder")}
                    aria-invalid={Boolean(parsed.error)}
                    aria-describedby="rotate-range-help"
                    className={`w-full rounded-xl border bg-bg-secondary px-4 py-3 text-t-primary placeholder:text-t-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                      parsed.error ? "border-red-500/70" : "border-border"
                    }`}
                  />
                  <p
                    id="rotate-range-help"
                    role={parsed.error ? "alert" : undefined}
                    className={`text-xs ${parsed.error ? "text-red-600 dark:text-red-400" : "text-t-tertiary"}`}
                  >
                    {parsed.error ? t(parsed.error.key, parsed.error.params) : t("rotpdf.v2.selectHint")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={chip} onClick={() => quickSelect("all")}>
                      {t("rotatepdf.ui.quickAll")}
                    </button>
                    {pageCount > 1 && (
                      <>
                        <button type="button" className={chip} onClick={() => quickSelect("odd")}>
                          {t("rotatepdf.ui.quickOdd")}
                        </button>
                        <button type="button" className={chip} onClick={() => quickSelect("even")}>
                          {t("rotatepdf.ui.quickEven")}
                        </button>
                      </>
                    )}
                    {selected.size > 0 && (
                      <button type="button" className={chip} onClick={() => quickSelect("clear")}>
                        {t("ui.clear")}
                      </button>
                    )}
                  </div>
                </div>

                {/* Page grid */}
                <div
                  ref={setGridEl}
                  className="max-h-[min(72vh,680px)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-bg-secondary/50 p-2 sm:p-3"
                >
                  <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 sm:grid-cols-4 sm:gap-3 md:grid-cols-5">
                    {Array.from({ length: pageCount }, (_, i) => {
                      const p = i + 1;
                      const turn = turns[i] ?? 0;
                      const delta = norm(turn);
                      const on = selected.has(p);
                      return (
                        <div
                          key={p}
                          className={`relative rounded-lg border-2 p-1 transition-colors ${
                            on ? "border-accent" : "border-transparent"
                          }`}
                        >
                          <button
                            type="button"
                            aria-pressed={on}
                            aria-label={
                              delta
                                ? t("rotpdf.v2.pageRotated", { n: p, deg: delta })
                                : t("split.pageLabel", { n: p })
                            }
                            onClick={(e) => onTileClick(p, e)}
                            className="block w-full rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                          >
                            <PdfPageThumb
                              thumbs={thumbs}
                              page={p}
                              box={THUMB_BOX}
                              root={gridEl}
                              className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md bg-surface"
                              imgClassName="h-full w-full object-contain transition-transform duration-200 ease-out motion-reduce:transition-none"
                              imgStyle={{ transform: `rotate(${turn}deg)` }}
                              placeholder={<span className="text-xs text-t-tertiary tabular-nums">{p}</span>}
                            />
                          </button>
                          {on && (
                            <span className="pointer-events-none absolute start-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-on-accent">
                              <Check className="h-3.5 w-3.5" aria-hidden />
                            </span>
                          )}
                          {delta !== 0 && (
                            <span className="pointer-events-none absolute end-2 top-2 rounded-full border border-border bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-t-primary shadow-sm tabular-nums">
                              +{delta}°
                            </span>
                          )}
                          <div className="mt-1 flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => rotatePages([p], -90)}
                              aria-label={t("rotpdf.v2.pageLeft", { n: p })}
                              className={iconBtn}
                            >
                              <RotateCcw className="h-4 w-4" aria-hidden />
                            </button>
                            <span className="text-[11px] text-t-secondary tabular-nums">{p}</span>
                            <button
                              type="button"
                              onClick={() => rotatePages([p], 90)}
                              aria-label={t("rotpdf.v2.pageRight", { n: p })}
                              className={iconBtn}
                            >
                              <RotateCw className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </fieldset>
            )}
          </div>
        )}

        {processing && (
          <div className="space-y-3">
            <ProgressBar progress={progress} label={t("rotpdf.rotating")} />
            <button type="button" onClick={cancel} className={buttonSecondary}>
              {t("bg.cancel")}
            </button>
          </div>
        )}

        {file && pageCount > 0 && !processing && (
          <div className="flex flex-wrap items-center gap-3">
            {currentResult ? (
              <DownloadButton
                blob={currentResult.blob}
                filename={currentResult.name}
                label={`${t("ui.downloadPdf")} (${formatFileSize(currentResult.blob.size)})`}
              />
            ) : (
              <button type="button" onClick={handleProcess} disabled={changed === 0} className={buttonPrimary}>
                {t("rotpdf.v2.save")}
              </button>
            )}
            <span className="text-sm text-t-secondary" role="status">
              {changed === 0
                ? t("rotpdf.v2.noChanges")
                : changed === 1
                  ? t("rotpdf.v2.changedOne")
                  : t("rotpdf.v2.changedOther", { n: changed })}
            </span>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
