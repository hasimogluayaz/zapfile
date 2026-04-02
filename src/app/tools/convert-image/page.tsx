"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProcessButton from "@/components/ProcessButton";
import DownloadButton from "@/components/DownloadButton";
import FileSizeCompare from "@/components/FileSizeCompare";
import { formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";

type OutputFormat = "png" | "jpeg" | "webp";

const formatOptions: { value: OutputFormat; label: string; mime: string; ext: string }[] = [
  { value: "png", label: "PNG", mime: "image/png", ext: ".png" },
  { value: "jpeg", label: "JPG", mime: "image/jpeg", ext: ".jpg" },
  { value: "webp", label: "WEBP", mime: "image/webp", ext: ".webp" },
];

export default function ConvertImagePage() {
  const [files, setFiles] = useState<File[]>([]);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("png");
  const [quality, setQuality] = useState(0.92);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<{ original: File; converted: Blob; ext: string }[]>([]);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);

  const handleFilesSelected = useCallback((selected: File[]) => {
    const imageFiles = selected.filter((f) =>
      f.type.startsWith("image/")
    );
    if (imageFiles.length === 0) {
      toast.error("Please select valid image files.");
      return;
    }
    setFiles(imageFiles);
    setResults([]);
    setZipBlob(null);
  }, []);

  const handleProcess = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    setResults([]);
    setZipBlob(null);

    try {
      const format = formatOptions.find((f) => f.value === outputFormat)!;
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

            // For JPEG, fill white background (no transparency)
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
            (b) => (b ? resolve(b) : reject(new Error("Conversion failed"))),
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

      toast.success(`Converted ${converted.length} image(s) to ${format.label}!`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to convert one or more images.");
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
    <ToolLayout
      toolName="Convert Image"
      toolDescription="Convert between PNG, JPG, and WebP formats. Batch conversion supported."
    >
      <div className="space-y-6">
        {files.length === 0 ? (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{
              "image/jpeg": [".jpg", ".jpeg"],
              "image/png": [".png"],
              "image/webp": [".webp"],
              "image/avif": [".avif"],
            }}
            multiple
            formats={["JPG", "PNG", "WEBP", "AVIF"]}
            label="Drop your images here or click to browse"
          />
        ) : results.length === 0 ? (
          <>
            {/* File list */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-brand-text font-medium">
                  {files.length} image{files.length > 1 ? "s" : ""} selected
                </h3>
                <button onClick={reset} className="text-sm text-brand-muted hover:text-red-400 transition-colors">
                  Clear All
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-sm text-brand-text truncate max-w-[70%]">{file.name}</span>
                    <span className="text-sm text-brand-muted">{formatFileSize(file.size)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Format selection */}
            <div className="glass rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-brand-text">Convert to</h3>
              <div className="grid grid-cols-3 gap-3">
                {formatOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setOutputFormat(opt.value)}
                    className={`py-3 px-4 rounded-xl text-sm font-bold transition-all ${
                      outputFormat === opt.value
                        ? "bg-brand-indigo text-white shadow-lg shadow-brand-indigo/25"
                        : "bg-white/5 text-brand-muted hover:bg-white/10 hover:text-brand-text"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Quality slider for JPEG/WEBP */}
              {outputFormat !== "png" && (
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-brand-muted">Quality</span>
                    <span className="text-sm font-medium text-brand-text">{Math.round(quality * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={quality}
                    onChange={(e) => setQuality(parseFloat(e.target.value))}
                    className="w-full accent-brand-indigo"
                  />
                </div>
              )}
            </div>

            <ProcessButton
              onClick={handleProcess}
              loading={processing}
              disabled={files.length === 0}
              label={`Convert to ${formatOptions.find((f) => f.value === outputFormat)?.label}`}
              loadingLabel="Converting..."
            />
          </>
        ) : (
          <div className="space-y-6">
            {results.length > 1 && (
              <FileSizeCompare originalSize={totalOriginal} newSize={totalConverted} />
            )}

            <div className="glass rounded-xl p-6">
              <h3 className="text-brand-text font-medium mb-4">Results</h3>
              <div className="space-y-3">
                {results.map((r, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-sm text-brand-text truncate flex-1 min-w-0">
                      {getFileNameWithoutExtension(r.original.name)}{r.ext}
                    </span>
                    <span className="text-sm text-brand-muted whitespace-nowrap ml-4">
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
                  label="Download Converted Image"
                />
              ) : zipBlob ? (
                <DownloadButton
                  blob={zipBlob}
                  filename={`converted-images.zip`}
                  label="Download All as ZIP"
                />
              ) : null}
              <button
                onClick={reset}
                className="px-6 py-3 rounded-xl font-semibold text-brand-text bg-white/5 hover:bg-white/10 transition-colors"
              >
                Convert More
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
