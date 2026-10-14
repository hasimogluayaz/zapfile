/// <reference lib="webworker" />
/**
 * Runs PDF encryption, decryption and inspection off the main thread.
 * Protocol: see `SecurityRequest` / `SecurityResponse` in pdf-security.ts.
 */
import {
  PdfInvalidError,
  PdfPasswordError,
  editableBytes,
  inspectPdf,
  protectPdf,
  unlockPdf,
} from "./pdf-security-core";
import type { SecurityStage } from "./pdf-security-core";
import type { SecurityRequest, SecurityResponse } from "./pdf-security";

declare const self: DedicatedWorkerGlobalScope;

const post = (msg: SecurityResponse, transfer: Transferable[] = []) => self.postMessage(msg, transfer);

self.onmessage = async (event: MessageEvent<SecurityRequest>) => {
  const req = event.data;
  const bytes = new Uint8Array(req.bytes);
  const stage = (s: SecurityStage) => post({ type: "stage", stage: s });
  try {
    if (req.op === "inspect") {
      post({ type: "done", info: await inspectPdf(bytes) });
    } else if (req.op === "editable") {
      const out = await editableBytes(bytes);
      if (!out) post({ type: "done", bytes: null });
      else {
        const buf = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
        post({ type: "done", bytes: buf }, [buf]);
      }
    } else {
      const out =
        req.op === "protect"
          ? await protectPdf(bytes, req.options, stage)
          : await unlockPdf(bytes, req.password, stage);
      const buf = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
      post({ type: "done", bytes: buf }, [buf]);
    }
  } catch (error) {
    const code =
      error instanceof PdfPasswordError ? "password" : error instanceof PdfInvalidError ? "invalid" : "generic";
    post({ type: "error", code, message: error instanceof Error ? error.message : String(error) });
  }
};
