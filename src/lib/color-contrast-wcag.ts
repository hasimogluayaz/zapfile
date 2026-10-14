/** WCAG 2.x relative luminance & contrast (sRGB, 8-bit hex). */

export function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const h = hex.trim().replace(/^#/, "");
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return { r, g, b };
  }
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return { r, g, b };
  }
  return null;
}

function channelLuminance(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(r: number, g: number, b: number): number {
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

export function contrastRatio(hex1: string, hex2: string): number | null {
  const a = parseHex(hex1);
  const b = parseHex(hex2);
  if (!a || !b) return null;
  const l1 = relativeLuminance(a.r, a.g, a.b);
  const l2 = relativeLuminance(b.r, b.g, b.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export interface WcagChecks {
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
}

export function wcagChecks(ratio: number): WcagChecks {
  return {
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  };
}

// ── Any CSS colour, alpha blending and fix suggestions ─────────────────────

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** Parse any CSS colour (hex with alpha, rgb(), hsl(), names…) via the browser's own parser. */
export function parseCssColor(input: string): RGBA | null {
  const s = input.trim();
  if (!s) return null;
  const hex = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(s);
  if (hex) {
    let h = hex[1]!;
    if (h.length <= 4) h = h.replace(/./g, "$&$&");
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
    };
  }
  if (typeof document === "undefined" || typeof CSS === "undefined" || !CSS.supports("color", s)) return null;
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#000";
  ctx.fillStyle = s;
  const v = String(ctx.fillStyle);
  const m = /^#([0-9a-f]{6})$/i.exec(v);
  if (m) return { r: parseInt(m[1]!.slice(0, 2), 16), g: parseInt(m[1]!.slice(2, 4), 16), b: parseInt(m[1]!.slice(4, 6), 16), a: 1 };
  const rgba = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(v);
  return rgba ? { r: +rgba[1]!, g: +rgba[2]!, b: +rgba[3]!, a: rgba[4] !== undefined ? +rgba[4] : 1 } : null;
}

/** Composite a translucent colour over an opaque background. */
export function blend(fg: RGBA, bg: RGBA): RGBA {
  const a = fg.a;
  return { r: fg.r * a + bg.r * (1 - a), g: fg.g * a + bg.g * (1 - a), b: fg.b * a + bg.b * (1 - a), a: 1 };
}

export function ratioOf(a: RGBA, b: RGBA): number {
  const l1 = relativeLuminance(a.r, a.g, a.b);
  const l2 = relativeLuminance(b.r, b.g, b.b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function toHex(c: RGBA): string {
  return "#" + [c.r, c.g, c.b].map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
}

function rgbToHsl({ r, g, b }: RGBA): [number, number, number] {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb(h: number, s: number, l: number): RGBA {
  const f = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255, a: 1 };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return { r: f(p, q, h + 1 / 3) * 255, g: f(p, q, h) * 255, b: f(p, q, h - 1 / 3) * 255, a: 1 };
}

/**
 * The closest colour (same hue and saturation, lightness moved as little as possible)
 * that reaches `target` against `other`. Null when no lightness gets there.
 */
export function nearestPassing(color: RGBA, other: RGBA, target: number): string | null {
  const [h, s, l0] = rgbToHsl(color);
  let best: { l: number; d: number } | null = null;
  for (const dir of [-1, 1]) {
    // Binary search the lightness boundary in this direction.
    const end = dir < 0 ? 0 : 1;
    const at = (l: number) => ratioOf(hslToRgb(h, s, l), other);
    if (at(end) < target) continue;
    let lo = l0, hi = end;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (at(mid) >= target) hi = mid;
      else lo = mid;
    }
    const d = Math.abs(hi - l0);
    if (!best || d < best.d) best = { l: hi, d };
  }
  if (!best) return null;
  // Round to hex and nudge until the rounded colour still passes.
  let l = best.l;
  for (let i = 0; i < 20; i++) {
    const c = hslToRgb(h, s, l);
    const hex = toHex(c);
    if (ratioOf(parseCssColor(hex)!, other) >= target) return hex;
    l += l < l0 ? -0.002 : 0.002;
  }
  return null;
}
