"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";

type EncodingMode = "encodeURIComponent" | "encodeURI";
type ActiveField = "decoded" | "encoded" | null;

function encode(text: string, mode: EncodingMode): string {
  try {
    return mode === "encodeURIComponent"
      ? encodeURIComponent(text)
      : encodeURI(text);
  } catch {
    return text;
  }
}

function decode(text: string, mode: EncodingMode): string {
  try {
    return mode === "encodeURIComponent"
      ? decodeURIComponent(text)
      : decodeURI(text);
  } catch {
    return text;
  }
}

export default function UrlEncoderPage() {
  const [decoded, setDecoded] = useState("");
  const [encoded, setEncoded] = useState("");
  const [mode, setMode] = useState<EncodingMode>("encodeURIComponent");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [_activeField, setActiveField] = useState<ActiveField>(null);

  const handleDecodedChange = useCallback(
    (value: string) => {
      setDecoded(value);
      setEncoded(encode(value, mode));
    },
    [mode]
  );

  const handleEncodedChange = useCallback(
    (value: string) => {
      setEncoded(value);
      setDecoded(decode(value, mode));
    },
    [mode]
  );

  // Re-encode/decode when mode changes
  useEffect(() => {
    if (decoded) {
      setEncoded(encode(decoded, mode));
    }
  }, [mode, decoded]);

  const copyToClipboard = async (text: string, label: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const clearAll = () => {
    setDecoded("");
    setEncoded("");
    setActiveField(null);
  };

  const swapContent = () => {
    const prevDecoded = decoded;
    const prevEncoded = encoded;
    setDecoded(prevEncoded);
    setEncoded(prevDecoded);
  };

  const modes: { value: EncodingMode; label: string }[] = [
    { value: "encodeURIComponent", label: "encodeURIComponent" },
    { value: "encodeURI", label: "encodeURI" },
  ];

  return (
    <ToolLayout
      toolName="URL Encoder/Decoder"
      toolDescription="Encode or decode URL strings instantly. Supports full URL and component encoding. Everything runs in your browser."
    >
      <div className="space-y-6">
        {/* Mode Selector */}
        <div className="glass rounded-2xl p-6">
          <label className="text-sm font-medium text-t-secondary mb-3 block">
            Encoding Mode
          </label>
          <div className="flex gap-2">
            {modes.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setMode(value)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all font-mono ${
                  mode === value
                    ? "bg-indigo-500/20 border border-indigo-500 text-t-primary"
                    : "bg-white/[0.04] border border-white/[0.08] text-t-secondary hover:border-white/20"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Decoded Input */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-t-secondary">
              Decoded (Plain Text)
            </label>
            <button
              onClick={() => copyToClipboard(decoded, "Decoded text")}
              disabled={!decoded}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-t-secondary bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-t-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy
            </button>
          </div>
          <textarea
            value={decoded}
            onChange={(e) => handleDecodedChange(e.target.value)}
            onFocus={() => setActiveField("decoded")}
            onBlur={() => setActiveField(null)}
            placeholder="Enter plain text to encode..."
            rows={5}
            className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border text-t-primary placeholder:text-t-tertiary focus:outline-none focus:border-accent text-sm leading-relaxed resize-none font-mono transition-colors"
          />
        </div>

        {/* Swap / Clear Buttons */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={swapContent}
            disabled={!decoded && !encoded}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-t-secondary bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-t-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
            Swap
          </button>
          <button
            onClick={clearAll}
            disabled={!decoded && !encoded}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-t-secondary bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-t-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
        </div>

        {/* Encoded Output */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-t-secondary">
              Encoded (URL)
            </label>
            <button
              onClick={() => copyToClipboard(encoded, "Encoded text")}
              disabled={!encoded}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-t-secondary bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-t-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy
            </button>
          </div>
          <textarea
            value={encoded}
            onChange={(e) => handleEncodedChange(e.target.value)}
            onFocus={() => setActiveField("encoded")}
            onBlur={() => setActiveField(null)}
            placeholder="Enter URL-encoded text to decode..."
            rows={5}
            className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border text-t-primary placeholder:text-t-tertiary focus:outline-none focus:border-accent text-sm leading-relaxed resize-none font-mono transition-colors"
          />
        </div>
      </div>
    </ToolLayout>
  );
}
