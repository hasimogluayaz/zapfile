"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProcessButton from "@/components/ProcessButton";
import DownloadButton from "@/components/DownloadButton";
import { getFileNameWithoutExtension } from "@/lib/utils";

export default function SvgToPngPage() {
  const [file, setFile] = useState<File | null>(null);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [lockRatio, setLockRatio] = useState(true);
  const [originalRatio, setOriginalRatio] = useState(1);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFilesSelected = (files: File[]) => {
    const f = files[0];
    setFile(f);
    setResult(null);
    setPreview(null);

    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      setSvgContent(content);

      // Parse SVG to get dimensions
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, "image/svg+xml");
      const svg = doc.querySelector("svg");
      if (svg) {
        const viewBox = svg.getAttribute("viewBox");
        const w = parseFloat(svg.getAttribute("width") || "0");
        const h = parseFloat(svg.getAttribute("height") || "0");

        let svgW = w;
        let svgH = h;

        if (viewBox) {
          const parts = viewBox.split(/[\s,]+/).map(Number);
          if (parts.length === 4) {
            svgW = svgW || parts[2];
            svgH = svgH || parts[3];
          }
        }

        if (svgW && svgH) {
          const ratio = svgW / svgH;
          setOriginalRatio(ratio);
          setWidth(Math.round(svgW) || 1024);
          setHeight(Math.round(svgH) || 1024);
        }
      }
    };
    reader.readAsText(f);
  };

  const handleWidthChange = (newWidth: number) => {
    setWidth(newWidth);
    if (lockRatio) {
      setHeight(Math.round(newWidth / originalRatio));
    }
  };

  const handleHeightChange = (newHeight: number) => {
    setHeight(newHeight);
    if (lockRatio) {
      setWidth(Math.round(newHeight * originalRatio));
    }
  };

  const handleProcess = async () => {
    if (!svgContent) return;
    setProcessing(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      const img = new Image();
      const svgBlob = new Blob([svgContent], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          ctx.drawImage(img, 0, 0, width, height);
          URL.revokeObjectURL(url);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Failed to load SVG"));
        };
        img.src = url;
      });

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("Failed to create PNG"));
        }, "image/png");
      });

      setResult(blob);
      setPreview(URL.createObjectURL(blob));
      toast.success("SVG converted to PNG!");
    } catch (error) {
      toast.error("Failed to convert SVG");
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setSvgContent(null);
    setResult(null);
    setPreview(null);
  };

  return (
    <ToolLayout
      toolName="SVG to PNG"
      toolDescription="Convert SVG vector files to PNG with custom dimensions."
    >
      {!file ? (
        <FileDropzone
          onFilesSelected={handleFilesSelected}
          accept={{ "image/svg+xml": [".svg"] }}
          formats={["SVG"]}
        />
      ) : !result ? (
        <div className="space-y-6">
          {/* SVG Preview */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-medium text-brand-text">{file.name}</p>
              </div>
              <button
                onClick={reset}
                className="text-sm text-brand-muted hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            </div>
            {svgContent && (
              <div className="flex justify-center p-4 bg-white/5 rounded-lg">
                {/* Safe SVG preview via blob URL — no dangerouslySetInnerHTML */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={URL.createObjectURL(
                    new Blob([svgContent], {
                      type: "image/svg+xml;charset=utf-8",
                    }),
                  )}
                  alt="SVG Preview"
                  className="max-h-[200px] max-w-full object-contain"
                />
              </div>
            )}
          </div>

          {/* Size */}
          <div className="glass rounded-xl p-6">
            <h3 className="font-medium text-brand-text mb-4">Output Size</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-brand-muted mb-2">
                  Width (px)
                </label>
                <input
                  type="number"
                  min="1"
                  max="8192"
                  value={width}
                  onChange={(e) => handleWidthChange(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-brand-text focus:outline-none focus:border-brand-indigo/50"
                />
              </div>
              <div>
                <label className="block text-sm text-brand-muted mb-2">
                  Height (px)
                </label>
                <input
                  type="number"
                  min="1"
                  max="8192"
                  value={height}
                  onChange={(e) => handleHeightChange(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-brand-text focus:outline-none focus:border-brand-indigo/50"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 mt-3 cursor-pointer">
              <input
                type="checkbox"
                checked={lockRatio}
                onChange={(e) => setLockRatio(e.target.checked)}
                className="accent-brand-indigo"
              />
              <span className="text-sm text-brand-muted">
                Lock aspect ratio
              </span>
            </label>
          </div>

          <ProcessButton
            onClick={handleProcess}
            loading={processing}
            disabled={!svgContent}
            label="Convert to PNG"
            loadingLabel="Converting..."
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass rounded-xl p-6 text-center">
            <p className="text-brand-text font-medium">
              Converted to PNG ({width} &times; {height})
            </p>
          </div>

          {preview && (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="PNG result"
                className="max-w-full max-h-72 rounded-lg border border-white/10"
              />
            </div>
          )}

          <div className="flex flex-wrap gap-4 justify-center">
            <DownloadButton
              blob={result}
              filename={`${getFileNameWithoutExtension(file.name)}.png`}
              label="Download PNG"
            />
            <button
              onClick={reset}
              className="px-6 py-3 rounded-xl font-semibold text-brand-text bg-white/5 hover:bg-white/10 transition-colors"
            >
              Convert Another SVG
            </button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
