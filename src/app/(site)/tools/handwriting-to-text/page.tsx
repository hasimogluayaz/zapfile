"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  Camera,
  Copy,
  Download,
  ImagePlus,
  Lightbulb,
  RotateCcw,
} from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProgressBar from "@/components/ProgressBar";
import {
  Segmented,
  buttonPrimary,
  buttonSecondary,
  sectionTitle,
} from "@/components/ui/controls";
import { decodeImage } from "@/lib/image-editor-kit";
import { downloadBlob, getFileNameWithoutExtension } from "@/lib/utils";
import { editablePdfBytes, pdfInputErrorKey } from "@/lib/pdf-input";
import { openPdf } from "@/lib/pdfjs";
import { useI18n } from "@/lib/i18n";
import { persistPendingFiles, restorePersistedFiles } from "@/lib/file-handoff";
import {
  HandwritingEngine,
  OcrError,
  type OcrPageResult,
  type OcrProgress,
} from "@/lib/handwriting/client";
import { OCR_DOWNLOAD_BYTES } from "@/lib/handwriting/models";
import {
  assembleText,
  groupLines,
  type Layout,
  type TextBox,
} from "@/lib/handwriting/pipeline";

/** PDFs: pages read at most, and the long side they're rendered at. */
const MAX_PDF_PAGES = 20;
const PDF_LONG_SIDE = 2400;
/** Mean character confidence below which a line is marked as unsure. */
const UNSURE = 0.8;
/** Set while reloading once to get a cross-origin isolated page (threads). */
const RELOAD_FLAG = "zapfile:coi-reload-hw";

const ACCEPT = {
  "image/*": [".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"],
  "application/pdf": [".pdf"],
};

interface PageItem {
  id: number;
  label: string;
  preview: string;
  bitmap: ImageBitmap | null;
  status: "waiting" | "reading" | "done" | "error";
  result?: OcrPageResult;
}

const isPdf = (f: File) =>
  f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const isTiff = (f: File) => f.type === "image/tiff" || /\.tiff?$/i.test(f.name);

function canvasBlob(c: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    c.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.85,
    ),
  );
}

/** Pages of a TIFF (Chrome and Firefox can't decode TIFF themselves). */
async function tiffPages(
  file: File,
): Promise<{ bitmap: ImageBitmap; preview: Blob }[]> {
  const UTIF = await import("utif2");
  const buf = await file.arrayBuffer();
  const ifds = UTIF.decode(buf).filter((ifd) => ifd.t256 && ifd.t257);
  const out: { bitmap: ImageBitmap; preview: Blob }[] = [];
  for (const ifd of ifds.slice(0, MAX_PDF_PAGES)) {
    UTIF.decodeImage(buf, ifd);
    const w = ifd.width as number,
      h = ifd.height as number;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const rgba = new Uint8ClampedArray(w * h * 4);
    rgba.set(UTIF.toRGBA8(ifd));
    c.getContext("2d")!.putImageData(new ImageData(rgba, w, h), 0, 0);
    out.push({
      bitmap: await createImageBitmap(c),
      preview: await canvasBlob(c),
    });
    c.width = c.height = 0;
  }
  if (!out.length) throw new Error("No TIFF pages");
  return out;
}

/** Corners of a rotated text box, for the overlay. */
function corners(b: TextBox): string {
  const hw = b.w / 2,
    hh = b.h / 2,
    vx = -b.uy,
    vy = b.ux;
  return [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ]
    .map(
      ([u, v]) =>
        `${(b.cx + b.ux * u + vx * v).toFixed(1)},${(b.cy + b.uy * u + vy * v).toFixed(1)}`,
    )
    .join(" ");
}

const mb = (bytes: number, locale: string) =>
  (bytes / 1_000_000).toLocaleString(locale, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });

export default function HandwritingToTextPage() {
  const { t, locale } = useI18n();
  const [pages, setPages] = useState<PageItem[]>([]);
  const [selected, setSelected] = useState(0);
  const [opening, setOpening] = useState(false);
  const [status, setStatus] = useState<{ value: number; label: string } | null>(
    null,
  );
  const [layout, setLayout] = useState<Layout>("lines");
  const [text, setText] = useState("");
  const [baseName, setBaseName] = useState("text");
  const [coarse, setCoarse] = useState(false);
  const [ready, setReady] = useState(false);
  const engineRef = useRef<HandwritingEngine | null>(null);
  const runningRef = useRef(false);
  const pagesRef = useRef<PageItem[]>([]);
  const nextId = useRef(1);
  const cameraRef = useRef<HTMLInputElement>(null);
  const moreRef = useRef<HTMLInputElement>(null);
  pagesRef.current = pages;

  // Threads need a cross-origin isolated page, which only a full load gives (not client-side
  // navigation): reload once, keeping files handed over from the home page.
  useEffect(() => {
    let flagged = false;
    try {
      flagged = !!sessionStorage.getItem(RELOAD_FLAG);
      if (window.crossOriginIsolated) sessionStorage.removeItem(RELOAD_FLAG);
      else if (!flagged) {
        sessionStorage.setItem(RELOAD_FLAG, "1");
        void persistPendingFiles().then(() => location.reload());
        return;
      }
    } catch {
      // no sessionStorage: run without threads
    }
    void restorePersistedFiles().then(() => setReady(true));
  }, []);

  useEffect(() => {
    setCoarse(window.matchMedia?.("(pointer: coarse)").matches ?? false);
    return () => {
      engineRef.current?.dispose();
      for (const p of pagesRef.current) {
        URL.revokeObjectURL(p.preview);
        p.bitmap?.close();
      }
    };
  }, []);

  const engine = useCallback(() => {
    if (!engineRef.current) engineRef.current = new HandwritingEngine();
    return engineRef.current;
  }, []);

  const update = (id: number, patch: Partial<PageItem>) =>
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  /** Read waiting pages one after another. */
  const pump = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    const eng = engine();
    const onProgress = (index: number, total: number) => (e: OcrProgress) => {
      if (e.stage === "download" && e.total) {
        const share = (e.loaded ?? 0) / e.total;
        setStatus({
          value: Math.round(share * 100),
          label: e.fromCache
            ? t("hw.starting")
            : t("hw.downloading", {
                loaded: mb(e.loaded ?? 0, locale),
                total: mb(e.total, locale),
              }),
        });
      } else if (e.stage === "init") {
        setStatus({ value: 100, label: t("hw.starting") });
      } else {
        const within =
          e.stage === "read" && e.total
            ? 0.2 + 0.8 * ((e.loaded ?? 0) / e.total)
            : 0.1;
        setStatus({
          value: Math.round(((index + within) / total) * 100),
          label:
            total > 1
              ? t("hw.readingPage", { n: index + 1, total })
              : t("hw.reading"),
        });
      }
    };
    try {
      for (;;) {
        const all = pagesRef.current;
        const page = all.find((p) => p.status === "waiting");
        if (!page) break;
        const index = all.indexOf(page);
        update(page.id, { status: "reading" });
        eng.onProgress = onProgress(index, all.length);
        try {
          const result = await eng.recognize(page.bitmap!);
          page.bitmap?.close();
          update(page.id, { status: "done", result, bitmap: null });
        } catch (error) {
          console.error(error);
          update(page.id, { status: "error" });
          const code = error instanceof OcrError ? error.code : "inference";
          toast.error(
            t(
              code === "download"
                ? "hw.downloadFailed"
                : code === "memory"
                  ? "hw.memory"
                  : "hw.failed",
            ),
          );
          if (code === "download" || code === "runtime") {
            // Nothing else can run: put the remaining pages back for a retry.
            setPages((prev) =>
              prev.map((p) =>
                p.status === "waiting" ? { ...p, status: "error" } : p,
              ),
            );
            break;
          }
        }
      }
    } finally {
      runningRef.current = false;
      setStatus(null);
      if (pagesRef.current.some((p) => p.status === "waiting")) void pump();
    }
  }, [engine, locale, t]);

  const addFiles = useCallback(
    async (files: File[]) => {
      if (!files.length) return;
      setOpening(true);
      engine()
        .load()
        .catch(() => undefined); // start the model download right away
      const added: PageItem[] = [];
      const make = (
        label: string,
        bitmap: ImageBitmap,
        preview: Blob,
      ): PageItem => ({
        id: nextId.current++,
        label,
        bitmap,
        preview: URL.createObjectURL(preview),
        status: "waiting",
      });
      for (const f of files) {
        try {
          if (isPdf(f)) {
            const pdf = await openPdf(await editablePdfBytes(f));
            const count = Math.min(pdf.numPages, MAX_PDF_PAGES);
            if (pdf.numPages > MAX_PDF_PAGES)
              toast(t("hw.tooManyPages", { n: MAX_PDF_PAGES }));
            for (let n = 1; n <= count; n++) {
              const page = await pdf.getPage(n);
              const vp1 = page.getViewport({ scale: 1 });
              const vp = page.getViewport({
                scale: PDF_LONG_SIDE / Math.max(vp1.width, vp1.height),
              });
              const c = document.createElement("canvas");
              c.width = Math.round(vp.width);
              c.height = Math.round(vp.height);
              const ctx = c.getContext("2d")!;
              ctx.fillStyle = "#fff";
              ctx.fillRect(0, 0, c.width, c.height);
              await page.render({ canvas: c, canvasContext: ctx, viewport: vp })
                .promise;
              page.cleanup();
              added.push(
                make(
                  `${f.name} · ${t("hw.page", { n })}`,
                  await createImageBitmap(c),
                  await canvasBlob(c),
                ),
              );
              c.width = c.height = 0;
            }
            await pdf.destroy();
          } else if (isTiff(f)) {
            let tiff: { bitmap: ImageBitmap; preview: Blob }[];
            try {
              tiff = await tiffPages(f);
            } catch {
              const d = await decodeImage(f); // Safari decodes TIFF itself
              const c = document.createElement("canvas");
              c.width = d.width;
              c.height = d.height;
              c.getContext("2d")!.drawImage(d.bitmap, 0, 0);
              tiff = [{ bitmap: d.bitmap, preview: await canvasBlob(c) }];
              c.width = c.height = 0;
            }
            tiff.forEach((p, i) =>
              added.push(
                make(
                  tiff.length > 1
                    ? `${f.name} · ${t("hw.page", { n: i + 1 })}`
                    : f.name,
                  p.bitmap,
                  p.preview,
                ),
              ),
            );
          } else {
            const d = await decodeImage(f);
            added.push(make(f.name, d.bitmap, f));
          }
        } catch (error) {
          toast.error(
            isPdf(f)
              ? t(pdfInputErrorKey(error))
              : `${f.name}: ${t("dropper.loadFail")}`,
          );
        }
      }
      setOpening(false);
      if (!added.length) return;
      if (!pagesRef.current.length)
        setBaseName(getFileNameWithoutExtension(files[0].name) || "text");
      const all = [...pagesRef.current, ...added];
      pagesRef.current = all;
      setPages(all);
      setSelected(all.length - added.length);
      void pump();
    },
    [engine, pump, t],
  );

  const retry = () => {
    setPages((prev) =>
      prev.map((p) =>
        p.status === "error" && p.bitmap ? { ...p, status: "waiting" } : p,
      ),
    );
    setTimeout(() => void pump(), 0);
  };

  const reset = () => {
    for (const p of pages) {
      URL.revokeObjectURL(p.preview);
      p.bitmap?.close();
    }
    setPages([]);
    setText("");
    setSelected(0);
  };

  // Text of every finished page, in order; regenerated when a page finishes or the layout changes.
  const done = pages.filter((p) => p.status === "done" && p.result);
  const doneKey = done.map((p) => p.id).join(",");
  const generated = useMemo(
    () =>
      done
        .map((p) => assembleText(groupLines(p.result!.lines), layout))
        .filter(Boolean)
        .join("\n\n"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doneKey, layout],
  );
  useEffect(() => setText(generated), [generated]);

  const busy =
    opening ||
    pages.some((p) => p.status === "waiting" || p.status === "reading");
  const current = pages[Math.min(selected, pages.length - 1)];
  const lineCount = done.reduce(
    (s, p) => s + p.result!.lines.filter((l) => l.text).length,
    0,
  );
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const unsure =
    current?.result?.lines.filter((l) => l.text && l.confidence < UNSURE)
      .length ?? 0;
  const failed = pages.some((p) => p.status === "error" && p.bitmap);
  const nothingFound = !busy && done.length > 0 && !generated;

  const pickInput = (
    ref: React.RefObject<HTMLInputElement>,
    onFiles: (f: File[]) => void,
  ) => (
    <input
      ref={ref}
      type="file"
      className="hidden"
      accept={
        ref === cameraRef
          ? "image/*"
          : ["image/*", "application/pdf", ...ACCEPT["image/*"], ".pdf"].join(
              ",",
            )
      }
      capture={ref === cameraRef ? "environment" : undefined}
      multiple={ref !== cameraRef}
      onChange={(e) => {
        const files = Array.from(e.target.files ?? []);
        e.target.value = "";
        onFiles(files);
      }}
    />
  );

  const cameraButton = coarse && (
    <button
      type="button"
      className={buttonSecondary}
      onClick={() => cameraRef.current?.click()}
      disabled={opening}
    >
      <Camera className="h-4 w-4" aria-hidden="true" />
      {t("hw.camera")}
    </button>
  );

  return (
    <ToolLayout
      toolName={t("tool.handwriting-to-text.name")}
      toolDescription={t("tool.handwriting-to-text.desc")}
    >
      {pickInput(cameraRef, addFiles)}
      {pickInput(moreRef, addFiles)}
      {!pages.length ? (
        <div className="space-y-4">
          {!ready ? (
            <div className="dropzone min-h-[14rem]" aria-busy="true" />
          ) : (
            <FileDropzone
              onFilesSelected={addFiles}
              accept={ACCEPT}
              multiple
              formats={["JPG", "PNG", "WEBP", "PDF"]}
              label={opening ? t("p2o.opening") : t("hw.drop")}
            />
          )}
          {cameraButton && (
            <div className="flex justify-center">{cameraButton}</div>
          )}
          <div className="glass space-y-2 p-5">
            <p className={`${sectionTitle} flex items-center gap-1.5`}>
              <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
              {t("hw.tipsTitle")}
            </p>
            <ul className="list-disc space-y-1 ps-5 text-[13.5px] text-t-secondary">
              <li>{t("hw.tip1")}</li>
              <li>{t("hw.tip2")}</li>
              <li>{t("hw.tip3")}</li>
            </ul>
            <p className="pt-1 text-[12.5px] text-t-tertiary">
              {t("hw.languages")}{" "}
              {t("hw.firstUse", {
                size: `${mb(OCR_DOWNLOAD_BYTES, locale)} MB`,
              })}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Image with the lines found */}
            <div className="glass space-y-3 p-4">
              {pages.length > 1 && (
                <div
                  className="flex gap-2 overflow-x-auto pb-1"
                  role="tablist"
                  aria-label={t("hw.pages")}
                >
                  {pages.map((p, i) => (
                    <button
                      key={p.id}
                      type="button"
                      role="tab"
                      aria-selected={i === selected}
                      onClick={() => setSelected(i)}
                      title={p.label}
                      className={`relative h-16 w-12 shrink-0 overflow-hidden rounded-lg border-2 bg-bg-secondary ${i === selected ? "border-volt" : "border-transparent"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.preview}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute bottom-0 end-0 rounded-ss-md bg-bg/90 px-1 text-[11px] font-semibold tabular-nums text-t-primary">
                        {i + 1}
                      </span>
                      {(p.status === "waiting" || p.status === "reading") && (
                        <span className="absolute inset-0 animate-pulse bg-bg/50" />
                      )}
                    </button>
                  ))}
                </div>
              )}
              {current && (
                <div className="relative overflow-hidden rounded-xl bg-bg-secondary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={current.preview}
                    alt={current.label}
                    className="block max-h-[70vh] w-full object-contain"
                  />
                  {current.result && (
                    <svg
                      className="pointer-events-none absolute inset-0 h-full w-full"
                      viewBox={`0 0 ${current.result.width} ${current.result.height}`}
                      preserveAspectRatio="xMidYMid meet"
                      aria-hidden="true"
                    >
                      {current.result.lines
                        .filter((l) => l.text)
                        .map((l, i) => {
                          const low = l.confidence < UNSURE;
                          return (
                            <polygon
                              key={i}
                              points={corners(l.box)}
                              fill={
                                low
                                  ? "rgba(245,158,11,0.18)"
                                  : "rgba(255,214,10,0.10)"
                              }
                              stroke={low ? "#F59E0B" : "#FFD60A"}
                              strokeWidth={Math.max(
                                2,
                                current.result!.width / 600,
                              )}
                              vectorEffect="non-scaling-stroke"
                            >
                              <title>{l.text}</title>
                            </polygon>
                          );
                        })}
                    </svg>
                  )}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-t-tertiary">
                <span className="min-w-0 flex-1 truncate">
                  {current?.label}
                </span>
                {unsure > 0 && (
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-sm border-2 border-amber-500 bg-amber-500/20"
                      aria-hidden="true"
                    />
                    {t("hw.unsure", { n: unsure })}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={buttonSecondary}
                  onClick={() => moreRef.current?.click()}
                  disabled={opening}
                >
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  {t("hw.addMore")}
                </button>
                {cameraButton}
                <button
                  type="button"
                  className={buttonSecondary}
                  onClick={reset}
                  disabled={busy}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  {t("hw.startOver")}
                </button>
              </div>
            </div>

            {/* Recognized text */}
            <div className="glass flex flex-col gap-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className={sectionTitle}>{t("hw.text")}</p>
                <Segmented<Layout>
                  label={t("hw.layout")}
                  size="sm"
                  value={layout}
                  onChange={setLayout}
                  options={[
                    { value: "lines", label: t("hw.layoutLines") },
                    { value: "paragraphs", label: t("hw.layoutParagraphs") },
                  ]}
                />
              </div>
              {status && (
                <ProgressBar progress={status.value} label={status.label} />
              )}
              {failed && !busy && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/5 p-3 text-[13.5px] text-t-primary">
                  <span className="min-w-0 flex-1">{t("hw.failed")}</span>
                  <button
                    type="button"
                    className={buttonSecondary}
                    onClick={retry}
                  >
                    {t("hw.retry")}
                  </button>
                </div>
              )}
              {nothingFound && (
                <p className="rounded-xl bg-bg-secondary p-3 text-[13.5px] text-t-secondary">
                  {t("hw.noText")}
                </p>
              )}
              <textarea
                dir="auto"
                value={text}
                onChange={(e) => setText(e.target.value)}
                spellCheck
                lang={locale}
                aria-label={t("hw.text")}
                placeholder={busy ? t("hw.reading") : ""}
                className="min-h-[18rem] w-full flex-1 resize-y rounded-xl border border-border bg-bg p-3 text-[15px] leading-6 text-t-primary focus:border-t-primary focus:outline-none lg:min-h-[24rem]"
              />
              <p className="text-[12.5px] text-t-tertiary">
                {done.length > 0 &&
                  t("hw.stats", {
                    lines: lineCount.toLocaleString(locale),
                    words: words.toLocaleString(locale),
                  })}{" "}
                {t("hw.editHint")}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={buttonPrimary}
                  disabled={!text}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(text);
                      toast.success(t("ui.copied"));
                    } catch {
                      toast.error(t("ui.copyFailed"));
                    }
                  }}
                >
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  {t("ui.copy")}
                </button>
                <button
                  type="button"
                  className={buttonSecondary}
                  disabled={!text}
                  onClick={() =>
                    downloadBlob(
                      new Blob([text], { type: "text/plain;charset=utf-8" }),
                      `${baseName}.txt`,
                    )
                  }
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {t("hw.downloadTxt")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
