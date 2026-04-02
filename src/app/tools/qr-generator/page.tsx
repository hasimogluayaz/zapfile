"use client";

import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { downloadBlob } from "@/lib/utils";

type QRType = "url" | "text" | "tel" | "email";

export default function QRGeneratorPage() {
  const [qrType, setQrType] = useState<QRType>("url");
  const [input, setInput] = useState("");
  const [fgColor, setFgColor] = useState("#ffffff");
  const [bgColor, setBgColor] = useState("#0f0f13");
  const [size, setSize] = useState(300);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const placeholders: Record<QRType, string> = {
    url: "https://example.com",
    text: "Enter your text here",
    tel: "+1234567890",
    email: "email@example.com",
  };

  const formatInput = (value: string): string => {
    switch (qrType) {
      case "tel":
        return `tel:${value}`;
      case "email":
        return `mailto:${value}`;
      default:
        return value;
    }
  };

  useEffect(() => {
    if (!input.trim()) {
      setQrDataUrl(null);
      return;
    }

    const generateQR = async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const dataUrl = await QRCode.toDataURL(formatInput(input), {
          width: size,
          margin: 2,
          color: {
            dark: fgColor,
            light: bgColor,
          },
          errorCorrectionLevel: "M",
        });
        setQrDataUrl(dataUrl);
      } catch {
        setQrDataUrl(null);
      }
    };

    const debounce = setTimeout(generateQR, 300);
    return () => clearTimeout(debounce);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, fgColor, bgColor, size, qrType]);

  const downloadPNG = () => {
    if (!qrDataUrl) return;
    fetch(qrDataUrl)
      .then((res) => res.blob())
      .then((blob) => downloadBlob(blob, "qrcode.png"));
  };

  const downloadSVG = async () => {
    if (!input.trim()) return;
    try {
      const QRCode = (await import("qrcode")).default;
      const svgString = await QRCode.toString(formatInput(input), {
        type: "svg",
        width: size,
        margin: 2,
        color: {
          dark: fgColor,
          light: bgColor,
        },
      });
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      downloadBlob(blob, "qrcode.svg");
    } catch {
      toast.error("Failed to generate SVG");
    }
  };

  return (
    <ToolLayout
      toolName="QR Code Generator"
      toolDescription="Generate QR codes for URLs, text, phone numbers and email addresses with custom colors."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Settings */}
        <div className="space-y-6">
          {/* Type selector */}
          <div className="glass rounded-xl p-6">
            <h3 className="font-medium text-brand-text mb-4">Type</h3>
            <div className="grid grid-cols-4 gap-2">
              {(["url", "text", "tel", "email"] as QRType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setQrType(t);
                    setInput("");
                  }}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                    qrType === t
                      ? "bg-brand-indigo/20 border border-brand-indigo text-brand-text"
                      : "bg-white/5 border border-white/10 text-brand-muted hover:border-white/20"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="glass rounded-xl p-6">
            <h3 className="font-medium text-brand-text mb-4">Content</h3>
            {qrType === "text" ? (
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholders[qrType]}
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-indigo/50 resize-none"
              />
            ) : (
              <input
                type={qrType === "email" ? "email" : "text"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholders[qrType]}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-indigo/50"
              />
            )}
          </div>

          {/* Colors */}
          <div className="glass rounded-xl p-6">
            <h3 className="font-medium text-brand-text mb-4">Colors</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-brand-muted mb-2">Foreground</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={fgColor}
                    onChange={(e) => setFgColor(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-brand-text text-sm focus:outline-none focus:border-brand-indigo/50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-brand-muted mb-2">Background</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-brand-text text-sm focus:outline-none focus:border-brand-indigo/50"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Size */}
          <div className="glass rounded-xl p-6">
            <h3 className="font-medium text-brand-text mb-4">
              Size: {size}px
            </h3>
            <input
              type="range"
              min="100"
              max="1000"
              step="50"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full accent-brand-indigo"
            />
            <div className="flex justify-between text-xs text-brand-muted mt-1">
              <span>100px</span>
              <span>1000px</span>
            </div>
          </div>
        </div>

        {/* Preview & Download */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-8 flex items-center justify-center min-h-[350px]">
            {qrDataUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={qrDataUrl}
                alt="Generated QR Code"
                className="max-w-full rounded-lg"
                style={{ maxHeight: "300px" }}
              />
            ) : (
              <p className="text-brand-muted text-center">
                Enter content to generate a QR code
              </p>
            )}
          </div>

          {qrDataUrl && (
            <div className="flex gap-4">
              <button
                onClick={downloadPNG}
                className="flex-1 px-6 py-3 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Download PNG
              </button>
              <button
                onClick={downloadSVG}
                className="flex-1 px-6 py-3 rounded-xl font-semibold text-brand-text bg-white/5 hover:bg-white/10 transition-all border border-white/10"
              >
                Download SVG
              </button>
            </div>
          )}
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </ToolLayout>
  );
}
