"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import toast from "react-hot-toast";
import {
  ArrowDownAZ,
  ArrowUpZA,
  ChevronDown,
  ChevronUp,
  FileText,
  GripVertical,
  Loader2,
  X,
} from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import { Toggle, buttonPrimary, buttonSecondary } from "@/components/ui/controls";
import { formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { pdfInputErrorKey, toEditablePdf } from "@/lib/pdf-input";
import { useI18n } from "@/lib/i18n";
import { readPdfCover } from "@/lib/pdf-thumb";
import {
  parsePageRanges,
  rangesToPages,
  type RangeIssue,
  type RangeParse,
} from "@/lib/split-pdf-ranges";
import { runWorkerTask, WorkerTaskError } from "./worker-task";

interface Entry {
  id: string;
  name: string;
  size: number;
  /** Decrypted, ready-to-merge file; null while the entry is being added. */
  file: File | null;
  pageCount: number;
  thumb: string | null;
  range: string;
}

interface DragState {
  id: string;
  from: number;
  pointerId: number;
  startY: number;
  dy: number;
  /** Document-space midpoints / edges of the other rows, in list order. */
  others: { mid: number; top: number; bottom: number }[];
  listTop: number;
  target: number;
}

const THUMB_BOX = 56;
const PREPARE_CONCURRENCY = 2;

function isPdf(f: File) {
  return f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
}

function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || from >= list.length) return list;
  const next = [...list];
  const [m] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(next.length, to)), 0, m);
  return next;
}

export default function MergePdfPage() {
  const { t } = useI18n();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [fileBookmarks, setFileBookmarks] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressFile, setProgressFile] = useState<number | null>(null);
  const [result, setResult] = useState<{ blob: Blob; key: string; name: string } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const entriesRef = useRef<Entry[]>([]);
  entriesRef.current = entries;
  const runRef = useRef<AbortController | null>(null);
  const thumbUrls = useRef(new Map<string, string>());
  const queueRef = useRef<{ id: string; file: File }[]>([]);
  const activePrepare = useRef(0);
  const mounted = useRef(true);
  const listRef = useRef<HTMLOListElement>(null);
  const handleRefs = useRef(new Map<string, HTMLButtonElement>());
  const focusAfterMove = useRef<string | null>(null);
  const dragRef = useRef<DragState | null>(null);

  // Revoke thumbnails and stop any running merge on unmount.
  useEffect(() => {
    mounted.current = true;
    const urls = thumbUrls.current;
    return () => {
      mounted.current = false;
      runRef.current?.abort();
      urls.forEach((u) => URL.revokeObjectURL(u));
      urls.clear();
      queueRef.current = [];
    };
  }, []);

  useEffect(() => {
    const id = focusAfterMove.current;
    if (!id) return;
    focusAfterMove.current = null;
    handleRefs.current.get(id)?.focus();
  }, [entries]);

  const releaseThumb = (id: string) => {
    const url = thumbUrls.current.get(id);
    if (url) URL.revokeObjectURL(url);
    thumbUrls.current.delete(id);
  };

  const pumpPrepare = useCallback(() => {
    while (activePrepare.current < PREPARE_CONCURRENCY && queueRef.current.length > 0) {
      const job = queueRef.current.shift()!;
      if (!entriesRef.current.some((e) => e.id === job.id)) continue;
      activePrepare.current++;
      void (async () => {
        try {
          const file = await toEditablePdf(job.file);
          const { pageCount, cover } = await readPdfCover(file, THUMB_BOX);
          if (!mounted.current || !entriesRef.current.some((e) => e.id === job.id)) return;
          if (pageCount < 1) throw new Error("empty");
          const thumb = cover ? URL.createObjectURL(cover) : null;
          if (thumb) thumbUrls.current.set(job.id, thumb);
          setEntries((prev) =>
            prev.map((e) => (e.id === job.id ? { ...e, file, pageCount, thumb, size: file.size } : e)),
          );
        } catch (error) {
          console.error(error);
          if (!mounted.current) return;
          setEntries((prev) => prev.filter((e) => e.id !== job.id));
          toast.error(`${job.file.name}: ${t(pdfInputErrorKey(error))}`);
        } finally {
          activePrepare.current--;
          if (mounted.current) pumpPrepare();
        }
      })();
    }
  }, [t]);

  const handleFilesSelected = useCallback(
    (selectedFiles: File[]) => {
      if (runRef.current) {
        toast.error(t("mergepdf.v2.busy"));
        return;
      }
      const pdfFiles = selectedFiles.filter(isPdf);
      if (pdfFiles.length !== selectedFiles.length) toast.error(t("merge.skipped"));
      if (pdfFiles.length === 0) {
        toast.error(t("merge.invalid"));
        return;
      }
      const added: Entry[] = pdfFiles.map((file) => ({
        id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`,
        name: file.name,
        size: file.size,
        file: null,
        pageCount: 0,
        thumb: null,
        range: "",
      }));
      // Keep the ref current for the prepare queue's membership checks.
      entriesRef.current = [...entriesRef.current, ...added];
      setEntries((prev) => [...prev, ...added]);
      added.forEach((e, i) => queueRef.current.push({ id: e.id, file: pdfFiles[i] }));
      pumpPrepare();
    },
    [pumpPrepare, t],
  );

  const removeEntry = useCallback((id: string) => {
    if (runRef.current) return;
    releaseThumb(id);
    queueRef.current = queueRef.current.filter((j) => j.id !== id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    if (runRef.current) return;
    thumbUrls.current.forEach((u) => URL.revokeObjectURL(u));
    thumbUrls.current.clear();
    queueRef.current = [];
    setEntries([]);
    setResult(null);
    setProgress(0);
  }, []);

  const move = useCallback(
    (from: number, to: number, focus = false) => {
      if (runRef.current) return;
      const list = entriesRef.current;
      if (to < 0 || to >= list.length || from === to) return;
      const moved = list[from];
      if (focus) focusAfterMove.current = moved.id;
      setEntries((prev) => moveItem(prev, from, to));
      setAnnouncement(t("mergepdf.v2.moved", { name: moved.name, pos: to + 1, total: list.length }));
    },
    [t],
  );

  const sortByName = useCallback(() => {
    if (runRef.current) return;
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    setEntries((prev) => {
      const asc = [...prev].sort((a, b) => collator.compare(a.name, b.name));
      const isAsc = asc.every((e, i) => e.id === prev[i].id);
      return isAsc ? asc.reverse() : asc;
    });
  }, []);

  const setRange = useCallback((id: string, range: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, range } : e)));
  }, []);

  // ── Pointer drag (mouse, touch, pen) ─────────────────────────
  const onHandlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>, index: number) => {
    if (runRef.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    const list = listRef.current;
    if (!list) return;
    const rows = Array.from(list.querySelectorAll<HTMLElement>("[data-row]"));
    const sy = window.scrollY;
    const others = rows
      .filter((_, i) => i !== index)
      .map((r) => {
        const rect = r.getBoundingClientRect();
        return { mid: rect.top + sy + rect.height / 2, top: rect.top + sy, bottom: rect.bottom + sy };
      });
    e.currentTarget.setPointerCapture(e.pointerId);
    const state: DragState = {
      id: entriesRef.current[index].id,
      from: index,
      pointerId: e.pointerId,
      startY: e.clientY + sy,
      dy: 0,
      others,
      listTop: list.getBoundingClientRect().top + sy,
      target: index,
    };
    dragRef.current = state;
    setDrag(state);
  };

  const onHandlePointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pointerId) return;
    // Auto-scroll near the viewport edges.
    const edge = 56;
    if (e.clientY < edge) window.scrollBy(0, -12);
    else if (e.clientY > window.innerHeight - edge) window.scrollBy(0, 12);
    const y = e.clientY + window.scrollY;
    let target = 0;
    for (const o of d.others) if (o.mid < y) target++;
    const next = { ...d, dy: y - d.startY, target };
    dragRef.current = next;
    setDrag(next);
  };

  const endDrag = (commit: boolean) => {
    const d = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (commit && d && d.target !== d.from) move(d.from, d.target);
  };

  const onHandleKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = entriesRef.current.length - 1;
    const to =
      e.key === "ArrowUp" ? index - 1
      : e.key === "ArrowDown" ? index + 1
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (to === null) return;
    e.preventDefault();
    move(index, Math.max(0, Math.min(last, to)), true);
  };

  // ── Derived state ────────────────────────────────────────────
  const parsed = useMemo(() => {
    const map = new Map<string, RangeParse | null>();
    for (const e of entries) {
      map.set(e.id, e.file && e.range.trim() ? parsePageRanges(e.range, e.pageCount) : null);
    }
    return map;
  }, [entries]);

  const selectedCount = (e: Entry) => {
    const p = parsed.get(e.id);
    if (!p) return e.pageCount;
    return p.error ? 0 : rangesToPages(p.ranges).length;
  };

  const adding = entries.some((e) => !e.file);
  const rangeErrors = entries.some((e) => {
    const p = parsed.get(e.id);
    return p && (p.error || p.ranges.length === 0);
  });
  const totalPages = entries.reduce((sum, e) => sum + (e.file ? selectedCount(e) : 0), 0);
  const settingsKey = JSON.stringify([entries.map((e) => [e.id, e.range.trim()]), fileBookmarks]);
  const currentResult = result && result.key === settingsKey ? result : null;
  const canMerge = entries.length >= 2 && !adding && !rangeErrors && !processing && totalPages > 0;

  const handleMerge = useCallback(async () => {
    const snapshot = entriesRef.current;
    if (snapshot.length < 2) {
      toast.error(t("merge.addPdf"));
      return;
    }
    const ac = new AbortController();
    runRef.current = ac;
    const key = settingsKey;
    setProcessing(true);
    setProgress(0);
    setProgressFile(0);
    setResult(null);
    try {
      const sources: { name: string; bytes: ArrayBuffer; pages: number[] | null }[] = [];
      for (const e of snapshot) {
        if (!e.file) throw new Error("not ready");
        const p = e.range.trim() ? parsePageRanges(e.range, e.pageCount) : null;
        sources.push({
          name: getFileNameWithoutExtension(e.name),
          bytes: await e.file.arrayBuffer(),
          pages: p ? rangesToPages(p.ranges).map((n) => n - 1) : null,
        });
        if (ac.signal.aborted) return;
      }
      const res = await runWorkerTask(
        () => new Worker(new URL("./merge.worker.ts", import.meta.url), { type: "module" }),
        { sources, fileBookmarks },
        sources.map((s) => s.bytes),
        (value, file) => {
          if (runRef.current !== ac) return;
          setProgress(Math.round(value * 100));
          setProgressFile(value >= 0.88 ? null : (file ?? null));
        },
        ac.signal,
      );
      if (runRef.current !== ac) return;
      setProgress(100);
      const blob = new Blob([res.bytes as BlobPart], { type: "application/pdf" });
      const name = `${getFileNameWithoutExtension(snapshot[0].name)}-merged.pdf`;
      setResult({ blob, key, name });
      toast.success(t("merge.success", { count: snapshot.length }));
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Merge error:", error);
      if (error instanceof WorkerTaskError && error.code === "load" && error.file !== undefined) {
        toast.error(t("mergepdf.v2.loadFail", { name: snapshot[error.file]?.name ?? "" }));
      } else {
        toast.error(t("merge.fail"));
      }
    } finally {
      if (runRef.current === ac) {
        runRef.current = null;
        setProcessing(false);
        setProgressFile(null);
      }
    }
  }, [fileBookmarks, settingsKey, t]);

  const cancelMerge = useCallback(() => {
    const ac = runRef.current;
    if (!ac) return;
    runRef.current = null;
    ac.abort();
    setProcessing(false);
    setProgress(0);
    setProgressFile(null);
    toast(t("mergepdf.v2.cancelled"));
  }, [t]);

  const dragIndicatorY = (() => {
    if (!drag || drag.target === drag.from) return null;
    const o = drag.others;
    if (o.length === 0) return null;
    const y = drag.target < o.length ? o[drag.target].top - 4 : o[o.length - 1].bottom + 4;
    return y - drag.listTop;
  })();

  const progressLabel =
    progressFile !== null && entries.length > 0
      ? t("mergepdf.v2.mergingFile", { n: Math.min(progressFile + 1, entries.length), total: entries.length })
      : t("mergepdf.v2.finishing");

  const sortedAsc = useMemo(() => {
    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    return entries.every((e, i) => i === 0 || collator.compare(entries[i - 1].name, e.name) <= 0);
  }, [entries]);

  return (
    <ToolLayout toolName={t("tool.merge-pdf.name")} toolDescription={t("tool.merge-pdf.desc")}>
      <div className="space-y-6">
        {!processing && (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{ "application/pdf": [".pdf"] }}
            multiple={true}
            label={t("merge.dropLabel")}
            formats={["pdf"]}
          />
        )}

        {entries.length > 0 && (
          <div className="glass rounded-xl p-4 sm:p-6">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-t-primary">
                {t("merge.filesToMerge", { count: entries.length })}
              </h3>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={sortByName}
                  disabled={processing || entries.length < 2}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-t-secondary transition-colors hover:bg-bg-secondary hover:text-t-primary disabled:opacity-40"
                >
                  {sortedAsc && entries.length > 1 ? (
                    <ArrowUpZA className="h-4 w-4" aria-hidden />
                  ) : (
                    <ArrowDownAZ className="h-4 w-4" aria-hidden />
                  )}
                  {sortedAsc && entries.length > 1 ? t("mergepdf.v2.sortZa") : t("mergepdf.v2.sortAz")}
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={processing}
                  className="inline-flex min-h-9 items-center rounded-lg px-2.5 text-[13px] text-t-secondary transition-colors hover:bg-bg-secondary hover:text-red-600 disabled:opacity-40 dark:hover:text-red-400"
                >
                  {t("merge.clearAll")}
                </button>
              </div>
            </div>
            <p id="merge-drag-hint" className="mb-3 text-xs text-t-tertiary">
              {t("mergepdf.v2.dragHint")}
            </p>

            <fieldset disabled={processing} className="min-w-0">
              <ol ref={listRef} className="relative space-y-2">
                {entries.map((entry, index) => {
                  const p = parsed.get(entry.id);
                  const error: RangeIssue | null =
                    p?.error ?? (p && p.ranges.length === 0 ? { key: "pdfrange.v2.errEmpty" } : null);
                  const isDragging = drag?.id === entry.id;
                  const count = entry.file ? selectedCount(entry) : 0;
                  const errorId = `range-err-${entry.id}`;
                  return (
                    <li
                      key={entry.id}
                      data-row
                      style={isDragging ? { transform: `translateY(${drag!.dy}px)` } : undefined}
                      className={`rounded-lg border bg-bg-secondary p-2 sm:p-3 ${
                        isDragging
                          ? "relative z-10 border-accent/50 shadow-lg"
                          : "border-border transition-colors"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 sm:gap-3">
                        <button
                          type="button"
                          ref={(el) => {
                            if (el) handleRefs.current.set(entry.id, el);
                            else handleRefs.current.delete(entry.id);
                          }}
                          onPointerDown={(e) => onHandlePointerDown(e, index)}
                          onPointerMove={onHandlePointerMove}
                          onPointerUp={() => endDrag(true)}
                          onPointerCancel={() => endDrag(false)}
                          onLostPointerCapture={() => dragRef.current && endDrag(true)}
                          onKeyDown={(e) => onHandleKeyDown(e, index)}
                          aria-label={t("mergepdf.v2.reorder", { name: entry.name })}
                          aria-describedby="merge-drag-hint"
                          className="flex h-9 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-t-tertiary hover:bg-bg-tertiary hover:text-t-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent active:cursor-grabbing sm:w-9"
                        >
                          <GripVertical className="h-4 w-4" aria-hidden />
                        </button>
                        <span className="w-5 shrink-0 text-center font-mono text-xs text-t-tertiary tabular-nums">
                          {index + 1}
                        </span>
                        <div className="flex h-14 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-surface">
                          {entry.thumb ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={entry.thumb} alt="" draggable={false} className="h-full w-full object-contain" />
                          ) : entry.file ? (
                            <FileText className="h-5 w-5 text-t-tertiary" aria-hidden />
                          ) : (
                            <Loader2 className="h-4 w-4 animate-spin text-t-tertiary" aria-hidden />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-t-primary" title={entry.name}>
                            {entry.name}
                          </p>
                          <p className="text-xs text-t-secondary tabular-nums">
                            {formatFileSize(entry.size)}
                            {" · "}
                            {entry.file
                              ? entry.pageCount === 1
                                ? t("rotatepdf.ui.pageCountOne", { n: entry.pageCount })
                                : t("rotatepdf.ui.pageCountOther", { n: entry.pageCount })
                              : t("mergepdf.v2.adding")}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center">
                          <button
                            type="button"
                            onClick={() => move(index, index - 1)}
                            disabled={index === 0}
                            aria-label={t("mergepdf.v2.moveUp", { name: entry.name })}
                            title={t("merge.moveUp")}
                            className="flex h-9 w-9 items-center justify-center rounded-md text-t-secondary transition-colors hover:bg-bg-tertiary hover:text-t-primary disabled:opacity-30"
                          >
                            <ChevronUp className="h-4 w-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => move(index, index + 1)}
                            disabled={index === entries.length - 1}
                            aria-label={t("mergepdf.v2.moveDown", { name: entry.name })}
                            title={t("merge.moveDown")}
                            className="flex h-9 w-9 items-center justify-center rounded-md text-t-secondary transition-colors hover:bg-bg-tertiary hover:text-t-primary disabled:opacity-30"
                          >
                            <ChevronDown className="h-4 w-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeEntry(entry.id)}
                            aria-label={t("mergepdf.v2.remove", { name: entry.name })}
                            title={t("merge.removeFile")}
                            className="flex h-9 w-9 items-center justify-center rounded-md text-t-secondary transition-colors hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400"
                          >
                            <X className="h-4 w-4" aria-hidden />
                          </button>
                        </div>
                      </div>

                      {entry.file && entry.pageCount > 1 && (
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 ps-0 sm:ps-[5.5rem]">
                          <label className="flex min-w-0 flex-1 items-center gap-2 text-xs text-t-secondary">
                            <span className="shrink-0">{t("mergepdf.v2.pagesLabel")}</span>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={entry.range}
                              onChange={(e) => setRange(entry.id, e.target.value)}
                              placeholder={t("mergepdf.v2.rangePlaceholder", { n: entry.pageCount })}
                              aria-invalid={Boolean(error)}
                              aria-describedby={error ? errorId : undefined}
                              className={`h-9 min-w-0 flex-1 rounded-lg border bg-surface px-3 text-[13px] text-t-primary placeholder:text-t-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 sm:max-w-[16rem] ${
                                error ? "border-red-500/70" : "border-border"
                              }`}
                            />
                          </label>
                          {!error && entry.range.trim() && (
                            <span className="text-xs text-t-tertiary tabular-nums">
                              {t("mergepdf.v2.selectedOf", { k: count, n: entry.pageCount })}
                            </span>
                          )}
                          {error && (
                            <p id={errorId} role="alert" className="w-full text-xs text-red-600 dark:text-red-400">
                              {t(error.key, error.params)}
                            </p>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
                {dragIndicatorY !== null && (
                  <li
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 h-0.5 rounded-full bg-accent"
                    style={{ top: dragIndicatorY - 1 }}
                  />
                )}
              </ol>
            </fieldset>
            <p className="sr-only" aria-live="polite">
              {announcement}
            </p>

            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-start sm:justify-between">
              <Toggle
                checked={fileBookmarks}
                onChange={setFileBookmarks}
                disabled={processing}
                label={t("mergepdf.v2.bookmarks")}
                description={t("mergepdf.v2.bookmarksHint")}
              />
              <p className="shrink-0 text-sm font-medium text-t-primary tabular-nums">
                {t("mergepdf.v2.totalPages", { n: totalPages })}
              </p>
            </div>
          </div>
        )}

        {processing && (
          <div className="space-y-3">
            <ProgressBar progress={progress} label={progressLabel} />
            <button type="button" onClick={cancelMerge} className={buttonSecondary}>
              {t("bg.cancel")}
            </button>
          </div>
        )}

        {!processing && entries.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            {currentResult ? (
              <>
                <DownloadButton
                  blob={currentResult.blob}
                  filename={currentResult.name}
                  label={`${t("merge.download")} (${formatFileSize(currentResult.blob.size)})`}
                />
                <button type="button" onClick={clearAll} className={buttonSecondary}>
                  {t("merge.more")}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={handleMerge} disabled={!canMerge} className={buttonPrimary}>
                  {t("merge.button", { count: entries.length })}
                </button>
                <span className="text-xs text-t-tertiary" role="status">
                  {entries.length < 2
                    ? t("merge.addPdf")
                    : adding
                      ? t("mergepdf.v2.waitAdding")
                      : rangeErrors
                        ? t("mergepdf.v2.fixRanges")
                        : ""}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
