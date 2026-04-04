"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import { formatFileSize } from "@/lib/utils";

type LayoutOption = "grid-2x2" | "grid-3x3" | "horizontal" | "vertical";

const layoutOptions: { value: LayoutOption; label: string; desc: string }[] = [
  { value: "grid-2x2", label: "Grid 2x2", desc: "2 columns, 2 rows" },
  { value: "grid-3x3", label: "Grid 3x3", desc: "3 columns, 3 rows" },
  { value: "horizontal", label: "Horizontal", desc: "Side by side" },
  { value: "vertical", label: "Vertical", desc: "Stacked vertically" },
];

interface LoadedImage {
  file: File;
  img: HTMLImageElement;
  objectUrl: string;
}

export default function ImageCollagePage() {
  const [images, setImages] = useState<LoadedImage[]>([]);
  const [layout, setLayout] = useState<LayoutOption>("grid-2x2");
  const [gap, setGap] = useState(4);
  const [bgColor, setBgColor] = useState("#ffffff");
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultPreview, setResultPreview] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadImage = (file: File): Promise<LoadedImage> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => resolve({ file, img, objectUrl });
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error(`Failed to load ${file.name}`));
      };
      img.src = objectUrl;
    });
  };

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      try {
        const loaded = await Promise.all(files.map(loadImage));
        setImages((prev) => [...prev, ...loaded]);
        setResultBlob(null);
        setResultPreview(null);
      } catch {
        toast.error("Failed to load one or more images.");
      }
    },
    []
  );

  const handleAddMore = useCallback(
    async (files: File[]) => {
      try {
        const loaded = await Promise.all(files.map(loadImage));
        setImages((prev) => [...prev, ...loaded]);
        setResultBlob(null);
        setResultPreview(null);
      } catch {
        toast.error("Failed to load one or more images.");
      }
    },
    []
  );

  const clearAll = () => {
    images.forEach((img) => URL.revokeObjectURL(img.objectUrl));
    setImages([]);
    setResultBlob(null);
    setResultPreview(null);
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].objectUrl);
      next.splice(index, 1);
      return next;
    });
    setResultBlob(null);
    setResultPreview(null);
  };

  // Draw collage onto canvas whenever settings or images change
  useEffect(() => {
    if (images.length === 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const CELL_SIZE = 300;

    let cols: number;
    let rows: number;

    switch (layout) {
      case "grid-2x2":
        cols = 2;
        rows = Math.ceil(images.length / 2);
        break;
      case "grid-3x3":
        cols = 3;
        rows = Math.ceil(images.length / 3);
        break;
      case "horizontal":
        cols = images.length;
        rows = 1;
        break;
      case "vertical":
        cols = 1;
        rows = images.length;
        break;
      default:
        cols = 2;
        rows = Math.ceil(images.length / 2);
    }

    const totalW = cols * CELL_SIZE + (cols + 1) * gap;
    const totalH = rows * CELL_SIZE + (rows + 1) * gap;

    canvas.width = totalW;
    canvas.height = totalH;

    // Fill background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, totalW, totalH);

    // Draw images (object-fit: cover)
    images.forEach((loaded, i) => {
      const col = layout === "vertical" ? 0 : i % cols;
      const row = layout === "horizontal" ? 0 : Math.floor(i / cols);
      const x = gap + col * (CELL_SIZE + gap);
      const y = gap + row * (CELL_SIZE + gap);

      const img = loaded.img;
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const cellRatio = 1; // Square cells

      let sx = 0,
        sy = 0,
        sw = img.naturalWidth,
        sh = img.naturalHeight;

      if (imgRatio > cellRatio) {
        // Image is wider: crop sides
        sw = img.naturalHeight * cellRatio;
        sx = (img.naturalWidth - sw) / 2;
      } else {
        // Image is taller: crop top/bottom
        sh = img.naturalWidth / cellRatio;
        sy = (img.naturalHeight - sh) / 2;
      }

      ctx.drawImage(img, sx, sy, sw, sh, x, y, CELL_SIZE, CELL_SIZE);
    });
  }, [images, layout, gap, bgColor]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        setResultBlob(blob);
        setResultPreview(URL.createObjectURL(blob));
        toast.success("Collage created!");
      } else {
        toast.error("Failed to create collage.");
      }
    }, "image/png");
  };

  return (
    <ToolLayout
      toolName="Image Collage"
      toolDescription="Create photo collages with multiple layout options"
    >
      <canvas ref={canvasRef} className="hidden" />

      <div className="space-y-6">
        {images.length === 0 ? (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{
              "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"],
            }}
            multiple
            formats={["JPG", "PNG", "WEBP"]}
            label="Drop your images here to create a collage"
          />
        ) : (
          <>
            {/* Thumbnail strip */}
            <div className="glass rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-brand-text">
                  Images ({images.length})
                </h3>
                <button
                  onClick={clearAll}
                  className="text-[11px] text-brand-muted hover:text-red-400 transition-colors"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {images.map((loaded, i) => (
                  <div key={i} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={loaded.objectUrl}
                      alt={loaded.file.name}
                      className="w-16 h-16 object-cover rounded-lg border border-white/10"
                    />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      x
                    </button>
                    <p className="text-[9px] text-brand-muted mt-0.5 truncate w-16 text-center">
                      {formatFileSize(loaded.file.size)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Add more images inline */}
              <FileDropzone
                onFilesSelected={handleAddMore}
                accept={{
                  "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"],
                }}
                multiple
                formats={["JPG", "PNG", "WEBP"]}
                label="Add more images"
              />
            </div>

            {/* Settings */}
            <div className="glass rounded-xl p-4 space-y-4">
              <h3 className="text-[13px] font-semibold text-brand-text">
                Collage Settings
              </h3>

              {/* Layout */}
              <div>
                <label className="block text-[12px] text-brand-muted mb-1.5">
                  Layout
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {layoutOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setLayout(opt.value)}
                      className={`p-3 rounded-lg text-center transition-all ${
                        layout === opt.value
                          ? "bg-brand-indigo/20 border border-brand-indigo text-brand-text"
                          : "bg-white/5 border border-white/10 text-brand-muted hover:border-white/20"
                      }`}
                    >
                      <p className="font-medium text-[12px]">{opt.label}</p>
                      <p className="text-[10px] mt-0.5 opacity-70">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Gap */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-[12px] text-brand-muted">Gap / Spacing</label>
                  <span className="text-[12px] font-mono text-brand-muted">{gap}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  value={gap}
                  onChange={(e) => setGap(Number(e.target.value))}
                  className="w-full accent-brand-indigo"
                />
                <div className="flex justify-between mt-0.5">
                  <span className="text-[10px] text-brand-muted">0</span>
                  <span className="text-[10px] text-brand-muted">20</span>
                </div>
              </div>

              {/* Background color */}
              <div>
                <label className="block text-[12px] text-brand-muted mb-1.5">
                  Background Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-white/10 bg-white/5 p-0.5"
                  />
                  <span className="text-[12px] font-mono text-brand-muted">{bgColor}</span>
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="glass rounded-xl p-3 space-y-2">
              <p className="text-[12px] font-medium text-brand-muted">Live Preview</p>
              <canvas
                ref={canvasRef}
                className="w-full rounded-lg border border-white/10 object-contain max-h-80"
                style={{ display: "block" }}
              />
            </div>

            {/* Create & Download */}
            <button
              onClick={handleDownload}
              disabled={images.length < 2}
              className={`w-full py-3 rounded-xl font-semibold text-[14px] text-white transition-all ${
                images.length < 2
                  ? "bg-white/10 cursor-not-allowed text-brand-muted"
                  : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              Create Collage
            </button>

            {resultBlob && resultPreview && (
              <div className="glass rounded-xl p-4 space-y-3">
                <p className="text-[13px] font-medium text-brand-text">Result</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resultPreview}
                  alt="Collage result"
                  className="max-h-48 rounded-lg border border-white/10 mx-auto block"
                />
                <div className="flex flex-wrap gap-3 justify-center">
                  <DownloadButton
                    blob={resultBlob}
                    filename="collage.png"
                    label="Download Collage"
                  />
                  <button
                    onClick={clearAll}
                    className="px-6 py-2.5 rounded-xl text-[13px] font-semibold text-brand-muted bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Start Over
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
