/// <reference lib="webworker" />
/**
 * Full-resolution photo filter export off the main thread (OffscreenCanvas).
 * Messages: { op: "ping" } → { offscreen }, { op: "run", bitmap, settings }
 * → progress messages, then { done, bitmap } (transferred) or { error }.
 */
import { processSteps, type FilterSettings } from "./pipeline";

type Req = { op: "ping" } | { op: "run"; bitmap: ImageBitmap; settings: FilterSettings };

const scope = self as unknown as DedicatedWorkerGlobalScope;

function hasOffscreen(): boolean {
  try {
    return typeof OffscreenCanvas !== "undefined" && !!new OffscreenCanvas(1, 1).getContext("2d");
  } catch {
    return false;
  }
}

scope.onmessage = (event: MessageEvent<Req>) => {
  const req = event.data;
  if (req.op === "ping") {
    scope.postMessage({ type: "pong", offscreen: hasOffscreen() });
    return;
  }
  try {
    const { bitmap, settings } = req;
    const w = bitmap.width;
    const h = bitmap.height;
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("OffscreenCanvas 2D unavailable");
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const img = ctx.getImageData(0, 0, w, h);
    let last = 0;
    const steps = processSteps(img.data, w, h, settings);
    for (let step = steps.next(); !step.done; step = steps.next()) {
      const p = step.value;
      if (p - last >= 0.02 || p === 1) {
        last = p;
        scope.postMessage({ type: "progress", progress: p });
      }
    }
    ctx.putImageData(img, 0, 0);
    const out = canvas.transferToImageBitmap();
    scope.postMessage({ type: "done", bitmap: out }, [out]);
  } catch (err) {
    scope.postMessage({ type: "error", error: err instanceof Error ? err.message : String(err) });
  }
};
