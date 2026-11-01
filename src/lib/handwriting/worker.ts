/// <reference lib="webworker" />
/**
 * Handwriting to Text worker: downloads and caches PP-OCRv6 small, then finds
 * text lines and reads them with ONNX Runtime Web (WebGPU when available,
 * WASM otherwise), all off the main thread. Nothing leaves the device.
 */
import type * as OrtModule from "onnxruntime-web";
import { OCR_CACHE, OCR_DETECTOR, OCR_DICTIONARY, OCR_FILES, OCR_RECOGNIZER, DETECT_MAX_SIDE, ocrCacheKey, type OcrModelFile } from "./models";
import {
  boxesFromProbability,
  buildAlphabet,
  cropLine,
  ctcDecode,
  detectionInput,
  detectionSize,
  floatsToHalf,
  halfToFloats,
  recognitionWidth,
  REC_HEIGHT,
  type Rgba,
} from "./pipeline";
import type { OcrBackend, OcrErrorCode, OcrLineResult, OcrRequest, OcrResponse, OcrStage } from "./protocol";

type Ort = typeof OrtModule;
declare const self: DedicatedWorkerGlobalScope;

class EngineError extends Error {
  constructor(
    public code: OcrErrorCode,
    message: string,
  ) {
    super(message);
  }
}

const post = (msg: OcrResponse) => self.postMessage(msg);
const progress = (stage: OcrStage, extra: { jobId?: number; loaded?: number; total?: number; fromCache?: boolean } = {}) =>
  post({ type: "progress", stage, ...extra });

let ort: Ort | null = null;
let det: OrtModule.InferenceSession | null = null;
let rec: OrtModule.InferenceSession | null = null;
let alphabet: string[] = [];
let backend: OcrBackend = "wasm";
let modelBytes: { det: Uint8Array; rec: Uint8Array } | null = null;
let loading: Promise<void> | null = null;

// ── Model files ────────────────────────────────────────────────────────────

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function verify(bytes: Uint8Array, file: OcrModelFile) {
  return bytes.length === file.bytes && (await sha256Hex(bytes)) === file.sha256;
}

async function openCache(): Promise<Cache | null> {
  try {
    return typeof caches !== "undefined" ? await caches.open(OCR_CACHE) : null;
  } catch {
    return null; // e.g. private browsing
  }
}

async function download(url: string, file: OcrModelFile, onBytes: (n: number) => void): Promise<Uint8Array> {
  const response = await fetch(url, { mode: "cors", credentials: "omit" });
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
  const buffer = new Uint8Array(file.bytes);
  const reader = response.body.getReader();
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (loaded + value.length > buffer.length) {
      await reader.cancel();
      throw new Error("Unexpected file size");
    }
    buffer.set(value, loaded);
    loaded += value.length;
    onBytes(loaded);
  }
  if (loaded !== file.bytes) throw new Error("Incomplete download");
  return buffer;
}

/** Every model file, from the cache or downloaded (with combined progress). */
async function fetchModels(): Promise<Map<string, Uint8Array>> {
  const cache = await openCache();
  const total = OCR_FILES.reduce((s, f) => s + f.bytes, 0);
  const done = new Map<string, number>();
  let lastReport = 0;
  let allCached = true;
  const report = (force = false) => {
    const now = performance.now();
    if (!force && now - lastReport < 100) return;
    lastReport = now;
    let loaded = 0;
    done.forEach((n) => (loaded += n));
    progress("download", { loaded, total, fromCache: allCached });
  };

  const one = async (file: OcrModelFile): Promise<Uint8Array> => {
    const key = ocrCacheKey(file);
    try {
      const hit = cache ? await cache.match(key) : undefined;
      if (hit) {
        const bytes = new Uint8Array(await hit.arrayBuffer());
        if (await verify(bytes, file)) {
          done.set(file.id, bytes.length);
          report();
          return bytes;
        }
        await cache?.delete(key);
      }
    } catch {
      // unreadable cache entry: download again
    }
    allCached = false;
    const failures: string[] = [];
    for (const url of file.urls) {
      try {
        const bytes = await download(url, file, (n) => {
          done.set(file.id, n);
          report();
        });
        if (!(await verify(bytes, file))) throw new Error("File failed integrity check");
        try {
          await cache?.put(key, new Response(bytes as Uint8Array<ArrayBuffer>, { headers: { "content-type": "application/octet-stream" } }));
        } catch {
          // quota: still usable for this session
        }
        return bytes;
      } catch (error) {
        done.set(file.id, 0);
        failures.push(`${new URL(url, self.location.href).host}: ${(error as Error).message}`);
      }
    }
    throw new EngineError("download", failures.join("; "));
  };

  const results = await Promise.all(OCR_FILES.map(one));
  report(true);
  if (cache) {
    // Drop files of older model versions.
    const keep = new Set(OCR_FILES.map(ocrCacheKey));
    try {
      for (const request of await cache.keys()) if (!keep.has(request.url)) await cache.delete(request);
    } catch {
      // best effort
    }
  }
  return new Map(OCR_FILES.map((f, i) => [f.id, results[i]]));
}

// ── Runtime ────────────────────────────────────────────────────────────────

async function hasWebGpu(): Promise<boolean> {
  const gpu = (self.navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ features: Set<string> } | null> } }).gpu;
  if (!gpu) return false;
  try {
    const adapter = await gpu.requestAdapter();
    // The models are float16: without shader-f16 WebGPU would emulate badly or fail.
    return !!adapter && adapter.features.has("shader-f16");
  } catch {
    return false;
  }
}

async function loadRuntime(base: string, gpu: boolean): Promise<Ort> {
  if (ort) return ort;
  const file = gpu ? "ort.webgpu.min.mjs" : "ort.wasm.min.mjs";
  const mod = (await import(/* webpackIgnore: true */ `${base}${file}`)) as Ort & { default?: Ort };
  const lib = (mod.InferenceSession ? mod : mod.default) as Ort;
  lib.env.wasm.wasmPaths = base;
  lib.env.wasm.proxy = false;
  const cores = self.navigator.hardwareConcurrency || 4;
  lib.env.wasm.numThreads = self.crossOriginIsolated ? Math.max(1, Math.min(cores - 1, 8)) : 1;
  lib.env.logLevel = "error";
  ort = lib;
  return lib;
}

async function createSessions(target: OcrBackend) {
  if (!ort || !modelBytes) throw new EngineError("runtime", "Runtime not loaded");
  const opts = { executionProviders: [target], graphOptimizationLevel: "all" as const };
  const [d, r] = await Promise.all([ort.InferenceSession.create(modelBytes.det, opts), ort.InferenceSession.create(modelBytes.rec, opts)]);
  await det?.release().catch(() => undefined);
  await rec?.release().catch(() => undefined);
  det = d;
  rec = r;
  backend = target;
}

async function load(request: Extract<OcrRequest, { type: "load" }>) {
  const gpu = request.preferGpu && (await hasWebGpu());
  try {
    await loadRuntime(request.ortBase, gpu);
  } catch (error) {
    throw new EngineError("runtime", `Could not load ONNX Runtime: ${(error as Error).message}`);
  }
  const files = await fetchModels();
  modelBytes = { det: files.get(OCR_DETECTOR.id)!, rec: files.get(OCR_RECOGNIZER.id)! };
  alphabet = buildAlphabet(JSON.parse(new TextDecoder().decode(files.get(OCR_DICTIONARY.id)!)).characters as string[]);
  progress("init");
  if (gpu) {
    try {
      await createSessions("webgpu");
    } catch {
      det = rec = null;
    }
  }
  if (!det || !rec) {
    try {
      await createSessions("wasm");
    } catch (error) {
      throw toEngineError(error, "runtime");
    }
  }
  post({ type: "loaded", backend });
}

function toEngineError(error: unknown, fallback: OcrErrorCode): EngineError {
  if (error instanceof EngineError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof RangeError || /memory|alloc|OOM|out of bounds/i.test(message)) return new EngineError("memory", message);
  return new EngineError(fallback, message);
}

// ── Inference ──────────────────────────────────────────────────────────────

function tensor(data: Float32Array, dims: number[]): OrtModule.Tensor {
  return new ort!.Tensor("float16", floatsToHalf(data), dims);
}

async function floats(t: OrtModule.Tensor): Promise<Float32Array> {
  const d = await t.getData();
  if (d instanceof Uint16Array) return halfToFloats(d);
  if (d instanceof Float32Array) return d;
  return Float32Array.from(d as ArrayLike<number>);
}

function hasNaN(a: Float32Array) {
  for (let i = 0; i < a.length; i += 97) if (a[i] !== a[i]) return true;
  return false;
}

async function runDetector(img: Rgba) {
  const size = detectionSize(img.width, img.height, DETECT_MAX_SIDE);
  const input = tensor(detectionInput(img, size.width, size.height), [1, 3, size.height, size.width]);
  const out = await det!.run({ [det!.inputNames[0]]: input });
  input.dispose();
  const prob = await floats(out[det!.outputNames[0]]);
  for (const k of det!.outputNames) out[k].dispose();
  return { prob, size };
}

/** Read lines in batches of similar width (one padded tensor per batch). */
async function readLines(img: Rgba, boxes: ReturnType<typeof boxesFromProbability>, jobId: number): Promise<OcrLineResult[]> {
  const order = boxes.map((box, i) => ({ box, i, ...recognitionWidth(box) })).sort((a, b) => a.content - b.content);
  const results: OcrLineResult[] = new Array(boxes.length);
  const maxBatch = backend === "webgpu" ? 8 : 4;
  let doneCount = 0;
  for (let s = 0; s < order.length; s += maxBatch) {
    const batch = order.slice(s, s + maxBatch);
    const tw = Math.max(...batch.map((b) => b.tensor));
    const one = 3 * REC_HEIGHT * tw;
    const data = new Float32Array(one * batch.length);
    batch.forEach((b, k) => cropLine(img, b.box, data.subarray(k * one, (k + 1) * one), tw, b.content));
    const input = tensor(data, [batch.length, 3, REC_HEIGHT, tw]);
    const out = await rec!.run({ [rec!.inputNames[0]]: input });
    input.dispose();
    const o = out[rec!.outputNames[0]];
    const [, steps, classes] = o.dims as number[];
    const scores = await floats(o);
    for (const k of rec!.outputNames) out[k].dispose();
    if (hasNaN(scores)) throw new EngineError("inference", "NaN");
    batch.forEach((b, k) => {
      // Only the steps covering this crop's content (the rest is padding).
      const used = Math.min(steps, Math.ceil((b.content / tw) * steps) + 1);
      const { text, confidence } = ctcDecode(scores.subarray(k * steps * classes, (k * steps + used) * classes), used, classes, alphabet);
      results[b.i] = { box: b.box, text, confidence };
    });
    doneCount += batch.length;
    progress("read", { jobId, loaded: doneCount, total: boxes.length });
  }
  return results;
}

async function recognize(request: Extract<OcrRequest, { type: "recognize" }>) {
  if (!det || !rec) throw new EngineError("runtime", "Model not loaded");
  const started = performance.now();
  const { bitmap, jobId } = request;
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, bitmap.width, bitmap.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  canvas.width = canvas.height = 0;
  const img: Rgba = { data: pixels.data, width: pixels.width, height: pixels.height };

  const attempt = async () => {
    progress("detect", { jobId });
    const { prob, size } = await runDetector(img);
    if (hasNaN(prob)) throw new EngineError("inference", "NaN");
    const boxes = boxesFromProbability(prob, size.width, size.height, img.width / size.width, img.height / size.height);
    return readLines(img, boxes, jobId);
  };

  let lines: OcrLineResult[];
  try {
    lines = await attempt();
  } catch (error) {
    if (backend !== "webgpu") throw error;
    // Some GPU drivers fail or produce NaNs in float16: WASM is exact.
    progress("init");
    await createSessions("wasm");
    post({ type: "loaded", backend });
    lines = await attempt();
  }
  post({ type: "result", jobId, width: img.width, height: img.height, lines, backend, ms: performance.now() - started });
}

// ── Message loop (sequential) ──────────────────────────────────────────────

let queue: Promise<void> = Promise.resolve();

self.onmessage = (event: MessageEvent<OcrRequest>) => {
  const request = event.data;
  queue = queue.then(async () => {
    try {
      if (request.type === "load") {
        if (!loading) loading = load(request);
        try {
          await loading;
        } catch (error) {
          loading = null; // allow retry
          throw error;
        }
      } else {
        await recognize(request);
      }
    } catch (error) {
      const e = toEngineError(error, request.type === "load" ? "runtime" : "inference");
      post({ type: "error", jobId: request.type === "load" ? undefined : request.jobId, code: e.code, message: e.message });
    }
  });
};
