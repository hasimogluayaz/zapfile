/** Encode AudioBuffer to MP3 (128 kbps) using lamejs — client-only. */

function floatTo16(input: Float32Array): Int16Array {
  const out = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]!));
    out[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
  }
  return out;
}

export async function encodeAudioBufferToMp3(audioBuffer: AudioBuffer): Promise<Blob> {
  const { Mp3Encoder } = await import("lamejs");

  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const encoder = new Mp3Encoder(channels, sampleRate, 128);
  const blockSize = 1152;
  const mp3Parts: BlobPart[] = [];

  const left = floatTo16(audioBuffer.getChannelData(0));

  if (channels === 1) {
    for (let i = 0; i < left.length; i += blockSize) {
      const chunk = left.subarray(i, i + blockSize);
      const buf = encoder.encodeBuffer(chunk);
      if (buf.length > 0) mp3Parts.push(new Uint8Array(buf));
    }
  } else {
    const right = floatTo16(audioBuffer.getChannelData(1));
    const n = Math.min(left.length, right.length);
    for (let i = 0; i < n; i += blockSize) {
      const buf = encoder.encodeBuffer(
        left.subarray(i, i + blockSize),
        right.subarray(i, i + blockSize),
      );
      if (buf.length > 0) mp3Parts.push(new Uint8Array(buf));
    }
  }

  const end = encoder.flush();
  if (end.length > 0) mp3Parts.push(new Uint8Array(end));

  return new Blob(mp3Parts, { type: "audio/mpeg" });
}
