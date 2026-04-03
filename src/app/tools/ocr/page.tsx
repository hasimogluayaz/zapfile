"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProcessButton from "@/components/ProcessButton";
import ProgressBar from "@/components/ProgressBar";

export default function OcrPage() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [extractedText, setExtractedText] = useState("");
  const [language, setLanguage] = useState("eng");

  const languages = [
    { code: "eng", label: "English" },
    { code: "tur", label: "Türkçe" },
    { code: "deu", label: "Deutsch" },
    { code: "fra", label: "Français" },
    { code: "spa", label: "Español" },
    { code: "ita", label: "Italiano" },
    { code: "por", label: "Português" },
    { code: "ara", label: "العربية" },
    { code: "rus", label: "Русский" },
    { code: "jpn", label: "日本語" },
    { code: "kor", label: "한국어" },
    { code: "chi_sim", label: "中文 (简体)" },
  ];

  const handleFilesSelected = useCallback((files: File[]) => {
    setFile(files[0] || null);
    setExtractedText("");
    setProgress(0);
  }, []);

  const handleOcr = useCallback(async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(5);

    try {
      const Tesseract = await import("tesseract.js");
      setProgress(10);

      const result = await Tesseract.recognize(file, language, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setProgress(10 + Math.round(m.progress * 85));
          }
        },
      });

      setExtractedText(result.data.text);
      setProgress(100);
      toast.success("Text extracted successfully!");
    } catch (err) {
      console.error(err);
      toast.error("OCR failed. Try a different image.");
    } finally {
      setProcessing(false);
    }
  }, [file, language]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(extractedText);
    toast.success("Copied to clipboard!");
  }, [extractedText]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([extractedText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ocr_${file?.name?.replace(/\.[^.]+$/, "")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [extractedText, file]);

  return (
    <ToolLayout
      toolName="OCR - Image to Text"
      toolDescription="Extract text from images using AI-powered OCR. Supports 12+ languages."
    >
      <div className="space-y-6">
        {!file ? (
          <>
            <div className="glass rounded-2xl p-4">
              <label className="text-sm font-medium text-t-secondary block mb-2">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-bg-secondary border border-border text-t-primary text-sm focus:outline-none focus:border-accent transition-colors"
              >
                {languages.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <FileDropzone
              onFilesSelected={handleFilesSelected}
              accept={{
                "image/jpeg": [".jpg", ".jpeg"],
                "image/png": [".png"],
                "image/webp": [".webp"],
              }}
              formats={["JPG", "PNG", "WEBP"]}
            />
          </>
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
                  setExtractedText("");
                }}
                className="text-xs text-t-tertiary hover:text-red-500 transition-colors"
              >
                ✕
              </button>
            </div>

            {progress > 0 && <ProgressBar progress={progress} />}

            {!extractedText ? (
              <ProcessButton
                onClick={handleOcr}
                loading={processing}
                label="Extract Text"
              />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-t-secondary">
                    Extracted Text
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopy}
                      className="px-3 py-1.5 text-xs rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors"
                    >
                      Copy
                    </button>
                    <button
                      onClick={handleDownload}
                      className="px-3 py-1.5 text-xs rounded-lg bg-bg-secondary border border-border text-t-primary hover:bg-bg-tertiary transition-colors"
                    >
                      Download .txt
                    </button>
                  </div>
                </div>
                <textarea
                  readOnly
                  value={extractedText}
                  rows={12}
                  className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border text-t-primary text-sm leading-relaxed resize-none"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
