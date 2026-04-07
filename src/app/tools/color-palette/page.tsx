"use client";

import { useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { useI18n } from "@/lib/i18n";

const COUNT_OPTIONS = [4, 8, 12, 16] as const;
type ColorCount = (typeof COUNT_OPTIONS)[number];

// ─── Color extraction ─────────────────────────────────────────────

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((v) => Math.round(v).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase()
  );
}

interface BucketEntry {
  r: number;
  g: number;
  b: number;
  count: number;
}

function extractColors(imageData: ImageData, count: number): string[] {
  const { data, width, height } = imageData;
  // Buckets: quantize each channel to 8 bins (0-7)
  const buckets = new Map<number, BucketEntry>();

  const step = Math.max(1, Math.floor((width * height) / 5000));

  for (let i = 0; i < width * height; i += step) {
    const offset = i * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const a = data[offset + 3];
    if (a < 128) continue; // skip transparent

    const br = r >> 5; // 0-7
    const bg = g >> 5;
    const bb = b >> 5;
    const key = (br << 6) | (bg << 3) | bb;

    const existing = buckets.get(key);
    if (existing) {
      existing.r += r;
      existing.g += g;
      existing.b += b;
      existing.count++;
    } else {
      buckets.set(key, { r, g, b, count: 1 });
    }
  }

  // Sort by frequency
  const sorted = Array.from(buckets.values()).sort((a, b) => b.count - a.count);

  // Take top N buckets, average the colors within each
  const topN = sorted.slice(0, count);

  return topN.map((entry) => {
    const avgR = Math.round(entry.r / entry.count);
    const avgG = Math.round(entry.g / entry.count);
    const avgB = Math.round(entry.b / entry.count);
    return rgbToHex(avgR, avgG, avgB);
  });
}

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Relative luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#FFFFFF";
}

// ─── Download palette canvas ──────────────────────────────────────

function downloadPalette(colors: string[]) {
  const swatchW = 120;
  const swatchH = 100;
  const labelH = 30;
  const padding = 12;
  const cols = Math.min(colors.length, 4);
  const rows = Math.ceil(colors.length / cols);

  const canvasW = cols * swatchW + (cols + 1) * padding;
  const canvasH = rows * (swatchH + labelH) + (rows + 1) * padding;

  const canvas = document.createElement("canvas");
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(0, 0, canvasW, canvasH);

  colors.forEach((hex, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = padding + col * (swatchW + padding);
    const y = padding + row * (swatchH + labelH + padding);

    // Swatch
    ctx.fillStyle = hex;
    ctx.beginPath();
    ctx.roundRect(x, y, swatchW, swatchH, 8);
    ctx.fill();

    // Label
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText(hex, x + swatchW / 2, y + swatchH + labelH - 8);
  });

  const link = document.createElement("a");
  link.download = "color-palette.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// ─── Component ────────────────────────────────────────────────────

export default function ColorPalettePage() {
  const { t } = useI18n();

  const [colors, setColors] = useState<string[]>([]);
  const [colorCount, setColorCount] = useState<ColorCount>(8);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const extractFromImage = useCallback(
    (src: string, count: number) => {
      setIsExtracting(true);
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) {
          setIsExtracting(false);
          return;
        }
        const maxDim = 100;
        const scale = Math.min(maxDim / img.width, maxDim / img.height);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setIsExtracting(false);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const extracted = extractColors(imageData, count);
        setColors(extracted);
        setIsExtracting(false);
      };
      img.onerror = () => {
        toast.error("Failed to load image.");
        setIsExtracting(false);
      };
      img.src = src;
    },
    []
  );

  const handleFilesSelected = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setColors([]);
    extractFromImage(url, colorCount);
  };

  const handleCountChange = (n: ColorCount) => {
    setColorCount(n);
    if (imageSrc) {
      extractFromImage(imageSrc, n);
    }
  };

  const handleCopyHex = async (hex: string) => {
    try {
      await navigator.clipboard.writeText(hex);
      toast.success(t("palette.copied"));
    } catch {
      toast.error(t("ui.copyFailed"));
    }
  };

  const handleDownload = () => {
    if (colors.length === 0) return;
    downloadPalette(colors);
  };

  return (
    <ToolLayout
      toolName={t("tool.color-palette.name")}
      toolDescription={t("tool.color-palette.desc")}
    >
      <div className="space-y-6">
        {/* Dropzone */}
        <div className="glass rounded-2xl p-6">
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{
              "image/jpeg": [".jpg", ".jpeg"],
              "image/png": [".png"],
              "image/webp": [".webp"],
              "image/gif": [".gif"],
            }}
            multiple={false}
            label={t("palette.hint")}
            formats={["JPG", "PNG", "WEBP", "GIF"]}
          />
          {/* Hidden canvas for pixel sampling */}
          <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
        </div>

        {/* Color count selector */}
        <div className="glass rounded-2xl p-5">
          <p className="text-sm font-medium text-brand-muted mb-3">
            {t("palette.count")}
          </p>
          <div className="flex gap-2 flex-wrap">
            {COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => handleCountChange(n)}
                className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                  colorCount === n
                    ? "bg-brand-indigo/20 border border-brand-indigo text-brand-text"
                    : "bg-white/[0.04] border border-white/[0.08] text-brand-muted hover:border-white/20"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Extracting spinner */}
        {isExtracting && (
          <div className="glass rounded-2xl p-8 flex items-center justify-center gap-3">
            <svg
              className="w-5 h-5 animate-spin text-brand-indigo"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-sm text-brand-muted">
              {t("palette.extract")}…
            </span>
          </div>
        )}

        {/* Color swatches */}
        {!isExtracting && colors.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-base font-semibold text-brand-text">
                {t("palette.colors")} ({colors.length})
              </h3>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-brand-text bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                  />
                </svg>
                {t("palette.download")}
              </button>
            </div>

            <div
              className="grid gap-4"
              style={{
                gridTemplateColumns: `repeat(auto-fill, minmax(120px, 1fr))`,
              }}
            >
              {colors.map((hex, i) => {
                const textColor = getContrastColor(hex);
                return (
                  <button
                    key={i}
                    onClick={() => handleCopyHex(hex)}
                    title={t("palette.copy")}
                    className="group flex flex-col items-center rounded-2xl overflow-hidden border border-white/[0.08] hover:border-white/20 transition-all hover:scale-[1.04] active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-indigo"
                  >
                    {/* Swatch */}
                    <div
                      className="w-full aspect-square flex items-center justify-center"
                      style={{ backgroundColor: hex }}
                    >
                      {/* Copy icon on hover */}
                      <svg
                        className="w-5 h-5 opacity-0 group-hover:opacity-80 transition-opacity"
                        style={{ color: textColor }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    {/* HEX label */}
                    <div className="w-full bg-white/[0.04] px-2 py-2 text-center">
                      <span className="font-mono text-xs font-semibold text-brand-text tracking-wide">
                        {hex}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-brand-muted/60 text-center">
              Click any swatch to copy its HEX code
            </p>
          </div>
        )}

        {/* Preview thumbnail */}
        {imageSrc && !isExtracting && (
          <div className="glass rounded-2xl p-4 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt="Uploaded preview"
              className="w-16 h-16 object-cover rounded-xl border border-white/[0.08]"
            />
            <div>
              <p className="text-sm font-medium text-brand-text">
                Image loaded
              </p>
              <p className="text-xs text-brand-muted">
                {colors.length} colors extracted
              </p>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
