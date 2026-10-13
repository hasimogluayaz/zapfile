"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import toast from "react-hot-toast";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ChevronLeft, ChevronRight, Download, Loader2, RotateCcw, ScanSearch, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProgressBar from "@/components/ProgressBar";
import { Segmented, Slider, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { downloadBlob, formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { editablePdfBytes, pdfInputErrorKey } from "@/lib/pdf-input";
import { openPdf } from "@/lib/pdfjs";
import { renderPagePreview, type PagePreview } from "@/lib/pdf-stamp/preview";
import { pagesInRanges, parsePageRanges } from "@/lib/split-pdf-ranges";
import { useI18n } from "@/lib/i18n";
import { runWorkerTask } from "../merge-pdf/worker-task";
import type { CropRequest } from "./crop.worker";

/** Rectangle as fractions of the page (0–1), origin top-left. */
interface Frac {
  x: number;
  y: number;
  w: number;
  h: number;
}
const FULL: Frac = { x: 0, y: 0, w: 1, h: 1 };
const MM = 72 / 25.4;

/** Bounding box of non-white pixels, as fractions; null for a blank page. */
function inkBox(p: PagePreview): Frac | null {
  const c = document.createElement("canvas");
  c.width = p.bitmap.width;
  c.height = p.bitmap.height;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(p.bitmap, 0, 0);
  const { data, width: W, height: H } = ctx.getImageData(0, 0, c.width, c.height);
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (data[i]! < 240 || data[i + 1]! < 240 || data[i + 2]! < 240) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  c.width = c.height = 0;
  if (x1 < 0) return null;
  return { x: x0 / W, y: y0 / H, w: (x1 - x0 + 1) / W, h: (y1 - y0 + 1) / H };
}

function pad(f: Frac, padPt: number, wPt: number, hPt: number): Frac {
  const px = padPt / wPt, py = padPt / hPt;
  const x = Math.max(0, f.x - px), y = Math.max(0, f.y - py);
  return { x, y, w: Math.min(1, f.x + f.w + px) - x, h: Math.min(1, f.y + f.h + py) - y };
}

interface Loaded {
  file: File;
  bytes: Uint8Array;
  pdf: PDFDocumentProxy;
  pages: number;
}

type Handle = "move" | "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export default function CropPdfPage() {
  const { t } = useI18n();
  const [doc, setDoc] = useState<Loaded | null>(null);
  const [opening, setOpening] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [preview, setPreview] = useState<PagePreview | null>(null);
  const [mode, setMode] = useState<"same" | "auto">("same");
  const [rect, setRect] = useState<Frac>(FULL);
  const [padMm, setPadMm] = useState(5);
  const [autoBox, setAutoBox] = useState<Frac | null>(null);
  const [pageMode, setPageMode] = useState<"all" | "custom">("all");
  const [rangeText, setRangeText] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [boxW, setBoxW] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ h: Handle; sx: number; sy: number; start: Frac } | null>(null);

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
        setRect(FULL);
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
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    setBoxW(el.clientWidth);
    return () => ro.disconnect();
  }, [doc]);

  useEffect(() => {
    if (!doc || !boxW) return;
    let cancelled = false;
    renderPagePreview(doc.pdf, pageNo, Math.min(1600, Math.round(boxW * Math.min(2, window.devicePixelRatio || 1)))).then(
      (p) => {
        if (cancelled) return p.bitmap.close();
        setPreview((old) => {
          old?.bitmap.close();
          return p;
        });
        setAutoBox(inkBox(p));
      },
      () => undefined,
    );
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

  const s = preview ? Math.min(boxW / preview.widthPt, (typeof window !== "undefined" ? window.innerHeight * 0.75 : 800) / preview.heightPt) : 1;
  const Wp = preview?.widthPt ?? 1, Hp = preview?.heightPt ?? 1;
  const shown: Frac = mode === "same" ? rect : autoBox ? pad(autoBox, padMm * MM, Wp, Hp) : FULL;

  const range = useMemo(() => {
    if (!doc || pageMode === "all") return { pages: null as number[] | null, error: null as string | null };
    const parsed = parsePageRanges(rangeText, doc.pages, { keywords: true });
    if (parsed.error) return { pages: null, error: t(parsed.error.key, parsed.error.params) };
    const pages = [...pagesInRanges(parsed.ranges)].sort((a, b) => a - b);
    return pages.length ? { pages, error: null } : { pages: null, error: t("p2o.rangeEmpty") };
  }, [doc, pageMode, rangeText, t]);

  const onDown = (h: Handle, e: ReactPointerEvent) => {
    if (mode !== "same") return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { h, sx: e.clientX, sy: e.clientY, start: rect };
  };
  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / (Wp * s), dy = (e.clientY - d.sy) / (Hp * s);
    const st = d.start;
    let { x, y, w, h } = st;
    const min = 0.04;
    if (d.h === "move") {
      x = Math.min(1 - w, Math.max(0, st.x + dx));
      y = Math.min(1 - h, Math.max(0, st.y + dy));
    } else {
      if (d.h.includes("w")) {
        x = Math.min(st.x + st.w - min, Math.max(0, st.x + dx));
        w = st.x + st.w - x;
      }
      if (d.h.includes("e")) w = Math.min(1 - st.x, Math.max(min, st.w + dx));
      if (d.h.includes("n")) {
        y = Math.min(st.y + st.h - min, Math.max(0, st.y + dy));
        h = st.y + st.h - y;
      }
      if (d.h.includes("s")) h = Math.min(1 - st.y, Math.max(min, st.h + dy));
    }
    setRect({ x, y, w, h });
  };

  const save = async () => {
    if (!doc || range.error) return;
    const pages = range.pages ?? Array.from({ length: doc.pages }, (_, i) => i + 1);
    setProgress(0);
    try {
      const rects: CropRequest["rects"] = {};
      for (let i = 0; i < pages.length; i++) {
        const n = pages[i]!;
        const page = await doc.pdf.getPage(n);
        const vp = page.getViewport({ scale: 1 });
        page.cleanup();
        let f = rect;
        if (mode === "auto") {
          const p = await renderPagePreview(doc.pdf, n, 500);
          const box = inkBox(p);
          p.bitmap.close();
          if (!box) continue;
          f = pad(box, padMm * MM, vp.width, vp.height);
        }
        if (f.x <= 0.0005 && f.y <= 0.0005 && f.w >= 0.999 && f.h >= 0.999) continue;
        rects[n] = { x: f.x * vp.width, y: f.y * vp.height, w: f.w * vp.width, h: f.h * vp.height };
        setProgress(Math.round(((i + 1) / pages.length) * 85));
      }
      const bytes = doc.bytes.slice().buffer as ArrayBuffer;
      const res = await runWorkerTask(() => new Worker(new URL("./crop.worker.ts", import.meta.url), { type: "module" }), { bytes, rects } satisfies CropRequest, [bytes], () => {}, new AbortController().signal);
      setProgress(100);
      downloadBlob(new Blob([res.bytes as BlobPart], { type: "application/pdf" }), `${getFileNameWithoutExtension(doc.file.name)}_cropped.pdf`);
      toast.success(t("croppdf.done", { n: Object.keys(rects).length }));
    } catch (error) {
      console.error(error);
      toast.error(t("organize.saveFailed"));
    } finally {
      setProgress(null);
    }
  };

  const handles: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
  const handlePos: Record<string, string> = {
    nw: "left-0 top-0 cursor-nwse-resize",
    n: "left-1/2 top-0 cursor-ns-resize",
    ne: "left-full top-0 cursor-nesw-resize",
    e: "left-full top-1/2 cursor-ew-resize",
    se: "left-full top-full cursor-nwse-resize",
    s: "left-1/2 top-full cursor-ns-resize",
    sw: "left-0 top-full cursor-nesw-resize",
    w: "left-0 top-1/2 cursor-ew-resize",
  };
  const mm = (pt: number) => Math.round(pt / MM);

  return (
    <ToolLayout toolName={t("tool.crop-pdf.name")} toolDescription={t("tool.crop-pdf.desc")}>
      {!doc ? (
        <FileDropzone onFilesSelected={open} accept={{ "application/pdf": [".pdf"] }} formats={["PDF"]} label={opening ? t("p2o.opening") : t("croppdf.drop")} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="space-y-3">
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
                <div className="relative touch-none select-none shadow-sm" style={{ width: Wp * s, height: Hp * s }} onPointerMove={onMove} onPointerUp={() => (drag.current = null)} dir="ltr">
                  <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label={t("meme.preview")} />
                  {/* Dim the page outside the crop area (clipped to the page). */}
                  <div className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute" style={{ left: `${shown.x * 100}%`, top: `${shown.y * 100}%`, width: `${shown.w * 100}%`, height: `${shown.h * 100}%`, boxShadow: "0 0 0 9999px rgb(22 24 29 / 0.55)" }} />
                  </div>
                  <div
                    className={`absolute ${mode === "same" ? "cursor-move" : ""}`}
                    style={{ left: `${shown.x * 100}%`, top: `${shown.y * 100}%`, width: `${shown.w * 100}%`, height: `${shown.h * 100}%`, outline: "2px solid #FFD60A" }}
                    onPointerDown={(e) => onDown("move", e)}
                  >
                    {mode === "same" &&
                      handles.map((h) => (
                        <span key={h} className={`absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-volt shadow ${handlePos[h]}`} onPointerDown={(e) => onDown(h, e)} aria-hidden="true" />
                      ))}
                  </div>
                </div>
              ) : (
                <div className="flex h-96 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-t-tertiary" aria-hidden="true" />
                </div>
              )}
            </div>
            <p className="text-[12.5px] tabular-nums text-t-tertiary">
              {t("croppdf.size", { w: mm(shown.w * Wp), h: mm(shown.h * Hp), W: mm(Wp), H: mm(Hp) })}
            </p>
          </div>

          <div className="space-y-5 lg:sticky lg:top-20">
            <div className="glass space-y-4 p-4">
              <Segmented<"same" | "auto">
                label={t("croppdf.mode")}
                size="sm"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "same", label: t("croppdf.same") },
                  { value: "auto", label: t("croppdf.auto") },
                ]}
              />
              {mode === "same" ? (
                <>
                  <p className="text-[12.5px] text-t-tertiary">{t("croppdf.sameHint")}</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={buttonSecondary} onClick={() => autoBox && setRect(pad(autoBox, padMm * MM, Wp, Hp))} disabled={!autoBox}>
                      <ScanSearch className="h-4 w-4" aria-hidden="true" />
                      {t("croppdf.detect")}
                    </button>
                    <button type="button" className={buttonSecondary} onClick={() => setRect(FULL)}>
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      {t("ui.reset")}
                    </button>
                  </div>
                </>
              ) : (
                <p className="text-[12.5px] text-t-tertiary">{t("croppdf.autoHint")}</p>
              )}
              <Slider label={t("croppdf.padding")} value={padMm} min={0} max={25} onChange={setPadMm} display={`${padMm} mm`} />
            </div>
            <div className="glass space-y-4 p-4">
              <div>
                <p className={sectionTitle}>{t("p2o.pages")}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
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
                      value={rangeText}
                      onChange={(e) => setRangeText(e.target.value)}
                      placeholder={t("p2o.rangePlaceholder", { n: doc.pages })}
                      aria-label={t("p2o.pages")}
                      className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-bg-secondary px-3 text-[14px] text-t-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
                    />
                  )}
                </div>
                {pageMode === "custom" && range.error && rangeText && <p className="mt-1.5 text-[12.5px] text-red-700 dark:text-red-400">{range.error}</p>}
              </div>
              {progress !== null ? (
                <ProgressBar progress={progress} label={t("croppdf.working")} />
              ) : (
                <button type="button" className={`${buttonPrimary} w-full`} onClick={save} disabled={!!range.error}>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {t("croppdf.download")}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
