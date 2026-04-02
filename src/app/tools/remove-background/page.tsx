"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import FileSizeCompare from "@/components/FileSizeCompare";
import { formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";

export default function RemoveBackgroundPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultPreview, setResultPreview] = useState<string | null>(null);

  const handleFilesSelected = useCallback((files: File[]) => {
    const f = files[0];
    if (!f) return;

    if (!f.type.startsWith("image/")) {
      toast.error("Please select a valid image file.");
      return;
    }

    setFile(f);
    setResultBlob(null);
    setResultPreview(null);
    setProgress(0);

    const url = URL.createObjectURL(f);
    setPreview(url);
  }, []);

  const handleProcess = useCallback(async () => {
    if (!file) return;

    setProcessing(true);
    setProgress(5);
    setResultBlob(null);
    setResultPreview(null);

    try {
      toast.loading("Loading AI model (first time may take ~30s)...", {
        id: "bg-load",
      });
      setProgress(10);

      const { removeBackground } = await import("@imgly/background-removal");
      toast.dismiss("bg-load");

      setProgress(20);

      const blob = await removeBackground(file, {
        progress: (key: string, current: number, total: number) => {
          if (total > 0) {
            const pct = Math.round(20 + (current / total) * 70);
            setProgress(Math.min(pct, 90));
          }
        },
      });

      setProgress(95);

      const resultUrl = URL.createObjectURL(blob);
      setResultBlob(blob);
      setResultPreview(resultUrl);
      setProgress(100);

      toast.success("Background removed successfully!");
    } catch (error) {
      console.error("Background removal error:", error);
      toast.error("Failed to remove background. Please try another image.");
    } finally {
      setProcessing(false);
    }
  }, [file]);

  const reset = useCallback(() => {
    if (preview) URL.revokeObjectURL(preview);
    if (resultPreview) URL.revokeObjectURL(resultPreview);
    setFile(null);
    setPreview(null);
    setResultBlob(null);
    setResultPreview(null);
    setProgress(0);
  }, [preview, resultPreview]);

  return (
    <ToolLayout
      toolName="Remove Background"
      toolDescription="Remove image backgrounds instantly using AI. Works with photos, portraits, product images and more. 100% browser-based."
    >
      <div className="space-y-6">
        {!file ? (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{
              "image/jpeg": [".jpg", ".jpeg"],
              "image/png": [".png"],
              "image/webp": [".webp"],
            }}
            formats={["JPG", "PNG", "WEBP"]}
            label="Drop your image here or click to browse"
          />
        ) : !resultBlob ? (
          <>
            {/* Original Image Preview */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-brand-text font-medium">{file.name}</p>
                  <p className="text-sm text-brand-muted">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  onClick={reset}
                  className="text-sm text-brand-muted hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              </div>
              {preview && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Original"
                    className="max-h-72 rounded-lg border border-white/10 object-contain"
                  />
                </div>
              )}
            </div>

            {/* Progress */}
            {processing && (
              <ProgressBar progress={progress} label="Removing background..." />
            )}

            {/* Process Button */}
            {!processing && (
              <button
                onClick={handleProcess}
                className="w-full sm:w-auto px-8 py-3 rounded-xl font-semibold text-white bg-gradient-brand hover:shadow-lg hover:shadow-brand-indigo/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Remove Background
              </button>
            )}

            <p className="text-xs text-brand-muted text-center">
              First use downloads the AI model (~30MB). Subsequent uses are
              instant.
            </p>
          </>
        ) : (
          <div className="space-y-6">
            {/* Before/After Comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass rounded-xl p-4">
                <p className="text-xs font-medium text-brand-muted mb-3 text-center">
                  Original
                </p>
                {preview && (
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preview}
                      alt="Original"
                      className="max-h-48 rounded-lg border border-white/10 object-contain"
                    />
                  </div>
                )}
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs font-medium text-brand-muted mb-3 text-center">
                  Background Removed
                </p>
                {resultPreview && (
                  <div
                    className="flex justify-center"
                    style={{
                      backgroundImage:
                        'url(\'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="8" height="8" fill="%23ccc"/><rect x="8" y="8" width="8" height="8" fill="%23ccc"/><rect x="8" width="8" height="8" fill="%23fff"/><rect y="8" width="8" height="8" fill="%23fff"/></svg>\')',
                      borderRadius: "8px",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resultPreview}
                      alt="Background removed"
                      className="max-h-48 rounded-lg object-contain"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Size Comparison */}
            <FileSizeCompare
              originalSize={file.size}
              newSize={resultBlob.size}
            />

            {/* Actions */}
            <div className="flex flex-wrap gap-4 justify-center">
              <DownloadButton
                blob={resultBlob}
                filename={`${getFileNameWithoutExtension(file.name)}-no-bg.png`}
                label="Download PNG (Transparent)"
              />
              <button
                onClick={reset}
                className="px-6 py-3 rounded-xl font-semibold text-brand-text bg-white/5 hover:bg-white/10 transition-colors"
              >
                Process Another Image
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
