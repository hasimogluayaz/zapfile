"use client";

import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProgressBar from "@/components/ProgressBar";
import {
  downloadBlob,
  formatFileSize,
  getFileNameWithoutExtension,
} from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type ImageFormat = "png" | "jpeg" | "webp";
type NamingMode = "page" | "padded";

interface PageImage {
  pageNum: number;
  dataUrl: string;
  blob: Blob;
  filename: string;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function extensionFor(format: ImageFormat) {
  return format === "jpeg" ? "jpg" : format;
}

function mimeFor(format: ImageFormat) {
  if (format === "jpeg") return "image/jpeg";
  if (format === "webp") return "image/webp";
  return "image/png";
}

export default function PdfToImagesPage() {
  const { locale, t } = useI18n();
  const copy = locale === "tr"
    ? {
        dropLabel: "Görsele çevirmek istediğiniz PDF dosyasını bırakın",
        fileReady: "Dosya hazır",
        settings: "Çıktı ayarları",
        pageRange: "Sayfa aralığı",
        firstPage: "İlk sayfa",
        lastPage: "Son sayfa",
        format: "Biçim",
        resolution: "Çözünürlük",
        quality: "Kalite",
        background: "JPEG/WebP arka planı",
        naming: "Dosya adlandırma",
        simpleNames: "page-1",
        paddedNames: "page-001",
        convert: "Sayfaları görsele çevir",
        converting: "Sayfalar dönüştürülüyor...",
        converted: "Dönüştürülen sayfalar",
        downloadAll: "Tümünü indir",
        newFile: "Yeni PDF",
        rangeSummary: "Seçilen",
        pageWord: "sayfa",
        invalidPdf: "PDF okunamadı. Lütfen başka bir dosya deneyin.",
        fail: "PDF görsellere çevrilemedi.",
        success: "{count} sayfa hazır.",
      }
    : {
        dropLabel: "Drop the PDF you want to turn into images",
        fileReady: "File ready",
        settings: "Output settings",
        pageRange: "Page range",
        firstPage: "First page",
        lastPage: "Last page",
        format: "Format",
        resolution: "Resolution",
        quality: "Quality",
        background: "JPEG/WebP background",
        naming: "File naming",
        simpleNames: "page-1",
        paddedNames: "page-001",
        convert: "Convert pages to images",
        converting: "Converting pages...",
        converted: "Converted pages",
        downloadAll: "Download all",
        newFile: "New PDF",
        rangeSummary: "Selected",
        pageWord: "pages",
        invalidPdf: "Could not read that PDF. Please try another file.",
        fail: "Failed to convert PDF pages.",
        success: "{count} pages ready.",
      };

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [format, setFormat] = useState<ImageFormat>("png");
  const [quality, setQuality] = useState(92);
  const [scale, setScale] = useState(2);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [namingMode, setNamingMode] = useState<NamingMode>("padded");
  const [images, setImages] = useState<PageImage[]>([]);

  const normalizedRange = useMemo(() => {
    if (!pageCount) return { from: 1, to: 1, count: 0 };
    const from = clamp(rangeStart || 1, 1, pageCount);
    const to = clamp(rangeEnd || pageCount, from, pageCount);
    return { from, to, count: to - from + 1 };
  }, [pageCount, rangeEnd, rangeStart]);

  const totalOutputSize = useMemo(
    () => images.reduce((sum, image) => sum + image.blob.size, 0),
    [images],
  );

  const buildFilename = useCallback(
    (pageNumber: number) => {
      const baseName = file ? getFileNameWithoutExtension(file.name) : "pdf";
      const ext = extensionFor(format);
      const pagePart =
        namingMode === "padded"
          ? String(pageNumber).padStart(String(pageCount || pageNumber).length, "0")
          : String(pageNumber);
      return `${baseName}_page-${pagePart}.${ext}`;
    },
    [file, format, namingMode, pageCount],
  );

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const nextFile = files[0];
      if (!nextFile) return;

      setFile(nextFile);
      setImages([]);
      setProgress(0);

      try {
        const { PDFDocument } = await import("pdf-lib");
        const pdfDoc = await PDFDocument.load(await nextFile.arrayBuffer(), {
          ignoreEncryption: true,
        });
        const count = pdfDoc.getPageCount();
        setPageCount(count);
        setRangeStart(1);
        setRangeEnd(count);
      } catch (error) {
        console.error(error);
        setFile(null);
        setPageCount(0);
        toast.error(copy.invalidPdf);
      }
    },
    [copy.invalidPdf],
  );

  const handleProcess = useCallback(async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(5);
    setImages([]);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfjsLib = await import("pdfjs-dist" as any);
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      setProgress(12);

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const from = clamp(normalizedRange.from, 1, pdf.numPages);
      const to = clamp(normalizedRange.to, from, pdf.numPages);
      const total = to - from + 1;
      const results: PageImage[] = [];
      setProgress(20);

      for (let pageNumber = from; pageNumber <= to; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas unavailable");

        if (format !== "png") {
          ctx.fillStyle = backgroundColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        await page.render({ canvasContext: ctx, viewport }).promise;
        const mimeType = mimeFor(format);
        const qualityParam = format === "png" ? undefined : quality / 100;
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (nextBlob) => {
              if (nextBlob) resolve(nextBlob);
              else reject(new Error("Image export failed"));
            },
            mimeType,
            qualityParam,
          );
        });

        results.push({
          pageNum: pageNumber,
          dataUrl: canvas.toDataURL(mimeType, qualityParam),
          blob,
          filename: buildFilename(pageNumber),
        });

        setProgress(20 + Math.round(((pageNumber - from + 1) / total) * 76));
      }

      setImages(results);
      setProgress(100);
      toast.success(copy.success.replace("{count}", String(results.length)));
    } catch (error) {
      console.error(error);
      toast.error(copy.fail);
    } finally {
      setProcessing(false);
    }
  }, [
    backgroundColor,
    buildFilename,
    copy.fail,
    copy.success,
    file,
    format,
    normalizedRange.from,
    normalizedRange.to,
    quality,
    scale,
  ]);

  const downloadSingle = useCallback((img: PageImage) => {
    downloadBlob(img.blob, img.filename);
  }, []);

  const downloadAll = useCallback(async () => {
    if (images.length === 1) {
      downloadSingle(images[0]);
      return;
    }

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    images.forEach((img) => {
      zip.file(img.filename, img.blob);
    });
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const baseName = file ? getFileNameWithoutExtension(file.name) : "pdf";
    downloadBlob(zipBlob, `${baseName}_images.zip`);
  }, [downloadSingle, file, images]);

  const reset = useCallback(() => {
    setFile(null);
    setPageCount(0);
    setRangeStart(1);
    setRangeEnd(1);
    setImages([]);
    setProgress(0);
  }, []);

  return (
    <ToolLayout
      toolName="PDF to Images"
      toolDescription="Convert selected PDF pages to PNG, JPG, or WebP images with quality and range controls."
    >
      <div className="space-y-6">
        {!file ? (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{ "application/pdf": [".pdf"] }}
            formats={["PDF"]}
            label={copy.dropLabel}
          />
        ) : images.length === 0 ? (
          <>
            <div className="glass rounded-2xl p-5 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.2em] text-t-secondary">
                    {copy.fileReady}
                  </p>
                  <p className="mt-2 truncate text-lg font-semibold text-t-primary">{file.name}</p>
                  <p className="mt-1 text-sm text-t-secondary">
                    {formatFileSize(file.size)} - {pageCount} {copy.pageWord}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl border border-border bg-bg-secondary px-4 py-2 text-sm font-medium text-t-secondary transition-colors hover:text-t-primary"
                >
                  {copy.newFile}
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-bg-secondary/60 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                    {copy.rangeSummary}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-t-primary">
                    {normalizedRange.count}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-bg-secondary/60 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                    {copy.format}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-t-primary">
                    {format.toUpperCase()}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-bg-secondary/60 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                    {copy.resolution}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-t-primary">{scale}x</p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <div className="glass rounded-2xl p-5 space-y-4">
                <p className="text-sm font-semibold text-t-primary">{copy.pageRange}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-t-secondary">
                      {copy.firstPage}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={pageCount}
                      value={rangeStart}
                      onChange={(event) => setRangeStart(Number(event.target.value || 1))}
                      className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-t-primary focus:border-accent/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-t-secondary">
                      {copy.lastPage}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={pageCount}
                      value={rangeEnd}
                      onChange={(event) => setRangeEnd(Number(event.target.value || pageCount))}
                      className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-t-primary focus:border-accent/50 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="glass rounded-2xl p-5 space-y-4">
                <p className="text-sm font-semibold text-t-primary">{copy.settings}</p>

                <div className="grid grid-cols-3 gap-2">
                  {(["png", "jpeg", "webp"] as const).map((nextFormat) => (
                    <button
                      key={nextFormat}
                      type="button"
                      onClick={() => setFormat(nextFormat)}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                        format === nextFormat
                          ? "border-accent bg-accent/15 text-t-primary"
                          : "border-border bg-bg-secondary text-t-secondary hover:border-accent/40 hover:text-t-primary"
                      }`}
                    >
                      {nextFormat === "jpeg" ? "JPG" : nextFormat.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-sm text-t-secondary">
                    <label>{copy.resolution}</label>
                    <span className="font-mono">{scale}x</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={4}
                    step={0.5}
                    value={scale}
                    onChange={(event) => setScale(Number(event.target.value))}
                    className="w-full accent-accent"
                  />
                </div>

                {format !== "png" && (
                  <>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm text-t-secondary">
                        <label>{copy.quality}</label>
                        <span className="font-mono">{quality}%</span>
                      </div>
                      <input
                        type="range"
                        min={35}
                        max={100}
                        step={1}
                        value={quality}
                        onChange={(event) => setQuality(Number(event.target.value))}
                        className="w-full accent-accent"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-t-secondary">
                        {copy.background}
                      </label>
                      <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-secondary px-3 py-2">
                        <input
                          type="color"
                          value={backgroundColor}
                          onChange={(event) => setBackgroundColor(event.target.value)}
                          className="h-9 w-9 rounded-lg border border-border bg-transparent p-0.5"
                        />
                        <span className="text-sm font-mono text-t-secondary">{backgroundColor}</span>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="mb-2 block text-sm font-medium text-t-secondary">
                    {copy.naming}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      ["page", copy.simpleNames],
                      ["padded", copy.paddedNames],
                    ] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setNamingMode(value)}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                          namingMode === value
                            ? "border-accent bg-accent/15 text-t-primary"
                            : "border-border bg-bg-secondary text-t-secondary hover:border-accent/40"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {processing && (
              <div className="glass rounded-2xl p-4">
                <ProgressBar progress={progress} label={copy.converting} />
              </div>
            )}

            {!processing && (
              <button
                type="button"
                onClick={handleProcess}
                className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 px-8 py-3 text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-indigo-500/25"
              >
                {copy.convert}
              </button>
            )}
          </>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-t-primary">
                  {copy.converted}: {images.length}
                </p>
                <p className="mt-1 text-xs text-t-secondary">
                  {formatFileSize(totalOutputSize)}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void downloadAll()}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                >
                  {images.length > 1 ? copy.downloadAll : t("ui.download")}
                </button>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl border border-border bg-bg-secondary px-5 py-2.5 text-sm font-semibold text-t-secondary transition-colors hover:text-t-primary"
                >
                  {copy.newFile}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {images.map((img) => (
                <div key={img.pageNum} className="glass rounded-xl p-3 group">
                  <div className="relative overflow-hidden rounded-lg border border-border bg-bg-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.dataUrl}
                      alt={t("pdfimg.page", { num: img.pageNum })}
                      className="w-full"
                    />
                    <button
                      type="button"
                      onClick={() => downloadSingle(img)}
                      className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      {t("ui.download")}
                    </button>
                  </div>
                  <p className="mt-2 truncate text-center text-xs text-t-secondary">
                    {img.filename} - {formatFileSize(img.blob.size)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
