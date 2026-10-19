/// <reference lib="webworker" />
/** Off-main-thread WAV / MP3 export for the audio recorder. */
import { encodePcmToMp3, encodePcmToWav } from "@/lib/mp3-encode";

export type EncodeRequest = { format: "wav" | "mp3"; channels: Float32Array[]; sampleRate: number; kbps?: number };
export type EncodeResponse =
  | { type: "progress"; fraction: number }
  | { type: "done"; blob: Blob }
  | { type: "error"; message: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (event: MessageEvent<EncodeRequest>) => {
  const { format, channels, sampleRate, kbps } = event.data;
  let last = -1;
  const onProgress = (fraction: number) => {
    const pct = Math.floor(fraction * 100);
    if (pct === last) return;
    last = pct;
    ctx.postMessage({ type: "progress", fraction } satisfies EncodeResponse);
  };
  try {
    const blob =
      format === "mp3"
        ? await encodePcmToMp3(channels, sampleRate, kbps ?? 192, { onProgress })
        : encodePcmToWav(channels, sampleRate, { onProgress });
    ctx.postMessage({ type: "done", blob } satisfies EncodeResponse);
  } catch (err) {
    ctx.postMessage({ type: "error", message: err instanceof Error ? err.message : String(err) } satisfies EncodeResponse);
  }
};
