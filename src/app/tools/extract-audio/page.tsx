"use client";

import { useState, useRef } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProcessButton from "@/components/ProcessButton";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import { formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";

type AudioFormat = "mp3" | "wav";

export default function ExtractAudioPage() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<AudioFormat>("mp3");
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
      toast.loading("Loading audio processor...", { id: "ffmpeg-load" });
      const { ffmpeg, fetchFile } = await loadFFmpeg();
      toast.dismiss("ffmpeg-load");

      ffmpeg.on("progress", ({ progress: p }: { progress: number }) => {
        setProgress(Math.round(p * 100));
      });

      const inputName = "input" + file.name.substring(file.name.lastIndexOf("."));
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      const outputName = `output.${format}`;
      const args =
        format === "mp3"
          ? ["-i", inputName, "-vn", "-ab", "192k", "-ar", "44100", outputName]
          : ["-i", inputName, "-vn", "-acodec", "pcm_s16le", "-ar", "44100", outputName];

      await ffmpeg.exec(args);

      const data = await ffmpeg.readFile(outputName);
      const mimeType = format === "mp3" ? "audio/mpeg" : "audio/wav";
      const blob = new Blob([(data as Uint8Array).buffer as ArrayBuffer], { type: mimeType });
      setResult(blob);
      toast.success("Audio extracted successfully!");

      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch (error) {
      toast.error("Failed to extract audio. The video may not contain an audio track.");
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
      toolName="Extract Audio"
      toolDescription="Extract the audio track from any video file as MP3 or WAV."
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
            <h3 className="font-medium text-brand-text mb-4">Output Format</h3>
            <div className="grid grid-cols-2 gap-3">
              {(["mp3", "wav"] as AudioFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`p-4 rounded-lg text-center transition-all ${
                    format === f
                      ? "bg-brand-indigo/20 border border-brand-indigo text-brand-text"
                      : "bg-white/5 border border-white/10 text-brand-muted hover:border-white/20"
                  }`}
                >
                  <p className="font-bold text-lg uppercase">{f}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {f === "mp3" ? "Compressed, smaller file" : "Uncompressed, best quality"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {processing && <ProgressBar progress={progress} label="Extracting audio..." />}

          <ProcessButton
            onClick={handleProcess}
            loading={processing}
            disabled={!file}
            label="Extract Audio"
            loadingLabel="Extracting..."
          />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="glass rounded-xl p-6 text-center">
            <p className="text-brand-text font-medium">Audio extracted successfully</p>
            <p className="text-sm text-brand-muted mt-1">
              Format: {format.toUpperCase()} &middot; Size: {formatFileSize(result.size)}
            </p>
          </div>

          <div className="flex flex-wrap gap-4 justify-center">
            <DownloadButton
              blob={result}
              filename={`${getFileNameWithoutExtension(file.name)}.${format}`}
              label={`Download ${format.toUpperCase()}`}
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
