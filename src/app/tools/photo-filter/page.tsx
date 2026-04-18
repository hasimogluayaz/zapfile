"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { downloadBlob, getFileNameWithoutExtension } from "@/lib/utils";

// ─── Canvas-based pixel manipulation ──────────────────────────────

function applyGrayscale(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    data[i] = data[i + 1] = data[i + 2] = avg;
  }
}

function applySepia(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    data[i]     = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
    data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
    data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
  }
}

function applyVintage(data: Uint8ClampedArray, w: number, h: number) {
  applySepia(data);
  // Vignette
  const cx = w / 2, cy = h / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const factor = 1 - 0.5 * (dist / maxDist) ** 2;
      data[i]     = Math.min(255, data[i] * factor);
      data[i + 1] = Math.min(255, data[i + 1] * factor);
      data[i + 2] = Math.min(255, data[i + 2] * factor);
    }
  }
}

function applyBright(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.min(255, data[i] * 1.3);
    data[i + 1] = Math.min(255, data[i + 1] * 1.3);
    data[i + 2] = Math.min(255, data[i + 2] * 1.3);
  }
}

function applyContrast(data: Uint8ClampedArray) {
  const factor = 1.8;
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.min(255, Math.max(0, (data[i]     - 128) * factor + 128));
    data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * factor + 128));
    data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * factor + 128));
  }
}

function applyInvert(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = 255 - data[i];
    data[i + 1] = 255 - data[i + 1];
    data[i + 2] = 255 - data[i + 2];
  }
}

function applyWarm(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.min(255, data[i] * 1.2);
    data[i + 2] = Math.max(0, data[i + 2] * 0.8);
  }
}

function applyCold(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.max(0, data[i] * 0.8);
    data[i + 2] = Math.min(255, data[i + 2] * 1.2);
  }
}

function applyFade(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = data[i]     * 0.7 + 40;
    data[i + 1] = data[i + 1] * 0.7 + 40;
    data[i + 2] = data[i + 2] * 0.7 + 40;
  }
}

function applySaturate(data: Uint8ClampedArray) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    data[i]     = Math.min(255, Math.max(0, gray + (r - gray) * 2.5));
    data[i + 1] = Math.min(255, Math.max(0, gray + (g - gray) * 2.5));
    data[i + 2] = Math.min(255, Math.max(0, gray + (b - gray) * 2.5));
  }
}

// Interpolate pixel data between original and filtered at a given intensity (0–1)
function blendPixels(
  orig: Uint8ClampedArray,
  filtered: Uint8ClampedArray,
  intensity: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(orig.length);
  for (let i = 0; i < orig.length; i += 4) {
    out[i]     = orig[i]     + (filtered[i]     - orig[i])     * intensity;
    out[i + 1] = orig[i + 1] + (filtered[i + 1] - orig[i + 1]) * intensity;
    out[i + 2] = orig[i + 2] + (filtered[i + 2] - orig[i + 2]) * intensity;
    out[i + 3] = orig[i + 3];
  }
  return out;
}

type FilterKey =
  | "original"
  | "grayscale"
  | "sepia"
  | "vintage"
  | "bright"
  | "contrast"
  | "invert"
  | "warm"
  | "cold"
  | "fade"
  | "saturate"
  | "blur";

interface FilterPreset {
  key: FilterKey;
  name: string;
  // Returns a new array of pixel data (modifies copy, not in-place)
  apply: (data: Uint8ClampedArray, w: number, h: number) => Uint8ClampedArray;
}

function cloneAndApply(
  orig: Uint8ClampedArray,
  fn: (d: Uint8ClampedArray, w: number, h: number) => void,
  w: number,
  h: number,
): Uint8ClampedArray {
  const copy = new Uint8ClampedArray(orig);
  fn(copy, w, h);
  return copy;
}

const FILTERS: FilterPreset[] = [
  {
    key: "original",
    name: "Original",
    apply: (d) => new Uint8ClampedArray(d),
  },
  {
    key: "grayscale",
    name: "Grayscale",
    apply: (d, w, h) => cloneAndApply(d, applyGrayscale, w, h),
  },
  {
    key: "sepia",
    name: "Sepia",
    apply: (d, w, h) => cloneAndApply(d, applySepia, w, h),
  },
  {
    key: "vintage",
    name: "Vintage",
    apply: (d, w, h) => {
      const c = new Uint8ClampedArray(d);
      applyVintage(c, w, h);
      return c;
    },
  },
  {
    key: "bright",
    name: "Bright",
    apply: (d, w, h) => cloneAndApply(d, applyBright, w, h),
  },
  {
    key: "contrast",
    name: "Contrast",
    apply: (d, w, h) => cloneAndApply(d, applyContrast, w, h),
  },
  {
    key: "invert",
    name: "Invert",
    apply: (d, w, h) => cloneAndApply(d, applyInvert, w, h),
  },
  {
    key: "warm",
    name: "Warm",
    apply: (d, w, h) => cloneAndApply(d, applyWarm, w, h),
  },
  {
    key: "cold",
    name: "Cold",
    apply: (d, w, h) => cloneAndApply(d, applyCold, w, h),
  },
  {
    key: "fade",
    name: "Fade",
    apply: (d, w, h) => cloneAndApply(d, applyFade, w, h),
  },
  {
    key: "saturate",
    name: "Saturate",
    apply: (d, w, h) => cloneAndApply(d, applySaturate, w, h),
  },
  {
    key: "blur",
    name: "Blur",
    apply: (d) => new Uint8ClampedArray(d), // handled via CSS filter separately
  },
];

// ─── Component ────────────────────────────────────────────────────

export default function PhotoFilterPage() {
  const [file, setFile] = useState<File | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>("original");
  const [intensity, setIntensity] = useState(100);
  const [showOriginal, setShowOriginal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const thumbCanvasesRef = useRef<Map<FilterKey, HTMLCanvasElement>>(new Map());
  const origPixelsRef = useRef<{ data: Uint8ClampedArray; w: number; h: number } | null>(null);

  const handleFilesSelected = useCallback((files: File[]) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setImgUrl(URL.createObjectURL(f));
    setSelectedFilter("original");
    setIntensity(100);
    setShowOriginal(false);
    origPixelsRef.current = null;
    thumbCanvasesRef.current.clear();
  }, []);

  // When image loads, store original pixels
  const handleImageLoad = useCallback(() => {
    const img = imgRef.current;
    if (!img) return;
    const tmpCanvas = document.createElement("canvas");
    tmpCanvas.width = img.naturalWidth;
    tmpCanvas.height = img.naturalHeight;
    const ctx = tmpCanvas.getContext("2d")!;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
    origPixelsRef.current = {
      data: imageData.data,
      w: img.naturalWidth,
      h: img.naturalHeight,
    };
  }, []);

  // Re-render preview canvas when filter/intensity changes
  useEffect(() => {
    const orig = origPixelsRef.current;
    const canvas = previewCanvasRef.current;
    if (!orig || !canvas) return;

    const { data, w, h } = orig;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;

    if (selectedFilter === "original") {
      const imgData = new ImageData(new Uint8ClampedArray(data), w, h);
      ctx.putImageData(imgData, 0, 0);
      return;
    }

    if (selectedFilter === "blur") {
      const img = imgRef.current;
      if (!img) return;
      const blurPx = Math.round((intensity / 100) * 10);
      ctx.filter = blurPx > 0 ? `blur(${blurPx}px)` : "none";
      ctx.drawImage(img, 0, 0);
      ctx.filter = "none";
      return;
    }

    const preset = FILTERS.find((f) => f.key === selectedFilter)!;
    const filtered = preset.apply(data, w, h);
    const t = intensity / 100;
    const blended = t >= 1 ? filtered : blendPixels(data, filtered, t);
    ctx.putImageData(new ImageData(blended.slice() as unknown as Uint8ClampedArray<ArrayBuffer>, w, h), 0, 0);
  }, [selectedFilter, intensity]);

  // Render a thumbnail for a given filter into a small canvas
  const renderThumb = useCallback(
    (key: FilterKey, thumbCanvas: HTMLCanvasElement) => {
      const orig = origPixelsRef.current;
      if (!orig) return;

      const { data, w, h } = orig;
      // Scale down for thumbnail
      const thumbW = 80, thumbH = 80;
      const tmpFull = document.createElement("canvas");
      tmpFull.width = w;
      tmpFull.height = h;
      const fullCtx = tmpFull.getContext("2d")!;

      if (key === "original") {
        fullCtx.putImageData(new ImageData(data.slice() as unknown as Uint8ClampedArray<ArrayBuffer>, w, h), 0, 0);
      } else if (key === "blur") {
        const img = imgRef.current;
        if (!img) return;
        fullCtx.filter = "blur(5px)";
        fullCtx.drawImage(img, 0, 0);
        fullCtx.filter = "none";
      } else {
        const preset = FILTERS.find((f) => f.key === key)!;
        const filtered = preset.apply(data, w, h);
        fullCtx.putImageData(new ImageData(filtered.slice() as unknown as Uint8ClampedArray<ArrayBuffer>, w, h), 0, 0);
      }

      thumbCanvas.width = thumbW;
      thumbCanvas.height = thumbH;
      const tCtx = thumbCanvas.getContext("2d")!;
      tCtx.drawImage(tmpFull, 0, 0, thumbW, thumbH);
    },
    [],
  );

  // Render all thumbnails after image loads
  useEffect(() => {
    if (!origPixelsRef.current) return;
    setTimeout(() => {
      thumbCanvasesRef.current.forEach((canvas, key) => {
        renderThumb(key, canvas);
      });
    }, 0);
  }, [imgUrl, renderThumb]);

  const handleDownload = useCallback(async () => {
    if (!file || !previewCanvasRef.current) return;
    setDownloading(true);
    try {
      previewCanvasRef.current.toBlob(
        (blob) => {
          if (blob) {
            downloadBlob(blob, `${getFileNameWithoutExtension(file.name)}-filtered.png`);
            toast.success("Downloaded!");
          } else {
            toast.error("Export failed");
          }
          setDownloading(false);
        },
        "image/png",
      );
    } catch (err) {
      console.error(err);
      toast.error("Export failed");
      setDownloading(false);
    }
  }, [file]);

  return (
    <ToolLayout
      toolName="Photo Filter"
      toolDescription="Apply filters to photos with live preview and intensity control. Download the result as PNG."
    >
      <div className="space-y-6">
        {!file && (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{
              "image/jpeg": [".jpg", ".jpeg"],
              "image/png": [".png"],
              "image/webp": [".webp"],
            }}
            multiple={false}
            label="Drop your photo here or click to browse"
            formats={["jpg", "png", "webp"]}
          />
        )}

        {file && imgUrl && (
          <>
            {/* Hidden source image for pixel reading */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imgUrl}
              alt="Source"
              crossOrigin="anonymous"
              className="hidden"
              onLoad={handleImageLoad}
            />

            {/* Preview */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-t-primary">
                    Filter: <span className="text-indigo-400">{FILTERS.find((f) => f.key === selectedFilter)?.name}</span>
                  </span>
                  {selectedFilter !== "original" && (
                    <span className="text-xs text-t-secondary">{intensity}%</span>
                  )}
                </div>
                <button
                  onClick={() => { setFile(null); setImgUrl(null); }}
                  className="text-xs text-t-secondary hover:text-t-primary transition-colors border border-border px-3 py-1 rounded-lg"
                >
                  Change Image
                </button>
              </div>

              {/* Before/after toggle */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setShowOriginal(false)}
                  className={`text-[12px] px-3 py-1.5 rounded-lg font-medium transition-all ${
                    !showOriginal
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                      : "bg-white/5 text-t-secondary hover:text-t-primary"
                  }`}
                >
                  Filtered
                </button>
                <button
                  onClick={() => setShowOriginal(true)}
                  className={`text-[12px] px-3 py-1.5 rounded-lg font-medium transition-all ${
                    showOriginal
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                      : "bg-white/5 text-t-secondary hover:text-t-primary"
                  }`}
                >
                  Original
                </button>
              </div>

              {/* Preview canvas (filtered) */}
              <div className={showOriginal ? "hidden" : "block"}>
                <canvas
                  ref={previewCanvasRef}
                  className="w-full max-h-80 object-contain rounded-xl mx-auto block"
                  style={{ imageRendering: "auto" }}
                />
              </div>

              {/* Original image for comparison */}
              {showOriginal && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={imgUrl}
                  alt="Original"
                  className="w-full max-h-80 object-contain rounded-xl mx-auto block"
                />
              )}
            </div>

            {/* Filter Presets Grid */}
            <div className="glass rounded-xl p-6 space-y-3">
              <h3 className="text-sm font-medium text-t-primary">Filters</h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {FILTERS.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => {
                      setSelectedFilter(preset.key);
                      if (preset.key === "original") setIntensity(100);
                    }}
                    className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-square ${
                      selectedFilter === preset.key
                        ? "border-indigo-500 shadow-[0_0_0_2px] shadow-indigo-500/30"
                        : "border-transparent hover:border-border"
                    }`}
                  >
                    <canvas
                      ref={(el) => {
                        if (el) {
                          thumbCanvasesRef.current.set(preset.key, el);
                          if (origPixelsRef.current) renderThumb(preset.key, el);
                        }
                      }}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 py-1 px-1">
                      <p className="text-[9px] text-white text-center font-medium truncate">
                        {preset.name}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Intensity Slider */}
            {selectedFilter !== "original" && (
              <div className="glass rounded-xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-t-primary">Intensity</h3>
                  <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-white/5 text-t-secondary border border-border">
                    {intensity}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10 accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-t-secondary">
                  <span>Original</span>
                  <span>Full effect</span>
                </div>
              </div>
            )}

            {/* Download */}
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-all disabled:opacity-50"
            >
              {downloading ? "Exporting..." : "Download PNG"}
            </button>
          </>
        )}
      </div>
    </ToolLayout>
  );
}
