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
  const [result, setResult] = useState<Blob | null>(null);
  const [resultPreview, setResultPreview] = useState<string | null>(null);
  const removeBackgroundRef = useRef<((img: File | Blob) => Promise<Blob>) | null>(null);

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
    if (removeBackgroundRef.current) return removeBackgroundRef.current;

    // Dynamically load @imgly/background-removal from CDN
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/dist/index.umd.min.js";
    script.async = true;

    await new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load background removal library"));
      document.head.appendChild(script);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bgRemoval = (window as any).imglyBackgroundRemoval;
    if (!bgRemoval?.removeBackground) {
      throw new Error("Background removal library not loaded properly");
    }

    removeBackgroundRef.current = bgRemoval.removeBackground;
    return bgRemoval.removeBackground as (img: File | Blob) => Promise<Blob>;
  };

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(10);

    try {
      toast.loading("Loading AI model (first time may take ~60s)...", { id: "bg-load" });

      const removeBackground = await loadLibrary();

      toast.dismiss("bg-load");
      setProgress(30);

      const blob = await removeBackground(file);

      setResult(blob);
      setResultPreview(URL.createObjectURL(blob));
      setProgress(100);
      toast.success("Background removed successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove background. Try a different image.");
      toast.dismiss("bg-load");
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
                <img
                  src={preview}
                  alt="Original"
                  className="max-h-64 rounded-lg border border-white/10"
                />
              </div>
            )}
          </div>

          {processing && <ProgressBar progress={progress} label="Removing background..." />}

          {!processing && (
            <button
              onClick={handleProcess}
              className="w-full sm:w-auto px-8 py-3 rounded-xl font-semibold text-white bg-gradient-brand hover:shadow-lg hover:shadow-brand-indigo/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Remove Background
            </button>
          )}

          <p className="text-xs text-brand-muted text-center">
            AI model runs entirely in your browser. First use downloads ~40MB model.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass rounded-xl p-4">
              <p className="text-xs text-brand-muted uppercase tracking-wider mb-3 text-center">
                Original
              </p>
              {preview && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={preview} alt="Original" className="max-h-56 mx-auto rounded-lg" />
              )}
            </div>
            <div className="glass rounded-xl p-4" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='10' height='10' fill='%23333'/%3E%3Crect x='10' y='10' width='10' height='10' fill='%23333'/%3E%3Crect x='10' width='10' height='10' fill='%23222'/%3E%3Crect y='10' width='10' height='10' fill='%23222'/%3E%3C/svg%3E\")" }}>
              <p className="text-xs text-brand-muted uppercase tracking-wider mb-3 text-center">
                Result
              </p>
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
