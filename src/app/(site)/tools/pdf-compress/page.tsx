"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, Check, CircleCheck, FileText, Image as ImageIcon, Layers, Loader2, Sparkles, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProgressBar from "@/components/ProgressBar";
import FileSizeCompare from "@/components/FileSizeCompare";
import DownloadButton from "@/components/DownloadButton";
import { Segmented, Toggle, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { AbortError, processImage } from "@/lib/image-engine";
import { openPdf } from "@/lib/pdfjs";
import { RenderAbortError, renderPageToBitmap, yieldToBrowser } from "@/lib/pdf-to-images-render";
import { formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { pdfInputErrorKey, toEditablePdf } from "@/lib/pdf-input";
import { useI18n } from "@/lib/i18n";
import { compressPdf, inspectPdf } from "./client";
import type { InspectInfo } from "./protocol";

type Mode = "recommended" | "lossless" | "raster";
type ImagePreset = "high" | "balanced" | "small";
type RasterDpi = 96 | 150 | 200;

const IMAGE_PRESETS: Record<ImagePreset, { dpi: number; quality: number }> = {
  high: { dpi: 200, quality: 0.82 },
  balanced: { dpi: 150, quality: 0.72 },
  small: { dpi: 96, quality: 0.6 },
};

const RASTER_QUALITY: Record<RasterDpi, number> = { 96: 0.6, 150: 0.7, 200: 0.78 };

interface Settings {
  mode: Mode;
  imagePreset: ImagePreset;
  rasterDpi: RasterDpi;
  removeMetadata: boolean;
  objectStreams: boolean;
}

interface Result {
  key: string;
  blob: Blob;
  size: number;
  keptOriginal: boolean;
  replaced?: number;
  candidates?: number;
  capped?: boolean;
}

interface Progress {
  done: number;
  total: number;
  phase: "images" | "pages" | "saving" | "start";
}

/** Settings that affect the output of a given mode. */
function keyFor(mode: Mode, s: Settings): string {
  if (mode === "raster") return `raster:${s.rasterDpi}:${s.removeMetadata}`;
  if (mode === "lossless") return `lossless:${s.removeMetadata}:${s.objectStreams}`;
  return `recommended:${s.imagePreset}:${s.removeMetadata}:${s.objectStreams}`;
}

async function rasterize(
  bytes: Uint8Array,
  dpi: RasterDpi,
  removeMetadata: boolean,
  onProgress: (p: Progress) => void,
  signal: AbortSignal,
): Promise<{ bytes: Uint8Array; capped: boolean }> {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await openPdf(bytes);
  let capped = false;
  try {
    const out = await PDFDocument.create({ updateMetadata: false });
    if (!removeMetadata) {
      const meta = await pdf.getMetadata().catch(() => null);
      const info = (meta?.info ?? {}) as Record<string, unknown>;
      if (typeof info.Title === "string" && info.Title) out.setTitle(info.Title);
      if (typeof info.Author === "string" && info.Author) out.setAuthor(info.Author);
      if (typeof info.Subject === "string" && info.Subject) out.setSubject(info.Subject);
    }
    const total = pdf.numPages;
    const quality = RASTER_QUALITY[dpi];
    // Render page n+1 while the engine encodes page n.
    let pending: Promise<void> | null = null;
    let done = 0;
    for (let n = 1; n <= total; n++) {
      if (signal.aborted) throw new AbortError();
      const page = await pdf.getPage(n);
      const size = page.getViewport({ scale: 1 });
      const rendered = await renderPageToBitmap(page, dpi / 72, "#ffffff", signal);
      capped ||= rendered.capped;
      const encode = processImage(
        { input: rendered.bitmap as unknown as Blob, encode: { format: "image/jpeg", quality } },
        signal,
      );
      if (pending) await pending;
      const pageW = size.width;
      const pageH = size.height;
      pending = encode.then(async (res) => {
        const image = await out.embedJpg(await res.blob.arrayBuffer());
        const p = out.addPage([pageW, pageH]);
        p.drawImage(image, { x: 0, y: 0, width: pageW, height: pageH });
        done++;
        onProgress({ phase: "pages", done, total });
      });
      pending.catch(() => undefined); // surfaced by the await above / below
      await yieldToBrowser();
    }
    if (pending) await pending;
    onProgress({ phase: "saving", done: total, total });
    const saved = await out.save({ useObjectStreams: true, addDefaultPage: false, objectsPerTick: 50 });
    return { bytes: saved, capped };
  } finally {
    void pdf.destroy();
  }
}

export default function PdfCompressPage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [info, setInfo] = useState<InspectInfo | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [settings, setSettings] = useState<Settings>({
    mode: "recommended",
    imagePreset: "balanced",
    rasterDpi: 150,
    removeMetadata: true,
    objectStreams: true,
  });
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState<Progress>({ phase: "start", done: 0, total: 0 });
  const [result, setResult] = useState<Result | null>(null);
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const runRef = useRef<AbortController | null>(null);
  const loadRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      runRef.current?.abort();
      loadRef.current?.abort();
    },
    [],
  );

  const currentKey = keyFor(settings.mode, settings);
  const visibleResult = result && result.key === currentKey ? result : null;

  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));

  const handleFile = useCallback(
    async (files: File[]) => {
      const picked = files.find((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
      if (!picked) {
        toast.error(t("pdfcompress.ui.invalidFile"));
        return;
      }
      runRef.current?.abort();
      loadRef.current?.abort();
      const load = new AbortController();
      loadRef.current = load;
      setResult(null);
      setSizes({});
      setInfo(null);
      setProcessing(false);

      let pdf: File;
      try {
        pdf = await toEditablePdf(picked);
      } catch (error) {
        console.error(error);
        toast.error(t(pdfInputErrorKey(error)));
        return;
      }
      if (load.signal.aborted) return;
      const data = new Uint8Array(await pdf.arrayBuffer());
      setFile(pdf);
      setBytes(data);
      setInspecting(true);
      try {
        const inspected = await inspectPdf(data, load.signal);
        if (load.signal.aborted) return;
        setInfo(inspected);
        setSettings((s) => ({ ...s, mode: inspected.compressible > 0 ? "recommended" : "lossless" }));
      } catch (error) {
        if (error instanceof AbortError || load.signal.aborted) return;
        console.error(error);
        setFile(null);
        setBytes(null);
        toast.error(t("pdfcompress.ui.fail"));
      } finally {
        if (!load.signal.aborted) setInspecting(false);
      }
    },
    [t],
  );

  const handleCompress = useCallback(async () => {
    if (!file || !bytes) return;
    runRef.current?.abort();
    const run = new AbortController();
    runRef.current = run;
    const key = keyFor(settings.mode, settings);
    setProcessing(true);
    setResult(null);
    setProgress({ phase: "start", done: 0, total: 0 });

    try {
      let out: Uint8Array;
      let extra: Pick<Result, "replaced" | "candidates" | "capped"> = {};
      if (settings.mode === "raster") {
        const r = await rasterize(bytes, settings.rasterDpi, settings.removeMetadata, setProgress, run.signal);
        out = r.bytes;
        extra = { capped: r.capped };
      } else {
        const preset = IMAGE_PRESETS[settings.imagePreset];
        const r = await compressPdf(
          bytes,
          {
            mode: settings.mode,
            dpi: preset.dpi,
            quality: preset.quality,
            removeMetadata: settings.removeMetadata,
            objectStreams: settings.objectStreams,
          },
          (done, total) =>
            setProgress(done >= total && total > 0 ? { phase: "saving", done, total } : { phase: "images", done, total }),
          run.signal,
        );
        out = r.bytes;
        extra = { replaced: r.replaced, candidates: r.candidates };
      }
      if (run.signal.aborted) return;

      // Never hand back something bigger than what came in.
      const keptOriginal = out.length >= file.size;
      const blob = keptOriginal ? file : new Blob([out as BlobPart], { type: "application/pdf" });
      setResult({ key, blob, size: blob.size, keptOriginal, ...extra });
      setSizes((prev) => ({ ...prev, [key]: blob.size }));
      if (keptOriginal) toast(t("pdfcompress.ui.already"));
      else toast.success(t("pdfcompress.ui.success", { saved: Math.max(1, Math.round((1 - blob.size / file.size) * 100)) }));
    } catch (error) {
      if (error instanceof AbortError || error instanceof RenderAbortError || run.signal.aborted) return;
      console.error(error);
      toast.error(t("pdfcompress.ui.fail"));
    } finally {
      if (runRef.current === run) {
        runRef.current = null;
        setProcessing(false);
      }
    }
  }, [bytes, file, settings, t]);

  const cancel = useCallback(() => {
    runRef.current?.abort();
    runRef.current = null;
    setProcessing(false);
  }, []);

  const reset = useCallback(() => {
    runRef.current?.abort();
    loadRef.current?.abort();
    setFile(null);
    setBytes(null);
    setInfo(null);
    setInspecting(false);
    setResult(null);
    setSizes({});
    setProcessing(false);
  }, []);

  const progressValue = useMemo(() => {
    if (progress.phase === "saving") return 96;
    if (progress.total === 0) return 3;
    return 3 + (progress.done / progress.total) * 90;
  }, [progress]);

  const progressLabel =
    progress.phase === "images"
      ? t("pdfcompress.v2.progressImages", { done: progress.done, total: progress.total })
      : progress.phase === "pages"
        ? t("pdfcompress.v2.progressPages", { done: progress.done, total: progress.total })
        : progress.phase === "saving"
          ? t("pdfcompress.v2.saving")
          : t("pdfcompress.ui.compressing");

  const modes: { value: Mode; title: string; desc: string; icon: ReactNode }[] = [
    {
      value: "recommended",
      title: t("pdfcompress.v2.modeRecommended"),
      desc: t("pdfcompress.v2.modeRecommendedDesc"),
      icon: <Sparkles className="h-4 w-4" aria-hidden="true" />,
    },
    {
      value: "lossless",
      title: t("pdfcompress.v2.modeLossless"),
      desc: t("pdfcompress.v2.modeLosslessDesc"),
      icon: <FileText className="h-4 w-4" aria-hidden="true" />,
    },
    {
      value: "raster",
      title: t("pdfcompress.v2.modeFlatten"),
      desc: t("pdfcompress.v2.modeFlattenDesc"),
      icon: <Layers className="h-4 w-4" aria-hidden="true" />,
    },
  ];

  const outputName = file
    ? visibleResult?.keptOriginal
      ? file.name
      : `${getFileNameWithoutExtension(file.name)}-compressed.pdf`
    : "compressed.pdf";

  return (
    <ToolLayout
      toolName="PDF Compressor"
      toolDescription="Optimize PDFs losslessly or shrink them aggressively by repackaging pages as compressed images."
    >
      <div className="space-y-5">
        {!file ? (
          <FileDropzone
            onFilesSelected={handleFile}
            accept={{ "application/pdf": [".pdf"] }}
            label={t("pdfcompress.ui.dropLabel")}
            formats={["PDF"]}
          />
        ) : (
          <>
            <div className="glass rounded-2xl p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-[17px] font-semibold text-t-primary">{file.name}</p>
                  <p className="mt-1 text-[13px] text-t-secondary tabular-nums">
                    {formatFileSize(file.size)}
                    {info && <> · {t("pdfsec.pages", { count: info.pageCount })}</>}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[13px] text-t-tertiary">
                    {inspecting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                        {t("pdfcompress.v2.analyzing")}
                      </>
                    ) : info ? (
                      <>
                        <ImageIcon className="h-3.5 w-3.5" aria-hidden="true" />
                        {info.images > 0
                          ? t("pdfcompress.v2.summaryImages", {
                              count: info.images,
                              size: formatFileSize(info.imageBytes),
                              percent: Math.min(100, Math.round((info.imageBytes / Math.max(1, file.size)) * 100)),
                            })
                          : t("pdfcompress.v2.summaryNoImages")}
                      </>
                    ) : null}
                  </p>
                </div>
                <button type="button" onClick={reset} className={buttonSecondary}>
                  {t("pdfcompress.ui.newFile")}
                </button>
              </div>
            </div>

            <div className="glass rounded-2xl p-5 space-y-5">
              <div>
                <p className={sectionTitle}>{t("pdfsec.mode")}</p>
                <div className="mt-3 grid gap-3 md:grid-cols-3" role="radiogroup" aria-label={t("pdfsec.mode")}>
                  {modes.map((m) => {
                    const active = settings.mode === m.value;
                    const known = sizes[keyFor(m.value, settings)];
                    return (
                      <button
                        key={m.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => update({ mode: m.value })}
                        disabled={processing}
                        className={`rounded-2xl border p-4 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt disabled:opacity-60 ${
                          active ? "border-accent bg-accent/10" : "border-border bg-bg-secondary hover:border-accent/40"
                        }`}
                      >
                        <span className="flex items-center gap-2 text-[14px] font-semibold text-t-primary">
                          {m.icon}
                          {m.title}
                          {active && <Check className="ms-auto h-4 w-4" aria-hidden="true" />}
                        </span>
                        <span className="mt-1.5 block text-[12.5px] leading-snug text-t-secondary">{m.desc}</span>
                        {known !== undefined && (
                          <span className="mt-2 inline-block rounded-md bg-bg-tertiary px-2 py-0.5 text-[12px] font-medium tabular-nums text-t-primary">
                            {t("pdfcompress.v2.chipSize", { size: formatFileSize(known) })}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {settings.mode === "recommended" && (
                <div className="space-y-2">
                  <p className={sectionTitle}>{t("pdfcompress.v2.imageQuality")}</p>
                  <Segmented<ImagePreset>
                    label={t("pdfcompress.v2.imageQuality")}
                    value={settings.imagePreset}
                    onChange={(v) => update({ imagePreset: v })}
                    options={[
                      { value: "high", label: t("pdfcompress.v2.presetHigh", { dpi: 200 }) },
                      { value: "balanced", label: t("pdfcompress.v2.presetBalanced", { dpi: 150 }) },
                      { value: "small", label: t("pdfcompress.v2.presetSmall", { dpi: 96 }) },
                    ]}
                  />
                  <p className="text-[12.5px] leading-snug text-t-tertiary">{t("pdfcompress.v2.presetHint")}</p>
                  {info && info.compressible === 0 && (
                    <p className="flex items-start gap-2 rounded-xl border border-border bg-bg-secondary p-3 text-[13px] text-t-secondary">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      {t("pdfcompress.v2.noCandidates")}
                    </p>
                  )}
                </div>
              )}

              {settings.mode === "raster" && (
                <div className="space-y-2">
                  <p className={sectionTitle}>{t("pdfcompress.v2.pageResolution")}</p>
                  <Segmented<RasterDpi>
                    label={t("pdfcompress.v2.pageResolution")}
                    value={settings.rasterDpi}
                    onChange={(v) => update({ rasterDpi: v })}
                    options={([96, 150, 200] as RasterDpi[]).map((dpi) => ({
                      value: dpi,
                      label: t("pdfcompress.v2.dpi", { dpi }),
                    }))}
                  />
                  <p className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-[13px] text-t-secondary">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                    {t("pdfcompress.v2.flattenWarning")}
                  </p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Toggle
                  checked={settings.removeMetadata}
                  onChange={(v) => update({ removeMetadata: v })}
                  label={t("pdfcompress.ui.removeMetadata")}
                  description={t("pdfcompress.v2.metadataDesc")}
                  disabled={processing}
                />
                {settings.mode !== "raster" && (
                  <Toggle
                    checked={settings.objectStreams}
                    onChange={(v) => update({ objectStreams: v })}
                    label={t("pdfcompress.ui.objectStreams")}
                    description={t("pdfcompress.v2.objectStreamsDesc")}
                    disabled={processing}
                  />
                )}
              </div>
            </div>

            {processing ? (
              <div className="glass rounded-2xl p-4 flex items-center gap-4" aria-live="polite">
                <div className="min-w-0 flex-1">
                  <ProgressBar progress={progressValue} label={progressLabel} />
                </div>
                <button type="button" onClick={cancel} className={buttonSecondary}>
                  <X className="h-4 w-4" aria-hidden="true" />
                  {t("pdfcompress.v2.cancel")}
                </button>
              </div>
            ) : visibleResult ? (
              <div className="glass rounded-2xl p-5 space-y-4" aria-live="polite">
                <FileSizeCompare originalSize={file.size} newSize={visibleResult.size} />
                {visibleResult.keptOriginal ? (
                  <p className="flex items-start gap-2 text-[13.5px] text-t-secondary">
                    <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
                    {t("pdfcompress.v2.keptOriginal")}
                  </p>
                ) : (
                  visibleResult.candidates !== undefined &&
                  visibleResult.candidates > 0 && (
                    <p className="text-[13px] text-t-tertiary">
                      {t("pdfcompress.v2.imagesReplaced", {
                        done: visibleResult.replaced ?? 0,
                        total: visibleResult.candidates,
                      })}
                    </p>
                  )
                )}
                {visibleResult.capped && (
                  <p className="text-[13px] text-t-tertiary">{t("pdfcompress.v2.pagesCapped")}</p>
                )}
                <div className="flex flex-wrap gap-3">
                  <DownloadButton
                    blob={visibleResult.blob}
                    filename={outputName}
                    label={visibleResult.keptOriginal ? t("pdfcompress.v2.downloadOriginal") : t("pdfcompress.ui.download")}
                  />
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void handleCompress()}
                disabled={inspecting || !bytes}
                className={buttonPrimary}
              >
                {inspecting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {t("pdfcompress.ui.compress")}
              </button>
            )}
          </>
        )}
      </div>
    </ToolLayout>
  );
}
