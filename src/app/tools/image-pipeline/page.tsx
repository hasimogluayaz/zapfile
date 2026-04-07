"use client";

import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import imageCompression from "browser-image-compression";
import { saveAs } from "file-saver";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

type Step = 1 | 2 | 3;

export default function ImagePipelinePage() {
  const { t } = useI18n();
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [quality, setQuality] = useState(0.85);
  const [blobWorking, setBlobWorking] = useState<Blob | null>(null);
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [lockRatio, setLockRatio] = useState(true);
  const [ratio, setRatio] = useState(1);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;
    setFile(f);
    setBlobWorking(null);
    setStep(2);
    const url = URL.createObjectURL(f);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    const img = new window.Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      setRatio(w / h);
      setWidth(w);
      setHeight(h);
    };
    img.src = url;
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    maxFiles: 1,
  });

  const onWidthChange = (v: number) => {
    setWidth(v);
    if (lockRatio) setHeight(Math.round(v / ratio));
  };

  const onHeightChange = (v: number) => {
    setHeight(v);
    if (lockRatio) setWidth(Math.round(v * ratio));
  };

  const runCompress = async (skip: boolean) => {
    if (!file) return;
    setProcessing(true);
    try {
      if (skip) {
        setBlobWorking(file);
      } else {
        const compressed = await imageCompression(file, {
          maxSizeMB: 100,
          initialQuality: quality,
          useWebWorker: true,
        });
        setBlobWorking(compressed);
      }
      setStep(3);
    } finally {
      setProcessing(false);
    }
  };

  const downloadFinal = async (skipResize: boolean) => {
    if (!blobWorking) return;
    setProcessing(true);
    try {
      let out: Blob = blobWorking;
      let name = file?.name.replace(/\.[^.]+$/, "") || "image";
      if (!skipResize) {
        const bmp = await createImageBitmap(blobWorking);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
        bmp.close();
        out = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error())), "image/png");
        });
        name += "-pipeline";
      }
      saveAs(out, `${name}.png`);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setStep(1);
    setFile(null);
    setBlobWorking(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const steps: { n: Step; label: string }[] = [
    { n: 1, label: t("pipeline.step1") },
    { n: 2, label: t("pipeline.step2") },
    { n: 3, label: t("pipeline.step3") },
  ];

  return (
    <ToolLayout
      toolName="Image Pipeline"
      toolDescription="Compress, resize, and download in one guided flow"
    >
      <div className="space-y-6">
        <p className="text-sm text-t-secondary">{t("pipeline.hint")}</p>

        <div className="flex flex-wrap gap-2" role="list" aria-label="Steps">
          {steps.map((s) => (
            <span
              key={s.n}
              role="listitem"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                step === s.n
                  ? "border-accent bg-accent-light text-accent"
                  : "border-border text-t-tertiary"
              }`}
            >
              {s.label}
            </span>
          ))}
        </div>

        {step === 1 && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-accent bg-accent-light" : "border-border"
            }`}
          >
            <input {...getInputProps()} />
            <p className="text-t-secondary">{t("pipeline.drop")}</p>
          </div>
        )}

        {step >= 2 && previewUrl && (
          <div className="rounded-xl overflow-hidden border border-border max-h-64 flex justify-center bg-bg-secondary">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="" className="max-h-64 object-contain" />
          </div>
        )}

        {step === 2 && (
          <div className="glass rounded-xl p-6 space-y-4">
            <label className="block text-sm font-medium text-t-secondary">
              {t("pipeline.quality")}: {Math.round(quality * 100)}%
            </label>
            <input
              type="range"
              min={0.5}
              max={1}
              step={0.05}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={processing}
                onClick={() => runCompress(false)}
                className="px-4 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent-hover disabled:opacity-50"
              >
                {t("pipeline.step2")} →
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={() => runCompress(true)}
                className="px-4 py-2 rounded-lg border border-border bg-bg-secondary hover:bg-bg-tertiary disabled:opacity-50"
              >
                {t("pipeline.skipCompress")}
              </button>
            </div>
          </div>
        )}

        {step === 3 && blobWorking && (
          <div className="glass rounded-xl p-6 space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-t-secondary" htmlFor="pw">
                  {t("pipeline.width")}
                </label>
                <input
                  id="pw"
                  type="number"
                  min={1}
                  value={width}
                  onChange={(e) => onWidthChange(Number(e.target.value) || 1)}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-t-primary"
                />
              </div>
              <div>
                <label className="text-sm text-t-secondary" htmlFor="ph">
                  {t("pipeline.height")}
                </label>
                <input
                  id="ph"
                  type="number"
                  min={1}
                  value={height}
                  onChange={(e) => onHeightChange(Number(e.target.value) || 1)}
                  className="mt-1 w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-t-primary"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-t-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={lockRatio}
                onChange={(e) => {
                  const on = e.target.checked;
                  setLockRatio(on);
                  if (on && height > 0) setRatio(width / height);
                }}
              />
              {t("pipeline.lockRatio")}
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={processing}
                onClick={() => downloadFinal(false)}
                className="px-4 py-2 rounded-lg bg-accent text-white font-medium hover:bg-accent-hover disabled:opacity-50"
              >
                {t("pipeline.download")}
              </button>
              <button
                type="button"
                disabled={processing}
                onClick={() => downloadFinal(true)}
                className="px-4 py-2 rounded-lg border border-border bg-bg-secondary hover:bg-bg-tertiary disabled:opacity-50"
              >
                {t("pipeline.skipResize")}
              </button>
              <button
                type="button"
                onClick={reset}
                className="px-4 py-2 rounded-lg text-t-secondary hover:text-t-primary"
              >
                {t("pipeline.reset")}
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
