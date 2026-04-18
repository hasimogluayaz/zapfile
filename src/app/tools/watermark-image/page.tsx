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

// ─── Types ────────────────────────────────────────────────────────────────────

type GridPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-center"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "custom";

type FontFamily =
  | "sans-serif"
  | "serif"
  | "monospace"
  | "Impact, sans-serif"
  | "Georgia, serif";

const GRID_CELLS: { value: GridPosition; label: string }[] = [
  { value: "top-left", label: "TL" },
  { value: "top-center", label: "TC" },
  { value: "top-right", label: "TR" },
  { value: "middle-left", label: "ML" },
  { value: "middle-center", label: "MC" },
  { value: "middle-right", label: "MR" },
  { value: "bottom-left", label: "BL" },
  { value: "bottom-center", label: "BC" },
  { value: "bottom-right", label: "BR" },
];

const FONT_FAMILIES: { value: FontFamily; label: string }[] = [
  { value: "sans-serif", label: "Sans-serif" },
  { value: "serif", label: "Serif" },
  { value: "monospace", label: "Monospace" },
  { value: "Impact, sans-serif", label: "Impact" },
  { value: "Georgia, serif", label: "Georgia" },
];

// ─── Draw helper ──────────────────────────────────────────────────────────────

interface DrawOptions {
  text: string;
  fontSize: number;
  opacity: number;
  gridPosition: GridPosition;
  customX: number; // 0–100 %
  customY: number; // 0–100 %
  color: string;
  fontFamily: FontFamily;
  bold: boolean;
  italic: boolean;
  rotation: number; // degrees
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  tileEnabled: boolean;
  textBgEnabled: boolean;
}

function resolveAlignment(pos: GridPosition): {
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  xFraction: number;
  yFraction: number;
} {
  switch (pos) {
    case "top-left":
      return { textAlign: "left", textBaseline: "top", xFraction: 0, yFraction: 0 };
    case "top-center":
      return { textAlign: "center", textBaseline: "top", xFraction: 0.5, yFraction: 0 };
    case "top-right":
      return { textAlign: "right", textBaseline: "top", xFraction: 1, yFraction: 0 };
    case "middle-left":
      return { textAlign: "left", textBaseline: "middle", xFraction: 0, yFraction: 0.5 };
    case "middle-center":
      return { textAlign: "center", textBaseline: "middle", xFraction: 0.5, yFraction: 0.5 };
    case "middle-right":
      return { textAlign: "right", textBaseline: "middle", xFraction: 1, yFraction: 0.5 };
    case "bottom-left":
      return { textAlign: "left", textBaseline: "bottom", xFraction: 0, yFraction: 1 };
    case "bottom-center":
      return { textAlign: "center", textBaseline: "bottom", xFraction: 0.5, yFraction: 1 };
    case "bottom-right":
      return { textAlign: "right", textBaseline: "bottom", xFraction: 1, yFraction: 1 };
    default:
      return { textAlign: "center", textBaseline: "middle", xFraction: 0.5, yFraction: 0.5 };
  }
}

function drawWatermarkToCanvas(
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  opts: DrawOptions,
): void {
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  if (!opts.text.trim()) return;

  const padding = Math.max(16, canvas.width * 0.02);
  const fontStyle = `${opts.italic ? "italic " : ""}${opts.bold ? "bold " : ""}${opts.fontSize}px ${opts.fontFamily}`;

  if (opts.tileEnabled) {
    // Tile: repeat in a diagonal grid
    ctx.save();
    ctx.globalAlpha = opts.opacity / 100;
    ctx.font = fontStyle;
    ctx.fillStyle = opts.color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const metrics = ctx.measureText(opts.text);
    const tileW = metrics.width + opts.fontSize * 2;
    const tileH = opts.fontSize * 2.5;

    for (let row = -2; row * tileH < canvas.height + tileH * 2; row++) {
      for (let col = -2; col * tileW < canvas.width + tileW * 2; col++) {
        const cx = col * tileW + (row % 2 === 0 ? 0 : tileW / 2);
        const cy = row * tileH;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate((-35 * Math.PI) / 180);
        if (opts.textBgEnabled) {
          const bw = metrics.width + 12;
          const bh = opts.fontSize + 8;
          ctx.fillStyle = "rgba(0,0,0,0.35)";
          ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
          ctx.fillStyle = opts.color;
        }
        if (opts.strokeEnabled && opts.strokeWidth > 0) {
          ctx.strokeStyle = opts.strokeColor;
          ctx.lineWidth = opts.strokeWidth;
          ctx.strokeText(opts.text, 0, 0);
        }
        ctx.fillStyle = opts.color;
        ctx.fillText(opts.text, 0, 0);
        ctx.restore();
      }
    }
    ctx.restore();
    return;
  }

  // Single-position watermark
  const { textAlign, textBaseline, xFraction, yFraction } =
    opts.gridPosition === "custom"
      ? {
          textAlign: "center" as CanvasTextAlign,
          textBaseline: "middle" as CanvasTextBaseline,
          xFraction: opts.customX / 100,
          yFraction: opts.customY / 100,
        }
      : resolveAlignment(opts.gridPosition);

  let x: number;
  let y: number;

  if (opts.gridPosition === "custom") {
    x = canvas.width * (opts.customX / 100);
    y = canvas.height * (opts.customY / 100);
  } else {
    // Use xFraction/yFraction to determine base point, then offset by padding
    const xEdge = xFraction === 0 ? padding : xFraction === 1 ? canvas.width - padding : canvas.width / 2;
    const yEdge =
      yFraction === 0
        ? padding
        : yFraction === 1
          ? canvas.height - padding
          : canvas.height / 2;
    x = xEdge;
    y = yEdge;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((opts.rotation * Math.PI) / 180);

  ctx.font = fontStyle;
  ctx.globalAlpha = opts.opacity / 100;
  ctx.textAlign = textAlign;
  ctx.textBaseline = textBaseline;

  // Text background
  if (opts.textBgEnabled) {
    const metrics = ctx.measureText(opts.text);
    const bw = metrics.width + 14;
    const bh = opts.fontSize + 10;
    let bgX = 0;
    let bgY = 0;
    if (textAlign === "left") bgX = 0;
    else if (textAlign === "right") bgX = -bw;
    else bgX = -bw / 2;
    if (textBaseline === "top") bgY = 0;
    else if (textBaseline === "bottom") bgY = -bh;
    else bgY = -bh / 2;
    ctx.globalAlpha = (opts.opacity / 100) * 0.75;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.roundRect(bgX - 2, bgY - 2, bw + 4, bh + 4, 4);
    ctx.fill();
    ctx.globalAlpha = opts.opacity / 100;
  }

  // Shadow
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 3;

  // Stroke
  if (opts.strokeEnabled && opts.strokeWidth > 0) {
    ctx.strokeStyle = opts.strokeColor;
    ctx.lineWidth = opts.strokeWidth * 2;
    ctx.lineJoin = "round";
    ctx.strokeText(opts.text, 0, 0);
  }

  ctx.fillStyle = opts.color;
  ctx.fillText(opts.text, 0, 0);

  ctx.restore();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WatermarkImagePage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Text
  const [watermarkText, setWatermarkText] = useState("ZapFile");
  const [fontSize, setFontSize] = useState(48);
  const [opacity, setOpacity] = useState(50);
  const [color, setColor] = useState("#ffffff");

  // Font
  const [fontFamily, setFontFamily] = useState<FontFamily>("sans-serif");
  const [bold, setBold] = useState(true);
  const [italic, setItalic] = useState(false);
  const [rotation, setRotation] = useState(0);

  // Stroke
  const [strokeEnabled, setStrokeEnabled] = useState(false);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(2);

  // Position
  const [gridPosition, setGridPosition] = useState<GridPosition>("bottom-right");
  const [customX, setCustomX] = useState(50);
  const [customY, setCustomY] = useState(50);

  // Extra
  const [tileEnabled, setTileEnabled] = useState(false);
  const [textBgEnabled, setTextBgEnabled] = useState(false);

  // Result
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultPreview, setResultPreview] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // ── Collect all drawing options into one object ──────────────────────────
  const drawOpts: DrawOptions = {
    text: watermarkText,
    fontSize,
    opacity,
    gridPosition,
    customX,
    customY,
    color,
    fontFamily,
    bold,
    italic,
    rotation,
    strokeEnabled,
    strokeColor,
    strokeWidth,
    tileEnabled,
    textBgEnabled,
  };

  // Keep a stable ref to the latest drawOpts so the file-load callback always
  // uses current settings without needing to be in its dependency array.
  const drawOptsRef = useRef<DrawOptions>(drawOpts);
  drawOptsRef.current = drawOpts;

  // ── Redraw live preview whenever any setting changes ─────────────────────
  const redraw = useCallback((img: HTMLImageElement, opts: DrawOptions) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawWatermarkToCanvas(canvas, img, opts);
    setPreview(canvas.toDataURL("image/png"));
  }, []);

  useEffect(() => {
    if (imgRef.current) {
      redraw(imgRef.current, drawOpts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    watermarkText, fontSize, opacity, color,
    fontFamily, bold, italic, rotation,
    strokeEnabled, strokeColor, strokeWidth,
    gridPosition, customX, customY,
    tileEnabled, textBgEnabled,
  ]);

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      const f = files[0];
      setFile(f);
      setResultBlob(null);
      setResultPreview(null);

      const img = new window.Image();
      img.onload = () => {
        imgRef.current = img;
        const canvas = canvasRef.current;
        if (canvas) {
          drawWatermarkToCanvas(canvas, img, drawOptsRef.current);
          setPreview(canvas.toDataURL("image/png"));
        }
      };
      img.onerror = () => toast.error(t("ui.failedLoad"));
      img.src = URL.createObjectURL(f);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
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
        toast.success(t("wm.success"));
      } else {
        toast.error(t("ui.failedExport"));
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

  // ── Shared label style ───────────────────────────────────────────────────
  const labelCls = "block text-[12px] text-t-secondary mb-1.5";
  const inputCls =
    "w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border text-[13px] text-t-primary placeholder:text-t-secondary/50 focus:outline-none focus:border-accent/50 transition-colors";
  const rangeRow = "flex justify-between mb-1.5";
  const rangeLabelCls = "text-[12px] text-t-secondary";
  const rangeValCls = "text-[12px] font-mono text-t-secondary";

  return (
    <ToolLayout
      toolName="Add Watermark"
      toolDescription="Add custom text watermarks to images with full control over position, style, and opacity."
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              {/* ── Left: Live preview ── */}
              <div className="glass rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-t-secondary uppercase tracking-wider">
                    {t("ui.livePreview")}
                  </p>
                  <button
                    onClick={reset}
                    className="text-[11px] text-t-secondary hover:text-red-400 transition-colors"
                  >
                    {t("ui.remove")}
                  </button>
                </div>
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt="Watermark preview"
                    className="w-full rounded-lg border border-border object-contain"
                  />
                ) : (
                  <div className="h-48 flex items-center justify-center rounded-lg border border-border text-[12px] text-t-secondary">
                    Loading…
                  </div>
                )}
                <p className="text-[11px] text-t-secondary truncate">
                  {file.name} &middot; {formatFileSize(file.size)}
                </p>
              </div>

              {/* ── Right: Controls ── */}
              <div className="space-y-4">

                {/* Text settings card */}
                <div className="glass rounded-xl p-5 space-y-4">
                  <h3 className="text-[13px] font-semibold text-t-primary">Text</h3>

                  {/* Watermark text */}
                  <div>
                    <label className={labelCls}>{t("wm.watermarkText")}</label>
                    <input
                      type="text"
                      value={watermarkText}
                      onChange={(e) => setWatermarkText(e.target.value)}
                      placeholder={t("wm.enterText")}
                      className={inputCls}
                    />
                  </div>

                  {/* Font family */}
                  <div>
                    <label className={labelCls}>Font Family</label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value as FontFamily)}
                      className={`${inputCls} appearance-none cursor-pointer`}
                    >
                      {FONT_FAMILIES.map((f) => (
                        <option key={f.value} value={f.value} className="bg-bg-secondary text-t-primary">
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bold / Italic toggles */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setBold((v) => !v)}
                      className={`flex-1 py-2 rounded-xl text-[13px] font-bold border transition-all ${
                        bold
                          ? "border-accent bg-accent/20 text-t-primary"
                          : "border-border bg-bg-secondary text-t-secondary hover:border-accent/50"
                      }`}
                    >
                      B
                    </button>
                    <button
                      onClick={() => setItalic((v) => !v)}
                      className={`flex-1 py-2 rounded-xl text-[13px] italic border transition-all ${
                        italic
                          ? "border-accent bg-accent/20 text-t-primary"
                          : "border-border bg-bg-secondary text-t-secondary hover:border-accent/50"
                      }`}
                    >
                      I
                    </button>
                  </div>

                  {/* Font size */}
                  <div>
                    <div className={rangeRow}>
                      <label className={rangeLabelCls}>{t("wm.fontSize")}</label>
                      <span className={rangeValCls}>{fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min={12}
                      max={200}
                      step={1}
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full accent-accent"
                    />
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[10px] text-t-secondary">12</span>
                      <span className="text-[10px] text-t-secondary">200</span>
                    </div>
                  </div>

                  {/* Opacity */}
                  <div>
                    <div className={rangeRow}>
                      <label className={rangeLabelCls}>{t("wm.opacity")}</label>
                      <span className={rangeValCls}>{opacity}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={1}
                      value={opacity}
                      onChange={(e) => setOpacity(Number(e.target.value))}
                      className="w-full accent-accent"
                    />
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[10px] text-t-secondary">10%</span>
                      <span className="text-[10px] text-t-secondary">100%</span>
                    </div>
                  </div>

                  {/* Rotation */}
                  <div>
                    <div className={rangeRow}>
                      <label className={rangeLabelCls}>Rotation</label>
                      <span className={rangeValCls}>{rotation}°</span>
                    </div>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={1}
                      value={rotation}
                      onChange={(e) => setRotation(Number(e.target.value))}
                      className="w-full accent-accent"
                    />
                    <div className="flex justify-between mt-0.5">
                      <span className="text-[10px] text-t-secondary">-180°</span>
                      <span className="text-[10px] text-t-secondary">180°</span>
                    </div>
                  </div>

                  {/* Color */}
                  <div>
                    <label className={labelCls}>Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-bg-secondary p-0.5"
                      />
                      <span className="text-[12px] font-mono text-t-secondary">{color}</span>
                    </div>
                  </div>
                </div>

                {/* Stroke card */}
                <div className="glass rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[13px] font-semibold text-t-primary">Stroke / Outline</h3>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={strokeEnabled}
                        onChange={(e) => setStrokeEnabled(e.target.checked)}
                        className="accent-accent"
                      />
                      <span className="text-[12px] text-t-secondary">Enable</span>
                    </label>
                  </div>
                  {strokeEnabled && (
                    <>
                      <div>
                        <label className={labelCls}>Stroke Color</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={strokeColor}
                            onChange={(e) => setStrokeColor(e.target.value)}
                            className="w-10 h-10 rounded-lg cursor-pointer border border-border bg-bg-secondary p-0.5"
                          />
                          <span className="text-[12px] font-mono text-t-secondary">{strokeColor}</span>
                        </div>
                      </div>
                      <div>
                        <div className={rangeRow}>
                          <label className={rangeLabelCls}>Stroke Width</label>
                          <span className={rangeValCls}>{strokeWidth}px</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={4}
                          step={0.5}
                          value={strokeWidth}
                          onChange={(e) => setStrokeWidth(Number(e.target.value))}
                          className="w-full accent-accent"
                        />
                        <div className="flex justify-between mt-0.5">
                          <span className="text-[10px] text-t-secondary">0</span>
                          <span className="text-[10px] text-t-secondary">4px</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Position card */}
                <div className="glass rounded-xl p-5 space-y-4">
                  <h3 className="text-[13px] font-semibold text-t-primary">Position</h3>

                  {/* 3×3 grid picker */}
                  <div>
                    <label className={labelCls}>Grid Position</label>
                    <div className="grid grid-cols-3 gap-1.5 w-fit">
                      {GRID_CELLS.map((cell) => (
                        <button
                          key={cell.value}
                          onClick={() => setGridPosition(cell.value)}
                          title={cell.value.replace("-", " ")}
                          className={`w-8 h-8 rounded border text-[10px] font-semibold transition-all ${
                            gridPosition === cell.value
                              ? "border-accent bg-accent/20 text-t-primary"
                              : "border-border bg-bg-secondary text-t-secondary hover:border-accent/50"
                          }`}
                        >
                          {cell.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom option */}
                  <div>
                    <button
                      onClick={() => setGridPosition("custom")}
                      className={`px-3 py-1.5 rounded-xl text-[12px] border transition-all ${
                        gridPosition === "custom"
                          ? "border-accent bg-accent/20 text-t-primary"
                          : "border-border bg-bg-secondary text-t-secondary hover:border-accent/50"
                      }`}
                    >
                      Custom X/Y
                    </button>
                  </div>

                  {gridPosition === "custom" && (
                    <div className="space-y-3">
                      <div>
                        <div className={rangeRow}>
                          <label className={rangeLabelCls}>X Position</label>
                          <span className={rangeValCls}>{customX}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={customX}
                          onChange={(e) => setCustomX(Number(e.target.value))}
                          className="w-full accent-accent"
                        />
                      </div>
                      <div>
                        <div className={rangeRow}>
                          <label className={rangeLabelCls}>Y Position</label>
                          <span className={rangeValCls}>{customY}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={customY}
                          onChange={(e) => setCustomY(Number(e.target.value))}
                          className="w-full accent-accent"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Extra options card */}
                <div className="glass rounded-xl p-5 space-y-3">
                  <h3 className="text-[13px] font-semibold text-t-primary">Extra Options</h3>

                  {/* Tile */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={tileEnabled}
                      onChange={(e) => setTileEnabled(e.target.checked)}
                      className="mt-0.5 accent-accent"
                    />
                    <div>
                      <span className="text-[13px] text-t-primary group-hover:text-accent transition-colors">
                        Tile across entire image
                      </span>
                      <p className="text-[11px] text-t-secondary mt-0.5">
                        Repeat watermark in a diagonal grid pattern
                      </p>
                    </div>
                  </label>

                  {/* Text background */}
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={textBgEnabled}
                      onChange={(e) => setTextBgEnabled(e.target.checked)}
                      className="mt-0.5 accent-accent"
                    />
                    <div>
                      <span className="text-[13px] text-t-primary group-hover:text-accent transition-colors">
                        Text background
                      </span>
                      <p className="text-[11px] text-t-secondary mt-0.5">
                        Semi-transparent dark fill behind the watermark
                      </p>
                    </div>
                  </label>
                </div>

                {/* Apply & Download */}
                <button
                  onClick={handleApplyAndDownload}
                  disabled={processing || !watermarkText.trim()}
                  className={`w-full px-6 py-3 rounded-xl font-semibold text-white transition-all ${
                    processing || !watermarkText.trim()
                      ? "bg-bg-secondary border border-border cursor-not-allowed text-t-secondary"
                      : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]"
                  }`}
                >
                  {processing ? "Applying…" : "Apply & Download"}
                </button>
              </div>
            </div>

            {/* Result section */}
            {resultBlob && resultPreview && (
              <div className="glass rounded-xl p-5 space-y-3">
                <p className="text-[13px] font-semibold text-t-primary">Last Export</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resultPreview}
                  alt="Watermarked result"
                  className="max-h-48 rounded-lg border border-border mx-auto block object-contain"
                />
                <div className="flex flex-wrap gap-3 justify-center">
                  <DownloadButton
                    blob={resultBlob}
                    filename={`${getFileNameWithoutExtension(file.name)}-watermarked.png`}
                    label={t("ui.downloadAgain")}
                  />
                  <button
                    onClick={reset}
                    className="px-6 py-2.5 rounded-xl text-[13px] font-semibold text-t-secondary bg-bg-secondary border border-border hover:border-accent/50 transition-colors"
                  >
                    {t("wm.newImage")}
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
