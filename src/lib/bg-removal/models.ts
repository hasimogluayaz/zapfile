import { IMAGENET, type Normalization } from "./model-input";

/** One place a model can be downloaded from: its parts are concatenated in order. */
export interface ModelSource {
  parts: string[];
}

export interface ModelFile {
  /** Stable identity, used as the Cache Storage key. */
  id: string;
  bytes: number;
  sha256: string;
  /** Tried in order; the first that downloads and verifies wins. */
  sources: ModelSource[];
}

export interface ModelSpec {
  id: string;
  file: ModelFile;
  inputSize: { width: number; height: number };
  normalization: Normalization;
  license: string;
  homepage: string;
}

/**
 * Model files live in this repository under models/, split into parts small
 * enough for jsDelivr (≤ 20 MB per file). They are served from a pinned
 * commit, so a URL's content can never change underneath a cached copy.
 */
const REPO = "hasimogluayaz/zapfile";
const MODEL_COMMIT = "0eb75899472993e34031fc56f58a1603477f99bb";

function githubSources(dir: string, count: number): ModelSource[] {
  const names = Array.from({ length: count }, (_, i) => `${dir}/part-${String(i).padStart(2, "0")}.bin`);
  return [
    { parts: names.map((n) => `https://cdn.jsdelivr.net/gh/${REPO}@${MODEL_COMMIT}/models/${n}`) },
    { parts: names.map((n) => `https://raw.githubusercontent.com/${REPO}/${MODEL_COMMIT}/models/${n}`) },
  ];
}

/**
 * Optional self-hosted copy (single file, CORS-enabled, same bytes), tried
 * first. Lets a deployment move the model to its own storage without a code change.
 */
function overrideSource(): ModelSource[] {
  const url = process.env.NEXT_PUBLIC_BG_MODEL_URL;
  return url ? [{ parts: [url] }] : [];
}

/**
 * BiRefNet lite (Swin-T backbone, "general" weights, epoch 232), MIT
 * licensed — https://github.com/ZhengPeng7/BiRefNet. Re-exported to ONNX at
 * 768×768 with a memory-light deformable convolution so it runs
 * inside the browser's WebAssembly memory limit; full-resolution detail is
 * recovered by the edge refinement in refine.ts.
 */
export const BIREFNET_LITE: ModelSpec = {
  id: "birefnet-lite",
  file: {
    id: "birefnet-lite-768",
    bytes: 94_370_922,
    sha256: "94db4755eef843b440490b19b5bfcf4695ff5a2550238fefeb583663304eba27",
    sources: [...overrideSource(), ...githubSources("birefnet-lite-768", 5)],
  },
  inputSize: { width: 768, height: 768 },
  normalization: IMAGENET,
  license: "MIT",
  homepage: "https://github.com/ZhengPeng7/BiRefNet",
};

export const DEFAULT_MODEL = BIREFNET_LITE;

/** Cache Storage bucket. Entries are keyed by file id + hash, so old models are pruned on load. */
export const MODEL_CACHE = "zapfile-models-v1";

/** Synthetic, never-fetched URL used as the cache key for a model file. */
export function cacheKey(file: ModelFile): string {
  return `https://models.zapfile.invalid/${file.id}-${file.sha256.slice(0, 16)}.onnx`;
}
