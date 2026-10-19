/**
 * QR drawing shared by the preview, PNG export and SVG export. The module
 * matrix comes from `qrcode`; shapes are drawn here so dots, rounded modules
 * and rounded finder "eyes" look the same in PNG and SVG.
 */

export type ModuleShape = "square" | "rounded" | "dots";
export type EyeShape = "square" | "rounded";
export type Ecl = "L" | "M" | "Q" | "H";

export interface QrStyle {
  fg: string;
  bg: string;
  /** Transparent background (PNG/SVG); fg must then be dark enough on its own. */
  transparent: boolean;
  modules: ModuleShape;
  eyes: EyeShape;
  /** Quiet zone in modules. */
  margin: number;
}

export interface Matrix {
  size: number;
  get(r: number, c: number): boolean;
}

export async function makeMatrix(text: string, ecl: Ecl): Promise<Matrix> {
  const QRCode = (await import("qrcode")).default;
  const qr = QRCode.create(text, { errorCorrectionLevel: ecl });
  const { size, data } = qr.modules as unknown as { size: number; data: Uint8Array };
  return { size, get: (r, c) => data[r * size + c] === 1 };
}

/** Finder patterns (the three big corner squares) are drawn separately. */
function inEye(size: number, r: number, c: number): boolean {
  return (r < 7 && c < 7) || (r < 7 && c >= size - 7) || (r >= size - 7 && c < 7);
}

/** Logo hole in module units (centered square), or null. */
export function logoHole(size: number, logoRatio: number | null): { from: number; to: number } | null {
  if (!logoRatio) return null;
  const n = Math.ceil(size * logoRatio) | 1;
  const from = Math.floor((size - n) / 2);
  return { from, to: from + n };
}

function holeHas(hole: { from: number; to: number } | null, r: number, c: number): boolean {
  return !!hole && r >= hole.from && r < hole.to && c >= hole.from && c < hole.to;
}

/** Draw the code (and optional logo) onto a square canvas of `px` pixels. */
export function drawQr(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  m: Matrix,
  style: QrStyle,
  px: number,
  logo: { image: CanvasImageSource; ratio: number; w: number; h: number } | null,
): void {
  const total = m.size + style.margin * 2;
  const u = px / total;
  ctx.clearRect(0, 0, px, px);
  if (!style.transparent) {
    ctx.fillStyle = style.bg;
    ctx.fillRect(0, 0, px, px);
  }
  ctx.fillStyle = style.fg;
  const hole = logoHole(m.size, logo?.ratio ?? null);
  const o = style.margin * u;
  for (let r = 0; r < m.size; r++) {
    for (let c = 0; c < m.size; c++) {
      if (!m.get(r, c) || inEye(m.size, r, c) || holeHas(hole, r, c)) continue;
      const x = o + c * u;
      const y = o + r * u;
      if (style.modules === "dots") {
        ctx.beginPath();
        ctx.arc(x + u / 2, y + u / 2, u * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (style.modules === "rounded") {
        ctx.beginPath();
        ctx.roundRect(x, y, u + 0.5, u + 0.5, u * 0.35);
        ctx.fill();
      } else {
        // Slight overdraw avoids hairline seams between modules.
        ctx.fillRect(x, y, u + 0.5, u + 0.5);
      }
    }
  }
  for (const [er, ec] of [
    [0, 0],
    [0, m.size - 7],
    [m.size - 7, 0],
  ] as const) {
    const x = o + ec * u;
    const y = o + er * u;
    const rr = style.eyes === "rounded";
    ctx.beginPath();
    ctx.roundRect(x, y, 7 * u, 7 * u, rr ? 2.2 * u : 0);
    ctx.roundRect(x + u, y + u, 5 * u, 5 * u, rr ? 1.5 * u : 0);
    ctx.fill("evenodd");
    ctx.beginPath();
    ctx.roundRect(x + 2 * u, y + 2 * u, 3 * u, 3 * u, rr ? 1 * u : 0);
    ctx.fill();
  }
  if (logo && hole) {
    const side = (hole.to - hole.from) * u;
    const hx = o + hole.from * u;
    const pad = u * 0.6;
    const fit = Math.min((side - pad * 2) / logo.w, (side - pad * 2) / logo.h);
    const w = logo.w * fit;
    const h = logo.h * fit;
    if (!style.transparent) {
      ctx.fillStyle = style.bg;
      ctx.beginPath();
      ctx.roundRect(hx, hx, side, side, u * 1.2);
      ctx.fill();
    }
    ctx.drawImage(logo.image, hx + (side - w) / 2, hx + (side - h) / 2, w, h);
  }
}

const f = (n: number) => Math.round(n * 100) / 100;

/** Same drawing as SVG markup (vector, any size). */
export function qrSvg(m: Matrix, style: QrStyle, px: number, logo: { dataUrl: string; ratio: number; w: number; h: number } | null): string {
  const total = m.size + style.margin * 2;
  const o = style.margin;
  const hole = logoHole(m.size, logo?.ratio ?? null);
  const parts: string[] = [];
  let path = "";
  for (let r = 0; r < m.size; r++) {
    for (let c = 0; c < m.size; c++) {
      if (!m.get(r, c) || inEye(m.size, r, c) || holeHas(hole, r, c)) continue;
      const x = o + c;
      const y = o + r;
      if (style.modules === "dots") parts.push(`<circle cx="${x + 0.5}" cy="${y + 0.5}" r="0.5"/>`);
      else if (style.modules === "rounded") parts.push(`<rect x="${x}" y="${y}" width="1" height="1" rx="0.35"/>`);
      else path += `M${x} ${y}h1v1h-1z`;
    }
  }
  const eyes: string[] = [];
  for (const [er, ec] of [
    [0, 0],
    [0, m.size - 7],
    [m.size - 7, 0],
  ] as const) {
    const x = o + ec;
    const y = o + er;
    const rr = style.eyes === "rounded";
    eyes.push(
      `<path fill-rule="evenodd" d="${roundRectPath(x, y, 7, 7, rr ? 2.2 : 0)}${roundRectPath(x + 1, y + 1, 5, 5, rr ? 1.5 : 0)}"/>`,
      `<rect x="${x + 2}" y="${y + 2}" width="3" height="3" rx="${rr ? 1 : 0}"/>`,
    );
  }
  let logoSvg = "";
  if (logo && hole) {
    const side = hole.to - hole.from;
    const pad = 0.6;
    const fit = Math.min((side - pad * 2) / logo.w, (side - pad * 2) / logo.h);
    const w = logo.w * fit;
    const h = logo.h * fit;
    const hx = o + hole.from;
    if (!style.transparent) logoSvg += `<rect x="${hx}" y="${hx}" width="${side}" height="${side}" rx="1.2" fill="${style.bg}"/>`;
    logoSvg += `<image x="${f(hx + (side - w) / 2)}" y="${f(hx + (side - h) / 2)}" width="${f(w)}" height="${f(h)}" href="${logo.dataUrl}"/>`;
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${px}" height="${px}" shape-rendering="${style.modules === "square" ? "crispEdges" : "geometricPrecision"}">` +
    (style.transparent ? "" : `<rect width="${total}" height="${total}" fill="${style.bg}"/>`) +
    `<g fill="${style.fg}">${path ? `<path d="${path}"/>` : ""}${parts.join("")}${eyes.join("")}</g>${logoSvg}</svg>`
  );
}

function roundRectPath(x: number, y: number, w: number, h: number, r: number): string {
  if (!r) return `M${x} ${y}h${w}v${h}h${-w}z`;
  return `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`;
}

function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h.slice(0, 6), 16);
  if (Number.isNaN(n)) return 0;
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}

/** WCAG contrast ratio between two hex colours. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function isDarker(a: string, b: string): boolean {
  return luminance(a) < luminance(b);
}

export function validHex(v: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
}
