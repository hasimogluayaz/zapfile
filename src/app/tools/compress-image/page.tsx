"use client";

import { useState, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProcessButton from "@/components/ProcessButton";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import FileSizeCompare from "@/components/FileSizeCompare";
import ImageCompareSlider from "@/components/ImageCompareSlider";
import {
  formatFileSize,
  getFileNameWithoutExtension,
  downloadBlob,
} from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface CompressedFile {
  original: File;
  compressed: Blob;
  originalSize: number;
  compressedSize: number;
}

export default function CompressImagePage() {
  const { t } = useI18n();
  const [files, setFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState(0.7);
  const [maxDimension, setMaxDimension] = useState(1920);
  const [outputFormat, setOutputFormat] = useState<"original" | "webp">(
    "original",
  );
  const [urlReady, setUrlReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const q = params.get("quality");
    const m = params.get("maxDim");
    if (q) {
      const n = parseFloat(q);
      if (!Number.isNaN(n) && n >= 0.1 && n <= 1) setQuality(n);
    }
    if (m) {
      const d = parseInt(m, 10);
      if (!Number.isNaN(d) && d >= 320 && d <= 4096) setMaxDimension(d);
    }
    setUrlReady(true);
  }, []);

  useEffect(() => {
    if (!urlReady || typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("quality", String(quality));
    url.searchParams.set("maxDim", String(maxDimension));
    window.history.replaceState({}, "", url);
  }, [quality, maxDimension, urlReady]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<CompressedFile[]>([]);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);

  const handleFilesSelected = useCallback(
    (selected: File[]) => {
      const imageFiles = selected.filter((f) =>
        ["image/jpeg", "image/png", "image/webp"].includes(f.type),
      );
      if (imageFiles.length === 0) {
        toast.error(t("compimg.invalid"));
        return;
      }
      if (imageFiles.length < selected.length) {
        toast.error(
          t("compimg.skipped", { count: selected.length - imageFiles.length }),
        );
      }
      setFiles(imageFiles);
      setResults([]);
      setZipBlob(null);
      setProgress(0);
    },
    [t],
  );

  const handleCompress = useCallback(async () => {
    if (files.length === 0) return;

    setProcessing(true);
    setProgress(0);
    setResults([]);
    setZipBlob(null);

    try {
      const imageCompression = (await import("browser-image-compression"))
        .default;

      const compressed: CompressedFile[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        const targetType = outputFormat === "webp" ? "image/webp" : file.type;
        const options = {
          maxSizeMB: Infinity,
          maxWidthOrHeight: maxDimension,
          initialQuality: quality,
          useWebWorker: true,
          fileType: targetType as string,
        };

        const compressedFile = await imageCompression(file, options);
        const compressedBlob = new Blob([compressedFile], {
          type: compressedFile.type,
        });

        compressed.push({
          original: file,
          compressed: compressedBlob,
          originalSize: file.size,
          compressedSize: compressedBlob.size,
        });

        setProgress(Math.round(((i + 1) / files.length) * 90));
      }

      setResults(compressed);

      // If multiple files, create ZIP
      if (compressed.length > 1) {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();

        for (const item of compressed) {
          const ext =
            outputFormat === "webp"
              ? "webp"
              : item.original.name.split(".").pop() || "jpg";
          const baseName = getFileNameWithoutExtension(item.original.name);
          zip.file(`${baseName}-compressed.${ext}`, item.compressed);
        }

        const zipContent = await zip.generateAsync({ type: "blob" });
        setZipBlob(zipContent);
      }

      setProgress(100);

      const totalOriginal = compressed.reduce((s, r) => s + r.originalSize, 0);
      const totalCompressed = compressed.reduce(
        (s, r) => s + r.compressedSize,
        0,
      );
      const saved = totalOriginal - totalCompressed;

      if (saved > 0) {
        toast.success(
          t("compimg.success", {
            count: compressed.length,
            size: formatFileSize(saved),
          }),
        );
      } else {
        toast.success(t("compimg.optimized"));
      }
    } catch (error) {
      console.error("Compression error:", error);
      toast.error(t("compimg.fail"));
    } finally {
      setProcessing(false);
    }
  }, [files, quality, maxDimension, outputFormat, t]);

  const handleReset = useCallback(() => {
    setFiles([]);
    setResults([]);
    setZipBlob(null);
    setProgress(0);
  }, []);

  const totalOriginalSize = results.reduce((s, r) => s + r.originalSize, 0);
  const totalCompressedSize = results.reduce((s, r) => s + r.compressedSize, 0);

  const [comparePair, setComparePair] = useState<{
    before: string;
    after: string;
  } | null>(null);

  useEffect(() => {
    if (results.length !== 1) {
      setComparePair(null);
      return;
    }
    const r = results[0];
    const before = URL.createObjectURL(r.original);
    const after = URL.createObjectURL(r.compressed);
    setComparePair({ before, after });
    return () => {
      URL.revokeObjectURL(before);
      URL.revokeObjectURL(after);
    };
  }, [results]);

  const copyShareLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success(t("compimg.shareCopied"));
    } catch {
      toast.error(t("rmbg.fail"));
    }
  }, [t]);

  return (
    <ToolLayout
      toolName="Compress Image"
      toolDescription="Reduce image file sizes with adjustable quality. Batch processing supported. Everything happens in your browser."
    >
      <div className="space-y-6">
        {/* File Drop Area */}
        {files.length === 0 && (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{
              "image/jpeg": [".jpg", ".jpeg"],
              "image/png": [".png"],
              "image/webp": [".webp"],
            }}
            multiple
            label="Drop your images here or click to browse"
            formats={["jpg", "png", "webp"]}
          />
        )}

        {/* File List */}
        {files.length > 0 && results.length === 0 && (
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-brand-text font-medium">
                {t("compimg.selected", { count: files.length })}
              </h3>
              <button
                onClick={handleReset}
                className="text-brand-muted hover:text-brand-text transition-colors p-2 rounded-lg hover:bg-white/5"
                title={t("compimg.removeAll")}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
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
          </div>
        )}

        {/* Settings */}
        {files.length > 0 && results.length === 0 && (
          <div className="glass rounded-xl p-6 space-y-6">
            <h3 className="text-brand-text font-medium">
              {t("compimg.settings")}
            </h3>

            {/* Quality Slider */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-brand-muted">Quality</label>
                <span className="text-sm font-medium text-brand-text">
                  {Math.round(quality * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-brand-indigo"
              />
              <div className="flex justify-between text-xs text-brand-muted mt-1">
                <span>{t("compimg.smaller")}</span>
                <span>{t("compimg.higher")}</span>
              </div>
            </div>

            {/* Max Dimension */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-brand-muted">
                  {t("compimg.maxDim")}
                </label>
                <span className="text-sm font-medium text-brand-text">
                  {maxDimension}px
                </span>
              </div>
              <input
                type="range"
                min="320"
                max="4096"
                step="64"
                value={maxDimension}
                onChange={(e) => setMaxDimension(parseInt(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-brand-indigo"
              />
              <div className="flex justify-between text-xs text-brand-muted mt-1">
                <span>320px</span>
                <span>4096px</span>
              </div>
            </div>

            {/* Output Format */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-brand-muted">
                  {t("compimg.format") || "Output Format"}
                </label>
              </div>
              <div className="flex gap-2">
                {(["original", "webp"] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => setOutputFormat(fmt)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      outputFormat === fmt
                        ? "bg-brand-indigo/20 border border-brand-indigo text-brand-text"
                        : "bg-white/[0.04] border border-white/[0.08] text-brand-muted hover:border-white/20"
                    }`}
                  >
                    {fmt === "original"
                      ? t("compimg.keepFormat") || "Keep Original"
                      : "WebP"}
                  </button>
                ))}
              </div>
              {outputFormat === "webp" && (
                <p className="text-xs text-brand-muted mt-2 flex items-center gap-1.5">
                  <span className="text-emerald-400">✓</span>
                  {t("compimg.webpHint") ||
                    "WebP typically offers 25-35% smaller files with same quality"}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Progress */}
        {processing && (
          <ProgressBar progress={progress} label={t("compimg.compressing")} />
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            {results.length === 1 && comparePair && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-t-primary">
                  {t("compimg.compare")}
                </p>
                <ImageCompareSlider
                  beforeSrc={comparePair.before}
                  afterSrc={comparePair.after}
                  beforeLabel={t("ui.original")}
                  afterLabel={t("ui.result")}
                />
              </div>
            )}

            {/* Total summary */}
            {results.length > 1 && (
              <FileSizeCompare
                originalSize={totalOriginalSize}
                newSize={totalCompressedSize}
              />
            )}

            {/* Individual results */}
            <div className="glass rounded-xl p-6">
              <h3 className="text-brand-text font-medium mb-4">Results</h3>
              <div className="space-y-3">
                {results.map((result, i) => {
                  const saved = result.originalSize - result.compressedSize;
                  const pct =
                    result.originalSize > 0
                      ? ((saved / result.originalSize) * 100).toFixed(1)
                      : "0";
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between py-3 border-b border-white/5 last:border-0 gap-4"
                    >
                      <span className="text-sm text-brand-text truncate min-w-0 flex-1">
                        {result.original.name}
                      </span>
                      <span className="text-sm text-brand-muted whitespace-nowrap">
                        {formatFileSize(result.originalSize)} &rarr;{" "}
                        {formatFileSize(result.compressedSize)}
                      </span>
                      {saved > 0 && (
                        <span className="text-sm font-medium text-emerald-400 whitespace-nowrap">
                          -{pct}%
                        </span>
                      )}
                      {results.length === 1 && (
                        <button
                          onClick={() => {
                            const ext =
                              outputFormat === "webp"
                                ? "webp"
                                : result.original.name.split(".").pop() ||
                                  "jpg";
                            const baseName = getFileNameWithoutExtension(
                              result.original.name,
                            );
                            downloadBlob(
                              result.compressed,
                              `${baseName}-compressed.${ext}`,
                            );
                          }}
                          className="text-sm text-brand-indigo hover:text-brand-purple transition-colors whitespace-nowrap"
                        >
                          {t("compimg.download")}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-4">
          {files.length > 0 && results.length === 0 && (
            <ProcessButton
              onClick={handleCompress}
              disabled={files.length === 0}
              loading={processing}
              label={
                files.length > 1
                  ? t("compimg.buttonMulti", { count: files.length })
                  : t("compimg.button")
              }
              loadingLabel={t("compimg.compressing")}
            />
          )}

          {results.length === 1 && (
            <>
              <DownloadButton
                blob={results[0].compressed}
                filename={`${getFileNameWithoutExtension(results[0].original.name)}-compressed.${outputFormat === "webp" ? "webp" : results[0].original.name.split(".").pop() || "jpg"}`}
                label={t("compimg.download")}
              />
              <button
                type="button"
                onClick={copyShareLink}
                className="px-6 py-3 rounded-xl font-semibold text-t-secondary border border-border hover:bg-bg-secondary transition-colors"
              >
                {t("compimg.shareLink")}
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-3 rounded-xl font-semibold text-brand-muted border border-white/10 hover:text-brand-text hover:border-white/20 transition-all duration-300"
              >
                {t("compimg.more")}
              </button>
            </>
          )}

          {results.length > 1 && zipBlob && (
            <>
              <DownloadButton
                blob={zipBlob}
                filename="compressed-images.zip"
                label={t("ui.downloadZip")}
              />
              <button
                onClick={handleReset}
                className="px-6 py-3 rounded-xl font-semibold text-brand-muted border border-white/10 hover:text-brand-text hover:border-white/20 transition-all duration-300"
              >
                {t("compimg.more")}
              </button>
            </>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
