"use client";

import { useState, useRef } from "react";
import toast from "react-hot-toast";
import FileDropzone from "@/components/FileDropzone";
import ProcessButton from "@/components/ProcessButton";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import FileSizeCompare from "@/components/FileSizeCompare";
import { formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import type { ConversionDef } from "@/lib/conversions";

type AudioFormat = "mp3" | "wav" | "ogg" | "aac";

const formatInfo: Record<
  AudioFormat,
  { label: string; ext: string; mime: string }
> = {
  mp3: { label: "MP3", ext: "mp3", mime: "audio/mpeg" },
  wav: { label: "WAV", ext: "wav", mime: "audio/wav" },
  ogg: { label: "OGG", ext: "ogg", mime: "audio/ogg" },
  aac: { label: "AAC (M4A)", ext: "m4a", mime: "audio/mp4" },
};

const bitrateOptions = [
  { value: "128k", label: "128 kbps" },
  { value: "192k", label: "192 kbps" },
  { value: "256k", label: "256 kbps" },
  { value: "320k", label: "320 kbps" },
];

function resolveOutputFormat(to: string): AudioFormat {
  if (to === "m4a") return "aac";
  return to as AudioFormat;
}

interface AudioConversionClientProps {
  conversion: ConversionDef;
}

export default function AudioConversionClient({
  conversion,
}: AudioConversionClientProps) {
  const outputFormat = resolveOutputFormat(conversion.to);
  const [file, setFile] = useState<File | null>(null);
  const [bitrate, setBitrate] = useState("192k");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ffmpegRef = useRef<any>(null);

  const extArr = Array.isArray(conversion.fromExt) ? conversion.fromExt : [conversion.fromExt];
  const acceptConfig: Record<string, string[]> = {
    [conversion.fromMime]: extArr,
  };
  const formatLabels = extArr.map((e) =>
    e.replace(".", "").toUpperCase()
  );

  const showBitrate = outputFormat !== "wav";

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
        "application/wasm"
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

      const info = formatInfo[outputFormat];
      const outputName = `output.${info.ext}`;

      let args: string[];
      if (outputFormat === "mp3") {
        args = [
          "-i",
          inputName,
          "-vn",
          "-c:a",
          "libmp3lame",
          "-b:a",
          bitrate,
          outputName,
        ];
      } else if (outputFormat === "wav") {
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
      } else if (outputFormat === "ogg") {
        args = [
          "-i",
          inputName,
          "-vn",
          "-c:a",
          "libvorbis",
          "-b:a",
          bitrate,
          outputName,
        ];
      } else {
        // AAC
        args = [
          "-i",
          inputName,
          "-vn",
          "-c:a",
          "aac",
          "-b:a",
          bitrate,
          outputName,
        ];
      }

      await ffmpeg.exec(args);

      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([(data as Uint8Array).buffer as ArrayBuffer], {
        type: info.mime,
      });
      setResult(blob);

      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      toast.success("Audio converted successfully!");

      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch (error) {
      toast.error("Conversion failed. Please try again.");
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

  const info = formatInfo[outputFormat];

  return (
    <div className="animate-fade-up">
      {!file ? (
        <FileDropzone
          onFilesSelected={handleFilesSelected}
          accept={acceptConfig}
          formats={formatLabels}
          label={`Drop your ${conversion.fromLabel} file here`}
        />
      ) : !result ? (
        <div className="space-y-6">
          {/* File info */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-t-primary">{file.name}</p>
                <p className="text-sm text-t-secondary">
                  {formatFileSize(file.size)} &middot; Converting to{" "}
                  {conversion.toLabel}
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

          {/* Bitrate Selection (not for WAV) */}
          {showBitrate && (
            <div className="glass rounded-2xl p-6">
              <h3 className="font-medium text-t-primary mb-4">
                Audio Bitrate
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {bitrateOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setBitrate(opt.value)}
                    className={`p-3 rounded-lg text-center transition-all ${
                      bitrate === opt.value
                        ? "bg-accent/20 border border-accent text-t-primary"
                        : "bg-white/5 border border-white/10 text-t-secondary hover:border-white/20"
                    }`}
                  >
                    <p className="font-medium text-sm">{opt.label}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {processing && (
            <ProgressBar progress={progress} label="Converting audio..." />
          )}

          <ProcessButton
            onClick={handleProcess}
            loading={processing}
            disabled={!file}
            label={`Convert to ${conversion.toLabel}`}
            loadingLabel="Converting..."
          />

          <p className="text-xs text-t-secondary text-center">
            Note: First use may take a moment to load the processor (~31 MB).
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Result info */}
          <div className="glass rounded-2xl p-6 text-center">
            <p className="text-t-primary font-medium">
              Audio converted successfully
            </p>
            <p className="text-sm text-t-secondary mt-1">
              Format: {info.label} &middot; Size: {formatFileSize(result.size)}
              {showBitrate && <> &middot; Bitrate: {bitrate}</>}
            </p>
          </div>

          {/* Size Comparison */}
          <FileSizeCompare originalSize={file.size} newSize={result.size} />

          {/* Audio Player Preview */}
          {audioUrl && (
            <div className="glass rounded-2xl p-6">
              <h3 className="font-medium text-t-primary mb-3">Preview</h3>
              <audio controls className="w-full" src={audioUrl}>
                Your browser does not support the audio element.
              </audio>
            </div>
          )}

          <div className="flex flex-wrap gap-4 justify-center">
            <DownloadButton
              blob={result}
              filename={`${getFileNameWithoutExtension(file.name)}.${info.ext}`}
              label={`Download ${info.label}`}
            />
            <button
              onClick={reset}
              className="px-6 py-3 rounded-xl font-semibold text-t-primary bg-white/5 hover:bg-white/10 transition-colors"
            >
              Convert Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
