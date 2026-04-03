"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProcessButton from "@/components/ProcessButton";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";

export default function PdfToExcelPage() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const handleFilesSelected = useCallback((files: File[]) => {
    setFile(files[0] || null);
    setResultBlob(null);
    setProgress(0);
  }, []);

  const handleConvert = useCallback(async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(10);

    try {
      const arrayBuffer = await file.arrayBuffer();
      setProgress(20);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfjsLib = await import("pdfjs-dist" as any);
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setProgress(40);

      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();

      for (let i = 0; i < pdf.numPages; i++) {
        const page = await pdf.getPage(i + 1);
        const textContent = await page.getTextContent();

        // Group text items by Y position to detect rows
        const items = textContent.items as {
          str: string;
          transform: number[];
        }[];
        const rows: Map<number, string[]> = new Map();

        items.forEach((item) => {
          const y = Math.round(item.transform[5]);
          if (!rows.has(y)) rows.set(y, []);
          rows.get(y)!.push(item.str);
        });

        // Sort by Y descending (PDF coordinate system) and build rows
        const sortedRows = Array.from(rows.entries())
          .sort(([a], [b]) => b - a)
          .map(([, cells]) => cells);

        const worksheet = XLSX.utils.aoa_to_sheet(
          sortedRows.length > 0
            ? sortedRows
            : [["No extractable data on this page"]],
        );
        XLSX.utils.book_append_sheet(workbook, worksheet, `Page ${i + 1}`);

        setProgress(40 + Math.round((i / pdf.numPages) * 50));
      }

      const xlsxData = XLSX.write(workbook, {
        bookType: "xlsx",
        type: "array",
      });
      const blob = new Blob([xlsxData], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      setResultBlob(blob);
      setProgress(100);
      toast.success("Conversion complete!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to convert PDF to Excel.");
    } finally {
      setProcessing(false);
    }
  }, [file]);

  return (
    <ToolLayout
      toolName="PDF to Excel"
      toolDescription="Extract tables and data from PDF files to Excel (XLSX) spreadsheets."
    >
      <div className="space-y-6">
        {!file ? (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{ "application/pdf": [".pdf"] }}
            formats={["PDF"]}
          />
        ) : (
          <div className="glass rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-t-primary">
                  {file.name}
                </p>
                <p className="text-xs text-t-tertiary">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setResultBlob(null);
                }}
                className="text-xs text-t-tertiary hover:text-red-500 transition-colors"
              >
                ✕
              </button>
            </div>

            {progress > 0 && <ProgressBar progress={progress} />}

            {!resultBlob ? (
              <ProcessButton
                onClick={handleConvert}
                loading={processing}
                label="Convert to Excel"
              />
            ) : (
              <DownloadButton
                blob={resultBlob}
                filename={file.name.replace(".pdf", ".xlsx")}
              />
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
