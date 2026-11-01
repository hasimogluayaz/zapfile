import type { OcrScript } from "./models";
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
  | { type: "load"; ortBase: string; preferGpu: boolean; threads: boolean; script: OcrScript }
  | { type: "recognize"; jobId: number; bitmap: ImageBitmap; script: OcrScript };

export type OcrResponse =
  | { type: "progress"; jobId?: number; stage: OcrStage; loaded?: number; total?: number; fromCache?: boolean }
  | { type: "loaded"; backend: OcrBackend }
  | {
      type: "result";
      jobId: number;
      /** Size of the image the boxes refer to (after `rotation`). */
      width: number;
      height: number;
      /** Clockwise turn applied to make the text upright. */
      rotation: 0 | 90 | 180 | 270;
      lines: OcrLineResult[];
      backend: OcrBackend;
      ms: number;
    }
  | { type: "error"; jobId?: number; code: OcrErrorCode; message: string };
