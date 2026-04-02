"use client";

import { useState, useRef } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProcessButton from "@/components/ProcessButton";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import { formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";

type GifQuality = "high" | "medium" | "low";

const gifSettings: Record<GifQuality, { fps: number; scale: number; label: string }> = {
  high: { fps: 15, scale: 480, label: "High (15fps, 480px)" },
  medium: { fps: 10, scale: 320, label: "Medium (10fps, 320px)" },
  low: { fps: 8, scale: 240, label: "Low (8fps, 240px)" },
};

export default function VideoToGifPage() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<GifQuality>("medium");
  const [startTime, setStartTime] = useState("0");
  const [duration, setDuration] = useState("5");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Blob | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ffmpegRef = useRef<any>(null);

  const handleFilesSelected = (files: File[]) => {
    const f = files[0];
    setFile(f);
    setResult(null);
    setProgress(0);

    // Get video duration
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      setVideoDuration(Math.floor(video.duration));
      URL.revokeObjectURL(video.src);
    };
    video.src = URL.createObjectURL(f);
  };

  const loadFFmpeg = async () => {
    if (ffmpegRef.current) return ffmpegRef.current;
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { fetchFile, toBlobURL } = await import("@ffmpeg/util");
    const ffmpeg = new FFmpeg();

    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });

    ffmpegRef.current = { ffmpeg, fetchFile };
    return { ffmpeg, fetchFile };
  };

  const handleProcess = async () => {
    if (!file) return;

    const start = parseFloat(startTime) || 0;
    const dur = parseFloat(duration) || 5;

    if (start < 0 || start >= videoDuration) {
      toast.error("Invalid start time");
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      toast.loading("Loading video processor...", { id: "ffmpeg-load" });
      const { ffmpeg, fetchFile } = await loadFFmpeg();
      toast.dismiss("ffmpeg-load");

      ffmpeg.on("progress", ({ progress: p }: { progress: number }) => {
        setProgress(Math.round(p * 100));
      });

      const inputName = "input" + file.name.substring(file.name.lastIndexOf("."));
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      const { fps, scale } = gifSettings[quality];

      await ffmpeg.exec([
        "-i", inputName,
        "-ss", String(start),
        "-t", String(dur),
        "-vf", `fps=${fps},scale=${scale}:-1:flags=lanczos`,
        "-gifflags", "+transdiff",
        "output.gif",
      ]);

      const data = await ffmpeg.readFile("output.gif");
      const blob = new Blob([(data as Uint8Array).buffer as ArrayBuffer], { type: "image/gif" });
      setResult(blob);
      toast.success("GIF created successfully!");

      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile("output.gif");
    } catch (error) {
      toast.error("Failed to create GIF. Try shorter duration or lower quality.");
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setResult(null);
    setProgress(0);
    setVideoDuration(0);
  };

  return (
    <ToolLayout
      toolName="Video to GIF"
      toolDescription="Convert video clips to animated GIF images with custom timing and quality."
    >
      {!file ? (
        <FileDropzone
          onFilesSelected={handleFilesSelected}
          accept={{ "video/*": [".mp4", ".webm", ".mov"] }}
          formats={["MP4", "WEBM", "MOV"]}
        />
      ) : !result ? (
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-brand-text">{file.name}</p>
                <p className="text-sm text-brand-muted">
                  {formatFileSize(file.size)}
                  {videoDuration > 0 && ` \u00b7 ${videoDuration}s`}
                </p>
              </div>
              <button onClick={reset} className="text-sm text-brand-muted hover:text-red-400 transition-colors">
                Remove
              </button>
            </div>
          </div>

          {/* Timing */}
          <div className="glass rounded-xl p-6">
            <h3 className="font-medium text-brand-text mb-4">Timing</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-brand-muted mb-2">
                  Start time (seconds)
                </label>
                <input
                  type="number"
                  min="0"
                  max={videoDuration}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-brand-text focus:outline-none focus:border-brand-indigo/50"
                />
              </div>
              <div>
                <label className="block text-sm text-brand-muted mb-2">
                  Duration (seconds)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-brand-text focus:outline-none focus:border-brand-indigo/50"
                />
              </div>
            </div>
            <p className="text-xs text-brand-muted mt-2">
              Tip: Keep GIFs under 10 seconds for best results.
            </p>
          </div>

          {/* Quality */}
          <div className="glass rounded-xl p-6">
            <h3 className="font-medium text-brand-text mb-4">Quality</h3>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(gifSettings) as GifQuality[]).map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`p-3 rounded-lg text-center transition-all ${
                    quality === q
                      ? "bg-brand-indigo/20 border border-brand-indigo text-brand-text"
                      : "bg-white/5 border border-white/10 text-brand-muted hover:border-white/20"
                  }`}
                >
                  <p className="text-sm font-medium">{gifSettings[q].label}</p>
                </button>
              ))}
            </div>
          </div>

          {processing && <ProgressBar progress={progress} label="Creating GIF..." />}

          <ProcessButton
            onClick={handleProcess}
            loading={processing}
            disabled={!file}
            label="Create GIF"
            loadingLabel="Creating..."
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass rounded-xl p-6 text-center">
            <p className="text-brand-text font-medium">GIF created successfully</p>
            <p className="text-sm text-brand-muted mt-1">Size: {formatFileSize(result.size)}</p>
          </div>

          {/* Preview */}
          <div className="flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={URL.createObjectURL(result)}
              alt="Generated GIF"
              className="max-w-full max-h-96 rounded-lg border border-white/10"
            />
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <DownloadButton
              blob={result}
              filename={`${getFileNameWithoutExtension(file.name)}.gif`}
              label="Download GIF"
            />
            <button
              onClick={reset}
              className="px-6 py-3 rounded-xl font-semibold text-brand-text bg-white/5 hover:bg-white/10 transition-colors"
            >
              Process Another Video
            </button>
          </div>
        </div>
      )}
    </ToolLayout>
  );
}
