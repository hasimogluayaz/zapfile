"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, Check, Copy, Download, ExternalLink, Loader2, MapPin, ShieldCheck, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { makeThumbnail } from "@/lib/image-engine";
import { downloadBlob, formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { describe, type Location } from "./describe";
import { MetadataError, orientationOf, readMetadata, sniffFormat, stripMetadata, type ImageFormat, type Metadata } from "./metadata";

interface Item {
  id: string;
  file: File;
  format: ImageFormat | null;
  meta: Metadata | null;
  error: "unsupported" | "damaged" | null;
  thumb?: string;
  clean?: { blob: Blob; keptOrientation: boolean };
}

const ACCEPT = { "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] };
const MIME: Record<ImageFormat, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
let idCounter = 0;

function cleanName(file: File) {
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "jpg";
  return `${getFileNameWithoutExtension(file.name)}-clean.${ext}`;
}

async function analyse(file: File): Promise<Pick<Item, "format" | "meta" | "error">> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const format = sniffFormat(bytes);
  if (!format) return { format: null, meta: null, error: "unsupported" };
  try {
    return { format, meta: await readMetadata(bytes), error: null };
  } catch (e) {
    return { format, meta: null, error: e instanceof MetadataError ? "damaged" : "damaged" };
  }
}

async function cleanFile(item: Item): Promise<{ blob: Blob; keptOrientation: boolean }> {
  const bytes = new Uint8Array(await item.file.arrayBuffer());
  const orientation = orientationOf(item.meta);
  const out = stripMetadata(bytes, orientation);
  return { blob: new Blob([out as BlobPart], { type: MIME[item.format!] }), keptOrientation: orientation > 1 };
}

export default function ExifViewerPage() {
  const { t, locale } = useI18n();
  const [items, setItems] = useState<Item[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reading, setReading] = useState(0);
  const [cleaning, setCleaning] = useState<string | null>(null);
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const batchRef = useRef<AbortController | null>(null);
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;

  useEffect(
    () => () => {
      batchRef.current?.abort();
      itemsRef.current.forEach((i) => i.thumb && URL.revokeObjectURL(i.thumb));
    },
    [],
  );

  const selected = items.find((i) => i.id === selectedId) ?? items[0] ?? null;

  // Preview URL for the selected file only; revoked when the selection changes.
  useEffect(() => {
    if (!selected || selected.error === "unsupported") {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selected.file);
    setPreviewUrl(url);
    setDims(null);
    return () => URL.revokeObjectURL(url);
  }, [selected?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const addFiles = useCallback(async (files: File[]) => {
    const fresh: Item[] = files.map((file) => ({ id: `exif-${++idCounter}`, file, format: null, meta: null, error: null }));
    setItems((prev) => [...prev, ...fresh]);
    setSelectedId((cur) => cur ?? fresh[0]?.id ?? null);
    setReading((n) => n + fresh.length);
    for (const item of fresh) {
      const result = await analyse(item.file);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, ...result } : i)));
      setReading((n) => n - 1);
    }
    // Thumbnails for the list (only worth it with several files).
    if (itemsRef.current.length > 1) {
      for (const item of itemsRef.current) {
        if (item.thumb || item.error === "unsupported" || !itemsRef.current.includes(item)) continue;
        try {
          const { blob } = await makeThumbnail(item.file, 96);
          const url = URL.createObjectURL(blob);
          if (!itemsRef.current.some((i) => i.id === item.id)) {
            URL.revokeObjectURL(url);
            continue;
          }
          setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, thumb: url } : i)));
        } catch {
          // a thumbnail is optional
        }
      }
    }
  }, []);

  const removeItem = (id: string) => {
    setItems((prev) => {
      const it = prev.find((i) => i.id === id);
      if (it?.thumb) URL.revokeObjectURL(it.thumb);
      const next = prev.filter((i) => i.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id ?? null);
      return next;
    });
  };

  const clearAll = () => {
    batchRef.current?.abort();
    items.forEach((i) => i.thumb && URL.revokeObjectURL(i.thumb));
    setItems([]);
    setSelectedId(null);
    setBatch(null);
  };

  const cleanOne = async (item: Item) => {
    setCleaning(item.id);
    try {
      const clean = await cleanFile(item);
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, clean } : i)));
      downloadBlob(clean.blob, cleanName(item.file));
      toast.success(t("exif.v2.cleanDone"));
    } catch {
      toast.error(t("exif.processFail"));
    } finally {
      setCleaning(null);
    }
  };

  const cleanAll = async () => {
    const list = items.filter((i) => i.format && !i.error);
    if (!list.length) return;
    batchRef.current?.abort();
    const run = new AbortController();
    batchRef.current = run;
    setBatch({ done: 0, total: list.length });
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const used = new Set<string>();
      let ok = 0;
      for (const item of list) {
        if (run.signal.aborted) return;
        try {
          const { blob } = await cleanFile(item);
          let name = cleanName(item.file);
          const dot = name.lastIndexOf(".");
          for (let n = 2; used.has(name.toLowerCase()); n++) name = `${cleanName(item.file).slice(0, dot)}-${n}${cleanName(item.file).slice(dot)}`;
          used.add(name.toLowerCase());
          zip.file(name, blob);
          ok++;
        } catch {
          // reported in the count below
        }
        setBatch((b) => (b ? { ...b, done: b.done + 1 } : b));
        await new Promise((r) => setTimeout(r, 0));
      }
      if (run.signal.aborted) return;
      const out = await zip.generateAsync({ type: "blob", compression: "STORE" });
      if (run.signal.aborted) return;
      downloadBlob(out, t("exif.batchZipName"));
      if (ok < list.length) toast.error(t("exif.v2.batchPartial", { ok, total: list.length }));
      else toast.success(t("exif.batchDone", { count: ok }));
    } catch {
      toast.error(t("exif.batchFail"));
    } finally {
      if (batchRef.current === run) setBatch(null);
    }
  };

  const described = useMemo(() => (selected?.meta ? describe(selected.meta, t, locale) : null), [selected?.meta, t, locale]);
  const withGps = items.filter((i) => i.meta && describe(i.meta, t, locale).location).length;

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("ui.copied"));
    } catch {
      toast.error(t("ui.copyFailed"));
    }
  };

  const locationCard = (loc: Location) => {
    const coords = `${loc.lat.toFixed(6)}, ${loc.lon.toFixed(6)}`;
    const osm = `https://www.openstreetmap.org/?mlat=${loc.lat.toFixed(6)}&mlon=${loc.lon.toFixed(6)}#map=16/${loc.lat.toFixed(6)}/${loc.lon.toFixed(6)}`;
    return (
      <div className="rounded-2xl border-2 border-volt bg-volt/10 p-4" role="alert">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-volt text-ink">
            <MapPin className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-[15px] font-semibold text-t-primary">{t("exif.v2.gpsWarnTitle")}</p>
            <p className="text-[13px] text-t-secondary">{t("exif.v2.gpsWarnBody")}</p>
            <p dir="ltr" className="font-mono text-[13px] text-t-primary">
              {coords}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <a href={osm} target="_blank" rel="noopener noreferrer" className={buttonSecondary}>
                <ExternalLink className="h-4 w-4" aria-hidden />
                {t("exif.v2.openMap")}
              </a>
              <button type="button" onClick={() => copy(coords)} className={buttonSecondary}>
                <Copy className="h-4 w-4" aria-hidden />
                {t("exif.v2.copyCoords")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const cleanable = (i: Item | null) => Boolean(i && i.format && !i.error);

  return (
    <ToolLayout toolName={t("tool.exif-viewer.name")} toolDescription={t("tool.exif-viewer.desc")}>
      {items.length === 0 ? (
        <div className="space-y-3">
          <FileDropzone onFilesSelected={addFiles} accept={ACCEPT} multiple formats={["JPG", "PNG", "WEBP"]} label={t("exif.dropText")} />
          <p className="text-center text-[13px] text-t-tertiary">{t("exif.v2.supportNote")}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* File list (several files) */}
          {items.length > 1 && (
            <div className="glass space-y-3 rounded-2xl p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className={sectionTitle}>
                  {t("exif.v2.filesCount", { count: items.length })}
                  {withGps > 0 && <span className="ms-2 normal-case tracking-normal text-volt-ink">· {t("exif.v2.withGps", { count: withGps })}</span>}
                </h2>
                <button type="button" onClick={clearAll} className="min-h-9 rounded-lg px-2 text-[13px] text-t-secondary hover:text-t-primary">
                  {t("ui.clearAll")}
                </button>
              </div>
              <ul className="max-h-72 space-y-1 overflow-y-auto pe-1">
                {items.map((item) => {
                  const d = item.meta ? describe(item.meta, t, locale) : null;
                  const active = selected?.id === item.id;
                  return (
                    <li key={item.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        aria-pressed={active}
                        className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl border p-2 text-start transition-colors ${
                          active ? "border-accent bg-surface" : "border-transparent hover:bg-bg-secondary"
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {item.thumb ? <img src={item.thumb} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" /> : <span className="h-10 w-10 shrink-0 rounded-lg bg-bg-tertiary" />}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14px] text-t-primary">{item.file.name}</span>
                          <span className="block text-[12px] text-t-tertiary">
                            {formatFileSize(item.file.size)}
                            {" · "}
                            {item.error === "unsupported"
                              ? t("exif.v2.unsupported")
                              : item.error === "damaged"
                                ? t("exif.v2.damagedShort")
                                : !item.meta
                                  ? t("ui.loading")
                                  : d && d.count > 0
                                    ? t("exif.v2.tagCount", { count: d.count })
                                    : t("exif.v2.noneFound")}
                          </span>
                        </span>
                        {d?.location && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-volt px-2 py-0.5 text-[11.5px] font-semibold text-ink">
                            <MapPin className="h-3 w-3" aria-hidden />
                            GPS
                          </span>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={Boolean(batch)}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-t-tertiary hover:bg-bg-secondary hover:text-t-primary disabled:opacity-40"
                        aria-label={t("ui.remove")}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="flex flex-wrap items-center gap-3">
                {batch ? (
                  <>
                    <div className="flex min-w-[180px] flex-1 items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-tertiary" role="progressbar" aria-valuemin={0} aria-valuemax={batch.total} aria-valuenow={batch.done}>
                        <div className="h-full bg-accent transition-[width]" style={{ width: `${(batch.done / batch.total) * 100}%` }} />
                      </div>
                      <span className="text-[13px] tabular-nums text-t-secondary">
                        {batch.done}/{batch.total}
                      </span>
                    </div>
                    <button type="button" onClick={() => batchRef.current?.abort()} className={buttonSecondary}>
                      {t("exif.v2.cancel")}
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={cleanAll} disabled={reading > 0 || !items.some(cleanable)} className={buttonPrimary}>
                    <ShieldCheck className="h-4 w-4" aria-hidden />
                    {t("exif.v2.cleanAll", { count: items.filter(cleanable).length })}
                  </button>
                )}
              </div>
              <FileDropzone onFilesSelected={addFiles} accept={ACCEPT} multiple formats={["JPG", "PNG", "WEBP"]} label={t("exif.v2.addMore")} />
            </div>
          )}

          {selected && (
            <>
              {described?.location && locationCard(described.location)}

              <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="glass space-y-2 rounded-2xl p-3">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={t("exif.imagePreview")}
                      onLoad={(e) => setDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
                      className="max-h-80 w-full rounded-xl object-contain"
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-xl bg-bg-secondary text-[13px] text-t-tertiary">{t("exif.v2.noPreview")}</div>
                  )}
                </div>

                <div className="glass space-y-4 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className={sectionTitle}>{t("exif.fileInfo")}</h2>
                    {items.length === 1 && (
                      <button type="button" onClick={clearAll} className="-mt-1 min-h-9 rounded-lg px-2 text-[13px] text-t-secondary hover:text-t-primary">
                        {t("ui.remove")}
                      </button>
                    )}
                  </div>
                  <dl className="space-y-2 text-[13.5px]">
                    {[
                      [t("exif.fileName"), selected.file.name],
                      [t("exif.fileSize"), formatFileSize(selected.file.size)],
                      [t("exif.fileType"), selected.format ? selected.format.toUpperCase() : selected.file.type || t("exif.ui.unknown")],
                      [t("exif.dimensions"), dims ? `${dims.w} × ${dims.h}` : "…"],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-3">
                        <dt className="shrink-0 text-t-secondary">{k}</dt>
                        <dd className="min-w-0 truncate text-end text-t-primary">{v}</dd>
                      </div>
                    ))}
                  </dl>

                  {selected.error === "unsupported" ? (
                    <p className="flex gap-2 text-[13px] text-red-700 dark:text-red-400">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      {t("exif.v2.unsupportedLong")}
                    </p>
                  ) : selected.error === "damaged" ? (
                    <p className="flex gap-2 text-[13px] text-red-700 dark:text-red-400">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      {t("exif.v2.damagedLong")}
                    </p>
                  ) : (
                    <div className="space-y-2 border-t border-border pt-4">
                      {selected.clean ? (
                        <>
                          <p className="flex items-start gap-2 text-[13.5px] text-t-primary">
                            <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                            <span>
                              {t("exif.v2.cleanSummary", { before: formatFileSize(selected.file.size), after: formatFileSize(selected.clean.blob.size) })}
                              {selected.clean.keptOrientation && <span className="block text-[12.5px] text-t-tertiary">{t("exif.v2.keptOrientation")}</span>}
                            </span>
                          </p>
                          <button type="button" onClick={() => downloadBlob(selected.clean!.blob, cleanName(selected.file))} className={`${buttonPrimary} w-full`}>
                            <Download className="h-4 w-4" aria-hidden />
                            {t("exif.downloadCleaned")}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => cleanOne(selected)}
                          disabled={!selected.meta || cleaning === selected.id}
                          className={`${buttonPrimary} w-full`}
                        >
                          {cleaning === selected.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
                          {t("exif.v2.cleanOne")}
                        </button>
                      )}
                      <p className="text-[12.5px] text-t-tertiary">{t("exif.v2.losslessNote")}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Metadata */}
              {selected.meta && described && (
                described.count === 0 ? (
                  <div className="glass rounded-2xl p-6 text-center">
                    <ShieldCheck className="mx-auto mb-2 h-6 w-6 text-t-tertiary" aria-hidden />
                    <p className="text-[14px] text-t-secondary">{t("exif.v2.noneFoundLong")}</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {described.groups.map((g) => (
                      <section key={g.id} className={`glass rounded-2xl p-4 ${g.id === "location" ? "border border-volt/50" : ""}`}>
                        <h3 className={`${sectionTitle} mb-2`}>{g.title}</h3>
                        <dl className="divide-y divide-border text-[13.5px]">
                          {g.rows.map((r, i) => (
                            <div key={`${r.label}-${i}`} className="flex justify-between gap-4 py-2">
                              <dt className="shrink-0 text-t-secondary">{r.label}</dt>
                              <dd className="min-w-0 break-words text-end text-t-primary">{r.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </section>
                    ))}
                  </div>
                )
              )}
              {!selected.meta && !selected.error && (
                <p className="flex items-center justify-center gap-2 text-[13px] text-t-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {t("ui.loading")}
                </p>
              )}
            </>
          )}

          {items.length === 1 && (
            <FileDropzone onFilesSelected={addFiles} accept={ACCEPT} multiple formats={["JPG", "PNG", "WEBP"]} label={t("exif.v2.addMore")} />
          )}
        </div>
      )}
    </ToolLayout>
  );
}
