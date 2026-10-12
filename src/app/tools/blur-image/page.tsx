"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Brush,
  Circle,
  Download,
  Eye,
  ImagePlus,
  Loader2,
  Maximize,
  Redo2,
  ScanFace,
  Square,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { Segmented, Slider, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { AbortError, extensionFor } from "@/lib/image-engine";
import {
  ctx2d,
  decodeImage,
  encodeCanvas,
  makeCanvas,
  makeProxy,
  nextFrame,
  releaseCanvas,
  resolveFormat,
  type DecodedImage,
  type FormatChoice,
} from "@/lib/image-editor-kit";
import { ExportFormatPicker, formatLabel } from "@/lib/image-editor-kit-ui";
import { downloadBlob, formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { hitTest, regionBox, renderRegion, type Effect, type Region, type Shape } from "./render";

type FaceDetectorLike = new (opts?: { fastMode?: boolean; maxDetectedFaces?: number }) => {
  detect(source: ImageBitmapSource): Promise<{ boundingBox: DOMRectReadOnly }[]>;
};

function getFaceDetector(): FaceDetectorLike | null {
  if (typeof window === "undefined") return null;
  return (window as unknown as { FaceDetector?: FaceDetectorLike }).FaceDetector ?? null;
}

interface Loaded {
  file: File;
  decoded: DecodedImage;
  proxy: ImageBitmap;
}

type Gesture =
  | { kind: "draw"; id: string; sx: number; sy: number; before: Region[] }
  | { kind: "brush"; id: string; lx: number; ly: number; before: Region[] }
  | { kind: "move"; id: string; sx: number; sy: number; orig: Region; before: Region[] }
  | { kind: "resize"; id: string; ax: number; ay: number; before: Region[] };

const EFFECT_LABEL: Record<Effect, string> = {
  blur: "blur.v2.effectBlur",
  pixelate: "blur.pixelate",
  blackout: "blur.blackout",
};

const ACCEPT_TYPES = ["image/jpeg", "image/png", "image/webp"];
let idSeq = 0;
const newId = () => `r${Date.now().toString(36)}${(idSeq++).toString(36)}`;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export default function BlurImagePage() {
  const { t } = useI18n();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState<Region[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [undo, setUndo] = useState<Region[][]>([]);
  const [redo, setRedo] = useState<Region[][]>([]);
  const [tool, setTool] = useState<Shape>("rect");
  const [effect, setEffect] = useState<Effect>("blur");
  const [strength, setStrength] = useState(60);
  const [feather, setFeather] = useState(15);
  const [brushSize, setBrushSize] = useState(5); // % of the long side
  const [holding, setHolding] = useState(false);
  const [format, setFormat] = useState<FormatChoice>("original");
  const [quality, setQuality] = useState(0.9);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [faceSupported, setFaceSupported] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [displayScale, setDisplayScale] = useState(1); // proxy px per CSS px

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const frameRef = useRef<number | null>(null);
  const loadRunRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const lastEditRef = useRef(0);

  const regionsRef = useRef(regions);
  regionsRef.current = regions;
  const loadedRef = useRef(loaded);
  loadedRef.current = loaded;
  const holdingRef = useRef(holding);
  holdingRef.current = holding;

  useEffect(() => setFaceSupported(!!getFaceDetector()), []);

  useEffect(() => {
    return () => {
      loaded?.decoded.bitmap.close();
      loaded?.proxy.close();
    };
  }, [loaded]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  const handleFiles = useCallback(
    async (files: File[]) => {
      const f = files[0];
      if (!f) return;
      const run = ++loadRunRef.current;
      abortRef.current?.abort();
      setLoading(true);
      try {
        const decoded = await decodeImage(f);
        const proxy = await makeProxy(decoded.bitmap);
        if (run !== loadRunRef.current) {
          decoded.bitmap.close();
          proxy.close();
          return;
        }
        setRegions([]);
        setSelectedId(null);
        setUndo([]);
        setRedo([]);
        setLoaded({ file: f, decoded, proxy });
      } catch {
        if (run === loadRunRef.current) toast.error(t("ui.failedLoad"));
      } finally {
        if (run === loadRunRef.current) setLoading(false);
      }
    },
    [t],
  );

  // ── Proxy rendering, one frame at a time ──
  const paint = useCallback(() => {
    frameRef.current = null;
    const l = loadedRef.current;
    const canvas = canvasRef.current;
    if (!l || !canvas) return;
    const W = l.proxy.width;
    const H = l.proxy.height;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    const ctx = ctx2d(canvas);
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(l.proxy, 0, 0);
    if (holdingRef.current) return;
    for (const r of regionsRef.current) renderRegion(ctx, W, H, r);
  }, []);

  const schedulePaint = useCallback(() => {
    if (frameRef.current == null) frameRef.current = requestAnimationFrame(paint);
  }, [paint]);

  useEffect(() => schedulePaint(), [loaded, regions, holding, schedulePaint]);

  // Track on-screen size for hit tolerances and handle sizes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loaded) return;
    const update = () => {
      const w = canvas.getBoundingClientRect().width;
      if (w > 0) setDisplayScale(loaded.proxy.width / w);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [loaded]);

  // ── History ──
  const pushUndo = useCallback((before: Region[]) => {
    setUndo((u) => [...u.slice(-79), before]);
    setRedo([]);
  }, []);

  const doUndo = () => {
    if (!undo.length) return;
    const prev = undo[undo.length - 1];
    setUndo(undo.slice(0, -1));
    setRedo([...redo, regionsRef.current]);
    setRegions(prev);
    if (selectedId && !prev.some((r) => r.id === selectedId)) setSelectedId(null);
  };

  const doRedo = () => {
    if (!redo.length) return;
    const next = redo[redo.length - 1];
    setRedo(redo.slice(0, -1));
    setUndo([...undo, regionsRef.current]);
    setRegions(next);
    if (selectedId && !next.some((r) => r.id === selectedId)) setSelectedId(null);
  };

  /** For slider-style edits: one undo step per burst of changes. */
  const beginEdit = () => {
    const now = Date.now();
    if (now - lastEditRef.current > 700) pushUndo(regionsRef.current);
    lastEditRef.current = now;
  };

  const selected = regions.find((r) => r.id === selectedId) ?? null;

  const updateSelected = (patch: Partial<Region>) => {
    if (!selected) return;
    beginEdit();
    setRegions((rs) => rs.map((r) => (r.id === selected.id ? { ...r, ...patch } : r)));
  };

  const deleteRegion = (id: string) => {
    pushUndo(regionsRef.current);
    setRegions((rs) => rs.filter((r) => r.id !== id));
    setSelectedId((s) => (s === id ? null : s));
  };

  // ── Pointer interaction (mouse, pen and touch) ──
  const toProxy = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const W = canvas.width;
    const H = canvas.height;
    return {
      x: clamp(((e.clientX - rect.left) / rect.width) * W, 0, W),
      y: clamp(((e.clientY - rect.top) / rect.height) * H, 0, H),
      W,
      H,
    };
  };

  const handleAt = (r: Region, x: number, y: number, W: number, H: number) => {
    if (r.shape === "brush") return null;
    const b = regionBox(r, W, H);
    const tol = 22 * displayScale;
    const corners = [
      [b.x, b.y, b.x + b.w, b.y + b.h],
      [b.x + b.w, b.y, b.x, b.y + b.h],
      [b.x, b.y + b.h, b.x + b.w, b.y],
      [b.x + b.w, b.y + b.h, b.x, b.y],
    ];
    for (const [cx, cy, ax, ay] of corners) if (Math.hypot(x - cx, y - cy) <= tol) return { ax, ay };
    return null;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!loaded || exportProgress != null || holding) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus({ preventScroll: true });
    const { x, y, W, H } = toProxy(e);
    const before = regionsRef.current;
    const sel = before.find((r) => r.id === selectedId);
    const handle = sel ? handleAt(sel, x, y, W, H) : null;
    if (sel && handle) {
      gestureRef.current = { kind: "resize", id: sel.id, ax: handle.ax, ay: handle.ay, before };
      return;
    }
    if (tool !== "brush") {
      const tol = 4 * displayScale;
      const hit = [...before].reverse().find((r) => hitTest(r, x, y, W, H, tol));
      if (hit) {
        setSelectedId(hit.id);
        setEffect(hit.effect);
        setStrength(hit.strength);
        setFeather(hit.feather);
        gestureRef.current = { kind: "move", id: hit.id, sx: x, sy: y, orig: hit, before };
        return;
      }
    }
    const id = newId();
    const base = { id, effect, strength, feather };
    if (tool === "brush") {
      const region: Region = { ...base, shape: "brush", x: 0, y: 0, w: 0, h: 0, points: [x / W, y / H], size: brushSize / 100 };
      setRegions([...before, region]);
      gestureRef.current = { kind: "brush", id, lx: x, ly: y, before };
    } else {
      const region: Region = { ...base, shape: tool, x: x / W, y: y / H, w: 0, h: 0 };
      setRegions([...before, region]);
      gestureRef.current = { kind: "draw", id, sx: x, sy: y, before };
    }
    setSelectedId(id);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gestureRef.current;
    if (!g) return;
    const { x, y, W, H } = toProxy(e);
    if (g.kind === "draw" || g.kind === "resize") {
      const ox = g.kind === "draw" ? g.sx : g.ax;
      const oy = g.kind === "draw" ? g.sy : g.ay;
      const box = { x: Math.min(ox, x) / W, y: Math.min(oy, y) / H, w: Math.abs(x - ox) / W, h: Math.abs(y - oy) / H };
      setRegions((rs) => rs.map((r) => (r.id === g.id ? { ...r, ...box } : r)));
    } else if (g.kind === "brush") {
      if (Math.hypot(x - g.lx, y - g.ly) < 3 * displayScale) return;
      g.lx = x;
      g.ly = y;
      setRegions((rs) => rs.map((r) => (r.id === g.id ? { ...r, points: [...(r.points ?? []), x / W, y / H] } : r)));
    } else {
      const o = g.orig;
      let dx = (x - g.sx) / W;
      let dy = (y - g.sy) / H;
      if (o.shape === "brush" && o.points) {
        const b = regionBox(o, 1, 1);
        dx = clamp(dx, -(b.x + b.w * 0.5), 1 - (b.x + b.w * 0.5));
        dy = clamp(dy, -(b.y + b.h * 0.5), 1 - (b.y + b.h * 0.5));
        const pts = o.points.map((v, i) => (i % 2 === 0 ? v + dx : v + dy));
        setRegions((rs) => rs.map((r) => (r.id === g.id ? { ...r, points: pts } : r)));
      } else {
        const nx = clamp(o.x + dx, 0, 1 - o.w);
        const ny = clamp(o.y + dy, 0, 1 - o.h);
        setRegions((rs) => rs.map((r) => (r.id === g.id ? { ...r, x: nx, y: ny } : r)));
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const g = gestureRef.current;
    gestureRef.current = null;
    if (!g) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width;
    const H = canvas.height;
    const current = regionsRef.current.find((r) => r.id === g.id);
    if (g.kind === "draw") {
      const minPx = 8 * displayScale;
      if (!current || current.w * W < minPx || current.h * H < minPx) {
        // A tap on empty space: discard the empty region and deselect.
        setRegions(g.before);
        setSelectedId(null);
        return;
      }
    }
    if (g.kind === "move" && current && current.x === g.orig.x && current.y === g.orig.y && current.points === g.orig.points) return;
    if (e.type === "pointercancel" && g.kind !== "brush") {
      setRegions(g.before);
      return;
    }
    pushUndo(g.before);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) doRedo();
      else doUndo();
      return;
    }
    if (mod && e.key.toLowerCase() === "y") {
      e.preventDefault();
      doRedo();
      return;
    }
    if (!selected) return;
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      deleteRegion(selected.id);
    } else if (e.key === "Escape") {
      setSelectedId(null);
    } else if (e.key.startsWith("Arrow") && selected.shape !== "brush") {
      e.preventDefault();
      const step = e.shiftKey ? 0.02 : 0.005;
      const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
      const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
      updateSelected({ x: clamp(selected.x + dx, 0, 1 - selected.w), y: clamp(selected.y + dy, 0, 1 - selected.h) });
    }
  };

  // ── Panel actions ──
  const changeEffect = (v: Effect) => {
    setEffect(v);
    if (selected) updateSelected({ effect: v });
  };
  const changeStrength = (v: number) => {
    setStrength(v);
    if (selected) updateSelected({ strength: v });
  };
  const changeFeather = (v: number) => {
    setFeather(v);
    if (selected) updateSelected({ feather: v });
  };
  const changeBrushSize = (v: number) => {
    setBrushSize(v);
    if (selected?.shape === "brush") updateSelected({ size: v / 100 });
  };

  const blurWhole = () => {
    pushUndo(regionsRef.current);
    const id = newId();
    setRegions((rs) => [...rs, { id, shape: "rect", effect, strength, feather: 0, x: 0, y: 0, w: 1, h: 1 }]);
    setSelectedId(id);
  };

  const detectFaces = async () => {
    const FD = getFaceDetector();
    if (!FD || !loaded) return;
    setDetecting(true);
    try {
      const faces = await new FD({ fastMode: false, maxDetectedFaces: 50 }).detect(loaded.proxy);
      const W = loaded.proxy.width;
      const H = loaded.proxy.height;
      if (!faces.length) {
        toast(t("blur.v2.noFaces"));
        return;
      }
      pushUndo(regionsRef.current);
      const added: Region[] = faces.map(({ boundingBox: b }) => {
        const w = b.width * 1.3;
        const h = b.height * 1.55;
        const x = clamp(b.x + b.width / 2 - w / 2, 0, W);
        const y = clamp(b.y + b.height * 0.45 - h / 2, 0, H);
        return {
          id: newId(),
          shape: "ellipse",
          effect,
          strength: Math.max(strength, 50),
          feather,
          x: x / W,
          y: y / H,
          w: Math.min(w, W - x) / W,
          h: Math.min(h, H - y) / H,
        };
      });
      setRegions((rs) => [...rs, ...added]);
      setSelectedId(null);
      toast.success(t("blur.v2.facesFound", { count: added.length }));
    } catch {
      toast.error(t("blur.v2.faceFailed"));
    } finally {
      setDetecting(false);
    }
  };

  const exportImage = async () => {
    if (!loaded || !regions.length) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const snapshot = regions;
    const outType = resolveFormat(loaded.file.type, format);
    setExportProgress(0);
    const { width: W, height: H, bitmap } = loaded.decoded;
    const canvas = makeCanvas(W, H);
    try {
      const ctx = ctx2d(canvas);
      ctx.drawImage(bitmap, 0, 0);
      for (let i = 0; i < snapshot.length; i++) {
        await nextFrame();
        if (ac.signal.aborted) throw new AbortError();
        renderRegion(ctx, W, H, snapshot[i]);
        setExportProgress(((i + 1) / snapshot.length) * 0.85);
      }
      const blob = await encodeCanvas(canvas, outType, quality, ac.signal);
      if (ac.signal.aborted) throw new AbortError();
      downloadBlob(blob, `${getFileNameWithoutExtension(loaded.file.name)}-blurred.${extensionFor(outType)}`);
    } catch (err) {
      if (!(err instanceof AbortError) && !ac.signal.aborted) {
        console.error(err);
        toast.error(t("ui.failedExport"));
      }
    } finally {
      releaseCanvas(canvas);
      if (abortRef.current === ac) {
        abortRef.current = null;
        setExportProgress(null);
      }
    }
  };

  const cancelExport = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setExportProgress(null);
  };

  const changeImage = () => {
    cancelExport();
    loadRunRef.current++;
    setLoaded(null);
    setLoading(false);
    setRegions([]);
    setSelectedId(null);
    setUndo([]);
    setRedo([]);
  };

  const holdOn = () => setHolding(true);
  const holdOff = () => setHolding(false);

  // ── Overlay geometry (proxy pixel space) ──
  const W = loaded?.proxy.width ?? 1;
  const H = loaded?.proxy.height ?? 1;
  const handleR = 7 * displayScale;
  const busy = exportProgress != null;

  const toolOptions = [
    { value: "rect" as Shape, label: t("blur.v2.rect"), icon: <Square className="h-4 w-4" aria-hidden="true" /> },
    { value: "ellipse" as Shape, label: t("blur.v2.ellipse"), icon: <Circle className="h-4 w-4" aria-hidden="true" /> },
    { value: "brush" as Shape, label: t("blur.v2.brush"), icon: <Brush className="h-4 w-4" aria-hidden="true" /> },
  ];

  return (
    <ToolLayout toolName="Blur Image" toolDescription="Blur or pixelate areas of an image for privacy">
      <div className="space-y-6">
        {!loaded ? (
          loading ? (
            <div className="glass flex h-64 items-center justify-center gap-2 text-[14px] text-t-secondary" role="status">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              {t("ui.loading")}
            </div>
          ) : (
            <FileDropzone
              onFilesSelected={handleFiles}
              accept={{
                "image/jpeg": [".jpg", ".jpeg"],
                "image/png": [".png"],
                "image/webp": [".webp"],
              }}
              multiple={false}
              formats={["JPG", "PNG", "WEBP"]}
              label={t("ui.dropImage")}
            />
          )
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            {/* Canvas */}
            <div className="glass space-y-3 p-4 lg:sticky lg:top-20">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Segmented<Shape> label={t("blur.v2.tool")} size="sm" value={tool} onChange={setTool} options={toolOptions} />
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={doUndo}
                    disabled={!undo.length || busy}
                    aria-label={t("blur.undo")}
                    title={t("blur.undo")}
                    className={`${buttonSecondary} h-10 w-10 !px-0`}
                  >
                    <Undo2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={doRedo}
                    disabled={!redo.length || busy}
                    aria-label={t("blur.redo")}
                    title={t("blur.redo")}
                    className={`${buttonSecondary} h-10 w-10 !px-0`}
                  >
                    <Redo2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId);
                      holdOn();
                    }}
                    onPointerUp={holdOff}
                    onPointerCancel={holdOff}
                    onLostPointerCapture={holdOff}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        holdOn();
                      }
                    }}
                    onKeyUp={holdOff}
                    onBlur={holdOff}
                    onContextMenu={(e) => e.preventDefault()}
                    disabled={!regions.length}
                    aria-pressed={holding}
                    aria-label={t("blur.v2.holdOriginal")}
                    title={t("blur.v2.holdOriginal")}
                    className={`${buttonSecondary} h-10 w-10 !px-0 touch-none select-none`}
                  >
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="flex justify-center overflow-hidden rounded-xl border border-border bg-bg-secondary">
                <div className="relative">
                  <canvas
                    ref={canvasRef}
                    tabIndex={0}
                    role="application"
                    aria-label={t("blur.v2.canvasLabel")}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    onKeyDown={onKeyDown}
                    className="block h-auto max-h-[min(72vh,680px)] w-auto max-w-full cursor-crosshair touch-none select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-volt"
                  />
                  {!holding && (
                    <svg
                      className="pointer-events-none absolute inset-0 h-full w-full"
                      viewBox={`0 0 ${W} ${H}`}
                      preserveAspectRatio="none"
                      aria-hidden="true"
                    >
                      {regions.map((r) => {
                        const b = regionBox(r, W, H);
                        const isSel = r.id === selectedId;
                        const common = {
                          fill: "none",
                          vectorEffect: "non-scaling-stroke" as const,
                          strokeWidth: isSel ? 2 : 1,
                          strokeDasharray: isSel ? undefined : "4 4",
                          className: isSel ? "text-volt" : "text-white/70",
                          stroke: "currentColor",
                        };
                        return (
                          <g key={r.id}>
                            {r.shape === "ellipse" ? (
                              <ellipse cx={b.x + b.w / 2} cy={b.y + b.h / 2} rx={b.w / 2} ry={b.h / 2} {...common} />
                            ) : (
                              <rect x={b.x} y={b.y} width={b.w} height={b.h} {...common} />
                            )}
                            {isSel &&
                              r.shape !== "brush" &&
                              [
                                [b.x, b.y],
                                [b.x + b.w, b.y],
                                [b.x, b.y + b.h],
                                [b.x + b.w, b.y + b.h],
                              ].map(([cx, cy], i) => (
                                <circle
                                  key={i}
                                  cx={cx}
                                  cy={cy}
                                  r={handleR}
                                  className="text-volt"
                                  fill="currentColor"
                                  stroke="#16181d"
                                  strokeWidth={1}
                                  vectorEffect="non-scaling-stroke"
                                />
                              ))}
                          </g>
                        );
                      })}
                    </svg>
                  )}
                </div>
              </div>

              <p className="text-center text-[12.5px] text-t-tertiary">
                {tool === "brush" ? t("blur.v2.hintBrush") : t("blur.v2.hintShape")}
              </p>
              <p className="truncate text-[12px] text-t-tertiary">
                {loaded.file.name} · {loaded.decoded.naturalWidth}×{loaded.decoded.naturalHeight} · {formatFileSize(loaded.file.size)}
              </p>
              {loaded.decoded.capped && (
                <p className="text-[12px] text-t-tertiary">
                  {t("imgedit.v2.cappedNote", { w: loaded.decoded.width, h: loaded.decoded.height })}
                </p>
              )}
            </div>

            {/* Controls */}
            <div className="space-y-4">
              <div className="glass space-y-4 p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[15px] font-semibold text-t-primary">
                    {selected ? t("blur.v2.selectedRegion") : t("blur.v2.newRegions")}
                  </p>
                  {selected && (
                    <button
                      type="button"
                      onClick={() => deleteRegion(selected.id)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-t-secondary transition hover:bg-bg-secondary hover:text-t-primary"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      {t("ui.remove")}
                    </button>
                  )}
                </div>
                <Segmented<Effect>
                  label={t("blur.mode")}
                  value={effect}
                  onChange={changeEffect}
                  options={(["blur", "pixelate", "blackout"] as Effect[]).map((v) => ({ value: v, label: t(EFFECT_LABEL[v]) }))}
                />
                {effect !== "blackout" && (
                  <Slider
                    label={t("blur.v2.strength")}
                    value={strength}
                    min={1}
                    max={100}
                    onChange={changeStrength}
                    display={`${strength}%`}
                  />
                )}
                <Slider
                  label={t("blur.feather")}
                  value={feather}
                  min={0}
                  max={100}
                  onChange={changeFeather}
                  display={`${feather}%`}
                />
                {(tool === "brush" || selected?.shape === "brush") && (
                  <Slider
                    label={t("blur.v2.brushSize")}
                    value={selected?.shape === "brush" ? Math.round((selected.size ?? 0.05) * 100) : brushSize}
                    min={1}
                    max={20}
                    onChange={changeBrushSize}
                    display={`${selected?.shape === "brush" ? Math.round((selected.size ?? 0.05) * 100) : brushSize}%`}
                  />
                )}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button type="button" onClick={blurWhole} className={buttonSecondary}>
                    <Maximize className="h-4 w-4" aria-hidden="true" />
                    {t("blur.v2.wholeImage")}
                  </button>
                  {faceSupported && (
                    <button type="button" onClick={detectFaces} disabled={detecting} className={buttonSecondary}>
                      {detecting ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <ScanFace className="h-4 w-4" aria-hidden="true" />
                      )}
                      {t("blur.v2.detectFaces")}
                    </button>
                  )}
                </div>
              </div>

              {regions.length > 0 && (
                <div className="glass space-y-2 p-5">
                  <div className="flex items-center justify-between">
                    <p className={sectionTitle}>{t("blur.regionsApplied", { count: regions.length })}</p>
                    <button
                      type="button"
                      onClick={() => {
                        pushUndo(regionsRef.current);
                        setRegions([]);
                        setSelectedId(null);
                      }}
                      className="rounded-lg px-2.5 py-2 text-[13px] font-medium text-t-secondary transition hover:bg-bg-secondary hover:text-t-primary"
                    >
                      {t("ui.clearAll")}
                    </button>
                  </div>
                  <ul className="space-y-1">
                    {regions.map((r, i) => (
                      <li key={r.id} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(r.id);
                            setEffect(r.effect);
                            setStrength(r.strength);
                            setFeather(r.feather);
                          }}
                          aria-pressed={r.id === selectedId}
                          className={`flex min-h-[40px] flex-1 items-center gap-2 rounded-lg px-3 text-start text-[13px] transition ${
                            r.id === selectedId ? "bg-accent/10 font-medium text-t-primary" : "text-t-secondary hover:bg-bg-secondary"
                          }`}
                        >
                          {r.shape === "rect" ? (
                            <Square className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : r.shape === "ellipse" ? (
                            <Circle className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <Brush className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                          {t("blur.v2.regionN", { n: i + 1 })} · {t(EFFECT_LABEL[r.effect])}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRegion(r.id)}
                          aria-label={t("blur.v2.deleteRegion", { n: i + 1 })}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-t-tertiary transition hover:bg-bg-secondary hover:text-t-primary"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="glass space-y-4 p-5">
                <ExportFormatPicker
                  value={format}
                  onChange={setFormat}
                  quality={quality}
                  onQualityChange={setQuality}
                  sourceType={ACCEPT_TYPES.includes(loaded.file.type) ? loaded.file.type : "image/png"}
                />
                {busy ? (
                  <div className="space-y-2" aria-live="polite">
                    <div className="flex items-center justify-between text-[13px] text-t-secondary">
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        {t("ui.processing")}
                      </span>
                      <span className="tabular-nums">{Math.round((exportProgress ?? 0) * 100)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-bg-tertiary">
                      <div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round((exportProgress ?? 0) * 100)}%` }} />
                    </div>
                    <button type="button" onClick={cancelExport} className={`${buttonSecondary} w-full`}>
                      <X className="h-4 w-4" aria-hidden="true" />
                      {t("imgedit.v2.cancel")}
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={exportImage} disabled={!regions.length} className={`${buttonPrimary} w-full`}>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {t("imgedit.v2.downloadAs", { format: formatLabel(resolveFormat(loaded.file.type, format)) })}
                  </button>
                )}
                <button type="button" onClick={changeImage} className={`${buttonSecondary} w-full`}>
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  {t("blur.v2.newImage")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
