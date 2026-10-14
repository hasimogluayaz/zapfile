"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import toast from "react-hot-toast";
import { AlertCircle, GripVertical, Loader2, RotateCw, Trash2, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import { Segmented, Slider, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { AbortError, makeThumbnail, processImage, type OutputFormat, type Transform } from "@/lib/image-engine";
import { formatFileSize } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import {
  layoutPage,
  jpegOrientation,
  sniffKind,
  type Box,
  type FitMode,
  type Orientation,
  type PageSize,
} from "./layout-math";
import type { BuildPage, BuildRequest, BuildResponse } from "./build.worker";

type Rotation = 0 | 90 | 180 | 270;
type Quality = "original" | "optimized";

interface Item {
  id: string;
  file: File;
  status: "loading" | "ready" | "error";
  error?: "heic" | "decode";
  thumb?: string;
  /** Pixel size after EXIF orientation (before the user's rotation). */
  width: number;
  height: number;
  rotation: Rotation;
  kind: "jpeg" | "png" | "other";
  exif: number;
}

interface Settings {
  pageSize: PageSize;
  orientation: Orientation;
  fit: FitMode;
  margin: number;
  background: string;
  quality: Quality;
}

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i;
const HEIC = /\.(heic|heif)$/i;

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function hexToUnit(hex: string): [number, number, number] {
  const n = hex.replace("#", "").padEnd(6, "0").slice(0, 6);
  return [0, 2, 4].map((i) => Number.parseInt(n.slice(i, i + 2), 16) / 255) as [number, number, number];
}

function displayDims(item: Item): [number, number] {
  return item.rotation % 180 === 0 ? [item.width, item.height] : [item.height, item.width];
}

function isRawEmbeddable(item: Item) {
  return item.exif <= 1 && item.rotation === 0 && (item.kind === "jpeg" || item.kind === "png");
}

/** Bytes to embed for one image: the untouched file when possible, else an engine re-encode. */
async function prepareImage(
  item: Item,
  draw: Box,
  settings: Settings,
  signal: AbortSignal,
): Promise<{ bytes: ArrayBuffer; kind: "jpeg" | "png" }> {
  const raw = isRawEmbeddable(item);
  if (settings.quality === "original" && raw) {
    return { bytes: await item.file.arrayBuffer(), kind: item.kind as "jpeg" | "png" };
  }
  const transform: Transform = item.rotation ? { rotate: item.rotation } : {};
  let format: OutputFormat;
  let quality: number;
  if (settings.quality === "optimized") {
    // 200 DPI at the size it's printed on the page is plenty for screens and print.
    const [w, h] = displayDims(item);
    const s = Math.max(((draw.width / 72) * 200) / w, ((draw.height / 72) * 200) / h);
    if (s < 1) transform.resize = { width: Math.ceil(w * s), height: Math.ceil(h * s), fit: "contain" };
    transform.background = settings.background;
    format = "image/jpeg";
    quality = 0.8;
  } else if (item.kind === "png" || /image\/(gif|bmp)/.test(item.file.type)) {
    format = "image/png"; // keep lossless sources lossless
    quality = 1;
  } else {
    // Rotated JPEGs and lossy formats (WebP, AVIF, HEIC): high-quality JPEG over the page colour.
    transform.background = settings.background;
    format = "image/jpeg";
    quality = 0.92;
  }
  const res = await processImage({ input: item.file, transform, encode: { format, quality } }, signal);
  if (raw && res.blob.size >= item.file.size) {
    return { bytes: await item.file.arrayBuffer(), kind: item.kind as "jpeg" | "png" };
  }
  return { bytes: await res.blob.arrayBuffer(), kind: format === "image/png" ? "png" : "jpeg" };
}

/** Live preview of one page: page colour, margins, fit and rotation. */
function PagePreview({ item, settings, label }: { item: Item; settings: Settings; label: string }) {
  const [w, h] = displayDims(item);
  const layout = layoutPage(w, h, settings);
  const { page, box, draw } = layout;
  const pct = (v: number, total: number) => `${(v / total) * 100}%`;
  // Image element coordinates inside the clip box (top-left origin).
  const cx = draw.x - box.x + draw.width / 2;
  const cy = box.y + box.height - (draw.y + draw.height / 2);
  const odd = item.rotation % 180 !== 0;
  const ew = odd ? draw.height : draw.width;
  const eh = odd ? draw.width : draw.height;
  return (
    <div className="flex aspect-square items-center justify-center">
      <div
        className="relative max-h-full max-w-full overflow-hidden rounded-[3px] shadow-sm ring-1 ring-border"
        style={{
          aspectRatio: `${page.width} / ${page.height}`,
          width: page.width >= page.height ? "100%" : "auto",
          height: page.width >= page.height ? "auto" : "100%",
          background: settings.background,
        }}
      >
        <div
          className="absolute"
          style={{
            left: pct(box.x, page.width),
            top: pct(page.height - box.y - box.height, page.height),
            width: pct(box.width, page.width),
            height: pct(box.height, page.height),
            overflow: layout.clip ? "hidden" : "visible",
          }}
        >
          {item.thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumb}
              alt={label}
              draggable={false}
              className="absolute max-w-none select-none"
              style={{
                left: pct(cx - ew / 2, box.width),
                top: pct(cy - eh / 2, box.height),
                width: pct(ew, box.width),
                height: pct(eh, box.height),
                transform: item.rotation ? `rotate(${item.rotation}deg)` : undefined,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function ImageToPdfPage() {
  const { t } = useI18n();

  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<Settings>({
    pageSize: "a4",
    orientation: "auto",
    fit: "contain",
    margin: 24,
    background: "#ffffff",
    quality: "original",
  });
  const [outputName, setOutputName] = useState("images.pdf");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<{ key: string; blob: Blob; pages: number } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;
  const runRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      runRef.current?.abort();
      itemsRef.current.forEach((i) => i.thumb && URL.revokeObjectURL(i.thumb));
    },
    [],
  );

  const update = (patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch }));
  const patchItem = (id: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));

  const ready = useMemo(() => items.filter((i) => i.status === "ready"), [items]);
  const loading = items.some((i) => i.status === "loading");
  const failed = items.filter((i) => i.status === "error").length;
  const resultKey = JSON.stringify([settings, ready.map((i) => [i.id, i.rotation])]);
  const visibleResult = result && result.key === resultKey ? result : null;

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      const accepted = files.filter((f) => f.type.startsWith("image/") || IMAGE_EXT.test(f.name));
      if (accepted.length < files.length) toast.error(t("dropzone.skipped", { count: files.length - accepted.length }));
      if (accepted.length === 0) return;
      const fresh: Item[] = accepted.map((file) => ({
        id: makeId(),
        file,
        status: "loading",
        width: 0,
        height: 0,
        rotation: 0,
        kind: "other",
        exif: 1,
      }));
      if (itemsRef.current.length === 0) setOutputName(`${accepted[0].name.replace(/\.[^.]+$/, "")}.pdf`);
      setItems((prev) => [...prev, ...fresh]);

      // Each image loads on its own: one bad file never sinks the batch.
      fresh.forEach(async (item) => {
        try {
          const head = new Uint8Array(await item.file.slice(0, 256 * 1024).arrayBuffer());
          const kind = sniffKind(head);
          const exif = kind === "jpeg" ? jpegOrientation(head) : 1;
          const thumb = await makeThumbnail(item.file, 480);
          if (!itemsRef.current.some((i) => i.id === item.id)) return; // removed meanwhile
          patchItem(item.id, {
            status: "ready",
            thumb: URL.createObjectURL(thumb.blob),
            width: thumb.width,
            height: thumb.height,
            kind,
            exif,
          });
        } catch (error) {
          console.warn(error);
          const heic = HEIC.test(item.file.name) || /hei[cf]/i.test(item.file.type);
          patchItem(item.id, { status: "error", error: heic ? "heic" : "decode" });
        }
      });
    },
    [t],
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const target = prev.find((i) => i.id === id);
      if (target?.thumb) URL.revokeObjectURL(target.thumb);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const rotateItem = useCallback((id: string) => {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, rotation: (((i.rotation + 90) % 360) as Rotation) } : i)));
  }, []);

  const moveTo = useCallback((id: string, targetIndex: number) => {
    setItems((prev) => {
      const from = prev.findIndex((i) => i.id === id);
      const to = Math.max(0, Math.min(prev.length - 1, targetIndex));
      if (from < 0 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    runRef.current?.abort();
    itemsRef.current.forEach((i) => i.thumb && URL.revokeObjectURL(i.thumb));
    setItems([]);
    setResult(null);
    setProcessing(false);
  }, []);

  // ── Reorder: pointer (mouse, touch, pen) and keyboard ──────────────────

  const onHandlePointerDown = (event: PointerEvent<HTMLButtonElement>, id: string) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragId(id);
  };
  const onHandlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragId) return;
    const over = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-tile-index]");
    if (!over) return;
    const index = Number(over.dataset.tileIndex);
    if (Number.isFinite(index)) moveTo(dragId, index);
  };
  const onHandlePointerUp = () => {
    if (!dragId) return;
    const index = itemsRef.current.findIndex((i) => i.id === dragId);
    setAnnouncement(t("img2pdf.v2.movedTo", { n: index + 1 }));
    setDragId(null);
  };
  const onHandleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, id: string, index: number) => {
    const delta =
      event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : 0;
    const target = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : index + delta;
    if (!delta && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const clamped = Math.max(0, Math.min(items.length - 1, target));
    if (clamped === index) return;
    moveTo(id, clamped);
    setAnnouncement(t("img2pdf.v2.movedTo", { n: clamped + 1 }));
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>(`[data-handle-id="${id}"]`)?.focus());
  };

  // ── Build ─────────────────────────────────────────────────────────────

  const handleCreate = useCallback(async () => {
    if (ready.length === 0) return;
    runRef.current?.abort();
    const run = new AbortController();
    runRef.current = run;
    const { signal } = run;
    const key = resultKey;
    const pages = ready;
    const s = settings;
    const total = pages.length;
    setProcessing(true);
    setResult(null);
    setProgress({ done: 0, total });

    const worker = new Worker(new URL("./build.worker.ts", import.meta.url), { type: "module" });
    let added = 0;
    const report = () => setProgress({ done: added, total });
    const finished = new Promise<ArrayBuffer>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<BuildResponse>) => {
        const msg = event.data;
        if (msg.type === "added") {
          added++;
          report();
        } else if (msg.type === "done") resolve(msg.bytes);
        else reject(new Error(msg.message));
      };
      worker.onerror = (event) => {
        event.preventDefault();
        reject(new Error(event.message || "Worker failed"));
      };
      signal.addEventListener("abort", () => reject(new AbortError()), { once: true });
    });
    finished.catch(() => undefined); // awaited below
    const send = (msg: BuildRequest, transfer: Transferable[] = []) => worker.postMessage(msg, transfer);

    try {
      const title = outputName.replace(/\.pdf$/i, "");
      send({ type: "start", title });
      const background = hexToUnit(s.background);
      for (let i = 0; i < pages.length; i++) {
        if (signal.aborted) throw new AbortError();
        const item = pages[i];
        const [w, h] = displayDims(item);
        const layout = layoutPage(w, h, s);
        const image = await prepareImage(item, layout.draw, s, signal);
        const page: BuildPage = {
          bytes: image.bytes,
          kind: image.kind,
          page: layout.page,
          box: layout.box,
          draw: layout.draw,
          clip: layout.clip,
          background,
        };
        send({ type: "page", index: i, page }, [image.bytes]);
      }
      send({ type: "finish" });
      const bytes = await finished;
      if (signal.aborted) return;
      setResult({ key, blob: new Blob([bytes], { type: "application/pdf" }), pages: total });
      toast.success(t("img2pdf.ui.success", { count: total }));
    } catch (error) {
      if (error instanceof AbortError || signal.aborted) return;
      console.error(error);
      toast.error(t("img2pdf.ui.fail"));
    } finally {
      worker.terminate();
      if (runRef.current === run) {
        runRef.current = null;
        setProcessing(false);
      }
    }
  }, [outputName, ready, resultKey, settings, t]);

  const cancel = useCallback(() => {
    runRef.current?.abort();
    runRef.current = null;
    setProcessing(false);
  }, []);

  const iconButton =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-t-secondary transition hover:bg-bg-secondary hover:text-t-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt disabled:opacity-40";
  const marginMm = Math.round((settings.margin * 25.4) / 72);
  const filename = outputName.trim()
    ? outputName.trim().toLowerCase().endsWith(".pdf")
      ? outputName.trim()
      : `${outputName.trim()}.pdf`
    : "images.pdf";

  return (
    <ToolLayout
      toolName="Image to PDF"
      toolDescription="Convert JPG, PNG, or WebP images to a PDF with layout, margin, and ordering controls."
    >
      <div className="space-y-5">
        <FileDropzone
          onFilesSelected={handleFilesSelected}
          accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".avif", ".heic", ".heif"] }}
          formats={["JPG", "PNG", "WEBP", "HEIC", "GIF", "BMP", "AVIF"]}
          multiple
          label={t("img2pdf.ui.dropLabel")}
        />

        {items.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.25fr_1fr]">
              <div className="glass rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[14px] font-semibold text-t-primary">
                    {t("img2pdf.ui.selectedCount", { n: items.length })}
                  </p>
                  <button type="button" onClick={clearAll} className={buttonSecondary}>
                    {t("img2pdf.ui.clearAll")}
                  </button>
                </div>
                <p className="text-[12.5px] text-t-tertiary">{t("img2pdf.v2.reorderHint")}</p>
                {failed > 0 && (
                  <p className="flex items-start gap-2 text-[13px] text-t-secondary" role="status">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
                    {t("img2pdf.v2.skippedErrors", { count: failed })}
                  </p>
                )}
                <span className="sr-only" aria-live="polite">
                  {announcement}
                </span>

                <ul className="grid max-h-[40rem] grid-cols-2 gap-3 overflow-y-auto pe-1 sm:grid-cols-3">
                  {items.map((item, index) => {
                    const pageNo = ready.indexOf(item) + 1;
                    return (
                      <li
                        key={item.id}
                        data-tile-index={index}
                        className={`rounded-xl border bg-surface p-2 transition-shadow ${
                          dragId === item.id ? "border-accent shadow-lg" : "border-border"
                        }`}
                      >
                        <div className="relative rounded-lg bg-bg-secondary p-2">
                          {item.status === "ready" ? (
                            <PagePreview
                              item={item}
                              settings={settings}
                              label={t("pdfimg.page", { num: pageNo })}
                            />
                          ) : (
                            <div className="flex aspect-square flex-col items-center justify-center gap-2 p-2 text-center">
                              {item.status === "loading" ? (
                                <Loader2 className="h-5 w-5 animate-spin text-t-tertiary" aria-label={t("ui.loading")} />
                              ) : (
                                <>
                                  <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
                                  <p className="text-[12px] leading-snug text-t-secondary">
                                    {item.error === "heic" ? t("img2pdf.v2.heicUnsupported") : t("img2pdf.v2.decodeFailed")}
                                  </p>
                                </>
                              )}
                            </div>
                          )}
                          {item.status === "ready" && (
                            <span className="absolute start-1 top-1 rounded-md bg-surface/90 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-t-primary">
                              {pageNo}
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 truncate px-0.5 text-[12px] text-t-secondary" title={item.file.name}>
                          {item.file.name}
                        </p>
                        <p className="truncate px-0.5 text-[11px] text-t-tertiary tabular-nums">
                          {item.status === "ready" && <>{displayDims(item).join("×")} · </>}
                          {formatFileSize(item.file.size)}
                        </p>
                        <div className="mt-1 flex items-center justify-between">
                          <button
                            type="button"
                            data-handle-id={item.id}
                            aria-label={t("img2pdf.v2.dragHandle", { n: index + 1 })}
                            title={t("img2pdf.v2.dragHandle", { n: index + 1 })}
                            onPointerDown={(e) => onHandlePointerDown(e, item.id)}
                            onPointerMove={onHandlePointerMove}
                            onPointerUp={onHandlePointerUp}
                            onPointerCancel={onHandlePointerUp}
                            onKeyDown={(e) => onHandleKeyDown(e, item.id, index)}
                            disabled={processing}
                            className={`${iconButton} cursor-grab active:cursor-grabbing`}
                            style={{ touchAction: "none" }}
                          >
                            <GripVertical className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => rotateItem(item.id)}
                              disabled={item.status !== "ready" || processing}
                              aria-label={t("img2pdf.v2.rotate")}
                              title={t("img2pdf.v2.rotate")}
                              className={iconButton}
                            >
                              <RotateCw className="h-4 w-4" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              disabled={processing}
                              aria-label={t("ui.remove")}
                              title={t("ui.remove")}
                              className={`${iconButton} hover:text-red-600 dark:hover:text-red-400`}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="glass rounded-2xl p-5 space-y-5">
                <div className="space-y-2">
                  <p className={sectionTitle}>{t("img2pdf.ui.pageSize")}</p>
                  <Segmented<PageSize>
                    label={t("img2pdf.ui.pageSize")}
                    value={settings.pageSize}
                    onChange={(v) => update({ pageSize: v })}
                    size="sm"
                    options={[
                      { value: "a4", label: "A4" },
                      { value: "letter", label: t("img2pdf.ui.letter") },
                      { value: "square", label: t("img2pdf.ui.square") },
                      { value: "fit", label: t("img2pdf.fitToImage") },
                    ]}
                  />
                  {settings.pageSize === "fit" && (
                    <p className="text-[12.5px] text-t-tertiary">{t("img2pdf.v2.fitHint")}</p>
                  )}
                </div>

                {settings.pageSize !== "fit" && (
                  <>
                    <div className="space-y-2">
                      <p className={sectionTitle}>{t("img2pdf.ui.orientation")}</p>
                      <Segmented<Orientation>
                        label={t("img2pdf.ui.orientation")}
                        value={settings.orientation}
                        onChange={(v) => update({ orientation: v })}
                        size="sm"
                        options={[
                          { value: "auto", label: t("img2pdf.ui.auto") },
                          { value: "portrait", label: t("img2pdf.ui.portrait") },
                          { value: "landscape", label: t("img2pdf.ui.landscape") },
                        ]}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className={sectionTitle}>{t("img2pdf.ui.fitMode")}</p>
                      <Segmented<FitMode>
                        label={t("img2pdf.ui.fitMode")}
                        value={settings.fit}
                        onChange={(v) => update({ fit: v })}
                        size="sm"
                        options={[
                          { value: "contain", label: t("img2pdf.ui.contain") },
                          { value: "cover", label: t("img2pdf.ui.cover") },
                          { value: "stretch", label: t("img2pdf.ui.stretch") },
                        ]}
                      />
                    </div>
                  </>
                )}

                <Slider
                  label={t("img2pdf.ui.margin")}
                  value={settings.margin}
                  min={0}
                  max={72}
                  step={2}
                  onChange={(v) => update({ margin: v })}
                  display={t("img2pdf.v2.marginMm", { mm: marginMm })}
                />

                <div className="space-y-2">
                  <p className={sectionTitle}>{t("img2pdf.v2.quality")}</p>
                  <Segmented<Quality>
                    label={t("img2pdf.v2.quality")}
                    value={settings.quality}
                    onChange={(v) => update({ quality: v })}
                    size="sm"
                    options={[
                      { value: "original", label: t("img2pdf.v2.qualityOriginal") },
                      { value: "optimized", label: t("img2pdf.v2.qualityOptimized") },
                    ]}
                  />
                  <p className="text-[12.5px] leading-snug text-t-tertiary">
                    {settings.quality === "original" ? t("img2pdf.v2.qualityOriginalHint") : t("img2pdf.v2.qualityOptimizedHint")}
                  </p>
                </div>

                <label className="flex items-center justify-between gap-3">
                  <span className="text-[13px] text-t-secondary">{t("img2pdf.ui.background")}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-[12.5px] text-t-tertiary">{settings.background}</span>
                    <input
                      type="color"
                      value={settings.background}
                      onChange={(event) => update({ background: event.target.value })}
                      className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[13px] text-t-secondary">{t("img2pdf.ui.outputName")}</span>
                  <input
                    type="text"
                    value={outputName}
                    onChange={(event) => setOutputName(event.target.value)}
                    className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-t-primary focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-volt"
                  />
                </label>
              </div>
            </div>

            {processing ? (
              <div className="glass rounded-2xl p-4 flex items-center gap-4" aria-live="polite">
                <div className="min-w-0 flex-1">
                  <ProgressBar
                    progress={progress.total ? 3 + (progress.done / progress.total) * 95 : 3}
                    label={t("img2pdf.v2.progress", { done: progress.done, total: progress.total })}
                  />
                </div>
                <button type="button" onClick={cancel} className={buttonSecondary}>
                  <X className="h-4 w-4" aria-hidden="true" />
                  {t("img2pdf.v2.cancel")}
                </button>
              </div>
            ) : visibleResult ? (
              <div className="glass rounded-2xl p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" aria-live="polite">
                <div>
                  <p className="text-[15px] font-semibold text-t-primary">{t("img2pdf.v2.ready")}</p>
                  <p className="mt-0.5 text-[13px] text-t-secondary tabular-nums">
                    {t("pdfsec.pages", { count: visibleResult.pages })} · {formatFileSize(visibleResult.blob.size)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <DownloadButton blob={visibleResult.blob} filename={filename} label={t("ui.downloadPdf")} />
                  <button type="button" onClick={clearAll} className={buttonSecondary}>
                    {t("img2pdf.ui.newBatch")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={ready.length === 0 || loading}
                className={buttonPrimary}
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {t("img2pdf.ui.create")}
              </button>
            )}
          </>
        )}
      </div>
    </ToolLayout>
  );
}
