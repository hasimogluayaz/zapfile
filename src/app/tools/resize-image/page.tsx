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

async function resizeFileToBlob(
  file: File,
  width: number,
  height: number,
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
  ctx.drawImage(img, 0, 0, width, height);
  URL.revokeObjectURL(url);

  const ext = getFileExtension(file.name);
  const mimeType =
    ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
  const quality = mimeType === "image/png" ? undefined : 0.92;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to create image"))),
      mimeType,
      quality,
    );
  });
}

export default function ResizeImagePage() {
  const { t } = useI18n();
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [lockRatio, setLockRatio] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<{ file: File; blob: Blob }[]>([]);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);

  const ratio = originalWidth / originalHeight || 1;

  const handleFilesSelected = useCallback(
    (selected: File[]) => {
      const list = selected.slice(0, MAX_BATCH);
      setFiles(list);
      setResults([]);
      setZipBlob(null);

      const f = list[0];
      const img = new Image();
      img.onload = () => {
        setOriginalWidth(img.naturalWidth);
        setOriginalHeight(img.naturalHeight);
        setWidth(img.naturalWidth);
        setHeight(img.naturalHeight);
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(f);

      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    },
    [],
  );

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (lockRatio) setHeight(Math.round(val / ratio));
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (lockRatio) setWidth(Math.round(val * ratio));
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
          { label: "HD (1280)", w: 1280, h: Math.round(1280 / ratio) },
          { label: "FHD (1920)", w: 1920, h: Math.round(1920 / ratio) },
          { label: "4K (3840)", w: 3840, h: Math.round(3840 / ratio) },
        ]
      : [];

  const handleProcess = async () => {
    if (files.length === 0 || width <= 0 || height <= 0) return;
    setProcessing(true);
    setResults([]);
    setZipBlob(null);

    try {
      const out: { file: File; blob: Blob }[] = [];
      for (const file of files) {
        const blob = await resizeFileToBlob(file, width, height);
        out.push({ file, blob });
      }
      setResults(out);

      if (out.length > 1) {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        for (const { file, blob } of out) {
          const ext = getFileExtension(file.name);
          const base = getFileNameWithoutExtension(file.name);
          zip.file(`${base}-${width}x${height}${ext}`, blob);
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
  };

  const totalIn = results.reduce((s, r) => s + r.file.size, 0);
  const totalOut = results.reduce((s, r) => s + r.blob.size, 0);

  return (
    <ToolLayout
      toolName="Resize Image"
      toolDescription="Change image dimensions with aspect ratio control. Supports JPG, PNG, and WebP — batch processing supported."
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
                {files.map((file, i) => (
                  <div
                    key={i}
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
                    onChange={(e) => handleWidthChange(Number(e.target.value))}
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
                    onChange={(e) => handleHeightChange(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-brand-text focus:outline-none focus:border-brand-indigo/50"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lockRatio}
                  onChange={(e) => setLockRatio(e.target.checked)}
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
                {results.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                  >
                    <span className="text-sm text-brand-text truncate flex-1 min-w-0">
                      {r.file.name}
                    </span>
                    <span className="text-sm text-brand-muted whitespace-nowrap ml-4">
                      {formatFileSize(r.file.size)} → {formatFileSize(r.blob.size)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 justify-center">
              {results.length === 1 ? (
                <DownloadButton
                  blob={results[0].blob}
                  filename={`${getFileNameWithoutExtension(results[0].file.name)}-${width}x${height}${getFileExtension(results[0].file.name)}`}
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
