"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import { formatFileSize } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface ImageItem {
  file: File;
  preview: string;
  id: string;
}

export default function ImageToPdfPage() {
  const { t } = useI18n();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [pageSize, setPageSize] = useState<"a4" | "letter" | "fit">("a4");

  const handleFilesSelected = useCallback((files: File[]) => {
    const newImages: ImageItem[] = files.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
      id: Math.random().toString(36).slice(2),
    }));
    setImages((prev) => [...prev, ...newImages]);
    setResultBlob(null);
  }, []);

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
    setResultBlob(null);
  };

  const moveImage = (id: string, direction: "up" | "down") => {
    setImages((prev) => {
      const idx = prev.findIndex((img) => img.id === id);
      if (idx === -1) return prev;
      const newArr = [...prev];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= newArr.length) return prev;
      [newArr[idx], newArr[swapIdx]] = [newArr[swapIdx], newArr[idx]];
      return newArr;
    });
  };

  const handleProcess = async () => {
    if (images.length === 0) return;
    setProcessing(true);
    setProgress(10);

    try {
      const { PDFDocument } = await import("pdf-lib");
      setProgress(20);

      const pdfDoc = await PDFDocument.create();

      // Page dimensions in points (1 point = 1/72 inch)
      const A4 = { width: 595.28, height: 841.89 };
      const LETTER = { width: 612, height: 792 };

      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        setProgress(20 + Math.round(((i + 1) / images.length) * 70));

        // Load image as array buffer
        const arrayBuffer = await item.file.arrayBuffer();
        const mimeType = item.file.type;

        let embeddedImage;
        if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
          embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
        } else {
          // For PNG and WEBP, convert to PNG via canvas first
          const bitmap = await createImageBitmap(item.file);
          const canvas = document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext("2d")!;
          ctx.drawImage(bitmap, 0, 0);
          bitmap.close();
          const pngBlob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), "image/png"));
          const pngBuffer = await pngBlob.arrayBuffer();
          embeddedImage = await pdfDoc.embedPng(pngBuffer);
        }

        let pageWidth: number;
        let pageHeight: number;

        if (pageSize === "fit") {
          pageWidth = embeddedImage.width;
          pageHeight = embeddedImage.height;
        } else if (pageSize === "a4") {
          pageWidth = A4.width;
          pageHeight = A4.height;
        } else {
          pageWidth = LETTER.width;
          pageHeight = LETTER.height;
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Scale image to fit page with padding
        const padding = pageSize === "fit" ? 0 : 20;
        const maxW = pageWidth - padding * 2;
        const maxH = pageHeight - padding * 2;
        const scale = Math.min(maxW / embeddedImage.width, maxH / embeddedImage.height);
        const imgW = embeddedImage.width * scale;
        const imgH = embeddedImage.height * scale;
        const x = (pageWidth - imgW) / 2;
        const y = (pageHeight - imgH) / 2;

        page.drawImage(embeddedImage, { x, y, width: imgW, height: imgH });
      }

      setProgress(95);
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResultBlob(blob);
      setProgress(100);
      toast.success(t("img2pdf.success").replace("{count}", String(images.length)));
    } catch (error) {
      console.error(error);
      toast.error(t("img2pdf.fail"));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout
      toolName="Image to PDF"
      toolDescription="Convert JPG, PNG, or WEBP images to a PDF document. Combine multiple images into one PDF."
    >
      <div className="space-y-6">
        <FileDropzone
          onFilesSelected={handleFilesSelected}
          accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp"] }}
          formats={["JPG", "PNG", "WEBP"]}
          multiple
        />

        {images.length > 0 && (
          <>
            {/* Page size selector */}
            <div className="glass rounded-xl p-4">
              <p className="text-sm font-medium text-brand-text mb-3">{t("img2pdf.pageSize")}</p>
              <div className="flex gap-3">
                {(["a4", "letter", "fit"] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setPageSize(size)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      pageSize === size
                        ? "bg-brand-indigo text-white"
                        : "bg-white/5 text-brand-muted hover:bg-white/10"
                    }`}
                  >
                    {size === "a4" ? "A4" : size === "letter" ? "Letter" : t("img2pdf.fitToImage")}
                  </button>
                ))}
              </div>
            </div>

            {/* Image list */}
            <div className="glass rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-brand-text">{t("img2pdf.dragReorder").replace("{count}", String(images.length))}</p>
              {images.map((img, idx) => (
                <div key={img.id} className="flex items-center gap-3 bg-white/5 rounded-lg p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.preview} alt={img.file.name} className="w-14 h-14 object-cover rounded-lg flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-brand-text truncate">{img.file.name}</p>
                    <p className="text-xs text-brand-muted">{formatFileSize(img.file.size)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveImage(img.id, "up")}
                      disabled={idx === 0}
                      className="p-1.5 rounded text-brand-muted hover:text-brand-text disabled:opacity-30 transition-colors"
                      title={t("ui.moveUp")}
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveImage(img.id, "down")}
                      disabled={idx === images.length - 1}
                      className="p-1.5 rounded text-brand-muted hover:text-brand-text disabled:opacity-30 transition-colors"
                      title={t("ui.moveDown")}
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="p-1.5 rounded text-brand-muted hover:text-red-400 transition-colors"
                      title={t("ui.remove")}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {processing && <ProgressBar progress={progress} label={t("img2pdf.creating")} />}

            {!processing && !resultBlob && (
              <button
                onClick={handleProcess}
                className="w-full sm:w-auto px-8 py-3 rounded-xl font-semibold text-white bg-gradient-brand hover:shadow-lg hover:shadow-brand-indigo/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                {t("img2pdf.convert")}
              </button>
            )}

            {resultBlob && (
              <div className="flex flex-wrap gap-4">
                <DownloadButton blob={resultBlob} filename="images.pdf" label="Download PDF" />
                <button
                  onClick={() => setResultBlob(null)}
                  className="px-6 py-3 rounded-xl font-semibold text-brand-text bg-white/5 hover:bg-white/10 transition-colors"
                >
                  {t("img2pdf.again")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </ToolLayout>
  );
}
