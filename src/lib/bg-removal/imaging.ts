/**
 * Small, allocation-conscious image math used by the background remover.
 * Everything here is pure (no DOM), so it runs in a Web Worker and in tests.
 *
 * Planes are single-channel Float32Arrays in row-major order.
 */

export interface Size {
  width: number;
  height: number;
}

/** Fit `size` inside a `max`-pixel longest side, never upscaling. */
export function fitWithin(size: Size, max: number): Size {
  const scale = Math.min(1, max / Math.max(size.width, size.height));
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

/** Fit `size` inside a pixel budget (width × height ≤ maxPixels), never upscaling. */
export function fitPixels(size: Size, maxPixels: number): Size {
  const pixels = size.width * size.height;
  if (pixels <= maxPixels) return { ...size };
  const scale = Math.sqrt(maxPixels / pixels);
  return {
    width: Math.max(1, Math.floor(size.width * scale)),
    height: Math.max(1, Math.floor(size.height * scale)),
  };
}

// ── Resampling ──────────────────────────────────────────────────────────────

interface Kernel {
  start: Int32Array;
  count: Int32Array;
  weights: Float32Array;
  stride: number;
}

/**
 * Antialiased triangle (bilinear) filter weights, the same scheme PIL uses for
 * `Image.resize(..., BILINEAR)`: when shrinking, the kernel widens so every
 * source pixel contributes, which avoids aliasing on large downscales.
 */
function triangleKernel(srcSize: number, dstSize: number): Kernel {
  const scale = srcSize / dstSize;
  const support = scale > 1 ? scale : 1;
  const stride = Math.ceil(support) * 2 + 1;
  const start = new Int32Array(dstSize);
  const count = new Int32Array(dstSize);
  const weights = new Float32Array(dstSize * stride);
  for (let i = 0; i < dstSize; i++) {
    const center = (i + 0.5) * scale;
    const lo = Math.max(0, Math.floor(center - support));
    const hi = Math.min(srcSize, Math.ceil(center + support));
    let total = 0;
    let n = 0;
    for (let j = lo; j < hi && n < stride; j++, n++) {
      const w = Math.max(0, 1 - Math.abs((j + 0.5 - center) / support));
      weights[i * stride + n] = w;
      total += w;
    }
    if (total > 0) for (let k = 0; k < n; k++) weights[i * stride + k] /= total;
    else if (n > 0) weights[i * stride] = 1;
    start[i] = lo;
    count[i] = n;
  }
  return { start, count, weights, stride };
}

/**
 * Resample interleaved RGBA bytes into three float planes (0–255) at
 * `dw × dh`. Reads the source directly so a 12 MP photo never needs a
 * full-resolution float copy.
 */
export function resampleRgbaToPlanes(
  rgba: Uint8Array | Uint8ClampedArray,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
): [Float32Array, Float32Array, Float32Array] {
  const kx = triangleKernel(sw, dw);
  const ky = triangleKernel(sh, dh);
  // Horizontal pass: sh rows × dw columns × 3 channels.
  const tmp = new Float32Array(dw * sh * 3);
  for (let y = 0; y < sh; y++) {
    const row = y * sw * 4;
    const out = y * dw * 3;
    for (let x = 0; x < dw; x++) {
      const s = kx.start[x];
      const n = kx.count[x];
      const wo = x * kx.stride;
      let r = 0, g = 0, b = 0;
      for (let k = 0; k < n; k++) {
        const w = kx.weights[wo + k];
        const p = row + (s + k) * 4;
        r += rgba[p] * w;
        g += rgba[p + 1] * w;
        b += rgba[p + 2] * w;
      }
      const o = out + x * 3;
      tmp[o] = r;
      tmp[o + 1] = g;
      tmp[o + 2] = b;
    }
  }
  // Vertical pass.
  const R = new Float32Array(dw * dh);
  const G = new Float32Array(dw * dh);
  const B = new Float32Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    const s = ky.start[y];
    const n = ky.count[y];
    const wo = y * ky.stride;
    for (let x = 0; x < dw; x++) {
      let r = 0, g = 0, b = 0;
      for (let k = 0; k < n; k++) {
        const w = ky.weights[wo + k];
        const p = ((s + k) * dw + x) * 3;
        r += tmp[p] * w;
        g += tmp[p + 1] * w;
        b += tmp[p + 2] * w;
      }
      const o = y * dw + x;
      R[o] = r;
      G[o] = g;
      B[o] = b;
    }
  }
  return [R, G, B];
}

/** Resample one float plane to `dw × dh` (antialiased when shrinking). */
export function resamplePlane(
  src: Float32Array,
  sw: number,
  sh: number,
  dw: number,
  dh: number,
): Float32Array {
  if (sw === dw && sh === dh) return src.slice();
  const kx = triangleKernel(sw, dw);
  const ky = triangleKernel(sh, dh);
  const tmp = new Float32Array(dw * sh);
  for (let y = 0; y < sh; y++) {
    const row = y * sw;
    for (let x = 0; x < dw; x++) {
      const s = kx.start[x];
      const n = kx.count[x];
      const wo = x * kx.stride;
      let v = 0;
      for (let k = 0; k < n; k++) v += src[row + s + k] * kx.weights[wo + k];
      tmp[y * dw + x] = v;
    }
  }
  const out = new Float32Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    const s = ky.start[y];
    const n = ky.count[y];
    const wo = y * ky.stride;
    for (let x = 0; x < dw; x++) {
      let v = 0;
      for (let k = 0; k < n; k++) v += tmp[(s + k) * dw + x] * ky.weights[wo + k];
      out[y * dw + x] = v;
    }
  }
  return out;
}

/**
 * Precomputed bilinear lookup from a coarse grid to a fine image, using
 * pixel-center alignment. Lets several grid planes be sampled per output
 * pixel without recomputing coordinates.
 */
export interface BilinearMap {
  x0: Int32Array;
  x1: Int32Array;
  fx: Float32Array;
  y0: Int32Array;
  y1: Int32Array;
  fy: Float32Array;
}

function axisMap(src: number, dst: number) {
  const i0 = new Int32Array(dst);
  const i1 = new Int32Array(dst);
  const f = new Float32Array(dst);
  const scale = src / dst;
  for (let i = 0; i < dst; i++) {
    let c = (i + 0.5) * scale - 0.5;
    if (c < 0) c = 0;
    if (c > src - 1) c = src - 1;
    const lo = Math.floor(c);
    i0[i] = lo;
    i1[i] = Math.min(src - 1, lo + 1);
    f[i] = c - lo;
  }
  return { i0, i1, f };
}

export function bilinearMap(src: Size, dst: Size): BilinearMap {
  const x = axisMap(src.width, dst.width);
  const y = axisMap(src.height, dst.height);
  return { x0: x.i0, x1: x.i1, fx: x.f, y0: y.i0, y1: y.i1, fy: y.f };
}

// ── Box filtering ──────────────────────────────────────────────────────────

/**
 * Mean filter over a (2r+1)² window, normalised by the number of in-bounds
 * pixels so borders aren't darkened. O(N) regardless of radius.
 */
export function boxBlur(src: Float32Array, w: number, h: number, r: number, out?: Float32Array): Float32Array {
  const dst = out ?? new Float32Array(w * h);
  if (r <= 0) {
    dst.set(src);
    return dst;
  }
  const tmp = new Float32Array(w * h);
  // Horizontal.
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    let count = 0;
    const first = Math.min(r, w - 1);
    for (let x = 0; x <= first; x++) {
      sum += src[row + x];
      count++;
    }
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / count;
      const add = x + r + 1;
      const remove = x - r;
      if (add < w) {
        sum += src[row + add];
        count++;
      }
      if (remove >= 0) {
        sum -= src[row + remove];
        count--;
      }
    }
  }
  // Vertical.
  const sums = new Float64Array(w);
  let count = 0;
  const first = Math.min(r, h - 1);
  for (let y = 0; y <= first; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) sums[x] += tmp[row + x];
    count++;
  }
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) dst[row + x] = sums[x] / count;
    const add = y + r + 1;
    const remove = y - r;
    if (add < h) {
      const ar = add * w;
      for (let x = 0; x < w; x++) sums[x] += tmp[ar + x];
      count++;
    }
    if (remove >= 0) {
      const rr = remove * w;
      for (let x = 0; x < w; x++) sums[x] -= tmp[rr + x];
      count--;
    }
  }
  return dst;
}

/** Elementwise product of two planes. */
export function mul(a: Float32Array, b: Float32Array, out?: Float32Array): Float32Array {
  const dst = out ?? new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) dst[i] = a[i] * b[i];
  return dst;
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
