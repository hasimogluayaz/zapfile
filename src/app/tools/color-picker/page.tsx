"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import toast from "react-hot-toast";
import { Check, Copy, ImageIcon, Pipette, Shuffle, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import { Segmented, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { decodeImage, makeProxy } from "@/lib/image-editor-kit";
import { useI18n } from "@/lib/i18n";
import { useStoredPref } from "@/lib/text-tools/hooks";
import {
  HARMONIES,
  contrastWith,
  formatColor,
  harmony,
  hslToRgb,
  hsvToRgb,
  nearestName,
  oklchToRgb,
  parseAnyColor,
  readableInk,
  rgbToHsl,
  rgbToHsv,
  rgbToOklch,
  toHex,
  tonalScale,
  type FormatId,
  type HSVA,
  type Harmony,
  type RGBA,
} from "./color-core";

const COLOR_KEY = "zapfile.cp.color";
const RECENT_KEY = "zapfile.cp.recent";
const FORMATS: { id: FormatId; label: string }[] = [
  { id: "hex", label: "HEX" },
  { id: "rgb", label: "RGB" },
  { id: "hsl", label: "HSL" },
  { id: "hwb", label: "HWB" },
  { id: "oklch", label: "OKLCH" },
  { id: "cmyk", label: "CMYK" },
];
const HARMONY_LABEL: Record<Harmony, string> = {
  complementary: "rc.harmony.complementary",
  analogous: "rc.harmony.analogous",
  triadic: "rc.harmony.triadic",
  split: "rc.harmony.splitComp",
  tetradic: "rc.harmony.tetradic",
  mono: "clr.v2.mono",
};
const CHECKER = "repeating-conic-gradient(#d4d4d8 0 25%, #ffffff 0 50%) 0 0 / 12px 12px";
const HUE_TRACK = "linear-gradient(to right, #f00, #ff0 16.67%, #0f0 33.33%, #0ff 50%, #00f 66.67%, #f0f 83.33%, #f00)";

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
}

/** A pleasant random colour: mid lightness, moderate chroma, any hue. */
function randomColor(): RGBA {
  return oklchToRgb(0.5 + Math.random() * 0.38, 0.08 + Math.random() * 0.13, Math.random() * 360);
}

/** Pointer + keyboard 1-D slider drawn as a colour track. */
function Track({
  label,
  value,
  max,
  step,
  onChange,
  background,
  thumbColor,
  valueText,
}: {
  label: string;
  value: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  background: string;
  thumbColor: string;
  valueText: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const at = (e: ReactPointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    onChange(clamp((e.clientX - r.left) / r.width) * max);
  };
  const onKey = (e: ReactKeyboardEvent) => {
    const k = e.shiftKey ? step * 10 : step;
    const next = e.key === "ArrowRight" || e.key === "ArrowUp" ? value + k : e.key === "ArrowLeft" || e.key === "ArrowDown" ? value - k : e.key === "Home" ? 0 : e.key === "End" ? max : null;
    if (next === null) return;
    e.preventDefault();
    onChange(clamp(next, 0, max));
  };
  return (
    <div
      ref={ref}
      dir="ltr"
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      aria-valuetext={valueText}
      onKeyDown={onKey}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        at(e);
      }}
      onPointerMove={(e) => e.buttons === 1 && at(e)}
      className="relative h-4 cursor-pointer touch-none rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      style={{ background }}
    >
      <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]" />
      <span
        className="pointer-events-none absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_0_0_1px_rgb(0_0_0/0.25),0_2px_6px_rgb(0_0_0/0.25)]"
        style={{ left: `${(value / max) * 100}%`, background: thumbColor }}
      />
    </div>
  );
}

/** Number input that keeps the user's draft ("0.", "-") while typing and resyncs when idle. */
function NumField({ label, value, min, max, step, digits, suffix, onCommit }: { label: string; value: number; min: number; max: number; step: number; digits: number; suffix?: string; onCommit: (v: number) => void }) {
  const shown = String(Math.round(value * 10 ** digits) / 10 ** digits);
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-center text-[12px] font-medium text-t-tertiary">{label}</span>
      <span className="relative block">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          max={max}
          step={step}
          value={draft ?? shown}
          onFocus={() => setDraft(shown)}
          onBlur={() => setDraft(null)}
          onChange={(e) => {
            setDraft(e.target.value);
            const n = parseFloat(e.target.value);
            if (Number.isFinite(n)) onCommit(clamp(n, min, max));
          }}
          className={`h-10 w-full rounded-lg border border-border bg-bg-secondary text-center font-mono text-[13.5px] tabular-nums text-t-primary [appearance:textfield] focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60 [&::-webkit-inner-spin-button]:appearance-none ${suffix ? "pe-4 ps-1" : "px-1"}`}
        />
        {suffix && <span className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 text-[11px] text-t-tertiary">{suffix}</span>}
      </span>
    </label>
  );
}

function Badge({ ok, label, title }: { ok: boolean; label: string; title: string }) {
  return (
    <span title={title} className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold ${ok ? "bg-accent/10 text-t-primary" : "bg-bg-secondary text-t-tertiary line-through"}`}>
      {ok ? <Check className="h-3 w-3" aria-hidden="true" /> : <X className="h-3 w-3" aria-hidden="true" />}
      {label}
    </span>
  );
}

export default function ColorPickerPage() {
  const { t } = useI18n();
  const [hsva, setHsva] = useState<HSVA>({ h: 50, s: 0.96, v: 1, a: 1 });
  const [mode, setMode] = useStoredPref<"rgb" | "hsl" | "oklch">("cp.mode", "rgb", ["rgb", "hsl", "oklch"]);
  const [kind, setKind] = useStoredPref<Harmony>("cp.harmony", "complementary", HARMONIES);
  const [recent, setRecent] = useState<string[]>([]);
  const [text, setText] = useState<string | null>(null);
  const [hasDropper, setHasDropper] = useState(false);
  const [image, setImage] = useState<ImageBitmap | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; hex: string } | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const loaded = useRef(false);

  const rgb = useMemo(() => hsvToRgb(hsva), [hsva]);
  const hex = toHex(rgb);
  const opaqueHex = toHex(rgb, false);

  const setRgb = useCallback((c: RGBA) => setHsva((prev) => rgbToHsv(c, prev.h)), []);

  // Restore: link hash first (#ff8800), then the last colour used.
  useEffect(() => {
    let start: RGBA | null = null;
    const h = decodeURIComponent(location.hash.slice(1));
    if (/^[0-9a-f]{3,8}$/i.test(h)) start = parseAnyColor(h);
    try {
      start ??= parseAnyColor(localStorage.getItem(COLOR_KEY) ?? "");
      const r = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as unknown;
      if (Array.isArray(r)) setRecent(r.filter((x): x is string => typeof x === "string" && /^#[0-9A-F]{6,8}$/.test(x)).slice(0, 16));
    } catch {
      /* storage blocked */
    }
    if (start) setHsva(rgbToHsv(start));
    setHasDropper(typeof window !== "undefined" && "EyeDropper" in window);
    loaded.current = true;
  }, []);

  // Persist, mirror into the URL hash (shareable link) and remember settled colours.
  useEffect(() => {
    if (!loaded.current) return;
    const id = window.setTimeout(() => {
      try {
        localStorage.setItem(COLOR_KEY, hex);
      } catch {
        /* ignore */
      }
      history.replaceState(null, "", `${location.pathname}${location.search}#${hex.slice(1).toLowerCase()}`);
    }, 300);
    const rid = window.setTimeout(() => {
      setRecent((prev) => {
        if (prev[0] === hex) return prev;
        const next = [hex, ...prev.filter((x) => x !== hex)].slice(0, 16);
        try {
          localStorage.setItem(RECENT_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    }, 1500);
    return () => {
      window.clearTimeout(id);
      window.clearTimeout(rid);
    };
  }, [hex]);

  const randomize = useCallback(() => setHsva(rgbToHsv(randomColor())), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTypingTarget(e.target) && !(e.target instanceof HTMLElement && e.target.closest("button,[role=slider],a"))) {
        e.preventDefault();
        randomize();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [randomize]);

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("clr.copied", { value: value.length > 40 ? value.slice(0, 40) + "…" : value }));
    } catch {
      toast.error(t("clr.copyFail"));
    }
  };

  // ── Saturation / brightness square ──
  const pickArea = (e: ReactPointerEvent) => {
    const r = area.current!.getBoundingClientRect();
    setHsva((p) => ({ ...p, s: clamp((e.clientX - r.left) / r.width), v: 1 - clamp((e.clientY - r.top) / r.height) }));
  };
  const areaKey = (e: ReactKeyboardEvent) => {
    const k = e.shiftKey ? 0.1 : 0.01;
    const d = { ArrowLeft: [-k, 0], ArrowRight: [k, 0], ArrowUp: [0, k], ArrowDown: [0, -k] }[e.key];
    if (!d) return;
    e.preventDefault();
    setHsva((p) => ({ ...p, s: clamp(p.s + d[0]!), v: clamp(p.v + d[1]!) }));
  };

  // ── Screen and image pickers ──
  const eyedrop = async () => {
    try {
      const Ctor = (window as unknown as { EyeDropper: EyeDropperCtor }).EyeDropper;
      const res = await new Ctor().open();
      const c = parseAnyColor(res.sRGBHex);
      if (c) setRgb({ ...c, a: 1 });
    } catch {
      /* cancelled */
    }
  };

  const openImage = async (f: File) => {
    try {
      const d = await decodeImage(f);
      const proxy = await makeProxy(d.bitmap, 1600);
      if (proxy !== d.bitmap) d.bitmap.close();
      setImage((old) => {
        old?.close();
        return proxy;
      });
    } catch {
      toast.error(t("ui.failedLoad"));
    }
  };

  useEffect(() => {
    const c = canvasRef.current;
    if (!c || !image) return;
    c.width = image.width;
    c.height = image.height;
    c.getContext("2d", { willReadFrequently: true })?.drawImage(image, 0, 0);
  }, [image]);
  useEffect(() => () => image?.close(), [image]);

  const sample = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget;
    const r = c.getBoundingClientRect();
    const x = Math.floor(clamp((e.clientX - r.left) / r.width, 0, 0.9999) * c.width);
    const y = Math.floor(clamp((e.clientY - r.top) / r.height, 0, 0.9999) * c.height);
    const d = c.getContext("2d", { willReadFrequently: true })?.getImageData(x, y, 1, 1).data;
    if (!d) return null;
    return { x: e.clientX - r.left, y: e.clientY - r.top, c: { r: d[0]!, g: d[1]!, b: d[2]!, a: 1 } };
  };

  // ── Derived ──
  const scale = useMemo(() => tonalScale({ ...rgb, a: 1 }), [rgb]);
  const partners = useMemo(() => harmony({ ...rgb, a: 1 }, kind), [rgb, kind]);
  const name = useMemo(() => nearestName(rgb), [rgb]);
  const onWhite = contrastWith(rgb, 255);
  const onBlack = contrastWith(rgb, 0);
  const parsedText = text !== null ? parseAnyColor(text) : null;

  const [hh, ss, ll] = rgbToHsl(rgb);
  const [L, C, H] = rgbToOklch(rgb);
  const channels =
    mode === "rgb"
      ? [
          { label: "R", value: rgb.r, max: 255, step: 1, digits: 0, set: (v: number) => setRgb({ ...rgb, r: v }) },
          { label: "G", value: rgb.g, max: 255, step: 1, digits: 0, set: (v: number) => setRgb({ ...rgb, g: v }) },
          { label: "B", value: rgb.b, max: 255, step: 1, digits: 0, set: (v: number) => setRgb({ ...rgb, b: v }) },
        ]
      : mode === "hsl"
        ? [
            { label: "H", value: hsva.h, max: 360, step: 1, digits: 0, suffix: "°", set: (v: number) => setHsva((p) => ({ ...rgbToHsv(hslToRgb(v, ss, ll, p.a), v), h: v })) },
            { label: "S", value: ss, max: 100, step: 1, digits: 0, suffix: "%", set: (v: number) => setRgb(hslToRgb(hh, v, ll, rgb.a)) },
            { label: "L", value: ll, max: 100, step: 1, digits: 0, suffix: "%", set: (v: number) => setRgb(hslToRgb(hh, ss, v, rgb.a)) },
          ]
        : [
            { label: "L", value: L * 100, max: 100, step: 0.5, digits: 1, suffix: "%", set: (v: number) => setRgb(oklchToRgb(v / 100, C, H, rgb.a)) },
            { label: "C", value: C, max: 0.4, step: 0.005, digits: 3, set: (v: number) => setRgb(oklchToRgb(L, v, H, rgb.a)) },
            { label: "H", value: H, max: 360, step: 1, digits: 1, suffix: "°", set: (v: number) => setRgb(oklchToRgb(L, C, v, rgb.a)) },
          ];

  const scaleCss = `:root {\n${scale.steps.map((s) => `  --color-${name.name}-${s.step}: ${s.hex};`).join("\n")}\n}`;

  return (
    <ToolLayout toolName={t("tool.color-picker.name")} toolDescription={t("tool.color-picker.desc")}>
      <div className="space-y-5">
        {image && (
          <div className="glass space-y-3 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13.5px] text-t-secondary">{t("clr.v2.imageHint")}</p>
              <button type="button" onClick={() => setImage(null)} className={buttonSecondary} aria-label={t("clr.v2.closeImage")}>
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <div className="relative mx-auto w-fit max-w-full">
              <canvas
                ref={canvasRef}
                className="block max-h-[60vh] max-w-full cursor-crosshair touch-none rounded-lg"
                onPointerMove={(e) => {
                  const s = sample(e);
                  setHover(s ? { x: s.x, y: s.y, hex: toHex(s.c, false) } : null);
                  if (s && e.buttons === 1) setRgb(s.c);
                }}
                onPointerLeave={() => setHover(null)}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  const s = sample(e);
                  if (s) setRgb(s.c);
                }}
              />
              {hover && (
                <span
                  className="pointer-events-none absolute flex h-12 w-12 -translate-x-1/2 -translate-y-[calc(100%+14px)] items-end justify-center rounded-full border-[3px] border-white pb-0.5 shadow-[0_0_0_1px_rgb(0_0_0/0.3),0_4px_12px_rgb(0_0_0/0.3)]"
                  style={{ left: hover.x, top: hover.y, background: hover.hex }}
                  aria-hidden="true"
                />
              )}
            </div>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Picker */}
          <div className="glass space-y-4 p-4 sm:p-5">
            <div
              ref={area}
              dir="ltr"
              role="slider"
              tabIndex={0}
              aria-label={t("clr.v2.area")}
              aria-valuetext={`${Math.round(hsva.s * 100)}%, ${Math.round(hsva.v * 100)}%`}
              aria-valuenow={Math.round(hsva.s * 100)}
              onKeyDown={areaKey}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                pickArea(e);
              }}
              onPointerMove={(e) => e.buttons === 1 && pickArea(e)}
              className="relative aspect-[4/3] w-full cursor-crosshair touch-none rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent), hsl(${hsva.h} 100% 50%)` }}
            >
              <span className="pointer-events-none absolute inset-0 rounded-xl shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)]" />
              <span
                className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-[0_0_0_1px_rgb(0_0_0/0.3),0_2px_6px_rgb(0_0_0/0.3)]"
                style={{ left: `${hsva.s * 100}%`, top: `${(1 - hsva.v) * 100}%`, background: opaqueHex }}
              />
            </div>

            <div className="flex items-center gap-4">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border" style={{ background: CHECKER }}>
                <span className="absolute inset-0" style={{ background: hex }} />
              </div>
              <div className="min-w-0 flex-1 space-y-3.5">
                <Track label={t("clr.v2.hue")} value={hsva.h} max={360} step={1} onChange={(h) => setHsva((p) => ({ ...p, h }))} background={HUE_TRACK} thumbColor={`hsl(${hsva.h} 100% 50%)`} valueText={`${Math.round(hsva.h)}°`} />
                <Track
                  label={t("clr.v2.alpha")}
                  value={hsva.a * 100}
                  max={100}
                  step={1}
                  onChange={(a) => setHsva((p) => ({ ...p, a: Math.round(a) / 100 }))}
                  background={`linear-gradient(to right, transparent, ${opaqueHex}), ${CHECKER}`}
                  thumbColor={hex}
                  valueText={`${Math.round(hsva.a * 100)}%`}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={randomize} className={buttonSecondary} title={`${t("rc.generateNew")} (${t("rc.spaceKey")})`}>
                <Shuffle className="h-4 w-4" aria-hidden="true" />
                {t("rc.generateNew")}
              </button>
              {hasDropper && (
                <button type="button" onClick={eyedrop} className={buttonSecondary}>
                  <Pipette className="h-4 w-4" aria-hidden="true" />
                  {t("clr.v2.eyedropper")}
                </button>
              )}
              <button type="button" onClick={() => fileRef.current?.click()} className={buttonSecondary}>
                <ImageIcon className="h-4 w-4" aria-hidden="true" />
                {t("clr.v2.fromImage")}
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
                  if (f) openImage(f);
                }}
              />
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <Segmented<"rgb" | "hsl" | "oklch">
                label={t("clr.v2.channels")}
                size="sm"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "rgb", label: "RGB" },
                  { value: "hsl", label: "HSL" },
                  { value: "oklch", label: "OKLCH" },
                ]}
              />
              <div className="grid grid-cols-4 gap-2">
                {channels.map((ch) => (
                  <NumField key={mode + ch.label} label={ch.label} value={ch.value} min={0} max={ch.max} step={ch.step} digits={ch.digits} suffix={"suffix" in ch ? ch.suffix : undefined} onCommit={ch.set} />
                ))}
                <NumField label="A" value={hsva.a * 100} min={0} max={100} step={1} digits={0} suffix="%" onCommit={(v) => setHsva((p) => ({ ...p, a: v / 100 }))} />
              </div>
            </div>
          </div>

          {/* Values */}
          <div className="space-y-5">
            <div className="glass space-y-3 p-4 sm:p-5">
              <label className="block">
                <span className="mb-1.5 block text-[13px] text-t-secondary">{t("clr.v2.input")}</span>
                <input
                  value={text ?? hex}
                  dir="ltr"
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="#FFD60A · rgb(…) · oklch(…) · tomato"
                  onFocus={(e) => {
                    setText(hex);
                    e.currentTarget.select();
                  }}
                  onBlur={() => setText(null)}
                  onChange={(e) => {
                    setText(e.target.value);
                    const c = parseAnyColor(e.target.value);
                    if (c) setRgb(c);
                  }}
                  aria-invalid={text !== null && text.trim() !== "" && !parsedText}
                  className="h-12 w-full rounded-xl border border-border bg-bg-secondary px-3 font-mono text-[15px] text-t-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60 aria-[invalid=true]:border-red-500/60"
                />
                <span className="mt-1.5 block text-[12.5px] text-t-tertiary">
                  {text !== null && text.trim() !== "" && !parsedText ? t("clr.v2.invalid") : t(name.exact ? "clr.v2.exactName" : "clr.v2.near", { name: name.name })}
                </span>
              </label>
              <ul className="divide-y divide-border">
                {FORMATS.map((f) => {
                  const v = formatColor(rgb, f.id);
                  return (
                    <li key={f.id} className="flex items-center gap-3 py-1.5">
                      <span className="w-14 shrink-0 text-[12px] font-semibold text-t-tertiary">{f.label}</span>
                      <button type="button" onClick={() => copy(v)} dir="ltr" className="min-w-0 flex-1 truncate text-start font-mono text-[13.5px] text-t-primary hover:underline">
                        {v}
                      </button>
                      <button type="button" onClick={() => copy(v)} aria-label={`${t("clr.copy")} ${f.label}`} className="rounded-md p-1.5 text-t-tertiary transition hover:bg-bg-secondary hover:text-t-primary">
                        <Copy className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="glass space-y-3 p-4 sm:p-5">
              <p className={sectionTitle}>{t("clr.v2.contrast")}</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  [255, onWhite, "#FFFFFF", "#6B7280", "clr.v2.onWhite"],
                  [0, onBlack, "#16181D", "#9CA3AF", "clr.v2.onBlack"],
                ] as const).map(([bg, ratio, fill, muted, key]) => (
                  <div key={bg} className="overflow-hidden rounded-xl border border-border">
                    <div className="flex h-16 items-center justify-center gap-2 text-[22px] font-semibold" style={{ background: fill, color: hex }}>
                      Aa{" "}
                      <span className="text-[13px] font-medium" style={{ color: muted }}>
                        {t(key)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-1.5 p-2.5">
                      <span className="font-mono text-[14px] font-semibold tabular-nums text-t-primary">{ratio.toFixed(2)}:1</span>
                      <span className="flex gap-1">
                        <Badge ok={ratio >= 4.5} label="AA" title={t("clr.v2.aaHint")} />
                        <Badge ok={ratio >= 7} label="AAA" title={t("clr.v2.aaHint")} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[12.5px] text-t-tertiary">{t("clr.v2.aaHint")}</p>
            </div>
          </div>
        </div>

        {/* Tonal scale */}
        <div className="glass space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={sectionTitle}>{t("clr.v2.scale")}</p>
              <p className="mt-1 text-[12.5px] text-t-tertiary">{t("clr.v2.scaleHint")}</p>
            </div>
            <button type="button" onClick={() => copy(scaleCss)} className={buttonSecondary}>
              <Copy className="h-4 w-4" aria-hidden="true" />
              {t("clr.v2.copyScale")}
            </button>
          </div>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-11">
            {scale.steps.map((s, i) => {
              const c = parseAnyColor(s.hex)!;
              return (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => setRgb({ ...c, a: rgb.a })}
                  title={s.hex}
                  className={`flex h-16 flex-col justify-between rounded-lg p-1.5 text-start font-mono text-[10.5px] leading-tight transition hover:scale-[1.04] ${i === scale.nearest ? "ring-2 ring-t-primary ring-offset-2 ring-offset-surface" : ""}`}
                  style={{ background: s.hex, color: readableInk(c) }}
                >
                  <span className="font-semibold">{s.step}</span>
                  <span>{s.hex.slice(1)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-5">
          {/* Harmonies */}
          <div className="glass space-y-3 p-4 sm:p-5">
            <p className={sectionTitle}>{t("rc.harmonyMode")}</p>
            <div className="max-w-full overflow-x-auto scrollbar-hide">
              <Segmented<Harmony> label={t("rc.harmonyMode")} size="sm" value={kind} onChange={setKind} options={HARMONIES.map((h) => ({ value: h, label: t(HARMONY_LABEL[h]) }))} />
            </div>
            <div className="flex gap-2">
              {[opaqueHex, ...partners].map((c, i) => {
                const parsed = parseAnyColor(c)!;
                return (
                  <button
                    key={`${c}-${i}`}
                    type="button"
                    onClick={() => (i === 0 ? copy(c) : setRgb({ ...parsed, a: rgb.a }))}
                    className="flex h-20 min-w-0 flex-1 items-end rounded-lg border border-border p-2 font-mono text-[11px] font-semibold transition hover:scale-[1.02]"
                    style={{ background: c, color: readableInk(parsed) }}
                    title={i === 0 ? t("clr.copy") : c}
                  >
                    <span className="truncate">{c.slice(1)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent */}
          <div className="glass space-y-3 p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <p className={sectionTitle}>{t("clr.v2.recent")}</p>
              {recent.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setRecent([]);
                    try {
                      localStorage.removeItem(RECENT_KEY);
                    } catch {
                      /* ignore */
                    }
                  }}
                  className="text-[12.5px] text-t-tertiary hover:text-t-primary"
                >
                  {t("clr.v2.clearRecent")}
                </button>
              )}
            </div>
            {recent.length ? (
              <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-[repeat(16,minmax(0,1fr))]">
                {recent.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setRgb(parseAnyColor(c)!)}
                    title={c}
                    aria-label={c}
                    className={`relative aspect-square overflow-hidden rounded-lg border transition hover:scale-105 ${c === hex ? "border-t-primary" : "border-border"}`}
                    style={{ background: CHECKER }}
                  >
                    <span className="absolute inset-0" style={{ background: c }} />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-t-tertiary">{t("clr.v2.recentEmpty")}</p>
            )}
            <p className="text-[12.5px] text-t-tertiary">{t("clr.v2.shareHint")}</p>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
