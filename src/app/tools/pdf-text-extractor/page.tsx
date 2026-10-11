"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { PDFDocument } from "pdf-lib";
import { openPdf } from "@/lib/pdfjs";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProgressBar from "@/components/ProgressBar";
import { downloadBlob } from "@/lib/utils";
import { pdfInputErrorKey, toEditablePdf } from "@/lib/pdf-input";
import { useI18n } from "@/lib/i18n";

type ExtractionMode = "flow" | "lines";

interface ExtractedPage {
  pageNumber: number;
  text: string;
  wordCount: number;
  charCount: number;
}

interface PdfTextItemLike {
  str?: string;
  transform?: number[];
  hasEOL?: boolean;
}

function countWords(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized ? normalized.split(" ").length : 0;
}

function extractPageText(items: PdfTextItemLike[], mode: ExtractionMode) {
  const normalizedItems = items
    .map((item) => ({
      text: typeof item.str === "string" ? item.str.trim() : "",
      x: Array.isArray(item.transform) ? item.transform[4] ?? 0 : 0,
      y: Array.isArray(item.transform) ? item.transform[5] ?? 0 : 0,
      hasEOL: Boolean(item.hasEOL),
    }))
    .filter((item) => item.text.length > 0);

  if (mode === "flow") {
    return normalizedItems
      .sort((a, b) => {
        if (Math.abs(a.y - b.y) > 2) return b.y - a.y;
        return a.x - b.x;
      })
      .map((item) => item.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  const sorted = [...normalizedItems].sort((a, b) => {
    if (Math.abs(a.y - b.y) > 2) return b.y - a.y;
    return a.x - b.x;
  });

  const lines: Array<{ y: number; parts: typeof sorted }> = [];
  sorted.forEach((item) => {
    const target = lines.find((line) => Math.abs(line.y - item.y) <= 3.5);
    if (target) {
      target.parts.push(item);
      return;
    }
    lines.push({ y: item.y, parts: [item] });
  });

  return lines
    .filter((line) => line.parts.length > 0)
    .map((line) =>
      line.parts
        .sort((a, b) => a.x - b.x)
        .map((part) => part.text)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean)
    .join("\n");
}

export default function PdfTextExtractorPage() {
  const { t } = useI18n();

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(1);
  const [mode, setMode] = useState<ExtractionMode>("flow");
  const [includePageMarkers, setIncludePageMarkers] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPage, setSelectedPage] = useState<number | "all">("all");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [pages, setPages] = useState<ExtractedPage[]>([]);

  const normalizedRange = useMemo(() => {
    if (!pageCount) return { from: 1, to: 1 };
    const from = Math.min(pageCount, Math.max(1, rangeStart || 1));
    const to = Math.min(pageCount, Math.max(from, rangeEnd || pageCount));
    return { from, to };
  }, [pageCount, rangeEnd, rangeStart]);

  const filteredPages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return pages;
    return pages.filter((page) => page.text.toLowerCase().includes(query));
  }, [pages, searchQuery]);

  useEffect(() => {
    if (selectedPage === "all") return;
    if (!filteredPages.some((page) => page.pageNumber === selectedPage)) {
      setSelectedPage("all");
    }
  }, [filteredPages, selectedPage]);

  const buildCombinedText = useCallback(
    (pageList: ExtractedPage[]) =>
      pageList
        .map((page) =>
          includePageMarkers
            ? `--- ${t("pdftext.ui.page", { n: page.pageNumber })} ---\n${page.text}`
            : page.text,
        )
        .join("\n\n")
        .trim(),
    [includePageMarkers, t],
  );

  const fullText = useMemo(() => buildCombinedText(pages), [buildCombinedText, pages]);
  const visibleText = useMemo(() => {
    if (selectedPage === "all") {
      return buildCombinedText(filteredPages);
    }
    return filteredPages.find((page) => page.pageNumber === selectedPage)?.text ?? "";
  }, [buildCombinedText, filteredPages, selectedPage]);

  const visibleTotals = useMemo(() => {
    const source = selectedPage === "all"
      ? filteredPages
      : filteredPages.filter((page) => page.pageNumber === selectedPage);

    return {
      pages: source.length,
      words: source.reduce((sum, page) => sum + page.wordCount, 0),
      characters: source.reduce((sum, page) => sum + page.charCount, 0),
    };
  }, [filteredPages, selectedPage]);

  const totalTotals = useMemo(
    () => ({
      pages: pages.length,
      words: pages.reduce((sum, page) => sum + page.wordCount, 0),
      characters: pages.reduce((sum, page) => sum + page.charCount, 0),
    }),
    [pages],
  );

  const handleFile = useCallback(
    async (files: File[]) => {
      const picked = files.find(
        (currentFile) =>
          currentFile.type === "application/pdf" || currentFile.name.toLowerCase().endsWith(".pdf"),
      );
      if (!picked) {
        toast.error(t("pdftext.ui.invalidFile"));
        return;
      }
      let pdf: File;
      try {
        pdf = await toEditablePdf(picked);
      } catch (error) {
        console.error(error);
        toast.error(t(pdfInputErrorKey(error)));
        return;
      }

      setFile(pdf);
      setPages([]);
      setDone(false);
      setProgress(0);
      setSelectedPage("all");
      setSearchQuery("");

      try {
        const pdfDoc = await PDFDocument.load(await pdf.arrayBuffer());
        const detectedPageCount = pdfDoc.getPageCount();
        setPageCount(detectedPageCount);
        setRangeStart(1);
        setRangeEnd(detectedPageCount);
      } catch (error) {
        console.error(error);
        setFile(null);
        setPageCount(0);
        toast.error(t("pdftext.ui.invalidPdf"));
      }
    },
    [t],
  );

  const handleExtract = useCallback(async () => {
    if (!file) return;

    setProcessing(true);
    setProgress(6);
    setPages([]);
    setDone(false);
    setSelectedPage("all");

    try {
      const arrayBuffer = await file.arrayBuffer();
      setProgress(16);

      setProgress(30);

      const pdf = await openPdf(arrayBuffer);
      const maxPages = pdf.numPages;
      const from = Math.min(maxPages, Math.max(1, rangeStart || 1));
      const to = Math.min(maxPages, Math.max(from, rangeEnd || maxPages));

      const extracted: ExtractedPage[] = [];
      const totalToProcess = to - from + 1;
      for (let pageNumber = from; pageNumber <= to; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const pageText = extractPageText(content.items as PdfTextItemLike[], mode);

        extracted.push({
          pageNumber,
          text: pageText,
          wordCount: countWords(pageText),
          charCount: pageText.length,
        });

        const processed = pageNumber - from + 1;
        setProgress(30 + Math.round((processed / totalToProcess) * 68));
      }

      setPages(extracted);
      setDone(true);
      setProgress(100);
      toast.success(t("pdftext.ui.success", { n: extracted.length }));
    } catch (error) {
      console.error(error);
      toast.error(t("pdftext.ui.fail"));
    } finally {
      setProcessing(false);
    }
  }, [file, mode, rangeEnd, rangeStart, t]);

  const handleCopy = useCallback(
    async (value: string) => {
      if (!value.trim()) return;
      try {
        await navigator.clipboard.writeText(value);
        toast.success(t("pdftext.ui.copied"));
      } catch {
        toast.error(t("pdftext.ui.copyFailed"));
      }
    },
    [t],
  );

  const handleDownloadTxt = useCallback(() => {
    if (!file || !fullText) return;
    const blob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    const name = file.name.replace(/\.pdf$/i, "") + "-text.txt";
    downloadBlob(blob, name);
  }, [file, fullText]);

  const handleDownloadJson = useCallback(() => {
    if (!file || pages.length === 0) return;
    const payload = {
      fileName: file.name,
      extractedAt: new Date().toISOString(),
      mode,
      pageRange: normalizedRange,
      pages,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const name = file.name.replace(/\.pdf$/i, "") + "-text.json";
    downloadBlob(blob, name);
  }, [file, mode, normalizedRange, pages]);

  const reset = useCallback(() => {
    setFile(null);
    setPageCount(0);
    setRangeStart(1);
    setRangeEnd(1);
    setSearchQuery("");
    setSelectedPage("all");
    setProcessing(false);
    setProgress(0);
    setDone(false);
    setPages([]);
  }, []);

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
            <div className="glass rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.22em] text-t-secondary">
                    {t("pdftext.ui.fileReady")}
                  </p>
                  <p className="mt-2 truncate text-lg font-semibold text-t-primary">
                    {file.name}
                  </p>
                  <p className="mt-1 text-sm text-t-secondary">
                    {t("pdftext.ui.pageCount", { n: pageCount })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl border border-border bg-bg-secondary px-4 py-2 text-sm font-medium text-t-secondary transition-colors hover:text-t-primary"
                >
                  {t("pdftext.ui.newFile")}
                </button>
              </div>

              <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-2xl border border-border bg-bg-secondary/60 p-4 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-t-primary">{t("pdftext.ui.options")}</p>
                    <p className="mt-1 text-xs text-t-secondary">{t("pdftext.ui.pageMarkersHint")}</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-t-secondary">
                        {t("pdftext.ui.firstPage")}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={pageCount}
                        value={rangeStart}
                        onChange={(event) => setRangeStart(Number(event.target.value || 1))}
                        className="w-full rounded-xl border border-border bg-bg-primary px-3 py-2.5 text-sm text-t-primary focus:border-accent/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-t-secondary">
                        {t("pdftext.ui.lastPage")}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={pageCount}
                        value={rangeEnd}
                        onChange={(event) => setRangeEnd(Number(event.target.value || pageCount))}
                        className="w-full rounded-xl border border-border bg-bg-primary px-3 py-2.5 text-sm text-t-primary focus:border-accent/50 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-t-secondary">
                      {t("pdftext.ui.mode")}
                    </label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setMode("flow")}
                        className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                          mode === "flow"
                            ? "border-accent bg-accent/15 text-t-primary"
                            : "border-border bg-bg-primary text-t-secondary hover:border-accent/40"
                        }`}
                      >
                        <span className="block text-sm font-medium">{t("pdftext.ui.flow")}</span>
                        <span className="mt-1 block text-xs text-t-secondary">{t("pdftext.ui.flowHint")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode("lines")}
                        className={`rounded-xl border px-4 py-3 text-left transition-colors ${
                          mode === "lines"
                            ? "border-accent bg-accent/15 text-t-primary"
                            : "border-border bg-bg-primary text-t-secondary hover:border-accent/40"
                        }`}
                      >
                        <span className="block text-sm font-medium">{t("pdftext.ui.lines")}</span>
                        <span className="mt-1 block text-xs text-t-secondary">{t("pdftext.ui.linesHint")}</span>
                      </button>
                    </div>
                  </div>

                  <label className="flex items-start gap-3 rounded-xl border border-border bg-bg-primary px-4 py-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includePageMarkers}
                      onChange={(event) => setIncludePageMarkers(event.target.checked)}
                      className="mt-0.5 accent-accent"
                    />
                    <div>
                      <span className="block text-sm font-medium text-t-primary">
                        {t("pdftext.ui.pageMarkers")}
                      </span>
                      <span className="mt-1 block text-xs text-t-secondary">
                        {t("pdftext.ui.pageMarkersHint")}
                      </span>
                    </div>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-bg-secondary/60 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                      {t("pdftext.ui.pageRange")}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-t-primary">
                      {normalizedRange.from}-{normalizedRange.to}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-secondary/60 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                      {t("pdftext.ui.pages")}
                    </p>
                    <p className="mt-2 text-xl font-semibold text-t-primary">
                      {done ? totalTotals.pages : normalizedRange.to - normalizedRange.from + 1}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-secondary/60 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                      {t("pdftext.ui.summary")}
                    </p>
                    <p className="mt-2 text-sm font-medium text-t-primary">
                      {mode === "flow" ? t("pdftext.ui.flow") : t("pdftext.ui.lines")}
                    </p>
                  </div>

                  <div className="sm:col-span-3">
                    <button
                      type="button"
                      onClick={handleExtract}
                      disabled={processing}
                      className={`w-full rounded-2xl px-6 py-3 text-sm font-semibold text-on-accent transition-all ${
                        processing
                          ? "cursor-not-allowed bg-bg-primary text-t-secondary"
                          : "bg-accent hover:shadow-lg hover:shadow-sm"
                      }`}
                    >
                      {processing ? t("pdftext.ui.extracting") : t("pdftext.ui.extract")}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {(processing || progress > 0) && (
              <div className="glass rounded-2xl p-4">
                <ProgressBar progress={progress} label={processing ? t("pdftext.ui.extracting") : undefined} />
              </div>
            )}

            {done && (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-2xl border border-border bg-bg-secondary/60 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                      {t("pdftext.ui.pages")}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-t-primary">{totalTotals.pages}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-secondary/60 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                      {t("pdftext.ui.words")}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-t-primary">
                      {totalTotals.words.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-secondary/60 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                      {t("pdftext.ui.characters")}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-t-primary">
                      {totalTotals.characters.toLocaleString()}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-secondary/60 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                      {t("pdftext.ui.filteredCount")}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-t-primary">
                      {visibleTotals.pages} / {totalTotals.pages}
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
                  <aside className="glass rounded-2xl p-4 space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-t-secondary">
                        {t("pdftext.ui.search")}
                      </label>
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(event) => setSearchQuery(event.target.value)}
                        placeholder={t("pdftext.ui.searchPlaceholder")}
                        className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-t-primary placeholder:text-t-secondary/50 focus:border-accent/50 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPage("all")}
                        className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                          selectedPage === "all"
                            ? "border-accent bg-accent/15 text-t-primary"
                            : "border-border bg-bg-secondary text-t-secondary hover:border-accent/40 hover:text-t-primary"
                        }`}
                      >
                        {t("pdftext.ui.allPages")}
                      </button>

                      <div>
                        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-t-secondary">
                          {t("pdftext.ui.matchingPages")}
                        </p>
                        <div className="space-y-2 max-h-[420px] overflow-y-auto pe-1">
                          {filteredPages.length > 0 ? (
                            filteredPages.map((page) => (
                              <button
                                key={page.pageNumber}
                                type="button"
                                onClick={() => setSelectedPage(page.pageNumber)}
                                className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                                  selectedPage === page.pageNumber
                                    ? "border-accent bg-accent/15 text-t-primary"
                                    : "border-border bg-bg-secondary text-t-secondary hover:border-accent/40 hover:text-t-primary"
                                }`}
                              >
                                <span className="block text-sm font-medium">
                                  {t("pdftext.ui.page", { n: page.pageNumber })}
                                </span>
                                <span className="mt-1 block text-xs text-t-secondary">
                                  {t("pdftext.ui.wordCount", { n: page.wordCount.toLocaleString() })}
                                </span>
                              </button>
                            ))
                          ) : (
                            <div className="rounded-xl border border-border bg-bg-secondary px-3 py-3 text-sm text-t-secondary">
                              {t("pdftext.ui.noMatches")}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </aside>

                  <section className="glass rounded-2xl p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-t-primary">{t("ui.output")}</p>
                        <p className="mt-1 text-xs text-t-secondary">
                          {selectedPage === "all"
                            ? t("pdftext.ui.pageCount", { n: visibleTotals.pages })
                            : t("pdftext.ui.page", { n: selectedPage })}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void handleCopy(visibleText)}
                          className="rounded-xl border border-border bg-bg-secondary px-4 py-2 text-sm font-medium text-t-secondary transition-colors hover:text-t-primary"
                        >
                          {t("pdftext.ui.copyVisible")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleCopy(fullText)}
                          className="rounded-xl border border-border bg-bg-secondary px-4 py-2 text-sm font-medium text-t-secondary transition-colors hover:text-t-primary"
                        >
                          {t("pdftext.ui.copyAll")}
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadTxt}
                          className="rounded-xl border border-border bg-bg-secondary px-4 py-2 text-sm font-medium text-t-secondary transition-colors hover:text-t-primary"
                        >
                          {t("pdftext.ui.downloadTxt")}
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadJson}
                          className="rounded-xl border border-border bg-bg-secondary px-4 py-2 text-sm font-medium text-t-secondary transition-colors hover:text-t-primary"
                        >
                          {t("pdftext.ui.downloadJson")}
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-2xl border border-border bg-bg-secondary/60 p-4">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                          {t("pdftext.ui.pages")}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-t-primary">{visibleTotals.pages}</p>
                      </div>
                      <div className="rounded-2xl border border-border bg-bg-secondary/60 p-4">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                          {t("pdftext.ui.words")}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-t-primary">
                          {visibleTotals.words.toLocaleString()}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-border bg-bg-secondary/60 p-4">
                        <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                          {t("pdftext.ui.characters")}
                        </p>
                        <p className="mt-2 text-lg font-semibold text-t-primary">
                          {visibleTotals.characters.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <textarea
                      readOnly
                      value={visibleText || t("pdftext.ui.nothingToShow")}
                      className="h-[520px] w-full resize-y rounded-2xl border border-border bg-bg-secondary px-4 py-4 font-mono text-sm text-t-primary focus:border-accent/40 focus:outline-none"
                    />

                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-sm text-t-secondary">
                      {t("pdftext.ui.ocrHint")}{" "}
                      <Link href="/tools/ocr" className="font-medium text-amber-700 dark:text-amber-400 underline underline-offset-4">
                        {t("pdftext.ui.ocrLink")}
                      </Link>
                      .
                    </div>
                  </section>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </ToolLayout>
  );
}
