"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";

type RecordingState = "idle" | "recording" | "paused" | "stopped";

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const BAR_COUNT = 40;

export default function AudioRecorderPage() {
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState(0);
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(0));
  const [mimeType, setMimeType] = useState("audio/webm");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevAudioUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      cleanup();
      if (prevAudioUrlRef.current) URL.revokeObjectURL(prevAudioUrlRef.current);
    };
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setBars(Array(BAR_COUNT).fill(0));
  }, []);

  const drawBars = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    const step = Math.floor(data.length / BAR_COUNT);
    const newBars = Array.from({ length: BAR_COUNT }, (_, i) => {
      let sum = 0;
      for (let j = 0; j < step; j++) {
        sum += data[i * step + j] ?? 0;
      }
      return Math.min(100, (sum / step / 255) * 100);
    });
    setBars(newBars);
    animFrameRef.current = requestAnimationFrame(drawBars);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up Web Audio API for visualizer
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Determine best MIME type
      const preferredMime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")
        ? "audio/ogg;codecs=opus"
        : "";

      const mime = preferredMime || undefined;
      if (mime) setMimeType(mime.split(";")[0]);

      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mime ? mime.split(";")[0] : "audio/webm",
        });
        if (prevAudioUrlRef.current) URL.revokeObjectURL(prevAudioUrlRef.current);
        const url = URL.createObjectURL(blob);
        prevAudioUrlRef.current = url;
        setAudioUrl(url);
        setFileSize(blob.size);
        cleanup();
        setRecordingState("stopped");
      };

      recorder.start(100);
      setRecordingState("recording");
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

      drawBars();
    } catch (err) {
      console.error(err);
      toast.error("Microphone access denied. Please allow microphone permissions.");
    }
  }, [cleanup, drawBars]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      setBars(Array(BAR_COUNT).fill(0));
      setRecordingState("paused");
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
      drawBars();
      setRecordingState("recording");
    }
  }, [drawBars]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      (mediaRecorderRef.current.state === "recording" ||
        mediaRecorderRef.current.state === "paused")
    ) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }
  }, []);

  const handleRecordAgain = useCallback(() => {
    if (prevAudioUrlRef.current) {
      URL.revokeObjectURL(prevAudioUrlRef.current);
      prevAudioUrlRef.current = null;
    }
    setAudioUrl(null);
    setFileSize(0);
    setDuration(0);
    setRecordingState("idle");
    setBars(Array(BAR_COUNT).fill(0));
  }, []);

  const handleDownload = useCallback(() => {
    if (!audioUrl) return;
    const ext = mimeType.includes("ogg") ? "ogg" : "webm";
    const a = document.createElement("a");
    a.href = audioUrl;
    a.download = `recording-${Date.now()}.${ext}`;
    a.click();
  }, [audioUrl, mimeType]);

  const isRecording = recordingState === "recording";
  const isPaused = recordingState === "paused";
  const isStopped = recordingState === "stopped";
  const isIdle = recordingState === "idle";

  return (
    <ToolLayout
      toolName="Audio Recorder"
      toolDescription="Record audio from your microphone directly in the browser. No uploads, no accounts — fully private."
    >
      <div className="space-y-6">
        {/* Timer & Visualizer */}
        <div className="glass rounded-xl p-6 flex flex-col items-center gap-6">
          {/* Timer */}
          <div
            className={`text-5xl font-mono font-bold tabular-nums tracking-widest transition-colors ${
              isRecording ? "text-red-400" : isPaused ? "text-amber-400" : "text-t-primary"
            }`}
          >
            {formatDuration(duration)}
          </div>

          {/* Recording indicator */}
          {(isRecording || isPaused) && (
            <div className="flex items-center gap-2 text-sm text-t-secondary">
              <span
                className={`w-2 h-2 rounded-full ${
                  isRecording ? "bg-red-500 animate-pulse" : "bg-amber-400"
                }`}
              />
              {isRecording ? "Recording…" : "Paused"}
            </div>
          )}

          {/* Visualizer bars */}
          <div className="flex items-end gap-0.5 h-16 w-full">
            {bars.map((height, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm transition-all duration-75"
                style={{
                  height: `${Math.max(4, height)}%`,
                  background: isRecording
                    ? `hsl(${240 + (height / 100) * 60}, 70%, 60%)`
                    : "var(--color-border)",
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex flex-wrap justify-center gap-3">
            {isIdle && (
              <button
                type="button"
                onClick={startRecording}
                className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <span className="w-3 h-3 rounded-full bg-red-400 inline-block" />
                Start Recording
              </button>
            )}

            {isRecording && (
              <>
                <button
                  type="button"
                  onClick={pauseRecording}
                  className="px-5 py-3 rounded-xl font-semibold border border-border text-t-secondary hover:bg-bg-secondary transition-colors"
                >
                  Pause
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-5 py-3 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
                >
                  Stop
                </button>
              </>
            )}

            {isPaused && (
              <>
                <button
                  type="button"
                  onClick={resumeRecording}
                  className="px-5 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-opacity"
                >
                  Resume
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-5 py-3 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
                >
                  Stop
                </button>
              </>
            )}

            {isStopped && (
              <button
                type="button"
                onClick={handleRecordAgain}
                className="px-5 py-3 rounded-xl font-semibold border border-border text-t-secondary hover:bg-bg-secondary transition-colors"
              >
                Record Again
              </button>
            )}
          </div>
        </div>

        {/* Playback & Download */}
        {isStopped && audioUrl && (
          <div className="glass rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-t-primary">Recording Preview</h3>
              <span className="text-xs text-t-tertiary">{formatBytes(fileSize)}</span>
            </div>

            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio src={audioUrl} controls className="w-full" />

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-opacity"
              >
                Download Recording
              </button>
            </div>

            <p className="text-xs text-t-tertiary">
              Format: {mimeType.split(";")[0]} &nbsp;·&nbsp; Duration:{" "}
              {formatDuration(duration)} &nbsp;·&nbsp; Size: {formatBytes(fileSize)}
            </p>
            <p className="text-xs text-t-tertiary">
              Note: Browser audio recording saves as WebM/Ogg. Direct MP3 encoding
              is not supported by browser APIs without additional libraries.
            </p>
          </div>
        )}

        {/* Permission note */}
        {isIdle && !audioUrl && (
          <div className="glass rounded-xl p-4">
            <p className="text-xs text-t-tertiary text-center">
              Clicking &quot;Start Recording&quot; will request microphone permission.
              Your audio stays entirely in your browser — nothing is uploaded.
            </p>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
