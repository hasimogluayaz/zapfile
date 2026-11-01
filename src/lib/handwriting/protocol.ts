import type { TextBox } from "./pipeline";

export type OcrBackend = "webgpu" | "wasm";
export type OcrStage = "download" | "init" | "detect" | "read";
export type OcrErrorCode = "download" | "runtime" | "memory" | "inference";

export interface OcrLineResult {
  box: TextBox;
  text: string;
  confidence: number;
}

export type OcrRequest =
  | { type: "load"; ortBase: string; preferGpu: boolean; threads: boolean }
  | { type: "recognize"; jobId: number; bitmap: ImageBitmap };

export type OcrResponse =
  | { type: "progress"; jobId?: number; stage: OcrStage; loaded?: number; total?: number; fromCache?: boolean }
  | { type: "loaded"; backend: OcrBackend }
  | { type: "result"; jobId: number; width: number; height: number; lines: OcrLineResult[]; backend: OcrBackend; ms: number }
  | { type: "error"; jobId?: number; code: OcrErrorCode; message: string };
