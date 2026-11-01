/**
 * Main-thread handle for the Handwriting to Text worker.
 *
 * A watchdog guards against a worker that silently stops (e.g. ONNX Runtime's
 * thread pool never starting because a browser blocks its worker threads):
 * when nothing is heard from the worker for a while, it is restarted once in
 * safe mode (single-threaded WASM) and the pending pages are sent again.
 */
import { IMAGE_MAX_SIDE, type OcrScript } from "./models";
import type {
  OcrBackend,
  OcrErrorCode,
  OcrLineResult,
  OcrRequest,
  OcrResponse,
  OcrStage,
} from "./protocol";

export class OcrError extends Error {
  constructor(
    public code: OcrErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "OcrError";
  }
}

export interface OcrProgress {
  stage: OcrStage | "retry";
  jobId?: number;
  loaded?: number;
  total?: number;
  fromCache?: boolean;
}

export interface OcrPageResult {
  width: number;
  height: number;
  rotation: 0 | 90 | 180 | 270;
  lines: OcrLineResult[];
  backend: OcrBackend;
  ms: number;
}

interface Job {
  source: ImageBitmap;
  script: OcrScript;
  resolve: (r: OcrPageResult) => void;
  reject: (e: Error) => void;
}

const ORT_BASE = `/vendor/ort-${process.env.NEXT_PUBLIC_ORT_VERSION}/`;
/** Silence (ms) after which the worker counts as stuck: while starting, and while reading. */
const STALL_LOADING = 20_000;
const STALL_READING = 45_000;

export class HandwritingEngine {
  private worker!: Worker;
  private nextJob = 1;
  private jobs = new Map<number, Job>();
  private loadPromise: Promise<OcrBackend> | null = null;
  private loadSettle: {
    resolve: (b: OcrBackend) => void;
    reject: (e: Error) => void;
  } | null = null;
  private safe = false;
  private stage: OcrStage | null = null;
  private watchdog: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  backend: OcrBackend | null = null;
  onProgress: ((event: OcrProgress) => void) | null = null;

  constructor() {
    this.spawn();
  }

  private spawn() {
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    this.worker.onmessage = (event: MessageEvent<OcrResponse>) =>
      this.handle(event.data);
    this.worker.onerror = (event) => {
      event.preventDefault();
      this.stuck(event.message || "Worker crashed");
    };
    this.worker.onmessageerror = () =>
      this.stuck("Unreadable message from worker");
  }

  private busy() {
    return !!this.loadSettle || this.jobs.size > 0;
  }

  /** (Re)start the stall timer while anything is outstanding. */
  private arm() {
    if (this.watchdog) clearTimeout(this.watchdog);
    this.watchdog = null;
    if (this.disposed || !this.busy()) return;
    const reading = this.stage === "detect" || this.stage === "read";
    this.watchdog = setTimeout(
      () => this.stuck(`No response at stage "${this.stage ?? "start"}"`),
      reading ? STALL_READING : STALL_LOADING,
    );
  }

  /** The worker hung or crashed: restart once in safe mode, else give up. */
  private stuck(reason: string) {
    if (this.disposed) return;
    if (this.watchdog) clearTimeout(this.watchdog);
    this.watchdog = null;
    this.worker.terminate();
    if (this.safe) {
      this.failAll(new OcrError("runtime", reason));
      this.spawn(); // ready for a manual retry
      return;
    }
    console.warn(`[handwriting] ${reason}; restarting single-threaded`);
    this.safe = true;
    this.stage = null;
    this.onProgress?.({ stage: "retry" });
    this.spawn();
    this.send({
      type: "load",
      ortBase: ORT_BASE,
      preferGpu: false,
      threads: false,
      script: this.script,
    });
    for (const [jobId, job] of this.jobs) void this.post(jobId, job.source, job.script);
    this.arm();
  }

  private send(msg: OcrRequest, transfer: Transferable[] = []) {
    this.worker.postMessage(msg, transfer);
  }

  private handle(msg: OcrResponse) {
    switch (msg.type) {
      case "progress":
        this.stage = msg.stage;
        this.onProgress?.(msg);
        break;
      case "loaded":
        this.backend = msg.backend;
        this.loadSettle?.resolve(msg.backend);
        this.loadSettle = null;
        break;
      case "result": {
        const job = this.jobs.get(msg.jobId);
        this.jobs.delete(msg.jobId);
        job?.resolve({
          width: msg.width,
          height: msg.height,
          rotation: msg.rotation,
          lines: msg.lines,
          backend: msg.backend,
          ms: msg.ms,
        });
        break;
      }
      case "error": {
        const error = new OcrError(msg.code, msg.message);
        if (msg.jobId === undefined) {
          this.loadSettle?.reject(error);
          this.loadSettle = null;
          this.loadPromise = null;
        } else {
          const job = this.jobs.get(msg.jobId);
          this.jobs.delete(msg.jobId);
          job?.reject(error);
        }
        break;
      }
    }
    this.arm();
  }

  private failAll(error: Error) {
    this.loadSettle?.reject(error);
    this.loadSettle = null;
    this.loadPromise = null;
    this.jobs.forEach((j) => j.reject(error));
    this.jobs.clear();
  }

  /** Script of the first load (the models for another one load when a page needs them). */
  private script: OcrScript = "latin";

  /** Download (first use) and start the models. Safe to call repeatedly. */
  load(script: OcrScript = this.script): Promise<OcrBackend> {
    if (!this.loadPromise) {
      this.loadPromise = new Promise(
        (resolve, reject) => (this.loadSettle = { resolve, reject }),
      );
      // WASM only: on some GPUs the float16 WebGPU session never finished starting.
      this.send({
        type: "load",
        ortBase: ORT_BASE,
        preferGpu: false,
        threads: !this.safe,
        script: (this.script = script),
      });
      this.arm();
    }
    return this.loadPromise;
  }

  /** Send a page (scaled to ≤ 2560 px on its long side) to the worker. */
  private async post(jobId: number, source: ImageBitmap, script: OcrScript) {
    const k = Math.min(
      1,
      IMAGE_MAX_SIDE / Math.max(source.width, source.height),
    );
    const bitmap =
      k < 1
        ? await createImageBitmap(source, {
            resizeWidth: Math.round(source.width * k),
            resizeHeight: Math.round(source.height * k),
            resizeQuality: "high",
          })
        : await createImageBitmap(source);
    this.send({ type: "recognize", jobId, bitmap, script }, [bitmap]);
  }

  /** Recognize the text in an image. `source` must stay open until this settles. */
  async recognize(source: ImageBitmap, script: OcrScript): Promise<OcrPageResult> {
    await this.load(script);
    const jobId = this.nextJob++;
    const done = new Promise<OcrPageResult>((resolve, reject) =>
      this.jobs.set(jobId, { source, script, resolve, reject }),
    );
    this.stage = null;
    await this.post(jobId, source, script);
    this.arm();
    return done;
  }

  dispose() {
    this.disposed = true;
    if (this.watchdog) clearTimeout(this.watchdog);
    this.failAll(new DOMException("Aborted", "AbortError") as unknown as Error);
    this.worker.terminate();
  }
}
