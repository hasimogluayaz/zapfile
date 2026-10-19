/// <reference lib="webworker" />
import { runHash, type HashJob, type HashMsg } from "./hash-core";

const w = self as unknown as DedicatedWorkerGlobalScope;
const post = (m: HashMsg) => w.postMessage(m);

w.onmessage = async (e: MessageEvent<HashJob>) => {
  const job = e.data;
  const t0 = performance.now();
  let last = 0;
  try {
    const results = await runHash(job, (done, total) => {
      const now = performance.now();
      if (now - last > 80 || done === total) {
        last = now;
        post({ id: job.id, type: "progress", done, total });
      }
    });
    post({ id: job.id, type: "done", results, ms: performance.now() - t0 });
  } catch (err) {
    post({ id: job.id, type: "error", message: err instanceof Error ? err.message : String(err) });
  }
};
