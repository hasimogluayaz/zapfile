"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProgressBar from "@/components/ProgressBar";
import { useI18n } from "@/lib/i18n";

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, "0")}.${ms}`;
}

// ---------------------------------------------------------------------------
// NeuQuant – neural-net color quantizer (adapted from Anthony Dekker / jnordberg)
// Reduces RGBA pixels to a 256-color palette.
// ---------------------------------------------------------------------------

function neuquant(pixels: Uint8ClampedArray, colorCount: number): Uint8Array {
  const netsize = colorCount;
  const maxnetpos = netsize - 1;
  const netbiasshift = 4;
  const ncycles = 100;
  const intbiasshift = 16;
  const intbias = 1 << intbiasshift;
  const gammashift = 10;
  const betashift = 10;
  const beta = intbias >> betashift;
  const betagamma = intbias << (gammashift - betashift);
  const initrad = netsize >> 3;
  const radiusbiasshift = 6;
  const radiusbias = 1 << radiusbiasshift;
  const initradius = initrad * radiusbias;
  const radiusdec = 30;
  const alphabiasshift = 10;
  const initalpha = 1 << alphabiasshift;
  const radbiasshift = 8;
  const radbias = 1 << radbiasshift;
  const alpharadbshift = alphabiasshift + radbiasshift;

  const network: number[][] = [];
  const netindex = new Int32Array(256);
  const bias = new Int32Array(netsize);
  const freq = new Int32Array(netsize);
  const radpower = new Int32Array(initrad);

  for (let i = 0; i < netsize; i++) {
    const v = (i << (netbiasshift + 8)) / netsize;
    network[i] = [v, v, v, 0];
    freq[i] = intbias / netsize;
    bias[i] = 0;
  }

  const pixelCount = pixels.length / 4;
  const samplefac = Math.max(1, Math.floor(pixelCount / (netsize * 30)));
  const alphadec = 30 + Math.floor((samplefac - 1) / 3);

  let alpha = initalpha;
  let radius = initradius;
  let rad = radius >> radiusbiasshift;
  if (rad <= 1) rad = 0;
  for (let i = 0; i < rad; i++) {
    radpower[i] = Math.floor(alpha * (((rad * rad - i * i) * radbias) / (rad * rad)));
  }

  const step = samplefac === 1 ? 4 : samplefac % 2 === 0 ? samplefac * 2 : samplefac * 4;

  let delta = Math.floor(pixelCount / (ncycles * samplefac));
  if (delta < 1) delta = 1;

  let i = 0;
  let pix = 0;

  for (let learn = 0; learn < ncycles * samplefac; ) {
    const b = pixels[pix] << netbiasshift;
    const g = pixels[pix + 1] << netbiasshift;
    const r = pixels[pix + 2] << netbiasshift;

    // find closest neuron
    let bestd = ~(1 << 31);
    let bestbiasd = bestd;
    let bestpos = -1;
    let bestbiaspos = bestpos;

    for (let j = 0; j < netsize; j++) {
      const n = network[j];
      const dist = Math.abs(n[2] - r) + Math.abs(n[1] - g) + Math.abs(n[0] - b);
      if (dist < bestd) { bestd = dist; bestpos = j; }
      const biasdist = dist - (bias[j] >> (intbiasshift - netbiasshift));
      if (biasdist < bestbiasd) { bestbiasd = biasdist; bestbiaspos = j; }
      freq[j] -= freq[j] >> 5;
      bias[j] += freq[j] << gammashift;
    }
    freq[bestpos] += beta;
    bias[bestpos] -= betagamma;

    // alter winner
    const n0 = network[bestbiaspos];
    n0[0] += (alpha * (b - n0[0])) >> alphabiasshift;
    n0[1] += (alpha * (g - n0[1])) >> alphabiasshift;
    n0[2] += (alpha * (r - n0[2])) >> alphabiasshift;

    if (rad !== 0) {
      const lo = Math.max(bestbiaspos - rad, 0);
      const hi = Math.min(bestbiaspos + rad, maxnetpos);
      let jj = bestbiaspos + 1;
      let k = bestbiaspos - 1;
      let q = 0;
      while (jj <= hi || k >= lo) {
        const a = radpower[++q];
        if (jj <= hi) {
          const p = network[jj++];
          p[0] -= (a * (p[0] - b)) >> alpharadbshift;
          p[1] -= (a * (p[1] - g)) >> alpharadbshift;
          p[2] -= (a * (p[2] - r)) >> alpharadbshift;
        }
        if (k >= lo) {
          const p = network[k--];
          p[0] -= (a * (p[0] - b)) >> alpharadbshift;
          p[1] -= (a * (p[1] - g)) >> alpharadbshift;
          p[2] -= (a * (p[2] - r)) >> alpharadbshift;
        }
      }
    }

    pix += step * 4;
    if (pix >= pixels.length) pix -= pixels.length;

    i++;
    if (i % delta === 0) {
      alpha -= Math.floor(alpha / alphadec);
      radius -= Math.floor(radius / radiusdec);
      rad = radius >> radiusbiasshift;
      if (rad <= 1) rad = 0;
      for (let jj = 0; jj < rad; jj++) {
        radpower[jj] = Math.floor(alpha * (((rad * rad - jj * jj) * radbias) / (rad * rad)));
      }
    }
    learn++;
  }

  // Build sorted palette by blue channel for fast lookup
  const map: Uint8Array = new Uint8Array(netsize * 3);
  const index: number[] = new Array(netsize);
  for (let jj = 0; jj < netsize; jj++) index[jj] = jj;
  index.sort((a, b_) => network[a][0] - network[b_][0]);

  for (let jj = 0; jj < netsize; jj++) {
    const n = network[index[jj]];
    map[jj * 3] = n[2] >> netbiasshift;
    map[jj * 3 + 1] = n[1] >> netbiasshift;
    map[jj * 3 + 2] = n[0] >> netbiasshift;
    netindex[index[jj]] = jj;
  }

  // Build blue lookup for fast nearest-neighbor
  const blookup = new Int32Array(256).fill(netsize);
  let prev = 0;
  for (let jj = 0; jj < netsize; jj++) {
    const cur = map[jj * 3 + 2]; // blue channel
    for (let bb = prev; bb <= cur; bb++) {
      if (blookup[bb] === netsize) blookup[bb] = jj;
    }
    prev = cur + 1;
  }
  for (let bb = prev; bb < 256; bb++) {
    if (blookup[bb] === netsize) blookup[bb] = netsize - 1;
  }

  return map;
}

// Map every pixel to its nearest palette index
function mapPixels(
  pixels: Uint8ClampedArray,
  palette: Uint8Array,
  colorCount: number
): Uint8Array {
  const out = new Uint8Array(pixels.length / 4);
  for (let i = 0, p = 0; i < pixels.length; i += 4, p++) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    let best = 0;
    let bestDist = Infinity;
    for (let j = 0; j < colorCount; j++) {
      const dr = r - palette[j * 3];
      const dg = g - palette[j * 3 + 1];
      const db = b - palette[j * 3 + 2];
      const d = dr * dr + dg * dg + db * db;
      if (d < bestDist) { bestDist = d; best = j; }
    }
    out[p] = best;
  }
  return out;
}

// ---------------------------------------------------------------------------
// LZW encoder for GIF
// ---------------------------------------------------------------------------

function lzwEncode(indexedPixels: Uint8Array, minCodeSize: number): Uint8Array {
  const clearCode = 1 << minCodeSize;
  const eofCode = clearCode + 1;
  const tableSize = 4096;

  const table = new Map<number, number>();
  const resetTable = () => {
    table.clear();
    for (let i = 0; i < clearCode; i++) table.set(i, i);
  };

  resetTable();
  let nextCode = eofCode + 1;
  let codeSize = minCodeSize + 1;
  let maxCode = 1 << codeSize;

  // bit packing
  const out: number[] = [];
  let bitBuf = 0;
  let bitLen = 0;

  const emit = (code: number) => {
    bitBuf |= code << bitLen;
    bitLen += codeSize;
    while (bitLen >= 8) {
      out.push(bitBuf & 0xff);
      bitBuf >>= 8;
      bitLen -= 8;
    }
  };

  emit(clearCode);

  let prefix = indexedPixels[0];
  for (let i = 1; i < indexedPixels.length; i++) {
    const suffix = indexedPixels[i];
    const key = prefix * 256 + suffix; // works because suffix < 256
    if (table.has(key)) {
      prefix = table.get(key)!;
    } else {
      emit(prefix);
      if (nextCode < tableSize) {
        table.set(key, nextCode++);
        if (nextCode > maxCode && codeSize < 12) {
          codeSize++;
          maxCode <<= 1;
        }
      } else {
        // reset
        emit(clearCode);
        resetTable();
        nextCode = eofCode + 1;
        codeSize = minCodeSize + 1;
        maxCode = 1 << codeSize;
      }
      prefix = suffix;
    }
  }
  emit(prefix);
  emit(eofCode);

  if (bitLen > 0) out.push(bitBuf & 0xff);

  return new Uint8Array(out);
}

// ---------------------------------------------------------------------------
// GIF89a binary writer
// ---------------------------------------------------------------------------

function writeGIF(
  frames: { indexed: Uint8Array; palette: Uint8Array }[],
  width: number,
  height: number,
  delayCs: number,        // hundredths of a second per frame
  colorCount: number,
  /** 0 = infinite loop (GIF convention); otherwise repeat count */
  netscapeLoopCount: number,
): Uint8Array {
  const colorBits = Math.ceil(Math.log2(colorCount)) - 1; // packed field bits

  const bufs: Uint8Array[] = [];
  const push = (arr: Uint8Array | number[]) => {
    bufs.push(arr instanceof Uint8Array ? arr : new Uint8Array(arr));
  };

  // --- GIF89a header ---
  push([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]); // "GIF89a"

  // Logical screen descriptor (use first frame palette as global)
  const globalPalette = frames[0].palette;
  push([
    width & 0xff, (width >> 8) & 0xff,
    height & 0xff, (height >> 8) & 0xff,
    0x80 | colorBits,  // global color table flag + size
    0,                  // background color index
    0,                  // pixel aspect ratio
  ]);
  push(globalPalette);
  // Pad palette to exact 2^(colorBits+1) entries if needed
  const declaredColors = 1 << (colorBits + 1);
  if (declaredColors > colorCount) {
    push(new Uint8Array((declaredColors - colorCount) * 3));
  }

  // --- Netscape looping extension ---
  const lc = Math.max(0, Math.min(65535, netscapeLoopCount));
  push([
    0x21, 0xff, 0x0b,
    0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30, // "NETSCAPE2.0"
    0x03, 0x01,
    lc & 0xff,
    (lc >> 8) & 0xff,
    0x00,
  ]);

  const minCodeSize = Math.max(2, colorBits + 1);

  for (const frame of frames) {
    // Graphic control extension
    push([
      0x21, 0xf9, 0x04,
      0x04,                              // dispose = do not dispose
      delayCs & 0xff, (delayCs >> 8) & 0xff,
      0x00,                              // transparent color index (none)
      0x00,                              // block terminator
    ]);

    // Image descriptor
    push([
      0x2c,
      0, 0, 0, 0,                        // left, top
      width & 0xff, (width >> 8) & 0xff,
      height & 0xff, (height >> 8) & 0xff,
      0x00,                              // no local color table, no interlace
    ]);

    // Image data
    const lzw = lzwEncode(frame.indexed, minCodeSize);

    push([minCodeSize]);

    // Split LZW into sub-blocks (max 255 bytes each)
    for (let off = 0; off < lzw.length; off += 255) {
      const chunk = lzw.subarray(off, off + 255);
      push([chunk.length]);
      push(chunk);
    }
    push([0x00]); // block terminator
  }

  // GIF trailer
  push([0x3b]);

  // Concatenate all buffers
  let totalLen = 0;
  for (const b of bufs) totalLen += b.length;
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const b of bufs) {
    result.set(b, offset);
    offset += b.length;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Main encoder: frames → real GIF89a binary
// ---------------------------------------------------------------------------

async function framesToGIF(
  frames: ImageData[],
  width: number,
  height: number,
  fps: number,
  colorCount: number,
  netscapeLoopCount: number,
  onProgress: (pct: number) => void
): Promise<Uint8Array> {
  const delayCs = Math.round(100 / fps); // centiseconds per frame

  const encodedFrames: { indexed: Uint8Array; palette: Uint8Array }[] = [];

  for (let i = 0; i < frames.length; i++) {
    // Allow the browser to breathe between frames
    await new Promise<void>((r) => setTimeout(r, 0));

    const { data } = frames[i];
    const palette = neuquant(data, colorCount);
    const indexed = mapPixels(data, palette, colorCount);
    encodedFrames.push({ indexed, palette });

    onProgress(Math.round(((i + 1) / frames.length) * 100));
  }

  return writeGIF(encodedFrames, width, height, delayCs, colorCount, netscapeLoopCount);
}

// ---------------------------------------------------------------------------
// Estimated output size (very rough: ~1 bit/pixel per frame after LZW)
// ---------------------------------------------------------------------------

function estimateSize(
  width: number,
  height: number,
  frameCount: number
): number {
  // Empirical: roughly 0.5–1 byte per pixel per frame after LZW
  return Math.round(width * height * frameCount * 0.75);
}

// ---------------------------------------------------------------------------
// Settings constants
// ---------------------------------------------------------------------------

const FPS_OPTIONS = [5, 10, 15, 20] as const;
const WIDTH_OPTIONS = [240, 320, 480] as const;
const COLOR_OPTIONS = [
  { label: "Low", value: 64 },
  { label: "Medium", value: 128 },
  { label: "High", value: 256 },
] as const;

type FpsValue = (typeof FPS_OPTIONS)[number];
type WidthValue = (typeof WIDTH_OPTIONS)[number];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function VideoToGifPage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);

  // Settings
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(5);
  const [fps, setFps] = useState<FpsValue>(10);
  const [outputWidth, setOutputWidth] = useState<WidthValue>(320);
  const [colorCount, setColorCount] = useState(128);
  const [gifLoop, setGifLoop] = useState<"forever" | "once" | "three">("forever");

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [progressLabel, setProgressLabel] = useState("");
  const [extractProgress, setExtractProgress] = useState(0);
  const [encodeProgress, setEncodeProgress] = useState(0);

  // Output
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [outputSize, setOutputSize] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const prevVideoUrlRef = useRef<string | null>(null);
  const prevOutputUrlRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (prevVideoUrlRef.current) URL.revokeObjectURL(prevVideoUrlRef.current);
      if (prevOutputUrlRef.current) URL.revokeObjectURL(prevOutputUrlRef.current);
    };
  }, []);

  const handleFiles = useCallback((files: File[]) => {
    const f = files[0];
    if (!f) return;

    if (prevVideoUrlRef.current) URL.revokeObjectURL(prevVideoUrlRef.current);
    if (prevOutputUrlRef.current) {
      URL.revokeObjectURL(prevOutputUrlRef.current);
      prevOutputUrlRef.current = null;
    }

    const url = URL.createObjectURL(f);
    prevVideoUrlRef.current = url;
    setFile(f);
    setVideoUrl(url);
    setOutputUrl(null);
    setOutputBlob(null);
    setOutputSize(0);
    setExtractProgress(0);
    setEncodeProgress(0);
    setStartTime(0);
    setEndTime(5);
  }, []);

  const handleVideoLoaded = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const dur = video.duration;
    const safeDur = isFinite(dur) ? dur : 0;
    setVideoDuration(safeDur);
    if (safeDur > 0) {
      setEndTime(Math.min(5, safeDur));
    }
  }, []);

  const handleReset = useCallback(() => {
    if (prevVideoUrlRef.current) {
      URL.revokeObjectURL(prevVideoUrlRef.current);
      prevVideoUrlRef.current = null;
    }
    if (prevOutputUrlRef.current) {
      URL.revokeObjectURL(prevOutputUrlRef.current);
      prevOutputUrlRef.current = null;
    }
    setFile(null);
    setVideoUrl(null);
    setOutputUrl(null);
    setOutputBlob(null);
    setVideoDuration(0);
    setExtractProgress(0);
    setEncodeProgress(0);
  }, []);

  // Derived values
  const clipDuration = Math.max(0, endTime - startTime);
  const totalFrames = Math.max(1, Math.ceil(clipDuration * fps));
  const estimatedBytes = estimateSize(outputWidth, Math.round(outputWidth * 0.5625), totalFrames);

  const clampEndTime = useCallback(
    (val: number) => {
      const clipped = Math.min(val, videoDuration > 0 ? videoDuration : val);
      const limited = Math.min(clipped, startTime + 10);
      return Math.max(limited, startTime + 0.1);
    },
    [startTime, videoDuration]
  );

  // Seek video and capture a frame
  const seekAndCapture = (
    video: HTMLVideoElement,
    ctx: CanvasRenderingContext2D,
    time: number,
    outW: number,
    outH: number
  ): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        video.removeEventListener("seeked", onSeeked);
        reject(new Error(`Seek timeout at ${time}`));
      }, 5000);

      const onSeeked = () => {
        clearTimeout(timeout);
        ctx.drawImage(video, 0, 0, outW, outH);
        resolve(ctx.getImageData(0, 0, outW, outH));
      };

      video.addEventListener("seeked", onSeeked, { once: true });
      video.currentTime = time;
    });
  };

  const convert = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !file) return;

    if (clipDuration <= 0) {
      toast.error("End time must be greater than start time.");
      return;
    }
    if (clipDuration > 10) {
      toast.error("Maximum clip length is 10 seconds.");
      return;
    }

    setProcessing(true);
    setExtractProgress(0);
    setEncodeProgress(0);

    if (prevOutputUrlRef.current) {
      URL.revokeObjectURL(prevOutputUrlRef.current);
      prevOutputUrlRef.current = null;
    }
    setOutputUrl(null);
    setOutputBlob(null);

    try {
      const naturalW = video.videoWidth;
      const naturalH = video.videoHeight;
      const outW = outputWidth;
      const outH = Math.max(1, Math.round(outW * (naturalH / naturalW)));

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas 2D context unavailable");

      const frameCount = Math.ceil(clipDuration * fps);
      const frameInterval = 1 / fps;
      const frames: ImageData[] = [];

      // ---- Phase 1: Extract frames ----
      setProgressLabel("Extracting frames…");
      for (let i = 0; i < frameCount; i++) {
        const t = startTime + i * frameInterval;
        const frame = await seekAndCapture(
          video,
          ctx,
          Math.min(t, endTime - 0.001),
          outW,
          outH
        );
        frames.push(frame);
        setExtractProgress(Math.round(((i + 1) / frameCount) * 100));
      }

      // ---- Phase 2: Encode GIF ----
      setProgressLabel("Encoding GIF…");
      const netscapeLoopCount =
        gifLoop === "forever" ? 0 : gifLoop === "once" ? 1 : 3;
      const gifBytes = await framesToGIF(
        frames,
        outW,
        outH,
        fps,
        colorCount,
        netscapeLoopCount,
        (pct) => setEncodeProgress(pct)
      );

      const blob = new Blob([gifBytes.buffer as ArrayBuffer], { type: "image/gif" });
      const url = URL.createObjectURL(blob);
      prevOutputUrlRef.current = url;
      setOutputBlob(blob);
      setOutputUrl(url);
      setOutputSize(blob.size);

      toast.success("GIF created!");
    } catch (err) {
      console.error(err);
      toast.error("Conversion failed. Please try another video.");
    } finally {
      setProcessing(false);
      setProgressLabel("");
    }
  }, [file, startTime, endTime, fps, outputWidth, colorCount, clipDuration, gifLoop]);

  const handleDownload = useCallback(() => {
    if (!outputUrl || !file) return;
    const baseName = file.name.replace(/\.[^.]+$/, "");
    const a = document.createElement("a");
    a.href = outputUrl;
    a.download = `${baseName}.gif`;
    a.click();
  }, [outputUrl, file]);

  // Overall progress for single combined bar
  const overallProgress = processing
    ? Math.round((extractProgress + encodeProgress) / 2)
    : 0;

  return (
    <ToolLayout
      toolName={t("tool.video-to-gif.name")}
      toolDescription={t("tool.video-to-gif.desc")}
    >
      <div className="space-y-6">
        {!file ? (
          <FileDropzone
            onFilesSelected={handleFiles}
            accept={{
              "video/mp4": [".mp4"],
              "video/webm": [".webm"],
              "video/quicktime": [".mov"],
              "video/x-msvideo": [".avi"],
            }}
            multiple={false}
            label={t("vid2gif.dropLabel")}
            formats={["mp4", "webm", "mov", "avi"]}
          />
        ) : (
          <>
            {/* Video preview card */}
            <div className="glass rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-t-primary truncate">
                  {file.name}
                </p>
                <span className="text-xs text-t-secondary shrink-0">
                  {formatBytes(file.size)}
                </span>
              </div>

              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                src={videoUrl ?? undefined}
                onLoadedMetadata={handleVideoLoaded}
                controls
                className="w-full rounded-lg max-h-64 bg-black"
                preload="metadata"
              />

              {videoDuration > 0 && (
                <p className="text-xs text-t-secondary">
                  Duration: {formatTime(videoDuration)}
                </p>
              )}
            </div>

            {/* Trim range slider */}
            {videoDuration > 0 && (
              <div className="glass rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-t-primary">Trim Clip</h3>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-t-secondary">
                    <span>Start: {formatTime(startTime)}</span>
                    <span>End: {formatTime(endTime)}</span>
                  </div>

                  {/* Start time slider */}
                  <div className="space-y-1">
                    <label className="text-xs text-t-secondary">
                      Start time
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={videoDuration}
                      step={0.1}
                      value={startTime}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        setStartTime(v);
                        if (endTime <= v + 0.1) {
                          setEndTime(clampEndTime(v + 1));
                        }
                      }}
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  {/* End time slider */}
                  <div className="space-y-1">
                    <label className="text-xs text-t-secondary">
                      End time{" "}
                      <span className="text-t-secondary font-normal opacity-60">
                        (max 10s after start)
                      </span>
                    </label>
                    <input
                      type="range"
                      min={startTime + 0.1}
                      max={Math.min(videoDuration, startTime + 10)}
                      step={0.1}
                      value={endTime}
                      onChange={(e) =>
                        setEndTime(clampEndTime(parseFloat(e.target.value)))
                      }
                      className="w-full accent-indigo-500"
                    />
                  </div>

                  {/* Fine-grained numeric inputs */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-xs text-t-secondary block">
                        Start (seconds)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={videoDuration}
                        step={0.1}
                        value={parseFloat(startTime.toFixed(1))}
                        onChange={(e) => {
                          const v = Math.max(
                            0,
                            Math.min(videoDuration, parseFloat(e.target.value) || 0)
                          );
                          setStartTime(v);
                          if (endTime <= v + 0.1) setEndTime(clampEndTime(v + 1));
                        }}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-bg-secondary text-t-primary text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-t-secondary block">
                        End (seconds)
                      </label>
                      <input
                        type="number"
                        min={startTime + 0.1}
                        max={Math.min(videoDuration, startTime + 10)}
                        step={0.1}
                        value={parseFloat(endTime.toFixed(1))}
                        onChange={(e) =>
                          setEndTime(clampEndTime(parseFloat(e.target.value) || startTime + 1))
                        }
                        className="w-full px-3 py-2 rounded-lg border border-border bg-bg-secondary text-t-primary text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Settings card */}
            <div className="glass rounded-xl p-6 space-y-5">
              <h3 className="text-sm font-semibold text-t-primary">Settings</h3>

              {/* FPS */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-t-secondary block">
                  Frame Rate
                </label>
                <div className="flex flex-wrap gap-2">
                  {FPS_OPTIONS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFps(f)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        fps === f
                          ? "bg-indigo-500 text-white border-indigo-500"
                          : "border-border text-t-secondary hover:bg-bg-secondary"
                      }`}
                    >
                      {f} fps
                    </button>
                  ))}
                </div>
              </div>

              {/* Loop count */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-t-secondary block">
                  {t("vid2gif.loop")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      { key: "forever" as const, label: t("vid2gif.loopForever") },
                      { key: "once" as const, label: t("vid2gif.loopOnce") },
                      { key: "three" as const, label: t("vid2gif.loopNTimes", { n: 3 }) },
                    ]
                  ).map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setGifLoop(key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        gifLoop === key
                          ? "bg-indigo-500 text-white border-indigo-500"
                          : "border-border text-t-secondary hover:bg-bg-secondary"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Width */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-t-secondary block">
                  Output Width
                </label>
                <div className="flex flex-wrap gap-2">
                  {WIDTH_OPTIONS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setOutputWidth(w)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        outputWidth === w
                          ? "bg-indigo-500 text-white border-indigo-500"
                          : "border-border text-t-secondary hover:bg-bg-secondary"
                      }`}
                    >
                      {w}px
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality / color count */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-t-secondary block">
                  Color Quality
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map(({ label, value }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setColorCount(value)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                        colorCount === value
                          ? "bg-indigo-500 text-white border-indigo-500"
                          : "border-border text-t-secondary hover:bg-bg-secondary"
                      }`}
                    >
                      {label}
                      <span className="ml-1 opacity-60 text-xs">({value})</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-t-secondary opacity-60">
                  Higher quality = more colors = larger file size
                </p>
              </div>

              {/* Summary row */}
              <div className="rounded-lg border border-border bg-bg-secondary px-4 py-3 text-xs text-t-secondary space-y-1">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    Clip:{" "}
                    <span className="text-t-primary font-medium">
                      {formatTime(startTime)} → {formatTime(endTime)} ({clipDuration.toFixed(1)}s)
                    </span>
                  </span>
                  <span>
                    Frames:{" "}
                    <span className="text-t-primary font-medium">{totalFrames}</span>
                  </span>
                  <span>
                    Est. size:{" "}
                    <span className="text-t-primary font-medium">
                      ~{formatBytes(estimatedBytes)}
                    </span>
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={convert}
                  disabled={processing || clipDuration <= 0}
                  className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 disabled:opacity-60 transition-opacity"
                >
                  {processing ? "Creating GIF…" : "Create GIF"}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={processing}
                  className="px-4 py-3 rounded-xl text-sm border border-border text-t-secondary hover:bg-bg-secondary disabled:opacity-60 transition-colors"
                >
                  New File
                </button>
              </div>
            </div>

            {/* Progress */}
            {processing && (
              <div className="glass rounded-xl p-5 space-y-3">
                <p className="text-sm font-medium text-t-primary">{progressLabel}</p>
                <ProgressBar
                  progress={extractProgress}
                  label={`Extracting frames (${Math.round(extractProgress)}%)`}
                />
                <ProgressBar
                  progress={encodeProgress}
                  label={`Quantizing & encoding (${Math.round(encodeProgress)}%)`}
                />
                <ProgressBar
                  progress={overallProgress}
                  label={`Overall (${overallProgress}%)`}
                />
                <p className="text-xs text-t-secondary opacity-60">
                  GIF encoding is CPU-intensive — larger clips may take a moment.
                </p>
              </div>
            )}

            {/* Output */}
            {outputUrl && outputBlob && !processing && (
              <div className="glass rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-t-primary">
                    Animated GIF
                  </h3>
                  <span className="text-xs text-t-secondary">
                    {formatBytes(outputSize)}
                  </span>
                </div>

                {/* Preview — use <img> so the GIF animates natively */}
                <div className="rounded-lg border border-border overflow-hidden bg-black flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={outputUrl}
                    alt="Animated GIF preview"
                    className="max-w-full max-h-64 object-contain"
                  />
                </div>

                <p className="text-xs text-t-secondary opacity-70">
                  Real GIF89a format — works everywhere: browsers, messaging apps, social media, Slack, Discord, email.
                </p>

                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-opacity"
                >
                  Download .gif
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </ToolLayout>
  );
}
