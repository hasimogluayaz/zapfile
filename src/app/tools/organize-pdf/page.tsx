"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from "react";
import toast from "react-hot-toast";
import { ArrowLeft, ArrowRight, Check, Copy, Download, FilePlus2, FileText, Loader2, Plus, Redo2, RotateCcw, RotateCw, Scissors, Trash2, Undo2, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { buttonPrimary, buttonSecondary } from "@/components/ui/controls";
import { downloadBlob, formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { pdfInputErrorKey, toEditablePdf } from "@/lib/pdf-input";
import { createPdfThumbnailer, type PdfThumbnailer } from "@/lib/pdf-thumb";
import { PdfPageThumb } from "@/lib/pdf-thumb-view";
import { useI18n } from "@/lib/i18n";
import { runWorkerTask } from "../merge-pdf/worker-task";

const THUMB_BOX = 150;

interface Source {
  file: File;
  thumbs: PdfThumbnailer;
  pages: number;
}

interface Tile {
  uid: number;
  /** Source index, or -1 for a blank page. */
  src: number;
  page: number;
  rotate: number;
}

let uidSeq = 1;
const tileOf = (src: number, page: number): Tile => ({ uid: uidSeq++, src, page, rotate: 0 });

export default function OrganizePdfPage() {
  const { t } = useI18n();
  const [sources, setSources] = useState<Source[]>([]);
  const [doc, setDoc] = useState<{ tiles: Tile[]; past: Tile[][]; future: Tile[][] }>({ tiles: [], past: [], future: [] });
  const tiles = doc.tiles;
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [opening, setOpening] = useState(false);
  const [saving, setSaving] = useState<"all" | "selected" | null>(null);
  const [dragUid, setDragUid] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [gridEl, setGridEl] = useState<HTMLDivElement | null>(null);
  const anchor = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sourcesRef = useRef(sources);
  sourcesRef.current = sources;

  useEffect(() => () => sourcesRef.current.forEach((s) => s.thumbs.destroy()), []);

  /** Every edit goes through here so it can be undone. */
  const commit = useCallback((next: Tile[] | ((prev: Tile[]) => Tile[])) => {
    setDoc((d) => {
      const value = typeof next === "function" ? next(d.tiles) : next;
      return value === d.tiles ? d : { tiles: value, past: [...d.past.slice(-80), d.tiles], future: [] };
    });
  }, []);
  const undo = () => setDoc((d) => (d.past.length ? { tiles: d.past[d.past.length - 1]!, past: d.past.slice(0, -1), future: [d.tiles, ...d.future] } : d));
  const redo = () => setDoc((d) => (d.future.length ? { tiles: d.future[0]!, past: [...d.past, d.tiles], future: d.future.slice(1) } : d));

  const addFiles = useCallback(
    async (files: File[]) => {
      setOpening(true);
      try {
        for (const picked of files) {
          try {
            const file = await toEditablePdf(picked);
            const thumbs = await createPdfThumbnailer(file);
            const index = sourcesRef.current.length;
            const src: Source = { file, thumbs, pages: thumbs.pageCount };
            sourcesRef.current = [...sourcesRef.current, src];
            setSources(sourcesRef.current);
            commit((prev) => [...prev, ...Array.from({ length: src.pages }, (_, i) => tileOf(index, i + 1))]);
          } catch (error) {
            toast.error(`${picked.name}: ${t(pdfInputErrorKey(error))}`);
          }
        }
      } finally {
        setOpening(false);
      }
    },
    [commit, t],
  );

  const reset = () => {
    sources.forEach((s) => s.thumbs.destroy());
    sourcesRef.current = [];
    setSources([]);
    setDoc({ tiles: [], past: [], future: [] });
    setSelected(new Set());
  };

  // ── Edits ──
  const targetsOr = (uid: number) => (selected.has(uid) ? selected : new Set([uid]));
  const rotate = (uids: Set<number>, deg: number) => commit((prev) => prev.map((x) => (uids.has(x.uid) ? { ...x, rotate: x.rotate + deg } : x)));
  const remove = (uids: Set<number>) => {
    commit((prev) => prev.filter((x) => !uids.has(x.uid)));
    setSelected((s) => new Set([...s].filter((u) => !uids.has(u))));
  };
  const duplicate = (uids: Set<number>) =>
    commit((prev) => prev.flatMap((x) => (uids.has(x.uid) ? [x, { ...x, uid: uidSeq++ }] : [x])));
  const insertBlank = (afterUid: number | null) =>
    commit((prev) => {
      const i = afterUid === null ? prev.length - 1 : prev.findIndex((x) => x.uid === afterUid);
      const next = [...prev];
      next.splice(i + 1, 0, { uid: uidSeq++, src: -1, page: 0, rotate: 0 });
      return next;
    });
  const move = (uid: number, to: number) =>
    commit((prev) => {
      const from = prev.findIndex((x) => x.uid === uid);
      if (from < 0) return prev;
      const moving = selected.has(uid) && selected.size > 1 ? prev.filter((x) => selected.has(x.uid)) : [prev[from]!];
      const ids = new Set(moving.map((m) => m.uid));
      const rest = prev.filter((x) => !ids.has(x.uid));
      // Index `to` counts slots in the original list; shift for removed items before it.
      const before = prev.slice(0, to).filter((x) => ids.has(x.uid)).length;
      const at = Math.max(0, Math.min(rest.length, to - before));
      return [...rest.slice(0, at), ...moving, ...rest.slice(at)];
    });
  const nudge = (uid: number, dir: -1 | 1) => {
    const i = tiles.findIndex((x) => x.uid === uid);
    move(uid, dir < 0 ? Math.max(0, i - 1) : Math.min(tiles.length, i + 2));
  };
  const reverse = () => commit((prev) => [...prev].reverse());

  const onTileClick = (uid: number, e: ReactMouseEvent) => {
    const next = new Set(e.metaKey || e.ctrlKey || e.shiftKey ? selected : []);
    if (e.shiftKey && anchor.current !== null) {
      const a = tiles.findIndex((x) => x.uid === anchor.current), b = tiles.findIndex((x) => x.uid === uid);
      for (let i = Math.min(a, b); i <= Math.max(a, b); i++) next.add(tiles[i]!.uid);
    } else if (selected.has(uid) && (e.metaKey || e.ctrlKey || selected.size === 1)) next.delete(uid);
    else next.add(uid);
    anchor.current = uid;
    setSelected(next);
  };
  const onTileKey = (uid: number, e: ReactKeyboardEvent) => {
    if (e.altKey && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
      e.preventDefault();
      nudge(uid, e.key === "ArrowLeft" ? -1 : 1);
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      remove(targetsOr(uid));
    }
  };

  // Global shortcuts.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && ["INPUT", "TEXTAREA"].includes(e.target.tagName);
      if (typing || !(e.metaKey || e.ctrlKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (k === "y") {
        e.preventDefault();
        redo();
      } else if (k === "a" && tiles.length) {
        e.preventDefault();
        setSelected(new Set(tiles.map((x) => x.uid)));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ── Drag and drop reordering ──
  const onDragStart = (uid: number, e: DragEvent) => {
    setDragUid(uid);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(uid));
  };
  const onDragOver = (index: number, e: DragEvent<HTMLDivElement>) => {
    if (dragUid === null) return;
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const after = (e.clientX - r.left > r.width / 2) !== rtl;
    setDropAt(after ? index + 1 : index);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    if (dragUid !== null && dropAt !== null) move(dragUid, dropAt);
    setDragUid(null);
    setDropAt(null);
  };

  // ── Save ──
  const save = async (only: "all" | "selected") => {
    const list = only === "all" ? tiles : tiles.filter((x) => selected.has(x.uid));
    if (!list.length) return;
    setSaving(only);
    try {
      const sources2 = await Promise.all(sources.map((s) => s.file.arrayBuffer()));
      const res = await runWorkerTask(
        () => new Worker(new URL("./organize.worker.ts", import.meta.url), { type: "module" }),
        { sources: sources2, pages: list.map((x) => ({ src: x.src, page: x.page, rotate: x.rotate })) },
        sources2,
        () => {},
        new AbortController().signal,
      );
      const base = getFileNameWithoutExtension(sources[0]?.file.name ?? "document");
      downloadBlob(new Blob([res.bytes as BlobPart], { type: "application/pdf" }), `${base}_${only === "all" ? "organized" : "extract"}.pdf`);
      toast.success(t("organize.saved", { n: list.length }));
    } catch (error) {
      console.error(error);
      toast.error(t("organize.saveFailed"));
    } finally {
      setSaving(null);
    }
  };

  const changed = useMemo(() => {
    if (sources.length !== 1) return tiles.length > 0;
    return tiles.length !== sources[0]!.pages || tiles.some((x, i) => x.src !== 0 || x.page !== i + 1 || x.rotate % 360 !== 0);
  }, [tiles, sources]);

  const iconBtn = "flex h-8 w-8 items-center justify-center rounded-lg text-t-secondary transition hover:bg-bg-secondary hover:text-t-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/60";

  return (
    <ToolLayout toolName={t("tool.organize-pdf.name")} toolDescription={t("tool.organize-pdf.desc")}>
      <div className="space-y-5">
        {sources.length === 0 ? (
          <FileDropzone onFilesSelected={addFiles} accept={{ "application/pdf": [".pdf"] }} multiple formats={["PDF"]} label={opening ? t("p2o.opening") : t("organize.drop")} />
        ) : (
          <>
            <div className="glass sticky top-16 z-20 flex flex-wrap items-center gap-2 p-3">
              <button type="button" className={buttonSecondary} onClick={undo} disabled={!doc.past.length} aria-label={t("meme.undo")} title={`${t("meme.undo")} (Ctrl+Z)`}>
                <Undo2 className="h-4 w-4" aria-hidden="true" />
              </button>
              <button type="button" className={buttonSecondary} onClick={redo} disabled={!doc.future.length} aria-label={t("meme.redo")} title={`${t("meme.redo")} (Ctrl+Y)`}>
                <Redo2 className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="mx-1 h-6 w-px bg-border" aria-hidden="true" />
              {selected.size > 0 ? (
                <>
                  <span className="text-[13px] font-medium tabular-nums text-t-primary">{t("organize.selected", { n: selected.size })}</span>
                  <button type="button" className={buttonSecondary} onClick={() => rotate(selected, -90)} aria-label={t("rotpdf.v2.left")} title={t("rotpdf.v2.left")}>
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" className={buttonSecondary} onClick={() => rotate(selected, 90)} aria-label={t("rotpdf.v2.right")} title={t("rotpdf.v2.right")}>
                    <RotateCw className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button type="button" className={buttonSecondary} onClick={() => duplicate(selected)}>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    {t("meme.ui.duplicate")}
                  </button>
                  <button type="button" className={buttonSecondary} onClick={() => remove(selected)}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    {t("organize.delete")}
                  </button>
                  <button type="button" className={buttonSecondary} onClick={() => save("selected")} disabled={saving !== null}>
                    {saving === "selected" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Scissors className="h-4 w-4" aria-hidden="true" />}
                    {t("organize.extract")}
                  </button>
                  <button type="button" className="text-[13px] text-t-tertiary hover:text-t-primary" onClick={() => setSelected(new Set())}>
                    {t("ui.clear")}
                  </button>
                </>
              ) : (
                <>
                  <button type="button" className={buttonSecondary} onClick={() => fileRef.current?.click()} disabled={opening}>
                    {opening ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FilePlus2 className="h-4 w-4" aria-hidden="true" />}
                    {t("organize.addPdf")}
                  </button>
                  <button type="button" className={buttonSecondary} onClick={() => insertBlank(null)}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {t("organize.blank")}
                  </button>
                  <button type="button" className={buttonSecondary} onClick={reverse} disabled={tiles.length < 2}>
                    {t("organize.reverse")}
                  </button>
                  <button type="button" className={buttonSecondary} onClick={() => setSelected(new Set(tiles.map((x) => x.uid)))} disabled={!tiles.length}>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    {t("rotatepdf.ui.quickAll")}
                  </button>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,.pdf"
                multiple
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  const fs = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  if (fs.length) void addFiles(fs);
                }}
              />
              <div className="ms-auto flex items-center gap-2">
                <button type="button" onClick={reset} className={iconBtn} aria-label={t("rotpdf.changeFile")} title={t("rotpdf.changeFile")}>
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
                <button type="button" className={buttonPrimary} onClick={() => save("all")} disabled={!tiles.length || saving !== null}>
                  {saving === "all" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
                  {t("organize.save", { n: tiles.length })}
                </button>
              </div>
            </div>

            {sources.length > 1 && (
              <ul className="flex flex-wrap gap-2 text-[12.5px] text-t-secondary">
                {sources.map((s, i) => (
                  <li key={i} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-bg-secondary px-3 py-1">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-on-accent">{i + 1}</span>
                    <span className="max-w-[16rem] truncate">{s.file.name}</span>
                    <span className="tabular-nums text-t-tertiary">· {formatFileSize(s.file.size)}</span>
                  </li>
                ))}
              </ul>
            )}

            <div ref={setGridEl} className="glass p-3 sm:p-4" onDragOver={(e) => dragUid !== null && e.preventDefault()} onDrop={onDrop}>
              {tiles.length === 0 ? (
                <p className="py-10 text-center text-[14px] text-t-tertiary">{t("organize.empty")}</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 min-[460px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {tiles.map((x, i) => {
                    const on = selected.has(x.uid);
                    const src = sources[x.src];
                    return (
                      <div
                        key={x.uid}
                        draggable
                        onDragStart={(e) => onDragStart(x.uid, e)}
                        onDragEnd={() => {
                          setDragUid(null);
                          setDropAt(null);
                        }}
                        onDragOver={(e) => onDragOver(i, e)}
                        className={`group relative rounded-xl border-2 bg-surface p-1.5 transition ${on ? "border-accent" : "border-transparent hover:border-border"} ${dragUid === x.uid ? "opacity-40" : ""}`}
                      >
                        {dropAt === i && <span className="pointer-events-none absolute -start-[7px] top-2 bottom-2 w-[3px] rounded-full bg-volt" aria-hidden="true" />}
                        {dropAt === i + 1 && i === tiles.length - 1 && <span className="pointer-events-none absolute -end-[7px] top-2 bottom-2 w-[3px] rounded-full bg-volt" aria-hidden="true" />}
                        <button
                          type="button"
                          aria-pressed={on}
                          aria-label={x.src < 0 ? t("organize.blankLabel", { n: i + 1 }) : t("split.pageLabel", { n: i + 1 })}
                          onClick={(e) => onTileClick(x.uid, e)}
                          onKeyDown={(e) => onTileKey(x.uid, e)}
                          className="block w-full cursor-grab rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/60 active:cursor-grabbing"
                        >
                          {x.src < 0 || !src ? (
                            <div className="flex aspect-square w-full items-center justify-center rounded-lg bg-bg-secondary">
                              <div className="flex aspect-[1/1.414] h-[86%] items-center justify-center rounded-sm border border-border bg-white text-[11px] text-neutral-400 shadow-sm" style={{ transform: `rotate(${x.rotate}deg)` }}>
                                <FileText className="h-5 w-5" aria-hidden="true" />
                              </div>
                            </div>
                          ) : (
                            <PdfPageThumb
                              thumbs={src.thumbs}
                              page={x.page}
                              box={THUMB_BOX}
                              root={gridEl}
                              className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-bg-secondary"
                              imgClassName="max-h-[92%] max-w-[92%] object-contain shadow-sm transition-transform duration-200 motion-reduce:transition-none"
                              imgStyle={{ transform: `rotate(${x.rotate}deg)` }}
                              placeholder={<Loader2 className="h-4 w-4 animate-spin text-t-tertiary" aria-hidden="true" />}
                            />
                          )}
                        </button>
                        {on && (
                          <span className="pointer-events-none absolute start-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-on-accent">
                            <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                        )}
                        {sources.length > 1 && x.src >= 0 && (
                          <span className="pointer-events-none absolute end-3 top-3 flex h-5 min-w-5 items-center justify-center rounded-full border border-border bg-surface px-1 text-[10.5px] font-semibold tabular-nums text-t-primary shadow-sm">
                            {x.src + 1}
                          </span>
                        )}
                        <div className="mt-1 flex items-center justify-between gap-0.5">
                          <span className="ps-1 text-[11.5px] font-medium tabular-nums text-t-secondary">{i + 1}</span>
                          <div className="flex opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                            <button type="button" className={iconBtn} onClick={() => nudge(x.uid, -1)} disabled={i === 0} aria-label={t("organize.moveLeft")} title={t("organize.moveLeft")}>
                              <ArrowLeft className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
                            </button>
                            <button type="button" className={iconBtn} onClick={() => rotate(targetsOr(x.uid), 90)} aria-label={t("rotpdf.v2.pageRight", { n: i + 1 })} title={t("rotpdf.v2.right")}>
                              <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button type="button" className={iconBtn} onClick={() => insertBlank(x.uid)} aria-label={t("organize.blankAfter")} title={t("organize.blankAfter")}>
                              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button type="button" className={iconBtn} onClick={() => remove(targetsOr(x.uid))} aria-label={t("organize.delete")} title={t("organize.delete")}>
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button type="button" className={iconBtn} onClick={() => nudge(x.uid, 1)} disabled={i === tiles.length - 1} aria-label={t("organize.moveRight")} title={t("organize.moveRight")}>
                              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <p className="text-[12.5px] text-t-tertiary">{changed ? t("organize.hint") : t("organize.hintStart")}</p>
          </>
        )}
      </div>
    </ToolLayout>
  );
}
