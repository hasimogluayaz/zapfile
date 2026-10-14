"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AlertCircle, ArrowUpRight, Check, Download, ImagePlus, Link2, Link2Off, Loader2, Plus, Square, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { Segmented, Slider, Toggle, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { AbortError, processImage, type ImageJob, type OutputFormat } from "@/lib/image-engine";
import {
  MAX_PIXELS,
  MAX_SIDE,
  clampDims,
  ctx2d,
  decodeOnMain,
  formatLabel,
  keepFormatFor,
  makeCanvas,
  outputName,
  uniqueNamer,
  zipFiles,
} from "@/lib/image-tools-kit";
import {
  BackgroundPicker,
  BatchProgress,
  CHECKER_STYLE,
  fitSize,
  jobInput,
  useElementWidth,
  useImageItems,
  useMaxPreviewHeight,
  type ImageItem,
} from "@/lib/image-tools-ui";
import { downloadBlob, formatFileSize } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type Mode = "exact" | "longest" | "width" | "height" | "percent";
type Fit = "contain" | "pad" | "cover" | "stretch";
type FormatChoice = "keep" | OutputFormat;

interface Settings {
  mode: Mode;
  w: number;
  h: number;
  lock: boolean;
  ratio: number;
  fit: Fit;
  side: number;
  percent: number;
  noEnlarge: boolean;
  format: FormatChoice;
  quality: number;
  background: string;
}

const DEFAULTS: Settings = {
  mode: "longest",
  w: 1920,
  h: 1080,
  lock: true,
  ratio: 16 / 9,
  fit: "contain",
  side: 1920,
  percent: 50,
  noEnlarge: true,
  format: "keep",
  quality: 0.9,
  background: "transparent",
};

const ACCEPT = {
  "image/jpeg": [".jpg", ".jpeg", ".jfif"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/avif": [".avif"],
  "image/gif": [".gif"],
  "image/bmp": [".bmp"],
};
const MAX_FILES = 60;
const SIDE_CHIPS = [640, 1080, 1280, 1920, 2560, 3840];
const PERCENT_CHIPS = [25, 50, 75, 150, 200];
const BOX_PRESETS: { label: string; w: number; h: number }[] = [
  { label: "1:1 · 1080", w: 1080, h: 1080 },
  { label: "4:5 · 1080×1350", w: 1080, h: 1350 },
  { label: "9:16 · 1080×1920", w: 1080, h: 1920 },
  { label: "16:9 · 1920×1080", w: 1920, h: 1080 },
  { label: "HD · 1280×720", w: 1280, h: 720 },
  { label: "4K · 3840×2160", w: 3840, h: 2160 },
];

interface Plan {
  w: number;
  h: number;
  kind: "scale" | "cover" | "pad";
  crop?: { x: number; y: number; width: number; height: number };
  /** pad: size of the scaled image inside the w×h canvas */
  inner?: { w: number; h: number };
  enlarged: boolean;
  limited: boolean;
}

const clampSide = (n: number) => Math.max(1, Math.min(MAX_SIDE, Math.round(n) || 1));

/** Output geometry for one image — the same numbers drive the preview, the list and the job. */
function planFor(sw: number, sh: number, s: Settings): Plan {
  if (s.mode === "exact") {
    const W = clampSide(s.w);
    const H = clampSide(s.h);
    if (s.fit === "stretch") {
      const c = clampDims(s.noEnlarge ? Math.min(W, sw) : W, s.noEnlarge ? Math.min(H, sh) : H);
      return { w: c.w, h: c.h, kind: "scale", enlarged: c.w > sw || c.h > sh, limited: c.limited };
    }
    if (s.fit === "cover") {
      const a = W / H;
      let rw = sw;
      let rh = sw / a;
      if (rh > sh) {
        rh = sh;
        rw = sh * a;
      }
      let k = W / rw;
      if (s.noEnlarge) k = Math.min(1, k);
      const c = clampDims(rw * k, rh * k);
      return {
        w: c.w,
        h: c.h,
        kind: "cover",
        crop: { x: (sw - rw) / 2, y: (sh - rh) / 2, width: rw, height: rh },
        enlarged: c.w > rw + 0.5,
        limited: c.limited,
      };
    }
    let k = Math.min(W / sw, H / sh);
    if (s.noEnlarge) k = Math.min(1, k);
    if (s.fit === "pad") {
      const c = clampDims(W, H);
      const f = c.w / W;
      return {
        w: c.w,
        h: c.h,
        kind: "pad",
        inner: { w: Math.max(1, Math.round(sw * k * f)), h: Math.max(1, Math.round(sh * k * f)) },
        enlarged: k > 1,
        limited: c.limited,
      };
    }
    const c = clampDims(sw * k, sh * k);
    return { w: c.w, h: c.h, kind: "scale", enlarged: k > 1, limited: c.limited };
  }
  let k = 1;
  if (s.mode === "longest") k = clampSide(s.side) / Math.max(sw, sh);
  else if (s.mode === "width") k = clampSide(s.side) / sw;
  else if (s.mode === "height") k = clampSide(s.side) / sh;
  else k = Math.max(1, Math.min(400, s.percent)) / 100;
  if (s.noEnlarge) k = Math.min(1, k);
  const c = clampDims(sw * k, sh * k);
  return { w: c.w, h: c.h, kind: "scale", enlarged: k > 1, limited: c.limited };
}

/** Letterbox: draw the image centred on a canvas with the target aspect (at source resolution), so the engine can Lanczos-scale it to w×h. */
async function paddedSource(file: Blob, plan: Plan, fill: string | null): Promise<ImageBitmap> {
  const bmp = await decodeOnMain(file);
  try {
    const k = plan.inner!.w / bmp.width; // bitmap → output scale
    const cw0 = plan.w / k;
    const ch0 = plan.h / k;
    const f = cw0 * ch0 > MAX_PIXELS ? Math.sqrt(MAX_PIXELS / (cw0 * ch0)) * 0.999 : 1;
    const canvas = makeCanvas(cw0 * f, ch0 * f);
    const ctx = ctx2d(canvas);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    const dw = (bmp.width * canvas.width) / cw0;
    const dh = (bmp.height * canvas.height) / ch0;
    ctx.drawImage(bmp, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
    return "transferToImageBitmap" in canvas ? canvas.transferToImageBitmap() : await createImageBitmap(canvas);
  } finally {
    bmp.close();
  }
}

export default function ResizeImagePage() {
  const { t } = useI18n();
  const { items, itemsRef, update, add, remove, clear, setItems } = useImageItems(720);
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [boxInit, setBoxInit] = useState(false);
  const runRef = useRef<AbortController | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const [frameRef, frameWidth] = useElementWidth();
  const maxH = useMaxPreviewHeight(0.5, 420);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setS((p) => ({ ...p, [key]: value }));

  // Exact-size box starts at the first image's size.
  const first = items.find((i) => i.width);
  useEffect(() => {
    if (boxInit || !first?.width || !first.height) return;
    setBoxInit(true);
    setS((p) => ({ ...p, w: first.width!, h: first.height!, ratio: first.width! / first.height! }));
  }, [first, boxInit]);

  const formatFor = useCallback(
    (item: ImageItem): OutputFormat => (s.format === "keep" ? keepFormatFor(item.file, item.alpha) : s.format),
    [s.format],
  );

  // Any change invalidates finished results (never offer a stale download).
  const settingsKey = JSON.stringify(s);
  useEffect(() => {
    runRef.current?.abort();
    runRef.current = null;
    setRunning(false);
    setItems((prev) => (prev.some((i) => i.result || i.status !== "idle") ? prev.map((i) => ({ ...i, status: "idle", result: undefined })) : prev));
  }, [settingsKey, setItems]);

  useEffect(() => () => runRef.current?.abort(), []);

  const addFiles = useCallback(
    (files: File[]) => {
      const room = MAX_FILES - itemsRef.current.length;
      if (room <= 0) return void toast.error(t("imgkit.tooMany", { n: MAX_FILES }));
      if (files.length > room) toast.error(t("imgkit.tooMany", { n: MAX_FILES }));
      const fresh = add(files.slice(0, room));
      setSelectedId((cur) => cur ?? fresh[0]?.id ?? null);
    },
    [add, itemsRef, t],
  );

  const reset = () => {
    runRef.current?.abort();
    runRef.current = null;
    setRunning(false);
    clear();
    setSelectedId(null);
    setBoxInit(false);
  };

  // ── Run ──────────────────────────────────────────────────────────────
  const fillFor = (format: OutputFormat): string | null => {
    if (s.background !== "transparent") return s.background;
    return format === "image/jpeg" ? "#ffffff" : null;
  };

  const resizeAll = async () => {
    const todo = itemsRef.current.filter((i) => i.width && i.height && !i.unreadable && !i.result);
    if (!todo.length) return;
    const ctrl = new AbortController();
    runRef.current = ctrl;
    setRunning(true);
    setItems((prev) => prev.map((i) => (todo.some((x) => x.id === i.id) ? { ...i, status: "queued" } : i)));
    const settings = s;
    let failed = 0;
    await Promise.all(
      todo.map(async (item) => {
        const format = formatFor(item);
        const plan = planFor(item.width!, item.height!, settings);
        const jpegFill = format === "image/jpeg" ? fillFor(format) ?? "#ffffff" : undefined;
        try {
          if (ctrl.signal.aborted) return;
          let job: ImageJob;
          const encode = { format, quality: settings.quality };
          if (plan.kind === "pad") {
            const padFill = fillFor(format);
            const input = (await paddedSource(item.mainDecode ? await jobInput(item) : item.file, plan, padFill)) as unknown as Blob;
            job = { input, transform: { resize: { width: plan.w, height: plan.h, fit: "stretch", withoutEnlargement: false }, background: jpegFill }, encode };
          } else {
            job = {
              input: await jobInput(item),
              transform: {
                crop: plan.crop,
                resize: { width: plan.w, height: plan.h, fit: "stretch", withoutEnlargement: false },
                background: jpegFill,
              },
              encode,
            };
          }
          if (ctrl.signal.aborted) return;
          update(item.id, { status: "working" });
          const res = await processImage(job, ctrl.signal);
          if (ctrl.signal.aborted) return;
          update(item.id, { status: "done", result: { blob: res.blob, width: res.width, height: res.height, format } });
        } catch (error) {
          if (error instanceof AbortError || ctrl.signal.aborted) return;
          console.error(error);
          failed++;
          update(item.id, { status: "error" });
        }
      }),
    );
    if (runRef.current !== ctrl) return;
    runRef.current = null;
    setRunning(false);
    if (failed) toast.error(t("resimg.fail"));
  };

  const cancel = () => {
    runRef.current?.abort();
    runRef.current = null;
    setRunning(false);
    setItems((prev) => prev.map((i) => (i.status === "queued" || i.status === "working" ? { ...i, status: "idle" } : i)));
  };

  // ── Derived ────────────────────────────────────────────────────────────
  const ready = items.filter((i) => i.width && !i.unreadable);
  const done = items.filter((i) => i.result);
  const allDone = ready.length > 0 && ready.every((i) => i.result);
  const selected = items.find((i) => i.id === selectedId) ?? items[0];
  const selPlan = selected?.width && selected.height ? planFor(selected.width, selected.height, s) : null;
  const valid = s.mode !== "exact" || (s.w >= 1 && s.h >= 1);

  const names = useMemo(() => {
    const name = uniqueNamer();
    const map = new Map<string, string>();
    for (const i of items) if (i.result) map.set(i.id, name(outputName(i.file, `-${i.result.width}x${i.result.height}`, i.result.format)));
    return map;
  }, [items]);

  const downloadAll = async () => {
    if (done.length === 1) return downloadBlob(done[0].result!.blob, names.get(done[0].id)!);
    setZipping(true);
    try {
      downloadBlob(await zipFiles(done.map((i) => ({ name: names.get(i.id)!, blob: i.result!.blob }))), "resized-images.zip");
    } finally {
      setZipping(false);
    }
  };

  const outFormats = new Set(ready.map((i) => formatFor(i)));
  const anyLossy = Array.from(outFormats).some((f) => f !== "image/png");
  const jpegAlpha = ready.some((i) => i.alpha && formatFor(i) === "image/jpeg");
  const isPad = s.mode === "exact" && s.fit === "pad";
  const showBackground = isPad || jpegAlpha;
  const allowTransparent = isPad && s.format !== "image/jpeg";
  useEffect(() => {
    if (!allowTransparent && s.background === "transparent" && showBackground) setS((p) => ({ ...p, background: "#ffffff" }));
  }, [allowTransparent, s.background, showBackground]);

  const setW = (v: number) =>
    setS((p) => {
      const w = Math.max(0, Math.min(MAX_SIDE, Math.round(v) || 0));
      return { ...p, w, h: p.lock && w > 0 ? Math.max(1, Math.min(MAX_SIDE, Math.round(w / p.ratio))) : p.h };
    });
  const setH = (v: number) =>
    setS((p) => {
      const h = Math.max(0, Math.min(MAX_SIDE, Math.round(v) || 0));
      return { ...p, h, w: p.lock && h > 0 ? Math.max(1, Math.min(MAX_SIDE, Math.round(h * p.ratio))) : p.w };
    });

  // ── Preview frame ──────────────────────────────────────────────────────
  const preview = (() => {
    if (!selected?.thumb || !selPlan) return null;
    const box = fitSize(selPlan.w, selPlan.h, Math.max(0, frameWidth), maxH);
    const fill = isPad ? (s.background === "transparent" ? (formatFor(selected) === "image/jpeg" ? "#ffffff" : null) : s.background) : null;
    const objectFit = selPlan.kind === "pad" ? "contain" : selPlan.kind === "cover" ? "cover" : "fill";
    let imgStyle: React.CSSProperties = { width: "100%", height: "100%", objectFit };
    if (selPlan.kind === "pad" && selPlan.inner) {
      imgStyle = { width: `${(selPlan.inner.w / selPlan.w) * 100}%`, height: `${(selPlan.inner.h / selPlan.h) * 100}%`, objectFit: "fill" };
    }
    return (
      <div className="flex justify-center">
        <div
          className="relative flex items-center justify-center overflow-hidden rounded-lg border border-border"
          style={{ width: box.w, height: box.h, ...(fill ? { backgroundColor: fill } : CHECKER_STYLE) }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={selected.thumb} alt="" draggable={false} style={imgStyle} />
        </div>
      </div>
    );
  })();

  const modeOptions: { value: Mode; label: string }[] = [
    { value: "longest", label: t("resize.v2.longest") },
    { value: "width", label: t("ui.width") },
    { value: "height", label: t("ui.height") },
    { value: "percent", label: t("resize.v2.percent") },
    { value: "exact", label: t("resize.v2.exact") },
  ];

  const inputCls =
    "w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-[15px] tabular-nums text-t-primary focus:border-t-primary/40 focus:outline-none";
  const chipCls = (active: boolean) =>
    `min-h-[36px] rounded-lg border px-3 text-[13px] font-medium tabular-nums transition ${
      active ? "border-t-primary bg-bg-secondary text-t-primary" : "border-border text-t-secondary hover:bg-bg-secondary hover:text-t-primary"
    }`;

  return (
    <ToolLayout
      toolName="Resize Image"
      toolDescription="Change image dimensions with aspect ratio control. Supports JPG, PNG, and WebP - batch processing supported."
    >
      {items.length === 0 ? (
        <FileDropzone
          onFilesSelected={addFiles}
          accept={ACCEPT}
          multiple
          formats={["JPG", "PNG", "WEBP", "AVIF", "GIF", "BMP"]}
          label={t("resize.ui.dropLabel")}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="min-w-0 space-y-4">
            {selected && (
              <div className="glass space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-[14px] font-semibold text-t-primary">{selected.file.name}</p>
                  {selPlan && (
                    <p className="text-[13px] tabular-nums text-t-secondary">
                      {selected.width}×{selected.height} → <span className="font-semibold text-t-primary">{selPlan.w}×{selPlan.h}</span>
                    </p>
                  )}
                </div>
                <div ref={frameRef} className="w-full">
                  {preview ?? <div className="h-48 animate-pulse rounded-lg bg-bg-secondary" />}
                </div>
                {selPlan?.limited && <p className="text-[12.5px] text-amber-700 dark:text-amber-400">{t("resize.v2.limited", { n: MAX_SIDE })}</p>}
              </div>
            )}

            <div className="glass p-2">
              <ul className="divide-y divide-border">
                {items.map((item) => {
                  const plan = item.width && item.height ? planFor(item.width, item.height, s) : null;
                  return (
                    <li key={item.id}>
                      <div className={`flex items-center gap-3 rounded-xl p-2 ${item.id === selected?.id ? "bg-bg-secondary" : ""}`}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          aria-pressed={item.id === selected?.id}
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt"
                        >
                          <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-bg-tertiary">
                            {item.thumb && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={item.thumb} alt="" className="h-full w-full object-cover" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-medium text-t-primary">{item.file.name}</span>
                            <span className="block text-[12.5px] tabular-nums text-t-tertiary">
                              {item.unreadable ? (
                                <span className="text-red-700 dark:text-red-400">{t("convimg.v2.unreadable")}</span>
                              ) : plan ? (
                                <>
                                  {item.width}×{item.height} → <span className="text-t-secondary">{plan.w}×{plan.h}</span>
                                  {plan.enlarged && (
                                    <span className="ms-1 inline-flex items-center gap-0.5 text-amber-700 dark:text-amber-400">
                                      <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                                      {t("resize.v2.upscaled")}
                                    </span>
                                  )}
                                  {item.result && ` · ${formatLabel(item.result.format)} ${formatFileSize(item.result.blob.size)}`}
                                </>
                              ) : (
                                formatFileSize(item.file.size)
                              )}
                            </span>
                          </span>
                        </button>
                        <span className="flex w-6 shrink-0 justify-center">
                          {item.status === "working" || item.status === "queued" ? (
                            <Loader2 className="h-4 w-4 animate-spin text-t-tertiary" aria-label={t("resimg.resizing")} />
                          ) : item.status === "error" ? (
                            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" aria-label={t("resimg.fail")} />
                          ) : item.result ? (
                            <Check className="h-4 w-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
                          ) : null}
                        </span>
                        <button
                          type="button"
                          disabled={!item.result}
                          onClick={() => item.result && downloadBlob(item.result.blob, names.get(item.id)!)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-t-secondary hover:bg-bg-tertiary hover:text-t-primary disabled:opacity-30"
                          aria-label={t("ui.download")}
                          title={t("ui.download")}
                        >
                          <Download className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            remove(item.id);
                            if (selectedId === item.id) setSelectedId(null);
                          }}
                          disabled={running}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-t-tertiary hover:bg-bg-tertiary hover:text-t-primary disabled:opacity-30"
                          aria-label={t("ui.remove")}
                          title={t("ui.remove")}
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => addInputRef.current?.click()}
                disabled={running}
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13.5px] font-medium text-t-secondary hover:bg-bg-secondary hover:text-t-primary disabled:opacity-40"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t("cimg.addMore")}
              </button>
              <input
                ref={addInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/bmp"
                multiple
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  addFiles(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          <div className="space-y-4 lg:sticky lg:top-20">
            <div className="glass space-y-5 p-5">
              <div className="space-y-2">
                <p className={sectionTitle}>{t("resize.v2.resizeBy")}</p>
                <Segmented label={t("resize.v2.resizeBy")} size="sm" value={s.mode} onChange={(v) => set("mode", v)} options={modeOptions} />
              </div>

              {(s.mode === "longest" || s.mode === "width" || s.mode === "height") && (
                <div className="space-y-2">
                  <label className="block">
                    <span className="mb-1.5 block text-[13px] text-t-secondary">
                      {s.mode === "longest" ? t("resize.v2.longestPx") : s.mode === "width" ? t("resimg.widthPx") : t("resimg.heightPx")}
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={MAX_SIDE}
                      value={s.side || ""}
                      onChange={(e) => set("side", Math.max(0, Math.min(MAX_SIDE, Math.round(Number(e.target.value) || 0))))}
                      className={inputCls}
                    />
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {SIDE_CHIPS.map((n) => (
                      <button key={n} type="button" onClick={() => set("side", n)} className={chipCls(s.side === n)}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-[12px] text-t-tertiary">{t("resize.v2.perImage")}</p>
                </div>
              )}

              {s.mode === "percent" && (
                <div className="space-y-2">
                  <Slider label={t("resize.v2.scale")} value={s.percent} min={5} max={400} onChange={(v) => set("percent", v)} display={`${s.percent}%`} />
                  <div className="flex flex-wrap gap-1.5">
                    {PERCENT_CHIPS.map((n) => (
                      <button key={n} type="button" onClick={() => set("percent", n)} className={chipCls(s.percent === n)}>
                        {n}%
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {s.mode === "exact" && (
                <div className="space-y-3">
                  <div className="flex items-end gap-2">
                    <label className="block flex-1">
                      <span className="mb-1.5 block text-[13px] text-t-secondary">{t("resimg.widthPx")}</span>
                      <input type="number" inputMode="numeric" min={1} max={MAX_SIDE} value={s.w || ""} onChange={(e) => setW(Number(e.target.value))} className={inputCls} />
                    </label>
                    <button
                      type="button"
                      onClick={() => setS((p) => ({ ...p, lock: !p.lock, ratio: !p.lock && p.w > 0 && p.h > 0 ? p.w / p.h : p.ratio }))}
                      aria-pressed={s.lock}
                      aria-label={t("ui.lockAspect")}
                      title={t("ui.lockAspect")}
                      className={`mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
                        s.lock ? "border-t-primary bg-bg-secondary text-t-primary" : "border-border text-t-tertiary hover:text-t-primary"
                      }`}
                    >
                      {s.lock ? <Link2 className="h-4 w-4" aria-hidden="true" /> : <Link2Off className="h-4 w-4" aria-hidden="true" />}
                    </button>
                    <label className="block flex-1">
                      <span className="mb-1.5 block text-[13px] text-t-secondary">{t("resimg.heightPx")}</span>
                      <input type="number" inputMode="numeric" min={1} max={MAX_SIDE} value={s.h || ""} onChange={(e) => setH(Number(e.target.value))} className={inputCls} />
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {first?.width && first.height && (
                      <button
                        type="button"
                        onClick={() => setS((p) => ({ ...p, w: first.width!, h: first.height!, ratio: first.width! / first.height! }))}
                        className={chipCls(s.w === first.width && s.h === first.height)}
                      >
                        {t("ui.original")}
                      </button>
                    )}
                    {BOX_PRESETS.map((p) => (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => setS((prev) => ({ ...prev, w: p.w, h: p.h, ratio: p.w / p.h, lock: true }))}
                        className={chipCls(s.w === p.w && s.h === p.h)}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <p className="text-[13px] text-t-secondary">{t("resize.ui.fitTitle")}</p>
                    <div className="grid grid-cols-2 gap-1.5" role="radiogroup" aria-label={t("resize.ui.fitTitle")}>
                      {(
                        [
                          { v: "contain", label: t("resize.ui.contain"), desc: t("resize.v2.containDesc") },
                          { v: "pad", label: t("resize.v2.pad"), desc: t("resize.v2.padDesc") },
                          { v: "cover", label: t("resize.ui.cover"), desc: t("resize.v2.coverDesc") },
                          { v: "stretch", label: t("resize.ui.stretch"), desc: t("resize.v2.stretchDesc") },
                        ] as { v: Fit; label: string; desc: string }[]
                      ).map((o) => (
                        <button
                          key={o.v}
                          type="button"
                          role="radio"
                          aria-checked={s.fit === o.v}
                          onClick={() => set("fit", o.v)}
                          className={`rounded-xl border p-2.5 text-start transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt ${
                            s.fit === o.v ? "border-t-primary bg-bg-secondary" : "border-border hover:bg-bg-secondary"
                          }`}
                        >
                          <span className="flex items-center gap-1.5 text-[13.5px] font-medium text-t-primary">
                            <Square className="h-3.5 w-3.5 text-t-tertiary" aria-hidden="true" />
                            {o.label}
                          </span>
                          <span className="mt-0.5 block text-[11.5px] leading-snug text-t-tertiary">{o.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <Toggle checked={s.noEnlarge} onChange={(v) => set("noEnlarge", v)} label={t("resize.v2.noEnlarge")} description={t("resize.v2.noEnlargeDesc")} />
            </div>

            <div className="glass space-y-5 p-5">
              <div className="space-y-2">
                <p className={sectionTitle}>{t("compimg.format")}</p>
                <Segmented
                  label={t("compimg.format")}
                  size="sm"
                  value={s.format}
                  onChange={(v) => set("format", v)}
                  options={[
                    { value: "keep", label: t("compimg.keepFormat") },
                    { value: "image/jpeg", label: "JPG" },
                    { value: "image/webp", label: "WebP" },
                    { value: "image/png", label: "PNG" },
                  ]}
                />
              </div>
              {anyLossy && (
                <Slider
                  label={t("ui.quality")}
                  value={Math.round(s.quality * 100)}
                  min={40}
                  max={100}
                  onChange={(v) => set("quality", v / 100)}
                  display={`${Math.round(s.quality * 100)}`}
                  hints={[t("compimg.smaller"), t("compimg.higher")]}
                />
              )}
              {showBackground && (
                <BackgroundPicker
                  value={s.background}
                  onChange={(v) => set("background", v)}
                  allowTransparent={allowTransparent}
                  label={isPad ? t("resize.ui.background") : t("convimg.v2.background")}
                  hint={isPad ? undefined : t("resize.v2.jpegAlphaHint")}
                />
              )}
            </div>

            <div className="glass space-y-3 p-5">
              {running && <BatchProgress done={done.length} total={ready.length} label={t("resimg.resizing")} />}
              {allDone ? (
                <button type="button" onClick={downloadAll} disabled={zipping} className={`${buttonPrimary} w-full`}>
                  {zipping ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                  {done.length > 1 ? t("ui.downloadZip") : t("resimg.download")}
                </button>
              ) : running ? (
                <button type="button" onClick={cancel} className={`${buttonSecondary} w-full`}>
                  {t("imgkit.cancel")}
                </button>
              ) : (
                <button type="button" onClick={resizeAll} disabled={!valid || ready.length === 0} className={`${buttonPrimary} w-full`}>
                  {ready.length > 1 ? t("resize.v2.resizeN", { n: ready.length }) : selPlan ? t("resimg.button", { w: selPlan.w, h: selPlan.h }) : t("resimg.resizing")}
                </button>
              )}
              {allDone && (
                <p className="text-center text-[12.5px] tabular-nums text-t-tertiary">
                  {formatFileSize(done.reduce((a, i) => a + i.file.size, 0))} → {formatFileSize(done.reduce((a, i) => a + (i.result?.blob.size ?? 0), 0))}
                </p>
              )}
              <button type="button" onClick={reset} className={`${buttonSecondary} w-full`}>
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                {t("resimg.another")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
