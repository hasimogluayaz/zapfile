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

export default function TrimAudioPage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("00:00");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Blob | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ffmpegRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handleFilesSelected = (files: File[]) => {
    const f = files[0];
    setFile(f);
    setResult(null);
    setResultUrl(null);
    setProgress(0);
    setStartTime("00:00");
    const url = URL.createObjectURL(f);
    setAudioUrl(url);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration;
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
      toast.error(t("trimaud.invalidTime"));
      return;
    }
    if (start >= end) {
      toast.error(t("trimaud.startBeforeEnd"));
      return;
    }
    if (end > Math.ceil(duration)) {
      toast.error(t("trimaud.exceedsDuration"));
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      toast.loading(t("trimaud.loading"), { id: "ffmpeg-load" });
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
        type: file.type || "audio/mpeg",
      });
      setResult(blob);

      const url = URL.createObjectURL(blob);
      setResultUrl(url);

      toast.success(t("trimaud.success"));

      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch (error) {
      toast.error(t("trimaud.fail"));
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(null);
    setAudioUrl(null);
    setResult(null);
    setResultUrl(null);
    setProgress(0);
    setDuration(0);
    setStartTime("00:00");
    setEndTime("00:00");
  };

  return (
    <ToolLayout
      toolName="Trim Audio"
      toolDescription="Cut audio files by setting start and end time"
    >
      {!file ? (
        <FileDropzone
          onFilesSelected={handleFilesSelected}
          accept={{ "audio/*": [".mp3", ".wav", ".ogg", ".aac", ".m4a"] }}
          formats={["MP3", "WAV", "OGG", "AAC", "M4A"]}
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
                    <> &middot; Duration: {formatTime(duration)}</>
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

          {/* Audio Player */}
          {audioUrl && (
            <div className="glass rounded-xl p-6">
              <h3 className="font-medium text-t-primary mb-3">Preview</h3>
              <audio
                ref={audioRef}
                controls
                className="w-full"
                src={audioUrl}
                onLoadedMetadata={handleLoadedMetadata}
              >
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          {/* Time Inputs */}
          <div className="glass rounded-xl p-6">
            <h3 className="font-medium text-t-primary mb-4">Trim Range</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-t-secondary mb-1.5">
                  Start Time
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
                      if (audioRef.current) {
                        setStartTime(formatTime(audioRef.current.currentTime));
                      }
                    }}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-t-secondary hover:border-white/20 transition-colors whitespace-nowrap"
                  >
                    Use Current Time
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm text-t-secondary mb-1.5">
                  End Time
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
                      if (audioRef.current) {
                        setEndTime(formatTime(audioRef.current.currentTime));
                      }
                    }}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-white/5 border border-white/10 text-t-secondary hover:border-white/20 transition-colors whitespace-nowrap"
                  >
                    Use Current Time
                  </button>
                </div>
              </div>
            </div>
          </div>

          {processing && (
            <ProgressBar progress={progress} label={t("trimaud.trimming")} />
          )}

          <ProcessButton
            onClick={handleProcess}
            loading={processing}
            disabled={!file}
            label={t("trimaud.button")}
            loadingLabel={t("trimaud.trimming")}
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
              Audio trimmed successfully
            </p>
            <p className="text-sm text-t-secondary mt-1">
              Size: {formatFileSize(result.size)}
            </p>
          </div>

          {/* Result Audio Player */}
          {resultUrl && (
            <div className="glass rounded-xl p-6">
              <h3 className="font-medium text-t-primary mb-3">Preview</h3>
              <audio controls className="w-full" src={resultUrl}>
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          <div className="flex flex-wrap gap-4 justify-center">
            <DownloadButton
              blob={result}
              filename={`${getFileNameWithoutExtension(file.name)}_trimmed${file.name.substring(file.name.lastIndexOf("."))}`}
              label={t("trimaud.download")}
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
