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
  /** Position of each character of `text` along the box, 0 (start) … 1 (end). */
  positions?: number[];
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
  /**
   * Height kept after unclipping. PaddleOCR keeps 1; 0.9 reads handwriting
   * better (fewer ascenders/descenders of the neighbouring lines in the
   * crop): 22.4 % → 20.9 % and 26.1 % → 23.0 % character errors on real
   * notebook photos, 6.4 % → 6.0 % over the whole test set.
   */
  heightScale?: number;
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
  { threshold = 0.3, boxThreshold = 0.6, unclipRatio = 1.5, heightScale = 0.9, maxCandidates = 3000 }: DbOptions = {},
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
    // Pixel centres, like OpenCV's contour-based minAreaRect in PaddleOCR.
    rowMin.forEach((x, y) => pts.push({ x, y }, { x: rowMax.get(y)!, y }));
    const rect = minAreaRect(convexHull(pts));
    if (Math.min(rect.w, rect.h) < 3) continue;
    // Unclip: the detector predicts a shrunk text kernel; grow it back.
    const area = rect.w * rect.h;
    const d = (area * unclipRatio) / (2 * (rect.w + rect.h));
    const grown = orient({ ...rect, w: rect.w + 2 * d, h: rect.h + 2 * d });
    // Thickness only: for a vertical line that's the box's width.
    if (grown.h / Math.max(1, grown.w) >= 1.5) grown.w *= heightScale;
    else grown.h *= heightScale;
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
export interface DecodeOptions {
  /**
   * Weight of the space class against blank/letters. Handwriting puts little
   * room between words, so the recognizer is often only 30–40 % sure of a
   * space that is there ("rainingnow").
   */
  spaceBoost?: number;
  /**
   * Inside a word that is mostly letters, a digit becomes the likeliest
   * letter at its time steps if that letter has at least this share of the
   * digit's probability ("d0" → "do"), and the other way round in numbers
   * ("1o" → "10").
   */
  typeRatio?: number;
}

const isDigit = (c: string) => c >= "0" && c <= "9";
const isLetter = (c: string) => /\p{L}/u.test(c);

/**
 * Greedy CTC decode of `[steps, classes]` probabilities (`alphabet[0]` is
 * the blank), with word-level consistency between letters and digits.
 */
export function ctcDecode(
  scores: Float32Array,
  steps: number,
  classes: number,
  alphabet: string[],
  { spaceBoost = 1, typeRatio = 0 }: DecodeOptions = {},
): { text: string; confidence: number; positions: number[]; spans: [number, number][] } {
  let space = -1;
  for (let c = 1; c < alphabet.length && c < classes; c++) if (alphabet[c] === " ") { space = c; break; }
  // Greedy path, remembering each emitted character's time steps.
  const chars: { cls: number; p: number; from: number; to: number }[] = [];
  let last = -1;
  for (let t = 0; t < steps; t++) {
    const row = t * classes;
    let best = 0, bestScore = -Infinity;
    for (let c = 0; c < classes; c++) {
      const v = c === space ? scores[row + c] * spaceBoost : scores[row + c];
      if (v > bestScore) {
        bestScore = v;
        best = c;
      }
    }
    if (best !== 0 && best === last && chars.length) chars[chars.length - 1].to = t;
    else if (best !== 0) chars.push({ cls: best, p: Math.min(1, scores[row + best]), from: t, to: t });
    last = best;
  }
  const out = chars.map((c) => alphabet[c.cls] ?? "");
  if (typeRatio > 0) {
    // Best class of a kind over a character's steps.
    const bestOf = (from: number, to: number, kind: (c: string) => boolean) => {
      let bc = -1, bp = 0;
      for (let t = from; t <= to; t++) {
        for (let c = 1; c < classes; c++) {
          const v = scores[t * classes + c];
          if (v > bp && kind(alphabet[c] ?? "")) {
            bp = v;
            bc = c;
          }
        }
      }
      return { bc, bp };
    };
    // Words: runs of letters and digits.
    let k = 0;
    while (k < out.length) {
      if (!isLetter(out[k]) && !isDigit(out[k])) {
        k++;
        continue;
      }
      let e = k;
      while (e < out.length && (isLetter(out[e]) || isDigit(out[e]))) e++;
      // Characters the recognizer is sure about decide whether the word is
      // letters or a number; the unsure ones of the other kind follow.
      const alts: { bc: number; bp: number }[] = [];
      let sureLetters = 0, sureDigits = 0;
      for (let q = k; q < e; q++) {
        const alt = bestOf(chars[q].from, chars[q].to, isDigit(out[q]) ? isLetter : isDigit);
        alts[q - k] = alt;
        if (alt.bp < typeRatio * chars[q].p) {
          if (isDigit(out[q])) sureDigits++;
          else sureLetters++;
        }
      }
      if (sureLetters !== sureDigits) {
        const wantLetters = sureLetters > sureDigits;
        for (let q = k; q < e; q++) {
          if (wantLetters !== isDigit(out[q])) continue;
          const alt = alts[q - k];
          if (alt.bc > 0 && alt.bp >= typeRatio * chars[q].p) out[q] = alphabet[alt.bc];
        }
      }
      k = e;
    }
  }
  const conf = chars.reduce((s, c) => s + c.p, 0);
  // Text with single spaces, and where each character sits along the line.
  let text = "";
  const positions: number[] = [];
  const spans: [number, number][] = [];
  out.forEach((ch, q) => {
    const blank = /\s/.test(ch);
    if (blank && (!text || text.endsWith(" "))) return;
    text += blank ? " " : ch;
    positions.push((chars[q].from + chars[q].to + 1) / 2 / steps);
    spans.push([chars[q].from, chars[q].to]);
  });
  if (text.endsWith(" ")) {
    text = text.slice(0, -1);
    positions.pop();
    spans.pop();
  }
  return { text, confidence: chars.length ? conf / chars.length : 0, positions, spans };
}

/** Alphabet for the recognizer: blank, the dictionary, then a space. */
export function buildAlphabet(characters: string[]): string[] {
  return ["", ...characters, " "];
}

// ── Reading order ──────────────────────────────────────────────────────────

export interface TextLine {
  /** Boxes of one visual line (or of one part of it, see `row`), left to right. */
  items: RecognizedLine[];
  text: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
  height: number;
  /**
   * Index of the visual row. A row whose boxes are far apart horizontally
   * (two columns, a margin note) is split into several parts with the same row.
   */
  row: number;
}

function vExtent(b: TextBox): { top: number; bottom: number } {
  const half = Math.abs(b.uy * b.w) / 2 + Math.abs(b.ux * b.h) / 2;
  return { top: b.cy - half, bottom: b.cy + half };
}

const halfWidth = (i: RecognizedLine) => (Math.abs(i.box.ux) * i.box.w) / 2;

function makeLine(items: RecognizedLine[], height: number, row: number): TextLine {
  const ext = items.map((i) => vExtent(i.box));
  return {
    items,
    text: items.map((i) => i.text).join(" "),
    top: Math.min(...ext.map((e) => e.top)),
    bottom: Math.max(...ext.map((e) => e.bottom)),
    left: Math.min(...items.map((i) => i.box.cx - halfWidth(i))),
    right: Math.max(...items.map((i) => i.box.cx + halfWidth(i))),
    height,
    row,
  };
}

/** Horizontal gap (in line heights) that separates parts of a row. */
const PART_GAP = 2;

/**
 * Group recognized boxes into visual lines (overlapping vertically, allowing
 * for a slight slant), top to bottom; rows with a wide horizontal gap are
 * returned as separate parts, left to right.
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
  const rows = lines
    .map((l) => makeLine(l.items, l.h, 0))
    .sort((a, b) => a.top + a.bottom - (b.top + b.bottom));
  const out: TextLine[] = [];
  rows.forEach((r, row) => {
    let part: RecognizedLine[] = [];
    r.items.forEach((it, k) => {
      if (k > 0) {
        const prev = r.items[k - 1];
        const gap = it.box.cx - halfWidth(it) - (prev.box.cx + halfWidth(prev));
        if (gap > PART_GAP * r.height) {
          out.push(makeLine(part, r.height, row));
          part = [];
        }
      }
      part.push(it);
    });
    out.push(makeLine(part, r.height, row));
  });
  return out;
}

// ── Clean-up of note-taking conventions ────────────────────────────────────

/** Words that follow the pronoun "I" (a lone "1" or "l" before them is an "I"). */
const AFTER_I = new Set(
  ("am do don't did didn't have haven't had hadn't will won't would wouldn't can can't could couldn't should shouldn't must " +
    "may might was wasn't always never often usually sometimes also just really still think thought like liked love loved " +
    "want wanted know knew need needed go went get got live lived see saw feel felt hope believe mean meant said say said " +
    "agree remember forgot forget play played work worked study studied went came come make made take took give gave " +
    "found find tried try hate hated prefer").split(" "),
);
/** Marks that start bullet lines in notes, as the recognizer tends to read "↳". */
const HOOK_BULLETS = new Set(["L", "L)", "L>", "Ly", "Lу", "4", "Ь", "ь", "Ly)", "L,"]);

/**
 * Fix what the recognizer predictably gets wrong in notes: hand-drawn arrows
 * ("-)" → "→"), the pronoun I written as a single stroke ("l'm", "1 always"),
 * and hook bullets ("L)" / "4" starting several lines → "↳").
 */
export function cleanNoteLines(texts: string[]): string[] {
  const fixed = texts.map((t) =>
    t
      // Arrows: "-)", "—)", "->", "-→", "=>" at the start of a word.
      .replace(/(^|[\s(])[-—–=]+\s?[)>→]\s*/g, "$1→ ")
      // An arrow whose shaft was lost: a line starting with ")" or ">".
      .replace(/^\s*[)>]\s*(?=\p{L})/u, "→ ")
      .replace(/→\s*/g, "→ ")
      // A dot bullet read as a full stop or middle dot: ". Item" → "• Item".
      .replace(/^\s*[.·∙●]\s*(?=\p{L})/u, "• ")
      // Contractions of I.
      .replace(/(^|[^\p{L}\d])[l1|]'(m|ve|d|ll)\b/gu, "$1I'$2")
      // A lone l or | is I; a lone 1 is I before a word that follows I.
      .replace(/(^|[\s(→"“])[l|](?=\s+\p{L})/gu, "$1I")
      // (only at the start of a line, clause or bracket: "Step 1 do this" keeps its number).
      .replace(/(^|[(→"“]\s*|[.!?,;:]\s+)1(?=\s+(\p{Ll}[\p{L}']*))/gu, (m, pre: string, next: string) => (AFTER_I.has(next) ? `${pre}I` : m))
      // "I" run into the next word: "(1do)", "Ido", "lam" → "I do", "I am".
      .replace(/(^|[\s(→"“])[1l|I](\p{Ll}+)(?=$|[\s).,!?;:])/gu, (m, pre: string, rest: string) => (AFTER_I.has(rest) ? `${pre}I ${rest}` : m))
      .replace(/\s+/g, " ")
      .trim(),
  );
  // Marks like these starting two or more lines are bullets, not words.
  // A "4" counts when a letter-like hook ("L)") is on the page too, or when it
  // starts a sentence ("4 It would be nice…"): a list of quantities
  // ("4 eggs", "4 Eier") stays as it is.
  const first = (t: string) => (t.includes(" ") ? t.split(" ")[0] : "");
  const letterHook = fixed.some((t) => HOOK_BULLETS.has(first(t)) && first(t) !== "4");
  const sentence = (t: string) => /^4 \p{Lu}/u.test(t) && t.split(" ").length >= 5;
  const isHook = (t: string) => HOOK_BULLETS.has(first(t)) && (first(t) !== "4" || letterHook || sentence(t));
  const hooks = fixed.filter(isHook).length;
  return fixed.map((t) => (hooks >= 2 && isHook(t) ? "↳" + t.slice(first(t).length) : t));
}

// ── Margin marks ───────────────────────────────────────────────────────────

/** Characters of a box's text, without spaces. */
const inkLength = (t: string) => [...t.replace(/\s/g, "")].length;

/**
 * Drop marks that aren't writing: the rings of a spiral binding or punched
 * holes, read as a column of stray one- or two-character "words" ("9", "a",
 * "0") beside the text, and single characters read with almost no confidence.
 * A numbered list in the margin reads with high confidence and stays.
 */
export function dropMarginMarks<T extends RecognizedLine>(lines: T[]): T[] {
  const small = (l: T) => inkLength(l.text) <= 2 && l.box.w <= 2.2 * l.box.h;
  const text = lines.filter((l) => l.text && !small(l));
  if (text.length < 3) return lines;
  const heights = text.map((l) => l.box.h).sort((a, b) => a - b);
  const typical = heights[Math.floor(heights.length / 2)];
  const lefts = text.map((l) => l.box.cx - halfWidth(l)).sort((a, b) => a - b);
  const rights = text.map((l) => l.box.cx + halfWidth(l)).sort((a, b) => a - b);
  const leftEdge = lefts[Math.floor((lefts.length - 1) * 0.2)];
  const rightEdge = rights[Math.floor((rights.length - 1) * 0.8)];
  const drop = new Set<T>();
  const marks = lines.filter((l) => l.text && small(l));
  // Columns of marks outside the text block.
  const used = new Set<T>();
  for (const m of marks) {
    if (used.has(m)) continue;
    const column = marks.filter((o) => !used.has(o) && Math.abs(o.box.cx - m.box.cx) < typical * 1.5);
    column.forEach((o) => used.add(o));
    const outside = column.every((o) => o.box.cx + halfWidth(o) < leftEdge || o.box.cx - halfWidth(o) > rightEdge);
    const confidence = column.reduce((s, o) => s + o.confidence, 0) / column.length;
    if (column.length >= 3 && outside && confidence < 0.75) column.forEach((o) => drop.add(o));
  }
  for (const m of marks) if (inkLength(m.text) === 1 && m.confidence < 0.3) drop.add(m);
  return drop.size ? lines.filter((l) => !drop.has(l)) : lines;
}

// ── Assembly ───────────────────────────────────────────────────────────────

export type Layout = "lines" | "paragraphs";

/** Lines of one column (or of the whole page) as text. */
function assembleStream(lines: TextLine[], layout: Layout): string {
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

/**
 * Text of a row's boxes cut at a wide space whose next word starts where the
 * right column starts (`columnLeft`, within `tolerance`), using character positions.
 */
function splitBoxText(items: RecognizedLine[], columnLeft: number, tolerance: number, minGap: number): [string, string] | null {
  let best: { item: number; at: number; d: number } | null = null;
  items.forEach((it, k) => {
    const pos = it.positions;
    const chars = [...it.text];
    if (!pos || pos.length !== chars.length) return;
    const start = it.box.cx - (it.box.ux * it.box.w) / 2;
    const xAt = (q: number) => start + pos[q] * it.box.w * it.box.ux;
    chars.forEach((ch, q) => {
      if (ch !== " " || q === 0 || q + 1 >= chars.length) return;
      if (xAt(q + 1) - xAt(q - 1) < minGap) return; // an ordinary word space
      const d = Math.abs(xAt(q + 1) - columnLeft);
      if (d < tolerance && (!best || d < best.d)) best = { item: k, at: q, d };
    });
  });
  if (!best) return null;
  const { item, at } = best as { item: number; at: number };
  const chars = [...items[item].text];
  const before = [...items.slice(0, item).map((i) => i.text), chars.slice(0, at).join("")].join(" ").trim();
  const after = [chars.slice(at + 1).join(""), ...items.slice(item + 1).map((i) => i.text)].join(" ").trim();
  return before && after ? [before, after] : null;
}

/**
 * Plain text from lines: one output line per written line, or lines joined
 * into paragraphs (a paragraph ends at a large vertical gap, before an
 * indented line, or after a line that stops well short of the right margin;
 * words hyphenated at a line end are re-joined).
 *
 * Two or more consecutive rows split at the same place are read as columns:
 * the left column first, then the right one (side-by-side lists, margin
 * notes). Other split rows are read left to right.
 */
export function assembleText(lines: TextLine[], layout: Layout): string {
  if (!lines.length) return "";
  const cleaned = cleanNoteLines(lines.map((l) => l.text));
  const parts = lines.map((l, i) => ({ ...l, text: cleaned[i] }));
  const rows: TextLine[][] = [];
  for (const p of parts) {
    if (rows.length && rows[rows.length - 1][0].row === p.row) rows[rows.length - 1].push(p);
    else rows.push([p]);
  }
  const typical = parts.map((l) => l.height).sort((a, b) => a - b)[Math.floor((parts.length - 1) / 2)];
  /** The row's widest gap: where its right part starts. */
  const splitOf = (r: TextLine[]) => {
    let best = 1, gap = -Infinity;
    for (let k = 1; k < r.length; k++) {
      const g = r[k].left - r[k - 1].right;
      if (g > gap) {
        gap = g;
        best = k;
      }
    }
    return { at: best, rightLeft: r[best].left };
  };
  const merge = (r: TextLine[]): TextLine => (r.length === 1 ? r[0] : { ...makeLine(r.flatMap((p) => p.items), r[0].height, r[0].row), text: r.map((p) => p.text).join(" ") });

  const streams: TextLine[][] = [];
  let cur: TextLine[] = [];
  let i = 0;
  while (i < rows.length) {
    if (rows[i].length >= 2) {
      // Columns are aligned on the right column's left edge.
      const column = splitOf(rows[i]).rightLeft;
      const left: TextLine[] = [], right: TextLine[] = [];
      let j = i, split2 = 0;
      for (; j < rows.length; j++) {
        const r = rows[j];
        if (r.length >= 2) {
          const s = splitOf(r);
          if (Math.abs(s.rightLeft - column) > typical * 3) break;
          left.push(merge(r.slice(0, s.at)));
          right.push(merge(r.slice(s.at)));
          split2++;
          continue;
        }
        const line = r[0];
        if (line.right < column + typical * 0.5) {
          left.push(line);
          continue;
        }
        if (line.left > column - typical * 1.5) {
          right.push(line);
          continue;
        }
        // Columns close together: split at a box that starts at the column…
        const items = line.items;
        let at = -1;
        for (let k = 1; k < items.length; k++) {
          if (Math.abs(items[k].box.cx - halfWidth(items[k]) - column) < typical * 1.5) at = k;
        }
        if (at >= 0) {
          const [lt, rt] = cleanNoteLines([items.slice(0, at), items.slice(at)].map((g) => g.map((x) => x.text).join(" ")));
          left.push({ ...makeLine(items.slice(0, at), line.height, line.row), text: lt });
          right.push({ ...makeLine(items.slice(at), line.height, line.row), text: rt });
        } else {
          // …or inside one box, at a wide space where a word starts at the column.
          const cut = splitBoxText(items, column, typical * 1.5, typical * 1.5);
          if (!cut) break;
          const [lt, rt] = cleanNoteLines(cut);
          left.push({ ...line, right: column, text: lt });
          right.push({ ...line, left: column, text: rt });
        }
        split2++;
      }
      if (split2 >= 2) {
        if (cur.length) streams.push(cur);
        cur = [];
        streams.push(left, right);
        i = j;
        continue;
      }
    }
    cur.push(merge(rows[i]));
    i++;
  }
  if (cur.length) streams.push(cur);
  return streams
    .map((s) => assembleStream(s, layout))
    .filter(Boolean)
    .join("\n\n");
}

// ── Orientation ────────────────────────────────────────────────────────────

/** The image turned clockwise by 90, 180 or 270 degrees. */
export function rotateRgba(img: Rgba, degrees: 90 | 180 | 270): Rgba {
  const { width: w, height: h } = img;
  const src = new Uint32Array(img.data.buffer, img.data.byteOffset, w * h);
  const turned = degrees !== 180;
  const ow = turned ? h : w, oh = turned ? w : h;
  const out = new Uint32Array(ow * oh);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = src[y * w + x];
      if (degrees === 90) out[x * ow + (h - 1 - y)] = p;
      else if (degrees === 180) out[(h - 1 - y) * ow + (w - 1 - x)] = p;
      else out[(w - 1 - x) * ow + y] = p;
    }
  }
  return { data: new Uint8ClampedArray(out.buffer), width: ow, height: oh };
}

/** Share of the text (by length) in boxes that read vertically: a page photographed sideways. */
export function verticalShare(boxes: TextBox[]): number {
  let v = 0, all = 0;
  for (const b of boxes) {
    const len = Math.max(b.w, b.h);
    all += len;
    if (b.h / Math.max(1, b.w) >= 1.5) v += len;
  }
  return all ? v / all : 0;
}

/** The same box read the other way round (the page upside down). */
export function flipBox(b: TextBox): TextBox {
  return { ...b, ux: -b.ux, uy: -b.uy };
}
