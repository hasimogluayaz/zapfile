"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import toast from "react-hot-toast";
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Copy, Download, ImagePlus, Loader2, Plus, Redo2, Trash2, Undo2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { Segmented, Slider, Toggle, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { builtInFontFamily, ctx2d, decodeImage, encodeCanvas, makeCanvas, makeProxy, maxCanvasPixels, releaseCanvas, resolveFormat, type FormatChoice } from "@/lib/image-editor-kit";
import { ExportFormatPicker } from "@/lib/image-editor-kit-ui";
import { downloadBlob, getFileNameWithoutExtension } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useStoredPref } from "@/lib/text-tools/hooks";
import { MEME_FAMILY, bandHeight, drawMeme, handlePoint, hitBox, type Layer, type LayerBox, type MemeFont, type MemeState, type MemeStyle } from "./meme-render";

const ACCEPT = { "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif"] };
const STYLES: MemeStyle[] = ["classic", "plain", "label", "shadow"];
const FONTS: MemeFont[] = ["meme", "sans", "serif"];
const SWATCHES = ["#FFFFFF", "#000000", "#FFD60A", "#FF3B30", "#34C759", "#0A84FF"];

let measure: CanvasRenderingContext2D | null = null;
const measureCtx = () => (measure ??= ctx2d(makeCanvas(1, 1)));

let seq = 1;
const newId = () => `l${seq++}`;

function layer(text: string, patch: Partial<Layer> = {}): Layer {
  return { id: newId(), text, x: 0.5, y: 0.5, size: 0.09, width: 0.92, rotation: 0, align: "center", font: "meme", style: "classic", color: "#FFFFFF", accent: "#000000", upper: true, ...patch };
}

type PresetId = "classic" | "bottom" | "band" | "labels";

function preset(id: PresetId, t: (k: string) => string, aspect: number): MemeState {
  // Keep top/bottom text clear of the edge whatever the image shape.
  const edge = Math.min(0.12, 0.075 * aspect + 0.02);
  switch (id) {
    case "bottom":
      return { layers: [layer(t("meme.ui.captionHere"), { y: 1 - edge })], band: { on: false, text: "", size: 0.055 } };
    case "band":
      return { layers: [], band: { on: true, text: t("meme.v2.bandSample"), size: 0.055 } };
    case "labels":
      return {
        layers: [
          layer(t("meme.ui.me"), { x: 0.25, y: 0.82, size: 0.06, width: 0.4, font: "sans", style: "label", color: "#000000", accent: "#FFFFFF", upper: false }),
          layer(t("meme.ui.newThing"), { x: 0.75, y: 0.82, size: 0.06, width: 0.4, font: "sans", style: "label", color: "#000000", accent: "#FFFFFF", upper: false }),
        ],
        band: { on: false, text: "", size: 0.055 },
      };
    default:
      return { layers: [layer(t("meme.ui.topText"), { y: edge }), layer(t("meme.ui.bottomText"), { y: 1 - edge })], band: { on: false, text: "", size: 0.055 } };
  }
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable);
}

/** Load the self-hosted Anton face once; resolves when it can be drawn on canvas. */
let fontPromise: Promise<void> | null = null;
function loadMemeFont(): Promise<void> {
  if (fontPromise) return fontPromise;
  fontPromise = (async () => {
    if (typeof FontFace === "undefined" || !document.fonts) return;
    const base = `/vendor/anton-${process.env.NEXT_PUBLIC_ANTON_VERSION}/`;
    const faces = [
      new FontFace(MEME_FAMILY, `url(${base}anton-latin-400-normal.woff2) format("woff2")`, {
        unicodeRange: "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD",
      }),
      new FontFace(MEME_FAMILY, `url(${base}anton-latin-ext-400-normal.woff2) format("woff2")`, {
        unicodeRange: "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF",
      }),
    ];
    await Promise.all(
      faces.map(async (f) => {
        try {
          document.fonts.add(await f.load());
        } catch {
          /* falls back to Impact / system bold */
        }
      }),
    );
  })();
  return fontPromise;
}

export default function MemeGeneratorPage() {
  const { t, locale } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [proxy, setProxy] = useState<ImageBitmap | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [state, setState] = useState<MemeState>({ layers: [], band: { on: false, text: "", size: 0.055 } });
  const [selected, setSelected] = useState<string | null>(null);
  const [fontReady, setFontReady] = useState(false);
  const [boxW, setBoxW] = useState(0);
  const [guide, setGuide] = useState<{ v: boolean; h: boolean }>({ v: false, h: false });
  const [format, setFormat] = useStoredPref<FormatChoice>("meme.format", "original", ["original", "image/jpeg", "image/png", "image/webp"]);
  const [quality, setQuality] = useStoredPref<number>("meme.quality", 0.92);
  const [exporting, setExporting] = useState(false);
  const [history, setHistory] = useState<{ stack: MemeState[]; index: number }>({ stack: [], index: -1 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const boxesRef = useRef<{ band: number; boxes: LayerBox[] }>({ band: 0, boxes: [] });
  const drag = useRef<{ id: string; mode: "move" | "resize"; sx: number; sy: number; start: Layer; dist: number } | null>(null);
  const restoring = useRef(false);

  useEffect(() => {
    loadMemeFont().then(() => setFontReady(true));
  }, []);
  useEffect(() => () => proxy?.close(), [proxy]);

  const load = useCallback(
    async (f: File) => {
      try {
        const d = await decodeImage(f);
        const p = await makeProxy(d.bitmap, 1400);
        d.bitmap.close();
        const first = preset("classic", t, d.naturalWidth / d.naturalHeight);
        setFile(f);
        setNatural({ w: d.naturalWidth, h: d.naturalHeight });
        setProxy(p);
        setState(first);
        setSelected(null);
        setHistory({ stack: [first], index: 0 });
      } catch {
        toast.error(t("meme.loadFail"));
      }
    },
    [t],
  );

  // ── History: record settled states (a pause of 350 ms ends an edit) ──
  useEffect(() => {
    if (!file) return;
    if (restoring.current) {
      restoring.current = false;
      return;
    }
    const id = window.setTimeout(() => {
      setHistory((h) => {
        if (h.stack[h.index] && JSON.stringify(h.stack[h.index]) === JSON.stringify(state)) return h;
        const stack = [...h.stack.slice(0, h.index + 1), state].slice(-60);
        return { stack, index: stack.length - 1 };
      });
    }, 350);
    return () => window.clearTimeout(id);
  }, [state, file]);
  const canUndo = history.index > 0;
  const canRedo = history.index < history.stack.length - 1;
  const undo = useCallback(() => {
    if (!canUndo) return;
    restoring.current = true;
    setState(history.stack[history.index - 1]!);
    setHistory((h) => ({ ...h, index: h.index - 1 }));
  }, [canUndo, history]);
  const redo = useCallback(() => {
    if (!canRedo) return;
    restoring.current = true;
    setState(history.stack[history.index + 1]!);
    setHistory((h) => ({ ...h, index: h.index + 1 }));
  }, [canRedo, history]);

  const sel = state.layers.find((l) => l.id === selected) ?? null;
  const patch = useCallback((id: string, p: Partial<Layer>) => setState((s) => ({ ...s, layers: s.layers.map((l) => (l.id === id ? { ...l, ...p } : l)) })), []);
  const addLayer = () => {
    const l: Layer = sel ? { ...sel, id: newId(), text: t("meme.ui.newText"), y: Math.min(0.9, sel.y + 0.12) } : layer(t("meme.ui.newText"));
    setState((s) => ({ ...s, layers: [...s.layers, l] }));
    setSelected(l.id);
    requestAnimationFrame(() => textRef.current?.select());
  };
  const removeLayer = (id: string) => {
    setState((s) => ({ ...s, layers: s.layers.filter((l) => l.id !== id) }));
    setSelected(null);
  };
  const duplicate = (id: string) => {
    const src = state.layers.find((l) => l.id === id);
    if (!src) return;
    const copy = { ...src, id: newId(), x: Math.min(0.95, src.x + 0.04), y: Math.min(0.95, src.y + 0.04) };
    setState((s) => ({ ...s, layers: [...s.layers, copy] }));
    setSelected(copy.id);
  };
  const moveLayer = (id: string, dir: 1 | -1) =>
    setState((s) => {
      const i = s.layers.findIndex((l) => l.id === id), j = i + dir;
      if (i < 0 || j < 0 || j >= s.layers.length) return s;
      const layers = [...s.layers];
      [layers[i], layers[j]] = [layers[j]!, layers[i]!];
      return { ...s, layers };
    });

  // ── Preview size ──
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    setBoxW(el.clientWidth);
    return () => ro.disconnect();
  }, [file]);

  const aspect = natural ? natural.h / natural.w : 1;
  const maxH = typeof window !== "undefined" ? window.innerHeight * 0.68 : 640;
  const cssW = Math.max(1, Math.min(boxW, maxH / (aspect + (state.band.on ? 0.18 : 0))));
  const builtin = useMemo(() => (typeof document === "undefined" ? "sans-serif" : builtInFontFamily()), []);

  // ── Draw preview ──
  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !proxy || !boxW) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = Math.round(cssW * dpr), H = Math.round(W * aspect);
    const ctx = ctx2d(c);
    // Measure the band first so the canvas is sized before drawing.
    const band = bandHeight(measureCtx(), state.band, W, builtin);
    c.width = W;
    c.height = H + band;
    c.style.width = `${cssW}px`;
    c.style.height = `${(H + band) / dpr}px`;
    const res = drawMeme(ctx, proxy, W, H, state, { builtin, locale });
    boxesRef.current = { band: res.band / dpr, boxes: res.boxes.map((b) => ({ ...b, cx: b.cx / dpr, cy: b.cy / dpr, w: b.w / dpr, h: b.h / dpr })) };
    // Overlay: selection, resize handle and centre guides (preview only).
    ctx.save();
    ctx.scale(dpr, dpr);
    const cssH = H / dpr, top = res.band / dpr;
    ctx.strokeStyle = "#FFD60A";
    ctx.lineWidth = 1;
    if (guide.v) {
      ctx.beginPath();
      ctx.moveTo(cssW / 2, top);
      ctx.lineTo(cssW / 2, top + cssH);
      ctx.stroke();
    }
    if (guide.h) {
      ctx.beginPath();
      ctx.moveTo(0, top + cssH / 2);
      ctx.lineTo(cssW, top + cssH / 2);
      ctx.stroke();
    }
    const b = boxesRef.current.boxes.find((x) => x.id === selected);
    if (b) {
      ctx.save();
      ctx.translate(b.cx, b.cy);
      ctx.rotate((b.rot * Math.PI) / 180);
      ctx.setLineDash([5, 4]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#16181D";
      ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.strokeStyle = "#FFD60A";
      ctx.lineDashOffset = 4.5;
      ctx.strokeRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.restore();
      const hp = handlePoint(b);
      ctx.fillStyle = "#FFD60A";
      ctx.strokeStyle = "#16181D";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }, [proxy, state, selected, cssW, aspect, boxW, builtin, locale, fontReady, guide]);

  // ── Pointer interaction ──
  const pos = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const p = pos(e);
    const { boxes } = boxesRef.current;
    const cur = boxes.find((b) => b.id === selected);
    if (cur) {
      const hp = handlePoint(cur);
      if (Math.hypot(p.x - hp.x, p.y - hp.y) <= 14) {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { id: cur.id, mode: "resize", sx: p.x, sy: p.y, start: sel!, dist: Math.max(8, Math.hypot(p.x - cur.cx, p.y - cur.cy)) };
        return;
      }
    }
    const hit = [...boxes].reverse().find((b) => hitBox(b, p.x, p.y, 4));
    if (!hit) {
      setSelected(null);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelected(hit.id);
    const l = state.layers.find((x) => x.id === hit.id)!;
    // Start from where the block is drawn (it may be held inside the image edges).
    const w = e.currentTarget.clientWidth;
    const start = { ...l, x: hit.cx / w, y: (hit.cy - boxesRef.current.band) / (w * aspect) };
    drag.current = { id: hit.id, mode: "move", sx: p.x, sy: p.y, start, dist: 0 };
  };
  const onMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    const c = canvasRef.current;
    if (!c) return;
    const p = pos(e);
    if (!d) {
      const { boxes } = boxesRef.current;
      const cur = boxes.find((b) => b.id === selected);
      const onHandle = cur && Math.hypot(p.x - handlePoint(cur).x, p.y - handlePoint(cur).y) <= 14;
      c.style.cursor = onHandle ? "nwse-resize" : boxes.some((b) => hitBox(b, p.x, p.y, 4)) ? "move" : "default";
      return;
    }
    const cssW2 = c.clientWidth, imgH = cssW2 * aspect;
    if (d.mode === "resize") {
      const b = boxesRef.current.boxes.find((x) => x.id === d.id);
      if (!b) return;
      const k = Math.hypot(p.x - b.cx, p.y - b.cy) / d.dist;
      patch(d.id, { size: Math.min(0.4, Math.max(0.015, d.start.size * k)), width: Math.min(1, Math.max(0.1, d.start.width * k)) });
      return;
    }
    let x = d.start.x + (p.x - d.sx) / cssW2;
    let y = d.start.y + (p.y - d.sy) / imgH;
    // Snap to the centre lines.
    const sv = Math.abs(x - 0.5) * cssW2 < 6, sh = Math.abs(y - 0.5) * imgH < 6;
    if (sv) x = 0.5;
    if (sh) y = 0.5;
    if (sv !== guide.v || sh !== guide.h) setGuide({ v: sv, h: sh });
    patch(d.id, { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) });
  };
  const onUp = () => {
    drag.current = null;
    setGuide({ v: false, h: false });
  };

  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (isTyping(e.target)) return;
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
      return;
    }
    if (mod && e.key.toLowerCase() === "y") {
      e.preventDefault();
      redo();
      return;
    }
    if (!sel) return;
    if (mod && e.key.toLowerCase() === "d") {
      e.preventDefault();
      duplicate(sel.id);
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      removeLayer(sel.id);
      return;
    }
    const step = e.shiftKey ? 0.05 : 0.005;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (d) {
      e.preventDefault();
      patch(sel.id, { x: Math.min(1, Math.max(0, sel.x + d[0]!)), y: Math.min(1, Math.max(0, sel.y + d[1]!)) });
    }
  };

  // ── Export at full resolution ──
  const exportMeme = async () => {
    if (!file || !natural) return;
    setExporting(true);
    let canvas: HTMLCanvasElement | null = null;
    try {
      await loadMemeFont();
      const d = await decodeImage(file);
      let W = d.width, H = d.height;
      const band = bandHeight(measureCtx(), state.band, W, builtin);
      const budget = maxCanvasPixels();
      if (W * (H + band) > budget) {
        const k = Math.sqrt(budget / (W * (H + band))) * 0.99;
        W = Math.floor(W * k);
        H = Math.floor(H * k);
      }
      canvas = makeCanvas(W, H + bandHeight(measureCtx(), state.band, W, builtin));
      drawMeme(ctx2d(canvas), d.bitmap, W, H, state, { builtin, locale });
      d.bitmap.close();
      const type = resolveFormat(file.type, format);
      const blob = await encodeCanvas(canvas, type, quality);
      const ext = type === "image/jpeg" ? "jpg" : type === "image/png" ? "png" : "webp";
      downloadBlob(blob, `${getFileNameWithoutExtension(file.name)}-meme.${ext}`);
      toast.success(t("meme.success"));
    } catch {
      toast.error(t("meme.fail"));
    } finally {
      releaseCanvas(canvas);
      setExporting(false);
    }
  };

  const applyPreset = (id: PresetId) => {
    setState(preset(id, t, natural ? natural.w / natural.h : 1));
    setSelected(null);
  };

  if (!file || !proxy) {
    return (
      <ToolLayout toolName={t("tool.meme-generator.name")} toolDescription={t("tool.meme-generator.desc")}>
        <FileDropzone onFilesSelected={(fs) => fs[0] && load(fs[0])} accept={ACCEPT} multiple={false} formats={["JPG", "PNG", "WEBP", "GIF", "AVIF"]} label={t("meme.dropLabel")} />
      </ToolLayout>
    );
  }

  const label = (k: string) => <span className="mb-1.5 block text-[13px] text-t-secondary">{k}</span>;

  return (
    <ToolLayout toolName={t("tool.meme-generator.name")} toolDescription={t("tool.meme-generator.desc")}>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start" onKeyDown={onKeyDown}>
        <div className="space-y-3 lg:sticky lg:top-20">
          <div className="glass p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button type="button" className={buttonSecondary} onClick={undo} disabled={!canUndo} aria-label={t("meme.undo")} title={`${t("meme.undo")} (Ctrl+Z)`}>
                <Undo2 className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" className={buttonSecondary} onClick={redo} disabled={!canRedo} aria-label={t("meme.redo")} title={`${t("meme.redo")} (Ctrl+Y)`}>
                <Redo2 className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" className={buttonSecondary} onClick={addLayer}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t("meme.v2.addText")}
              </button>
              <button type="button" className={`${buttonSecondary} ms-auto`} onClick={() => fileRef.current?.click()}>
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                {t("meme.newImage")}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) load(f);
                }}
              />
            </div>
            <div ref={boxRef} className="flex justify-center">
              <canvas
                ref={canvasRef}
                tabIndex={0}
                role="img"
                aria-label={t("meme.preview")}
                className="block touch-none select-none rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={onUp}
                onDoubleClick={() => textRef.current?.select()}
              />
            </div>
          </div>
          <p className="text-[12.5px] text-t-tertiary">{t("meme.v2.hint")}</p>
        </div>

        <div className="space-y-5">
          <div className="glass space-y-3 p-4">
            <p className={sectionTitle}>{t("meme.quickTemplates")}</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["classic", "meme.preset.classic"],
                  ["bottom", "meme.preset.bottomCaption"],
                  ["band", "meme.v2.preset.band"],
                  ["labels", "meme.v2.preset.labels"],
                ] as const
              ).map(([id, key]) => (
                <button key={id} type="button" onClick={() => applyPreset(id)} className="rounded-lg border border-border px-3 py-2 text-start text-[12.5px] font-medium text-t-secondary transition hover:border-t-primary/40 hover:text-t-primary">
                  {t(key)}
                </button>
              ))}
            </div>
          </div>

          <div className="glass space-y-3 p-4">
            <Toggle checked={state.band.on} onChange={(on) => setState((s) => ({ ...s, band: { ...s.band, on, text: s.band.text || t("meme.v2.bandSample") } }))} label={t("meme.v2.band")} description={t("meme.v2.bandHint")} />
            {state.band.on && (
              <>
                <textarea
                  value={state.band.text}
                  onChange={(e) => setState((s) => ({ ...s, band: { ...s.band, text: e.target.value } }))}
                  rows={2}
                  aria-label={t("meme.v2.band")}
                  className="w-full resize-none rounded-xl border border-border bg-bg-secondary px-3 py-2 text-[14px] text-t-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
                />
                <Slider label={t("meme.fontSize")} value={Math.round(state.band.size * 1000)} min={30} max={100} onChange={(v) => setState((s) => ({ ...s, band: { ...s.band, size: v / 1000 } }))} display={String(Math.round(state.band.size * 1000))} />
              </>
            )}
          </div>

          <div className="glass space-y-3 p-4">
            <p className={sectionTitle}>{t("meme.textLayers")}</p>
            {state.layers.length === 0 ? (
              <p className="text-[13px] text-t-tertiary">{t("meme.v2.noLayers")}</p>
            ) : (
              <ul className="space-y-1.5">
                {[...state.layers].reverse().map((l) => (
                  <li key={l.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(l.id)}
                      aria-pressed={selected === l.id}
                      className={`w-full truncate rounded-lg border px-3 py-2 text-start text-[13px] transition ${selected === l.id ? "border-t-primary bg-bg-secondary text-t-primary" : "border-border text-t-secondary hover:text-t-primary"}`}
                    >
                      {l.text.trim() || t("meme.emptyText")}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {sel ? (
              <div className="space-y-4 border-t border-border pt-4">
                <textarea
                  ref={textRef}
                  value={sel.text}
                  onChange={(e) => patch(sel.id, { text: e.target.value })}
                  rows={2}
                  aria-label={t("meme.textLabel")}
                  placeholder={t("meme.enterText")}
                  className="w-full resize-none rounded-xl border border-border bg-bg-secondary px-3 py-2 text-[14px] text-t-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
                />
                <div>
                  {label(t("meme.v2.style"))}
                  <Segmented<MemeStyle>
                    label={t("meme.v2.style")}
                    size="sm"
                    value={sel.style}
                    onChange={(style) =>
                      patch(sel.id, style === "label" && sel.style !== "label" ? { style, color: "#000000", accent: "#FFFFFF" } : style === "classic" && sel.style === "label" ? { style, color: "#FFFFFF", accent: "#000000" } : { style })
                    }
                    options={STYLES.map((s) => ({ value: s, label: t(`meme.v2.style.${s}`) }))}
                  />
                </div>
                <div>
                  {label(t("meme.fontFamily"))}
                  <Segmented<MemeFont>
                    label={t("meme.fontFamily")}
                    size="sm"
                    value={sel.font}
                    onChange={(font) => patch(sel.id, { font })}
                    options={FONTS.map((f) => ({ value: f, label: <span style={{ fontFamily: f === "meme" ? `"${MEME_FAMILY}", Impact, sans-serif` : f === "serif" ? "Georgia, serif" : undefined }}>{t(`meme.v2.font.${f}`)}</span> }))}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Toggle checked={sel.upper} onChange={(upper) => patch(sel.id, { upper })} label={t("meme.v2.upper")} />
                  <Segmented<Layer["align"]>
                    label={t("meme.alignment")}
                    size="sm"
                    value={sel.align}
                    onChange={(align) => patch(sel.id, { align })}
                    options={[
                      { value: "left", label: <AlignLeft className="h-4 w-4" aria-hidden="true" />, title: t("meme.ui.alignLeft") },
                      { value: "center", label: <AlignCenter className="h-4 w-4" aria-hidden="true" />, title: t("meme.ui.alignCenter") },
                      { value: "right", label: <AlignRight className="h-4 w-4" aria-hidden="true" />, title: t("meme.ui.alignRight") },
                    ]}
                  />
                </div>
                <Slider label={t("meme.fontSize")} value={Math.round(sel.size * 1000)} min={15} max={300} onChange={(v) => patch(sel.id, { size: v / 1000 })} display={String(Math.round(sel.size * 1000))} />
                <Slider label={t("meme.v2.width")} value={Math.round(sel.width * 100)} min={10} max={100} onChange={(v) => patch(sel.id, { width: v / 100 })} display={`${Math.round(sel.width * 100)}%`} />
                <Slider label={t("meme.rotation")} value={sel.rotation} min={-45} max={45} onChange={(v) => patch(sel.id, { rotation: v })} display={`${sel.rotation}°`} />
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      ["color", t("meme.textColor")],
                      ...(sel.style === "classic" || sel.style === "label" ? [["accent", sel.style === "label" ? t("meme.v2.boxColor") : t("meme.strokeColor")] as const] : []),
                    ] as const
                  ).map(([key, name]) => (
                    <div key={key}>
                      {label(name)}
                      <div className="flex flex-wrap gap-1.5">
                        {SWATCHES.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => patch(sel.id, { [key]: c })}
                            aria-label={`${name} ${c}`}
                            className={`h-6 w-6 rounded-md border-2 ${sel[key].toUpperCase() === c ? "border-t-primary" : "border-border"}`}
                            style={{ background: c }}
                          />
                        ))}
                        <label className="relative h-6 w-6 cursor-pointer overflow-hidden rounded-md border-2 border-border" title={name}>
                          <span className="absolute inset-0" style={{ background: "conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)" }} />
                          <input type="color" value={sel[key].toLowerCase()} onChange={(e) => patch(sel.id, { [key]: e.target.value.toUpperCase() })} className="absolute inset-0 cursor-pointer opacity-0" aria-label={name} />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                  <button type="button" className={buttonSecondary} onClick={() => duplicate(sel.id)} title={`${t("meme.ui.duplicate")} (Ctrl+D)`}>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    {t("meme.ui.duplicate")}
                  </button>
                  <button type="button" className={buttonSecondary} onClick={() => moveLayer(sel.id, 1)} aria-label={t("meme.ui.bringForward")} title={t("meme.ui.bringForward")}>
                    <ArrowUp className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" className={buttonSecondary} onClick={() => moveLayer(sel.id, -1)} aria-label={t("meme.ui.sendBackward")} title={t("meme.ui.sendBackward")}>
                    <ArrowDown className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" className={`${buttonSecondary} ms-auto`} onClick={() => removeLayer(sel.id)} aria-label={t("meme.deleteLayerTitle")} title={t("meme.deleteLayerTitle")}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : (
              state.layers.length > 0 && <p className="text-[12.5px] text-t-tertiary">{t("meme.selectHint")}</p>
            )}
          </div>

          <div className="glass space-y-4 p-4">
            <ExportFormatPicker value={format} onChange={setFormat} quality={quality} onQualityChange={setQuality} sourceType={file.type} />
            {file.type === "image/gif" && <p className="text-[12px] text-t-tertiary">{t("meme.v2.gifNote")}</p>}
            <button type="button" className={`${buttonPrimary} w-full`} onClick={exportMeme} disabled={exporting}>
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
              {t("meme.downloadMeme")}
            </button>
            {natural && (
              <p className="text-center text-[12.5px] tabular-nums text-t-tertiary">
                {natural.w} × {natural.h} px
              </p>
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
