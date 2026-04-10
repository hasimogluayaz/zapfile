"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import FileDropzone from "@/components/FileDropzone";
import ProcessButton from "@/components/ProcessButton";
import DownloadButton from "@/components/DownloadButton";
import FileSizeCompare from "@/components/FileSizeCompare";
import { formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import type { ConversionDef } from "@/lib/conversions";
import { useI18n } from "@/lib/i18n";

type OutputFormat = "png" | "jpeg" | "webp";

const formatOptions: {
  value: OutputFormat;
  label: string;
  mime: string;
  ext: string;
}[] = [
  { value: "png", label: "PNG", mime: "image/png", ext: ".png" },
  { value: "jpeg", label: "JPG", mime: "image/jpeg", ext: ".jpg" },
  { value: "webp", label: "WEBP", mime: "image/webp", ext: ".webp" },
];

export default function ConversionClient({
  conversion,
}: {
  conversion: ConversionDef;
}) {
  const { t } = useI18n();
  const [files, setFiles] = useState<File[]>([]);
  const [quality, setQuality] = useState(0.92);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<
    { original: File; converted: Blob; ext: string }[]
  >([]);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);

  const outputFormat: OutputFormat = conversion.outputFormat as OutputFormat;
  const format = formatOptions.find((f) => f.value === outputFormat)!;

  const handleFilesSelected = useCallback((selected: File[]) => {
    const imageFiles = selected.filter((f) => f.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      toast.error(t("convimg.invalid"));
      return;
    }
    setFiles(imageFiles);
    setResults([]);
    setZipBlob(null);
  }, [t]);

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setResults([]);
    setZipBlob(null);

    try {
      const converted: { original: File; converted: Blob; ext: string }[] = [];

      for (const file of files) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported");

        const img = new Image();
        const url = URL.createObjectURL(file);

        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;

            if (format.value === "jpeg") {
              ctx.fillStyle = "#ffffff";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            resolve();
          };
          img.onerror = reject;
          img.src = url;
        });

        const qualityVal = format.value === "png" ? undefined : quality;
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) =>
              b ? resolve(b) : reject(new Error("Conversion failed")),
            format.mime,
            qualityVal
          );
        });

        converted.push({ original: file, converted: blob, ext: format.ext });
      }

      setResults(converted);

      if (converted.length > 1) {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        for (const item of converted) {
          const baseName = getFileNameWithoutExtension(item.original.name);
          zip.file(`${baseName}${item.ext}`, item.converted);
        }
        const zipContent = await zip.generateAsync({ type: "blob" });
        setZipBlob(zipContent);
      }

      toast.success(
        t("convimg.success", { count: converted.length, format: format.label })
      );
    } catch (error) {
      console.error(error);
      toast.error(t("convimg.fail"));
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setResults([]);
    setZipBlob(null);
  };

  const totalOriginal = results.reduce((s, r) => s + r.original.size, 0);
  const totalConverted = results.reduce((s, r) => s + r.converted.size, 0);

  return (
    <div className="space-y-6">
      {files.length === 0 ? (
        <FileDropzone
          onFilesSelected={handleFilesSelected}
          accept={conversion.acceptMap}
          multiple
          formats={[conversion.fromLabel]}
          label={t("convroute.dropHint", { from: conversion.fromLabel })}
        />
      ) : results.length === 0 ? (
        <>
          {/* File list */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-t-primary font-medium">
                {t("convroute.filesSelected", { count: files.length })}
              </h3>
              <button
                onClick={reset}
                className="text-sm text-t-tertiary hover:text-red-400 transition-colors"
              >
                {t("ui.clearAll")}
              </button>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {files.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <span className="text-sm text-t-primary truncate max-w-[70%]">
                    {file.name}
                  </span>
                  <span className="text-sm text-t-tertiary">
                    {formatFileSize(file.size)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Output format indicator */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <h3 className="font-semibold text-t-primary">{t("convroute.outputFormat")}</h3>
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/20">
              <span className="text-sm font-bold text-accent">
                {format.label}
              </span>
            </div>

            {/* Quality slider for JPEG/WEBP */}
            {outputFormat !== "png" && (
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-t-secondary">{t("ui.quality")}</span>
                  <span className="text-sm font-medium text-t-primary">
                    {Math.round(quality * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={quality}
                  onChange={(e) => setQuality(parseFloat(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>
            )}
          </div>

          <ProcessButton
            onClick={handleProcess}
            loading={processing}
            disabled={files.length === 0}
            label={t("convroute.convertLabel", { format: format.label })}
            loadingLabel={t("ui.converting")}
          />
        </>
      ) : (
        <div className="space-y-6">
          {results.length > 1 && (
            <FileSizeCompare
              originalSize={totalOriginal}
              newSize={totalConverted}
            />
          )}

          <div className="glass rounded-2xl p-6">
            <h3 className="text-t-primary font-medium mb-4">{t("ui.results")}</h3>
            <div className="space-y-3">
              {results.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <span className="text-sm text-t-primary truncate flex-1 min-w-0">
                    {getFileNameWithoutExtension(r.original.name)}
                    {r.ext}
                  </span>
                  <span className="text-sm text-t-tertiary whitespace-nowrap ml-4">
                    {formatFileSize(r.converted.size)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            {results.length === 1 ? (
              <DownloadButton
                blob={results[0].converted}
                filename={`${getFileNameWithoutExtension(results[0].original.name)}${results[0].ext}`}
                label={t("ui.download")}
              />
            ) : zipBlob ? (
              <DownloadButton
                blob={zipBlob}
                filename="converted-images.zip"
                label={t("ui.downloadZip")}
              />
            ) : null}
            <button
              onClick={reset}
              className="px-6 py-3 rounded-xl font-semibold text-t-primary bg-bg-secondary hover:bg-border transition-colors"
            >
              {t("ui.convertMore")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
