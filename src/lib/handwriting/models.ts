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
const COMMIT = "a14afacdc16210222f106366c2c4876bc0d689ce";
const DIR = "models/ppocrv6-small";

function sources(name: string, dir = DIR): string[] {
  // Self-hosted copy (same files, CORS-enabled), e.g. for local testing.
  const base = process.env.NEXT_PUBLIC_OCR_MODEL_URL;
  return [
    ...(base ? [`${base.replace(/\/$/, "")}/${name}`] : []),
    `https://cdn.jsdelivr.net/gh/${REPO}@${COMMIT}/${dir}/${name}`,
    `https://raw.githubusercontent.com/${REPO}/${COMMIT}/${dir}/${name}`,
  ];
}

export const OCR_DETECTOR: OcrModelFile = {
  id: "ppocrv6s-det-fp16",
  name: "det.onnx",
  bytes: 4_973_761,
  sha256: "2f0463ba51af55a9f49cae1f18cf905c578d4752236c30456325c817d8e47a1b",
  urls: sources("det.onnx"),
};

/**
 * Recognizer for Latin script (Turkish, English, German, French, …, plus
 * Greek): the full model with its output layer cut to 566 characters, which
 * reads Latin text the same, downloads 4.4 MB less and decodes faster.
 */
export const OCR_RECOGNIZER_LATIN: OcrModelFile = {
  id: "ppocrv6s-rec-latin-fp16",
  name: "rec-latin.onnx",
  bytes: 6_233_083,
  sha256: "01efad51fcf62a4eaf0d2e8a10325c8d02da7b14fbe110af9ed29f03a379875a",
  urls: sources("rec-latin.onnx"),
};

export const OCR_DICTIONARY_LATIN: OcrModelFile = {
  id: "ppocrv6s-dict-latin",
  name: "dict-latin.json",
  bytes: 2_927,
  sha256: "b1a1c5aa2cc7372f957a46aa664b9e5ca60a6d9a6183773366faa7a8ac4313d1",
  urls: sources("dict-latin.json"),
};

/** Full recognizer (adds Chinese and Japanese), downloaded only when that script is chosen. */
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

/**
 * Turkish word list (~288,000 words, wordfreq + OpenSubtitles frequencies,
 * CC BY-SA 4.0; models/lexicons/tr.txt, compact format). Loaded only for
 * Turkish pages, to put back ı/ş/ğ/ç and fix letters handwriting confuses
 * (language.ts). About 610 KB compressed.
 */
export const OCR_LEXICON_TR: OcrModelFile = {
  id: "tr-words-288k",
  name: "tr.txt",
  bytes: 1_826_254,
  sha256: "c7c03dc8d13481e383c861d983aadfa82965da27599ccb988a07f6c27ba99e38",
  urls: sources("tr.txt", "models/lexicons"),
};

/**
 * English word list (30,000 words, wordfreq, CC BY-SA 4.0;
 * models/lexicons/en.txt). Loaded only for pages mixing English and
 * Turkish, so the English stays as read. About 75 KB compressed.
 */
export const OCR_LEXICON_EN: OcrModelFile = {
  id: "en-words-30k",
  name: "en.txt",
  bytes: 177_710,
  sha256: "caf4bd24d3c1bf2f51846e21fc4f19c7982a5441aa3a376f230fdf3398e12756",
  urls: sources("en.txt", "models/lexicons"),
};

export type OcrScript = "latin" | "cjk";

/** Files needed for a script. */
export function ocrFiles(script: OcrScript): { detector: OcrModelFile; recognizer: OcrModelFile; dictionary: OcrModelFile } {
  return script === "cjk"
    ? { detector: OCR_DETECTOR, recognizer: OCR_RECOGNIZER, dictionary: OCR_DICTIONARY }
    : { detector: OCR_DETECTOR, recognizer: OCR_RECOGNIZER_LATIN, dictionary: OCR_DICTIONARY_LATIN };
}

/** First-use download for a script, for the UI. */
export function ocrDownloadBytes(script: OcrScript): number {
  const f = ocrFiles(script);
  return f.detector.bytes + f.recognizer.bytes + f.dictionary.bytes;
}

/** Every file this version uses (older cached versions are pruned). */
export const OCR_ALL_FILES = [OCR_DETECTOR, OCR_RECOGNIZER_LATIN, OCR_DICTIONARY_LATIN, OCR_RECOGNIZER, OCR_DICTIONARY, OCR_LEXICON_TR, OCR_LEXICON_EN];

/** Own Cache Storage bucket: entries of older model versions are pruned on load. */
export const OCR_CACHE = "zapfile-ocr-v1";

export function ocrCacheKey(file: OcrModelFile): string {
  return `https://models.zapfile.invalid/${file.id}-${file.sha256.slice(0, 16)}`;
}

/** Long side the detector runs at (multiples of 32). */
export const DETECT_MAX_SIDE = 960;
/** Long side of the image lines are cut from. */
export const IMAGE_MAX_SIDE = 2560;
