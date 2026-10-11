/**
 * Normalises PDFs before editing tools touch them.
 *
 * Many PDFs are encrypted only to restrict printing/copying: they open
 * without a password but their content streams are encrypted. Editing them
 * with `ignoreEncryption` silently produces blank or garbled pages, so such
 * files are decrypted up front. Files that need a password to open are
 * reported with PdfLockedError so the UI can point to Protect PDF.
 */
import { PdfPasswordError, inspectPdf, unlockPdf } from "./pdf-security";

export class PdfLockedError extends Error {
  constructor() {
    super("PDF requires a password");
    this.name = "PdfLockedError";
  }
}

/** Cheap pre-check: encrypted PDFs always reference /Encrypt in a trailer or XRef stream dict. */
function mentionsEncrypt(bytes: Uint8Array): boolean {
  const needle = [0x2f, 0x45, 0x6e, 0x63, 0x72, 0x79, 0x70, 0x74]; // "/Encrypt"
  outer: for (let i = 0; i <= bytes.length - needle.length; i++) {
    if (bytes[i] !== 0x2f) continue;
    for (let j = 1; j < needle.length; j++) if (bytes[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

/** Decrypted bytes of a PDF, or the original bytes when it isn't encrypted. */
export async function editablePdfBytes(input: Blob | ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  const bytes =
    input instanceof Uint8Array
      ? input
      : new Uint8Array(input instanceof Blob ? await input.arrayBuffer() : input);
  if (!mentionsEncrypt(bytes)) return bytes;
  const info = await inspectPdf(bytes);
  if (!info.encrypted) return bytes;
  try {
    return await unlockPdf(bytes, "");
  } catch (error) {
    if (error instanceof PdfPasswordError) throw new PdfLockedError();
    throw error;
  }
}

/** Same as editablePdfBytes, returned as a File with the original name. */
export async function toEditablePdf(file: File): Promise<File> {
  const original = new Uint8Array(await file.arrayBuffer());
  const bytes = await editablePdfBytes(original);
  if (bytes === original) return file;
  return new File([bytes as BlobPart], file.name, { type: "application/pdf", lastModified: file.lastModified });
}

/** i18n key for an error thrown by editablePdfBytes / toEditablePdf. */
export function pdfInputErrorKey(error: unknown): string {
  return error instanceof PdfLockedError ? "pdf.locked" : "pdf.unreadable";
}
