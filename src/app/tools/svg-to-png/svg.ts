/**
 * SVG helpers shared by SVG to PNG and the Favicon Generator:
 * unit-aware intrinsic size, external-reference detection and rasterizing
 * through a sandboxed <img> (scripts never run, nothing is injected into the page).
 */

const SVG_NS = "http://www.w3.org/2000/svg";
const XLINK_NS = "http://www.w3.org/1999/xlink";

/** CSS px per unit. em/ex/ch assume the default 16 px font size. */
const UNIT_PX: Record<string, number> = {
  "": 1,
  px: 1,
  pt: 96 / 72,
  pc: 16,
  mm: 96 / 25.4,
  cm: 96 / 2.54,
  q: 96 / 101.6,
  in: 96,
  em: 16,
  rem: 16,
  ex: 8,
  ch: 8,
};

/** A length in CSS px, or null for relative (%), unknown or non-positive values. */
export function parseLength(value: string | null): number | null {
  if (!value) return null;
  const m = /^\s*([+]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*([a-z%]*)\s*$/i.exec(value);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = m[2].toLowerCase();
  if (unit === "%") return null;
  const k = UNIT_PX[unit];
  if (k === undefined || !(n > 0) || !isFinite(n)) return null;
  return n * k;
}

/** Adds the namespaces many hand-written / exported SVGs forget, so they parse and render. */
function withNamespaces(text: string): string {
  const open = /<svg\b[^>]*>/i.exec(text);
  if (!open) return text;
  let tag = open[0];
  if (!/\sxmlns\s*=/.test(tag)) tag = tag.replace(/<svg\b/i, `<svg xmlns="${SVG_NS}"`);
  if (/xlink:/.test(text) && !/\sxmlns:xlink\s*=/.test(tag)) tag = tag.replace(/<svg\b/i, `<svg xmlns:xlink="${XLINK_NS}"`);
  return text.slice(0, open.index) + tag + text.slice(open.index + open[0].length);
}

export function parseSvg(text: string): { doc: Document; root: Element } | null {
  try {
    const doc = new DOMParser().parseFromString(withNamespaces(text), "image/svg+xml");
    const root = doc.documentElement;
    if (!root || root.localName !== "svg" || doc.getElementsByTagName("parsererror").length > 0) return null;
    return { doc, root };
  } catch {
    return null;
  }
}

export interface SvgSize {
  width: number;
  height: number;
  viewBox: [number, number, number, number] | null;
}

/** Intrinsic size in CSS px: width/height with units resolved, falling back to the viewBox. */
export function intrinsicSize(root: Element): SvgSize {
  let viewBox: SvgSize["viewBox"] = null;
  const vb = root.getAttribute("viewBox");
  if (vb) {
    const p = vb.trim().split(/[\s,]+/).map(Number);
    if (p.length === 4 && p.every((n) => isFinite(n)) && p[2] > 0 && p[3] > 0) viewBox = p as SvgSize["viewBox"];
  }
  let w = parseLength(root.getAttribute("width"));
  let h = parseLength(root.getAttribute("height"));
  const ratio = viewBox ? viewBox[2] / viewBox[3] : null;
  if (w && !h && ratio) h = w / ratio;
  if (h && !w && ratio) w = h * ratio;
  if (!w || !h) {
    if (viewBox) {
      w = viewBox[2];
      h = viewBox[3];
    } else {
      // What browsers use for a replaced element with no size information.
      w = 300;
      h = 150;
    }
  }
  return { width: w, height: h, viewBox };
}

const GENERIC_FONTS = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-serif",
  "ui-sans-serif",
  "ui-monospace",
  "ui-rounded",
  "emoji",
  "math",
  "inherit",
  "initial",
  "unset",
]);

function isLocalRef(url: string) {
  const u = url.trim().replace(/^['"]|['"]$/g, "");
  return !u || u.startsWith("#") || /^data:/i.test(u);
}

function urlsIn(css: string): string[] {
  const out: string[] = [];
  const re = /url\(\s*(['"]?)(.*?)\1\s*\)|@import\s+(['"])(.*?)\3/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) out.push((m[2] ?? m[4] ?? "").trim());
  return out;
}

function fontFamiliesIn(css: string): string[] {
  const out: string[] = [];
  const re = /font-family\s*:\s*([^;}]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) out.push(...m[1].split(","));
  return out;
}

export interface SvgReport {
  /** Files the SVG loads from outside itself (they're blocked when rendered as an image). */
  externalFiles: string[];
  /** Named (non-generic) fonts used by text. */
  fonts: string[];
  /** Web fonts loaded from a URL (never available when rendered as an image). */
  webFonts: boolean;
}

/** Detects what will silently go missing when the SVG is rasterized as an image. */
export function inspectSvg(root: Element): SvgReport {
  const files = new Set<string>();
  const families = new Set<string>();
  let webFonts = false;
  let hasText = false;
  const all = [root, ...Array.from(root.getElementsByTagName("*"))];
  for (const el of all) {
    const name = el.localName;
    if (name === "text" || name === "tspan" || name === "textPath") hasText = true;
    if (name !== "a") {
      const href = el.getAttribute("href") ?? el.getAttributeNS(XLINK_NS, "href");
      if (href && !isLocalRef(href)) files.add(href.trim());
    }
    const style = el.getAttribute("style");
    if (style) {
      urlsIn(style).forEach((u) => !isLocalRef(u) && files.add(u));
      fontFamiliesIn(style).forEach((f) => families.add(f));
    }
    const ff = el.getAttribute("font-family");
    if (ff) ff.split(",").forEach((f) => families.add(f));
    if (name === "style") {
      const css = el.textContent ?? "";
      const fontFaces = css.match(/@font-face\s*{[^}]*}/gi) ?? [];
      for (const face of fontFaces) if (urlsIn(face).some((u) => !isLocalRef(u))) webFonts = true;
      const rest = css.replace(/@font-face\s*{[^}]*}/gi, "");
      for (const u of urlsIn(rest)) {
        if (isLocalRef(u)) continue;
        if (/fonts\.googleapis|\.woff2?|\.ttf|\.otf/i.test(u)) webFonts = true;
        else files.add(u);
      }
      fontFamiliesIn(css).forEach((f) => families.add(f));
    }
  }
  const fonts = hasText
    ? Array.from(families)
        .map((f) => f.trim().replace(/^['"]|['"]$/g, "").trim())
        .filter((f) => f && !GENERIC_FONTS.has(f.toLowerCase()))
    : [];
  return { externalFiles: Array.from(files), fonts: Array.from(new Set(fonts)), webFonts };
}

/** The SVG text with explicit pixel width/height (a viewBox is added when missing so it scales). */
export function sizedSvgText(text: string, width: number, height: number): string | null {
  const parsed = parseSvg(text);
  if (!parsed) return null;
  const { root, doc } = parsed;
  const size = intrinsicSize(root);
  if (!size.viewBox) root.setAttribute("viewBox", `0 0 ${size.width} ${size.height}`);
  root.setAttribute("width", String(width));
  root.setAttribute("height", String(height));
  return new XMLSerializer().serializeToString(doc);
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("SVG could not be rendered"));
    img.src = url;
  });
}

/** Renders the SVG at exactly width × height onto a new canvas (optionally over a solid colour). */
export async function rasterizeSvg(text: string, width: number, height: number, background?: string | null): Promise<HTMLCanvasElement> {
  const sized = sizedSvgText(text, width, height);
  if (!sized) throw new Error("Invalid SVG");
  const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await loadImage(url);
    await img.decode().catch(() => undefined);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);
    }
    ctx.drawImage(img, 0, 0, width, height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Largest side we allow for any output. */
export const MAX_SIDE = 8192;
