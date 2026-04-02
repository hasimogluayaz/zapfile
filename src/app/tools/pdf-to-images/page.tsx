"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProcessButton from "@/components/ProcessButton";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import { formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";

export default function PdfToImagesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFilename, setResultFilename] = useState("");

  const handleFileSelected = useCallback(async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;

    setFile(selected);
    setResultBlob(null);
    setProgress(0);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const arrayBuffer = await selected.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
      });
      const count = pdfDoc.getPageCount();
      setPageCount(count);

      const allPages = new Set<number>();
      for (let i = 0; i < count; i++) {
        allPages.add(i);
      }
      setSelectedPages(allPages);
    } catch (err) {
      toast.error("Failed to read PDF file. It may be corrupted.");
      console.error(err);
    }
  }, []);

  const togglePage = (index: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => {
    const allPages = new Set<number>();
    for (let i = 0; i < pageCount; i++) {
      allPages.add(i);
    }
    setSelectedPages(allPages);
  };

  const selectNone = () => {
    setSelectedPages(new Set());
  };

  const handleProcess = async () => {
    if (!file || selectedPages.size === 0) return;

    setProcessing(true);
    setProgress(0);
    setResultBlob(null);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const JSZip = (await import("jszip")).default;

      const arrayBuffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
      });

      const sortedPages = Array.from(selectedPages).sort((a, b) => a - b);
      const zip = new JSZip();
      const baseName = getFileNameWithoutExtension(file.name);

      for (let i = 0; i < sortedPages.length; i++) {
        const pageIndex = sortedPages[i];
        const newDoc = await PDFDocument.create();
        const [copiedPage] = await newDoc.copyPages(srcDoc, [pageIndex]);
        newDoc.addPage(copiedPage);

        const pdfBytes = await newDoc.save();
        zip.file(`${baseName}_page_${pageIndex + 1}.pdf`, pdfBytes);

        setProgress(((i + 1) / sortedPages.length) * 90);
      }

      setProgress(95);
      const zipBlob = await zip.generateAsync({ type: "blob" });
      setProgress(100);

      const filename = `${baseName}_pages.zip`;
      setResultBlob(zipBlob);
      setResultFilename(filename);
      toast.success(
        `Extracted ${sortedPages.length} page${sortedPages.length > 1 ? "s" : ""} successfully!`
      );
    } catch (err) {
      toast.error("Failed to extract pages. Please try again.");
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPageCount(0);
    setSelectedPages(new Set());
    setResultBlob(null);
    setProgress(0);
  };

  return (
    <ToolLayout
      toolName="PDF to Images"
      toolDescription="Extract individual pages from a PDF file. Each page is saved as a separate PDF, packaged in a convenient ZIP download."
    >
      <div className="space-y-6">
        {/* File Drop */}
        {!file ? (
          <FileDropzone
            onFilesSelected={handleFileSelected}
            accept={{ "application/pdf": [".pdf"] }}
            multiple={false}
            label="Drop your PDF file here or click to browse"
            formats={["pdf"]}
          />
        ) : (
          <div className="space-y-6">
            {/* File info */}
            <div className="glass rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-indigo/20 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-brand-indigo"
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
                  <p className="text-brand-text font-medium text-sm">
                    {file.name}
                  </p>
                  <p className="text-brand-muted text-xs">
                    {formatFileSize(file.size)} &middot; {pageCount} page
                    {pageCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-brand-muted hover:text-brand-text transition-colors text-sm"
              >
                Change file
              </button>
            </div>

            {/* Page selection */}
            {pageCount > 0 && (
              <div className="glass rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-brand-text font-semibold">
                    Select Pages to Extract
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="text-xs px-3 py-1 rounded-lg bg-white/5 text-brand-muted hover:text-brand-text hover:bg-white/10 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={selectNone}
                      className="text-xs px-3 py-1 rounded-lg bg-white/5 text-brand-muted hover:text-brand-text hover:bg-white/10 transition-colors"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                  {Array.from({ length: pageCount }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => togglePage(i)}
                      className={`
                        aspect-square rounded-lg text-sm font-medium transition-all duration-200
                        ${
                          selectedPages.has(i)
                            ? "bg-brand-indigo text-white shadow-lg shadow-brand-indigo/25"
                            : "bg-white/5 text-brand-muted hover:bg-white/10 hover:text-brand-text"
                        }
                      `}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <p className="text-xs text-brand-muted">
                  {selectedPages.size} of {pageCount} page
                  {pageCount !== 1 ? "s" : ""} selected
                </p>
              </div>
            )}

            {/* Progress */}
            {processing && (
              <ProgressBar progress={progress} label="Extracting pages..." />
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-4">
              <ProcessButton
                onClick={handleProcess}
                disabled={selectedPages.size === 0 || !file}
                loading={processing}
                label="Extract Pages"
                loadingLabel="Extracting..."
              />

              {resultBlob && (
                <DownloadButton
                  blob={resultBlob}
                  filename={resultFilename}
                  label={`Download ZIP (${formatFileSize(resultBlob.size)})`}
                />
              )}
            </div>

            {/* Result info */}
            {resultBlob && (
              <div className="glass rounded-xl p-4">
                <p className="text-sm text-brand-muted">
                  Each selected page has been extracted as an individual PDF file
                  and packaged into a ZIP archive for easy download.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
