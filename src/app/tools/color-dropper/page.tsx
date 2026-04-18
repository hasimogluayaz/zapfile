"use client";

import { useState, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";

interface PickedColor {
  hex: string;
  rgb: { r: number; g: number; b: number };
  hsl: { h: number; s: number; l: number };
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

export default function ColorDropperPage() {
  const [file, setFile] = useState<File | null>(null);
  const [hoverColor, setHoverColor] = useState<PickedColor | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [pickedColors, setPickedColors] = useState<PickedColor[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const magnifierRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const loadImage = useCallback((f: File) => {
    const url = URL.createObjectURL(f);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      imgRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);
    };
    img.src = url;
  }, []);

  const handleFilesSelected = useCallback((files: File[]) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setPickedColors([]);
    setHoverColor(null);
    loadImage(f);
  }, [loadImage]);

  const getColorAtPos = useCallback((clientX: number, clientY: number): PickedColor | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.round((clientX - rect.left) * scaleX);
    const y = Math.round((clientY - rect.top) * scaleY);
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const r = pixel[0], g = pixel[1], b = pixel[2];
    return { hex: rgbToHex(r, g, b), rgb: { r, g, b }, hsl: rgbToHsl(r, g, b) };
  }, []);

  const drawMagnifier = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    const magnifier = magnifierRef.current;
    if (!canvas || !magnifier) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.round((clientX - rect.left) * scaleX);
    const y = Math.round((clientY - rect.top) * scaleY);
    const zoom = 4;
    const size = 20; // pixels to grab from source
    const mCtx = magnifier.getContext("2d");
    const srcCtx = canvas.getContext("2d");
    if (!mCtx || !srcCtx) return;
    mCtx.clearRect(0, 0, magnifier.width, magnifier.height);
    mCtx.imageSmoothingEnabled = false;
    const sx = Math.max(0, x - size / 2);
    const sy = Math.max(0, y - size / 2);
    mCtx.drawImage(canvas, sx, sy, size, size, 0, 0, magnifier.width, magnifier.height);
    // Draw crosshair
    mCtx.strokeStyle = "rgba(255,255,255,0.8)";
    mCtx.lineWidth = 1;
    mCtx.beginPath();
    mCtx.moveTo(magnifier.width / 2, 0);
    mCtx.lineTo(magnifier.width / 2, magnifier.height);
    mCtx.moveTo(0, magnifier.height / 2);
    mCtx.lineTo(magnifier.width, magnifier.height / 2);
    mCtx.stroke();
    void zoom;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const color = getColorAtPos(e.clientX, e.clientY);
    setHoverColor(color);
    setHoverPos({ x: e.clientX, y: e.clientY });
    drawMagnifier(e.clientX, e.clientY);
  }, [getColorAtPos, drawMagnifier]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const color = getColorAtPos(e.clientX, e.clientY);
    if (!color) return;
    setPickedColors((prev) => [color, ...prev].slice(0, 10));
    toast.success(`Picked ${color.hex}`);
  }, [getColorAtPos]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Copied: ${text}`);
    } catch {
      toast.error("Copy failed");
    }
  }, []);

  // Hide tooltip when mouse leaves canvas
  const handleMouseLeave = useCallback(() => {
    setHoverColor(null);
    setHoverPos(null);
  }, []);

  return (
    <ToolLayout
      toolName="Color Dropper"
      toolDescription="Pick colors from any image. Hover to preview, click to pick. Get HEX, RGB, and HSL values."
    >
      <div className="space-y-6">
        {!file && (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{
              "image/jpeg": [".jpg", ".jpeg"],
              "image/png": [".png"],
              "image/webp": [".webp"],
              "image/gif": [".gif"],
            }}
            multiple={false}
            label="Drop an image here or click to browse"
            formats={["jpg", "png", "webp", "gif"]}
          />
        )}

        {file && (
          <div className="glass rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-t-primary">
                Upload an image, then hover and click to pick colors
              </p>
              <button
                onClick={() => { setFile(null); setPickedColors([]); setHoverColor(null); }}
                className="text-xs text-t-tertiary hover:text-t-primary transition-colors border border-border px-3 py-1 rounded-lg"
              >
                Change Image
              </button>
            </div>

            <div className="relative">
              {/* Hidden canvas for pixel data */}
              <canvas ref={canvasRef} className="hidden" />
              {/* Displayed image via canvas — we show the img tag but use canvas for reading */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={URL.createObjectURL(file)}
                alt="Uploaded"
                className="w-full rounded-xl object-contain max-h-96 cursor-crosshair select-none"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
                draggable={false}
              />

              {/* Magnifier overlay */}
              {hoverPos && hoverColor && (
                <div
                  className="fixed z-50 pointer-events-none"
                  style={{ left: hoverPos.x + 16, top: hoverPos.y - 80 }}
                >
                  <div className="bg-bg-secondary border border-border rounded-xl shadow-xl overflow-hidden">
                    <canvas
                      ref={magnifierRef}
                      width={80}
                      height={80}
                      className="block"
                    />
                    <div
                      className="h-5 w-full"
                      style={{ backgroundColor: hoverColor.hex }}
                    />
                    <div className="px-2 py-1">
                      <p className="text-[10px] font-mono text-t-primary text-center">{hoverColor.hex}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {pickedColors.length > 0 && (
          <div className="glass rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-t-primary">Picked Colors ({pickedColors.length}/10)</h3>
              <button
                onClick={() => setPickedColors([])}
                className="text-xs text-t-tertiary hover:text-t-primary transition-colors"
              >
                Clear All
              </button>
            </div>
            <div className="space-y-3">
              {pickedColors.map((color, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-bg-secondary border border-border">
                  <div
                    className="w-10 h-10 rounded-lg shrink-0 border border-border shadow-inner"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-t-primary">{color.hex}</span>
                      <button
                        onClick={() => copyToClipboard(color.hex)}
                        className="text-[10px] text-accent hover:text-accent/80 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-t-tertiary font-mono">
                        rgb({color.rgb.r}, {color.rgb.g}, {color.rgb.b})
                      </span>
                      <button
                        onClick={() => copyToClipboard(`rgb(${color.rgb.r}, ${color.rgb.g}, ${color.rgb.b})`)}
                        className="text-[10px] text-accent hover:text-accent/80 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-t-tertiary font-mono">
                        hsl({color.hsl.h}, {color.hsl.s}%, {color.hsl.l}%)
                      </span>
                      <button
                        onClick={() => copyToClipboard(`hsl(${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%)`)}
                        className="text-[10px] text-accent hover:text-accent/80 transition-colors"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
