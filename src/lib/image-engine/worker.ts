/// <reference lib="webworker" />
import { decodeQr, runJob, thumbnail } from "./core";
import type { ImageJob } from "./types";

declare const self: DedicatedWorkerGlobalScope;

export type EngineRequest =
  | { id: number; op: "ping" }
  | { id: number; op: "job"; job: ImageJob }
  | { id: number; op: "thumb"; input: Blob | ImageBitmap; maxSide: number }
  | { id: number; op: "qr"; input: Blob | ImageBitmap };

export type EngineResponse = { id: number; ok: true; result: unknown } | { id: number; ok: false; error: string };

function canDrawOffscreen(): boolean {
  try {
    return typeof OffscreenCanvas !== "undefined" && !!new OffscreenCanvas(1, 1).getContext("2d");
  } catch {
    return false;
  }
}

self.onmessage = async (event: MessageEvent<EngineRequest>) => {
  const req = event.data;
  try {
    let result: unknown;
    if (req.op === "ping") result = { offscreen: canDrawOffscreen() };
    else if (req.op === "job") result = await runJob(req.job);
    else if (req.op === "thumb") result = await thumbnail(req.input, req.maxSide);
    else result = await decodeQr(req.input);
    self.postMessage({ id: req.id, ok: true, result } satisfies EngineResponse);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    self.postMessage({ id: req.id, ok: false, error: message } satisfies EngineResponse);
  }
};
