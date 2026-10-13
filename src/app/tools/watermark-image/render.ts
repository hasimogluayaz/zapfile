/**
 * Watermark rendering shared by the live preview, single export and batch
 * export. Every size is relative to the image (text size and logo width are
 * % of the image width, margins % of the short side, outline/shadow relative
 * to the text), so one set of settings looks the same on any photo.
 */
import { builtInFontFamily, ctx2d, makeCanvas, releaseCanvas } from "@/lib/image-editor-kit";

export const GRID = [
  "top-left",
  "top-center",
  "top-right",
  "middle-left",
  "middle-center",
  "middle-right",
  "bottom-left",
  "bottom-center",
  "bottom-right",
] as const;
export type GridPos = (typeof GRID)[number];
export type Position = GridPos | "custom";
export type Mode = "text" | "image" | "both";
export type FontKey = "builtin" | "sans" | "serif" | "mono" | "impact";

export interface WmSettings {
  mode: Mode;
  text: string;
  font: FontKey;
  bold: boolean;
  italic: boolean;
  color: string;
  /** Text size, % of image width. */
  sizePct: number;
  /** 5–100 */
  opacity: number;
  /** degrees */
  rotation: number;
  outline: boolean;
  outlineColor: string;
  /** Outline width, % of the text size. */
  outlineWidth: number;
  shadow: boolean;
  background: boolean;
  /** Logo width, % of image width. */
  logoPct: number;
  position: Position;
  customX: number;
  customY: number;
  /** Edge margin, % of the image's short side. */
  marginPct: number;
  tile: boolean;
  /** Space between tiles, % of the watermark size. */
  tileGap: number;
}

export const FONT_KEYS: FontKey[] = ["builtin", "sans", "serif", "mono", "impact"];

export function fontStack(key: FontKey): string {
  const builtin = builtInFontFamily();
  switch (key) {
    case "sans":
      return `"Helvetica Neue", Helvetica, Arial, "Noto Sans", "Liberation Sans", ${builtin}`;
    case "serif":
      return `Georgia, "Times New Roman", "Noto Serif", "Liberation Serif", "DejaVu Serif", serif`;
    case "mono":
      return `ui-monospace, Menlo, Consolas, "Liberation Mono", "Noto Sans Mono", "DejaVu Sans Mono", monospace`;
    case "impact":
      return `Impact, Haettenschweiler, "Arial Narrow Bold", "Arial Black", ${builtin}`;
    default:
      return builtin;
  }
}

export function fontString(s: Pick<WmSettings, "font" | "bold" | "italic">, px: number): string {
  return `${s.italic ? "italic " : ""}${s.bold ? 700 : 400} ${Math.max(1, px).toFixed(2)}px ${fontStack(s.font)}`;
}

function gridCell(p: Position): { col: number; row: number } | null {
  const i = GRID.indexOf(p as GridPos);
  return i < 0 ? null : { col: i % 3, row: Math.floor(i / 3) };
}

function isLight(hex: string): boolean {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h.padEnd(6, "0"), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 140;
}

export interface Sprite {
  canvas: HTMLCanvasElement;
  /** Block size without the shadow margin. */
  bw: number;
  bh: number;
}

/** Draw the watermark block (logo above text) once, at full opacity. */
export function buildSprite(s: WmSettings, W: number, logo: ImageBitmap | null): Sprite | null {
  const showText = s.mode !== "image" && s.text.trim().length > 0;
  const showLogo = s.mode !== "text" && !!logo;
  if (!showText && !showLogo) return null;

  const fontPx = (s.sizePct / 100) * W;
  const font = fontString(s, fontPx);
  const measure = makeCanvas(1, 1);
  const mctx = ctx2d(measure);
  mctx.font = font;
  const text = s.text.trim();
  const textW = showText ? mctx.measureText(text).width : 0;
  releaseCanvas(measure);

  const outlinePx = showText && s.outline ? (s.outlineWidth / 100) * fontPx : 0;
  const padX = showText && s.background ? fontPx * 0.45 : 0;
  const padY = showText && s.background ? fontPx * 0.22 : 0;
  const textBoxW = showText ? textW + padX * 2 + outlinePx * 2 : 0;
  const textBoxH = showText ? fontPx * 1.2 + padY * 2 + outlinePx * 2 : 0;
  const logoW = showLogo ? (s.logoPct / 100) * W : 0;
  const logoH = showLogo && logo ? (logoW * logo.height) / logo.width : 0;
  const gap = showText && showLogo ? fontPx * 0.35 : 0;
  const bw = Math.max(textBoxW, logoW);
  const bh = logoH + gap + textBoxH;
  if (bw < 1 || bh < 1) return null;

  const ref = showText ? fontPx : logoW * 0.12;
  const m = s.shadow ? Math.ceil(ref * 0.4) : 2;
  const cell = gridCell(s.position);
  const align: "left" | "center" | "right" =
    s.tile || !cell ? "center" : cell.col === 0 ? "left" : cell.col === 2 ? "right" : "center";

  const canvas = makeCanvas(bw + m * 2, bh + m * 2);
  const ctx = ctx2d(canvas);
  const shadowOn = () => {
    if (!s.shadow) return;
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = ref * 0.18;
    ctx.shadowOffsetY = ref * 0.05;
  };
  const shadowOff = () => {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
  };
  const xFor = (w: number) => (align === "left" ? m : align === "right" ? m + bw - w : m + (bw - w) / 2);

  if (showLogo && logo) {
    shadowOn();
    ctx.drawImage(logo, xFor(logoW), m, logoW, logoH);
    shadowOff();
  }

  if (showText) {
    const boxX = xFor(textBoxW);
    const boxY = m + logoH + gap;
    if (s.background) {
      ctx.fillStyle = isLight(s.color) ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.65)";
      ctx.beginPath();
      ctx.roundRect(boxX + outlinePx, boxY + outlinePx, textBoxW - outlinePx * 2, textBoxH - outlinePx * 2, fontPx * 0.28);
      ctx.fill();
    }
    ctx.font = font;
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    const tx = boxX + outlinePx + padX;
    const ty = boxY + textBoxH / 2;
    if (outlinePx > 0) {
      shadowOn();
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      ctx.lineWidth = outlinePx * 2;
      ctx.strokeStyle = s.outlineColor;
      ctx.strokeText(text, tx, ty);
      shadowOff();
      ctx.fillStyle = s.color;
      ctx.fillText(text, tx, ty);
    } else {
      shadowOn();
      ctx.fillStyle = s.color;
      ctx.fillText(text, tx, ty);
      shadowOff();
    }
  }
  return { canvas, bw, bh };
}

export interface Placement {
  cx: number;
  cy: number;
  /** Axis-aligned size of the rotated block. */
  rw: number;
  rh: number;
}

/** Where the (single) watermark sits: anchored by its own rotated corner + margin. */
export function placement(s: WmSettings, W: number, H: number, bw: number, bh: number): Placement {
  const th = (s.rotation * Math.PI) / 180;
  const c = Math.abs(Math.cos(th));
  const sn = Math.abs(Math.sin(th));
  const rw = bw * c + bh * sn;
  const rh = bw * sn + bh * c;
  const margin = (s.marginPct / 100) * Math.min(W, H);
  const cell = gridCell(s.position);
  if (!cell) return { cx: (s.customX / 100) * W, cy: (s.customY / 100) * H, rw, rh };
  const cx = cell.col === 0 ? margin + rw / 2 : cell.col === 2 ? W - margin - rw / 2 : W / 2;
  const cy = cell.row === 0 ? margin + rh / 2 : cell.row === 2 ? H - margin - rh / 2 : H / 2;
  return { cx, cy, rw, rh };
}

/** Draw the watermark onto a canvas already showing the photo. */
export function renderWatermark(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  s: WmSettings,
  logo: ImageBitmap | null,
): Placement | null {
  const sprite = buildSprite(s, W, logo);
  if (!sprite) return null;
  const { canvas, bw, bh } = sprite;
  const th = (s.rotation * Math.PI) / 180;
  ctx.save();
  ctx.globalAlpha = Math.max(0.05, Math.min(1, s.opacity / 100));
  let result: Placement | null = null;
  if (s.tile) {
    let stepX = bw * (1 + s.tileGap / 100);
    let stepY = bh * (1 + s.tileGap / 100) + bh * 0.5;
    const D = Math.hypot(W, H) / 2 + Math.max(canvas.width, canvas.height);
    // Keep the stamp count sane for tiny marks on huge photos.
    while (((2 * D) / stepX) * ((2 * D) / stepY) > 4000) {
      stepX *= 1.25;
      stepY *= 1.25;
    }
    ctx.translate(W / 2, H / 2);
    ctx.rotate(th);
    const nx = Math.ceil(D / stepX) + 1;
    const ny = Math.ceil(D / stepY) + 1;
    for (let j = -ny; j <= ny; j++) {
      const off = j % 2 === 0 ? 0 : stepX / 2;
      for (let i = -nx; i <= nx; i++) {
        ctx.drawImage(canvas, i * stepX + off - canvas.width / 2, j * stepY - canvas.height / 2);
      }
    }
  } else {
    result = placement(s, W, H, bw, bh);
    ctx.translate(result.cx, result.cy);
    ctx.rotate(th);
    ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  }
  ctx.restore();
  releaseCanvas(canvas);
  return result;
}
