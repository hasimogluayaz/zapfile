"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import toast from "react-hot-toast";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { CalendarDays, Check, ChevronLeft, ChevronRight, Copy, Download, Loader2, PenLine, Trash2, Type, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import SignaturePad, { type SignatureResult } from "@/components/sign/SignaturePad";
import { buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { downloadBlob, formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { editablePdfBytes, pdfInputErrorKey } from "@/lib/pdf-input";
import { openPdf } from "@/lib/pdfjs";
import { cssFamily, loadPreviewFont, pdfFontUrl, type PdfFontKey } from "@/lib/pdf-stamp/fonts";
import { renderPagePreview, type PagePreview } from "@/lib/pdf-stamp/preview";
import { useI18n } from "@/lib/i18n";
import { runWorkerTask } from "../merge-pdf/worker-task";
import { ASCENT, DESCENT, type Placed, type SignRequest } from "./sign";

interface Loaded {
  file: File;
  bytes: Uint8Array;
  pdf: PDFDocumentProxy;
  pages: number;
}

const TEXT_COLORS = ["#16181D", "#1D4ED8", "#B91C1C"];
let seq = 1;

export default function SignPdfPage() {
  const { t, locale } = useI18n();
  const [doc, setDoc] = useState<Loaded | null>(null);
  const [opening, setOpening] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [preview, setPreview] = useState<PagePreview | null>(null);
  const [items, setItems] = useState<Placed[]>([]);
  const [signatures, setSignatures] = useState<(SignatureResult & { key: string })[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [padOpen, setPadOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [boxW, setBoxW] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ id: number; mode: "move" | "resize"; sx: number; sy: number; start: Placed } | null>(null);

  useEffect(() => {
    void loadPreviewFont("sans");
    void loadPreviewFont("serif");
  }, []);
  useEffect(() => () => void doc?.pdf.destroy(), [doc]);
  useEffect(() => () => signatures.forEach((s) => URL.revokeObjectURL(s.url)), []); // eslint-disable-line react-hooks/exhaustive-deps

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
        setItems([]);
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
    renderPagePreview(doc.pdf, pageNo, Math.min(2000, Math.round(boxW * Math.min(2, window.devicePixelRatio || 1)))).then(
      (p) => {
        if (cancelled) p.bitmap.close();
        else
          setPreview((old) => {
            old?.bitmap.close();
            return p;
          });
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

  // Scale: CSS px per point. Fit the page in the box, and in 80% of the viewport height.
  const s = preview ? Math.min(boxW / preview.widthPt, (typeof window !== "undefined" ? window.innerHeight * 0.8 : 900) / preview.heightPt) : 1;
  const W = preview?.widthPt ?? 0, H = preview?.heightPt ?? 0;

  const sel = items.find((i) => i.id === selected) ?? null;
  const patch = (id: number, p: Partial<Placed>) => setItems((list) => list.map((i) => (i.id === id ? ({ ...i, ...p } as Placed) : i)));
  const remove = (id: number) => {
    setItems((list) => list.filter((i) => i.id !== id));
    setSelected(null);
  };

  const placeSignature = (sig: SignatureResult & { key: string }) => {
    if (!preview) return;
    const w = Math.min(W * 0.32, 220);
    const h = (w * sig.height) / sig.width;
    const it: Placed = { id: seq++, page: pageNo, kind: "image", image: sig.key, w, h, x: (W - w) / 2, y: H * 0.72 - h / 2 };
    setItems((l) => [...l, it]);
    setSelected(it.id);
  };
  const placeText = (text: string, font: PdfFontKey = "sans") => {
    if (!preview) return;
    // Stagger new items so they don't land on top of each other.
    const n = items.filter((i) => i.page === pageNo).length;
    const it: Placed = { id: seq++, page: pageNo, kind: "text", text, size: 12, color: TEXT_COLORS[0]!, font, x: W * 0.12 + (n % 4) * 18, y: Math.min(H - 30, H * 0.45 + n * 26) };
    setItems((l) => [...l, it]);
    setSelected(it.id);
    if (text === "") requestAnimationFrame(() => textRef.current?.focus());
  };

  const onSigned = (r: SignatureResult) => {
    const sig = { ...r, key: `sig${seq++}` };
    setSignatures((l) => [...l, sig]);
    setPadOpen(false);
    placeSignature(sig);
  };

  const onDown = (it: Placed, mode: "move" | "resize", e: ReactPointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setSelected(it.id);
    drag.current = { id: it.id, mode, sx: e.clientX, sy: e.clientY, start: it };
  };
  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / s, dy = (e.clientY - d.sy) / s;
    const st = d.start;
    if (d.mode === "move") {
      patch(d.id, { x: st.x + dx, y: st.y + dy });
    } else if (st.kind === "image") {
      const w = Math.max(12, st.w + dx);
      patch(d.id, { w, h: (w * st.h) / st.w });
    } else {
      const h0 = st.size * (ASCENT + DESCENT);
      patch(d.id, { size: Math.max(5, Math.min(96, (st.size * (h0 + dy)) / h0)) });
    }
  };
  const onUp = () => (drag.current = null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (padOpen) {
        if (e.key === "Escape") setPadOpen(false);
        return;
      }
      if (!sel) return;
      const typing = e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName);
      if (typing) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove(sel.id);
      }
      const step = e.shiftKey ? 10 : 1;
      const m = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (m) {
        e.preventDefault();
        patch(sel.id, { x: sel.x + m[0]!, y: sel.y + m[1]! });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const toAllPages = (it: Placed) => {
    if (!doc) return;
    const copies: Placed[] = [];
    for (let p = 1; p <= doc.pages; p++) if (p !== it.page) copies.push({ ...it, id: seq++, page: p });
    setItems((l) => [...l, ...copies]);
    toast.success(t("sign.copiedToAll", { n: copies.length }));
  };

  const save = async () => {
    if (!doc) return;
    if (!items.length) {
      toast(t("sign.nothing"));
      return;
    }
    setSaving(true);
    try {
      const bytes = doc.bytes.slice().buffer as ArrayBuffer;
      const used = new Set(items.flatMap((i) => (i.kind === "image" ? [i.image] : [])));
      const images: Record<string, ArrayBuffer> = {};
      for (const sig of signatures) if (used.has(sig.key)) images[sig.key] = await sig.png.arrayBuffer();
      const fonts: SignRequest["fonts"] = {};
      for (const k of new Set(items.flatMap((i) => (i.kind === "text" ? [i.font] : [])))) fonts[k] = await (await fetch(pdfFontUrl(k))).arrayBuffer();
      const req: SignRequest = { bytes, items, images, fonts };
      const res = await runWorkerTask(() => new Worker(new URL("./sign.worker.ts", import.meta.url), { type: "module" }), req, [bytes], () => {}, new AbortController().signal);
      downloadBlob(new Blob([res.bytes as BlobPart], { type: "application/pdf" }), `${getFileNameWithoutExtension(doc.file.name)}_signed.pdf`);
      toast.success(t("sign.done"));
    } catch (error) {
      console.error(error);
      toast.error(t("organize.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const today = new Intl.DateTimeFormat(locale, { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const onPage = items.filter((i) => i.page === pageNo);
  const tool = "inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-start text-[13.5px] font-medium text-t-primary transition hover:bg-bg-secondary";

  return (
    <ToolLayout toolName={t("tool.sign-pdf.name")} toolDescription={t("tool.sign-pdf.desc")}>
      {!doc ? (
        <FileDropzone onFilesSelected={open} accept={{ "application/pdf": [".pdf"] }} formats={["PDF"]} label={opening ? t("p2o.opening") : t("sign.drop")} />
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
            <div ref={boxRef} className="glass flex justify-center overflow-hidden p-3">
              {preview ? (
                <div
                  className="relative touch-none select-none shadow-sm"
                  style={{ width: W * s, height: H * s }}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerCancel={onUp}
                  onPointerDown={() => setSelected(null)}
                  dir="ltr"
                >
                  <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" role="img" aria-label={t("meme.preview")} />
                  {onPage.map((it) => {
                    const on = it.id === selected;
                    const box =
                      it.kind === "image"
                        ? { left: it.x * s, top: it.y * s, width: it.w * s, height: it.h * s }
                        : { left: it.x * s, top: it.y * s };
                    const sig = it.kind === "image" ? signatures.find((g) => g.key === it.image) : null;
                    return (
                      <div
                        key={it.id}
                        className={`absolute cursor-move ${on ? "outline outline-2 outline-offset-2 outline-volt" : "hover:outline hover:outline-1 hover:outline-offset-2 hover:outline-neutral-400"}`}
                        style={box}
                        onPointerDown={(e) => onDown(it, "move", e)}
                        onDoubleClick={() => it.kind === "text" && textRef.current?.focus()}
                      >
                        {it.kind === "image" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={sig?.url} alt="" draggable={false} className="pointer-events-none h-full w-full" />
                        ) : (
                          <span
                            className="block whitespace-pre"
                            style={{ fontFamily: `"${cssFamily(it.font)}"`, fontSize: it.size * s, lineHeight: ASCENT + DESCENT, color: it.color, minWidth: 8 }}
                          >
                            {it.text || " "}
                          </span>
                        )}
                        {on && (
                          <>
                            <span
                              className="absolute -bottom-2.5 -end-2.5 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-white bg-volt shadow"
                              onPointerDown={(e) => onDown(it, "resize", e)}
                              aria-hidden="true"
                            />
                            <button
                              type="button"
                              className="absolute -top-3 -end-3 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-on-accent shadow"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={() => remove(it.id)}
                              aria-label={t("organize.delete")}
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex h-96 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-t-tertiary" aria-hidden="true" />
                </div>
              )}
            </div>
            <p className="text-[12.5px] text-t-tertiary">{t("sign.hint")}</p>
          </div>

          <div className="space-y-5 lg:sticky lg:top-20">
            <div className="glass space-y-3 p-4">
              <p className={sectionTitle}>{t("sign.add")}</p>
              <button type="button" className={`${tool} w-full`} onClick={() => setPadOpen(true)}>
                <PenLine className="h-4 w-4" aria-hidden="true" />
                {t("sign.newSignature")}
              </button>
              {signatures.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {signatures.map((g) => (
                    <button key={g.key} type="button" onClick={() => placeSignature(g)} className="h-14 w-28 rounded-lg border border-border bg-white p-1.5 hover:border-t-primary" aria-label={t("sign.placeAgain")} title={t("sign.placeAgain")}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={g.url} alt="" className="h-full w-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={tool} onClick={() => placeText("")}>
                  <Type className="h-4 w-4" aria-hidden="true" />
                  {t("sign.text")}
                </button>
                <button type="button" className={tool} onClick={() => placeText(today)}>
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                  {t("sign.date")}
                </button>
                <button type="button" className={tool} onClick={() => placeText("✓")}>
                  <Check className="h-4 w-4" aria-hidden="true" />
                  {t("sign.check")}
                </button>
                <button type="button" className={tool} onClick={() => placeText("✗")}>
                  <X className="h-4 w-4" aria-hidden="true" />
                  {t("sign.cross")}
                </button>
              </div>
            </div>

            {sel && (
              <div className="glass space-y-3 p-4">
                <p className={sectionTitle}>{t("meme.editSelected")}</p>
                {sel.kind === "text" && (
                  <>
                    <input
                      ref={textRef}
                      value={sel.text}
                      onChange={(e) => patch(sel.id, { text: e.target.value })}
                      placeholder={t("meme.enterText")}
                      aria-label={t("meme.textLabel")}
                      className="h-10 w-full rounded-xl border border-border bg-bg-secondary px-3 text-[14px] text-t-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button type="button" className={buttonSecondary} onClick={() => patch(sel.id, { size: Math.max(5, sel.size - 1) })} aria-label="−">
                        A−
                      </button>
                      <span className="w-12 text-center text-[13px] tabular-nums text-t-secondary">{Math.round(sel.size)} pt</span>
                      <button type="button" className={buttonSecondary} onClick={() => patch(sel.id, { size: Math.min(96, sel.size + 1) })} aria-label="+">
                        A+
                      </button>
                      <button type="button" className={buttonSecondary} onClick={() => patch(sel.id, { font: sel.font === "serif" ? "sans" : "serif" })}>
                        {sel.font === "serif" ? "Serif" : "Sans"}
                      </button>
                      <div className="ms-auto flex gap-1.5">
                        {TEXT_COLORS.map((c) => (
                          <button key={c} type="button" onClick={() => patch(sel.id, { color: c })} aria-label={c} className={`h-6 w-6 rounded-full border-2 ${sel.color === c ? "border-t-primary" : "border-border"}`} style={{ background: c }} />
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <div className="flex flex-wrap gap-2">
                  {doc.pages > 1 && (
                    <button type="button" className={buttonSecondary} onClick={() => toAllPages(sel)}>
                      <Copy className="h-4 w-4" aria-hidden="true" />
                      {t("sign.allPages")}
                    </button>
                  )}
                  <button type="button" className={buttonSecondary} onClick={() => remove(sel.id)}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    {t("organize.delete")}
                  </button>
                </div>
              </div>
            )}

            <div className="glass space-y-2 p-4">
              <button type="button" className={`${buttonPrimary} w-full`} onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                {t("sign.download")}
              </button>
              <p className="text-center text-[12.5px] text-t-tertiary">{t("sign.placedCount", { n: items.length })}</p>
            </div>
          </div>
        </div>
      )}

      {padOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={t("sign.newSignature")} onClick={() => setPadOpen(false)}>
          <div className="w-full max-w-xl rounded-t-2xl bg-surface p-5 shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="mb-4 text-[17px] font-semibold text-t-primary">{t("sign.newSignature")}</p>
            <SignaturePad onDone={onSigned} onCancel={() => setPadOpen(false)} />
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
