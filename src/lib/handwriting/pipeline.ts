/**
 * Pure pre/post-processing for PP-OCR text recognition (no DOM, no ONNX):
 * detection input, DB box extraction, rotated line crops, CTC decoding and
 * reading-order assembly. Runs in the worker and in Node tests.
 *
 * Mirrors PaddleOCR's PP-OCRv6 pipeline: DB detector (threshold 0.3, box
 * score 0.6, unclip 1.5) and an SVTR/CTC recognizer fed 48 px high BGR crops.
 */

export interface Rgba {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

/** A rotated text box in source-image pixels. */
export interface TextBox {
  cx: number;
  cy: number;
  /** Extent along `ux,uy` (the reading direction). */
  w: number;
  /** Extent across the line. */
  h: number;
  /** Unit vector of the reading direction (left → right). */
  ux: number;
  uy: number;
  score: number;
}

export interface RecognizedLine {
  box: TextBox;
  text: string;
  confidence: number;
}

export const DET_MEAN = [0.485, 0.456, 0.406];
export const DET_STD = [0.229, 0.224, 0.225];
export const REC_HEIGHT = 48;
export const REC_MIN_WIDTH = 320;
export const REC_MAX_WIDTH = 3200;

// ── fp16 ───────────────────────────────────────────────────────────────────

const f32 = new Float32Array(1);
const u32 = new Uint32Array(f32.buffer);

/** IEEE 754 binary16 bits for a float (round to nearest even). */
export function toHalf(value: number): number {
  f32[0] = value;
  const x = u32[0];
  const sign = (x >>> 16) & 0x8000;
  let exp = (x >>> 23) & 0xff;
  let mant = x & 0x7fffff;
  if (exp === 0xff) return sign | 0x7c00 | (mant ? 0x200 : 0);
  exp = exp - 127 + 15;
  if (exp >= 0x1f) return sign | 0x7c00;
  if (exp <= 0) {
    if (exp < -10) return sign;
    mant |= 0x800000;
    const shift = 14 - exp;
    let half = mant >> shift;
    const rem = mant & ((1 << shift) - 1);
    const mid = 1 << (shift - 1);
    if (rem > mid || (rem === mid && half & 1)) half++;
    return sign | half;
  }
  let half = sign | (exp << 10) | (mant >> 13);
  const rem = mant & 0x1fff;
  if (rem > 0x1000 || (rem === 0x1000 && half & 1)) half++;
  return half;
}

export function fromHalf(h: number): number {
  const sign = h & 0x8000 ? -1 : 1;
  const exp = (h >> 10) & 0x1f;
  const mant = h & 0x3ff;
  if (exp === 0) return sign * mant * 2 ** -24;
  if (exp === 0x1f) return mant ? NaN : sign * Infinity;
  return sign * (1 + mant / 1024) * 2 ** (exp - 15);
}

export function floatsToHalf(src: Float32Array): Uint16Array {
  const out = new Uint16Array(src.length);
  for (let i = 0; i < src.length; i++) out[i] = toHalf(src[i]);
  return out;
}

export function halfToFloats(src: Uint16Array): Float32Array {
  const table = halfTable();
  const out = new Float32Array(src.length);
  for (let i = 0; i < src.length; i++) out[i] = table[src[i]];
  return out;
}

let _halfTable: Float32Array | null = null;
function halfTable(): Float32Array {
  if (!_halfTable) {
    _halfTable = new Float32Array(65536);
    for (let i = 0; i < 65536; i++) _halfTable[i] = fromHalf(i);
  }
  return _halfTable;
}

// ── Detection input ────────────────────────────────────────────────────────

/** Size the detector runs at: long side ≤ maxSide, both sides multiples of 32. */
export function detectionSize(width: number, height: number, maxSide: number): { width: number; height: number } {
  const r = Math.min(1, maxSide / Math.max(width, height));
  const round32 = (v: number) => Math.max(32, Math.round((v * r) / 32) * 32);
  return { width: round32(width), height: round32(height) };
}

/** Bilinear sample of channel `c` at (x, y) with edge clamping. */
function sample(img: Rgba, x: number, y: number, c: number): number {
  const { data, width, height } = img;
  const xc = x < 0 ? 0 : x > width - 1 ? width - 1 : x;
  const yc = y < 0 ? 0 : y > height - 1 ? height - 1 : y;
  const x0 = xc | 0, y0 = yc | 0;
  const x1 = x0 + 1 < width ? x0 + 1 : x0, y1 = y0 + 1 < height ? y0 + 1 : y0;
  const fx = xc - x0, fy = yc - y0;
  const a = data[(y0 * width + x0) * 4 + c], b = data[(y0 * width + x1) * 4 + c];
  const d = data[(y1 * width + x0) * 4 + c], e = data[(y1 * width + x1) * 4 + c];
  return (a + (b - a) * fx) * (1 - fy) + (d + (e - d) * fx) * fy;
}

/**
 * NCHW float input for the detector (BGR order, ImageNet normalization),
 * resized with an area-averaging box filter when shrinking so thin pen
 * strokes don't vanish.
 */
export function detectionInput(img: Rgba, width: number, height: number): Float32Array {
  const out = new Float32Array(3 * width * height);
  const plane = width * height;
  const sx = img.width / width, sy = img.height / height;
  const { data } = img;
  const bgr = [2, 1, 0];
  for (let y = 0; y < height; y++) {
    const ya = y * sy, yb = Math.min(img.height, (y + 1) * sy);
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      if (sx <= 1 && sy <= 1) {
        const px = (x + 0.5) * sx - 0.5, py = (y + 0.5) * sy - 0.5;
        r = sample(img, px, py, 0);
        g = sample(img, px, py, 1);
        b = sample(img, px, py, 2);
      } else {
        const xa = x * sx, xb = Math.min(img.width, (x + 1) * sx);
        let n = 0;
        for (let yy = Math.floor(ya); yy < Math.ceil(yb); yy++) {
          for (let xx = Math.floor(xa); xx < Math.ceil(xb); xx++) {
            const i = (yy * img.width + xx) * 4;
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            n++;
          }
        }
        r /= n;
        g /= n;
        b /= n;
      }
      const o = y * width + x;
      const rgb = [r, g, b];
      for (let c = 0; c < 3; c++) {
        out[c * plane + o] = (rgb[bgr[c]] / 255 - DET_MEAN[c]) / DET_STD[c];
      }
    }
  }
  return out;
}

// ── DB post-processing ─────────────────────────────────────────────────────

interface Pt {
  x: number;
  y: number;
}

function cross(o: Pt, a: Pt, b: Pt) {
  return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
}

/** Andrew's monotone chain. */
export function convexHull(points: Pt[]): Pt[] {
  const p = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
  if (p.length < 3) return p;
  const lower: Pt[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: Pt[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/** Minimum-area enclosing rectangle of a convex polygon (rotating edges). */
export function minAreaRect(hull: Pt[]): { cx: number; cy: number; w: number; h: number; ux: number; uy: number } {
  if (hull.length === 1) return { cx: hull[0].x, cy: hull[0].y, w: 0, h: 0, ux: 1, uy: 0 };
  let best = { area: Infinity, cx: 0, cy: 0, w: 0, h: 0, ux: 1, uy: 0 };
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i], b = hull[(i + 1) % hull.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len === 0) continue;
    const ux = (b.x - a.x) / len, uy = (b.y - a.y) / len;
    let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;
    for (const q of hull) {
      const u = q.x * ux + q.y * uy;
      const v = -q.x * uy + q.y * ux;
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    const area = (maxU - minU) * (maxV - minV);
    if (area < best.area) {
      const mu = (minU + maxU) / 2, mv = (minV + maxV) / 2;
      best = { area, cx: mu * ux - mv * uy, cy: mu * uy + mv * ux, w: maxU - minU, h: maxV - minV, ux, uy };
    }
  }
  return best;
}

/** Make the long side the reading direction and point it rightwards. */
function orient(r: { cx: number; cy: number; w: number; h: number; ux: number; uy: number }) {
  let { w, h, ux, uy } = r;
  // Prefer the axis closer to horizontal as the reading direction, unless the
  // box is clearly taller than wide along it (a vertical line of text).
  if (Math.abs(uy) > Math.abs(ux)) {
    [ux, uy] = [-uy, ux];
    [w, h] = [h, w];
  }
  if (ux < 0) {
    ux = -ux;
    uy = -uy;
  }
  return { cx: r.cx, cy: r.cy, w, h, ux, uy };
}

export interface DbOptions {
  threshold?: number;
  boxThreshold?: number;
  unclipRatio?: number;
  maxCandidates?: number;
}

/**
 * Text boxes from the detector's probability map (`width × height`), scaled
 * to the source image by `scaleX`/`scaleY`.
 */
export function boxesFromProbability(
  prob: Float32Array,
  width: number,
  height: number,
  scaleX: number,
  scaleY: number,
  { threshold = 0.3, boxThreshold = 0.6, unclipRatio = 1.5, maxCandidates = 3000 }: DbOptions = {},
): TextBox[] {
  const n = width * height;
  const label = new Int32Array(n);
  const stack = new Int32Array(n);
  const boxes: TextBox[] = [];
  let next = 0;
  for (let start = 0; start < n && next < maxCandidates; start++) {
    if (label[start] || prob[start] <= threshold) continue;
    next++;
    // Flood fill (8-connected), tracking each row's extreme pixels for the hull.
    let sp = 0, count = 0, sum = 0;
    stack[sp++] = start;
    label[start] = next;
    const rowMin = new Map<number, number>();
    const rowMax = new Map<number, number>();
    while (sp) {
      const i = stack[--sp];
      const x = i % width, y = (i - x) / width;
      count++;
      sum += prob[i];
      const mn = rowMin.get(y);
      if (mn === undefined || x < mn) rowMin.set(y, x);
      const mx = rowMax.get(y);
      if (mx === undefined || x > mx) rowMax.set(y, x);
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if ((dx === 0 && dy === 0) || xx < 0 || xx >= width) continue;
          const j = yy * width + xx;
          if (!label[j] && prob[j] > threshold) {
            label[j] = next;
            stack[sp++] = j;
          }
        }
      }
    }
    if (count < 4 || sum / count < boxThreshold) continue;
    const pts: Pt[] = [];
    rowMin.forEach((x, y) => {
      pts.push({ x, y }, { x, y: y + 1 });
      const xm = rowMax.get(y)! + 1;
      pts.push({ x: xm, y }, { x: xm, y: y + 1 });
    });
    const rect = minAreaRect(convexHull(pts));
    if (Math.min(rect.w, rect.h) < 3) continue;
    // Unclip: the detector predicts a shrunk text kernel; grow it back.
    const area = rect.w * rect.h;
    const d = (area * unclipRatio) / (2 * (rect.w + rect.h));
    const grown = orient({ ...rect, w: rect.w + 2 * d, h: rect.h + 2 * d });
    // Map to source pixels (axes scale independently).
    const ex = grown.ux * scaleX, ey = grown.uy * scaleY;
    const el = Math.hypot(ex, ey);
    const nx = -grown.uy * scaleX, ny = grown.ux * scaleY;
    const nl = Math.hypot(nx, ny);
    const box: TextBox = {
      cx: grown.cx * scaleX,
      cy: grown.cy * scaleY,
      w: grown.w * el,
      h: grown.h * nl,
      ux: ex / el,
      uy: ey / el,
      score: sum / count,
    };
    if (Math.min(box.w, box.h) < 5) continue;
    boxes.push(box);
  }
  return boxes;
}

// ── Recognition input ──────────────────────────────────────────────────────

/** Recognizer input width for a box (content width, then padded to ≥ 320). */
export function recognitionWidth(box: TextBox): { content: number; tensor: number } {
  const vertical = box.h / Math.max(1, box.w) >= 1.5;
  const [w, h] = vertical ? [box.h, box.w] : [box.w, box.h];
  const content = Math.min(REC_MAX_WIDTH, Math.max(8, Math.ceil((REC_HEIGHT * w) / Math.max(1, h))));
  return { content, tensor: Math.max(REC_MIN_WIDTH, content) };
}

/**
 * Write the box's pixels, de-rotated and scaled to 48 px high, into `out` (a
 * [3, 48, tensorWidth] BGR plane set normalized to [-1, 1], zero padded).
 */
export function cropLine(img: Rgba, box: TextBox, out: Float32Array, tensorWidth: number, contentWidth: number) {
  const vertical = box.h / Math.max(1, box.w) >= 1.5;
  // Reading axis (u) and line-height axis (v), in source pixels.
  let ux = box.ux, uy = box.uy, vx = -box.uy, vy = box.ux, len = box.w, thick = box.h;
  if (vertical) {
    // Like PaddleOCR's np.rot90: read top → bottom.
    [ux, uy, vx, vy] = [vx, vy, -ux, -uy];
    [len, thick] = [thick, len];
  }
  const plane = REC_HEIGHT * tensorWidth;
  out.fill(0, 0, 3 * plane);
  const stepU = len / contentWidth, stepV = thick / REC_HEIGHT;
  // Average a few samples per output pixel when shrinking a lot.
  const su = Math.max(1, Math.min(4, Math.round(stepU))), sv = Math.max(1, Math.min(4, Math.round(stepV)));
  const ox = box.cx - (ux * len) / 2 - (vx * thick) / 2;
  const oy = box.cy - (uy * len) / 2 - (vy * thick) / 2;
  for (let y = 0; y < REC_HEIGHT; y++) {
    for (let x = 0; x < contentWidth; x++) {
      let r = 0, g = 0, b = 0;
      for (let j = 0; j < sv; j++) {
        const v = (y + (j + 0.5) / sv) * stepV;
        for (let i = 0; i < su; i++) {
          const u = (x + (i + 0.5) / su) * stepU;
          const px = ox + ux * u + vx * v - 0.5, py = oy + uy * u + vy * v - 0.5;
          r += sample(img, px, py, 0);
          g += sample(img, px, py, 1);
          b += sample(img, px, py, 2);
        }
      }
      const k = 1 / (su * sv * 127.5);
      const o = y * tensorWidth + x;
      out[o] = b * k - 1;
      out[plane + o] = g * k - 1;
      out[2 * plane + o] = r * k - 1;
    }
  }
}

// ── CTC decoding ───────────────────────────────────────────────────────────

/**
 * Greedy CTC decode of `[steps, classes]` scores. `alphabet[0]` is the blank;
 * the last class is a space.
 */
export function ctcDecode(scores: Float32Array, steps: number, classes: number, alphabet: string[]): { text: string; confidence: number } {
  let text = "";
  let conf = 0, n = 0, last = -1;
  for (let t = 0; t < steps; t++) {
    let best = 0, bestScore = -Infinity;
    const row = t * classes;
    for (let c = 0; c < classes; c++) {
      const s = scores[row + c];
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }
    if (best !== 0 && best !== last) {
      text += alphabet[best] ?? "";
      conf += bestScore;
      n++;
    }
    last = best;
  }
  return { text: text.replace(/\s+/g, " ").trim(), confidence: n ? conf / n : 0 };
}

/** Alphabet for the recognizer: blank, the dictionary, then a space. */
export function buildAlphabet(characters: string[]): string[] {
  return ["", ...characters, " "];
}

// ── Reading order ──────────────────────────────────────────────────────────

export interface TextLine {
  /** Boxes of one visual line, left to right. */
  items: RecognizedLine[];
  text: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
  height: number;
}

function vExtent(b: TextBox): { top: number; bottom: number } {
  const half = Math.abs(b.uy * b.w) / 2 + Math.abs(b.ux * b.h) / 2;
  return { top: b.cy - half, bottom: b.cy + half };
}

/**
 * Group recognized boxes into visual lines (overlapping vertically, allowing
 * for a slight slant), sorted top to bottom and left to right.
 */
export function groupLines(items: RecognizedLine[]): TextLine[] {
  const sorted = items.filter((i) => i.text).sort((a, b) => a.box.cy - b.box.cy);
  const lines: { items: RecognizedLine[]; cy: number; h: number; slope: number }[] = [];
  for (const it of sorted) {
    const b = it.box;
    let target: (typeof lines)[number] | null = null;
    let bestDist = Infinity;
    for (const l of lines) {
      // Expected centre of the line at this box's x, following the line's slant.
      const ref = l.items[l.items.length - 1].box;
      const expected = ref.cy + l.slope * (b.cx - ref.cx);
      const dist = Math.abs(expected - b.cy);
      if (dist < Math.min(l.h, b.h) * 0.5 && dist < bestDist) {
        bestDist = dist;
        target = l;
      }
    }
    if (target) {
      target.items.push(it);
      target.items.sort((p, q) => p.box.cx - q.box.cx);
      target.cy = target.items.reduce((s, p) => s + p.box.cy, 0) / target.items.length;
      target.h = Math.max(target.h, b.h);
    } else {
      lines.push({ items: [it], cy: b.cy, h: b.h, slope: b.ux ? b.uy / b.ux : 0 });
    }
  }
  return lines
    .map((l) => {
      const ext = l.items.map((i) => vExtent(i.box));
      const top = Math.min(...ext.map((e) => e.top));
      const bottom = Math.max(...ext.map((e) => e.bottom));
      const halfW = (i: RecognizedLine) => (Math.abs(i.box.ux) * i.box.w) / 2;
      const left = Math.min(...l.items.map((i) => i.box.cx - halfW(i)));
      const right = Math.max(...l.items.map((i) => i.box.cx + halfW(i)));
      return { items: l.items, text: l.items.map((i) => i.text).join(" "), top, bottom, left, right, height: l.h };
    })
    .sort((a, b) => a.top + a.bottom - (b.top + b.bottom));
}

export type Layout = "lines" | "paragraphs";

/**
 * Plain text from lines: one output line per written line, or lines joined
 * into paragraphs. A paragraph ends at a large vertical gap, before an
 * indented line, or after a line that stops well short of the right margin;
 * words hyphenated at a line end are re-joined.
 */
export function assembleText(lines: TextLine[], layout: Layout): string {
  if (!lines.length) return "";
  const pick = (values: number[], q: number) => values.slice().sort((a, b) => a - b)[Math.floor((values.length - 1) * q)];
  const typical = pick(lines.map((l) => l.height), 0.5);
  const margin = pick(lines.map((l) => l.left), 0.2);
  const rightEdge = pick(lines.map((l) => l.right), 0.8);
  let out = lines[0].text;
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i];
    const prev = lines[i - 1];
    const newPara = l.top - prev.bottom > typical * 0.9;
    if (layout === "lines") {
      out += (newPara ? "\n\n" : "\n") + l.text;
      continue;
    }
    const indented = l.left - margin > typical * 1.2;
    const shortLine = rightEdge - prev.right > typical * 2.5;
    if (newPara || indented || shortLine) {
      out += "\n\n" + l.text;
    } else if (/\p{L}-$/u.test(out) && /^\p{Ll}/u.test(l.text)) {
      out = out.slice(0, -1) + l.text;
    } else {
      out += " " + l.text;
    }
  }
  return out;
}
