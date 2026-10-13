"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { CheckCircle2, Copy, Download, FileText, Loader2, ShieldCheck, Trash2, Type, XCircle } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { Segmented, Toggle, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { downloadBlob, formatFileSize } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { ALGOS, HMAC_ALGOS, type Algo, type HashJob, type HashMsg } from "./hash-core";

type Mode = "text" | "files";

interface Row {
  algo: Algo;
  hex: string;
}

interface FileEntry {
  id: number;
  file: File;
  done: number;
  rows: Row[] | null;
  error: string | null;
  ms: number;
}

const DEFAULT_ALGOS: Algo[] = ["MD5", "SHA-1", "SHA-256", "SHA-512"];
const STORE_KEY = "zapfile.hash.v2";
let seq = 0;

export default function HashGeneratorPage() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("text");
  const [algos, setAlgos] = useState<Algo[]>(DEFAULT_ALGOS);
  const [upper, setUpper] = useState(false);
  const [text, setText] = useState("");
  const [hmacOn, setHmacOn] = useState(false);
  const [hmacKey, setHmacKey] = useState("");
  const [textRows, setTextRows] = useState<Row[] | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [expected, setExpected] = useState("");

  const workerRef = useRef<Worker | null>(null);
  const queueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { algos?: Algo[]; upper?: boolean };
        const valid = (saved.algos ?? []).filter((a) => (ALGOS as readonly string[]).includes(a));
        if (valid.length) setAlgos(valid);
        if (typeof saved.upper === "boolean") setUpper(saved.upper);
      }
    } catch {
      /* defaults */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({ algos, upper }));
    } catch {
      /* blocked */
    }
  }, [algos, upper]);

  const worker = useCallback(() => {
    if (!workerRef.current) workerRef.current = new Worker(new URL("./hash.worker.ts", import.meta.url), { type: "module" });
    return workerRef.current;
  }, []);
  useEffect(() => () => workerRef.current?.terminate(), []);

  /** Run one job in the worker; progress callbacks for files. */
  const run = useCallback(
    (job: HashJob, onProgress?: (done: number) => void) =>
      new Promise<{ results: Row[]; ms: number }>((resolve, reject) => {
        const w = worker();
        const onMsg = (e: MessageEvent<HashMsg>) => {
          const m = e.data;
          if (m.id !== job.id) return;
          if (m.type === "progress") onProgress?.(m.done);
          else {
            w.removeEventListener("message", onMsg);
            if (m.type === "done") resolve({ results: m.results, ms: m.ms });
            else reject(new Error(m.message));
          }
        };
        w.addEventListener("message", onMsg);
        w.postMessage(job);
      }),
    [worker],
  );

  // Text: hash as you type, in the worker (keeps the WebAssembly hashers out of the page bundle).
  const keyForText = hmacOn ? hmacKey : null;
  useEffect(() => {
    if (mode !== "text") return;
    if (!text) {
      setTextRows(null);
      return;
    }
    let live = true;
    const job: HashJob = { id: ++seq, algos, hmacKey: keyForText, text };
    const id = setTimeout(
      async () => {
        try {
          const rows = (await run(job)).results;
          if (live) setTextRows(rows);
        } catch {
          if (live) toast.error(t("hash.fail"));
        }
      },
      text.length < 200_000 ? 80 : 300,
    );
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [mode, text, algos, keyForText, run, t]);

  // Files: hashed one after another in the worker, streamed in 4 MB chunks.
  const addFiles = (list: File[]) => {
    const entries = list.map((file) => ({ id: ++seq, file, done: 0, rows: null, error: null, ms: 0 }) as FileEntry);
    setFiles((prev) => [...prev, ...entries]);
    const chosen = algos;
    for (const entry of entries) {
      queueRef.current = queueRef.current.then(async () => {
        try {
          const { results, ms } = await run({ id: entry.id, algos: chosen, hmacKey: null, file: entry.file }, (done) =>
            setFiles((prev) => prev.map((f) => (f.id === entry.id ? { ...f, done } : f))),
          );
          setFiles((prev) => prev.map((f) => (f.id === entry.id ? { ...f, rows: results, done: f.file.size, ms } : f)));
        } catch (err) {
          setFiles((prev) => prev.map((f) => (f.id === entry.id ? { ...f, error: err instanceof Error ? err.message : String(err) } : f)));
        }
      });
    }
  };

  // Re-hash finished files when the algorithm set changes.
  const algosKey = algos.join(",");
  const lastAlgos = useRef(algosKey);
  useEffect(() => {
    if (lastAlgos.current === algosKey) return;
    lastAlgos.current = algosKey;
    if (!files.length) return;
    const again = files.map((f) => f.file);
    setFiles([]);
    addFiles(again);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [algosKey]);

  const fmt = (hex: string) => (upper ? hex.toUpperCase() : hex);
  const want = expected.trim().toLowerCase().replace(/^[a-z0-9-]+[:=]\s*/i, "").replace(/\s+/g, "");
  const matches = (hex: string) => want.length >= 8 && hex.toLowerCase() === want;
  const allRows = useMemo(() => [...(textRows ?? []), ...files.flatMap((f) => f.rows ?? [])], [textRows, files]);
  const anyMatch = want.length >= 8 && allRows.some((r) => matches(r.hex));

  const copy = async (value: string, msg = t("hash.ui.hashCopied")) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(msg);
    } catch {
      toast.error(t("hash.ui.copyFail"));
    }
  };

  const toggleAlgo = (a: Algo) => {
    const next = algos.includes(a) ? algos.filter((x) => x !== a) : ALGOS.filter((x) => x === a || algos.includes(x));
    if (!next.length) return;
    setAlgos(next);
  };

  // Checksum file in the common `sha256sum` format: "<hex>  <name>".
  const downloadChecksums = (algo: Algo) => {
    const lines = files.filter((f) => f.rows).map((f) => `${fmt(f.rows!.find((r) => r.algo === algo)?.hex ?? "")}  ${f.file.name}`);
    downloadBlob(new Blob([lines.join("\n") + "\n"], { type: "text/plain" }), `checksums.${algo.toLowerCase().replace(/[^a-z0-9]/g, "")}`);
  };

  const Table = ({ rows }: { rows: Row[] }) => (
    <ul className="divide-y divide-border">
      {rows.map((r) => {
        const hit = matches(r.hex);
        return (
          <li key={r.algo} className={`flex items-center gap-3 py-2 ${hit ? "rounded-lg bg-emerald-500/10 px-2" : ""}`}>
            <span className="w-[86px] shrink-0 text-[12.5px] font-semibold text-t-secondary">{hmacOn && mode === "text" ? `HMAC-${r.algo}` : r.algo}</span>
            <code dir="ltr" className="min-w-0 flex-1 break-all font-mono text-[13px] leading-relaxed text-t-primary">
              {fmt(r.hex)}
            </code>
            {hit && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-label={t("hash.v2.match")} />}
            <button type="button" onClick={() => copy(fmt(r.hex))} aria-label={`${t("ui.copy")} ${r.algo}`} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-t-tertiary hover:bg-bg-secondary hover:text-t-primary">
              <Copy className="h-4 w-4" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );

  return (
    <ToolLayout toolName={t("tool.hash-generator.name")} toolDescription={t("tool.hash-generator.desc")}>
      <div className="space-y-5">
        <div className="glass space-y-4 p-5">
          <Segmented<Mode>
            label={t("hash.v2.input")}
            value={mode}
            onChange={setMode}
            options={[
              { value: "text", label: t("hash.textInput"), icon: <Type className="h-4 w-4" aria-hidden="true" /> },
              { value: "files", label: t("hash.v2.files"), icon: <FileText className="h-4 w-4" aria-hidden="true" /> },
            ]}
          />
          <div className="space-y-2">
            <p className={sectionTitle}>{t("hash.v2.algorithms")}</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("hash.v2.algorithms")}>
              {ALGOS.map((a) => {
                const on = algos.includes(a);
                const off = hmacOn && mode === "text" && !HMAC_ALGOS.includes(a);
                return (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={on}
                    disabled={off}
                    onClick={() => toggleAlgo(a)}
                    className={`rounded-lg border px-3 py-2 text-[13px] font-medium transition disabled:opacity-35 ${on ? "border-accent bg-accent text-on-accent" : "border-border text-t-secondary hover:bg-bg-secondary hover:text-t-primary"}`}
                  >
                    {a}
                  </button>
                );
              })}
            </div>
          </div>
          <Toggle checked={upper} onChange={setUpper} label={t("hash.v2.uppercase")} />
        </div>

        {mode === "text" ? (
          <div className="glass space-y-4 p-5">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("hash.enterText")}
              rows={5}
              spellCheck={false}
              className="w-full resize-y rounded-xl border border-border bg-bg-secondary px-3 py-2.5 font-mono text-[14px] text-t-primary placeholder:text-t-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
            />
            <p className="text-[12px] text-t-tertiary">{t("hash.v2.utf8")}</p>
            <Toggle checked={hmacOn} onChange={setHmacOn} label="HMAC" description={t("hash.v2.hmacHint")} />
            {hmacOn && (
              <input
                type="text"
                value={hmacKey}
                onChange={(e) => setHmacKey(e.target.value)}
                placeholder={t("hash.v2.hmacKey")}
                aria-label={t("hash.v2.hmacKey")}
                spellCheck={false}
                autoComplete="off"
                className="h-11 w-full rounded-xl border border-border bg-bg-secondary px-3 font-mono text-[14px] text-t-primary placeholder:text-t-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
              />
            )}
            {textRows && textRows.length > 0 && (
              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <p className={sectionTitle}>{t("hash.results")}</p>
                  <button type="button" onClick={() => copy(textRows.map((r) => `${r.algo}: ${fmt(r.hex)}`).join("\n"), t("hash.ui.allCopied"))} className="rounded-lg px-2.5 py-2 text-[13px] font-medium text-t-secondary hover:bg-bg-secondary hover:text-t-primary">
                    {t("hash.copyAll")}
                  </button>
                </div>
                <Table rows={textRows} />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <FileDropzone onFilesSelected={addFiles} multiple label={t("hash.v2.dropFiles")} />
            {files.map((f) => {
              const pct = f.file.size ? Math.round((f.done / f.file.size) * 100) : 100;
              return (
                <div key={f.id} className="glass space-y-3 p-5">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 shrink-0 text-t-tertiary" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-semibold text-t-primary" title={f.file.name}>
                        {f.file.name}
                      </p>
                      <p className="text-[12.5px] tabular-nums text-t-tertiary">
                        {formatFileSize(f.file.size)}
                        {f.rows && f.ms > 0 ? ` · ${t("hash.v2.took", { s: (f.ms / 1000).toFixed(f.ms < 10000 ? 2 : 0) })}` : ""}
                      </p>
                    </div>
                    <button type="button" onClick={() => setFiles((prev) => prev.filter((x) => x.id !== f.id))} aria-label={t("ui.remove")} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-t-tertiary hover:bg-bg-secondary hover:text-t-primary">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  {f.error ? (
                    <p className="text-[13px] text-red-700 dark:text-red-400">{t("hash.fail")}</p>
                  ) : f.rows ? (
                    <Table rows={f.rows} />
                  ) : (
                    <div className="space-y-1.5" aria-live="polite">
                      <div className="flex items-center justify-between text-[12.5px] text-t-secondary">
                        <span className="flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          {t("hash.generating")}
                        </span>
                        <span className="tabular-nums">{pct}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-bg-tertiary">
                        <div className="h-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {files.some((f) => f.rows) && (
              <div className="flex flex-wrap gap-2">
                {algos
                  .filter((a) => ["MD5", "SHA-1", "SHA-256", "SHA-512"].includes(a))
                  .map((a) => (
                    <button key={a} type="button" onClick={() => downloadChecksums(a)} className={buttonSecondary}>
                      <Download className="h-4 w-4" aria-hidden="true" />
                      {t("hash.v2.checksumFile", { algo: a })}
                    </button>
                  ))}
              </div>
            )}
            <p className="text-[12.5px] text-t-tertiary">{t("hash.v2.filesNote")}</p>
          </div>
        )}

        <div className="glass space-y-2 p-5">
          <label className="block">
            <span className="mb-1.5 flex items-center gap-2 text-[13px] text-t-secondary">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {t("hash.v2.verify")}
            </span>
            <input
              type="text"
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              placeholder={t("hash.v2.verifyPlaceholder")}
              spellCheck={false}
              className="h-11 w-full rounded-xl border border-border bg-bg-secondary px-3 font-mono text-[13.5px] text-t-primary placeholder:text-t-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
            />
          </label>
          {want.length >= 8 && allRows.length > 0 && (
            <p className={`flex items-center gap-1.5 text-[13px] font-medium ${anyMatch ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`} aria-live="polite">
              {anyMatch ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <XCircle className="h-4 w-4" aria-hidden="true" />}
              {anyMatch ? t("hash.v2.matchFound", { algo: allRows.find((r) => matches(r.hex))!.algo }) : t("hash.v2.noMatch")}
            </p>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
