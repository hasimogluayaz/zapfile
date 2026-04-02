"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import {
  formatFileSize,
  getFileNameWithoutExtension,
  downloadBlob,
} from "@/lib/utils";

type WatermarkPosition =
  | "center"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

const positionOptions: { value: WatermarkPosition; label: string }[] = [
  { value: "center", label: "Center" },
  { value: "top-left", label: "Top Left" },
  { value: "top-right", label: "Top Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-right", label: "Bottom Right" },
];

export default function WatermarkImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [watermarkText, setWatermarkText] = useState("ZapFile");
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(50);
  const [position, setPosition] = useState<WatermarkPosition>("bottom-right");
  const [color, setColor] = useState("#ffffff");
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultPreview, setResultPreview] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const drawWatermark = useCallback(
    (
      img: HTMLImageElement,
      text: string,
      fSize: number,
      alpha: number,
      pos: WatermarkPosition,
      fillColor: string,
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw base image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      if (!text.trim()) {
        setPreview(canvas.toDataURL("image/png"));
        return;
      }

      // Configure text style
      ctx.font = `bold ${fSize}px sans-serif`;
      ctx.globalAlpha = alpha / 100;
      ctx.fillStyle = fillColor;
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 4;

      const padding = 20;
      const metrics = ctx.measureText(text);
      const textWidth = metrics.width;
      const textHeight = fSize;

      let x = 0;
      let y = 0;

      switch (pos) {
        case "center":
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          x = canvas.width / 2;
          y = canvas.height / 2;
          break;
        case "top-left":
          ctx.textAlign = "left";
          ctx.textBaseline = "top";
          x = padding;
          y = padding;
          break;
        case "top-right":
          ctx.textAlign = "right";
          ctx.textBaseline = "top";
          x = canvas.width - padding;
          y = padding;
          break;
        case "bottom-left":
          ctx.textAlign = "left";
          ctx.textBaseline = "bottom";
          x = padding;
          y = canvas.height - padding;
          break;
        case "bottom-right":
          ctx.textAlign = "right";
          ctx.textBaseline = "bottom";
          x = canvas.width - padding;
          y = canvas.height - padding;
          break;
      }

      // Suppress unused variable warning — textWidth/textHeight used for clarity
      void textWidth;
      void textHeight;

      ctx.fillText(text, x, y);

      // Reset shadow and alpha
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      setPreview(canvas.toDataURL("image/png"));
    },
    [],
  );

  // Redraw live preview whenever any setting changes
  useEffect(() => {
    if (imgRef.current) {
      drawWatermark(
        imgRef.current,
        watermarkText,
        fontSize,
        opacity,
        position,
        color,
      );
    }
  }, [watermarkText, fontSize, opacity, position, color, drawWatermark]);

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      const f = files[0];
      setFile(f);
      setResultBlob(null);
      setResultPreview(null);

      const img = new window.Image();
      img.onload = () => {
        imgRef.current = img;
        drawWatermark(img, watermarkText, fontSize, opacity, position, color);
      };
      img.onerror = () => toast.error("Failed to load image.");
      img.src = URL.createObjectURL(f);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drawWatermark],
  );

  const handleApplyAndDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || !file) return;
    setProcessing(true);
    canvas.toBlob((blob) => {
      setProcessing(false);
      if (blob) {
        setResultBlob(blob);
        const objectUrl = URL.createObjectURL(blob);
        setResultPreview(objectUrl);
        const baseName = getFileNameWithoutExtension(file.name);
        downloadBlob(blob, `${baseName}-watermarked.png`);
        toast.success("Watermark applied and downloaded!");
      } else {
        toast.error("Failed to export image.");
      }
    }, "image/png");
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResultBlob(null);
    setResultPreview(null);
    imgRef.current = null;
  };

  return (
    <ToolLayout
      toolName="Add Watermark"
      toolDescription="Add custom text watermarks to images with full control over position, size, and opacity."
    >
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="space-y-6">
        {!file ? (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{
              "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"],
            }}
            formats={["JPG", "PNG", "WEBP"]}
            label="Drop your image here or click to browse"
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              {/* Left: Live preview */}
              <div className="glass rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-medium text-brand-muted">
                    Live Preview
                  </p>
                  <button
                    onClick={reset}
                    className="text-[11px] text-brand-muted hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt="Watermark preview"
                    className="w-full rounded-lg border border-white/10 object-contain max-h-72"
                  />
                ) : (
                  <div className="h-40 flex items-center justify-center rounded-lg border border-white/10 text-[12px] text-brand-muted">
                    Loading…
                  </div>
                )}
                <p className="text-[11px] text-brand-muted truncate">
                  {file.name} &middot; {formatFileSize(file.size)}
                </p>
              </div>

              {/* Right: Controls */}
              <div className="glass rounded-xl p-4 space-y-4">
                <h3 className="text-[13px] font-semibold text-brand-text">
                  Watermark Settings
                </h3>

                {/* Text */}
                <div>
                  <label className="block text-[12px] text-brand-muted mb-1.5">
                    Watermark Text
                  </label>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="Enter watermark text"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[13px] text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-indigo/50 transition-colors"
                  />
                </div>

                {/* Font size */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-[12px] text-brand-muted">
                      Font Size
                    </label>
                    <span className="text-[12px] font-mono text-brand-muted">
                      {fontSize}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={12}
                    max={200}
                    step={1}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full accent-brand-indigo"
                  />
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[10px] text-brand-muted">12</span>
                    <span className="text-[10px] text-brand-muted">200</span>
                  </div>
                </div>

                {/* Opacity */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-[12px] text-brand-muted">
                      Opacity
                    </label>
                    <span className="text-[12px] font-mono text-brand-muted">
                      {opacity}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={1}
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="w-full accent-brand-indigo"
                  />
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[10px] text-brand-muted">10%</span>
                    <span className="text-[10px] text-brand-muted">100%</span>
                  </div>
                </div>

                {/* Color */}
                <div>
                  <label className="block text-[12px] text-brand-muted mb-1.5">
                    Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-white/10 bg-white/5 p-0.5"
                    />
                    <span className="text-[12px] font-mono text-brand-muted">
                      {color}
                    </span>
                  </div>
                </div>

                {/* Position */}
                <div>
                  <label className="block text-[12px] text-brand-muted mb-1.5">
                    Position
                  </label>
                  <select
                    value={position}
                    onChange={(e) =>
                      setPosition(e.target.value as WatermarkPosition)
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[13px] text-brand-text focus:outline-none focus:border-brand-indigo/50 transition-colors appearance-none cursor-pointer"
                  >
                    {positionOptions.map((opt) => (
                      <option
                        key={opt.value}
                        value={opt.value}
                        className="bg-bg-primary text-brand-text"
                      >
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Apply & Download */}
                <button
                  onClick={handleApplyAndDownload}
                  disabled={processing || !watermarkText.trim()}
                  className={`w-full py-3 rounded-xl font-semibold text-[14px] text-white transition-all mt-2 ${
                    processing || !watermarkText.trim()
                      ? "bg-white/10 cursor-not-allowed text-brand-muted"
                      : "bg-gradient-brand hover:shadow-lg hover:shadow-brand-indigo/25 hover:scale-[1.02] active:scale-[0.98]"
                  }`}
                >
                  {processing ? "Applying…" : "Apply & Download"}
                </button>
              </div>
            </div>

            {/* Result download if already generated */}
            {resultBlob && resultPreview && (
              <div className="glass rounded-xl p-4 space-y-3">
                <p className="text-[13px] font-medium text-brand-text">
                  Last Export
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resultPreview}
                  alt="Watermarked result"
                  className="max-h-48 rounded-lg border border-white/10 mx-auto block"
                />
                <div className="flex flex-wrap gap-3 justify-center">
                  <DownloadButton
                    blob={resultBlob}
                    filename={`${getFileNameWithoutExtension(file.name)}-watermarked.png`}
                    label="Download Again"
                  />
                  <button
                    onClick={reset}
                    className="px-6 py-2.5 rounded-xl text-[13px] font-semibold text-brand-muted bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    New Image
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ToolLayout>
  );
}
