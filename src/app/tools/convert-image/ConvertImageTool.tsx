"use client";

/**
 * Image converter shared by /tools/convert-image and the
 * /tools/convert-image/[conversion] landing pages (fixed target format).
 *
 * Converts live (debounced, cancellable) through the off-thread image engine,
 * shows per-file before/after sizes, and zips without name collisions.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { Accept } from "react-dropzone";
import { AlertCircle, AlertTriangle, Download, ImagePlus, Loader2, Plus, X } from "lucide-react";
import FileDropzone from "@/components/FileDropzone";
import ImageCompareSlider from "@/components/ImageCompareSlider";
import { Segmented, Slider, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { AbortError, processImage, type OutputFormat } from "@/lib/image-engine";
import {
  encodeAvif,
  formatLabel,
  kindOf,
  outputName,
  sourceLabel,
  supportsAvifEncode,
  uniqueNamer,
  zipFiles,
  type AnyFormat,
} from "@/lib/image-tools-kit";
import { BackgroundPicker, BatchProgress, jobInput, useImageItems, type ImageItem } from "@/lib/image-tools-ui";
import { downloadBlob, formatFileSize } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export const CONVERT_ACCEPT: Accept = {
  "image/jpeg": [".jpg", ".jpeg", ".jfif"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/avif": [".avif"],
  "image/heic": [".heic"],
  "image/heif": [".heif"],
  "image/gif": [".gif"],
  "image/bmp": [".bmp"],
};
const CONVERT_FORMATS = ["JPG", "PNG", "WEBP", "AVIF", "HEIC", "GIF", "BMP"];
const MAX_FILES = 100;

interface Settings {
  format: AnyFormat;
  quality: number;
  background: string;
}

function defaultFormatFor(file: File): AnyFormat {
  const k = kindOf(file);
  return k === "webp" || k === "avif" || k === "heic" ? "image/jpeg" : "image/webp";
}

export default function ConvertImageTool({
  target,
  accept = CONVERT_ACCEPT,
  formats = CONVERT_FORMATS,
  dropLabel,
  stacked = false,
}: {
  /** Fixed output format (landing pages); omit to let the user choose. */
  target?: OutputFormat;
  accept?: Accept;
  formats?: string[];
  dropLabel?: string;
  /** Single column (for narrow page layouts). */
  stacked?: boolean;
}) {
  const { t } = useI18n();
  const { items, itemsRef, update, add, remove, clear, setItems } = useImageItems(240);
  const [settings, setSettings] = useState<Settings>({ format: target ?? "image/jpeg", quality: 0.9, background: "#ffffff" });
  const [formatTouched, setFormatTouched] = useState(Boolean(target));
  const [avifOk, setAvifOk] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!target) void supportsAvifEncode().then(setAvifOk);
  }, [target]);

  const settingsKey = `${settings.format}|${settings.quality}|${settings.format === "image/jpeg" ? settings.background : ""}`;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // ── Conversion runs ────────────────────────────────────────────────────
  const runRef = useRef<{ key: string; ctrl: AbortController; started: Set<string> } | null>(null);
  const avifChain = useRef<Promise<unknown>>(Promise.resolve());

  const convertOne = useCallback(
    async (item: ImageItem, s: Settings, run: { key: string; ctrl: AbortController }) => {
      const signal = run.ctrl.signal;
      try {
        update(item.id, { status: "working" });
        const background = s.format === "image/jpeg" ? s.background : undefined;
        let result: { blob: Blob; width: number; height: number; keptOriginal?: boolean };
        if (s.format === "image/avif") {
          // Browser encoder on the main thread: one at a time to cap memory.
          const job = avifChain.current.then(async () => {
            if (signal.aborted) throw new AbortError();
            return encodeAvif(await jobInput(item), s.quality);
          });
          avifChain.current = job.catch(() => undefined);
          result = await job;
        } else {
          const res = await processImage(
            {
              input: await jobInput(item),
              transform: background ? { background } : undefined,
              encode: { format: s.format, quality: s.quality },
              keepOriginalIfLarger: true,
            },
            signal,
          );
          result = res;
        }
        if (signal.aborted || runRef.current !== run) return;
        update(item.id, { status: "done", result: { ...result, format: s.format } });
      } catch (error) {
        if (error instanceof AbortError || signal.aborted) return;
        console.error(error);
        update(item.id, { status: "error" });
      }
    },
    [update],
  );

  const schedule = useCallback(() => {
    const key = settingsKey;
    if (!runRef.current || runRef.current.key !== key) {
      runRef.current?.ctrl.abort();
      runRef.current = { key, ctrl: new AbortController(), started: new Set() };
    }
    const run = runRef.current;
    for (const item of itemsRef.current) {
      if (run.started.has(item.id) || item.unreadable || !item.thumb) continue;
      run.started.add(item.id);
      void convertOne(item, settingsRef.current, run);
    }
  }, [settingsKey, itemsRef, convertOne]);

  // Settings changed: drop stale results right away, convert again after a pause.
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    runRef.current?.ctrl.abort();
    runRef.current = null;
    setItems((prev) => prev.map((i) => (i.unreadable ? i : { ...i, status: "queued", result: undefined })));
    const timer = setTimeout(schedule, 320);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsKey]);

  // New files become ready: convert them (no debounce needed).
  const readyKey = items.filter((i) => i.thumb).map((i) => i.id).join(",");
  useEffect(() => {
    if (readyKey) schedule();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readyKey]);

  useEffect(() => () => runRef.current?.ctrl.abort(), []);

  // ── Files ──────────────────────────────────────────────────────────────
  const addFiles = useCallback(
    (selected: File[]) => {
      const room = MAX_FILES - itemsRef.current.length;
      if (room <= 0) return void toast.error(t("imgkit.tooMany", { n: MAX_FILES }));
      const list = selected.slice(0, room);
      if (list.length < selected.length) toast.error(t("imgkit.tooMany", { n: MAX_FILES }));
      if (!formatTouched && itemsRef.current.length === 0 && list[0]) {
        setSettings((s) => ({ ...s, format: defaultFormatFor(list[0]) }));
      }
      const fresh = add(list);
      setItems((prev) => prev.map((i) => (fresh.some((f) => f.id === i.id) ? { ...i, status: "queued" } : i)));
      setSelectedId((cur) => cur ?? fresh[0]?.id ?? null);
    },
    [add, formatTouched, itemsRef, setItems, t],
  );

  const reset = () => {
    runRef.current?.ctrl.abort();
    runRef.current = null;
    clear();
    setSelectedId(null);
    if (!target) setFormatTouched(false);
  };

  // ── Derived ────────────────────────────────────────────────────────────
  const done = items.filter((i) => i.status === "done" && i.result);
  const pending = items.filter((i) => !i.unreadable && i.status !== "done" && i.status !== "error");
  const busy = pending.length > 0;
  const totalIn = done.reduce((s, i) => s + i.file.size, 0);
  const totalOut = done.reduce((s, i) => s + (i.result?.blob.size ?? 0), 0);
  const selected = items.find((i) => i.id === selectedId) ?? items[0];
  const alphaCount = items.filter((i) => i.alpha).length;
  const animatedCount = items.filter((i) => i.animated).length;

  const names = useMemo(() => {
    const name = uniqueNamer();
    const map = new Map<string, string>();
    for (const i of items) if (i.result) map.set(i.id, name(outputName(i.file, "", i.result.format)));
    return map;
  }, [items]);

  // Before/after URLs for the selected file.
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  const [afterUrl, setAfterUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!selected || selected.unreadable) return setBeforeUrl(null);
    if (selected.mainDecode) return setBeforeUrl(selected.thumb ?? null);
    const url = URL.createObjectURL(selected.file);
    setBeforeUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selected?.file, selected?.mainDecode, selected?.thumb, selected?.unreadable]); // eslint-disable-line react-hooks/exhaustive-deps
  const selectedBlob = selected?.result?.blob;
  useEffect(() => {
    if (!selectedBlob) return setAfterUrl(null);
    const url = URL.createObjectURL(selectedBlob);
    setAfterUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedBlob]);

  const downloadAll = async () => {
    if (done.length === 1) return downloadBlob(done[0].result!.blob, names.get(done[0].id)!);
    setZipping(true);
    try {
      downloadBlob(await zipFiles(done.map((i) => ({ name: names.get(i.id)!, blob: i.result!.blob }))), "converted-images.zip");
    } catch {
      toast.error(t("convimg.fail"));
    } finally {
      setZipping(false);
    }
  };

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings((s) => ({ ...s, [key]: value }));
  const lossy = settings.format !== "image/png";
  const fmt = formatLabel(settings.format);

  const formatOptions: { value: AnyFormat; label: string }[] = [
    { value: "image/jpeg", label: "JPG" },
    { value: "image/png", label: "PNG" },
    { value: "image/webp", label: "WebP" },
    ...(avifOk ? [{ value: "image/avif" as AnyFormat, label: "AVIF" }] : []),
  ];

  const qualityLabel = settings.quality >= 0.95 ? t("cimg.q.max") : settings.quality >= 0.8 ? t("cimg.q.high") : settings.quality >= 0.6 ? t("cimg.q.balanced") : t("cimg.q.small");

  if (items.length === 0) {
    return (
      <div className="space-y-3">
        <FileDropzone onFilesSelected={addFiles} accept={accept} multiple formats={formats} label={dropLabel ?? t("convimg.ui.dropImages")} />
        {!target && <p className="text-[13px] text-t-tertiary">{t("convimg.v2.note")}</p>}
      </div>
    );
  }

  return (
    <div className={`grid gap-5 ${stacked ? "" : "lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start"}`}>
      <div className="min-w-0 space-y-4">
        {selected && beforeUrl && (
          <div className="glass space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="min-w-0 truncate text-[14px] font-semibold text-t-primary">{selected.file.name}</p>
              {selected.result && (
                <p className="text-[13px] tabular-nums text-t-secondary">
                  {selected.result.width}×{selected.result.height}
                </p>
              )}
            </div>
            <div className="relative">
              <ImageCompareSlider
                beforeSrc={beforeUrl}
                afterSrc={afterUrl ?? beforeUrl}
                beforeLabel={sourceLabel(selected.file)}
                afterLabel={selected.result ? formatLabel(selected.result.format) : "…"}
                frameClassName="h-[min(50vh,420px)]"
                rangeAriaLabel={t("compimg.compare")}
              />
              {selected.status !== "done" && selected.status !== "error" && (
                <span className="absolute end-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[12px] font-medium text-white">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  {t("ui.converting")}
                </span>
              )}
            </div>
          </div>
        )}

        <div className="glass p-2">
          <ul className="divide-y divide-border">
            {items.map((item) => {
              const r = item.result;
              const pct = r ? Math.round((1 - r.blob.size / item.file.size) * 100) : 0;
              const heic = kindOf(item.file) === "heic";
              return (
                <li key={item.id} className={`rounded-xl ${item.id === selected?.id ? "bg-bg-secondary" : ""}`}>
                  <div className="flex items-center gap-3 p-2">
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt"
                      aria-pressed={item.id === selected?.id}
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
                          {sourceLabel(item.file)} · {formatFileSize(item.file.size)}
                          {r && (
                            <>
                              {" → "}
                              <span className="text-t-secondary">
                                {formatLabel(r.format)} · {formatFileSize(r.blob.size)}
                              </span>
                            </>
                          )}
                          {r?.keptOriginal && ` · ${t("cimg.alreadyOptimal")}`}
                        </span>
                      </span>
                    </button>
                    <span className="w-14 shrink-0 text-end text-[13px] font-semibold tabular-nums">
                      {item.unreadable || item.status === "error" ? (
                        <AlertCircle className="ms-auto h-4 w-4 text-red-600 dark:text-red-400" aria-label={t("convimg.fail")} />
                      ) : !r ? (
                        <Loader2 className="ms-auto h-4 w-4 animate-spin text-t-tertiary" aria-label={t("ui.converting")} />
                      ) : pct > 0 ? (
                        <span className="text-emerald-700 dark:text-emerald-400">−{pct}%</span>
                      ) : (
                        <span className="text-t-tertiary">+{Math.abs(pct)}%</span>
                      )}
                    </span>
                    <button
                      type="button"
                      disabled={!r}
                      onClick={() => r && downloadBlob(r.blob, names.get(item.id)!)}
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
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-t-tertiary hover:bg-bg-tertiary hover:text-t-primary"
                      aria-label={t("ui.remove")}
                      title={t("ui.remove")}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  {(item.unreadable || item.animated) && (
                    <p
                      className={`mx-2 mb-2 flex items-start gap-1.5 text-[12.5px] ${
                        item.unreadable ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {item.unreadable ? <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> : <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
                      {item.unreadable ? (heic ? t("convimg.v2.heicUnsupported") : t("convimg.v2.unreadable")) : t("convimg.v2.animated")}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => addInputRef.current?.click()}
            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13.5px] font-medium text-t-secondary hover:bg-bg-secondary hover:text-t-primary"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t("cimg.addMore")}
          </button>
          <input
            ref={addInputRef}
            type="file"
            accept={Object.entries(accept).flatMap(([mime, exts]) => [mime, ...exts]).join(",")}
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

      <div className={`space-y-4 ${stacked ? "" : "lg:sticky lg:top-20"}`}>
        <div className="glass space-y-5 p-5">
          <div className="space-y-2">
            <p className={sectionTitle}>{t("convimg.convertTo")}</p>
            {target ? (
              <span className="inline-flex rounded-xl border border-border bg-bg-secondary px-4 py-2 text-[14px] font-semibold text-t-primary">{fmt}</span>
            ) : (
              <Segmented
                label={t("convimg.convertTo")}
                value={settings.format}
                onChange={(v) => {
                  setFormatTouched(true);
                  set("format", v);
                }}
                options={formatOptions}
              />
            )}
            <p className="text-[12.5px] text-t-tertiary">
              {settings.format === "image/png"
                ? t("convimg.v2.pngHint")
                : settings.format === "image/webp"
                  ? t("compimg.webpHint")
                  : settings.format === "image/avif"
                    ? t("convimg.v2.avifHint")
                    : t("convimg.v2.jpgHint")}
            </p>
          </div>

          {lossy && (
            <Slider
              label={t("ui.quality")}
              value={Math.round(settings.quality * 100)}
              min={40}
              max={100}
              onChange={(v) => set("quality", v / 100)}
              display={`${Math.round(settings.quality * 100)} · ${qualityLabel}`}
              hints={[t("compimg.smaller"), t("compimg.higher")]}
            />
          )}

          {settings.format === "image/jpeg" && (
            <BackgroundPicker
              value={settings.background}
              onChange={(v) => set("background", v)}
              allowTransparent={false}
              label={t("convimg.v2.background")}
              hint={alphaCount > 0 ? t("convimg.v2.alphaCount", { n: alphaCount }) : t("convimg.v2.backgroundHint")}
            />
          )}

          {animatedCount > 0 && (
            <p className="flex items-start gap-1.5 text-[12.5px] text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {t("convimg.v2.animatedCount", { n: animatedCount })}
            </p>
          )}
        </div>

        <div className="glass space-y-4 p-5">
          {busy ? (
            <BatchProgress done={done.length} total={done.length + pending.length} label={t("ui.converting")} />
          ) : (
            <div className="flex items-end justify-between gap-3" aria-live="polite">
              <div>
                <p className="text-[12.5px] text-t-tertiary">{t("cimg.total", { n: done.length, total: items.length })}</p>
                <p className="mt-1 text-[15px] tabular-nums text-t-secondary">
                  {formatFileSize(totalIn)} → <span className="font-semibold text-t-primary">{formatFileSize(totalOut)}</span>
                </p>
              </div>
            </div>
          )}
          <button type="button" onClick={downloadAll} disabled={busy || !done.length || zipping} className={`${buttonPrimary} w-full`}>
            {busy || zipping ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
            {done.length > 1 ? t("ui.downloadZip") : t("convimg.v2.downloadAs", { format: fmt })}
          </button>
          <button type="button" onClick={reset} className={`${buttonSecondary} w-full`}>
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            {t("ui.convertMore")}
          </button>
        </div>
      </div>
    </div>
  );
}
