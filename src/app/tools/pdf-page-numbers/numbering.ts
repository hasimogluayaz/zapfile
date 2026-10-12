/**
 * Page-number layout shared by the live preview (main thread) and the
 * worker that writes the PDF, so what you see is exactly what you get.
 *
 * Coordinates: placement is computed in the page's *visible* frame (the
 * CropBox as a viewer shows it, after /Rotate), origin bottom-left, y up,
 * in PDF points. `toUserSpace` maps it back into the page's user space and
 * gives the angle the text must be drawn at so it reads upright.
 */

export type HAlign = "left" | "center" | "right";
export type VAlign = "top" | "bottom";
export type FontId = "Helvetica" | "TimesRoman" | "Courier";

export interface NumberingOptions {
  /** Label template; {n} = page number, {total} = total. */
  template: string;
  /** Number printed on the first numbered page. */
  startNumber: number;
  /** 1-based, inclusive. */
  firstPage: number;
  lastPage: number;
  /** null = automatic (the number the document's last page would carry). */
  totalOverride: number | null;
  digits: number;
  font: FontId;
  /** Points. */
  size: number;
  /** #rrggbb */
  color: string;
  /** 0..1 */
  opacity: number;
  h: HAlign;
  v: VAlign;
  /** Swap left/right on even pages (facing pages). */
  mirror: boolean;
  /** Points from the visible page edge to the label box. */
  marginX: number;
  marginY: number;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** CSS font stacks used for the preview and for glyphs the PDF standard fonts lack. */
export const CSS_FONT: Record<FontId, string> = {
  Helvetica: 'Helvetica, Arial, "Liberation Sans", "Noto Sans", system-ui, sans-serif',
  TimesRoman: '"Times New Roman", Times, "Liberation Serif", "Noto Serif", serif',
  Courier: '"Courier New", Courier, "Liberation Mono", "Noto Sans Mono", monospace',
};

/** Raster resolution for non-Latin glyphs: 4x = 288 dpi. */
export const RASTER_SCALE = 4;

export function formatNumber(n: number, digits: number): string {
  const body = String(Math.abs(Math.trunc(n))).padStart(Math.max(1, digits), "0");
  return n < 0 ? `-${body}` : body;
}

export function autoTotal(opts: Pick<NumberingOptions, "startNumber" | "firstPage">, pageCount: number): number {
  return opts.startNumber + (pageCount - opts.firstPage);
}

export function labelFor(opts: NumberingOptions, pageNumber: number, pageCount: number): string {
  const n = opts.startNumber + (pageNumber - opts.firstPage);
  const total = opts.totalOverride ?? autoTotal(opts, pageCount);
  return opts.template
    .split("{n}")
    .join(formatNumber(n, opts.digits))
    .split("{total}")
    .join(formatNumber(total, opts.digits));
}

export function isNumbered(opts: NumberingOptions, pageNumber: number): boolean {
  return pageNumber >= opts.firstPage && pageNumber <= opts.lastPage;
}

export interface LabelPiece {
  text: string;
  /** Drawn as an image because the standard font can't encode it. */
  raster: boolean;
  width: number;
  ascent: number;
  descent: number;
}

export interface Measurer {
  /** Code points the standard font can encode (WinAnsi). */
  charset: Set<number>;
  vector(text: string, size: number): { width: number; ascent: number; descent: number };
  raster(text: string, size: number): { width: number; ascent: number; descent: number };
}

/** Split a label into runs the standard font can draw and runs that need rasterising. */
export function splitLabel(label: string, charset: Set<number>): { text: string; raster: boolean }[] {
  const out: { text: string; raster: boolean }[] = [];
  for (const ch of label) {
    const raster = !charset.has(ch.codePointAt(0)!);
    const last = out[out.length - 1];
    if (last && last.raster === raster) last.text += ch;
    else out.push({ text: ch, raster });
  }
  return out;
}

export function measureLabel(label: string, size: number, m: Measurer): LabelPiece[] {
  return splitLabel(label, m.charset).map((part) => ({
    ...part,
    ...(part.raster ? m.raster(part.text, size) : m.vector(part.text, size)),
  }));
}

export function needsRaster(label: string, charset: Set<number>): boolean {
  for (const ch of label) if (!charset.has(ch.codePointAt(0)!)) return true;
  return false;
}

export interface Placement {
  /** Left edge of the label, visible frame. */
  x: number;
  /** Baseline, visible frame. */
  baseline: number;
  width: number;
  ascent: number;
  descent: number;
  h: HAlign;
}

export function placeLabel(
  pieces: LabelPiece[],
  visibleWidth: number,
  visibleHeight: number,
  opts: Pick<NumberingOptions, "h" | "v" | "mirror" | "marginX" | "marginY">,
  pageNumber: number,
): Placement {
  const width = pieces.reduce((s, p) => s + p.width, 0);
  const ascent = Math.max(0, ...pieces.map((p) => p.ascent));
  const descent = Math.max(0, ...pieces.map((p) => p.descent));
  let h = opts.h;
  if (opts.mirror && pageNumber % 2 === 0 && h !== "center") h = h === "left" ? "right" : "left";
  const x =
    h === "left" ? opts.marginX : h === "center" ? (visibleWidth - width) / 2 : visibleWidth - width - opts.marginX;
  const baseline = opts.v === "bottom" ? opts.marginY + descent : visibleHeight - opts.marginY - ascent;
  return { x, baseline, width, ascent, descent, h };
}

export function normalizeRotation(angle: number): 0 | 90 | 180 | 270 {
  const r = ((Math.round(angle / 90) * 90) % 360 + 360) % 360;
  return r as 0 | 90 | 180 | 270;
}

export function visibleSize(box: Box, rotation: 0 | 90 | 180 | 270) {
  return rotation === 90 || rotation === 270
    ? { width: box.height, height: box.width }
    : { width: box.width, height: box.height };
}

/** Map a point of the visible frame to user space; `angle` is the text rotation (degrees, CCW). */
export function toUserSpace(vx: number, vy: number, box: Box, rotation: 0 | 90 | 180 | 270) {
  switch (rotation) {
    case 90:
      return { x: box.x + box.width - vy, y: box.y + vx, angle: 90 };
    case 180:
      return { x: box.x + box.width - vx, y: box.y + box.height - vy, angle: 180 };
    case 270:
      return { x: box.x + vy, y: box.y + box.height - vx, angle: 270 };
    default:
      return { x: box.x + vx, y: box.y + vy, angle: 0 };
  }
}

export function hexToRgb01(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean.padEnd(6, "0").slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return [0.4, 0.4, 0.4];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

/** Canvas metrics for text in the given CSS font, in points. */
export function canvasMetrics(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  text: string,
  size: number,
  font: FontId,
) {
  ctx.font = `${size * RASTER_SCALE}px ${CSS_FONT[font]}`;
  const m = ctx.measureText(text);
  const ascent = (m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent ?? size * RASTER_SCALE * 0.8) / RASTER_SCALE;
  const descent = (m.fontBoundingBoxDescent ?? m.actualBoundingBoxDescent ?? size * RASTER_SCALE * 0.2) / RASTER_SCALE;
  return { width: m.width / RASTER_SCALE, ascent, descent };
}

// ─── Worker protocol ────────────────────────────────────────────

export type NumberingRequest = { bytes: ArrayBuffer; options: NumberingOptions };

export type NumberingResponse =
  | { type: "progress"; done: number; total: number }
  | { type: "done"; bytes: ArrayBuffer }
  | { type: "error"; code: "unicode" | "invalid" | "generic"; message: string };
