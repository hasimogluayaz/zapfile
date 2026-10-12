/**
 * Tiny request/response layer for the text tools' Web Workers.
 *
 * `TaskRunner.run()` runs a job inline for small inputs and in a worker for big ones.
 * Starting a new job cancels the previous one: a busy worker is terminated (so a stale
 * 5 MB parse never blocks the next keystroke) and its promise rejects with `CancelledError`.
 */

export class CancelledError extends Error {
  constructor() {
    super("cancelled");
    this.name = "CancelledError";
  }
}

export const WORKER_THRESHOLD = 200 * 1024;

type Reply<Res> = { id: number; ok: true; value: Res } | { id: number; ok: false; error: string };
type Progress = { id: number; progress: number };

interface WorkerScope {
  onmessage: ((e: MessageEvent) => void) | null;
  postMessage: (msg: unknown, transfer?: Transferable[]) => void;
}

/** Call from a worker module: answers each `{ id, req }` message with the handler's result. */
export function exposeWorker<Req, Res>(
  handler: (req: Req, progress: (p: number) => void) => Res | Promise<Res>,
  transfer?: (res: Res) => Transferable[],
) {
  const scope = self as unknown as WorkerScope;
  scope.onmessage = async (e: MessageEvent<{ id: number; req: Req }>) => {
    const { id, req } = e.data;
    try {
      const value = await handler(req, (progress) => scope.postMessage({ id, progress } satisfies Progress));
      scope.postMessage({ id, ok: true, value } satisfies Reply<Res>, transfer ? transfer(value) : []);
    } catch (err) {
      scope.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) } satisfies Reply<Res>);
    }
  };
}

interface Pending<Req, Res> {
  id: number;
  req: Req;
  resolve: (v: Res) => void;
  reject: (e: unknown) => void;
  onProgress?: (p: number) => void;
}

export class TaskRunner<Req, Res> {
  private worker: Worker | null = null;
  private pending: Pending<Req, Res> | null = null;
  private seq = 0;
  private workerBroken = false;

  constructor(
    private factory: () => Worker,
    private inline: (req: Req) => Res | Promise<Res>,
  ) {}

  /** Rejects the running job (if any) with CancelledError. */
  cancel() {
    if (this.pending) {
      this.pending.reject(new CancelledError());
      this.pending = null;
      // The worker is mid-job: kill it rather than wait for a result nobody wants.
      this.worker?.terminate();
      this.worker = null;
    }
  }

  run(req: Req, useWorker: boolean, onProgress?: (p: number) => void): Promise<Res> {
    this.cancel();
    if (!useWorker || this.workerBroken || typeof Worker === "undefined") {
      return Promise.resolve().then(() => this.inline(req));
    }
    if (!this.worker) {
      try {
        this.worker = this.factory();
      } catch {
        this.workerBroken = true;
        return Promise.resolve().then(() => this.inline(req));
      }
      this.worker.onmessage = (e: MessageEvent<Reply<Res> | Progress>) => {
        const p = this.pending;
        if (!p || e.data.id !== p.id) return;
        if ("progress" in e.data) {
          p.onProgress?.(e.data.progress);
          return;
        }
        this.pending = null;
        if (e.data.ok) p.resolve(e.data.value);
        else p.reject(new Error(e.data.error));
      };
      this.worker.onerror = (ev) => {
        ev.preventDefault?.();
        const p = this.pending;
        this.pending = null;
        this.worker?.terminate();
        this.worker = null;
        this.workerBroken = true;
        // Worker could not load (e.g. blocked): fall back to running on the main thread.
        if (p) Promise.resolve().then(() => this.inline(p.req)).then(p.resolve, p.reject);
      };
    }
    const id = ++this.seq;
    return new Promise<Res>((resolve, reject) => {
      this.pending = { id, req, resolve, reject, onProgress };
      this.worker!.postMessage({ id, req });
    });
  }

  dispose() {
    this.cancel();
    this.worker?.terminate();
    this.worker = null;
  }
}
