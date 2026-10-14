/// <reference lib="webworker" />
/**
 * Builds the PDF with pdf-lib off the main thread (PNG embedding decodes
 * and re-deflates pixels, which would otherwise freeze the page).
 */
import { PDFDocument, clip, endPath, popGraphicsState, pushGraphicsState, rectangle, rgb } from "pdf-lib";

export interface BuildPage {
  bytes: ArrayBuffer;
  kind: "jpeg" | "png";
  page: { width: number; height: number };
  box: { x: number; y: number; width: number; height: number };
  draw: { x: number; y: number; width: number; height: number };
  clip: boolean;
  background: [number, number, number];
}

export type BuildRequest =
  | { type: "start"; title: string }
  | { type: "page"; index: number; page: BuildPage }
  | { type: "finish" };

export type BuildResponse =
  | { type: "added"; index: number }
  | { type: "done"; bytes: ArrayBuffer }
  | { type: "error"; message: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;
let doc: PDFDocument | null = null;
// Messages are handled strictly in order.
let chain: Promise<void> = Promise.resolve();

async function handle(msg: BuildRequest) {
  if (msg.type === "start") {
    doc = await PDFDocument.create();
    if (msg.title) doc.setTitle(msg.title);
    doc.setCreator("ZapFile");
    doc.setProducer("ZapFile");
    return;
  }
  if (!doc) throw new Error("Not started");
  if (msg.type === "page") {
    const p = msg.page;
    const image = p.kind === "jpeg" ? await doc.embedJpg(p.bytes) : await doc.embedPng(p.bytes);
    const page = doc.addPage([p.page.width, p.page.height]);
    const [r, g, b] = p.background;
    page.drawRectangle({ x: 0, y: 0, width: p.page.width, height: p.page.height, color: rgb(r, g, b) });
    if (p.clip) page.pushOperators(pushGraphicsState(), rectangle(p.box.x, p.box.y, p.box.width, p.box.height), clip(), endPath());
    page.drawImage(image, p.draw);
    if (p.clip) page.pushOperators(popGraphicsState());
    ctx.postMessage({ type: "added", index: msg.index } satisfies BuildResponse);
    return;
  }
  const out = await doc.save({ useObjectStreams: true, objectsPerTick: Infinity });
  doc = null;
  const buffer = out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength) as ArrayBuffer;
  ctx.postMessage({ type: "done", bytes: buffer } satisfies BuildResponse, [buffer]);
}

ctx.onmessage = (event: MessageEvent<BuildRequest>) => {
  chain = chain
    .then(() => handle(event.data))
    .catch((error) => {
      ctx.postMessage({ type: "error", message: error instanceof Error ? error.message : String(error) } satisfies BuildResponse);
    });
};
