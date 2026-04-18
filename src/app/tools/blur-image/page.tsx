"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
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

type BlurMode = "gaussian" | "pixelate" | "blackout";

export default function BlurImagePage() {
  const [file, setFile] = useState<File | null>(null);
  const [blurMode, setBlurMode] = useState<BlurMode>("gaussian");
  const [intensity, setIntensity] = useState(5);
  const [blurAreas, setBlurAreas] = useState<BlurArea[]>([]);
  const [redoAreas, setRedoAreas] = useState<BlurArea[]>([]);
  const [feather, setFeather] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const { t } = useI18n();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalCanvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const originalDataRef = useRef<ImageData | null>(null);

  const getScale = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return 1;
    const rect = canvas.getBoundingClientRect();
    return canvas.width / rect.width;
  }, []);

  function applyBlurToArea(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    area: BlurArea,
    mode: BlurMode,
    value: number,
    featherPx: number,
    originalFull: ImageData | null,
  ) {
    const x = Math.max(0, Math.min(area.x, canvas.width));
    const y = Math.max(0, Math.min(area.y, canvas.height));
    const w = Math.min(area.w, canvas.width - x);
    const h = Math.min(area.h, canvas.height - y);
    if (w <= 0 || h <= 0) return;

    if (mode === "blackout") {
      ctx.fillStyle = "#000000";
      ctx.fillRect(x, y, w, h);
      return;
    }

    if (mode === "gaussian") {
      const padding = value * 4;
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = w + padding * 2;
      tempCanvas.height = h + padding * 2;
      const tempCtx = tempCanvas.getContext("2d")!;

      const srcX = Math.max(0, x - padding);
      const srcY = Math.max(0, y - padding);
      const srcW = Math.min(canvas.width - srcX, w + padding * 2);
      const srcH = Math.min(canvas.height - srcY, h + padding * 2);

      tempCtx.drawImage(canvas, srcX, srcY, srcW, srcH, 0, 0, srcW, srcH);
      tempCtx.filter = `blur(${value}px)`;
      tempCtx.drawImage(tempCanvas, 0, 0);
      tempCtx.filter = "none";

      const offsetX = x - srcX;
      const offsetY = y - srcY;
      ctx.drawImage(tempCanvas, offsetX, offsetY, w, h, x, y, w, h);

      if (featherPx > 0 && originalFull) {
        const patch = ctx.getImageData(x, y, w, h);
        const od = originalFull.data;
        const fw = originalFull.width;
        for (let py = 0; py < h; py++) {
          for (let px = 0; px < w; px++) {
            const dist = Math.min(px, py, w - 1 - px, h - 1 - py);
            let t = Math.min(1, dist / featherPx);
            t = t * t;
            const i = (py * w + px) * 4;
            const j = ((y + py) * fw + (x + px)) * 4;
            for (let c = 0; c < 4; c++) {
              patch.data[i + c] = Math.round(
                patch.data[i + c] * t + od[j + c] * (1 - t),
              );
            }
          }
        }
        ctx.putImageData(patch, x, y);
      }
    } else {
      // Pixelate
      const blockSize = Math.max(1, value);
      const imageData = ctx.getImageData(x, y, w, h);
      const data = imageData.data;

      for (let by = 0; by < h; by += blockSize) {
        for (let bx = 0; bx < w; bx += blockSize) {
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

      if (featherPx > 0 && originalFull) {
        const patch = ctx.getImageData(x, y, w, h);
        const od = originalFull.data;
        const fw = originalFull.width;
        for (let py = 0; py < h; py++) {
          for (let px = 0; px < w; px++) {
            const dist = Math.min(px, py, w - 1 - px, h - 1 - py);
            let t = Math.min(1, dist / featherPx);
            t = t * t;
            const i = (py * w + px) * 4;
            const j = ((y + py) * fw + (x + px)) * 4;
            for (let c = 0; c < 4; c++) {
              patch.data[i + c] = Math.round(
                patch.data[i + c] * t + od[j + c] * (1 - t),
              );
            }
          }
        }
        ctx.putImageData(patch, x, y);
      }
    }
  }

  const redraw = useCallback(
    (areas: BlurArea[], selectionRect?: BlurArea | null) => {
      const canvas = canvasRef.current;
      if (!canvas || !originalDataRef.current) return;
      const ctx = canvas.getContext("2d")!;
      const orig = originalDataRef.current;

      ctx.putImageData(orig, 0, 0);

      for (const area of areas) {
        applyBlurToArea(canvas, ctx, area, blurMode, intensity, feather, orig);
      }

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
    [blurMode, intensity, feather],
  );

  useEffect(() => {
    if (imgRef.current && originalDataRef.current && blurAreas.length > 0) {
      redraw(blurAreas);
    }
  }, [blurMode, intensity, feather, blurAreas, redraw]);

  const handleFilesSelected = useCallback((files: File[]) => {
    const f = files[0];
    setFile(f);
    setBlurAreas([]);
    setRedoAreas([]);
    setShowComparison(false);

    const img = new window.Image();
    img.onload = () => {
      imgRef.current = img;

      // Set up main canvas
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      originalDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Set up original (comparison) canvas
      const origCanvas = originalCanvasRef.current;
      if (origCanvas) {
        origCanvas.width = img.naturalWidth;
        origCanvas.height = img.naturalHeight;
        const origCtx = origCanvas.getContext("2d")!;
        origCtx.drawImage(img, 0, 0);
      }
    };
    img.onerror = () => toast.error(t("ui.failedLoad"));
    img.src = URL.createObjectURL(f);
  }, [t]);

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
      setIsDrawing(true);
      setStartPos(getCanvasCoords(e));
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

      if (area.w > 4 && area.h > 4) {
        const newAreas = [...blurAreas, area];
        setBlurAreas(newAreas);
        setRedoAreas([]);
        redraw(newAreas);
        toast.success(t("blur.applied"));
      }

      setIsDrawing(false);
      setStartPos(null);
    },
    [isDrawing, startPos, getCanvasCoords, blurAreas, redraw, t],
  );

  const handleUndo = () => {
    if (blurAreas.length === 0) return;
    const removed = blurAreas[blurAreas.length - 1]!;
    const newAreas = blurAreas.slice(0, -1);
    setRedoAreas((r) => [...r, removed]);
    setBlurAreas(newAreas);
    const canvas = canvasRef.current;
    if (canvas && originalDataRef.current) {
      const ctx = canvas.getContext("2d")!;
      ctx.putImageData(originalDataRef.current, 0, 0);
      if (newAreas.length > 0) redraw(newAreas);
    }
    toast(t("blur.undone"));
  };

  const handleRedo = () => {
    if (redoAreas.length === 0) return;
    const last = redoAreas[redoAreas.length - 1]!;
    const newAreas = [...blurAreas, last];
    setRedoAreas((r) => r.slice(0, -1));
    setBlurAreas(newAreas);
    redraw(newAreas);
    toast(t("blur.redone"));
  };

  const handleBlurEntire = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const area: BlurArea = { x: 0, y: 0, w: canvas.width, h: canvas.height };
    const newAreas = [...blurAreas, area];
    setBlurAreas(newAreas);
    setRedoAreas([]);
    redraw(newAreas);
    toast.success(t("blur.entireDone"));
  };

  const handleReset = () => {
    setBlurAreas([]);
    setRedoAreas([]);
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
    setRedoAreas([]);
    setIsDrawing(false);
    setStartPos(null);
    setProcessing(false);
    setShowComparison(false);
    imgRef.current = null;
    originalDataRef.current = null;
  };

  const modeConfig: { key: BlurMode; label: string }[] = [
    { key: "gaussian", label: t("blur.gaussian") },
    { key: "pixelate", label: t("blur.pixelate") },
    { key: "blackout", label: t("blur.blackout") },
  ];

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
                      <> &middot; {imgRef.current.naturalWidth} &times; {imgRef.current.naturalHeight}px</>
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

              {/* Before/after toggle */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setShowComparison(false)}
                  className={`text-[12px] px-3 py-1.5 rounded-lg font-medium transition-all ${
                    !showComparison
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                      : "bg-white/5 text-t-secondary hover:text-t-primary"
                  }`}
                >
                  {t("blur.edited")}
                </button>
                <button
                  onClick={() => setShowComparison(true)}
                  disabled={blurAreas.length === 0}
                  className={`text-[12px] px-3 py-1.5 rounded-lg font-medium transition-all ${
                    showComparison
                      ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                      : blurAreas.length === 0
                      ? "bg-white/5 text-t-secondary/40 cursor-not-allowed"
                      : "bg-white/5 text-t-secondary hover:text-t-primary"
                  }`}
                >
                  {t("blur.viewOriginalBtn")}
                </button>
                {blurAreas.length > 0 && (
                  <span className="text-[11px] text-t-secondary ml-auto">
                    {t("blur.regionsApplied", { count: blurAreas.length })}
                  </span>
                )}
              </div>

              {/* Canvas area */}
              <div className="relative flex justify-center">
                {/* Original comparison canvas */}
                <canvas
                  ref={originalCanvasRef}
                  className={`max-w-full max-h-[500px] rounded-lg border border-border object-contain ${
                    showComparison ? "block" : "hidden"
                  }`}
                  style={{ width: "100%", height: "auto" }}
                />
                {/* Editable canvas */}
                <canvas
                  ref={canvasRef}
                  className={`max-w-full max-h-[500px] rounded-lg border border-border object-contain cursor-crosshair touch-none ${
                    showComparison ? "hidden" : "block"
                  }`}
                  style={{ width: "100%", height: "auto" }}
                  onMouseDown={handlePointerDown}
                  onMouseMove={handlePointerMove}
                  onMouseUp={handlePointerUp}
                  onMouseLeave={(e) => { if (isDrawing) handlePointerUp(e); }}
                  onTouchStart={handlePointerDown}
                  onTouchMove={handlePointerMove}
                  onTouchEnd={handlePointerUp}
                />
              </div>

              {!showComparison && (
                <p className="text-[11px] text-t-secondary text-center mt-2">
                  {t("blur.clickDrag")}
                </p>
              )}
            </div>

            {/* Blur controls */}
            <div className="glass rounded-xl p-6 space-y-5">
              {/* Mode toggle */}
              <div>
                <span className="text-[13px] text-t-secondary font-medium block mb-2">
                  {t("blur.mode")}
                </span>
                <div className="flex gap-2">
                  {modeConfig.map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => {
                        setBlurMode(key);
                        setIntensity(key === "pixelate" ? 10 : 5);
                      }}
                      className={`flex-1 py-2.5 rounded-xl text-[12px] font-medium transition-all ${
                        blurMode === key
                          ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                          : "bg-white/5 hover:bg-white/10 text-t-secondary hover:text-t-primary"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Intensity slider — hidden for blackout */}
              {blurMode !== "blackout" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] text-t-secondary font-medium">
                      {blurMode === "gaussian" ? t("blur.radius") : t("blur.blockSize")}
                    </span>
                    <span className="text-[12px] font-mono px-2.5 py-1 rounded-lg bg-white/5 text-t-secondary border border-border">
                      {intensity}px
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
              )}

              {blurMode !== "blackout" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] text-t-secondary font-medium">
                      {t("blur.feather")}
                    </span>
                    <span className="text-[12px] font-mono px-2.5 py-1 rounded-lg bg-white/5 text-t-secondary border border-border">
                      {feather}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={48}
                    value={feather}
                    onChange={(e) => setFeather(Number(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                  <p className="text-[11px] text-t-tertiary mt-1.5">{t("blur.featherHint")}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
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
                  type="button"
                  onClick={handleRedo}
                  disabled={redoAreas.length === 0}
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl text-[12px] font-medium transition-all ${
                    redoAreas.length === 0
                      ? "bg-white/5 text-t-secondary/50 cursor-not-allowed"
                      : "bg-white/5 hover:bg-white/10 text-t-secondary hover:text-t-primary"
                  }`}
                >
                  <span className="text-lg leading-none">&#x21AA;</span>
                  <span>{t("blur.redo")}</span>
                </button>
                <button
                  type="button"
                  onClick={handleBlurEntire}
                  className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-t-secondary hover:text-t-primary transition-all text-[12px] font-medium"
                >
                  <span className="text-lg leading-none">&#x25A3;</span>
                  <span>{t("blur.blurEntire")}</span>
                </button>
                <button
                  type="button"
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
          </>
        )}
      </div>
    </ToolLayout>
  );
}
