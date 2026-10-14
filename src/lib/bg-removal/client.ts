/**
 * Main-thread handle for the background-removal worker.
 */
import { DEFAULT_MODEL, MODEL_CACHE, cacheKey, type ModelSpec } from "./models";
import type { Backend, ErrorCode, Stage, WorkerRequest, WorkerResponse } from "./protocol";
import type { RefineOptions } from "./refine";

export class BgRemovalError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "BgRemovalError";
  }
}

export interface ProgressEvent {
  stage: Stage;
  loaded?: number;
  total?: number;
  fromCache?: boolean;
}

export interface Cutout {
  /** Straight-alpha RGBA, decontaminated colours. */
  data: Uint8ClampedArray;
  width: number;
  height: number;
  backend: Backend;
  inferenceMs: number;
  refineMs: number;
}

type Pending = { resolve: (c: Cutout) => void; reject: (e: Error) => void };

export class BgRemovalEngine {
  private worker: Worker;
  private nextJob = 1;
  private pending = new Map<number, Pending>();
  private loadPromise: Promise<Backend> | null = null;
  private loadSettle: { resolve: (b: Backend) => void; reject: (e: Error) => void } | null = null;
  backend: Backend | null = null;
  threads = 1;
  onProgress: ((event: ProgressEvent) => void) | null = null;
  onBackendChange: ((backend: Backend) => void) | null = null;

  constructor(private spec: ModelSpec = DEFAULT_MODEL) {
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => this.handle(event.data);
    this.worker.onerror = (event) => {
      event.preventDefault();
      this.failAll(new BgRemovalError("runtime", event.message || "Worker crashed"));
    };
  }

  private handle(msg: WorkerResponse) {
    switch (msg.type) {
      case "progress":
        this.onProgress?.(msg);
        break;
      case "loaded":
        this.backend = msg.backend;
        this.threads = msg.threads;
        this.onBackendChange?.(msg.backend);
        this.loadSettle?.resolve(msg.backend);
        this.loadSettle = null;
        break;
      case "result": {
        const job = this.pending.get(msg.jobId);
        this.pending.delete(msg.jobId);
        job?.resolve({
          data: new Uint8ClampedArray(msg.rgba),
          width: msg.width,
          height: msg.height,
          backend: msg.backend,
          inferenceMs: msg.inferenceMs,
          refineMs: msg.refineMs,
        });
        break;
      }
      case "error": {
        const error = new BgRemovalError(msg.code, msg.message);
        if (msg.jobId === undefined) {
          this.loadSettle?.reject(error);
          this.loadSettle = null;
          this.loadPromise = null;
        } else {
          this.pending.get(msg.jobId)?.reject(error);
          this.pending.delete(msg.jobId);
        }
        break;
      }
    }
  }

  private failAll(error: Error) {
    this.loadSettle?.reject(error);
    this.loadSettle = null;
    this.loadPromise = null;
    this.pending.forEach((job) => job.reject(error));
    this.pending.clear();
  }

  private send(request: WorkerRequest, transfer: Transferable[] = []) {
    this.worker.postMessage(request, transfer);
  }

  /** Download (or read from cache) and initialise the model. Safe to call repeatedly. */
  load(): Promise<Backend> {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = new Promise<Backend>((resolve, reject) => {
      this.loadSettle = { resolve, reject };
    });
    const version = process.env.NEXT_PUBLIC_ORT_VERSION;
    this.send({
      type: "load",
      spec: this.spec,
      ortBase: `${self.location.origin}/vendor/ort-${version}/`,
      preferGpu: true,
    });
    return this.loadPromise;
  }

  /** Segment an image. `rgba` is transferred to the worker (the caller's buffer is detached). */
  async segment(image: ImageData, options: RefineOptions, tta = false): Promise<Cutout> {
    await this.load();
    const jobId = this.nextJob++;
    const copy = new Uint8ClampedArray(image.data);
    return new Promise<Cutout>((resolve, reject) => {
      this.pending.set(jobId, { resolve, reject });
      this.send(
        {
          type: "segment",
          jobId,
          rgba: copy.buffer as ArrayBuffer,
          width: image.width,
          height: image.height,
          options,
          tta,
        },
        [copy.buffer as ArrayBuffer],
      );
    });
  }

  /** Re-run only the refinement of the last segmented image with new options. */
  refine(options: RefineOptions): Promise<Cutout> {
    const jobId = this.nextJob++;
    return new Promise<Cutout>((resolve, reject) => {
      this.pending.set(jobId, { resolve, reject });
      this.send({ type: "refine", jobId, options });
    });
  }

  dispose() {
    this.failAll(new BgRemovalError("runtime", "Engine disposed"));
    this.worker.terminate();
  }
}

/** Whether the model is already in Cache Storage (no download needed). */
export async function isModelCached(spec: ModelSpec = DEFAULT_MODEL): Promise<boolean> {
  try {
    if (typeof caches === "undefined") return false;
    const cache = await caches.open(MODEL_CACHE);
    return (await cache.match(cacheKey(spec.file))) !== undefined;
  } catch {
    // ignore
  }
  return false;
}
