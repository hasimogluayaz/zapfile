"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ArrowLeftRight, ChevronLeft, ChevronRight, FileText, Loader2, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProgressBar from "@/components/ProgressBar";
import { Toggle, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { formatFileSize } from "@/lib/utils";
import { PdfLockedError } from "@/lib/pdf-input";
import { openPdf } from "@/lib/pdfjs";
import { readWords } from "@/lib/pdf-convert/words";
import { renderPagePreview, type PagePreview } from "@/lib/pdf-stamp/preview";
import { useI18n } from "@/lib/i18n";
import { compareDocs, highlightBoxes, type Comparison, type DocText } from "./compare-core";

interface Side {
  file: File;
  pdf: PDFDocumentProxy;
  pages: number;
  text: DocText;
}

function PageView({ side, page, mark, tone, label }: { side: Side; page: number; mark: Uint8Array | null; tone: "removed" | "added"; label: string }) {
  const [preview, setPreview] = useState<PagePreview | null>(null);
  const [w, setW] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (!w || page > side.pages) return;
    let cancelled = false;
    renderPagePreview(side.pdf, page, Math.min(1600, Math.round(w * Math.min(2, window.devicePixelRatio || 1)))).then((p) => {
      if (cancelled) return p.bitmap.close();
      setPreview((old) => {
        old?.bitmap.close();
        return p;
      });
    }, () => undefined);
    return () => {
      cancelled = true;
    };
  }, [side, page, w]);
  useEffect(() => {
    const c = canvas.current;
    if (!c || !preview) return;
    c.width = preview.bitmap.width;
    c.height = preview.bitmap.height;
    c.getContext("2d")!.drawImage(preview.bitmap, 0, 0);
  }, [preview]);
  const boxes = useMemo(() => (mark ? highlightBoxes(side.text.words, mark, page) : []), [mark, side, page]);
  const s = preview ? w / preview.widthPt : 1;
  return (
    <div ref={box} className="min-w-0">
      <p className="mb-2 truncate text-[12.5px] font-medium text-t-secondary">{label}</p>
      {page > side.pages ? (
        <div className="flex aspect-[1/1.414] items-center justify-center rounded-lg border border-dashed border-border text-[13px] text-t-tertiary">—</div>
      ) : preview ? (
        <div className="relative shadow-sm" style={{ width: w, height: preview.heightPt * s }} dir="ltr">
          <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
          {boxes.map((b, i) => (
            <span
              key={i}
              className={`absolute rounded-[2px] mix-blend-multiply ${tone === "removed" ? "bg-red-500/35" : "bg-green-500/35"}`}
              style={{ left: b.x * s - 1, top: b.y * s - 1, width: b.w * s + 2, height: b.h * s + 2 }}
            />
          ))}
        </div>
      ) : (
        <div className="flex aspect-[1/1.414] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-t-tertiary" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}

export default function ComparePdfPage() {
  const { t } = useI18n();
  const [files, setFiles] = useState<File[]>([]);
  const [a, setA] = useState<Side | null>(null);
  const [b, setB] = useState<Side | null>(null);
  const [progress, setProgress] = useState<{ which: 1 | 2; page: number; total: number } | null>(null);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [page, setPage] = useState(1);
  const [pageB, setPageB] = useState(1);

  const load = useCallback(
    async (list: File[]) => {
      const sides: Side[] = [];
      try {
        for (let i = 0; i < 2; i++) {
          const file = list[i]!;
          const pdf = await openPdf(new Uint8Array(await file.arrayBuffer()), {}, { copy: false });
          const text = await readWords(pdf, (n) => setProgress({ which: (i + 1) as 1 | 2, page: n, total: pdf.numPages }));
          sides.push({ file, pdf, pages: pdf.numPages, text });
        }
        setA(sides[0]!);
        setB(sides[1]!);
        setPage(1);
        setPageB(1);
      } catch (error) {
        sides.forEach((s) => void s.pdf.destroy());
        toast.error((error as { name?: string })?.name === "PasswordException" || error instanceof PdfLockedError ? t("pdf.locked") : t("pdf.unreadable"));
        setFiles([]);
      } finally {
        setProgress(null);
      }
    },
    [t],
  );

  useEffect(() => {
    if (files.length === 2) void load(files);
  }, [files, load]);
  useEffect(
    () => () => {
      void a?.pdf.destroy();
      void b?.pdf.destroy();
    },
    [a, b],
  );

  const result: Comparison | null = useMemo(() => (a && b ? compareDocs(a.text, b.text, ignoreCase) : null), [a, b, ignoreCase]);

  const addFiles = (fs: File[]) => setFiles((prev) => [...prev, ...fs].slice(0, 2));
  const reset = () => {
    setFiles([]);
    setA(null);
    setB(null);
  };
  const swap = () => {
    if (!a || !b) return;
    setA(b);
    setB(a);
    setPage(pageB);
    setPageB(page);
  };

  const snippet = (side: Side, r: [number, number]) => {
    const words = side.text.words.slice(r[0], Math.min(r[1], r[0] + 18)).map((w) => w.text).join(" ");
    return r[1] - r[0] > 18 ? `${words} …` : words;
  };
  const jump = (c: Comparison["changes"][number]) => {
    if (!a || !b) return;
    const ap = c.a[1] > c.a[0] ? a.text.words[c.a[0]]!.page : c.a[0] > 0 ? a.text.words[Math.min(c.a[0], a.text.words.length - 1)]!.page : 1;
    const bp = c.b[1] > c.b[0] ? b.text.words[c.b[0]]!.page : c.b[0] > 0 ? b.text.words[Math.min(c.b[0], b.text.words.length - 1)]!.page : 1;
    setPage(ap);
    setPageB(bp);
  };

  const changedA = result ? result.aMark.reduce((n, v) => n + v, 0) : 0;
  const changedB = result ? result.bMark.reduce((n, v) => n + v, 0) : 0;

  return (
    <ToolLayout toolName={t("tool.compare-pdf.name")} toolDescription={t("tool.compare-pdf.desc")}>
      {!a || !b ? (
        <div className="space-y-4">
          {progress ? (
            <div className="glass p-5">
              <ProgressBar progress={Math.round(((progress.which - 1) * 50) + (progress.page / progress.total) * 50)} label={t("compare.reading", { n: progress.which, page: progress.page, total: progress.total })} />
            </div>
          ) : (
            <>
              <FileDropzone onFilesSelected={addFiles} accept={{ "application/pdf": [".pdf"] }} multiple formats={["PDF"]} label={files.length === 0 ? t("compare.dropBoth") : t("compare.dropSecond")} />
              {files.length === 1 && (
                <div className="glass flex items-center gap-3 p-3 text-[14px]">
                  <FileText className="h-5 w-5 text-t-tertiary" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-semibold text-t-primary">{t("compare.original")}:</span> {files[0]!.name}
                  </span>
                  <button type="button" onClick={reset} className="text-t-tertiary hover:text-t-primary" aria-label={t("ui.clear")}>
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="glass flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1 text-[13.5px]">
              <p className="truncate">
                <span className="me-1.5 inline-block h-2.5 w-2.5 rounded-full bg-red-500/70 align-middle" aria-hidden="true" />
                <span className="font-semibold text-t-primary">{a.file.name}</span> <span className="text-t-tertiary">· {formatFileSize(a.file.size)}</span>
              </p>
              <p className="truncate">
                <span className="me-1.5 inline-block h-2.5 w-2.5 rounded-full bg-green-500/70 align-middle" aria-hidden="true" />
                <span className="font-semibold text-t-primary">{b.file.name}</span> <span className="text-t-tertiary">· {formatFileSize(b.file.size)}</span>
              </p>
            </div>
            <Toggle checked={ignoreCase} onChange={setIgnoreCase} label={t("compare.ignoreCase")} />
            <button type="button" className={buttonSecondary} onClick={swap}>
              <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
              {t("ui.swap")}
            </button>
            <button type="button" className={buttonSecondary} onClick={reset}>
              <X className="h-4 w-4" aria-hidden="true" />
              {t("compare.new")}
            </button>
          </div>

          {result && (
            <div className="glass space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13.5px]">
                <p className={sectionTitle}>{t("compare.changes", { n: result.changes.length })}</p>
                <span className="text-red-700 dark:text-red-400">{t("compare.removedWords", { n: changedA })}</span>
                <span className="text-green-700 dark:text-green-400">{t("compare.addedWords", { n: changedB })}</span>
              </div>
              {result.changes.length === 0 ? (
                <p className="text-[14px] text-t-secondary">{t("compare.same")}</p>
              ) : (
                <ul className="max-h-64 space-y-1.5 overflow-auto pe-1">
                  {result.changes.slice(0, 500).map((c, i) => (
                    <li key={i}>
                      <button type="button" onClick={() => jump(c)} className="w-full rounded-lg border border-border px-3 py-2 text-start text-[13px] transition hover:bg-bg-secondary">
                        {c.a[1] > c.a[0] && <span className="me-2 rounded bg-red-500/15 px-1 text-red-800 line-through decoration-red-500/60 dark:text-red-300">{snippet(a, c.a)}</span>}
                        {c.b[1] > c.b[0] && <span className="rounded bg-green-500/15 px-1 text-green-800 dark:text-green-300">{snippet(b, c.b)}</span>}
                        <span className="ms-2 text-[11.5px] tabular-nums text-t-tertiary">
                          {t("compare.pageShort", { n: c.a[1] > c.a[0] ? a.text.words[c.a[0]]!.page : b.text.words[Math.max(0, c.b[0])]?.page ?? 1 })}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="glass p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-center gap-3">
              <button type="button" className={buttonSecondary} onClick={() => { setPage((p) => Math.max(1, p - 1)); setPageB((p) => Math.max(1, p - 1)); }} disabled={page <= 1 && pageB <= 1} aria-label={t("wmpdf.prev")}>
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </button>
              <span className="text-[13px] tabular-nums text-t-secondary">
                {page} / {a.pages} · {pageB} / {b.pages}
              </span>
              <button
                type="button"
                className={buttonSecondary}
                onClick={() => { setPage((p) => Math.min(a.pages, p + 1)); setPageB((p) => Math.min(b.pages, p + 1)); }}
                disabled={page >= a.pages && pageB >= b.pages}
                aria-label={t("wmpdf.next")}
              >
                <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              <PageView side={a} page={page} mark={result?.aMark ?? null} tone="removed" label={t("compare.original")} />
              <PageView side={b} page={pageB} mark={result?.bMark ?? null} tone="added" label={t("compare.revised")} />
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
