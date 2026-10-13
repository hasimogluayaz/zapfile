"use client";

/**
 * PDF → Word / Excel converter UI. Converts as soon as a file is dropped,
 * shows real per-page progress (cancellable), re-runs when options change and
 * explains what was found (headings, tables, images, scanned pages).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { PDFDocumentProxy } from "pdfjs-dist";
import {
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  Heading,
  Image as ImageIcon,
  List,
  Loader2,
  PanelTop,
  Presentation,
  RefreshCw,
  Table2,
  X,
} from "lucide-react";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import { Segmented, Toggle, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { useI18n } from "@/lib/i18n";
import { formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { PdfLockedError } from "@/lib/pdf-input";
import { parsePageRanges, rangesToPages } from "@/lib/split-pdf-ranges";
import { convertPdf, openForConversion, type ConvertProgress, type ConvertStats, type XlsxOptions } from "@/lib/pdf-convert/client";
import { renderRegion } from "@/lib/pdf-convert/extract";

type Kind = "docx" | "xlsx" | "pptx" | "md";

interface Loaded {
  file: File;
  pdf: PDFDocumentProxy;
  pages: number;
  cover: string | null;
}

interface Result {
  blob: Blob;
  stats: ConvertStats;
  key: string;
  name: string;
  preview?: string;
}

export default function PdfConvertTool({ kind }: { kind: Kind }) {
  const { t } = useI18n();
  // Singular forms live under "<key>One" (English "1 table", not "1 tables").
  const tn = (key: string, n: number) => t(n === 1 ? `${key}One` : key, { n });
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [opening, setOpening] = useState(false);
  const [lockedName, setLockedName] = useState<string | null>(null);
  const [pageMode, setPageMode] = useState<"all" | "custom">("all");
  const [rangeText, setRangeText] = useState("");
  const [keepPageBreaks, setKeepPageBreaks] = useState(true);
  const [sheetLayout, setSheetLayout] = useState<XlsxOptions["layout"]>("page");
  const [tablesOnly, setTablesOnly] = useState(false);
  const [numbers, setNumbers] = useState(true);
  const [mdImages, setMdImages] = useState(false);
  const [progress, setProgress] = useState<ConvertProgress | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [failed, setFailed] = useState(false);
  const runRef = useRef<AbortController | null>(null);
  const loadedRef = useRef<Loaded | null>(null);
  loadedRef.current = loaded;

  // Free the pdf.js document and preview on replace / unmount.
  useEffect(() => {
    return () => {
      runRef.current?.abort();
      const l = loadedRef.current;
      if (l) {
        void l.pdf.destroy();
        if (l.cover) URL.revokeObjectURL(l.cover);
      }
    };
  }, []);

  const range = useMemo(() => {
    if (!loaded || pageMode === "all") return { pages: null as number[] | null, error: null as string | null };
    if (!rangeText.trim()) return { pages: null, error: t("p2o.rangeEmpty") };
    const parsed = parsePageRanges(rangeText, loaded.pages);
    if (parsed.error) return { pages: null, error: t(parsed.error.key, parsed.error.params) };
    const pages = Array.from(new Set(rangesToPages(parsed.ranges))).sort((a, b) => a - b);
    return pages.length ? { pages, error: null } : { pages: null, error: t("p2o.rangeEmpty") };
  }, [loaded, pageMode, rangeText, t]);

  const settingsKey = JSON.stringify([kind, range.pages, keepPageBreaks, sheetLayout, tablesOnly, numbers, mdImages]);
  const fresh = result && result.key === settingsKey ? result : null;
  const running = progress !== null;

  const run = useCallback(
    async (target: Loaded, key: string) => {
      runRef.current?.abort();
      const ac = new AbortController();
      runRef.current = ac;
      setFailed(false);
      setProgress({ phase: "reading", done: 0, total: range.pages?.length ?? target.pages });
      try {
        const title = getFileNameWithoutExtension(target.file.name);
        const res = await convertPdf(
          target.pdf,
          {
            kind,
            pages: range.pages,
            keepPageBreaks,
            xlsx: { layout: sheetLayout, tablesOnly, numbers },
            mdImages,
            title,
          },
          (p) => {
            if (runRef.current === ac) setProgress(p);
          },
          ac.signal,
        );
        if (runRef.current !== ac) return;
        setResult({ blob: res.blob, stats: res.stats, key, name: `${title}.${kind === "md" ? (res.zip ? "zip" : "md") : kind}`, preview: res.preview });
      } catch (error) {
        if ((error as { name?: string })?.name === "AbortError") return;
        console.error(error);
        if (runRef.current === ac) {
          setFailed(true);
          toast.error(t("p2o.failed"));
        }
      } finally {
        if (runRef.current === ac) {
          runRef.current = null;
          setProgress(null);
        }
      }
    },
    [kind, keepPageBreaks, numbers, mdImages, range.pages, sheetLayout, tablesOnly, t],
  );

  const handleFiles = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      runRef.current?.abort();
      runRef.current = null;
      setProgress(null);
      setResult(null);
      setFailed(false);
      setLockedName(null);
      const prev = loadedRef.current;
      if (prev) {
        void prev.pdf.destroy();
        if (prev.cover) URL.revokeObjectURL(prev.cover);
      }
      setLoaded(null);
      setOpening(true);
      try {
        const pdf = await openForConversion(file);
        let cover: string | null = null;
        try {
          const img = await renderRegion(pdf, 1, null, 36);
          cover = URL.createObjectURL(new Blob([img.bytes], { type: img.mime }));
        } catch {
          cover = null;
        }
        const next: Loaded = { file, pdf, pages: pdf.numPages, cover };
        setPageMode("all");
        setRangeText("");
        setLoaded(next);
      } catch (error) {
        if (error instanceof PdfLockedError) setLockedName(file.name);
        else toast.error(t("p2o.unreadable"));
      } finally {
        setOpening(false);
      }
    },
    [t],
  );

  // Convert automatically on load and whenever the options change.
  useEffect(() => {
    if (!loaded || range.error) return;
    if (result?.key === settingsKey) return;
    const timer = window.setTimeout(() => void run(loaded, settingsKey), pageMode === "custom" ? 450 : 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, settingsKey, range.error]);

  const reset = () => {
    runRef.current?.abort();
    runRef.current = null;
    setProgress(null);
    setResult(null);
    const prev = loadedRef.current;
    if (prev) {
      void prev.pdf.destroy();
      if (prev.cover) URL.revokeObjectURL(prev.cover);
    }
    setLoaded(null);
  };

  const cancel = () => {
    runRef.current?.abort();
    runRef.current = null;
    setProgress(null);
    toast(t("p2o.cancelled"));
  };

  const Icon = kind === "docx" || kind === "md" ? FileText : kind === "pptx" ? Presentation : FileSpreadsheet;
  const stats = fresh?.stats;

  return (
    <div className="space-y-5">
      {!loaded && (
        <>
          <FileDropzone
            onFilesSelected={handleFiles}
            accept={{ "application/pdf": [".pdf"] }}
            formats={["PDF"]}
            label={opening ? t("p2o.opening") : t("p2o.drop")}
          />
          {lockedName && (
            <div role="alert" className="glass flex items-start gap-3 p-4 text-[14px]">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-t-secondary" aria-hidden="true" />
              <p className="text-t-primary">
                {t("p2o.locked", { name: lockedName })}{" "}
                <Link href="/tools/pdf-encrypt" className="font-medium underline underline-offset-4">
                  {t("p2o.unlockLink")}
                </Link>
              </p>
            </div>
          )}
        </>
      )}

      {loaded && (
        <>
          <div className="glass flex items-center gap-4 p-4">
            <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white">
              {loaded.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={loaded.cover} alt="" className="h-full w-full object-contain" />
              ) : (
                <FileText className="h-5 w-5 text-t-tertiary" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-t-primary" title={loaded.file.name}>
                {loaded.file.name}
              </p>
              <p className="text-[13px] text-t-tertiary tabular-nums">
                {formatFileSize(loaded.file.size)} · {t(loaded.pages === 1 ? "pdfsec.pagesOne" : "pdfsec.pages", { count: loaded.pages })}
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="flex h-10 w-10 items-center justify-center rounded-full text-t-tertiary hover:bg-bg-secondary hover:text-t-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
              aria-label={t("p2o.otherFile")}
              title={t("p2o.otherFile")}
            >
              <X className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </div>

          <div className="glass space-y-5 p-5">
            <div className="space-y-2">
              <p className={sectionTitle}>{t("p2o.pages")}</p>
              <div className="flex flex-wrap items-center gap-3">
                <Segmented<"all" | "custom">
                  label={t("p2o.pages")}
                  size="sm"
                  value={pageMode}
                  onChange={setPageMode}
                  options={[
                    { value: "all", label: t("p2o.allPages") },
                    { value: "custom", label: t("p2o.somePages") },
                  ]}
                />
                {pageMode === "custom" && (
                  <input
                    type="text"
                    inputMode="numeric"
                    value={rangeText}
                    onChange={(e) => setRangeText(e.target.value)}
                    placeholder={t("p2o.rangePlaceholder", { n: loaded.pages })}
                    aria-label={t("p2o.pages")}
                    aria-invalid={!!range.error}
                    className={`h-10 min-w-0 flex-1 rounded-xl border bg-bg-secondary px-3 text-[14px] text-t-primary placeholder:text-t-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60 sm:max-w-xs ${
                      range.error && rangeText ? "border-red-500/60" : "border-border"
                    }`}
                  />
                )}
              </div>
              {pageMode === "custom" && range.error && rangeText && (
                <p className="text-[12.5px] text-red-700 dark:text-red-400">{range.error}</p>
              )}
            </div>

            {kind === "docx" ? (
              <Toggle
                checked={keepPageBreaks}
                onChange={setKeepPageBreaks}
                label={t("p2o.keepBreaks")}
                description={t("p2o.keepBreaksHint")}
              />
            ) : kind === "pptx" ? null : kind === "md" ? (
              <Toggle checked={mdImages} onChange={setMdImages} label={t("p2o.mdImages")} description={t("p2o.mdImagesHint")} />
            ) : (
              <>
                <div className="space-y-2">
                  <p className={sectionTitle}>{t("p2o.sheets")}</p>
                  <Segmented<XlsxOptions["layout"]>
                    label={t("p2o.sheets")}
                    size="sm"
                    value={sheetLayout}
                    onChange={setSheetLayout}
                    options={[
                      { value: "page", label: t("p2o.sheetPerPage") },
                      { value: "table", label: t("p2o.sheetPerTable") },
                      { value: "single", label: t("p2o.sheetSingle") },
                    ]}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* One sheet per table holds only tables anyway. */}
                  {sheetLayout !== "table" && (
                    <Toggle checked={tablesOnly} onChange={setTablesOnly} label={t("p2o.tablesOnly")} description={t("p2o.tablesOnlyHint")} />
                  )}
                  <Toggle checked={numbers} onChange={setNumbers} label={t("p2o.numbers")} description={t("p2o.numbersHint")} />
                </div>
              </>
            )}
          </div>

          <div className="glass space-y-4 p-5" aria-live="polite">
            {running ? (
              <div className="space-y-3">
                <ProgressBar
                  progress={
                    progress!.phase === "writing"
                      ? 92
                      : Math.round(4 + (progress!.done / Math.max(1, progress!.total)) * 84)
                  }
                  label={
                    progress!.phase === "writing"
                      ? kind === "docx"
                        ? t("p2o.writingDocx")
                        : kind === "pptx"
                          ? t("p2o.writingPptx")
                          : kind === "md"
                            ? t("p2o.writingMd")
                          : t("p2o.writingXlsx")
                      : t("p2o.reading", { done: Math.min(progress!.done + 1, progress!.total), total: progress!.total })
                  }
                />
                <button type="button" onClick={cancel} className={buttonSecondary}>
                  {t("bg.cancel")}
                </button>
              </div>
            ) : fresh ? (
              <>
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-bg-secondary text-t-primary">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <div className="min-w-[9rem] flex-1">
                    <p className="truncate text-[15px] font-semibold text-t-primary" title={fresh.name}>{fresh.name}</p>
                    <p className="text-[13px] tabular-nums text-t-tertiary">{formatFileSize(fresh.blob.size)}</p>
                  </div>
                  <DownloadButton blob={fresh.blob} filename={fresh.name} label={kind === "docx" ? t("p2o.downloadDocx") : kind === "pptx" ? t("p2o.downloadPptx") : kind === "md" ? t(fresh.name.endsWith(".zip") ? "p2o.downloadMdZip" : "p2o.downloadMd") : t("p2o.downloadXlsx")} />
                </div>
                {stats && (
                  <ul className="flex flex-wrap gap-2 text-[12.5px] text-t-secondary">
                    {kind === "docx" || kind === "md" ? (
                      <>
                        {stats.headings > 0 && <Chip icon={<Heading className="h-3.5 w-3.5" />} text={tn("p2o.statHeadings", stats.headings)} />}
                        {stats.paragraphs > 0 && <Chip icon={<FileText className="h-3.5 w-3.5" />} text={tn("p2o.statParagraphs", stats.paragraphs)} />}
                        {stats.lists > 0 && <Chip icon={<List className="h-3.5 w-3.5" />} text={tn("p2o.statLists", stats.lists)} />}
                        {stats.tables > 0 && <Chip icon={<Table2 className="h-3.5 w-3.5" />} text={tn("p2o.statTables", stats.tables)} />}
                        {stats.images > 0 && <Chip icon={<ImageIcon className="h-3.5 w-3.5" />} text={tn("p2o.statImages", stats.images)} />}
                        {(stats.header || stats.footer) && <Chip icon={<PanelTop className="h-3.5 w-3.5" />} text={t("p2o.statHeaderFooter")} />}
                      </>
                    ) : kind === "pptx" ? (
                      <>
                        <Chip icon={<Presentation className="h-3.5 w-3.5" />} text={tn("p2o.statSlides", stats.slides ?? 0)} />
                        {(stats.textBoxes ?? 0) > 0 && <Chip icon={<FileText className="h-3.5 w-3.5" />} text={tn("p2o.statTextBoxes", stats.textBoxes ?? 0)} />}
                        {stats.images > 0 && <Chip icon={<ImageIcon className="h-3.5 w-3.5" />} text={tn("p2o.statImages", stats.images)} />}
                      </>
                    ) : (
                      <>
                        <Chip icon={<FileSpreadsheet className="h-3.5 w-3.5" />} text={tn("p2o.statSheets", stats.sheets ?? 1)} />
                        <Chip icon={<Table2 className="h-3.5 w-3.5" />} text={tn("p2o.statTables", stats.tables)} />
                        <Chip icon={<List className="h-3.5 w-3.5" />} text={tn("p2o.statRows", stats.rows ?? 0)} />
                      </>
                    )}
                  </ul>
                )}
                {stats && stats.scannedPages > 0 && (
                  <p className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-[13px] text-t-secondary">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                    {tn(kind === "xlsx" ? "p2o.scannedXlsx" : kind === "md" ? "p2o.scannedMd" : "p2o.scannedDocx", stats.scannedPages)}
                  </p>
                )}
                {kind === "md" && fresh.preview && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className={sectionTitle}>{t("meme.preview")}</p>
                      <button
                        type="button"
                        className={buttonSecondary}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(fresh.preview ?? "");
                            toast.success(t("ui.copied"));
                          } catch {
                            toast.error(t("ui.copyFailed"));
                          }
                        }}
                      >
                        {t("ui.copy")}
                      </button>
                    </div>
                    <pre dir="auto" className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-bg-secondary p-3 font-mono text-[12.5px] leading-5 text-t-primary">{fresh.preview}</pre>
                  </div>
                )}
                {kind === "xlsx" && stats && stats.tables === 0 && (
                  <p className="text-[13px] text-t-tertiary">{t("p2o.noTables")}</p>
                )}
              </>
            ) : failed ? (
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[14px] text-red-700 dark:text-red-400">{t("p2o.failed")}</p>
                <button type="button" onClick={() => loaded && void run(loaded, settingsKey)} className={buttonPrimary}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  {t("p2o.retry")}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[14px] text-t-secondary">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {range.error ? range.error : t("p2o.preparing")}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Chip({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-secondary px-3 py-1">
      <span className="text-t-tertiary" aria-hidden="true">
        {icon}
      </span>
      {text}
    </li>
  );
}
