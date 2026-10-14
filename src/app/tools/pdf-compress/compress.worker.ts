/// <reference lib="webworker" />
/**
 * PDF compressor worker: all pdf-lib parsing, image analysis, Flate decoding
 * and saving happen here, so the page never freezes. Image re-encoding
 * (MozJPEG) is delegated back to the page, which runs it through the shared
 * image-engine worker pool.
 */
import { PDFDocument } from "pdf-lib";
import type { FromWorker, ImageJobRequest, RunOptions, ToWorker } from "./protocol";
import {
  codecBytes,
  collectGarbage,
  decodeFlateToRgba,
  findImages,
  measurePlacements,
  replaceWithJpeg,
  stripJpegApp1,
  stripMetadata,
  stripThumbnails,
  unwrapAscii,
  type ImageCandidate,
} from "./pdf-images";

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function post(msg: FromWorker, transfer: Transferable[] = []) {
  ctx.postMessage(msg, transfer);
}

let nextJob = 1;
const waiting = new Map<number, (r: { jpeg: ArrayBuffer | null; width: number; height: number }) => void>();

function requestJob(job: ImageJobRequest, transfer: Transferable[]) {
  const jobId = nextJob++;
  return new Promise<{ jpeg: ArrayBuffer | null; width: number; height: number }>((resolve) => {
    waiting.set(jobId, resolve);
    post({ type: "job", jobId, job }, transfer);
  });
}

async function load(bytes: ArrayBuffer) {
  return PDFDocument.load(bytes, { updateMetadata: false, ignoreEncryption: true, throwOnInvalidObject: false });
}

/** Pixel size we want for an image, given where it's drawn. */
function targetSize(
  c: ImageCandidate,
  placed: { w: number; h: number } | undefined,
  dpi: number,
): { w: number; h: number } {
  let tw: number;
  let th: number;
  if (placed && placed.w > 0.5 && placed.h > 0.5) {
    tw = (placed.w / 72) * dpi;
    th = (placed.h / 72) * dpi;
  } else {
    // Not drawn anywhere we can see: cap the long side at a full A4 page at this DPI.
    const cap = (842 / 72) * dpi;
    const k = Math.min(1, cap / Math.max(c.width, c.height));
    tw = c.width * k;
    th = c.height * k;
  }
  let s = Math.min(1, Math.max(tw / c.width, th / c.height));
  if (s > 0.85) s = 1; // not worth a resample
  return { w: Math.max(1, Math.round(c.width * s)), h: Math.max(1, Math.round(c.height * s)) };
}

async function processCandidate(
  doc: PDFDocument,
  c: ImageCandidate,
  placed: { w: number; h: number } | undefined,
  options: RunOptions,
): Promise<boolean> {
  const target = targetSize(c, placed, options.dpi);
  const resize = target.w < c.width || target.h < c.height;
  // An already-compact JPEG that keeps its size isn't worth a generation loss.
  if (!resize && c.kind === "jpeg" && c.bytes / (c.width * c.height) < 0.12) return false;

  let result: { jpeg: ArrayBuffer | null; width: number; height: number };
  if (c.kind === "jpeg") {
    const jpeg = stripJpegApp1(codecBytes(c));
    const data = jpeg.slice().buffer as ArrayBuffer;
    result = await requestJob(
      { kind: "jpeg", data, width: c.width, height: c.height, targetW: target.w, targetH: target.h },
      [data],
    );
  } else {
    const rgba = decodeFlateToRgba(c);
    if (!rgba) return false;
    const imageData = new ImageData(rgba as Uint8ClampedArray<ArrayBuffer>, c.width, c.height);
    // Pre-shrink with the browser's resampler so we never ship a giant bitmap
    // (the engine does the final high-quality Lanczos step).
    const pre = resize
      ? { w: Math.min(c.width, target.w * 2), h: Math.min(c.height, target.h * 2) }
      : { w: c.width, h: c.height };
    const bitmap =
      pre.w < c.width || pre.h < c.height
        ? await createImageBitmap(imageData, { resizeWidth: pre.w, resizeHeight: pre.h, resizeQuality: "high" })
        : await createImageBitmap(imageData);
    result = await requestJob(
      { kind: "bitmap", bitmap, width: c.width, height: c.height, targetW: target.w, targetH: target.h },
      [bitmap],
    );
  }
  if (!result.jpeg) return false;
  // Keep the new stream only when it is a clear win.
  const limit = c.kind === "jpeg" && !resize ? c.bytes * 0.85 : c.bytes * 0.95;
  if (result.jpeg.byteLength >= limit) return false;
  replaceWithJpeg(doc, c, new Uint8Array(result.jpeg), result.width, result.height);
  return true;
}

async function run(bytes: ArrayBuffer, options: RunOptions) {
  const doc = await load(bytes);
  let replaced = 0;
  let candidates = 0;
  if (options.mode === "recommended") {
    const found = findImages(doc);
    candidates = found.candidates.length;
    let placements = new Map<string, { w: number; h: number }>();
    try {
      placements = measurePlacements(doc);
    } catch {
      // fall back to the size cap for every image
    }
    post({ type: "progress", done: 0, total: candidates });
    let done = 0;
    let index = 0;
    // Two images in flight keeps the engine pool busy without holding many bitmaps.
    const lane = async () => {
      while (index < found.candidates.length) {
        const c = found.candidates[index++];
        try {
          if (await processCandidate(doc, c, placements.get(c.ref.tag), options)) replaced++;
          else unwrapAscii(doc, c);
        } catch (error) {
          console.warn("Image skipped", error);
        }
        done++;
        post({ type: "progress", done, total: candidates });
      }
    };
    await Promise.all([lane(), lane()]);
  } else if (options.mode === "lossless") {
    for (const c of findImages(doc).candidates) {
      try {
        unwrapAscii(doc, c);
      } catch (error) {
        console.warn("Image skipped", error);
      }
    }
  }
  if (options.removeMetadata) stripMetadata(doc);
  stripThumbnails(doc);
  collectGarbage(doc);
  const out = await doc.save({
    useObjectStreams: options.objectStreams,
    addDefaultPage: false,
    updateFieldAppearances: false,
    objectsPerTick: Infinity,
  });
  const buffer = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
  post({ type: "done", bytes: buffer, replaced, candidates }, [buffer]);
}

ctx.onmessage = async (event: MessageEvent<ToWorker>) => {
  const msg = event.data;
  try {
    if (msg.type === "jobResult") {
      const resolve = waiting.get(msg.jobId);
      waiting.delete(msg.jobId);
      resolve?.({ jpeg: msg.jpeg, width: msg.width, height: msg.height });
    } else if (msg.type === "inspect") {
      const doc = await load(msg.bytes);
      const found = findImages(doc);
      post({
        type: "inspected",
        info: {
          pageCount: doc.getPageCount(),
          images: found.all,
          imageBytes: found.allBytes,
          compressible: found.candidates.length,
          compressibleBytes: found.candidates.reduce((s, c) => s + c.bytes, 0),
        },
      });
    } else if (msg.type === "run") {
      await run(msg.bytes, msg.options);
    }
  } catch (error) {
    post({ type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
