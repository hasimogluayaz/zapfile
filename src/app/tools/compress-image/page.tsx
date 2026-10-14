"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AlertCircle, Check, Download, ImagePlus, Loader2, Plus, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ImageCompareSlider from "@/components/ImageCompareSlider";
import { Segmented, Slider, Toggle, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { AbortError, extensionFor, makeThumbnail, processImage, type OutputFormat } from "@/lib/image-engine";
import { downloadBlob, formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type FormatChoice = "auto" | OutputFormat;

interface Settings {
  format: FormatChoice;
  quality: number; // 0–1
  maxSide: number; // 0 = keep size
  pngLossy: boolean;
  targetKb: number; // 0 = off
  neverLarger: boolean;
}

const DEFAULTS: Settings = { format: "auto", quality: 0.75, maxSide: 0, pngLossy: true, targetKb: 0, neverLarger: true };
const MAX_SIDES = [0, 3840, 2560, 1920, 1280];
const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

interface Item {
  id: string;
  file: File;
  thumb?: string;
  status: "queued" | "working" | "done" | "error";
  result?: { blob: Blob; width: number; height: number; keptOriginal: boolean; format: OutputFormat };
  url?: string;
}

function outputFormatFor(file: File, choice: FormatChoice): OutputFormat {
  if (choice !== "auto") return choice;
  return (ACCEPT.includes(file.type) ? file.type : "image/jpeg") as OutputFormat;
}

function readSettingsFromUrl(): Partial<Settings> {
  if (typeof window === "undefined") return {};
  const p = new URLSearchParams(window.location.search);
  const out: Partial<Settings> = {};
  const q = Number(p.get("quality"));
  if (q >= 0.1 && q <= 1) out.quality = q;
  const m = Number(p.get("maxDim"));
  if (MAX_SIDES.includes(m)) out.maxSide = m;
  const f = p.get("format");
  if (f && ["auto", "image/jpeg", "image/webp", "image/png"].includes(f)) out.format = f as FormatChoice;
  return out;
}

export default function CompressImagePage() {
  const { t } = useI18n();
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
  const runRef = useRef<AbortController | null>(null);
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;
  const addInputRef = useRef<HTMLInputElement>(null);

  // Settings from / to the URL, so a configuration can be shared.
  useEffect(() => {
    setSettings((s) => ({ ...s, ...readSettingsFromUrl() }));
  }, []);
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("quality", String(settings.quality));
    url.searchParams.set("maxDim", String(settings.maxSide));
    url.searchParams.set("format", settings.format);
    window.history.replaceState({}, "", url);
  }, [settings.quality, settings.maxSide, settings.format]);

  // Revoke object URLs on unmount.
  useEffect(
    () => () => {
      itemsRef.current.forEach((i) => {
        if (i.thumb) URL.revokeObjectURL(i.thumb);
        if (i.url) URL.revokeObjectURL(i.url);
      });
      runRef.current?.abort();
    },
    [],
  );

  const update = (id: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  // ── Compression run (auto, debounced, cancellable) ─────────────────────

  const compressAll = useCallback(
    async (list: Item[], s: Settings) => {
      runRef.current?.abort();
      const run = new AbortController();
      runRef.current = run;
      setItems((prev) =>
        prev.map((i) => {
          if (i.url) URL.revokeObjectURL(i.url);
          return { ...i, status: "queued", result: undefined, url: undefined };
        }),
      );
      await Promise.all(
        list.map(async (item) => {
          const format = outputFormatFor(item.file, s.format);
          try {
            if (run.signal.aborted) return;
            update(item.id, { status: "working" });
            const res = await processImage(
              {
                input: item.file,
                transform: s.maxSide ? { resize: { width: s.maxSide, height: s.maxSide, fit: "contain" } } : undefined,
                encode: {
                  format,
                  quality: s.quality,
                  pngLossy: s.pngLossy,
                  targetBytes: s.targetKb > 0 ? s.targetKb * 1024 : undefined,
                },
                keepOriginalIfLarger: s.neverLarger,
              },
              run.signal,
            );
            if (run.signal.aborted) return;
            update(item.id, {
              status: "done",
              result: { blob: res.blob, width: res.width, height: res.height, keptOriginal: res.keptOriginal, format },
              url: URL.createObjectURL(res.blob),
            });
          } catch (error) {
            if (error instanceof AbortError || run.signal.aborted) return;
            console.error(error);
            update(item.id, { status: "error" });
          }
        }),
      );
    },
    [],
  );

  // Re-run when settings change (debounced so sliders stay smooth).
  const settingsKey = JSON.stringify(settings);
  const fileKey = items.map((i) => i.id).join(",");
  useEffect(() => {
    if (!itemsRef.current.length) return;
    const timer = setTimeout(() => void compressAll(itemsRef.current, settings), 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsKey, fileKey, compressAll]);

  // ── Files ──────────────────────────────────────────────────────────────

  const addFiles = useCallback(
    (selected: File[]) => {
      const valid = selected.filter((f) => ACCEPT.includes(f.type));
      if (!valid.length) {
        toast.error(t("compimg.invalid"));
        return;
      }
      if (valid.length < selected.length) toast.error(t("compimg.skipped", { count: selected.length - valid.length }));
      const fresh: Item[] = valid.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        status: "queued",
      }));
      setItems((prev) => [...prev, ...fresh]);
      setSelectedId((cur) => cur ?? fresh[0].id);
      fresh.forEach((item) => {
        makeThumbnail(item.file, 160)
          .then(({ blob }) => update(item.id, { thumb: URL.createObjectURL(blob) }))
          .catch(() => undefined);
      });
    },
    [t],
  );

  const removeItem = (id: string) => {
    setItems((prev) => {
      const gone = prev.find((i) => i.id === id);
      if (gone?.thumb) URL.revokeObjectURL(gone.thumb);
      if (gone?.url) URL.revokeObjectURL(gone.url);
      const next = prev.filter((i) => i.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
      return next;
    });
  };

  const reset = () => {
    runRef.current?.abort();
    items.forEach((i) => {
      if (i.thumb) URL.revokeObjectURL(i.thumb);
      if (i.url) URL.revokeObjectURL(i.url);
    });
    setItems([]);
    setSelectedId(null);
  };

  // ── Derived ────────────────────────────────────────────────────────────

  const done = items.filter((i) => i.status === "done");
  const busy = items.some((i) => i.status === "queued" || i.status === "working");
  const totalIn = done.reduce((s, i) => s + i.file.size, 0);
  const totalOut = done.reduce((s, i) => s + (i.result?.blob.size ?? 0), 0);
  const savedPct = totalIn > 0 ? Math.round((1 - totalOut / totalIn) * 100) : 0;
  const selected = items.find((i) => i.id === selectedId) ?? items[0];
  const [beforeUrl, setBeforeUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!selected) return setBeforeUrl(null);
    const url = URL.createObjectURL(selected.file);
    setBeforeUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selected?.file]); // eslint-disable-line react-hooks/exhaustive-deps

  const fileName = (item: Item) =>
    `${getFileNameWithoutExtension(item.file.name)}-compressed.${extensionFor(item.result!.format)}`;

  const downloadAll = async () => {
    if (done.length === 1) return downloadBlob(done[0].result!.blob, fileName(done[0]));
    setZipping(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const used = new Set<string>();
      for (const item of done) {
        let name = fileName(item);
        for (let n = 2; used.has(name); n++) name = name.replace(/(\.\w+)$/, `-${n}$1`);
        used.add(name);
        zip.file(name, item.result!.blob);
      }
      // Images are already compressed: STORE avoids burning CPU on deflate.
      downloadBlob(await zip.generateAsync({ type: "blob", compression: "STORE" }), "compressed-images.zip");
    } finally {
      setZipping(false);
    }
  };

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) => setSettings((s) => ({ ...s, [key]: value }));
  const showsQuality = settings.format !== "image/png";
  const anyPng = settings.format === "image/png" || (settings.format === "auto" && items.some((i) => i.file.type === "image/png"));
  const formatLabel = (f: OutputFormat) => (f === "image/jpeg" ? "JPG" : f === "image/webp" ? "WebP" : "PNG");

  const qualityLabel = useMemo(() => {
    const q = settings.quality;
    if (q >= 0.9) return t("cimg.q.max");
    if (q >= 0.75) return t("cimg.q.high");
    if (q >= 0.55) return t("cimg.q.balanced");
    return t("cimg.q.small");
  }, [settings.quality, t]);

  return (
    <ToolLayout
      toolName="Compress Image"
      toolDescription="Reduce image file sizes with adjustable quality. Batch processing supported. Everything happens in your browser."
    >
      {items.length === 0 ? (
        <div className="space-y-3">
          <FileDropzone
            onFilesSelected={addFiles}
            accept={{ "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] }}
            multiple
            label={t("convimg.ui.dropImages")}
            formats={["JPG", "PNG", "WEBP"]}
          />
          <p className="text-[13px] text-t-tertiary">{t("cimg.engineNote")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="space-y-4">
            {/* Before / after of the selected image */}
            {selected && beforeUrl && (
              <div className="glass space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-[14px] font-semibold text-t-primary">{selected.file.name}</p>
                  {selected.result && (
                    <p className="text-[13px] tabular-nums text-t-secondary">
                      {formatFileSize(selected.file.size)} → <span className="font-semibold text-t-primary">{formatFileSize(selected.result.blob.size)}</span>
                      {" · "}
                      {selected.result.width}×{selected.result.height}
                    </p>
                  )}
                </div>
                <div className="relative">
                  <ImageCompareSlider
                    beforeSrc={beforeUrl}
                    afterSrc={selected.url ?? beforeUrl}
                    beforeLabel={t("ui.original")}
                    afterLabel={selected.result ? formatLabel(selected.result.format) : "…"}
                    frameClassName="h-[min(56vh,460px)]"
                  />
                  {selected.status !== "done" && selected.status !== "error" && (
                    <span className="absolute end-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[12px] font-medium text-white">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      {t("compimg.compressing")}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* File list */}
            <div className="glass p-2">
              <ul className="divide-y divide-border">
                {items.map((item) => {
                  const r = item.result;
                  const pct = r ? Math.round((1 - r.blob.size / item.file.size) * 100) : 0;
                  return (
                    <li key={item.id}>
                      <div
                        className={`flex items-center gap-3 rounded-xl p-2 ${item.id === selected?.id ? "bg-bg-secondary" : ""}`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          className="flex min-w-0 flex-1 items-center gap-3 text-start"
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
                              {formatFileSize(item.file.size)}
                              {r && ` → ${formatFileSize(r.blob.size)}`}
                              {r?.keptOriginal && ` · ${t("cimg.alreadyOptimal")}`}
                            </span>
                          </span>
                        </button>
                        <span className="w-16 shrink-0 text-end text-[13px] font-semibold tabular-nums">
                          {item.status === "working" || item.status === "queued" ? (
                            <Loader2 className="ms-auto h-4 w-4 animate-spin text-t-tertiary" aria-label={t("compimg.compressing")} />
                          ) : item.status === "error" ? (
                            <AlertCircle className="ms-auto h-4 w-4 text-red-600 dark:text-red-400" aria-label={t("compimg.fail")} />
                          ) : pct > 0 ? (
                            <span className="text-emerald-700 dark:text-emerald-400">−{pct}%</span>
                          ) : (
                            <Check className="ms-auto h-4 w-4 text-t-tertiary" aria-label={t("cimg.alreadyOptimal")} />
                          )}
                        </span>
                        <button
                          type="button"
                          disabled={!r}
                          onClick={() => r && downloadBlob(r.blob, fileName(item))}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-t-secondary hover:bg-bg-tertiary hover:text-t-primary disabled:opacity-30"
                          aria-label={t("ui.download")}
                          title={t("ui.download")}
                        >
                          <Download className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-t-tertiary hover:bg-bg-tertiary hover:text-t-primary"
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
                className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13.5px] font-medium text-t-secondary hover:bg-bg-secondary hover:text-t-primary"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t("cimg.addMore")}
              </button>
              <input
                ref={addInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
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

          {/* Settings + summary */}
          <div className="space-y-4 lg:sticky lg:top-20">
            <div className="glass space-y-5 p-5">
              <div className="space-y-2">
                <p className={sectionTitle}>{t("compimg.format")}</p>
                <Segmented
                  label={t("compimg.format")}
                  size="sm"
                  value={settings.format}
                  onChange={(v) => set("format", v)}
                  options={[
                    { value: "auto", label: t("compimg.keepFormat") },
                    { value: "image/jpeg", label: "JPG" },
                    { value: "image/webp", label: "WebP" },
                    { value: "image/png", label: "PNG" },
                  ]}
                />
                {settings.format === "image/webp" && <p className="text-[12.5px] text-t-tertiary">{t("compimg.webpHint")}</p>}
              </div>

              {showsQuality && (
                <Slider
                  label={t("ui.quality")}
                  value={Math.round(settings.quality * 100)}
                  min={10}
                  max={100}
                  onChange={(v) => set("quality", v / 100)}
                  display={`${Math.round(settings.quality * 100)} · ${qualityLabel}`}
                  hints={[t("compimg.smaller"), t("compimg.higher")]}
                  disabled={settings.targetKb > 0}
                />
              )}

              {anyPng && (
                <Toggle
                  checked={settings.pngLossy}
                  onChange={(v) => set("pngLossy", v)}
                  label={t("cimg.pngLossy")}
                  description={t("cimg.pngLossyDesc")}
                />
              )}

              <div className="space-y-2">
                <p className={sectionTitle}>{t("compimg.maxDim")}</p>
                <Segmented
                  label={t("compimg.maxDim")}
                  size="sm"
                  value={settings.maxSide}
                  onChange={(v) => set("maxSide", v)}
                  options={MAX_SIDES.map((s) => ({ value: s, label: s === 0 ? t("cimg.keepSize") : s === 3840 ? "4K" : `${s}` }))}
                />
              </div>

              {showsQuality && (
                <label className="block">
                  <span className="mb-1.5 block text-[13px] text-t-secondary">{t("cimg.target")}</span>
                  <span className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step={10}
                      value={settings.targetKb || ""}
                      placeholder={t("cimg.targetOff")}
                      onChange={(e) => set("targetKb", Math.max(0, Math.round(Number(e.target.value) || 0)))}
                      className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2 text-[14px] text-t-primary placeholder:text-t-tertiary focus:border-t-primary/40 focus:outline-none"
                    />
                    <span className="text-[13px] text-t-tertiary">KB</span>
                  </span>
                  <span className="mt-1 block text-[12px] text-t-tertiary">{t("cimg.targetHint")}</span>
                </label>
              )}

              <Toggle
                checked={settings.neverLarger}
                onChange={(v) => set("neverLarger", v)}
                label={t("cimg.neverLarger")}
                description={t("cimg.neverLargerDesc")}
              />
            </div>

            <div className="glass space-y-4 p-5" aria-live="polite">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[12.5px] text-t-tertiary">{t("cimg.total", { n: done.length, total: items.length })}</p>
                  <p className="mt-1 text-[15px] tabular-nums text-t-secondary">
                    {formatFileSize(totalIn)} → <span className="font-semibold text-t-primary">{formatFileSize(totalOut)}</span>
                  </p>
                </div>
                <p className={`text-[28px] font-semibold tabular-nums leading-none ${savedPct > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-t-tertiary"}`}>
                  {busy && !done.length ? "…" : `${savedPct > 0 ? "−" : ""}${Math.max(0, savedPct)}%`}
                </p>
              </div>
              <button type="button" onClick={downloadAll} disabled={busy || !done.length || zipping} className={`${buttonPrimary} w-full`}>
                {busy || zipping ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                {busy ? t("compimg.compressing") : done.length > 1 ? t("ui.downloadZip") : t("compimg.download")}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(window.location.href);
                      toast.success(t("compimg.shareCopied"));
                    } catch {
                      toast.error(t("ui.copyFailed"));
                    }
                  }}
                  className={buttonSecondary}
                >
                  {t("compimg.shareLink")}
                </button>
                <button type="button" onClick={reset} className={buttonSecondary}>
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  {t("compimg.more")}
                </button>
              </div>
              <p className="text-[12px] text-t-tertiary">{t("cimg.metaNote")}</p>
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
