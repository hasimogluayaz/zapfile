/**
 * PP-OCRv6 small (Apache-2.0, PaddleOCR) for Handwriting to Text. The files
 * live in models/ppocrv6-small/ of this repository and are served from a
 * pinned commit via jsDelivr (fallback raw.githubusercontent), so a URL's
 * content never changes under a cached copy. Provenance: models/README.md.
 */

export interface OcrModelFile {
  /** Stable identity, used in the Cache Storage key. */
  id: string;
  name: string;
  bytes: number;
  sha256: string;
  urls: string[];
}

const REPO = "hasimogluayaz/zapfile";
const COMMIT = "4493eca5055b18c5c4085957afb4787bb56153fe";
const DIR = "models/ppocrv6-small";

function sources(name: string): string[] {
  // Self-hosted copy (same files, CORS-enabled), e.g. for local testing.
  const base = process.env.NEXT_PUBLIC_OCR_MODEL_URL;
  return [
    ...(base ? [`${base.replace(/\/$/, "")}/${name}`] : []),
    `https://cdn.jsdelivr.net/gh/${REPO}@${COMMIT}/${DIR}/${name}`,
    `https://raw.githubusercontent.com/${REPO}/${COMMIT}/${DIR}/${name}`,
  ];
}

export const OCR_DETECTOR: OcrModelFile = {
  id: "ppocrv6s-det-fp16",
  name: "det.onnx",
  bytes: 4_973_761,
  sha256: "2f0463ba51af55a9f49cae1f18cf905c578d4752236c30456325c817d8e47a1b",
  urls: sources("det.onnx"),
};

export const OCR_RECOGNIZER: OcrModelFile = {
  id: "ppocrv6s-rec-fp16",
  name: "rec.onnx",
  bytes: 10_624_002,
  sha256: "f6ee9c86013fdd02cf9dfdf311813e1f2fe56e83d2b5f12994617dfa05d3b9cb",
  urls: sources("rec.onnx"),
};

export const OCR_DICTIONARY: OcrModelFile = {
  id: "ppocrv6s-dict",
  name: "dict.json",
  bytes: 112_408,
  sha256: "6e93cc028ff774c8bef0801ad08391f8284f7ef897013a9aeb9cbd515db3276d",
  urls: sources("dict.json"),
};

export const OCR_FILES = [OCR_DETECTOR, OCR_RECOGNIZER, OCR_DICTIONARY];

/** Total first-use download, for the UI. */
export const OCR_DOWNLOAD_BYTES = OCR_FILES.reduce((s, f) => s + f.bytes, 0);

/** Own Cache Storage bucket: entries of older model versions are pruned on load. */
export const OCR_CACHE = "zapfile-ocr-v1";

export function ocrCacheKey(file: OcrModelFile): string {
  return `https://models.zapfile.invalid/${file.id}-${file.sha256.slice(0, 16)}`;
}

/** Long side the detector runs at (multiples of 32). */
export const DETECT_MAX_SIDE = 960;
/** Long side of the image lines are cut from. */
export const IMAGE_MAX_SIDE = 2560;
