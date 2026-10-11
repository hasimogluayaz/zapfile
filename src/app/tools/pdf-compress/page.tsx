"use client";

import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { openPdf } from "@/lib/pdfjs";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProgressBar from "@/components/ProgressBar";
import FileSizeCompare from "@/components/FileSizeCompare";
import { downloadBlob, formatFileSize } from "@/lib/utils";
import { pdfInputErrorKey, toEditablePdf } from "@/lib/pdf-input";
import { useI18n } from "@/lib/i18n";

type CompressMode = "lossless" | "raster";

interface CompressResult {
  blob: Blob;
  originalSize: number;
  newSize: number;
  pageCount: number;
}

const RASTER_PRESETS = [
  { value: "screen", scale: 1, quality: 0.55 },
  { value: "balanced", scale: 1.35, quality: 0.68 },
  { value: "print", scale: 1.75, quality: 0.8 },
] as const;

function percentSaved(original: number, next: number) {
  if (original <= 0) return 0;
  return Math.max(0, Math.round(((original - next) / original) * 100));
}

export default function PdfCompressPage() {
  const { t } = useI18n();
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
      const picked = files.find((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
      if (!picked) {
        toast.error(t("pdfcompress.ui.invalidFile"));
        return;
      }
      let pdf: File;
      try {
        pdf = await toEditablePdf(picked);
      } catch (error) {
        console.error(error);
        toast.error(t(pdfInputErrorKey(error)));
        return;
      }

      setFile(pdf);
      setResult(null);
      setProgress(0);

      try {
        const { PDFDocument } = await import("pdf-lib");
        const doc = await PDFDocument.load(await pdf.arrayBuffer());
        setPageCount(doc.getPageCount());
      } catch (error) {
        console.error(error);
        setFile(null);
        setPageCount(0);
        toast.error(t("pdfcompress.ui.fail"));
      }
    },
    [t],
  );

  const compressLossless = useCallback(async (sourceFile: File) => {
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.load(await sourceFile.arrayBuffer(), {
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
    const { PDFDocument } = await import("pdf-lib");

    const arrayBuffer = await sourceFile.arrayBuffer();
    const pdf = await openPdf(arrayBuffer);
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
      await page.render({ canvas, canvasContext: ctx, viewport: renderViewport }).promise;

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
      toast.success(saved > 0 ? t("pdfcompress.ui.success", { saved }) : t("pdfcompress.ui.already"));
    } catch (error) {
      console.error(error);
      toast.error(t("pdfcompress.ui.fail"));
    } finally {
      setProcessing(false);
    }
  }, [compressLossless, compressRaster, file, mode, t]);

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
            label={t("pdfcompress.ui.dropLabel")}
            formats={["PDF"]}
          />
        ) : (
          <>
            <div className="glass rounded-2xl p-5 space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.2em] text-t-secondary">
                    {t("pdfcompress.ui.fileReady")}
                  </p>
                  <p className="mt-2 truncate text-lg font-semibold text-t-primary">{file.name}</p>
                  <p className="mt-1 text-sm text-t-secondary">
                    {formatFileSize(file.size)} - {t("pdfsec.pages", { count: pageCount })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl border border-border bg-bg-secondary px-4 py-2 text-sm font-medium text-t-secondary transition-colors hover:text-t-primary"
                >
                  {t("pdfcompress.ui.newFile")}
                </button>
              </div>
            </div>

            {!result && (
              <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
                <div className="glass rounded-2xl p-5 space-y-4">
                  <p className="text-sm font-semibold text-t-primary">{t("pdfsec.mode")}</p>
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
                      <span className="block text-sm font-semibold text-t-primary">{t("pdfcompress.ui.lossless")}</span>
                      <span className="mt-2 block text-xs leading-relaxed text-t-secondary">
                        {t("pdfcompress.ui.losslessDesc")}
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
                      <span className="block text-sm font-semibold text-t-primary">{t("pdfcompress.ui.raster")}</span>
                      <span className="mt-2 block text-xs leading-relaxed text-t-secondary">
                        {t("pdfcompress.ui.rasterDesc")}
                      </span>
                    </button>
                  </div>

                  {mode === "raster" && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-t-secondary">
                      {t("pdfcompress.ui.warning")}
                    </div>
                  )}
                </div>

                <div className="glass rounded-2xl p-5 space-y-4">
                  <p className="text-sm font-semibold text-t-primary">{t("pdfcompress.ui.settings")}</p>

                  {mode === "lossless" ? (
                    <div className="space-y-3">
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-bg-secondary p-3">
                        <input
                          type="checkbox"
                          checked={removeMetadata}
                          onChange={(event) => setRemoveMetadata(event.target.checked)}
                          className="mt-0.5 accent-accent"
                        />
                        <span className="text-sm text-t-primary">{t("pdfcompress.ui.removeMetadata")}</span>
                      </label>
                      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-bg-secondary p-3">
                        <input
                          type="checkbox"
                          checked={objectStreams}
                          onChange={(event) => setObjectStreams(event.target.checked)}
                          className="mt-0.5 accent-accent"
                        />
                        <span className="text-sm text-t-primary">{t("pdfcompress.ui.objectStreams")}</span>
                      </label>
                    </div>
                  ) : (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-t-secondary">
                        {t("pdfcompress.ui.quality")}
                      </label>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {RASTER_PRESETS.map((preset) => {
                          const label =
                            preset.value === "screen"
                              ? t("pdfcompress.ui.presetScreen")
                              : preset.value === "print"
                                ? t("pdfcompress.ui.presetPrint")
                                : t("pdfcompress.ui.presetBalanced");
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
                <ProgressBar progress={progress} label={t("pdfcompress.ui.compressing")} />
              </div>
            )}

            {result && (
              <div className="space-y-5">
                <FileSizeCompare originalSize={result.originalSize} newSize={result.newSize} />
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border border-border bg-bg-secondary/60 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                      {t("ui.original")}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-t-primary">
                      {formatFileSize(result.originalSize)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-secondary/60 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                      {t("ui.result")}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-t-primary">
                      {formatFileSize(result.newSize)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-bg-secondary/60 p-4">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                      {t("pdfcompress.ui.pages")}
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
                  className={`rounded-2xl px-6 py-3 text-sm font-semibold text-on-accent transition-all ${
                    processing
                      ? "cursor-not-allowed bg-bg-secondary text-t-secondary"
                      : "bg-accent hover:shadow-lg hover:shadow-sm"
                  }`}
                >
                  {processing ? t("pdfcompress.ui.compressing") : t("pdfcompress.ui.compress")}
                </button>
              )}
              {result && (
                <>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
                  >
                    {t("pdfcompress.ui.download")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    className="rounded-2xl border border-border bg-bg-secondary px-6 py-3 text-sm font-semibold text-t-secondary transition-colors hover:text-t-primary"
                  >
                    {t("pdfcompress.ui.settings")}
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
