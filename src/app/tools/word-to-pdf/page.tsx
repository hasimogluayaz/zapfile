"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProcessButton from "@/components/ProcessButton";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";

export default function WordToPdfPage() {
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

      // Convert DOCX to HTML using mammoth
      const mammoth = await import("mammoth");
      const { value: html } = await mammoth.convertToHtml({ arrayBuffer });
      setProgress(50);

      // Create a hidden div with the HTML content
      const container = document.createElement("div");
      container.innerHTML = html;
      container.style.cssText =
        "position:fixed;left:-9999px;top:0;width:794px;padding:40px;font-family:Arial,sans-serif;font-size:12pt;line-height:1.6;color:#000;background:#fff;";
      document.body.appendChild(container);
      setProgress(60);

      // Render to canvas
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      document.body.removeChild(container);
      setProgress(80);

      // Create PDF from canvas
      const { jsPDF } = await import("jspdf");
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pageHeight = 297; // A4 height in mm

      const pdf = new jsPDF("p", "mm", "a4");
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(
        canvas.toDataURL("image/jpeg", 0.95),
        "JPEG",
        0,
        position,
        imgWidth,
        imgHeight,
      );
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = -(
          pageHeight *
          (Math.ceil(imgHeight / pageHeight) -
            Math.ceil(heightLeft / pageHeight))
        );
        pdf.addPage();
        pdf.addImage(
          canvas.toDataURL("image/jpeg", 0.95),
          "JPEG",
          0,
          position,
          imgWidth,
          imgHeight,
        );
        heightLeft -= pageHeight;
      }

      const pdfBlob = pdf.output("blob");
      setResultBlob(pdfBlob);
      setProgress(100);
      toast.success("Conversion complete!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to convert Word to PDF.");
    } finally {
      setProcessing(false);
    }
  }, [file]);

  return (
    <ToolLayout
      toolName="Word to PDF"
      toolDescription="Convert Word (DOCX) documents to PDF format. Preserves text formatting."
    >
      <div className="space-y-6">
        {!file ? (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                [".docx"],
            }}
            formats={["DOCX"]}
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
                label="Convert to PDF"
              />
            ) : (
              <DownloadButton
                blob={resultBlob}
                filename={file.name.replace(".docx", ".pdf")}
              />
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
