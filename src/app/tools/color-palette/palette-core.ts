/** Perceptual palette extraction: k-means++ in OKLab on a downsampled image. */

export interface Swatch {
  hex: string;
  r: number;
  g: number;
  b: number;
  /** Share of the image, 0–1. */
  share: number;
}

const toLin = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const toSrgb = (l: number) => {
  const s = l <= 0.0031308 ? 12.92 * l : 1.055 * l ** (1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(1, s)) * 255);
};

function rgbToOklab(r: number, g: number, b: number): [number, number, number] {
  const R = toLin(r), G = toLin(g), B = toLin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}

function oklabToRgb(L: number, a: number, b: number): [number, number, number] {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    toSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

const hex = (r: number, g: number, b: number) => "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();

/** `data` is RGBA pixels of a small (≈160 px) copy of the image. */
export function extractPalette(data: Uint8ClampedArray, count: number): Swatch[] {
  const pts: number[][] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3]! < 125) continue;
    pts.push(rgbToOklab(data[i]!, data[i + 1]!, data[i + 2]!));
  }
  if (!pts.length) return [];
  const k = Math.min(count, pts.length);
  // Deterministic k-means++ seeding (largest-distance picks), so the same image gives the same palette.
  const centers: number[][] = [pts[Math.floor(pts.length / 2)]!.slice()];
  const d2 = new Float64Array(pts.length).fill(Infinity);
  while (centers.length < k) {
    const c = centers[centers.length - 1]!;
    let best = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]!;
      const d = (p[0]! - c[0]!) ** 2 + (p[1]! - c[1]!) ** 2 + (p[2]! - c[2]!) ** 2;
      if (d < d2[i]!) d2[i] = d;
      if (d2[i]! > d2[best]!) best = i;
    }
    centers.push(pts[best]!.slice());
  }
  const assign = new Int32Array(pts.length);
  for (let iter = 0; iter < 12; iter++) {
    const sum = centers.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]!;
      let bi = 0;
      let bd = Infinity;
      for (let j = 0; j < centers.length; j++) {
        const c = centers[j]!;
        const d = (p[0]! - c[0]!) ** 2 + (p[1]! - c[1]!) ** 2 + (p[2]! - c[2]!) ** 2;
        if (d < bd) {
          bd = d;
          bi = j;
        }
      }
      assign[i] = bi;
      const s = sum[bi]!;
      s[0]! += p[0]!;
      s[1]! += p[1]!;
      s[2]! += p[2]!;
      s[3]!++;
    }
    let moved = 0;
    centers.forEach((c, j) => {
      const s = sum[j]!;
      if (!s[3]) return;
      const n = [s[0]! / s[3]!, s[1]! / s[3]!, s[2]! / s[3]!];
      moved += Math.abs(n[0]! - c[0]!) + Math.abs(n[1]! - c[1]!) + Math.abs(n[2]! - c[2]!);
      centers[j] = n;
    });
    if (moved < 1e-4) break;
  }
  const counts = new Array(centers.length).fill(0);
  for (let i = 0; i < pts.length; i++) counts[assign[i]!]++;
  return centers
    .map((c, j) => {
      const [r, g, b] = oklabToRgb(c[0]!, c[1]!, c[2]!);
      return { hex: hex(r, g, b), r, g, b, share: counts[j] / pts.length };
    })
    .filter((s) => s.share > 0)
    .sort((a, b) => b.share - a.share);
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === R ? (G - B) / d + (G < B ? 6 : 0) : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return [Math.round(h * 60), Math.round(s * 100), Math.round(l * 100)];
}

export function isLight(s: Swatch): boolean {
  return 0.2126 * toLin(s.r) + 0.7152 * toLin(s.g) + 0.0722 * toLin(s.b) > 0.36;
}
