/**
 * Word / Excel / PowerPoint → PDF with LibreOffice compiled to WebAssembly, entirely in the browser.
 *
 * The engine's two big files live gzipped in models/libreoffice-<version>/ of this repository and are
 * fetched from a pinned commit via free CDNs (jsDelivr, hedged with raw.githubusercontent). The gzip stream is verified by
 * SHA-256, kept in Cache Storage and unpacked with DecompressionStream; the unpacked bytes are handed to
 * LibreOffice's worker as blob: URLs. The loader scripts are served from /vendor/libreoffice-<version>/.
 *
 * LibreOffice runs threads on SharedArrayBuffer, so the page must be cross-origin isolated
 * (COOP/COEP headers in next.config.mjs).
 */

import type { WorkerBrowserConverter } from "@matbee/libreoffice-converter/browser";

const VERSION = process.env.NEXT_PUBLIC_LIBREOFFICE_VERSION ?? "2.7.2";
const REPO = "hasimogluayaz/zapfile";
const COMMIT = "a7024478a178d4f2ac4508aef0dc3d592ae6b7de";
const CACHE = "zapfile-office-v1";

interface EngineFile {
  name: "wasm" | "data";
  type: string;
  gzBytes: number;
  rawBytes: number;
  sha256: string;
  parts: number;
}

const FILES: EngineFile[] = [
  { name: "wasm", type: "application/wasm", gzBytes: 48_600_040, rawBytes: 147_416_331, sha256: "7301d283e77df88c11e6cd429b7e23624d29584c55cd3aee79b56f4e3121b189", parts: 3 },
  { name: "data", type: "application/octet-stream", gzBytes: 28_465_699, rawBytes: 99_735_918, sha256: "4f4b6375f2669f8a08a63e3573afb3695b21a438deaad38c8e81697bf5d3c5cc", parts: 2 },
];

/** Total one-time download, for the UI. */
export const ENGINE_DOWNLOAD_BYTES = FILES.reduce((s, f) => s + f.gzBytes, 0);

const cacheKey = (f: EngineFile) => `https://office.zapfile.invalid/${VERSION}/${f.name}-${f.sha256.slice(0, 16)}.gz`;

export type EnginePhase = "download" | "unpack" | "start" | "ready";
export interface EngineProgress {
  phase: EnginePhase;
  /** Bytes downloaded so far (download phase). */
  loaded?: number;
  total?: number;
  fromCache?: boolean;
}

export class OfficeEngineError extends Error {
  constructor(
    readonly code: "isolation" | "download" | "start" | "convert" | "password" | "memory",
    message: string,
  ) {
    super(message);
  }
}

async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function openCache(): Promise<Cache | null> {
  try {
    return typeof caches !== "undefined" ? await caches.open(CACHE) : null;
  } catch {
    return null;
  }
}

/** Mirrors for one part, in order of preference. All free CDNs serving the pinned commit. */
function mirrorsFor(f: EngineFile, part: number): string[] {
  const name = `${f.name}-part-${String(part).padStart(2, "0")}.bin`;
  const dir = `models/libreoffice-${VERSION}`;
  const override = process.env.NEXT_PUBLIC_OFFICE_ENGINE_URL; // e.g. a self-hosted copy of the same parts
  return [
    ...(override ? [`${override.replace(/\/$/, "")}/${name}`] : []),
    `https://cdn.jsdelivr.net/gh/${REPO}@${COMMIT}/${dir}/${name}`,
    `https://raw.githubusercontent.com/${REPO}/${COMMIT}/${dir}/${name}`,
  ];
}

/** If a mirror has not started sending within this time, ask the next one too and keep the faster. */
const HEDGE_MS = 2500;

/**
 * Download one part. Mirrors are "hedged": a slow start (e.g. a CDN edge filling its cache) brings in
 * the next mirror in parallel, whichever answers first is used and the other is cancelled.
 */
async function fetchPart(urls: string[], onBytes: (n: number) => void, signal: AbortSignal): Promise<Blob> {
  const failures: string[] = [];
  const attempts = urls.map(() => new AbortController());
  const abortAll = () => attempts.forEach((a) => a.abort());
  signal.addEventListener("abort", abortAll, { once: true });
  try {
    const res = await new Promise<{ res: Response; i: number }>((resolve, reject) => {
      let next = 0;
      let pending = 0;
      let won = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const launch = () => {
        if (won || next >= urls.length) return;
        const i = next++;
        pending++;
        clearTimeout(timer);
        timer = setTimeout(launch, HEDGE_MS);
        fetch(urls[i]!, { mode: "cors", credentials: "omit", signal: attempts[i]!.signal })
          .then((r) => {
            if (!r.ok || !r.body) throw new Error(`HTTP ${r.status}`);
            if (won) return void attempts[i]!.abort();
            won = true;
            clearTimeout(timer);
            attempts.forEach((a, j) => j !== i && a.abort());
            resolve({ res: r, i });
          })
          .catch((e) => {
            failures.push(`${new URL(urls[i]!).host}: ${(e as Error).message}`);
            pending--;
            if (won) return;
            if (next < urls.length) launch();
            else if (pending === 0) {
              clearTimeout(timer);
              reject(new Error(failures.join("; ")));
            }
          });
      };
      launch();
    });
    const reader = res.res.body!.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      onBytes(value.length);
    }
    return new Blob(chunks as BlobPart[]);
  } finally {
    signal.removeEventListener("abort", abortAll);
  }
}

async function downloadGz(f: EngineFile, onBytes: (n: number) => void): Promise<Blob> {
  const failures: string[] = [];
  // Second round skips the first mirror, in case it served a bad copy.
  for (const skip of [0, 1]) {
    let got = 0;
    const ac = new AbortController();
    try {
      // All parts at once: several connections fill the line much faster than one.
      const chunks = await Promise.all(
        Array.from({ length: f.parts }, (_, i) =>
          fetchPart(mirrorsFor(f, i).slice(skip), (n) => {
            got += n;
            onBytes(n);
          }, ac.signal),
        ),
      ).catch((e) => {
        ac.abort();
        throw e;
      });
      const blob = new Blob(chunks);
      if (blob.size !== f.gzBytes || (await sha256Hex(blob)) !== f.sha256) throw new Error("integrity check failed");
      return blob;
    } catch (e) {
      onBytes(-got); // roll back progress for the next round
      failures.push((e as Error).message);
    }
  }
  throw new OfficeEngineError("download", failures.join("; "));
}

async function loadGz(f: EngineFile, onBytes: (n: number, cached: boolean) => void): Promise<Blob> {
  const cache = await openCache();
  const key = cacheKey(f);
  try {
    const hit = await cache?.match(key);
    if (hit) {
      const blob = await hit.blob();
      if (blob.size === f.gzBytes) {
        onBytes(blob.size, true);
        return blob;
      }
      await cache?.delete(key);
    }
  } catch {
    /* unreadable entry: download again */
  }
  const blob = await downloadGz(f, (n) => onBytes(n, false));
  if (cache) {
    try {
      await cache.put(key, new Response(blob, { headers: { "content-type": "application/gzip" } }));
      for (const req of await cache.keys()) if (!FILES.some((x) => cacheKey(x) === req.url)) await cache.delete(req);
    } catch {
      /* quota: still usable this session */
    }
  }
  return blob;
}

async function gunzip(blob: Blob, type: string): Promise<Blob> {
  const stream = blob.stream().pipeThrough(new DecompressionStream("gzip"));
  return new Blob([await new Response(stream).blob()], { type });
}

/** True once the engine files are in Cache Storage (no download needed). */
export async function engineCached(): Promise<boolean> {
  const cache = await openCache();
  if (!cache) return false;
  try {
    for (const f of FILES) if (!(await cache.match(cacheKey(f)))) return false;
    return true;
  } catch {
    return false;
  }
}

let converter: Promise<WorkerBrowserConverter> | null = null;
const listeners = new Set<(p: EngineProgress) => void>();
let lastProgress: EngineProgress | null = null;
const emit = (p: EngineProgress) => {
  lastProgress = p;
  listeners.forEach((l) => l(p));
};

export function canRunOfficeEngine(): { ok: boolean; reason?: "isolation" | "browser" } {
  if (typeof window === "undefined") return { ok: false, reason: "browser" };
  if (typeof DecompressionStream === "undefined" || typeof WebAssembly === "undefined") return { ok: false, reason: "browser" };
  if (!window.crossOriginIsolated || typeof SharedArrayBuffer === "undefined") return { ok: false, reason: "isolation" };
  return { ok: true };
}

/** Start (once) and resolve with a ready converter. Progress goes to every subscriber. */
export function getOfficeEngine(onProgress?: (p: EngineProgress) => void): Promise<WorkerBrowserConverter> {
  if (onProgress) {
    listeners.add(onProgress);
    if (lastProgress) onProgress(lastProgress);
  }
  if (converter) return converter;
  converter = (async () => {
    const can = canRunOfficeEngine();
    if (!can.ok) throw new OfficeEngineError("isolation", can.reason ?? "unsupported");
    const total = ENGINE_DOWNLOAD_BYTES;
    let loaded = 0;
    let cachedAll = true;
    let last = 0;
    emit({ phase: "download", loaded: 0, total });
    const blobs = await Promise.all(
      FILES.map((f) =>
        loadGz(f, (n, cached) => {
          loaded += n;
          cachedAll &&= cached;
          const now = performance.now();
          if (now - last > 120 || loaded >= total) {
            last = now;
            emit({ phase: "download", loaded, total, fromCache: cachedAll });
          }
        }),
      ),
    );
    emit({ phase: "unpack" });
    const [wasm, data] = await Promise.all(FILES.map((f, i) => gunzip(blobs[i]!, f.type)));
    if (wasm!.size !== FILES[0]!.rawBytes || data!.size !== FILES[1]!.rawBytes) throw new OfficeEngineError("download", "unpacked size mismatch");
    emit({ phase: "start" });
    const { WorkerBrowserConverter } = await import("@matbee/libreoffice-converter/browser");
    const base = `/vendor/libreoffice-${VERSION}/`;
    const c = new WorkerBrowserConverter({
      sofficeJs: `${location.origin}${base}soffice.js`,
      sofficeWorkerJs: `${location.origin}${base}soffice.worker.js`,
      browserWorkerJs: `${base}browser.worker.js`,
      sofficeWasm: URL.createObjectURL(wasm!),
      sofficeData: URL.createObjectURL(data!),
    });
    try {
      await c.initialize();
    } catch (e) {
      const msg = (e as Error).message || String(e);
      throw new OfficeEngineError(/memory|out of memory|allocation/i.test(msg) ? "memory" : "start", msg);
    }
    emit({ phase: "ready" });
    return c;
  })();
  converter.catch(() => {
    converter = null; // allow a retry
    lastProgress = null;
  });
  return converter;
}

export function offProgress(fn: (p: EngineProgress) => void) {
  listeners.delete(fn);
}

const EXT_FORMAT: Record<string, string> = {
  doc: "doc", docx: "docx", odt: "odt", rtf: "rtf", txt: "txt",
  xls: "xls", xlsx: "xlsx", ods: "ods", csv: "csv",
  ppt: "ppt", pptx: "pptx", odp: "odp",
  html: "html", htm: "html", xhtml: "html",
};

export interface OfficePdfOptions {
  /** PDF/A-2b for archiving. */
  pdfa?: boolean;
  password?: string;
}

/** Convert one document to PDF bytes. Conversions are serialised by the engine's single worker. */
export async function officeToPdf(file: File, opts: OfficePdfOptions = {}): Promise<Uint8Array> {
  const c = await getOfficeEngine();
  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  const inputFormat = EXT_FORMAT[ext];
  try {
    const res = await c.convert(
      new Uint8Array(await file.arrayBuffer()),
      {
        outputFormat: "pdf",
        ...(inputFormat ? { inputFormat: inputFormat as never } : {}),
        ...(opts.password ? { password: opts.password } : {}),
        ...(opts.pdfa ? { pdf: { pdfaLevel: "PDF/A-2b" } } : {}),
      },
      file.name,
    );
    return res.data;
  } catch (e) {
    const msg = (e as Error).message || String(e);
    if (/password|encrypt/i.test(msg)) throw new OfficeEngineError("password", msg);
    throw new OfficeEngineError("convert", msg);
  }
}
