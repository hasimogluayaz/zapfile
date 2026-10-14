"use client";

/**
 * Zoomable, pannable canvas view of a cutout with erase/restore brushes and
 * a before/after compare divider. Pixel editing lives in CutoutDocument;
 * this component only draws and turns pointer input into strokes.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { CutoutDocument, OutputKind, Rect } from "@/lib/bg-removal/document";
import { type Backdrop, context2d, createCanvas, drawCover } from "@/lib/bg-removal/compose";

export type EditorTool = "pan" | "erase" | "restore";
export type EditorView = "result" | "compare" | "original";

export interface CutoutEditorHandle {
  fit(): void;
  zoomBy(factor: number): void;
  zoomTo(scale: number): void;
  /** Redraw after the document changed outside the editor (undo, refine). */
  refresh(rect?: Rect | null): void;
}

interface Props {
  doc: CutoutDocument;
  original: HTMLCanvasElement;
  blurred: HTMLCanvasElement | null;
  output: OutputKind;
  backdrop: Backdrop;
  view: EditorView;
  tool: EditorTool;
  /** Brush diameter in screen pixels. */
  brushSize: number;
  /** 0 (soft) – 1 (hard). */
  hardness: number;
  onStrokeEnd: () => void;
  onZoomChange?: (scale: number) => void;
  labels: { canvas: string; before: string; after: string; divider: string };
}

interface ViewState {
  scale: number;
  x: number;
  y: number;
}

const MIN_SCALE = 0.02;
const MAX_SCALE = 32;

const CutoutEditor = forwardRef<CutoutEditorHandle, Props>(function CutoutEditor(props, ref) {
  const { doc, original, blurred, output, backdrop, view, tool, brushSize, hardness, onStrokeEnd, onZoomChange, labels } =
    props;
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layerRef = useRef<{ canvas: HTMLCanvasElement; data: ImageData } | null>(null);
  const viewRef = useRef<ViewState>({ scale: 1, x: 0, y: 0 });
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const frameRef = useRef(0);
  const fittedRef = useRef(false);
  const [divider, setDivider] = useState(0.5);
  const dividerRef = useRef(0.5);
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  const checkerRef = useRef<CanvasPattern | null>(null);
  const [spaceDown, setSpaceDown] = useState(false);

  // Latest props for event handlers without re-binding.
  const live = useRef({ tool, brushSize, hardness, view, onStrokeEnd, onZoomChange });
  live.current = { tool, brushSize, hardness, view, onStrokeEnd, onZoomChange };

  // ── Drawing ────────────────────────────────────────────────────────────

  const draw = useCallback(() => {
    frameRef.current = 0;
    const canvas = canvasRef.current;
    const layer = layerRef.current;
    if (!canvas || !layer) return;
    const ctx = context2d(canvas);
    const { width, height, dpr } = sizeRef.current;
    const v = viewRef.current;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const img: Rect = { x: v.x, y: v.y, width: doc.width * v.scale, height: doc.height * v.scale };
    // Pixel-exact when zoomed in so brush work is precise.
    ctx.imageSmoothingEnabled = v.scale < 2;
    ctx.imageSmoothingQuality = "high";

    const drawBackdrop = () => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(img.x, img.y, img.width, img.height);
      ctx.clip();
      const kind = output === "subject" ? backdrop.kind : "transparent";
      if (kind === "color" && backdrop.kind === "color") {
        ctx.fillStyle = backdrop.color;
        ctx.fillRect(img.x, img.y, img.width, img.height);
      } else if (kind === "blur" && blurred) {
        ctx.drawImage(blurred, img.x, img.y, img.width, img.height);
      } else if (kind === "image" && backdrop.kind === "image") {
        drawCover(ctx, backdrop.image, img);
      } else if (output === "mask") {
        ctx.fillStyle = "#000";
        ctx.fillRect(img.x, img.y, img.width, img.height);
      } else {
        if (!checkerRef.current) {
          const tile = createCanvas(16, 16);
          const tctx = context2d(tile);
          tctx.fillStyle = "#ffffff";
          tctx.fillRect(0, 0, 16, 16);
          tctx.fillStyle = "#e6e7ea";
          tctx.fillRect(0, 0, 8, 8);
          tctx.fillRect(8, 8, 8, 8);
          checkerRef.current = ctx.createPattern(tile, "repeat");
        }
        if (checkerRef.current) {
          ctx.fillStyle = checkerRef.current;
          ctx.fillRect(img.x, img.y, img.width, img.height);
        }
      }
      ctx.restore();
    };

    if (view === "original") {
      ctx.drawImage(original, img.x, img.y, img.width, img.height);
    } else {
      drawBackdrop();
      ctx.drawImage(layer.canvas, img.x, img.y, img.width, img.height);
      if (view === "compare") {
        const splitX = Math.round(dividerRef.current * width);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, splitX, height);
        ctx.clip();
        ctx.drawImage(original, img.x, img.y, img.width, img.height);
        ctx.restore();
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(splitX - 1, 0, 2, height);
        ctx.beginPath();
        ctx.arc(splitX, height / 2, 14, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(0,0,0,0.25)";
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#16181d";
        ctx.beginPath();
        ctx.moveTo(splitX - 7, height / 2);
        ctx.lineTo(splitX - 2, height / 2 - 5);
        ctx.lineTo(splitX - 2, height / 2 + 5);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(splitX + 7, height / 2);
        ctx.lineTo(splitX + 2, height / 2 - 5);
        ctx.lineTo(splitX + 2, height / 2 + 5);
        ctx.fill();
      }
    }

    // Brush outline.
    const c = cursorRef.current;
    const t = live.current.tool;
    if (c && (t === "erase" || t === "restore") && view !== "compare") {
      const r = live.current.brushSize / 2;
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "rgba(0,0,0,0.65)";
      ctx.beginPath();
      ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = t === "erase" ? "rgba(255,255,255,0.95)" : "rgba(255,214,10,0.95)";
      ctx.beginPath();
      ctx.arc(c.x, c.y, Math.max(1, r - 1), 0, Math.PI * 2);
      ctx.stroke();
      if (live.current.hardness < 0.95) {
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(c.x, c.y, Math.max(1, r * live.current.hardness), 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, [backdrop, blurred, doc, original, output, view]);

  const schedule = useCallback(() => {
    if (!frameRef.current) frameRef.current = requestAnimationFrame(draw);
  }, [draw]);

  useEffect(() => schedule(), [schedule, tool, brushSize, hardness]);
  useEffect(() => () => cancelAnimationFrame(frameRef.current), []);

  /** Re-render output pixels for `rect` into the layer canvas. */
  const updateLayer = useCallback(
    (rect?: Rect | null) => {
      let layer = layerRef.current;
      if (!layer || layer.canvas.width !== doc.width || layer.canvas.height !== doc.height) {
        const canvas = createCanvas(doc.width, doc.height);
        layer = { canvas, data: new ImageData(doc.width, doc.height) };
        layerRef.current = layer;
        rect = null;
      }
      const r = rect ?? { x: 0, y: 0, width: doc.width, height: doc.height };
      doc.renderOutput(output, layer.data.data, r);
      context2d(layer.canvas).putImageData(layer.data, 0, 0, r.x, r.y, r.width, r.height);
      schedule();
    },
    [doc, output, schedule],
  );

  useEffect(() => updateLayer(null), [updateLayer]);

  // ── View transform ────────────────────────────────────────────────────

  const setView = useCallback(
    (next: ViewState) => {
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next.scale));
      viewRef.current = { ...next, scale };
      live.current.onZoomChange?.(scale);
      schedule();
    },
    [schedule],
  );

  const fit = useCallback(() => {
    const { width, height } = sizeRef.current;
    if (!width || !height) return;
    const pad = 16;
    const scale = Math.min((width - pad * 2) / doc.width, (height - pad * 2) / doc.height);
    setView({
      scale,
      x: (width - doc.width * scale) / 2,
      y: (height - doc.height * scale) / 2,
    });
  }, [doc, setView]);

  const zoomAround = useCallback(
    (factor: number, cx?: number, cy?: number) => {
      const v = viewRef.current;
      const { width, height } = sizeRef.current;
      const px = cx ?? width / 2;
      const py = cy ?? height / 2;
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
      const k = scale / v.scale;
      setView({ scale, x: px - (px - v.x) * k, y: py - (py - v.y) * k });
    },
    [setView],
  );

  useImperativeHandle(
    ref,
    () => ({
      fit,
      zoomBy: (factor) => zoomAround(factor),
      zoomTo: (scale) => zoomAround(scale / viewRef.current.scale),
      refresh: (rect) => updateLayer(rect ?? null),
    }),
    [fit, updateLayer, zoomAround],
  );

  // Track container size; fit on first layout and when a new document loads.
  useEffect(() => {
    fittedRef.current = false;
  }, [doc]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const resize = () => {
      const rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const prev = sizeRef.current;
      sizeRef.current = { width: rect.width, height: rect.height, dpr };
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      if (!fittedRef.current && rect.width > 0) {
        fittedRef.current = true;
        fit();
      } else if (prev.width && prev.height) {
        // Keep the image centred on resize.
        const v = viewRef.current;
        setView({ ...v, x: v.x + (rect.width - prev.width) / 2, y: v.y + (rect.height - prev.height) / 2 });
      }
      schedule();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [fit, schedule, setView]);

  // ── Input ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        if (!e.repeat) setSpaceDown(true);
        if (e.target === document.body || wrapRef.current?.contains(e.target as Node)) e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceDown(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        // Pinch (ctrlKey) and mouse wheels zoom; deltaMode 1 = lines.
        const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
        zoomAround(Math.exp(-delta * (e.ctrlKey ? 0.01 : 0.0015)), x, y);
      } else {
        const v = viewRef.current;
        setView({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY });
      }
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [setView, zoomAround]);

  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<
    | { kind: "pan"; startX: number; startY: number; view: ViewState }
    | { kind: "stroke"; startedAt: number }
    | { kind: "pinch"; dist: number; cx: number; cy: number; view: ViewState }
    | { kind: "divider" }
    | null
  >(null);

  const localPoint = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const toImage = (p: { x: number; y: number }) => {
    const v = viewRef.current;
    return { x: (p.x - v.x) / v.scale, y: (p.y - v.y) / v.scale };
  };

  const strokeAt = (p: { x: number; y: number }) => {
    const ip = toImage(p);
    const dirty = doc.strokeTo(ip.x, ip.y);
    if (dirty) updateLayer(dirty);
  };

  const finishStroke = () => {
    doc.endStroke();
    live.current.onStrokeEnd();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const p = localPoint(e);
    pointers.current.set(e.pointerId, p);
    cursorRef.current = e.pointerType === "mouse" ? p : null;

    if (pointers.current.size === 2) {
      // Second finger: switch to pinch. A stroke that just started is reverted.
      if (gesture.current?.kind === "stroke") {
        const quick = performance.now() - gesture.current.startedAt < 300;
        doc.endStroke();
        if (quick) {
          const rect = doc.undo();
          updateLayer(rect);
        }
        live.current.onStrokeEnd();
      }
      const [a, b] = Array.from(pointers.current.values());
      gesture.current = {
        kind: "pinch",
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2,
        view: { ...viewRef.current },
      };
      return;
    }
    if (pointers.current.size > 2) return;

    const t = live.current.tool;
    if (live.current.view === "compare" && e.button === 0) {
      gesture.current = { kind: "divider" };
      const d = Math.min(1, Math.max(0, p.x / sizeRef.current.width));
      dividerRef.current = d;
      setDivider(d);
      schedule();
    } else if (t === "pan" || spaceDown || e.button === 1 || live.current.view === "original") {
      gesture.current = { kind: "pan", startX: p.x, startY: p.y, view: { ...viewRef.current } };
    } else if (e.button === 0) {
      const radius = live.current.brushSize / 2 / viewRef.current.scale;
      doc.beginStroke(t === "erase" ? "erase" : "restore", radius, live.current.hardness);
      gesture.current = { kind: "stroke", startedAt: performance.now() };
      strokeAt(p);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const p = localPoint(e);
    if (e.pointerType === "mouse") cursorRef.current = p;
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    if (!g) {
      schedule(); // cursor outline
      return;
    }
    if (g.kind === "pan") {
      setView({ ...g.view, x: g.view.x + p.x - g.startX, y: g.view.y + p.y - g.startY });
    } else if (g.kind === "stroke") {
      const events = "getCoalescedEvents" in e.nativeEvent ? e.nativeEvent.getCoalescedEvents() : [];
      if (events.length > 1) {
        const rect = canvasRef.current!.getBoundingClientRect();
        for (const ce of events) strokeAt({ x: ce.clientX - rect.left, y: ce.clientY - rect.top });
      } else {
        strokeAt(p);
      }
    } else if (g.kind === "pinch" && pointers.current.size >= 2) {
      const [a, b] = Array.from(pointers.current.values());
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, g.view.scale * (dist / Math.max(1, g.dist))));
      const k = scale / g.view.scale;
      setView({ scale, x: cx - (g.cx - g.view.x) * k, y: cy - (g.cy - g.view.y) * k });
    } else if (g.kind === "divider") {
      const d = Math.min(1, Math.max(0, p.x / sizeRef.current.width));
      dividerRef.current = d;
      setDivider(d);
      schedule();
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (g?.kind === "stroke") finishStroke();
    if (pointers.current.size === 0) gesture.current = null;
    else if (g?.kind === "pinch") {
      // One finger left: continue as a pan from here.
      const [rest] = Array.from(pointers.current.values());
      gesture.current = { kind: "pan", startX: rest.x, startY: rest.y, view: { ...viewRef.current } };
    }
  };

  const onPointerLeave = () => {
    cursorRef.current = null;
    schedule();
  };

  // Keyboard-accessible compare divider.
  const onDividerKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const d = Math.min(1, Math.max(0, dividerRef.current + (e.key === "ArrowLeft" ? -0.05 : 0.05)));
    dividerRef.current = d;
    setDivider(d);
    schedule();
  };

  const painting = (tool === "erase" || tool === "restore") && view === "result" && !spaceDown;
  const cursor =
    view === "compare"
      ? "ew-resize"
      : painting
        ? "none"
        : gesture.current?.kind === "pan"
          ? "grabbing"
          : "grab";

  return (
    <div ref={wrapRef} className="relative h-full w-full select-none overflow-hidden">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={labels.canvas}
        className="absolute inset-0 h-full w-full touch-none"
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
        onContextMenu={(e) => e.preventDefault()}
      />
      {view === "compare" && (
        <>
          <span className="pointer-events-none absolute start-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[12px] font-medium text-white">
            {labels.before}
          </span>
          <span className="pointer-events-none absolute end-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[12px] font-medium text-white">
            {labels.after}
          </span>
          <div
            role="slider"
            tabIndex={0}
            aria-label={labels.divider}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(divider * 100)}
            onKeyDown={onDividerKey}
            className="absolute inset-y-0 w-px opacity-0 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-volt"
            style={{ left: `${divider * 100}%` }}
          />
        </>
      )}
    </div>
  );
});

export default CutoutEditor;
