"use client";

import { useState, useRef } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import { formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";

export default function RemoveBackgroundPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("Processing...");
  const [result, setResult] = useState<Blob | null>(null);
  const [resultPreview, setResultPreview] = useState<string | null>(null);
  const libraryLoadedRef = useRef(false);

  const handleFilesSelected = (files: File[]) => {
    const f = files[0];
    setFile(f);
    setResult(null);
    setResultPreview(null);
    setProgress(0);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(f);
  };

  const loadLibrary = async () => {
    if (libraryLoadedRef.current) return;
    await new Promise<void>((resolve, reject) => {
      if (document.querySelector('script[data-bgremoval]')) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/dist/index.umd.min.js";
      script.setAttribute("data-bgremoval", "true");
      script.onload = () => { libraryLoadedRef.current = true; resolve(); };
      script.onerror = () => reject(new Error("Failed to load AI library. Check your internet connection."));
      document.head.appendChild(script);
    });
  };

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(5);
    setProgressLabel("Loading AI library...");

    try {
      await loadLibrary();
      setProgress(15);
      setProgressLabel("Downloading AI model (~40MB, first time only)...");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bgRemoval = (window as any).imglyBackgroundRemoval;
      if (!bgRemoval?.removeBackground) {
        throw new Error("Background removal library not available.");
      }

      setProgress(20);

      const blob: Blob = await bgRemoval.removeBackground(file, {
        publicPath: "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/dist/",
        progress: (key: string, current: number, total: number) => {
          if (total > 0) {
            const pct = Math.round((current / total) * 100);
            if (key.includes("fetch")) {
              setProgressLabel(`Downloading model: ${pct}%`);
              setProgress(20 + Math.round(pct * 0.6));
            } else {
              setProgressLabel(`Processing image: ${pct}%`);
              setProgress(80 + Math.round(pct * 0.18));
            }
          }
        },
        model: "medium",
      });

      setResult(blob);
      setResultPreview(URL.createObjectURL(blob));
      setProgress(100);
      setProgressLabel("Done!");
      toast.success("Background removed successfully!");
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : "Failed to remove background.";
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setResultPreview(null);
    setProgress(0);
  };

  return (
    <ToolLayout
      toolName="Remove Background"
      toolDescription="Remove image backgrounds automatically with AI. Get a transparent PNG."
    >
      {!file ? (
        <FileDropzone
          onFilesSelected={handleFilesSelected}
          accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp"] }}
          formats={["JPG", "PNG", "WEBP"]}
        />
      ) : !result ? (
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <p className="font-medium text-brand-text">{file.name}</p>
                <p className="text-sm text-brand-muted">{formatFileSize(file.size)}</p>
              </div>
              <button onClick={reset} className="text-sm text-brand-muted hover:text-red-400 transition-colors">
                Remove
              </button>
            </div>
            {preview && (
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Original" className="max-h-64 rounded-lg border border-white/10" />
              </div>
            )}
          </div>

          {processing && <ProgressBar progress={progress} label={progressLabel} />}

          {!processing && (
            <button
              onClick={handleProcess}
              className="w-full sm:w-auto px-8 py-3 rounded-xl font-semibold text-white bg-gradient-brand hover:shadow-lg hover:shadow-brand-indigo/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Remove Background
            </button>
          )}

          <div className="glass rounded-xl p-4 text-sm text-brand-muted space-y-1">
            <p>⚡ AI runs entirely in your browser — no uploads, 100% private</p>
            <p>📦 First use downloads ~40MB model (cached for future use)</p>
            <p>⏱️ Processing takes 10-60 seconds depending on your device</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-brand-muted uppercase tracking-wider mb-3 text-center">Original</p>
              {preview && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={preview} alt="Original" className="max-h-56 mx-auto rounded-lg" />
              )}
            </div>
            <div
              className="glass rounded-xl p-4"
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='10' height='10' fill='%23333'/%3E%3Crect x='10' y='10' width='10' height='10' fill='%23333'/%3E%3Crect x='10' width='10' height='10' fill='%23222'/%3E%3Crect y='10' width='10' height='10' fill='%23222'/%3E%3C/svg%3E\")",
              }}
            >
              <p className="text-xs text-brand-muted uppercase tracking-wider mb-3 text-center">Result (Transparent)</p>
              {resultPreview && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={resultPreview} alt="Result" className="max-h-56 mx-auto rounded-lg" />
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <DownloadButton
              blob={result}
              filename={`${getFileNameWithoutExtension(file.name)}-nobg.png`}
              label="Download Transparent PNG"
            />
            <button
              onClick={reset}
              className="px-6 py-3 rounded-xl font-semibold text-brand-text bg-white/5 hover:bg-white/10 transition-colors"
            >
              Process Another Image
            </button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
