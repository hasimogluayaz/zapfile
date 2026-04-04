"use client";

import { useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import {
  formatFileSize,
  getFileNameWithoutExtension,
  downloadBlob,
} from "@/lib/utils";

interface FaviconSize {
  size: number;
  filename: string;
  label: string;
  checked: boolean;
}

const DEFAULT_SIZES: Omit<FaviconSize, "checked">[] = [
  { size: 16, filename: "favicon-16x16.png", label: "16x16" },
  { size: 32, filename: "favicon-32x32.png", label: "32x32" },
  { size: 48, filename: "favicon-48x48.png", label: "48x48" },
  { size: 64, filename: "favicon-64x64.png", label: "64x64" },
  { size: 128, filename: "favicon-128x128.png", label: "128x128" },
  { size: 180, filename: "apple-touch-icon.png", label: "180x180 (Apple Touch)" },
  { size: 192, filename: "android-chrome-192x192.png", label: "192x192 (Android)" },
  { size: 512, filename: "android-chrome-512x512.png", label: "512x512 (Android)" },
];

export default function FaviconGeneratorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sizes, setSizes] = useState<FaviconSize[]>(
    DEFAULT_SIZES.map((s) => ({ ...s, checked: true })),
  );
  const [generatedPreviews, setGeneratedPreviews] = useState<
    Map<number, string>
  >(new Map());
  const [generatedBlobs, setGeneratedBlobs] = useState<Map<number, Blob>>(
    new Map(),
  );
  const [processing, setProcessing] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);

  const generateFavicons = useCallback(
    (img: HTMLImageElement, selectedSizes: FaviconSize[]) => {
      const previews = new Map<number, string>();
      const blobs = new Map<number, Blob>();
      let completed = 0;
      const total = selectedSizes.filter((s) => s.checked).length;

      if (total === 0) {
        setGeneratedPreviews(new Map());
        setGeneratedBlobs(new Map());
        return;
      }

      for (const s of selectedSizes) {
        if (!s.checked) continue;

        const canvas = document.createElement("canvas");
        canvas.width = s.size;
        canvas.height = s.size;
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, s.size, s.size);

        previews.set(s.size, canvas.toDataURL("image/png"));

        canvas.toBlob(
          (blob) => {
            if (blob) {
              blobs.set(s.size, blob);
            }
            completed++;
            if (completed === total) {
              setGeneratedPreviews(new Map(previews));
              setGeneratedBlobs(new Map(blobs));
            }
          },
          "image/png",
        );
      }
    },
    [],
  );

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      const f = files[0];
      setFile(f);
      setGeneratedPreviews(new Map());
      setGeneratedBlobs(new Map());

      const resetSizes = DEFAULT_SIZES.map((s) => ({ ...s, checked: true }));
      setSizes(resetSizes);

      const img = new window.Image();
      img.onload = () => {
        imgRef.current = img;
        setPreview(URL.createObjectURL(f));
        generateFavicons(img, resetSizes);
      };
      img.onerror = () => toast.error("Failed to load image.");
      img.src = URL.createObjectURL(f);
    },
    [generateFavicons],
  );

  const toggleSize = (index: number) => {
    const updated = sizes.map((s, i) =>
      i === index ? { ...s, checked: !s.checked } : s,
    );
    setSizes(updated);
    if (imgRef.current) {
      generateFavicons(imgRef.current, updated);
    }
  };

  const selectAll = () => {
    const updated = sizes.map((s) => ({ ...s, checked: true }));
    setSizes(updated);
    if (imgRef.current) {
      generateFavicons(imgRef.current, updated);
    }
  };

  const selectNone = () => {
    const updated = sizes.map((s) => ({ ...s, checked: false }));
    setSizes(updated);
    setGeneratedPreviews(new Map());
    setGeneratedBlobs(new Map());
  };

  const handleDownloadIndividual = (size: FaviconSize) => {
    const blob = generatedBlobs.get(size.size);
    if (blob) {
      downloadBlob(blob, size.filename);
      toast.success(`Downloaded ${size.filename}`);
    }
  };

  const handleDownloadAll = async () => {
    const checkedSizes = sizes.filter((s) => s.checked);
    if (checkedSizes.length === 0) {
      toast.error("No sizes selected.");
      return;
    }

    setProcessing(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      for (const s of checkedSizes) {
        const blob = generatedBlobs.get(s.size);
        if (blob) {
          zip.file(s.filename, blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const baseName = file
        ? getFileNameWithoutExtension(file.name)
        : "favicons";
      downloadBlob(zipBlob, `${baseName}-favicons.zip`);
      toast.success("ZIP downloaded!");
    } catch {
      toast.error("Failed to create ZIP file.");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setSizes(DEFAULT_SIZES.map((s) => ({ ...s, checked: true })));
    setGeneratedPreviews(new Map());
    setGeneratedBlobs(new Map());
    setProcessing(false);
    imgRef.current = null;
  };

  const checkedCount = sizes.filter((s) => s.checked).length;

  return (
    <ToolLayout
      toolName="Favicon Generator"
      toolDescription="Generate all favicon sizes from a single image"
    >
      <div className="space-y-6">
        {!file ? (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{
              "image/jpeg": [".jpg", ".jpeg"],
              "image/png": [".png"],
              "image/webp": [".webp"],
              "image/svg+xml": [".svg"],
            }}
            formats={["JPG", "PNG", "WEBP", "SVG"]}
            label="Drop your image here or click to browse"
          />
        ) : (
          <>
            {/* Source image info */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[13px] font-medium text-t-primary truncate max-w-[260px]">
                    {file.name}
                  </p>
                  <p className="text-[12px] text-t-secondary">
                    {formatFileSize(file.size)}
                    {imgRef.current && (
                      <>
                        {" "}
                        &middot; {imgRef.current.naturalWidth} &times;{" "}
                        {imgRef.current.naturalHeight}px
                      </>
                    )}
                  </p>
                </div>
                <button
                  onClick={reset}
                  className="text-[12px] text-t-secondary hover:text-red-400 transition-colors flex-shrink-0"
                >
                  Remove
                </button>
              </div>

              {preview && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Source preview"
                    className="max-h-48 max-w-full rounded-lg border border-border object-contain"
                  />
                </div>
              )}
            </div>

            {/* Size selection */}
            <div className="glass rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-t-secondary font-medium">
                  Sizes to Generate
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Select All
                  </button>
                  <span className="text-t-secondary text-[11px]">|</span>
                  <button
                    onClick={selectNone}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    None
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sizes.map((s, i) => (
                  <label
                    key={s.size}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      s.checked
                        ? "bg-white/10 border border-indigo-500/30"
                        : "bg-white/5 border border-border hover:bg-white/10"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={s.checked}
                      onChange={() => toggleSize(i)}
                      className="w-4 h-4 rounded accent-indigo-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-t-primary font-medium">
                        {s.label}
                      </p>
                      <p className="text-[11px] text-t-secondary truncate">
                        {s.filename}
                      </p>
                    </div>
                    {s.checked && generatedBlobs.has(s.size) && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleDownloadIndividual(s);
                        }}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors flex-shrink-0"
                        title={`Download ${s.filename}`}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                      </button>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Preview grid */}
            {generatedPreviews.size > 0 && (
              <div className="glass rounded-xl p-6 space-y-4">
                <span className="text-[13px] text-t-secondary font-medium block">
                  Preview
                </span>

                <div className="flex flex-wrap gap-4 items-end">
                  {sizes
                    .filter((s) => s.checked && generatedPreviews.has(s.size))
                    .map((s) => {
                      // Display size: show at actual size up to 64px, otherwise cap for layout
                      const displaySize = Math.min(s.size, 128);
                      return (
                        <div
                          key={s.size}
                          className="flex flex-col items-center gap-2"
                        >
                          <div
                            className="rounded-lg border border-border overflow-hidden bg-white/5 flex items-center justify-center"
                            style={{
                              width: displaySize,
                              height: displaySize,
                              minWidth: 32,
                              minHeight: 32,
                            }}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={generatedPreviews.get(s.size)!}
                              alt={`${s.size}x${s.size}`}
                              style={{
                                width: displaySize,
                                height: displaySize,
                                imageRendering:
                                  s.size <= 32 ? "pixelated" : "auto",
                              }}
                            />
                          </div>
                          <span className="text-[11px] text-t-secondary">
                            {s.size}x{s.size}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* ICO hint */}
            <div className="glass rounded-xl p-4 border border-border">
              <p className="text-[12px] text-t-secondary">
                <span className="font-medium text-t-primary">Tip:</span> For{" "}
                <code className="px-1.5 py-0.5 rounded bg-white/5 text-[11px]">
                  .ico
                </code>{" "}
                files, use the 16x16 and 32x32 PNGs with an online ICO
                converter.
              </p>
            </div>

            {/* Download All as ZIP */}
            <button
              onClick={handleDownloadAll}
              disabled={processing || checkedCount === 0}
              className={`w-full py-3 rounded-xl font-semibold text-[14px] text-white transition-all ${
                processing || checkedCount === 0
                  ? "bg-white/10 cursor-not-allowed text-t-secondary"
                  : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              {processing
                ? "Creating ZIP..."
                : `Download All as ZIP (${checkedCount} file${checkedCount !== 1 ? "s" : ""})`}
            </button>
          </>
        )}
      </div>
    </ToolLayout>
  );
}
