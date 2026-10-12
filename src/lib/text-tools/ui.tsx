"use client";

/**
 * Shared building blocks for the text tools (JSON, YAML, XML, CSS, CSV, URL, Base64):
 * a code editor with line numbers, file drop and error-line highlight, an output panel that
 * never dumps megabytes into the DOM, and an error box with line:column and a code frame.
 */
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import toast from "react-hot-toast";
import { AlertTriangle, Check, Copy, Crosshair, Download, FileUp, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { downloadBlob, formatFileSize } from "@/lib/utils";
import { countLines, lineColToOffset, lineText } from "./position";

export const smallButton =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[13px] font-medium text-t-primary transition hover:bg-bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt disabled:cursor-not-allowed disabled:opacity-40";

const LINE_H = 20;
const PAD_Y = 12;
const MAX_FILE_BYTES = 64 * 1024 * 1024;
export const PREVIEW_CHARS = 200_000;

/** Reads a dropped/opened file as text (UTF-8, BOM kept for the parsers to strip). */
export async function readTextFile(file: File, t: (k: string, p?: Record<string, string | number>) => string) {
  if (file.size > MAX_FILE_BYTES) {
    toast.error(t("textkit.v2.fileTooBig", { size: formatFileSize(MAX_FILE_BYTES) }));
    return null;
  }
  try {
    return await file.text();
  } catch {
    toast.error(t("textkit.v2.fileReadFailed"));
    return null;
  }
}

export async function copyText(text: string, t: (k: string) => string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(t("ui.copied"));
  } catch {
    toast.error(t("ui.copyFailed"));
  }
}

/* ---------------- Code editor ---------------- */

export interface CodeEditorHandle {
  /** Focus the editor and put the caret at (line, col), scrolling it into view. */
  reveal: (line: number, col?: number) => void;
  focus: () => void;
}

interface CodeEditorProps {
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder?: string;
  errorLine?: number | null;
  /** Called with a dropped or opened file. Enables the "Open file" button and drop target. */
  onFile?: (file: File) => void;
  /** Extensions for the file picker, e.g. [".json"]. */
  accept?: string[];
  onClear?: () => void;
  toolbar?: ReactNode;
  footer?: ReactNode;
  initialHeight?: number;
}

const Gutter = memo(function Gutter({
  total,
  scrollTop,
  height,
  errorLine,
}: {
  total: number;
  scrollTop: number;
  height: number;
  errorLine?: number | null;
}) {
  const first = Math.max(0, Math.floor((scrollTop - PAD_Y) / LINE_H));
  const count = Math.ceil(height / LINE_H) + 2;
  const last = Math.min(total, first + count);
  const nums: number[] = [];
  for (let n = first + 1; n <= last; n++) nums.push(n);
  return (
    <div
      aria-hidden="true"
      className="relative shrink-0 select-none overflow-hidden border-e border-border bg-bg-tertiary/40 font-mono text-[12px] text-t-tertiary"
      style={{ width: `${String(total).length + 2.2}ch` }}
    >
      <div className="absolute inset-x-0" style={{ top: PAD_Y + first * LINE_H - scrollTop }}>
        {nums.map((n) => (
          <div
            key={n}
            className={`pe-2 text-end tabular-nums ${n === errorLine ? "font-semibold text-red-700 dark:text-red-400" : ""}`}
            style={{ height: LINE_H, lineHeight: `${LINE_H}px` }}
          >
            {n}
          </div>
        ))}
      </div>
    </div>
  );
});

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(function CodeEditor(
  { value, onChange, label, placeholder, errorLine, onFile, accept, onClear, toolbar, footer, initialHeight = 320 },
  ref,
) {
  const { t } = useI18n();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [height, setHeight] = useState(initialHeight);
  const [dragging, setDragging] = useState(false);
  const total = useMemo(() => countLines(value), [value]);
  const id = useRef(`ed-${Math.random().toString(36).slice(2, 9)}`).current;

  useEffect(() => {
    const el = boxRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      reveal(line, col = 1) {
        const ta = taRef.current;
        if (!ta) return;
        const off = lineColToOffset(ta.value, line, col);
        ta.focus({ preventScroll: true });
        ta.setSelectionRange(off, off);
        const target = PAD_Y + (line - 1) * LINE_H - ta.clientHeight / 3;
        ta.scrollTop = Math.max(0, target);
        setScrollTop(ta.scrollTop);
        boxRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      },
      focus() {
        taRef.current?.focus();
      },
    }),
    [],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (!onFile) return;
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-[13px] font-medium text-t-secondary">
          {label}
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {toolbar}
          {onFile && (
            <>
              <button type="button" className={smallButton} onClick={() => fileRef.current?.click()}>
                <FileUp className="h-4 w-4" aria-hidden="true" />
                {t("textkit.v2.openFile")}
              </button>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept={accept?.join(",")}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                  e.target.value = "";
                }}
              />
            </>
          )}
          {onClear && (
            <button type="button" className={smallButton} onClick={onClear} disabled={!value}>
              <X className="h-4 w-4" aria-hidden="true" />
              {t("ui.clear")}
            </button>
          )}
        </div>
      </div>
      <div
        ref={boxRef}
        dir="ltr"
        onDragOver={(e) => {
          if (!onFile || !e.dataTransfer.types.includes("Files")) return;
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className="relative flex min-h-[160px] resize-y overflow-hidden rounded-xl border border-border bg-bg-secondary focus-within:ring-2 focus-within:ring-accent/40"
        style={{ height: initialHeight }}
      >
        <Gutter total={total} scrollTop={scrollTop} height={height} errorLine={errorLine} />
        <div className="relative min-w-0 flex-1">
          {errorLine ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bg-red-500/15"
              style={{ top: PAD_Y + (errorLine - 1) * LINE_H - scrollTop, height: LINE_H }}
            />
          ) : null}
          <textarea
            id={id}
            ref={taRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
            placeholder={placeholder}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            wrap="off"
            aria-invalid={errorLine ? true : undefined}
            className="absolute inset-0 h-full w-full resize-none overflow-auto whitespace-pre bg-transparent px-3 font-mono text-[13px] text-t-primary placeholder:text-t-tertiary focus:outline-none"
            style={{ lineHeight: `${LINE_H}px`, paddingTop: PAD_Y, paddingBottom: PAD_Y, tabSize: 4 }}
          />
        </div>
        {dragging && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl border-2 border-dashed border-accent bg-surface/85 text-[14px] font-medium text-t-primary">
            {t("textkit.v2.dropToOpen")}
          </div>
        )}
      </div>
      {footer && <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-t-tertiary">{footer}</div>}
    </div>
  );
});

/* ---------------- Error box ---------------- */

export function ErrorBox({
  title,
  message,
  line,
  col,
  source,
  onReveal,
  tone = "error",
  action,
}: {
  title: string;
  message?: ReactNode;
  line?: number;
  col?: number;
  /** Source text: used to show the offending line with a caret. */
  source?: string;
  onReveal?: () => void;
  tone?: "error" | "warning";
  action?: ReactNode;
}) {
  const { t } = useI18n();
  const frame = useMemo(() => {
    if (!source || !line) return null;
    let text = lineText(source, line);
    let caret = Math.max(0, (col ?? 1) - 1);
    if (text.length > 120) {
      const start = Math.max(0, caret - 50);
      text = (start > 0 ? "…" : "") + text.slice(start, start + 110);
      caret = caret - start + (start > 0 ? 1 : 0);
    }
    return { text: text.replace(/\t/g, " "), caret };
  }, [source, line, col]);
  const color =
    tone === "error"
      ? "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-400"
      : "border-amber-500/30 bg-amber-500/5 text-amber-800 dark:text-amber-300";

  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-xl border p-4 ${color}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold">
            {title}
            {line ? (
              <span className="ms-2 font-mono text-[12.5px] font-medium opacity-80">
                {col ? t("textkit.v2.lineCol", { line, col }) : t("textkit.v2.lineOnly", { line })}
              </span>
            ) : null}
          </p>
          {message && <div className="mt-1 break-words text-[13px] text-t-secondary">{message}</div>}
          {frame && (
            <pre dir="ltr" className="mt-2 overflow-x-auto rounded-lg bg-bg-secondary px-3 py-2 font-mono text-[12px] leading-5 text-t-primary">
              <span className="me-3 select-none text-t-tertiary">{line}</span>
              {frame.text || " "}
              {"\n"}
              <span className="me-3 select-none text-transparent">{line}</span>
              <span className="text-red-600 dark:text-red-400">{" ".repeat(frame.caret)}^</span>
            </pre>
          )}
          {(onReveal || action) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {onReveal && line ? (
                <button type="button" className={smallButton} onClick={onReveal}>
                  <Crosshair className="h-4 w-4" aria-hidden="true" />
                  {t("textkit.v2.goToError")}
                </button>
              ) : null}
              {action}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Output panel ---------------- */

export function CopyButton({ getText, disabled, label }: { getText: () => string | Promise<string>; disabled?: boolean; label?: string }) {
  const { t } = useI18n();
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => setDone(false), 1400);
    return () => clearTimeout(timer);
  }, [done]);
  return (
    <button
      type="button"
      className={smallButton}
      disabled={disabled}
      aria-label={label ?? t("ui.copy")}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(await getText());
          setDone(true);
        } catch {
          toast.error(t("ui.copyFailed"));
        }
      }}
    >
      {done ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      {done ? t("textkit.v2.copiedShort") : label ?? t("ui.copy")}
    </button>
  );
}

export function OutputPanel({
  title,
  text,
  filename,
  mime,
  stale,
  meta,
  actions,
  view,
  placeholder,
  height = 320,
}: {
  title: ReactNode;
  text: string;
  filename: string;
  mime: string;
  stale?: boolean;
  meta?: ReactNode;
  actions?: ReactNode;
  /** Replaces the text view (e.g. a tree or table) while keeping copy/download of `text`. */
  view?: ReactNode;
  placeholder?: string;
  height?: number;
}) {
  const { t } = useI18n();
  const [showAll, setShowAll] = useState(false);
  const big = text.length > PREVIEW_CHARS;
  const shown = useMemo(() => {
    if (!big || showAll) return text;
    const cut = text.lastIndexOf("\n", PREVIEW_CHARS);
    return text.slice(0, cut > PREVIEW_CHARS / 2 ? cut : PREVIEW_CHARS);
  }, [text, big, showAll]);
  const bytes = useMemo(() => new Blob([text]).size, [text]);

  return (
    <div className={`transition-opacity ${stale ? "opacity-60" : ""}`} aria-busy={stale || undefined}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-t-secondary">{title}</span>
        <div className="flex flex-wrap items-center gap-2">
          {actions}
          <CopyButton getText={() => text} disabled={!text || stale} />
          <button
            type="button"
            className={smallButton}
            disabled={!text || stale}
            onClick={() => downloadBlob(new Blob([text], { type: mime }), filename)}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {t("ui.download")}
          </button>
        </div>
      </div>
      {view ?? (
        <textarea
          readOnly
          dir="ltr"
          value={shown}
          placeholder={placeholder}
          wrap="off"
          spellCheck={false}
          aria-label={typeof title === "string" ? title : undefined}
          className="block w-full resize-y overflow-auto whitespace-pre rounded-xl border border-border bg-bg-secondary px-3 py-3 font-mono text-[13px] leading-5 text-t-primary placeholder:text-t-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          style={{ height, tabSize: 4 }}
        />
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-t-tertiary">
        {text && <span className="tabular-nums">{formatFileSize(bytes)}</span>}
        {meta}
        {!view && big && (
          <span className="flex flex-wrap items-center gap-2">
            {!showAll && <span>{t("textkit.v2.previewTruncated", { shown: formatFileSize(shown.length), total: formatFileSize(bytes) })}</span>}
            <button type="button" className="font-medium text-t-primary underline underline-offset-2" onClick={() => setShowAll((v) => !v)}>
              {showAll ? t("textkit.v2.showLess") : t("textkit.v2.showAll")}
            </button>
          </span>
        )}
      </div>
    </div>
  );
}

/** Small note under inputs: where the input is kept. */
export function SavedNote({ tooBig }: { tooBig: boolean }) {
  const { t } = useI18n();
  return <span>{tooBig ? t("textkit.v2.notSavedTooBig") : t("textkit.v2.savedLocally")}</span>;
}

export function baseName(name: string) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}
