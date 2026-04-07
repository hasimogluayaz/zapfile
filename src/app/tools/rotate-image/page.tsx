"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import {
  formatFileSize,
  getFileNameWithoutExtension,
} from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

const MAX_BATCH = 40;

async function transformFileToPngBlob(
  file: File,
  rotation: number,
  flipH: boolean,
  flipV: boolean,
): Promise<Blob> {
  const img = new Image();
  const url = URL.createObjectURL(file);
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = url;
  });

  const canvas = document.createElement("canvas");
  const isRotated90or270 = rotation === 90 || rotation === 270;
  canvas.width = isRotated90or270 ? img.naturalHeight : img.naturalWidth;
  canvas.height = isRotated90or270 ? img.naturalWidth : img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  ctx.restore();
  URL.revokeObjectURL(url);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("export"))),
      "image/png",
    );
  });
}

export default function RotateImagePage() {
  const { t } = useI18n();
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [originalDims, setOriginalDims] = useState({ w: 0, h: 0 });
  const [resultBlobs, setResultBlobs] = useState<{ file: File; blob: Blob }[]>(
    [],
  );
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);

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
    },
    [],
  );

  useEffect(() => {
    if (imgRef.current) {
      redrawTransform(imgRef.current, rotation, flipH, flipV);
    }
  }, [rotation, flipH, flipV, redrawTransform]);

  const handleFilesSelected = useCallback(
    (selected: File[]) => {
      const list = selected.slice(0, MAX_BATCH);
      setFiles(list);
      setResultBlobs([]);
      setZipBlob(null);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);

      const f = list[0];
      const img = new window.Image();
      img.onload = () => {
        setOriginalDims({ w: img.naturalWidth, h: img.naturalHeight });
        imgRef.current = img;
        redrawTransform(img, 0, false, false);
      };
      img.onerror = () => toast.error(t("ui.failedLoad"));
      img.src = URL.createObjectURL(f);
    },
    [redrawTransform, t],
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

  const handleExport = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setResultBlobs([]);
    setZipBlob(null);
    try {
      const out: { file: File; blob: Blob }[] = [];
      for (const file of files) {
        const blob = await transformFileToPngBlob(
          file,
          rotation,
          flipH,
          flipV,
        );
        out.push({ file, blob });
      }
      setResultBlobs(out);

      if (out.length > 1) {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        for (const { file, blob } of out) {
          const base = getFileNameWithoutExtension(file.name);
          zip.file(`${base}-rotated.png`, blob);
        }
        setZipBlob(await zip.generateAsync({ type: "blob" }));
      }

      toast.success(t("rotimg.exported", { count: out.length }));
    } catch {
      toast.error(t("ui.failedExport"));
    } finally {
      setProcessing(false);
    }
  };

  const currentDims = (() => {
    if (!originalDims.w) return null;
    const isRotated90or270 = rotation === 90 || rotation === 270;
    return {
      w: isRotated90or270 ? originalDims.h : originalDims.w,
      h: isRotated90or270 ? originalDims.w : originalDims.h,
    };
  })();

  const reset = () => {
    setFiles([]);
    setPreview(null);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    setResultBlobs([]);
    setZipBlob(null);
    setOriginalDims({ w: 0, h: 0 });
    imgRef.current = null;
  };

  return (
    <ToolLayout
      toolName="Rotate Image"
      toolDescription="Rotate images 90, 180, 270 degrees or flip horizontally and vertically. Batch supported."
    >
      <canvas ref={canvasRef} className="hidden" />

      <div className="space-y-6">
        {files.length === 0 ? (
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
            multiple
            formats={["JPG", "PNG", "WEBP"]}
            label="Drop images here or click (batch supported)"
          />
        ) : resultBlobs.length === 0 ? (
          <>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[13px] font-medium text-brand-text">
                    {t("rotimg.batchHint", { count: files.length })}
                  </p>
                  <p className="text-[12px] text-brand-muted">
                    {files[0].name}
                    {files.length > 1 && ` + ${files.length - 1} more`}
                    {originalDims.w > 0 && (
                      <>
                        {" "}
                        &middot; {originalDims.w} &times; {originalDims.h}px
                      </>
                    )}
                    {currentDims && (
                      <>
                        {" "}
                        &middot; {t("rotimg.previewOut")}: {currentDims.w}{" "}
                        &times; {currentDims.h}px
                      </>
                    )}
                  </p>
                </div>
                <button
                  type="button"
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
                    alt=""
                    className="max-h-64 max-w-full rounded-lg border border-white/10 object-contain"
                  />
                </div>
              )}
            </div>

            <div className="glass rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-brand-muted font-medium">
                  {t("rotimg.transform")}
                </span>
                <span className="text-[12px] font-mono px-2.5 py-1 rounded-lg bg-white/5 text-brand-muted border border-white/10">
                  {rotation}&deg;
                  {flipH && " · H"}
                  {flipV && " · V"}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={rotateLeft}
                  className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-brand-muted hover:text-brand-text transition-all text-[12px] font-medium"
                >
                  <span className="text-lg leading-none">↺</span>
                  <span>{t("rotimg.rotateLeft")}</span>
                </button>
                <button
                  type="button"
                  onClick={rotateRight}
                  className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-t-secondary hover:text-t-primary transition-all text-[12px] font-medium"
                >
                  <span className="text-lg leading-none">↻</span>
                  <span>{t("rotimg.rotateRight")}</span>
                </button>
                <button
                  type="button"
                  onClick={toggleFlipH}
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
                  type="button"
                  onClick={toggleFlipV}
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

              {(rotation !== 0 || flipH || flipV) && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="w-full py-2 rounded-xl text-[12px] text-brand-muted hover:text-brand-text bg-white/5 hover:bg-white/10 transition-colors"
                >
                  {t("rotimg.resetOriginal")}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleExport}
              disabled={processing || !preview}
              className={`w-full py-3 rounded-xl font-semibold text-[14px] text-white transition-all ${
                processing || !preview
                  ? "bg-white/10 cursor-not-allowed text-brand-muted"
                  : "bg-gradient-brand hover:shadow-lg hover:shadow-brand-indigo/25"
              }`}
            >
              {processing ? t("rotimg.preparing") : t("rotimg.exportAll")}
            </button>
          </>
        ) : (
          <div className="space-y-6">
            <div className="glass rounded-xl p-6">
              <h3 className="text-brand-text font-medium mb-4">
                {t("compimg.results")}
              </h3>
              <div className="space-y-3">
                {resultBlobs.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                  >
                    <span className="text-sm text-brand-text truncate flex-1 min-w-0">
                      {getFileNameWithoutExtension(r.file.name)}-rotated.png
                    </span>
                    <span className="text-sm text-brand-muted whitespace-nowrap ml-4">
                      {formatFileSize(r.blob.size)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 justify-center">
              {resultBlobs.length === 1 ? (
                <DownloadButton
                  blob={resultBlobs[0].blob}
                  filename={`${getFileNameWithoutExtension(resultBlobs[0].file.name)}-rotated.png`}
                  label={t("ui.downloadPNG")}
                />
              ) : zipBlob ? (
                <DownloadButton
                  blob={zipBlob}
                  filename="rotated-images.zip"
                  label={t("ui.downloadZip")}
                />
              ) : null}
              <button
                type="button"
                onClick={reset}
                className="px-6 py-3 rounded-xl font-semibold text-brand-text bg-white/5 hover:bg-white/10 transition-colors"
              >
                {t("rotimg.anotherBatch")}
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
