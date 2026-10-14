/// <reference lib="webworker" />
import { PDFDocument, degrees, type PDFPage } from "pdf-lib";

const w = self as unknown as DedicatedWorkerGlobalScope;

export interface OrganizeRequest {
  sources: ArrayBuffer[];
  /** Output pages in order: `src` -1 is a blank page, sized like its neighbour. */
  pages: { src: number; page: number; rotate: number }[];
}

w.onmessage = async (e: MessageEvent<OrganizeRequest>) => {
  const { sources, pages } = e.data;
  try {
    const docs: PDFDocument[] = [];
    for (const bytes of sources) {
      try {
        docs.push(await PDFDocument.load(bytes, { updateMetadata: false }));
      } catch {
        w.postMessage({ type: "error", code: "load", file: docs.length });
        return;
      }
    }
    const out = await PDFDocument.create();
    // Copy each source's pages in one call (shared resources are copied once).
    const copied = new Map<string, PDFPage[]>();
    for (let s = 0; s < docs.length; s++) {
      const wanted = pages.filter((p) => p.src === s).map((p) => p.page - 1);
      if (!wanted.length) continue;
      const list = await out.copyPages(docs[s]!, wanted);
      wanted.forEach((idx, k) => {
        const key = `${s}:${idx}`;
        copied.set(key, [...(copied.get(key) ?? []), list[k]!]);
      });
    }
    const sizeNear = (i: number): [number, number] => {
      for (let d = 1; d < pages.length; d++) {
        for (const j of [i - d, i + d]) {
          const q = pages[j];
          if (q && q.src >= 0) {
            const pg = docs[q.src]!.getPage(q.page - 1);
            const { width, height } = pg.getSize();
            const turned = (((pg.getRotation().angle + q.rotate) % 180) + 180) % 180 === 90;
            return turned ? [height, width] : [width, height];
          }
        }
      }
      return [595.28, 841.89];
    };
    pages.forEach((p, i) => {
      let page: PDFPage;
      if (p.src < 0) page = out.addPage(sizeNear(i));
      else {
        page = copied.get(`${p.src}:${p.page - 1}`)!.shift()!;
        out.addPage(page);
      }
      if (p.rotate % 360 !== 0) page.setRotation(degrees((((page.getRotation().angle + p.rotate) % 360) + 360) % 360));
      if (i % 20 === 0) w.postMessage({ type: "progress", value: 0.2 + (0.6 * i) / pages.length });
    });
    const bytes = await out.save({ useObjectStreams: true });
    w.postMessage({ type: "done", bytes, kind: "pdf" }, [bytes.buffer]);
  } catch (error) {
    w.postMessage({ type: "error", code: "fail", message: error instanceof Error ? error.message : String(error) });
  }
};
