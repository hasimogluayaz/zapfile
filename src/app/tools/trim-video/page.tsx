"use client";

import { useState, useRef } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProcessButton from "@/components/ProcessButton";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import { formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

function parseTime(str: string): number {
  const parts = str.trim().split(":").map(Number);
  if (parts.some(isNaN)) return -1;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return -1;
}

function formatTime(seconds: number): string {
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function TrimVideoPage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("00:00");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ffmpegRef = useRef<any>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFilesSelected = (files: File[]) => {
    const f = files[0];
    setFile(f);
    setResult(null);
    setResultUrl(null);
    setProgress(0);
    setStartTime("00:00");
    const url = URL.createObjectURL(f);
    setVideoUrl(url);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setEndTime(formatTime(dur));
    }
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

    const start = parseTime(startTime);
    const end = parseTime(endTime);

    if (start < 0 || end < 0) {
      toast.error(t("trimvid.invalidTime"));
      return;
    }
    if (start >= end) {
      toast.error(t("trimvid.startBefore"));
      return;
    }
    if (end > Math.ceil(duration)) {
      toast.error(t("trimvid.exceedsDuration"));
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      toast.loading(t("trimvid.loading"), { id: "ffmpeg-load" });
      const { ffmpeg, fetchFile } = await loadFFmpeg();
      toast.dismiss("ffmpeg-load");

      ffmpeg.on("progress", ({ progress: p }: { progress: number }) => {
        setProgress(Math.round(p * 100));
      });

      const inputName =
        "input" + file.name.substring(file.name.lastIndexOf("."));
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      const outputName = `output${ext}`;

      const args = [
        "-i",
        inputName,
        "-ss",
        formatTime(start),
        "-to",
        formatTime(end),
        "-c",
        "copy",
        outputName,
      ];

      await ffmpeg.exec(args);

      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([(data as Uint8Array).buffer as ArrayBuffer], {
        type: file.type || "video/mp4",
      });
      setResult(blob);

      const url = URL.createObjectURL(blob);
      setResultUrl(url);

      toast.success(t("trimvid.success"));

      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch (error) {
      toast.error(t("trimvid.fail"));
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(null);
    setVideoUrl(null);
    setResult(null);
    setResultUrl(null);
    setProgress(0);
    setDuration(0);
    setStartTime("00:00");
    setEndTime("00:00");
  };

  return (
    <ToolLayout
      toolName="Trim Video"
      toolDescription="Cut video clips by setting start and end time"
    >
      {!file ? (
        <FileDropzone
          onFilesSelected={handleFilesSelected}
          accept={{ "video/*": [".mp4", ".webm", ".mov"] }}
          formats={["MP4", "WEBM", "MOV"]}
        />
      ) : !result ? (
        <div className="space-y-6">
          {/* File info */}
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-t-primary">{file.name}</p>
                <p className="text-sm text-t-secondary">
                  {formatFileSize(file.size)}
                  {duration > 0 && (
                    <> &middot; {t("trimvid.duration")} {formatTime(duration)}</>
                  )}
                </p>
              </div>
              <button
                onClick={reset}
                className="text-sm text-t-secondary hover:text-red-400 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>

          {/* Video Player */}
          {videoUrl && (
            <div className="glass rounded-xl p-6">
              <h3 className="font-medium text-t-primary mb-3">Preview</h3>
              <video
                ref={videoRef}
                controls
                className="w-full rounded-lg"
                src={videoUrl}
                onLoadedMetadata={handleLoadedMetadata}
              >
                Your browser does not support the video element.
              </video>
            </div>
          )}

          {/* Time Inputs */}
          <div className="glass rounded-xl p-6">
            <h3 className="font-medium text-t-primary mb-4">{t("trimvid.trimRange")}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-t-secondary mb-1.5">
                  {t("trimvid.startTime")}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="MM:SS"
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-t-primary text-sm focus:outline-none focus:border-accent"
                  />
                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        setStartTime(formatTime(videoRef.current.currentTime));
                      }
                    }}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-t-secondary hover:border-white/20 transition-colors whitespace-nowrap"
                  >
                    {t("trimvid.useCurrent")}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-t-secondary mb-1.5">
                  {t("trimvid.endTime")}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    placeholder="MM:SS"
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-t-primary text-sm focus:outline-none focus:border-accent"
                  />
                  <button
                    onClick={() => {
                      if (videoRef.current) {
                        setEndTime(formatTime(videoRef.current.currentTime));
                      }
                    }}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-t-secondary hover:border-white/20 transition-colors whitespace-nowrap"
                  >
                    {t("trimvid.useCurrent")}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {processing && (
            <ProgressBar progress={progress} label={t("trimvid.trimming")} />
          )}

          <ProcessButton
            onClick={handleProcess}
            loading={processing}
            disabled={!file}
            label="Trim Video"
            loadingLabel="Trimming..."
          />

          <p className="text-xs text-t-secondary text-center">
            Note: First use may take a moment to load the processor (~30MB).
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Result info */}
          <div className="glass rounded-xl p-6 text-center">
            <p className="text-t-primary font-medium">
              Video trimmed successfully
            </p>
            <p className="text-sm text-t-secondary mt-1">
              Size: {formatFileSize(result.size)}
            </p>
          </div>

          {/* Result Video Player */}
          {resultUrl && (
            <div className="glass rounded-xl p-6">
              <h3 className="font-medium text-t-primary mb-3">Preview</h3>
              <video controls className="w-full rounded-lg" src={resultUrl}>
                Your browser does not support the video element.
              </video>
            </div>
          )}

          <div className="flex flex-wrap gap-4 justify-center">
            <DownloadButton
              blob={result}
              filename={`${getFileNameWithoutExtension(file.name)}_trimmed${file.name.substring(file.name.lastIndexOf("."))}`}
              label="Download Trimmed Video"
            />
            <button
              onClick={reset}
              className="px-6 py-3 rounded-xl font-semibold text-t-primary bg-white/5 hover:bg-white/10 transition-colors"
            >
              Process Another
            </button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
