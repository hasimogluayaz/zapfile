/// <reference lib="webworker" />
/**
 * GIF encoder worker. The page streams frames in (transferring their pixel
 * buffers) while it keeps seeking the video, so extraction and encoding
 * overlap and nothing heavy runs on the main thread.
 */
import { GifStream, type GifJob } from "./gif-core";

export type GifWorkerIn =
  | { type: "init"; job: GifJob }
  | { type: "samples"; buffers: ArrayBuffer[] }
  | { type: "frame"; buffer: ArrayBuffer }
  | { type: "finish" };

export type GifWorkerOut =
  | { type: "frameDone"; count: number }
  | { type: "done"; buffer: ArrayBuffer }
  | { type: "error"; message: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;
let stream: GifStream | null = null;
let count = 0;

ctx.onmessage = (event: MessageEvent<GifWorkerIn>) => {
  const msg = event.data;
  try {
    if (msg.type === "init") {
      stream = new GifStream(msg.job);
      count = 0;
    } else if (msg.type === "samples") {
      stream?.setSamples(msg.buffers.map((b) => new Uint8ClampedArray(b)));
    } else if (msg.type === "frame") {
      if (!stream) throw new Error("not initialised");
      stream.addFrame(new Uint8ClampedArray(msg.buffer));
      count++;
      ctx.postMessage({ type: "frameDone", count } satisfies GifWorkerOut);
    } else if (msg.type === "finish") {
      if (!stream) throw new Error("not initialised");
      const bytes = stream.finish();
      stream = null;
      const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      ctx.postMessage({ type: "done", buffer } satisfies GifWorkerOut, [buffer]);
    }
  } catch (err) {
    ctx.postMessage({ type: "error", message: err instanceof Error ? err.message : String(err) } satisfies GifWorkerOut);
  }
};
