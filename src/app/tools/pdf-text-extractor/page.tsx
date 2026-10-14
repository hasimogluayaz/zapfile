"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { Copy, FileDown, FileText, Loader2, ScanText, Search, X } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { openPdf } from "@/lib/pdfjs";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProgressBar from "@/components/ProgressBar";
import { Segmented, Toggle, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { downloadBlob } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import {
  countChars,
  countWords,
  formatPage,
  layoutPage,
  type PageLayout,
  type RawTextItem,
  type TextMode,
} from "./text-layout";

interface PageData {
  layout: PageLayout;
  words: number;
  chars: number;
}

interface ViewPage {
  pageNumber: number;
  text: string;
  words: number;
  chars: number;
  matches: number;
  rtl: boolean;
}

const RENDER_STEP = 20;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parsePage(value: string, fallback: number, max: number) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(1, n));
}

function highlight(text: string, regex: RegExp | null): ReactNode {
  if (!regex) return text;
  const parts = text.split(regex);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="rounded-[3px] bg-volt/70 px-0.5 text-volt-ink">
        {part}
      </mark>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

function markdownEscapeLine(line: string) {
  return line.replace(/^(\s*)([#>*+-]|\d+[.)])(\s)/, "$1\\$2$3");
}

export default function PdfTextExtractorPage() {
  const { t, locale } = useI18n();

  const [file, setFile] = useState<File | null>(null);
  const [opening, setOpening] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [fromText, setFromText] = useState("1");
  const [toText, setToText] = useState("1");
  const [mode, setMode] = useState<TextMode>("flow");
  const [includePageMarkers, setIncludePageMarkers] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPage, setSelectedPage] = useState<number | "all">("all");
  const [data, setData] = useState<Record<number, PageData>>({});
  const [extracting, setExtracting] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [renderLimit, setRenderLimit] = useState(RENDER_STEP);
  const [runToken, setRunToken] = useState(0);

  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const runRef = useRef<AbortController | null>(null);
  const openRef = useRef(0);
  const dataRef = useRef<Record<number, PageData>>({});
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const range = useMemo(() => {
    if (!pageCount) return { from: 1, to: 1, valid: false };
    const from = parsePage(fromText, 1, pageCount);
    const to = parsePage(toText, pageCount, pageCount);
    return { from, to, valid: from <= to };
  }, [fromText, toText, pageCount]);

  const closePdf = useCallback(() => {
    runRef.current?.abort();
    runRef.current = null;
    const pdf = pdfRef.current;
    pdfRef.current = null;
    if (pdf) void pdf.destroy();
  }, []);

  useEffect(() => closePdf, [closePdf]);

  const handleFile = useCallback(
    async (files: File[]) => {
      const picked = files.find(
        (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"),
      );
      if (!picked) {
        toast.error(t("pdftext.ui.invalidFile"));
        return;
      }
      closePdf();
      const token = ++openRef.current;
      setFile(picked);
      setOpening(true);
      setPageCount(0);
      dataRef.current = {};
      setData({});
      setProgress({ done: 0, total: 0 });
      setStopped(false);
      setSelectedPage("all");
      setSearchQuery("");
      setRenderLimit(RENDER_STEP);
      try {
        // pdf.js decrypts restriction-only files itself; only a real open
        // password stops it (PasswordException).
        const pdf = await openPdf(await picked.arrayBuffer());
        if (token !== openRef.current) {
          void pdf.destroy();
          return;
        }
        pdfRef.current = pdf;
        setPageCount(pdf.numPages);
        setFromText("1");
        setToText(String(pdf.numPages));
      } catch (error) {
        if (token !== openRef.current) return;
        const name = (error as { name?: string } | null)?.name;
        if (name !== "PasswordException") console.error(error);
        toast.error(t(name === "PasswordException" ? "pdf.locked" : "pdftext.ui.invalidPdf"));
        setFile(null);
      } finally {
        if (token === openRef.current) setOpening(false);
      }
    },
    [closePdf, t],
  );

  // Extract whatever pages of the range aren't cached yet. Re-runs (debounced)
  // when the range changes; the previous run is cancelled.
  useEffect(() => {
    const pdf = pdfRef.current;
    if (!pdf || !range.valid) return;
    const todo: number[] = [];
    for (let n = range.from; n <= range.to; n++) if (!dataRef.current[n]) todo.push(n);
    if (todo.length === 0) {
      setExtracting(false);
      setStopped(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      runRef.current?.abort();
      runRef.current = controller;
      setExtracting(true);
      setStopped(false);
      const total = range.to - range.from + 1;
      let done = total - todo.length;
      setProgress({ done, total });
      let pending: Record<number, PageData> = {};
      let lastFlush = performance.now();
      const flush = () => {
        if (Object.keys(pending).length === 0) return;
        dataRef.current = { ...dataRef.current, ...pending };
        setData(dataRef.current);
        pending = {};
        lastFlush = performance.now();
      };
      try {
        for (const n of todo) {
          if (controller.signal.aborted) return;
          const page = await pdf.getPage(n);
          const content = await page.getTextContent();
          if (controller.signal.aborted) return;
          const layout = layoutPage(
            content.items.filter((item): item is RawTextItem & typeof item => "str" in item) as RawTextItem[],
            page.getViewport({ scale: 1 }).transform,
          );
          page.cleanup();
          const flow = formatPage(layout, "flow");
          pending[n] = { layout, words: countWords(flow), chars: countChars(flow) };
          done++;
          if (performance.now() - lastFlush > 120) {
            flush();
            setProgress({ done, total });
            // Let the browser paint and handle input between batches.
            await new Promise((resolve) => setTimeout(resolve, 0));
          }
        }
        flush();
        setProgress({ done, total });
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error(error);
          toast.error(t("pdftext.ui.fail"));
        }
      } finally {
        if (controller.signal.aborted) flush();
        if (runRef.current === controller) {
          runRef.current = null;
          setExtracting(false);
        }
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [range, pageCount, runToken, t]);

  const stopExtraction = () => {
    runRef.current?.abort();
    runRef.current = null;
    setExtracting(false);
    setStopped(true);
  };

  const resumeExtraction = () => {
    setStopped(false);
    setRunToken((n) => n + 1);
  };

  const reset = useCallback(() => {
    openRef.current++;
    closePdf();
    setFile(null);
    setOpening(false);
    setPageCount(0);
    dataRef.current = {};
    setData({});
    setExtracting(false);
    setStopped(false);
    setProgress({ done: 0, total: 0 });
    setSearchQuery("");
    setSelectedPage("all");
  }, [closePdf]);

  const searchRegex = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return null;
    return new RegExp(`(${escapeRegExp(q)})`, "giu");
  }, [searchQuery]);

  // Pages of the current range that are extracted, formatted for the mode.
  const pages = useMemo<ViewPage[]>(() => {
    if (!range.valid) return [];
    const list: ViewPage[] = [];
    for (let n = range.from; n <= range.to; n++) {
      const d = data[n];
      if (!d) continue;
      const text = formatPage(d.layout, mode);
      list.push({ pageNumber: n, text, words: d.words, chars: d.chars, matches: 0, rtl: d.layout.rtl });
    }
    return list;
  }, [data, mode, range]);

  const filteredPages = useMemo(() => {
    if (!searchRegex) return pages;
    const out: ViewPage[] = [];
    for (const p of pages) {
      const count = p.text.match(searchRegex)?.length ?? 0;
      if (count > 0) out.push({ ...p, matches: count });
    }
    return out;
  }, [pages, searchRegex]);

  const totalMatches = useMemo(() => filteredPages.reduce((s, p) => s + p.matches, 0), [filteredPages]);

  useEffect(() => {
    if (selectedPage !== "all" && !filteredPages.some((p) => p.pageNumber === selectedPage)) setSelectedPage("all");
  }, [filteredPages, selectedPage]);

  useEffect(() => setRenderLimit(RENDER_STEP), [searchQuery, selectedPage, mode]);

  const visiblePages = useMemo(
    () => (selectedPage === "all" ? filteredPages : filteredPages.filter((p) => p.pageNumber === selectedPage)),
    [filteredPages, selectedPage],
  );

  // Render long documents progressively as the reader scrolls.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setRenderLimit((n) => n + RENDER_STEP);
      },
      { rootMargin: "600px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [visiblePages.length, renderLimit]);

  const totals = useMemo(
    () => ({
      pages: pages.length,
      words: pages.reduce((s, p) => s + p.words, 0),
      chars: pages.reduce((s, p) => s + p.chars, 0),
      empty: pages.filter((p) => !p.text.trim()).length,
    }),
    [pages],
  );

  const pageLabel = useCallback((n: number) => t("pdftext.ui.page", { n }), [t]);

  const buildPlain = useCallback(
    (list: ViewPage[], markers: boolean) =>
      list
        .map((p) => (markers ? `--- ${pageLabel(p.pageNumber)} ---\n${p.text}` : p.text))
        .filter((chunk) => chunk.trim().length > 0)
        .join("\n\n")
        .trim(),
    [pageLabel],
  );

  const baseName = file ? file.name.replace(/\.pdf$/i, "") : "document";

  const copy = useCallback(
    async (value: string) => {
      if (!value.trim()) {
        toast(t("pdftext.v2.nothingToCopy"));
        return;
      }
      try {
        await navigator.clipboard.writeText(value);
        toast.success(t("pdftext.ui.copied"));
      } catch {
        toast.error(t("pdftext.ui.copyFailed"));
      }
    },
    [t],
  );

  const downloadTxt = () => {
    const text = buildPlain(pages, includePageMarkers);
    if (!text) return toast(t("pdftext.v2.nothingToCopy"));
    downloadBlob(new Blob([text + "\n"], { type: "text/plain;charset=utf-8" }), `${baseName}.txt`);
  };

  const downloadMd = () => {
    if (!pages.some((p) => p.text.trim())) return toast(t("pdftext.v2.nothingToCopy"));
    const parts = [`# ${baseName}`];
    for (const p of pages) {
      parts.push(`## ${pageLabel(p.pageNumber)}`);
      if (!p.text.trim()) {
        parts.push(`_${t("pdftext.v2.noTextShort")}_`);
        continue;
      }
      const d = data[p.pageNumber];
      const paragraphs = d
        ? d.layout.paragraphs.map((para) =>
            mode === "flow"
              ? markdownEscapeLine(formatPage({ paragraphs: [para], rtl: false }, "flow"))
              : para.map(markdownEscapeLine).join("  \n"),
          )
        : [p.text];
      parts.push(paragraphs.join("\n\n"));
    }
    downloadBlob(new Blob([parts.join("\n\n") + "\n"], { type: "text/markdown;charset=utf-8" }), `${baseName}.md`);
  };

  const downloadJson = () => {
    if (!file || pages.length === 0) return;
    const payload = {
      fileName: file.name,
      extractedAt: new Date().toISOString(),
      mode,
      pageRange: { from: range.from, to: range.to },
      pages: pages.map((p) => ({ pageNumber: p.pageNumber, text: p.text, words: p.words, characters: p.chars, hasText: p.text.trim().length > 0 })),
    };
    downloadBlob(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" }),
      `${baseName}.json`,
    );
  };

  const fmt = (n: number) => n.toLocaleString(locale);
  const inputClass =
    "w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-t-primary focus:border-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60";
  const pct = progress.total ? (progress.done / progress.total) * 100 : 0;
  const complete = range.valid && pages.length === range.to - range.from + 1;

  return (
    <ToolLayout
      toolName="PDF Text Extractor"
      toolDescription="Extract readable text from PDF files with page-level review, filters, and export options."
    >
      <div className="space-y-6">
        {!file ? (
          <FileDropzone
            onFilesSelected={handleFile}
            accept={{ "application/pdf": [".pdf"] }}
            label={t("pdftext.ui.dropLabel")}
            formats={["PDF"]}
          />
        ) : (
          <>
            <div className="glass space-y-5 p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-secondary text-t-primary">
                  {opening ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <FileText className="h-5 w-5" aria-hidden="true" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-t-primary">{file.name}</p>
                  <p className="text-[13px] text-t-tertiary">
                    {opening ? t("ui.loading") : t("pdftext.ui.pageCount", { n: pageCount })}
                  </p>
                </div>
                <button type="button" onClick={reset} className={buttonSecondary}>
                  {t("pdftext.ui.newFile")}
                </button>
              </div>

              {pageCount > 0 && (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className={sectionTitle}>{t("pdftext.ui.pageRange")}</p>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="block">
                        <span className="mb-1.5 block text-[13px] text-t-secondary">{t("pdftext.ui.firstPage")}</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={pageCount}
                          value={fromText}
                          onChange={(e) => setFromText(e.target.value)}
                          onBlur={() => setFromText(String(range.from))}
                          aria-invalid={!range.valid || undefined}
                          className={inputClass}
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1.5 block text-[13px] text-t-secondary">{t("pdftext.ui.lastPage")}</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={pageCount}
                          value={toText}
                          onChange={(e) => setToText(e.target.value)}
                          onBlur={() => setToText(String(range.to))}
                          aria-invalid={!range.valid || undefined}
                          className={inputClass}
                        />
                      </label>
                    </div>
                    {!range.valid && (
                      <p role="alert" className="text-[12.5px] text-red-600 dark:text-red-400">
                        {t("pdftext.v2.rangeInvalid")}
                      </p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <p className={sectionTitle}>{t("pdftext.ui.mode")}</p>
                    <Segmented<TextMode>
                      label={t("pdftext.ui.mode")}
                      value={mode}
                      onChange={setMode}
                      options={[
                        { value: "flow", label: t("pdftext.ui.flow") },
                        { value: "lines", label: t("pdftext.ui.lines") },
                      ]}
                    />
                    <p className="text-[12.5px] text-t-tertiary">
                      {mode === "flow" ? t("pdftext.ui.flowHint") : t("pdftext.ui.linesHint")}
                    </p>
                    <Toggle
                      checked={includePageMarkers}
                      onChange={setIncludePageMarkers}
                      label={t("pdftext.ui.pageMarkers")}
                      description={t("pdftext.v2.markersHint")}
                    />
                  </div>
                </div>
              )}

              {(extracting || stopped) && (
                <div className="flex items-center gap-3" aria-live="polite">
                  <div className="min-w-0 flex-1">
                    <ProgressBar
                      progress={pct}
                      label={
                        extracting
                          ? t("pdftext.v2.progress", { done: progress.done, total: progress.total })
                          : t("pdftext.v2.stopped", { done: progress.done, total: progress.total })
                      }
                    />
                  </div>
                  {extracting ? (
                    <button type="button" onClick={stopExtraction} className={buttonSecondary}>
                      {t("bg.cancel")}
                    </button>
                  ) : (
                    <button type="button" onClick={resumeExtraction} className={buttonPrimary}>
                      {t("pdftext.v2.resume")}
                    </button>
                  )}
                </div>
              )}
            </div>

            {pages.length > 0 && (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {[
                    { label: t("pdftext.ui.pages"), value: fmt(totals.pages) },
                    { label: t("pdftext.ui.words"), value: fmt(totals.words) },
                    { label: t("pdftext.ui.characters"), value: fmt(totals.chars) },
                    { label: t("pdftext.v2.noTextPages"), value: fmt(totals.empty) },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-border bg-bg-secondary/60 p-4">
                      <p className="text-[12px] font-medium text-t-tertiary">{stat.label}</p>
                      <p className="mt-1 text-xl font-semibold tabular-nums text-t-primary">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {complete && totals.empty === totals.pages && (
                  <div className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[14px] text-t-secondary">
                    <ScanText className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
                    <p>
                      {t("pdftext.v2.allScanned")}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
                  <aside className="glass space-y-4 p-4 lg:sticky lg:top-20 lg:self-start">
                    <label className="block">
                      <span className="mb-1.5 block text-[13px] font-medium text-t-secondary">{t("pdftext.ui.search")}</span>
                      <span className="relative block">
                        <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-t-tertiary" aria-hidden="true" />
                        <input
                          type="search"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder={t("pdftext.ui.searchPlaceholder")}
                          className={`${inputClass} ps-9`}
                        />
                      </span>
                    </label>
                    {searchRegex && (
                      <p className="text-[12.5px] text-t-tertiary" aria-live="polite">
                        {t("pdftext.v2.matches", { n: fmt(totalMatches), pages: fmt(filteredPages.length) })}
                      </p>
                    )}
                    <div className="space-y-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedPage("all")}
                        aria-pressed={selectedPage === "all"}
                        className={`w-full rounded-xl px-3 py-2 text-start text-sm transition-colors ${
                          selectedPage === "all" ? "bg-accent text-on-accent" : "bg-bg-secondary text-t-secondary hover:text-t-primary"
                        }`}
                      >
                        {t("pdftext.ui.allPages")}
                      </button>
                      <p className="pt-2 text-[12px] font-medium text-t-tertiary">{t("pdftext.ui.matchingPages")}</p>
                      <div className="max-h-[420px] space-y-1.5 overflow-y-auto pe-1">
                        {filteredPages.length > 0 ? (
                          filteredPages.map((p) => (
                            <button
                              key={p.pageNumber}
                              type="button"
                              onClick={() => setSelectedPage(p.pageNumber)}
                              aria-pressed={selectedPage === p.pageNumber}
                              className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-start text-sm transition-colors ${
                                selectedPage === p.pageNumber ? "bg-accent text-on-accent" : "bg-bg-secondary text-t-secondary hover:text-t-primary"
                              }`}
                            >
                              <span className="font-medium">{pageLabel(p.pageNumber)}</span>
                              <span className="text-[12px] tabular-nums opacity-80">
                                {searchRegex
                                  ? t("pdftext.v2.matchCount", { n: fmt(p.matches) })
                                  : p.text.trim()
                                    ? t("pdftext.ui.wordCount", { n: fmt(p.words) })
                                    : t("pdftext.v2.noTextShort")}
                              </span>
                            </button>
                          ))
                        ) : (
                          <p className="rounded-xl bg-bg-secondary px-3 py-3 text-sm text-t-secondary">{t("pdftext.ui.noMatches")}</p>
                        )}
                      </div>
                    </div>
                  </aside>

                  <section className="glass min-w-0 space-y-4 p-4 sm:p-5">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => void copy(buildPlain(visiblePages, includePageMarkers && visiblePages.length > 1))} className={buttonSecondary}>
                        <Copy className="h-4 w-4" aria-hidden="true" />
                        {t("pdftext.ui.copyVisible")}
                      </button>
                      <button type="button" onClick={() => void copy(buildPlain(pages, includePageMarkers))} className={buttonSecondary}>
                        <Copy className="h-4 w-4" aria-hidden="true" />
                        {t("pdftext.ui.copyAll")}
                      </button>
                      <button type="button" onClick={downloadTxt} className={buttonSecondary}>
                        <FileDown className="h-4 w-4" aria-hidden="true" />
                        {t("pdftext.ui.downloadTxt")}
                      </button>
                      <button type="button" onClick={downloadMd} className={buttonSecondary}>
                        <FileDown className="h-4 w-4" aria-hidden="true" />
                        {t("pdftext.v2.downloadMd")}
                      </button>
                      <button type="button" onClick={downloadJson} className={buttonSecondary}>
                        <FileDown className="h-4 w-4" aria-hidden="true" />
                        {t("pdftext.ui.downloadJson")}
                      </button>
                    </div>

                    {visiblePages.length === 0 ? (
                      <p className="rounded-xl bg-bg-secondary px-4 py-6 text-center text-sm text-t-secondary">{t("pdftext.ui.noMatches")}</p>
                    ) : (
                      <div className="space-y-4">
                        {visiblePages.slice(0, renderLimit).map((p) => (
                          <article
                            key={p.pageNumber}
                            className="rounded-2xl border border-border bg-bg-secondary/50 [content-visibility:auto] [contain-intrinsic-size:auto_320px]"
                          >
                            <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
                              <h3 className="text-[13px] font-semibold text-t-primary">
                                {pageLabel(p.pageNumber)}
                                {p.text.trim() && (
                                  <span className="ms-2 font-normal text-t-tertiary">
                                    {t("pdftext.ui.wordCount", { n: fmt(p.words) })}
                                  </span>
                                )}
                              </h3>
                              {p.text.trim() && (
                                <button
                                  type="button"
                                  onClick={() => void copy(p.text)}
                                  className="flex h-9 w-9 items-center justify-center rounded-lg text-t-tertiary hover:bg-bg-tertiary hover:text-t-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
                                  aria-label={t("pdftext.v2.copyPage", { n: p.pageNumber })}
                                  title={t("pdftext.v2.copyPage", { n: p.pageNumber })}
                                >
                                  <Copy className="h-4 w-4" aria-hidden="true" />
                                </button>
                              )}
                            </header>
                            {p.text.trim() ? (
                              <div
                                dir={p.rtl ? "rtl" : "auto"}
                                className="whitespace-pre-wrap break-words px-4 py-3 text-start text-[14px] leading-relaxed text-t-primary"
                              >
                                {highlight(p.text, searchRegex)}
                              </div>
                            ) : (
                              <p className="flex items-start gap-2 px-4 py-3 text-[13.5px] text-t-secondary">
                                <ScanText className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                                <span>
                                  {t("pdftext.v2.scannedPage")}
                                </span>
                              </p>
                            )}
                          </article>
                        ))}
                        {visiblePages.length > renderLimit && <div ref={sentinelRef} className="h-8" aria-hidden="true" />}
                      </div>
                    )}
                  </section>
                </div>
              </>
            )}

            {pageCount > 0 && pages.length === 0 && !extracting && !stopped && range.valid && (
              <div className="glass flex items-center justify-center gap-2 p-6 text-sm text-t-secondary">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t("pdftext.ui.extracting")}
              </div>
            )}
          </>
        )}
        {file && !opening && pageCount === 0 && (
          <button type="button" onClick={reset} className={buttonSecondary}>
            <X className="h-4 w-4" aria-hidden="true" />
            {t("pdftext.ui.newFile")}
          </button>
        )}
      </div>
    </ToolLayout>
  );
}
