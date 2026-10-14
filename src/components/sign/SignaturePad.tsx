"use client";

/**
 * Create a signature three ways: draw it (smooth, speed-sensitive strokes), type it in a handwriting
 * font, or upload a photo/scan (paper background made transparent). Returns a tightly trimmed PNG.
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Eraser, ImagePlus, Undo2 } from "lucide-react";
import { Segmented, Toggle, buttonPrimary, buttonSecondary } from "@/components/ui/controls";
import { decodeImage } from "@/lib/image-editor-kit";
import { SIGNATURE_FONTS, loadSignatureFont, signatureFamily, type SignatureFont } from "@/lib/pdf-stamp/fonts";
import { useI18n } from "@/lib/i18n";

export interface SignatureResult {
  png: Blob;
  url: string;
  width: number;
  height: number;
}

const INKS = ["#16181D", "#1D4ED8", "#B91C1C"];

/** Crop a canvas to its non-transparent pixels (plus a little padding) and encode PNG. */
async function trimToPng(src: HTMLCanvasElement): Promise<SignatureResult | null> {
  const ctx = src.getContext("2d", { willReadFrequently: true })!;
  const { width: W, height: H } = src;
  const data = ctx.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4 + 3]! > 12) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  const pad = Math.round(Math.max(W, H) * 0.01) + 2;
  x0 = Math.max(0, x0 - pad);
  y0 = Math.max(0, y0 - pad);
  x1 = Math.min(W - 1, x1 + pad);
  y1 = Math.min(H - 1, y1 + pad);
  const out = document.createElement("canvas");
  out.width = x1 - x0 + 1;
  out.height = y1 - y0 + 1;
  out.getContext("2d")!.drawImage(src, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  const png = await new Promise<Blob | null>((r) => out.toBlob(r, "image/png"));
  if (!png) return null;
  return { png, url: URL.createObjectURL(png), width: out.width, height: out.height };
}

type Point = { x: number; y: number; t: number };

export default function SignaturePad({ onDone, onCancel, initialName = "" }: { onDone: (s: SignatureResult) => void; onCancel: () => void; initialName?: string }) {
  const { t } = useI18n();
  const [mode, setMode] = useState<"draw" | "type" | "upload">("draw");
  const [ink, setInk] = useState(INKS[0]!);
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const [name, setName] = useState(initialName);
  const [font, setFont] = useState<SignatureFont>("dancing-script");
  const [fontsReady, setFontsReady] = useState(false);
  const [upload, setUpload] = useState<ImageBitmap | null>(null);
  const [clearBg, setClearBg] = useState(true);
  const [busy, setBusy] = useState(false);
  const drawRef = useRef<HTMLCanvasElement>(null);
  const live = useRef<Point[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void Promise.all(SIGNATURE_FONTS.map(loadSignatureFont)).then(() => setFontsReady(true));
  }, []);
  useEffect(() => () => upload?.close(), [upload]);

  // Redraw strokes with speed-dependent width (fast = thinner), smoothed through midpoints.
  const paint = (list: Point[][]) => {
    const c = drawRef.current;
    if (!c) return;
    const dpr = Math.min(3, window.devicePixelRatio || 1);
    const rect = c.getBoundingClientRect();
    if (c.width !== Math.round(rect.width * dpr)) {
      c.width = Math.round(rect.width * dpr);
      c.height = Math.round(rect.height * dpr);
    }
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    const base = 2.6 * dpr;
    for (const s of list) {
      if (s.length === 1) {
        ctx.beginPath();
        ctx.arc(s[0]!.x * dpr, s[0]!.y * dpr, base / 2, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      for (let i = 1; i < s.length; i++) {
        const a = s[i - 1]!, b = s[i]!;
        const v = Math.hypot(b.x - a.x, b.y - a.y) / Math.max(1, b.t - a.t);
        ctx.lineWidth = Math.max(base * 0.45, base * (1.25 - Math.min(0.8, v * 0.35)));
        const prev = s[i - 2];
        const m0 = prev ? { x: (prev.x + a.x) / 2, y: (prev.y + a.y) / 2 } : a;
        const m1 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        ctx.beginPath();
        ctx.moveTo(m0.x * dpr, m0.y * dpr);
        ctx.quadraticCurveTo(a.x * dpr, a.y * dpr, m1.x * dpr, m1.y * dpr);
        ctx.stroke();
      }
    }
  };
  useEffect(() => paint(strokes), [strokes, ink]); // eslint-disable-line react-hooks/exhaustive-deps

  const pos = (e: ReactPointerEvent<HTMLCanvasElement>): Point => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() };
  };

  const finish = async () => {
    setBusy(true);
    try {
      let canvas: HTMLCanvasElement;
      if (mode === "draw") {
        canvas = drawRef.current!;
      } else if (mode === "type") {
        canvas = document.createElement("canvas");
        const px = 160;
        const ctx = canvas.getContext("2d")!;
        ctx.font = `${px}px "${signatureFamily(font)}"`;
        const w = ctx.measureText(name.trim()).width;
        canvas.width = Math.ceil(w + px);
        canvas.height = Math.ceil(px * 1.8);
        const c2 = canvas.getContext("2d")!;
        c2.font = `${px}px "${signatureFamily(font)}"`;
        c2.fillStyle = ink;
        c2.textBaseline = "middle";
        c2.fillText(name.trim(), px / 2, canvas.height / 2);
      } else {
        if (!upload) return;
        canvas = document.createElement("canvas");
        const k = Math.min(1, 1400 / Math.max(upload.width, upload.height));
        canvas.width = Math.round(upload.width * k);
        canvas.height = Math.round(upload.height * k);
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(upload, 0, 0, canvas.width, canvas.height);
        if (clearBg) {
          // Paper → transparent: alpha from darkness relative to the brightest (paper) level.
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const d = img.data;
          let paper = 0;
          for (let i = 0; i < d.length; i += 4 * 97) paper = Math.max(paper, (d[i]! + d[i + 1]! + d[i + 2]!) / 3);
          paper = Math.max(160, paper);
          for (let i = 0; i < d.length; i += 4) {
            const l = (d[i]! + d[i + 1]! + d[i + 2]!) / 3;
            const a = Math.max(0, Math.min(1, (paper - 18 - l) / (paper - 18 - 60)));
            d[i + 3] = Math.round(d[i + 3]! * a);
          }
          ctx.putImageData(img, 0, 0);
        }
      }
      const res = await trimToPng(canvas);
      if (res) onDone(res);
    } finally {
      setBusy(false);
    }
  };

  const ready = mode === "draw" ? strokes.length > 0 : mode === "type" ? name.trim().length > 0 : !!upload;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<"draw" | "type" | "upload">
          label={t("sign.create")}
          value={mode}
          onChange={setMode}
          options={[
            { value: "draw", label: t("sign.draw") },
            { value: "type", label: t("sign.type") },
            { value: "upload", label: t("sign.upload") },
          ]}
        />
        {mode !== "upload" && (
          <div className="flex gap-1.5" role="radiogroup" aria-label={t("sign.ink")}>
            {INKS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={ink === c} aria-label={c} onClick={() => setInk(c)} className={`h-7 w-7 rounded-full border-2 ${ink === c ? "border-t-primary" : "border-border"}`} style={{ background: c }} />
            ))}
          </div>
        )}
      </div>

      {mode === "draw" && (
        <div className="space-y-2">
          <div className="relative rounded-xl border border-border bg-white">
            <canvas
              ref={drawRef}
              className="block h-48 w-full cursor-crosshair touch-none rounded-xl"
              aria-label={t("sign.drawHere")}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                live.current = [pos(e)];
                setStrokes((s) => [...s, live.current!]);
              }}
              onPointerMove={(e) => {
                if (!live.current) return;
                live.current.push(pos(e));
                setStrokes((s) => [...s.slice(0, -1), [...live.current!]]);
              }}
              onPointerUp={() => (live.current = null)}
              onPointerCancel={() => (live.current = null)}
            />
            <span className="pointer-events-none absolute inset-x-8 bottom-10 border-b border-dashed border-neutral-300" aria-hidden="true" />
            {!strokes.length && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[14px] text-neutral-400">{t("sign.drawHere")}</span>}
          </div>
          <div className="flex gap-2">
            <button type="button" className={buttonSecondary} onClick={() => setStrokes((s) => s.slice(0, -1))} disabled={!strokes.length}>
              <Undo2 className="h-4 w-4" aria-hidden="true" />
              {t("meme.undo")}
            </button>
            <button type="button" className={buttonSecondary} onClick={() => setStrokes([])} disabled={!strokes.length}>
              <Eraser className="h-4 w-4" aria-hidden="true" />
              {t("ui.clear")}
            </button>
          </div>
        </div>
      )}

      {mode === "type" && (
        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("sign.namePlaceholder")}
            aria-label={t("sign.namePlaceholder")}
            className="h-11 w-full rounded-xl border border-border bg-bg-secondary px-3 text-[15px] text-t-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
          />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" role="radiogroup" aria-label={t("meme.fontFamily")}>
            {SIGNATURE_FONTS.map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={font === f}
                onClick={() => setFont(f)}
                className={`flex h-20 items-center justify-center overflow-hidden rounded-xl border-2 bg-white px-3 text-[30px] ${font === f ? "border-t-primary" : "border-border"}`}
                style={{ fontFamily: fontsReady ? `"${signatureFamily(f)}"` : undefined, color: ink }}
              >
                <span className="truncate">{name.trim() || t("sign.sample")}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {mode === "upload" && (
        <div className="space-y-3">
          <button type="button" className={`${buttonSecondary} w-full`} onClick={() => fileRef.current?.click()}>
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
            {t("sign.uploadPick")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              try {
                const d = await decodeImage(f);
                setUpload((old) => {
                  old?.close();
                  return d.bitmap;
                });
              } catch {
                /* unreadable */
              }
            }}
          />
          {upload && <UploadPreview bitmap={upload} />}
          <Toggle checked={clearBg} onChange={setClearBg} label={t("sign.clearBg")} description={t("sign.clearBgHint")} />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button type="button" className={buttonSecondary} onClick={onCancel}>
          {t("bg.cancel")}
        </button>
        <button type="button" className={buttonPrimary} onClick={finish} disabled={!ready || busy}>
          {t("sign.use")}
        </button>
      </div>
    </div>
  );
}

function UploadPreview({ bitmap }: { bitmap: ImageBitmap }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const k = Math.min(1, 600 / bitmap.width, 200 / bitmap.height);
    c.width = Math.round(bitmap.width * k);
    c.height = Math.round(bitmap.height * k);
    c.getContext("2d")!.drawImage(bitmap, 0, 0, c.width, c.height);
  }, [bitmap]);
  return <canvas ref={ref} className="mx-auto block max-h-40 max-w-full rounded-lg border border-border" />;
}
