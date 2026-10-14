"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { ChevronLeft, ChevronRight, FileText, Info, Loader2, X } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { PDFFont } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import { Segmented, Slider, Toggle, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { pdfInputErrorKey, toEditablePdf } from "@/lib/pdf-input";
import { openPdf } from "@/lib/pdfjs";
import { useI18n } from "@/lib/i18n";
import { getFileNameWithoutExtension } from "@/lib/utils";
import {
  CSS_FONT,
  autoTotal,
  canvasMetrics,
  isNumbered,
  labelFor,
  measureLabel,
  needsRaster,
  placeLabel,
  type FontId,
  type HAlign,
  type Measurer,
  type NumberingOptions,
  type NumberingResponse,
  type VAlign,
} from "./numbering";

type PresetId = "n" | "nTotal" | "page" | "pageOf" | "dash" | "custom";

const FONTS: FontId[] = ["Helvetica", "TimesRoman", "Courier"];
const FONT_LABEL: Record<FontId, string> = { Helvetica: "Helvetica", TimesRoman: "Times", Courier: "Courier" };
const POSITIONS: { v: VAlign; h: HAlign }[] = [
  { v: "top", h: "left" },
  { v: "top", h: "center" },
  { v: "top", h: "right" },
  { v: "bottom", h: "left" },
  { v: "bottom", h: "center" },
  { v: "bottom", h: "right" },
];
const PREVIEW_WIDTH = 420;

function parseIntStrict(value: string): number | null {
  if (!/^\s*-?\d+\s*$/.test(value)) return null;
  return Number.parseInt(value, 10);
}

function NumberField({
  id,
  label,
  value,
  onChange,
  min,
  max,
  placeholder,
  error,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  error?: string | null;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-t-secondary">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error || hint ? `${id}-note` : undefined}
        className={`w-full rounded-xl border bg-bg-secondary px-3 py-2.5 text-sm text-t-primary placeholder:text-t-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60 ${
          error ? "border-red-500/60" : "border-border focus:border-accent/50"
        }`}
      />
      {(error || hint) && (
        <p id={`${id}-note`} className={`mt-1.5 text-[12px] ${error ? "text-red-600 dark:text-red-400" : "text-t-tertiary"}`}>
          {error || hint}
        </p>
      )}
    </div>
  );
}

export default function PdfPageNumbersPage() {
  const { t } = useI18n();

  // File
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [docVersion, setDocVersion] = useState(0);
  const bytesRef = useRef<Uint8Array | null>(null);
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  const loadRef = useRef(0);

  // Settings
  const [preset, setPreset] = useState<PresetId>("n");
  const [customTemplate, setCustomTemplate] = useState("{n}");
  const [skipText, setSkipText] = useState("0");
  const [lastText, setLastText] = useState("1");
  const [startText, setStartText] = useState("1");
  const [totalText, setTotalText] = useState("");
  const [digits, setDigits] = useState(1);
  const [font, setFont] = useState<FontId>("Helvetica");
  const [size, setSize] = useState(11);
  const [color, setColor] = useState("#555555");
  const [opacity, setOpacity] = useState(100);
  const [h, setH] = useState<HAlign>("center");
  const [v, setV] = useState<VAlign>("bottom");
  const [mirror, setMirror] = useState(false);
  const [marginX, setMarginX] = useState(36);
  const [marginY, setMarginY] = useState(28);

  // Preview
  const [previewPage, setPreviewPage] = useState(1);
  const [previewInfo, setPreviewInfo] = useState<{ page: number; width: number; height: number; pxW: number; pxH: number } | null>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const [fonts, setFonts] = useState<Record<FontId, PDFFont> | null>(null);

  // Job
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ blob: Blob; key: string } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const runningKeyRef = useRef<string | null>(null);

  // Standard-font metrics for the preview (same AFM data pdf-lib writes with).
  useEffect(() => {
    let alive = true;
    (async () => {
      const { PDFDocument, StandardFonts } = await import("pdf-lib");
      const doc = await PDFDocument.create();
      const loaded = {} as Record<FontId, PDFFont>;
      for (const id of FONTS) loaded[id] = await doc.embedFont(StandardFonts[id]);
      if (alive) setFonts(loaded);
    })().catch((error) => console.error(error));
    return () => {
      alive = false;
    };
  }, []);

  const closeDoc = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    runningKeyRef.current = null;
    const pdf = pdfRef.current;
    pdfRef.current = null;
    if (pdf) void pdf.destroy();
    bytesRef.current = null;
  }, []);

  useEffect(() => closeDoc, [closeDoc]);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const picked = files[0];
      if (!picked) return;
      closeDoc();
      const token = ++loadRef.current;
      setFile(picked);
      setLoading(true);
      setPageCount(0);
      setResult(null);
      setFailure(null);
      setProcessing(false);
      setPreviewInfo(null);
      try {
        // Restriction-only PDFs are decrypted (off the main thread) so the
        // numbers don't land on garbled pages; password-locked ones are refused.
        const editable = await toEditablePdf(picked);
        const bytes = new Uint8Array(await editable.arrayBuffer());
        const pdf = await openPdf(bytes);
        if (token !== loadRef.current) {
          void pdf.destroy();
          return;
        }
        bytesRef.current = bytes;
        pdfRef.current = pdf;
        setPageCount(pdf.numPages);
        setSkipText("0");
        setLastText(String(pdf.numPages));
        setPreviewPage(1);
        setDocVersion((n) => n + 1);
      } catch (error) {
        if (token !== loadRef.current) return;
        console.error(error);
        const key = pdfInputErrorKey(error);
        toast.error(t(key === "pdf.locked" ? key : "pagenum.ui.invalidPdf"));
        setFile(null);
      } finally {
        if (token === loadRef.current) setLoading(false);
      }
    },
    [closeDoc, t],
  );

  const reset = useCallback(() => {
    loadRef.current++;
    closeDoc();
    setFile(null);
    setLoading(false);
    setPageCount(0);
    setResult(null);
    setFailure(null);
    setProcessing(false);
    setPreviewInfo(null);
  }, [closeDoc]);

  // ─── Options & validation ───────────────────────────────────

  const presetTemplates = useMemo<Record<PresetId, string>>(
    () => ({
      n: "{n}",
      nTotal: "{n} / {total}",
      page: t("pagenum.v2.tpl.page", { n: "{n}" }),
      pageOf: t("pagenum.v2.tpl.pageOf", { n: "{n}", total: "{total}" }),
      dash: "– {n} –",
      custom: customTemplate,
    }),
    [customTemplate, t],
  );
  const template = presetTemplates[preset].replace(/[\u0000-\u001f\u007f]/g, " ");

  const validation = useMemo(() => {
    const errors: { skip?: string; last?: string; start?: string; total?: string; template?: string } = {};
    if (!pageCount) return { errors, options: null as NumberingOptions | null };
    const skip = parseIntStrict(skipText);
    const last = parseIntStrict(lastText);
    const start = parseIntStrict(startText);
    const total = totalText.trim() === "" ? null : parseIntStrict(totalText);
    if (skip === null || skip < 0 || skip > pageCount - 1) errors.skip = t("pagenum.v2.err.skip", { max: pageCount - 1 });
    const firstPage = (skip ?? 0) + 1;
    if (last === null || last < firstPage || last > pageCount) errors.last = t("pagenum.v2.err.last", { min: firstPage, max: pageCount });
    if (start === null || Math.abs(start) > 99999) errors.start = t("pagenum.v2.err.number");
    if (totalText.trim() !== "" && (total === null || total < 1 || total > 99999)) errors.total = t("pagenum.v2.err.number");
    if (!template.trim()) errors.template = t("pagenum.v2.err.template");
    if (Object.keys(errors).length > 0) return { errors, options: null };
    const options: NumberingOptions = {
      template,
      startNumber: start!,
      firstPage,
      lastPage: last!,
      totalOverride: total,
      digits,
      font,
      size,
      color,
      opacity: opacity / 100,
      h,
      v,
      mirror: mirror && h !== "center",
      marginX,
      marginY,
    };
    return { errors, options };
  }, [color, digits, font, h, lastText, marginX, marginY, mirror, opacity, pageCount, size, skipText, startText, t, template, totalText, v]);

  const { errors, options } = validation;
  const optionsKey = options ? JSON.stringify(options) : null;
  const firstPage = options?.firstPage ?? Math.max(1, (parseIntStrict(skipText) ?? 0) + 1);

  // Jump the preview to the first numbered page when the skip changes.
  useEffect(() => {
    if (pageCount) setPreviewPage(Math.min(pageCount, Math.max(1, firstPage)));
  }, [firstPage, pageCount]);

  // A run whose settings no longer match what is on screen is pointless.
  useEffect(() => {
    if (processing && runningKeyRef.current !== optionsKey) {
      workerRef.current?.terminate();
      workerRef.current = null;
      runningKeyRef.current = null;
      setProcessing(false);
      setProgress(0);
    }
    setFailure(null);
  }, [optionsKey, processing]);

  const measurerFor = useCallback(
    (id: FontId): Measurer | null => {
      const f = fonts?.[id];
      if (!f) return null;
      const scratch = document.createElement("canvas").getContext("2d");
      const ascentAt = (s: number) => f.heightAtSize(s, { descender: false });
      return {
        charset: new Set(f.getCharacterSet()),
        vector: (text, s) => ({ width: f.widthOfTextAtSize(text, s), ascent: ascentAt(s), descent: f.heightAtSize(s) - ascentAt(s) }),
        raster: (text, s) =>
          scratch ? canvasMetrics(scratch, text, s, id) : { width: text.length * s * 0.6, ascent: s * 0.8, descent: s * 0.2 },
      };
    },
    [fonts],
  );
  const measurer = useMemo(() => measurerFor(font), [font, measurerFor]);

  const sampleLabel = options && pageCount ? labelFor(options, options.firstPage, pageCount) : "";
  const usesRaster = Boolean(measurer && sampleLabel && needsRaster(template.replace(/\{n\}|\{total\}/g, "0"), measurer.charset));
  const autoTotalValue = pageCount ? autoTotal({ startNumber: parseIntStrict(startText) ?? 1, firstPage }, pageCount) : 0;

  // ─── Preview ────────────────────────────────────────────────

  useEffect(() => {
    const pdf = pdfRef.current;
    const canvas = baseCanvasRef.current;
    if (!pdf || !canvas || previewPage < 1 || previewPage > pdf.numPages) return;
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;
    (async () => {
      const page = await pdf.getPage(previewPage);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const viewport = page.getViewport({ scale: (PREVIEW_WIDTH * dpr) / base.width });
      const off = document.createElement("canvas");
      off.width = Math.ceil(viewport.width);
      off.height = Math.ceil(viewport.height);
      const offCtx = off.getContext("2d");
      if (!offCtx) return;
      task = page.render({ canvas: off, canvasContext: offCtx, viewport });
      await task.promise;
      page.cleanup();
      if (cancelled) return;
      // Swap in the finished render in one go (no flash of a blank page).
      canvas.width = off.width;
      canvas.height = off.height;
      canvas.getContext("2d")?.drawImage(off, 0, 0);
      off.width = 0;
      off.height = 0;
      setPreviewInfo({ page: previewPage, width: base.width, height: base.height, pxW: canvas.width, pxH: canvas.height });
    })().catch((error) => {
      if (!cancelled && (error as { name?: string })?.name !== "RenderingCancelledException") console.error(error);
    });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [previewPage, docVersion]);

  // Live overlay: the label drawn exactly where the worker will put it.
  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas || !previewInfo) return;
    canvas.width = previewInfo.pxW;
    canvas.height = previewInfo.pxH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!options || !measurer || !isNumbered(options, previewInfo.page)) return;
    const label = labelFor(options, previewInfo.page, pageCount);
    const pieces = measureLabel(label, options.size, measurer);
    const place = placeLabel(pieces, previewInfo.width, previewInfo.height, options, previewInfo.page);
    const k = previewInfo.pxW / previewInfo.width;
    ctx.save();
    ctx.globalAlpha = options.opacity;
    ctx.fillStyle = options.color;
    ctx.textBaseline = "alphabetic";
    ctx.font = `${options.size * k}px ${CSS_FONT[options.font]}`;
    let cursor = place.x;
    for (const piece of pieces) {
      ctx.fillText(piece.text, cursor * k, (previewInfo.height - place.baseline) * k);
      cursor += piece.width;
    }
    ctx.restore();
  }, [measurer, options, pageCount, previewInfo]);

  // ─── Run ────────────────────────────────────────────────────

  const run = () => {
    const bytes = bytesRef.current;
    if (!options || !optionsKey || !bytes || processing) return;
    workerRef.current?.terminate();
    let worker: Worker;
    try {
      worker = new Worker(new URL("./numbering.worker.ts", import.meta.url), { type: "module" });
    } catch (error) {
      console.error(error);
      setFailure(t("pagenum.ui.fail"));
      return;
    }
    workerRef.current = worker;
    runningKeyRef.current = optionsKey;
    const key = optionsKey;
    setProcessing(true);
    setProgress(2);
    setResult(null);
    setFailure(null);
    const finish = () => {
      worker.terminate();
      if (workerRef.current === worker) {
        workerRef.current = null;
        runningKeyRef.current = null;
        setProcessing(false);
      }
    };
    worker.onmessage = (event: MessageEvent<NumberingResponse>) => {
      if (workerRef.current !== worker) return;
      const msg = event.data;
      if (msg.type === "progress") {
        setProgress(2 + Math.round((msg.done / Math.max(1, msg.total)) * 88));
      } else if (msg.type === "done") {
        setProgress(100);
        setResult({ blob: new Blob([msg.bytes], { type: "application/pdf" }), key });
        finish();
        toast.success(t("pagenum.ui.success"));
      } else {
        if (msg.type === "error") console.error(msg.message);
        setFailure(msg.code === "unicode" ? t("pagenum.v2.err.unicode") : t("pagenum.ui.fail"));
        finish();
      }
    };
    worker.onerror = (event) => {
      event.preventDefault();
      if (workerRef.current !== worker) return;
      console.error(event.message);
      setFailure(t("pagenum.ui.fail"));
      finish();
    };
    const copy = bytes.slice();
    worker.postMessage({ bytes: copy.buffer, options }, [copy.buffer]);
  };

  const cancel = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    runningKeyRef.current = null;
    setProcessing(false);
    setProgress(0);
  };

  const resultFresh = result && optionsKey && result.key === optionsKey ? result : null;
  const numberedCount = options ? options.lastPage - options.firstPage + 1 : 0;
  const previewNumbered = options ? isNumbered(options, previewPage) : false;

  const presetIds: PresetId[] = ["n", "nTotal", "page", "pageOf", "dash", "custom"];
  const presetSample = (id: PresetId) => {
    if (id === "custom") return t("pagenum.v2.custom");
    const base = options ?? {
      startNumber: 1,
      firstPage: 1,
      totalOverride: null,
      digits,
    };
    return labelFor({ ...(base as NumberingOptions), template: presetTemplates[id] }, base.firstPage, pageCount || 1);
  };

  return (
    <ToolLayout
      toolName="PDF Page Numbers"
      toolDescription="Add page numbers to your PDF document. Choose position, formatting, and page range."
    >
      <div className="space-y-6">
        {!file ? (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{ "application/pdf": [".pdf"] }}
            formats={["PDF"]}
            label={t("pagenum.ui.dropLabel")}
          />
        ) : (
          <>
            <div className="glass flex items-center gap-3 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-bg-secondary text-t-primary">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <FileText className="h-5 w-5" aria-hidden="true" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-t-primary">{file.name}</p>
                <p className="text-[13px] text-t-tertiary">
                  {loading
                    ? t("ui.loading")
                    : pageCount === 1
                      ? t("pagenum.ui.pageOne", { n: pageCount })
                      : t("pagenum.ui.pageMany", { n: pageCount })}
                </p>
              </div>
              <button
                type="button"
                onClick={reset}
                className="flex h-10 w-10 items-center justify-center rounded-full text-t-tertiary hover:bg-bg-secondary hover:text-t-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
                aria-label={t("pagenum.ui.anotherFile")}
                title={t("pagenum.ui.anotherFile")}
              >
                <X className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
            </div>

            {pageCount > 0 && (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                {/* Live preview */}
                <div className="glass space-y-3 p-4 lg:sticky lg:top-20 lg:self-start">
                  <div className="flex items-center justify-between gap-2">
                    <p className={sectionTitle}>{t("ui.preview")}</p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                        disabled={previewPage <= 1}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-t-secondary hover:bg-bg-secondary hover:text-t-primary disabled:opacity-40 rtl:rotate-180"
                        aria-label={t("pagenum.v2.prevPage")}
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <span className="min-w-[88px] text-center text-[13px] tabular-nums text-t-secondary" aria-live="polite">
                        {t("pagenum.v2.previewOf", { n: previewPage, total: pageCount })}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewPage((p) => Math.min(pageCount, p + 1))}
                        disabled={previewPage >= pageCount}
                        className="flex h-9 w-9 items-center justify-center rounded-lg text-t-secondary hover:bg-bg-secondary hover:text-t-primary disabled:opacity-40 rtl:rotate-180"
                        aria-label={t("pagenum.v2.nextPage")}
                      >
                        <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-center rounded-xl bg-bg-secondary p-3">
                    <div className="relative w-full max-w-[420px]">
                      <canvas ref={baseCanvasRef} className="block h-auto w-full rounded-sm bg-white shadow-sm" />
                      <canvas ref={overlayRef} className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />
                      {!previewInfo && (
                        <div className="absolute inset-0 flex min-h-[200px] items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin text-t-tertiary" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-center text-[12.5px] text-t-tertiary">
                    {previewNumbered && sampleLabel
                      ? t("pagenum.v2.previewLabel", { label: options ? labelFor(options, previewPage, pageCount) : "" })
                      : t("pagenum.v2.notNumbered")}
                  </p>
                </div>

                {/* Settings */}
                <div className="space-y-5">
                  <section className="glass space-y-4 p-5">
                    <p className={sectionTitle}>{t("pagenum.v2.position")}</p>
                    <div className="flex flex-wrap items-start gap-5">
                      <div role="radiogroup" aria-label={t("pagenum.v2.position")} className="grid grid-cols-3 gap-2">
                        {POSITIONS.map((pos) => {
                          const active = pos.h === h && pos.v === v;
                          return (
                            <button
                              key={`${pos.v}-${pos.h}`}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              aria-label={t(`watermark.ui.pos.${pos.v}-${pos.h}`)}
                              title={t(`watermark.ui.pos.${pos.v}-${pos.h}`)}
                              onClick={() => {
                                setH(pos.h);
                                setV(pos.v);
                              }}
                              className={`flex h-14 w-12 items-center justify-center rounded-xl border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/60 ${
                                active ? "border-accent bg-accent/10" : "border-border bg-bg-secondary hover:border-t-tertiary"
                              }`}
                            >
                              <span className="relative block h-10 w-7 rounded-[3px] border border-t-tertiary/60 bg-surface">
                                <span
                                  className={`absolute h-[3px] w-2.5 rounded-full ${active ? "bg-volt" : "bg-t-tertiary"} ${
                                    pos.v === "top" ? "top-1" : "bottom-1"
                                  } ${pos.h === "left" ? "start-1" : pos.h === "right" ? "end-1" : "start-1/2 -translate-x-1/2 rtl:translate-x-1/2"}`}
                                />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="min-w-[200px] flex-1">
                        <Toggle
                          checked={mirror && h !== "center"}
                          onChange={setMirror}
                          disabled={h === "center"}
                          label={t("pagenum.v2.mirror")}
                          description={t("pagenum.v2.mirrorHint")}
                        />
                      </div>
                    </div>
                  </section>

                  <section className="glass space-y-4 p-5">
                    <p className={sectionTitle}>{t("pagenum.ui.formatting")}</p>
                    <div role="radiogroup" aria-label={t("pagenum.ui.formatting")} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {presetIds.map((id) => (
                        <button
                          key={id}
                          type="button"
                          role="radio"
                          aria-checked={preset === id}
                          onClick={() => {
                            if (id === "custom" && preset !== "custom") setCustomTemplate(presetTemplates[preset]);
                            setPreset(id);
                          }}
                          className={`min-h-10 truncate rounded-xl border px-3 py-2 text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/60 ${
                            preset === id
                              ? "border-accent bg-accent text-on-accent"
                              : "border-border bg-bg-secondary text-t-secondary hover:text-t-primary"
                          }`}
                        >
                          {presetSample(id)}
                        </button>
                      ))}
                    </div>
                    {preset === "custom" && (
                      <div>
                        <label htmlFor="pn-template" className="mb-1.5 block text-[13px] font-medium text-t-secondary">
                          {t("pagenum.v2.template")}
                        </label>
                        <input
                          id="pn-template"
                          type="text"
                          value={customTemplate}
                          maxLength={80}
                          onChange={(e) => setCustomTemplate(e.target.value)}
                          aria-invalid={errors.template ? true : undefined}
                          className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 font-mono text-sm text-t-primary focus:border-accent/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
                        />
                        <p className={`mt-1.5 text-[12px] ${errors.template ? "text-red-600 dark:text-red-400" : "text-t-tertiary"}`}>
                          {errors.template ?? t("pagenum.v2.templateHint")}
                        </p>
                      </div>
                    )}
                    {usesRaster && (
                      <p className="flex items-start gap-2 rounded-xl bg-bg-secondary px-3 py-2.5 text-[12.5px] text-t-secondary">
                        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        {t("pagenum.v2.rasterNote")}
                      </p>
                    )}
                    <div>
                      <p className="mb-1.5 text-[13px] font-medium text-t-secondary">{t("pagenum.ui.digits")}</p>
                      <Segmented<number>
                        size="sm"
                        label={t("pagenum.ui.digits")}
                        value={digits}
                        onChange={setDigits}
                        options={[1, 2, 3, 4].map((d) => ({ value: d, label: "1".padStart(d, "0") }))}
                      />
                    </div>
                  </section>

                  <section className="glass space-y-4 p-5">
                    <p className={sectionTitle}>{t("pagenum.ui.pageRange")}</p>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <NumberField
                        id="pn-skip"
                        label={t("pagenum.v2.skip")}
                        value={skipText}
                        onChange={setSkipText}
                        min={0}
                        max={pageCount - 1}
                        error={errors.skip}
                        hint={t("pagenum.v2.skipHint")}
                      />
                      <NumberField
                        id="pn-last"
                        label={t("pagenum.v2.lastNumbered")}
                        value={lastText}
                        onChange={setLastText}
                        min={firstPage}
                        max={pageCount}
                        error={errors.last}
                      />
                      <NumberField
                        id="pn-start"
                        label={t("pagenum.ui.fromLabel")}
                        value={startText}
                        onChange={setStartText}
                        error={errors.start}
                        hint={t("pagenum.ui.startHint")}
                      />
                      <NumberField
                        id="pn-total"
                        label={t("pagenum.v2.total")}
                        value={totalText}
                        onChange={setTotalText}
                        min={1}
                        placeholder={t("pagenum.v2.totalAuto", { n: autoTotalValue })}
                        error={errors.total}
                        hint={t("pagenum.v2.totalHint")}
                      />
                    </div>
                    {options && (
                      <p className="text-[12.5px] text-t-tertiary">
                        {t("pagenum.v2.summary", { count: numberedCount, from: options.firstPage, to: options.lastPage })}
                      </p>
                    )}
                  </section>

                  <section className="glass space-y-4 p-5">
                    <p className={sectionTitle}>{t("pagenum.ui.appearance")}</p>
                    <div className="flex flex-wrap items-end gap-4">
                      <div>
                        <p className="mb-1.5 text-[13px] font-medium text-t-secondary">{t("pagenum.ui.font")}</p>
                        <Segmented<FontId>
                          size="sm"
                          label={t("pagenum.ui.font")}
                          value={font}
                          onChange={setFont}
                          options={FONTS.map((id) => ({
                            value: id,
                            label: <span style={{ fontFamily: CSS_FONT[id] }}>{FONT_LABEL[id]}</span>,
                          }))}
                        />
                      </div>
                      <label className="block">
                        <span className="mb-1.5 block text-[13px] font-medium text-t-secondary">{t("ui.color")}</span>
                        <span className="flex items-center gap-2 rounded-xl border border-border bg-bg-secondary px-2 py-1.5">
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => setColor(e.target.value)}
                            className="h-8 w-9 cursor-pointer rounded-md border border-border bg-transparent p-0.5"
                            aria-label={t("ui.color")}
                          />
                          <span className="font-mono text-[13px] text-t-secondary">{color}</span>
                        </span>
                      </label>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <Slider label={t("pagenum.ui.fontSize")} value={size} min={6} max={36} onChange={setSize} display={`${size} pt`} />
                      <Slider label={t("pagenum.ui.opacity")} value={opacity} min={10} max={100} onChange={setOpacity} display={`${opacity}%`} />
                      <Slider label={t("pagenum.ui.marginX")} value={marginX} min={0} max={144} onChange={setMarginX} display={`${marginX} pt`} disabled={h === "center"} />
                      <Slider label={t("pagenum.ui.marginY")} value={marginY} min={0} max={144} onChange={setMarginY} display={`${marginY} pt`} />
                    </div>
                  </section>

                  <div className="glass space-y-3 p-5">
                    {failure && (
                      <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[14px] text-red-700 dark:text-red-300">
                        {failure}
                      </p>
                    )}
                    {processing ? (
                      <div className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <ProgressBar progress={progress} label={t("pagenum.ui.processing")} />
                        </div>
                        <button type="button" onClick={cancel} className={buttonSecondary}>
                          {t("bg.cancel")}
                        </button>
                      </div>
                    ) : resultFresh ? (
                      <div className="flex flex-wrap items-center gap-3">
                        <DownloadButton blob={resultFresh.blob} filename={`${getFileNameWithoutExtension(file.name)}-numbered.pdf`} />
                        <span className="text-[13px] text-t-secondary">{t("pagenum.ui.resultTitle")}</span>
                      </div>
                    ) : (
                      <>
                        <button type="button" onClick={run} disabled={!options} className={`${buttonPrimary} w-full`}>
                          {result ? t("pagenum.v2.applyChanges") : t("pagenum.ui.process")}
                        </button>
                        {result && <p className="text-center text-[12.5px] text-t-tertiary">{t("pagenum.v2.stale")}</p>}
                        {!options && <p className="text-center text-[12.5px] text-t-tertiary">{t("pagenum.ui.invalidRange")}</p>}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ToolLayout>
  );
}
