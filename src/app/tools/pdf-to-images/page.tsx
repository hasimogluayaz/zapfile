"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, Download, Loader2, RefreshCw, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProgressBar from "@/components/ProgressBar";
import { Segmented, Slider, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { AbortError, makeThumbnail, processImage, type OutputFormat } from "@/lib/image-engine";
import { openPdf } from "@/lib/pdfjs";
import { RenderAbortError, cappedScale, renderPageToBitmap, yieldToBrowser } from "@/lib/pdf-to-images-render";
import { downloadBlob, formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { pdfInputErrorKey, toEditablePdf } from "@/lib/pdf-input";
import { useI18n } from "@/lib/i18n";

type ImageFormat = "png" | "jpeg" | "webp";
type NamingMode = "page" | "padded";
type Background = "white" | "transparent" | "custom";
type Dpi = 72 | 150 | 300 | 600;

interface PageImage {
  pageNum: number;
  blob: Blob;
  thumb: string;
  filename: string;
  width: number;
  height: number;
}

const DPIS: Dpi[] = [72, 150, 300, 600];

/** Checkerboard behind transparent previews. */
const CHECKER = {
  backgroundImage: "repeating-conic-gradient(rgb(var(--border-rgb)) 0% 25%, transparent 0% 50%)",
  backgroundSize: "16px 16px",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function extensionFor(format: ImageFormat) {
  return format === "jpeg" ? "jpg" : format;
}

function mimeFor(format: ImageFormat): OutputFormat {
  if (format === "jpeg") return "image/jpeg";
  if (format === "webp") return "image/webp";
  return "image/png";
}

function padWidth(pageCount: number) {
  return Math.max(2, String(pageCount).length);
}

function fileName(base: string, pageNumber: number, pageCount: number, naming: NamingMode, format: ImageFormat) {
  const part = naming === "padded" ? String(pageNumber).padStart(padWidth(pageCount), "0") : String(pageNumber);
  return `${base}_page-${part}.${extensionFor(format)}`;
}

export default function PdfToImagesPage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [firstPage, setFirstPage] = useState<{ w: number; h: number } | null>(null);
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(1);
  const [format, setFormat] = useState<ImageFormat>("png");
  const [quality, setQuality] = useState(90);
  const [dpi, setDpi] = useState<Dpi>(150);
  const [background, setBackground] = useState<Background>("white");
  const [customColor, setCustomColor] = useState("#ffffff");
  const [namingMode, setNamingMode] = useState<NamingMode>("padded");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [images, setImages] = useState<PageImage[]>([]);
  const [resultKey, setResultKey] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
  const runRef = useRef<AbortController | null>(null);
  const imagesRef = useRef<PageImage[]>([]);
  imagesRef.current = images;

  useEffect(
    () => () => {
      runRef.current?.abort();
      imagesRef.current.forEach((img) => URL.revokeObjectURL(img.thumb));
    },
    [],
  );

  const clearImages = useCallback(() => {
    imagesRef.current.forEach((img) => URL.revokeObjectURL(img.thumb));
    imagesRef.current = [];
    setImages([]);
    setResultKey(null);
  }, []);

  const range = useMemo(() => {
    if (!pageCount) return { from: 1, to: 1, count: 0 };
    const from = clamp(rangeStart || 1, 1, pageCount);
    const to = clamp(rangeEnd || pageCount, from, pageCount);
    return { from, to, count: to - from + 1 };
  }, [pageCount, rangeEnd, rangeStart]);

  // Transparent JPEG isn't possible; the engine would flatten to white anyway.
  const effectiveBackground = background === "transparent" && format === "jpeg" ? "white" : background;
  const bgColor =
    effectiveBackground === "transparent" ? "transparent" : effectiveBackground === "custom" ? customColor : "#ffffff";

  const baseName = file ? getFileNameWithoutExtension(file.name) : "pdf";
  const settingsKey = JSON.stringify([range.from, range.to, format, format === "png" ? 0 : quality, dpi, bgColor, namingMode]);
  const stale = images.length > 0 && !processing && resultKey !== settingsKey;

  const pixelPreview = useMemo(() => {
    if (!firstPage) return null;
    const fitted = cappedScale(firstPage.w, firstPage.h, dpi / 72);
    return {
      w: Math.floor(firstPage.w * fitted.scale),
      h: Math.floor(firstPage.h * fitted.scale),
      capped: fitted.capped,
    };
  }, [dpi, firstPage]);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const picked = files[0];
      if (!picked) return;
      runRef.current?.abort();
      let nextFile: File;
      try {
        nextFile = await toEditablePdf(picked);
      } catch (error) {
        console.error(error);
        toast.error(t(pdfInputErrorKey(error)));
        return;
      }
      clearImages();
      try {
        const data = new Uint8Array(await nextFile.arrayBuffer());
        const pdf = await openPdf(data);
        try {
          const page = await pdf.getPage(1);
          const vp = page.getViewport({ scale: 1 });
          setFirstPage({ w: vp.width, h: vp.height });
          page.cleanup();
          setPageCount(pdf.numPages);
          setRangeStart(1);
          setRangeEnd(pdf.numPages);
        } finally {
          void pdf.destroy();
        }
        setBytes(data);
        setFile(nextFile);
      } catch (error) {
        console.error(error);
        toast.error(t("pdfimages.ui.invalidPdf"));
      }
    },
    [clearImages, t],
  );

  const handleProcess = useCallback(async () => {
    if (!file || !bytes) return;
    runRef.current?.abort();
    const run = new AbortController();
    runRef.current = run;
    const { signal } = run;
    clearImages();
    setProcessing(true);
    setProgress({ done: 0, total: range.count });
    const key = settingsKey;
    const mime = mimeFor(format);
    const q = format === "png" ? 1 : quality / 100;

    let pdf: Awaited<ReturnType<typeof openPdf>> | null = null;
    try {
      pdf = await openPdf(bytes);
      const from = clamp(range.from, 1, pdf.numPages);
      const to = clamp(range.to, from, pdf.numPages);
      let done = 0;
      let pending: Promise<void> | null = null;
      for (let n = from; n <= to; n++) {
        if (signal.aborted) throw new AbortError();
        const page = await pdf.getPage(n);
        const rendered = await renderPageToBitmap(page, dpi / 72, bgColor, signal);
        // Encoding runs in the engine's worker pool while we render the next page.
        const encode = processImage(
          { input: rendered.bitmap as unknown as Blob, encode: { format: mime, quality: q } },
          signal,
        );
        if (pending) await pending;
        const pageNum = n;
        pending = encode.then(async (res) => {
          const thumb = await makeThumbnail(res.blob, 400, signal);
          if (signal.aborted) return;
          const img: PageImage = {
            pageNum,
            blob: res.blob,
            thumb: URL.createObjectURL(thumb.blob),
            filename: fileName(baseName, pageNum, pageCount, namingMode, format),
            width: res.width,
            height: res.height,
          };
          imagesRef.current = [...imagesRef.current, img];
          setImages(imagesRef.current);
          done++;
          setProgress({ done, total: to - from + 1 });
        });
        pending.catch(() => undefined); // awaited below
        await yieldToBrowser();
      }
      if (pending) await pending;
      if (signal.aborted) return;
      setResultKey(key);
      toast.success(t("pdfimages.ui.success", { count: done }));
    } catch (error) {
      if (error instanceof AbortError || error instanceof RenderAbortError || signal.aborted) return;
      console.error(error);
      clearImages();
      toast.error(t("pdfimages.ui.fail"));
    } finally {
      if (pdf) void pdf.destroy();
      if (runRef.current === run) {
        runRef.current = null;
        setProcessing(false);
      }
    }
  }, [baseName, bgColor, bytes, clearImages, dpi, file, format, namingMode, pageCount, quality, range, settingsKey, t]);

  const cancel = useCallback(() => {
    runRef.current?.abort();
    runRef.current = null;
    setProcessing(false);
    clearImages();
  }, [clearImages]);

  const downloadAll = useCallback(async () => {
    if (images.length === 1) {
      downloadBlob(images[0].blob, images[0].filename);
      return;
    }
    setZipping(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      images.forEach((img) => zip.file(img.filename, img.blob));
      // Images are already compressed; storing them is much faster.
      const zipBlob = await zip.generateAsync({ type: "blob", compression: "STORE" });
      downloadBlob(zipBlob, `${baseName}_images.zip`);
    } catch (error) {
      console.error(error);
      toast.error(t("pdfimages.ui.fail"));
    } finally {
      setZipping(false);
    }
  }, [baseName, images, t]);

  const reset = useCallback(() => {
    runRef.current?.abort();
    runRef.current = null;
    clearImages();
    setProcessing(false);
    setFile(null);
    setBytes(null);
    setPageCount(0);
    setFirstPage(null);
    setRangeStart(1);
    setRangeEnd(1);
  }, [clearImages]);

  const totalOutputSize = images.reduce((sum, image) => sum + image.blob.size, 0);
  const inputClass =
    "w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-t-primary focus:border-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-volt";

  return (
    <ToolLayout
      toolName="PDF to Images"
      toolDescription="Convert selected PDF pages to PNG, JPG, or WebP images with quality and range controls."
    >
      <div className="space-y-5">
        {!file ? (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{ "application/pdf": [".pdf"] }}
            formats={["PDF"]}
            label={t("pdfimages.ui.dropLabel")}
          />
        ) : (
          <>
            <div className="glass rounded-2xl p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-[17px] font-semibold text-t-primary">{file.name}</p>
                  <p className="mt-1 text-[13px] text-t-secondary tabular-nums">
                    {formatFileSize(file.size)} · {t("pdfsec.pages", { count: pageCount })}
                  </p>
                </div>
                <button type="button" onClick={reset} className={buttonSecondary}>
                  {t("pdfimages.ui.newFile")}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="glass rounded-2xl p-5 space-y-5">
                <div>
                  <p className={sectionTitle}>{t("pdfimages.ui.pageRange")}</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mb-1.5 block text-[13px] text-t-secondary">{t("pdfimages.ui.firstPage")}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={pageCount}
                        value={rangeStart}
                        onChange={(event) => setRangeStart(Number(event.target.value || 1))}
                        className={inputClass}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-[13px] text-t-secondary">{t("pdfimages.ui.lastPage")}</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={pageCount}
                        value={rangeEnd}
                        onChange={(event) => setRangeEnd(Number(event.target.value || pageCount))}
                        className={inputClass}
                      />
                    </label>
                  </div>
                  <p className="mt-2 text-[12.5px] text-t-tertiary">
                    {t("pdfimages.ui.rangeSummary")}: {range.count}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className={sectionTitle}>{t("pdfimages.ui.naming")}</p>
                  <Segmented<NamingMode>
                    label={t("pdfimages.ui.naming")}
                    value={namingMode}
                    onChange={setNamingMode}
                    size="sm"
                    options={(["page", "padded"] as const).map((mode) => ({
                      value: mode,
                      label: <span className="font-mono">{`page-${mode === "padded" ? "1".padStart(padWidth(pageCount), "0") : "1"}`}</span>,
                    }))}
                  />
                  <p className="truncate text-[12.5px] text-t-tertiary font-mono" dir="ltr">
                    {fileName(baseName, range.from, pageCount, namingMode, format)}
                  </p>
                </div>
              </div>

              <div className="glass rounded-2xl p-5 space-y-5">
                <div className="space-y-2">
                  <p className={sectionTitle}>{t("ui.format")}</p>
                  <Segmented<ImageFormat>
                    label={t("ui.format")}
                    value={format}
                    onChange={setFormat}
                    options={[
                      { value: "png", label: "PNG" },
                      { value: "jpeg", label: "JPG" },
                      { value: "webp", label: "WebP" },
                    ]}
                  />
                </div>

                <div className="space-y-2">
                  <p className={sectionTitle}>{t("pdfimages.ui.resolution")}</p>
                  <Segmented<Dpi>
                    label={t("pdfimages.ui.resolution")}
                    value={dpi}
                    onChange={setDpi}
                    options={DPIS.map((d) => ({ value: d, label: t("pdfimages.v2.dpi", { dpi: d }) }))}
                  />
                  {pixelPreview && (
                    <p className="text-[12.5px] text-t-tertiary tabular-nums">
                      {t("pdfimages.v2.pixelSize", { w: pixelPreview.w, h: pixelPreview.h })}
                      {pixelPreview.capped && <> · {t("pdfimages.v2.capped")}</>}
                    </p>
                  )}
                </div>

                {format !== "png" && (
                  <Slider
                    label={t("ui.quality")}
                    value={quality}
                    min={40}
                    max={100}
                    onChange={setQuality}
                    display={`${quality}%`}
                  />
                )}

                <div className="space-y-2">
                  <p className={sectionTitle}>{t("pdfimages.v2.background")}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Segmented<Background>
                      label={t("pdfimages.v2.background")}
                      value={effectiveBackground}
                      onChange={setBackground}
                      size="sm"
                      options={[
                        { value: "white", label: t("pdfimages.v2.bgWhite") },
                        {
                          value: "transparent",
                          label: t("pdfimages.v2.bgTransparent"),
                          disabled: format === "jpeg",
                          title: format === "jpeg" ? t("pdfimages.v2.noTransparentJpg") : undefined,
                        },
                        { value: "custom", label: t("pdfimages.v2.bgCustom") },
                      ]}
                    />
                    {effectiveBackground === "custom" && (
                      <input
                        type="color"
                        value={customColor}
                        onChange={(event) => setCustomColor(event.target.value)}
                        aria-label={t("pdfimages.v2.bgColor")}
                        className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-transparent p-0.5"
                      />
                    )}
                  </div>
                  {format === "jpeg" && (
                    <p className="text-[12.5px] text-t-tertiary">{t("pdfimages.v2.noTransparentJpg")}</p>
                  )}
                </div>
              </div>
            </div>

            {processing ? (
              <div className="glass rounded-2xl p-4 flex items-center gap-4" aria-live="polite">
                <div className="min-w-0 flex-1">
                  <ProgressBar
                    progress={progress.total ? 2 + (progress.done / progress.total) * 98 : 2}
                    label={t("pdfimages.v2.progress", { done: progress.done, total: progress.total })}
                  />
                </div>
                <button type="button" onClick={cancel} className={buttonSecondary}>
                  <X className="h-4 w-4" aria-hidden="true" />
                  {t("pdfimages.v2.cancel")}
                </button>
              </div>
            ) : (
              (images.length === 0 || stale) && (
                <button type="button" onClick={() => void handleProcess()} className={buttonPrimary} disabled={!range.count}>
                  {stale && <RefreshCw className="h-4 w-4" aria-hidden="true" />}
                  {stale ? t("pdfimages.v2.convertAgain") : t("pdfimages.ui.convert")}
                </button>
              )
            )}

            {images.length > 0 && (
              <div className="space-y-4">
                {stale && !processing && (
                  <p className="flex items-start gap-2 rounded-xl border border-border bg-bg-secondary p-3 text-[13px] text-t-secondary" role="status">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {t("pdfimages.v2.stale")}
                  </p>
                )}
                {!processing && !stale && (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[14px] font-semibold text-t-primary">
                        {t("pdfimages.ui.convertedCount", { count: images.length })}
                      </p>
                      <p className="mt-0.5 text-[12.5px] text-t-tertiary tabular-nums">{formatFileSize(totalOutputSize)}</p>
                    </div>
                    <button type="button" onClick={() => void downloadAll()} disabled={zipping} className={buttonPrimary}>
                      {zipping ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Download className="h-4 w-4" aria-hidden="true" />
                      )}
                      {images.length > 1 ? t("pdfimages.ui.downloadAll") : t("ui.download")}
                    </button>
                  </div>
                )}

                <ul className={`grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 ${stale ? "opacity-50" : ""}`}>
                  {images.map((img) => (
                    <li key={img.pageNum} className="rounded-xl border border-border bg-surface p-2">
                      <div
                        className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-bg-secondary"
                        style={bgColor === "transparent" ? CHECKER : undefined}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.thumb}
                          alt={t("pdfimg.page", { num: img.pageNum })}
                          className="max-h-full max-w-full object-contain"
                          loading="lazy"
                        />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-t-primary">
                            {t("pdfimg.page", { num: img.pageNum })}
                          </p>
                          <p className="truncate text-[11.5px] text-t-tertiary tabular-nums">
                            {img.width}×{img.height} · {formatFileSize(img.blob.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => downloadBlob(img.blob, img.filename)}
                          disabled={stale || processing}
                          aria-label={t("pdfimages.v2.downloadPage", { num: img.pageNum })}
                          title={img.filename}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-t-secondary transition hover:bg-bg-secondary hover:text-t-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt disabled:opacity-40"
                        >
                          <Download className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </ToolLayout>
  );
}
