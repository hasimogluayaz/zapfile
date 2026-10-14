/**
 * Fonts for text written into PDFs (watermarks, signatures, form text). DejaVu covers Latin
 * (incl. Turkish), Greek and Cyrillic, so text stays real, selectable PDF text. The same TTF is
 * registered as a CSS font for previews, so the preview measures exactly like the PDF.
 * Served from /vendor (scripts/copy-vendor-assets.mjs).
 */

export type PdfFontKey = "sans" | "sans-bold" | "serif" | "serif-bold" | "mono";

const DEJAVU = `/vendor/dejavu-${process.env.NEXT_PUBLIC_DEJAVU_VERSION ?? "2.37.3"}/`;

const FILES: Record<PdfFontKey, string> = {
  sans: "DejaVuSans.ttf",
  "sans-bold": "DejaVuSans-Bold.ttf",
  serif: "DejaVuSerif.ttf",
  "serif-bold": "DejaVuSerif-Bold.ttf",
  mono: "DejaVuSansMono.ttf",
};

export function pdfFontUrl(key: PdfFontKey): string {
  return DEJAVU + FILES[key];
}

/** CSS family name of a PDF font (after `loadPreviewFont`). */
export function cssFamily(key: PdfFontKey): string {
  return `ZapPdf-${key}`;
}

const loaded = new Map<string, Promise<void>>();

/** Register the PDF font with the page so canvas previews use the very same glyphs. */
export function loadPreviewFont(key: PdfFontKey): Promise<void> {
  let p = loaded.get(key);
  if (!p) {
    p = (async () => {
      if (typeof FontFace === "undefined" || !document.fonts) return;
      const face = new FontFace(cssFamily(key), `url(${pdfFontUrl(key)}) format("truetype")`);
      document.fonts.add(await face.load());
    })().catch(() => undefined);
    loaded.set(key, p);
  }
  return p;
}

// ── Handwriting fonts for typed signatures (OFL) ───────────────────────────

export type SignatureFont = "dancing-script" | "great-vibes" | "caveat";
export const SIGNATURE_FONTS: SignatureFont[] = ["dancing-script", "great-vibes", "caveat"];

const SIG_VERSIONS: Record<string, string> = (() => {
  try {
    return JSON.parse(process.env.NEXT_PUBLIC_SIGFONT_VERSIONS ?? "{}") as Record<string, string>;
  } catch {
    return {};
  }
})();

const LATIN = "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";
const LATIN_EXT = "U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF";

export function signatureFamily(f: SignatureFont): string {
  return `ZapSig-${f}`;
}

export function loadSignatureFont(f: SignatureFont): Promise<void> {
  const key = `sig:${f}`;
  let p = loaded.get(key);
  if (!p) {
    p = (async () => {
      if (typeof FontFace === "undefined" || !document.fonts) return;
      const base = `/vendor/${f}-${SIG_VERSIONS[f] ?? "5.2.8"}/${f}`;
      const faces = [
        new FontFace(signatureFamily(f), `url(${base}-latin-400-normal.woff2) format("woff2")`, { unicodeRange: LATIN }),
        new FontFace(signatureFamily(f), `url(${base}-latin-ext-400-normal.woff2) format("woff2")`, { unicodeRange: LATIN_EXT }),
      ];
      await Promise.all(faces.map(async (face) => document.fonts.add(await face.load())));
    })().catch(() => undefined);
    loaded.set(key, p);
  }
  return p;
}
