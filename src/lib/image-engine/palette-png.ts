/**
 * Fast lossy PNG: build a ≤256-colour palette from a pixel sample (Wu's
 * quantizer via image-q), map every pixel with Floyd–Steinberg dithering and
 * a memoised nearest-colour lookup, and write an indexed PNG (PLTE + tRNS)
 * compressed with the browser's native zlib (CompressionStream).
 *
 * A 12 MP photo takes ~1–2 s instead of ~40 s with image-q's own mapper.
 */

type Palette = { r: Uint8Array; g: Uint8Array; b: Uint8Array; a: Uint8Array; size: number };

async function buildPalette(data: Uint8ClampedArray, pixels: number, colors: number): Promise<Palette> {
  const iq = await import("image-q");
  // ~250k pixel sample is plenty for the palette and keeps Wu fast.
  const step = Math.max(1, Math.floor(pixels / 250_000));
  const n = Math.ceil(pixels / step);
  const sample = new Uint8Array(n * 4);
  for (let i = 0, j = 0; i < pixels && j < n; i += step, j++) {
    sample.set(data.subarray(i * 4, i * 4 + 4), j * 4);
  }
  const container = iq.utils.PointContainer.fromUint8Array(sample, n, 1);
  const pal = iq.buildPaletteSync([container], {
    colors: Math.max(2, Math.min(256, colors)),
    paletteQuantization: "wuquant",
    colorDistanceFormula: "euclidean-bt709",
  });
  const points = pal.getPointContainer().getPointArray();
  const size = points.length;
  const p: Palette = { r: new Uint8Array(size), g: new Uint8Array(size), b: new Uint8Array(size), a: new Uint8Array(size), size };
  points.forEach((pt, i) => {
    p.r[i] = pt.r;
    p.g[i] = pt.g;
    p.b[i] = pt.b;
    p.a[i] = pt.a;
  });
  return p;
}

/** Map pixels to palette indices with Floyd–Steinberg error diffusion (RGB, opaque pixels). */
function mapPixels(data: Uint8ClampedArray, width: number, height: number, pal: Palette, dither: number): Uint8Array {
  const out = new Uint8Array(width * height);
  // Memo of nearest index per 5-5-5-3 bit RGBA key.
  const memo = new Int16Array(1 << 18).fill(-1);
  const nearest = (r: number, g: number, b: number, a: number) => {
    const key = ((r >> 3) << 13) | ((g >> 3) << 8) | ((b >> 3) << 3) | (a >> 5);
    const cached = memo[key];
    if (cached >= 0) return cached;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < pal.size; i++) {
      const dr = r - pal.r[i], dg = g - pal.g[i], db = b - pal.b[i], da = a - pal.a[i];
      // bt709-ish weights; alpha weighted strongly so transparency is preserved.
      const d = 0.2126 * dr * dr + 0.7152 * dg * dg + 0.0722 * db * db + 2 * da * da;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    memo[key] = best;
    return best;
  };

  if (dither <= 0) {
    for (let i = 0, p = 0; i < out.length; i++, p += 4) out[i] = nearest(data[p], data[p + 1], data[p + 2], data[p + 3]);
    return out;
  }

  // Two rows of float error buffers (current, next), RGB only.
  let cur = new Float32Array((width + 2) * 3);
  let nxt = new Float32Array((width + 2) * 3);
  for (let y = 0; y < height; y++) {
    nxt.fill(0);
    for (let x = 0; x < width; x++) {
      const p = (y * width + x) * 4;
      const a = data[p + 3];
      const e = (x + 1) * 3;
      let r = data[p], g = data[p + 1], b = data[p + 2];
      if (a > 0) {
        r = Math.max(0, Math.min(255, r + cur[e]));
        g = Math.max(0, Math.min(255, g + cur[e + 1]));
        b = Math.max(0, Math.min(255, b + cur[e + 2]));
      }
      const idx = nearest(r | 0, g | 0, b | 0, a);
      out[y * width + x] = idx;
      if (a === 0) continue;
      const er = (r - pal.r[idx]) * dither, eg = (g - pal.g[idx]) * dither, eb = (b - pal.b[idx]) * dither;
      // 7/16 right, 3/16 down-left, 5/16 down, 1/16 down-right
      cur[e + 3] += er * 0.4375; cur[e + 4] += eg * 0.4375; cur[e + 5] += eb * 0.4375;
      nxt[e - 3] += er * 0.1875; nxt[e - 2] += eg * 0.1875; nxt[e - 1] += eb * 0.1875;
      nxt[e] += er * 0.3125; nxt[e + 1] += eg * 0.3125; nxt[e + 2] += eb * 0.3125;
      nxt[e + 3] += er * 0.0625; nxt[e + 4] += eg * 0.0625; nxt[e + 5] += eb * 0.0625;
    }
    const t = cur;
    cur = nxt;
    nxt = t;
  }
  return out;
}

// ── PNG writer ────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array, crc = 0xffffffff): number {
  for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return crc;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  const crc = crc32(out.subarray(4, 8 + data.length)) ^ 0xffffffff;
  view.setUint32(8 + data.length, crc >>> 0);
  return out;
}

async function zlib(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new CompressionStream("deflate"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function writeIndexedPng(indices: Uint8Array, width: number, height: number, pal: Palette): Promise<Uint8Array> {
  const depth = pal.size <= 2 ? 1 : pal.size <= 4 ? 2 : pal.size <= 16 ? 4 : 8;
  const perByte = 8 / depth;
  const rowBytes = Math.ceil(width / perByte);
  const raw = new Uint8Array((rowBytes + 1) * height); // filter byte 0 (None) per row: best for palettes
  for (let y = 0; y < height; y++) {
    const rowStart = y * (rowBytes + 1) + 1;
    const src = y * width;
    if (depth === 8) {
      raw.set(indices.subarray(src, src + width), rowStart);
    } else {
      for (let x = 0; x < width; x++) {
        const shift = 8 - depth * ((x % perByte) + 1);
        raw[rowStart + Math.floor(x / perByte)] |= indices[src + x] << shift;
      }
    }
  }
  const ihdr = new Uint8Array(13);
  const v = new DataView(ihdr.buffer);
  v.setUint32(0, width);
  v.setUint32(4, height);
  ihdr[8] = depth;
  ihdr[9] = 3; // indexed colour
  const plte = new Uint8Array(pal.size * 3);
  let lastOpaque = -1;
  for (let i = 0; i < pal.size; i++) {
    plte[i * 3] = pal.r[i];
    plte[i * 3 + 1] = pal.g[i];
    plte[i * 3 + 2] = pal.b[i];
    if (pal.a[i] < 255) lastOpaque = i;
  }
  const parts = [
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("PLTE", plte),
    ...(lastOpaque >= 0 ? [chunk("tRNS", pal.a.slice(0, lastOpaque + 1))] : []),
    chunk("IDAT", await zlib(raw)),
    chunk("IEND", new Uint8Array(0)),
  ];
  const total = parts.reduce((s, p) => s + p.length, 0);
  const png = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    png.set(p, o);
    o += p.length;
  }
  return png;
}

/** Quantize RGBA pixels to ≤`colors` and return an indexed PNG file. */
export async function encodePalettePng(data: ImageData, colors = 256): Promise<Uint8Array> {
  const pixels = data.width * data.height;
  const pal = await buildPalette(data.data, pixels, colors);
  // Measured on photos: half-strength dithering removes banding for ~15% more
  // bytes; full strength or large/smooth images mostly add noise (2–3× bigger)
  // without lowering the error. Flat graphics look cleaner without it.
  const dither = pal.size > 32 && pixels <= 4_000_000 ? 0.5 : 0;
  const indices = mapPixels(data.data, data.width, data.height, pal, dither);
  return writeIndexedPng(indices, data.width, data.height, pal);
}
