"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProgressBar from "@/components/ProgressBar";
import {
  formatFileSize,
  getFileNameWithoutExtension,
  downloadBlob,
} from "@/lib/utils";

interface PageImage {
  pageNum: number;
  dataUrl: string;
  blob: Blob;
}

export default function PdfToImagesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [format, setFormat] = useState<"png" | "jpeg">("png");
  const [quality, setQuality] = useState(92);
  const [scale, setScale] = useState(2);
  const [images, setImages] = useState<PageImage[]>([]);
  const [, setPageCount] = useState(0);

  const handleFilesSelected = (files: File[]) => {
    setFile(files[0]);
    setImages([]);
    setProgress(0);
  };

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(5);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfjsLib = await import("pdfjs-dist" as any);
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      setProgress(10);

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPageCount(pdf.numPages);
      setProgress(20);

      const results: PageImage[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;

        await page.render({ canvasContext: ctx, viewport }).promise;

        const mimeType = format === "png" ? "image/png" : "image/jpeg";
        const qualityParam = format === "jpeg" ? quality / 100 : undefined;

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), mimeType, qualityParam);
        });

        const dataUrl = canvas.toDataURL(mimeType, qualityParam);
        results.push({ pageNum: i, dataUrl, blob });

        setProgress(20 + Math.round((i / pdf.numPages) * 75));
      }

      setImages(results);
      setProgress(100);
      toast.success(
        `Converted ${results.length} page${results.length > 1 ? "s" : ""} to ${format.toUpperCase()}!`,
      );
    } catch (error) {
      console.error(error);
      toast.error(
        "Failed to convert PDF. The file may be corrupted or password protected.",
      );
    } finally {
      setProcessing(false);
    }
  };

  const downloadSingle = (img: PageImage) => {
    const ext = format === "png" ? "png" : "jpg";
    const baseName = getFileNameWithoutExtension(file!.name);
    downloadBlob(img.blob, `${baseName}_page${img.pageNum}.${ext}`);
  };

  const downloadAll = async () => {
    if (images.length === 1) {
      downloadSingle(images[0]);
      return;
    }
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const ext = format === "png" ? "png" : "jpg";
    const baseName = getFileNameWithoutExtension(file!.name);
    images.forEach((img) => {
      zip.file(`${baseName}_page${img.pageNum}.${ext}`, img.blob);
    });
    const zipBlob = await zip.generateAsync({ type: "blob" });
    downloadBlob(zipBlob, `${baseName}_images.zip`);
  };

  const reset = () => {
    setFile(null);
    setImages([]);
    setProgress(0);
    setPageCount(0);
  };

  return (
    <ToolLayout
      toolName="PDF to Images"
      toolDescription="Convert PDF pages to high-quality PNG or JPG images."
    >
      {!file ? (
        <FileDropzone
          onFilesSelected={handleFilesSelected}
          accept={{ "application/pdf": [".pdf"] }}
          formats={["PDF"]}
        />
      ) : images.length === 0 ? (
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="font-medium text-brand-text">{file.name}</p>
                <p className="text-sm text-brand-muted">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <button
                onClick={reset}
                className="text-sm text-brand-muted hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>

          {/* Format selector */}
          <div className="glass rounded-xl p-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-brand-text mb-3">
                Output Format
              </p>
              <div className="flex gap-3">
                {(["png", "jpeg"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      format === f
                        ? "bg-brand-indigo text-white"
                        : "bg-white/5 text-brand-muted hover:bg-white/10"
                    }`}
                  >
                    {f === "png" ? "PNG (lossless)" : "JPG (smaller file)"}
                  </button>
                ))}
              </div>
            </div>

            {format === "jpeg" && (
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-brand-muted">Quality</span>
                  <span className="text-brand-text font-medium">
                    {quality}%
                  </span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(Number(e.target.value))}
                  className="w-full accent-brand-indigo"
                />
              </div>
            )}

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-brand-muted">Resolution</span>
                <span className="text-brand-text font-medium">{scale}x</span>
              </div>
              <input
                type="range"
                min={1}
                max={4}
                step={0.5}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-full accent-brand-indigo"
              />
              <div className="flex justify-between text-xs text-brand-muted mt-1">
                <span>1x (Fast)</span>
                <span>4x (Best quality)</span>
              </div>
            </div>
          </div>

          {processing && (
            <ProgressBar progress={progress} label="Converting pages..." />
          )}

          {!processing && (
            <button
              onClick={handleProcess}
              className="w-full sm:w-auto px-8 py-3 rounded-xl font-semibold text-white bg-gradient-brand hover:shadow-lg hover:shadow-brand-indigo/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Convert to Images
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-brand-muted">
              {images.length} page{images.length > 1 ? "s" : ""} converted
            </p>
            <div className="flex gap-3">
              <button
                onClick={downloadAll}
                className="px-6 py-2.5 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
              >
                {images.length > 1 ? "Download All (ZIP)" : "Download"}
              </button>
              <button
                onClick={reset}
                className="px-6 py-2.5 rounded-xl font-semibold text-brand-text bg-white/5 hover:bg-white/10 transition-colors"
              >
                Convert Another
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((img) => (
              <div key={img.pageNum} className="glass rounded-xl p-3 group">
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.dataUrl}
                    alt={`Page ${img.pageNum}`}
                    className="w-full rounded-lg border border-white/10"
                  />
                  <button
                    onClick={() => downloadSingle(img)}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white text-sm font-medium"
                  >
                    Download
                  </button>
                </div>
                <p className="text-xs text-brand-muted mt-2 text-center">
                  Page {img.pageNum} &middot; {formatFileSize(img.blob.size)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
