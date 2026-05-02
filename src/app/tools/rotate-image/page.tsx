"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import { formatFileSize, getFileNameWithoutExtension, getFileExtension } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

const MAX_BATCH = 40;

type OutputFormat = "original" | "jpeg" | "png" | "webp";
type ConcreteFormat = Exclude<OutputFormat, "original">;
type RotateResult = { file: File; blob: Blob; filename: string };

function normalizeRotation(rotation: number) {
  return ((rotation % 360) + 360) % 360;
}

function getSourceFormat(file: File): ConcreteFormat {
  const ext = getFileExtension(file.name).toLowerCase();
  if (ext === ".png") return "png";
  if (ext === ".webp") return "webp";
  return "jpeg";
}

function resolveOutputFormat(file: File, outputFormat: OutputFormat): ConcreteFormat {
  return outputFormat === "original" ? getSourceFormat(file) : outputFormat;
}

function getMimeType(format: ConcreteFormat) {
  if (format === "png") return "image/png";
  if (format === "webp") return "image/webp";
  return "image/jpeg";
}

function getOutputExtension(format: ConcreteFormat) {
  if (format === "png") return ".png";
  if (format === "webp") return ".webp";
  return ".jpg";
}

function getRotatedSize(width: number, height: number, rotation: number) {
  const angle = (normalizeRotation(rotation) * Math.PI) / 180;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  return {
    w: Math.ceil(width * cos + height * sin),
    h: Math.ceil(width * sin + height * cos),
  };
}

async function transformFileToBlob(
  file: File,
  rotation: number,
  flipH: boolean,
  flipV: boolean,
  options: {
    outputFormat: OutputFormat;
    quality: number;
    backgroundColor: string;
  },
): Promise<Blob> {
  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });

  const format = resolveOutputFormat(file, options.outputFormat);
  const canvas = document.createElement("canvas");
  const size = getRotatedSize(img.naturalWidth, img.naturalHeight, rotation);
  canvas.width = size.w;
  canvas.height = size.h;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (format !== "png") {
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((normalizeRotation(rotation) * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  ctx.restore();
  URL.revokeObjectURL(url);

  const mimeType = getMimeType(format);
  const quality = format === "png" ? undefined : options.quality / 100;
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("export"))),
      mimeType,
      quality,
    );
  });
}

export default function RotateImagePage() {
  const { t, locale } = useI18n();
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("original");
  const [quality, setQuality] = useState(92);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [originalDims, setOriginalDims] = useState({ w: 0, h: 0 });
  const [resultBlobs, setResultBlobs] = useState<RotateResult[]>([]);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const copy =
    locale === "tr"
      ? {
          settings: "Donusum ayarlari",
          rotation: "Derece",
          output: "Cikti",
          quality: "Kalite",
          background: "Arka plan",
          current: "Mevcut cikti",
          reset: "Sifirla",
          exportAll: "Gorselleri hazirla",
          preparing: "Hazirlaniyor...",
          another: "Yeni gorsel",
          more: "daha",
        }
      : {
          settings: "Transform settings",
          rotation: "Degrees",
          output: "Output",
          quality: "Quality",
          background: "Background",
          current: "Current output",
          reset: "Reset",
          exportAll: "Prepare images",
          preparing: "Preparing...",
          another: "Another image",
          more: "more",
        };

  const redrawTransform = useCallback(
    (img: HTMLImageElement, rot: number, fH: boolean, fV: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const size = getRotatedSize(img.naturalWidth, img.naturalHeight, rot);
      canvas.width = size.w;
      canvas.height = size.h;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((normalizeRotation(rot) * Math.PI) / 180);
      ctx.scale(fH ? -1 : 1, fV ? -1 : 1);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();
      setPreview(canvas.toDataURL("image/png"));
    },
    [backgroundColor],
  );

  useEffect(() => {
    if (imgRef.current) {
      redrawTransform(imgRef.current, rotation, flipH, flipV);
    }
  }, [rotation, flipH, flipV, redrawTransform]);

  const handleFilesSelected = useCallback(
    (selected: File[]) => {
      const list = selected.slice(0, MAX_BATCH);
      if (list.length === 0) return;

      setFiles(list);
      setResultBlobs([]);
      setZipBlob(null);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);

      const firstFile = list[0]!;
      const img = new window.Image();
      const url = URL.createObjectURL(firstFile);
      img.onload = () => {
        setOriginalDims({ w: img.naturalWidth, h: img.naturalHeight });
        imgRef.current = img;
        redrawTransform(img, 0, false, false);
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        toast.error(t("ui.failedLoad"));
      };
      img.src = url;
    },
    [redrawTransform, t],
  );

  const rotateLeft = () => setRotation((value) => normalizeRotation(value - 90));
  const rotateRight = () => setRotation((value) => normalizeRotation(value + 90));

  const handleReset = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
  };

  const handleExport = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setResultBlobs([]);
    setZipBlob(null);

    try {
      const out: RotateResult[] = [];

      for (const file of files) {
        const format = resolveOutputFormat(file, outputFormat);
        const blob = await transformFileToBlob(file, rotation, flipH, flipV, {
          outputFormat,
          quality,
          backgroundColor,
        });
        const filename = `${getFileNameWithoutExtension(file.name)}-rotated${getOutputExtension(format)}`;
        out.push({ file, blob, filename });
      }

      setResultBlobs(out);

      if (out.length > 1) {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        for (const { filename, blob } of out) {
          zip.file(filename, blob);
        }
        setZipBlob(await zip.generateAsync({ type: "blob" }));
      }

      toast.success(t("rotimg.exported", { count: out.length }));
    } catch {
      toast.error(t("ui.failedExport"));
    } finally {
      setProcessing(false);
    }
  };

  const currentDims =
    originalDims.w > 0
      ? getRotatedSize(originalDims.w, originalDims.h, rotation)
      : null;

  const finalFormat =
    files[0] ? resolveOutputFormat(files[0], outputFormat).toUpperCase() : "";

  const reset = () => {
    setFiles([]);
    setPreview(null);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setResultBlobs([]);
    setZipBlob(null);
    setOriginalDims({ w: 0, h: 0 });
    imgRef.current = null;
  };

  return (
    <ToolLayout
      toolName="Rotate Image"
      toolDescription="Rotate by any angle, flip, and export as JPG, PNG, or WebP. Batch supported."
    >
      <canvas ref={canvasRef} className="hidden" />

      <div className="space-y-6">
        {files.length === 0 ? (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{
              "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"],
            }}
            multiple
            formats={["JPG", "PNG", "WEBP", "GIF", "BMP"]}
            label="Drop images here or click (batch supported)"
          />
        ) : resultBlobs.length === 0 ? (
          <>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-3 gap-4">
                <div>
                  <p className="text-[13px] font-medium text-brand-text">
                    {t("rotimg.batchHint", { count: files.length })}
                  </p>
                  <p className="text-[12px] text-brand-muted">
                    {files[0]?.name}
                    {files.length > 1 && ` + ${files.length - 1} ${copy.more}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="text-[12px] text-brand-muted hover:text-red-400 transition-colors flex-shrink-0"
                >
                  {t("ui.remove")}
                </button>
              </div>

              {preview && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt=""
                    className="max-h-72 max-w-full rounded-lg border border-white/10 object-contain"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <p className="text-xs text-brand-muted">Input</p>
                  <p className="text-sm font-semibold text-brand-text">
                    {originalDims.w} x {originalDims.h}
                  </p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <p className="text-xs text-brand-muted">{copy.current}</p>
                  <p className="text-sm font-semibold text-brand-text">
                    {currentDims ? `${currentDims.w} x ${currentDims.h}` : "-"}
                  </p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <p className="text-xs text-brand-muted">{copy.rotation}</p>
                  <p className="text-sm font-semibold text-brand-text">
                    {rotation} deg
                  </p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                  <p className="text-xs text-brand-muted">{copy.output}</p>
                  <p className="text-sm font-semibold text-brand-text">
                    {finalFormat || "-"}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass rounded-xl p-4 space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-brand-muted font-medium">
                  {copy.settings}
                </span>
                <span className="text-[12px] font-mono px-2.5 py-1 rounded-lg bg-white/5 text-brand-muted border border-white/10">
                  {rotation} deg {flipH && "H"} {flipV && "V"}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-brand-muted">
                    {copy.rotation}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={359}
                    value={rotation}
                    onChange={(event) =>
                      setRotation(normalizeRotation(Number(event.target.value)))
                    }
                    className="w-24 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-brand-text text-sm focus:outline-none focus:border-brand-indigo/50"
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={359}
                  value={rotation}
                  onChange={(event) => setRotation(Number(event.target.value))}
                  className="w-full accent-brand-indigo"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={rotateLeft}
                  className="px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-brand-muted hover:text-brand-text transition-all text-[12px] font-medium"
                >
                  -90 deg
                </button>
                <button
                  type="button"
                  onClick={rotateRight}
                  className="px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-brand-muted hover:text-brand-text transition-all text-[12px] font-medium"
                >
                  +90 deg
                </button>
                <button
                  type="button"
                  onClick={() => setFlipH((value) => !value)}
                  className={`px-3 py-3 rounded-xl transition-all text-[12px] font-medium ${
                    flipH
                      ? "bg-brand-indigo text-white"
                      : "bg-white/5 hover:bg-white/10 text-brand-muted hover:text-brand-text"
                  }`}
                >
                  Flip H
                </button>
                <button
                  type="button"
                  onClick={() => setFlipV((value) => !value)}
                  className={`px-3 py-3 rounded-xl transition-all text-[12px] font-medium ${
                    flipV
                      ? "bg-brand-indigo text-white"
                      : "bg-white/5 hover:bg-white/10 text-brand-muted hover:text-brand-text"
                  }`}
                >
                  Flip V
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-brand-muted hover:text-brand-text transition-all text-[12px] font-medium"
                >
                  {copy.reset}
                </button>
              </div>
            </div>

            <div className="glass rounded-xl p-4 space-y-5">
              <h3 className="text-brand-text font-semibold">{copy.output}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-brand-muted mb-2">
                    {copy.output}
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

            <button
              type="button"
              onClick={handleExport}
              disabled={processing || !preview}
              className={`w-full py-3 rounded-xl font-semibold text-[14px] text-white transition-all ${
                processing || !preview
                  ? "bg-white/10 cursor-not-allowed text-brand-muted"
                  : "bg-gradient-brand hover:shadow-lg hover:shadow-brand-indigo/25"
              }`}
            >
              {processing ? copy.preparing : copy.exportAll}
            </button>
          </>
        ) : (
          <div className="space-y-6">
            <div className="glass rounded-xl p-6">
              <h3 className="text-brand-text font-medium mb-4">
                {t("compimg.results")}
              </h3>
              <div className="space-y-3">
                {resultBlobs.map((result, index) => (
                  <div
                    key={`${result.filename}-${index}`}
                    className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                  >
                    <span className="text-sm text-brand-text truncate flex-1 min-w-0">
                      {result.filename}
                    </span>
                    <span className="text-sm text-brand-muted whitespace-nowrap ml-4">
                      {formatFileSize(result.blob.size)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 justify-center">
              {resultBlobs.length === 1 ? (
                <DownloadButton
                  blob={resultBlobs[0]!.blob}
                  filename={resultBlobs[0]!.filename}
                  label={t("ui.download")}
                />
              ) : zipBlob ? (
                <DownloadButton
                  blob={zipBlob}
                  filename="rotated-images.zip"
                  label={t("ui.downloadZip")}
                />
              ) : null}
              <button
                type="button"
                onClick={reset}
                className="px-6 py-3 rounded-xl font-semibold text-brand-text bg-white/5 hover:bg-white/10 transition-colors"
              >
                {copy.another}
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
