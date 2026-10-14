/**
 * Reads one PDF page through pdf.js and returns a `PageModel`: every glyph
 * with its real position, font, size, weight and colour, the ruling lines and
 * filled boxes (table borders, shading), other vector drawing and images.
 *
 * It interprets pdf.js' operator list the same way pdf.js' canvas renderer
 * does (text matrix, character/word spacing, horizontal scaling, rise, CTM,
 * form XObjects), so positions match what the user sees. Runs on the main
 * thread but only does arithmetic; pdf.js parses in its own worker.
 */
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";
import { loadPdfjs } from "@/lib/pdfjs";
import { processImage } from "@/lib/image-engine";
import type { Box, FontInfo, Glyph, ImageAsset, PageModel, PlacedImage, Rule, Shape } from "./model";

type M = [number, number, number, number, number, number];

const IDENTITY: M = [1, 0, 0, 1, 0, 0];

function mul(m1: M | number[], m2: M | number[]): M {
  return [
    m1[0]! * m2[0]! + m1[2]! * m2[1]!,
    m1[1]! * m2[0]! + m1[3]! * m2[1]!,
    m1[0]! * m2[2]! + m1[2]! * m2[3]!,
    m1[1]! * m2[2]! + m1[3]! * m2[3]!,
    m1[0]! * m2[4]! + m1[2]! * m2[5]! + m1[4]!,
    m1[1]! * m2[4]! + m1[3]! * m2[5]! + m1[5]!,
  ];
}

function apply(m: M, x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/** Uniform scale factor of a matrix (geometric mean of the axes). */
function scaleOf(m: M): number {
  return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1;
}

// ── Fonts ────────────────────────────────────────────────────────────────────

const KNOWN_FAMILIES: [RegExp, string][] = [
  [/^arial/i, "Arial"],
  [/^helvetica/i, "Arial"],
  [/^timesnewroman|^times-?roman|^times$/i, "Times New Roman"],
  [/^times/i, "Times New Roman"],
  [/^couriernew|^courier/i, "Courier New"],
  [/^calibri/i, "Calibri"],
  [/^cambria/i, "Cambria"],
  [/^georgia/i, "Georgia"],
  [/^verdana/i, "Verdana"],
  [/^tahoma/i, "Tahoma"],
  [/^trebuchet/i, "Trebuchet MS"],
  [/^garamond|^ebgaramond/i, "Garamond"],
  [/^bookantiqua/i, "Book Antiqua"],
  [/^centurygothic/i, "Century Gothic"],
  [/^segoeui/i, "Segoe UI"],
  [/^consolas/i, "Consolas"],
  [/^roboto/i, "Roboto"],
  [/^opensans/i, "Open Sans"],
  [/^lato/i, "Lato"],
  [/^montserrat/i, "Montserrat"],
  [/^sourcesanspro|^sourcesans3/i, "Source Sans Pro"],
  [/^notosans/i, "Noto Sans"],
  [/^notoserif/i, "Noto Serif"],
  [/^dejavusans/i, "DejaVu Sans"],
  [/^liberationsans/i, "Arial"],
  [/^liberationserif/i, "Times New Roman"],
  [/^liberationmono/i, "Courier New"],
  [/^symbol/i, "Symbol"],
  [/^zapfdingbats|^wingdings/i, "Wingdings"],
  [/^cmr|^lmroman|^cmu/i, "Cambria"],
  [/^cmss|^lmsans/i, "Arial"],
  [/^cmtt|^lmmono/i, "Courier New"],
];

const STYLE_SUFFIX =
  /[-,_ ]?(bold|black|heavy|semibold|demibold|demi|medium|light|thin|book|regular|roman|italic|oblique|it|bd|bi|mt|ps|psmt|condensed|cond|narrow)+$/i;

function familyFromName(raw: string): string {
  const name = raw.replace(/^[A-Z]{6}\+/, "");
  const compact = name.replace(/[\s_-]/g, "");
  for (const [re, family] of KNOWN_FAMILIES) if (re.test(compact)) return family;
  let base = name.split(/[,-]/)[0] ?? name;
  for (let i = 0; i < 3; i++) base = base.replace(STYLE_SUFFIX, "");
  base = base.replace(/([a-z])([A-Z])/g, "$1 $2").trim();
  return base || "Calibri";
}

interface PdfjsFont {
  name?: string;
  loadedName?: string;
  fallbackName?: string;
  bold?: boolean;
  black?: boolean;
  italic?: boolean;
  vertical?: boolean;
  isMonospace?: boolean;
  isSerifFont?: boolean;
  isType3Font?: boolean;
  fontMatrix?: number[];
  systemFontInfo?: { css?: string } | null;
}

function fontInfo(font: PdfjsFont | null): FontInfo {
  const name = font?.name ?? "";
  const plain = name.replace(/^[A-Z]{6}\+/, "");
  const bold = !!font?.bold || !!font?.black || /bold|black|heavy|semibold|demi|,bd|-bd\b/i.test(plain);
  const italic = !!font?.italic || /italic|oblique|-it\b|,it\b/i.test(plain);
  const monospace = !!font?.isMonospace || /mono|courier|consolas|menlo/i.test(plain);
  const serif = font?.isSerifFont ?? /times|serif|georgia|garamond|cambria|book/i.test(plain);
  return {
    family: name ? familyFromName(name) : monospace ? "Courier New" : serif ? "Times New Roman" : "Calibri",
    bold,
    italic,
    monospace,
    serif,
  };
}

// ── Images ──────────────────────────────────────────────────────────────────

interface PdfjsImage {
  width: number;
  height: number;
  kind?: number;
  data?: Uint8Array | Uint8ClampedArray;
  bitmap?: ImageBitmap;
}

function getObj(page: PDFPageProxy, id: string): Promise<PdfjsImage | null> {
  const store = (id.startsWith("g_") ? page.commonObjs : page.objs) as unknown as {
    get(id: string, cb?: (data: unknown) => void): unknown;
    has?(id: string): boolean;
  };
  return new Promise((resolve) => {
    let settled = false;
    const done = (v: unknown) => {
      if (settled) return;
      settled = true;
      resolve((v as PdfjsImage) ?? null);
    };
    try {
      store.get(id, done);
    } catch {
      done(null);
    }
    // Never hang a conversion on an image pdf.js can't produce.
    setTimeout(() => done(null), 8000);
  });
}

/** RGBA ImageData from pdf.js raw image kinds (1 = 1-bit gray, 2 = RGB, 3 = RGBA). */
function toImageData(img: PdfjsImage): ImageData | null {
  const { width, height, data, kind } = img;
  if (!data || !width || !height) return null;
  const out = new Uint8ClampedArray(width * height * 4);
  if (kind === 3) {
    out.set(data.subarray(0, out.length));
  } else if (kind === 2) {
    for (let i = 0, j = 0; i < out.length; i += 4, j += 3) {
      out[i] = data[j]!;
      out[i + 1] = data[j + 1]!;
      out[i + 2] = data[j + 2]!;
      out[i + 3] = 255;
    }
  } else if (kind === 1) {
    const rowBytes = (width + 7) >> 3;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const bit = (data[y * rowBytes + (x >> 3)]! >> (7 - (x & 7))) & 1;
        const v = bit ? 255 : 0;
        const o = (y * width + x) * 4;
        out[o] = out[o + 1] = out[o + 2] = v;
        out[o + 3] = 255;
      }
    }
  } else {
    return null;
  }
  return new ImageData(out, width, height);
}

/** Does the image have any (meaningfully) transparent pixels? Checked on a small sample. */
function hasAlpha(source: CanvasImageSource | ImageData, width: number, height: number): boolean {
  if (source instanceof ImageData) {
    const d = source.data;
    const step = Math.max(4, Math.floor(d.length / 4 / 20000) * 4);
    for (let i = 3; i < d.length; i += step) if (d[i]! < 250) return true;
    return false;
  }
  const w = Math.max(1, Math.min(96, width));
  const h = Math.max(1, Math.min(96, height));
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(source, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < d.length; i += 4) if (d[i]! < 250) return true;
  return false;
}

/**
 * A drop shadow or glow: one flat colour whose alpha fades softly over much of the image. In the PDF a
 * card or photo is painted over it so only the soft edge shows; we don't carry those rounded cards over,
 * so on its own the shadow would be a dark blob. Flat-colour icons have hard alpha edges and are kept.
 */
function isSoftShadow(source: CanvasImageSource | ImageData, width: number, height: number): boolean {
  const w = Math.max(1, Math.min(64, width));
  const h = Math.max(1, Math.min(64, height));
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  if (source instanceof ImageData) {
    const tmp = new OffscreenCanvas(source.width, source.height);
    tmp.getContext("2d")!.putImageData(source, 0, 0);
    ctx.drawImage(tmp, 0, 0, w, h);
  } else ctx.drawImage(source, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h).data;
  let soft = 0, visible = 0;
  const lo = [255, 255, 255], hi = [0, 0, 0];
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3]!;
    if (a > 12 && a < 240) soft++;
    if (a < 40) continue;
    visible++;
    for (let c = 0; c < 3; c++) {
      lo[c] = Math.min(lo[c]!, d[i + c]!);
      hi[c] = Math.max(hi[c]!, d[i + c]!);
    }
  }
  const flat = visible > 0 && [0, 1, 2].every((c) => hi[c]! - lo[c]! < 24);
  if (!flat) return false;
  // Shadows are (near) black with a blurred band of ~10-30 % of the area; other flat glows need more.
  const dark = Math.max(hi[0]!, hi[1]!, hi[2]!) < 48;
  return soft / (w * h) > (dark ? 0.12 : 0.25);
}

async function encodeImage(
  img: PdfjsImage,
  placedW: number,
  placedH: number,
  dpi: number,
  signal?: AbortSignal,
): Promise<{ bytes: ArrayBuffer; mime: "image/png" | "image/jpeg"; pxW: number; pxH: number } | null> {
  let bitmap: ImageBitmap;
  let alpha: boolean;
  if (img.bitmap) {
    // pdf.js hands over an ImageBitmap, or a VideoFrame when the browser's ImageDecoder decoded a
    // JPEG (no .width there: use the image's own size). Draw it into our own bitmap either way; pdf.js
    // may close its copy when the page is cleaned up.
    const src = img.bitmap as unknown as CanvasImageSource;
    const w = img.width || (img.bitmap as { width?: number }).width || 0;
    const h = img.height || (img.bitmap as { height?: number }).height || 0;
    if (!w || !h) return null;
    alpha = hasAlpha(src, w, h);
    if (alpha && isSoftShadow(src, w, h)) return null;
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(src, 0, 0, w, h);
    bitmap = canvas.transferToImageBitmap();
  } else {
    const data = toImageData(img);
    if (!data) return null;
    alpha = hasAlpha(data, data.width, data.height);
    if (alpha && isSoftShadow(data, data.width, data.height)) return null;
    bitmap = await createImageBitmap(data);
  }
  const maxW = Math.max(16, Math.round((placedW / 72) * dpi));
  const maxH = Math.max(16, Math.round((placedH / 72) * dpi));
  const needsResize = bitmap.width > maxW * 1.15 || bitmap.height > maxH * 1.15;
  const res = await processImage(
    {
      input: bitmap as unknown as Blob, // the engine accepts (and transfers) ImageBitmap
      transform: needsResize ? { resize: { width: maxW, height: maxH, fit: "contain" } } : undefined,
      encode: alpha ? { format: "image/png", quality: 1 } : { format: "image/jpeg", quality: 0.88 },
    },
    signal,
  );
  return {
    bytes: await res.blob.arrayBuffer(),
    mime: alpha ? "image/png" : "image/jpeg",
    pxW: res.width,
    pxH: res.height,
  };
}

// ── Page interpretation ──────────────────────────────────────────────────────

interface GState {
  ctm: M;
  fill: string;
  stroke: string;
  lineWidth: number;
  font: PdfjsFont | null;
  fontIndex: number;
  fontSize: number;
  fontDirection: number;
  charSpacing: number;
  wordSpacing: number;
  hScale: number;
  leading: number;
  rise: number;
  renderMode: number;
}

export interface ExtractOptions {
  /** Resolution for embedded images (default 220 dpi of their placed size). */
  imageDpi?: number;
  /** Skip image extraction (e.g. for Excel). */
  images?: boolean;
  signal?: AbortSignal;
}

export interface ExtractedPage {
  page: PageModel;
  assets: ImageAsset[];
}

const WHITE = /^#f[a-f0-9]f[a-f0-9]f[a-f0-9]$/i;

export async function extractPage(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  options: ExtractOptions = {},
): Promise<ExtractedPage> {
  const lib = await loadPdfjs();
  const OPS = lib.OPS as Record<string, number>;
  const page = await pdf.getPage(pageNumber);
  try {
    const viewport = page.getViewport({ scale: 1 });
    const opList = await page.getOperatorList();
    options.signal?.throwIfAborted();

    const glyphs: Glyph[] = [];
    const fonts: FontInfo[] = [];
    const fontIndexByRef = new Map<string, number>();
    const rules: Rule[] = [];
    const boxes: Box[] = [];
    const shapes: Shape[] = [];
    const imageJobs: { obj: Promise<PdfjsImage | null> | PdfjsImage; x: number; y: number; w: number; h: number }[] = [];

    let gs: GState = {
      ctm: viewport.transform as M,
      fill: "#000000",
      stroke: "#000000",
      lineWidth: 1,
      font: null,
      fontIndex: -1,
      fontSize: 0,
      fontDirection: 1,
      charSpacing: 0,
      wordSpacing: 0,
      hScale: 1,
      leading: 0,
      rise: 0,
      renderMode: 0,
    };
    const stack: GState[] = [];
    // Text object state (not part of the graphics state stack in pdf.js either).
    let tm: M = IDENTITY;
    let tx = 0;
    let ty = 0;
    let lineX = 0;
    let lineY = 0;

    const setFont = (ref: string, size: number) => {
      let font: PdfjsFont | null = null;
      try {
        font = page.commonObjs.get(ref) as PdfjsFont;
      } catch {
        font = null;
      }
      let index = fontIndexByRef.get(ref);
      if (index === undefined) {
        index = fonts.length;
        fonts.push(fontInfo(font));
        fontIndexByRef.set(ref, index);
      }
      gs.font = font;
      gs.fontIndex = index;
      if (size < 0) {
        gs.fontSize = -size;
        gs.fontDirection = -1;
      } else {
        gs.fontSize = size;
        gs.fontDirection = 1;
      }
    };

    const showText = (items: unknown[]) => {
      const font = gs.font;
      const fontSize = gs.fontSize;
      if (!fontSize || gs.fontIndex < 0) return;
      const fontMatrix = font?.fontMatrix ?? [0.001, 0, 0, 0.001, 0, 0];
      const widthAdvanceScale = fontSize * fontMatrix[0]!;
      const th = gs.hScale * gs.fontDirection;
      const m = mul(gs.ctm, tm);
      const sizeOnPage = fontSize * Math.hypot(m[2], m[3]);
      const hidden = (gs.renderMode & 3) === 3;
      const color = (gs.renderMode & 3) === 1 ? gs.stroke : gs.fill;
      const vertical = !!font?.vertical;
      let x = 0;
      for (const item of items) {
        if (typeof item === "number") {
          x += (-item * fontSize) / 1000;
          continue;
        }
        const glyph = item as { unicode?: string; width?: number; isSpace?: boolean };
        const advance = (glyph.width ?? 0) * widthAdvanceScale;
        const spacing = (glyph.isSpace ? gs.wordSpacing : 0) + gs.charSpacing;
        const text = glyph.unicode ?? "";
        if (text && !vertical) {
          const [ax, ay] = apply(m, tx + x * th, ty + gs.rise);
          const [bx, by] = apply(m, tx + (x + advance) * th, ty + gs.rise);
          const dx = bx - ax;
          const dy = by - ay;
          const rotated = Math.abs(dy) > Math.abs(dx) * 0.09 || dx < 0;
          glyphs.push({
            text,
            x0: Math.min(ax, bx),
            x1: Math.max(ax, bx),
            y: (ay + by) / 2,
            size: sizeOnPage,
            font: gs.fontIndex,
            color,
            // Char code 32 isn't always a space: subset fonts reuse it for real letters.
            space: /^\s+$/.test(text),
            hidden,
            rotated,
          });
        } else if (text && vertical) {
          const [ax, ay] = apply(m, tx, ty + x);
          glyphs.push({
            text,
            x0: ax,
            x1: ax + sizeOnPage,
            y: ay,
            size: sizeOnPage,
            font: gs.fontIndex,
            color,
            space: /^\s+$/.test(text),
            hidden,
            rotated: true,
          });
        }
        x += advance + spacing * gs.fontDirection;
      }
      if (vertical) ty -= x;
      else tx += x * th;
    };

    const addPath = (paintOp: number, data: ArrayLike<number> | null) => {
      if (!data) return;
      const isStroke = paintOp === OPS.stroke || paintOp === OPS.closeStroke;
      const isFill =
        paintOp === OPS.fill ||
        paintOp === OPS.eoFill ||
        paintOp === OPS.fillStroke ||
        paintOp === OPS.eoFillStroke ||
        paintOp === OPS.closeFillStroke ||
        paintOp === OPS.closeEOFillStroke;
      const strokesToo = isStroke || paintOp === OPS.fillStroke || paintOp === OPS.eoFillStroke || paintOp === OPS.closeFillStroke || paintOp === OPS.closeEOFillStroke;
      if (!isStroke && !isFill) return; // clipping paths, endPath
      const m = gs.ctm;
      const lw = Math.max(0.1, gs.lineWidth * scaleOf(m));
      // Split into sub-paths of device points; curves only count toward shapes.
      type Sub = { pts: [number, number][]; curved: boolean; closed: boolean };
      const subs: Sub[] = [];
      let cur: Sub | null = null;
      for (let i = 0; i < data.length; ) {
        const op = data[i++];
        if (op === 0) {
          cur = { pts: [apply(m, data[i++]!, data[i++]!)], curved: false, closed: false };
          subs.push(cur);
        } else if (op === 1) {
          const p = apply(m, data[i++]!, data[i++]!);
          if (!cur) {
            cur = { pts: [p], curved: false, closed: false };
            subs.push(cur);
          } else cur.pts.push(p);
        } else if (op === 2) {
          i += 4;
          const p = apply(m, data[i++]!, data[i++]!);
          if (cur) {
            cur.pts.push(p);
            cur.curved = true;
          }
        } else if (op === 3) {
          i += 2;
          const p = apply(m, data[i++]!, data[i++]!);
          if (cur) {
            cur.pts.push(p);
            cur.curved = true;
          }
        } else if (op === 4) {
          if (cur) cur.closed = true;
        } else {
          break; // unknown op: stop rather than misread coordinates
        }
      }
      for (const sub of subs) {
        const pts = sub.pts;
        if (pts.length < 2) continue;
        const xs = pts.map((p) => p[0]);
        const ys = pts.map((p) => p[1]);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const w = maxX - minX;
        const h = maxY - minY;
        const axisAligned =
          !sub.curved &&
          pts.every((p, k) => {
            if (k === 0) return true;
            const q = pts[k - 1]!;
            return Math.abs(p[0] - q[0]) < 0.6 || Math.abs(p[1] - q[1]) < 0.6;
          });
        const isRect = axisAligned && pts.length >= 4 && pts.length <= 6;
        if (isFill && isRect) {
          if ((h <= 3 && w > 4) || (w <= 3 && h > 4)) {
            rules.push(
              h <= w
                ? { x0: minX, y0: (minY + maxY) / 2, x1: maxX, y1: (minY + maxY) / 2, width: Math.max(h, 0.1), color: gs.fill }
                : { x0: (minX + maxX) / 2, y0: minY, x1: (minX + maxX) / 2, y1: maxY, width: Math.max(w, 0.1), color: gs.fill },
            );
          } else if (w > 3 && h > 3 && !WHITE.test(gs.fill) && gs.fill !== "transparent") {
            boxes.push({ x: minX, y: minY, w, h, color: gs.fill });
          }
        } else if (isFill && !axisAligned && w * h > 4) {
          shapes.push({ x: minX, y: minY, w, h, segments: pts.length });
        }
        if (strokesToo) {
          if (axisAligned) {
            for (let k = 1; k < pts.length + (sub.closed ? 1 : 0); k++) {
              const a = pts[k - 1]!;
              const b = pts[k % pts.length]!;
              const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
              if (len < 2) continue;
              rules.push({
                x0: Math.min(a[0], b[0]),
                y0: Math.min(a[1], b[1]),
                x1: Math.max(a[0], b[0]),
                y1: Math.max(a[1], b[1]),
                width: lw,
                color: gs.stroke,
              });
            }
          } else if (w * h > 4 || w > 6 || h > 6) {
            shapes.push({ x: minX, y: minY, w: Math.max(w, lw), h: Math.max(h, lw), segments: pts.length });
          }
        }
      }
    };

    const placeImage = (obj: Promise<PdfjsImage | null> | PdfjsImage) => {
      const m = gs.ctm;
      const corners = [apply(m, 0, 0), apply(m, 1, 0), apply(m, 0, 1), apply(m, 1, 1)];
      const xs = corners.map((c) => c[0]);
      const ys = corners.map((c) => c[1]);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      const w = Math.max(...xs) - x;
      const h = Math.max(...ys) - y;
      if (w < 3 || h < 3) return;
      imageJobs.push({ obj, x, y, w, h });
    };

    const { fnArray, argsArray } = opList;
    for (let i = 0; i < fnArray.length; i++) {
      const fn = fnArray[i];
      const args = argsArray[i] as unknown[];
      switch (fn) {
        case OPS.save:
          stack.push({ ...gs });
          break;
        case OPS.restore:
          gs = stack.pop() ?? gs;
          break;
        case OPS.transform:
          gs.ctm = mul(gs.ctm, args as number[]);
          break;
        case OPS.paintFormXObjectBegin: {
          stack.push({ ...gs });
          const matrix = args[0] as number[] | null;
          if (Array.isArray(matrix) && matrix.length === 6) gs.ctm = mul(gs.ctm, matrix);
          break;
        }
        case OPS.paintFormXObjectEnd:
          gs = stack.pop() ?? gs;
          break;
        case OPS.setLineWidth:
          gs.lineWidth = args[0] as number;
          break;
        case OPS.setGState:
          for (const [key, value] of args[0] as [string, unknown][]) {
            if (key === "LW") gs.lineWidth = value as number;
            else if (key === "Font" && Array.isArray(value)) {
              const ref = (value[0] as { loadedName?: string })?.loadedName ?? (value[0] as string);
              if (typeof ref === "string") setFont(ref, value[1] as number);
            }
          }
          break;
        case OPS.setFillRGBColor:
          gs.fill = typeof args[0] === "string" ? (args[0] as string) : gs.fill;
          break;
        case OPS.setStrokeRGBColor:
          gs.stroke = typeof args[0] === "string" ? (args[0] as string) : gs.stroke;
          break;
        case OPS.setFillTransparent:
          gs.fill = "transparent";
          break;
        case OPS.setStrokeTransparent:
          gs.stroke = "transparent";
          break;
        case OPS.beginText:
          tm = IDENTITY;
          tx = ty = lineX = lineY = 0;
          break;
        case OPS.setFont:
          setFont(args[0] as string, args[1] as number);
          break;
        case OPS.setCharSpacing:
          gs.charSpacing = args[0] as number;
          break;
        case OPS.setWordSpacing:
          gs.wordSpacing = args[0] as number;
          break;
        case OPS.setHScale:
          gs.hScale = (args[0] as number) / 100;
          break;
        case OPS.setLeading:
          gs.leading = -(args[0] as number);
          break;
        case OPS.setTextRise:
          gs.rise = args[0] as number;
          break;
        case OPS.setTextRenderingMode:
          gs.renderMode = args[0] as number;
          break;
        case OPS.setTextMatrix:
          tm = (args[0] as number[]).length === 6 ? ((args[0] as number[]).slice() as M) : (args.slice(0, 6) as M);
          tx = ty = lineX = lineY = 0;
          break;
        case OPS.moveText:
          tx = lineX += args[0] as number;
          ty = lineY += args[1] as number;
          break;
        case OPS.setLeadingMoveText:
          gs.leading = args[1] as number;
          tx = lineX += args[0] as number;
          ty = lineY += args[1] as number;
          break;
        case OPS.nextLine:
          tx = lineX;
          ty = lineY += gs.leading;
          break;
        case OPS.showText:
        case OPS.showSpacedText:
          showText(args[0] as unknown[]);
          break;
        case OPS.constructPath:
          addPath(args[0] as number, ((args[1] as unknown[])?.[0] as ArrayLike<number>) ?? null);
          break;
        case OPS.paintImageXObject:
          if (options.images !== false) placeImage(getObj(page, args[0] as string));
          break;
        case OPS.paintInlineImageXObject:
          if (options.images !== false) placeImage(args[0] as PdfjsImage);
          break;
        case OPS.paintImageMaskXObject: {
          const m = gs.ctm;
          const a = apply(m, 0, 0);
          const b = apply(m, 1, 1);
          shapes.push({ x: Math.min(a[0], b[0]), y: Math.min(a[1], b[1]), w: Math.abs(b[0] - a[0]), h: Math.abs(b[1] - a[1]), segments: 8 });
          break;
        }
        default:
          break;
      }
    }

    // Images: decode + encode through the shared engine (off the main thread).
    const assets: ImageAsset[] = [];
    const placed: PlacedImage[] = [];
    const dpi = options.imageDpi ?? 220;
    for (let k = 0; k < imageJobs.length; k++) {
      options.signal?.throwIfAborted();
      const job = imageJobs[k]!;
      // Skip images that are entirely off the page.
      if (job.x > viewport.width || job.y > viewport.height || job.x + job.w < 0 || job.y + job.h < 0) continue;
      const obj = await job.obj;
      if (!obj) continue;
      try {
        const encoded = await encodeImage(obj, job.w, job.h, dpi, options.signal);
        if (!encoded) continue;
        const id = `p${pageNumber}i${k}`;
        assets.push({ id, bytes: encoded.bytes, mime: encoded.mime, pxW: encoded.pxW, pxH: encoded.pxH });
        placed.push({ id, x: job.x, y: job.y, w: job.w, h: job.h, pxW: encoded.pxW, pxH: encoded.pxH });
      } catch (error) {
        if ((error as { name?: string })?.name === "AbortError") throw error;
        console.warn("Image skipped", error);
      }
    }

    const visibleText = glyphs.filter((g) => !g.hidden && !g.space).length;
    const pageArea = viewport.width * viewport.height;
    const bigImage = placed.some((im) => im.w * im.h > pageArea * 0.5);
    return {
      page: {
        index: pageNumber - 1,
        width: viewport.width,
        height: viewport.height,
        glyphs,
        fonts,
        rules,
        boxes,
        shapes,
        images: placed,
        scanned: visibleText < 3 && bigImage,
      },
      assets,
    };
  } finally {
    page.cleanup();
  }
}

/** Render a page (or a region of it) to an encoded image — used for scans and vector figures. */
export async function renderRegion(
  pdf: PDFDocumentProxy,
  pageNumber: number,
  region: { x: number; y: number; w: number; h: number } | null,
  dpi: number,
  signal?: AbortSignal,
): Promise<{ bytes: ArrayBuffer; mime: "image/png" | "image/jpeg"; pxW: number; pxH: number }> {
  const page = await pdf.getPage(pageNumber);
  try {
    const base = page.getViewport({ scale: 1 });
    const r = region ?? { x: 0, y: 0, w: base.width, h: base.height };
    // Keep the canvas inside every browser's limits (iOS: 16.7 MP).
    let scale = dpi / 72;
    const maxPixels = 14_000_000;
    if (r.w * scale * (r.h * scale) > maxPixels) scale = Math.sqrt(maxPixels / (r.w * r.h));
    const viewport = page.getViewport({ scale });
    const width = Math.max(1, Math.round(r.w * scale));
    const height = Math.max(1, Math.round(r.h * scale));
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No canvas");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    const task = page.render({
      canvas: canvas as unknown as HTMLCanvasElement,
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
      transform: [1, 0, 0, 1, -r.x * scale, -r.y * scale],
      background: "#ffffff",
    });
    const onAbort = () => task.cancel();
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
      await task.promise;
    } finally {
      signal?.removeEventListener("abort", onAbort);
    }
    signal?.throwIfAborted();
    const bitmap = await createImageBitmap(canvas);
    const res = await processImage(
      { input: bitmap as unknown as Blob, encode: { format: "image/jpeg", quality: 0.9 } },
      signal,
    );
    return { bytes: await res.blob.arrayBuffer(), mime: "image/jpeg", pxW: res.width, pxH: res.height };
  } finally {
    page.cleanup();
  }
}
