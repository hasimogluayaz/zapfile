/// <reference lib="webworker" />

import { computeDiff } from "@/lib/diff-core";

const w = self as unknown as DedicatedWorkerGlobalScope;

w.onmessage = (e: MessageEvent<{ original: string; modified: string }>) => {
  const { original, modified } = e.data;
  try {
    const diffResult = computeDiff(original, modified);
    w.postMessage({ ok: true, diffResult });
  } catch (err) {
    w.postMessage({
      ok: false,
      error: err instanceof Error ? err.message : "diff failed",
    });
  }
};
