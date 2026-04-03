"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProcessButton from "@/components/ProcessButton";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";

export default function PdfToWordPage() {
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfjsLib = await import("pdfjs-dist" as any);
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setProgress(50);

      const { Document, Packer, Paragraph, TextRun, PageBreak } =
        await import("docx");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const paragraphs: any[] = [];

      for (let i = 0; i < pdf.numPages; i++) {
        const page = await pdf.getPage(i + 1);
        const textContent = await page.getTextContent();
        const items = textContent.items as {
          str: string;
          transform: number[];
          height: number;
        }[];

        if (items.length === 0) {
          paragraphs.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `[Page ${i + 1} - No extractable text]`,
                  size: 24,
                  italics: true,
                  color: "888888",
                }),
              ],
            }),
          );
        } else {
          // Group text items into lines by Y position
          const lines: { y: number; items: { x: number; str: string; height: number }[] }[] = [];
          for (const item of items) {
            if (!item.str.trim() && item.str !== " ") continue;
            const y = Math.round(item.transform[5]);
            const x = item.transform[4];
            const h = item.height || 12;
            let line = lines.find((l) => Math.abs(l.y - y) < h * 0.5);
            if (!line) {
              line = { y, items: [] };
              lines.push(line);
            }
            line.items.push({ x, str: item.str, height: h });
          }

          // Sort lines top to bottom (PDF Y is bottom-up)
          lines.sort((a, b) => b.y - a.y);

          // Sort items within each line left to right
          for (const line of lines) {
            line.items.sort((a, b) => a.x - b.x);
          }

          // Detect paragraph breaks (gap > 1.5x line height)
          let currentBlock: string[] = [];
          const flushBlock = () => {
            if (currentBlock.length === 0) return;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const children: any[] = [];
            currentBlock.forEach((line, k) => {
              if (k > 0) {
                children.push(new TextRun({ text: line, size: 24, break: 1 }));
              } else {
                children.push(new TextRun({ text: line, size: 24 }));
              }
            });
            paragraphs.push(new Paragraph({ children, spacing: { after: 200 } }));
            currentBlock = [];
          };

          for (let j = 0; j < lines.length; j++) {
            const lineText = lines[j].items.map((it) => it.str).join("").trim();
            if (!lineText) continue;

            if (j > 0) {
              const gap = lines[j - 1].y - lines[j].y;
              const avgHeight = lines[j].items[0]?.height || 12;
              if (gap > avgHeight * 1.8) {
                flushBlock();
              }
            }
            currentBlock.push(lineText);
          }
          flushBlock();
        }

        if (i < pdf.numPages - 1) {
          paragraphs.push(
            new Paragraph({
              children: [new PageBreak()],
            }),
          );
        }

        setProgress(50 + Math.round((i / pdf.numPages) * 40));
      }

      const doc = new Document({
        sections: [{ children: paragraphs }],
      });

      const blob = await Packer.toBlob(doc);
      setResultBlob(blob);
      setProgress(100);
      toast.success("Conversion complete!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to convert PDF to Word.");
    } finally {
      setProcessing(false);
    }
  }, [file]);

  return (
    <ToolLayout
      toolName="PDF to Word"
      toolDescription="Convert PDF documents to editable Word (DOCX) files. Text is extracted from each page."
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
                label="Convert to Word"
              />
            ) : (
              <DownloadButton
                blob={resultBlob}
                filename={file.name.replace(".pdf", ".docx")}
              />
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
