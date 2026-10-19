/** Colour maths for the picker: HSV state, CSS formats, OKLCH, scales, names. Pure, no DOM except `parseAnyColor`. */

import { parseCssColor, relativeLuminance, type RGBA } from "@/lib/color-contrast-wcag";

export type { RGBA };

/** Picker state. Hue and saturation survive greys and black, which RGB would lose. */
export interface HSVA {
  h: number; // 0–360
  s: number; // 0–1
  v: number; // 0–1
  a: number; // 0–1
}

const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));
const r1 = (x: number, d = 0) => {
  const k = 10 ** d;
  return Math.round(x * k) / k;
};

export function hsvToRgb({ h, s, v, a }: HSVA): RGBA {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return { r: Math.round(f(5) * 255), g: Math.round(f(3) * 255), b: Math.round(f(1) * 255), a };
}

export function rgbToHsv({ r, g, b, a }: RGBA, keepHue = 0): HSVA {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min;
  let h = keepHue;
  if (d > 0) {
    h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max, a };
}

export function rgbToHsl({ r, g, b }: RGBA): [number, number, number] {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B), l = (max + min) / 2, d = max - min;
  if (d === 0) return [0, 0, l * 100];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [h * 60, s * 100, l * 100];
}

export function hslToRgb(h: number, s: number, l: number, a = 1): RGBA {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const q = s * Math.min(l, 1 - l);
  const f = (n: number) => l - q * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return { r: Math.round(f(0) * 255), g: Math.round(f(8) * 255), b: Math.round(f(4) * 255), a };
}

// ── OKLab / OKLCH (Björn Ottosson) ─────────────────────────────────────────

const toLin = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const fromLin = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function rgbToOklab({ r, g, b }: RGBA): [number, number, number] {
  const R = toLin(r), G = toLin(g), B = toLin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/** Linear-light sRGB, unclamped (so callers can test the gamut). */
function oklabToLinear(L: number, A: number, B: number): [number, number, number] {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function rgbToOklch(c: RGBA): [number, number, number] {
  const [L, a, b] = rgbToOklab(c);
  const C = Math.hypot(a, b);
  const h = C < 1e-4 ? 0 : (Math.atan2(b, a) * 180) / Math.PI;
  return [L, C, (h + 360) % 360];
}

/** OKLCH → sRGB, reducing chroma until the colour fits the sRGB gamut. */
export function oklchToRgb(L: number, C: number, h: number, a = 1): RGBA {
  const rad = (h * Math.PI) / 180;
  const inGamut = (c: number) => oklabToLinear(L, c * Math.cos(rad), c * Math.sin(rad)).every((x) => x >= -1e-4 && x <= 1 + 1e-4);
  let c = C;
  if (!inGamut(c)) {
    let lo = 0, hi = C;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(mid)) lo = mid;
      else hi = mid;
    }
    c = lo;
  }
  const [R, G, B] = oklabToLinear(L, c * Math.cos(rad), c * Math.sin(rad));
  return { r: Math.round(clamp(fromLin(R), 0, 255)), g: Math.round(clamp(fromLin(G), 0, 255)), b: Math.round(clamp(fromLin(B), 0, 255)), a };
}

// ── Formats ────────────────────────────────────────────────────────────────

const hex2 = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0");

export function toHex(c: RGBA, withAlpha = c.a < 1): string {
  return ("#" + hex2(c.r) + hex2(c.g) + hex2(c.b) + (withAlpha ? hex2(c.a * 255) : "")).toUpperCase();
}

const alphaPart = (a: number) => (a < 1 ? ` / ${r1(a * 100)}%` : "");

export type FormatId = "hex" | "rgb" | "hsl" | "hwb" | "oklch" | "cmyk";

export function formatColor(c: RGBA, id: FormatId): string {
  switch (id) {
    case "hex":
      return toHex(c);
    case "rgb":
      return `rgb(${c.r} ${c.g} ${c.b}${alphaPart(c.a)})`;
    case "hsl": {
      const [h, s, l] = rgbToHsl(c);
      return `hsl(${r1(h)} ${r1(s)}% ${r1(l)}%${alphaPart(c.a)})`;
    }
    case "hwb": {
      const [h] = rgbToHsl(c);
      const w = Math.min(c.r, c.g, c.b) / 2.55, bl = 100 - Math.max(c.r, c.g, c.b) / 2.55;
      return `hwb(${r1(h)} ${r1(w)}% ${r1(bl)}%${alphaPart(c.a)})`;
    }
    case "oklch": {
      const [L, C, h] = rgbToOklch(c);
      return `oklch(${r1(L * 100, 1)}% ${r1(C, 3)} ${r1(h, 1)}${alphaPart(c.a)})`;
    }
    case "cmyk": {
      const R = c.r / 255, G = c.g / 255, B = c.b / 255, k = 1 - Math.max(R, G, B);
      const f = (x: number) => (k >= 1 ? 0 : r1(((1 - x - k) / (1 - k)) * 100));
      return `cmyk(${f(R)}% ${f(G)}% ${f(B)}% ${r1(k * 100)}%)`;
    }
  }
}

/** Accepts every CSS colour syntax the browser understands (oklch, lab, color(), names…), plus bare hex. */
export function parseAnyColor(input: string): RGBA | null {
  const s = input.trim().replace(/;$/, "").replace(/^(?:color|background(?:-color)?)\s*:\s*/i, "");
  if (!s) return null;
  const cmyk = /^cmyk\(\s*([\d.]+)%?[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?[\s,]+([\d.]+)%?\s*\)$/i.exec(s);
  if (cmyk) {
    const [c, m, y, k] = cmyk.slice(1).map((x) => clamp(+x / 100));
    return { r: Math.round(255 * (1 - c!) * (1 - k!)), g: Math.round(255 * (1 - m!) * (1 - k!)), b: Math.round(255 * (1 - y!) * (1 - k!)), a: 1 };
  }
  const direct = parseCssColor(s);
  if (direct) return { ...direct, r: Math.round(direct.r), g: Math.round(direct.g), b: Math.round(direct.b) };
  // Newer syntaxes serialise to themselves in canvas fillStyle; read the painted pixel instead.
  if (typeof document === "undefined" || typeof CSS === "undefined" || !CSS.supports("color", s)) return null;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = s;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return a === 0 ? { r: 0, g: 0, b: 0, a: 0 } : { r: r!, g: g!, b: b!, a: r1(a! / 255, 3) };
}

// ── Derived colours ────────────────────────────────────────────────────────

export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
const SCALE_L = [0.975, 0.94, 0.885, 0.81, 0.72, 0.635, 0.55, 0.475, 0.4, 0.34, 0.255];
const SCALE_C = [0.12, 0.28, 0.5, 0.75, 0.93, 1, 0.97, 0.88, 0.76, 0.64, 0.48];

/** A Tailwind-style 50–950 ramp in OKLCH with the colour's hue; `nearest` is the step closest to the colour itself. */
export function tonalScale(c: RGBA): { steps: { step: number; hex: string }[]; nearest: number } {
  const [L, C, h] = rgbToOklch(c);
  // Chroma relative to a mid-tone so the ramp keeps the colour's saturation without blowing out.
  const peak = C / Math.max(0.2, SCALE_C[SCALE_L.reduce((bi, l, i) => (Math.abs(l - L) < Math.abs(SCALE_L[bi]! - L) ? i : bi), 0)]!);
  const steps = SCALE_STEPS.map((step, i) => ({ step, hex: toHex(oklchToRgb(SCALE_L[i]!, peak * SCALE_C[i]!, h), false) }));
  let nearest = 0;
  SCALE_L.forEach((l, i) => {
    if (Math.abs(l - L) < Math.abs(SCALE_L[nearest]! - L)) nearest = i;
  });
  // Anchor the ramp on the exact colour so it can be used as-is.
  steps[nearest]!.hex = toHex(c, false);
  return { steps, nearest };
}

export type Harmony = "complementary" | "analogous" | "triadic" | "split" | "tetradic" | "mono";
export const HARMONIES: Harmony[] = ["complementary", "analogous", "triadic", "split", "tetradic", "mono"];

/** Classic colour-wheel harmonies (HSL hue rotation); monochrome spreads OKLCH lightness at the same hue. */
export function harmony(c: RGBA, kind: Harmony): string[] {
  if (kind === "mono") {
    const [L, C, h] = rgbToOklch(c);
    const levels = [0.3, 0.46, 0.62, 0.78, 0.94];
    const skip = levels.reduce((bi, l, i) => (Math.abs(l - L) < Math.abs(levels[bi]! - L) ? i : bi), 0);
    return levels.filter((_, i) => i !== skip).map((l) => toHex(oklchToRgb(l, C, h), false));
  }
  const offsets: Record<Exclude<Harmony, "mono">, number[]> = {
    complementary: [180],
    analogous: [-30, 30],
    triadic: [120, 240],
    split: [150, 210],
    tetradic: [90, 180, 270],
  };
  const [h, s, l] = rgbToHsl(c);
  return offsets[kind].map((o) => toHex(hslToRgb((h + o + 360) % 360, s, l), false));
}

export function luminance(c: RGBA): number {
  return relativeLuminance(c.r, c.g, c.b);
}

/** Composite over white or black for contrast checks of translucent colours. */
export function over(c: RGBA, bg: 0 | 255): RGBA {
  return { r: c.r * c.a + bg * (1 - c.a), g: c.g * c.a + bg * (1 - c.a), b: c.b * c.a + bg * (1 - c.a), a: 1 };
}

export function contrastWith(c: RGBA, bg: 0 | 255): number {
  const a = luminance(over(c, bg));
  const b = bg === 255 ? 1 : 0;
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function readableInk(c: RGBA): "#16181D" | "#FFFFFF" {
  return contrastWith(c, 0) >= contrastWith(c, 255) ? "#16181D" : "#FFFFFF";
}

// ── CSS named colours ──────────────────────────────────────────────────────

const NAMED =
  "aliceblue:f0f8ff antiquewhite:faebd7 aqua:00ffff aquamarine:7fffd4 azure:f0ffff beige:f5f5dc bisque:ffe4c4 black:000000 blanchedalmond:ffebcd blue:0000ff blueviolet:8a2be2 brown:a52a2a burlywood:deb887 cadetblue:5f9ea0 chartreuse:7fff00 chocolate:d2691e coral:ff7f50 cornflowerblue:6495ed cornsilk:fff8dc crimson:dc143c darkblue:00008b darkcyan:008b8b darkgoldenrod:b8860b darkgray:a9a9a9 darkgreen:006400 darkkhaki:bdb76b darkmagenta:8b008b darkolivegreen:556b2f darkorange:ff8c00 darkorchid:9932cc darkred:8b0000 darksalmon:e9967a darkseagreen:8fbc8f darkslateblue:483d8b darkslategray:2f4f4f darkturquoise:00ced1 darkviolet:9400d3 deeppink:ff1493 deepskyblue:00bfff dimgray:696969 dodgerblue:1e90ff firebrick:b22222 floralwhite:fffaf0 forestgreen:228b22 fuchsia:ff00ff gainsboro:dcdcdc ghostwhite:f8f8ff gold:ffd700 goldenrod:daa520 gray:808080 green:008000 greenyellow:adff2f honeydew:f0fff0 hotpink:ff69b4 indianred:cd5c5c indigo:4b0082 ivory:fffff0 khaki:f0e68c lavender:e6e6fa lavenderblush:fff0f5 lawngreen:7cfc00 lemonchiffon:fffacd lightblue:add8e6 lightcoral:f08080 lightcyan:e0ffff lightgoldenrodyellow:fafad2 lightgray:d3d3d3 lightgreen:90ee90 lightpink:ffb6c1 lightsalmon:ffa07a lightseagreen:20b2aa lightskyblue:87cefa lightslategray:778899 lightsteelblue:b0c4de lightyellow:ffffe0 lime:00ff00 limegreen:32cd32 linen:faf0e6 maroon:800000 mediumaquamarine:66cdaa mediumblue:0000cd mediumorchid:ba55d3 mediumpurple:9370db mediumseagreen:3cb371 mediumslateblue:7b68ee mediumspringgreen:00fa9a mediumturquoise:48d1cc mediumvioletred:c71585 midnightblue:191970 mintcream:f5fffa mistyrose:ffe4e1 moccasin:ffe4b5 navajowhite:ffdead navy:000080 oldlace:fdf5e6 olive:808000 olivedrab:6b8e23 orange:ffa500 orangered:ff4500 orchid:da70d6 palegoldenrod:eee8aa palegreen:98fb98 paleturquoise:afeeee palevioletred:db7093 papayawhip:ffefd5 peachpuff:ffdab9 peru:cd853f pink:ffc0cb plum:dda0dd powderblue:b0e0e6 purple:800080 rebeccapurple:663399 red:ff0000 rosybrown:bc8f8f royalblue:4169e1 saddlebrown:8b4513 salmon:fa8072 sandybrown:f4a460 seagreen:2e8b57 seashell:fff5ee sienna:a0522d silver:c0c0c0 skyblue:87ceeb slateblue:6a5acd slategray:708090 snow:fffafa springgreen:00ff7f steelblue:4682b4 tan:d2b48c teal:008080 thistle:d8bfd8 tomato:ff6347 turquoise:40e0d0 violet:ee82ee wheat:f5deb3 white:ffffff whitesmoke:f5f5f5 yellow:ffff00 yellowgreen:9acd32";

let namedLab: { name: string; lab: [number, number, number] }[] | null = null;

/** Closest CSS colour keyword by OKLab distance; `exact` when it is the same colour. */
export function nearestName(c: RGBA): { name: string; exact: boolean } {
  namedLab ??= NAMED.split(" ").map((e) => {
    const [name, hex] = e.split(":") as [string, string];
    return { name, lab: rgbToOklab({ r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4), 16), a: 1 }) };
  });
  const lab = rgbToOklab(c);
  let best = namedLab[0]!, bd = Infinity;
  for (const n of namedLab) {
    const d = (n.lab[0] - lab[0]) ** 2 + (n.lab[1] - lab[1]) ** 2 + (n.lab[2] - lab[2]) ** 2;
    if (d < bd) {
      bd = d;
      best = n;
    }
  }
  return { name: best.name, exact: bd < 1e-6 };
}
