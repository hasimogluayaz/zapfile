"use client";

/**
 * Shared React pieces for the image tools: a file list hook that builds
 * off-thread thumbnails and inspects every file once (size, alpha,
 * animation, decodability), plus a background colour picker.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { makeThumbnail } from "@/lib/image-engine";
import { canHaveAlpha, decodeOnMain, detectAlpha, isAnimated, type AnyFormat } from "@/lib/image-tools-kit";
import { useI18n } from "@/lib/i18n";

export interface ItemResult {
  blob: Blob;
  width: number;
  height: number;
  format: AnyFormat;
  keptOriginal?: boolean;
}

export interface ImageItem {
  id: string;
  file: File;
  /** Object URL of an off-thread WebP preview. */
  thumb?: string;
  /** Oriented pixel size (as the engine will see it). */
  width?: number;
  height?: number;
  alpha?: boolean;
  animated?: boolean;
  /** The worker can't decode this file (e.g. HEIC in Safari): decode on the main thread. */
  mainDecode?: boolean;
  /** No decoder in this browser. */
  unreadable?: boolean;
  status: "idle" | "queued" | "working" | "done" | "error";
  result?: ItemResult;
}

let seq = 0;

/** What to hand the engine for an item (a main-thread bitmap when the worker can't decode it). */
export async function jobInput(item: ImageItem): Promise<Blob> {
  if (!item.mainDecode) return item.file;
  return (await decodeOnMain(item.file)) as unknown as Blob;
}

export function useImageItems(thumbSize = 320) {
  const [items, setItems] = useState<ImageItem[]>([]);
  const ref = useRef<ImageItem[]>(items);
  ref.current = items;

  const update = useCallback((id: string, patch: Partial<ImageItem>) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  }, []);

  const inspect = useCallback(
    async (item: ImageItem) => {
      let thumb: { blob: Blob; width: number; height: number };
      let mainDecode = false;
      try {
        thumb = await makeThumbnail(item.file, thumbSize);
      } catch {
        try {
          const bmp = await decodeOnMain(item.file);
          thumb = await makeThumbnail(bmp, thumbSize);
          mainDecode = true;
        } catch {
          if (ref.current.some((i) => i.id === item.id)) update(item.id, { unreadable: true });
          return;
        }
      }
      const [alpha, animated] = await Promise.all([
        canHaveAlpha(item.file) ? detectAlpha(thumb.blob) : Promise.resolve(false),
        isAnimated(item.file),
      ]);
      if (!ref.current.some((i) => i.id === item.id)) return; // removed meanwhile
      update(item.id, {
        thumb: URL.createObjectURL(thumb.blob),
        width: thumb.width,
        height: thumb.height,
        alpha,
        animated,
        mainDecode,
      });
    },
    [thumbSize, update],
  );

  const add = useCallback(
    (files: File[]) => {
      const fresh: ImageItem[] = files.map((file) => ({ id: `img-${++seq}`, file, status: "idle" }));
      ref.current = [...ref.current, ...fresh];
      setItems((prev) => [...prev, ...fresh]);
      fresh.forEach((item) => void inspect(item));
      return fresh;
    },
    [inspect],
  );

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const gone = prev.find((i) => i.id === id);
      if (gone?.thumb) URL.revokeObjectURL(gone.thumb);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    ref.current.forEach((i) => i.thumb && URL.revokeObjectURL(i.thumb));
    ref.current = [];
    setItems([]);
  }, []);

  useEffect(() => () => ref.current.forEach((i) => i.thumb && URL.revokeObjectURL(i.thumb)), []);

  return { items, setItems, itemsRef: ref, update, add, remove, clear };
}

export const CHECKER_STYLE: React.CSSProperties = {
  backgroundColor: "#ffffff",
  backgroundImage:
    "linear-gradient(45deg,#e4e4e7 25%,transparent 25%),linear-gradient(-45deg,#e4e4e7 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e4e4e7 75%),linear-gradient(-45deg,transparent 75%,#e4e4e7 75%)",
  backgroundSize: "16px 16px",
  backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
};

/** "transparent" or a #rrggbb colour. */
export function BackgroundPicker({
  value,
  onChange,
  allowTransparent,
  label,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  allowTransparent: boolean;
  label: string;
  hint?: string;
}) {
  const { t } = useI18n();
  const swatches: { v: string; name: string }[] = [
    ...(allowTransparent ? [{ v: "transparent", name: t("imgkit.transparent") }] : []),
    { v: "#ffffff", name: t("imgkit.white") },
    { v: "#000000", name: t("imgkit.black") },
  ];
  const isCustom = !swatches.some((s) => s.v === value);
  return (
    <div className="space-y-2">
      <p className="text-[13px] text-t-secondary">{label}</p>
      <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={label}>
        {swatches.map((s) => (
          <button
            key={s.v}
            type="button"
            role="radio"
            aria-checked={value === s.v}
            aria-label={s.name}
            title={s.name}
            onClick={() => onChange(s.v)}
            className={`relative flex h-9 w-9 items-center justify-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt ${
              value === s.v ? "border-t-primary ring-2 ring-t-primary/20" : "border-border"
            }`}
            style={s.v === "transparent" ? CHECKER_STYLE : { backgroundColor: s.v }}
          >
            {value === s.v && <Check className={`h-4 w-4 ${s.v === "#000000" ? "text-white" : "text-black"}`} aria-hidden="true" />}
          </button>
        ))}
        <label
          className={`relative flex h-9 cursor-pointer items-center gap-2 rounded-full border px-1.5 pe-3 text-[13px] text-t-secondary focus-within:ring-2 focus-within:ring-volt ${
            isCustom ? "border-t-primary" : "border-border"
          }`}
        >
          <span className="h-6 w-6 rounded-full border border-border" style={{ backgroundColor: isCustom ? value : "#ff3b30" }} />
          {t("imgkit.custom")}
          <input
            type="color"
            value={isCustom ? value : "#ff3b30"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={t("imgkit.custom")}
          />
        </label>
      </div>
      {hint && <p className="text-[12px] text-t-tertiary">{hint}</p>}
    </div>
  );
}

/** Slim progress line with a count. */
export function BatchProgress({ done, total, label }: { done: number; total: number; label: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div aria-live="polite">
      <div className="mb-1.5 flex items-center justify-between text-[12.5px] text-t-secondary">
        <span>{label}</span>
        <span className="tabular-nums font-medium text-t-primary">
          {done}/{total}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Callback ref + live content width of an element (ResizeObserver). */
export function useElementWidth() {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, width] as const;
}

/** Largest w×h with aspect aw:ah inside maxW×maxH. */
export function fitSize(aw: number, ah: number, maxW: number, maxH: number) {
  if (aw <= 0 || ah <= 0 || maxW <= 0 || maxH <= 0) return { w: 0, h: 0 };
  const k = Math.min(maxW / aw, maxH / ah);
  return { w: aw * k, h: ah * k };
}

/** Viewport-relative max height for previews (min(vh%, cap)). */
export function useMaxPreviewHeight(vh = 0.55, cap = 460) {
  const [h, setH] = useState(cap);
  useEffect(() => {
    const on = () => setH(Math.max(220, Math.min(cap, window.innerHeight * vh)));
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, [vh, cap]);
  return h;
}
