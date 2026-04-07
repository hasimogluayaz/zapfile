/// <reference lib="webworker" />

const w = self as unknown as DedicatedWorkerGlobalScope;

const ALGORITHMS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const;

w.onmessage = async (e: MessageEvent<{ buffer: ArrayBuffer }>) => {
  const { buffer } = e.data;
  try {
    const out: { algorithm: string; hash: string }[] = [];
    for (const algo of ALGORITHMS) {
      const hashBuffer = await crypto.subtle.digest(algo, buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
      out.push({ algorithm: algo, hash });
    }
    w.postMessage({ ok: true, results: out });
  } catch (err) {
    w.postMessage({
      ok: false,
      error: err instanceof Error ? err.message : "hash failed",
    });
  }
};
