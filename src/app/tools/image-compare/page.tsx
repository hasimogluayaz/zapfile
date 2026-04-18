"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { formatFileSize } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface ImageInfo {
  file: File;
  url: string;
  width: number;
  height: number;
}

function useImageInfo(file: File | null): ImageInfo | null {
  const [info, setInfo] = useState<ImageInfo | null>(null);
  useEffect(() => {
    if (!file) {
      setInfo(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () =>
      setInfo({
        file,
        url,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return info;
}

export default function ImageComparePage() {
  const { t } = useI18n();
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [afterFile, setAfterFile] = useState<File | null>(null);
  const beforeInfo = useImageInfo(beforeFile);
  const afterInfo = useImageInfo(afterFile);

  const [pct, setPct] = useState(50);
  const dragging = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.offsetWidth));
    ro.observe(el);
    setBoxW(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  const setFromClientX = useCallback((clientX: number) => {
    const el = wrapRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - r.left, 0), r.width);
    setPct(Math.round((x / r.width) * 100));
  }, []);

  const bothLoaded = beforeInfo && afterInfo;

  useEffect(() => {
    const up = () => {
      dragging.current = false;
    };
    const move = (e: MouseEvent) => {
      if (dragging.current) setFromClientX(e.clientX);
    };
    const keydown = (e: KeyboardEvent) => {
      if (!bothLoaded) return;
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      const step = e.shiftKey ? 5 : 1;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setPct((p) => Math.max(0, p - step));
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setPct((p) => Math.min(100, p + step));
      }
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    window.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("keydown", keydown);
    };
  }, [setFromClientX, bothLoaded]);

  const handleSwap = useCallback(() => {
    if (!beforeFile || !afterFile) return;
    const tmp = beforeFile;
    setBeforeFile(afterFile);
    setAfterFile(tmp);
    toast.success(t("imgcompare.swapped"));
  }, [beforeFile, afterFile, t]);

  // Touch support for slider
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      dragging.current = true;
      setFromClientX(e.touches[0].clientX);
    },
    [setFromClientX],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (dragging.current) {
        setFromClientX(e.touches[0].clientX);
      }
    },
    [setFromClientX],
  );

  return (
    <ToolLayout
      toolName="Image Comparator"
      toolDescription="Compare two images side by side with an interactive slider. Upload a before and after image to get started."
    >
      <div className="space-y-6">
        {!bothLoaded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-t-primary">{t("imgcompare.before")}</p>
              {!beforeFile ? (
                <FileDropzone
                  onFilesSelected={(files) => setBeforeFile(files[0])}
                  accept={{
                    "image/jpeg": [".jpg", ".jpeg"],
                    "image/png": [".png"],
                    "image/webp": [".webp"],
                  }}
                  multiple={false}
                  label={t("imgcompare.dropBefore")}
                  formats={["jpg", "png", "webp"]}
                />
              ) : (
                <div className="glass rounded-xl p-3 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={beforeInfo?.url || ""}
                    alt="Before"
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-t-primary truncate">
                      {beforeFile.name}
                    </p>
                    <p className="text-xs text-t-tertiary">
                      {formatFileSize(beforeFile.size)}
                    </p>
                  </div>
                  <button
                    onClick={() => setBeforeFile(null)}
                    className="text-t-tertiary hover:text-t-primary text-sm"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-t-primary">{t("imgcompare.after")}</p>
              {!afterFile ? (
                <FileDropzone
                  onFilesSelected={(files) => setAfterFile(files[0])}
                  accept={{
                    "image/jpeg": [".jpg", ".jpeg"],
                    "image/png": [".png"],
                    "image/webp": [".webp"],
                  }}
                  multiple={false}
                  label={t("imgcompare.dropAfter")}
                  formats={["jpg", "png", "webp"]}
                />
              ) : (
                <div className="glass rounded-xl p-3 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={afterInfo?.url || ""}
                    alt="After"
                    className="w-12 h-12 object-cover rounded-lg"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-t-primary truncate">
                      {afterFile.name}
                    </p>
                    <p className="text-xs text-t-tertiary">
                      {formatFileSize(afterFile.size)}
                    </p>
                  </div>
                  <button
                    onClick={() => setAfterFile(null)}
                    className="text-t-tertiary hover:text-t-primary text-sm"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {bothLoaded && (
          <>
            {/* Slider comparison */}
            <div className="glass rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-t-primary">{t("imgcompare.compare")}</p>
                <button
                  onClick={handleSwap}
                  className="text-xs text-accent hover:text-accent/80 transition-colors flex items-center gap-1 border border-border px-3 py-1 rounded-lg"
                >
                  ⇄ {t("imgcompare.swap")}
                </button>
              </div>
              <div
                ref={wrapRef}
                className="relative overflow-hidden rounded-xl border border-border bg-bg-secondary select-none"
                style={{ aspectRatio: "4/3", maxHeight: "400px" }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={() => {
                  dragging.current = false;
                }}
              >
                {/* After (full background) */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={afterInfo.url}
                  alt="After"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />
                {/* Before (clipped) */}
                <div
                  className="absolute inset-y-0 left-0 overflow-hidden"
                  style={{ width: `${pct}%` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={beforeInfo.url}
                    alt="Before"
                    className="absolute left-0 top-0 h-full object-contain pointer-events-none"
                    style={{ width: boxW ? `${boxW}px` : "100%" }}
                  />
                </div>
                {/* Divider line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-md z-10 pointer-events-none"
                  style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
                />
                {/* Labels */}
                <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-md pointer-events-none z-10">
                  {t("imgcompare.before")}
                </div>
                <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-md pointer-events-none z-10">
                  {t("imgcompare.after")}
                </div>
                {/* Drag handle */}
                <button
                  type="button"
                  aria-label={t("imgcompare.dragHandle")}
                  className="absolute top-1/2 z-20 w-10 h-10 -ml-5 rounded-full bg-white shadow-lg border-2 border-accent flex items-center justify-center text-accent text-xs font-bold cursor-ew-resize"
                  style={{
                    left: `${pct}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    dragging.current = true;
                    setFromClientX(e.clientX);
                  }}
                >
                  ⇄
                </button>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={pct}
                onChange={(e) => setPct(Number(e.target.value))}
                className="w-full accent-accent"
                aria-label={t("imgcompare.compare")}
              />
              <p className="mt-2 text-center text-[11px] text-t-tertiary">
                {t("imgcompare.keyboardHint")}
              </p>
              <div className="mt-1 flex flex-wrap justify-center gap-4 text-[11px] text-t-tertiary">
                <span>
                  <kbd className="px-1.5 py-0.5 rounded bg-bg-secondary border border-border font-mono">
                    ←
                  </kbd>{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-bg-secondary border border-border font-mono">
                    →
                  </kbd>{" "}
                  {t("imgcompare.navigate")}
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 rounded bg-bg-secondary border border-border font-mono">
                    Shift
                  </kbd>{" "}
                  {t("imgcompare.shiftSteps")}
                </span>
              </div>
            </div>

            {/* Image info */}
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  label: t("imgcompare.before"),
                  info: beforeInfo,
                  onRemove: () => {
                    setBeforeFile(null);
                    setAfterFile(null);
                  },
                },
                {
                  label: t("imgcompare.after"),
                  info: afterInfo,
                  onRemove: () => {
                    setBeforeFile(null);
                    setAfterFile(null);
                  },
                },
              ].map(({ label, info, onRemove }) => (
                <div key={label} className="glass rounded-xl p-4">
                  <p className="text-xs font-medium text-t-primary mb-2">
                    {label}
                  </p>
                  <p className="text-xs text-t-tertiary truncate">
                    {info.file.name}
                  </p>
                  <p className="text-xs text-t-tertiary">
                    {formatFileSize(info.file.size)}
                  </p>
                  <p className="text-xs text-t-tertiary">
                    {info.width} × {info.height}px
                  </p>
                  <button
                    onClick={onRemove}
                    className="mt-2 text-[10px] text-t-tertiary hover:text-t-primary transition-colors"
                  >
                    {t("imgcompare.changeImages")}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </ToolLayout>
  );
}
