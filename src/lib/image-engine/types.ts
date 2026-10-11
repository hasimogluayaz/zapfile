export type OutputFormat = "image/jpeg" | "image/png" | "image/webp";

export type FitMode =
  /** Fit inside the box, keep aspect ratio (never crops). */
  | "contain"
  /** Fill the box, keep aspect ratio, crop the overflow (centre). */
  | "cover"
  /** Exactly width × height, aspect ratio may change. */
  | "stretch";

export interface ResizeSpec {
  width: number;
  height: number;
  fit: FitMode;
  /** Never enlarge beyond the source size (default true). */
  withoutEnlargement?: boolean;
}

export interface Transform {
  /** Source-pixel crop applied first (after EXIF orientation). */
  crop?: { x: number; y: number; width: number; height: number };
  /** Clockwise degrees; any angle (non-right angles expand the canvas). */
  rotate?: number;
  flipH?: boolean;
  flipV?: boolean;
  resize?: ResizeSpec;
  /**
   * Colour behind transparent pixels and around non-right-angle rotations.
   * JPEG output is always flattened (white when unset).
   */
  background?: string;
}

export interface EncodeSettings {
  format: OutputFormat;
  /** 0–1. JPEG/WebP quality; WebP at 1 is lossless. Ignored by PNG. */
  quality: number;
  /** PNG only: reduce to a ≤256-colour palette (TinyPNG-style). */
  pngLossy?: boolean;
  /** PNG lossy: palette size (2–256, default 256). */
  pngColors?: number;
  /** Encode until the file is ≤ this many bytes (JPEG/WebP), lowering quality as needed. */
  targetBytes?: number;
}

export interface ImageJob {
  input: Blob;
  transform?: Transform;
  encode: EncodeSettings;
  /**
   * When the output would be larger than the input in the same format with
   * no visible change requested, return the input instead.
   */
  keepOriginalIfLarger?: boolean;
}

export interface ImageJobResult {
  blob: Blob;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  /** True when the original file was returned unchanged (already optimal). */
  keptOriginal: boolean;
  /** Final quality used (after targetBytes search), 0–1. */
  quality: number;
}

export interface QrResult {
  text: string;
  /** Corner points in source-image pixels, when known. */
  corners?: { x: number; y: number }[];
}
