"use client";

import { useState, useRef } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProcessButton from "@/components/ProcessButton";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import FileSizeCompare from "@/components/FileSizeCompare";
import { formatFileSize } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type Preset = "quick" | "balanced" | "quality";
type Resolution = "original" | "1080" | "720" | "480";
type EncodingSpeed = "ultrafast" | "fast" | "medium" | "slow";

const presetSettings: Record<
  Preset,
  { crf: number; label: string; desc: string }
> = {
  quick: { crf: 35, label: "Quick", desc: "Smallest file, acceptable quality" },
  balanced: { crf: 28, label: "Balanced", desc: "Good quality-to-size ratio" },
  quality: { crf: 23, label: "Quality", desc: "Best quality, larger file" },
};

const resolutionOptions: { value: Resolution; label: string }[] = [
  { value: "original", label: "Original" },
  { value: "1080", label: "1080p" },
  { value: "720", label: "720p" },
  { value: "480", label: "480p" },
];

const encodingSpeedOptions: {
  value: EncodingSpeed;
  label: string;
  desc: string;
}[] = [
  { value: "ultrafast", label: "Ultrafast", desc: "Fastest, largest output" },
  { value: "fast", label: "Fast", desc: "Good speed, moderate compression" },
  { value: "medium", label: "Medium", desc: "Balanced speed and compression" },
  { value: "slow", label: "Slow", desc: "Best compression, slowest" },
];

const audioBitrateOptions = [
  { value: "64k", label: "64 kbps" },
  { value: "128k", label: "128 kbps" },
  { value: "192k", label: "192 kbps" },
  { value: "256k", label: "256 kbps" },
];

export default function CompressVideoPage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [preset, setPreset] = useState<Preset>("balanced");
  const [crf, setCrf] = useState(28);
  const [resolution, setResolution] = useState<Resolution>("original");
  const [encodingSpeed, setEncodingSpeed] = useState<EncodingSpeed>("fast");
  const [audioBitrate, setAudioBitrate] = useState("128k");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Blob | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ffmpegRef = useRef<any>(null);

  const handleFilesSelected = (files: File[]) => {
    setFile(files[0]);
    setResult(null);
    setProgress(0);
  };

  const applyPreset = (p: Preset) => {
    setPreset(p);
    setCrf(presetSettings[p].crf);
  };

  const loadFFmpeg = async () => {
    if (ffmpegRef.current) return ffmpegRef.current;
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { fetchFile, toBlobURL } = await import("@ffmpeg/util");
    const ffmpeg = new FFmpeg();

    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm",
      ),
    });

    ffmpegRef.current = { ffmpeg, fetchFile };
    return { ffmpeg, fetchFile };
  };

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress(0);

    try {
      toast.loading(t("compvid.loading"), { id: "ffmpeg-load" });
      const { ffmpeg, fetchFile } = await loadFFmpeg();
      toast.dismiss("ffmpeg-load");

      ffmpeg.on("progress", ({ progress: p }: { progress: number }) => {
        setProgress(Math.round(p * 100));
      });

      const inputName =
        "input" + file.name.substring(file.name.lastIndexOf("."));
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      // Build ffmpeg args
      const args = ["-i", inputName];

      // Video codec + CRF
      args.push(
        "-c:v",
        "libx264",
        "-crf",
        String(crf),
        "-preset",
        encodingSpeed,
      );

      // Resolution scaling
      if (resolution !== "original") {
        const h = parseInt(resolution);
        args.push("-vf", `scale=-2:${h}`);
      }

      // Audio
      args.push("-c:a", "aac", "-b:a", audioBitrate);

      // Fast start for web playback
      args.push("-movflags", "+faststart", "output.mp4");

      await ffmpeg.exec(args);

      const data = await ffmpeg.readFile("output.mp4");
      const blob = new Blob([(data as Uint8Array).buffer as ArrayBuffer], {
        type: "video/mp4",
      });
      setResult(blob);
      toast.success(t("compvid.success"));

      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile("output.mp4");
    } catch (error) {
      toast.error(t("compvid.fail"));
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
  };

  return (
    <ToolLayout
      toolName="Compress Video"
      toolDescription="Reduce video file size with full control over quality, resolution, and encoding settings. Processing happens entirely in your browser."
    >
      {!file ? (
        <FileDropzone
          onFilesSelected={handleFilesSelected}
          accept={{ "video/*": [".mp4", ".webm", ".mov", ".avi"] }}
          formats={["MP4", "WEBM", "MOV", "AVI"]}
        />
      ) : !result ? (
        <div className="space-y-6">
          {/* File info */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-brand-text">{file.name}</p>
                <p className="text-sm text-brand-muted">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <button
                onClick={reset}
                className="text-sm text-brand-muted hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="glass rounded-xl p-6">
            <h3 className="font-medium text-brand-text mb-4">{t("compvid.quickPresets")}</h3>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(presetSettings) as Preset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => applyPreset(p)}
                  className={`p-3 rounded-lg text-center transition-all ${
                    preset === p && crf === presetSettings[p].crf
                      ? "bg-brand-indigo/20 border border-brand-indigo text-brand-text"
                      : "bg-white/5 border border-white/10 text-brand-muted hover:border-white/20"
                  }`}
                >
                  <p className="font-medium text-sm">
                    {p === "quick" ? t("compvid.quick") : p === "balanced" ? t("compvid.balanced") : t("compvid.qualityPreset")}
                  </p>
                  <p className="text-xs mt-1 opacity-70">
                    {p === "quick" ? t("compvid.smallestFile") : p === "balanced" ? t("compvid.goodRatio") : t("compvid.bestQuality")}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="glass rounded-xl overflow-hidden">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full p-4 flex items-center justify-between text-brand-text hover:bg-white/5 transition-colors"
            >
              <span className="font-medium text-sm">{t("compvid.advanced")}</span>
              <svg
                className={`w-4 h-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {showAdvanced && (
              <div className="px-6 pb-6 space-y-5 border-t border-white/5 pt-5">
                {/* CRF Slider */}
                <div>
                  <div className="flex justify-between mb-2">
                    <label className="text-sm text-brand-muted">
                      {t("compvid.crf")}
                    </label>
                    <span className="text-sm font-medium text-brand-text">
                      {crf}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={18}
                    max={51}
                    value={crf}
                    onChange={(e) => setCrf(Number(e.target.value))}
                    className="w-full accent-brand-indigo"
                  />
                  <div className="flex justify-between text-xs text-brand-muted mt-1">
                    <span>{t("compvid.bestCrf")}</span>
                    <span>{t("compvid.smallestCrf")}</span>
                  </div>
                </div>

                {/* Resolution */}
                <div>
                  <label className="block text-sm text-brand-muted mb-2">
                    {t("compvid.resolution")}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {resolutionOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setResolution(opt.value)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          resolution === opt.value
                            ? "bg-brand-indigo text-white"
                            : "bg-white/5 text-brand-muted hover:bg-white/10"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Encoding Speed */}
                <div>
                  <label className="block text-sm text-brand-muted mb-2">
                    {t("compvid.encodingSpeed")}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {encodingSpeedOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setEncodingSpeed(opt.value)}
                        className={`px-3 py-2 rounded-lg text-center transition-all ${
                          encodingSpeed === opt.value
                            ? "bg-brand-indigo text-white"
                            : "bg-white/5 text-brand-muted hover:bg-white/10"
                        }`}
                      >
                        <p className="text-xs font-medium">{opt.value === "ultrafast" ? t("compvid.ultrafast") : opt.value === "fast" ? t("compvid.fast") : opt.value === "medium" ? t("compvid.medium") : t("compvid.slow")}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audio Bitrate */}
                <div>
                  <label className="block text-sm text-brand-muted mb-2">
                    {t("compvid.audioBitrate")}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {audioBitrateOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setAudioBitrate(opt.value)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          audioBitrate === opt.value
                            ? "bg-brand-indigo text-white"
                            : "bg-white/5 text-brand-muted hover:bg-white/10"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {processing && (
            <ProgressBar progress={progress} label={t("compvid.compressing")} />
          )}

          <ProcessButton
            onClick={handleProcess}
            loading={processing}
            disabled={!file}
            label={t("compvid.button")}
            loadingLabel={t("compvid.compressing")}
          />

          <p className="text-xs text-brand-muted text-center">
            {t("ui.ffmpegNote")}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <FileSizeCompare originalSize={file.size} newSize={result.size} />

          <div className="flex flex-wrap gap-4 justify-center">
            <DownloadButton
              blob={result}
              filename={`compressed-${file.name.replace(/\.[^.]+$/, "")}.mp4`}
              label={t("compvid.download")}
            />
            <button
              onClick={reset}
              className="px-6 py-3 rounded-xl font-semibold text-brand-text bg-white/5 hover:bg-white/10 transition-colors"
            >
              {t("compvid.another")}
            </button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
