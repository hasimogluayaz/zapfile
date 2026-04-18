"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ImageCompareSlider from "@/components/ImageCompareSlider";
import { downloadBlob, getFileNameWithoutExtension } from "@/lib/utils";

export default function BackgroundRemoverPage() {
  const [file, setFile] = useState<File | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleFilesSelected = useCallback((files: File[]) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setResultUrl(null);
    setResultBlob(null);
    const url = URL.createObjectURL(f);
    setOriginalUrl(url);
  }, []);

  const handleRemove = useCallback(async () => {
    if (!file) return;
    setProcessing(true);
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const blob = await removeBackground(file);
      const url = URL.createObjectURL(blob);
      setResultBlob(blob);
      setResultUrl(url);
      toast.success("Background removed!");
    } catch (err) {
      console.error(err);
      // Fallback: canvas-based corner flood-fill approach
      toast.error("AI library unavailable, using simple background removal (solid backgrounds only).");
      try {
        const blob = await canvasRemoveBackground(file);
        const url = URL.createObjectURL(blob);
        setResultBlob(blob);
        setResultUrl(url);
        toast.success("Simple background removal applied.");
      } catch (e2) {
        console.error(e2);
        toast.error("Background removal failed. Please try another image.");
      }
    } finally {
      setProcessing(false);
    }
  }, [file]);

  const handleReset = useCallback(() => {
    setFile(null);
    setOriginalUrl(null);
    setResultUrl(null);
    setResultBlob(null);
  }, []);

  return (
    <ToolLayout
      toolName="Background Remover"
      toolDescription="Remove image backgrounds automatically in your browser. Powered by AI — no uploads required."
    >
      <div className="space-y-6">
        {!file && (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{
              "image/jpeg": [".jpg", ".jpeg"],
              "image/png": [".png"],
              "image/webp": [".webp"],
            }}
            multiple={false}
            label="Drop your image here or click to browse"
            formats={["jpg", "png", "webp"]}
          />
        )}

        {file && !resultUrl && (
          <div className="glass rounded-xl p-6 space-y-4">
            <p className="text-sm font-medium text-t-primary">Preview</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {originalUrl && <img src={originalUrl} alt="Original" className="max-h-72 mx-auto rounded-xl object-contain" />}
            <p className="text-xs text-t-tertiary text-center">
              Powered by AI, runs 100% in your browser
            </p>
          </div>
        )}

        {resultUrl && originalUrl && (
          <div className="glass rounded-xl p-6 space-y-4">
            <p className="text-sm font-medium text-t-primary">Before / After</p>
            <ImageCompareSlider
              beforeSrc={originalUrl}
              afterSrc={resultUrl}
              beforeLabel="Original"
              afterLabel="Result"
            />
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          {file && !resultUrl && (
            <button
              onClick={handleRemove}
              disabled={processing}
              className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {processing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  AI is processing...
                </>
              ) : (
                "Remove Background"
              )}
            </button>
          )}

          {resultBlob && file && (
            <>
              <button
                onClick={() => downloadBlob(resultBlob, `${getFileNameWithoutExtension(file.name)}-no-bg.png`)}
                className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-all"
              >
                Download PNG
              </button>
              <button
                onClick={handleReset}
                className="px-6 py-3 rounded-xl font-semibold text-t-secondary border border-border hover:bg-bg-secondary transition-colors"
              >
                Try Another Image
              </button>
            </>
          )}
        </div>

        <div className="glass rounded-xl p-4 flex items-start gap-3">
          <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <p className="text-xs text-t-tertiary">
            Powered by AI, runs 100% in your browser. Your images never leave your device.
          </p>
        </div>
      </div>
    </ToolLayout>
  );
}

async function canvasRemoveBackground(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No canvas context")); return; }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const w = canvas.width;
      const h = canvas.height;

      // Sample background color from corners
      const corners = [
        [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1],
      ];
      let rSum = 0, gSum = 0, bSum = 0;
      for (const [cx, cy] of corners) {
        const idx = (cy * w + cx) * 4;
        rSum += data[idx]; gSum += data[idx + 1]; bSum += data[idx + 2];
      }
      const bgR = rSum / 4, bgG = gSum / 4, bgB = bSum / 4;
      const threshold = 40;

      for (let i = 0; i < data.length; i += 4) {
        const dr = Math.abs(data[i] - bgR);
        const dg = Math.abs(data[i + 1] - bgG);
        const db = Math.abs(data[i + 2] - bgB);
        if (dr < threshold && dg < threshold && db < threshold) {
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create blob"));
      }, "image/png");
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}
