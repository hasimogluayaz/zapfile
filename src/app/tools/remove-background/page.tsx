"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import { getFileNameWithoutExtension } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export default function RemoveBackgroundPage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState("");

  const handleFilesSelected = useCallback((files: File[]) => {
    const f = files[0];
    setFile(f);
    setResultUrl(null);
    setResultBlob(null);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  }, []);

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(t("ui.loading"));
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      setProgress(t("ui.processing"));
      const blob = await removeBackground(file, {
        progress: (key: string, current: number, total: number) => {
          if (key.startsWith("fetch:")) {
            const pct = total > 0 ? Math.round((current / total) * 100) : 0;
            setProgress(`Downloading AI model… ${pct}%`);
          } else if (key.startsWith("compute:")) {
            const pct = total > 0 ? Math.round((current / total) * 100) : 0;
            setProgress(`Processing… ${pct}%`);
          }
        },
      });
      setResultBlob(blob);
      setResultUrl(URL.createObjectURL(blob));
      toast.success(t("rmbg.success"));
    } catch {
      toast.error(t("rmbg.fail"));
    } finally {
      setProcessing(false);
      setProgress("");
    }
  };

  const handleReset = () => {
    setFile(null);
    setPreviewUrl(null);
    setResultUrl(null);
    setResultBlob(null);
  };

  return (
    <ToolLayout
      toolName={t("tool.remove-background.name")}
      toolDescription={t("tool.remove-background.desc")}
    >
      {!file ? (
        <FileDropzone
          onFilesSelected={handleFilesSelected}
          accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp"] }}
          multiple={false}
          label={t("ui.dropImage")}
        />
      ) : (
        <div className="space-y-6">
          {/* Before / After */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Original */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-t-secondary">{t("ui.original")}</p>
              <div className="rounded-xl overflow-hidden border border-border bg-bg-secondary flex items-center justify-center min-h-[200px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl!}
                  alt="original"
                  className="max-w-full max-h-64 object-contain"
                />
              </div>
            </div>

            {/* Result */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-t-secondary">{t("ui.result")}</p>
              <div
                className="rounded-xl overflow-hidden border border-border flex items-center justify-center min-h-[200px]"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                  backgroundSize: "16px 16px",
                  backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
                }}
              >
                {resultUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resultUrl}
                    alt="result"
                    className="max-w-full max-h-64 object-contain"
                  />
                ) : (
                  <p className="text-sm text-t-tertiary px-4 text-center">
                    {processing ? progress : t("rmbg.hint")}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Note */}
          {!resultUrl && (
            <p className="text-xs text-t-tertiary text-center">
              {t("rmbg.note")}
            </p>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 justify-center">
            {!resultUrl ? (
              <button
                onClick={handleProcess}
                disabled={processing}
                className="btn-primary px-6 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {processing ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    {progress || t("ui.processing")}
                  </>
                ) : (
                  t("rmbg.button")
                )}
              </button>
            ) : (
              <>
                <DownloadButton
                  blob={resultBlob!}
                  filename={`${getFileNameWithoutExtension(file!.name)}-no-bg.png`}
                  label={t("rmbg.download")}
                />
                <button
                  onClick={handleReset}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border text-t-secondary hover:text-t-primary hover:bg-bg-secondary transition-colors"
                >
                  {t("ui.processAnother")}
                </button>
              </>
            )}

            {!processing && !resultUrl && (
              <button
                onClick={handleReset}
                className="px-5 py-2.5 rounded-xl text-sm font-medium border border-border text-t-secondary hover:text-t-primary hover:bg-bg-secondary transition-colors"
              >
                {t("ui.cancel")}
              </button>
            )}
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
