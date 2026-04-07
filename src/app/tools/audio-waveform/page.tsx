"use client";

import { useState, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import { useI18n } from "@/lib/i18n";

function drawWaveform(
  channel: Float32Array,
  width: number,
  height: number,
  lineColor: string,
  bgColor: string,
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  const step = Math.max(1, Math.ceil(channel.length / width));
  const amp = height / 2;
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = 1;

  for (let x = 0; x < width; x++) {
    let min = 1;
    let max = -1;
    for (let i = 0; i < step; i++) {
      const v = channel[Math.min(x * step + i, channel.length - 1)] ?? 0;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const y1 = (1 + min) * amp;
    const y2 = (1 + max) * amp;
    ctx.beginPath();
    ctx.moveTo(x + 0.5, y1);
    ctx.lineTo(x + 0.5, y2);
    ctx.stroke();
  }

  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), "image/png");
  });
}

async function renderWaveformBlob(
  file: File,
  waveColor: string,
  bgColor: string,
  heightPx: number,
): Promise<Blob | null> {
  const actx = new AudioContext();
  const buf = await file.arrayBuffer();
  const audio = await actx.decodeAudioData(buf.slice(0));
  const channel = audio.getChannelData(0);
  const width = Math.min(
    2400,
    Math.max(800, Math.floor(channel.length / 80)),
  );
  await actx.close();
  return drawWaveform(channel, width, heightPx, waveColor, bgColor);
}

export default function AudioWaveformPage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [waveColor, setWaveColor] = useState("#6366f1");
  const [bgColor, setBgColor] = useState("#0f1117");
  const [heightPx, setHeightPx] = useState(360);

  const lastObjectUrl = useRef<string | null>(null);

  const handleFiles = useCallback((files: File[]) => {
    const f = files[0];
    setFile(f);
    setBlob(null);
    if (lastObjectUrl.current) {
      URL.revokeObjectURL(lastObjectUrl.current);
      lastObjectUrl.current = null;
    }
    setPreviewUrl(null);
  }, []);

  const generate = useCallback(async () => {
    if (!file) return;
    setProcessing(true);
    setBlob(null);
    if (lastObjectUrl.current) {
      URL.revokeObjectURL(lastObjectUrl.current);
      lastObjectUrl.current = null;
    }
    setPreviewUrl(null);
    try {
      const b = await renderWaveformBlob(file, waveColor, bgColor, heightPx);
      if (!b) throw new Error("canvas");
      setBlob(b);
      const url = URL.createObjectURL(b);
      lastObjectUrl.current = url;
      setPreviewUrl(url);
      toast.success(t("waveform.generate"));
    } catch {
      toast.error(t("rmbg.fail"));
    } finally {
      setProcessing(false);
    }
  }, [file, waveColor, bgColor, heightPx, t]);

  return (
    <ToolLayout
      toolName={t("tool.audio-waveform.name")}
      toolDescription={t("tool.audio-waveform.desc")}
    >
      <div className="space-y-6">
        {!file ? (
          <FileDropzone
            onFilesSelected={handleFiles}
            accept={{
              "audio/mpeg": [".mp3"],
              "audio/wav": [".wav"],
              "audio/ogg": [".ogg"],
              "audio/mp4": [".m4a"],
              "audio/webm": [".webm"],
            }}
            multiple={false}
            label={t("waveform.hint")}
            formats={["mp3", "wav", "ogg", "m4a", "webm"]}
          />
        ) : (
          <>
            <div className="glass rounded-xl p-4 space-y-4">
              <div className="flex flex-wrap gap-4 items-center">
                <label className="text-sm text-t-secondary flex items-center gap-2">
                  {t("waveform.color")}
                  <input
                    type="color"
                    value={waveColor}
                    onChange={(e) => setWaveColor(e.target.value)}
                    className="h-8 w-10 rounded border border-border cursor-pointer"
                  />
                </label>
                <label className="text-sm text-t-secondary flex items-center gap-2">
                  {t("waveform.bg")}
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="h-8 w-10 rounded border border-border cursor-pointer"
                  />
                </label>
                <label className="text-sm text-t-secondary">
                  {t("waveform.height")}
                  <input
                    type="range"
                    min={200}
                    max={800}
                    step={20}
                    value={heightPx}
                    onChange={(e) => setHeightPx(Number(e.target.value))}
                    className="ml-2 w-32 accent-accent"
                  />
                  {heightPx}px
                </label>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={generate}
                  disabled={processing}
                  className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
                >
                  {processing ? t("waveform.processing") : t("waveform.generate")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    setBlob(null);
                    if (lastObjectUrl.current) {
                      URL.revokeObjectURL(lastObjectUrl.current);
                      lastObjectUrl.current = null;
                    }
                    setPreviewUrl(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-sm border border-border text-t-secondary hover:bg-bg-secondary"
                >
                  {t("ui.cancel")}
                </button>
              </div>
            </div>

            {previewUrl && blob && (
              <div className="space-y-4">
                <div className="rounded-xl border border-border overflow-hidden bg-bg-secondary">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Waveform"
                    className="w-full h-auto block"
                  />
                </div>
                <div className="flex justify-center">
                  <DownloadButton
                    blob={blob}
                    filename={`${file.name.replace(/\.[^.]+$/, "")}-waveform.png`}
                    label={t("waveform.download")}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ToolLayout>
  );
}
