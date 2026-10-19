/** JWT decoding and signature verification with Web Crypto (HS*, RS*, PS*, ES*). */

export function b64urlToBytes(s: string): Uint8Array<ArrayBuffer> {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export type Decoded =
  | { ok: true; header: Record<string, unknown>; payload: unknown; payloadText: string; signature: string; parts: [string, string, string] }
  | { ok: false; reason: "parts" | "header" | "payload"; parts: string[] };

export function decodeJwt(token: string): Decoded {
  const clean = token.trim().replace(/^Bearer\s+/i, "").replace(/\s+/g, "");
  const parts = clean.split(".");
  if (parts.length !== 3) return { ok: false, reason: "parts", parts };
  const dec = new TextDecoder("utf-8", { fatal: false });
  let header: Record<string, unknown>;
  try {
    header = JSON.parse(dec.decode(b64urlToBytes(parts[0]!)));
    if (!header || typeof header !== "object") throw new Error();
  } catch {
    return { ok: false, reason: "header", parts };
  }
  let payloadText: string;
  let payload: unknown;
  try {
    payloadText = dec.decode(b64urlToBytes(parts[1]!));
  } catch {
    return { ok: false, reason: "payload", parts };
  }
  try {
    payload = JSON.parse(payloadText);
  } catch {
    payload = null; // JWS with a non-JSON payload: show it as text
  }
  return { ok: true, header, payload, payloadText, signature: parts[2]!, parts: parts as [string, string, string] };
}

type Alg = { name: string; hash: string; kind: "hmac" | "rsa" | "pss" | "ec"; curve?: string; size?: number };

export function algInfo(alg: unknown): Alg | null {
  const m = typeof alg === "string" ? /^(HS|RS|PS|ES)(256|384|512)$/.exec(alg) : null;
  if (!m) return null;
  const hash = `SHA-${m[2]}`;
  switch (m[1]) {
    case "HS":
      return { name: "HMAC", hash, kind: "hmac" };
    case "RS":
      return { name: "RSASSA-PKCS1-v1_5", hash, kind: "rsa" };
    case "PS":
      return { name: "RSA-PSS", hash, kind: "pss" };
    default:
      return { name: "ECDSA", hash, kind: "ec", curve: m[2] === "256" ? "P-256" : m[2] === "384" ? "P-384" : "P-521", size: m[2] === "512" ? 66 : Number(m[2]) / 8 };
  }
}

function pemToDer(pem: string): Uint8Array<ArrayBuffer> {
  const body = pem.replace(/-----(BEGIN|END)[^-]+-----/g, "").replace(/\s+/g, "");
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export type VerifyResult = "valid" | "invalid" | "unsupported" | "badKey";

export async function verifyJwt(parts: [string, string, string], header: Record<string, unknown>, key: string, secretIsBase64: boolean): Promise<VerifyResult> {
  const alg = algInfo(header.alg);
  if (!alg) return "unsupported";
  const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  let sig: Uint8Array<ArrayBuffer>;
  try {
    sig = b64urlToBytes(parts[2]);
  } catch {
    return "invalid";
  }
  let cryptoKey: CryptoKey;
  try {
    if (alg.kind === "hmac") {
      const raw = secretIsBase64 ? b64urlToBytes(key.trim()) : new TextEncoder().encode(key);
      cryptoKey = await crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: alg.hash }, false, ["verify"]);
    } else {
      const params: RsaHashedImportParams | EcKeyImportParams =
        alg.kind === "ec" ? { name: "ECDSA", namedCurve: alg.curve! } : { name: alg.name, hash: alg.hash };
      const trimmed = key.trim();
      if (trimmed.startsWith("{")) {
        const jwk = JSON.parse(trimmed) as JsonWebKey & { keys?: JsonWebKey[] };
        const k = jwk.keys ? jwk.keys.find((x) => (x as { kid?: string }).kid === header.kid) ?? jwk.keys[0] : jwk;
        if (!k) return "badKey";
        cryptoKey = await crypto.subtle.importKey("jwk", k, params, false, ["verify"]);
      } else {
        cryptoKey = await crypto.subtle.importKey("spki", pemToDer(trimmed), params, false, ["verify"]);
      }
    }
  } catch {
    return "badKey";
  }
  const algo: AlgorithmIdentifier | RsaPssParams | EcdsaParams =
    alg.kind === "pss" ? { name: "RSA-PSS", saltLength: Number(alg.hash.slice(4)) / 8 } : alg.kind === "ec" ? { name: "ECDSA", hash: alg.hash } : { name: alg.name };
  try {
    return (await crypto.subtle.verify(algo, cryptoKey, sig, data)) ? "valid" : "invalid";
  } catch {
    return "invalid";
  }
}

export const TIME_CLAIMS = ["exp", "nbf", "iat", "auth_time"] as const;
