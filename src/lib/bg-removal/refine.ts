/**
 * Turns a raw segmentation map into a production-quality cutout.
 *
 * The model sees the photo at 1024×1024, so its mask is soft and slightly
 * misaligned at full resolution, and edge pixels still carry the colour of
 * the old background. The pipeline fixes that in four steps, all computed on
 * a coarse "grid" (≤1024 px) and applied per full-resolution pixel in one pass:
 *
 *   1. cleanup     — drop floating specks/haze, fill tiny low-confidence holes
 *   2. edge refine — colour guided filter (He et al.), so the alpha follows
 *                    real edges in the full-resolution photo; applied only in
 *                    the uncertain band around the subject's outline
 *   3. levels      — snap near-0 / near-1 alpha so solid areas are solid
 *   4. decontam    — blur-fusion foreground estimation (Forte & Pitié 2021)
 *                    removes background colour spill from semi-transparent
 *                    edge pixels (no more grey/green halos around hair)
 */
import {
  bilinearMap,
  boxBlur,
  clamp01,
  fitWithin,
  mul,
  resamplePlane,
  resampleRgbaToPlanes,
  type Size,
} from "./imaging";

export interface RefineOptions {
  /** Remove specks and haze not attached to the subject; fill tiny holes. */
  cleanup: boolean;
  /** Align the mask to edges in the full-resolution photo. */
  edgeRefine: boolean;
  /** Remove background colour bleeding into edge pixels. */
  decontaminate: boolean;
}

export const DEFAULT_REFINE: RefineOptions = {
  cleanup: true,
  edgeRefine: true,
  decontaminate: true,
};

/** Coarse working resolution (longest side). */
const GRID_MAX = 1024;

// ── Model output ────────────────────────────────────────────────────────────

/**
 * Convert model output to probabilities in [0, 1]. Some exports end in a
 * sigmoid, others emit logits; detect which from the value range. NaN/Inf
 * (seen with broken fp16 GPU kernels) are reported so the caller can retry
 * on another backend instead of returning garbage.
 */
export function toProbabilities(raw: Float32Array): { prob: Float32Array; valid: boolean } {
  let min = Infinity;
  let max = -Infinity;
  let bad = 0;
  for (let i = 0; i < raw.length; i++) {
    const v = raw[i];
    if (!Number.isFinite(v)) {
      bad++;
      continue;
    }
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const prob = new Float32Array(raw.length);
  const logits = min < -0.01 || max > 1.01;
  for (let i = 0; i < raw.length; i++) {
    const v = raw[i];
    if (!Number.isFinite(v)) prob[i] = 0;
    else prob[i] = logits ? 1 / (1 + Math.exp(-v)) : clamp01(v);
  }
  const valid = bad < raw.length * 0.001 && max > min;
  return { prob, valid };
}

/** Average of a mask and its horizontally flipped twin (test-time augmentation). */
export function averageWithFlipped(a: Float32Array, flipped: Float32Array, w: number, h: number): Float32Array {
  const out = new Float32Array(a.length);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) out[row + x] = (a[row + x] + flipped[row + w - 1 - x]) * 0.5;
  }
  return out;
}

// ── 1. Cleanup ──────────────────────────────────────────────────────────────

/**
 * Label 8-connected components of `mask[i] === 1`. Returns labels (0 = not in
 * set) and per-label pixel counts (index 0 unused).
 */
function labelComponents(mask: Uint8Array, w: number, h: number) {
  const labels = new Int32Array(w * h);
  const sizes: number[] = [0];
  const stack = new Int32Array(w * h);
  let next = 1;
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || labels[start]) continue;
    let top = 0;
    stack[top++] = start;
    labels[start] = next;
    let size = 0;
    while (top > 0) {
      const p = stack[--top];
      size++;
      const x = p % w;
      const y = (p - x) / w;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if ((dx === 0 && dy === 0) || nx < 0 || nx >= w) continue;
          const q = ny * w + nx;
          if (mask[q] && !labels[q]) {
            labels[q] = next;
            stack[top++] = q;
          }
        }
      }
    }
    sizes.push(size);
    next++;
  }
  return { labels, sizes };
}

/**
 * In-place mask cleanup on the grid.
 *
 * Islands: every region of visible alpha (> 0.05) is kept only if its solid
 * core (alpha > 0.5) is substantial — larger than 0.04 % of the image and
 * than 2 % of the main subject. That removes stray specks and floating haze
 * while keeping secondary subjects (a second person, a pet) intact.
 *
 * Holes: background regions enclosed by the subject are filled only when they
 * are tiny *and* the model was unsure about them (mean alpha ≥ 0.2). Real
 * openings — the gap under an arm, a ring, a fence — are confidently 0 and
 * stay transparent.
 */
export function cleanupMask(alpha: Float32Array, w: number, h: number): void {
  const n = w * h;
  const soft = new Uint8Array(n);
  const core = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    soft[i] = alpha[i] > 0.05 ? 1 : 0;
    core[i] = alpha[i] > 0.5 ? 1 : 0;
  }

  const softComp = labelComponents(soft, w, h);
  const coreArea = new Float64Array(softComp.sizes.length);
  for (let i = 0; i < n; i++) if (core[i]) coreArea[softComp.labels[i]]++;
  let largest = 0;
  for (let l = 1; l < coreArea.length; l++) largest = Math.max(largest, coreArea[l]);
  const minCore = Math.max(n * 0.0004, largest * 0.02);
  for (let i = 0; i < n; i++) {
    const l = softComp.labels[i];
    if (l && coreArea[l] < minCore) alpha[i] = 0;
  }

  const bg = new Uint8Array(n);
  for (let i = 0; i < n; i++) bg[i] = alpha[i] <= 0.5 ? 1 : 0;
  const holes = labelComponents(bg, w, h);
  const touchesBorder = new Uint8Array(holes.sizes.length);
  for (let x = 0; x < w; x++) {
    touchesBorder[holes.labels[x]] = 1;
    touchesBorder[holes.labels[(h - 1) * w + x]] = 1;
  }
  for (let y = 0; y < h; y++) {
    touchesBorder[holes.labels[y * w]] = 1;
    touchesBorder[holes.labels[y * w + w - 1]] = 1;
  }
  const sum = new Float64Array(holes.sizes.length);
  for (let i = 0; i < n; i++) if (holes.labels[i]) sum[holes.labels[i]] += alpha[i];
  const maxHole = n * 0.0002;
  for (let i = 0; i < n; i++) {
    const l = holes.labels[i];
    if (!l || touchesBorder[l]) continue;
    const size = holes.sizes[l];
    if (size <= maxHole && sum[l] / size >= 0.2) alpha[i] = 1;
  }
}

// ── 2. Guided filter ───────────────────────────────────────────────────────

interface GuidedCoefficients {
  aR: Float32Array;
  aG: Float32Array;
  aB: Float32Array;
  b: Float32Array;
}

/**
 * Colour guided filter coefficients (He, Sun & Tang). The output alpha at any
 * resolution is q = aR·R + aG·G + aB·B + b with I in [0, 1], so computing the
 * coefficients on the grid and evaluating them per full-resolution pixel is
 * the "fast guided filter" — edges come from the full-resolution photo.
 */
function guidedCoefficients(
  I: [Float32Array, Float32Array, Float32Array],
  p: Float32Array,
  w: number,
  h: number,
  r: number,
  eps: number,
): GuidedCoefficients {
  const [R, G, B] = I;
  const n = w * h;
  const t = new Float32Array(n);
  const box = (src: Float32Array) => boxBlur(src, w, h, r);
  const boxProduct = (a: Float32Array, b: Float32Array) => box(mul(a, b, t));

  const mR = box(R), mG = box(G), mB = box(B), mP = box(p);
  const rr = boxProduct(R, R), rg = boxProduct(R, G), rb = boxProduct(R, B);
  const gg = boxProduct(G, G), gb = boxProduct(G, B), bb = boxProduct(B, B);
  const rp = boxProduct(R, p), gp = boxProduct(G, p), bp = boxProduct(B, p);

  const aR = new Float32Array(n), aG = new Float32Array(n), aB = new Float32Array(n), b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const mr = mR[i], mg = mG[i], mb = mB[i], mp = mP[i];
    // Covariance of the guide (symmetric 3×3) + eps·I.
    const s00 = rr[i] - mr * mr + eps;
    const s01 = rg[i] - mr * mg;
    const s02 = rb[i] - mr * mb;
    const s11 = gg[i] - mg * mg + eps;
    const s12 = gb[i] - mg * mb;
    const s22 = bb[i] - mb * mb + eps;
    const cr = rp[i] - mr * mp;
    const cg = gp[i] - mg * mp;
    const cb = bp[i] - mb * mp;
    // Solve Σ·a = c via the adjugate.
    const i00 = s11 * s22 - s12 * s12;
    const i01 = s02 * s12 - s01 * s22;
    const i02 = s01 * s12 - s02 * s11;
    const i11 = s00 * s22 - s02 * s02;
    const i12 = s01 * s02 - s00 * s12;
    const i22 = s00 * s11 - s01 * s01;
    const det = s00 * i00 + s01 * i01 + s02 * i02;
    const inv = det !== 0 ? 1 / det : 0;
    const ar = (i00 * cr + i01 * cg + i02 * cb) * inv;
    const ag = (i01 * cr + i11 * cg + i12 * cb) * inv;
    const ab = (i02 * cr + i12 * cg + i22 * cb) * inv;
    aR[i] = ar;
    aG[i] = ag;
    aB[i] = ab;
    b[i] = mp - ar * mr - ag * mg - ab * mb;
  }
  return { aR: box(aR), aG: box(aG), aB: box(aB), b: box(b) };
}

/**
 * Where the guided filter may override the model: 1 on the subject's
 * outline, fading to 0 inside solid regions and in clear background, so
 * texture inside the subject can never punch holes into it.
 */
function edgeBand(p: Float32Array, w: number, h: number, r: number): Float32Array {
  const blurred = boxBlur(p, w, h, r);
  const band = new Float32Array(p.length);
  for (let i = 0; i < p.length; i++) {
    const u = 1 - Math.abs(2 * blurred[i] - 1); // 0 when uniformly 0 or 1
    band[i] = clamp01(u * 3);
  }
  return boxBlur(band, w, h, Math.max(1, r >> 1));
}

// ── 3. Levels ──────────────────────────────────────────────────────────────

const LEVEL_LO = 0.015;
const LEVEL_HI = 0.985;

function levels(a: number): number {
  return clamp01((a - LEVEL_LO) / (LEVEL_HI - LEVEL_LO));
}

// ── 4. Foreground estimation ───────────────────────────────────────────────

interface ForegroundPlanes {
  F: [Float32Array, Float32Array, Float32Array];
  B: [Float32Array, Float32Array, Float32Array];
}

/**
 * Blur-fusion foreground estimation, two iterations (large then small
 * radius), as in "Approximate Fast Foreground Colour Estimation" (ICIP 2021).
 * Returns the *blurred* F and B of the final iteration; the per-pixel update
 * F = F̄ + α(I − αF̄ − (1−α)B̄) is applied at full resolution by the caller.
 */
function estimateForeground(
  I: [Float32Array, Float32Array, Float32Array],
  alpha: Float32Array,
  w: number,
  h: number,
  r1: number,
  r2: number,
): ForegroundPlanes {
  const n = w * h;
  const inv = new Float32Array(n);
  for (let i = 0; i < n; i++) inv[i] = 1 - alpha[i];
  const t = new Float32Array(n);

  const pass = (
    Fin: [Float32Array, Float32Array, Float32Array],
    Bin: [Float32Array, Float32Array, Float32Array],
    r: number,
  ) => {
    const ba = boxBlur(alpha, w, h, r);
    const Fb = Fin.map((c) => boxBlur(mul(c, alpha, t), w, h, r)) as [Float32Array, Float32Array, Float32Array];
    const Bb = Bin.map((c) => boxBlur(mul(c, inv, t), w, h, r)) as [Float32Array, Float32Array, Float32Array];
    for (let i = 0; i < n; i++) {
      const fa = 1 / (ba[i] + 1e-5);
      const fb = 1 / (1 - ba[i] + 1e-5);
      for (let c = 0; c < 3; c++) {
        Fb[c][i] *= fa;
        Bb[c][i] *= fb;
      }
    }
    return { Fb, Bb };
  };

  const first = pass(I, I, r1);
  // F after the first iteration, at grid resolution.
  const F1 = [new Float32Array(n), new Float32Array(n), new Float32Array(n)] as [
    Float32Array,
    Float32Array,
    Float32Array,
  ];
  for (let i = 0; i < n; i++) {
    const a = alpha[i];
    for (let c = 0; c < 3; c++) {
      const fb = first.Fb[c][i];
      F1[c][i] = clamp01(fb + a * (I[c][i] - a * fb - (1 - a) * first.Bb[c][i]));
    }
  }
  const second = pass(F1, first.Bb, r2);
  return { F: second.Fb, B: second.Bb };
}

// ── Full pipeline ──────────────────────────────────────────────────────────

export interface CutoutResult {
  /** Straight (non-premultiplied) RGBA at the source resolution. */
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
}

/**
 * Build the final cutout from the model's probability map.
 *
 * @param source  RGBA pixels of the photo, at output resolution.
 * @param prob    model probabilities (`maskSize × maskSize`, any aspect).
 */
export function buildCutout(
  source: Uint8ClampedArray | Uint8Array,
  size: Size,
  prob: Float32Array,
  maskSize: Size,
  options: RefineOptions = DEFAULT_REFINE,
): CutoutResult {
  const { width: W, height: H } = size;
  const grid = fitWithin(size, GRID_MAX);
  const gw = grid.width;
  const gh = grid.height;
  const gn = gw * gh;

  // Coarse mask on an aspect-correct grid.
  const p = resamplePlane(prob, maskSize.width, maskSize.height, gw, gh);
  for (let i = 0; i < gn; i++) p[i] = clamp01(p[i]);
  if (options.cleanup) cleanupMask(p, gw, gh);

  // The photo on the same grid, in [0, 1].
  const I = resampleRgbaToPlanes(source, W, H, gw, gh);
  for (const c of I) for (let i = 0; i < gn; i++) c[i] /= 255;

  // Grid-scale radii, expressed relative to a 1024 px grid.
  const unit = Math.max(gw, gh) / 1024;
  const guidedR = Math.max(1, Math.round(2 * unit));
  const bandR = Math.max(2, Math.round(6 * unit));

  let coef: GuidedCoefficients | null = null;
  let band: Float32Array | null = null;
  if (options.edgeRefine) {
    coef = guidedCoefficients(I, p, gw, gh, guidedR, 1e-4);
    band = edgeBand(p, gw, gh, bandR);
  }

  // Refined alpha on the grid (same formula as the full-resolution pass),
  // which drives foreground estimation.
  const alphaGrid = new Float32Array(gn);
  for (let i = 0; i < gn; i++) {
    let a = p[i];
    if (coef && band) {
      const q = coef.aR[i] * I[0][i] + coef.aG[i] * I[1][i] + coef.aB[i] * I[2][i] + coef.b[i];
      a = band[i] * clamp01(q) + (1 - band[i]) * a;
    }
    alphaGrid[i] = levels(a);
  }

  const fg = options.decontaminate
    ? estimateForeground(
        I,
        alphaGrid,
        gw,
        gh,
        Math.max(4, Math.round(45 * unit)),
        Math.max(1, Math.round(3 * unit)),
      )
    : null;

  // Full-resolution pass: every grid plane is sampled bilinearly once per pixel.
  const map = bilinearMap(grid, size);
  const out = new Uint8ClampedArray(W * H * 4);
  const sample = (plane: Float32Array, i00: number, i01: number, i10: number, i11: number, fx: number, fy: number) => {
    const top = plane[i00] + (plane[i01] - plane[i00]) * fx;
    const bottom = plane[i10] + (plane[i11] - plane[i10]) * fx;
    return top + (bottom - top) * fy;
  };

  for (let y = 0; y < H; y++) {
    const y0 = map.y0[y] * gw;
    const y1 = map.y1[y] * gw;
    const fy = map.fy[y];
    for (let x = 0; x < W; x++) {
      const x0 = map.x0[x];
      const x1 = map.x1[x];
      const fx = map.fx[x];
      const i00 = y0 + x0, i01 = y0 + x1, i10 = y1 + x0, i11 = y1 + x1;
      const o = (y * W + x) * 4;
      const r = source[o] / 255;
      const g = source[o + 1] / 255;
      const b = source[o + 2] / 255;

      let a = sample(p, i00, i01, i10, i11, fx, fy);
      if (coef && band) {
        const wBand = sample(band, i00, i01, i10, i11, fx, fy);
        if (wBand > 0.001) {
          const q =
            sample(coef.aR, i00, i01, i10, i11, fx, fy) * r +
            sample(coef.aG, i00, i01, i10, i11, fx, fy) * g +
            sample(coef.aB, i00, i01, i10, i11, fx, fy) * b +
            sample(coef.b, i00, i01, i10, i11, fx, fy);
          a = wBand * clamp01(q) + (1 - wBand) * a;
        }
      }
      a = levels(a);

      let fr = r, fgc = g, fb = b;
      if (fg && a < 0.999) {
        const Fr = sample(fg.F[0], i00, i01, i10, i11, fx, fy);
        const Fg = sample(fg.F[1], i00, i01, i10, i11, fx, fy);
        const Fb = sample(fg.F[2], i00, i01, i10, i11, fx, fy);
        const Br = sample(fg.B[0], i00, i01, i10, i11, fx, fy);
        const Bg = sample(fg.B[1], i00, i01, i10, i11, fx, fy);
        const Bb = sample(fg.B[2], i00, i01, i10, i11, fx, fy);
        fr = clamp01(Fr + a * (r - a * Fr - (1 - a) * Br));
        fgc = clamp01(Fg + a * (g - a * Fg - (1 - a) * Bg));
        fb = clamp01(Fb + a * (b - a * Fb - (1 - a) * Bb));
      }
      out[o] = fr * 255 + 0.5;
      out[o + 1] = fgc * 255 + 0.5;
      out[o + 2] = fb * 255 + 0.5;
      out[o + 3] = a * 255 + 0.5;
    }
  }
  return { rgba: out, width: W, height: H };
}
