"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertCircle,
  Check,
  Download,
  FlipHorizontal2,
  FlipVertical2,
  ImagePlus,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  Undo2,
  X,
} from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { Segmented, Slider, Toggle, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { AbortError, processImage, type ImageJob, type OutputFormat } from "@/lib/image-engine";
import {
  ctx2d,
  decodeOnMain,
  formatLabel,
  inscribedScale,
  keepFormatFor,
  kindOf,
  makeCanvas,
  outputName,
  rotatedBox,
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

type FormatChoice = "keep" | OutputFormat;

interface Settings {
  quarter: number; // 0–3 clockwise quarter turns
  fine: number; // straighten, −45…45
  flipH: boolean;
  flipV: boolean;
  autoCrop: boolean;
  format: FormatChoice;
  quality: number;
  background: string;
}

const DEFAULTS: Settings = {
  quarter: 0,
  fine: 0,
  flipH: false,
  flipV: false,
  autoCrop: true,
  format: "keep",
  quality: 0.95,
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

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Output size for a w×h source under the current transform. */
function outSize(w: number, h: number, s: Settings) {
  const odd = s.quarter % 2 === 1;
  const wq = odd ? h : w;
  const hq = odd ? w : h;
  if (s.fine === 0) return { w: wq, h: hq };
  if (s.autoCrop) {
    const k = inscribedScale(wq, hq, s.fine);
    return { w: Math.max(1, Math.floor(wq * k) - 2), h: Math.max(1, Math.floor(hq * k) - 2) };
  }
  return rotatedBox(w, h, s.quarter * 90 + s.fine);
}

/** Rotate + straighten + crop to the inscribed rectangle in one GPU draw; the engine then encodes. */
async function straightenedSource(file: Blob, s: Settings): Promise<ImageBitmap> {
  const bmp = await decodeOnMain(file);
  try {
    const size = outSize(bmp.width, bmp.height, s);
    const canvas = makeCanvas(size.w, size.h);
    const ctx = ctx2d(canvas);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(((s.quarter * 90 + s.fine) * Math.PI) / 180);
    ctx.scale(s.flipH ? -1 : 1, s.flipV ? -1 : 1);
    ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
    return "transferToImageBitmap" in canvas ? canvas.transferToImageBitmap() : await createImageBitmap(canvas);
  } finally {
    bmp.close();
  }
}

export default function RotateImagePage() {
  const { t } = useI18n();
  const { items, itemsRef, update, add, remove, clear, setItems } = useImageItems(1024);
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [animate, setAnimate] = useState(false);
  const [straightening, setStraightening] = useState(false);
  const [fineText, setFineText] = useState("0");
  /** Unwrapped quarter turns, so the preview always animates the short way round. */
  const [spin, setSpin] = useState(0);
  const runRef = useRef<AbortController | null>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const [frameRef, frameWidth] = useElementWidth();
  const maxH = useMaxPreviewHeight(0.55, 480);

  const set = <K extends keyof Settings>(key: K, value: Settings[K], anim = false) => {
    setAnimate(anim);
    setS((p) => ({ ...p, [key]: value }));
  };
  const setFine = (v: number) => {
    const n = round1(Math.max(-45, Math.min(45, v)));
    setAnimate(false);
    setS((p) => ({ ...p, fine: n }));
    setFineText(String(n));
  };

  const corners = s.fine !== 0 && !s.autoCrop;
  const formatFor = useCallback(
    (item: ImageItem): OutputFormat => (s.format === "keep" ? keepFormatFor(item.file, item.alpha) : s.format),
    [s.format],
  );
  /** Colour behind transparent pixels / empty corners, or null for transparent. Used by preview and export alike. */
  const fillFor = useCallback(
    (format: OutputFormat): string | null => {
      if (format === "image/jpeg") return s.background === "transparent" ? "#ffffff" : s.background;
      if (corners) return s.background === "transparent" ? null : s.background;
      return null;
    },
    [s.background, corners],
  );

  // Any change invalidates finished results.
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
    setS(DEFAULTS);
    setFineText("0");
    setSpin(0);
  };

  const exportAll = async () => {
    const todo = itemsRef.current.filter((i) => i.width && !i.unreadable && !i.result);
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
        const fill = fillFor(format) ?? undefined;
        try {
          let job: ImageJob;
          const encode = { format, quality: settings.quality };
          if (settings.fine !== 0 && settings.autoCrop) {
            const input = (await straightenedSource(item.mainDecode ? await jobInput(item) : item.file, settings)) as unknown as Blob;
            job = { input, transform: { background: fill }, encode };
          } else {
            job = {
              input: await jobInput(item),
              transform: { rotate: settings.quarter * 90 + settings.fine, flipH: settings.flipH, flipV: settings.flipV, background: fill },
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
    if (failed) toast.error(t("ui.failedExport"));
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
  const changed = s.quarter !== 0 || s.fine !== 0 || s.flipH || s.flipV;

  const names = useMemo(() => {
    const name = uniqueNamer();
    const map = new Map<string, string>();
    for (const i of items) if (i.result) map.set(i.id, name(outputName(i.file, "-rotated", i.result.format)));
    return map;
  }, [items]);

  const downloadAll = async () => {
    if (done.length === 1) return downloadBlob(done[0].result!.blob, names.get(done[0].id)!);
    setZipping(true);
    try {
      downloadBlob(await zipFiles(done.map((i) => ({ name: names.get(i.id)!, blob: i.result!.blob }))), "rotated-images.zip");
    } finally {
      setZipping(false);
    }
  };

  const anyLossy = ready.some((i) => formatFor(i) !== "image/png");
  const anyJpeg = ready.some((i) => formatFor(i) === "image/jpeg");
  const showBackground = corners || ready.some((i) => i.alpha && formatFor(i) === "image/jpeg");
  const allowTransparent = !anyJpeg;

  // ── Preview (CSS transform on a downscaled proxy) ──────────────────────
  const preview = (() => {
    if (!selected?.thumb || !selected.width || !selected.height) return null;
    const out = outSize(selected.width, selected.height, s);
    const box = fitSize(out.w, out.h, Math.max(0, frameWidth), maxH);
    const k = box.w / out.w;
    const fill = fillFor(formatFor(selected));
    const showGrid = straightening || s.fine !== 0;
    return (
      <div className="flex justify-center">
        <div
          className="relative flex items-center justify-center overflow-hidden rounded-lg border border-border"
          style={{ width: box.w, height: box.h, ...(fill ? { backgroundColor: fill } : CHECKER_STYLE) }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selected.thumb}
            alt={t("crop.ui.sourceAlt")}
            draggable={false}
            className={`max-w-none shrink-0 select-none ${animate ? "transition-transform duration-300 ease-out" : ""}`}
            style={{
              width: selected.width * k,
              height: selected.height * k,
              transform: `rotate(${spin * 90 + s.fine}deg) scale(${s.flipH ? -1 : 1}, ${s.flipV ? -1 : 1})`,
            }}
          />
          {showGrid && (
            <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
              {[1, 2, 3, 4, 5].map((n) => (
                <g key={n} stroke="rgba(255,255,255,0.75)" strokeWidth={n === 3 ? 1.25 : 0.75} style={{ mixBlendMode: "difference" }}>
                  <line x1={`${(n / 6) * 100}%`} x2={`${(n / 6) * 100}%`} y1="0" y2="100%" />
                  <line y1={`${(n / 6) * 100}%`} y2={`${(n / 6) * 100}%`} x1="0" x2="100%" />
                </g>
              ))}
            </svg>
          )}
        </div>
      </div>
    );
  })();

  const iconBtn =
    "flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[12px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt";

  return (
    <ToolLayout
      toolName="Rotate Image"
      toolDescription="Rotate by any angle, flip, and export as JPG, PNG, or WebP. Batch supported."
    >
      {items.length === 0 ? (
        <FileDropzone
          onFilesSelected={addFiles}
          accept={ACCEPT}
          multiple
          formats={["JPG", "PNG", "WEBP", "AVIF", "GIF", "BMP"]}
          label={t("rotateimg.ui.dropLabel")}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="min-w-0 space-y-4">
            {selected && (
              <div className="glass space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-[14px] font-semibold text-t-primary">{selected.file.name}</p>
                  {selected.width && selected.height && (
                    <p className="text-[13px] tabular-nums text-t-secondary">
                      {selected.width}×{selected.height} →{" "}
                      <span className="font-semibold text-t-primary">
                        {outSize(selected.width, selected.height, s).w}×{outSize(selected.width, selected.height, s).h}
                      </span>
                    </p>
                  )}
                </div>
                <div ref={frameRef} className="w-full">
                  {preview ?? <div className="h-56 animate-pulse rounded-lg bg-bg-secondary" />}
                </div>
                {items.length > 1 && <p className="text-[12.5px] text-t-tertiary">{t("rotate.v2.batchNote", { n: items.length })}</p>}
              </div>
            )}

            <div className="glass p-2">
              <ul className="divide-y divide-border">
                {items.map((item) => {
                  const out = item.width && item.height ? outSize(item.width, item.height, s) : null;
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
                              ) : out ? (
                                <>
                                  {item.width}×{item.height} → <span className="text-t-secondary">{out.w}×{out.h}</span>
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
                            <Loader2 className="h-4 w-4 animate-spin text-t-tertiary" aria-label={t("rotateimg.ui.preparing")} />
                          ) : item.status === "error" ? (
                            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" aria-label={t("ui.failedExport")} />
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
                          disabled={running}
                          onClick={() => {
                            remove(item.id);
                            if (selectedId === item.id) setSelectedId(null);
                          }}
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
                disabled={running}
                onClick={() => addInputRef.current?.click()}
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
                <p className={sectionTitle}>{t("rotimg.transform")}</p>
                <div className="grid grid-cols-4 gap-1.5">
                  <button type="button" onClick={() => {
                      setSpin((n) => n - 1);
                      set("quarter", (s.quarter + 3) % 4, true);
                    }} className={`${iconBtn} border-border text-t-secondary hover:bg-bg-secondary hover:text-t-primary`}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    {t("rotate.v2.left")}
                  </button>
                  <button type="button" onClick={() => {
                      setSpin((n) => n + 1);
                      set("quarter", (s.quarter + 1) % 4, true);
                    }} className={`${iconBtn} border-border text-t-secondary hover:bg-bg-secondary hover:text-t-primary`}>
                    <RotateCw className="h-4 w-4" aria-hidden="true" />
                    {t("rotate.v2.right")}
                  </button>
                  <button
                    type="button"
                    aria-pressed={s.flipH}
                    onClick={() => set("flipH", !s.flipH, true)}
                    className={`${iconBtn} ${s.flipH ? "border-t-primary bg-bg-secondary text-t-primary" : "border-border text-t-secondary hover:bg-bg-secondary hover:text-t-primary"}`}
                  >
                    <FlipHorizontal2 className="h-4 w-4" aria-hidden="true" />
                    {t("rotimg.flipH")}
                  </button>
                  <button
                    type="button"
                    aria-pressed={s.flipV}
                    onClick={() => set("flipV", !s.flipV, true)}
                    className={`${iconBtn} ${s.flipV ? "border-t-primary bg-bg-secondary text-t-primary" : "border-border text-t-secondary hover:bg-bg-secondary hover:text-t-primary"}`}
                  >
                    <FlipVertical2 className="h-4 w-4" aria-hidden="true" />
                    {t("rotimg.flipV")}
                  </button>
                </div>
              </div>

              <div
                className="space-y-2"
                onPointerDown={() => setStraightening(true)}
                onPointerUp={() => setStraightening(false)}
                onPointerCancel={() => setStraightening(false)}
                onPointerLeave={() => setStraightening(false)}
              >
                <Slider
                  label={t("rotate.v2.straighten")}
                  value={s.fine}
                  min={-45}
                  max={45}
                  step={0.1}
                  onChange={setFine}
                  display={`${s.fine > 0 ? "+" : ""}${s.fine.toFixed(1)}°`}
                  hints={["−45°", "+45°"]}
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFine(s.fine - 0.1)}
                    aria-label={t("rotate.v2.minus")}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-t-secondary hover:bg-bg-secondary hover:text-t-primary"
                  >
                    <Minus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <input
                    type="number"
                    inputMode="decimal"
                    step={0.1}
                    min={-45}
                    max={45}
                    value={fineText}
                    aria-label={t("rotate.v2.straighten")}
                    onChange={(e) => {
                      setFineText(e.target.value);
                      const n = Number(e.target.value);
                      if (e.target.value.trim() !== "" && Number.isFinite(n)) {
                        setAnimate(false);
                        setS((p) => ({ ...p, fine: round1(Math.max(-45, Math.min(45, n))) }));
                      }
                    }}
                    onBlur={() => setFineText(String(s.fine))}
                    className="h-9 w-20 rounded-lg border border-border bg-bg-secondary px-2 text-center text-[14px] tabular-nums text-t-primary focus:border-t-primary/40 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setFine(s.fine + 0.1)}
                    aria-label={t("rotate.v2.plus")}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-t-secondary hover:bg-bg-secondary hover:text-t-primary"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAnimate(true);
                      setS((p) => ({ ...DEFAULTS, format: p.format, quality: p.quality, background: p.background, autoCrop: p.autoCrop }));
                      setFineText("0");
                      setSpin(0);
                    }}
                    disabled={!changed}
                    className="ms-auto inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-t-secondary hover:bg-bg-secondary hover:text-t-primary disabled:opacity-40"
                  >
                    <Undo2 className="h-4 w-4" aria-hidden="true" />
                    {t("ui.reset")}
                  </button>
                </div>
              </div>

              <Toggle
                checked={s.autoCrop}
                onChange={(v) => set("autoCrop", v)}
                disabled={s.fine === 0}
                label={t("rotate.v2.autoCrop")}
                description={t("rotate.v2.autoCropDesc")}
              />
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
                {s.format === "keep" && ready.some((i) => !["jpg", "png", "webp"].includes(kindOf(i.file))) && (
                  <p className="text-[12.5px] text-t-tertiary">{t("rotate.v2.keepPngNote")}</p>
                )}
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
                  label={t("rotateimg.ui.background")}
                  hint={corners ? t("rotate.v2.cornersHint") : t("resize.v2.jpegAlphaHint")}
                />
              )}
            </div>

            <div className="glass space-y-3 p-5">
              {running && <BatchProgress done={done.length} total={ready.length} label={t("rotateimg.ui.preparing")} />}
              {allDone ? (
                <button type="button" onClick={downloadAll} disabled={zipping} className={`${buttonPrimary} w-full`}>
                  {zipping ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                  {done.length > 1 ? t("ui.downloadZip") : t("ui.download")}
                </button>
              ) : running ? (
                <button type="button" onClick={cancel} className={`${buttonSecondary} w-full`}>
                  {t("imgkit.cancel")}
                </button>
              ) : (
                <button type="button" onClick={exportAll} disabled={!changed || ready.length === 0} className={`${buttonPrimary} w-full`}>
                  {ready.length > 1 ? t("rotate.v2.applyN", { n: ready.length }) : t("rotate.v2.apply")}
                </button>
              )}
              {!changed && !allDone && <p className="text-center text-[12.5px] text-t-tertiary">{t("rotate.v2.nothing")}</p>}
              <button type="button" onClick={reset} className={`${buttonSecondary} w-full`}>
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                {t("rotateimg.ui.another")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
