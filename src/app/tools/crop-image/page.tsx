"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import { getFileNameWithoutExtension, getFileExtension } from "@/lib/utils";

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const presetRatios = [
  { label: "Free", value: null },
  { label: "1:1", value: 1 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
];

export default function CropImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [displaySize, setDisplaySize] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState<CropArea>({ x: 0, y: 0, width: 0, height: 0 });
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [result, setResult] = useState<Blob | null>(null);
  const [resultPreview, setResultPreview] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const handleFilesSelected = useCallback((files: File[]) => {
    const f = files[0];
    setFile(f);
    setResult(null);
    setResultPreview(null);

    const url = URL.createObjectURL(f);
    setImageUrl(url);

    const img = new Image();
    img.onload = () => {
      setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
      // Default crop: full image
      setCrop({ x: 0, y: 0, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = url;
  }, []);

  useEffect(() => {
    if (!imgRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDisplaySize({
          w: entry.contentRect.width,
          h: entry.contentRect.height,
        });
      }
    });
    obs.observe(imgRef.current);
    return () => obs.disconnect();
  }, [imageUrl]);

  const scale = displaySize.w > 0 ? imgSize.w / displaySize.w : 1;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDragStart({ x, y });
    setIsDragging(true);
    setCrop({ x: x * scale, y: y * scale, width: 0, height: 0 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const currentX = Math.max(0, Math.min(e.clientX - rect.left, displaySize.w));
    const currentY = Math.max(0, Math.min(e.clientY - rect.top, displaySize.h));

    const w = (currentX - dragStart.x) * scale;
    let h = (currentY - dragStart.y) * scale;

    if (aspectRatio) {
      h = Math.abs(w) / aspectRatio * Math.sign(h || 1);
    }

    const realX = w >= 0 ? dragStart.x * scale : (dragStart.x * scale + w);
    const realY = h >= 0 ? dragStart.y * scale : (dragStart.y * scale + h);

    setCrop({
      x: Math.max(0, realX),
      y: Math.max(0, realY),
      width: Math.min(Math.abs(w), imgSize.w - Math.max(0, realX)),
      height: Math.min(Math.abs(h), imgSize.h - Math.max(0, realY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const applyPresetRatio = (ratio: number | null) => {
    setAspectRatio(ratio);
    if (ratio && imgSize.w > 0) {
      const maxW = imgSize.w;
      const maxH = imgSize.h;
      let w = maxW;
      let h = w / ratio;
      if (h > maxH) {
        h = maxH;
        w = h * ratio;
      }
      setCrop({
        x: (maxW - w) / 2,
        y: (maxH - h) / 2,
        width: w,
        height: h,
      });
    }
  };

  const handleCrop = async () => {
    if (!file || crop.width <= 0 || crop.height <= 0) {
      toast.error("Please select an area to crop.");
      return;
    }

    try {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(crop.width);
      canvas.height = Math.round(crop.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      const img = new Image();
      const url = URL.createObjectURL(file);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(
            img,
            Math.round(crop.x),
            Math.round(crop.y),
            Math.round(crop.width),
            Math.round(crop.height),
            0,
            0,
            Math.round(crop.width),
            Math.round(crop.height)
          );
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = reject;
        img.src = url;
      });

      const ext = getFileExtension(file.name);
      const mimeType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Failed"))),
          mimeType,
          0.92
        );
      });

      setResult(blob);
      setResultPreview(URL.createObjectURL(blob));
      toast.success(`Cropped to ${Math.round(crop.width)} x ${Math.round(crop.height)}!`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to crop image.");
    }
  };

  const reset = () => {
    setFile(null);
    setImageUrl(null);
    setResult(null);
    setResultPreview(null);
    setCrop({ x: 0, y: 0, width: 0, height: 0 });
  };

  // Crop overlay display coordinates
  const overlayStyle = displaySize.w > 0
    ? {
        left: `${(crop.x / imgSize.w) * 100}%`,
        top: `${(crop.y / imgSize.h) * 100}%`,
        width: `${(crop.width / imgSize.w) * 100}%`,
        height: `${(crop.height / imgSize.h) * 100}%`,
      }
    : {};

  return (
    <ToolLayout
      toolName="Crop Image"
      toolDescription="Crop images with preset aspect ratios or free-form selection."
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
            {/* Aspect ratio presets */}
            <div className="glass rounded-xl p-4">
              <div className="flex flex-wrap gap-2">
                {presetRatios.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => applyPresetRatio(preset.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      aspectRatio === preset.value
                        ? "bg-brand-indigo text-white"
                        : "bg-white/5 text-brand-muted hover:bg-white/10 hover:text-brand-text"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Crop canvas */}
            {imageUrl && (
              <div
                ref={containerRef}
                className="relative glass rounded-xl p-2 cursor-crosshair select-none overflow-hidden"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={imgRef}
                  src={imageUrl}
                  alt="Crop preview"
                  className="max-w-full max-h-[500px] mx-auto block"
                  draggable={false}
                />

                {/* Dark overlay */}
                {crop.width > 0 && crop.height > 0 && (
                  <>
                    <div className="absolute inset-0 bg-black/50 pointer-events-none" />
                    <div
                      className="absolute border-2 border-brand-indigo pointer-events-none"
                      style={{
                        ...overlayStyle,
                        boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                        background: "transparent",
                      }}
                    >
                      {/* Corner handles */}
                      <div className="absolute -top-1 -left-1 w-3 h-3 bg-white rounded-sm" />
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-sm" />
                      <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-white rounded-sm" />
                      <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-white rounded-sm" />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Crop info */}
            <div className="glass rounded-xl p-4 text-center text-sm text-brand-muted">
              Selection: {Math.round(crop.width)} &times; {Math.round(crop.height)}px
              {crop.width > 0 && crop.height > 0 && (
                <span className="ml-2">
                  (from {Math.round(crop.x)}, {Math.round(crop.y)})
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleCrop}
                disabled={crop.width <= 0 || crop.height <= 0}
                className={`flex-1 sm:flex-none px-8 py-3 rounded-xl font-semibold text-white transition-all ${
                  crop.width > 0 && crop.height > 0
                    ? "bg-gradient-brand hover:shadow-lg hover:shadow-brand-indigo/25 hover:scale-[1.02] active:scale-[0.98]"
                    : "bg-white/10 cursor-not-allowed text-brand-muted"
                }`}
              >
                Crop Image
              </button>
              <button onClick={reset} className="px-6 py-3 rounded-xl text-brand-muted hover:text-brand-text transition-colors">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-6">
            <div className="glass rounded-xl p-4 text-center">
              <p className="text-brand-text font-medium">
                Cropped to {Math.round(crop.width)} &times; {Math.round(crop.height)}px
              </p>
            </div>

            {resultPreview && (
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resultPreview} alt="Cropped" className="max-h-72 rounded-lg border border-white/10" />
              </div>
            )}

            <div className="flex flex-wrap gap-4 justify-center">
              <DownloadButton
                blob={result}
                filename={`${getFileNameWithoutExtension(file.name)}-cropped${getFileExtension(file.name)}`}
                label="Download Cropped Image"
              />
              <button
                onClick={reset}
                className="px-6 py-3 rounded-xl font-semibold text-brand-text bg-white/5 hover:bg-white/10 transition-colors"
              >
                Crop Another
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
