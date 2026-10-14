"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent } from "react";
import toast from "react-hot-toast";
import { ArrowLeftRight, ChevronsUpDown, Download, FileUp, Info, Loader2, Timer } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import { Segmented, Toggle, buttonSecondary } from "@/components/ui/controls";
import { useI18n } from "@/lib/i18n";
import type { DiffModel, Seg } from "@/lib/diff-core";
import type { DiffRequest, DiffResponse } from "./diff.worker";

const CONTEXT = 3;
const ROW_PAGE = 1500;

type View = "unified" | "split";
type Inline = "word" | "char" | "none";

type Row =
  | { t: "eq"; a: number; b: number }
  | { t: "del"; a: number; segs: Seg[] | null }
  | { t: "add"; b: number; segs: Seg[] | null }
  | { t: "pair"; a: number | null; b: number | null; segsA: Seg[] | null; segsB: Seg[] | null }
  | { t: "fold"; block: number; count: number };

type Status =
  | { kind: "idle" }
  | { kind: "busy"; model: DiffModel | null }
  | { kind: "done"; model: DiffModel; ms: number }
  | { kind: "timeout" }
  | { kind: "error"; message: string };

function buildRows(model: DiffModel, view: View, expanded: Set<number>): Row[] {
  const rows: Row[] = [];
  const n = model.blocks.length;
  model.blocks.forEach((blk, bi) => {
    if (blk.kind === "eq") {
      const head = bi === 0 ? 0 : CONTEXT;
      const tail = bi === n - 1 ? 0 : CONTEXT;
      const showAll = expanded.has(bi) || blk.count <= head + tail + 2;
      const push = (i: number) => rows.push({ t: "eq", a: blk.a + i, b: blk.b + i });
      if (showAll) {
        for (let i = 0; i < blk.count; i++) push(i);
      } else {
        for (let i = 0; i < head; i++) push(i);
        rows.push({ t: "fold", block: bi, count: blk.count - head - tail });
        for (let i = blk.count - tail; i < blk.count; i++) push(i);
      }
      return;
    }
    if (view === "unified") {
      for (let i = 0; i < blk.aCount; i++) rows.push({ t: "del", a: blk.a + i, segs: blk.segsA[i] ?? null });
      for (let i = 0; i < blk.bCount; i++) rows.push({ t: "add", b: blk.b + i, segs: blk.segsB[i] ?? null });
    } else {
      const m = Math.max(blk.aCount, blk.bCount);
      for (let i = 0; i < m; i++) {
        rows.push({
          t: "pair",
          a: i < blk.aCount ? blk.a + i : null,
          b: i < blk.bCount ? blk.b + i : null,
          segsA: blk.segsA[i] ?? null,
          segsB: blk.segsB[i] ?? null,
        });
      }
    }
  });
  return rows;
}

function LineText({ text, segs, side }: { text: string; segs: Seg[] | null; side: -1 | 1 }) {
  if (!segs) return <>{text || " "}</>;
  return (
    <>
      {segs.map(([k, s], i) =>
        k === 0 ? (
          <span key={i}>{s}</span>
        ) : (
          <span
            key={i}
            className={`rounded-[3px] ${side === -1 ? "bg-red-500/30 text-red-900 dark:text-red-100" : "bg-emerald-500/30 text-emerald-900 dark:text-emerald-100"}`}
          >
            {s}
          </span>
        ),
      )}
      {segs.length === 0 && " "}
    </>
  );
}

const cellBase = "min-w-0 flex-1 whitespace-pre-wrap break-words py-0.5 pe-3 font-mono text-[13px] leading-6";
const gutter = "shrink-0 select-none py-0.5 pe-2 text-end font-mono text-[11.5px] leading-6 tabular-nums text-t-tertiary";

const DiffRows = memo(function DiffRows({
  rows,
  model,
  view,
  gw,
  onExpand,
  foldLabel,
}: {
  rows: Row[];
  model: DiffModel;
  view: View;
  gw: string;
  onExpand: (block: number) => void;
  foldLabel: (n: number) => string;
}) {
  return (
    <>
      {rows.map((r, i) => {
        if (r.t === "fold") {
          return (
            <button
              key={`f${r.block}`}
              type="button"
              onClick={() => onExpand(r.block)}
              className="flex min-h-[36px] w-full items-center justify-center gap-2 border-y border-border bg-bg-secondary text-[12.5px] text-t-secondary transition-colors hover:text-t-primary"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" aria-hidden />
              {foldLabel(r.count)}
            </button>
          );
        }
        if (r.t === "eq" && view === "unified") {
          return (
            <div key={i} className="flex border-s-2 border-transparent">
              <span className={gutter} style={{ width: gw }}>{r.a + 1}</span>
              <span className={gutter} style={{ width: gw }}>{r.b + 1}</span>
              <span className="w-5 shrink-0 select-none py-0.5 text-center font-mono text-[13px] leading-6 text-t-tertiary"> </span>
              <span className={`${cellBase} text-t-secondary`}>{model.right[r.b] || " "}</span>
            </div>
          );
        }
        if (r.t === "del" || r.t === "add") {
          const del = r.t === "del";
          const n = del ? r.a : r.b;
          return (
            <div
              key={i}
              className={`flex border-s-2 ${del ? "border-red-500 bg-red-500/10" : "border-emerald-500 bg-emerald-500/10"}`}
            >
              <span className={gutter} style={{ width: gw }}>{del ? n + 1 : ""}</span>
              <span className={gutter} style={{ width: gw }}>{del ? "" : n + 1}</span>
              <span
                className={`w-5 shrink-0 select-none py-0.5 text-center font-mono text-[13px] leading-6 ${del ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400"}`}
              >
                {del ? "−" : "+"}
              </span>
              <span className={`${cellBase} text-t-primary`}>
                <LineText text={del ? model.left[n] : model.right[n]} segs={r.segs} side={del ? -1 : 1} />
              </span>
            </div>
          );
        }
        // Split view: eq or pair
        const a = r.t === "eq" ? r.a : r.a;
        const b = r.t === "eq" ? r.b : r.b;
        const changed = r.t === "pair";
        return (
          <div key={i} className="grid grid-cols-2 divide-x divide-border rtl:divide-x-reverse">
            <div
              className={`flex min-w-0 border-s-2 ${
                !changed ? "border-transparent" : a === null ? "border-transparent bg-bg-secondary/70" : "border-red-500 bg-red-500/10"
              }`}
            >
              <span className={gutter} style={{ width: gw }}>{a === null ? "" : a + 1}</span>
              <span className={`${cellBase} ${changed ? "text-t-primary" : "text-t-secondary"}`}>
                {a === null ? " " : changed ? <LineText text={model.left[a]} segs={(r as { segsA: Seg[] | null }).segsA} side={-1} /> : model.left[a] || " "}
              </span>
            </div>
            <div
              className={`flex min-w-0 border-s-2 ${
                !changed ? "border-transparent" : b === null ? "border-transparent bg-bg-secondary/70" : "border-emerald-500 bg-emerald-500/10"
              }`}
            >
              <span className={gutter} style={{ width: gw }}>{b === null ? "" : b + 1}</span>
              <span className={`${cellBase} ${changed ? "text-t-primary" : "text-t-secondary"}`}>
                {b === null ? " " : changed ? <LineText text={model.right[b]} segs={(r as { segsB: Seg[] | null }).segsB} side={1} /> : model.right[b] || " "}
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
});

function countLines(s: string): number {
  if (!s) return 0;
  let n = 1;
  for (let i = 0; i < s.length; i++) if (s.charCodeAt(i) === 10) n++;
  if (s.endsWith("\n")) n--;
  return n;
}

export default function DiffCheckerPage() {
  const { t, locale } = useI18n();
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [nameA, setNameA] = useState("original.txt");
  const [nameB, setNameB] = useState("modified.txt");
  const [view, setView] = useState<View>("unified");
  const [inline, setInline] = useState<Inline>("word");
  const [ignoreWs, setIgnoreWs] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(false);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());
  const [rowLimit, setRowLimit] = useState(ROW_PAGE);

  const workerRef = useRef<Worker | null>(null);
  const busyRef = useRef(false);
  const idRef = useRef(0);
  const fileA = useRef<HTMLInputElement>(null);
  const fileB = useRef<HTMLInputElement>(null);
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const getWorker = useCallback(() => {
    if (busyRef.current) {
      workerRef.current?.terminate();
      workerRef.current = null;
      busyRef.current = false;
    }
    if (!workerRef.current) {
      const w = new Worker(new URL("./diff.worker.ts", import.meta.url), { type: "module" });
      w.onmessage = (e: MessageEvent<DiffResponse>) => {
        busyRef.current = false;
        const res = e.data;
        if (res.id !== idRef.current) return;
        if (!res.ok) {
          setStatus(res.reason === "timeout" ? { kind: "timeout" } : { kind: "error", message: res.message ?? "" });
          return;
        }
        if (res.kind !== "diff") return;
        setExpanded(new Set());
        setRowLimit(ROW_PAGE);
        setStatus({ kind: "done", model: res.model, ms: res.ms });
      };
      w.onerror = () => {
        busyRef.current = false;
        setStatus({ kind: "error", message: "" });
      };
      workerRef.current = w;
    }
    return workerRef.current;
  }, []);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    [],
  );

  // Live diff, debounced; a newer edit cancels the running job.
  useEffect(() => {
    if (!left && !right) {
      idRef.current++;
      setStatus({ kind: "idle" });
      return;
    }
    const delay = left.length + right.length > 1_000_000 ? 600 : 300;
    const handle = setTimeout(() => {
      const id = ++idRef.current;
      const w = getWorker();
      busyRef.current = true;
      setTimeout(() => {
        if (idRef.current === id && busyRef.current) {
          setStatus((s) => ({ kind: "busy", model: s.kind === "done" || s.kind === "busy" ? s.model : null }));
        }
      }, 200);
      const req: DiffRequest = { id, kind: "diff", a: left, b: right, opts: { ignoreWhitespace: ignoreWs, ignoreCase, inline } };
      w.postMessage(req);
    }, delay);
    return () => clearTimeout(handle);
  }, [left, right, ignoreWs, ignoreCase, inline, getWorker]);

  const model = status.kind === "done" || status.kind === "busy" ? status.model : null;
  const stale = status.kind === "busy";
  const rows = useMemo(() => (model ? buildRows(model, view, expanded) : []), [model, view, expanded]);
  const gw = useMemo(() => {
    const digits = String(Math.max(model?.left.length ?? 0, model?.right.length ?? 0, 9)).length;
    return `${digits * 0.62 + 1.1}em`;
  }, [model]);

  const expand = useCallback((b: number) => setExpanded((prev) => new Set(prev).add(b)), []);
  const foldLabel = useCallback((n: number) => t("diff.v2.showLines", { n: nf.format(n) }), [t, nf]);

  const loadFile = async (file: File, side: "a" | "b") => {
    try {
      const text = await file.text();
      if (text.indexOf("\u0000") !== -1) {
        toast.error(t("diff.v2.binary"));
        return;
      }
      if (side === "a") {
        setLeft(text);
        setNameA(file.name);
      } else {
        setRight(text);
        setNameB(file.name);
      }
    } catch {
      toast.error(t("diff.v2.readFail"));
    }
  };

  const onDrop = (side: "a" | "b") => (e: DragEvent<HTMLTextAreaElement>) => {
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    e.preventDefault();
    void loadFile(file, side);
  };

  const [patching, setPatching] = useState(false);
  const downloadPatch = () => {
    // A one-off worker so a running live diff isn't disturbed.
    setPatching(true);
    const w = new Worker(new URL("./diff.worker.ts", import.meta.url), { type: "module" });
    const done = () => {
      w.terminate();
      setPatching(false);
    };
    w.onmessage = (e: MessageEvent<DiffResponse>) => {
      const res = e.data;
      done();
      if (!res.ok || res.kind !== "patch") {
        toast.error(t("diff.v2.failed"));
        return;
      }
      const url = URL.createObjectURL(new Blob([res.patch], { type: "text/x-diff" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "changes.patch";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
    w.onerror = () => {
      done();
      toast.error(t("diff.v2.failed"));
    };
    const req: DiffRequest = { id: 0, kind: "patch", a: left, b: right, nameA, nameB };
    w.postMessage(req);
  };

  const swap = () => {
    setLeft(right);
    setRight(left);
    setNameA(nameB);
    setNameB(nameA);
  };

  const similarity = model && model.left.length + model.right.length > 0
    ? Math.round(((model.unchanged * 2) / (model.left.length + model.right.length)) * 100)
    : 100;
  const identical = model && model.added === 0 && model.removed === 0;

  const textareaCls =
    "w-full resize-y rounded-xl border border-border bg-bg-secondary px-4 py-3 font-mono text-[13px] leading-relaxed text-t-primary placeholder:text-t-tertiary focus:border-t-primary/40 focus:outline-none";

  const sideInput = (side: "a" | "b") => {
    const isA = side === "a";
    const value = isA ? left : right;
    return (
      <section className="glass p-4 sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-2">
          <label htmlFor={`diff-${side}`} className="text-sm font-medium text-t-secondary">
            {isA ? t("diff.original") : t("diff.modified")}
          </label>
          <button
            type="button"
            onClick={() => (isA ? fileA : fileB).current?.click()}
            className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-t-secondary hover:bg-bg-secondary hover:text-t-primary"
          >
            <FileUp className="h-3.5 w-3.5" aria-hidden />
            {t("diff.v2.openFile")}
          </button>
          <input
            ref={isA ? fileA : fileB}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void loadFile(f, side);
              e.target.value = "";
            }}
          />
        </div>
        <textarea
          id={`diff-${side}`}
          value={value}
          onChange={(e) => (isA ? setLeft : setRight)(e.target.value)}
          onDragOver={(e) => e.dataTransfer.types.includes("Files") && e.preventDefault()}
          onDrop={onDrop(side)}
          placeholder={isA ? t("diff.pasteOriginal") : t("diff.pasteModified")}
          rows={12}
          spellCheck={false}
          wrap="off"
          className={textareaCls}
        />
        <p className="mt-1.5 text-[12px] tabular-nums text-t-tertiary">
          {t("diff.v2.lineCount", { n: nf.format(countLines(value)) })}
        </p>
      </section>
    );
  };

  return (
    <ToolLayout toolName="Diff Checker" toolDescription="Compare two texts and highlight differences">
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {sideInput("a")}
          {sideInput("b")}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={swap} className={buttonSecondary}>
            <ArrowLeftRight className="h-4 w-4" aria-hidden />
            {t("ui.swap")}
          </button>
          <button
            type="button"
            onClick={() => {
              setLeft("");
              setRight("");
              setNameA("original.txt");
              setNameB("modified.txt");
            }}
            disabled={!left && !right}
            className={buttonSecondary}
          >
            {t("ui.clear")}
          </button>
          {model && !identical && (
            <button type="button" onClick={downloadPatch} disabled={patching || stale} className={buttonSecondary}>
              {patching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
              {t("diff.v2.downloadPatch")}
            </button>
          )}
        </div>

        <section className="glass space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <Segmented<View>
              label={t("diff.output")}
              value={view}
              onChange={setView}
              size="sm"
              options={[
                { value: "unified", label: t("diff.viewUnified") },
                { value: "split", label: t("diff.viewSplit") },
              ]}
            />
            <Segmented<Inline>
              label={t("diff.v2.highlight")}
              value={inline}
              onChange={setInline}
              size="sm"
              options={[
                { value: "word", label: t("diff.v2.words") },
                { value: "char", label: t("diff.v2.chars") },
                { value: "none", label: t("diff.v2.linesOnly") },
              ]}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Toggle checked={ignoreWs} onChange={setIgnoreWs} label={t("diff.v2.ignoreWs")} description={t("diff.v2.ignoreWsHint")} />
            <Toggle checked={ignoreCase} onChange={setIgnoreCase} label={t("diff.v2.ignoreCase")} />
          </div>
        </section>

        <section className="glass p-4 sm:p-5" aria-live="polite">
          <div className="mb-3 flex min-h-[28px] flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
            <h2 className="me-auto text-sm font-medium text-t-secondary">{t("diff.output")}</h2>
            {status.kind === "busy" && (
              <span className="inline-flex items-center gap-1.5 text-t-tertiary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                {t("diff.comparing")}
              </span>
            )}
            {model && !identical && (
              <>
                <span className="font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
                  +{nf.format(model.added)} {model.added === 1 ? t("diff.addition") : t("diff.additions")}
                </span>
                <span className="font-medium tabular-nums text-red-700 dark:text-red-400">
                  −{nf.format(model.removed)} {model.removed === 1 ? t("diff.deletion") : t("diff.deletions")}
                </span>
                <span className="tabular-nums text-t-secondary">
                  {nf.format(model.unchanged)} {t("diff.unchanged")}
                </span>
                <span className="tabular-nums text-t-tertiary">{t("diff.v2.similarity", { n: similarity })}</span>
              </>
            )}
          </div>

          {model?.lineEndingsDiffer && (
            <p className="mb-3 flex items-start gap-1.5 text-[12.5px] text-t-tertiary">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {t("diff.v2.crlf")}
            </p>
          )}

          {status.kind === "idle" && <p className="py-8 text-center text-sm text-t-tertiary">{t("diff.v2.hint")}</p>}
          {status.kind === "timeout" && (
            <p className="flex items-start justify-center gap-2 py-8 text-center text-sm text-red-700 dark:text-red-400">
              <Timer className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {t("diff.v2.timeout")}
            </p>
          )}
          {status.kind === "error" && (
            <p className="py-8 text-center text-sm text-red-700 dark:text-red-400">{t("diff.v2.failed")}</p>
          )}
          {model && identical && (
            <p className="py-8 text-center text-sm text-t-secondary">
              {model.left.length === 0 ? t("diff.empty") : t("diff.identical")}
            </p>
          )}
          {model && !identical && (
            <div className={`overflow-hidden rounded-xl border border-border transition-opacity ${stale ? "opacity-50" : ""}`}>
              {view === "split" && (
                <div className="grid grid-cols-2 divide-x divide-border border-b border-border bg-bg-secondary text-[11.5px] font-semibold uppercase tracking-wide text-t-tertiary rtl:divide-x-reverse">
                  <span className="truncate px-3 py-2">{nameA}</span>
                  <span className="truncate px-3 py-2">{nameB}</span>
                </div>
              )}
              <div className="max-h-[75vh] overflow-y-auto">
                <DiffRows
                  rows={rows.length > rowLimit ? rows.slice(0, rowLimit) : rows}
                  model={model}
                  view={view}
                  gw={gw}
                  onExpand={expand}
                  foldLabel={foldLabel}
                />
                {rows.length > rowLimit && (
                  <button
                    type="button"
                    onClick={() => setRowLimit((n) => n + ROW_PAGE)}
                    className="min-h-[40px] w-full border-t border-border bg-bg-secondary text-[13px] text-t-secondary hover:text-t-primary"
                  >
                    {t("diff.v2.moreRows", { n: nf.format(rows.length - rowLimit) })}
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </ToolLayout>
  );
}
