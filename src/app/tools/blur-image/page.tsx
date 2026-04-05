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
import { useI18n } from "@/lib/i18n";

interface BlurArea {
  x: number;
  y: number;
  w: number;
  h: number;
}

type BlurMode = "gaussian" | "pixelate";

export default function BlurImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [blurMode, setBlurMode] = useState<BlurMode>("gaussian");
  const [intensity, setIntensity] = useState(5);
  const [blurAreas, setBlurAreas] = useState<BlurArea[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_currentRect, setCurrentRect] = useState<BlurArea | null>(null);
  const [processing, setProcessing] = useState(false);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const { t } = useI18n();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const originalDataRef = useRef<ImageData | null>(null);
  const blurredDataRef = useRef<ImageData | null>(null);

  // Get the scale factor between displayed canvas and actual canvas dimensions
  const getScale = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 1;
    const rect = canvas.getBoundingClientRect();
    return canvas.width / rect.width;
  }, []);

  // Draw the current state of the image with all blur areas applied
  const redraw = useCallback(
    (areas: BlurArea[], selectionRect?: BlurArea | null) => {
      const canvas = canvasRef.current;
      const img = imgRef.current;
      if (!canvas || !img || !originalDataRef.current) return;

      const ctx = canvas.getContext("2d")!;

      // Start from original image
      ctx.putImageData(originalDataRef.current, 0, 0);

      // Apply each blur area
      for (const area of areas) {
        applyBlurToArea(canvas, ctx, area, blurMode, intensity);
      }

      // Save current blurred state
      blurredDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Draw selection rectangle if currently drawing
      if (selectionRect) {
        ctx.save();
        ctx.strokeStyle = "#818cf8";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
        ctx.fillStyle = "rgba(129, 140, 248, 0.1)";
        ctx.fillRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
        ctx.restore();
      }
    },
    [blurMode, intensity],
  );

  // Apply blur effect to a specific area
  function applyBlurToArea(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    area: BlurArea,
    mode: BlurMode,
    value: number,
  ) {
    // Clamp area to canvas bounds
    const x = Math.max(0, Math.min(area.x, canvas.width));
    const y = Math.max(0, Math.min(area.y, canvas.height));
    const w = Math.min(area.w, canvas.width - x);
    const h = Math.min(area.h, canvas.height - y);

    if (w <= 0 || h <= 0) return;

    if (mode === "gaussian") {
      // Use CSS filter on a temporary canvas
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = w + value * 4;
      tempCanvas.height = h + value * 4;
      const tempCtx = tempCanvas.getContext("2d")!;

      // Draw the region with padding to avoid edge artifacts
      const srcX = Math.max(0, x - value * 2);
      const srcY = Math.max(0, y - value * 2);
      const srcW = Math.min(canvas.width - srcX, w + value * 4);
      const srcH = Math.min(canvas.height - srcY, h + value * 4);

      tempCtx.drawImage(canvas, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);

      // Apply blur filter
      tempCtx.filter = `blur(${value}px)`;
      tempCtx.drawImage(tempCanvas, 0, 0);
      tempCtx.filter = "none";

      // Draw blurred region back - only the originally selected area
      const offsetX = x - srcX;
      const offsetY = y - srcY;
      ctx.drawImage(tempCanvas, offsetX, offsetY, w, h, x, y, w, h);
    } else {
      // Pixelate mode
      const blockSize = value;
      const imageData = ctx.getImageData(x, y, w, h);
      const data = imageData.data;

      for (let by = 0; by < h; by += blockSize) {
        for (let bx = 0; bx < w; bx += blockSize) {
          // Calculate average color for this block
          let r = 0, g = 0, b = 0, a = 0, count = 0;
          const bw = Math.min(blockSize, w - bx);
          const bh = Math.min(blockSize, h - by);

          for (let py = by; py < by + bh; py++) {
            for (let px = bx; px < bx + bw; px++) {
              const i = (py * w + px) * 4;
              r += data[i];
              g += data[i + 1];
              b += data[i + 2];
              a += data[i + 3];
              count++;
            }
          }

          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);
          a = Math.round(a / count);

          // Fill block with average color
          for (let py = by; py < by + bh; py++) {
            for (let px = bx; px < bx + bw; px++) {
              const i = (py * w + px) * 4;
              data[i] = r;
              data[i + 1] = g;
              data[i + 2] = b;
              data[i + 3] = a;
            }
          }
        }
      }

      ctx.putImageData(imageData, x, y);
    }
  }

  // Redraw when mode or intensity changes
  useEffect(() => {
    if (imgRef.current && originalDataRef.current && blurAreas.length > 0) {
      redraw(blurAreas);
    }
  }, [blurMode, intensity, blurAreas, redraw]);

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      const f = files[0];
      setFile(f);
      setBlurAreas([]);
      setResultBlob(null);

      const img = new window.Image();
      img.onload = () => {
        imgRef.current = img;
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        originalDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        blurredDataRef.current = null;
      };
      img.onerror = () => toast.error(t("ui.failedLoad"));
      img.src = URL.createObjectURL(f);
    },
    [],
  );

  // Get canvas-relative coordinates from mouse/touch event
  const getCanvasCoords = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scale = getScale();
      let clientX: number, clientY: number;

      if ("touches" in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      return {
        x: (clientX - rect.left) * scale,
        y: (clientY - rect.top) * scale,
      };
    },
    [getScale],
  );

  const handlePointerDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const coords = getCanvasCoords(e);
      setIsDrawing(true);
      setStartPos(coords);
      setCurrentRect(null);
    },
    [getCanvasCoords],
  );

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || !startPos) return;
      e.preventDefault();
      const coords = getCanvasCoords(e);
      const rect: BlurArea = {
        x: Math.min(startPos.x, coords.x),
        y: Math.min(startPos.y, coords.y),
        w: Math.abs(coords.x - startPos.x),
        h: Math.abs(coords.y - startPos.y),
      };
      setCurrentRect(rect);

      // Redraw with existing areas plus the in-progress selection
      redraw(blurAreas, rect);
    },
    [isDrawing, startPos, getCanvasCoords, blurAreas, redraw],
  );

  const handlePointerUp = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || !startPos) return;
      e.preventDefault();
      const coords = getCanvasCoords(e);
      const area: BlurArea = {
        x: Math.min(startPos.x, coords.x),
        y: Math.min(startPos.y, coords.y),
        w: Math.abs(coords.x - startPos.x),
        h: Math.abs(coords.y - startPos.y),
      };

      // Only add if the area is meaningful (at least 4px in each dimension)
      if (area.w > 4 && area.h > 4) {
        const newAreas = [...blurAreas, area];
        setBlurAreas(newAreas);
        redraw(newAreas);
        toast.success(t("blur.applied"));
      }

      setIsDrawing(false);
      setStartPos(null);
      setCurrentRect(null);
    },
    [isDrawing, startPos, getCanvasCoords, blurAreas, redraw],
  );

  const handleUndo = () => {
    if (blurAreas.length === 0) return;
    const newAreas = blurAreas.slice(0, -1);
    setBlurAreas(newAreas);

    // Restore original and reapply remaining areas
    const canvas = canvasRef.current;
    if (canvas && originalDataRef.current) {
      const ctx = canvas.getContext("2d")!;
      ctx.putImageData(originalDataRef.current, 0, 0);
      if (newAreas.length > 0) {
        redraw(newAreas);
      }
    }
    toast(t("blur.undone"));
  };

  const handleBlurEntire = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const area: BlurArea = { x: 0, y: 0, w: canvas.width, h: canvas.height };
    const newAreas = [...blurAreas, area];
    setBlurAreas(newAreas);
    redraw(newAreas);
    toast.success(t("blur.entireDone"));
  };

  const handleReset = () => {
    setBlurAreas([]);
    setResultBlob(null);
    blurredDataRef.current = null;
    const canvas = canvasRef.current;
    if (canvas && originalDataRef.current) {
      const ctx = canvas.getContext("2d")!;
      ctx.putImageData(originalDataRef.current, 0, 0);
    }
    toast(t("blur.resetDone"));
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || !file) return;
    setProcessing(true);
    canvas.toBlob(
      (blob) => {
        setProcessing(false);
        if (blob) {
          const baseName = getFileNameWithoutExtension(file.name);
          downloadBlob(blob, `${baseName}-blurred.png`);
          toast.success(t("blur.downloaded"));
        } else {
          toast.error(t("ui.failedExport"));
        }
      },
      "image/png",
    );
  };

  const reset = () => {
    setFile(null);
    setBlurAreas([]);
    setIsDrawing(false);
    setStartPos(null);
    setCurrentRect(null);
    setResultBlob(null);
    setProcessing(false);
    imgRef.current = null;
    originalDataRef.current = null;
    blurredDataRef.current = null;
  };

  return (
    <ToolLayout
      toolName="Blur Image"
      toolDescription="Blur or pixelate areas of an image for privacy"
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
        ) : (
          <>
            {/* File info card */}
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
                  {t("ui.remove")}
                </button>
              </div>

              {/* Interactive canvas */}
              <div className="flex justify-center">
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-[500px] rounded-lg border border-border object-contain cursor-crosshair touch-none"
                  style={{ width: "100%", height: "auto" }}
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={handlePointerUp}
                  onMouseLeave={(e) => {
                    if (isDrawing) handlePointerUp(e);
                  }}
                  onTouchStart={handlePointerDown}
                  onTouchMove={handlePointerMove}
                  onTouchEnd={handlePointerUp}
                />
              </div>

              <p className="text-[11px] text-t-secondary text-center mt-2">
                {t("blur.clickDrag")}
              </p>
            </div>

            {/* Blur controls */}
            <div className="glass rounded-xl p-6 space-y-4">
              {/* Mode toggle */}
              <div>
                <span className="text-[13px] text-t-secondary font-medium block mb-2">
                  {t("blur.mode")}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setBlurMode("gaussian");
                      setIntensity(5);
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                      blurMode === "gaussian"
                        ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                        : "bg-white/5 hover:bg-white/10 text-t-secondary hover:text-t-primary"
                    }`}
                  >
                    {t("blur.gaussian")}
                  </button>
                  <button
                    onClick={() => {
                      setBlurMode("pixelate");
                      setIntensity(10);
                    }}
                    className={`flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                      blurMode === "pixelate"
                        ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                        : "bg-white/5 hover:bg-white/10 text-t-secondary hover:text-t-primary"
                    }`}
                  >
                    {t("blur.pixelate")}
                  </button>
                </div>
              </div>

              {/* Intensity slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[13px] text-t-secondary font-medium">
                    {blurMode === "gaussian" ? t("blur.radius") : t("blur.blockSize")}
                  </span>
                  <span className="text-[12px] font-mono px-2.5 py-1 rounded-lg bg-white/5 text-t-secondary border border-border">
                    {intensity}{blurMode === "gaussian" ? "px" : "px"}
                  </span>
                </div>
                <input
                  type="range"
                  min={blurMode === "gaussian" ? 1 : 5}
                  max={blurMode === "gaussian" ? 20 : 50}
                  value={intensity}
                  onChange={(e) => setIntensity(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleUndo}
                  disabled={blurAreas.length === 0}
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl text-[12px] font-medium transition-all ${
                    blurAreas.length === 0
                      ? "bg-white/5 text-t-secondary/50 cursor-not-allowed"
                      : "bg-white/5 hover:bg-white/10 text-t-secondary hover:text-t-primary"
                  }`}
                >
                  <span className="text-lg leading-none">&#x21A9;</span>
                  <span>{t("blur.undo")}</span>
                </button>
                <button
                  onClick={handleBlurEntire}
                  className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-t-secondary hover:text-t-primary transition-all text-[12px] font-medium"
                >
                  <span className="text-lg leading-none">&#x25A3;</span>
                  <span>{t("blur.blurEntire")}</span>
                </button>
                <button
                  onClick={handleReset}
                  disabled={blurAreas.length === 0}
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl text-[12px] font-medium transition-all ${
                    blurAreas.length === 0
                      ? "bg-white/5 text-t-secondary/50 cursor-not-allowed"
                      : "bg-white/5 hover:bg-white/10 text-t-secondary hover:text-t-primary"
                  }`}
                >
                  <span className="text-lg leading-none">&#x21BA;</span>
                  <span>{t("ui.reset")}</span>
                </button>
              </div>

              {blurAreas.length > 0 && (
                <p className="text-[11px] text-t-secondary text-center">
                  {blurAreas.length} blur area{blurAreas.length !== 1 ? "s" : ""} applied
                </p>
              )}
            </div>

            {/* Download */}
            <button
              onClick={handleDownload}
              disabled={processing || blurAreas.length === 0}
              className={`w-full py-3 rounded-xl font-semibold text-[14px] text-white transition-all ${
                processing || blurAreas.length === 0
                  ? "bg-white/10 cursor-not-allowed text-t-secondary"
                  : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              {processing ? t("ui.processing") : t("ui.downloadPNG")}
            </button>

            {resultBlob && (
              <div className="flex justify-center">
                <DownloadButton
                  blob={resultBlob}
                  filename={`${getFileNameWithoutExtension(file.name)}-blurred.png`}
                  label={t("ui.downloadPNG")}
                />
              </div>
            )}
          </>
        )}
      </div>
    </ToolLayout>
  );
}
