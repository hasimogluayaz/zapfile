/** Messages between the PDF compressor page and compress.worker.ts. */

export interface InspectInfo {
  pageCount: number;
  /** All image XObjects in the file. */
  images: number;
  imageBytes: number;
  /** Images we can safely downsample / re-encode. */
  compressible: number;
  compressibleBytes: number;
}

export interface RunOptions {
  mode: "recommended" | "lossless";
  /** Target resolution for images (recommended mode). */
  dpi: number;
  /** JPEG quality 0–1 (recommended mode). */
  quality: number;
  removeMetadata: boolean;
  objectStreams: boolean;
}

export type ToWorker =
  | { type: "inspect"; bytes: ArrayBuffer }
  | { type: "run"; bytes: ArrayBuffer; options: RunOptions }
  | { type: "jobResult"; jobId: number; jpeg: ArrayBuffer | null; width: number; height: number };

export type ImageJobRequest =
  | { kind: "jpeg"; data: ArrayBuffer; width: number; height: number; targetW: number; targetH: number }
  | { kind: "bitmap"; bitmap: ImageBitmap; width: number; height: number; targetW: number; targetH: number };

export type FromWorker =
  | { type: "inspected"; info: InspectInfo }
  | { type: "job"; jobId: number; job: ImageJobRequest }
  | { type: "progress"; done: number; total: number }
  | { type: "done"; bytes: ArrayBuffer; replaced: number; candidates: number }
  | { type: "error"; message: string };
