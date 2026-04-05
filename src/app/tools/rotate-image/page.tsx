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

export default function RotateImagePage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [originalDims, setOriginalDims] = useState({ w: 0, h: 0 });
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const redrawTransform = useCallback(
    (img: HTMLImageElement, rot: number, fH: boolean, fV: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const isRotated90or270 = rot === 90 || rot === 270;
      canvas.width = isRotated90or270 ? img.naturalHeight : img.naturalWidth;
      canvas.height = isRotated90or270 ? img.naturalWidth : img.naturalHeight;
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.scale(fH ? -1 : 1, fV ? -1 : 1);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();
      setPreview(canvas.toDataURL("image/png"));
      setResultBlob(null);
    },
    [],
  );

  // Re-draw whenever rotation or flip state changes and an image is loaded
  useEffect(() => {
    if (imgRef.current) {
      redrawTransform(imgRef.current, rotation, flipH, flipV);
    }
  }, [rotation, flipH, flipV, redrawTransform]);

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      const f = files[0];
      setFile(f);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      setResultBlob(null);

      const img = new window.Image();
      img.onload = () => {
        setOriginalDims({ w: img.naturalWidth, h: img.naturalHeight });
        imgRef.current = img;
        redrawTransform(img, 0, false, false);
      };
      img.onerror = () => toast.error(t("ui.failedLoad"));
      img.src = URL.createObjectURL(f);
    },
    [redrawTransform],
  );

  const rotateLeft = () => setRotation((r) => (r - 90 + 360) % 360);
  const rotateRight = () => setRotation((r) => (r + 90) % 360);
  const toggleFlipH = () => setFlipH((v) => !v);
  const toggleFlipV = () => setFlipV((v) => !v);

  const handleReset = () => {
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || !file) return;
    setProcessing(true);
    canvas.toBlob((blob) => {
      setProcessing(false);
      if (blob) {
        const baseName = getFileNameWithoutExtension(file.name);
        downloadBlob(blob, `${baseName}-rotated.png`);
        toast.success(t("ui.downloadPNG"));
      } else {
        toast.error(t("ui.failedExport"));
      }
    }, "image/png");
  };

  // Current canvas dimensions for display
  const currentDims = (() => {
    if (!originalDims.w) return null;
    const isRotated90or270 = rotation === 90 || rotation === 270;
    return {
      w: isRotated90or270 ? originalDims.h : originalDims.w,
      h: isRotated90or270 ? originalDims.w : originalDims.h,
    };
  })();

  const reset = () => {
    setFile(null);
    setPreview(null);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setResultBlob(null);
    setOriginalDims({ w: 0, h: 0 });
    imgRef.current = null;
  };

  return (
    <ToolLayout
      toolName="Rotate Image"
      toolDescription="Rotate images 90, 180, 270 degrees or flip horizontally and vertically."
    >
      {/* Hidden canvas used for all processing */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="space-y-6">
        {!file ? (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{
              "image/*": [
                ".jpg",
                ".jpeg",
                ".png",
                ".webp",
                ".gif",
                ".bmp",
                ".tiff",
              ],
            }}
            formats={["JPG", "PNG", "WEBP"]}
            label="Drop your image here or click to browse"
          />
        ) : (
          <>
            {/* Preview card */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[13px] font-medium text-brand-text truncate max-w-[260px]">
                    {file.name}
                  </p>
                  <p className="text-[12px] text-brand-muted">
                    {formatFileSize(file.size)}
                    {originalDims.w > 0 && (
                      <>
                        {" "}
                        &middot; Original: {originalDims.w} &times;{" "}
                        {originalDims.h}px
                      </>
                    )}
                    {currentDims && (
                      <>
                        {" "}
                        &middot; Current: {currentDims.w} &times;{" "}
                        {currentDims.h}px
                      </>
                    )}
                  </p>
                </div>
                <button
                  onClick={reset}
                  className="text-[12px] text-brand-muted hover:text-red-400 transition-colors flex-shrink-0"
                >
                  {t("ui.remove")}
                </button>
              </div>

              {preview && (
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Rotated preview"
                    className="max-h-64 max-w-full rounded-lg border border-white/10 object-contain"
                  />
                </div>
              )}
            </div>

            {/* Transform controls */}
            <div className="glass rounded-xl p-4 space-y-4">
              {/* Rotation indicator */}
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-brand-muted font-medium">
                  {t("rotimg.transform")}
                </span>
                <span className="text-[12px] font-mono px-2.5 py-1 rounded-lg bg-white/5 text-brand-muted border border-white/10">
                  {rotation}&deg;
                  {flipH && " · Flip H"}
                  {flipV && " · Flip V"}
                </span>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={rotateLeft}
                  title="Rotate Left 90°"
                  className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-brand-muted hover:text-brand-text transition-all text-[12px] font-medium"
                >
                  <span className="text-lg leading-none">↺</span>
                  <span>{t("rotimg.rotateLeft")}</span>
                </button>
                <button
                  onClick={rotateRight}
                  title="Rotate Right 90°"
                  className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-t-secondary hover:text-t-primary transition-all text-[12px] font-medium"
                >
                  <span className="text-lg leading-none">↻</span>
                  <span>{t("rotimg.rotateRight")}</span>
                </button>
                <button
                  onClick={toggleFlipH}
                  title="Flip Horizontal"
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl transition-all text-[12px] font-medium ${
                    flipH
                      ? "bg-brand-indigo text-white"
                      : "bg-white/5 hover:bg-white/10 text-brand-muted hover:text-brand-text"
                  }`}
                >
                  <span className="text-lg leading-none">↔</span>
                  <span>{t("rotimg.flipH")}</span>
                </button>
                <button
                  onClick={toggleFlipV}
                  title="Flip Vertical"
                  className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl transition-all text-[12px] font-medium ${
                    flipV
                      ? "bg-brand-indigo text-white"
                      : "bg-white/5 hover:bg-white/10 text-brand-muted hover:text-brand-text"
                  }`}
                >
                  <span className="text-lg leading-none">↕</span>
                  <span>{t("rotimg.flipV")}</span>
                </button>
              </div>

              {/* Reset */}
              {(rotation !== 0 || flipH || flipV) && (
                <button
                  onClick={handleReset}
                  className="w-full py-2 rounded-xl text-[12px] text-brand-muted hover:text-brand-text bg-white/5 hover:bg-white/10 transition-colors"
                >
                  {t("rotimg.resetOriginal")}
                </button>
              )}
            </div>

            {/* Download */}
            <button
              onClick={handleDownload}
              disabled={processing || !preview}
              className={`w-full py-3 rounded-xl font-semibold text-[14px] text-white transition-all ${
                processing || !preview
                  ? "bg-white/10 cursor-not-allowed text-brand-muted"
                  : "bg-gradient-brand hover:shadow-lg hover:shadow-brand-indigo/25 hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              {processing ? t("rotimg.preparing") : t("ui.downloadPNG")}
            </button>

            {resultBlob && (
              <div className="flex justify-center">
                <DownloadButton
                  blob={resultBlob}
                  filename={`${getFileNameWithoutExtension(file.name)}-rotated.png`}
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
