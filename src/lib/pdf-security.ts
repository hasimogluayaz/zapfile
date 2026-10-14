/**
 * Public API for PDF encryption / decryption. The work (AES, parsing, the
 * self-checks) runs in a Web Worker (`pdf-security.worker.ts`) so the page
 * never freezes; each call can report its stage and be cancelled with an
 * AbortSignal. Falls back to running in-thread where workers are unavailable.
 */
import type {
  PdfCipher,
  PdfInfo,
  PdfPermissions,
  PrintPermission,
  ProtectOptions,
  SecurityStage,
} from "./pdf-security-core";

export type { PdfCipher, PdfInfo, PdfPermissions, PrintPermission, ProtectOptions, SecurityStage };

export const FULL_PERMISSIONS: PdfPermissions = {
  printing: "high",
  copying: true,
  modifying: true,
  annotating: true,
  fillingForms: true,
  documentAssembly: true,
};

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

/** Cryptographically random owner password for "restrict only" protection. */
export function randomOwnerPassword(length = 32): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export type SecurityRequest =
  | { op: "inspect"; bytes: ArrayBuffer }
  | { op: "editable"; bytes: ArrayBuffer }
  | { op: "protect"; bytes: ArrayBuffer; options: ProtectOptions }
  | { op: "unlock"; bytes: ArrayBuffer; password: string };

export type SecurityResponse =
  | { type: "stage"; stage: SecurityStage }
  | { type: "done"; info: PdfInfo }
  | { type: "done"; bytes: ArrayBuffer | null }
  | { type: "error"; code: "password" | "invalid" | "generic"; message: string };

export interface TaskOptions {
  signal?: AbortSignal;
  onStage?: (stage: SecurityStage) => void;
}

function abortError() {
  return new DOMException("Aborted", "AbortError");
}

function mapError(code: "password" | "invalid" | "generic", message: string): Error {
  if (code === "password") return new PdfPasswordError();
  if (code === "invalid") return new PdfInvalidError(new Error(message));
  return new Error(message);
}

/** Same task in the current thread (no Worker support, or the worker failed to start). */
async function runInThread(req: SecurityRequest, onStage?: (s: SecurityStage) => void) {
  const core = await import("./pdf-security-core");
  const bytes = new Uint8Array(req.bytes);
  try {
    switch (req.op) {
      case "inspect":
        return { info: await core.inspectPdf(bytes) };
      case "editable":
        return { bytes: await core.editableBytes(bytes) };
      case "protect":
        return { bytes: await core.protectPdf(bytes, req.options, onStage) };
      case "unlock":
        return { bytes: await core.unlockPdf(bytes, req.password, onStage) };
    }
  } catch (error) {
    if (error instanceof core.PdfPasswordError) throw new PdfPasswordError();
    if (error instanceof core.PdfInvalidError) throw new PdfInvalidError(error);
    throw error;
  }
}

type TaskResult = { info?: PdfInfo; bytes?: Uint8Array | null };

function runTask(req: SecurityRequest, { signal, onStage }: TaskOptions = {}): Promise<TaskResult> {
  if (signal?.aborted) return Promise.reject(abortError());
  if (typeof Worker === "undefined") return runInThread(req, onStage);

  return new Promise<TaskResult>((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./pdf-security.worker.ts", import.meta.url), { type: "module" });
    } catch {
      runInThread(req, onStage).then(resolve, reject);
      return;
    }
    let settled = false;
    let started = false;
    const finish = () => {
      settled = true;
      worker.terminate();
      signal?.removeEventListener("abort", onAbort);
    };
    const onAbort = () => {
      if (settled) return;
      finish();
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort);

    worker.onmessage = (event: MessageEvent<SecurityResponse>) => {
      if (settled) return;
      started = true;
      const msg = event.data;
      if (msg.type === "stage") {
        onStage?.(msg.stage);
        return;
      }
      finish();
      if (msg.type === "error") reject(mapError(msg.code, msg.message));
      else if ("info" in msg) resolve({ info: msg.info });
      else resolve({ bytes: msg.bytes ? new Uint8Array(msg.bytes) : null });
    };
    worker.onerror = (event) => {
      event.preventDefault();
      if (settled) return;
      finish();
      // The worker never got going (old browser, blocked chunk): do it here.
      if (!started) runInThread(req, onStage).then(resolve, reject);
      else reject(new Error(event.message || "PDF worker crashed"));
    };
    // Send a copy so the caller keeps its own bytes.
    const copy = req.bytes.slice(0);
    worker.postMessage({ ...req, bytes: copy }, [copy]);
  });
}

/** The underlying buffer (no copy when the view covers all of it; runTask copies once). */
function toBuffer(bytes: Uint8Array): ArrayBuffer {
  if (bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength) return bytes.buffer as ArrayBuffer;
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/** Inspect a PDF without needing its password (tries the empty user password). */
export async function inspectPdf(bytes: Uint8Array, options?: TaskOptions): Promise<PdfInfo> {
  const { info } = await runTask({ op: "inspect", bytes: toBuffer(bytes) }, options);
  return info!;
}

export async function protectPdf(
  input: Uint8Array,
  protect: ProtectOptions,
  options?: TaskOptions,
): Promise<Uint8Array> {
  const { bytes } = await runTask({ op: "protect", bytes: toBuffer(input), options: protect }, options);
  return bytes!;
}

export async function unlockPdf(input: Uint8Array, password: string, options?: TaskOptions): Promise<Uint8Array> {
  const { bytes } = await runTask({ op: "unlock", bytes: toBuffer(input), password }, options);
  return bytes!;
}

/**
 * Decrypted bytes when the PDF only carries usage restrictions, null when it
 * isn't encrypted. Throws PdfPasswordError when it needs a password to open.
 */
export async function editablePdfBytesOffThread(input: Uint8Array, options?: TaskOptions): Promise<Uint8Array | null> {
  const { bytes } = await runTask({ op: "editable", bytes: toBuffer(input) }, options);
  return bytes ?? null;
}
