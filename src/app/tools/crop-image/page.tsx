"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeftRight,
  Download,
  FlipHorizontal2,
  FlipVertical2,
  ImagePlus,
  Loader2,
  Maximize2,
  Pencil,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { Segmented, Slider, Toggle, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { makeThumbnail, processImage, type OutputFormat } from "@/lib/image-engine";
import {
  canHaveAlpha,
  decodeOnMain,
  detectAlpha,
  formatLabel,
  keepFormatFor,
  outputName,
} from "@/lib/image-tools-kit";
import { BackgroundPicker, fitSize, useElementWidth, useMaxPreviewHeight } from "@/lib/image-tools-ui";
import { downloadBlob, formatFileSize } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
type FormatChoice = "keep" | OutputFormat;

interface Source {
  file: File;
  thumb: string;
  /** Oriented size in engine pixels. */
  W: number;
  H: number;
  alpha: boolean;
  mainDecode: boolean;
}

interface Result {
  blob: Blob;
  width: number;
  height: number;
  format: OutputFormat;
  preview: string;
}

const PRESETS: { id: string; a: number; b: number }[] = [
  { id: "1:1", a: 1, b: 1 },
  { id: "4:5", a: 4, b: 5 },
  { id: "3:2", a: 3, b: 2 },
  { id: "16:9", a: 16, b: 9 },
  { id: "9:16", a: 9, b: 16 },
];

const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const HANDLE_CURSOR: Record<Handle, string> = {
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  nw: "nwse-resize",
  se: "nwse-resize",
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Largest centred rectangle with ratio r (w/h) inside vw×vh. */
function centered(vw: number, vh: number, r: number | null): Rect {
  if (!r) return { x: 0, y: 0, w: vw, h: vh };
  let w = vw;
  let h = w / r;
  if (h > vh) {
    h = vh;
    w = h * r;
  }
  return { x: (vw - w) / 2, y: (vh - h) / 2, w, h };
}

/** Rectangle from a fixed anchor towards a pointer, honouring direction, ratio, bounds and minimum size. */
function fromAnchor(ax: number, ay: number, px: number, py: number, r: number | null, vw: number, vh: number, min: number, dirX?: number, dirY?: number): Rect {
  const sx = dirX ?? (px >= ax ? 1 : -1);
  const sy = dirY ?? (py >= ay ? 1 : -1);
  let w = Math.max(min, sx * (px - ax));
  let h = Math.max(min, sy * (py - ay));
  if (r) {
    if (w / h > r) h = w / r;
    else w = h * r;
  }
  const maxW = sx > 0 ? vw - ax : ax;
  const maxH = sy > 0 ? vh - ay : ay;
  if (w > maxW) {
    w = maxW;
    if (r) h = w / r;
  }
  if (h > maxH) {
    h = maxH;
    if (r) w = h * r;
  }
  return { x: sx > 0 ? ax : ax - w, y: sy > 0 ? ay : ay - h, w, h };
}

/** View (rotated/flipped) point → source point. Engine order: flip, then rotate clockwise. */
function viewToSource(vx: number, vy: number, rot: number, fh: boolean, fv: boolean, W: number, H: number) {
  let x: number;
  let y: number;
  if (rot === 1) {
    x = vy;
    y = H - vx;
  } else if (rot === 2) {
    x = W - vx;
    y = H - vy;
  } else if (rot === 3) {
    x = W - vy;
    y = vx;
  } else {
    x = vx;
    y = vy;
  }
  return { x: fh ? W - x : x, y: fv ? H - y : y };
}

export default function CropImagePage() {
  const { t } = useI18n();
  const [src, setSrc] = useState<Source | null>(null);
  const [loading, setLoading] = useState(false);
  const [rot, setRot] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [crop, setCrop] = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 });
  /** Locked ratio as a w:h pair in view orientation; null = free. */
  const [ratio, setRatio] = useState<{ id: string; a: number; b: number } | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [format, setFormat] = useState<FormatChoice>("keep");
  const [quality, setQuality] = useState(0.92);
  const [background, setBackground] = useState("#ffffff");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [wText, setWText] = useState("");
  const [hText, setHText] = useState("");
  const [editing, setEditing] = useState<"w" | "h" | null>(null);
  const loadId = useRef(0);
  const runId = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; mode: "draw" | "move" | Handle; start: { x: number; y: number }; startCrop: Rect; moved: boolean } | null>(null);
  const [frameRef, frameWidth] = useElementWidth();
  const maxH = useMaxPreviewHeight(0.62, 560);

  const W = src?.W ?? 0;
  const H = src?.H ?? 0;
  const VW = rot % 2 ? H : W;
  const VH = rot % 2 ? W : H;
  const box = fitSize(VW, VH, Math.max(0, frameWidth), maxH);
  const scale = VW ? box.w / VW : 1;
  const r = ratio ? ratio.a / ratio.b : null;
  const minSize = Math.max(1, 24 / scale);

  // Free URLs.
  const srcRef = useRef(src);
  srcRef.current = src;
  const resultRef = useRef(result);
  resultRef.current = result;
  useEffect(
    () => () => {
      if (srcRef.current) URL.revokeObjectURL(srcRef.current.thumb);
      if (resultRef.current) URL.revokeObjectURL(resultRef.current.preview);
    },
    [],
  );

  const clearResult = useCallback(() => {
    runId.current++;
    setBusy(false);
    setResult((prev) => {
      if (prev) URL.revokeObjectURL(prev.preview);
      return null;
    });
  }, []);

  // ── Load ───────────────────────────────────────────────────────────────
  const handleFiles = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      const id = ++loadId.current;
      setLoading(true);
      clearResult();
      try {
        let thumb: { blob: Blob; width: number; height: number };
        let mainDecode = false;
        try {
          thumb = await makeThumbnail(file, 1600);
        } catch {
          thumb = await makeThumbnail(await decodeOnMain(file), 1600);
          mainDecode = true;
        }
        const alpha = canHaveAlpha(file) ? await detectAlpha(thumb.blob) : false;
        if (id !== loadId.current) return;
        setSrc((prev) => {
          if (prev) URL.revokeObjectURL(prev.thumb);
          return { file, thumb: URL.createObjectURL(thumb.blob), W: thumb.width, H: thumb.height, alpha, mainDecode };
        });
        setRot(0);
        setFlipH(false);
        setFlipV(false);
        setRatio(null);
        setCrop({ x: 0, y: 0, w: thumb.width, h: thumb.height });
      } catch {
        if (id === loadId.current) toast.error(t("ui.failedLoad"));
      } finally {
        if (id === loadId.current) setLoading(false);
      }
    },
    [clearResult, t],
  );

  const reset = () => {
    loadId.current++;
    clearResult();
    setSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev.thumb);
      return null;
    });
  };

  // Typed size mirrors the selection unless the user is typing.
  useEffect(() => {
    if (editing !== "w") setWText(String(Math.round(crop.w)));
    if (editing !== "h") setHText(String(Math.round(crop.h)));
  }, [crop.w, crop.h, editing]);

  // ── Pointer interaction ────────────────────────────────────────────────
  const toView = (e: { clientX: number; clientY: number }) => {
    const rect = stageRef.current!.getBoundingClientRect();
    return { x: clamp((e.clientX - rect.left) / scale, 0, VW), y: clamp((e.clientY - rect.top) / scale, 0, VH) };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    const target = (e.target as HTMLElement).closest<HTMLElement>("[data-crop]");
    const kind = target?.dataset.crop as "move" | Handle | undefined;
    const p = toView(e);
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
    drag.current = { id: e.pointerId, mode: kind ?? "draw", start: p, startCrop: crop, moved: false };
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const p = toView(e);
    const dx = p.x - d.start.x;
    const dy = p.y - d.start.y;
    if (!d.moved && Math.hypot(dx, dy) * scale < 3) return;
    d.moved = true;
    const c = d.startCrop;
    if (d.mode === "draw") {
      setCrop(fromAnchor(d.start.x, d.start.y, p.x, p.y, r, VW, VH, minSize));
    } else if (d.mode === "move") {
      setCrop({ ...c, x: clamp(c.x + dx, 0, VW - c.w), y: clamp(c.y + dy, 0, VH - c.h) });
    } else if (d.mode.length === 2) {
      const sx = d.mode.includes("e") ? 1 : -1;
      const sy = d.mode.includes("s") ? 1 : -1;
      const ax = sx > 0 ? c.x : c.x + c.w;
      const ay = sy > 0 ? c.y : c.y + c.h;
      const px = (sx > 0 ? c.x + c.w : c.x) + dx;
      const py = (sy > 0 ? c.y + c.h : c.y) + dy;
      setCrop(fromAnchor(ax, ay, px, py, r, VW, VH, minSize, sx, sy));
    } else {
      // Edge: change one side; with a locked ratio the other side follows, centred on the crop.
      const horizontal = d.mode === "e" || d.mode === "w";
      if (horizontal) {
        const ax = d.mode === "e" ? c.x : c.x + c.w;
        let w = clamp(d.mode === "e" ? c.w + dx : c.w - dx, minSize, d.mode === "e" ? VW - ax : ax);
        let h = c.h;
        let y = c.y;
        if (r) {
          h = w / r;
          if (h > VH) {
            h = VH;
            w = h * r;
          }
          y = clamp(c.y + c.h / 2 - h / 2, 0, VH - h);
        }
        setCrop({ x: d.mode === "e" ? ax : ax - w, y, w, h });
      } else {
        const ay = d.mode === "s" ? c.y : c.y + c.h;
        let h = clamp(d.mode === "s" ? c.h + dy : c.h - dy, minSize, d.mode === "s" ? VH - ay : ay);
        let w = c.w;
        let x = c.x;
        if (r) {
          w = h * r;
          if (w > VW) {
            w = VW;
            h = w / r;
          }
          x = clamp(c.x + c.w / 2 - w / 2, 0, VW - w);
        }
        setCrop({ x, y: d.mode === "s" ? ay : ay - h, w, h });
      }
    }
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    // A tap (no movement) never collapses the selection.
  };

  const onCropKey = (e: React.KeyboardEvent) => {
    const step = (e.shiftKey ? 10 : 1) * Math.max(1, Math.round(1 / scale));
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const m = moves[e.key];
    if (!m) return;
    e.preventDefault();
    setCrop((c) => ({ ...c, x: clamp(c.x + m[0], 0, VW - c.w), y: clamp(c.y + m[1], 0, VH - c.h) }));
  };

  // ── Ratio, rotate, flip ────────────────────────────────────────────────
  const applyRatio = (next: { id: string; a: number; b: number } | null) => {
    setRatio(next);
    if (next) setCrop(centered(VW, VH, next.a / next.b));
  };

  const rotateView = (dir: 1 | -1) => {
    // Turn the selection with the image.
    setCrop((c) => (dir === 1 ? { x: VH - (c.y + c.h), y: c.x, w: c.h, h: c.w } : { x: c.y, y: VW - (c.x + c.w), w: c.h, h: c.w }));
    setRatio((p) => (p ? { ...p, a: p.b, b: p.a } : p));
    setRot((v) => (v + (dir === 1 ? 1 : 3)) % 4);
  };

  const flipView = (axis: "h" | "v") => {
    // A mirror in view space maps to the other source axis when the view is turned 90°.
    const sourceH = (axis === "h") !== (rot % 2 === 1);
    if (sourceH) setFlipH((v) => !v);
    else setFlipV((v) => !v);
    setCrop((c) => (axis === "h" ? { ...c, x: VW - (c.x + c.w) } : { ...c, y: VH - (c.y + c.h) }));
  };

  const commitSize = (which: "w" | "h") => {
    setEditing(null);
    const n = Number(which === "w" ? wText : hText);
    if (!Number.isFinite(n) || n < 1) return;
    setCrop((c) => {
      let w = which === "w" ? clamp(Math.round(n), 1, VW) : c.w;
      let h = which === "h" ? clamp(Math.round(n), 1, VH) : c.h;
      if (r) {
        if (which === "w") h = w / r;
        else w = h * r;
        if (w > VW) {
          w = VW;
          h = w / r;
        }
        if (h > VH) {
          h = VH;
          w = h * r;
        }
      }
      const cx = c.x + c.w / 2;
      const cy = c.y + c.h / 2;
      return { x: clamp(cx - w / 2, 0, VW - w), y: clamp(cy - h / 2, 0, VH - h), w, h };
    });
  };

  // ── Export ─────────────────────────────────────────────────────────────
  const outFormat: OutputFormat = src ? (format === "keep" ? keepFormatFor(src.file, src.alpha) : format) : "image/png";

  const doCrop = async () => {
    if (!src) return;
    const id = ++runId.current;
    setBusy(true);
    try {
      const a = viewToSource(crop.x, crop.y, rot, flipH, flipV, W, H);
      const b = viewToSource(crop.x + crop.w, crop.y + crop.h, rot, flipH, flipV, W, H);
      const x = Math.round(Math.min(a.x, b.x));
      const y = Math.round(Math.min(a.y, b.y));
      const sourceCrop = {
        x,
        y,
        width: Math.max(1, Math.min(W - x, Math.round(Math.max(a.x, b.x)) - x)),
        height: Math.max(1, Math.min(H - y, Math.round(Math.max(a.y, b.y)) - y)),
      };
      const input = src.mainDecode ? ((await decodeOnMain(src.file)) as unknown as Blob) : src.file;
      const res = await processImage({
        input,
        transform: {
          crop: sourceCrop,
          rotate: rot * 90,
          flipH,
          flipV,
          background: outFormat === "image/jpeg" && src.alpha ? background : undefined,
        },
        encode: { format: outFormat, quality },
      });
      const thumb = await makeThumbnail(res.blob, 1200);
      if (id !== runId.current) return;
      setResult({ blob: res.blob, width: res.width, height: res.height, format: outFormat, preview: URL.createObjectURL(thumb.blob) });
    } catch (error) {
      console.error(error);
      if (id === runId.current) toast.error(t("crop.fail"));
    } finally {
      if (id === runId.current) setBusy(false);
    }
  };

  const resultName = src && result ? outputName(src.file, "-cropped", result.format) : "";
  const isFull = Math.round(crop.w) >= VW && Math.round(crop.h) >= VH && rot === 0 && !flipH && !flipV;

  // ── Render ─────────────────────────────────────────────────────────────
  const ratioChip = (active: boolean) =>
    `min-h-[36px] rounded-lg border px-3 text-[13px] font-medium tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt ${
      active ? "border-t-primary bg-bg-secondary text-t-primary" : "border-border text-t-secondary hover:bg-bg-secondary hover:text-t-primary"
    }`;
  const toolBtn =
    "flex h-10 w-10 items-center justify-center rounded-xl border border-border text-t-secondary transition hover:bg-bg-secondary hover:text-t-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt";

  const sel = { left: crop.x * scale, top: crop.y * scale, width: crop.w * scale, height: crop.h * scale };

  return (
    <ToolLayout
      toolName="Crop Image"
      toolDescription="Crop images with preset aspect ratios or free-form selection. Drag handles to resize, drag inside to move."
    >
      {!src ? (
        loading ? (
          <div className="glass flex h-64 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-t-tertiary" aria-label={t("ui.loading")} />
          </div>
        ) : (
          <FileDropzone
            onFilesSelected={handleFiles}
            accept={{
              "image/jpeg": [".jpg", ".jpeg", ".jfif"],
              "image/png": [".png"],
              "image/webp": [".webp"],
              "image/avif": [".avif"],
              "image/gif": [".gif"],
              "image/bmp": [".bmp"],
            }}
            formats={["JPG", "PNG", "WEBP", "AVIF", "GIF", "BMP"]}
            label={t("ui.dropImage")}
          />
        )
      ) : result ? (
        <div className="space-y-4">
          <div className="glass space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[15px] font-semibold tabular-nums text-t-primary">
                {result.width} × {result.height}
              </p>
              <p className="text-[13px] tabular-nums text-t-secondary">
                {formatLabel(result.format)} · {formatFileSize(result.blob.size)}
              </p>
            </div>
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={result.preview} alt={t("crop.ui.resultAlt")} className="max-h-[min(60vh,520px)] max-w-full rounded-lg border border-border object-contain" />
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" onClick={() => downloadBlob(result.blob, resultName)} className={buttonPrimary}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {t("crop.download")}
            </button>
            <button type="button" onClick={clearResult} className={buttonSecondary}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              {t("crop.v2.edit")}
            </button>
            <button type="button" onClick={reset} className={buttonSecondary}>
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
              {t("crop.another")}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <div className="glass min-w-0 p-3 sm:p-4">
            <div ref={frameRef} className="w-full">
              <div className="flex justify-center">
                <div
                  ref={stageRef}
                  dir="ltr"
                  className="relative flex select-none items-center justify-center overflow-hidden"
                  style={{ width: box.w, height: box.h, touchAction: "none", cursor: "crosshair" }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onLostPointerCapture={endDrag}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src.thumb}
                    alt={t("crop.ui.sourceAlt")}
                    draggable={false}
                    className="pointer-events-none max-w-none shrink-0"
                    style={{
                      width: W * scale,
                      height: H * scale,
                      transform: `rotate(${rot * 90}deg) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})`,
                    }}
                  />
                  {crop.w > 0 && (
                    <div
                      data-crop="move"
                      role="group"
                      tabIndex={0}
                      aria-label={t("crop.v2.areaLabel", { w: Math.round(crop.w), h: Math.round(crop.h) })}
                      onKeyDown={onCropKey}
                      className="absolute outline-none ring-volt focus-visible:ring-2"
                      style={{ ...sel, cursor: "move", boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.9)" }}
                    >
                      {(showGrid || dragging) && (
                        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
                          {[1, 2].map((n) => (
                            <g key={n} stroke="rgba(255,255,255,0.7)" strokeWidth={1}>
                              <line x1={`${(n / 3) * 100}%`} x2={`${(n / 3) * 100}%`} y1="0" y2="100%" />
                              <line y1={`${(n / 3) * 100}%`} y2={`${(n / 3) * 100}%`} x1="0" x2="100%" />
                            </g>
                          ))}
                        </svg>
                      )}
                      {HANDLES.map((h) => {
                        const corner = h.length === 2;
                        const left = h.includes("w") ? 0 : h.includes("e") ? sel.width : sel.width / 2;
                        const top = h.includes("n") ? 0 : h.includes("s") ? sel.height : sel.height / 2;
                        return (
                          <div
                            key={h}
                            data-crop={h}
                            className="absolute flex h-11 w-11 items-center justify-center"
                            style={{ left: left - 22, top: top - 22, cursor: HANDLE_CURSOR[h] }}
                          >
                            <span
                              className="block rounded-sm bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
                              style={corner ? { width: 12, height: 12 } : h === "n" || h === "s" ? { width: 22, height: 5 } : { width: 5, height: 22 }}
                            />
                          </div>
                        );
                      })}
                      {dragging && (
                        <span className="pointer-events-none absolute start-1.5 top-1.5 rounded bg-black/65 px-1.5 py-0.5 text-[11.5px] font-medium tabular-nums text-white">
                          {Math.round(crop.w)} × {Math.round(crop.h)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <p className="mt-3 text-center text-[12.5px] text-t-tertiary">{t("crop.v2.help")}</p>
          </div>

          <div className="space-y-4 lg:sticky lg:top-20">
            <div className="glass space-y-4 p-5">
              <div className="space-y-2">
                <p className={sectionTitle}>{t("crop.v2.ratio")}</p>
                <div className="flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => applyRatio(null)} aria-pressed={!ratio} className={ratioChip(!ratio)}>
                    {t("crop.free")}
                  </button>
                  <button
                    type="button"
                    onClick={() => applyRatio({ id: "original", a: VW, b: VH })}
                    aria-pressed={ratio?.id === "original"}
                    className={ratioChip(ratio?.id === "original")}
                  >
                    {t("ui.original")}
                  </button>
                  {PRESETS.map((p) => {
                    const active = ratio?.id === p.id;
                    const label = active ? `${ratio!.a}:${ratio!.b}` : p.id;
                    return (
                      <button key={p.id} type="button" onClick={() => applyRatio({ ...p })} aria-pressed={active} className={ratioChip(active)}>
                        {label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => ratio && applyRatio({ ...ratio, a: ratio.b, b: ratio.a })}
                    disabled={!ratio || ratio.a === ratio.b}
                    aria-label={t("crop.v2.swap")}
                    title={t("crop.v2.swap")}
                    className={`${ratioChip(false)} inline-flex items-center disabled:opacity-40`}
                  >
                    <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[13px] text-t-secondary">{t("crop.ui.selectionPx")}</p>
                <div className="flex items-center gap-2">
                  <label className="flex flex-1 items-center gap-1.5">
                    <span className="text-[12px] text-t-tertiary">{t("crop.v2.w")}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={VW}
                      value={wText}
                      onFocus={() => setEditing("w")}
                      onChange={(e) => setWText(e.target.value)}
                      onBlur={() => commitSize("w")}
                      onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
                      className="h-10 w-full rounded-lg border border-border bg-bg-secondary px-2 text-[14px] tabular-nums text-t-primary focus:border-t-primary/40 focus:outline-none"
                      aria-label={t("ui.width")}
                    />
                  </label>
                  <span className="text-t-tertiary" aria-hidden="true">
                    ×
                  </span>
                  <label className="flex flex-1 items-center gap-1.5">
                    <span className="text-[12px] text-t-tertiary">{t("crop.v2.h")}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={VH}
                      value={hText}
                      onFocus={() => setEditing("h")}
                      onChange={(e) => setHText(e.target.value)}
                      onBlur={() => commitSize("h")}
                      onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
                      className="h-10 w-full rounded-lg border border-border bg-bg-secondary px-2 text-[14px] tabular-nums text-t-primary focus:border-t-primary/40 focus:outline-none"
                      aria-label={t("ui.height")}
                    />
                  </label>
                </div>
                <p className="text-[12px] tabular-nums text-t-tertiary">
                  {t("crop.ui.fromXY", { x: Math.round(crop.x), y: Math.round(crop.y) })} · {t("crop.ui.originalSize", { w: VW, h: VH })}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={() => rotateView(-1)} className={toolBtn} aria-label={t("rotimg.rotateLeft")} title={t("rotimg.rotateLeft")}>
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => rotateView(1)} className={toolBtn} aria-label={t("rotimg.rotateRight")} title={t("rotimg.rotateRight")}>
                  <RotateCw className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => flipView("h")} className={toolBtn} aria-label={t("rotimg.flipH")} title={t("rotimg.flipH")}>
                  <FlipHorizontal2 className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" onClick={() => flipView("v")} className={toolBtn} aria-label={t("rotimg.flipV")} title={t("rotimg.flipV")}>
                  <FlipVertical2 className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRatio(null);
                    setCrop({ x: 0, y: 0, w: VW, h: VH });
                  }}
                  className={toolBtn}
                  aria-label={t("crop.v2.selectAll")}
                  title={t("crop.v2.selectAll")}
                >
                  <Maximize2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <Toggle checked={showGrid} onChange={setShowGrid} label={t("crop.showThirds")} />
            </div>

            <div className="glass space-y-4 p-5">
              <div className="space-y-2">
                <p className={sectionTitle}>{t("compimg.format")}</p>
                <Segmented
                  label={t("compimg.format")}
                  size="sm"
                  value={format}
                  onChange={setFormat}
                  options={[
                    { value: "keep", label: t("compimg.keepFormat") },
                    { value: "image/jpeg", label: "JPG" },
                    { value: "image/webp", label: "WebP" },
                    { value: "image/png", label: "PNG" },
                  ]}
                />
                {format === "keep" && <p className="text-[12.5px] text-t-tertiary">{t("crop.v2.savesAs", { format: formatLabel(outFormat) })}</p>}
              </div>
              {outFormat !== "image/png" && (
                <Slider
                  label={t("ui.quality")}
                  value={Math.round(quality * 100)}
                  min={40}
                  max={100}
                  onChange={(v) => setQuality(v / 100)}
                  display={`${Math.round(quality * 100)}`}
                  hints={[t("compimg.smaller"), t("compimg.higher")]}
                />
              )}
              {outFormat === "image/jpeg" && src.alpha && (
                <BackgroundPicker value={background} onChange={setBackground} allowTransparent={false} label={t("convimg.v2.background")} hint={t("resize.v2.jpegAlphaHint")} />
              )}
              <button type="button" onClick={doCrop} disabled={busy || crop.w < 1 || crop.h < 1} className={`${buttonPrimary} w-full`}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {isFull ? t("crop.v2.saveFull") : t("crop.v2.cropTo", { w: Math.round(crop.w), h: Math.round(crop.h) })}
              </button>
              <button type="button" onClick={reset} className={`${buttonSecondary} w-full`}>
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                {t("crop.another")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
