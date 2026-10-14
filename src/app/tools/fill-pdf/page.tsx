"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { AlertTriangle, ChevronLeft, ChevronRight, Download, Loader2, RotateCcw, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { Toggle, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { downloadBlob, formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { editablePdfBytes, pdfInputErrorKey } from "@/lib/pdf-input";
import { openPdf } from "@/lib/pdfjs";
import { pdfFontUrl } from "@/lib/pdf-stamp/fonts";
import { renderPagePreview, type PagePreview } from "@/lib/pdf-stamp/preview";
import { useI18n } from "@/lib/i18n";
import { runWorkerTask } from "../merge-pdf/worker-task";
import type { FillRequest } from "./fill.worker";

type Kind = "text" | "checkbox" | "radio" | "select";

interface Widget {
  name: string;
  kind: Kind;
  page: number;
  /** Visible frame, points, top-left origin. */
  x: number;
  y: number;
  w: number;
  h: number;
  multiline?: boolean;
  maxLen?: number;
  readOnly?: boolean;
  /** Radio: this widget's value. Checkbox: its on-value. */
  onValue?: string;
  options?: { value: string; label: string }[];
  label?: string;
}

interface Loaded {
  file: File;
  bytes: Uint8Array;
  pdf: PDFDocumentProxy;
  pages: number;
}

interface PdfjsWidget {
  subtype: string;
  fieldType?: string;
  fieldName?: string;
  rect: number[];
  fieldValue?: string | string[] | null;
  checkBox?: boolean;
  radioButton?: boolean;
  pushButton?: boolean;
  buttonValue?: string | null;
  exportValue?: string;
  multiLine?: boolean;
  maxLen?: number;
  readOnly?: boolean;
  options?: { exportValue: string; displayValue: string }[];
  alternativeText?: string;
}

async function readWidgets(pdf: PDFDocumentProxy): Promise<{ widgets: Widget[]; values: Record<string, string | boolean> }> {
  const widgets: Widget[] = [];
  const values: Record<string, string | boolean> = {};
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    const annots = (await page.getAnnotations({ intent: "display" })) as PdfjsWidget[];
    for (const a of annots) {
      if (a.subtype !== "Widget" || !a.fieldName || a.pushButton) continue;
      const [x1, y1, x2, y2] = vp.convertToViewportRectangle(a.rect) as number[];
      const box = { x: Math.min(x1!, x2!), y: Math.min(y1!, y2!), w: Math.abs(x2! - x1!), h: Math.abs(y2! - y1!) };
      const base = { name: a.fieldName, page: n, ...box, readOnly: a.readOnly, label: a.alternativeText || undefined };
      if (a.fieldType === "Tx") {
        widgets.push({ ...base, kind: "text", multiline: a.multiLine, maxLen: a.maxLen || undefined });
        if (!(a.fieldName in values)) values[a.fieldName] = typeof a.fieldValue === "string" ? a.fieldValue : "";
      } else if (a.fieldType === "Btn" && a.checkBox) {
        const on = a.exportValue || "Yes";
        widgets.push({ ...base, kind: "checkbox", onValue: on });
        if (!(a.fieldName in values)) values[a.fieldName] = !!a.fieldValue && a.fieldValue !== "Off";
      } else if (a.fieldType === "Btn" && a.radioButton) {
        widgets.push({ ...base, kind: "radio", onValue: a.buttonValue ?? "" });
        if (!(a.fieldName in values)) values[a.fieldName] = typeof a.fieldValue === "string" && a.fieldValue !== "Off" ? a.fieldValue : "";
      } else if (a.fieldType === "Ch") {
        const options = (a.options ?? []).map((o) => ({ value: o.exportValue ?? o.displayValue, label: o.displayValue ?? o.exportValue }));
        widgets.push({ ...base, kind: "select", options });
        const v = Array.isArray(a.fieldValue) ? a.fieldValue[0] : a.fieldValue;
        if (!(a.fieldName in values)) values[a.fieldName] = typeof v === "string" ? v : "";
      }
    }
    page.cleanup();
  }
  return { widgets, values };
}

export default function FillPdfPage() {
  const { t } = useI18n();
  const [doc, setDoc] = useState<Loaded | null>(null);
  const [opening, setOpening] = useState(false);
  const [widgets, setWidgets] = useState<Widget[] | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [initial, setInitial] = useState<Record<string, string | boolean>>({});
  const [flatten, setFlatten] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [preview, setPreview] = useState<PagePreview | null>(null);
  const [saving, setSaving] = useState(false);
  const [boxW, setBoxW] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => () => void doc?.pdf.destroy(), [doc]);

  const open = useCallback(
    async (files: File[]) => {
      const f = files[0];
      if (!f) return;
      setOpening(true);
      try {
        const bytes = await editablePdfBytes(f);
        const pdf = await openPdf(bytes);
        const r = await readWidgets(pdf);
        setDoc({ file: f, bytes, pdf, pages: pdf.numPages });
        setWidgets(r.widgets);
        setValues(r.values);
        setInitial(r.values);
        setPageNo(r.widgets[0]?.page ?? 1);
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
  }, [doc, widgets]);

  useEffect(() => {
    if (!doc || !boxW) return;
    let cancelled = false;
    // Render without the form's own widget appearances: our inputs sit on top.
    renderPagePreview(doc.pdf, pageNo, Math.min(1800, Math.round(boxW * Math.min(2, window.devicePixelRatio || 1))), { forms: false }).then((p) => {
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

  const s = preview ? Math.min(boxW / preview.widthPt, 1.6) : 1;
  const set = (name: string, v: string | boolean) => setValues((prev) => ({ ...prev, [name]: v }));
  const onPage = (widgets ?? []).filter((w) => w.page === pageNo);
  const names = useMemo(() => {
    const seen = new Map<string, Widget>();
    for (const w of widgets ?? []) if (!seen.has(w.name)) seen.set(w.name, w);
    return [...seen.values()];
  }, [widgets]);
  const filled = names.filter((w) => (w.kind === "checkbox" ? values[w.name] === true : !!values[w.name])).length;
  const changed = names.filter((w) => values[w.name] !== initial[w.name]);

  const save = async () => {
    if (!doc) return;
    setSaving(true);
    try {
      const bytes = doc.bytes.slice().buffer as ArrayBuffer;
      const font = await (await fetch(pdfFontUrl("sans"))).arrayBuffer();
      const req: FillRequest = { bytes, values, flatten, font };
      const res = await runWorkerTask(() => new Worker(new URL("./fill.worker.ts", import.meta.url), { type: "module" }), req, [bytes, font], () => {}, new AbortController().signal);
      downloadBlob(new Blob([res.bytes as BlobPart], { type: "application/pdf" }), `${getFileNameWithoutExtension(doc.file.name)}_filled.pdf`);
      toast.success(t("fill.done"));
    } catch (error) {
      console.error(error);
      toast.error(t("organize.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const labelOf = (w: Widget) => w.label || w.name.replace(/[._]+/g, " ").replace(/\[\d+\]/g, "").trim();

  return (
    <ToolLayout toolName={t("tool.fill-pdf.name")} toolDescription={t("tool.fill-pdf.desc")}>
      {!doc || !widgets ? (
        <FileDropzone onFilesSelected={open} accept={{ "application/pdf": [".pdf"] }} formats={["PDF"]} label={opening ? t("p2o.opening") : t("fill.drop")} />
      ) : widgets.length === 0 ? (
        <div role="alert" className="glass flex items-start gap-3 p-5 text-[14px]">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-t-secondary" aria-hidden="true" />
          <div className="space-y-3">
            <p className="text-t-primary">{t("fill.noFields")}</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/tools/sign-pdf" className={buttonPrimary}>
                {t("fill.useSign")}
              </Link>
              <button type="button" className={buttonSecondary} onClick={() => setDoc(null)}>
                {t("rotpdf.changeFile")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
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
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full text-t-tertiary hover:bg-bg-secondary hover:text-t-primary"
                onClick={() => {
                  setDoc(null);
                  setWidgets(null);
                }}
                aria-label={t("rotpdf.changeFile")}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div ref={boxRef} className="glass flex justify-center overflow-x-auto p-3">
              {preview ? (
                <div className="relative shadow-sm" style={{ width: preview.widthPt * s, height: preview.heightPt * s }} dir="ltr">
                  <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label={t("meme.preview")} />
                  {onPage.map((w, i) => {
                    const style = { left: w.x * s, top: w.y * s, width: w.w * s, height: w.h * s, fontSize: Math.max(9, Math.min(w.h * s * 0.62, 16)) };
                    const common = `absolute border border-sky-500/50 bg-sky-100/70 text-black focus:outline-none focus:ring-2 focus:ring-volt/80 ${w.readOnly ? "opacity-60" : ""}`;
                    const label = labelOf(w);
                    if (w.kind === "text")
                      return w.multiline ? (
                        <textarea key={i} aria-label={label} title={label} readOnly={w.readOnly} maxLength={w.maxLen} value={String(values[w.name] ?? "")} onChange={(e) => set(w.name, e.target.value)} className={`${common} resize-none px-1 leading-tight`} style={style} />
                      ) : (
                        <input key={i} aria-label={label} title={label} readOnly={w.readOnly} maxLength={w.maxLen} value={String(values[w.name] ?? "")} onChange={(e) => set(w.name, e.target.value)} className={`${common} px-1`} style={style} />
                      );
                    if (w.kind === "checkbox")
                      return (
                        <label key={i} className={`${common} flex cursor-pointer items-center justify-center`} style={style} title={label}>
                          <input type="checkbox" aria-label={label} disabled={w.readOnly} checked={values[w.name] === true} onChange={(e) => set(w.name, e.target.checked)} className="h-[70%] w-[70%] accent-[#16181D]" />
                        </label>
                      );
                    if (w.kind === "radio")
                      return (
                        <label key={i} className={`${common} flex cursor-pointer items-center justify-center rounded-full`} style={style} title={`${label}: ${w.onValue}`}>
                          <input type="radio" name={`r-${w.name}`} aria-label={`${label}: ${w.onValue}`} disabled={w.readOnly} checked={values[w.name] === w.onValue} onChange={() => set(w.name, w.onValue ?? "")} className="h-[70%] w-[70%] accent-[#16181D]" />
                        </label>
                      );
                    return (
                      <select key={i} aria-label={label} title={label} disabled={w.readOnly} value={String(values[w.name] ?? "")} onChange={(e) => set(w.name, e.target.value)} className={common} style={style}>
                        <option value="">—</option>
                        {w.options?.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-96 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-t-tertiary" aria-hidden="true" />
                </div>
              )}
            </div>
            <p className="text-[12.5px] text-t-tertiary">{t("fill.hint")}</p>
          </div>

          <div className="space-y-5 lg:sticky lg:top-20">
            <div className="glass space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className={sectionTitle}>{t("fill.fields", { n: names.length })}</p>
                <span className="text-[12.5px] tabular-nums text-t-tertiary">{t("fill.filled", { n: filled, total: names.length })}</span>
              </div>
              <ul className="max-h-80 space-y-1 overflow-auto pe-1">
                {names.map((w) => (
                  <li key={w.name}>
                    <button type="button" onClick={() => setPageNo(w.page)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-start text-[13px] hover:bg-bg-secondary ${w.page === pageNo ? "text-t-primary" : "text-t-secondary"}`}>
                      <span className={`h-2 w-2 shrink-0 rounded-full ${(w.kind === "checkbox" ? values[w.name] === true : !!values[w.name]) ? "bg-volt" : "bg-border"}`} aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{labelOf(w)}</span>
                      <span className="text-[11.5px] tabular-nums text-t-tertiary">{t("compare.pageShort", { n: w.page })}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass space-y-3 p-4">
              <Toggle checked={flatten} onChange={setFlatten} label={t("fill.flatten")} description={t("fill.flattenHint")} />
              <div className="flex gap-2">
                <button type="button" className={buttonSecondary} onClick={() => setValues(initial)} disabled={!changed.length}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  {t("ui.reset")}
                </button>
                <button type="button" className={`${buttonPrimary} flex-1`} onClick={save} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                  {t("fill.download")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
