/**
 * Single entry point for pdf.js. Loads the legacy build (broad browser
 * support, incl. older iOS Safari) and points the worker, CMaps, standard
 * fonts and WASM decoders at our own origin (copied by
 * scripts/copy-vendor-assets.mjs), so PDF tools never depend on a CDN.
 */
import type { DocumentInitParameters } from "pdfjs-dist/types/src/display/api";

type PdfjsModule = typeof import("pdfjs-dist");

let modulePromise: Promise<PdfjsModule> | null = null;

function assetBase(version: string): string {
  return `/vendor/pdfjs-${version}/`;
}

export function loadPdfjs(): Promise<PdfjsModule> {
  if (!modulePromise) {
    modulePromise = (
      import("pdfjs-dist/legacy/build/pdf.mjs") as unknown as Promise<PdfjsModule>
    )
      .then((lib) => {
        lib.GlobalWorkerOptions.workerSrc = `${assetBase(lib.version)}pdf.worker.min.mjs`;
        return lib;
      })
      .catch((error) => {
        // Allow a retry after a transient failure (e.g. offline chunk load).
        modulePromise = null;
        throw error;
      });
  }
  return modulePromise;
}

export interface OpenPdfBehaviour {
  /**
   * pdf.js transfers the buffer to its worker, detaching it. By default the
   * bytes are copied so callers can keep using them (e.g. for pdf-lib). Pass
   * `copy: false` when the caller hands over bytes it no longer needs, which
   * avoids holding a second full copy of the file in memory.
   */
  copy?: boolean;
}

/**
 * Open a PDF from bytes with all asset URLs configured.
 * Call `destroy()` on the returned document when done with it, otherwise the
 * worker keeps the whole file (and every parsed page) alive.
 */
export async function openPdf(
  data: ArrayBuffer | Uint8Array,
  options: Omit<DocumentInitParameters, "data"> = {},
  { copy = true }: OpenPdfBehaviour = {},
) {
  const lib = await loadPdfjs();
  const base = assetBase(lib.version);
  const bytes = copy
    ? data instanceof Uint8Array
      ? data.slice()
      : new Uint8Array(data.slice(0))
    : data instanceof Uint8Array
      ? data
      : new Uint8Array(data);
  return lib.getDocument({
    data: bytes,
    cMapUrl: `${base}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${base}standard_fonts/`,
    wasmUrl: `${base}wasm/`,
    iccUrl: `${base}iccs/`,
    ...options,
  }).promise;
}
