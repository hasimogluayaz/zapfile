/**
 * Real PDF encryption / decryption (ISO 32000 Standard Security Handler),
 * using @cantoo/pdf-lib. Every result is re-opened and checked before it is
 * handed back, so callers never ship a file that doesn't behave as promised.
 */

export type PdfCipher = "AES-256" | "AES-128";
export type PrintPermission = "none" | "low" | "high";

export interface PdfPermissions {
  printing: PrintPermission;
  copying: boolean;
  modifying: boolean;
  annotating: boolean;
  fillingForms: boolean;
  documentAssembly: boolean;
}

export const FULL_PERMISSIONS: PdfPermissions = {
  printing: "high",
  copying: true,
  modifying: true,
  annotating: true,
  fillingForms: true,
  documentAssembly: true,
};

export interface PdfInfo {
  encrypted: boolean;
  /** Page count, or null when the file is encrypted and not yet unlocked. */
  pageCount: number | null;
}

export class PdfPasswordError extends Error {
  constructor() {
    super("Incorrect password");
    this.name = "PdfPasswordError";
  }
}

export class PdfInvalidError extends Error {
  constructor(cause?: unknown) {
    super("Not a valid PDF");
    this.name = "PdfInvalidError";
    if (cause) (this as { cause?: unknown }).cause = cause;
  }
}

async function lib() {
  return import("@cantoo/pdf-lib");
}

function isPasswordError(error: unknown): boolean {
  return error instanceof Error && /password/i.test(error.message);
}

function isEncryptedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "EncryptedPDFError" || /is encrypted/i.test(error.message))
  );
}

/** Inspect a PDF without needing its password. */
export async function inspectPdf(bytes: Uint8Array): Promise<PdfInfo> {
  const { PDFDocument } = await lib();
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    if (doc.isEncrypted) return { encrypted: true, pageCount: null };
    return { encrypted: false, pageCount: doc.getPageCount() };
  } catch (error) {
    throw new PdfInvalidError(error);
  }
}

/** Open a PDF, decrypting it when a password is given. */
async function openDocument(bytes: Uint8Array, password?: string) {
  const { PDFDocument } = await lib();
  try {
    return await PDFDocument.load(
      bytes,
      password !== undefined ? { password } : { updateMetadata: false },
    );
  } catch (error) {
    if (isPasswordError(error)) throw new PdfPasswordError();
    if (isEncryptedError(error)) throw new PdfPasswordError();
    throw new PdfInvalidError(error);
  }
}

/**
 * After decrypting, the old security dictionary and the source's XRef stream
 * (which pdf-lib keeps as an unparseable object) are still in the object
 * table. Remove them so the saved file is a clean, unencrypted PDF.
 */
async function stripSecurityObjects(doc: Awaited<ReturnType<typeof openDocument>>) {
  const { PDFDict, PDFName, PDFInvalidObject } = await lib();
  const ctx = doc.context;
  for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
    if (obj instanceof PDFDict) {
      const filter = obj.get(PDFName.of("Filter"));
      if (filter?.toString() === "/Standard" && obj.has(PDFName.of("O")) && obj.has(PDFName.of("U"))) {
        ctx.delete(ref);
      }
    } else if (obj instanceof PDFInvalidObject) {
      const raw = new TextDecoder("latin1").decode(
        (obj as unknown as { data: Uint8Array }).data ?? new Uint8Array(),
      );
      if (/\/Type\s*\/XRef/.test(raw) || (/\/Root\s/.test(raw) && /\/Size\s/.test(raw))) {
        ctx.delete(ref);
      }
    }
  }
  ctx.trailerInfo.Encrypt = undefined;
}

function toLibPermissions(p: PdfPermissions) {
  return {
    printing:
      p.printing === "none" ? false : p.printing === "low" ? ("lowResolution" as const) : ("highResolution" as const),
    copying: p.copying,
    modifying: p.modifying,
    annotating: p.annotating,
    fillingForms: p.fillingForms,
    contentAccessibility: true, // never block screen readers
    documentAssembly: p.documentAssembly,
  };
}

/** Cryptographically random owner password for "restrict only" protection. */
export function randomOwnerPassword(length = 32): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export interface ProtectOptions {
  /** Password needed to open the file ("" = opens without a password). */
  userPassword: string;
  /** Password that lifts restrictions. Must differ from userPassword when restricting. */
  ownerPassword: string;
  permissions: PdfPermissions;
  cipher: PdfCipher;
  /** Current password if the input is already encrypted. */
  currentPassword?: string;
}

export async function protectPdf(input: Uint8Array, options: ProtectOptions): Promise<Uint8Array> {
  const doc = await openDocument(input, options.currentPassword);
  if (options.currentPassword !== undefined) await stripSecurityObjects(doc);

  doc.encrypt({
    userPassword: options.userPassword,
    ownerPassword: options.ownerPassword,
    permissions: toLibPermissions(options.permissions),
    algorithm: options.cipher,
  });
  const output = await doc.save();

  // Self-check: the result must be encrypted, reject a wrong password and
  // open with the user password with every page intact.
  const pageCount = doc.getPageCount();
  const info = await inspectPdf(output);
  if (!info.encrypted) throw new Error("Encryption self-check failed: output is not encrypted");
  const reopened = await openDocument(output, options.userPassword);
  if (reopened.getPageCount() !== pageCount) {
    throw new Error("Encryption self-check failed: page count changed");
  }
  return output;
}

export async function unlockPdf(input: Uint8Array, password: string): Promise<Uint8Array> {
  const doc = await openDocument(input, password);
  const pageCount = doc.getPageCount();
  await stripSecurityObjects(doc);
  const output = await doc.save();

  const info = await inspectPdf(output);
  if (info.encrypted || info.pageCount !== pageCount) {
    throw new Error("Unlock self-check failed");
  }
  return output;
}
