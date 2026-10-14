/// <reference lib="webworker" />
/**
 * Background-removal worker: downloads and caches the model, runs it with
 * ONNX Runtime Web (WebGPU when available, multi-threaded WASM otherwise)
 * and refines the mask — all off the main thread.
 *
 * ONNX Runtime is loaded from /vendor/ort-<version>/ (same origin, copied at
 * build time), not bundled.
 */
import type * as OrtModule from "onnxruntime-web";
import { buildModelInput } from "./model-input";
import { MODEL_CACHE, cacheKey, type ModelFile, type ModelSource, type ModelSpec } from "./models";
import type { Backend, ErrorCode, Stage, WorkerRequest, WorkerResponse } from "./protocol";
import { averageWithFlipped, buildCutout, toProbabilities, type RefineOptions } from "./refine";

type Ort = typeof OrtModule;

declare const self: DedicatedWorkerGlobalScope;

class EngineError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

const post = (msg: WorkerResponse, transfer: Transferable[] = []) => self.postMessage(msg, transfer);
const progress = (stage: Stage, extra: Omit<Extract<WorkerResponse, { type: "progress" }>, "type" | "stage"> = {}) =>
  post({ type: "progress", stage, ...extra });

// ── State ──────────────────────────────────────────────────────────────────

let ort: Ort | null = null;
let ortFlavor: "webgpu" | "wasm" | null = null;
let session: OrtModule.InferenceSession | null = null;
let backend: Backend = "wasm";
let spec: ModelSpec | null = null;
let loading: Promise<void> | null = null;

/** Last segmented image, kept so refine options can change without re-running the model. */
let last: {
  jobId: number;
  rgba: Uint8ClampedArray;
  width: number;
  height: number;
  prob: Float32Array;
  inferenceMs: number;
} | null = null;

// ── Runtime ────────────────────────────────────────────────────────────────

async function hasWebGpu(): Promise<boolean> {
  const gpu = (self.navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
  if (!gpu) return false;
  try {
    return (await gpu.requestAdapter()) != null;
  } catch {
    return false;
  }
}

async function loadRuntime(base: string, flavor: "webgpu" | "wasm"): Promise<Ort> {
  if (ort && ortFlavor === flavor) return ort;
  if (ort) return ort; // one runtime per worker; the WebGPU build also runs WASM
  const file = flavor === "webgpu" ? "ort.webgpu.min.mjs" : "ort.wasm.min.mjs";
  const mod = (await import(/* webpackIgnore: true */ `${base}${file}`)) as Ort & { default?: Ort };
  const lib = (mod.InferenceSession ? mod : mod.default) as Ort;
  lib.env.wasm.wasmPaths = base;
  lib.env.wasm.proxy = false;
  const cores = self.navigator.hardwareConcurrency || 4;
  lib.env.wasm.numThreads = self.crossOriginIsolated ? Math.max(1, Math.min(cores - 1, 8)) : 1;
  lib.env.logLevel = "error";
  ort = lib;
  ortFlavor = flavor;
  return lib;
}

// ── Model download + cache ─────────────────────────────────────────────────

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** ONNX files are protobuf ModelProto messages that start with ir_version (field 1, varint). */
function looksLikeOnnx(bytes: Uint8Array): boolean {
  return bytes.length > 1_000_000 && bytes[0] === 0x08;
}

async function verify(bytes: Uint8Array, file: ModelFile): Promise<boolean> {
  return (
    bytes.length === file.bytes && looksLikeOnnx(bytes) && (await sha256Hex(bytes)) === file.sha256.toLowerCase()
  );
}

async function openCache(): Promise<Cache | null> {
  try {
    return typeof caches !== "undefined" ? await caches.open(MODEL_CACHE) : null;
  } catch {
    return null; // e.g. private browsing in some browsers
  }
}

/** Download every part of `source` into one preallocated buffer, reporting progress. */
async function download(source: ModelSource, file: ModelFile): Promise<Uint8Array> {
  const buffer = new Uint8Array(file.bytes);
  let loaded = 0;
  let lastReport = 0;
  for (const url of source.parts) {
    const response = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (loaded + value.length > buffer.length) {
        await reader.cancel();
        throw new Error("Unexpected file size");
      }
      buffer.set(value, loaded);
      loaded += value.length;
      const now = performance.now();
      if (now - lastReport > 100) {
        lastReport = now;
        progress("download", { loaded, total: file.bytes });
      }
    }
  }
  if (loaded !== file.bytes) throw new Error("Incomplete download");
  progress("download", { loaded, total: file.bytes });
  return buffer;
}

/** Remove cached files from older model versions. */
async function pruneCache(cache: Cache, keep: string) {
  try {
    for (const request of await cache.keys()) {
      if (request.url !== keep) await cache.delete(request);
    }
  } catch {
    // best effort
  }
}

async function fetchModel(file: ModelFile): Promise<Uint8Array> {
  const cache = await openCache();
  const key = cacheKey(file);
  try {
    const hit = cache ? await cache.match(key) : undefined;
    if (hit) {
      const bytes = new Uint8Array(await hit.arrayBuffer());
      if (await verify(bytes, file)) {
        progress("download", { loaded: bytes.length, total: bytes.length, fromCache: true });
        return bytes;
      }
      await cache?.delete(key);
    }
  } catch {
    // unreadable cache entry: download again
  }

  const failures: string[] = [];
  for (const source of file.sources) {
    try {
      const bytes = await download(source, file);
      if (!(await verify(bytes, file))) throw new Error("File failed integrity check");
      if (cache) {
        try {
          await cache.put(
            key,
            new Response(bytes as Uint8Array<ArrayBuffer>, { headers: { "content-type": "application/octet-stream" } }),
          );
          await pruneCache(cache, key);
        } catch {
          // Quota exceeded: still usable for this session, just not cached.
        }
      }
      return bytes;
    } catch (error) {
      let host = "source";
      try {
        host = new URL(source.parts[0]).host;
      } catch {
        // relative URL
      }
      failures.push(`${host}: ${(error as Error).message}`);
    }
  }
  throw new EngineError("download", failures.join("; ") || "No model source");
}

// ── Session ────────────────────────────────────────────────────────────────

async function createSession(lib: Ort, bytes: Uint8Array, target: Backend) {
  return lib.InferenceSession.create(bytes, {
    executionProviders: [target],
    graphOptimizationLevel: "all",
  });
}

async function load(request: Extract<WorkerRequest, { type: "load" }>) {
  spec = request.spec;
  progress("runtime");
  const gpu = request.preferGpu && (await hasWebGpu());
  let lib: Ort;
  try {
    lib = await loadRuntime(request.ortBase, gpu ? "webgpu" : "wasm");
  } catch (error) {
    throw new EngineError("runtime", `Could not load ONNX Runtime: ${(error as Error).message}`);
  }

  const bytes = await fetchModel(spec.file);
  progress("init");

  if (gpu) {
    try {
      session = await createSession(lib, bytes, "webgpu");
      backend = "webgpu";
    } catch {
      session = null; // fall through to WASM with the same model
    }
  }
  if (!session) {
    try {
      session = await createSession(lib, bytes, "wasm");
      backend = "wasm";
    } catch (error) {
      throw toEngineError(error, "runtime");
    }
  }
  post({ type: "loaded", backend, threads: lib.env.wasm.numThreads ?? 1 });
}

/** Re-create the session on WASM after a WebGPU failure (bytes come from the cache). */
async function fallBackToWasm() {
  if (!ort || !spec) throw new EngineError("runtime", "Runtime not loaded");
  progress("init");
  await session?.release().catch(() => undefined);
  session = null;
  const bytes = await fetchModel(spec.file);
  session = await createSession(ort, bytes, "wasm");
  backend = "wasm";
  post({ type: "loaded", backend, threads: ort.env.wasm.numThreads ?? 1 });
}

function toEngineError(error: unknown, fallback: ErrorCode): EngineError {
  if (error instanceof EngineError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (error instanceof RangeError || /memory|alloc|OOM|out of bounds/i.test(message)) {
    return new EngineError("memory", message);
  }
  return new EngineError(fallback, message);
}

// ── Inference ──────────────────────────────────────────────────────────────

async function predict(rgba: Uint8ClampedArray, width: number, height: number, flip: boolean) {
  if (!session || !ort || !spec) throw new EngineError("runtime", "Model not loaded");
  const { width: iw, height: ih } = spec.inputSize;
  const input = buildModelInput(rgba, width, height, iw, ih, spec.normalization, flip);
  const tensor = new ort.Tensor("float32", input, [1, 3, ih, iw]);
  const outputs = await session.run({ [session.inputNames[0]]: tensor });
  tensor.dispose();
  // The final mask is the (last) output shaped [1, 1, ih, iw].
  let mask: OrtModule.Tensor | null = null;
  for (const name of session.outputNames) {
    const t = outputs[name];
    const d = t.dims;
    if (d.length === 4 && d[1] === 1 && d[2] === ih && d[3] === iw) mask = t;
  }
  if (!mask) {
    for (const name of session.outputNames) outputs[name].dispose();
    throw new EngineError("inference", "Model returned no mask");
  }
  const raw = new Float32Array((await mask.getData()) as Float32Array);
  for (const name of session.outputNames) outputs[name].dispose();
  return toProbabilities(raw);
}

async function segment(request: Extract<WorkerRequest, { type: "segment" }>) {
  if (!spec) throw new EngineError("runtime", "Model not loaded");
  const rgba = new Uint8ClampedArray(request.rgba);
  const { width, height } = request;
  progress("inference");
  const started = performance.now();

  const runOnce = async (flip: boolean) => {
    let out = await predict(rgba, width, height, flip);
    if (!out.valid && backend === "webgpu") {
      // Some GPU drivers produce NaNs for this network; WASM is exact.
      await fallBackToWasm();
      progress("inference");
      out = await predict(rgba, width, height, flip);
    }
    if (!out.valid) throw new EngineError("inference", "Model produced an empty mask");
    return out.prob;
  };

  let prob: Float32Array;
  try {
    prob = await runOnce(false);
  } catch (error) {
    if (backend !== "webgpu" || error instanceof EngineError) throw error;
    await fallBackToWasm(); // WebGPU runtime failure (device lost, limits)
    progress("inference");
    prob = await runOnce(false);
  }
  if (request.tta) {
    const mirrored = await runOnce(true);
    prob = averageWithFlipped(prob, mirrored, spec.inputSize.width, spec.inputSize.height);
  }
  const inferenceMs = performance.now() - started;

  last = { jobId: request.jobId, rgba, width, height, prob, inferenceMs };
  emitCutout(request.jobId, request.options);
}

function emitCutout(jobId: number, options: RefineOptions) {
  if (!last || !spec) throw new EngineError("inference", "Nothing to refine");
  progress("refine");
  const started = performance.now();
  const cut = buildCutout(
    last.rgba,
    { width: last.width, height: last.height },
    last.prob,
    spec.inputSize,
    options,
  );
  const refineMs = performance.now() - started;
  post(
    {
      type: "result",
      jobId,
      rgba: cut.rgba.buffer as ArrayBuffer,
      width: cut.width,
      height: cut.height,
      backend,
      inferenceMs: last.inferenceMs,
      refineMs,
    },
    [cut.rgba.buffer as ArrayBuffer],
  );
}

// ── Message loop (sequential) ──────────────────────────────────────────────

let queue: Promise<void> = Promise.resolve();

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
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
      } else if (request.type === "segment") {
        await segment(request);
      } else if (request.type === "refine") {
        if (!last) throw new EngineError("inference", "Nothing to refine");
        emitCutout(request.jobId, request.options);
      }
    } catch (error) {
      const e = toEngineError(error, request.type === "load" ? "runtime" : "inference");
      post({
        type: "error",
        jobId: request.type === "load" ? undefined : request.jobId,
        code: e.code,
        message: e.message,
      });
    }
  });
};
