/**
 * Meme drawing shared by the live preview and the export, so what you see is exactly what you get.
 * Every size is a fraction of the image width; the preview just draws at a smaller width.
 */

export type MemeFont = "meme" | "sans" | "serif";
export type MemeStyle = "classic" | "plain" | "label" | "shadow";

export interface Layer {
  id: string;
  text: string;
  /** Centre of the text block, 0–1 of the image. */
  x: number;
  y: number;
  /** Font size as a fraction of the image width. */
  size: number;
  /** Wrap width as a fraction of the image width. */
  width: number;
  rotation: number;
  align: "left" | "center" | "right";
  font: MemeFont;
  style: MemeStyle;
  color: string;
  /** Outline (classic), box (label) colour. */
  accent: string;
  upper: boolean;
}

export interface Band {
  on: boolean;
  text: string;
  /** Font size as a fraction of the image width. */
  size: number;
}

export interface MemeState {
  layers: Layer[];
  band: Band;
}

export interface LayerBox {
  id: string;
  cx: number;
  cy: number;
  w: number;
  h: number;
  rot: number;
}

export const MEME_FAMILY = "ZapMeme";

export function fontStack(font: MemeFont, builtin: string): string {
  switch (font) {
    case "meme":
      return `"${MEME_FAMILY}", Impact, "Arial Black", ${builtin}`;
    case "serif":
      return `Georgia, "Times New Roman", "Noto Serif", serif`;
    default:
      return builtin;
  }
}

function fontCss(font: MemeFont, px: number, builtin: string): string {
  const weight = font === "meme" ? 400 : 700;
  return `${weight} ${Math.max(1, px).toFixed(2)}px ${fontStack(font, builtin)}`;
}

const LINE_HEIGHT: Record<MemeFont, number> = { meme: 1.12, sans: 1.2, serif: 1.2 };

/** Greedy word wrap; breaks words that are wider than the line on their own. */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of text.split(/\r?\n/)) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) {
      out.push("");
      continue;
    }
    let line = "";
    for (let word of words) {
      // Hard-break a single overlong word.
      while (ctx.measureText(word).width > maxWidth && word.length > 1) {
        let cut = word.length - 1;
        while (cut > 1 && ctx.measureText(word.slice(0, cut)).width > maxWidth) cut--;
        if (line) {
          out.push(line);
          line = "";
        }
        out.push(word.slice(0, cut));
        word = word.slice(cut);
      }
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > maxWidth) {
        out.push(line);
        line = word;
      } else line = next;
    }
    out.push(line);
  }
  return out;
}

export function displayText(l: Pick<Layer, "text" | "upper">, locale: string): string {
  return l.upper ? l.text.toLocaleUpperCase(locale) : l.text;
}

/** Height of the caption band above the image, in px for an image `W` wide. */
export function bandHeight(ctx: CanvasRenderingContext2D, band: Band, W: number, builtin: string): number {
  if (!band.on) return 0;
  const px = band.size * W;
  ctx.font = fontCss("sans", px, builtin);
  const lines = wrapText(ctx, band.text || " ", W * 0.92);
  return Math.round(lines.length * px * 1.25 + px * 1.3);
}

interface DrawOpts {
  builtin: string;
  locale: string;
}

/**
 * Draw the meme with the image `W`×`H` at (0, band). Returns each layer's box (for hit testing).
 * The canvas must already be sized to W × (band + H).
 */
export function drawMeme(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  W: number,
  H: number,
  state: MemeState,
  opts: DrawOpts,
): { band: number; boxes: LayerBox[] } {
  const band = bandHeight(ctx, state.band, W, opts.builtin);
  if (band) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, band);
    const px = state.band.size * W;
    ctx.font = fontCss("sans", px, opts.builtin);
    ctx.fillStyle = "#0f1115";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const lines = wrapText(ctx, state.band.text || " ", W * 0.92);
    lines.forEach((line, i) => ctx.fillText(line, W * 0.04, px * 0.65 + px * 1.25 * i + px * 0.95));
  }
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, band, W, H);

  const boxes: LayerBox[] = [];
  for (const l of state.layers) {
    const text = displayText(l, opts.locale);
    let px = l.size * W;
    const maxW = Math.max(px, l.width * W);
    ctx.font = fontCss(l.font, px, opts.builtin);
    let lines = wrapText(ctx, text || " ", maxW);
    // Keep long single words inside the box by shrinking rather than breaking them mid-word when possible.
    const longest = Math.max(...text.split(/\s+/).map((w) => ctx.measureText(w).width), 0);
    if (longest > maxW && longest > 0) {
      px *= maxW / longest;
      ctx.font = fontCss(l.font, px, opts.builtin);
      lines = wrapText(ctx, text || " ", maxW);
    }
    const lh = px * LINE_HEIGHT[l.font];
    const widths = lines.map((s) => ctx.measureText(s).width);
    const blockW = Math.max(px * 0.5, ...widths);
    const blockH = lh * lines.length;
    const pad = l.style === "label" ? px * 0.35 : px * 0.12;
    const bw = blockW + pad * 2, bh = blockH + pad * 2;
    // Keep the block inside the image, so text that wraps onto more lines grows inwards.
    const m = W * 0.015;
    const inside = (v: number, size: number, lo: number, span: number) =>
      size + 2 * m >= span ? lo + span / 2 : Math.min(lo + span - m - size / 2, Math.max(lo + m + size / 2, v));
    const cx = inside(l.x * W, bw, 0, W), cy = inside(band + l.y * H, bh, band, H);
    boxes.push({ id: l.id, cx, cy, w: bw, h: bh, rot: l.rotation });

    if (!text.trim()) continue;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((l.rotation * Math.PI) / 180);
    ctx.textBaseline = "middle";
    ctx.textAlign = l.align;
    const ax = l.align === "left" ? -blockW / 2 : l.align === "right" ? blockW / 2 : 0;

    if (l.style === "label") {
      ctx.fillStyle = l.accent;
      ctx.beginPath();
      const r = px * 0.22;
      if (typeof ctx.roundRect === "function") ctx.roundRect(-blockW / 2 - pad, -blockH / 2 - pad, blockW + pad * 2, blockH + pad * 2, r);
      else ctx.rect(-blockW / 2 - pad, -blockH / 2 - pad, blockW + pad * 2, blockH + pad * 2);
      ctx.fill();
    }
    lines.forEach((line, i) => {
      const y = -blockH / 2 + lh * (i + 0.5);
      if (l.style === "classic") {
        ctx.lineJoin = "round";
        ctx.miterLimit = 2;
        ctx.lineWidth = px * 0.16;
        ctx.strokeStyle = l.accent;
        ctx.strokeText(line, ax, y);
      }
      if (l.style === "shadow") {
        ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
        ctx.shadowBlur = px * 0.3;
        ctx.shadowOffsetY = px * 0.05;
      }
      ctx.fillStyle = l.color;
      ctx.fillText(line, ax, y);
      ctx.shadowColor = "transparent";
    });
    ctx.restore();
  }
  return { band, boxes };
}

/** Point (x, y) in a box's local, unrotated coordinates. */
export function toLocal(b: LayerBox, x: number, y: number): { x: number; y: number } {
  const a = (-b.rot * Math.PI) / 180;
  const dx = x - b.cx, dy = y - b.cy;
  return { x: dx * Math.cos(a) - dy * Math.sin(a), y: dx * Math.sin(a) + dy * Math.cos(a) };
}

export function hitBox(b: LayerBox, x: number, y: number, slack = 0): boolean {
  const p = toLocal(b, x, y);
  return Math.abs(p.x) <= b.w / 2 + slack && Math.abs(p.y) <= b.h / 2 + slack;
}

/** Bottom-right corner of a box in canvas coordinates (the resize handle). */
export function handlePoint(b: LayerBox): { x: number; y: number } {
  const a = (b.rot * Math.PI) / 180;
  const lx = b.w / 2, ly = b.h / 2;
  return { x: b.cx + lx * Math.cos(a) - ly * Math.sin(a), y: b.cy + lx * Math.sin(a) + ly * Math.cos(a) };
}
