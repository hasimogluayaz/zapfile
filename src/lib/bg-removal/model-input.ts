import { resampleRgbaToPlanes } from "./imaging";

export interface Normalization {
  /** Per-channel mean, in 0–1 units. */
  mean: [number, number, number];
  /** Per-channel standard deviation, in 0–1 units. */
  std: [number, number, number];
}

/** ImageNet statistics (BiRefNet and most Swin/ViT backbones). */
export const IMAGENET: Normalization = {
  mean: [0.485, 0.456, 0.406],
  std: [0.229, 0.224, 0.225],
};

/**
 * Build the NCHW float tensor a segmentation model expects: the photo
 * resampled (antialiased) to `width × height`, then normalised.
 * With `flip`, the image is mirrored horizontally (test-time augmentation).
 */
export function buildModelInput(
  rgba: Uint8Array | Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  width: number,
  height: number,
  norm: Normalization,
  flip = false,
): Float32Array {
  const planes = resampleRgbaToPlanes(rgba, srcWidth, srcHeight, width, height);
  const n = width * height;
  const tensor = new Float32Array(3 * n);
  for (let c = 0; c < 3; c++) {
    const src = planes[c];
    const scale = 1 / (255 * norm.std[c]);
    const shift = norm.mean[c] / norm.std[c];
    const base = c * n;
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        const sx = flip ? width - 1 - x : x;
        tensor[base + row + x] = src[row + sx] * scale - shift;
      }
    }
  }
  return tensor;
}
