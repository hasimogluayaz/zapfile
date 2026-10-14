/**
 * Metadata reading and lossless removal for JPEG, PNG and WebP.
 * Every offset is bounds-checked: malformed files raise MetadataError
 * instead of throwing RangeErrors or reading garbage.
 */

export type ImageFormat = "jpeg" | "png" | "webp";

export class MetadataError extends Error {
  constructor(message = "Malformed metadata") {
    super(message);
    this.name = "MetadataError";
  }
}

export function sniffFormat(b: Uint8Array): ImageFormat | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  if (b.length >= 12 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "webp";
  return null;
}

function ascii(b: Uint8Array, start: number, len: number) {
  let s = "";
  for (let i = start; i < start + len && i < b.length; i++) s += String.fromCharCode(b[i]);
  return s;
}

function startsWith(b: Uint8Array, text: string) {
  return b.length >= text.length && ascii(b, 0, text.length) === text;
}

const utf8 = new TextDecoder("utf-8");
const latin1 = new TextDecoder("latin1");

// ── TIFF / EXIF ───────────────────────────────────────────────────────────

export type TagValue =
  | { kind: "text"; text: string }
  | { kind: "num"; nums: number[] }
  | { kind: "rat"; rats: [number, number][] }
  | { kind: "bytes"; bytes: Uint8Array };

export interface Tiff {
  ifd0: Map<number, TagValue>;
  exif: Map<number, TagValue>;
  gps: Map<number, TagValue>;
  hasThumbnail: boolean;
}

const TYPE_SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8 };

export function parseTiff(data: Uint8Array): Tiff {
  if (data.length < 8) throw new MetadataError();
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const order = dv.getUint16(0);
  if (order !== 0x4949 && order !== 0x4d4d) throw new MetadataError();
  const le = order === 0x4949;
  const len = data.length;
  const check = (o: number, n: number) => {
    if (o < 0 || o + n > len) throw new MetadataError();
  };
  const u16 = (o: number) => (check(o, 2), dv.getUint16(o, le));
  const u32 = (o: number) => (check(o, 4), dv.getUint32(o, le));
  if (u16(2) !== 42) throw new MetadataError();
  const visited = new Set<number>();

  const readValue = (type: number, count: number, at: number): TagValue | null => {
    switch (type) {
      case 2: {
        const bytes = data.subarray(at, at + Math.min(count, 65536));
        const end = bytes.indexOf(0);
        return { kind: "text", text: utf8.decode(end >= 0 ? bytes.subarray(0, end) : bytes).trim() };
      }
      case 7:
        return { kind: "bytes", bytes: data.subarray(at, at + Math.min(count, 1 << 20)) };
      case 5:
      case 10: {
        const rats: [number, number][] = [];
        for (let i = 0; i < Math.min(count, 64); i++) {
          const o = at + i * 8;
          rats.push(type === 5 ? [u32(o), u32(o + 4)] : [dv.getInt32(o, le), dv.getInt32(o + 4, le)]);
        }
        return { kind: "rat", rats };
      }
      default: {
        const nums: number[] = [];
        const n = Math.min(count, 256);
        for (let i = 0; i < n; i++) {
          const o = at + i * TYPE_SIZE[type];
          if (type === 1) nums.push(data[o]);
          else if (type === 6) nums.push(dv.getInt8(o));
          else if (type === 3) nums.push(u16(o));
          else if (type === 8) nums.push(dv.getInt16(o, le));
          else if (type === 4) nums.push(u32(o));
          else if (type === 9) nums.push(dv.getInt32(o, le));
          else if (type === 11) nums.push(dv.getFloat32(o, le));
          else if (type === 12) nums.push(dv.getFloat64(o, le));
        }
        return { kind: "num", nums };
      }
    }
  };

  const readIfd = (offset: number) => {
    const tags = new Map<number, TagValue>();
    if (visited.has(offset)) throw new MetadataError();
    visited.add(offset);
    const n = u16(offset);
    if (n > 1000) throw new MetadataError();
    for (let i = 0; i < n; i++) {
      const e = offset + 2 + i * 12;
      const id = u16(e);
      const type = u16(e + 2);
      const count = u32(e + 4);
      const unit = TYPE_SIZE[type];
      if (!unit || count === 0) continue;
      const total = unit * count;
      if (total > len) continue;
      const at = total <= 4 ? e + 8 : u32(e + 8);
      if (at + total > len) continue; // points outside the block: skip just this tag
      try {
        const v = readValue(type, count, at);
        if (v) tags.set(id, v);
      } catch {
        // one bad tag doesn't spoil the rest
      }
    }
    let next = 0;
    try {
      next = u32(offset + 2 + n * 12);
    } catch {
      next = 0;
    }
    return { tags, next };
  };

  const first = readIfd(u32(4));
  const pointer = (m: Map<number, TagValue>, id: number) => {
    const v = m.get(id);
    return v?.kind === "num" && v.nums[0] ? v.nums[0] : 0;
  };
  const sub = (id: number) => {
    const at = pointer(first.tags, id);
    if (!at) return new Map<number, TagValue>();
    try {
      return readIfd(at).tags;
    } catch {
      return new Map<number, TagValue>();
    }
  };
  let hasThumbnail = false;
  if (first.next && first.next < len) {
    try {
      const ifd1 = readIfd(first.next).tags;
      hasThumbnail = ifd1.has(0x0201) || ifd1.has(0x0111);
    } catch {
      hasThumbnail = false;
    }
  }
  return { ifd0: first.tags, exif: sub(0x8769), gps: sub(0x8825), hasThumbnail };
}

/** A tiny big-endian TIFF block with only the Orientation tag. */
function orientationTiff(orientation: number): Uint8Array {
  return new Uint8Array([
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // header, IFD0 at 8
    0x00, 0x01, // one entry
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation, 0x00, 0x00, // Orientation SHORT
    0x00, 0x00, 0x00, 0x00, // no next IFD
  ]);
}

// ── Container walkers ─────────────────────────────────────────────────────

interface JpegSegment {
  marker: number;
  start: number;
  end: number;
  data: Uint8Array;
}

function walkJpeg(b: Uint8Array): { segments: JpegSegment[]; scanStart: number; end: number } {
  const segments: JpegSegment[] = [];
  let i = 2;
  let scanStart = -1;
  while (i + 1 < b.length) {
    if (b[i] !== 0xff) throw new MetadataError();
    const m = b[i + 1];
    if (m === 0xff) {
      i++;
      continue;
    }
    if (m === 0xd9) break;
    if ((m >= 0xd0 && m <= 0xd7) || m === 0x01) {
      i += 2;
      continue;
    }
    if (i + 3 >= b.length) throw new MetadataError();
    const segLen = (b[i + 2] << 8) | b[i + 3];
    if (segLen < 2 || i + 2 + segLen > b.length) throw new MetadataError();
    if (m === 0xda) {
      scanStart = i;
      break;
    }
    segments.push({ marker: m, start: i, end: i + 2 + segLen, data: b.subarray(i + 4, i + 2 + segLen) });
    i += 2 + segLen;
  }
  if (scanStart < 0) throw new MetadataError();
  // Find the real end of the primary image: skip entropy-coded data and any
  // segments between scans (progressive JPEGs), stop after EOI. Anything after
  // it (motion-photo video, secondary images with their own EXIF) is a trailer.
  let j = scanStart;
  let end = b.length;
  while (j + 1 < b.length) {
    if (b[j] !== 0xff) {
      j++;
      continue;
    }
    const m = b[j + 1];
    if (m === 0x00 || (m >= 0xd0 && m <= 0xd7)) {
      j += 2;
      continue;
    }
    if (m === 0xff) {
      j++;
      continue;
    }
    if (m === 0xd9) {
      end = j + 2;
      break;
    }
    if (j + 3 >= b.length) break;
    j += 2 + ((b[j + 2] << 8) | b[j + 3]);
  }
  return { segments, scanStart, end };
}

interface PngChunk {
  type: string;
  start: number;
  end: number;
  data: Uint8Array;
}

function walkPng(b: Uint8Array): PngChunk[] {
  const chunks: PngChunk[] = [];
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let i = 8;
  while (i + 12 <= b.length) {
    const len = dv.getUint32(i);
    const type = ascii(b, i + 4, 4);
    const end = i + 12 + len;
    if (end > b.length) throw new MetadataError();
    chunks.push({ type, start: i, end, data: b.subarray(i + 8, i + 8 + len) });
    i = end;
    if (type === "IEND") break;
  }
  if (!chunks.length || chunks[0].type !== "IHDR") throw new MetadataError();
  return chunks;
}

interface RiffChunk {
  type: string;
  data: Uint8Array;
}

function walkWebp(b: Uint8Array): RiffChunk[] {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const riffEnd = Math.min(b.length, 8 + dv.getUint32(4, true));
  const chunks: RiffChunk[] = [];
  let i = 12;
  while (i + 8 <= riffEnd) {
    const type = ascii(b, i, 4);
    const size = dv.getUint32(i + 4, true);
    if (i + 8 + size > b.length) throw new MetadataError();
    chunks.push({ type, data: b.subarray(i + 8, i + 8 + size) });
    i += 8 + size + (size & 1);
  }
  if (!chunks.length) throw new MetadataError();
  return chunks;
}

// ── Reading ───────────────────────────────────────────────────────────────

export interface TextEntry {
  keyword: string;
  text: string;
}

export interface Metadata {
  format: ImageFormat;
  tiff: Tiff | null;
  /** EXIF block present but unreadable. */
  exifDamaged: boolean;
  xmp: string | null;
  iptc: boolean;
  icc: boolean;
  /** JPEG comments and PNG text chunks. */
  texts: TextEntry[];
  /** Bytes after the end of the JPEG image (e.g. motion photo video). */
  trailerBytes: number;
}

async function inflate(data: Uint8Array): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === "undefined") return null;
  try {
    const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  } catch {
    return null;
  }
}

function tryTiff(data: Uint8Array, meta: Metadata) {
  const body = startsWith(data, "Exif\0\0") ? data.subarray(6) : data;
  try {
    meta.tiff = parseTiff(body);
  } catch {
    meta.exifDamaged = true;
  }
}

/** ImageMagick stores EXIF in PNG text as "Raw profile type exif": hex after a length line. */
function rawProfileBytes(text: string): Uint8Array | null {
  const lines = text.trim().split("\n");
  if (lines.length < 3) return null;
  const hex = lines.slice(2).join("").replace(/\s+/g, "");
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

export async function readMetadata(b: Uint8Array): Promise<Metadata> {
  const format = sniffFormat(b);
  if (!format) throw new MetadataError("Unsupported format");
  const meta: Metadata = { format, tiff: null, exifDamaged: false, xmp: null, iptc: false, icc: false, texts: [], trailerBytes: 0 };

  if (format === "jpeg") {
    const { segments, end } = walkJpeg(b);
    meta.trailerBytes = Math.max(0, b.length - end);
    for (const s of segments) {
      if (s.marker === 0xe1 && startsWith(s.data, "Exif\0")) {
        if (!meta.tiff) tryTiff(s.data, meta);
      } else if (s.marker === 0xe1 && startsWith(s.data, "http://ns.adobe.com/xap/1.0/\0")) {
        meta.xmp = utf8.decode(s.data.subarray(29));
      } else if (s.marker === 0xed && startsWith(s.data, "Photoshop 3.0")) {
        meta.iptc = true;
      } else if (s.marker === 0xe2 && startsWith(s.data, "ICC_PROFILE\0")) {
        meta.icc = true;
      } else if (s.marker === 0xfe) {
        const text = utf8.decode(s.data).replace(/\0+$/, "").trim();
        if (text) meta.texts.push({ keyword: "Comment", text });
      }
    }
  } else if (format === "png") {
    for (const c of walkPng(b)) {
      if (c.type === "eXIf") tryTiff(c.data, meta);
      else if (c.type === "iCCP") meta.icc = true;
      else if (c.type === "tEXt" || c.type === "zTXt" || c.type === "iTXt") {
        const nul = c.data.indexOf(0);
        if (nul <= 0) continue;
        const keyword = latin1.decode(c.data.subarray(0, nul));
        let text: string | null = null;
        if (c.type === "tEXt") text = latin1.decode(c.data.subarray(nul + 1));
        else if (c.type === "zTXt") {
          const raw = await inflate(c.data.subarray(nul + 2));
          text = raw ? latin1.decode(raw) : null;
        } else {
          const compressed = c.data[nul + 1] === 1;
          let p = nul + 3;
          const langEnd = c.data.indexOf(0, p);
          if (langEnd < 0) continue;
          const transEnd = c.data.indexOf(0, langEnd + 1);
          if (transEnd < 0) continue;
          p = transEnd + 1;
          const body = c.data.subarray(p);
          const raw = compressed ? await inflate(body) : body;
          text = raw ? utf8.decode(raw) : null;
        }
        if (text === null) continue;
        if (keyword === "XML:com.adobe.xmp") meta.xmp = text;
        else if (/^Raw profile type (exif|APP1)$/i.test(keyword)) {
          const bytes = rawProfileBytes(text);
          if (bytes && !meta.tiff) tryTiff(bytes, meta);
        } else if (/^Raw profile type iptc$/i.test(keyword)) meta.iptc = true;
        else meta.texts.push({ keyword, text: text.slice(0, 2000) });
      }
    }
  } else {
    for (const c of walkWebp(b)) {
      if (c.type === "EXIF") tryTiff(c.data, meta);
      else if (c.type === "XMP ") meta.xmp = utf8.decode(c.data);
      else if (c.type === "ICCP") meta.icc = true;
    }
  }
  return meta;
}

export function orientationOf(meta: Metadata | null): number {
  const v = meta?.tiff?.ifd0.get(0x0112);
  const o = v?.kind === "num" ? v.nums[0] : 1;
  return o >= 1 && o <= 8 ? o : 1;
}

// ── Lossless removal ──────────────────────────────────────────────────────

let crcTable: Uint32Array | null = null;
function crc32(parts: Uint8Array[]): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (const p of parts) for (let i = 0; i < p.length; i++) c = crcTable[(c ^ p[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

const PNG_DROP = new Set(["tEXt", "iTXt", "zTXt", "eXIf", "tIME", "caBX"]);

/**
 * Removes EXIF (incl. GPS), XMP, IPTC, comments and text without re-encoding
 * pixels. Colour profiles stay so colours don't shift. When the photo relies
 * on the EXIF Orientation tag, a minimal EXIF block with only that tag is kept
 * so it still displays upright — it reveals nothing about the photo.
 */
export function stripMetadata(b: Uint8Array, orientation: number): Uint8Array {
  const format = sniffFormat(b);
  const keepOrientation = orientation > 1 && orientation <= 8;
  if (format === "jpeg") {
    const { segments, scanStart, end } = walkJpeg(b);
    const out: Uint8Array[] = [new Uint8Array([0xff, 0xd8])];
    let insertedExif = !keepOrientation;
    const exifSeg = () => {
      const tiff = orientationTiff(orientation);
      const len = 2 + 6 + tiff.length;
      return concat([new Uint8Array([0xff, 0xe1, len >> 8, len & 0xff]), new TextEncoder().encode("Exif\0\0"), tiff]);
    };
    for (const s of segments) {
      const isApp = s.marker >= 0xe0 && s.marker <= 0xef;
      let keep = !isApp && s.marker !== 0xfe;
      if (s.marker === 0xe0) keep = startsWith(s.data, "JFIF\0") || startsWith(s.data, "JFXX\0");
      if (s.marker === 0xe2) keep = startsWith(s.data, "ICC_PROFILE\0");
      if (s.marker === 0xee) keep = startsWith(s.data, "Adobe"); // colour transform flag for CMYK/YCCK
      if (!insertedExif && s.marker !== 0xe0) {
        out.push(exifSeg());
        insertedExif = true;
      }
      if (keep) out.push(b.subarray(s.start, s.end));
    }
    if (!insertedExif) out.push(exifSeg());
    out.push(b.subarray(scanStart, end));
    return concat(out);
  }
  if (format === "png") {
    const chunks = walkPng(b);
    const out: Uint8Array[] = [b.subarray(0, 8)];
    let inserted = !keepOrientation;
    for (const c of chunks) {
      if (!inserted && c.type === "IDAT") {
        const data = orientationTiff(orientation);
        const type = new TextEncoder().encode("eXIf");
        const head = new Uint8Array(8);
        new DataView(head.buffer).setUint32(0, data.length);
        head.set(type, 4);
        const crc = new Uint8Array(4);
        new DataView(crc.buffer).setUint32(0, crc32([type, data]));
        out.push(head, data, crc);
        inserted = true;
      }
      if (!PNG_DROP.has(c.type)) out.push(b.subarray(c.start, c.end));
    }
    return concat(out);
  }
  if (format === "webp") {
    const chunks = walkWebp(b).filter((c) => c.type !== "EXIF" && c.type !== "XMP ");
    const vp8x = chunks.find((c) => c.type === "VP8X");
    const addExif = keepOrientation && Boolean(vp8x);
    if (addExif) chunks.push({ type: "EXIF", data: orientationTiff(orientation) });
    const parts: Uint8Array[] = [];
    for (const c of chunks) {
      const head = new Uint8Array(8);
      head.set(new TextEncoder().encode(c.type), 0);
      new DataView(head.buffer).setUint32(4, c.data.length, true);
      let data = c.data;
      if (c.type === "VP8X") {
        data = new Uint8Array(c.data);
        data[0] = (data[0] & ~0x0c) | (addExif ? 0x08 : 0); // clear EXIF + XMP flags
      }
      parts.push(head, data);
      if (c.data.length & 1) parts.push(new Uint8Array(1));
    }
    const body = concat(parts);
    const header = new Uint8Array(12);
    header.set(new TextEncoder().encode("RIFF"), 0);
    new DataView(header.buffer).setUint32(4, 4 + body.length, true);
    header.set(new TextEncoder().encode("WEBP"), 8);
    return concat([header, body]);
  }
  throw new MetadataError("Unsupported format");
}
