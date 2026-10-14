"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { Copy, Palette, Pipette, Trash2, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { decodeImage } from "@/lib/image-editor-kit";
import { useI18n } from "@/lib/i18n";

interface PickedColor {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
}

type SampleSize = 1 | 3 | 5;

const MAX_PICKS = 24;
const LOUPE_PX = 112; // loupe size on screen
const LOUPE_SRC = 15; // source pixels shown across the loupe (odd, so there's a centre pixel)

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function toPicked(r: number, g: number, b: number): PickedColor {
  return { hex: rgbToHex(r, g, b), rgb: { r, g, b }, hsl: rgbToHsl(r, g, b) };
}

function hexToPicked(hex: string): PickedColor | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return toPicked((n >> 16) & 255, (n >> 8) & 255, n & 255);
}

/** Readable text colour on top of a swatch. */
function inkFor(c: PickedColor) {
  const lum = (0.2126 * c.rgb.r + 0.7152 * c.rgb.g + 0.0722 * c.rgb.b) / 255;
  return lum > 0.6 ? "#16181d" : "#ffffff";
}

type EyeDropperCtor = new () => { open(): Promise<{ sRGBHex: string }> };

export default function ColorDropperPage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(null);
  const [hover, setHover] = useState<{ color: PickedColor; x: number; y: number; px: number; py: number } | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null); // image pixel coords (keyboard)
  const [picked, setPicked] = useState<PickedColor[]>([]);
  const [sample, setSample] = useState<SampleSize>(1);
  const [hasEyeDropper, setHasEyeDropper] = useState(false);

  const sourceRef = useRef<HTMLCanvasElement | null>(null); // full-resolution pixels, never in the DOM
  const viewRef = useRef<HTMLCanvasElement>(null);
  const loupeRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHasEyeDropper(typeof window !== "undefined" && "EyeDropper" in window);
  }, []);

  // ── Loading & drawing ──────────────────────────────────────────────────

  const drawView = useCallback(() => {
    const source = sourceRef.current;
    const view = viewRef.current;
    const wrap = wrapRef.current;
    if (!source || !view || !wrap) return;
    const maxW = wrap.clientWidth;
    const maxH = Math.min(window.innerHeight * 0.6, 640);
    const scale = Math.min(maxW / source.width, maxH / source.height, 1);
    const w = Math.max(1, Math.round(source.width * scale));
    const h = Math.max(1, Math.round(source.height * scale));
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    view.width = Math.round(w * dpr);
    view.height = Math.round(h * dpr);
    view.style.width = `${w}px`;
    view.style.height = `${h}px`;
    const ctx = view.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, view.width, view.height);
  }, []);

  const loadImage = useCallback(
    async (f: File) => {
      try {
        // EXIF-oriented and capped to the canvas budget (iOS), so huge photos still load.
        const { bitmap, width: w, height: h } = await decodeImage(f);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) throw new Error("no 2d context");
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
        sourceRef.current = canvas;
        setImageSize({ w, h });
        setCursor({ x: Math.floor(w / 2), y: Math.floor(h / 2) });
      } catch (error) {
        console.error(error);
        toast.error(t("dropper.loadFail"));
        setFile(null);
      }
    },
    [t],
  );

  useEffect(() => {
    if (!imageSize) return;
    drawView();
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => drawView());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [imageSize, drawView]);

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      const f = files[0];
      if (!f) return;
      setFile(f);
      setHover(null);
      sourceRef.current = null;
      setImageSize(null);
      void loadImage(f);
    },
    [loadImage],
  );

  // ── Sampling ───────────────────────────────────────────────────────────

  const colorAt = useCallback(
    (x: number, y: number): PickedColor | null => {
      const source = sourceRef.current;
      if (!source) return null;
      const ctx = source.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      const half = (sample - 1) / 2;
      const x0 = Math.max(0, x - half);
      const y0 = Math.max(0, y - half);
      const x1 = Math.min(source.width - 1, x + half);
      const y1 = Math.min(source.height - 1, y + half);
      const data = ctx.getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue; // ignore fully transparent pixels
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        n++;
      }
      if (!n) return null;
      return toPicked(Math.round(r / n), Math.round(g / n), Math.round(b / n));
    },
    [sample],
  );

  const toImageCoords = useCallback((clientX: number, clientY: number) => {
    const view = viewRef.current;
    const source = sourceRef.current;
    if (!view || !source) return null;
    const rect = view.getBoundingClientRect();
    const x = Math.floor(((clientX - rect.left) / rect.width) * source.width);
    const y = Math.floor(((clientY - rect.top) / rect.height) * source.height);
    if (x < 0 || y < 0 || x >= source.width || y >= source.height) return null;
    return { x, y };
  }, []);

  const drawLoupe = useCallback((x: number, y: number) => {
    const source = sourceRef.current;
    const loupe = loupeRef.current;
    if (!source || !loupe) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    loupe.width = LOUPE_PX * dpr;
    loupe.height = LOUPE_PX * dpr;
    const ctx = loupe.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, loupe.width, loupe.height);
    const half = (LOUPE_SRC - 1) / 2;
    ctx.drawImage(source, x - half, y - half, LOUPE_SRC, LOUPE_SRC, 0, 0, loupe.width, loupe.height);
    const cell = loupe.width / LOUPE_SRC;
    const box = cell * sample;
    const c = (loupe.width - box) / 2;
    ctx.lineWidth = 2 * dpr;
    ctx.strokeStyle = "rgba(0,0,0,0.75)";
    ctx.strokeRect(c, c, box, box);
    ctx.lineWidth = 1 * dpr;
    ctx.strokeStyle = "rgba(255,255,255,0.95)";
    ctx.strokeRect(c + dpr, c + dpr, box - 2 * dpr, box - 2 * dpr);
  }, [sample]);

  const pick = useCallback(
    (color: PickedColor | null) => {
      if (!color) return;
      setPicked((prev) => [color, ...prev.filter((c) => c.hex !== color.hex)].slice(0, MAX_PICKS));
      toast.success(t("dropper.picked", { hex: color.hex }));
    },
    [t],
  );

  // ── Pointer input (mouse, pen, touch) ───────────────────────────────────

  const updateHover = (e: React.PointerEvent) => {
    const p = toImageCoords(e.clientX, e.clientY);
    if (!p) {
      setHover(null);
      return;
    }
    const color = colorAt(p.x, p.y);
    if (!color) return;
    setHover({ color, x: e.clientX, y: e.clientY, px: p.x, py: p.y });
    setCursor(p);
  };

  useEffect(() => {
    if (hover) drawLoupe(hover.px, hover.py);
  }, [hover, drawLoupe]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updateHover(e);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType === "touch" && e.buttons === 0) return;
    updateHover(e);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const p = toImageCoords(e.clientX, e.clientY);
    if (p) pick(colorAt(p.x, p.y));
    if (e.pointerType !== "mouse") setHover(null);
  };

  // Keyboard: arrows move a crosshair (Shift = 10 px), Enter/Space picks.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const source = sourceRef.current;
    if (!source || !cursor) return;
    const step = e.shiftKey ? 10 : 1;
    let { x, y } = cursor;
    if (e.key === "ArrowLeft") x -= step;
    else if (e.key === "ArrowRight") x += step;
    else if (e.key === "ArrowUp") y -= step;
    else if (e.key === "ArrowDown") y += step;
    else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(colorAt(x, y));
      return;
    } else return;
    e.preventDefault();
    x = Math.max(0, Math.min(source.width - 1, x));
    y = Math.max(0, Math.min(source.height - 1, y));
    setCursor({ x, y });
    const view = viewRef.current;
    const color = colorAt(x, y);
    if (view && color) {
      const rect = view.getBoundingClientRect();
      setHover({
        color,
        x: rect.left + ((x + 0.5) / source.width) * rect.width,
        y: rect.top + ((y + 0.5) / source.height) * rect.height,
        px: x,
        py: y,
      });
    }
  };

  const pickFromScreen = async () => {
    const Ctor = (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper;
    if (!Ctor) return;
    try {
      const result = await new Ctor().open();
      pick(hexToPicked(result.sRGBHex));
    } catch {
      // user cancelled
    }
  };

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(t("dropper.copied", { text }));
      } catch {
        toast.error(t("ui.copyFailed"));
      }
    },
    [t],
  );

  const copyAll = () => {
    const css = picked.map((c, i) => `  --color-${i + 1}: ${c.hex};`).join("\n");
    void copy(`:root {\n${css}\n}`);
  };

  const reset = () => {
    setFile(null);
    setImageSize(null);
    setHover(null);
    sourceRef.current = null;
  };

  // Keep the loupe on screen, above the finger for touch.
  const loupeStyle = hover
    ? {
        left: Math.min(hover.x + 20, (typeof window !== "undefined" ? window.innerWidth : 9999) - LOUPE_PX - 12),
        top: Math.max(8, hover.y - LOUPE_PX - 36),
      }
    : undefined;

  const pillBtn =
    "inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-t-secondary transition-colors hover:bg-bg-secondary hover:text-t-primary";

  return (
    <ToolLayout toolName={t("tool.color-dropper.name")} toolDescription={t("tool.color-dropper.desc")}>
      <div className="space-y-5">
        {!file && (
          <>
            <FileDropzone
              onFilesSelected={handleFilesSelected}
              accept={{
                "image/jpeg": [".jpg", ".jpeg"],
                "image/png": [".png"],
                "image/webp": [".webp"],
                "image/gif": [".gif"],
                "image/avif": [".avif"],
                "image/bmp": [".bmp"],
              }}
              multiple={false}
              label={t("dropper.drop")}
              formats={["JPG", "PNG", "WEBP", "GIF"]}
            />
            {hasEyeDropper && (
              <button type="button" onClick={pickFromScreen} className={pillBtn}>
                <Pipette className="h-4 w-4" aria-hidden="true" />
                {t("dropper.screen")}
              </button>
            )}
          </>
        )}

        {file && (
          <div className="glass space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] text-t-secondary">{t("dropper.hint")}</p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="segmented" role="radiogroup" aria-label={t("dropper.sample")}>
                  {([1, 3, 5] as SampleSize[]).map((s) => (
                    <button
                      key={s}
                      type="button"
                      role="radio"
                      aria-checked={sample === s}
                      onClick={() => setSample(s)}
                      className={`rounded-[9px] px-2.5 py-1 text-[12.5px] font-medium ${
                        sample === s ? "bg-surface text-t-primary shadow-sm" : "text-t-secondary hover:text-t-primary"
                      }`}
                      title={s === 1 ? t("dropper.sample1") : t("dropper.sampleN", { n: s })}
                    >
                      {s === 1 ? "1 px" : `${s}×${s}`}
                    </button>
                  ))}
                </div>
                {hasEyeDropper && (
                  <button type="button" onClick={pickFromScreen} className={pillBtn}>
                    <Pipette className="h-4 w-4" aria-hidden="true" />
                    {t("dropper.screen")}
                  </button>
                )}
                <button type="button" onClick={reset} className={pillBtn}>
                  <X className="h-4 w-4" aria-hidden="true" />
                  {t("dropper.change")}
                </button>
              </div>
            </div>

            <div ref={wrapRef} className="flex justify-center rounded-xl bg-bg-secondary p-2">
              {imageSize ? (
                <canvas
                  ref={viewRef}
                  tabIndex={0}
                  role="img"
                  aria-label={t("dropper.canvasLabel")}
                  className="block cursor-crosshair touch-none select-none rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-volt"
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                  onPointerLeave={(e) => e.pointerType === "mouse" && setHover(null)}
                  onKeyDown={onKeyDown}
                  onBlur={() => setHover(null)}
                />
              ) : (
                <div className="h-48 w-full animate-pulse rounded-lg bg-bg-tertiary" />
              )}
            </div>

            {hover && (
              <div className="pointer-events-none fixed z-50" style={loupeStyle} aria-hidden="true">
                <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
                  <canvas ref={loupeRef} style={{ width: LOUPE_PX, height: LOUPE_PX }} className="block" />
                  <div
                    className="px-2 py-1 text-center font-mono text-[11px] font-medium"
                    style={{ background: hover.color.hex, color: inkFor(hover.color) }}
                  >
                    {hover.color.hex}
                  </div>
                </div>
              </div>
            )}
            <p className="sr-only" aria-live="polite">
              {hover ? hover.color.hex : ""}
            </p>
          </div>
        )}

        {picked.length > 0 && (
          <div className="glass space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[14px] font-semibold text-t-primary">
                {t("dropper.pickedTitle", { n: picked.length, max: MAX_PICKS })}
              </h3>
              <div className="flex gap-2">
                <button type="button" onClick={copyAll} className={pillBtn}>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  {t("dropper.copyCss")}
                </button>
                <button type="button" onClick={() => setPicked([])} className={pillBtn}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {t("dropper.clear")}
                </button>
              </div>
            </div>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {picked.map((color) => {
                const values = [
                  color.hex,
                  `rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`,
                  `hsl(${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%)`,
                ];
                return (
                  <li key={color.hex} className="flex items-center gap-3 rounded-xl border border-border bg-bg-secondary p-2.5">
                    <button
                      type="button"
                      onClick={() => copy(color.hex)}
                      className="h-12 w-12 shrink-0 rounded-lg border border-border shadow-inner"
                      style={{ backgroundColor: color.hex }}
                      aria-label={t("dropper.copyValue", { value: color.hex })}
                    />
                    <div className="min-w-0 flex-1">
                      {values.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => copy(v)}
                          className="block max-w-full truncate rounded px-1 text-start font-mono text-[12px] text-t-secondary hover:bg-bg-tertiary hover:text-t-primary"
                          title={t("dropper.copyValue", { value: v })}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                    <Link
                      href={`/tools/color-picker#${color.hex.slice(1).toLowerCase()}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-t-tertiary hover:bg-bg-tertiary hover:text-t-primary"
                      aria-label={t("dropper.v2.openPicker", { hex: color.hex })}
                      title={t("dropper.v2.openPicker", { hex: color.hex })}
                    >
                      <Palette className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setPicked((prev) => prev.filter((c) => c.hex !== color.hex))}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-t-tertiary hover:bg-bg-tertiary hover:text-t-primary"
                      aria-label={t("dropper.remove", { hex: color.hex })}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
