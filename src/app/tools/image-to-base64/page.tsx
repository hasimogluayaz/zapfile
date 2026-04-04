"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { formatFileSize } from "@/lib/utils";

type OutputFormat = "raw" | "datauri" | "html" | "css";

const formatLabels: Record<OutputFormat, string> = {
  raw: "Raw Base64",
  datauri: "Data URI",
  html: "HTML <img>",
  css: "CSS Background",
};

export default function ImageToBase64Page() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [base64Raw, setBase64Raw] = useState<string>("");
  const [dataUri, setDataUri] = useState<string>("");
  const [activeFormat, setActiveFormat] = useState<OutputFormat>("raw");

  // Reverse: paste base64
  const [pastedBase64, setPastedBase64] = useState("");
  const [decodedPreview, setDecodedPreview] = useState<string | null>(null);
  const [showReverse, setShowReverse] = useState(false);

  const handleFilesSelected = useCallback((files: File[]) => {
    const f = files[0];
    setFile(f);
    setBase64Raw("");
    setDataUri("");

    // Create preview
    const objectUrl = URL.createObjectURL(f);
    setPreview(objectUrl);

    // Read as base64
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setDataUri(result);
      // Extract raw base64 (strip the data:... prefix)
      const commaIdx = result.indexOf(",");
      if (commaIdx !== -1) {
        setBase64Raw(result.substring(commaIdx + 1));
      }
    };
    reader.onerror = () => toast.error("Failed to read file.");
    reader.readAsDataURL(f);
  }, []);

  const getOutput = (): string => {
    switch (activeFormat) {
      case "raw":
        return base64Raw;
      case "datauri":
        return dataUri;
      case "html":
        return `<img src="${dataUri}" alt="image" />`;
      case "css":
        return `background-image: url('${dataUri}');`;
      default:
        return base64Raw;
    }
  };

  const handleCopy = () => {
    const text = getOutput();
    navigator.clipboard.writeText(text).then(
      () => toast.success(`${formatLabels[activeFormat]} copied to clipboard!`),
      () => toast.error("Failed to copy to clipboard.")
    );
  };

  const base64Size = base64Raw ? new Blob([base64Raw]).size : 0;

  const handlePastedBase64 = () => {
    if (!pastedBase64.trim()) return;
    let src = pastedBase64.trim();
    // If it's raw base64 without data URI prefix, try adding one
    if (!src.startsWith("data:")) {
      src = `data:image/png;base64,${src}`;
    }
    setDecodedPreview(src);
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setBase64Raw("");
    setDataUri("");
    setActiveFormat("raw");
  };

  return (
    <ToolLayout
      toolName="Image to Base64"
      toolDescription="Convert images to Base64 encoded strings"
    >
      <div className="space-y-6">
        {/* Mode toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowReverse(false)}
            className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${
              !showReverse
                ? "bg-brand-indigo/20 border border-brand-indigo text-brand-text"
                : "bg-white/5 border border-white/10 text-brand-muted hover:border-white/20"
            }`}
          >
            Image to Base64
          </button>
          <button
            onClick={() => setShowReverse(true)}
            className={`px-4 py-2 rounded-xl text-[13px] font-medium transition-all ${
              showReverse
                ? "bg-brand-indigo/20 border border-brand-indigo text-brand-text"
                : "bg-white/5 border border-white/10 text-brand-muted hover:border-white/20"
            }`}
          >
            Base64 to Image
          </button>
        </div>

        {!showReverse ? (
          <>
            {/* Image to Base64 mode */}
            {!file ? (
              <FileDropzone
                onFilesSelected={handleFilesSelected}
                accept={{
                  "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg"],
                }}
                formats={["JPG", "PNG", "WEBP", "SVG", "GIF"]}
                label="Drop your image here to convert to Base64"
              />
            ) : (
              <>
                {/* Preview + Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                  {/* Preview */}
                  <div className="glass rounded-xl p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[12px] font-medium text-brand-muted">
                        Image Preview
                      </p>
                      <button
                        onClick={reset}
                        className="text-[11px] text-brand-muted hover:text-red-400 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                    {preview && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={preview}
                        alt="Preview"
                        className="w-full rounded-lg border border-white/10 object-contain max-h-48"
                      />
                    )}
                    <p className="text-[11px] text-brand-muted truncate">
                      {file.name} &middot; {formatFileSize(file.size)}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="glass rounded-xl p-4 space-y-3">
                    <h3 className="text-[13px] font-semibold text-brand-text">
                      Conversion Stats
                    </h3>
                    <div className="space-y-2 text-[12px]">
                      <div className="flex justify-between">
                        <span className="text-brand-muted">Original Size</span>
                        <span className="text-brand-text">{formatFileSize(file.size)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-brand-muted">Base64 Length</span>
                        <span className="text-brand-text">
                          {base64Raw.length.toLocaleString()} chars
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-brand-muted">Base64 Size</span>
                        <span className="text-brand-text">{formatFileSize(base64Size)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-brand-muted">Size Increase</span>
                        <span className="text-brand-text">
                          {file.size > 0
                            ? `~${Math.round(((base64Size - file.size) / file.size) * 100)}%`
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Format tabs */}
                <div className="glass rounded-xl p-4 space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(formatLabels) as OutputFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => setActiveFormat(fmt)}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                          activeFormat === fmt
                            ? "bg-brand-indigo/20 border border-brand-indigo text-brand-text"
                            : "bg-white/5 border border-white/10 text-brand-muted hover:border-white/20"
                        }`}
                      >
                        {formatLabels[fmt]}
                      </button>
                    ))}
                  </div>

                  {/* Output */}
                  <textarea
                    readOnly
                    value={getOutput()}
                    className="w-full h-40 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-brand-text resize-none focus:outline-none focus:border-brand-indigo/50 transition-colors"
                  />

                  {/* Copy button */}
                  <button
                    onClick={handleCopy}
                    className="px-6 py-3 rounded-xl font-semibold text-[14px] text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Copy {formatLabels[activeFormat]}
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {/* Base64 to Image (reverse) */}
            <div className="glass rounded-xl p-4 space-y-3">
              <h3 className="text-[13px] font-semibold text-brand-text">
                Paste Base64 String
              </h3>
              <textarea
                value={pastedBase64}
                onChange={(e) => setPastedBase64(e.target.value)}
                placeholder="Paste a Base64 string or Data URI here..."
                className="w-full h-32 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] font-mono text-brand-text placeholder:text-brand-muted/50 resize-none focus:outline-none focus:border-brand-indigo/50 transition-colors"
              />
              <button
                onClick={handlePastedBase64}
                disabled={!pastedBase64.trim()}
                className={`px-6 py-3 rounded-xl font-semibold text-[14px] text-white transition-all ${
                  !pastedBase64.trim()
                    ? "bg-white/10 cursor-not-allowed text-brand-muted"
                    : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]"
                }`}
              >
                Decode Image
              </button>
            </div>

            {decodedPreview && (
              <div className="glass rounded-xl p-4 space-y-3">
                <h3 className="text-[13px] font-semibold text-brand-text">
                  Decoded Image
                </h3>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={decodedPreview}
                  alt="Decoded from Base64"
                  className="max-h-64 rounded-lg border border-white/10 mx-auto block"
                  onError={() => {
                    toast.error("Invalid Base64 string. Could not decode as image.");
                    setDecodedPreview(null);
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </ToolLayout>
  );
}
