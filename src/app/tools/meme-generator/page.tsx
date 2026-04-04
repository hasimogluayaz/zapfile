"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import {
  formatFileSize,
  getFileNameWithoutExtension,
  downloadBlob,
} from "@/lib/utils";

export default function MemeGeneratorPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [topText, setTopText] = useState("");
  const [bottomText, setBottomText] = useState("");
  const [fontSize, setFontSize] = useState(40);
  const [textColor, setTextColor] = useState("#ffffff");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const drawMeme = useCallback(
    (
      img: HTMLImageElement,
      top: string,
      bottom: string,
      fSize: number,
      tColor: string,
      sColor: string,
      sWidth: number
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Draw base image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Scale font size relative to image
      const scaledFontSize = Math.round(fSize * (canvas.width / 600));
      const scaledStrokeWidth = Math.round(sWidth * (canvas.width / 600));
      const padding = scaledFontSize * 0.5;

      // Configure text style (Impact-style: uppercase, bold)
      ctx.font = `bold ${scaledFontSize}px Impact, "Arial Black", sans-serif`;
      ctx.textAlign = "center";
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;

      // Draw top text
      if (top.trim()) {
        const upperTop = top.toUpperCase();
        ctx.textBaseline = "top";

        // Stroke
        ctx.strokeStyle = sColor;
        ctx.lineWidth = scaledStrokeWidth * 2;
        ctx.strokeText(upperTop, canvas.width / 2, padding, canvas.width - padding * 2);

        // Fill
        ctx.fillStyle = tColor;
        ctx.fillText(upperTop, canvas.width / 2, padding, canvas.width - padding * 2);
      }

      // Draw bottom text
      if (bottom.trim()) {
        const upperBottom = bottom.toUpperCase();
        ctx.textBaseline = "bottom";

        // Stroke
        ctx.strokeStyle = sColor;
        ctx.lineWidth = scaledStrokeWidth * 2;
        ctx.strokeText(
          upperBottom,
          canvas.width / 2,
          canvas.height - padding,
          canvas.width - padding * 2
        );

        // Fill
        ctx.fillStyle = tColor;
        ctx.fillText(
          upperBottom,
          canvas.width / 2,
          canvas.height - padding,
          canvas.width - padding * 2
        );
      }

      setPreview(canvas.toDataURL("image/png"));
    },
    []
  );

  // Redraw on any setting change
  useEffect(() => {
    if (imgRef.current) {
      drawMeme(
        imgRef.current,
        topText,
        bottomText,
        fontSize,
        textColor,
        strokeColor,
        strokeWidth
      );
    }
  }, [topText, bottomText, fontSize, textColor, strokeColor, strokeWidth, drawMeme]);

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      const f = files[0];
      setFile(f);
      setResultBlob(null);

      const img = new window.Image();
      img.onload = () => {
        imgRef.current = img;
        drawMeme(img, topText, bottomText, fontSize, textColor, strokeColor, strokeWidth);
      };
      img.onerror = () => toast.error("Failed to load image.");
      img.src = URL.createObjectURL(f);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drawMeme]
  );

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas || !file) return;

    canvas.toBlob((blob) => {
      if (blob) {
        setResultBlob(blob);
        const baseName = getFileNameWithoutExtension(file.name);
        downloadBlob(blob, `${baseName}-meme.png`);
        toast.success("Meme downloaded!");
      } else {
        toast.error("Failed to export meme.");
      }
    }, "image/png");
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setTopText("");
    setBottomText("");
    setFontSize(40);
    setTextColor("#ffffff");
    setStrokeColor("#000000");
    setStrokeWidth(2);
    setResultBlob(null);
    imgRef.current = null;
  };

  return (
    <ToolLayout
      toolName="Meme Generator"
      toolDescription="Add text to images to create memes"
    >
      <canvas ref={canvasRef} className="hidden" />

      <div className="space-y-6">
        {!file ? (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{
              "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"],
            }}
            formats={["JPG", "PNG", "WEBP"]}
            label="Drop your image here to create a meme"
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              {/* Left: Live preview */}
              <div className="glass rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-medium text-brand-muted">
                    Live Preview
                  </p>
                  <button
                    onClick={reset}
                    className="text-[11px] text-brand-muted hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </div>
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt="Meme preview"
                    className="w-full rounded-lg border border-white/10 object-contain max-h-72"
                  />
                ) : (
                  <div className="h-40 flex items-center justify-center rounded-lg border border-white/10 text-[12px] text-brand-muted">
                    Loading...
                  </div>
                )}
                <p className="text-[11px] text-brand-muted truncate">
                  {file.name} &middot; {formatFileSize(file.size)}
                </p>
              </div>

              {/* Right: Controls */}
              <div className="glass rounded-xl p-4 space-y-4">
                <h3 className="text-[13px] font-semibold text-brand-text">
                  Meme Text
                </h3>

                {/* Top Text */}
                <div>
                  <label className="block text-[12px] text-brand-muted mb-1.5">
                    Top Text
                  </label>
                  <input
                    type="text"
                    value={topText}
                    onChange={(e) => setTopText(e.target.value)}
                    placeholder="Enter top text"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[13px] text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-indigo/50 transition-colors"
                  />
                </div>

                {/* Bottom Text */}
                <div>
                  <label className="block text-[12px] text-brand-muted mb-1.5">
                    Bottom Text
                  </label>
                  <input
                    type="text"
                    value={bottomText}
                    onChange={(e) => setBottomText(e.target.value)}
                    placeholder="Enter bottom text"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[13px] text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-indigo/50 transition-colors"
                  />
                </div>

                {/* Font Size */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-[12px] text-brand-muted">Font Size</label>
                    <span className="text-[12px] font-mono text-brand-muted">
                      {fontSize}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={80}
                    step={1}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full accent-brand-indigo"
                  />
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[10px] text-brand-muted">20</span>
                    <span className="text-[10px] text-brand-muted">80</span>
                  </div>
                </div>

                {/* Stroke Width */}
                <div>
                  <div className="flex justify-between mb-1.5">
                    <label className="text-[12px] text-brand-muted">
                      Stroke Width
                    </label>
                    <span className="text-[12px] font-mono text-brand-muted">
                      {strokeWidth}px
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={strokeWidth}
                    onChange={(e) => setStrokeWidth(Number(e.target.value))}
                    className="w-full accent-brand-indigo"
                  />
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[10px] text-brand-muted">1</span>
                    <span className="text-[10px] text-brand-muted">5</span>
                  </div>
                </div>

                {/* Colors */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] text-brand-muted mb-1.5">
                      Text Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-white/10 bg-white/5 p-0.5"
                      />
                      <span className="text-[11px] font-mono text-brand-muted">
                        {textColor}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] text-brand-muted mb-1.5">
                      Stroke Color
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={strokeColor}
                        onChange={(e) => setStrokeColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-white/10 bg-white/5 p-0.5"
                      />
                      <span className="text-[11px] font-mono text-brand-muted">
                        {strokeColor}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Download */}
                <button
                  onClick={handleDownload}
                  disabled={!topText.trim() && !bottomText.trim()}
                  className={`w-full py-3 rounded-xl font-semibold text-[14px] text-white transition-all mt-2 ${
                    !topText.trim() && !bottomText.trim()
                      ? "bg-white/10 cursor-not-allowed text-brand-muted"
                      : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]"
                  }`}
                >
                  Download Meme
                </button>

                {/* Reset */}
                <button
                  onClick={reset}
                  className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-brand-muted bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Result download */}
            {resultBlob && (
              <div className="glass rounded-xl p-4 space-y-3">
                <p className="text-[13px] font-medium text-brand-text">
                  Last Export
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <DownloadButton
                    blob={resultBlob}
                    filename={`${getFileNameWithoutExtension(file.name)}-meme.png`}
                    label="Download Again"
                  />
                  <button
                    onClick={reset}
                    className="px-6 py-2.5 rounded-xl text-[13px] font-semibold text-brand-muted bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    New Meme
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ToolLayout>
  );
}
