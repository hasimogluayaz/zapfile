"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import toast from "react-hot-toast";
import { Copy, Info, Replace, Timer, TriangleAlert } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import { Toggle, sectionTitle } from "@/components/ui/controls";
import { useI18n } from "@/lib/i18n";
import type { RegexMatch, RegexRequest, RegexResponse } from "./regex.worker";
import { LIBRARY, MAX_HIGHLIGHTS, MAX_MATCHES, TIMEOUT_MS, captureGroupNames } from "./regex-utils";

const FLAG_ORDER = ["g", "i", "m", "s", "u", "y", "d"] as const;
type Flag = (typeof FLAG_ORDER)[number];

const FLAG_LABEL_KEYS: Record<Flag, string> = {
  g: "regex.global",
  i: "regex.caseInsensitive",
  m: "regex.multiline",
  s: "regex.dotall",
  u: "regex.v2.flagUnicode",
  y: "regex.v2.flagSticky",
  d: "regex.v2.flagIndices",
};

const GROUP_STYLES = [
  "bg-emerald-500/25 border-emerald-600 dark:border-emerald-400",
  "bg-sky-500/25 border-sky-600 dark:border-sky-400",
  "bg-amber-500/30 border-amber-600 dark:border-amber-400",
  "bg-rose-500/25 border-rose-600 dark:border-rose-400",
  "bg-teal-500/25 border-teal-600 dark:border-teal-400",
  "bg-orange-500/25 border-orange-600 dark:border-orange-400",
];
const GROUP_DOTS = ["bg-emerald-500", "bg-sky-500", "bg-amber-500", "bg-rose-500", "bg-teal-500", "bg-orange-500"];
const MATCH_STYLE = "bg-volt/45 border-volt-ink dark:bg-volt/30 dark:border-volt";

const inputCls =
  "w-full rounded-xl border border-border bg-bg-secondary px-4 py-3 font-mono text-[14px] text-t-primary placeholder:text-t-tertiary focus:border-t-primary/40 focus:outline-none";

type RunState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done"; matches: RegexMatch[]; capped: boolean; replaced: string | null; ms: number }
  | { kind: "timeout" }
  | { kind: "error"; message: string };

function showInvisible(s: string): string {
  return s.replace(/\n/g, "↵").replace(/\t/g, "→");
}

export default function RegexTesterPage() {
  const { t, locale } = useI18n();
  const [pattern, setPattern] = useState("");
  const [flags, setFlags] = useState<Set<Flag>>(() => new Set<Flag>(["g"]));
  const [text, setText] = useState("");
  const [replaceOn, setReplaceOn] = useState(false);
  const [replacement, setReplacement] = useState("");
  const [run, setRun] = useState<RunState>({ kind: "idle" });
  const [selected, setSelected] = useState(0);
  const [listLimit, setListLimit] = useState(200);

  const workerRef = useRef<Worker | null>(null);
  const runIdRef = useRef(0);
  const busyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flagString = FLAG_ORDER.filter((f) => flags.has(f)).join("");
  const nf = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  // Compile on the main thread (cheap, no backtracking) for instant syntax errors.
  const compileError = useMemo(() => {
    if (!pattern) return "";
    try {
      new RegExp(pattern, flagString);
      return "";
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }, [pattern, flagString]);

  const groupNames = useMemo(() => (compileError ? [] : captureGroupNames(pattern)), [pattern, compileError]);

  const killWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    busyRef.current = false;
  }, []);

  useEffect(() => () => {
    killWorker();
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [killWorker]);

  // Debounced run in a worker with a hard timeout.
  useEffect(() => {
    if (!pattern || compileError || !text) {
      runIdRef.current++;
      if (busyRef.current) killWorker();
      setRun({ kind: "idle" });
      return;
    }
    const handle = setTimeout(() => {
      const id = ++runIdRef.current;
      // A still-running (possibly catastrophic) job would delay this one: replace the worker.
      if (busyRef.current) killWorker();
      if (!workerRef.current) {
        const w = new Worker(new URL("./regex.worker.ts", import.meta.url), { type: "module" });
        w.onmessage = (e: MessageEvent<RegexResponse>) => {
          const res = e.data;
          busyRef.current = false;
          if (timerRef.current) clearTimeout(timerRef.current);
          if (res.id !== runIdRef.current) return;
          if (res.ok) {
            setRun({ kind: "done", matches: res.matches, capped: res.capped, replaced: res.replaced, ms: res.ms });
          } else {
            setRun({ kind: "error", message: res.error });
          }
        };
        w.onerror = () => {
          busyRef.current = false;
          if (timerRef.current) clearTimeout(timerRef.current);
          if (id === runIdRef.current) setRun({ kind: "error", message: t("regex.invalid") });
        };
        workerRef.current = w;
      }
      busyRef.current = true;
      const spinner = setTimeout(() => {
        if (id === runIdRef.current && busyRef.current) setRun({ kind: "running" });
      }, 200);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        clearTimeout(spinner);
        if (id !== runIdRef.current || !busyRef.current) return;
        killWorker();
        setRun({ kind: "timeout" });
      }, TIMEOUT_MS);
      const req: RegexRequest = {
        id,
        pattern,
        flags: flagString,
        text,
        replacement: replaceOn ? replacement : null,
        maxMatches: MAX_MATCHES,
      };
      workerRef.current.postMessage(req);
    }, 150);
    return () => clearTimeout(handle);
  }, [pattern, compileError, flagString, text, replaceOn, replacement, killWorker, t]);

  useEffect(() => {
    setSelected(0);
    setListLimit(200);
  }, [pattern, flagString, text]);

  const matches = useMemo(() => (run.kind === "done" ? run.matches : []), [run]);
  const groupCount = groupNames.length;

  const toggleFlag = (f: Flag) =>
    setFlags((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("ui.copied"));
    } catch {
      toast.error(t("ui.copyFailed"));
    }
  };

  const highlighted = useMemo(() => {
    if (run.kind !== "done" || matches.length === 0) return null;
    const out: ReactNode[] = [];
    let pos = 0;
    const limit = Math.min(matches.length, MAX_HIGHLIGHTS);
    for (let mi = 0; mi < limit; mi++) {
      const m = matches[mi];
      const [s, e] = m;
      if (s > pos) out.push(text.slice(pos, s));
      if (s === e) {
        out.push(
          <span
            key={`z${mi}`}
            className="mx-px inline-block h-[1.15em] w-[3px] -translate-y-px rounded-full bg-volt-ink align-middle dark:bg-volt"
            title={t("regex.v2.emptyMatch")}
          />,
        );
        pos = Math.max(pos, e);
        continue;
      }
      // Split the match at every group boundary; colour each piece by its innermost group.
      const points = new Set<number>([s, e]);
      for (let g = 0; g < groupCount; g++) {
        const gs = m[2 + g * 2];
        const ge = m[3 + g * 2];
        if (gs >= 0 && ge > gs) {
          points.add(Math.max(s, gs));
          points.add(Math.min(e, ge));
        }
      }
      const sorted = Array.from(points).sort((a, b) => a - b);
      for (let k = 0; k < sorted.length - 1; k++) {
        const a = sorted[k];
        const b = sorted[k + 1];
        if (b <= a) continue;
        let inner = -1;
        let innerLen = Infinity;
        for (let g = 0; g < groupCount; g++) {
          const gs = m[2 + g * 2];
          const ge = m[3 + g * 2];
          if (gs >= 0 && gs <= a && ge >= b && ge - gs <= innerLen) {
            inner = g;
            innerLen = ge - gs;
          }
        }
        out.push(
          <mark
            key={`m${mi}-${k}`}
            className={`rounded-[3px] border-b-2 text-t-primary ${inner >= 0 ? GROUP_STYLES[inner % GROUP_STYLES.length] : MATCH_STYLE}`}
            title={
              inner >= 0
                ? `${t("regex.groupN", { n: inner + 1 })}${groupNames[inner] ? ` <${groupNames[inner]}>` : ""}`
                : `#${mi + 1}`
            }
          >
            {text.slice(a, b)}
          </mark>,
        );
      }
      pos = e;
    }
    if (pos < text.length) out.push(text.slice(pos));
    return out;
  }, [run.kind, matches, text, groupCount, groupNames, t]);

  const sel = matches[selected];
  const showUnicodeTip = !flags.has("u") && /[\uD800-\uDFFF]/.test(text);
  const regexLiteral = `/${pattern.replace(/(?<!\\)\//g, "\\/")}/${flagString}`;

  return (
    <ToolLayout toolName="Regex Tester" toolDescription="Test and debug regular expressions with live matching">
      <div className="space-y-5">
        {/* Pattern */}
        <section className="glass space-y-4 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="rx-pattern" className="text-sm font-medium text-t-secondary">
              {t("regex.pattern")}
            </label>
            {pattern && !compileError && (
              <button
                type="button"
                onClick={() => copy(regexLiteral)}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-t-secondary hover:bg-bg-secondary hover:text-t-primary"
              >
                <Copy className="h-3.5 w-3.5" aria-hidden />
                {t("regex.v2.copyRegex")}
              </button>
            )}
          </div>
          <div
            className={`flex items-center rounded-xl border bg-bg-secondary font-mono text-[15px] focus-within:border-t-primary/40 ${
              compileError ? "border-red-500/60" : "border-border"
            }`}
          >
            <span className="ps-4 text-t-tertiary" aria-hidden>
              /
            </span>
            <input
              id="rx-pattern"
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder={t("regex.enterPattern")}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              aria-invalid={!!compileError}
              className="min-w-0 flex-1 bg-transparent px-1 py-3 text-t-primary placeholder:text-t-tertiary focus:outline-none"
            />
            <span className="pe-4 text-t-tertiary" aria-hidden>
              /{flagString}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("regex.flags")}>
            {FLAG_ORDER.map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={flags.has(f)}
                onClick={() => toggleFlag(f)}
                title={t(FLAG_LABEL_KEYS[f])}
                className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border px-2.5 text-[13px] transition-colors ${
                  flags.has(f)
                    ? "border-accent bg-accent text-on-accent"
                    : "border-border bg-bg-secondary text-t-secondary hover:text-t-primary"
                }`}
              >
                <span className="font-mono font-semibold">{f}</span>
                <span className={flags.has(f) ? "opacity-80" : "text-t-tertiary"}>{t(FLAG_LABEL_KEYS[f])}</span>
              </button>
            ))}
          </div>

          {compileError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-500/25 bg-red-500/5 p-3" role="alert">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-700 dark:text-red-400" aria-hidden />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">{t("regex.invalid")}</p>
                <p className="mt-0.5 break-all font-mono text-xs text-red-700/80 dark:text-red-400/80">{compileError}</p>
              </div>
            </div>
          )}

          <div>
            <p className={`${sectionTitle} mb-2`}>{t("regex.commonPatterns")}</p>
            <div className="flex flex-wrap gap-1.5">
              {LIBRARY.map((p) => (
                <button
                  key={p.labelKey}
                  type="button"
                  onClick={() => {
                    setPattern(p.pattern);
                    setFlags(new Set(p.flags.split("") as Flag[]));
                  }}
                  title={`/${p.pattern}/${p.flags}`}
                  className="min-h-[36px] rounded-lg border border-border bg-bg-secondary px-3 text-[13px] text-t-secondary transition-colors hover:text-t-primary"
                >
                  {t(p.labelKey)}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Test string + highlighted result */}
        <div className="grid gap-5 lg:grid-cols-2">
          <section className="glass p-5 sm:p-6">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="rx-text" className="text-sm font-medium text-t-secondary">
                {t("regex.testString")}
              </label>
              {text && (
                <button
                  type="button"
                  onClick={() => setText("")}
                  className="min-h-[36px] rounded-lg px-2.5 text-[13px] text-t-secondary hover:bg-bg-secondary hover:text-t-primary"
                >
                  {t("ui.clear")}
                </button>
              )}
            </div>
            <textarea
              id="rx-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t("regex.enterTest")}
              rows={10}
              spellCheck={false}
              className={`${inputCls} resize-y leading-relaxed`}
            />
            {showUnicodeTip && (
              <p className="mt-2 flex items-start gap-1.5 text-[12.5px] text-t-tertiary">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {t("regex.v2.unicodeTip")}
              </p>
            )}
          </section>

          <section className="glass flex min-w-0 flex-col p-5 sm:p-6">
            <div className="mb-2 flex min-h-[36px] flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-t-secondary">{t("regex.highlighted")}</h2>
              <StatusLine run={run} nf={nf} t={t} />
            </div>
            <div
              className="min-h-[200px] flex-1 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-bg-secondary px-4 py-3 font-mono text-[14px] leading-relaxed text-t-primary lg:max-h-[420px]"
              aria-live="polite"
            >
              {run.kind === "timeout" ? (
                <div className="flex items-start gap-2.5 font-sans text-sm text-red-700 dark:text-red-400">
                  <Timer className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  <span>{t("regex.v2.tooSlow", { s: TIMEOUT_MS / 1000 })}</span>
                </div>
              ) : highlighted ? (
                <>
                  {highlighted}
                  {matches.length > MAX_HIGHLIGHTS && (
                    <p className="mt-3 font-sans text-[12.5px] text-t-tertiary">
                      {t("regex.v2.highlightCap", { n: nf.format(MAX_HIGHLIGHTS) })}
                    </p>
                  )}
                </>
              ) : (
                <span className="font-sans text-sm text-t-tertiary">
                  {run.kind === "done" ? t("regex.v2.noMatches") : text || t("regex.v2.resultHint")}
                </span>
              )}
            </div>
            {groupCount > 0 && matches.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-t-tertiary">
                {groupNames.map((name, gi) => (
                  <span key={gi} className="inline-flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-sm ${GROUP_DOTS[gi % GROUP_DOTS.length]}`} />
                    {t("regex.groupN", { n: gi + 1 })}
                    {name && <span className="font-mono">&lt;{name}&gt;</span>}
                  </span>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Replace */}
        <section className="glass space-y-3 p-5 sm:p-6">
          <Toggle
            checked={replaceOn}
            onChange={setReplaceOn}
            label={
              <span className="inline-flex items-center gap-2">
                <Replace className="h-4 w-4" aria-hidden />
                {t("regex.v2.replace")}
              </span>
            }
            description={t("regex.v2.replaceHint")}
          />
          {replaceOn && (
            <>
              <input
                type="text"
                value={replacement}
                onChange={(e) => setReplacement(e.target.value)}
                placeholder={t("regex.v2.replacePlaceholder")}
                spellCheck={false}
                aria-label={t("regex.v2.replace")}
                className={inputCls}
              />
              {run.kind === "done" && run.replaced !== null && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="text-[13px] text-t-secondary">{t("regex.v2.replaceResult")}</span>
                    <button
                      type="button"
                      onClick={() => copy(run.replaced ?? "")}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-t-secondary hover:bg-bg-secondary hover:text-t-primary"
                    >
                      <Copy className="h-3.5 w-3.5" aria-hidden />
                      {t("ui.copy")}
                    </button>
                  </div>
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-bg-secondary px-4 py-3 font-mono text-[14px] text-t-primary">
                    {run.replaced.length > 200000 ? run.replaced.slice(0, 200000) + "…" : run.replaced}
                  </pre>
                </div>
              )}
            </>
          )}
        </section>

        {/* Match list + group details */}
        {run.kind === "done" && matches.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <section className="glass p-5 sm:p-6">
              <h2 className="mb-3 text-sm font-medium text-t-secondary">{t("regex.matchDetails")}</h2>
              <ol className="max-h-[420px] space-y-1 overflow-y-auto pe-1">
                {matches.slice(0, listLimit).map((m, i) => {
                  const value = text.slice(m[0], m[1]);
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => setSelected(i)}
                        aria-current={selected === i}
                        className={`flex min-h-[36px] w-full items-center gap-3 rounded-lg border px-3 py-1.5 text-start text-[13px] transition-colors ${
                          selected === i
                            ? "border-t-primary/40 bg-bg-secondary"
                            : "border-transparent hover:bg-bg-secondary"
                        }`}
                      >
                        <span className="w-10 shrink-0 tabular-nums text-t-tertiary">#{i + 1}</span>
                        <span className="w-24 shrink-0 font-mono tabular-nums text-t-tertiary">
                          {m[0]}–{m[1]}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-mono text-t-primary">
                          {value ? showInvisible(value.length > 160 ? value.slice(0, 160) + "…" : value) : (
                            <span className="text-t-tertiary">{t("regex.v2.emptyMatch")}</span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              {matches.length > listLimit && (
                <button
                  type="button"
                  onClick={() => setListLimit((n) => n + 500)}
                  className="mt-3 min-h-[36px] w-full rounded-lg border border-border text-[13px] text-t-secondary hover:bg-bg-secondary hover:text-t-primary"
                >
                  {t("regex.v2.showMore", { n: nf.format(matches.length - listLimit) })}
                </button>
              )}
            </section>

            <section className="glass p-5 sm:p-6">
              <h2 className="mb-3 text-sm font-medium text-t-secondary">
                {t("regex.v2.groupsOf", { n: selected + 1 })}
              </h2>
              {sel && (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-border text-start text-t-tertiary">
                        <th className="py-2 pe-3 text-start font-medium">#</th>
                        <th className="py-2 pe-3 text-start font-medium">{t("regex.v2.colName")}</th>
                        <th className="py-2 pe-3 text-start font-medium">{t("ui.value")}</th>
                        <th className="py-2 text-end font-medium">{t("regex.v2.colRange")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/60">
                        <td className="py-2 pe-3 font-mono text-t-tertiary">0</td>
                        <td className="py-2 pe-3 text-t-secondary">{t("regex.v2.fullMatch")}</td>
                        <td className="max-w-[260px] truncate py-2 pe-3 font-mono text-t-primary">
                          {showInvisible(text.slice(sel[0], sel[1]))}
                        </td>
                        <td className="py-2 text-end font-mono tabular-nums text-t-tertiary">
                          {sel[0]}–{sel[1]}
                        </td>
                      </tr>
                      {groupNames.map((name, g) => {
                        const gs = sel[2 + g * 2];
                        const ge = sel[3 + g * 2];
                        return (
                          <tr key={g} className="border-b border-border/60 last:border-0">
                            <td className="py-2 pe-3 font-mono text-t-tertiary">
                              <span className="inline-flex items-center gap-1.5">
                                <span className={`h-2 w-2 rounded-sm ${GROUP_DOTS[g % GROUP_DOTS.length]}`} />
                                {g + 1}
                              </span>
                            </td>
                            <td className="py-2 pe-3 font-mono text-t-secondary">{name ?? "—"}</td>
                            <td className="max-w-[260px] truncate py-2 pe-3 font-mono text-t-primary">
                              {gs < 0 ? (
                                <span className="font-sans text-t-tertiary">{t("regex.v2.notParticipating")}</span>
                              ) : (
                                showInvisible(text.slice(gs, ge))
                              )}
                            </td>
                            <td className="py-2 text-end font-mono tabular-nums text-t-tertiary">
                              {gs < 0 ? "" : `${gs}–${ge}`}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {groupCount === 0 && <p className="mt-3 text-[12.5px] text-t-tertiary">{t("regex.v2.noGroups")}</p>}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}

function StatusLine({
  run,
  nf,
  t,
}: {
  run: RunState;
  nf: Intl.NumberFormat;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  if (run.kind === "running") {
    return <span className="text-[12.5px] text-t-tertiary">{t("regex.v2.running")}</span>;
  }
  if (run.kind !== "done") return null;
  return (
    <span className="text-[12.5px] tabular-nums text-t-secondary">
      {t("regex.matchesFound")} <span className="font-semibold text-t-primary">{nf.format(run.matches.length)}</span>
      {run.capped && <span className="text-amber-700 dark:text-amber-400"> · {t("regex.v2.capped")}</span>}
      <span className="text-t-tertiary"> · {run.ms < 1 ? "<1" : Math.round(run.ms)} ms</span>
    </span>
  );
}
