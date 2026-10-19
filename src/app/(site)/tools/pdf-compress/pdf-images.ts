/**
 * Pure helpers for the PDF compressor's "Recommended" mode (run inside the
 * compress worker): find image XObjects that can be safely re-encoded, work
 * out how large each one is drawn on the page (so we can downsample to a
 * target DPI), decode raw Flate images, and tidy the document.
 */
import {
  PDFArray,
  PDFBool,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFObject,
  PDFRawStream,
  PDFRef,
  PDFStream,
  decodePDFRawStream,
} from "pdf-lib";

// ── Image candidates ─────────────────────────────────────────────────────

export interface ImageCandidate {
  ref: PDFRef;
  stream: PDFRawStream;
  kind: "jpeg" | "flate";
  width: number;
  height: number;
  /** Colour components of the source (1 = gray, 3 = RGB). */
  comps: 1 | 3;
  /** Keep the original ColorSpace when re-encoding to RGB JPEG (RGB spaces only). */
  keepColorSpace: boolean;
  /** PNG predictor (≥ 10) or 1 (none) for Flate images. */
  predictor: number;
  bytes: number;
}

const N = (name: string) => PDFName.of(name);

function num(dict: PDFDict, key: string): number | undefined {
  const v = dict.lookup(N(key));
  return v instanceof PDFNumber ? v.asNumber() : undefined;
}

function singleFilter(dict: PDFDict): string | null | undefined {
  const f = dict.lookup(N("Filter"));
  if (!f) return undefined;
  if (f instanceof PDFName) return f.decodeText();
  if (f instanceof PDFArray && f.size() === 1) {
    const only = f.lookup(0);
    return only instanceof PDFName ? only.decodeText() : null;
  }
  return null; // filter chains are left alone
}

function decodeParms(dict: PDFDict): PDFDict | undefined {
  const p = dict.lookup(N("DecodeParms"));
  if (p instanceof PDFDict) return p;
  if (p instanceof PDFArray && p.size() === 1) {
    const only = p.lookup(0);
    if (only instanceof PDFDict) return only;
  }
  return undefined;
}

/** Component count of a colour space we can re-encode, or null. */
function colorSpaceInfo(doc: PDFDocument, cs: PDFObject | undefined): { comps: 1 | 3; rgbFamily: boolean } | null {
  const v = cs instanceof PDFRef ? doc.context.lookup(cs) : cs;
  if (v instanceof PDFName) {
    const n = v.decodeText();
    if (n === "DeviceRGB") return { comps: 3, rgbFamily: true };
    if (n === "DeviceGray") return { comps: 1, rgbFamily: false };
    return null;
  }
  if (v instanceof PDFArray && v.size() >= 1) {
    const family = v.lookup(0);
    if (!(family instanceof PDFName)) return null;
    const f = family.decodeText();
    if (f === "CalRGB") return { comps: 3, rgbFamily: true };
    if (f === "CalGray") return { comps: 1, rgbFamily: false };
    if (f === "ICCBased") {
      const profile = v.lookup(1);
      const dict = profile instanceof PDFStream ? profile.dict : undefined;
      const n = dict ? num(dict, "N") : undefined;
      if (n === 3) return { comps: 3, rgbFamily: true };
      if (n === 1) return { comps: 1, rgbFamily: false };
    }
  }
  return null;
}

function isDefaultDecode(dict: PDFDict, comps: number): boolean {
  const d = dict.lookup(N("Decode"));
  if (!d) return true;
  if (!(d instanceof PDFArray) || d.size() !== comps * 2) return false;
  for (let i = 0; i < d.size(); i++) {
    const v = d.lookup(i);
    if (!(v instanceof PDFNumber) || v.asNumber() !== (i % 2 === 0 ? 0 : 1)) return false;
  }
  return true;
}

/** All image XObjects, and the subset that is safe to re-encode. */
export function findImages(doc: PDFDocument): { all: number; allBytes: number; candidates: ImageCandidate[] } {
  const ctx = doc.context;
  const objects = ctx.enumerateIndirectObjects();
  // Soft masks / explicit masks are referenced by their parent image; they must
  // stay exactly as they are (gray, lossless), so never treat them as candidates.
  const maskRefs = new Set<string>();
  for (const [, obj] of objects) {
    if (!(obj instanceof PDFStream)) continue;
    for (const key of ["SMask", "Mask"]) {
      const ref = obj.dict.get(N(key));
      if (ref instanceof PDFRef) maskRefs.add(ref.tag);
    }
  }

  let all = 0;
  let allBytes = 0;
  const candidates: ImageCandidate[] = [];
  for (const [ref, obj] of objects) {
    if (!(obj instanceof PDFRawStream)) continue;
    const dict = obj.dict;
    const subtype = dict.lookup(N("Subtype"));
    if (!(subtype instanceof PDFName) || subtype.decodeText() !== "Image") continue;
    all++;
    allBytes += obj.contents.length;

    if (maskRefs.has(ref.tag)) continue;
    const imageMask = dict.lookup(N("ImageMask"));
    if (imageMask instanceof PDFBool && imageMask.asBoolean()) continue;
    if (dict.lookup(N("Mask")) instanceof PDFArray) continue; // colour-key masking breaks under lossy coding
    if (dict.has(N("SMaskInData"))) continue;
    const width = num(dict, "Width") ?? 0;
    const height = num(dict, "Height") ?? 0;
    if (width < 16 || height < 16 || width * height < 64 * 64) continue;
    if (obj.contents.length < 4096) continue;

    const filter = singleFilter(dict);
    if (filter !== "DCTDecode" && filter !== "FlateDecode") continue;
    const cs = colorSpaceInfo(doc, dict.get(N("ColorSpace")));
    if (!cs) continue;
    if (!isDefaultDecode(dict, cs.comps)) continue;
    const bpc = num(dict, "BitsPerComponent");
    if (bpc !== undefined && bpc !== 8) continue;

    let predictor = 1;
    if (filter === "FlateDecode") {
      if (bpc !== 8) continue;
      const parms = decodeParms(dict);
      if (parms) {
        predictor = num(parms, "Predictor") ?? 1;
        if (predictor !== 1 && predictor < 10) continue; // TIFF predictor: not handled
        const colors = num(parms, "Colors") ?? 1;
        const columns = num(parms, "Columns") ?? 1;
        const pbpc = num(parms, "BitsPerComponent") ?? 8;
        if (predictor >= 10 && (colors !== cs.comps || columns !== width || pbpc !== 8)) continue;
      }
      // Raw RGBA expansion of huge images would need too much memory.
      if (width * height > 60_000_000) continue;
    }

    candidates.push({
      ref,
      stream: obj,
      kind: filter === "DCTDecode" ? "jpeg" : "flate",
      width,
      height,
      comps: cs.comps,
      keepColorSpace: cs.rgbFamily,
      predictor,
      bytes: obj.contents.length,
    });
  }
  return { all, allBytes, candidates };
}

// ── Placement scan (how big is each image drawn?) ─────────────────────────

type Matrix = [number, number, number, number, number, number];
const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

/** m × n (PDF row-vector convention: `cm` sets CTM = M × CTM). */
function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[1] * n[2],
    m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2],
    m[2] * n[1] + m[3] * n[3],
    m[4] * n[0] + m[5] * n[2] + n[4],
    m[4] * n[1] + m[5] * n[3] + n[5],
  ];
}

const WS = new Uint8Array(256);
[0, 9, 10, 12, 13, 32].forEach((c) => (WS[c] = 1));
const DELIM = new Uint8Array(256);
"()<>[]{}/%".split("").forEach((c) => (DELIM[c.charCodeAt(0)] = 1));
const NUMBER_RE = /^[+-]?(\d+\.?\d*|\.\d+)$/;

function latin1(b: Uint8Array, start: number, end: number): string {
  let s = "";
  for (let i = start; i < end; i++) s += String.fromCharCode(b[i]);
  return s;
}

function decodeNameEscapes(raw: string): string {
  return raw.includes("#") ? raw.replace(/#([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))) : raw;
}

type Operand = number | string | null;

/** Minimal content-stream tokenizer: calls `onOp` for every operator with its operands. */
export function scanOperators(b: Uint8Array, onOp: (op: string, args: Operand[]) => void) {
  const n = b.length;
  let i = 0;
  let args: Operand[] = [];
  while (i < n) {
    const c = b[i];
    if (WS[c]) {
      i++;
      continue;
    }
    if (c === 0x25) {
      // % comment
      while (i < n && b[i] !== 10 && b[i] !== 13) i++;
      continue;
    }
    if (c === 0x28) {
      // ( literal string )
      let depth = 1;
      i++;
      while (i < n && depth > 0) {
        const d = b[i];
        if (d === 0x5c) i += 2;
        else {
          if (d === 0x28) depth++;
          else if (d === 0x29) depth--;
          i++;
        }
      }
      args.push(null);
      continue;
    }
    if (c === 0x3c) {
      if (b[i + 1] === 0x3c) {
        i += 2; // dict start; contents are tokenised as operands and dropped at the operator
        continue;
      }
      while (i < n && b[i] !== 0x3e) i++;
      i++;
      args.push(null);
      continue;
    }
    if (c === 0x3e || c === 0x5b || c === 0x5d || c === 0x7b || c === 0x7d || c === 0x29) {
      i++;
      continue;
    }
    if (c === 0x2f) {
      let j = i + 1;
      while (j < n && !WS[b[j]] && !DELIM[b[j]]) j++;
      args.push("/" + decodeNameEscapes(latin1(b, i + 1, j)));
      i = j;
      continue;
    }
    let j = i;
    while (j < n && !WS[b[j]] && !DELIM[b[j]]) j++;
    if (j === i) {
      i++;
      continue;
    }
    const token = latin1(b, i, j);
    i = j;
    if (NUMBER_RE.test(token)) {
      args.push(parseFloat(token));
      continue;
    }
    if (token === "true" || token === "false" || token === "null") {
      args.push(null);
      continue;
    }
    if (token === "ID") {
      // Inline image data runs until whitespace + "EI" + whitespace/EOF.
      let k = i + 1;
      while (k < n) {
        if (b[k] === 0x45 && b[k + 1] === 0x49 && WS[b[k - 1]] && (k + 2 >= n || WS[b[k + 2]] || DELIM[b[k + 2]])) break;
        k++;
      }
      i = k + 2;
      args = [];
      continue;
    }
    onOp(token, args);
    args = [];
  }
}

function contentBytes(obj: PDFObject | undefined, doc: PDFDocument): Uint8Array | null {
  const v = obj instanceof PDFRef ? doc.context.lookup(obj) : obj;
  if (v instanceof PDFRawStream) {
    try {
      return decodePDFRawStream(v).decode();
    } catch {
      return null;
    }
  }
  if (v instanceof PDFArray) {
    const parts: Uint8Array[] = [];
    for (let i = 0; i < v.size(); i++) {
      const part = contentBytes(v.get(i), doc);
      if (part) parts.push(part);
    }
    const total = parts.reduce((s, p) => s + p.length + 1, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const p of parts) {
      out.set(p, offset);
      offset += p.length;
      out[offset++] = 10; // streams may split tokens; a newline keeps them apart
    }
    return out;
  }
  return null;
}

function inheritedResources(node: PDFDict, doc: PDFDocument): PDFDict | undefined {
  let current: PDFDict | undefined = node;
  for (let depth = 0; current && depth < 32; depth++) {
    const res = current.lookup(N("Resources"));
    if (res instanceof PDFDict) return res;
    const parent: PDFObject | undefined = current.lookup(N("Parent"));
    current = parent instanceof PDFDict ? parent : undefined;
  }
  void doc;
  return undefined;
}

function xobjectMap(resources: PDFDict | undefined): Map<string, PDFObject> {
  const map = new Map<string, PDFObject>();
  const xo = resources?.lookup(N("XObject"));
  if (xo instanceof PDFDict) {
    for (const [key, value] of xo.entries()) {
      map.set(key.decodeText(), value);
      map.set(decodeNameEscapes(key.asString().slice(1)), value);
    }
  }
  return map;
}

/**
 * Largest drawn size (in PDF points) of each image, keyed by object tag.
 * Images that are only drawn from places we don't scan (patterns,
 * annotations) are simply absent; the caller falls back to a size cap.
 */
export function measurePlacements(doc: PDFDocument): Map<string, { w: number; h: number }> {
  const placed = new Map<string, { w: number; h: number }>();
  let budget = 5000; // form XObject invocations, guards against pathological nesting

  const run = (bytes: Uint8Array, resources: PDFDict | undefined, start: Matrix, depth: number, active: Set<string>) => {
    const xobjects = xobjectMap(resources);
    const stack: Matrix[] = [];
    let ctm = start;
    scanOperators(bytes, (op, args) => {
      if (op === "q") stack.push(ctm);
      else if (op === "Q") ctm = stack.pop() ?? ctm;
      else if (op === "cm" && args.length >= 6) {
        const m = args.slice(-6);
        if (m.every((x) => typeof x === "number")) ctm = multiply(m as Matrix, ctm);
      } else if (op === "Do" && args.length >= 1) {
        const name = args[args.length - 1];
        if (typeof name !== "string" || !name.startsWith("/")) return;
        const entry = xobjects.get(name.slice(1));
        if (!(entry instanceof PDFRef)) return;
        const obj = doc.context.lookup(entry);
        if (!(obj instanceof PDFStream)) return;
        const subtype = obj.dict.lookup(N("Subtype"));
        const kind = subtype instanceof PDFName ? subtype.decodeText() : "";
        if (kind === "Image") {
          const w = Math.hypot(ctm[0], ctm[1]);
          const h = Math.hypot(ctm[2], ctm[3]);
          const prev = placed.get(entry.tag);
          placed.set(entry.tag, { w: Math.max(prev?.w ?? 0, w), h: Math.max(prev?.h ?? 0, h) });
        } else if (kind === "Form" && depth < 12 && budget-- > 0 && !active.has(entry.tag)) {
          const matrixObj = obj.dict.lookup(N("Matrix"));
          let matrix: Matrix = IDENTITY;
          if (matrixObj instanceof PDFArray && matrixObj.size() === 6) {
            const vals = matrixObj.asArray().map((v) => (v instanceof PDFNumber ? v.asNumber() : NaN));
            if (vals.every((v) => Number.isFinite(v))) matrix = vals as Matrix;
          }
          const formRes = obj.dict.lookup(N("Resources"));
          const content = contentBytes(obj, doc);
          if (!content) return;
          active.add(entry.tag);
          run(content, formRes instanceof PDFDict ? formRes : resources, multiply(matrix, ctm), depth + 1, active);
          active.delete(entry.tag);
        }
      }
    });
  };

  for (const page of doc.getPages()) {
    try {
      const node = page.node;
      const bytes = contentBytes(node.get(N("Contents")), doc);
      if (!bytes) continue;
      const unit = num(node, "UserUnit") ?? 1;
      run(bytes, inheritedResources(node, doc), [unit, 0, 0, unit, 0, 0], 0, new Set());
    } catch {
      // A malformed page just falls back to the size cap for its images.
    }
  }
  return placed;
}

// ── Pixel decoding ───────────────────────────────────────────────────────

/** Undo PNG predictors (row filters) in place-free fashion. */
export function unpredictPng(data: Uint8Array, width: number, height: number, comps: number): Uint8Array | null {
  const rowLen = width * comps;
  const stride = rowLen + 1;
  if (data.length < stride * height) return null;
  const out = new Uint8Array(rowLen * height);
  for (let y = 0; y < height; y++) {
    const type = data[y * stride];
    const src = y * stride + 1;
    const dst = y * rowLen;
    const prev = dst - rowLen;
    for (let x = 0; x < rowLen; x++) {
      const raw = data[src + x];
      const left = x >= comps ? out[dst + x - comps] : 0;
      const up = y > 0 ? out[prev + x] : 0;
      const upLeft = y > 0 && x >= comps ? out[prev + x - comps] : 0;
      let v: number;
      switch (type) {
        case 0:
          v = raw;
          break;
        case 1:
          v = raw + left;
          break;
        case 2:
          v = raw + up;
          break;
        case 3:
          v = raw + ((left + up) >> 1);
          break;
        case 4: {
          const p = left + up - upLeft;
          const pa = Math.abs(p - left);
          const pb = Math.abs(p - up);
          const pc = Math.abs(p - upLeft);
          v = raw + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
          break;
        }
        default:
          return null;
      }
      out[dst + x] = v & 255;
    }
  }
  return out;
}

/** RGBA pixels of a Flate image candidate, or null if it can't be decoded. */
export function decodeFlateToRgba(c: ImageCandidate): Uint8ClampedArray | null {
  let data: Uint8Array;
  try {
    data = decodePDFRawStream(c.stream).decode();
  } catch {
    return null;
  }
  if (c.predictor >= 10) {
    const un = unpredictPng(data, c.width, c.height, c.comps);
    if (!un) return null;
    data = un;
  }
  const pixels = c.width * c.height;
  if (data.length < pixels * c.comps) return null;
  const rgba = new Uint8ClampedArray(pixels * 4);
  if (c.comps === 3) {
    for (let i = 0, j = 0; i < pixels; i++, j += 3) {
      const o = i * 4;
      rgba[o] = data[j];
      rgba[o + 1] = data[j + 1];
      rgba[o + 2] = data[j + 2];
      rgba[o + 3] = 255;
    }
  } else {
    for (let i = 0; i < pixels; i++) {
      const o = i * 4;
      const g = data[i];
      rgba[o] = g;
      rgba[o + 1] = g;
      rgba[o + 2] = g;
      rgba[o + 3] = 255;
    }
  }
  return rgba;
}

/**
 * Drop APP1 (EXIF/XMP) segments from a JPEG. PDF viewers ignore EXIF
 * orientation, but browsers apply it when decoding, which would rotate the
 * re-encoded image.
 */
export function stripJpegApp1(jpeg: Uint8Array): Uint8Array {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) return jpeg;
  const keep: [number, number][] = [[0, 2]];
  let i = 2;
  let changed = false;
  while (i + 4 <= jpeg.length) {
    if (jpeg[i] !== 0xff) return jpeg;
    const marker = jpeg[i + 1];
    if (marker === 0xff) {
      i++;
      continue;
    }
    if (marker === 0xda || (marker >= 0xd0 && marker <= 0xd9)) break; // start of scan
    const len = (jpeg[i + 2] << 8) | jpeg[i + 3];
    if (len < 2) return jpeg;
    if (marker === 0xe1) changed = true;
    else keep.push([i, i + 2 + len]);
    i += 2 + len;
  }
  if (!changed) return jpeg;
  keep.push([i, jpeg.length]);
  const size = keep.reduce((s, [a, b]) => s + (b - a), 0);
  const out = new Uint8Array(size);
  let o = 0;
  for (const [a, b] of keep) {
    out.set(jpeg.subarray(a, b), o);
    o += b - a;
  }
  return out;
}

// ── Replacement & tidy-up ─────────────────────────────────────────────────

/** Swap an image stream's data for a baseline RGB JPEG, keeping masks, intent etc. */
export function replaceWithJpeg(doc: PDFDocument, c: ImageCandidate, jpeg: Uint8Array, width: number, height: number) {
  const dict = c.stream.dict.clone(doc.context);
  for (const key of ["Filter", "DecodeParms", "Decode", "Length", "DL"]) dict.delete(N(key));
  dict.set(N("Filter"), N("DCTDecode"));
  dict.set(N("Width"), PDFNumber.of(width));
  dict.set(N("Height"), PDFNumber.of(height));
  dict.set(N("BitsPerComponent"), PDFNumber.of(8));
  if (!c.keepColorSpace) dict.set(N("ColorSpace"), N("DeviceRGB"));
  dict.set(N("Length"), PDFNumber.of(jpeg.length));
  doc.context.assign(c.ref, PDFRawStream.of(dict, jpeg));
}

/** Remove document info, XMP packets and private application data. */
export function stripMetadata(doc: PDFDocument) {
  const ctx = doc.context;
  ctx.trailerInfo.Info = ctx.register(ctx.obj({}));
  for (const [, obj] of ctx.enumerateIndirectObjects()) {
    const dict = obj instanceof PDFDict ? obj : obj instanceof PDFStream ? obj.dict : null;
    if (!dict) continue;
    dict.delete(N("Metadata"));
    dict.delete(N("PieceInfo"));
  }
}

/** Remove embedded page thumbnails (viewers render their own). */
export function stripThumbnails(doc: PDFDocument) {
  for (const page of doc.getPages()) page.node.delete(N("Thumb"));
}

/**
 * pdf-lib writes every object it parsed, reachable or not. Drop the ones
 * nothing points to (old revisions, replaced metadata, orphans).
 */
export function collectGarbage(doc: PDFDocument): number {
  const ctx = doc.context;
  const seen = new Set<string>();
  const roots = [ctx.trailerInfo.Root, ctx.trailerInfo.Info, ctx.trailerInfo.Encrypt].filter(Boolean) as PDFObject[];
  const stack: PDFObject[] = [...roots];
  while (stack.length) {
    const o = stack.pop()!;
    if (o instanceof PDFRef) {
      if (seen.has(o.tag)) continue;
      seen.add(o.tag);
      const v = ctx.lookup(o);
      if (v) stack.push(v);
    } else if (o instanceof PDFDict) {
      for (const [, v] of o.entries()) stack.push(v);
    } else if (o instanceof PDFArray) {
      for (const v of o.asArray()) stack.push(v);
    } else if (o instanceof PDFStream) {
      stack.push(o.dict);
    }
  }
  let removed = 0;
  for (const [ref] of ctx.enumerateIndirectObjects()) {
    if (!seen.has(ref.tag)) {
      ctx.delete(ref);
      removed++;
    }
  }
  return removed;
}
