"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import { getFileNameWithoutExtension, getFileExtension } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface CropRect {
  x: number; // natural image coordinates
  y: number;
  w: number;
  h: number;
}

type HandleId = "tl" | "tc" | "tr" | "ml" | "mr" | "bl" | "bc" | "br";
type DragMode = "draw" | "move" | "resize";

interface DragState {
  mode: DragMode;
  handle?: HandleId;
  startClientX: number;
  startClientY: number;
  startCrop: CropRect;
}

const PRESETS = [
  { label: "Free", value: null },
  { label: "1:1", value: 1 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
  { label: "4:3", value: 4 / 3 },
  { label: "3:2", value: 3 / 2 },
  { label: "2:3", value: 2 / 3 },
];

const HANDLES: { id: HandleId; cursor: string; posStyle: React.CSSProperties }[] = [
  { id: "tl", cursor: "nwse-resize", posStyle: { top: -5, left: -5 } },
  { id: "tc", cursor: "ns-resize",   posStyle: { top: -5, left: "calc(50% - 5px)" } },
  { id: "tr", cursor: "nesw-resize", posStyle: { top: -5, right: -5 } },
  { id: "ml", cursor: "ew-resize",   posStyle: { top: "calc(50% - 5px)", left: -5 } },
  { id: "mr", cursor: "ew-resize",   posStyle: { top: "calc(50% - 5px)", right: -5 } },
  { id: "bl", cursor: "nesw-resize", posStyle: { bottom: -5, left: -5 } },
  { id: "bc", cursor: "ns-resize",   posStyle: { bottom: -5, left: "calc(50% - 5px)" } },
  { id: "br", cursor: "nwse-resize", posStyle: { bottom: -5, right: -5 } },
];

const MIN_SIZE = 10;

export default function CropImagePage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 0, h: 0 });
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const [resultPreview, setResultPreview] = useState<string | null>(null);
  const [manualW, setManualW] = useState("");
  const [manualH, setManualH] = useState("");
  const [showThirds, setShowThirds] = useState(true);

  const imgRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<DragState | null>(null);

  // ---------- helpers ----------

  /** Convert a client (screen) point to natural image coordinates */
  const toNatural = useCallback((cx: number, cy: number): { x: number; y: number } | null => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect || naturalSize.w === 0) return null;
    const scaleX = naturalSize.w / rect.width;
    const scaleY = naturalSize.h / rect.height;
    return {
      x: (cx - rect.left) * scaleX,
      y: (cy - rect.top) * scaleY,
    };
  }, [naturalSize]);

  /** Clamp and enforce minimum */
  const clampCrop = useCallback(
    (c: CropRect, ratio: number | null): CropRect => {
      let { x, y, w, h } = c;
      // enforce minimum size
      w = Math.max(w, MIN_SIZE);
      h = Math.max(h, MIN_SIZE);
      // aspect ratio
      if (ratio) h = w / ratio;
      // stay inside image
      x = Math.max(0, Math.min(x, naturalSize.w - w));
      y = Math.max(0, Math.min(y, naturalSize.h - h));
      w = Math.min(w, naturalSize.w - x);
      h = Math.min(h, naturalSize.h - y);
      return { x, y, w, h };
    },
    [naturalSize]
  );

  // ---------- file handling ----------

  const handleFilesSelected = useCallback((files: File[]) => {
    const f = files[0];
    setFile(f);
    setResult(null);
    setResultPreview(null);
    const url = URL.createObjectURL(f);
    setImageUrl(url);
    const img = new Image();
    img.onload = () => {
      setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight });
      // default: full image selected
      setCrop({ x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight });
      setManualW(String(img.naturalWidth));
      setManualH(String(img.naturalHeight));
    };
    img.src = url;
  }, []);

  // sync manual inputs when crop changes programmatically
  useEffect(() => {
    setManualW(String(Math.round(crop.w)));
    setManualH(String(Math.round(crop.h)));
  }, [crop.w, crop.h]);

  // ---------- pointer events ----------

  const getImgRect = () => imgRef.current?.getBoundingClientRect() ?? null;

  const applyHandleDelta = useCallback(
    (start: CropRect, handle: HandleId, dx: number, dy: number, ratio: number | null): CropRect => {
      let { x, y, w, h } = start;
      const rect = getImgRect();
      if (!rect) return start;
      const scaleX = naturalSize.w / rect.width;
      const scaleY = naturalSize.h / rect.height;
      const nx = dx * scaleX;
      const ny = dy * scaleY;

      switch (handle) {
        case "tl": x += nx; y += ny; w -= nx; h -= ny; break;
        case "tc": y += ny; h -= ny; break;
        case "tr": w += nx; y += ny; h -= ny; break;
        case "ml": x += nx; w -= nx; break;
        case "mr": w += nx; break;
        case "bl": x += nx; w -= nx; h += ny; break;
        case "bc": h += ny; break;
        case "br": w += nx; h += ny; break;
      }

      if (ratio) {
        // Enforce aspect ratio — use the dominant axis
        if (["tl", "tr", "bl", "br"].includes(handle)) {
          h = w / ratio;
        } else if (["tc", "bc"].includes(handle)) {
          w = h * ratio;
        } else {
          h = w / ratio;
        }
      }

      return clampCrop({ x, y, w, h }, null);
    },
    [naturalSize, clampCrop]
  );

  const onPointerDownImg = useCallback(
    (e: React.PointerEvent) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      const pt = toNatural(e.clientX, e.clientY);
      if (!pt) return;
      dragRef.current = {
        mode: "draw",
        startClientX: e.clientX,
        startClientY: e.clientY,
        startCrop: { x: pt.x, y: pt.y, w: 0, h: 0 },
      };
      setCrop({ x: pt.x, y: pt.y, w: 0, h: 0 });
    },
    [toNatural]
  );

  const onPointerDownOverlay = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        mode: "move",
        startClientX: e.clientX,
        startClientY: e.clientY,
        startCrop: { ...crop },
      };
    },
    [crop]
  );

  const onPointerDownHandle = useCallback(
    (e: React.PointerEvent, handle: HandleId) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      dragRef.current = {
        mode: "resize",
        handle,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startCrop: { ...crop },
      };
    },
    [crop]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startClientX;
      const dy = e.clientY - d.startClientY;

      if (d.mode === "draw") {
        const pt = toNatural(e.clientX, e.clientY);
        if (!pt) return;
        const sx = d.startCrop.x;
        const sy = d.startCrop.y;
        const rawW = pt.x - sx;
        let rawH = pt.y - sy;
        if (aspectRatio) rawH = rawW / aspectRatio;
        const nx = rawW >= 0 ? sx : sx + rawW;
        const ny = rawH >= 0 ? sy : sy + rawH;
        const newCrop = clampCrop({ x: nx, y: ny, w: Math.abs(rawW), h: Math.abs(rawH) }, aspectRatio);
        setCrop(newCrop);
      } else if (d.mode === "move") {
        const rect = getImgRect();
        if (!rect) return;
        const scaleX = naturalSize.w / rect.width;
        const scaleY = naturalSize.h / rect.height;
        const nx = d.startCrop.x + dx * scaleX;
        const ny = d.startCrop.y + dy * scaleY;
        const cx = Math.max(0, Math.min(nx, naturalSize.w - d.startCrop.w));
        const cy = Math.max(0, Math.min(ny, naturalSize.h - d.startCrop.h));
        setCrop({ ...d.startCrop, x: cx, y: cy });
      } else if (d.mode === "resize" && d.handle) {
        setCrop(applyHandleDelta(d.startCrop, d.handle, dx, dy, aspectRatio));
      }
    },
    [toNatural, clampCrop, applyHandleDelta, aspectRatio, naturalSize]
  );

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // ---------- preset ratio ----------

  const applyPreset = (ratio: number | null) => {
    setAspectRatio(ratio);
    if (!ratio || naturalSize.w === 0) return;
    let w = naturalSize.w;
    let h = w / ratio;
    if (h > naturalSize.h) { h = naturalSize.h; w = h * ratio; }
    setCrop({ x: (naturalSize.w - w) / 2, y: (naturalSize.h - h) / 2, w, h });
  };

  // ---------- manual input ----------

  const applyManual = () => {
    const w = Math.max(MIN_SIZE, Math.min(Number(manualW) || crop.w, naturalSize.w));
    const h = Math.max(MIN_SIZE, Math.min(Number(manualH) || crop.h, naturalSize.h));
    setCrop((c) => clampCrop({ x: c.x, y: c.y, w, h }, null));
  };

  // ---------- overlay % positioning ----------

  const pct = naturalSize.w > 0
    ? {
        left:   `${(crop.x / naturalSize.w) * 100}%`,
        top:    `${(crop.y / naturalSize.h) * 100}%`,
        width:  `${(crop.w / naturalSize.w) * 100}%`,
        height: `${(crop.h / naturalSize.h) * 100}%`,
      }
    : {};

  const hasCrop = crop.w > MIN_SIZE && crop.h > MIN_SIZE;

  // ---------- crop apply ----------

  const handleCrop = async () => {
    if (!file || !hasCrop) { toast.error(t("crop.noArea")); return; }
    try {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(crop.w);
      canvas.height = Math.round(crop.h);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      const img = new Image();
      const url = URL.createObjectURL(file);
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(img, Math.round(crop.x), Math.round(crop.y), Math.round(crop.w), Math.round(crop.h), 0, 0, Math.round(crop.w), Math.round(crop.h));
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = reject;
        img.src = url;
      });

      const ext = getFileExtension(file.name);
      const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed"))), mime, 0.92)
      );

      setResult(blob);
      setResultPreview(URL.createObjectURL(blob));
      toast.success(t("crop.success", { w: Math.round(crop.w), h: Math.round(crop.h) }));
    } catch {
      toast.error(t("crop.fail"));
    }
  };

  const reset = () => {
    setFile(null);
    setImageUrl(null);
    setResult(null);
    setResultPreview(null);
    setCrop({ x: 0, y: 0, w: 0, h: 0 });
    setNaturalSize({ w: 0, h: 0 });
  };

  // ---------- render ----------

  return (
    <ToolLayout
      toolName="Crop Image"
      toolDescription="Crop images with preset aspect ratios or free-form selection. Drag handles to resize, drag inside to move."
    >
      <div className="space-y-5">
        {!file ? (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{ "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] }}
            formats={["JPG", "PNG", "WEBP"]}
            label="Drop your image here or click to browse"
          />
        ) : !result ? (
          <>
            {/* Aspect ratio presets */}
            <div className="glass rounded-2xl p-4 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-t-secondary">
                <input
                  type="checkbox"
                  checked={showThirds}
                  onChange={(e) => setShowThirds(e.target.checked)}
                  className="rounded border-border accent-accent"
                />
                {t("crop.showThirds")}
              </label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => applyPreset(p.value)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      aspectRatio === p.value
                        ? "bg-accent/15 border border-accent text-accent"
                        : "bg-bg-secondary border border-border text-t-secondary hover:border-border-strong hover:text-t-primary"
                    }`}
                  >
                    {p.value === null ? t("crop.free") : p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Crop canvas */}
            {imageUrl && (
              <div
                className="glass rounded-2xl p-2 select-none overflow-hidden"
                style={{ cursor: "crosshair" }}
              >
                <div
                  className="relative inline-block w-full"
                  onPointerDown={onPointerDownImg}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    ref={imgRef}
                    src={imageUrl}
                    alt="Crop source"
                    className="w-full max-h-[480px] object-contain rounded-xl block select-none"
                    draggable={false}
                  />

                  {/* Dark mask + crop box */}
                  {hasCrop && (
                    <>
                      {/* semi-transparent overlay around crop */}
                      <div className="absolute inset-0 pointer-events-none rounded-xl"
                        style={{ background: "rgba(0,0,0,0.45)" }} />

                      {/* Crop box — clears the overlay and provides handles */}
                      <div
                        className="absolute pointer-events-auto"
                        style={{
                          ...pct,
                          boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
                          border: "2px solid rgba(99,102,241,0.9)",
                          cursor: "move",
                          background: "transparent",
                        }}
                        onPointerDown={onPointerDownOverlay}
                        onPointerMove={onPointerMove}
                        onPointerUp={onPointerUp}
                      >
                        {showThirds && (
                          <div
                            className="absolute inset-0 pointer-events-none opacity-30"
                            style={{
                              backgroundImage:
                                "linear-gradient(rgba(255,255,255,0.6) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.6) 1px,transparent 1px)",
                              backgroundSize: "33.33% 33.33%",
                            }}
                          />
                        )}

                        {/* 8 resize handles */}
                        {HANDLES.map(({ id, cursor, posStyle }) => (
                          <div
                            key={id}
                            className="absolute w-[10px] h-[10px] bg-white border-2 border-accent rounded-sm shadow"
                            style={{ ...posStyle, cursor, zIndex: 10 }}
                            onPointerDown={(e) => onPointerDownHandle(e, id)}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Info bar + manual input */}
            <div className="glass rounded-2xl p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-t-tertiary mb-1">Selection (px)</p>
                  <p className="text-sm text-t-primary font-mono">
                    {Math.round(crop.w)} × {Math.round(crop.h)}
                    {hasCrop && (
                      <span className="text-t-tertiary ml-2">
                        from ({Math.round(crop.x)}, {Math.round(crop.y)})
                      </span>
                    )}
                  </p>
                </div>

                {/* Manual W/H inputs */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-t-tertiary">W</span>
                    <input
                      type="number"
                      value={manualW}
                      onChange={(e) => setManualW(e.target.value)}
                      onBlur={applyManual}
                      onKeyDown={(e) => e.key === "Enter" && applyManual()}
                      className="w-20 px-2 py-1.5 rounded-lg bg-bg-secondary border border-border text-t-primary text-xs focus:outline-none focus:border-accent/50 font-mono"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-t-tertiary">H</span>
                    <input
                      type="number"
                      value={manualH}
                      onChange={(e) => setManualH(e.target.value)}
                      onBlur={applyManual}
                      onKeyDown={(e) => e.key === "Enter" && applyManual()}
                      className="w-20 px-2 py-1.5 rounded-lg bg-bg-secondary border border-border text-t-primary text-xs focus:outline-none focus:border-accent/50 font-mono"
                    />
                  </div>
                </div>

                {naturalSize.w > 0 && (
                  <p className="text-xs text-t-tertiary whitespace-nowrap">
                    Original: {naturalSize.w} × {naturalSize.h}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCrop}
                disabled={!hasCrop}
                className={`flex-1 sm:flex-none px-8 py-3 rounded-xl font-semibold text-white transition-all ${
                  hasCrop
                    ? "bg-accent hover:bg-accent-hover hover:scale-[1.02] active:scale-[0.98]"
                    : "bg-bg-secondary text-t-tertiary cursor-not-allowed border border-border"
                }`}
              >
                {t("crop.button")}
              </button>
              <button onClick={reset} className="px-5 py-3 rounded-xl text-t-secondary hover:text-t-primary transition-colors text-sm">
                Cancel
              </button>
            </div>
          </>
        ) : (
          /* Result */
          <div className="space-y-5">
            <div className="glass rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-t-primary">
                  {Math.round(crop.w)} × {Math.round(crop.h)}px
                </p>
                <p className="text-xs text-t-tertiary mt-0.5">Cropped successfully</p>
              </div>
              <span className="text-emerald-400 text-xl">✓</span>
            </div>

            {resultPreview && (
              <div className="flex justify-center glass rounded-2xl p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={resultPreview} alt="Cropped result"
                  className="max-h-80 max-w-full rounded-xl border border-border object-contain" />
              </div>
            )}

            <div className="flex flex-wrap gap-3 justify-center">
              <DownloadButton
                blob={result}
                filename={`${getFileNameWithoutExtension(file!.name)}-cropped${getFileExtension(file!.name)}`}
                label={t("crop.download")}
              />
              <button onClick={reset}
                className="px-6 py-3 rounded-xl font-semibold text-t-secondary bg-bg-secondary hover:bg-bg-tertiary transition-colors border border-border">
                {t("crop.another")}
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
