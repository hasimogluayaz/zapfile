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

type Quality = "high" | "medium" | "low";

const qualitySettings: Record<Quality, { crf: number; label: string; desc: string }> = {
  high: { crf: 23, label: "High", desc: "Best quality, larger file" },
  medium: { crf: 28, label: "Medium", desc: "Balanced quality and size" },
  low: { crf: 35, label: "Low", desc: "Smallest file, lower quality" },
};

export default function CompressVideoPage() {
  const [file, setFile] = useState<File | null>(null);
  const [quality, setQuality] = useState<Quality>("medium");
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

      const crf = qualitySettings[quality].crf;
      await ffmpeg.exec([
        "-i", inputName,
        "-c:v", "libx264",
        "-crf", String(crf),
        "-preset", "fast",
        "-c:a", "aac",
        "-b:a", "128k",
        "-movflags", "+faststart",
        "output.mp4",
      ]);

      const data = await ffmpeg.readFile("output.mp4");
      const blob = new Blob([(data as Uint8Array).buffer as ArrayBuffer], { type: "video/mp4" });
      setResult(blob);
      toast.success("Video compressed successfully!");

      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile("output.mp4");
    } catch (error) {
      toast.error("Failed to compress video. Try a smaller file.");
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
      toolDescription="Reduce video file size with adjustable quality. Processing happens entirely in your browser."
    >
      {!file ? (
        <FileDropzone
          onFilesSelected={handleFilesSelected}
          accept={{ "video/*": [".mp4", ".webm", ".mov", ".avi"] }}
          formats={["MP4", "WEBM", "MOV", "AVI"]}
        />
      ) : !result ? (
        <div className="space-y-6">
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-brand-text">{file.name}</p>
                <p className="text-sm text-brand-muted">{formatFileSize(file.size)}</p>
              </div>
              <button onClick={reset} className="text-sm text-brand-muted hover:text-red-400 transition-colors">
                Remove
              </button>
            </div>
          </div>

          <div className="glass rounded-xl p-6">
            <h3 className="font-medium text-brand-text mb-4">Quality</h3>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(qualitySettings) as Quality[]).map((q) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  className={`p-3 rounded-lg text-center transition-all ${
                    quality === q
                      ? "bg-brand-indigo/20 border border-brand-indigo text-brand-text"
                      : "bg-white/5 border border-white/10 text-brand-muted hover:border-white/20"
                  }`}
                >
                  <p className="font-medium text-sm">{qualitySettings[q].label}</p>
                  <p className="text-xs mt-1 opacity-70">{qualitySettings[q].desc}</p>
                </button>
              ))}
            </div>
          </div>

          {processing && <ProgressBar progress={progress} label="Compressing video..." />}

          <ProcessButton
            onClick={handleProcess}
            loading={processing}
            disabled={!file}
            label="Compress Video"
            loadingLabel="Compressing..."
          />

          <p className="text-xs text-brand-muted text-center">
            Note: First use may take a moment to load the video processor (~30MB).
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <FileSizeCompare originalSize={file.size} newSize={result.size} />

          <div className="flex flex-wrap gap-4 justify-center">
            <DownloadButton
              blob={result}
              filename={`compressed-${file.name.replace(/\.[^.]+$/, "")}.mp4`}
              label="Download Compressed Video"
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
