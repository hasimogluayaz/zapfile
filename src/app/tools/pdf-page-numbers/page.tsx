"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProcessButton from "@/components/ProcessButton";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

type Position =
  | "bottom-center"
  | "bottom-right"
  | "bottom-left"
  | "top-center"
  | "top-right"
  | "top-left";

export default function PdfPageNumbersPage() {
  const [file, setFile] = useState<File | null>(null);
  const [position, setPosition] = useState<Position>("bottom-center");
  const [startFrom, setStartFrom] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const positions: { value: Position; label: string }[] = [
    { value: "bottom-center", label: "Bottom Center" },
    { value: "bottom-left", label: "Bottom Left" },
    { value: "bottom-right", label: "Bottom Right" },
    { value: "top-center", label: "Top Center" },
    { value: "top-left", label: "Top Left" },
    { value: "top-right", label: "Top Right" },
  ];

  const handleFilesSelected = useCallback((files: File[]) => {
    setFile(files[0] || null);
    setResultBlob(null);
    setProgress(0);
  }, []);

  const handleAddPageNumbers = useCallback(async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(10);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      setProgress(30);

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const { width, height } = page.getSize();
        const pageNum = i + startFrom;
        const text = `${pageNum}`;
        const textWidth = font.widthOfTextAtSize(text, 10);

        let x = 0;
        let y = 0;

        switch (position) {
          case "bottom-center":
            x = (width - textWidth) / 2;
            y = 30;
            break;
          case "bottom-left":
            x = 40;
            y = 30;
            break;
          case "bottom-right":
            x = width - textWidth - 40;
            y = 30;
            break;
          case "top-center":
            x = (width - textWidth) / 2;
            y = height - 40;
            break;
          case "top-left":
            x = 40;
            y = height - 40;
            break;
          case "top-right":
            x = width - textWidth - 40;
            y = height - 40;
            break;
        }

        page.drawText(text, {
          x,
          y,
          size: 10,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });

        setProgress(30 + Math.round((i / pages.length) * 60));
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: "application/pdf" });
      setResultBlob(blob);
      setProgress(100);
      toast.success("Page numbers added!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add page numbers.");
    } finally {
      setProcessing(false);
    }
  }, [file, position, startFrom]);

  return (
    <ToolLayout
      toolName="PDF Page Numbers"
      toolDescription="Add page numbers to your PDF document. Choose position and starting number."
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-t-secondary block mb-2">
                  Position
                </label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value as Position)}
                  className="w-full px-3 py-2.5 rounded-xl bg-bg-secondary border border-border text-t-primary text-sm focus:outline-none focus:border-accent transition-colors"
                >
                  {positions.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-t-secondary block mb-2">
                  Start From
                </label>
                <input
                  type="number"
                  value={startFrom}
                  onChange={(e) => setStartFrom(Number(e.target.value))}
                  min={1}
                  className="w-full px-3 py-2.5 rounded-xl bg-bg-secondary border border-border text-t-primary text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            {progress > 0 && <ProgressBar progress={progress} />}

            {!resultBlob ? (
              <ProcessButton
                onClick={handleAddPageNumbers}
                loading={processing}
                label="Add Page Numbers"
              />
            ) : (
              <DownloadButton
                blob={resultBlob}
                filename={`numbered_${file.name}`}
              />
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
