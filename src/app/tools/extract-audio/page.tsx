"use client";

import { useState, useRef } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProcessButton from "@/components/ProcessButton";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import { formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";

type AudioFormat = "mp3" | "wav" | "aac";

const formatInfo: Record<
  AudioFormat,
  { label: string; desc: string; ext: string; mime: string }
> = {
  mp3: {
    label: "MP3",
    desc: "Compressed, widely compatible",
    ext: "mp3",
    mime: "audio/mpeg",
  },
  aac: {
    label: "AAC (M4A)",
    desc: "Better quality at same bitrate",
    ext: "m4a",
    mime: "audio/mp4",
  },
  wav: {
    label: "WAV",
    desc: "Uncompressed, best quality",
    ext: "wav",
    mime: "audio/wav",
  },
};

const bitrateOptions = [
  { value: "128k", label: "128 kbps", desc: "Good for speech" },
  { value: "192k", label: "192 kbps", desc: "Balanced" },
  { value: "256k", label: "256 kbps", desc: "High quality" },
  { value: "320k", label: "320 kbps", desc: "Maximum quality" },
];

export default function ExtractAudioPage() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<AudioFormat>("mp3");
  const [bitrate, setBitrate] = useState("192k");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ffmpegRef = useRef<any>(null);

  const handleFilesSelected = (files: File[]) => {
    setFile(files[0]);
    setResult(null);
    setAudioUrl(null);
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
      toast.loading("Loading audio processor...", { id: "ffmpeg-load" });
      const { ffmpeg, fetchFile } = await loadFFmpeg();
      toast.dismiss("ffmpeg-load");

      ffmpeg.on("progress", ({ progress: p }: { progress: number }) => {
        setProgress(Math.round(p * 100));
      });

      const inputName =
        "input" + file.name.substring(file.name.lastIndexOf("."));
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      const info = formatInfo[format];
      const outputName = `output.${info.ext}`;

      let args: string[];
      if (format === "mp3") {
        args = [
          "-i",
          inputName,
          "-vn",
          "-c:a",
          "libmp3lame",
          "-b:a",
          bitrate,
          "-ar",
          "44100",
          outputName,
        ];
      } else if (format === "aac") {
        args = [
          "-i",
          inputName,
          "-vn",
          "-c:a",
          "aac",
          "-b:a",
          bitrate,
          "-ar",
          "44100",
          outputName,
        ];
      } else {
        // WAV — uncompressed, bitrate doesn't apply
        args = [
          "-i",
          inputName,
          "-vn",
          "-c:a",
          "pcm_s16le",
          "-ar",
          "44100",
          outputName,
        ];
      }

      await ffmpeg.exec(args);

      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([(data as Uint8Array).buffer as ArrayBuffer], {
        type: info.mime,
      });
      setResult(blob);

      // Create audio URL for preview
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      toast.success("Audio extracted successfully!");

      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch (error) {
      toast.error(
        "Failed to extract audio. The video may not contain an audio track.",
      );
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setFile(null);
    setResult(null);
    setAudioUrl(null);
    setProgress(0);
  };

  const showBitrate = format !== "wav";

  return (
    <ToolLayout
      toolName="Extract Audio"
      toolDescription="Extract the audio track from any video file as MP3, AAC, or WAV with customizable bitrate."
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

          {/* Output Format */}
          <div className="glass rounded-xl p-6">
            <h3 className="font-medium text-brand-text mb-4">Output Format</h3>
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(formatInfo) as AudioFormat[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`p-4 rounded-lg text-center transition-all ${
                    format === f
                      ? "bg-brand-indigo/20 border border-brand-indigo text-brand-text"
                      : "bg-white/5 border border-white/10 text-brand-muted hover:border-white/20"
                  }`}
                >
                  <p className="font-bold text-sm">{formatInfo[f].label}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {formatInfo[f].desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Bitrate Selection (not for WAV) */}
          {showBitrate && (
            <div className="glass rounded-xl p-6">
              <h3 className="font-medium text-brand-text mb-4">
                Audio Bitrate
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {bitrateOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setBitrate(opt.value)}
                    className={`p-3 rounded-lg text-center transition-all ${
                      bitrate === opt.value
                        ? "bg-brand-indigo/20 border border-brand-indigo text-brand-text"
                        : "bg-white/5 border border-white/10 text-brand-muted hover:border-white/20"
                    }`}
                  >
                    <p className="font-medium text-sm">{opt.label}</p>
                    <p className="text-xs mt-1 opacity-70">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {processing && (
            <ProgressBar progress={progress} label="Extracting audio..." />
          )}

          <ProcessButton
            onClick={handleProcess}
            loading={processing}
            disabled={!file}
            label="Extract Audio"
            loadingLabel="Extracting..."
          />

          <p className="text-xs text-brand-muted text-center">
            Note: First use may take a moment to load the audio processor
            (~30MB).
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Result info */}
          <div className="glass rounded-xl p-6 text-center">
            <p className="text-brand-text font-medium">
              Audio extracted successfully
            </p>
            <p className="text-sm text-brand-muted mt-1">
              Format: {formatInfo[format].label} &middot; Size:{" "}
              {formatFileSize(result.size)}
              {showBitrate && <> &middot; Bitrate: {bitrate}</>}
            </p>
          </div>

          {/* Audio Player Preview */}
          {audioUrl && (
            <div className="glass rounded-xl p-6">
              <h3 className="font-medium text-brand-text mb-3">Preview</h3>
              <audio controls className="w-full" src={audioUrl}>
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          <div className="flex flex-wrap gap-4 justify-center">
            <DownloadButton
              blob={result}
              filename={`${getFileNameWithoutExtension(file.name)}.${formatInfo[format].ext}`}
              label={`Download ${formatInfo[format].label}`}
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
