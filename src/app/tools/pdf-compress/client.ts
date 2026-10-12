/**
 * Main-thread side of the PDF compressor worker. Services the worker's image
 * jobs with the shared image engine (MozJPEG, Lanczos) and supports cancel.
 */
import { AbortError, processImage } from "@/lib/image-engine";
import type { FromWorker, ImageJobRequest, InspectInfo, RunOptions, ToWorker } from "./protocol";

function spawn(): Worker {
  return new Worker(new URL("./compress.worker.ts", import.meta.url), { type: "module" });
}

function copy(bytes: Uint8Array): ArrayBuffer {
  return bytes.slice().buffer as ArrayBuffer;
}

/** Inspect a PDF (page count, how much of it is images) off the main thread. */
export function inspectPdf(bytes: Uint8Array, signal?: AbortSignal): Promise<InspectInfo> {
  return new Promise((resolve, reject) => {
    const worker = spawn();
    const finish = () => worker.terminate();
    signal?.addEventListener(
      "abort",
      () => {
        finish();
        reject(new AbortError());
      },
      { once: true },
    );
    worker.onmessage = (event: MessageEvent<FromWorker>) => {
      const msg = event.data;
      if (msg.type === "inspected") resolve(msg.info);
      else if (msg.type === "error") reject(new Error(msg.message));
      else return;
      finish();
    };
    worker.onerror = (event) => {
      event.preventDefault();
      finish();
      reject(new Error(event.message || "Worker failed"));
    };
    const buffer = copy(bytes);
    worker.postMessage({ type: "inspect", bytes: buffer } satisfies ToWorker, [buffer]);
  });
}

async function runImageJob(job: ImageJobRequest, quality: number, signal: AbortSignal) {
  const input =
    job.kind === "jpeg" ? new Blob([job.data], { type: "image/jpeg" }) : (job.bitmap as unknown as Blob); // engine accepts (and transfers) ImageBitmap
  const resize = job.targetW < job.width || job.targetH < job.height;
  const res = await processImage(
    {
      input,
      transform: resize
        ? { resize: { width: job.targetW, height: job.targetH, fit: "stretch" }, background: "#ffffff" }
        : { background: "#ffffff" },
      encode: { format: "image/jpeg", quality },
    },
    signal,
  );
  return { jpeg: await res.blob.arrayBuffer(), width: res.width, height: res.height };
}

/** Compress (recommended / lossless). Rejects with AbortError when cancelled. */
export function compressPdf(
  bytes: Uint8Array,
  options: RunOptions,
  onProgress: (done: number, total: number) => void,
  signal: AbortSignal,
): Promise<{ bytes: Uint8Array; replaced: number; candidates: number }> {
  return new Promise((resolve, reject) => {
    const worker = spawn();
    let settled = false;
    const finish = () => {
      settled = true;
      worker.terminate();
    };
    signal.addEventListener(
      "abort",
      () => {
        if (settled) return;
        finish();
        reject(new AbortError());
      },
      { once: true },
    );
    worker.onmessage = async (event: MessageEvent<FromWorker>) => {
      const msg = event.data;
      if (msg.type === "progress") onProgress(msg.done, msg.total);
      else if (msg.type === "done") {
        finish();
        resolve({ bytes: new Uint8Array(msg.bytes), replaced: msg.replaced, candidates: msg.candidates });
      } else if (msg.type === "error") {
        finish();
        reject(new Error(msg.message));
      } else if (msg.type === "job") {
        let reply: ToWorker;
        const transfer: Transferable[] = [];
        try {
          const r = await runImageJob(msg.job, options.quality, signal);
          reply = { type: "jobResult", jobId: msg.jobId, ...r };
          transfer.push(r.jpeg);
        } catch (error) {
          if (signal.aborted || error instanceof AbortError) return;
          console.warn("Image re-encode failed", error);
          reply = { type: "jobResult", jobId: msg.jobId, jpeg: null, width: 0, height: 0 };
        }
        if (!settled) worker.postMessage(reply, transfer);
      }
    };
    worker.onerror = (event) => {
      event.preventDefault();
      if (settled) return;
      finish();
      reject(new Error(event.message || "Worker failed"));
    };
    const buffer = copy(bytes);
    worker.postMessage({ type: "run", bytes: buffer, options } satisfies ToWorker, [buffer]);
  });
}
