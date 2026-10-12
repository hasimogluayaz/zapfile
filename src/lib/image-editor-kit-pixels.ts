/**
 * Worker-safe pixel helpers shared by the image editors (blur, photo filter,
 * watermark, meme). No DOM, no React: these run on the main thread for small
 * previews and inside Web Workers for full-resolution exports.
 */

/** Box sizes whose three passes approximate a Gaussian of the given sigma. */
export function boxesForGauss(sigma: number, n = 3): number[] {
  const wIdeal = Math.sqrt((12 * sigma * sigma) / n + 1);
  let wl = Math.floor(wIdeal);
  if (wl % 2 === 0) wl--;
  const wu = wl + 2;
  const mIdeal = (12 * sigma * sigma - n * wl * wl - 4 * n * wl - 3 * n) / (-4 * wl - 4);
  const m = Math.round(mIdeal);
  const sizes: number[] = [];
  for (let i = 0; i < n; i++) sizes.push(i < m ? wl : wu);
  return sizes;
}

/** One horizontal box pass with clamped (extended) edges. */
function boxH(src: Uint8ClampedArray, dst: Uint8ClampedArray, w: number, h: number, r: number) {
  const iarr = 1 / (r + r + 1);
  for (let y = 0; y < h; y++) {
    const row = y * w * 4;
    for (let c = 0; c < 4; c++) {
      const first = src[row + c];
      const last = src[row + (w - 1) * 4 + c];
      let acc = (r + 1) * first;
      for (let j = 0; j < r; j++) acc += src[row + Math.min(j, w - 1) * 4 + c];
      for (let x = 0; x < w; x++) {
        const addX = x + r;
        const subX = x - r - 1;
        acc += addX < w ? src[row + addX * 4 + c] : last;
        acc -= subX >= 0 ? src[row + subX * 4 + c] : first;
        dst[row + x * 4 + c] = acc * iarr;
      }
    }
  }
}

/** One vertical box pass with clamped (extended) edges. */
function boxV(src: Uint8ClampedArray, dst: Uint8ClampedArray, w: number, h: number, r: number) {
  const iarr = 1 / (r + r + 1);
  const stride = w * 4;
  for (let x = 0; x < w; x++) {
    for (let c = 0; c < 4; c++) {
      const col = x * 4 + c;
      const first = src[col];
      const last = src[(h - 1) * stride + col];
      let acc = (r + 1) * first;
      for (let j = 0; j < r; j++) acc += src[Math.min(j, h - 1) * stride + col];
      for (let y = 0; y < h; y++) {
        const addY = y + r;
        const subY = y - r - 1;
        acc += addY < h ? src[addY * stride + col] : last;
        acc -= subY >= 0 ? src[subY * stride + col] : first;
        dst[y * stride + col] = acc * iarr;
      }
    }
  }
}

/**
 * Gaussian-like blur (3 box passes) of RGBA pixels, in place. Edges are
 * extended, never mixed with transparent pixels, so borders stay solid.
 */
export function gaussianBlurRGBA(data: Uint8ClampedArray, w: number, h: number, sigma: number): void {
  if (sigma < 0.3 || w < 2 || h < 2) return;
  const tmp = new Uint8ClampedArray(data.length);
  for (const size of boxesForGauss(sigma)) {
    const r = Math.max(0, Math.min((size - 1) >> 1, Math.max(w, h)));
    if (r === 0) continue;
    boxH(data, tmp, w, h, r);
    boxV(tmp, data, w, h, r);
  }
}
