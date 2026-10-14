/**
 * PDF encryption / decryption engine (ISO 32000 Standard Security Handler),
 * using @cantoo/pdf-lib. This module does the heavy lifting and normally runs
 * inside `pdf-security.worker.ts`; the public API lives in `pdf-security.ts`.
 *
 * Every result is re-opened and checked before it is handed back, so callers
 * never ship a file that doesn't behave as promised.
 */
import { PDFDict, PDFDocument, PDFInvalidObject, PDFName, PDFNumber } from "@cantoo/pdf-lib";

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
  /**
   * True when the file is encrypted but opens without a password (the empty
   * user password works): it only carries usage restrictions.
   */
  restrictionsOnly: boolean;
  /** Page count, or null when the file needs a password to open. */
  pageCount: number | null;
  /** Usage permissions declared by an encrypted file (null when not encrypted). */
  permissions: PdfPermissions | null;
}

export interface ProtectOptions {
  /** Password needed to open the file ("" = opens without a password). */
  userPassword: string;
  /** Password that lifts restrictions. Must differ from userPassword when restricting. */
  ownerPassword: string;
  permissions: PdfPermissions;
  cipher: PdfCipher;
  /** Current password if the input is already encrypted ("" for restriction-only files). */
  currentPassword?: string;
}

export type SecurityStage = "open" | "encrypt" | "save" | "verify";

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

type StageFn = (stage: SecurityStage) => void;
const noop: StageFn = () => {};

function isPasswordError(error: unknown): boolean {
  return error instanceof Error && /password/i.test(error.message);
}

function isEncryptedError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "EncryptedPDFError" || /is encrypted/i.test(error.message))
  );
}

/** Cryptographically random owner password for "restrict only" protection. */
export function randomOwnerPassword(length = 32): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/** Read /P from the security dictionary (ISO 32000-1, table 22). */
function readPermissions(doc: PDFDocument): PdfPermissions | null {
  try {
    const ctx = doc.context;
    const encrypt = ctx.lookup(ctx.trailerInfo.Encrypt);
    if (!(encrypt instanceof PDFDict)) return null;
    const p = encrypt.lookup(PDFName.of("P"));
    if (!(p instanceof PDFNumber)) return null;
    const bits = p.asNumber() | 0;
    const has = (bit: number) => (bits & (1 << (bit - 1))) !== 0;
    const revision = encrypt.lookup(PDFName.of("R"));
    const r = revision instanceof PDFNumber ? revision.asNumber() : 2;
    const print = has(3);
    return {
      printing: !print ? "none" : r >= 3 && !has(12) ? "low" : "high",
      copying: has(5),
      modifying: has(4),
      annotating: has(6),
      fillingForms: r >= 3 ? has(9) || has(6) : has(6),
      documentAssembly: r >= 3 ? has(11) || has(4) : has(4),
    };
  } catch {
    return null;
  }
}

/** Open a PDF, decrypting it when a password is given. */
async function openDocument(bytes: Uint8Array, password?: string) {
  try {
    return await PDFDocument.load(
      bytes,
      password !== undefined ? { password, updateMetadata: false } : { updateMetadata: false },
    );
  } catch (error) {
    if (isPasswordError(error)) throw new PdfPasswordError();
    if (isEncryptedError(error)) throw new PdfPasswordError();
    throw new PdfInvalidError(error);
  }
}

/** Inspect a PDF without needing its password; tries the empty user password. */
export async function inspectPdf(bytes: Uint8Array): Promise<PdfInfo> {
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  } catch (error) {
    throw new PdfInvalidError(error);
  }
  if (!doc.isEncrypted) {
    return { encrypted: false, restrictionsOnly: false, pageCount: doc.getPageCount(), permissions: null };
  }
  const permissions = readPermissions(doc);
  try {
    const opened = await openDocument(bytes, "");
    return { encrypted: true, restrictionsOnly: true, pageCount: opened.getPageCount(), permissions };
  } catch (error) {
    if (error instanceof PdfPasswordError) {
      return { encrypted: true, restrictionsOnly: false, pageCount: null, permissions };
    }
    throw error;
  }
}

/**
 * After decrypting, the old security dictionary and the source's XRef stream
 * (which pdf-lib keeps as an unparseable object) are still in the object
 * table. Remove them so the saved file is a clean, unencrypted PDF.
 */
function stripSecurityObjects(doc: PDFDocument) {
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

export async function protectPdf(
  input: Uint8Array,
  options: ProtectOptions,
  onStage: StageFn = noop,
): Promise<Uint8Array> {
  onStage("open");
  const doc = await openDocument(input, options.currentPassword);
  if (options.currentPassword !== undefined) stripSecurityObjects(doc);

  onStage("encrypt");
  doc.encrypt({
    userPassword: options.userPassword,
    ownerPassword: options.ownerPassword,
    permissions: toLibPermissions(options.permissions),
    algorithm: options.cipher,
  });
  onStage("save");
  const output = await doc.save();

  // Self-check: the result must be encrypted and open with the user
  // password with every page intact.
  onStage("verify");
  const pageCount = doc.getPageCount();
  const plain = await PDFDocument.load(output, { ignoreEncryption: true, updateMetadata: false });
  if (!plain.isEncrypted) throw new Error("Encryption self-check failed: output is not encrypted");
  const reopened = await openDocument(output, options.userPassword);
  if (reopened.getPageCount() !== pageCount) {
    throw new Error("Encryption self-check failed: page count changed");
  }
  return output;
}

export async function unlockPdf(
  input: Uint8Array,
  password: string,
  onStage: StageFn = noop,
): Promise<Uint8Array> {
  onStage("open");
  const doc = await openDocument(input, password);
  const pageCount = doc.getPageCount();
  stripSecurityObjects(doc);
  onStage("save");
  const output = await doc.save();

  onStage("verify");
  const check = await PDFDocument.load(output, { ignoreEncryption: true, updateMetadata: false });
  if (check.isEncrypted || check.getPageCount() !== pageCount) {
    throw new Error("Unlock self-check failed");
  }
  return output;
}

/** Cheap pre-check: encrypted PDFs always reference /Encrypt in a trailer or XRef stream dict. */
export function mentionsEncrypt(bytes: Uint8Array): boolean {
  const needle = [0x2f, 0x45, 0x6e, 0x63, 0x72, 0x79, 0x70, 0x74]; // "/Encrypt"
  const last = bytes.length - needle.length;
  let i = bytes.indexOf(0x2f);
  outer: while (i !== -1 && i <= last) {
    for (let j = 1; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) {
        i = bytes.indexOf(0x2f, i + 1);
        continue outer;
      }
    }
    return true;
  }
  return false;
}

/**
 * Bytes that editing tools can work with: null when the file isn't encrypted,
 * the decrypted bytes when it only carries restrictions. Throws
 * PdfPasswordError when a password is needed to open it.
 */
export async function editableBytes(input: Uint8Array): Promise<Uint8Array | null> {
  if (!mentionsEncrypt(input)) return null;
  let doc: PDFDocument;
  try {
    doc = await PDFDocument.load(input, { ignoreEncryption: true, updateMetadata: false });
  } catch (error) {
    throw new PdfInvalidError(error);
  }
  if (!doc.isEncrypted) return null;
  return unlockPdf(input, "");
}
