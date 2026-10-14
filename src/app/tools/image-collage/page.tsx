"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import toast from "react-hot-toast";
import { Download, ImagePlus, Loader2, RotateCcw, Trash2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { Segmented, Slider, Toggle, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { ctx2d, decodeImage, encodeCanvas, makeCanvas, makeProxy, maxCanvasPixels, nextFrame, releaseCanvas, resizeBitmap } from "@/lib/image-editor-kit";
import type { OutputFormat } from "@/lib/image-engine";
import { downloadBlob } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useStoredPref } from "@/lib/text-tools/hooks";
import { REF, TEMPLATES, computeLayout, hitCell, placeImage, type Framing, type Rect, type TemplateId } from "./collage-layout";

const MAX_IMAGES = 30;
const ACCEPT = { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif"] };
const SHAPES = ["1:1", "4:5", "3:2", "16:9", "9:16"] as const;
type Shape = (typeof SHAPES)[number];
const SHAPE_RATIO: Record<Shape, number> = { "1:1": 1, "4:5": 4 / 5, "3:2": 3 / 2, "16:9": 16 / 9, "9:16": 9 / 16 };
const SIZES = [1080, 2048, 4096] as const;
const BG_PRESETS = ["#FFFFFF", "#F3F1EC", "#16181D", "#000000"];
const TEMPLATE_KEY: Record<TemplateId, string> = {
  grid: "collage.v2.tpl.grid",
  "feature-left": "collage.v2.tpl.featureLeft",
  "feature-top": "collage.v2.tpl.featureTop",
  columns: "collage.v2.tpl.columns",
  rows: "collage.v2.tpl.rows",
  mosaic: "collage.v2.tpl.mosaic",
};

interface Photo extends Framing {
  id: number;
  file: File;
  proxy: ImageBitmap;
  /** Oriented size of the original. */
  w: number;
  h: number;
}

let nextId = 1;

function roundedClip(ctx: CanvasRenderingContext2D, r: Rect, radius: number) {
  ctx.beginPath();
  const rad = Math.max(0, Math.min(radius, r.w / 2, r.h / 2));
  if (rad > 0 && typeof ctx.roundRect === "function") ctx.roundRect(r.x, r.y, r.w, r.h, rad);
  else ctx.rect(r.x, r.y, r.w, r.h);
  ctx.clip();
}

/** Snap a reference-space rect to output pixels so neighbouring cells never leave seams. */
function snap(r: Rect, k: number): Rect {
  const x = Math.round(r.x * k), y = Math.round(r.y * k);
  return { x, y, w: Math.round((r.x + r.w) * k) - x, h: Math.round((r.y + r.h) * k) - y };
}

/** Small layout icon drawn from the real geometry for the current photo count. */
function TemplateIcon({ id, n, aspect }: { id: TemplateId; n: number; aspect: number }) {
  const shown = Math.max(2, Math.min(n, 9));
  const lay = computeLayout({ template: id, aspects: Array.from({ length: shown }, (_, i) => [1.5, 0.75, 1, 1.33, 0.8][i % 5]!), aspect, gap: 40, padding: 0, rows: 0 });
  return (
    <svg viewBox={`0 0 ${lay.width} ${lay.height}`} className="h-9 w-12" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      {lay.cells.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={c.w} height={c.h} rx={30} className={i === 0 ? "fill-current" : "fill-current opacity-45"} />
      ))}
    </svg>
  );
}

export default function ImageCollagePage() {
  const { t } = useI18n();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [template, setTemplate] = useStoredPref<TemplateId>("collage.tpl", "grid", TEMPLATES);
  const [shape, setShape] = useStoredPref<Shape>("collage.shape", "1:1", SHAPES);
  const [size, setSize] = useStoredPref<number>("collage.size", 2048, SIZES);
  const [gap, setGap] = useStoredPref<number>("collage.gap", 12);
  const [margin, setMargin] = useStoredPref<boolean>("collage.margin", true);
  const [radius, setRadius] = useStoredPref<number>("collage.radius", 0);
  const [bg, setBg] = useStoredPref<string>("collage.bg", "#FFFFFF");
  const [fit, setFit] = useStoredPref<"cover" | "contain">("collage.fit", "cover", ["cover", "contain"]);
  const [rows, setRows] = useState(0);
  const [format, setFormat] = useStoredPref<OutputFormat>("collage.format", "image/jpeg", ["image/jpeg", "image/png", "image/webp"]);
  const [quality, setQuality] = useStoredPref<number>("collage.quality", 0.9);
  const [selected, setSelected] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [exporting, setExporting] = useState(false);
  const [boxW, setBoxW] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<{ from: number; x: number; y: number; px: number; py: number; moved: boolean } | null>(null);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  useEffect(() => () => photosRef.current.forEach((p) => p.proxy.close()), []);

  const addFiles = useCallback(
    async (files: File[]) => {
      const room = MAX_IMAGES - photosRef.current.length;
      if (files.length > room) toast.error(t("collage.v2.max", { n: MAX_IMAGES }));
      const take = files.slice(0, Math.max(0, room));
      if (!take.length) return;
      setLoading(true);
      const added: Photo[] = [];
      let failed = 0;
      for (const file of take) {
        try {
          const d = await decodeImage(file);
          const proxy = await makeProxy(d.bitmap, 900);
          d.bitmap.close();
          added.push({ id: nextId++, file, proxy, w: d.naturalWidth, h: d.naturalHeight, px: 0.5, py: 0.5, zoom: 1 });
        } catch {
          failed++;
        }
        await nextFrame();
      }
      if (failed) toast.error(t("collage.loadFail"));
      setPhotos((prev) => [...prev, ...added]);
      setLoading(false);
    },
    [t],
  );

  const aspect = SHAPE_RATIO[shape];
  const layout = useMemo(
    () =>
      computeLayout({
        template,
        aspects: photos.map((p) => p.w / p.h),
        aspect,
        gap,
        padding: margin ? gap : 0,
        rows,
      }),
    [template, photos, aspect, gap, margin, rows],
  );
  const outScale = useMemo(() => {
    let k = size / REF;
    const budget = maxCanvasPixels();
    if (layout.width * k * layout.height * k > budget) k = Math.sqrt(budget / (layout.width * layout.height)) * 0.99;
    return k;
  }, [size, layout]);
  const outW = Math.round(layout.width * outScale), outH = Math.round(layout.height * outScale);
  const effectiveFit = template === "mosaic" ? "cover" : fit;

  // Fit the preview to its box (and to 70% of the viewport height).
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    setBoxW(el.clientWidth);
    return () => ro.disconnect();
  }, [photos.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const cssW = Math.max(1, Math.min(boxW, (typeof window !== "undefined" ? window.innerHeight * 0.7 : 700) * (layout.width / layout.height)));
  const cssH = cssW * (layout.height / layout.width);
  const previewK = cssW / layout.width;

  // ── Draw the preview from the proxies ──
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !photos.length || !boxW) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(cssW * dpr);
    c.height = Math.round(cssH * dpr);
    const ctx = ctx2d(c);
    const k = previewK * dpr;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingQuality = "high";
    layout.cells.forEach((cell, i) => {
      const p = photos[i];
      if (!p) return;
      const r = snap(cell, k);
      ctx.save();
      roundedClip(ctx, r, radius * k);
      const d = placeImage(r, p.w, p.h, effectiveFit, p);
      ctx.drawImage(p.proxy, d.x, d.y, d.w, d.h);
      if (i === dropTarget) {
        ctx.fillStyle = "rgba(255, 214, 10, 0.35)";
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }
      ctx.restore();
      if (i === selected) {
        ctx.save();
        ctx.lineWidth = 3 * dpr;
        ctx.strokeStyle = "#FFD60A";
        ctx.strokeRect(r.x + 1.5 * dpr, r.y + 1.5 * dpr, r.w - 3 * dpr, r.h - 3 * dpr);
        ctx.restore();
      }
    });
  }, [photos, layout, bg, radius, effectiveFit, selected, dropTarget, cssW, cssH, previewK, boxW]);

  // ── Interaction: drag onto another photo swaps, drag inside reframes, wheel zooms ──
  const toRef = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * layout.width, y: ((e.clientY - r.top) / r.height) * layout.height };
  };
  const update = (i: number, patch: Partial<Framing>) => setPhotos((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const onDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const { x, y } = toRef(e);
    const i = hitCell(layout.cells, x, y);
    if (i < 0) {
      setSelected(null);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelected(i);
    drag.current = { from: i, x: e.clientX, y: e.clientY, px: photos[i]!.px, py: photos[i]!.py, moved: false };
  };
  const onMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 3) d.moved = true;
    const { x, y } = toRef(e);
    const over = hitCell(layout.cells, x, y);
    setDropTarget(over >= 0 && over !== d.from ? over : null);
    if (over !== d.from || effectiveFit !== "cover") return;
    const p = photos[d.from]!, cell = layout.cells[d.from]!;
    const placed = placeImage(cell, p.w, p.h, "cover", p);
    const ox = placed.w - cell.w, oy = placed.h - cell.h;
    update(d.from, {
      px: ox > 0.5 ? Math.min(1, Math.max(0, d.px - (e.clientX - d.x) / previewK / ox)) : 0.5,
      py: oy > 0.5 ? Math.min(1, Math.max(0, d.py - (e.clientY - d.y) / previewK / oy)) : 0.5,
    });
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (d && dropTarget !== null) {
      setPhotos((prev) => {
        const next = [...prev];
        const a = next[d.from]!, b = next[dropTarget]!;
        // Each photo keeps its own framing; the dragged one as it was before this drag.
        next[d.from] = b;
        next[dropTarget] = { ...a, px: d.px, py: d.py };
        return next;
      });
      setSelected(dropTarget);
    }
    setDropTarget(null);
  };

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const onWheel = (e: WheelEvent) => {
      if (effectiveFit !== "cover") return;
      const r = c.getBoundingClientRect();
      const i = hitCell(layout.cells, ((e.clientX - r.left) / r.width) * layout.width, ((e.clientY - r.top) / r.height) * layout.height);
      if (i < 0) return;
      e.preventDefault();
      setSelected(i);
      setPhotos((prev) => prev.map((p, j) => (j === i ? { ...p, zoom: Math.min(4, Math.max(1, p.zoom * Math.exp(-e.deltaY * 0.0015))) } : p)));
    };
    c.addEventListener("wheel", onWheel, { passive: false });
    return () => c.removeEventListener("wheel", onWheel);
  }, [layout, effectiveFit, photos.length]);

  const remove = (i: number) => {
    setPhotos((prev) => {
      prev[i]?.proxy.close();
      return prev.filter((_, j) => j !== i);
    });
    setSelected(null);
  };
  const clearAll = () => {
    photos.forEach((p) => p.proxy.close());
    setPhotos([]);
    setSelected(null);
  };

  // ── Export at full resolution, encoded off the main thread ──
  const exportCollage = async () => {
    setExporting(true);
    const canvas = makeCanvas(outW, outH);
    try {
      const ctx = ctx2d(canvas);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, outW, outH);
      ctx.imageSmoothingQuality = "high";
      for (let i = 0; i < photos.length; i++) {
        const p = photos[i]!, cell = layout.cells[i];
        if (!cell) continue;
        const r = snap(cell, outScale);
        const d = placeImage(r, p.w, p.h, effectiveFit, p);
        const decoded = await decodeImage(p.file);
        // Downscale big photos in steps first: one huge drawImage step aliases.
        let src: ImageBitmap = decoded.bitmap;
        if (decoded.width > d.w * 1.5) {
          src = await resizeBitmap(decoded.bitmap, Math.max(1, Math.round(d.w)), Math.max(1, Math.round(d.h)));
          decoded.bitmap.close();
        }
        ctx.save();
        roundedClip(ctx, r, radius * outScale);
        ctx.drawImage(src, d.x, d.y, d.w, d.h);
        ctx.restore();
        src.close();
        await nextFrame();
      }
      const blob = await encodeCanvas(canvas, format, quality);
      const ext = format === "image/jpeg" ? "jpg" : format === "image/png" ? "png" : "webp";
      downloadBlob(blob, `collage-${outW}x${outH}.${ext}`);
      toast.success(t("collage.success"));
    } catch {
      toast.error(t("collage.fail"));
    } finally {
      releaseCanvas(canvas);
      setExporting(false);
    }
  };

  const sel = selected !== null ? photos[selected] : undefined;

  return (
    <ToolLayout toolName={t("tool.image-collage.name")} toolDescription={t("tool.image-collage.desc")}>
      <div className="space-y-5">
        {photos.length === 0 ? (
          loading ? (
            <div className="glass flex h-56 items-center justify-center gap-2 text-[14px] text-t-secondary" role="status">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              {t("ui.loading")}
            </div>
          ) : (
            <FileDropzone onFilesSelected={addFiles} accept={ACCEPT} multiple formats={["JPG", "PNG", "WEBP", "AVIF"]} label={t("collage.ui.dropLabel")} />
          )
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-3">
              <div className="glass p-3 sm:p-4">
                <div ref={boxRef} className="flex justify-center">
                  <canvas
                    ref={canvasRef}
                    style={{ width: cssW, height: cssH, background: CHECKER_BG }}
                    className="block touch-none select-none rounded-lg shadow-[0_0_0_1px_rgb(var(--border-rgb))]"
                    onPointerDown={onDown}
                    onPointerMove={onMove}
                    onPointerUp={onUp}
                    onPointerCancel={onUp}
                    aria-label={t("collage.v2.canvas")}
                    role="img"
                  />
                </div>
              </div>
              <p className="text-[12.5px] text-t-tertiary">{template === "mosaic" ? t("collage.v2.hintMosaic") : t("collage.v2.hint")}</p>

              {sel && selected !== null && (
                <div className="glass flex flex-wrap items-end gap-4 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="mb-2 truncate text-[13px] font-medium text-t-primary">{sel.file.name}</p>
                    {effectiveFit === "cover" && (
                      <Slider label={t("collage.v2.zoom")} value={Math.round(sel.zoom * 100)} min={100} max={400} onChange={(v) => update(selected, { zoom: v / 100 })} display={`${Math.round(sel.zoom * 100)}%`} />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className={buttonSecondary} onClick={() => update(selected, { px: 0.5, py: 0.5, zoom: 1 })}>
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      {t("collage.v2.reset")}
                    </button>
                    <button type="button" className={buttonSecondary} onClick={() => remove(selected)}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      {t("collage.v2.remove")}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="glass space-y-4 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className={sectionTitle}>{t("collage.v2.photos", { n: photos.length })}</p>
                  <button type="button" onClick={clearAll} className="text-[12.5px] text-t-tertiary hover:text-t-primary">
                    {t("ui.clearAll")}
                  </button>
                </div>
                <button type="button" className={`${buttonSecondary} w-full`} disabled={loading || photos.length >= MAX_IMAGES} onClick={() => fileRef.current?.click()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-4 w-4" aria-hidden="true" />}
                  {t("collage.addMore")}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(e) => {
                    const fs = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    if (fs.length) addFiles(fs);
                  }}
                />

                <div>
                  <p className="mb-2 text-[13px] text-t-secondary">{t("collage.layout")}</p>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t("collage.layout")}>
                    {TEMPLATES.map((id) => (
                      <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={template === id}
                        onClick={() => setTemplate(id)}
                        className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-[11.5px] font-medium transition ${template === id ? "border-t-primary bg-bg-secondary text-t-primary" : "border-border text-t-tertiary hover:text-t-primary"}`}
                      >
                        <TemplateIcon id={id} n={photos.length} aspect={id === "mosaic" ? 1 : aspect} />
                        {t(TEMPLATE_KEY[id])}
                      </button>
                    ))}
                  </div>
                </div>

                {template === "mosaic" ? (
                  <Slider
                    label={t("collage.v2.rows")}
                    value={rows}
                    min={0}
                    max={Math.min(8, photos.length)}
                    onChange={setRows}
                    display={rows === 0 ? t("ts.v2.auto") : String(rows)}
                  />
                ) : (
                  <>
                    <div>
                      <p className="mb-2 text-[13px] text-t-secondary">{t("collage.v2.shape")}</p>
                      <Segmented<Shape> label={t("collage.v2.shape")} size="sm" value={shape} onChange={setShape} options={SHAPES.map((s) => ({ value: s, label: s }))} />
                    </div>
                    <div>
                      <p className="mb-2 text-[13px] text-t-secondary">{t("collage.v2.fit")}</p>
                      <Segmented<"cover" | "contain">
                        label={t("collage.v2.fit")}
                        size="sm"
                        value={fit}
                        onChange={setFit}
                        options={[
                          { value: "cover", label: t("collage.v2.fill") },
                          { value: "contain", label: t("collage.v2.whole") },
                        ]}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="glass space-y-4 p-4">
                <Slider label={t("collage.v2.spacing")} value={gap} min={0} max={60} onChange={setGap} display={String(gap)} />
                <Toggle checked={margin} onChange={setMargin} label={t("collage.v2.margin")} />
                <Slider label={t("collage.v2.radius")} value={radius} min={0} max={80} onChange={setRadius} display={String(radius)} />
                <div>
                  <p className="mb-2 text-[13px] text-t-secondary">{t("collage.bgColor")}</p>
                  <div className="flex items-center gap-2">
                    {BG_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setBg(c)}
                        aria-label={c}
                        aria-pressed={bg.toUpperCase() === c}
                        className={`h-8 w-8 rounded-lg border-2 ${bg.toUpperCase() === c ? "border-t-primary" : "border-border"}`}
                        style={{ background: c }}
                      />
                    ))}
                    <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-lg border-2 border-border" title={t("collage.bgColor")}>
                      <span className="absolute inset-0" style={{ background: HUE_BG }} />
                      <input type="color" value={bg.length === 7 ? bg.toLowerCase() : "#ffffff"} onChange={(e) => setBg(e.target.value.toUpperCase())} className="absolute inset-0 cursor-pointer opacity-0" aria-label={t("collage.bgColor")} />
                    </label>
                    <span className="ms-1 font-mono text-[12px] text-t-tertiary">{bg}</span>
                  </div>
                </div>
              </div>

              <div className="glass space-y-4 p-4">
                <div>
                  <p className="mb-2 text-[13px] text-t-secondary">{t("collage.v2.size")}</p>
                  <Segmented<number> label={t("collage.v2.size")} size="sm" value={size} onChange={setSize} options={SIZES.map((s) => ({ value: s, label: `${s} px` }))} />
                </div>
                <div>
                  <p className="mb-2 text-[13px] text-t-secondary">{t("imgedit.v2.outputFormat")}</p>
                  <Segmented<OutputFormat>
                    label={t("imgedit.v2.outputFormat")}
                    size="sm"
                    value={format}
                    onChange={setFormat}
                    options={[
                      { value: "image/jpeg", label: "JPG" },
                      { value: "image/png", label: "PNG" },
                      { value: "image/webp", label: "WebP" },
                    ]}
                  />
                </div>
                {format !== "image/png" && (
                  <Slider label={t("ui.quality")} value={Math.round(quality * 100)} min={50} max={100} onChange={(v) => setQuality(v / 100)} display={`${Math.round(quality * 100)}%`} />
                )}
                <button type="button" className={`${buttonPrimary} w-full`} onClick={exportCollage} disabled={exporting || loading}>
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                  {exporting ? t("collage.v2.rendering") : t("collage.download")}
                </button>
                <p className="text-center text-[12.5px] tabular-nums text-t-tertiary">
                  {outW} × {outH} px
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}

const CHECKER_BG = "repeating-conic-gradient(rgb(var(--border-rgb)) 0 25%, transparent 0 50%) 0 0 / 16px 16px";
const HUE_BG = "conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)";
