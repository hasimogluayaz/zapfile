/** Base64 / Base64URL encoding of bytes and text, with tolerant decoding and file-type sniffing. */

const STD = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

export interface EncodeOptions {
  urlSafe: boolean;
  padding: boolean;
  /** Wrap lines at 76 characters (MIME). */
  wrap: boolean;
}

export function bytesToBase64(bytes: Uint8Array, o: EncodeOptions): string {
  // btoa on 48 KB slices (a multiple of 3, so no padding in the middle).
  const parts: string[] = [];
  const step = 3 * 16384;
  for (let i = 0; i < bytes.length; i += step) {
    const slice = bytes.subarray(i, i + step);
    let bin = "";
    for (let j = 0; j < slice.length; j++) bin += String.fromCharCode(slice[j]!);
    parts.push(btoa(bin));
  }
  let out = parts.join("");
  if (o.urlSafe) out = out.replace(/\+/g, "-").replace(/\//g, "_");
  if (!o.padding) out = out.replace(/=+$/, "");
  if (o.wrap) out = out.replace(/(.{76})(?=.)/g, "$1\n");
  return out;
}

export function textToBase64(text: string, o: EncodeOptions): string {
  return bytesToBase64(new TextEncoder().encode(text), o);
}

export type DecodeResult =
  | { ok: true; bytes: Uint8Array; text: string | null; mime: string | null; dataUriMime: string | null; urlSafe: boolean }
  | { ok: false; reason: "badChar"; char: string; index: number }
  | { ok: false; reason: "badLength" };

/** Accepts data: URIs, whitespace/newlines, Base64URL and missing padding. */
export function decodeBase64(input: string): DecodeResult {
  let s = input.trim();
  let dataUriMime: string | null = null;
  const uri = /^data:([^;,]*)(?:;[^,]*)?;base64,/i.exec(s);
  if (uri) {
    dataUriMime = uri[1] || null;
    s = s.slice(uri[0].length);
  }
  const urlSafe = /[-_]/.test(s);
  let clean = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c === " " || c === "\n" || c === "\r" || c === "\t") continue;
    if (c === "-") clean += "+";
    else if (c === "_") clean += "/";
    else if (c === "=" || STD.includes(c)) clean += c;
    else return { ok: false, reason: "badChar", char: c, index: i };
  }
  clean = clean.replace(/=+$/, "");
  if (clean.includes("=") || clean.length % 4 === 1) return { ok: false, reason: "badLength" };
  clean += "=".repeat((4 - (clean.length % 4)) % 4);
  let bin: string;
  try {
    bin = atob(clean);
  } catch {
    return { ok: false, reason: "badLength" };
  }
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const mime = sniff(bytes) ?? dataUriMime;
  let text: string | null = null;
  if (!sniff(bytes)) {
    try {
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      // Text if it decodes as UTF-8 and has (almost) no control characters.
      const ctrl = decoded.match(/[\u0000-\u0008\u000E-\u001F]/g)?.length ?? 0;
      if (ctrl <= decoded.length * 0.01) text = decoded;
    } catch {
      /* binary */
    }
  }
  return { ok: true, bytes, text, mime, dataUriMime, urlSafe };
}

const SIGS: [number[], string, number?][] = [
  [[0x89, 0x50, 0x4e, 0x47], "image/png"],
  [[0xff, 0xd8, 0xff], "image/jpeg"],
  [[0x47, 0x49, 0x46, 0x38], "image/gif"],
  [[0x25, 0x50, 0x44, 0x46], "application/pdf"],
  [[0x50, 0x4b, 0x03, 0x04], "application/zip"],
  [[0x1f, 0x8b], "application/gzip"],
  [[0x42, 0x4d], "image/bmp"],
  [[0x00, 0x00, 0x01, 0x00], "image/x-icon"],
  [[0x49, 0x44, 0x33], "audio/mpeg"],
  [[0x4f, 0x67, 0x67, 0x53], "audio/ogg"],
  [[0x77, 0x4f, 0x46, 0x32], "font/woff2"],
  [[0x77, 0x4f, 0x46, 0x46], "font/woff"],
];

export function sniff(b: Uint8Array): string | null {
  for (const [sig, mime] of SIGS) if (sig.every((v, i) => b[i] === v)) return mime;
  const ascii = (o: number, n: number) => String.fromCharCode(...Array.from(b.subarray(o, o + n)));
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") return "image/webp";
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WAVE") return "audio/wav";
  if (ascii(4, 4) === "ftyp") return /^(avif|avis)/.test(ascii(8, 4)) ? "image/avif" : /^(heic|heix|mif1)/.test(ascii(8, 4)) ? "image/heic" : "video/mp4";
  if (ascii(0, 4) === "\u001aEß£") return "video/webm";
  const head = ascii(0, Math.min(256, b.length)).trimStart().toLowerCase();
  if (head.startsWith("<svg") || (head.startsWith("<?xml") && head.includes("<svg"))) return "image/svg+xml";
  return null;
}

export const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/heic": "heic",
  "image/bmp": "bmp",
  "image/x-icon": "ico",
  "image/svg+xml": "svg",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "application/gzip": "gz",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "font/woff2": "woff2",
  "font/woff": "woff",
};
