"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ImageCompareSlider from "@/components/ImageCompareSlider";
import ProgressBar from "@/components/ProgressBar";
import { downloadBlob, getFileNameWithoutExtension } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type OutputType = "foreground" | "mask" | "background";
type DeviceMode = "gpu" | "cpu";
type QualityPreset = "fast" | "balanced" | "detail";
type ExportFormat = "image/png" | "image/jpeg" | "image/webp";
type FillMode = "transparent" | "solid";
type PreviewSurface = "checker" | "dark" | "light";

function mimeToExtension(mime: ExportFormat) {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    default:
      return "png";
  }
}

function previewSurfaceClass(surface: PreviewSurface) {
  switch (surface) {
    case "dark":
      return "bg-slate-950";
    case "light":
      return "bg-white";
    default:
      return "bg-[linear-gradient(45deg,rgba(255,255,255,0.08)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.08)_75%),linear-gradient(45deg,rgba(255,255,255,0.08)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.08)_75%)] bg-[length:24px_24px] bg-[position:0_0,12px_12px]";
  }
}

function createImageFromUrl(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image load failed"));
    image.src = src;
  });
}

async function composeExportBlob(
  sourceBlob: Blob,
  format: ExportFormat,
  quality: number,
  fillMode: FillMode,
  fillColor: string,
) {
  if (format === "image/png" && fillMode === "transparent") {
    return sourceBlob;
  }

  const objectUrl = URL.createObjectURL(sourceBlob);
  try {
    const image = await createImageFromUrl(objectUrl);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");

    if (fillMode === "solid" || format !== "image/png") {
      ctx.fillStyle = fillColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(image, 0, 0);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Blob export failed"));
        },
        format,
        format === "image/png" ? undefined : quality,
      );
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function BackgroundRemoverPage() {
  const { locale } = useI18n();
  const copy = locale === "tr"
    ? {
        dropLabel: "Arka planını temizlemek istediğiniz görseli bırakın",
        settings: "İşleme ayarları",
        quality: "Kalite profili",
        outputType: "Çıktı türü",
        device: "İşlem cihazı",
        export: "Dışa aktarma",
        previewSurface: "Önizleme zemini",
        fast: "Hızlı",
        balanced: "Dengeli",
        detail: "Detaylı",
        foreground: "Konu",
        mask: "Maske",
        background: "Arka plan",
        gpu: "GPU",
        cpu: "CPU",
        transparent: "Şeffaf",
        solid: "Düz renk",
        checker: "Damalı",
        dark: "Koyu",
        light: "Açık",
        qualitySlider: "Kalite",
        fillColor: "Dolgu rengi",
        compare: "Önce / Sonra",
        resultPreview: "Sonuç önizlemesi",
        remove: "Arka planı kaldır",
        rerun: "Ayarlarla tekrar çalıştır",
        processing: "Yapay zeka işliyor...",
        preparing: "Model hazırlanıyor...",
        ready: "Sonuç hazır",
        download: "Çıktıyı indir",
        newImage: "Başka görsel seç",
        firstRun: "İlk çalıştırmada model dosyaları indirildiği için biraz daha uzun sürebilir.",
        privacy: "Tüm işlem tarayıcı içinde yapılır; görsel cihazınızı terk etmez.",
        success: "Arka plan kaldırma tamamlandı.",
        fail: "Arka plan kaldırılamadı. Lütfen başka bir görsel deneyin.",
        fallback: "AI modeli kullanılamadı, basit arka plan temizleme deneniyor.",
        fallbackSuccess: "Basit arka plan temizleme uygulandı.",
        summary: "Özet",
        format: "Biçim",
        mode: "Mod",
        profile: "Profil",
        invalidImage: "Lütfen geçerli bir görsel seçin.",
        original: "Orijinal",
        result: "Sonuç",
      }
    : {
        dropLabel: "Drop the image you want to clean up",
        settings: "Processing settings",
        quality: "Quality profile",
        outputType: "Output type",
        device: "Processing device",
        export: "Export",
        previewSurface: "Preview surface",
        fast: "Fast",
        balanced: "Balanced",
        detail: "Detailed",
        foreground: "Subject",
        mask: "Mask",
        background: "Background",
        gpu: "GPU",
        cpu: "CPU",
        transparent: "Transparent",
        solid: "Solid color",
        checker: "Checker",
        dark: "Dark",
        light: "Light",
        qualitySlider: "Quality",
        fillColor: "Fill color",
        compare: "Before / After",
        resultPreview: "Result preview",
        remove: "Remove background",
        rerun: "Run again with these settings",
        processing: "AI is processing...",
        preparing: "Preparing model...",
        ready: "Result ready",
        download: "Download output",
        newImage: "Try another image",
        firstRun: "The first run can take longer because the model assets need to download once.",
        privacy: "Everything runs in the browser, so your image never leaves your device.",
        success: "Background removal completed.",
        fail: "Background removal failed. Please try another image.",
        fallback: "The AI model was unavailable, falling back to basic background removal.",
        fallbackSuccess: "Basic background removal applied.",
        summary: "Summary",
        format: "Format",
        mode: "Mode",
        profile: "Profile",
        invalidImage: "Please choose a valid image.",
        original: "Original",
        result: "Result",
      };

  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [rawResultBlob, setRawResultBlob] = useState<Blob | null>(null);
  const [displayBlob, setDisplayBlob] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusLabel, setStatusLabel] = useState("");

  const [qualityPreset, setQualityPreset] = useState<QualityPreset>("balanced");
  const [outputType, setOutputType] = useState<OutputType>("foreground");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("gpu");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("image/png");
  const [exportQuality, setExportQuality] = useState(0.92);
  const [fillMode, setFillMode] = useState<FillMode>("transparent");
  const [fillColor, setFillColor] = useState("#ffffff");
  const [previewSurface, setPreviewSurface] = useState<PreviewSurface>("checker");

  useEffect(() => {
    return () => {
      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [originalUrl, resultUrl]);

  useEffect(() => {
    let cancelled = false;

    async function updateDisplayBlob() {
      if (!rawResultBlob) {
        setDisplayBlob(null);
        setResultUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return null;
        });
        return;
      }

      try {
        const composed = await composeExportBlob(
          rawResultBlob,
          exportFormat,
          exportQuality,
          fillMode,
          fillColor,
        );
        if (cancelled) return;

        setDisplayBlob(composed);
        setResultUrl((current) => {
          if (current) URL.revokeObjectURL(current);
          return URL.createObjectURL(composed);
        });
      } catch (error) {
        console.error(error);
      }
    }

    void updateDisplayBlob();
    return () => {
      cancelled = true;
    };
  }, [exportFormat, exportQuality, fillColor, fillMode, rawResultBlob]);

  const summaryValues = useMemo(
    () => ({
      mode:
        outputType === "foreground"
          ? copy.foreground
          : outputType === "mask"
            ? copy.mask
            : copy.background,
      profile:
        qualityPreset === "fast"
          ? copy.fast
          : qualityPreset === "detail"
            ? copy.detail
            : copy.balanced,
      format: exportFormat.replace("image/", "").toUpperCase(),
    }),
    [
      copy.background,
      copy.balanced,
      copy.detail,
      copy.fast,
      copy.foreground,
      copy.mask,
      exportFormat,
      outputType,
      qualityPreset,
    ],
  );

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      const nextFile = files[0];
      if (!nextFile || !nextFile.type.startsWith("image/")) {
        toast.error(copy.invalidImage);
        return;
      }

      if (originalUrl) URL.revokeObjectURL(originalUrl);
      if (resultUrl) URL.revokeObjectURL(resultUrl);

      setFile(nextFile);
      setOriginalUrl(URL.createObjectURL(nextFile));
      setRawResultBlob(null);
      setDisplayBlob(null);
      setResultUrl(null);
      setProgress(0);
      setStatusLabel("");
    },
    [copy.invalidImage, originalUrl, resultUrl],
  );

  const handleRemove = useCallback(async () => {
    if (!file) return;

    setProcessing(true);
    setProgress(5);
    setStatusLabel(copy.preparing);

    try {
      const {
        removeBackground,
        removeForeground,
        segmentForeground,
      } = await import("@imgly/background-removal");
      const model =
        qualityPreset === "fast"
          ? "isnet_quint8"
          : qualityPreset === "detail"
            ? "isnet"
            : "isnet_fp16";

      const worker =
        outputType === "foreground"
          ? removeBackground
          : outputType === "background"
            ? removeForeground
            : segmentForeground;

      const blob = await worker(file, {
        device: deviceMode,
        model,
        output: {
          format: "image/png",
          quality: exportQuality,
        },
        progress: (_key: string, current: number, total: number) => {
          const ratio = total > 0 ? current / total : 0;
          setProgress(8 + Math.round(ratio * 62));
          setStatusLabel(copy.preparing);
        },
      });

      setProgress(82);
      setStatusLabel(copy.processing);
      setRawResultBlob(blob);
      setProgress(100);
      setStatusLabel(copy.ready);
      toast.success(copy.success);
    } catch (error) {
      console.error(error);
      toast.error(copy.fallback);

      try {
        const blob = await canvasRemoveBackground(file);
        setRawResultBlob(blob);
        setProgress(100);
        setStatusLabel(copy.ready);
        toast.success(copy.fallbackSuccess);
      } catch (fallbackError) {
        console.error(fallbackError);
        toast.error(copy.fail);
      }
    } finally {
      setProcessing(false);
    }
  }, [
    copy.fail,
    copy.fallback,
    copy.fallbackSuccess,
    copy.preparing,
    copy.processing,
    copy.ready,
    copy.success,
    deviceMode,
    exportQuality,
    file,
    outputType,
    qualityPreset,
  ]);

  const handleReset = useCallback(() => {
    if (originalUrl) URL.revokeObjectURL(originalUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(null);
    setOriginalUrl(null);
    setRawResultBlob(null);
    setDisplayBlob(null);
    setResultUrl(null);
    setProcessing(false);
    setProgress(0);
    setStatusLabel("");
  }, [originalUrl, resultUrl]);

  const handleDownload = useCallback(() => {
    if (!displayBlob || !file) return;
    const extension = mimeToExtension(exportFormat);
    downloadBlob(displayBlob, `${getFileNameWithoutExtension(file.name)}-${outputType}.${extension}`);
  }, [displayBlob, exportFormat, file, outputType]);

  return (
    <ToolLayout
      toolName="Background Remover"
      toolDescription="Remove image backgrounds with quality presets, output modes, and export controls that stay in your browser."
    >
      <div className="space-y-6">
        {!file && (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{
              "image/jpeg": [".jpg", ".jpeg"],
              "image/png": [".png"],
              "image/webp": [".webp"],
            }}
            multiple={false}
            label={copy.dropLabel}
            formats={["JPG", "PNG", "WEBP"]}
          />
        )}

        {file && (
          <>
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_460px] lg:items-start">
              <div className="glass rounded-2xl p-5 space-y-4 lg:sticky lg:top-20">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-t-primary">{copy.compare}</p>
                    <p className="mt-1 text-xs text-t-secondary">{file.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="rounded-xl border border-border bg-bg-secondary px-4 py-2 text-sm font-medium text-t-secondary transition-colors hover:text-t-primary"
                  >
                    {copy.newImage}
                  </button>
                </div>

                {resultUrl && originalUrl ? (
                  <ImageCompareSlider
                    beforeSrc={originalUrl}
                    afterSrc={resultUrl}
                    beforeLabel={copy.original}
                    afterLabel={copy.result}
                    frameClassName="aspect-[4/3] max-h-[calc(100vh-17rem)]"
                  />
                ) : (
                  <div className="rounded-2xl border border-border bg-bg-secondary/60 p-4">
                    {originalUrl && (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={originalUrl}
                          alt={copy.original}
                          className="mx-auto max-h-[calc(100vh-17rem)] rounded-xl object-contain"
                        />
                      </>
                    )}
                  </div>
                )}

                {resultUrl && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-t-primary">{copy.resultPreview}</p>
                      <div className="flex flex-wrap gap-2">
                        {([
                          ["checker", copy.checker],
                          ["dark", copy.dark],
                          ["light", copy.light],
                        ] as const).map(([value, label]) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setPreviewSurface(value)}
                            className={`rounded-lg border px-3 py-1.5 text-[12px] transition-colors ${
                              previewSurface === value
                                ? "border-accent bg-accent/15 text-t-primary"
                                : "border-border bg-bg-secondary text-t-secondary hover:border-accent/40"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className={`rounded-2xl border border-border p-5 ${previewSurfaceClass(previewSurface)}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={resultUrl}
                        alt={copy.result}
                        className="mx-auto max-h-[calc(100vh-22rem)] rounded-xl object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-5 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:pr-1">
                <div className="glass rounded-2xl p-5 space-y-4">
                  <p className="text-sm font-semibold text-t-primary">{copy.settings}</p>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-t-secondary">
                      {copy.quality}
                    </label>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {([
                        ["fast", copy.fast],
                        ["balanced", copy.balanced],
                        ["detail", copy.detail],
                      ] as const).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setQualityPreset(value)}
                          className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                            qualityPreset === value
                              ? "border-accent bg-accent/15 text-t-primary"
                              : "border-border bg-bg-secondary text-t-secondary hover:border-accent/40 hover:text-t-primary"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-t-secondary">
                      {copy.outputType}
                    </label>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {([
                        ["foreground", copy.foreground],
                        ["mask", copy.mask],
                        ["background", copy.background],
                      ] as const).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setOutputType(value)}
                          className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                            outputType === value
                              ? "border-accent bg-accent/15 text-t-primary"
                              : "border-border bg-bg-secondary text-t-secondary hover:border-accent/40 hover:text-t-primary"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-t-secondary">
                      {copy.device}
                    </label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {([
                        ["gpu", copy.gpu],
                        ["cpu", copy.cpu],
                      ] as const).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setDeviceMode(value)}
                          className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                            deviceMode === value
                              ? "border-accent bg-accent/15 text-t-primary"
                              : "border-border bg-bg-secondary text-t-secondary hover:border-accent/40 hover:text-t-primary"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="glass rounded-2xl p-5 space-y-4">
                  <p className="text-sm font-semibold text-t-primary">{copy.export}</p>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-t-secondary">
                        {copy.format}
                      </label>
                      <select
                        value={exportFormat}
                        onChange={(event) => setExportFormat(event.target.value as ExportFormat)}
                        className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-t-primary focus:border-accent/50 focus:outline-none"
                      >
                        <option value="image/png">PNG</option>
                        <option value="image/jpeg">JPG</option>
                        <option value="image/webp">WEBP</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-t-secondary">
                        {copy.previewSurface}
                      </label>
                      <select
                        value={fillMode}
                        onChange={(event) => setFillMode(event.target.value as FillMode)}
                        className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-t-primary focus:border-accent/50 focus:outline-none"
                      >
                        <option value="transparent">{copy.transparent}</option>
                        <option value="solid">{copy.solid}</option>
                      </select>
                    </div>
                  </div>

                  {(exportFormat !== "image/png" || fillMode === "solid") && (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-t-secondary">
                        {copy.fillColor}
                      </label>
                      <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-secondary px-3 py-2">
                        <input
                          type="color"
                          value={fillColor}
                          onChange={(event) => setFillColor(event.target.value)}
                          className="h-9 w-9 rounded-lg border border-border bg-transparent p-0.5"
                        />
                        <span className="text-sm font-mono text-t-secondary">{fillColor}</span>
                      </div>
                    </div>
                  )}

                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm text-t-secondary">
                      <label>{copy.qualitySlider}</label>
                      <span className="font-mono">{Math.round(exportQuality * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={1}
                      step={0.01}
                      value={exportQuality}
                      onChange={(event) => setExportQuality(Number(event.target.value))}
                      className="w-full accent-accent"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-border bg-bg-secondary/60 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                        {copy.mode}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-t-primary">{summaryValues.mode}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-bg-secondary/60 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                        {copy.profile}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-t-primary">{summaryValues.profile}</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-bg-secondary/60 p-4">
                      <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                        {copy.format}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-t-primary">{summaryValues.format}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleRemove}
                    disabled={processing}
                    className={`rounded-2xl px-6 py-3 text-sm font-semibold text-white transition-all ${
                      processing
                        ? "cursor-not-allowed bg-bg-secondary text-t-secondary"
                        : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg hover:shadow-indigo-500/25"
                    }`}
                  >
                    {rawResultBlob ? copy.rerun : copy.remove}
                  </button>

                  {displayBlob && (
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                    >
                      {copy.download}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {(processing || progress > 0) && (
              <div className="glass rounded-2xl p-4 space-y-2">
                <ProgressBar progress={progress} label={statusLabel || copy.processing} />
                <p className="text-xs text-t-secondary">{copy.firstRun}</p>
              </div>
            )}

            <div className="glass rounded-2xl p-4 flex items-start gap-3">
              <svg
                className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <p className="text-xs text-t-tertiary">{copy.privacy}</p>
            </div>
          </>
        )}
      </div>
    </ToolLayout>
  );
}

async function canvasRemoveBackground(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const w = canvas.width;
      const h = canvas.height;
      const corners = [
        [0, 0],
        [w - 1, 0],
        [0, h - 1],
        [w - 1, h - 1],
      ];

      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      for (const [cx, cy] of corners) {
        const idx = (cy * w + cx) * 4;
        rSum += data[idx];
        gSum += data[idx + 1];
        bSum += data[idx + 2];
      }

      const bgR = rSum / 4;
      const bgG = gSum / 4;
      const bgB = bSum / 4;
      const threshold = 40;

      for (let index = 0; index < data.length; index += 4) {
        const dr = Math.abs(data[index] - bgR);
        const dg = Math.abs(data[index + 1] - bgG);
        const db = Math.abs(data[index + 2] - bgB);
        if (dr < threshold && dg < threshold && db < threshold) {
          data[index + 3] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      }, "image/png");
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image load failed"));
    };
    img.src = url;
  });
}
