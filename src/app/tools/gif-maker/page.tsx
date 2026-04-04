"use client";

import { useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import { formatFileSize } from "@/lib/utils";

interface LoadedFrame {
  file: File;
  objectUrl: string;
}

export default function GifMakerPage() {
  const [frames, setFrames] = useState<LoadedFrame[]>([]);
  const [frameDelay, setFrameDelay] = useState(500);
  const [outputWidth, setOutputWidth] = useState(400);
  const [loop, setLoop] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultPreview, setResultPreview] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ffmpegRef = useRef<any>(null);

  const handleFilesSelected = useCallback((files: File[]) => {
    const loaded: LoadedFrame[] = files.map((f) => ({
      file: f,
      objectUrl: URL.createObjectURL(f),
    }));
    setFrames((prev) => [...prev, ...loaded]);
    setResultBlob(null);
    setResultPreview(null);
  }, []);

  const removeFrame = (index: number) => {
    setFrames((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].objectUrl);
      next.splice(index, 1);
      return next;
    });
    setResultBlob(null);
    setResultPreview(null);
  };

  const moveFrame = (index: number, direction: "up" | "down") => {
    setFrames((prev) => {
      const next = [...prev];
      const targetIdx = direction === "up" ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;
      [next[index], next[targetIdx]] = [next[targetIdx], next[index]];
      return next;
    });
    setResultBlob(null);
    setResultPreview(null);
  };

  const clearAll = () => {
    frames.forEach((f) => URL.revokeObjectURL(f.objectUrl));
    setFrames([]);
    setResultBlob(null);
    setResultPreview(null);
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

  const handleCreateGif = async () => {
    if (frames.length < 2) {
      toast.error("Please add at least 2 images.");
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      toast.loading("Loading GIF processor...", { id: "ffmpeg-load" });
      const { ffmpeg, fetchFile } = await loadFFmpeg();
      toast.dismiss("ffmpeg-load");

      ffmpeg.on("progress", ({ progress: p }: { progress: number }) => {
        setProgress(Math.round(p * 100));
      });

      // Convert each frame to PNG via canvas at the target width, then write to FFmpeg FS
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      for (let i = 0; i < frames.length; i++) {
        setProgress(Math.round(((i + 1) / frames.length) * 40));

        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const image = new window.Image();
          image.onload = () => resolve(image);
          image.onerror = () => reject(new Error(`Failed to load frame ${i + 1}`));
          image.src = frames[i].objectUrl;
        });

        const aspectRatio = img.naturalHeight / img.naturalWidth;
        const height = Math.round(outputWidth * aspectRatio);

        canvas.width = outputWidth;
        canvas.height = height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, outputWidth, height);

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );
        if (!blob) throw new Error(`Failed to render frame ${i + 1}`);

        const frameNum = String(i + 1).padStart(3, "0");
        await ffmpeg.writeFile(`frame${frameNum}.png`, await fetchFile(blob));
      }

      setProgress(50);

      // Calculate FPS from delay: fps = 1000 / delay
      const fps = Math.max(1, Math.round(1000 / frameDelay));
      const loopFlag = loop ? "0" : "-1"; // 0 = infinite loop, -1 = no loop

      await ffmpeg.exec([
        "-framerate",
        String(fps),
        "-i",
        "frame%03d.png",
        "-vf",
        `scale=${outputWidth}:-1:flags=lanczos`,
        "-loop",
        loopFlag,
        "output.gif",
      ]);

      setProgress(90);

      const data = await ffmpeg.readFile("output.gif");
      const gifBlob = new Blob([(data as Uint8Array).buffer as ArrayBuffer], {
        type: "image/gif",
      });

      setResultBlob(gifBlob);
      setResultPreview(URL.createObjectURL(gifBlob));
      toast.success("GIF created successfully!");

      // Clean up FFmpeg FS
      for (let i = 0; i < frames.length; i++) {
        const frameNum = String(i + 1).padStart(3, "0");
        await ffmpeg.deleteFile(`frame${frameNum}.png`);
      }
      await ffmpeg.deleteFile("output.gif");

      setProgress(100);
    } catch (error) {
      toast.error("Failed to create GIF. Please try again.");
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ToolLayout
      toolName="GIF Maker"
      toolDescription="Create animated GIFs from multiple images"
    >
      <div className="space-y-6">
        {frames.length === 0 ? (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{
              "image/*": [".jpg", ".jpeg", ".png", ".webp", ".bmp"],
            }}
            multiple
            formats={["JPG", "PNG", "WEBP"]}
            label="Drop your images here to create an animated GIF"
          />
        ) : (
          <>
            {/* Frame thumbnails with reorder */}
            <div className="glass rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold text-brand-text">
                  Frames ({frames.length})
                </h3>
                <button
                  onClick={clearAll}
                  className="text-[11px] text-brand-muted hover:text-red-400 transition-colors"
                >
                  Clear All
                </button>
              </div>

              <div className="space-y-2">
                {frames.map((frame, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-white/5 rounded-lg p-2 border border-white/10"
                  >
                    {/* Thumbnail */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={frame.objectUrl}
                      alt={`Frame ${i + 1}`}
                      className="w-12 h-12 object-cover rounded-md border border-white/10 flex-shrink-0"
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-brand-text truncate">
                        Frame {i + 1}
                      </p>
                      <p className="text-[10px] text-brand-muted truncate">
                        {frame.file.name} &middot; {formatFileSize(frame.file.size)}
                      </p>
                    </div>

                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button
                        onClick={() => moveFrame(i, "up")}
                        disabled={i === 0}
                        className={`w-6 h-6 rounded flex items-center justify-center text-[10px] transition-colors ${
                          i === 0
                            ? "text-brand-muted/30 cursor-not-allowed"
                            : "text-brand-muted hover:text-brand-text hover:bg-white/10"
                        }`}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveFrame(i, "down")}
                        disabled={i === frames.length - 1}
                        className={`w-6 h-6 rounded flex items-center justify-center text-[10px] transition-colors ${
                          i === frames.length - 1
                            ? "text-brand-muted/30 cursor-not-allowed"
                            : "text-brand-muted hover:text-brand-text hover:bg-white/10"
                        }`}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeFrame(i)}
                      className="w-6 h-6 rounded flex items-center justify-center text-brand-muted hover:text-red-400 hover:bg-white/10 transition-colors flex-shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Add more */}
              <FileDropzone
                onFilesSelected={handleFilesSelected}
                accept={{
                  "image/*": [".jpg", ".jpeg", ".png", ".webp", ".bmp"],
                }}
                multiple
                formats={["JPG", "PNG", "WEBP"]}
                label="Add more frames"
              />
            </div>

            {/* Settings */}
            <div className="glass rounded-xl p-4 space-y-4">
              <h3 className="text-[13px] font-semibold text-brand-text">
                GIF Settings
              </h3>

              {/* Frame delay */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-[12px] text-brand-muted">Frame Delay</label>
                  <span className="text-[12px] font-mono text-brand-muted">
                    {frameDelay}ms
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={2000}
                  step={50}
                  value={frameDelay}
                  onChange={(e) => setFrameDelay(Number(e.target.value))}
                  className="w-full accent-brand-indigo"
                />
                <div className="flex justify-between mt-0.5">
                  <span className="text-[10px] text-brand-muted">100ms (fast)</span>
                  <span className="text-[10px] text-brand-muted">2000ms (slow)</span>
                </div>
              </div>

              {/* Output width */}
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-[12px] text-brand-muted">Output Width</label>
                  <span className="text-[12px] font-mono text-brand-muted">
                    {outputWidth}px
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={800}
                  step={10}
                  value={outputWidth}
                  onChange={(e) => setOutputWidth(Number(e.target.value))}
                  className="w-full accent-brand-indigo"
                />
                <div className="flex justify-between mt-0.5">
                  <span className="text-[10px] text-brand-muted">100px</span>
                  <span className="text-[10px] text-brand-muted">800px</span>
                </div>
              </div>

              {/* Loop */}
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={loop}
                    onChange={(e) => setLoop(e.target.checked)}
                    className="w-4 h-4 rounded accent-brand-indigo"
                  />
                  <span className="text-[12px] text-brand-muted">
                    Infinite loop
                  </span>
                </label>
              </div>
            </div>

            {/* Progress bar */}
            {processing && (
              <ProgressBar progress={progress} label="Creating GIF..." />
            )}

            {/* Create GIF button */}
            <button
              onClick={handleCreateGif}
              disabled={processing || frames.length < 2}
              className={`w-full py-3 rounded-xl font-semibold text-[14px] text-white transition-all ${
                processing || frames.length < 2
                  ? "bg-white/10 cursor-not-allowed text-brand-muted"
                  : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]"
              }`}
            >
              {processing ? "Creating GIF..." : "Create GIF"}
            </button>

            <p className="text-xs text-brand-muted text-center">
              Note: First use may take a moment to load the processor (~30MB).
            </p>

            {/* Result */}
            {resultBlob && resultPreview && (
              <div className="glass rounded-xl p-4 space-y-3">
                <p className="text-[13px] font-medium text-brand-text">
                  GIF Preview
                </p>
                <div className="flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resultPreview}
                    alt="Generated GIF"
                    className="max-h-64 rounded-lg border border-white/10"
                  />
                </div>
                <p className="text-[11px] text-brand-muted text-center">
                  {formatFileSize(resultBlob.size)} &middot; {frames.length} frames &middot; {Math.round(1000 / frameDelay)} FPS
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <DownloadButton
                    blob={resultBlob}
                    filename="animation.gif"
                    label="Download GIF"
                  />
                  <button
                    onClick={clearAll}
                    className="px-6 py-2.5 rounded-xl text-[13px] font-semibold text-brand-muted bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    Start Over
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ToolLayout>
  );
}
