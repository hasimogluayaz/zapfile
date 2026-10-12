/**
 * Run one job on a fresh worker: progress callbacks, transferable input,
 * cancellation via AbortSignal (terminates the worker, so a cancelled run can
 * never deliver a late result). Used by Merge, Split and Rotate PDF.
 */
export type WorkerReply =
  | { type: "progress"; value: number; file?: number }
  | { type: "done"; bytes: Uint8Array; name?: string; kind?: "pdf" | "zip" }
  | { type: "error"; code: string; file?: number; message?: string };

export class WorkerTaskError extends Error {
  constructor(
    public code: string,
    public file?: number,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "WorkerTaskError";
  }
}

export function runWorkerTask(
  createWorker: () => Worker,
  message: unknown,
  transfer: Transferable[],
  onProgress: (value: number, file?: number) => void,
  signal: AbortSignal,
): Promise<Extract<WorkerReply, { type: "done" }>> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const worker = createWorker();
    const finish = () => {
      signal.removeEventListener("abort", onAbort);
      worker.terminate();
    };
    const onAbort = () => {
      finish();
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
    worker.onmessage = (e: MessageEvent<WorkerReply>) => {
      const msg = e.data;
      if (msg.type === "progress") onProgress(msg.value, msg.file);
      else if (msg.type === "done") {
        finish();
        resolve(msg);
      } else {
        finish();
        reject(new WorkerTaskError(msg.code, msg.file, msg.message));
      }
    };
    worker.onerror = (e) => {
      finish();
      reject(new WorkerTaskError("crash", undefined, e.message));
    };
    worker.postMessage(message, transfer);
  });
}
