"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import toast from "react-hot-toast";
import { Check, FileText, Minus, Plus, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import { Segmented, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { pdfInputErrorKey, toEditablePdf } from "@/lib/pdf-input";
import { useI18n } from "@/lib/i18n";
import { PdfPageThumb, usePdfThumbnailer } from "@/lib/pdf-thumb-view";
import {
  compactPages,
  formatPageRanges,
  pagesInRanges,
  parsePageRanges,
  rangeLabel,
  rangesToPages,
  type PageRange,
  type RangeIssue,
} from "@/lib/split-pdf-ranges";
import { runWorkerTask } from "../merge-pdf/worker-task";

type Mode = "extract" | "ranges" | "every";

interface Group {
  pages: number[]; // 1-based
  name: string;
}

const THUMB_BOX = 150;

function uniqueName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf(".");
  const stem = name.slice(0, dot);
  const ext = name.slice(dot);
  for (let n = 2; ; n++) {
    const candidate = `${stem} (${n})${ext}`;
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
  }
}

function removePage(ranges: PageRange[], p: number): PageRange[] {
  const out: PageRange[] = [];
  for (const r of ranges) {
    if (p < r.start || p > r.end) out.push(r);
    else {
      if (r.start <= p - 1) out.push({ start: r.start, end: p - 1 });
      if (p + 1 <= r.end) out.push({ start: p + 1, end: r.end });
    }
  }
  return out;
}

export default function SplitPdfPage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [opening, setOpening] = useState(false);
  const [mode, setMode] = useState<Mode>("extract");
  const [rangeText, setRangeText] = useState("");
  const [everyText, setEveryText] = useState("1");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ blob: Blob; name: string; kind: "pdf" | "zip"; key: string } | null>(
    null,
  );
  const [gridEl, setGridEl] = useState<HTMLDivElement | null>(null);
  const anchorRef = useRef<number | null>(null);
  const lastValid = useRef<PageRange[]>([]);
  const runRef = useRef<AbortController | null>(null);

  const thumbState = usePdfThumbnailer(file);
  const thumbs = thumbState.thumbs;
  const pageCount = thumbs?.pageCount ?? 0;

  useEffect(() => () => runRef.current?.abort(), []);

  useEffect(() => {
    if (thumbState.status === "error") {
      console.error(thumbState.error);
      toast.error(t("split.loadFail"));
      setFile(null);
    } else if (thumbState.status === "ready") {
      toast.success(t("split.loaded", { count: thumbState.thumbs.pageCount }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumbState.status]);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const picked = files[0];
      if (!picked) return;
      if (picked.type !== "application/pdf" && !picked.name.toLowerCase().endsWith(".pdf")) {
        toast.error(t("split.invalidFile"));
        return;
      }
      setOpening(true);
      try {
        const editable = await toEditablePdf(picked);
        runRef.current?.abort();
        runRef.current = null;
        setProcessing(false);
        setFile(editable);
        setMode("extract");
        setRangeText("");
        setEveryText("1");
        setResult(null);
        setProgress(0);
        anchorRef.current = null;
        lastValid.current = [];
      } catch (error) {
        console.error(error);
        toast.error(t(pdfInputErrorKey(error)));
      } finally {
        setOpening(false);
      }
    },
    [t],
  );

  const handleReset = useCallback(() => {
    runRef.current?.abort();
    runRef.current = null;
    setProcessing(false);
    setFile(null);
    setRangeText("");
    setResult(null);
    setProgress(0);
  }, []);

  // ── Derived selection ────────────────────────────────────────
  const parsed = useMemo(() => parsePageRanges(rangeText, pageCount), [rangeText, pageCount]);
  if (!parsed.error) lastValid.current = parsed.ranges;

  const everyN = /^\d+$/.test(everyText.trim()) ? Number(everyText.trim()) : NaN;
  const everyValid = Number.isInteger(everyN) && everyN >= 1 && everyN <= Math.max(1, pageCount);

  const baseName = file ? getFileNameWithoutExtension(file.name) : "document";

  const groups: Group[] = useMemo(() => {
    if (!pageCount) return [];
    if (mode === "every") {
      if (!everyValid) return [];
      const out: Group[] = [];
      const parts = Math.ceil(pageCount / everyN);
      const pad = String(parts).length;
      for (let i = 0, k = 1; i < pageCount; i += everyN, k++) {
        const start = i + 1;
        const end = Math.min(pageCount, i + everyN);
        out.push({
          pages: rangesToPages([{ start, end }]),
          name:
            parts === 1
              ? `${baseName}.pdf`
              : `${baseName}_part-${String(k).padStart(pad, "0")}_${rangeLabel({ start, end })}.pdf`,
        });
      }
      return out;
    }
    if (parsed.error || parsed.ranges.length === 0) return [];
    if (mode === "extract") {
      const label = parsed.ranges.map((r) => (r.start === r.end ? `${r.start}` : `${r.start}-${r.end}`)).join("_");
      const name = label.length <= 40 ? `${baseName}_pages-${label}.pdf` : `${baseName}_extract.pdf`;
      return [{ pages: rangesToPages(parsed.ranges), name }];
    }
    const used = new Set<string>();
    return parsed.ranges.map((r) => ({
      pages: rangesToPages([r]),
      name: uniqueName(`${baseName}_${rangeLabel(r)}.pdf`, used),
    }));
  }, [pageCount, mode, everyValid, everyN, parsed, baseName]);

  /** page → 1-based group number (ranges/every) or 1 (extract). */
  const pageGroup = useMemo(() => {
    const map = new Map<number, number>();
    if (mode === "every") {
      groups.forEach((g, i) => g.pages.forEach((p) => map.set(p, i + 1)));
    } else if (!parsed.error) {
      parsed.ranges.forEach((r, i) => {
        for (let p = r.start; p <= r.end; p++) if (!map.has(p)) map.set(p, mode === "ranges" ? i + 1 : 1);
      });
    }
    return map;
  }, [mode, groups, parsed]);

  const settingsKey = JSON.stringify([mode, groups.map((g) => g.pages)]);
  const currentResult = result && result.key === settingsKey ? result : null;

  const rangeError: RangeIssue | null =
    mode === "every"
      ? everyValid
        ? null
        : { key: "splitpdf.v2.enterEvery", params: { max: pageCount } }
      : parsed.error;

  // ── Thumbnail clicks ↔ text field ────────────────────────────
  const onPageClick = (p: number, e: ReactMouseEvent) => {
    if (mode === "every" || processing) return;
    const ranges = lastValid.current;
    const anchor = anchorRef.current;
    let next: PageRange[];
    if (mode === "extract") {
      const set = pagesInRanges(ranges);
      if (e.shiftKey && anchor !== null) {
        const [a, b] = anchor < p ? [anchor, p] : [p, anchor];
        for (let i = a; i <= b; i++) set.add(i);
      } else if (set.has(p)) set.delete(p);
      else set.add(p);
      next = compactPages(set);
    } else if (e.shiftKey && anchor !== null) {
      const [a, b] = anchor < p ? [anchor, p] : [p, anchor];
      const last = ranges[ranges.length - 1];
      const base = last && last.start === anchor && last.end === anchor ? ranges.slice(0, -1) : ranges;
      next = [...base, { start: a, end: b }];
    } else if (pagesInRanges(ranges).has(p)) {
      next = removePage(ranges, p);
    } else {
      next = [...ranges, { start: p, end: p }];
    }
    anchorRef.current = p;
    setRangeText(formatPageRanges(next));
  };

  const quick = (kind: "all" | "odd" | "even" | "each" | "half" | "clear") => {
    anchorRef.current = null;
    const all = Array.from({ length: pageCount }, (_, i) => i + 1);
    let ranges: PageRange[] = [];
    if (kind === "all") ranges = [{ start: 1, end: pageCount }];
    else if (kind === "odd") ranges = all.filter((p) => p % 2 === 1).map((p) => ({ start: p, end: p }));
    else if (kind === "even") ranges = all.filter((p) => p % 2 === 0).map((p) => ({ start: p, end: p }));
    else if (kind === "each") ranges = all.map((p) => ({ start: p, end: p }));
    else if (kind === "half") {
      const mid = Math.ceil(pageCount / 2);
      ranges = [
        { start: 1, end: mid },
        { start: mid + 1, end: pageCount },
      ];
    }
    setRangeText(formatPageRanges(ranges));
  };

  const stepEvery = (delta: number) => {
    const base = everyValid ? everyN : 1;
    setEveryText(String(Math.max(1, Math.min(pageCount, base + delta))));
  };

  // ── Run ─────────────────────────────────────────────────────
  const handleSplit = useCallback(async () => {
    if (!file || groups.length === 0) return;
    const ac = new AbortController();
    runRef.current?.abort();
    runRef.current = ac;
    const key = settingsKey;
    const snapshot = groups;
    setProcessing(true);
    setProgress(0);
    setResult(null);
    try {
      const bytes = await file.arrayBuffer();
      if (ac.signal.aborted) return;
      const res = await runWorkerTask(
        () => new Worker(new URL("./split.worker.ts", import.meta.url), { type: "module" }),
        { bytes, groups: snapshot.map((g) => ({ name: g.name, pages: g.pages.map((p) => p - 1) })) },
        [bytes],
        (v) => runRef.current === ac && setProgress(Math.round(v * 100)),
        ac.signal,
      );
      if (runRef.current !== ac) return;
      const kind = res.kind === "zip" ? "zip" : "pdf";
      const blob = new Blob([res.bytes as BlobPart], { type: kind === "zip" ? "application/zip" : "application/pdf" });
      setResult({ blob, kind, key, name: kind === "zip" ? `${baseName}-split.zip` : (res.name ?? `${baseName}.pdf`) });
      setProgress(100);
      toast.success(
        kind === "zip"
          ? t("split.success", { count: snapshot.length })
          : t("splitpdf.v2.successOne", { n: snapshot[0].pages.length }),
      );
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Split error:", error);
      toast.error(t("split.fail"));
    } finally {
      if (runRef.current === ac) {
        runRef.current = null;
        setProcessing(false);
      }
    }
  }, [file, groups, settingsKey, baseName, t]);

  const cancelSplit = () => {
    runRef.current?.abort();
    runRef.current = null;
    setProcessing(false);
    setProgress(0);
    toast(t("splitpdf.v2.cancelled"));
  };

  const summary = (() => {
    if (groups.length === 0) return "";
    if (mode === "extract") {
      const n = groups[0].pages.length;
      return n === 1 ? t("splitpdf.v2.summaryExtractOne") : t("splitpdf.v2.summaryExtractOther", { n });
    }
    return groups.length === 1 ? t("splitpdf.v2.summaryOneFile") : t("splitpdf.v2.summaryZip", { k: groups.length });
  })();

  const modeHint =
    mode === "extract"
      ? t("splitpdf.v2.modeExtractHint")
      : mode === "ranges"
        ? t("splitpdf.v2.modeRangesHint")
        : t("splitpdf.v2.modeEveryHint");

  const chip =
    "inline-flex min-h-9 items-center rounded-lg border border-border bg-bg-secondary px-3 text-xs font-medium text-t-secondary transition-colors hover:border-accent/40 hover:text-t-primary";

  return (
    <ToolLayout toolName={t("tool.split-pdf.name")} toolDescription={t("tool.split-pdf.desc")}>
      <div className="space-y-6">
        {!file && (
          <>
            <FileDropzone
              onFilesSelected={handleFilesSelected}
              accept={{ "application/pdf": [".pdf"] }}
              multiple={false}
              label={t("split.dropLabel")}
              formats={["pdf"]}
            />
            {opening && <p className="text-sm text-t-secondary">{t("splitpdf.v2.reading")}</p>}
          </>
        )}

        {file && (
          <div className="glass rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-secondary">
                  <FileText className="h-5 w-5 text-t-secondary" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-t-primary" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-sm text-t-secondary tabular-nums">
                    {formatFileSize(file.size)}
                    {pageCount > 0 && <> &middot; {t("split.pagesCount", { count: pageCount })}</>}
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
                <div className="space-y-2">
                  <Segmented<Mode>
                    label={t("splitpdf.v2.modeLabel")}
                    value={mode}
                    onChange={(m) => {
                      setMode(m);
                      anchorRef.current = null;
                    }}
                    options={[
                      { value: "extract", label: t("splitpdf.v2.modeExtract") },
                      { value: "ranges", label: t("splitpdf.v2.modeRanges") },
                      { value: "every", label: t("splitpdf.v2.modeEvery") },
                    ]}
                  />
                  <p className="text-[13px] text-t-secondary">{modeHint}</p>
                </div>

                {mode !== "every" ? (
                  <div className="space-y-2">
                    <label htmlFor="pageRanges" className={sectionTitle}>
                      {mode === "extract" ? t("splitpdf.v2.pagesToExtract") : t("split.pageRanges")}
                    </label>
                    <input
                      id="pageRanges"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      value={rangeText}
                      onChange={(e) => {
                        setRangeText(e.target.value);
                        anchorRef.current = null;
                      }}
                      placeholder={pageCount > 2 ? `1-3, 5, ${Math.min(pageCount, 7)}-` : "1"}
                      aria-invalid={Boolean(rangeError)}
                      aria-describedby="range-help"
                      className={`w-full rounded-xl border bg-bg-secondary px-4 py-3 text-t-primary placeholder:text-t-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                        rangeError ? "border-red-500/70" : "border-border"
                      }`}
                    />
                    <p
                      id="range-help"
                      role={rangeError ? "alert" : undefined}
                      className={`text-xs ${rangeError ? "text-red-600 dark:text-red-400" : "text-t-tertiary"}`}
                    >
                      {rangeError ? t(rangeError.key, rangeError.params) : t("splitpdf.v2.rangesHelp")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {mode === "extract" ? (
                        <>
                          <button type="button" className={chip} onClick={() => quick("all")}>
                            {t("split.allPages")}
                          </button>
                          {pageCount > 1 && (
                            <>
                              <button type="button" className={chip} onClick={() => quick("odd")}>
                                {t("rotatepdf.ui.quickOdd")}
                              </button>
                              <button type="button" className={chip} onClick={() => quick("even")}>
                                {t("rotatepdf.ui.quickEven")}
                              </button>
                            </>
                          )}
                        </>
                      ) : (
                        pageCount > 1 && (
                          <>
                            <button type="button" className={chip} onClick={() => quick("each")}>
                              {t("split.eachPage")}
                            </button>
                            <button type="button" className={chip} onClick={() => quick("half")}>
                              {t("split.half")}
                            </button>
                          </>
                        )
                      )}
                      {rangeText.trim() && (
                        <button type="button" className={chip} onClick={() => quick("clear")}>
                          {t("ui.clear")}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label htmlFor="everyN" className={sectionTitle}>
                      {t("splitpdf.v2.everyLabel")}
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => stepEvery(-1)}
                        disabled={!everyValid || everyN <= 1}
                        aria-label={t("splitpdf.v2.decrease")}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-t-secondary hover:bg-bg-secondary hover:text-t-primary disabled:opacity-40"
                      >
                        <Minus className="h-4 w-4" aria-hidden />
                      </button>
                      <input
                        id="everyN"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        value={everyText}
                        onChange={(e) => setEveryText(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                        aria-invalid={!everyValid}
                        aria-describedby="every-help"
                        className={`h-11 w-24 rounded-xl border bg-bg-secondary px-3 text-center text-t-primary tabular-nums focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                          everyValid ? "border-border" : "border-red-500/70"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => stepEvery(1)}
                        disabled={everyValid && everyN >= pageCount}
                        aria-label={t("splitpdf.v2.increase")}
                        className="flex h-11 w-11 items-center justify-center rounded-xl border border-border text-t-secondary hover:bg-bg-secondary hover:text-t-primary disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                    <p
                      id="every-help"
                      role={rangeError ? "alert" : undefined}
                      className={`text-xs ${rangeError ? "text-red-600 dark:text-red-400" : "text-t-tertiary"}`}
                    >
                      {rangeError ? t(rangeError.key, rangeError.params) : summary}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className={sectionTitle}>{t("split.pagePreview")}</p>
                    {mode !== "every" && (
                      <p className="text-xs text-t-tertiary">{t("splitpdf.v2.selectHint")}</p>
                    )}
                  </div>
                  <div
                    ref={setGridEl}
                    className="max-h-[min(70vh,640px)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-bg-secondary/50 p-2 sm:p-3"
                  >
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5">
                      {Array.from({ length: pageCount }, (_, i) => {
                        const p = i + 1;
                        const g = pageGroup.get(p);
                        const on = g !== undefined;
                        const label =
                          on && mode !== "extract"
                            ? t("splitpdf.v2.pageInFile", { n: p, k: g })
                            : t("split.pageLabel", { n: p });
                        const body = (
                          <>
                            <PdfPageThumb
                              thumbs={thumbs}
                              page={p}
                              box={THUMB_BOX}
                              root={gridEl}
                              className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-md bg-surface"
                              imgClassName="h-full w-full object-contain"
                              placeholder={<span className="text-xs text-t-tertiary tabular-nums">{p}</span>}
                            />
                            <span className="mt-1 block text-center text-[11px] text-t-secondary tabular-nums">{p}</span>
                            {on && (
                              <span className="absolute end-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-on-accent tabular-nums">
                                {mode === "extract" ? <Check className="h-3.5 w-3.5" aria-hidden /> : g}
                              </span>
                            )}
                          </>
                        );
                        const cls = `relative block w-full rounded-lg border-2 p-1 text-start transition-colors ${
                          on ? "border-accent" : "border-transparent"
                        }`;
                        return mode === "every" ? (
                          <div key={p} className={cls} aria-label={label} role="img">
                            {body}
                          </div>
                        ) : (
                          <button
                            key={p}
                            type="button"
                            aria-pressed={on}
                            aria-label={label}
                            onClick={(e) => onPageClick(p, e)}
                            className={`${cls} hover:border-accent/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
                          >
                            {body}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </fieldset>
            )}
          </div>
        )}

        {processing && (
          <div className="space-y-3">
            <ProgressBar progress={progress} label={t("split.splittingPdf")} />
            <button type="button" onClick={cancelSplit} className={buttonSecondary}>
              {t("bg.cancel")}
            </button>
          </div>
        )}

        {file && pageCount > 0 && !processing && (
          <div className="flex flex-wrap items-center gap-3">
            {currentResult ? (
              <>
                <DownloadButton
                  blob={currentResult.blob}
                  filename={currentResult.name}
                  label={`${currentResult.kind === "zip" ? t("split.download") : t("ui.downloadPdf")} (${formatFileSize(currentResult.blob.size)})`}
                />
                <button type="button" onClick={handleReset} className={buttonSecondary}>
                  {t("split.another")}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleSplit}
                  disabled={groups.length === 0}
                  className={buttonPrimary}
                >
                  {mode === "extract" ? t("splitpdf.v2.buttonExtract") : t("split.button")}
                </button>
                <span className="text-sm text-t-secondary" role="status">
                  {groups.length === 0
                    ? rangeError
                      ? ""
                      : t("splitpdf.v2.noneSelected")
                    : summary}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
