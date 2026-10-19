"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Download, Eye, ImagePlus, Loader2, RotateCcw, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { AbortError, extensionFor } from "@/lib/image-engine";
import {
  ctx2d,
  decodeImage,
  encodeBitmap,
  makeCanvas,
  makeProxy,
  nextFrame,
  proxyLongSide,
  releaseCanvas,
  resolveFormat,
  type DecodedImage,
  type FormatChoice,
} from "@/lib/image-editor-kit";
import { ExportFormatPicker, formatLabel } from "@/lib/image-editor-kit-ui";
import { downloadBlob, formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import {
  ADJUST_KEYS,
  PRESETS,
  ZERO_ADJUST,
  isIdentity,
  processAll,
  processSteps,
  type Adjust,
  type FilterSettings,
  type PresetKey,
} from "./pipeline";

const PRESET_NAME: Record<PresetKey, string> = {
  original: "photofilter.filter.original",
  grayscale: "photofilter.filter.grayscale",
  sepia: "photofilter.filter.sepia",
  vintage: "photofilter.filter.vintage",
  bright: "photofilter.filter.bright",
  contrast: "photofilter.filter.contrast",
  warm: "photofilter.filter.warm",
  cold: "photofilter.filter.cold",
  fade: "photofilter.filter.fade",
  saturate: "photofilter.filter.saturate",
  invert: "photofilter.filter.invert",
  blur: "photofilter.filter.blur",
};

const ADJUST_NAME: Record<keyof Adjust, string> = {
  exposure: "pf.v2.exposure",
  contrast: "pf.v2.contrast",
  highlights: "pf.v2.highlights",
  shadows: "pf.v2.shadows",
  saturation: "pf.v2.saturation",
  warmth: "pf.v2.warmth",
  tint: "pf.v2.tint",
  vignette: "pf.v2.vignette",
  sharpen: "pf.v2.sharpen",
};

const GROUPS: { titleKey: string; keys: (keyof Adjust)[] }[] = [
  { titleKey: "pf.v2.groupLight", keys: ["exposure", "contrast", "highlights", "shadows"] },
  { titleKey: "pf.v2.groupColor", keys: ["saturation", "warmth", "tint"] },
  { titleKey: "pf.v2.groupDetail", keys: ["vignette", "sharpen"] },
];

const UNSIGNED: (keyof Adjust)[] = ["vignette", "sharpen"];
const ACCEPT_TYPES = ["image/jpeg", "image/png", "image/webp"];

// ─── Full-resolution export (worker when OffscreenCanvas works there) ─────────

let workerOffscreen: Promise<boolean> | null = null;

function newWorker() {
  return new Worker(new URL("./filter.worker.ts", import.meta.url), { type: "module" });
}

function canUseWorker(): Promise<boolean> {
  if (!workerOffscreen) {
    workerOffscreen = new Promise<boolean>((resolve) => {
      if (typeof Worker === "undefined") return resolve(false);
      let w: Worker;
      try {
        w = newWorker();
      } catch {
        return resolve(false);
      }
      const timer = setTimeout(() => {
        w.terminate();
        resolve(false);
      }, 5000);
      w.onmessage = (e) => {
        clearTimeout(timer);
        w.terminate();
        resolve(!!e.data?.offscreen);
      };
      w.onerror = () => {
        clearTimeout(timer);
        w.terminate();
        resolve(false);
      };
      w.postMessage({ op: "ping" });
    });
  }
  return workerOffscreen;
}

function renderInWorker(
  bitmap: ImageBitmap,
  settings: FilterSettings,
  onProgress: (p: number) => void,
  signal: AbortSignal,
): Promise<ImageBitmap> {
  return new Promise((resolve, reject) => {
    const w = newWorker();
    const stop = () => {
      w.terminate();
      reject(new AbortError());
    };
    signal.addEventListener("abort", stop, { once: true });
    w.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === "progress") onProgress(msg.progress);
      else if (msg.type === "done") {
        signal.removeEventListener("abort", stop);
        w.terminate();
        resolve(msg.bitmap as ImageBitmap);
      } else if (msg.type === "error") {
        signal.removeEventListener("abort", stop);
        w.terminate();
        reject(new Error(msg.error));
      }
    };
    w.onerror = (e) => {
      e.preventDefault();
      signal.removeEventListener("abort", stop);
      w.terminate();
      reject(new Error(e.message || "Worker failed"));
    };
    w.postMessage({ op: "run", bitmap, settings }, [bitmap]);
  });
}

async function renderOnMain(
  bitmap: ImageBitmap,
  settings: FilterSettings,
  onProgress: (p: number) => void,
  signal: AbortSignal,
): Promise<ImageBitmap> {
  const canvas = makeCanvas(bitmap.width, bitmap.height);
  try {
    const ctx = ctx2d(canvas, { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let t0 = performance.now();
    const steps = processSteps(img.data, canvas.width, canvas.height, settings);
    for (let step = steps.next(); !step.done; step = steps.next()) {
      const p = step.value;
      if (performance.now() - t0 > 40) {
        onProgress(p);
        await nextFrame();
        if (signal.aborted) throw new AbortError();
        t0 = performance.now();
      }
    }
    ctx.putImageData(img, 0, 0);
    return await createImageBitmap(canvas);
  } finally {
    releaseCanvas(canvas);
  }
}

// ─── Small controls ───────────────────────────────────────────────────────────

function AdjustSlider({
  label,
  value,
  min,
  onChange,
  resetLabel,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (v: number) => void;
  resetLabel: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-[13px] text-t-secondary">
        <span>{label}</span>
        <span className="flex items-center gap-1">
          <span className="tabular-nums font-medium text-t-primary">
            {value > 0 && min < 0 ? `+${value}` : value}
          </span>
          <button
            type="button"
            onClick={() => onChange(0)}
            disabled={value === 0}
            aria-label={resetLabel}
            title={resetLabel}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-t-tertiary transition hover:bg-bg-secondary hover:text-t-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-volt disabled:invisible"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={100}
        step={1}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        onDoubleClick={() => onChange(0)}
        className="w-full accent-accent"
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Loaded {
  file: File;
  decoded: DecodedImage;
  proxy: ImageBitmap;
  original: ImageData;
}

export default function PhotoFilterPage() {
  const { t } = useI18n();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(false);
  const [preset, setPreset] = useState<PresetKey>("original");
  const [intensity, setIntensity] = useState(100);
  const [adjust, setAdjust] = useState<Adjust>(ZERO_ADJUST);
  const [holding, setHolding] = useState(false);
  const [thumbs, setThumbs] = useState<Partial<Record<PresetKey, string>>>({});
  const [format, setFormat] = useState<FormatChoice>("original");
  const [quality, setQuality] = useState(0.9);
  const [exportProgress, setExportProgress] = useState<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const loadRunRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const frameRef = useRef<number | null>(null);
  const workRef = useRef<ImageData | null>(null);

  const settings: FilterSettings = { preset, intensity, adjust };
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const holdingRef = useRef(holding);
  holdingRef.current = holding;
  const loadedRef = useRef(loaded);
  loadedRef.current = loaded;

  // Free bitmaps when replaced or on unmount.
  useEffect(() => {
    return () => {
      loaded?.decoded.bitmap.close();
      loaded?.proxy.close();
    };
  }, [loaded]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const handleFiles = useCallback(
    async (files: File[]) => {
      const f = files[0];
      if (!f) return;
      const run = ++loadRunRef.current;
      abortRef.current?.abort();
      setLoading(true);
      setThumbs({});
      try {
        const decoded = await decodeImage(f);
        const proxy = await makeProxy(decoded.bitmap, proxyLongSide(1600));
        const c = makeCanvas(proxy.width, proxy.height);
        const ctx = ctx2d(c, { willReadFrequently: true });
        ctx.drawImage(proxy, 0, 0);
        const original = ctx.getImageData(0, 0, c.width, c.height);
        releaseCanvas(c);
        if (run !== loadRunRef.current) {
          decoded.bitmap.close();
          proxy.close();
          return;
        }
        workRef.current = new ImageData(proxy.width, proxy.height);
        setPreset("original");
        setIntensity(100);
        setAdjust(ZERO_ADJUST);
        setLoaded({ file: f, decoded, proxy, original });
      } catch {
        if (run === loadRunRef.current) toast.error(t("ui.failedLoad"));
      } finally {
        if (run === loadRunRef.current) setLoading(false);
      }
    },
    [t],
  );

  // ── Real-time preview on the proxy, coalesced to one render per frame ──
  const paint = useCallback(() => {
    frameRef.current = null;
    const l = loadedRef.current;
    const canvas = canvasRef.current;
    const work = workRef.current;
    if (!l || !canvas || !work) return;
    if (canvas.width !== l.original.width || canvas.height !== l.original.height) {
      canvas.width = l.original.width;
      canvas.height = l.original.height;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (holdingRef.current || isIdentity(settingsRef.current)) {
      ctx.putImageData(l.original, 0, 0);
      return;
    }
    work.data.set(l.original.data);
    processAll(work.data, work.width, work.height, settingsRef.current);
    ctx.putImageData(work, 0, 0);
  }, []);

  const schedulePaint = useCallback(() => {
    if (frameRef.current == null) frameRef.current = requestAnimationFrame(paint);
  }, [paint]);

  useEffect(() => {
    schedulePaint();
  }, [loaded, preset, intensity, adjust, holding, schedulePaint]);

  useEffect(
    () => () => {
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  // ── Preset thumbnails from a small centre crop, built a few per frame ──
  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    (async () => {
      const size = 112;
      const side = Math.min(loaded.proxy.width, loaded.proxy.height);
      const base = makeCanvas(size, size);
      const bctx = ctx2d(base, { willReadFrequently: true });
      bctx.drawImage(
        loaded.proxy,
        (loaded.proxy.width - side) / 2,
        (loaded.proxy.height - side) / 2,
        side,
        side,
        0,
        0,
        size,
        size,
      );
      const src = bctx.getImageData(0, 0, size, size);
      const out = makeCanvas(size, size);
      const octx = ctx2d(out);
      for (const key of PRESETS) {
        if (cancelled) break;
        const img = new ImageData(new Uint8ClampedArray(src.data), size, size);
        processAll(img.data, size, size, { preset: key, intensity: key === "blur" ? 40 : 100, adjust: ZERO_ADJUST });
        octx.putImageData(img, 0, 0);
        const url = out.toDataURL("image/jpeg", 0.82); // 112 px thumbnail only
        setThumbs((prev) => ({ ...prev, [key]: url }));
        await nextFrame();
      }
      releaseCanvas(base);
      releaseCanvas(out);
    })();
    return () => {
      cancelled = true;
    };
  }, [loaded]);

  const setAdj = (key: keyof Adjust, v: number) => setAdjust((a) => ({ ...a, [key]: v }));
  const adjustDirty = ADJUST_KEYS.some((k) => adjust[k] !== 0);
  const anyChange = !isIdentity(settings);

  const exportImage = async () => {
    if (!loaded) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const snapshot: FilterSettings = { preset, intensity, adjust: { ...adjust } };
    const outType = resolveFormat(loaded.file.type, format);
    setExportProgress(0);
    try {
      const copy = await createImageBitmap(loaded.decoded.bitmap);
      let rendered: ImageBitmap;
      if (isIdentity(snapshot)) rendered = copy;
      else {
        const onProgress = (p: number) => {
          if (!ac.signal.aborted) setExportProgress(Math.min(0.9, p * 0.9));
        };
        rendered = (await canUseWorker())
          ? await renderInWorker(copy, snapshot, onProgress, ac.signal)
          : await renderOnMain(copy, snapshot, onProgress, ac.signal);
      }
      if (ac.signal.aborted) {
        rendered.close();
        throw new AbortError();
      }
      setExportProgress(0.92);
      const blob = await encodeBitmap(rendered, outType, quality, ac.signal);
      if (ac.signal.aborted) throw new AbortError();
      downloadBlob(blob, `${getFileNameWithoutExtension(loaded.file.name)}-filtered.${extensionFor(outType)}`);
      toast.success(t("photofilter.downloaded"));
    } catch (err) {
      if (!(err instanceof AbortError) && !ac.signal.aborted) {
        console.error(err);
        toast.error(t("photofilter.exportFail"));
      }
    } finally {
      if (abortRef.current === ac) {
        abortRef.current = null;
        setExportProgress(null);
      }
    }
  };

  const cancelExport = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setExportProgress(null);
  };

  const changeImage = () => {
    cancelExport();
    loadRunRef.current++;
    setLoaded(null);
    setLoading(false);
    setThumbs({});
  };

  const holdOn = () => setHolding(true);
  const holdOff = () => setHolding(false);

  return (
    <ToolLayout toolName={t("tool.photo-filter.name")} toolDescription={t("tool.photo-filter.desc")}>
      <div className="space-y-6">
        {!loaded ? (
          loading ? (
            <div className="glass flex h-64 items-center justify-center gap-2 text-[14px] text-t-secondary" role="status">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              {t("ui.loading")}
            </div>
          ) : (
            <FileDropzone
              onFilesSelected={handleFiles}
              accept={{
                "image/jpeg": [".jpg", ".jpeg"],
                "image/png": [".png"],
                "image/webp": [".webp"],
              }}
              multiple={false}
              label={t("tool.dropLabel")}
              formats={["jpg", "png", "webp"]}
            />
          )
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            {/* Preview */}
            <div className="space-y-3 lg:sticky lg:top-20">
              <div className="glass space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-[13px] text-t-secondary">
                    <span className="font-medium text-t-primary">{loaded.file.name}</span> ·{" "}
                    {loaded.decoded.naturalWidth}×{loaded.decoded.naturalHeight} · {formatFileSize(loaded.file.size)}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onPointerDown={(e) => {
                        e.currentTarget.setPointerCapture(e.pointerId);
                        holdOn();
                      }}
                      onPointerUp={holdOff}
                      onPointerCancel={holdOff}
                      onLostPointerCapture={holdOff}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          holdOn();
                        }
                      }}
                      onKeyUp={holdOff}
                      onBlur={holdOff}
                      onContextMenu={(e) => e.preventDefault()}
                      disabled={!anyChange}
                      aria-pressed={holding}
                      className={`${buttonSecondary} touch-none select-none`}
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                      {t("pf.v2.holdCompare")}
                    </button>
                    <button type="button" onClick={changeImage} className={buttonSecondary}>
                      <ImagePlus className="h-4 w-4" aria-hidden="true" />
                      {t("photofilter.changeImage")}
                    </button>
                  </div>
                </div>
                <div className="relative flex items-center justify-center overflow-hidden rounded-xl border border-border bg-bg-secondary">
                  <canvas
                    ref={canvasRef}
                    className="block h-auto max-h-[min(70vh,640px)] w-auto max-w-full"
                    aria-label={t("photofilter.altSource")}
                    role="img"
                  />
                  {holding && (
                    <span className="pointer-events-none absolute start-3 top-3 rounded-md bg-black/60 px-2 py-1 text-[12px] font-medium text-white">
                      {t("ui.original")}
                    </span>
                  )}
                </div>
                {loaded.decoded.capped && (
                  <p className="text-[12px] text-t-tertiary">
                    {t("imgedit.v2.cappedNote", { w: loaded.decoded.width, h: loaded.decoded.height })}
                  </p>
                )}
              </div>

              {/* Preset strip */}
              <div className="glass space-y-3 p-4">
                <p className={sectionTitle}>{t("photofilter.filtersHeading")}</p>
                <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="radiogroup" aria-label={t("photofilter.filtersHeading")}>
                  {PRESETS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={preset === key}
                      onClick={() => {
                        setPreset(key);
                        if (key !== preset) setIntensity(key === "blur" ? 30 : 100);
                      }}
                      className={`w-[76px] shrink-0 rounded-xl p-1 text-center transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-volt ${
                        preset === key ? "bg-accent/10 ring-2 ring-accent" : "hover:bg-bg-secondary"
                      }`}
                    >
                      <span className="block aspect-square w-full overflow-hidden rounded-lg bg-bg-tertiary">
                        {thumbs[key] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumbs[key]} alt="" className="h-full w-full object-cover" draggable={false} />
                        )}
                      </span>
                      <span className="mt-1 block truncate text-[12px] font-medium text-t-primary">{t(PRESET_NAME[key])}</span>
                    </button>
                  ))}
                </div>
                {preset !== "original" && (
                  <AdjustSlider
                    label={preset === "blur" ? t("pf.v2.blurStrength") : t("photofilter.intensity")}
                    value={intensity}
                    min={0}
                    onChange={setIntensity}
                    resetLabel={t("pf.v2.resetValue", { name: preset === "blur" ? t("pf.v2.blurStrength") : t("photofilter.intensity") })}
                  />
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="space-y-4">
              <div className="glass space-y-5 p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[15px] font-semibold text-t-primary">{t("pf.v2.adjust")}</p>
                  <button
                    type="button"
                    onClick={() => setAdjust(ZERO_ADJUST)}
                    disabled={!adjustDirty}
                    className="rounded-lg px-2.5 py-2 text-[13px] font-medium text-t-secondary transition hover:bg-bg-secondary hover:text-t-primary disabled:opacity-40"
                  >
                    {t("pf.v2.resetAll")}
                  </button>
                </div>
                {GROUPS.map((g) => (
                  <div key={g.titleKey} className="space-y-2">
                    <p className={sectionTitle}>{t(g.titleKey)}</p>
                    {g.keys.map((k) => (
                      <AdjustSlider
                        key={k}
                        label={t(ADJUST_NAME[k])}
                        value={adjust[k]}
                        min={UNSIGNED.includes(k) ? 0 : -100}
                        onChange={(v) => setAdj(k, v)}
                        resetLabel={t("pf.v2.resetValue", { name: t(ADJUST_NAME[k]) })}
                      />
                    ))}
                  </div>
                ))}
              </div>

              <div className="glass space-y-4 p-5">
                <ExportFormatPicker
                  value={format}
                  onChange={setFormat}
                  quality={quality}
                  onQualityChange={setQuality}
                  sourceType={ACCEPT_TYPES.includes(loaded.file.type) ? loaded.file.type : "image/png"}
                />
                {exportProgress == null ? (
                  <button type="button" onClick={exportImage} className={`${buttonPrimary} w-full`}>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {t("imgedit.v2.downloadAs", { format: formatLabel(resolveFormat(loaded.file.type, format)) })}
                  </button>
                ) : (
                  <div className="space-y-2" aria-live="polite">
                    <div className="flex items-center justify-between text-[13px] text-t-secondary">
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        {t("photofilter.exporting")}
                      </span>
                      <span className="tabular-nums">{Math.round(exportProgress * 100)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-bg-tertiary">
                      <div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round(exportProgress * 100)}%` }} />
                    </div>
                    <button type="button" onClick={cancelExport} className={`${buttonSecondary} w-full`}>
                      <X className="h-4 w-4" aria-hidden="true" />
                      {t("imgedit.v2.cancel")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
