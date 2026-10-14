/**
 * Off-main-thread image engine. Heavy decode/resize/encode work runs in a
 * small pool of Web Workers so the UI never freezes; batches run in
 * parallel. Browsers without OffscreenCanvas in workers (Safari < 16.4) run
 * the same pipeline on the main thread.
 *
 *   const { blob } = await processImage({ input: file, encode: { format: "image/webp", quality: 0.8 } });
 */
import type { ImageJob, ImageJobResult, QrResult } from "./types";
import type { EngineRequest, EngineResponse } from "./worker";

export type { ImageJob, ImageJobResult, QrResult, OutputFormat, EncodeSettings, Transform, ResizeSpec, FitMode } from "./types";

type Pending = { resolve: (v: unknown) => void; reject: (e: unknown) => void };

interface Slot {
  worker: Worker;
  busy: boolean;
  pending: Map<number, Pending>;
}

/** EngineRequest without its id (distributes over the union). */
type RequestBody = EngineRequest extends infer R ? (R extends unknown ? Omit<R, "id"> : never) : never;

type Task = {
  request: RequestBody;
  transfer: Transferable[];
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
  signal?: AbortSignal;
};

export class AbortError extends Error {
  constructor() {
    super("Aborted");
    this.name = "AbortError";
  }
}

let nextId = 1;
const slots: Slot[] = [];
const queue: Task[] = [];
let mode: Promise<"worker" | "main"> | null = null;

function poolSize() {
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
  return Math.max(1, Math.min(4, cores - 1));
}

function spawn(): Slot {
  const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  const slot: Slot = { worker, busy: false, pending: new Map() };
  worker.onmessage = (event: MessageEvent<EngineResponse>) => {
    const msg = event.data;
    const p = slot.pending.get(msg.id);
    if (!p) return;
    slot.pending.delete(msg.id);
    slot.busy = false;
    if (msg.ok) p.resolve(msg.result);
    else p.reject(new Error(msg.error));
    pump();
  };
  worker.onerror = (event) => {
    event.preventDefault();
    const error = new Error(event.message || "Image worker crashed");
    slot.pending.forEach((p) => p.reject(error));
    replace(slot);
  };
  return slot;
}

function replace(slot: Slot) {
  slot.worker.terminate();
  const i = slots.indexOf(slot);
  if (i >= 0) slots[i] = spawn();
  pump();
}

function pump() {
  while (queue.length) {
    let slot = slots.find((s) => !s.busy);
    if (!slot && slots.length < poolSize()) {
      slot = spawn();
      slots.push(slot);
    }
    if (!slot) return;
    const task = queue.shift()!;
    if (task.signal?.aborted) {
      task.reject(new AbortError());
      continue;
    }
    const id = nextId++;
    const busySlot = slot;
    busySlot.busy = true;
    busySlot.pending.set(id, { resolve: task.resolve, reject: task.reject });
    if (task.signal) {
      task.signal.addEventListener(
        "abort",
        () => {
          if (!busySlot.pending.has(id)) return;
          busySlot.pending.delete(id);
          task.reject(new AbortError());
          replace(busySlot); // the only way to stop work already running
        },
        { once: true },
      );
    }
    busySlot.worker.postMessage({ ...task.request, id }, task.transfer);
  }
}

function enqueue<T>(request: Task["request"], transfer: Transferable[] = [], signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) return reject(new AbortError());
    queue.push({ request, transfer, resolve: resolve as (v: unknown) => void, reject, signal });
    pump();
  });
}

async function engineMode(): Promise<"worker" | "main"> {
  if (!mode) {
    mode = (async () => {
      if (typeof Worker === "undefined") return "main";
      try {
        const res = await Promise.race([
          enqueue<{ offscreen: boolean }>({ op: "ping" }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000)),
        ]);
        return res.offscreen ? "worker" : "main";
      } catch {
        return "main";
      }
    })();
  }
  return mode;
}

/** Decode → transform → encode one image off the main thread. */
export async function processImage(job: ImageJob, signal?: AbortSignal): Promise<ImageJobResult> {
  if ((await engineMode()) === "main") {
    const core = await import("./core");
    if (signal?.aborted) throw new AbortError();
    return core.runJob(job);
  }
  return enqueue<ImageJobResult>({ op: "job", job }, job.input instanceof Blob ? [] : [job.input as ImageBitmap], signal);
}

/** Small WebP preview for lists and grids. */
export async function makeThumbnail(input: Blob | ImageBitmap, maxSide = 320, signal?: AbortSignal) {
  if ((await engineMode()) === "main") {
    const core = await import("./core");
    return core.thumbnail(input, maxSide);
  }
  return enqueue<{ blob: Blob; width: number; height: number }>(
    { op: "thumb", input, maxSide },
    input instanceof Blob ? [] : [input],
    signal,
  );
}

/** Find and decode a QR code (BarcodeDetector when available, else jsQR at several scales). */
export async function scanQr(input: Blob | ImageBitmap, signal?: AbortSignal): Promise<QrResult | null> {
  if ((await engineMode()) === "main") {
    const core = await import("./core");
    return core.decodeQr(input);
  }
  return enqueue<QrResult | null>({ op: "qr", input }, input instanceof Blob ? [] : [input], signal);
}

/** Run jobs with the pool's parallelism, reporting completion progress. */
export async function processAll<T>(
  items: T[],
  makeJob: (item: T) => ImageJob,
  onProgress?: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<ImageJobResult[]> {
  let done = 0;
  return Promise.all(
    items.map((item) =>
      processImage(makeJob(item), signal).then((r) => {
        done++;
        onProgress?.(done, items.length);
        return r;
      }),
    ),
  );
}

export function extensionFor(format: string): string {
  if (format === "image/jpeg") return "jpg";
  if (format === "image/webp") return "webp";
  return "png";
}
