/**
 * PCM → MP3 / WAV encoders. Pure functions that run in a Web Worker
 * (see `src/app/tools/audio-recorder/encode.worker.ts`) — never call the MP3
 * encoder on the main thread for long audio, it is CPU-bound.
 */

function floatTo16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]!));
    out[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
  }
  return out;
}

export interface EncodeHooks {
  /** Called with 0–1 roughly every 1% of the work. */
  onProgress?: (fraction: number) => void;
}

/** Encode planar float PCM (1 or 2 channels) to MP3 with lamejs. */
export async function encodePcmToMp3(
  channels: Float32Array[],
  sampleRate: number,
  kbps = 128,
  hooks: EncodeHooks = {},
): Promise<Blob> {
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const stereo = channels.length > 1;
  const encoder = new Mp3Encoder(stereo ? 2 : 1, sampleRate, kbps);
  const blockSize = 1152;
  const parts: BlobPart[] = [];
  const left = floatTo16(channels[0]);
  const right = stereo ? floatTo16(channels[1]) : null;
  const n = right ? Math.min(left.length, right.length) : left.length;
  const reportEvery = Math.max(blockSize, Math.floor(n / 100 / blockSize) * blockSize);
  for (let i = 0; i < n; i += blockSize) {
    const buf = right
      ? encoder.encodeBuffer(left.subarray(i, i + blockSize), right.subarray(i, i + blockSize))
      : encoder.encodeBuffer(left.subarray(i, i + blockSize));
    if (buf.length > 0) parts.push(new Uint8Array(buf));
    if (i % reportEvery === 0) hooks.onProgress?.(i / n);
  }
  const end = encoder.flush();
  if (end.length > 0) parts.push(new Uint8Array(end));
  hooks.onProgress?.(1);
  return new Blob(parts, { type: "audio/mpeg" });
}

/** Encode planar float PCM to a 16-bit PCM WAV file. */
export function encodePcmToWav(channels: Float32Array[], sampleRate: number, hooks: EncodeHooks = {}): Blob {
  const numChannels = channels.length;
  const numSamples = Math.min(...channels.map((c) => c.length));
  const blockAlign = numChannels * 2;
  const dataSize = numSamples * blockAlign;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  const pcm = new Int16Array(buf, 44);
  const reportEvery = Math.max(1, Math.floor(numSamples / 50));
  for (let i = 0, o = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = Math.max(-1, Math.min(1, channels[ch][i]));
      pcm[o++] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    if (i % reportEvery === 0) hooks.onProgress?.(i / numSamples);
  }
  hooks.onProgress?.(1);
  return new Blob([buf], { type: "audio/wav" });
}
