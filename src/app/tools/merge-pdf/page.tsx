"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProcessButton from "@/components/ProcessButton";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import { formatFileSize } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface PdfFileEntry {
  id: string;
  file: File;
}

export default function MergePdfPage() {
  const { t } = useI18n();
  const [files, setFiles] = useState<PdfFileEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const handleFilesSelected = useCallback((selectedFiles: File[]) => {
    const pdfFiles = selectedFiles.filter(
      (f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")
    );

    if (pdfFiles.length !== selectedFiles.length) {
      toast.error(t("merge.skipped"));
    }

    if (pdfFiles.length === 0) {
      toast.error(t("merge.invalid"));
      return;
    }

    const newEntries: PdfFileEntry[] = pdfFiles.map((file) => ({
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      file,
    }));

    setFiles((prev) => [...prev, ...newEntries]);
    setResultBlob(null);
    setProgress(0);
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setResultBlob(null);
  }, []);

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    setFiles((prev) => {
      const updated = [...prev];
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
      return updated;
    });
    setResultBlob(null);
  }, []);

  const handleMoveDown = useCallback((index: number) => {
    setFiles((prev) => {
      if (index >= prev.length - 1) return prev;
      const updated = [...prev];
      [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
      return updated;
    });
    setResultBlob(null);
  }, []);

  const handleMerge = useCallback(async () => {
    if (files.length < 2) {
      toast.error(t("merge.addPdf"));
      return;
    }

    setProcessing(true);
    setProgress(0);
    setResultBlob(null);

    try {
      const { PDFDocument } = await import("pdf-lib");
      setProgress(10);

      const mergedDoc = await PDFDocument.create();
      const totalFiles = files.length;

      for (let i = 0; i < totalFiles; i++) {
        const entry = files[i];
        const arrayBuffer = await entry.file.arrayBuffer();
        setProgress(10 + ((i + 0.5) / totalFiles) * 70);

        const srcDoc = await PDFDocument.load(arrayBuffer, {
          ignoreEncryption: true,
        });

        const pageCount = srcDoc.getPageCount();
        const pageIndices = Array.from({ length: pageCount }, (_, idx) => idx);
        const copiedPages = await mergedDoc.copyPages(srcDoc, pageIndices);

        for (const page of copiedPages) {
          mergedDoc.addPage(page);
        }

        setProgress(10 + ((i + 1) / totalFiles) * 70);
      }

      setProgress(85);

      const mergedBytes = await mergedDoc.save({
        useObjectStreams: true,
      });

      setProgress(95);

      const blob = new Blob([mergedBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResultBlob(blob);
      setProgress(100);

      toast.success(
        t("merge.success", { count: totalFiles })
      );
    } catch (error) {
      console.error("Merge error:", error);
      toast.error(
        t("merge.fail")
      );
    } finally {
      setProcessing(false);
    }
  }, [files]);

  const handleReset = useCallback(() => {
    setFiles([]);
    setResultBlob(null);
    setProgress(0);
  }, []);

  return (
    <ToolLayout
      toolName="Merge PDF"
      toolDescription="Combine multiple PDF files into a single document. Drag and drop your files, reorder them, and merge."
    >
      <div className="space-y-6">
        {/* File Drop Area */}
        <FileDropzone
          onFilesSelected={handleFilesSelected}
          accept={{ "application/pdf": [".pdf"] }}
          multiple={true}
          label="Drop your PDF files here or click to browse"
          formats={["pdf"]}
        />

        {/* File List */}
        {files.length > 0 && (
          <div className="glass rounded-xl p-6 space-y-3">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-brand-text font-semibold">
                {t("merge.filesToMerge", { count: files.length })}
              </h3>
              <button
                onClick={handleReset}
                className="text-sm text-brand-muted hover:text-red-400 transition-colors"
              >
                Clear All
              </button>
            </div>

            <div className="space-y-2">
              {files.map((entry, index) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors"
                >
                  {/* Order number */}
                  <span className="text-sm text-brand-muted font-mono w-6 text-center shrink-0">
                    {index + 1}
                  </span>

                  {/* File icon */}
                  <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                    <svg
                      className="w-5 h-5 text-red-400"
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

                  {/* File name and size */}
                  <div className="flex-1 min-w-0">
                    <p className="text-brand-text text-sm font-medium truncate">
                      {entry.file.name}
                    </p>
                    <p className="text-xs text-brand-muted">
                      {formatFileSize(entry.file.size)}
                    </p>
                  </div>

                  {/* Reorder buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className={`p-1.5 rounded-md transition-colors ${
                        index === 0
                          ? "text-white/10 cursor-not-allowed"
                          : "text-brand-muted hover:text-brand-text hover:bg-white/5"
                      }`}
                      title="Move up"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === files.length - 1}
                      className={`p-1.5 rounded-md transition-colors ${
                        index === files.length - 1
                          ? "text-white/10 cursor-not-allowed"
                          : "text-brand-muted hover:text-brand-text hover:bg-white/5"
                      }`}
                      title="Move down"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemoveFile(entry.id)}
                    className="p-1.5 rounded-md text-brand-muted hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                    aria-label={t("merge.removeFile")}
                    title={t("merge.removeFile")}
                  >
                    <svg
                      className="w-4 h-4"
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
              ))}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {processing && (
          <ProgressBar progress={progress} label={t("merge.mergingPdfs")} />
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-4">
          {files.length >= 2 && !resultBlob && (
            <ProcessButton
              onClick={handleMerge}
              disabled={files.length < 2}
              loading={processing}
              label={t("merge.button", { count: files.length })}
              loadingLabel={t("merge.merging")}
            />
          )}
          {resultBlob && (
            <>
              <DownloadButton
                blob={resultBlob}
                filename="merged.pdf"
                label={t("merge.download")}
              />
              <button
                onClick={handleReset}
                className="px-6 py-3 rounded-xl font-semibold text-brand-muted border border-white/10 hover:text-brand-text hover:border-white/20 transition-all duration-300"
              >
                {t("merge.more")}
              </button>
            </>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
