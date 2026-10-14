"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Check, Copy, Download, Loader2, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { Segmented, Slider, Toggle, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { AbortError, processImage } from "@/lib/image-engine";
import { downloadBlob, formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { intrinsicSize, parseSvg, rasterizeSvg } from "../svg-to-png/svg";
import { packIco, toRgbaPng } from "./ico";
import { buildIconSvg, composeIcon, type Fit, type Look, type Shape, type Variant } from "./render";

interface Source {
  file: File;
  svgText: string | null;
  /** Working copy, at most 2048 px on the long side, EXIF orientation applied. */
  bitmap: ImageBitmap;
  width: number;
  height: number;
  url: string;
}

interface OutFile {
  name: string;
  blob: Blob;
  url: string;
  size: number;
}

type Outputs = Record<string, OutFile>;

const MASTER = 1024;
const WORK_MAX = 2048;
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Output sizes and which artwork variant each one uses. */
const JOBS: { key: string; size: number; variant: Variant }[] = [
  { key: "16", size: 16, variant: "standard" },
  { key: "32", size: 32, variant: "standard" },
  { key: "48", size: 48, variant: "standard" },
  { key: "icon-192.png", size: 192, variant: "standard" },
  { key: "icon-512.png", size: 512, variant: "standard" },
  { key: "apple-touch-icon.png", size: 180, variant: "apple" },
  { key: "icon-maskable-512.png", size: 512, variant: "maskable" },
];

function expandHex(v: string) {
  return v.length === 4 ? `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}` : v;
}

async function loadSource(file: File): Promise<Source> {
  const isSvg = file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
  if (isSvg) {
    const svgText = await file.text();
    const parsed = parseSvg(svgText);
    if (!parsed) throw new Error("invalid svg");
    const size = intrinsicSize(parsed.root);
    const k = WORK_MAX / Math.max(size.width, size.height);
    const w = Math.max(1, Math.round(size.width * k));
    const h = Math.max(1, Math.round(size.height * k));
    const canvas = await rasterizeSvg(svgText, w, h);
    const bitmap = await createImageBitmap(canvas);
    return { file, svgText, bitmap, width: size.width, height: size.height, url: URL.createObjectURL(file) };
  }
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    bitmap = await createImageBitmap(file);
  }
  const width = bitmap.width;
  const height = bitmap.height;
  const long = Math.max(width, height);
  if (long > WORK_MAX) {
    const k = WORK_MAX / long;
    const small = await createImageBitmap(bitmap, {
      resizeWidth: Math.round(width * k),
      resizeHeight: Math.round(height * k),
      resizeQuality: "high",
    });
    bitmap.close();
    bitmap = small;
  }
  return { file, svgText: null, bitmap, width, height, url: URL.createObjectURL(file) };
}

/** Builds every icon for the given look. Downscaling runs through the engine (Lanczos, linear light). */
async function generate(src: Source, look: Look, signal: AbortSignal): Promise<Outputs> {
  const masters: Partial<Record<Variant, HTMLCanvasElement>> = {};
  const master = (v: Variant) =>
    (masters[v] ??= composeIcon({ image: src.bitmap, width: src.bitmap.width, height: src.bitmap.height }, MASTER, look, v));
  const results = await Promise.all(
    JOBS.map(async (job) => {
      const bitmap = await createImageBitmap(master(job.variant));
      const res = await processImage(
        {
          // The engine also takes an ImageBitmap (transferred to its worker).
          input: bitmap as unknown as Blob,
          transform: { resize: { width: job.size, height: job.size, fit: "stretch", withoutEnlargement: false } },
          encode: { format: "image/png", quality: 1 },
        },
        signal,
      );
      return [job.key, res.blob] as const;
    }),
  );
  Object.values(masters).forEach((c) => c && (c.width = c.height = 0));
  if (signal.aborted) throw new AbortError();
  const blobs = Object.fromEntries(results) as Record<string, Blob>;
  const icoEntries = await Promise.all([16, 32, 48].map(async (s) => ({ size: s, png: await toRgbaPng(blobs[String(s)], s) })));
  const ico = await packIco(icoEntries);
  if (signal.aborted) throw new AbortError();
  const out: Outputs = {};
  const add = (key: string, name: string, blob: Blob, size: number) => {
    out[key] = { name, blob, url: URL.createObjectURL(blob), size };
  };
  add("favicon.ico", "favicon.ico", ico, 48);
  for (const job of JOBS) add(job.key, /^\d+$/.test(job.key) ? `favicon-${job.key}x${job.key}.png` : job.key, blobs[job.key], job.size);
  if (src.svgText) {
    const svg = buildIconSvg(src.svgText, look);
    if (svg) add("icon.svg", "icon.svg", new Blob([svg], { type: "image/svg+xml" }), 0);
  }
  return out;
}

function revokeAll(o: Outputs | null) {
  if (o) Object.values(o).forEach((f) => URL.revokeObjectURL(f.url));
}

export default function FaviconGeneratorPage() {
  const { t } = useI18n();
  const [source, setSource] = useState<Source | null>(null);
  const [loading, setLoading] = useState(false);
  const [look, setLook] = useState<Look>({ fit: "contain", padding: 0, background: null, shape: "square" });
  const [bgColor, setBgColor] = useState("#ffffff");
  const [outputs, setOutputs] = useState<Outputs | null>(null);
  const [busy, setBusy] = useState(false);
  const [appName, setAppName] = useState("");
  const [shortName, setShortName] = useState("");
  const [themeInput, setThemeInput] = useState("#16181d");
  const [manifestBgInput, setManifestBgInput] = useState("#ffffff");
  const [showSafeZone, setShowSafeZone] = useState(true);
  const [zipping, setZipping] = useState(false);
  const runRef = useRef<AbortController | null>(null);
  const outputsRef = useRef<Outputs | null>(null);
  outputsRef.current = outputs;
  const sourceRef = useRef<Source | null>(null);
  sourceRef.current = source;
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(
    () => () => {
      runRef.current?.abort();
      revokeAll(outputsRef.current);
      if (sourceRef.current) {
        URL.revokeObjectURL(sourceRef.current.url);
        sourceRef.current.bitmap.close();
      }
    },
    [],
  );

  // Regenerate (debounced, cancellable) whenever the source or look changes.
  useEffect(() => {
    if (!source) return;
    runRef.current?.abort();
    const run = new AbortController();
    runRef.current = run;
    setBusy(true);
    const timer = setTimeout(() => {
      generate(source, look, run.signal)
        .then((out) => {
          if (run.signal.aborted) return revokeAll(out);
          setOutputs((prev) => {
            revokeAll(prev);
            return out;
          });
          setBusy(false);
        })
        .catch((e) => {
          if (e instanceof AbortError || run.signal.aborted) return;
          console.error(e);
          setBusy(false);
          toast.error(tRef.current("ui.failedExport"));
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      run.abort();
    };
  }, [source, look]);

  const onFiles = useCallback(
    async (files: File[]) => {
      const f = files[0];
      if (!f) return;
      setLoading(true);
      try {
        const src = await loadSource(f);
        setSource((prev) => {
          if (prev) {
            URL.revokeObjectURL(prev.url);
            prev.bitmap.close();
          }
          return src;
        });
        setOutputs((prev) => {
          revokeAll(prev);
          return null;
        });
        const base = getFileNameWithoutExtension(f.name).replace(/[-_]+/g, " ").trim();
        setAppName((n) => n || base.slice(0, 40));
      } catch {
        toast.error(t("ui.failedLoad"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  const reset = () => {
    runRef.current?.abort();
    if (source) {
      URL.revokeObjectURL(source.url);
      source.bitmap.close();
    }
    revokeAll(outputs);
    setOutputs(null);
    setSource(null);
    setBusy(false);
  };

  const themeValid = HEX.test(themeInput.trim());
  const manifestBgValid = HEX.test(manifestBgInput.trim());
  // Invalid input keeps the last valid colour in the snippet/manifest (and is flagged inline).
  const lastTheme = useRef("#16181d");
  const lastManifestBg = useRef("#ffffff");
  if (themeValid) lastTheme.current = expandHex(themeInput.trim().toLowerCase());
  if (manifestBgValid) lastManifestBg.current = expandHex(manifestBgInput.trim().toLowerCase());
  const themeColor = lastTheme.current;
  const manifestBg = lastManifestBg.current;

  const name = appName.trim() || "My App";
  const short = shortName.trim() || name.slice(0, 12);
  const hasSvg = Boolean(outputs?.["icon.svg"]);

  const manifest = useMemo(
    () =>
      JSON.stringify(
        {
          name,
          short_name: short,
          icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
            { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
          theme_color: themeColor,
          background_color: manifestBg,
          display: "standalone",
          start_url: "/",
        },
        null,
        2,
      ),
    [name, short, themeColor, manifestBg],
  );

  const snippet = useMemo(
    () =>
      [
        hasSvg ? `<link rel="icon" href="/favicon.ico" sizes="32x32">` : `<link rel="icon" href="/favicon.ico" sizes="any">`,
        hasSvg ? `<link rel="icon" href="/icon.svg" type="image/svg+xml">` : null,
        `<link rel="apple-touch-icon" href="/apple-touch-icon.png">`,
        `<link rel="manifest" href="/site.webmanifest">`,
        `<meta name="theme-color" content="${themeColor}">`,
      ]
        .filter(Boolean)
        .join("\n"),
    [hasSvg, themeColor],
  );

  const deliverables = outputs
    ? ["favicon.ico", "icon.svg", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png"]
        .map((k) => outputs[k])
        .filter(Boolean)
    : [];

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("ui.copied"));
    } catch {
      toast.error(t("ui.copyFailed"));
    }
  };

  const downloadZip = async () => {
    if (!outputs || busy) return;
    setZipping(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      deliverables.forEach((f) => zip.file(f.name, f.blob));
      zip.file("site.webmanifest", manifest);
      zip.file("head-snippet.html", snippet + "\n");
      const base = source ? getFileNameWithoutExtension(source.file.name) : "favicon";
      downloadBlob(await zip.generateAsync({ type: "blob" }), `${base}-favicons.zip`);
      toast.success(t("fav.zipSuccess"));
    } catch {
      toast.error(t("fav.zipFail"));
    } finally {
      setZipping(false);
    }
  };

  const setBackgroundMode = (mode: "none" | "color") => setLook((l) => ({ ...l, background: mode === "none" ? null : bgColor }));
  const pickBg = (c: string) => {
    setBgColor(c);
    setLook((l) => ({ ...l, background: c }));
  };

  const icon = (key: string) => outputs?.[key]?.url;
  const notSquare = source && Math.abs(source.width / source.height - 1) > 0.02;
  const lowRes = source && !source.svgText && Math.min(source.width, source.height) < 512;

  const colorField = (label: string, value: string, setValue: (v: string) => void, valid: boolean, picker: string) => (
    <label className="block">
      <span className="text-[13px] text-t-secondary">{label}</span>
      <span className="mt-1 flex gap-2">
        <input
          type="color"
          value={picker}
          onChange={(e) => setValue(e.target.value)}
          aria-label={label}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-border bg-surface p-1"
        />
        <input
          type="text"
          value={value}
          spellCheck={false}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={!valid}
          className={`h-10 min-w-0 flex-1 rounded-lg border bg-surface px-3 font-mono text-[14px] text-t-primary focus:outline-none ${
            valid ? "border-border focus:border-accent" : "border-red-500"
          }`}
        />
      </span>
      {!valid && <span className="mt-1 block text-[12px] text-red-600 dark:text-red-400">{t("fav.v2.badColor")}</span>}
    </label>
  );

  const tabMock = (dark: boolean) => (
    <div className="overflow-hidden rounded-xl border border-border" style={{ background: dark ? "#202124" : "#dee1e6" }}>
      <div className="flex items-end gap-1 px-2 pt-2">
        <div
          className="flex h-9 w-full max-w-[240px] items-center gap-2 rounded-t-lg px-3"
          style={{ background: dark ? "#35363a" : "#ffffff", color: dark ? "#e8eaed" : "#202124" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {icon("32") ? <img src={icon("32")} alt="" width={16} height={16} className="h-4 w-4 shrink-0" /> : <span className="h-4 w-4" />}
          <span className="min-w-0 flex-1 truncate text-[12px]">{name}</span>
          <X className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden />
        </div>
        <div className="flex h-9 flex-1 items-center gap-2 rounded-t-lg px-3 opacity-60" style={{ color: dark ? "#9aa0a6" : "#5f6368" }}>
          <span className="h-4 w-4 rounded-full" style={{ background: dark ? "#5f6368" : "#bdc1c6" }} />
          <span className="truncate text-[12px]">{t("fav.v2.otherTab")}</span>
        </div>
      </div>
      <div className="h-8" style={{ background: dark ? "#35363a" : "#ffffff" }} />
    </div>
  );

  const homeMock = (dark: boolean) => (
    <div className="rounded-xl border border-border p-4" style={{ background: dark ? "#1c1c1e" : "#dfe6ee" }}>
      <div className="grid grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            {i === 1 && icon("apple-touch-icon.png") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={icon("apple-touch-icon.png")} alt="" className="h-[52px] w-[52px] rounded-[23%] shadow-sm" />
            ) : (
              <span className="h-[52px] w-[52px] rounded-[23%]" style={{ background: dark ? "#3a3a3c" : "#ffffff", opacity: 0.7 }} />
            )}
            <span
              className="w-full truncate text-center text-[10.5px]"
              style={{ color: dark ? "#f2f2f7" : "#1c1c1e", opacity: i === 1 ? 1 : 0.5 }}
            >
              {i === 1 ? short : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <ToolLayout toolName="Favicon Generator" toolDescription="Generate all favicon sizes from a single image">
      {!source ? (
        <div className="space-y-3">
          <FileDropzone
            onFilesSelected={onFiles}
            accept={{
              "image/png": [".png"],
              "image/svg+xml": [".svg"],
              "image/jpeg": [".jpg", ".jpeg"],
              "image/webp": [".webp"],
            }}
            formats={["SVG", "PNG", "JPG", "WEBP"]}
            label={t("ui.dropImage")}
          />
          {loading && (
            <p className="flex items-center justify-center gap-2 text-[13px] text-t-secondary">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t("ui.loading")}
            </p>
          )}
          <p className="text-center text-[13px] text-t-tertiary">{t("fav.v2.dropHint")}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Source + look */}
          <div className="glass grid gap-5 rounded-2xl p-4 sm:p-5 md:grid-cols-[180px_1fr]">
            <div className="space-y-2">
              <div
                className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border"
                style={{ backgroundImage: "repeating-conic-gradient(rgb(var(--bg-tertiary-rgb)) 0 25%, transparent 0 50%)", backgroundSize: "14px 14px" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={source.url} alt={t("fav.ui.sourcePreview")} className="max-h-full max-w-full object-contain" />
              </div>
              <p className="truncate text-[13px] font-medium text-t-primary">{source.file.name}</p>
              <p className="text-[12px] text-t-tertiary">
                {formatFileSize(source.file.size)} · {Math.round(source.width)} × {Math.round(source.height)}
                {source.svgText ? " · SVG" : ""}
              </p>
              <button type="button" onClick={reset} className={`${buttonSecondary} w-full`}>
                {t("fav.v2.otherImage")}
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <h2 className={sectionTitle}>{t("fav.v2.fit")}</h2>
                <Segmented<Fit>
                  label={t("fav.v2.fit")}
                  value={look.fit}
                  onChange={(v) => setLook((l) => ({ ...l, fit: v }))}
                  options={[
                    { value: "contain", label: t("fav.v2.fitContain") },
                    { value: "cover", label: t("fav.v2.fitCover") },
                  ]}
                />
                {notSquare && <p className="text-[12.5px] text-t-tertiary">{t("fav.v2.notSquare")}</p>}
                {lowRes && <p className="text-[12.5px] text-t-tertiary">{t("fav.v2.lowRes")}</p>}
              </div>
              <Slider
                label={t("fav.v2.padding")}
                value={Math.round(look.padding * 100)}
                min={0}
                max={30}
                onChange={(v) => setLook((l) => ({ ...l, padding: v / 100 }))}
                display={`${Math.round(look.padding * 100)}%`}
              />
              <div className="space-y-2">
                <h2 className={sectionTitle}>{t("fav.v2.background")}</h2>
                <div className="flex flex-wrap items-center gap-3">
                  <Segmented<"none" | "color">
                    label={t("fav.v2.background")}
                    value={look.background ? "color" : "none"}
                    onChange={setBackgroundMode}
                    options={[
                      { value: "none", label: t("fav.v2.transparent") },
                      { value: "color", label: t("ui.color") },
                    ]}
                  />
                  {look.background && (
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => pickBg(e.target.value)}
                      aria-label={t("fav.v2.background")}
                      className="h-10 w-12 cursor-pointer rounded-lg border border-border bg-surface p-1"
                    />
                  )}
                </div>
                {!look.background && <p className="text-[12.5px] text-t-tertiary">{t("fav.v2.appleBgNote")}</p>}
              </div>
              <div className="space-y-2">
                <h2 className={sectionTitle}>{t("fav.v2.shape")}</h2>
                <Segmented<Shape>
                  label={t("fav.v2.shape")}
                  value={look.shape}
                  onChange={(v) => setLook((l) => ({ ...l, shape: v }))}
                  options={[
                    { value: "square", label: t("fav.v2.square") },
                    { value: "rounded", label: t("fav.v2.rounded") },
                    { value: "circle", label: t("fav.v2.circle") },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Previews */}
          <div className={`glass space-y-5 rounded-2xl p-4 transition-opacity sm:p-5 ${busy && outputs ? "opacity-70" : ""}`} aria-busy={busy}>
            <div className="flex items-center justify-between gap-3">
              <h2 className={sectionTitle}>{t("ui.preview")}</h2>
              {busy && <Loader2 className="h-4 w-4 animate-spin text-t-tertiary" aria-label={t("ui.processing")} />}
            </div>

            <div className="space-y-2">
              <p className="text-[13px] font-medium text-t-secondary">{t("fav.v2.actualSize")}</p>
              <div className="flex flex-wrap items-end gap-6">
                {[16, 32, 48].map((s) => (
                  <div key={s} className="flex flex-col items-center gap-1.5">
                    <div className="flex items-end gap-2">
                      {[false, true].map((dark) => (
                        <span key={String(dark)} className="flex items-center justify-center rounded-md p-2" style={{ background: dark ? "#202124" : "#ffffff", border: "1px solid rgb(var(--border-rgb))" }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {icon(String(s)) ? <img src={icon(String(s))} alt="" width={s} height={s} style={{ width: s, height: s }} /> : <span style={{ width: s, height: s }} />}
                        </span>
                      ))}
                    </div>
                    <span className="text-[12px] tabular-nums text-t-tertiary">
                      {s}×{s}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-[13px] font-medium text-t-secondary">{t("fav.v2.browserTab")}</p>
                {tabMock(false)}
                {tabMock(true)}
              </div>
              <div className="space-y-2">
                <p className="text-[13px] font-medium text-t-secondary">{t("fav.v2.homeScreen")}</p>
                {homeMock(false)}
                {homeMock(true)}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[13px] font-medium text-t-secondary">{t("fav.v2.maskable")}</p>
                <Toggle checked={showSafeZone} onChange={setShowSafeZone} label={t("fav.v2.safeZone")} />
              </div>
              <div className="flex flex-wrap items-center gap-5">
                {[
                  { label: t("fav.v2.maskFull"), radius: "16%" },
                  { label: t("fav.v2.circle"), radius: "50%" },
                  { label: t("fav.v2.maskSquircle"), radius: "32%" },
                ].map((m, i) => (
                  <div key={m.label} className="flex flex-col items-center gap-1.5">
                    <div className="relative h-24 w-24 overflow-hidden" style={{ borderRadius: i === 0 ? 8 : m.radius }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {icon("icon-maskable-512.png") && <img src={icon("icon-maskable-512.png")} alt="" className="h-full w-full" />}
                      {showSafeZone && i === 0 && (
                        <span className="pointer-events-none absolute inset-[10%] rounded-full border-2 border-dashed border-volt" aria-hidden />
                      )}
                    </div>
                    <span className="text-[12px] text-t-tertiary">{m.label}</span>
                  </div>
                ))}
              </div>
              <p className="text-[12.5px] text-t-tertiary">{t("fav.v2.maskableHint")}</p>
            </div>
          </div>

          {/* Files */}
          <div className="glass space-y-3 rounded-2xl p-4 sm:p-5">
            <h2 className={sectionTitle}>{t("fav.v2.files")}</h2>
            <ul className="divide-y divide-border">
              {deliverables.map((f) => (
                <li key={f.name} className="flex items-center gap-3 py-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.name === "favicon.ico" ? icon("48") : f.url} alt="" className="h-8 w-8 shrink-0 rounded object-contain" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[13px] text-t-primary">{f.name}</p>
                    <p className="text-[12px] text-t-tertiary">
                      {f.name === "favicon.ico"
                        ? t("fav.v2.icoDesc")
                        : f.name === "icon.svg"
                          ? t("fav.v2.svgDesc")
                          : f.name === "apple-touch-icon.png"
                            ? t("fav.v2.appleDesc")
                            : f.name === "icon-maskable-512.png"
                              ? t("fav.v2.maskableDesc")
                              : t("fav.v2.androidDesc", { size: f.size })}
                      {" · "}
                      {formatFileSize(f.blob.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => downloadBlob(f.blob, f.name)}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-t-primary hover:bg-bg-secondary disabled:opacity-40"
                    aria-label={t("fav.ui.downloadFile", { file: f.name })}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </li>
              ))}
              {!outputs && (
                <li className="flex items-center gap-2 py-3 text-[13px] text-t-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {t("ui.processing")}
                </li>
              )}
            </ul>
          </div>

          {/* App details */}
          <div className="glass space-y-4 rounded-2xl p-4 sm:p-5">
            <h2 className={sectionTitle}>{t("fav.v2.appDetails")}</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-[13px] text-t-secondary">{t("fav.appName")}</span>
                <input
                  type="text"
                  value={appName}
                  maxLength={60}
                  placeholder="My App"
                  onChange={(e) => setAppName(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-[14px] text-t-primary focus:border-accent focus:outline-none"
                />
              </label>
              <label className="block">
                <span className="text-[13px] text-t-secondary">{t("fav.v2.shortName")}</span>
                <input
                  type="text"
                  value={shortName}
                  maxLength={30}
                  placeholder={name.slice(0, 12)}
                  onChange={(e) => setShortName(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-border bg-surface px-3 text-[14px] text-t-primary focus:border-accent focus:outline-none"
                />
                {short.length > 12 && <span className="mt-1 block text-[12px] text-t-tertiary">{t("fav.v2.shortNameLong")}</span>}
              </label>
              {colorField(t("fav.themeColor"), themeInput, setThemeInput, themeValid, themeColor)}
              {colorField(t("fav.bgColor"), manifestBgInput, setManifestBgInput, manifestBgValid, manifestBg)}
            </div>
          </div>

          {/* Code */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {[
              { title: t("fav.htmlSnippet"), hint: t("fav.htmlSnippetHint"), code: snippet },
              { title: "site.webmanifest", hint: t("fav.manifestHint"), code: manifest },
            ].map((block) => (
              <div key={block.title} className="glass min-w-0 space-y-2 rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className={sectionTitle}>{block.title}</h2>
                  <button type="button" onClick={() => copy(block.code)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-t-primary hover:bg-bg-secondary">
                    <Copy className="h-4 w-4" aria-hidden />
                    {t("ui.copy")}
                  </button>
                </div>
                <p className="text-[12.5px] text-t-tertiary">{block.hint}</p>
                <pre dir="ltr" className="max-h-64 overflow-auto rounded-lg border border-border bg-bg-secondary p-3 text-start font-mono text-[12px] text-t-primary">
                  {block.code}
                </pre>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={downloadZip} disabled={!outputs || busy || zipping} className={buttonPrimary}>
              {busy || zipping ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
              {busy ? t("fav.v2.updating") : t("fav.v2.downloadPackage")}
            </button>
            {outputs && !busy && (
              <span className="inline-flex items-center gap-1.5 text-[13px] text-t-secondary">
                <Check className="h-4 w-4" aria-hidden />
                {t("fav.v2.packageContents", { count: deliverables.length + 2 })}
              </span>
            )}
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
