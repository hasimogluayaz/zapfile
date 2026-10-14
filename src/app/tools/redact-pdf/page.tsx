"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import toast from "react-hot-toast";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ChevronLeft, ChevronRight, Download, Loader2, Search, ShieldAlert, Trash2, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProgressBar from "@/components/ProgressBar";
import { Toggle, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { downloadBlob, formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { editablePdfBytes, pdfInputErrorKey } from "@/lib/pdf-input";
import { openPdf } from "@/lib/pdfjs";
import { readWords, type DocText } from "@/lib/pdf-convert/words";
import { renderPagePreview, type PagePreview } from "@/lib/pdf-stamp/preview";
import { encodeCanvas, makeCanvas, ctx2d, releaseCanvas } from "@/lib/image-editor-kit";
import { useI18n } from "@/lib/i18n";
import { runWorkerTask } from "../merge-pdf/worker-task";
import { PATTERNS, findPattern, findText, type PatternId } from "./patterns";
import type { RedactRequest } from "./redact.worker";

interface Mark {
  id: number;
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Loaded {
  file: File;
  bytes: Uint8Array;
  pdf: PDFDocumentProxy;
  pages: number;
}

let seq = 1;
const DPI = 200;

/** Joined text of all words with the character offset where each word starts. */
function joinWords(t: DocText): { text: string; starts: number[] } {
  const starts: number[] = [];
  let text = "";
  t.words.forEach((w, i) => {
    if (i) text += " ";
    starts.push(text.length);
    text += w.text;
  });
  return { text, starts };
}

/** Boxes (one per line piece) covering character ranges of the joined text. */
function rangesToMarks(t: DocText, starts: number[], ranges: [number, number][]): Mark[] {
  const out: Mark[] = [];
  for (const [a, b] of ranges) {
    // Words overlapping [a, b).
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid]! <= a) lo = mid;
      else hi = mid - 1;
    }
    let cur: Mark | null = null;
    for (let i = lo; i < t.words.length && starts[i]! < b; i++) {
      const w = t.words[i]!;
      if (starts[i]! + w.text.length <= a) continue;
      const pad = (w.bottom - w.top) * 0.08;
      const box = { x: w.x0 - pad, y: w.top - pad, w: w.x1 - w.x0 + pad * 2, h: w.bottom - w.top + pad * 2 };
      if (cur && cur.page === w.page && Math.abs(cur.y - box.y) < box.h * 0.5 && box.x >= cur.x) {
        const x1 = Math.max(cur.x + cur.w, box.x + box.w);
        cur.y = Math.min(cur.y, box.y);
        cur.h = Math.max(cur.h, box.h);
        cur.w = x1 - cur.x;
      } else {
        if (cur) out.push(cur);
        cur = { id: seq++, page: w.page, ...box };
      }
    }
    if (cur) out.push(cur);
  }
  return out;
}

export default function RedactPdfPage() {
  const { t } = useI18n();
  const [doc, setDoc] = useState<Loaded | null>(null);
  const [words, setWords] = useState<DocText | null>(null);
  const [opening, setOpening] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [preview, setPreview] = useState<PagePreview | null>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [query, setQuery] = useState("");
  const [regex, setRegex] = useState(false);
  const [stripMeta, setStripMeta] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const [boxW, setBoxW] = useState(0);
  const [draft, setDraft] = useState<Mark | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => () => void doc?.pdf.destroy(), [doc]);

  const open = useCallback(
    async (files: File[]) => {
      const f = files[0];
      if (!f) return;
      setOpening(true);
      try {
        const bytes = await editablePdfBytes(f);
        const pdf = await openPdf(bytes);
        setDoc({ file: f, bytes, pdf, pages: pdf.numPages });
        setPageNo(1);
        setMarks([]);
        setWords(null);
        void readWords(pdf, () => {}).then(setWords, () => setWords({ words: [], lines: [] }));
      } catch (error) {
        toast.error(t(pdfInputErrorKey(error)));
      } finally {
        setOpening(false);
      }
    },
    [t],
  );

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(Math.max(0, el.clientWidth - 24)));
    ro.observe(el);
    setBoxW(Math.max(0, el.clientWidth - 24));
    return () => ro.disconnect();
  }, [doc]);

  useEffect(() => {
    if (!doc || !boxW) return;
    let cancelled = false;
    renderPagePreview(doc.pdf, pageNo, Math.min(1800, Math.round(boxW * Math.min(2, window.devicePixelRatio || 1)))).then((p) => {
      if (cancelled) return p.bitmap.close();
      setPreview((old) => {
        old?.bitmap.close();
        return p;
      });
    }, () => undefined);
    return () => {
      cancelled = true;
    };
  }, [doc, pageNo, boxW]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !preview) return;
    c.width = preview.bitmap.width;
    c.height = preview.bitmap.height;
    c.getContext("2d")!.drawImage(preview.bitmap, 0, 0);
  }, [preview]);

  const s = preview ? Math.min(boxW / preview.widthPt, (typeof window !== "undefined" ? window.innerHeight * 0.8 : 900) / preview.heightPt) : 1;
  const W = preview?.widthPt ?? 0, H = preview?.heightPt ?? 0;
  const joined = useMemo(() => (words ? joinWords(words) : null), [words]);

  const addRanges = (ranges: [number, number][]) => {
    if (!words || !joined) return 0;
    const found = rangesToMarks(words, joined.starts, ranges);
    // Skip boxes that are already marked.
    setMarks((prev) => [...prev, ...found.filter((m) => !prev.some((p) => p.page === m.page && Math.abs(p.x - m.x) < 1 && Math.abs(p.y - m.y) < 1))]);
    if (found.length) setPageNo(found[0]!.page);
    return found.length;
  };
  const search = () => {
    if (!joined) return;
    const n = addRanges(findText(joined.text, query, { regex, wholeWord: false }));
    toast(n ? t("redact.found", { n }) : t("redact.notFound"));
  };
  const preset = (id: PatternId) => {
    if (!joined) return;
    const n = addRanges(findPattern(joined.text, id));
    toast(n ? t("redact.found", { n }) : t("redact.notFound"));
  };

  // Draw a box by dragging on the page.
  const pt = (e: ReactPointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s };
  };
  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = pt(e);
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const a = start.current;
    if (!a) return;
    const b = pt(e);
    setDraft({ id: 0, page: pageNo, x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) });
  };
  const onUp = () => {
    if (draft && draft.w > 3 && draft.h > 3) setMarks((m) => [...m, { ...draft, id: seq++ }]);
    setDraft(null);
    start.current = null;
  };

  const markedPages = useMemo(() => [...new Set(marks.map((m) => m.page))].sort((a, b) => a - b), [marks]);

  const apply = async () => {
    if (!doc || !marks.length) return;
    setProgress(0);
    try {
      const pages: RedactRequest["pages"] = [];
      for (let i = 0; i < markedPages.length; i++) {
        const n = markedPages[i]!;
        const page = await doc.pdf.getPage(n);
        const vp = page.getViewport({ scale: 1 });
        page.cleanup();
        const r = await renderPagePreview(doc.pdf, n, Math.round((vp.width * DPI) / 72));
        const c = makeCanvas(r.bitmap.width, r.bitmap.height);
        const ctx = ctx2d(c);
        ctx.drawImage(r.bitmap, 0, 0);
        r.bitmap.close();
        ctx.fillStyle = "#000000";
        for (const m of marks.filter((x) => x.page === n)) ctx.fillRect(Math.floor(m.x * r.scale), Math.floor(m.y * r.scale), Math.ceil(m.w * r.scale) + 1, Math.ceil(m.h * r.scale) + 1);
        const jpeg = await (await encodeCanvas(c, "image/jpeg", 0.9)).arrayBuffer();
        releaseCanvas(c);
        pages.push({ page: n, jpeg, width: vp.width, height: vp.height });
        setProgress(Math.round(((i + 1) / markedPages.length) * 85));
      }
      const bytes = doc.bytes.slice().buffer as ArrayBuffer;
      const req: RedactRequest = { bytes, pages, stripMeta };
      const res = await runWorkerTask(() => new Worker(new URL("./redact.worker.ts", import.meta.url), { type: "module" }), req, [bytes, ...pages.map((p) => p.jpeg)], () => {}, new AbortController().signal);
      setProgress(100);
      downloadBlob(new Blob([res.bytes as BlobPart], { type: "application/pdf" }), `${getFileNameWithoutExtension(doc.file.name)}_redacted.pdf`);
      toast.success(t("redact.done", { n: marks.length }));
    } catch (error) {
      console.error(error);
      toast.error(t("organize.saveFailed"));
    } finally {
      setProgress(null);
    }
  };

  const onPage = marks.filter((m) => m.page === pageNo);
  const chip = "rounded-full border border-border px-3 py-1.5 text-[12.5px] font-medium text-t-secondary transition hover:border-t-primary/40 hover:text-t-primary disabled:opacity-50";

  return (
    <ToolLayout toolName={t("tool.redact-pdf.name")} toolDescription={t("tool.redact-pdf.desc")}>
      {!doc ? (
        <FileDropzone onFilesSelected={open} accept={{ "application/pdf": [".pdf"] }} formats={["PDF"]} label={opening ? t("p2o.opening") : t("redact.drop")} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="min-w-0 space-y-3">
            <div className="glass flex items-center gap-3 p-3">
              <p className="min-w-0 flex-1 truncate text-[14px] font-semibold text-t-primary" title={doc.file.name}>
                {doc.file.name} <span className="font-normal text-t-tertiary">· {formatFileSize(doc.file.size)}</span>
              </p>
              <button type="button" className={buttonSecondary} onClick={() => setPageNo((p) => Math.max(1, p - 1))} disabled={pageNo <= 1} aria-label={t("wmpdf.prev")}>
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </button>
              <span className="text-[13px] tabular-nums text-t-secondary">
                {pageNo} / {doc.pages}
              </span>
              <button type="button" className={buttonSecondary} onClick={() => setPageNo((p) => Math.min(doc.pages, p + 1))} disabled={pageNo >= doc.pages} aria-label={t("wmpdf.next")}>
                <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
              </button>
              <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full text-t-tertiary hover:bg-bg-secondary hover:text-t-primary" onClick={() => setDoc(null)} aria-label={t("rotpdf.changeFile")}>
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div ref={boxRef} className="glass flex justify-center p-3">
              {preview ? (
                <div className="relative cursor-crosshair touch-none select-none shadow-sm" style={{ width: W * s, height: H * s }} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} dir="ltr">
                  <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label={t("meme.preview")} />
                  {[...onPage, ...(draft ? [draft] : [])].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="group absolute bg-black/85 outline outline-2 outline-red-500/80 hover:bg-black/70"
                      style={{ left: m.x * s, top: m.y * s, width: m.w * s, height: m.h * s }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => setMarks((list) => list.filter((x) => x.id !== m.id))}
                      aria-label={t("redact.removeBox")}
                      title={t("redact.removeBox")}
                    >
                      <X className="mx-auto hidden h-3.5 w-3.5 text-white group-hover:block" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex h-96 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-t-tertiary" aria-hidden="true" />
                </div>
              )}
            </div>
            <p className="text-[12.5px] text-t-tertiary">{t("redact.hint")}</p>
          </div>

          <div className="space-y-5 lg:sticky lg:top-20">
            <div className="glass space-y-3 p-4">
              <p className={sectionTitle}>{t("redact.find")}</p>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  search();
                }}
              >
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("redact.searchPlaceholder")}
                  aria-label={t("redact.find")}
                  className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-bg-secondary px-3 text-[14px] text-t-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
                />
                <button type="submit" className={buttonSecondary} disabled={!words || !query.trim()} aria-label={t("redact.find")}>
                  {words ? <Search className="h-4 w-4" aria-hidden="true" /> : <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                </button>
              </form>
              <Toggle checked={regex} onChange={setRegex} label={t("redact.regex")} />
              <div className="flex flex-wrap gap-2">
                {PATTERNS.map((id) => (
                  <button key={id} type="button" className={chip} onClick={() => preset(id)} disabled={!words}>
                    {t(`redact.p.${id}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className={sectionTitle}>{t("redact.boxes", { n: marks.length })}</p>
                {marks.length > 0 && (
                  <button type="button" className="inline-flex items-center gap-1 text-[12.5px] text-t-tertiary hover:text-t-primary" onClick={() => setMarks([])}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("ui.clearAll")}
                  </button>
                )}
              </div>
              {markedPages.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {markedPages.map((p) => (
                    <button key={p} type="button" onClick={() => setPageNo(p)} className={`rounded-md border px-2 py-1 text-[12px] tabular-nums ${p === pageNo ? "border-t-primary text-t-primary" : "border-border text-t-secondary"}`}>
                      {t("compare.pageShort", { n: p })} · {marks.filter((m) => m.page === p).length}
                    </button>
                  ))}
                </div>
              )}
              <Toggle checked={stripMeta} onChange={setStripMeta} label={t("redact.stripMeta")} description={t("redact.stripMetaHint")} />
              <p className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-[12.5px] text-t-secondary">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                {t("redact.how")}
              </p>
              {progress !== null ? (
                <ProgressBar progress={progress} label={t("redact.working")} />
              ) : (
                <button type="button" className={`${buttonPrimary} w-full`} onClick={apply} disabled={!marks.length}>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {t("redact.apply")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
