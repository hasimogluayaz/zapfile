"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Bold, Download, ImagePlus, Italic, Loader2, Plus, Redo2, RotateCcw, Trash2, Undo2, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { Segmented, Slider, Toggle, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { AbortError, extensionFor, makeThumbnail } from "@/lib/image-engine";
import {
  ctx2d,
  decodeImage,
  encodeCanvas,
  ensureFont,
  makeCanvas,
  makeProxy,
  nextFrame,
  releaseCanvas,
  resolveFormat,
  type FormatChoice,
} from "@/lib/image-editor-kit";
import { ExportFormatPicker, formatLabel } from "@/lib/image-editor-kit-ui";
import { zipFiles } from "@/lib/image-tools-kit";
import { downloadBlob, formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { FONT_KEYS, GRID, buildSprite, fontString, placement, renderWatermark, type FontKey, type GridPos, type Mode, type WmSettings } from "./render";

interface Item {
  id: string;
  file: File;
  thumb: string | null;
}

interface Active {
  id: string;
  proxy: ImageBitmap;
  width: number;
  height: number;
  capped: boolean;
}

const DEFAULTS: WmSettings = {
  mode: "text",
  text: "© ZapFile",
  font: "builtin",
  bold: true,
  italic: false,
  color: "#ffffff",
  sizePct: 5,
  opacity: 70,
  rotation: 0,
  outline: false,
  outlineColor: "#000000",
  outlineWidth: 6,
  shadow: true,
  background: false,
  logoPct: 18,
  position: "bottom-right",
  customX: 50,
  customY: 50,
  marginPct: 4,
  tile: false,
  tileGap: 60,
};

const STORE_KEY = "zapfile.watermark.v2";
const ACCEPT_TYPES = ["image/jpeg", "image/png", "image/webp"];
const FONT_LABEL: Record<FontKey, string> = {
  builtin: "wm.v2.fontDefault",
  sans: "wm.fontSans",
  serif: "wm.fontSerif",
  mono: "wm.fontMono",
  impact: "wm.fontImpact",
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
let seq = 0;
const newId = () => `w${Date.now().toString(36)}${(seq++).toString(36)}`;

function loadSettings(): WmSettings {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<WmSettings>) };
  } catch {
    /* private mode or bad JSON: defaults */
  }
  return DEFAULTS;
}

export default function WatermarkImagePage() {
  const { t } = useI18n();
  const [items, setItems] = useState<Item[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<Active | null>(null);
  const [loading, setLoading] = useState(false);
  const [s, setS] = useState<WmSettings>(DEFAULTS);
  const [undo, setUndo] = useState<WmSettings[]>([]);
  const [redo, setRedo] = useState<WmSettings[]>([]);
  const [logo, setLogo] = useState<{ name: string; bitmap: ImageBitmap; url: string } | null>(null);
  const [format, setFormat] = useState<FormatChoice>("original");
  const [quality, setQuality] = useState(0.9);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [fontTick, setFontTick] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastEditRef = useRef(0);
  const dragRef = useRef<{ dx: number; dy: number; before: WmSettings; moved: boolean } | null>(null);
  const loadRunRef = useRef(0);
  const sRef = useRef(s);
  sRef.current = s;
  const activeRef = useRef(active);
  activeRef.current = active;
  const logoRef = useRef(logo);
  logoRef.current = logo;
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // Restore the last-used watermark (a per-browser convenience).
  useEffect(() => setS(loadSettings()), []);
  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(s));
      } catch {
        /* storage full or blocked */
      }
    }, 400);
    return () => clearTimeout(id);
  }, [s]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
      activeRef.current?.proxy.close();
      logoRef.current?.bitmap.close();
      if (logoRef.current) URL.revokeObjectURL(logoRef.current.url);
      for (const it of itemsRef.current) if (it.thumb) URL.revokeObjectURL(it.thumb);
    },
    [],
  );

  // Fonts load lazily: repaint once the chosen face can be drawn.
  useEffect(() => {
    let live = true;
    ensureFont(fontString(s, 40), s.text || "Aa").then(() => live && setFontTick((n) => n + 1));
    return () => {
      live = false;
    };
  }, [s]);

  // ── Images ──
  const addFiles = useCallback(
    (files: File[]) => {
      const added = files.map((file) => ({ id: newId(), file, thumb: null as string | null }));
      if (!added.length) return;
      setItems((prev) => [...prev, ...added]);
      setActiveId((cur) => cur ?? added[0]!.id);
      for (const it of added) {
        makeThumbnail(it.file, 160)
          .then(({ blob }) => {
            const url = URL.createObjectURL(blob);
            setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, thumb: url } : p)));
          })
          .catch(() => undefined);
      }
    },
    [],
  );

  // Decode a screen-sized proxy of the selected image.
  useEffect(() => {
    const item = items.find((i) => i.id === activeId);
    if (!item) {
      setActive((a) => {
        a?.proxy.close();
        return null;
      });
      return;
    }
    if (activeRef.current?.id === item.id) return;
    const run = ++loadRunRef.current;
    setLoading(true);
    (async () => {
      try {
        const decoded = await decodeImage(item.file);
        const proxy = await makeProxy(decoded.bitmap);
        const info = { id: item.id, proxy, width: decoded.width, height: decoded.height, capped: decoded.capped };
        decoded.bitmap.close();
        if (run !== loadRunRef.current) {
          proxy.close();
          return;
        }
        setActive((a) => {
          a?.proxy.close();
          return info;
        });
      } catch {
        if (run === loadRunRef.current) {
          toast.error(t("ui.failedLoad"));
          setItems((prev) => prev.filter((p) => p.id !== item.id));
          setActiveId(null);
        }
      } finally {
        if (run === loadRunRef.current) setLoading(false);
      }
    })();
  }, [activeId, items, t]);

  useEffect(() => {
    if (!activeId && items.length) setActiveId(items[0]!.id);
  }, [activeId, items]);

  const removeItem = (id: string) => {
    setItems((prev) => {
      const it = prev.find((p) => p.id === id);
      if (it?.thumb) URL.revokeObjectURL(it.thumb);
      const next = prev.filter((p) => p.id !== id);
      if (id === activeId) setActiveId(next[0]?.id ?? null);
      return next;
    });
  };

  const clearAll = () => {
    abortRef.current?.abort();
    for (const it of items) if (it.thumb) URL.revokeObjectURL(it.thumb);
    loadRunRef.current++;
    setItems([]);
    setActiveId(null);
    setLoading(false);
  };

  // ── Logo ──
  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    try {
      const decoded = await decodeImage(file);
      const bitmap = await makeProxy(decoded.bitmap, 2048);
      decoded.bitmap.close();
      setLogo((old) => {
        old?.bitmap.close();
        if (old) URL.revokeObjectURL(old.url);
        return { name: file.name, bitmap, url: URL.createObjectURL(file) };
      });
      if (s.mode === "text") change({ mode: "both" });
    } catch {
      toast.error(t("ui.failedLoad"));
    }
  };

  const removeLogo = () => {
    setLogo((old) => {
      old?.bitmap.close();
      if (old) URL.revokeObjectURL(old.url);
      return null;
    });
    if (s.mode !== "text") change({ mode: "text" });
  };

  // ── Settings + history ──
  const change = (patch: Partial<WmSettings>) => {
    const now = Date.now();
    // Slider drags and typing coalesce into one undo step.
    if (now - lastEditRef.current > 700) {
      setUndo((u) => [...u.slice(-79), sRef.current]);
      setRedo([]);
    }
    lastEditRef.current = now;
    setS((cur) => ({ ...cur, ...patch }));
  };

  const doUndo = () => {
    const prev = undo[undo.length - 1];
    if (!prev) return;
    setUndo(undo.slice(0, -1));
    setRedo([...redo, sRef.current]);
    setS(prev);
    lastEditRef.current = 0;
  };

  const doRedo = () => {
    const next = redo[redo.length - 1];
    if (!next) return;
    setRedo(redo.slice(0, -1));
    setUndo([...undo, sRef.current]);
    setS(next);
    lastEditRef.current = 0;
  };

  const resetAll = () => {
    lastEditRef.current = 0;
    change({ ...DEFAULTS, text: s.text });
  };

  // ── Preview ──
  const paint = useCallback(() => {
    frameRef.current = null;
    const a = activeRef.current;
    const canvas = canvasRef.current;
    if (!a || !canvas) return;
    const W = a.proxy.width;
    const H = a.proxy.height;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }
    const ctx = ctx2d(canvas);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(a.proxy, 0, 0);
    renderWatermark(ctx, W, H, sRef.current, logoRef.current?.bitmap ?? null);
  }, []);

  useEffect(() => {
    if (frameRef.current == null) frameRef.current = requestAnimationFrame(paint);
  }, [s, active, logo, fontTick, paint]);

  // Drag the watermark anywhere (switches to a custom position).
  const pointerAt = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height, W: c.width, H: c.height };
  };

  const currentCenter = (W: number, H: number) => {
    const sprite = buildSprite(sRef.current, W, logoRef.current?.bitmap ?? null);
    if (!sprite) return null;
    releaseCanvas(sprite.canvas);
    return placement(sRef.current, W, H, sprite.bw, sprite.bh);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (s.tile || progress) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const { x, y, W, H } = pointerAt(e);
    const p = currentCenter(W, H);
    if (!p) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus({ preventScroll: true });
    const inside = Math.abs(x - p.cx) <= p.rw / 2 + 12 && Math.abs(y - p.cy) <= p.rh / 2 + 12;
    // Grab the mark where it was touched; a tap elsewhere moves it there.
    dragRef.current = { dx: inside ? p.cx - x : 0, dy: inside ? p.cy - y : 0, before: sRef.current, moved: false };
    if (!inside) moveTo(x, y, W, H);
  };

  const moveTo = (x: number, y: number, W: number, H: number) => {
    const d = dragRef.current;
    if (!d) return;
    d.moved = true;
    setS((cur) => ({
      ...cur,
      position: "custom",
      customX: Math.round(clamp(((x + d.dx) / W) * 100, 0, 100) * 10) / 10,
      customY: Math.round(clamp(((y + d.dy) / H) * 100, 0, 100) * 10) / 10,
    }));
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragRef.current) return;
    const { x, y, W, H } = pointerAt(e);
    moveTo(x, y, W, H);
  };

  const onPointerUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d?.moved) {
      setUndo((u) => [...u.slice(-79), d.before]);
      setRedo([]);
      lastEditRef.current = 0;
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && e.key.toLowerCase() === "z") {
      e.preventDefault();
      if (e.shiftKey) doRedo();
      else doUndo();
      return;
    }
    if (!e.key.startsWith("Arrow") || s.tile) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    let { customX, customY } = s;
    if (s.position !== "custom") {
      const p = currentCenter(canvas.width, canvas.height);
      if (!p) return;
      customX = (p.cx / canvas.width) * 100;
      customY = (p.cy / canvas.height) * 100;
    }
    const step = e.shiftKey ? 5 : 0.5;
    if (e.key === "ArrowLeft") customX -= step;
    if (e.key === "ArrowRight") customX += step;
    if (e.key === "ArrowUp") customY -= step;
    if (e.key === "ArrowDown") customY += step;
    change({ position: "custom", customX: clamp(Math.round(customX * 10) / 10, 0, 100), customY: clamp(Math.round(customY * 10) / 10, 0, 100) });
  };

  // ── Export ──
  const hasMark = (s.mode !== "image" && s.text.trim().length > 0) || (s.mode !== "text" && !!logo);
  const outTypeFor = (file: File) => resolveFormat(ACCEPT_TYPES.includes(file.type) ? file.type : "image/png", format);

  const renderFull = async (item: Item, signal: AbortSignal): Promise<{ name: string; blob: Blob }> => {
    const decoded = await decodeImage(item.file);
    const canvas = makeCanvas(decoded.width, decoded.height);
    try {
      const ctx = ctx2d(canvas);
      ctx.drawImage(decoded.bitmap, 0, 0);
      decoded.bitmap.close();
      renderWatermark(ctx, canvas.width, canvas.height, sRef.current, logoRef.current?.bitmap ?? null);
      if (signal.aborted) throw new AbortError();
      const type = outTypeFor(item.file);
      const blob = await encodeCanvas(canvas, type, quality, signal);
      return { name: `${getFileNameWithoutExtension(item.file.name)}-watermarked.${extensionFor(type)}`, blob };
    } finally {
      releaseCanvas(canvas);
    }
  };

  const exportItems = async (list: Item[]) => {
    if (!list.length || !hasMark) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setProgress({ done: 0, total: list.length });
    try {
      await ensureFont(fontString(sRef.current, 40), sRef.current.text || "Aa");
      const out: { name: string; blob: Blob }[] = [];
      for (let i = 0; i < list.length; i++) {
        await nextFrame();
        if (ac.signal.aborted) throw new AbortError();
        out.push(await renderFull(list[i]!, ac.signal));
        setProgress({ done: i + 1, total: list.length });
      }
      if (out.length === 1) downloadBlob(out[0]!.blob, out[0]!.name);
      else downloadBlob(await zipFiles(out), "watermarked-images.zip");
    } catch (err) {
      if (!(err instanceof AbortError) && !ac.signal.aborted) {
        console.error(err);
        toast.error(t("ui.failedExport"));
      }
    } finally {
      if (abortRef.current === ac) {
        abortRef.current = null;
        setProgress(null);
      }
    }
  };

  const cancelExport = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setProgress(null);
  };

  const activeItem = items.find((i) => i.id === activeId) ?? null;
  const busy = progress != null;
  const firstType = activeItem && ACCEPT_TYPES.includes(activeItem.file.type) ? activeItem.file.type : "image/png";
  const mixed = useMemo(() => new Set(items.map((i) => i.file.type)).size > 1, [items]);
  const customLabel = `${Math.round(s.customX)}%, ${Math.round(s.customY)}%`;

  return (
    <ToolLayout toolName="Add Watermark" toolDescription="Add text or logo watermarks to your images">
      <div className="space-y-6">
        {!items.length ? (
          <FileDropzone
            onFilesSelected={addFiles}
            accept={{ "image/jpeg": [".jpg", ".jpeg"], "image/png": [".png"], "image/webp": [".webp"] }}
            multiple
            formats={["JPG", "PNG", "WEBP"]}
            label={t("wm.dropMainImage")}
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
            {/* Preview */}
            <div className="glass space-y-3 p-4 lg:sticky lg:top-20">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[13px] text-t-secondary">{t("wm.v2.dragHint")}</p>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={doUndo} disabled={!undo.length || busy} aria-label={t("wm.undo")} title={t("wm.undo")} className={`${buttonSecondary} h-10 w-10 !px-0`}>
                    <Undo2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={doRedo} disabled={!redo.length || busy} aria-label={t("wm.redo")} title={t("wm.redo")} className={`${buttonSecondary} h-10 w-10 !px-0`}>
                    <Redo2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" onClick={resetAll} disabled={busy} aria-label={t("wm.v2.reset")} title={t("wm.v2.reset")} className={`${buttonSecondary} h-10 w-10 !px-0`}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="relative flex min-h-[200px] items-center justify-center overflow-hidden rounded-xl border border-border bg-bg-secondary">
                {active && active.id === activeId ? (
                  <canvas
                    ref={canvasRef}
                    tabIndex={0}
                    role="application"
                    aria-label={t("wm.previewAlt")}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    onKeyDown={onKeyDown}
                    className={`block h-auto max-h-[min(70vh,640px)] w-auto max-w-full touch-none select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-volt ${s.tile ? "" : "cursor-move"}`}
                  />
                ) : null}
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-bg-secondary/70 text-[13px] text-t-secondary" role="status">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    {t("wm.loadingPreview")}
                  </div>
                )}
              </div>

              {activeItem && active && (
                <p className="truncate text-[12px] text-t-tertiary">
                  {activeItem.file.name} · {active.width}×{active.height} · {formatFileSize(activeItem.file.size)}
                  {active.capped ? ` · ${t("imgedit.v2.cappedNote", { w: active.width, h: active.height })}` : ""}
                </p>
              )}

              {/* Batch strip */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {items.map((it) => (
                  <div key={it.id} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveId(it.id)}
                      aria-pressed={it.id === activeId}
                      title={it.file.name}
                      className={`block h-14 w-14 overflow-hidden rounded-lg border-2 bg-bg-tertiary transition ${it.id === activeId ? "border-accent" : "border-transparent hover:border-border"}`}
                    >
                      {it.thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.thumb} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Loader2 className="m-auto h-4 w-4 animate-spin text-t-tertiary" aria-hidden="true" />
                      )}
                    </button>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(it.id)}
                        aria-label={`${t("ui.remove")} ${it.file.name}`}
                        className="absolute -end-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-t-secondary shadow-sm hover:text-t-primary"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ))}
                <label className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-dashed border-border text-t-tertiary transition hover:bg-bg-secondary hover:text-t-primary" title={t("wm.v2.addImages")}>
                  <Plus className="h-5 w-5" aria-hidden="true" />
                  <span className="sr-only">{t("wm.v2.addImages")}</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      addFiles(Array.from(e.target.files ?? []).filter((f) => ACCEPT_TYPES.includes(f.type)));
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              {items.length > 1 && <p className="text-[12px] text-t-tertiary">{t("wm.v2.applyAllNote")}</p>}
            </div>

            {/* Controls */}
            <div className="space-y-4">
              <div className="glass space-y-4 p-5">
                <Segmented<Mode>
                  label={t("wm.watermarkType")}
                  value={s.mode}
                  onChange={(v) => change({ mode: v })}
                  options={[
                    { value: "text", label: t("wm.typeText") },
                    { value: "image", label: t("wm.v2.logo") },
                    { value: "both", label: t("wm.typeBoth") },
                  ]}
                />

                {s.mode !== "image" && (
                  <div className="space-y-3">
                    <label className="block">
                      <span className="mb-1.5 block text-[13px] text-t-secondary">{t("wm.watermarkText")}</span>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={s.text}
                          onChange={(e) => change({ text: e.target.value })}
                          placeholder={t("wm.enterText")}
                          maxLength={200}
                          className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-bg-secondary px-3 text-[14px] text-t-primary placeholder:text-t-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
                        />
                        <button
                          type="button"
                          onClick={() => change({ text: s.text.startsWith("©") ? s.text : `© ${s.text}`.trim() })}
                          className={`${buttonSecondary} h-11 w-11 !px-0`}
                          aria-label={t("wm.v2.addCopyright")}
                          title={t("wm.v2.addCopyright")}
                        >
                          ©
                        </button>
                      </div>
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={s.font}
                        onChange={(e) => change({ font: e.target.value as FontKey })}
                        aria-label={t("wm.fontFamily")}
                        className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-bg-secondary px-3 text-[14px] text-t-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
                      >
                        {FONT_KEYS.map((k) => (
                          <option key={k} value={k}>
                            {t(FONT_LABEL[k])}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={() => change({ bold: !s.bold })} aria-pressed={s.bold} aria-label={t("wm.v2.bold")} title={t("wm.v2.bold")} className={`${buttonSecondary} h-10 w-10 !px-0 ${s.bold ? "bg-bg-secondary" : ""}`}>
                        <Bold className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <button type="button" onClick={() => change({ italic: !s.italic })} aria-pressed={s.italic} aria-label={t("wm.v2.italic")} title={t("wm.v2.italic")} className={`${buttonSecondary} h-10 w-10 !px-0 ${s.italic ? "bg-bg-secondary" : ""}`}>
                        <Italic className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <input
                        type="color"
                        value={s.color}
                        onChange={(e) => change({ color: e.target.value })}
                        aria-label={t("wm.color")}
                        title={t("wm.color")}
                        className="h-10 w-12 cursor-pointer rounded-xl border border-border bg-bg-secondary p-1"
                      />
                    </div>
                    <Slider label={t("wm.v2.size")} value={s.sizePct} min={1} max={30} step={0.5} onChange={(v) => change({ sizePct: v })} display={`${s.sizePct}%`} />
                  </div>
                )}

                {s.mode !== "text" && (
                  <div className="space-y-3">
                    {logo ? (
                      <div className="flex items-center gap-3 rounded-xl border border-border p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={logo.url} alt="" className="h-10 w-10 rounded-md object-contain" style={{ background: "repeating-conic-gradient(#e5e5e5 0% 25%, #fff 0% 50%) 50% / 10px 10px" }} />
                        <span className="min-w-0 flex-1 truncate text-[13px] text-t-secondary">{logo.name}</span>
                        <button type="button" onClick={removeLogo} aria-label={t("wm.v2.removeLogo")} title={t("wm.v2.removeLogo")} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-t-tertiary hover:bg-bg-secondary hover:text-t-primary">
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <label className={`${buttonSecondary} w-full cursor-pointer`}>
                        <ImagePlus className="h-4 w-4" aria-hidden="true" />
                        {t("wm.uploadImage")}
                        <input type="file" accept=".png,.jpg,.jpeg,.webp,.svg,image/*" className="sr-only" onChange={(e) => pickLogo(e.target.files?.[0])} />
                      </label>
                    )}
                    {!logo && <p className="text-[12px] text-t-tertiary">{t("wm.imageHint")}</p>}
                    <Slider label={t("wm.imageScale")} value={s.logoPct} min={3} max={80} onChange={(v) => change({ logoPct: v })} display={`${s.logoPct}%`} />
                  </div>
                )}

                <Slider label={t("wm.opacity")} value={s.opacity} min={5} max={100} onChange={(v) => change({ opacity: v })} display={`${s.opacity}%`} />
                <Slider label={t("wm.rotation")} value={s.rotation} min={-180} max={180} onChange={(v) => change({ rotation: v })} display={`${s.rotation}°`} hints={["-180°", "180°"]} />
              </div>

              <div className="glass space-y-4 p-5">
                <Toggle checked={s.tile} onChange={(v) => change({ tile: v, rotation: v && s.rotation === 0 ? -30 : s.rotation })} label={t("wm.tileLabel")} description={t("wm.tileDesc")} />
                {s.tile ? (
                  <Slider label={t("wm.v2.tileGap")} value={s.tileGap} min={0} max={300} step={5} onChange={(v) => change({ tileGap: v })} display={`${s.tileGap}%`} />
                ) : (
                  <>
                    <div className="space-y-2">
                      <p className={sectionTitle}>{t("wm.position")}</p>
                      <div className="flex items-start gap-4">
                        <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={t("wm.gridPosition")}>
                          {GRID.map((g) => (
                            <button
                              key={g}
                              type="button"
                              role="radio"
                              aria-checked={s.position === g}
                              aria-label={t(`wm.v2.pos.${g}`)}
                              title={t(`wm.v2.pos.${g}`)}
                              onClick={() => change({ position: g as GridPos })}
                              className={`flex h-10 w-10 items-center justify-center rounded-lg border transition ${s.position === g ? "border-accent bg-accent text-on-accent" : "border-border hover:bg-bg-secondary"}`}
                            >
                              <span className={`h-2 w-2 rounded-full ${s.position === g ? "bg-on-accent" : "bg-t-tertiary"}`} />
                            </button>
                          ))}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1 pt-1 text-[12.5px] text-t-tertiary">
                          {s.position === "custom" ? (
                            <p>
                              <span className="font-medium text-t-primary">{t("wm.v2.custom")}</span> · {customLabel}
                            </p>
                          ) : null}
                          <p>{t("wm.v2.dragHint")}</p>
                        </div>
                      </div>
                    </div>
                    {s.position !== "custom" && s.position !== "middle-center" && (
                      <Slider label={t("wm.v2.margin")} value={s.marginPct} min={0} max={20} step={0.5} onChange={(v) => change({ marginPct: v })} display={`${s.marginPct}%`} />
                    )}
                  </>
                )}
              </div>

              {s.mode !== "image" && (
                <div className="glass space-y-4 p-5">
                  <p className={sectionTitle}>{t("wm.extraOptions")}</p>
                  <Toggle checked={s.shadow} onChange={(v) => change({ shadow: v })} label={t("wm.v2.shadow")} description={t("wm.v2.shadowDesc")} />
                  <Toggle checked={s.outline} onChange={(v) => change({ outline: v })} label={t("wm.strokeOutline")} />
                  {s.outline && (
                    <div className="flex items-end gap-3 ps-[52px]">
                      <Slider className="flex-1" label={t("wm.strokeWidth")} value={s.outlineWidth} min={1} max={25} onChange={(v) => change({ outlineWidth: v })} display={`${s.outlineWidth}%`} />
                      <input type="color" value={s.outlineColor} onChange={(e) => change({ outlineColor: e.target.value })} aria-label={t("wm.strokeColor")} title={t("wm.strokeColor")} className="h-10 w-12 cursor-pointer rounded-xl border border-border bg-bg-secondary p-1" />
                    </div>
                  )}
                  <Toggle checked={s.background} onChange={(v) => change({ background: v })} label={t("wm.textBgLabel")} description={t("wm.textBgDesc")} />
                </div>
              )}

              <div className="glass space-y-4 p-5">
                <ExportFormatPicker value={format} onChange={setFormat} quality={quality} onQualityChange={setQuality} sourceType={firstType} mixedSources={mixed} />
                {busy ? (
                  <div className="space-y-2" aria-live="polite">
                    <div className="flex items-center justify-between text-[13px] text-t-secondary">
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        {t("ui.processing")}
                      </span>
                      <span className="tabular-nums">
                        {progress.done}/{progress.total}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-bg-tertiary">
                      <div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }} />
                    </div>
                    <button type="button" onClick={cancelExport} className={`${buttonSecondary} w-full`}>
                      <X className="h-4 w-4" aria-hidden="true" />
                      {t("imgedit.v2.cancel")}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeItem && (
                      <button type="button" onClick={() => exportItems([activeItem])} disabled={!hasMark} className={`${items.length > 1 ? buttonSecondary : buttonPrimary} w-full`}>
                        <Download className="h-4 w-4" aria-hidden="true" />
                        {t("imgedit.v2.downloadAs", { format: formatLabel(outTypeFor(activeItem.file)) })}
                      </button>
                    )}
                    {items.length > 1 && (
                      <button type="button" onClick={() => exportItems(items)} disabled={!hasMark} className={`${buttonPrimary} w-full`}>
                        <Download className="h-4 w-4" aria-hidden="true" />
                        {t("wm.v2.downloadAll", { n: items.length })}
                      </button>
                    )}
                    {!hasMark && <p className="text-[12.5px] text-t-tertiary">{s.mode === "text" ? t("wm.needText") : s.mode === "image" ? t("wm.needImage") : t("wm.needBoth")}</p>}
                  </div>
                )}
                <button type="button" onClick={clearAll} className={`${buttonSecondary} w-full`}>
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  {t("wm.newImage")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
