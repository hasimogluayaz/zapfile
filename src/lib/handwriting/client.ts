/**
 * Main-thread handle for the Handwriting to Text worker.
 */
import { IMAGE_MAX_SIDE } from "./models";
import type { OcrBackend, OcrErrorCode, OcrLineResult, OcrRequest, OcrResponse, OcrStage } from "./protocol";

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
  stage: OcrStage;
  jobId?: number;
  loaded?: number;
  total?: number;
  fromCache?: boolean;
}

export interface OcrPageResult {
  width: number;
  height: number;
  lines: OcrLineResult[];
  backend: OcrBackend;
  ms: number;
}

type Pending = { resolve: (r: OcrPageResult) => void; reject: (e: Error) => void };

const ORT_BASE = `/vendor/ort-${process.env.NEXT_PUBLIC_ORT_VERSION}/`;

export class HandwritingEngine {
  private worker: Worker;
  private nextJob = 1;
  private pending = new Map<number, Pending>();
  private loadPromise: Promise<OcrBackend> | null = null;
  private loadSettle: { resolve: (b: OcrBackend) => void; reject: (e: Error) => void } | null = null;
  backend: OcrBackend | null = null;
  onProgress: ((event: OcrProgress) => void) | null = null;

  constructor() {
    this.worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    this.worker.onmessage = (event: MessageEvent<OcrResponse>) => this.handle(event.data);
    this.worker.onerror = (event) => {
      event.preventDefault();
      this.failAll(new OcrError("runtime", event.message || "Worker crashed"));
    };
  }

  private send(msg: OcrRequest, transfer: Transferable[] = []) {
    this.worker.postMessage(msg, transfer);
  }

  private handle(msg: OcrResponse) {
    switch (msg.type) {
      case "progress":
        this.onProgress?.(msg);
        break;
      case "loaded":
        this.backend = msg.backend;
        this.loadSettle?.resolve(msg.backend);
        this.loadSettle = null;
        break;
      case "result": {
        const job = this.pending.get(msg.jobId);
        this.pending.delete(msg.jobId);
        job?.resolve({ width: msg.width, height: msg.height, lines: msg.lines, backend: msg.backend, ms: msg.ms });
        break;
      }
      case "error": {
        const error = new OcrError(msg.code, msg.message);
        if (msg.jobId === undefined) {
          this.loadSettle?.reject(error);
          this.loadSettle = null;
          this.loadPromise = null;
        } else {
          const job = this.pending.get(msg.jobId);
          this.pending.delete(msg.jobId);
          job?.reject(error);
        }
        break;
      }
    }
  }

  private failAll(error: Error) {
    this.loadSettle?.reject(error);
    this.loadSettle = null;
    this.loadPromise = null;
    this.pending.forEach((p) => p.reject(error));
    this.pending.clear();
  }

  /** Download (first use) and start the models. Safe to call repeatedly. */
  load(): Promise<OcrBackend> {
    if (!this.loadPromise) {
      this.loadPromise = new Promise((resolve, reject) => (this.loadSettle = { resolve, reject }));
      this.send({ type: "load", ortBase: ORT_BASE, preferGpu: true });
    }
    return this.loadPromise;
  }

  /** Recognize the text in an image (scaled to ≤ 2560 px on its long side). */
  async recognize(source: ImageBitmap): Promise<OcrPageResult> {
    await this.load();
    const k = Math.min(1, IMAGE_MAX_SIDE / Math.max(source.width, source.height));
    const bitmap =
      k < 1
        ? await createImageBitmap(source, { resizeWidth: Math.round(source.width * k), resizeHeight: Math.round(source.height * k), resizeQuality: "high" })
        : await createImageBitmap(source);
    const jobId = this.nextJob++;
    return new Promise((resolve, reject) => {
      this.pending.set(jobId, { resolve, reject });
      this.send({ type: "recognize", jobId, bitmap }, [bitmap]);
    });
  }

  dispose() {
    this.failAll(new DOMException("Aborted", "AbortError") as unknown as Error);
    this.worker.terminate();
  }
}
