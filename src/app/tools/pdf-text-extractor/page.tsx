"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProgressBar from "@/components/ProgressBar";
import { downloadBlob } from "@/lib/utils";

export default function PdfTextExtractorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [pageCount, setPageCount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const handleFile = useCallback((files: File[]) => {
    const pdf = files.find((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (!pdf) { toast.error("Please select a PDF file."); return; }
    setFile(pdf);
    setText("");
    setDone(false);
    setProgress(0);
  }, []);

  const handleExtract = useCallback(async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(5);
    setText("");
    setDone(false);

    try {
      const arrayBuffer = await file.arrayBuffer();
      setProgress(20);

      // Load pdfjs-dist from CDN worker
      const pdfjsLib = await import("pdfjs-dist");
      // Use unpkg CDN which supports ES module workers for pdfjs v5+
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      setProgress(35);

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setPageCount(pdf.numPages);
      setProgress(40);

      const pages: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => ("str" in item ? (item.str as string) : ""))
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        pages.push(`--- Page ${i} ---\n${pageText}`);
        setProgress(40 + Math.round((i / pdf.numPages) * 55));
      }

      const fullText = pages.join("\n\n");
      setText(fullText);
      setProgress(100);
      setDone(true);
      toast.success(`Extracted text from ${pdf.numPages} page${pdf.numPages !== 1 ? "s" : ""}`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to extract text. The PDF may be scanned or image-based.");
    } finally {
      setProcessing(false);
    }
  }, [file]);

  const handleCopy = useCallback(async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Text copied to clipboard!");
    } catch {
      toast.error("Copy failed. Please select and copy manually.");
    }
  }, [text]);

  const handleDownload = useCallback(() => {
    if (!text || !file) return;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const name = file.name.replace(/\.pdf$/i, "") + "-text.txt";
    downloadBlob(blob, name);
  }, [text, file]);

  return (
    <ToolLayout
      toolName="PDF Text Extractor"
      toolDescription="Extract all readable text from PDF files. Works in your browser — no uploads required."
    >
      <div className="space-y-5">
        {!file ? (
          <FileDropzone
            onFilesSelected={handleFile}
            accept={{ "application/pdf": [".pdf"] }}
            label="Drop your PDF here or click to browse"
            formats={["pdf"]}
          />
        ) : !done ? (
          <div className="glass rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">📄</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-t-primary truncate">{file.name}</p>
              <p className="text-xs text-t-tertiary">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={() => { setFile(null); setText(""); setDone(false); }}
              className="p-1.5 rounded-lg hover:bg-bg-secondary text-t-tertiary hover:text-t-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : null}

        {processing && <ProgressBar progress={progress} label="Extracting text…" />}

        {file && !done && !processing && (
          <button
            onClick={handleExtract}
            className="w-full px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-all"
          >
            📝 Extract Text
          </button>
        )}

        {done && text && (
          <>
            {/* Stats bar */}
            <div className="flex flex-wrap gap-4 px-4 py-3 rounded-xl bg-bg-secondary border border-border text-sm">
              <span className="text-t-secondary">📄 <strong className="text-t-primary">{pageCount}</strong> pages</span>
              <span className="text-t-secondary">🔤 <strong className="text-t-primary">{text.replace(/---.*---\n/g, "").replace(/\s+/g, " ").trim().split(/\s+/).length}</strong> words</span>
              <span className="text-t-secondary">📊 <strong className="text-t-primary">{text.length.toLocaleString()}</strong> characters</span>
            </div>

            {/* Text output */}
            <textarea
              readOnly
              value={text}
              className="w-full h-80 px-4 py-3 rounded-xl bg-bg-secondary border border-border text-t-primary text-sm font-mono resize-y focus:outline-none focus:border-accent/50"
            />

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCopy}
                className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-all"
              >
                📋 Copy All Text
              </button>
              <button
                onClick={handleDownload}
                className="px-6 py-3 rounded-xl font-semibold text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors"
              >
                💾 Download .txt
              </button>
              <button
                onClick={() => { setFile(null); setText(""); setDone(false); }}
                className="px-6 py-3 rounded-xl font-semibold text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors"
              >
                New File
              </button>
            </div>

            <div className="flex gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <span className="text-lg shrink-0">⚠️</span>
              <p className="text-xs text-t-secondary leading-relaxed">
                Text extraction works best on digitally-created PDFs. Scanned or image-based PDFs
                will show empty results — use an OCR tool for those.
              </p>
            </div>
          </>
        )}
      </div>
    </ToolLayout>
  );
}
