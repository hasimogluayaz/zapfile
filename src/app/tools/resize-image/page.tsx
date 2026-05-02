"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProcessButton from "@/components/ProcessButton";
import DownloadButton from "@/components/DownloadButton";
import FileSizeCompare from "@/components/FileSizeCompare";
import {
  formatFileSize,
  getFileNameWithoutExtension,
  getFileExtension,
} from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

const MAX_BATCH = 40;

type FitMode = "contain" | "cover" | "stretch";
type OutputFormat = "original" | "jpeg" | "png" | "webp";
type ConcreteFormat = Exclude<OutputFormat, "original">;
type ResizeResult = { file: File; blob: Blob; filename: string };

function getSourceFormat(file: File): ConcreteFormat {
  const ext = getFileExtension(file.name).toLowerCase();
  if (ext === ".png") return "png";
  if (ext === ".webp") return "webp";
  return "jpeg";
}

function resolveOutputFormat(
  file: File,
  outputFormat: OutputFormat,
): ConcreteFormat {
  return outputFormat === "original" ? getSourceFormat(file) : outputFormat;
}

function getMimeType(format: ConcreteFormat): string {
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  return "image/jpeg";
}

function getOutputExtension(format: ConcreteFormat): string {
  if (format === "png") return ".png";
  if (format === "webp") return ".webp";
  return ".jpg";
}

async function resizeFileToBlob(
  file: File,
  width: number,
  height: number,
  options: {
    fitMode: FitMode;
    outputFormat: OutputFormat;
    quality: number;
    backgroundColor: string;
  },
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });

  const format = resolveOutputFormat(file, options.outputFormat);
  if (options.fitMode === "contain" || format === "jpeg") {
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, width, height);
  }

  let drawWidth = width;
  let drawHeight = height;
  let dx = 0;
  let dy = 0;

  if (options.fitMode !== "stretch") {
    const scale =
      options.fitMode === "contain"
        ? Math.min(width / img.naturalWidth, height / img.naturalHeight)
        : Math.max(width / img.naturalWidth, height / img.naturalHeight);
    drawWidth = img.naturalWidth * scale;
    drawHeight = img.naturalHeight * scale;
    dx = (width - drawWidth) / 2;
    dy = (height - drawHeight) / 2;
  }

  ctx.drawImage(img, dx, dy, drawWidth, drawHeight);
  URL.revokeObjectURL(url);

  const mimeType = getMimeType(format);
  const quality = format === "png" ? undefined : options.quality / 100;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Failed to create image")),
      mimeType,
      quality,
    );
  });
}

export default function ResizeImagePage() {
  const { t, locale } = useI18n();
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [lockRatio, setLockRatio] = useState(true);
  const [fitMode, setFitMode] = useState<FitMode>("contain");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("original");
  const [quality, setQuality] = useState(90);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<ResizeResult[]>([]);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);

  const copy =
    locale === "tr"
      ? {
          fitTitle: "Sigdirma bicimi",
          contain: "Tam sigdir",
          cover: "Kirp ve doldur",
          stretch: "Esnet",
          outputTitle: "Cikti ayarlari",
          format: "Format",
          quality: "Kalite",
          background: "Bos alan rengi",
          social: "Toplu islem",
          firstImage: "Ilk gorsel",
          currentOutput: "Cikis",
        }
      : {
          fitTitle: "Fit mode",
          contain: "Fit inside",
          cover: "Crop to fill",
          stretch: "Stretch",
          outputTitle: "Output settings",
          format: "Format",
          quality: "Quality",
          background: "Empty space color",
          social: "Batch",
          firstImage: "First image",
          currentOutput: "Output",
        };

  const fitLabels: Record<FitMode, string> = {
    contain: copy.contain,
    cover: copy.cover,
    stretch: copy.stretch,
  };

  const ratio = originalWidth / originalHeight || 1;
  const finalFormat =
    files[0] ? resolveOutputFormat(files[0], outputFormat).toUpperCase() : "";

  const handleFilesSelected = useCallback((selected: File[]) => {
    const list = selected.slice(0, MAX_BATCH);
    if (list.length === 0) return;

    setFiles(list);
    setResults([]);
    setZipBlob(null);

    const firstFile = list[0]!;
    const img = new Image();
    img.onload = () => {
      setOriginalWidth(img.naturalWidth);
      setOriginalHeight(img.naturalHeight);
      setWidth(img.naturalWidth);
      setHeight(img.naturalHeight);
      URL.revokeObjectURL(img.src);
    };
    img.src = URL.createObjectURL(firstFile);

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(firstFile);
  }, []);

  const handleWidthChange = (value: number) => {
    setWidth(value);
    if (lockRatio) setHeight(Math.round(value / ratio));
  };

  const handleHeightChange = (value: number) => {
    setHeight(value);
    if (lockRatio) setWidth(Math.round(value * ratio));
  };

  const presetSizes =
    originalWidth > 0
      ? [
          {
            label: "25%",
            w: Math.round(originalWidth * 0.25),
            h: Math.round(originalHeight * 0.25),
          },
          {
            label: "50%",
            w: Math.round(originalWidth * 0.5),
            h: Math.round(originalHeight * 0.5),
          },
          {
            label: "75%",
            w: Math.round(originalWidth * 0.75),
            h: Math.round(originalHeight * 0.75),
          },
          { label: "HD 1280", w: 1280, h: Math.round(1280 / ratio) },
          { label: "FHD 1920", w: 1920, h: Math.round(1920 / ratio) },
          { label: "4K 3840", w: 3840, h: Math.round(3840 / ratio) },
          { label: "1:1 1080", w: 1080, h: 1080 },
          { label: "16:9 1280", w: 1280, h: 720 },
          { label: "Story", w: 1080, h: 1920 },
        ]
      : [];

  const handleProcess = async () => {
    if (files.length === 0 || width <= 0 || height <= 0) return;
    setProcessing(true);
    setResults([]);
    setZipBlob(null);

    try {
      const out: ResizeResult[] = [];

      for (const file of files) {
        const format = resolveOutputFormat(file, outputFormat);
        const blob = await resizeFileToBlob(file, width, height, {
          fitMode,
          outputFormat,
          quality,
          backgroundColor,
        });
        const filename = `${getFileNameWithoutExtension(file.name)}-${width}x${height}${getOutputExtension(format)}`;
        out.push({ file, blob, filename });
      }

      setResults(out);

      if (out.length > 1) {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        for (const { filename, blob } of out) {
          zip.file(filename, blob);
        }
        setZipBlob(await zip.generateAsync({ type: "blob" }));
      }

      toast.success(
        t("resimg.successBatch", { count: out.length, w: width, h: height }),
      );
    } catch (error) {
      console.error(error);
      toast.error(t("resimg.fail"));
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setPreview(null);
    setResults([]);
    setZipBlob(null);
    setOriginalWidth(0);
    setOriginalHeight(0);
    setWidth(0);
    setHeight(0);
  };

  const totalIn = results.reduce((sum, result) => sum + result.file.size, 0);
  const totalOut = results.reduce((sum, result) => sum + result.blob.size, 0);

  return (
    <ToolLayout
      toolName="Resize Image"
      toolDescription="Change image dimensions with aspect ratio control. Supports JPG, PNG, and WebP - batch processing supported."
    >
      <div className="space-y-6">
        {files.length === 0 ? (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{
              "image/jpeg": [".jpg", ".jpeg"],
              "image/png": [".png"],
              "image/webp": [".webp"],
            }}
            multiple
            formats={["JPG", "PNG", "WEBP"]}
            label="Drop images here or click to browse (batch supported)"
          />
        ) : results.length === 0 ? (
          <>
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-brand-text font-medium">
                  {t("resimg.selected", { count: files.length })}
                </h3>
                <button
                  onClick={reset}
                  className="text-sm text-brand-muted hover:text-red-400 transition-colors"
                >
                  {t("ui.clearAll")}
                </button>
              </div>

              <div className="space-y-2 max-h-40 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                  >
                    <span className="text-sm text-brand-text truncate max-w-[70%]">
                      {file.name}
                    </span>
                    <span className="text-sm text-brand-muted">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                ))}
              </div>

              {preview && files[0] && (
                <div className="flex justify-center mt-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt=""
                    className="max-h-40 rounded-lg border border-white/10"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <p className="text-xs text-brand-muted">{copy.firstImage}</p>
                  <p className="text-sm font-semibold text-brand-text">
                    {originalWidth} x {originalHeight}
                  </p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <p className="text-xs text-brand-muted">{copy.currentOutput}</p>
                  <p className="text-sm font-semibold text-brand-text">
                    {finalFormat || "-"}
                  </p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <p className="text-xs text-brand-muted">{copy.fitTitle}</p>
                  <p className="text-sm font-semibold text-brand-text">
                    {fitLabels[fitMode]}
                  </p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <p className="text-xs text-brand-muted">{copy.social}</p>
                  <p className="text-sm font-semibold text-brand-text">
                    {files.length}/{MAX_BATCH}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-brand-text">
                {t("resimg.outputSize")}
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-brand-muted mb-2">
                    {t("resimg.widthPx")}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={8192}
                    value={width}
                    onChange={(event) =>
                      handleWidthChange(Number(event.target.value))
                    }
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-brand-text focus:outline-none focus:border-brand-indigo/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-brand-muted mb-2">
                    {t("resimg.heightPx")}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={8192}
                    value={height}
                    onChange={(event) =>
                      handleHeightChange(Number(event.target.value))
                    }
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-brand-text focus:outline-none focus:border-brand-indigo/50"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lockRatio}
                  onChange={(event) => setLockRatio(event.target.checked)}
                  className="accent-brand-indigo"
                />
                <span className="text-sm text-brand-muted">
                  {t("ui.lockAspect")}
                </span>
              </label>

              {presetSizes.length > 0 && (
                <div>
                  <p className="text-sm text-brand-muted mb-2">
                    {t("resimg.presets")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {presetSizes.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setWidth(preset.w);
                          setHeight(preset.h);
                        }}
                        className="px-3 py-1.5 text-xs rounded-lg bg-white/5 text-brand-muted hover:text-brand-text hover:bg-white/10 transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="glass rounded-xl p-6 space-y-5">
              <h3 className="font-semibold text-brand-text">
                {copy.fitTitle}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { value: "contain" as const, label: copy.contain },
                  { value: "cover" as const, label: copy.cover },
                  { value: "stretch" as const, label: copy.stretch },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFitMode(option.value)}
                    className={`px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                      fitMode === option.value
                        ? "bg-brand-indigo text-white shadow-lg shadow-brand-indigo/25"
                        : "bg-white/5 text-brand-muted hover:bg-white/10 hover:text-brand-text"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="glass rounded-xl p-6 space-y-5">
              <h3 className="font-semibold text-brand-text">
                {copy.outputTitle}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-brand-muted mb-2">
                    {copy.format}
                  </label>
                  <select
                    value={outputFormat}
                    onChange={(event) =>
                      setOutputFormat(event.target.value as OutputFormat)
                    }
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-brand-text focus:outline-none focus:border-brand-indigo/50"
                  >
                    <option value="original">Original</option>
                    <option value="jpeg">JPG</option>
                    <option value="png">PNG</option>
                    <option value="webp">WebP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-brand-muted mb-2">
                    {copy.background}
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(event) => setBackgroundColor(event.target.value)}
                      className="h-12 w-16 rounded-xl bg-white/5 border border-white/10 p-1"
                    />
                    <input
                      type="text"
                      value={backgroundColor}
                      onChange={(event) => setBackgroundColor(event.target.value)}
                      className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-brand-text focus:outline-none focus:border-brand-indigo/50"
                    />
                  </div>
                </div>
              </div>

              {files[0] &&
                resolveOutputFormat(files[0], outputFormat) !== "png" && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-brand-muted">{copy.quality}</span>
                      <span className="text-brand-text">{quality}%</span>
                    </div>
                    <input
                      type="range"
                      min={35}
                      max={100}
                      value={quality}
                      onChange={(event) => setQuality(Number(event.target.value))}
                      className="w-full accent-brand-indigo"
                    />
                  </div>
                )}
            </div>

            <ProcessButton
              onClick={handleProcess}
              loading={processing}
              disabled={width <= 0 || height <= 0}
              label={t("resimg.button", { w: width, h: height })}
              loadingLabel={t("resimg.resizing")}
            />
          </>
        ) : (
          <div className="space-y-6">
            {results.length > 1 && (
              <FileSizeCompare originalSize={totalIn} newSize={totalOut} />
            )}

            <div className="glass rounded-xl p-6">
              <h3 className="text-brand-text font-medium mb-4">
                {t("compimg.results")}
              </h3>
              <div className="space-y-3">
                {results.map((result, index) => (
                  <div
                    key={`${result.filename}-${index}`}
                    className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                  >
                    <span className="text-sm text-brand-text truncate flex-1 min-w-0">
                      {result.filename}
                    </span>
                    <span className="text-sm text-brand-muted whitespace-nowrap ml-4">
                      {formatFileSize(result.file.size)} -{" "}
                      {formatFileSize(result.blob.size)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 justify-center">
              {results.length === 1 ? (
                <DownloadButton
                  blob={results[0]!.blob}
                  filename={results[0]!.filename}
                  label={t("resimg.download")}
                />
              ) : zipBlob ? (
                <DownloadButton
                  blob={zipBlob}
                  filename="resized-images.zip"
                  label={t("ui.downloadZip")}
                />
              ) : null}
              <button
                type="button"
                onClick={reset}
                className="px-6 py-3 rounded-xl font-semibold text-brand-text bg-white/5 hover:bg-white/10 transition-colors"
              >
                {t("resimg.another")}
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
