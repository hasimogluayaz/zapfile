"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProcessButton from "@/components/ProcessButton";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import FileSizeCompare from "@/components/FileSizeCompare";
import { formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";

export default function CompressPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(0);

  const handleFilesSelected = useCallback((files: File[]) => {
    const selected = files[0];
    if (!selected) return;

    if (selected.type !== "application/pdf") {
      toast.error("Please select a valid PDF file.");
      return;
    }

    setFile(selected);
    setOriginalSize(selected.size);
    setResultBlob(null);
    setCompressedSize(0);
    setProgress(0);
  }, []);

  const handleCompress = useCallback(async () => {
    if (!file) return;

    setProcessing(true);
    setProgress(0);
    setResultBlob(null);

    try {
      setProgress(10);

      const arrayBuffer = await file.arrayBuffer();
      setProgress(25);

      const { PDFDocument } = await import("pdf-lib");
      setProgress(35);

      // Load the original PDF
      const srcDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
      });
      setProgress(50);

      // Create a new document and copy all pages to remove unused objects
      const compressedDoc = await PDFDocument.create();
      setProgress(60);

      const pageCount = srcDoc.getPageCount();
      const pageIndices = Array.from({ length: pageCount }, (_, i) => i);
      const copiedPages = await compressedDoc.copyPages(srcDoc, pageIndices);
      setProgress(75);

      for (const page of copiedPages) {
        compressedDoc.addPage(page);
      }
      setProgress(85);

      // Save with object-stream optimization to reduce file size
      const compressedBytes = await compressedDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
      });
      setProgress(95);

      const blob = new Blob([compressedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResultBlob(blob);
      setCompressedSize(blob.size);
      setProgress(100);

      if (blob.size < file.size) {
        toast.success(
          `Compressed successfully! Saved ${formatFileSize(file.size - blob.size)}.`
        );
      } else {
        toast.success(
          "Processing complete. This PDF was already well-optimized."
        );
      }
    } catch (error) {
      console.error("Compression error:", error);
      toast.error(
        "Failed to compress PDF. The file may be corrupted or encrypted."
      );
    } finally {
      setProcessing(false);
    }
  }, [file]);

  const handleReset = useCallback(() => {
    setFile(null);
    setResultBlob(null);
    setOriginalSize(0);
    setCompressedSize(0);
    setProgress(0);
  }, []);

  const outputFilename = file
    ? `${getFileNameWithoutExtension(file.name)}-compressed.pdf`
    : "compressed.pdf";

  return (
    <ToolLayout
      toolName="Compress PDF"
      toolDescription="Reduce the file size of your PDF documents while preserving quality. Processing happens entirely in your browser."
    >
      <div className="space-y-6">
        {/* File Drop Area */}
        {!file && (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{ "application/pdf": [".pdf"] }}
            multiple={false}
            label="Drop your PDF here or click to browse"
            formats={["pdf"]}
          />
        )}

        {/* File Info */}
        {file && (
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-brand-text font-medium">{file.name}</p>
                  <p className="text-sm text-brand-muted">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-brand-muted hover:text-brand-text transition-colors p-2 rounded-lg hover:bg-white/5"
                title="Remove file"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {processing && (
          <ProgressBar progress={progress} label="Compressing PDF..." />
        )}

        {/* Size Comparison */}
        {resultBlob && originalSize > 0 && compressedSize > 0 && (
          <FileSizeCompare originalSize={originalSize} newSize={compressedSize} />
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-4">
          {file && !resultBlob && (
            <ProcessButton
              onClick={handleCompress}
              disabled={!file}
              loading={processing}
              label="Compress PDF"
              loadingLabel="Compressing..."
            />
          )}
          {resultBlob && (
            <>
              <DownloadButton
                blob={resultBlob}
                filename={outputFilename}
                label="Download Compressed PDF"
              />
              <button
                onClick={handleReset}
                className="px-6 py-3 rounded-xl font-semibold text-brand-muted border border-white/10 hover:text-brand-text hover:border-white/20 transition-all duration-300"
              >
                Compress Another
              </button>
            </>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
