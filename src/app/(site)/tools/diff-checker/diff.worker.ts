/// <reference lib="webworker" />
import { createTwoFilesPatch } from "diff";
import { buildDiffModel, normaliseNewlines, type DiffModel, type DiffOptions } from "@/lib/diff-core";

export type DiffRequest =
  | { id: number; kind: "diff"; a: string; b: string; opts: DiffOptions }
  | { id: number; kind: "patch"; a: string; b: string; nameA: string; nameB: string };

export type DiffResponse =
  | { id: number; kind: "diff"; ok: true; model: DiffModel; ms: number }
  | { id: number; kind: "patch"; ok: true; patch: string }
  | { id: number; ok: false; reason: "timeout" | "error"; message?: string };

const w = self as unknown as DedicatedWorkerGlobalScope;

w.onmessage = (e: MessageEvent<DiffRequest>) => {
  const req = e.data;
  try {
    if (req.kind === "patch") {
      const patch = createTwoFilesPatch(req.nameA, req.nameB, normaliseNewlines(req.a), normaliseNewlines(req.b));
      w.postMessage({ id: req.id, kind: "patch", ok: true, patch } satisfies DiffResponse);
      return;
    }
    const t0 = performance.now();
    const model = buildDiffModel(req.a, req.b, { ...req.opts, timeoutMs: 20000 });
    if (!model) {
      w.postMessage({ id: req.id, ok: false, reason: "timeout" } satisfies DiffResponse);
      return;
    }
    w.postMessage({ id: req.id, kind: "diff", ok: true, model, ms: performance.now() - t0 } satisfies DiffResponse);
  } catch (err) {
    w.postMessage({
      id: req.id,
      ok: false,
      reason: "error",
      message: err instanceof Error ? err.message : String(err),
    } satisfies DiffResponse);
  }
};
