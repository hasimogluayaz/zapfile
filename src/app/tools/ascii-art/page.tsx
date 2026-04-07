"use client";

import { useState, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { useI18n } from "@/lib/i18n";

const RAMP = " .:-=+*#%@";

function imageToAscii(
  img: HTMLImageElement,
  widthChars: number,
  invert: boolean,
): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const aspect = img.naturalHeight / img.naturalWidth;
  const w = Math.min(widthChars, 160);
  const h = Math.max(1, Math.round(w * aspect * 0.55));
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const ramp = invert
    ? RAMP.split("").reverse().join("")
    : RAMP;

  const lines: string[] = [];
  for (let y = 0; y < h; y++) {
    let line = "";
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      const lum = a < 32 ? 0 : 0.299 * r + 0.587 * g + 0.114 * b;
      const idx = Math.floor((lum / 255) * (ramp.length - 1));
      line += ramp[idx];
    }
    lines.push(line);
  }
  return lines.join("\n");
}

export default function AsciiArtPage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ascii, setAscii] = useState("");
  const [widthChars, setWidthChars] = useState(80);
  const [invert, setInvert] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleFiles = useCallback((files: File[]) => {
    const f = files[0];
    setFile(f);
    setAscii("");
    const u = URL.createObjectURL(f);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return u;
    });
  }, []);

  const convert = useCallback(() => {
    if (!previewUrl) return;
    setProcessing(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const out = imageToAscii(img, widthChars, invert);
        setAscii(out);
        toast.success(t("ascii.convert"));
      } catch {
        toast.error(t("rmbg.fail"));
      } finally {
        setProcessing(false);
      }
    };
    img.onerror = () => {
      toast.error(t("rmbg.fail"));
      setProcessing(false);
    };
    img.src = previewUrl;
  }, [previewUrl, widthChars, invert, t]);

  const copyText = useCallback(async () => {
    if (!ascii) return;
    try {
      await navigator.clipboard.writeText(ascii);
      toast.success(t("ascii.copy"));
    } catch {
      toast.error(t("rmbg.fail"));
    }
  }, [ascii, t]);

  const downloadTxt = useCallback(() => {
    if (!ascii || !file) return;
    const blob = new Blob([ascii], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${file.name.replace(/\.[^.]+$/, "")}-ascii.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [ascii, file]);

  const previewSnippet = useMemo(
    () => (ascii ? ascii.slice(0, 2000) + (ascii.length > 2000 ? "\n…" : "") : ""),
    [ascii],
  );

  return (
    <ToolLayout
      toolName={t("tool.ascii-art.name")}
      toolDescription={t("tool.ascii-art.desc")}
    >
      <div className="space-y-6">
        {!file ? (
          <FileDropzone
            onFilesSelected={handleFiles}
            accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif"] }}
            multiple={false}
            label={t("ascii.hint")}
            formats={["jpg", "png", "webp", "gif"]}
          />
        ) : (
          <>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="text-xs text-t-tertiary block mb-1">
                  {t("ascii.width")}
                </label>
                <input
                  type="range"
                  min={32}
                  max={120}
                  value={widthChars}
                  onChange={(e) => setWidthChars(Number(e.target.value))}
                  className="w-48 accent-accent"
                />
                <span className="text-sm text-t-secondary ml-2">{widthChars}</span>
              </div>
              <label className="flex items-center gap-2 text-sm text-t-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={invert}
                  onChange={(e) => setInvert(e.target.checked)}
                  className="rounded border-border"
                />
                {t("ascii.invert")}
              </label>
              <button
                type="button"
                onClick={convert}
                disabled={processing}
                className="btn-primary px-5 py-2 rounded-xl text-sm font-semibold disabled:opacity-60"
              >
                {processing ? "…" : t("ascii.convert")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setAscii("");
                  if (previewUrl) URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }}
                className="px-4 py-2 rounded-xl text-sm border border-border text-t-secondary hover:bg-bg-secondary"
              >
                {t("ui.cancel")}
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border overflow-hidden bg-bg-secondary min-h-[200px] flex items-center justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl!}
                  alt=""
                  className="max-w-full max-h-64 object-contain"
                />
              </div>
              <div className="rounded-xl border border-border bg-[#0f1117] p-3 overflow-auto max-h-80">
                <pre className="text-[9px] leading-tight text-emerald-400 font-mono whitespace-pre">
                  {ascii ? previewSnippet : t("ascii.hint")}
                </pre>
              </div>
            </div>

            {ascii && (
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  type="button"
                  onClick={copyText}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-bg-secondary"
                >
                  {t("ascii.copy")}
                </button>
                <button
                  type="button"
                  onClick={downloadTxt}
                  className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold"
                >
                  {t("ascii.download")}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </ToolLayout>
  );
}
