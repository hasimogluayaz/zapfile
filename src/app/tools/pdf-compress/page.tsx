"use client";

import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProgressBar from "@/components/ProgressBar";
import FileSizeCompare from "@/components/FileSizeCompare";
import { downloadBlob, formatFileSize } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type CompressMode = "lossless" | "raster";

interface CompressResult {
  blob: Blob;
  originalSize: number;
  newSize: number;
  pageCount: number;
}

const RASTER_PRESETS = [
  { value: "screen", label: "Screen", scale: 1, quality: 0.55 },
  { value: "balanced", label: "Balanced", scale: 1.35, quality: 0.68 },
  { value: "print", label: "Print", scale: 1.75, quality: 0.8 },
] as const;

function percentSaved(original: number, next: number) {
  if (original <= 0) return 0;
  return Math.max(0, Math.round(((original - next) / original) * 100));
}

export default function PdfCompressPage() {
  const { locale } = useI18n();
  const copy = locale === "tr"
    ? {
        dropLabel: "Sıkıştırmak istediğiniz PDF dosyasını bırakın",
        fileReady: "Dosya hazır",
        settings: "Sıkıştırma ayarları",
        mode: "Mod",
        lossless: "Kayıpsız optimize",
        losslessDesc: "Metin seçilebilir kalır, dosya yapısı sadeleştirilir.",
        raster: "Agresif küçült",
        rasterDesc: "Sayfalar görsel olarak yeniden paketlenir; metin seçimi kaybolabilir.",
        quality: "Görsel kalite",
        screen: "Ekran",
        balanced: "Dengeli",
        print: "Baskı",
        removeMetadata: "Belge meta verisini temizle",
        objectStreams: "Modern PDF sıkıştırma kullan",
        compress: "PDF'i sıkıştır",
        compressing: "PDF sıkıştırılıyor...",
        success: "PDF hazır. {saved}% tasarruf.",
        already: "PDF zaten oldukça optimize görünüyor.",
        fail: "PDF sıkıştırılamadı. Dosya şifreli veya bozuk olabilir.",
        download: "Sıkıştırılmış PDF indir",
        newFile: "Yeni dosya",
        original: "Orijinal",
        result: "Sonuç",
        pages: "Sayfa",
        warning: "Agresif mod PDF'i görüntüye dönüştürdüğü için kopyalanabilir metin ve form alanları korunmayabilir.",
        invalidFile: "Lütfen geçerli bir PDF seçin.",
      }
    : {
        dropLabel: "Drop the PDF you want to compress",
        fileReady: "File ready",
        settings: "Compression settings",
        mode: "Mode",
        lossless: "Lossless optimize",
        losslessDesc: "Keeps selectable text while cleaning up the PDF structure.",
        raster: "Aggressive shrink",
        rasterDesc: "Repackages pages as images; selectable text may be lost.",
        quality: "Visual quality",
        screen: "Screen",
        balanced: "Balanced",
        print: "Print",
        removeMetadata: "Remove document metadata",
        objectStreams: "Use modern PDF compression",
        compress: "Compress PDF",
        compressing: "Compressing PDF...",
        success: "PDF ready. {saved}% saved.",
        already: "PDF already looks well optimized.",
        fail: "Compression failed. The PDF may be encrypted or corrupted.",
        download: "Download compressed PDF",
        newFile: "New file",
        original: "Original",
        result: "Result",
        pages: "Pages",
        warning: "Aggressive mode turns pages into images, so selectable text and form fields may not be preserved.",
        invalidFile: "Please select a valid PDF file.",
      };

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [mode, setMode] = useState<CompressMode>("lossless");
  const [rasterPreset, setRasterPreset] = useState<(typeof RASTER_PRESETS)[number]["value"]>("balanced");
  const [removeMetadata, setRemoveMetadata] = useState(true);
  const [objectStreams, setObjectStreams] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<CompressResult | null>(null);

  const activeRaster = useMemo(
    () => RASTER_PRESETS.find((preset) => preset.value === rasterPreset) ?? RASTER_PRESETS[1],
    [rasterPreset],
  );

  const handleFile = useCallback(
    async (files: File[]) => {
      const pdf = files.find((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
      if (!pdf) {
        toast.error(copy.invalidFile);
        return;
      }

      setFile(pdf);
      setResult(null);
      setProgress(0);

      try {
        const { PDFDocument } = await import("pdf-lib");
        const doc = await PDFDocument.load(await pdf.arrayBuffer(), {
          ignoreEncryption: true,
        });
        setPageCount(doc.getPageCount());
      } catch (error) {
        console.error(error);
        setFile(null);
        setPageCount(0);
        toast.error(copy.fail);
      }
    },
    [copy.fail, copy.invalidFile],
  );

  const compressLossless = useCallback(async (sourceFile: File) => {
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.load(await sourceFile.arrayBuffer(), {
      ignoreEncryption: true,
      updateMetadata: false,
    });

    if (removeMetadata) {
      doc.setTitle("");
      doc.setAuthor("");
      doc.setSubject("");
      doc.setKeywords([]);
      doc.setProducer("");
      doc.setCreator("");
    }

    const bytes = await doc.save({
      useObjectStreams: objectStreams,
      addDefaultPage: false,
      objectsPerTick: 80,
    });

    return {
      blob: new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }),
      pageCount: doc.getPageCount(),
    };
  }, [objectStreams, removeMetadata]);

  const compressRaster = useCallback(async (sourceFile: File) => {
    const [{ PDFDocument }, pdfjsLib] = await Promise.all([
      import("pdf-lib"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      import("pdfjs-dist" as any),
    ]);
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    const arrayBuffer = await sourceFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const outDoc = await PDFDocument.create();

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const renderViewport = page.getViewport({ scale: activeRaster.scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(renderViewport.width);
      canvas.height = Math.ceil(renderViewport.height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;

      const jpegBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Page export failed"));
          },
          "image/jpeg",
          activeRaster.quality,
        );
      });

      const embedded = await outDoc.embedJpg(await jpegBlob.arrayBuffer());
      const newPage = outDoc.addPage([baseViewport.width, baseViewport.height]);
      newPage.drawImage(embedded, {
        x: 0,
        y: 0,
        width: baseViewport.width,
        height: baseViewport.height,
      });
      setProgress(10 + Math.round((pageNumber / pdf.numPages) * 78));
    }

    const bytes = await outDoc.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 80,
    });

    return {
      blob: new Blob([bytes.buffer as ArrayBuffer], { type: "application/pdf" }),
      pageCount: pdf.numPages,
    };
  }, [activeRaster.quality, activeRaster.scale]);

  const handleCompress = useCallback(async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(5);
    setResult(null);

    try {
      const compressed =
        mode === "lossless"
          ? await compressLossless(file)
          : await compressRaster(file);

      setProgress(95);
      const nextResult = {
        blob: compressed.blob,
        originalSize: file.size,
        newSize: compressed.blob.size,
        pageCount: compressed.pageCount,
      };
      setResult(nextResult);
      setProgress(100);

      const saved = percentSaved(file.size, compressed.blob.size);
      toast.success(saved > 0 ? copy.success.replace("{saved}", String(saved)) : copy.already);
    } catch (error) {
      console.error(error);
      toast.error(copy.fail);
    } finally {
      setProcessing(false);
    }
  }, [compressLossless, compressRaster, copy.already, copy.fail, copy.success, file, mode]);

  const handleDownload = useCallback(() => {
    if (!result || !file) return;
    const name = file.name.replace(/\.pdf$/i, "") + "-compressed.pdf";
    downloadBlob(result.blob, name);
  }, [file, result]);

  const reset = useCallback(() => {
    setFile(null);
    setPageCount(0);
    setResult(null);
    setProgress(0);
  }, []);

  return (
    <ToolLayout
      toolName="PDF Compressor"
      toolDescription="Optimize PDFs losslessly or shrink them aggressively by repackaging pages as compressed images."
    >
      <div className="space-y-6">
        {!file ? (
          <FileDropzone
            onFilesSelected={handleFile}
            accept={{ "application/pdf": [".pdf"] }}
            label={copy.dropLabel}
            formats={["PDF"]}
          />
        ) : (
          <>
            <div className="glass rounded-2xl p-5 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.2em] text-t-secondary">
                    {copy.fileReady}
                  </p>
                  <p className="mt-2 truncate text-lg font-semibold text-t-primary">{file.name}</p>
                  <p className="mt-1 text-sm text-t-secondary">
                    {formatFileSize(file.size)} - {pageCount} {copy.pages.toLowerCase()}
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
            </div>

            {!result && (
              <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
                <div className="glass rounded-2xl p-5 space-y-4">
                  <p className="text-sm font-semibold text-t-primary">{copy.mode}</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setMode("lossless")}
                      className={`rounded-2xl border p-4 text-left transition-colors ${
                        mode === "lossless"
                          ? "border-accent bg-accent/15"
                          : "border-border bg-bg-secondary hover:border-accent/40"
                      }`}
                    >
                      <span className="block text-sm font-semibold text-t-primary">{copy.lossless}</span>
                      <span className="mt-2 block text-xs leading-relaxed text-t-secondary">
                        {copy.losslessDesc}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("raster")}
                      className={`rounded-2xl border p-4 text-left transition-colors ${
                        mode === "raster"
                          ? "border-accent bg-accent/15"
                          : "border-border bg-bg-secondary hover:border-accent/40"
                      }`}
                    >
                      <span className="block text-sm font-semibold text-t-primary">{copy.raster}</span>
                      <span className="mt-2 block text-xs leading-relaxed text-t-secondary">
                        {copy.rasterDesc}
                      </span>
                    </button>
                  </div>

                  {mode === "raster" && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-t-secondary">
                      {copy.warning}
                    </div>
                  )}
                </div>

                <div className="glass rounded-2xl p-5 space-y-4">
                  <p className="text-sm font-semibold text-t-primary">{copy.settings}</p>

                  {mode === "lossless" ? (
                    <div className="space-y-3">
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-bg-secondary p-3">
                        <input
                          type="checkbox"
                          checked={removeMetadata}
                          onChange={(event) => setRemoveMetadata(event.target.checked)}
                          className="mt-0.5 accent-accent"
                        />
                        <span className="text-sm text-t-primary">{copy.removeMetadata}</span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-bg-secondary p-3">
                        <input
                          type="checkbox"
                          checked={objectStreams}
                          onChange={(event) => setObjectStreams(event.target.checked)}
                          className="mt-0.5 accent-accent"
                        />
                        <span className="text-sm text-t-primary">{copy.objectStreams}</span>
                      </label>
                    </div>
                  ) : (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-t-secondary">
                        {copy.quality}
                      </label>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {RASTER_PRESETS.map((preset) => {
                          const label =
                            preset.value === "screen"
                              ? copy.screen
                              : preset.value === "print"
                                ? copy.print
                                : copy.balanced;
                          return (
                            <button
                              key={preset.value}
                              type="button"
                              onClick={() => setRasterPreset(preset.value)}
                              className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                                rasterPreset === preset.value
                                  ? "border-accent bg-accent/15 text-t-primary"
                                  : "border-border bg-bg-secondary text-t-secondary hover:border-accent/40"
                              }`}
                            >
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {processing && (
              <div className="glass rounded-2xl p-4">
                <ProgressBar progress={progress} label={copy.compressing} />
              </div>
            )}

            {result && (
              <div className="space-y-5">
                <FileSizeCompare originalSize={result.originalSize} newSize={result.newSize} />
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-bg-secondary/60 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                      {copy.original}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-t-primary">
                      {formatFileSize(result.originalSize)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-secondary/60 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                      {copy.result}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-t-primary">
                      {formatFileSize(result.newSize)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-secondary/60 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                      {copy.pages}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-t-primary">{result.pageCount}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {!result && (
                <button
                  type="button"
                  onClick={() => void handleCompress()}
                  disabled={processing}
                  className={`rounded-2xl px-6 py-3 text-sm font-semibold text-white transition-all ${
                    processing
                      ? "cursor-not-allowed bg-bg-secondary text-t-secondary"
                      : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg hover:shadow-indigo-500/25"
                  }`}
                >
                  {processing ? copy.compressing : copy.compress}
                </button>
              )}
              {result && (
                <>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
                  >
                    {copy.download}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    className="rounded-2xl border border-border bg-bg-secondary px-6 py-3 text-sm font-semibold text-t-secondary transition-colors hover:text-t-primary"
                  >
                    {copy.settings}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </ToolLayout>
  );
}
