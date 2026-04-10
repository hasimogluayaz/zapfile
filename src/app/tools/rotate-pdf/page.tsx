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
import { useI18n } from "@/lib/i18n";

type RotationDegrees = 90 | 180 | 270;
type RotationMode = "all" | "specific";

export default function RotatePdfPage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [rotationDegrees, setRotationDegrees] = useState<RotationDegrees>(90);
  const [rotationMode, setRotationMode] = useState<RotationMode>("all");
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
      setRotationMode("all");
      setSelectedPages(new Set());
    } catch (err) {
      toast.error(t("rotpdf.loadFail"));
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

  const handleProcess = async () => {
    if (!file) return;

    setProcessing(true);
    setProgress(0);
    setResultBlob(null);

    try {
      const { PDFDocument, degrees } = await import("pdf-lib");
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
      });

      const pages = pdfDoc.getPages();

      for (let i = 0; i < pages.length; i++) {
        const shouldRotate =
          rotationMode === "all" || selectedPages.has(i);

        if (shouldRotate) {
          const page = pages[i];
          const currentRotation = page.getRotation().angle;
          const newRotation = (currentRotation + rotationDegrees) % 360;
          page.setRotation(degrees(newRotation));
        }

        setProgress(((i + 1) / pages.length) * 90);
      }

      setProgress(95);
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setProgress(100);

      const baseName = getFileNameWithoutExtension(file.name);
      const filename = `${baseName}_rotated.pdf`;
      setResultBlob(blob);
      setResultFilename(filename);

      const rotatedCount =
        rotationMode === "all" ? pages.length : selectedPages.size;
      toast.success(
        t("rotpdf.success", { count: rotatedCount, deg: rotationDegrees })
      );
    } catch (err) {
      toast.error(t("rotpdf.fail"));
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

  const rotationOptions: { value: RotationDegrees; label: string }[] = [
    { value: 90, label: t("rotpdf.90cw") },
    { value: 180, label: t("rotpdf.180") },
    { value: 270, label: t("rotpdf.270cw") },
  ];

  return (
    <ToolLayout
      toolName="Rotate PDF"
      toolDescription="Rotate PDF pages by 90, 180, or 270 degrees clockwise. Rotate all pages at once or select specific pages."
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
                {t("rotpdf.changeFile")}
              </button>
            </div>

            {/* Rotation Angle */}
            <div className="glass rounded-xl p-6 space-y-4">
              <h3 className="text-brand-text font-semibold">{t("rotpdf.angle")}</h3>
              <div className="flex gap-3">
                {rotationOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setRotationDegrees(opt.value)}
                    className={`
                      flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200
                      flex flex-col items-center gap-2
                      ${
                        rotationDegrees === opt.value
                          ? "bg-brand-indigo text-white shadow-lg shadow-brand-indigo/25"
                          : "bg-white/5 text-brand-muted hover:bg-white/10 hover:text-brand-text"
                      }
                    `}
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                      style={{
                        transform: `rotate(${opt.value}deg)`,
                      }}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"
                      />
                    </svg>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rotation Mode */}
            <div className="glass rounded-xl p-6 space-y-4">
              <h3 className="text-brand-text font-semibold">
                {t("rotpdf.pages")}
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={() => setRotationMode("all")}
                  className={`
                    flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200
                    ${
                      rotationMode === "all"
                        ? "bg-brand-indigo text-white shadow-lg shadow-brand-indigo/25"
                        : "bg-white/5 text-brand-muted hover:bg-white/10 hover:text-brand-text"
                    }
                  `}
                >
                  {t("rotpdf.allPages")}
                </button>
                <button
                  onClick={() => setRotationMode("specific")}
                  className={`
                    flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200
                    ${
                      rotationMode === "specific"
                        ? "bg-brand-indigo text-white shadow-lg shadow-brand-indigo/25"
                        : "bg-white/5 text-brand-muted hover:bg-white/10 hover:text-brand-text"
                    }
                  `}
                >
                  {t("rotpdf.specific")}
                </button>
              </div>

              {/* Page selector for specific mode */}
              {rotationMode === "specific" && pageCount > 0 && (
                <div className="space-y-3 pt-2">
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
                    {t("rotpdf.selected", { count: selectedPages.size })}
                  </p>
                </div>
              )}
            </div>

            {/* Progress */}
            {processing && (
              <ProgressBar progress={progress} label={t("rotpdf.rotating")} />
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-4">
              <ProcessButton
                onClick={handleProcess}
                disabled={
                  !file ||
                  (rotationMode === "specific" && selectedPages.size === 0)
                }
                loading={processing}
                label={t("rotpdf.button", { deg: rotationDegrees })}
                loadingLabel={t("rotpdf.rotating")}
              />

              {resultBlob && (
                <DownloadButton
                  blob={resultBlob}
                  filename={resultFilename}
                  label={`${t("ui.download")} (${formatFileSize(resultBlob.size)})`}
                />
              )}
            </div>

            {/* Size comparison */}
            {resultBlob && file && (
              <FileSizeCompare
                originalSize={file.size}
                newSize={resultBlob.size}
              />
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
