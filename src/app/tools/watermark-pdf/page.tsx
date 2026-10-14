"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { ChevronLeft, ChevronRight, Download, ImagePlus, Loader2, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { Segmented, Slider, Toggle, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { decodeImage, encodeCanvas, makeCanvas, ctx2d, releaseCanvas } from "@/lib/image-editor-kit";
import { downloadBlob, formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { editablePdfBytes, pdfInputErrorKey } from "@/lib/pdf-input";
import { openPdf } from "@/lib/pdfjs";
import { cssFamily, loadPreviewFont, pdfFontUrl, type PdfFontKey } from "@/lib/pdf-stamp/fonts";
import { ANCHORS, placements, textBlock, type Anchor } from "@/lib/pdf-stamp/geometry";
import { renderPagePreview, type PagePreview } from "@/lib/pdf-stamp/preview";
import { parsePageRanges, pagesInRanges } from "@/lib/split-pdf-ranges";
import { useStoredPref } from "@/lib/text-tools/hooks";
import { useI18n } from "@/lib/i18n";
import { runWorkerTask } from "../merge-pdf/worker-task";
import { MARGIN, TILE_GAP, type WatermarkOptions, type WatermarkRequest } from "./watermark";

type Family = "sans" | "serif" | "mono";
const COLORS = ["#16181D", "#6B7280", "#DC2626", "#2563EB", "#16A34A", "#FFD60A"];

function fontKey(family: Family, bold: boolean): PdfFontKey {
  if (family === "mono") return "mono";
  return bold ? (`${family}-bold` as PdfFontKey) : family;
}

interface Loaded {
  file: File;
  bytes: Uint8Array;
  pdf: PDFDocumentProxy;
  pages: number;
}

interface Stamp {
  bytes: ArrayBuffer;
  type: "png" | "jpg";
  width: number;
  height: number;
  preview: ImageBitmap;
  name: string;
}

export default function WatermarkPdfPage() {
  const { t } = useI18n();
  const [doc, setDoc] = useState<Loaded | null>(null);
  const [opening, setOpening] = useState(false);
  const [pageNo, setPageNo] = useState(1);
  const [preview, setPreview] = useState<PagePreview | null>(null);
  const [kind, setKind] = useStoredPref<"text" | "image">("wmpdf.kind", "text", ["text", "image"]);
  const [text, setText] = useState("");
  const [family, setFamily] = useStoredPref<Family>("wmpdf.family", "sans", ["sans", "serif", "mono"]);
  const [bold, setBold] = useStoredPref<boolean>("wmpdf.bold", true);
  const [size, setSize] = useStoredPref<number>("wmpdf.size", 9);
  const [color, setColor] = useStoredPref<string>("wmpdf.color", "#DC2626");
  const [opacity, setOpacity] = useStoredPref<number>("wmpdf.opacity", 30);
  const [rotation, setRotation] = useStoredPref<number>("wmpdf.rotation", 45);
  const [where, setWhere] = useStoredPref<Anchor | "tile">("wmpdf.where", "mc", [...ANCHORS, "tile"]);
  const [imageScale, setImageScale] = useStoredPref<number>("wmpdf.imageScale", 35);
  const [stamp, setStamp] = useState<Stamp | null>(null);
  const [pageMode, setPageMode] = useState<"all" | "custom">("all");
  const [rangeText, setRangeText] = useState("");
  const [saving, setSaving] = useState(false);
  const [fontReady, setFontReady] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  const key = fontKey(family, bold);
  const watermarkText = text || t("wmpdf.defaultText");

  useEffect(() => {
    void loadPreviewFont(key).then(() => setFontReady((n) => n + 1));
  }, [key]);
  useEffect(() => () => void doc?.pdf.destroy(), [doc]);
  useEffect(() => () => stamp?.preview.close(), [stamp]);

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
      } catch (error) {
        toast.error(t(pdfInputErrorKey(error)));
      } finally {
        setOpening(false);
      }
    },
    [t],
  );

  // Render the previewed page.
  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    const width = Math.min(1400, Math.round((boxRef.current?.clientWidth ?? 700) * Math.min(2, window.devicePixelRatio || 1)));
    renderPagePreview(doc.pdf, pageNo, width).then(
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
  }, [doc, pageNo]);

  const range = useMemo(() => {
    if (!doc || pageMode === "all") return { pages: null as number[] | null, error: null as string | null };
    const parsed = parsePageRanges(rangeText, doc.pages, { keywords: true });
    if (parsed.error) return { pages: null, error: t(parsed.error.key, parsed.error.params) };
    const pages = [...pagesInRanges(parsed.ranges)].sort((a, b) => a - b);
    return pages.length ? { pages, error: null } : { pages: null, error: t("p2o.rangeEmpty") };
  }, [doc, pageMode, rangeText, t]);
  const stamped = !range.pages || range.pages.includes(pageNo);

  // Draw page + watermark (same geometry as the writer).
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !preview) return;
    c.width = preview.bitmap.width;
    c.height = preview.bitmap.height;
    const ctx = c.getContext("2d")!;
    ctx.drawImage(preview.bitmap, 0, 0);
    if (!stamped) return;
    const k = preview.scale;
    const W = preview.widthPt, H = preview.heightPt;
    const margin = W * MARGIN, gap = W * TILE_GAP;
    ctx.globalAlpha = opacity / 100;
    const place = (cx: number, cy: number, draw: () => void) => {
      ctx.save();
      ctx.translate(cx * k, (H - cy) * k);
      ctx.rotate((-rotation * Math.PI) / 180);
      draw();
      ctx.restore();
    };
    if (kind === "text") {
      const px = Math.max(4, W * (size / 100));
      ctx.font = `${px * k}px "${cssFamily(key)}"`;
      const lines = watermarkText.split(/\r?\n/);
      const m = ctx.measureText("Hg");
      const ascent = (m.fontBoundingBoxAscent ?? px * k * 0.76) / k, descent = (m.fontBoundingBoxDescent ?? px * k * 0.24) / k;
      const block = textBlock(lines.map((l) => ctx.measureText(l).width / k), px, ascent, descent);
      ctx.fillStyle = color;
      for (const p of placements(W, H, block.w, block.h, rotation, where, margin, gap)) {
        place(p.x, p.y, () => block.lines.forEach((ln, i) => ctx.fillText(lines[i]!, ln.dx * k, -ln.dy * k)));
      }
    } else if (stamp) {
      const iw = W * (imageScale / 100), ih = (iw * stamp.height) / stamp.width;
      for (const p of placements(W, H, iw, ih, rotation, where, margin, gap)) {
        place(p.x, p.y, () => ctx.drawImage(stamp.preview, (-iw / 2) * k, (-ih / 2) * k, iw * k, ih * k));
      }
    }
    ctx.globalAlpha = 1;
  }, [preview, kind, watermarkText, key, size, color, opacity, rotation, where, imageScale, stamp, stamped, fontReady]);

  const pickImage = async (f: File) => {
    try {
      const d = await decodeImage(f);
      const maxSide = 2000;
      const k = Math.min(1, maxSide / Math.max(d.width, d.height));
      let bytes: ArrayBuffer, type: "png" | "jpg";
      if (k === 1 && (f.type === "image/png" || f.type === "image/jpeg")) {
        bytes = await f.arrayBuffer();
        type = f.type === "image/png" ? "png" : "jpg";
      } else {
        const c = makeCanvas(Math.round(d.width * k), Math.round(d.height * k));
        ctx2d(c).drawImage(d.bitmap, 0, 0, c.width, c.height);
        bytes = await (await encodeCanvas(c, "image/png", 1)).arrayBuffer();
        releaseCanvas(c);
        type = "png";
      }
      setStamp({ bytes, type, width: d.width, height: d.height, preview: d.bitmap, name: f.name });
      setKind("image");
    } catch {
      toast.error(t("ui.failedLoad"));
    }
  };

  const save = async () => {
    if (!doc || range.error) return;
    if (kind === "image" && !stamp) {
      imgRef.current?.click();
      return;
    }
    setSaving(true);
    try {
      const options: WatermarkOptions = { kind, text: watermarkText, font: key, size: size / 100, color, opacity: opacity / 100, rotation, where, imageScale: imageScale / 100, pages: range.pages };
      const pdfBytes = doc.bytes.slice().buffer as ArrayBuffer;
      const req: WatermarkRequest = { bytes: pdfBytes, options };
      const transfer: ArrayBuffer[] = [pdfBytes];
      if (kind === "text") {
        req.fontBytes = await (await fetch(pdfFontUrl(key))).arrayBuffer();
        transfer.push(req.fontBytes);
      } else if (stamp) {
        const copy = stamp.bytes.slice(0);
        req.image = { bytes: copy, type: stamp.type, width: stamp.width, height: stamp.height };
        transfer.push(copy);
      }
      const res = await runWorkerTask(() => new Worker(new URL("./watermark.worker.ts", import.meta.url), { type: "module" }), req, transfer, () => {}, new AbortController().signal);
      downloadBlob(new Blob([res.bytes as BlobPart], { type: "application/pdf" }), `${getFileNameWithoutExtension(doc.file.name)}_watermarked.pdf`);
      toast.success(t("wmpdf.done"));
    } catch (error) {
      console.error(error);
      toast.error(t("organize.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const label = (s: string) => <p className="mb-2 text-[13px] text-t-secondary">{s}</p>;

  return (
    <ToolLayout toolName={t("tool.watermark-pdf.name")} toolDescription={t("tool.watermark-pdf.desc")}>
      {!doc ? (
        <FileDropzone onFilesSelected={open} accept={{ "application/pdf": [".pdf"] }} formats={["PDF"]} label={opening ? t("p2o.opening") : t("wmpdf.drop")} />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="min-w-0 space-y-3 lg:sticky lg:top-20">
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
                  setPreview(null);
                }}
                aria-label={t("rotpdf.changeFile")}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div ref={boxRef} className="glass flex justify-center p-3">
              {preview ? (
                <canvas ref={canvasRef} className="h-auto max-h-[72vh] w-auto max-w-full rounded shadow-sm" role="img" aria-label={t("meme.preview")} />
              ) : (
                <div className="flex h-96 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-t-tertiary" aria-hidden="true" />
                </div>
              )}
            </div>
            {!stamped && <p className="text-[12.5px] text-t-tertiary">{t("wmpdf.notOnPage")}</p>}
          </div>

          <div className="space-y-5">
            <div className="glass space-y-4 p-4">
              <Segmented<"text" | "image">
                label={t("wmpdf.kind")}
                value={kind}
                onChange={(v) => {
                  setKind(v);
                  if (v === "image" && !stamp) imgRef.current?.click();
                }}
                options={[
                  { value: "text", label: t("wmpdf.text") },
                  { value: "image", label: t("wmpdf.image") },
                ]}
              />
              <input
                ref={imgRef}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void pickImage(f);
                }}
              />
              {kind === "text" ? (
                <>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={2}
                    placeholder={t("wmpdf.defaultText")}
                    aria-label={t("wmpdf.text")}
                    className="w-full resize-none rounded-xl border border-border bg-bg-secondary px-3 py-2 text-[14px] text-t-primary placeholder:text-t-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Segmented<Family>
                      label={t("meme.fontFamily")}
                      size="sm"
                      value={family}
                      onChange={setFamily}
                      options={[
                        { value: "sans", label: "Sans" },
                        { value: "serif", label: <span style={{ fontFamily: "Georgia, serif" }}>Serif</span> },
                        { value: "mono", label: <span className="font-mono">Mono</span> },
                      ]}
                    />
                    {family !== "mono" && <Toggle checked={bold} onChange={setBold} label={t("wmpdf.bold")} />}
                  </div>
                  <Slider label={t("meme.fontSize")} value={size} min={2} max={30} onChange={setSize} display={`${size}%`} />
                  <div>
                    {label(t("meme.textColor"))}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {COLORS.map((c) => (
                        <button key={c} type="button" onClick={() => setColor(c)} aria-label={c} aria-pressed={color.toUpperCase() === c} className={`h-7 w-7 rounded-md border-2 ${color.toUpperCase() === c ? "border-t-primary" : "border-border"}`} style={{ background: c }} />
                      ))}
                      <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-md border-2 border-border" title={t("meme.textColor")}>
                        <span className="absolute inset-0" style={{ background: "conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" }} />
                        <input type="color" value={color.toLowerCase()} onChange={(e) => setColor(e.target.value.toUpperCase())} className="absolute inset-0 cursor-pointer opacity-0" aria-label={t("meme.textColor")} />
                      </label>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <button type="button" className={`${buttonSecondary} w-full`} onClick={() => imgRef.current?.click()}>
                    <ImagePlus className="h-4 w-4" aria-hidden="true" />
                    {stamp ? stamp.name : t("wmpdf.pickImage")}
                  </button>
                  <Slider label={t("wmpdf.imageSize")} value={imageScale} min={5} max={100} onChange={setImageScale} display={`${imageScale}%`} />
                </>
              )}
              <Slider label={t("wmpdf.opacity")} value={opacity} min={5} max={100} onChange={setOpacity} display={`${opacity}%`} />
              <div>
                {label(t("meme.rotation"))}
                <Segmented<number>
                  label={t("meme.rotation")}
                  size="sm"
                  value={[0, 45, -45, 90].includes(rotation) ? rotation : 999}
                  onChange={(v) => v !== 999 && setRotation(v)}
                  options={[0, 45, -45, 90].map((d) => ({ value: d, label: `${d}°` }))}
                />
              </div>
            </div>

            <div className="glass space-y-4 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {label(t("wmpdf.position"))}
                  <div className="grid w-[108px] grid-cols-3 gap-1.5" role="radiogroup" aria-label={t("wmpdf.position")}>
                    {ANCHORS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        role="radio"
                        aria-checked={where === a}
                        aria-label={t(`wmpdf.anchor.${a}`)}
                        onClick={() => setWhere(a)}
                        className={`h-8 rounded-md border-2 transition ${where === a ? "border-t-primary bg-accent" : "border-border bg-bg-secondary hover:border-t-primary/40"}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="pt-7">
                  <Toggle checked={where === "tile"} onChange={(on) => setWhere(on ? "tile" : "mc")} label={t("wmpdf.tile")} description={t("wmpdf.tileHint")} />
                </div>
              </div>
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
                      aria-invalid={!!range.error && !!rangeText}
                      className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-bg-secondary px-3 text-[14px] text-t-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
                    />
                  )}
                </div>
                {pageMode === "custom" && range.error && rangeText && <p className="mt-1.5 text-[12.5px] text-red-700 dark:text-red-400">{range.error}</p>}
              </div>
              <button type="button" className={`${buttonPrimary} w-full`} onClick={save} disabled={saving || !!range.error}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                {t("wmpdf.download")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
