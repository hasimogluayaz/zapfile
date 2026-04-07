"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

type InputMode = "text" | "file";

interface HashResult {
  algorithm: string;
  hash: string;
}

const ALGORITHMS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const;

async function computeHash(
  algorithm: string,
  data: ArrayBuffer,
): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(algorithm, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default function HashGeneratorPage() {
  const { t } = useI18n();
  const workerRef = useRef<Worker | null>(null);
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [textInput, setTextInput] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [results, setResults] = useState<HashResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../../../workers/hash.worker.ts", import.meta.url),
    );
    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setFileName(null);
      setFileBuffer(null);
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setFileBuffer(reader.result as ArrayBuffer);
    };
    reader.onerror = () => {
      toast.error("Failed to read file");
      setFileName(null);
      setFileBuffer(null);
    };
    reader.readAsArrayBuffer(file);
  };

  const generateHashes = async () => {
    let data: ArrayBuffer;

    if (inputMode === "text") {
      if (!textInput.trim()) {
        toast.error(t("hash.enterSome"));
        return;
      }
      data = new TextEncoder().encode(textInput).buffer as ArrayBuffer;
    } else {
      if (!fileBuffer) {
        toast.error(t("hash.selectSome"));
        return;
      }
      data = fileBuffer;
    }

    const runMainThread = async () => {
      const hashResults: HashResult[] = await Promise.all(
        ALGORITHMS.map(async (algo) => ({
          algorithm: algo,
          hash: await computeHash(algo, data),
        })),
      );
      setResults(hashResults);
      toast.success(t("hash.success"));
    };

    const w = workerRef.current;
    if (!w) {
      setIsGenerating(true);
      try {
        await runMainThread();
      } catch {
        toast.error(t("hash.fail"));
        setResults([]);
      } finally {
        setIsGenerating(false);
      }
      return;
    }

    setIsGenerating(true);
    const copy = data.slice(0);

    const onMessage = (ev: MessageEvent) => {
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      setIsGenerating(false);
      const payload = ev.data as
        | { ok: true; results: HashResult[] }
        | { ok: false; error?: string };
      if (payload.ok && payload.results) {
        setResults(payload.results);
        toast.success(t("hash.success"));
      } else {
        void (async () => {
          try {
            await runMainThread();
          } catch {
            toast.error(t("hash.fail"));
            setResults([]);
          }
        })();
      }
    };

    const onError = () => {
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      setIsGenerating(false);
      void (async () => {
        try {
          await runMainThread();
        } catch {
          toast.error(t("hash.fail"));
          setResults([]);
        }
      })();
    };

    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);
    w.postMessage({ buffer: copy }, [copy]);
  };

  const copyToClipboard = async (hash: string, algorithm: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      toast.success(`${algorithm} hash copied`);
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const copyAll = async () => {
    if (results.length === 0) return;
    const text = results.map((r) => `${r.algorithm}: ${r.hash}`).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("All hashes copied");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const clearAll = () => {
    setTextInput("");
    setFileName(null);
    setFileBuffer(null);
    setResults([]);
  };

  return (
    <ToolLayout
      toolName="Hash Generator"
      toolDescription="Generate SHA-1, SHA-256, SHA-384, and SHA-512 hashes from text or files. Everything runs in your browser."
    >
      <div className="space-y-8">
        {/* Input Section */}
        <div className="glass rounded-2xl p-6">
          {/* Mode Tabs */}
          <div className="flex gap-2 mb-6">
            {(["text", "file"] as InputMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setInputMode(mode);
                  setResults([]);
                }}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all capitalize ${
                  inputMode === mode
                    ? "bg-brand-indigo/20 border border-brand-indigo text-brand-text"
                    : "bg-white/[0.04] border border-white/[0.08] text-brand-muted hover:border-white/20"
                }`}
              >
                {mode === "text" ? t("hash.textInput") : t("hash.fileInput")}
              </button>
            ))}
          </div>

          {/* Text Input */}
          {inputMode === "text" && (
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={t("hash.enterText")}
              rows={6}
              className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-indigo/40 resize-none font-mono text-sm"
            />
          )}

          {/* File Input */}
          {inputMode === "file" && (
            <div className="space-y-3">
              <label className="block w-full cursor-pointer">
                <div className="flex items-center justify-center gap-3 px-4 py-8 rounded-xl bg-white/[0.04] border border-dashed border-white/[0.08] hover:border-brand-indigo/40 transition-colors">
                  <svg
                    className="w-6 h-6 text-brand-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338-2.32 3 3 0 013.808 3.397A3.75 3.75 0 0118 19.5H6.75z"
                    />
                  </svg>
                  <span className="text-brand-muted text-sm">
                    {fileName ? fileName : t("hash.selectFile")}
                  </span>
                </div>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={generateHashes}
              disabled={isGenerating}
              className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-brand hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isGenerating ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  {t("hash.generating")}
                </span>
              ) : (
                t("hash.generate")
              )}
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="px-6 py-3 rounded-xl font-semibold text-brand-text bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all"
            >
              {t("ui.clear")}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {results.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-brand-text">
                {t("hash.results")}
              </h3>
              <button
                type="button"
                onClick={copyAll}
                className="px-4 py-2 rounded-lg text-sm font-medium text-brand-muted bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-brand-text transition-all"
              >
                {t("hash.copyAll")}
              </button>
            </div>

            <div className="space-y-3">
              {results.map((result) => (
                <div
                  key={result.algorithm}
                  className="glass rounded-2xl p-6"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-brand-text">
                      {result.algorithm}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(result.hash, result.algorithm)
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-muted bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-brand-text transition-all"
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
                  <p className="font-mono text-sm text-brand-muted break-all leading-relaxed select-all">
                    {result.hash}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
