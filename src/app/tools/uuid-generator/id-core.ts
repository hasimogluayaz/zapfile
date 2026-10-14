/** UUID v4 / v7, ULID and Nano ID generation plus UUID inspection. */

const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));

function uuidFromBytes(b: Uint8Array): string {
  const h = Array.from(b, (x) => HEX[x]!).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function uuidV4(): string {
  return crypto.randomUUID();
}

let lastMs = -1;
let seq = 0;
/** RFC 9562 v7: 48-bit Unix ms timestamp + random; monotonic within the same millisecond. */
export function uuidV7(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  let ms = Date.now();
  if (ms <= lastMs) {
    ms = lastMs;
    seq = (seq + 1) & 0xfff;
    if (seq === 0) ms = ++lastMs;
  } else {
    seq = ((b[6]! & 0x0f) << 8) | b[7]!;
    seq &= 0x7ff; // leave headroom for increments
  }
  lastMs = ms;
  for (let i = 5; i >= 0; i--) {
    b[i] = ms % 256;
    ms = Math.floor(ms / 256);
  }
  b[6] = 0x70 | ((seq >> 8) & 0x0f);
  b[7] = seq & 0xff;
  b[8] = (b[8]! & 0x3f) | 0x80;
  return uuidFromBytes(b);
}

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export function ulid(): string {
  let ms = Date.now();
  let time = "";
  for (let i = 0; i < 10; i++) {
    time = CROCKFORD[ms % 32]! + time;
    ms = Math.floor(ms / 32);
  }
  const r = new Uint8Array(16);
  crypto.getRandomValues(r);
  return time + Array.from(r, (x) => CROCKFORD[x & 31]!).join("");
}

export const NANO_ALPHABETS = {
  url: "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict",
  alnum: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  lower: "0123456789abcdefghijklmnopqrstuvwxyz",
  hex: "0123456789abcdef",
  digits: "0123456789",
  noLookalikes: "346789ABCDEFGHJKLMNPQRTUVWXYabcdefghijkmnpqrtwxyz",
} as const;
export type NanoAlphabet = keyof typeof NANO_ALPHABETS;

/** Unbiased: mask to the next power of two and reject out-of-range bytes (same as nanoid). */
export function nanoId(size: number, alphabet: string): string {
  const mask = (2 << (31 - Math.clz32((alphabet.length - 1) | 1))) - 1;
  const step = Math.ceil((1.6 * mask * size) / alphabet.length);
  let id = "";
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(step));
    for (let i = 0; i < step; i++) {
      const c = alphabet[bytes[i]! & mask];
      if (c) {
        id += c;
        if (id.length === size) return id;
      }
    }
  }
}

export function nanoBits(size: number, alphabet: string): number {
  return size * Math.log2(alphabet.length);
}

export interface UuidInfo {
  version: number;
  variant: string;
  time: Date | null;
  nil: boolean;
  max: boolean;
}

export function inspectUuid(input: string): UuidInfo | null {
  const s = input.trim().replace(/^urn:uuid:/i, "").replace(/^\{|\}$/g, "");
  const m = /^([0-9a-f]{8})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{4})-?([0-9a-f]{12})$/i.exec(s);
  if (!m) return null;
  const hex = m.slice(1).join("").toLowerCase();
  const nil = /^0+$/.test(hex);
  const max = /^f+$/.test(hex);
  const version = parseInt(hex[12]!, 16);
  const v = parseInt(hex[16]!, 16);
  const variant = v < 8 ? "NCS" : v < 12 ? "RFC 9562" : v < 14 ? "Microsoft" : "Future";
  let time: Date | null = null;
  if (version === 7) time = new Date(parseInt(hex.slice(0, 12), 16));
  if (version === 1 || version === 6) {
    // 100 ns intervals since 1582-10-15.
    const t = version === 1 ? hex.slice(13, 16) + hex.slice(8, 12) + hex.slice(0, 8) : hex.slice(0, 12) + hex.slice(13, 16);
    time = new Date(Number(BigInt("0x" + t) / 10000n) - 12219292800000);
  }
  return { version, variant, time, nil, max };
}
