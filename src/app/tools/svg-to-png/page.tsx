"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, Check, Download, Loader2, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { Segmented, Slider, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { AbortError, extensionFor, processImage, type OutputFormat } from "@/lib/image-engine";
import { MAX_CANVAS_PIXELS } from "@/lib/image-engine/core";
import { downloadBlob, formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { inspectSvg, intrinsicSize, MAX_SIDE, parseSvg, rasterizeSvg, type SvgReport } from "./svg";

type ScaleChoice = 1 | 2 | 3 | 4 | "custom";

interface Item {
  id: string;
  file: File;
  text: string;
  /** Intrinsic size in CSS px (null when the file isn't valid SVG). */
  size: { width: number; height: number } | null;
  report: SvgReport | null;
  previewUrl: string;
  status: "idle" | "working" | "done" | "error";
  result?: { blob: Blob; url: string; width: number; height: number };
}

interface Settings {
  scale: ScaleChoice;
  customWidth: number;
  transparent: boolean;
  bgColor: string;
  format: OutputFormat;
  quality: number;
}

const DEFAULTS: Settings = { scale: 2, customWidth: 1024, transparent: true, bgColor: "#ffffff", format: "image/png", quality: 0.9 };

let idCounter = 0;

function outputSize(size: { width: number; height: number }, s: Settings) {
  if (s.scale === "custom") {
    const w = Math.max(1, Math.round(s.customWidth));
    return { width: w, height: Math.max(1, Math.round((w * size.height) / size.width)) };
  }
  return { width: Math.max(1, Math.round(size.width * s.scale)), height: Math.max(1, Math.round(size.height * s.scale)) };
}

function tooBig(o: { width: number; height: number }) {
  return o.width > MAX_SIDE || o.height > MAX_SIDE || o.width * o.height > MAX_CANVAS_PIXELS;
}

export default function SvgToPngPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [zipping, setZipping] = useState(false);
  const runRef = useRef<AbortController | null>(null);
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;

  // Revoke every object URL on unmount.
  useEffect(
    () => () => {
      runRef.current?.abort();
      itemsRef.current.forEach((i) => {
        URL.revokeObjectURL(i.previewUrl);
        if (i.result) URL.revokeObjectURL(i.result.url);
      });
    },
    [],
  );

  /** Any settings change invalidates finished results so a download always matches what's shown. */
  const clearResults = useCallback(() => {
    runRef.current?.abort();
    setRunning(false);
    setItems((prev) =>
      prev.map((i) => {
        if (i.result) URL.revokeObjectURL(i.result.url);
        return i.result || i.status !== "idle" ? { ...i, result: undefined, status: "idle" } : i;
      }),
    );
  }, []);

  const change = (patch: Partial<Settings>) => {
    clearResults();
    setSettings((s) => ({ ...s, ...patch }));
  };

  const addFiles = useCallback(
    async (files: File[]) => {
      const loaded = await Promise.all(
        files.map(async (file): Promise<Item> => {
          const text = await file.text();
          const parsed = parseSvg(text);
          const size = parsed ? intrinsicSize(parsed.root) : null;
          return {
            id: `svg-${++idCounter}`,
            file,
            text,
            size: size ? { width: size.width, height: size.height } : null,
            report: parsed ? inspectSvg(parsed.root) : null,
            previewUrl: URL.createObjectURL(new Blob([text], { type: "image/svg+xml" })),
            status: "idle",
          };
        }),
      );
      const invalid = loaded.filter((i) => !i.size).length;
      if (invalid) toast.error(t("svg2png.v2.invalidCount", { count: invalid }));
      // Seed the custom width from the first file so "Custom" starts somewhere sensible.
      if (itemsRef.current.length === 0 && loaded[0]?.size) {
        const w = loaded[0].size.width;
        setSettings((s) => ({ ...s, customWidth: Math.min(MAX_SIDE, Math.round(w * 2)) }));
      }
      setItems((prev) => [...prev, ...loaded]);
      clearResults();
    },
    [t, clearResults],
  );

  const removeItem = (id: string) => {
    setItems((prev) => {
      const it = prev.find((i) => i.id === id);
      if (it) {
        URL.revokeObjectURL(it.previewUrl);
        if (it.result) URL.revokeObjectURL(it.result.url);
      }
      return prev.filter((i) => i.id !== id);
    });
  };

  const clearAll = () => {
    runRef.current?.abort();
    items.forEach((i) => {
      URL.revokeObjectURL(i.previewUrl);
      if (i.result) URL.revokeObjectURL(i.result.url);
    });
    setItems([]);
    setRunning(false);
  };

  const valid = items.filter((i) => i.size);
  const plans = useMemo(
    () => new Map(items.filter((i) => i.size).map((i) => [i.id, outputSize(i.size!, settings)])),
    [items, settings],
  );
  const oversized = valid.filter((i) => tooBig(plans.get(i.id)!));
  const convertible = valid.filter((i) => !tooBig(plans.get(i.id)!));

  const convert = async () => {
    if (!convertible.length) return;
    runRef.current?.abort();
    const run = new AbortController();
    runRef.current = run;
    setRunning(true);
    setProgress({ done: 0, total: convertible.length });
    const s = settings;
    const background = s.transparent && s.format !== "image/jpeg" ? null : s.transparent ? "#ffffff" : s.bgColor;
    let failed = 0;
    for (const item of convertible) {
      if (run.signal.aborted) break;
      const o = plans.get(item.id)!;
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "working" } : i)));
      try {
        // SVG can only be rendered on the main thread; encoding runs in the image engine.
        const canvas = await rasterizeSvg(item.text, o.width, o.height, background);
        const bitmap = await createImageBitmap(canvas);
        canvas.width = canvas.height = 0;
        const res = await processImage(
          // The engine accepts an ImageBitmap (transferred to the worker) as well as a Blob.
          { input: bitmap as unknown as Blob, encode: { format: s.format, quality: s.quality } },
          run.signal,
        );
        if (run.signal.aborted) break;
        const url = URL.createObjectURL(res.blob);
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: "done", result: { blob: res.blob, url, width: res.width, height: res.height } } : i)),
        );
      } catch (e) {
        if (e instanceof AbortError || run.signal.aborted) break;
        failed++;
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: "error" } : i)));
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }
    if (runRef.current === run) {
      setRunning(false);
      if (!run.signal.aborted) {
        if (failed) toast.error(t("svg2png.v2.failedCount", { count: failed }));
        else toast.success(t("svg2png.success"));
      }
    }
  };

  const cancel = () => {
    runRef.current?.abort();
    setRunning(false);
    setItems((prev) => prev.map((i) => (i.status === "working" ? { ...i, status: "idle" } : i)));
  };

  const ext = extensionFor(settings.format);
  const fileNameFor = (item: Item) => `${getFileNameWithoutExtension(item.file.name)}.${ext}`;
  const done = items.filter((i) => i.result);

  const downloadZip = async () => {
    setZipping(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const used = new Set<string>();
      for (const item of done) {
        let name = fileNameFor(item);
        const base = getFileNameWithoutExtension(item.file.name);
        for (let n = 2; used.has(name.toLowerCase()); n++) name = `${base}-${n}.${ext}`;
        used.add(name.toLowerCase());
        zip.file(name, item.result!.blob);
      }
      downloadBlob(await zip.generateAsync({ type: "blob" }), `svg-${ext}.zip`);
    } catch {
      toast.error(t("svg2png.fail"));
    } finally {
      setZipping(false);
    }
  };

  const formatLabel = settings.format === "image/jpeg" ? "JPG" : settings.format === "image/webp" ? "WebP" : "PNG";
  const single = items.length === 1 ? items[0] : null;

  return (
    <ToolLayout toolName="SVG to PNG" toolDescription="Convert SVG vector files to PNG with custom dimensions.">
      {items.length === 0 ? (
        <FileDropzone
          onFilesSelected={addFiles}
          accept={{ "image/svg+xml": [".svg"] }}
          multiple
          formats={["SVG"]}
          label={t("svg2png.v2.dropLabel")}
        />
      ) : (
        <div className="space-y-5">
          {/* Files */}
          <div className="glass space-y-3 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className={sectionTitle}>{t("svg2png.v2.files", { count: items.length })}</h2>
              <button type="button" onClick={clearAll} className="min-h-9 rounded-lg px-2 text-[13px] text-t-secondary hover:text-t-primary">
                {t("ui.clearAll")}
              </button>
            </div>
            <ul className="space-y-2">
              {items.map((item) => {
                const plan = plans.get(item.id);
                const big = plan ? tooBig(plan) : false;
                return (
                  <li key={item.id} className="rounded-xl border border-border bg-surface p-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border"
                        style={
                          settings.transparent && settings.format !== "image/jpeg"
                            ? { backgroundImage: "repeating-conic-gradient(rgb(var(--bg-tertiary-rgb)) 0 25%, transparent 0 50%)", backgroundSize: "12px 12px" }
                            : { background: settings.transparent ? "#ffffff" : settings.bgColor }
                        }
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.previewUrl} alt="" className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium text-t-primary">{item.file.name}</p>
                        <p className="text-[12.5px] text-t-tertiary">
                          {item.size ? (
                            <>
                              {t("svg2png.v2.intrinsic", { w: Math.round(item.size.width), h: Math.round(item.size.height) })}
                              {plan && (
                                <span className={big ? "text-red-600 dark:text-red-400" : "text-t-secondary"}>
                                  {" → "}
                                  {plan.width} × {plan.height} px
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="text-red-600 dark:text-red-400">{t("svg2png.v2.invalid")}</span>
                          )}
                        </p>
                        {item.result && (
                          <p className="text-[12.5px] text-t-secondary">
                            {formatLabel} · {formatFileSize(item.result.blob.size)}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {item.status === "working" && <Loader2 className="h-5 w-5 animate-spin text-t-tertiary" aria-label={t("ui.converting")} />}
                        {item.status === "error" && <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" aria-label={t("svg2png.fail")} />}
                        {item.result && (
                          <button
                            type="button"
                            onClick={() => downloadBlob(item.result!.blob, fileNameFor(item))}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-t-primary hover:bg-bg-secondary"
                            aria-label={t("fav.ui.downloadFile", { file: fileNameFor(item) })}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          disabled={running}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-t-tertiary hover:bg-bg-secondary hover:text-t-primary disabled:opacity-40"
                          aria-label={t("ui.remove")}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {item.report && (item.report.externalFiles.length > 0 || item.report.webFonts || item.report.fonts.length > 0) && (
                      <div className="mt-2 space-y-1 rounded-lg border border-volt/40 bg-volt/10 px-3 py-2 text-[12.5px] text-t-primary">
                        {item.report.externalFiles.length > 0 && (
                          <p className="flex gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-volt-ink" aria-hidden />
                            <span>
                              {t("svg2png.v2.externalWarn", { count: item.report.externalFiles.length, example: item.report.externalFiles[0].slice(0, 60) })}
                            </span>
                          </p>
                        )}
                        {item.report.webFonts && (
                          <p className="flex gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-volt-ink" aria-hidden />
                            <span>{t("svg2png.v2.webFontWarn")}</span>
                          </p>
                        )}
                        {!item.report.webFonts && item.report.fonts.length > 0 && (
                          <p className="flex gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-volt-ink" aria-hidden />
                            <span>{t("svg2png.v2.fontWarn", { fonts: item.report.fonts.slice(0, 3).join(", ") })}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <FileDropzone onFilesSelected={addFiles} accept={{ "image/svg+xml": [".svg"] }} multiple formats={["SVG"]} label={t("svg2png.v2.addMore")} />
          </div>

          {/* Settings */}
          <div className="glass space-y-5 rounded-2xl p-4 sm:p-5">
            <div className="space-y-2">
              <h2 className={sectionTitle}>{t("svg2png.outputSize")}</h2>
              <Segmented<ScaleChoice>
                label={t("svg2png.outputSize")}
                value={settings.scale}
                onChange={(v) => change({ scale: v })}
                options={[
                  { value: 1, label: "1×" },
                  { value: 2, label: "2×" },
                  { value: 3, label: "3×" },
                  { value: 4, label: "4×" },
                  { value: "custom", label: t("svg2png.v2.custom") },
                ]}
              />
              {settings.scale === "custom" && (
                <label className="flex max-w-xs items-center gap-3 text-[14px] text-t-secondary">
                  <span>{t("ui.width")}</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={MAX_SIDE}
                    value={settings.customWidth}
                    onChange={(e) => change({ customWidth: Math.max(1, Math.min(MAX_SIDE, Math.round(Number(e.target.value) || 1))) })}
                    className="h-10 w-28 rounded-lg border border-border bg-surface px-3 text-t-primary focus:border-accent focus:outline-none"
                  />
                  <span>px</span>
                </label>
              )}
              <p className="text-[12.5px] text-t-tertiary">
                {settings.scale === "custom" ? t("svg2png.v2.customHint") : t("svg2png.v2.scaleHint")}
              </p>
              {oversized.length > 0 && (
                <p className="flex gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-[13px] text-red-700 dark:text-red-400" role="alert">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {t("svg2png.v2.tooBig", { max: MAX_SIDE, count: oversized.length })}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <h2 className={sectionTitle}>{t("ui.format")}</h2>
                <Segmented<OutputFormat>
                  label={t("ui.format")}
                  value={settings.format}
                  onChange={(v) => change({ format: v })}
                  options={[
                    { value: "image/png", label: "PNG" },
                    { value: "image/jpeg", label: "JPG" },
                    { value: "image/webp", label: "WebP" },
                  ]}
                />
                {settings.format !== "image/png" && (
                  <Slider
                    label={t("ui.quality")}
                    value={Math.round(settings.quality * 100)}
                    min={40}
                    max={100}
                    onChange={(v) => change({ quality: v / 100 })}
                    display={settings.format === "image/webp" && settings.quality >= 1 ? t("svg2png.v2.lossless") : `${Math.round(settings.quality * 100)}%`}
                  />
                )}
              </div>
              <div className="space-y-2">
                <h2 className={sectionTitle}>{t("svg2png.v2.background")}</h2>
                <div className="flex flex-wrap items-center gap-3">
                  <Segmented<"t" | "c">
                    label={t("svg2png.v2.background")}
                    value={settings.transparent ? "t" : "c"}
                    onChange={(v) => change({ transparent: v === "t" })}
                    options={[
                      { value: "t", label: t("svg2png.v2.transparent") },
                      { value: "c", label: t("ui.color") },
                    ]}
                  />
                  {!settings.transparent && (
                    <input
                      type="color"
                      value={settings.bgColor}
                      onChange={(e) => change({ bgColor: e.target.value })}
                      aria-label={t("svg2png.v2.background")}
                      className="h-10 w-12 cursor-pointer rounded-lg border border-border bg-surface p-1"
                    />
                  )}
                </div>
                {settings.transparent && settings.format === "image/jpeg" && (
                  <p className="text-[12.5px] text-t-tertiary">{t("svg2png.v2.jpgWhite")}</p>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {running ? (
              <>
                <div className="flex min-w-[200px] flex-1 items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-tertiary" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
                    <div className="h-full bg-accent transition-[width]" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
                  </div>
                  <span className="text-[13px] tabular-nums text-t-secondary">
                    {progress.done}/{progress.total}
                  </span>
                </div>
                <button type="button" onClick={cancel} className={buttonSecondary}>
                  {t("svg2png.v2.cancel")}
                </button>
              </>
            ) : single?.result ? (
              <button type="button" onClick={() => downloadBlob(single.result!.blob, fileNameFor(single))} className={buttonPrimary}>
                <Download className="h-4 w-4" aria-hidden />
                {t("svg2png.v2.downloadAs", { format: formatLabel })}
              </button>
            ) : done.length > 1 && done.length === convertible.length ? (
              <button type="button" onClick={downloadZip} disabled={zipping} className={buttonPrimary}>
                {zipping ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
                {t("ui.downloadZip")}
              </button>
            ) : (
              <button type="button" onClick={convert} disabled={!convertible.length} className={buttonPrimary}>
                {convertible.length > 1 ? t("svg2png.v2.convertAll", { count: convertible.length, format: formatLabel }) : t("svg2png.v2.convertTo", { format: formatLabel })}
              </button>
            )}
            {!running && done.length > 0 && (
              <span className="inline-flex items-center gap-1.5 text-[13px] text-t-secondary">
                <Check className="h-4 w-4" aria-hidden />
                {t("svg2png.v2.doneCount", { count: done.length })}
              </span>
            )}
          </div>

          {single?.result && (
            <div className="glass space-y-2 rounded-2xl p-4">
              <p className={sectionTitle}>{t("ui.result")}</p>
              <div
                className="flex justify-center rounded-xl p-3"
                style={
                  settings.transparent && settings.format !== "image/jpeg"
                    ? { backgroundImage: "repeating-conic-gradient(rgb(var(--bg-tertiary-rgb)) 0 25%, transparent 0 50%)", backgroundSize: "16px 16px" }
                    : undefined
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={single.result.url} alt={t("svg2png.ui.resultAlt")} className="max-h-80 max-w-full object-contain" />
              </div>
              <p className="text-center text-[13px] text-t-secondary">
                {single.result.width} × {single.result.height} px · {formatFileSize(single.result.blob.size)}
              </p>
            </div>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
