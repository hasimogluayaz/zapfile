"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProcessButton from "@/components/ProcessButton";
import DownloadButton from "@/components/DownloadButton";
import FileSizeCompare from "@/components/FileSizeCompare";
import { formatFileSize, getFileNameWithoutExtension, getFileExtension } from "@/lib/utils";

export default function ResizeImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [originalWidth, setOriginalWidth] = useState(0);
  const [originalHeight, setOriginalHeight] = useState(0);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [lockRatio, setLockRatio] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [resultPreview, setResultPreview] = useState<string | null>(null);

  const handleFilesSelected = useCallback((files: File[]) => {
    const f = files[0];
    setFile(f);
    setResult(null);
    setResultPreview(null);

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
  }, []);

  const ratio = originalWidth / originalHeight || 1;

  const handleWidthChange = (val: number) => {
    setWidth(val);
    if (lockRatio) setHeight(Math.round(val / ratio));
  };

  const handleHeightChange = (val: number) => {
    setHeight(val);
    if (lockRatio) setWidth(Math.round(val * ratio));
  };

  const presetSizes = [
    { label: "25%", w: Math.round(originalWidth * 0.25), h: Math.round(originalHeight * 0.25) },
    { label: "50%", w: Math.round(originalWidth * 0.5), h: Math.round(originalHeight * 0.5) },
    { label: "75%", w: Math.round(originalWidth * 0.75), h: Math.round(originalHeight * 0.75) },
    { label: "HD (1280)", w: 1280, h: Math.round(1280 / ratio) },
    { label: "FHD (1920)", w: 1920, h: Math.round(1920 / ratio) },
    { label: "4K (3840)", w: 3840, h: Math.round(3840 / ratio) },
  ];

  const handleProcess = async () => {
    if (!file || width <= 0 || height <= 0) return;
    setProcessing(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      const img = new Image();
      const url = URL.createObjectURL(file);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = reject;
        img.src = url;
      });

      const ext = getFileExtension(file.name);
      const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      const quality = mimeType === "image/png" ? undefined : 0.92;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Failed to create image"))),
          mimeType,
          quality
        );
      });

      setResult(blob);
      setResultPreview(URL.createObjectURL(blob));
      toast.success(`Image resized to ${width} x ${height}!`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to resize image.");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setResultPreview(null);
  };

  return (
    <ToolLayout
      toolName="Resize Image"
      toolDescription="Change image dimensions with aspect ratio control. Supports JPG, PNG, and WebP."
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
        ) : !result ? (
          <>
            {/* File info + preview */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-brand-text font-medium">{file.name}</p>
                  <p className="text-sm text-brand-muted">
                    {formatFileSize(file.size)} &middot; {originalWidth} &times; {originalHeight}px
                  </p>
                </div>
                <button onClick={reset} className="text-sm text-brand-muted hover:text-red-400 transition-colors">
                  Remove
                </button>
              </div>
              {preview && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Preview" className="max-h-48 rounded-lg border border-white/10" />
                </div>
              )}
            </div>

            {/* Size controls */}
            <div className="glass rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-brand-text">Output Size</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-brand-muted mb-2">Width (px)</label>
                  <input
                    type="number"
                    min="1"
                    max="8192"
                    value={width}
                    onChange={(e) => handleWidthChange(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-brand-text focus:outline-none focus:border-brand-indigo/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-brand-muted mb-2">Height (px)</label>
                  <input
                    type="number"
                    min="1"
                    max="8192"
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
                <span className="text-sm text-brand-muted">Lock aspect ratio</span>
              </label>

              {/* Presets */}
              <div>
                <p className="text-sm text-brand-muted mb-2">Quick presets</p>
                <div className="flex flex-wrap gap-2">
                  {presetSizes.map((preset) => (
                    <button
                      key={preset.label}
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
            </div>

            <ProcessButton
              onClick={handleProcess}
              loading={processing}
              disabled={width <= 0 || height <= 0}
              label={`Resize to ${width} x ${height}`}
              loadingLabel="Resizing..."
            />
          </>
        ) : (
          <div className="space-y-6">
            <FileSizeCompare originalSize={file.size} newSize={result.size} />

            <div className="glass rounded-xl p-4 text-center">
              <p className="text-sm text-brand-muted">
                {originalWidth} &times; {originalHeight} &rarr; {width} &times; {height}
              </p>
            </div>

            {resultPreview && (
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resultPreview} alt="Resized" className="max-h-72 rounded-lg border border-white/10" />
              </div>
            )}

            <div className="flex flex-wrap gap-4 justify-center">
              <DownloadButton
                blob={result}
                filename={`${getFileNameWithoutExtension(file.name)}-${width}x${height}${getFileExtension(file.name)}`}
                label="Download Resized Image"
              />
              <button
                onClick={reset}
                className="px-6 py-3 rounded-xl font-semibold text-brand-text bg-white/5 hover:bg-white/10 transition-colors"
              >
                Resize Another
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
