import type { ModelSpec } from "./models";
import type { RefineOptions } from "./refine";

export type Backend = "webgpu" | "wasm";

export type ErrorCode =
  /** Model could not be downloaded (offline, blocked, corrupt). */
  | "download"
  /** ONNX Runtime or the model failed to initialise on every backend. */
  | "runtime"
  /** Ran out of memory (very large image or low-memory device). */
  | "memory"
  /** Inference produced no usable mask. */
  | "inference"
  /** The browser lacks a required feature. */
  | "unsupported";

export type Stage = "runtime" | "download" | "init" | "inference" | "refine";

export type WorkerRequest =
  | { type: "load"; spec: ModelSpec; ortBase: string; preferGpu: boolean }
  | {
      type: "segment";
      jobId: number;
      rgba: ArrayBuffer;
      width: number;
      height: number;
      options: RefineOptions;
      /** Also run on the mirrored image and average (slower, steadier edges). */
      tta: boolean;
    }
  | { type: "refine"; jobId: number; options: RefineOptions };

export type WorkerResponse =
  | { type: "progress"; stage: Stage; loaded?: number; total?: number; fromCache?: boolean }
  | { type: "loaded"; backend: Backend; threads: number }
  | {
      type: "result";
      jobId: number;
      rgba: ArrayBuffer;
      width: number;
      height: number;
      backend: Backend;
      inferenceMs: number;
      refineMs: number;
    }
  | { type: "error"; jobId?: number; code: ErrorCode; message: string };
