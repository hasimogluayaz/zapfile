"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

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

/** Encode an AudioBuffer to a 16-bit PCM WAV Blob (universal format). */
function encodeWav(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numSamples = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numSamples * blockAlign;
  const bufferSize = 44 + dataSize;

  const buf = new ArrayBuffer(bufferSize);
  const view = new DataView(buf);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  // RIFF header
  writeStr(0, "RIFF");
  view.setUint32(4, bufferSize - 8, true);
  writeStr(8, "WAVE");
  // fmt sub-chunk
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // bits per sample
  // data sub-chunk
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  // interleave channels
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) channels.push(audioBuffer.getChannelData(ch));

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return new Blob([buf], { type: "audio/wav" });
}

const BAR_COUNT = 40;

export default function AudioRecorderPage() {
  const { t } = useI18n();
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [fileSize, setFileSize] = useState(0);
  const [bars, setBars] = useState<number[]>(Array(BAR_COUNT).fill(0));
  const [mimeType, setMimeType] = useState("audio/webm");
  const [encoding, setEncoding] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevAudioUrlRef = useRef<string | null>(null);

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
      streamRef.current.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setBars(Array(BAR_COUNT).fill(0));
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
      if (prevAudioUrlRef.current) URL.revokeObjectURL(prevAudioUrlRef.current);
    };
  }, [cleanup]);

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

      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

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
        setAudioBlob(blob);
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
      toast.error(t("ar.micDenied"));
    }
  }, [cleanup, drawBars, t]);

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
    setAudioBlob(null);
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

  const handleDownloadWav = useCallback(async () => {
    if (!audioBlob) return;
    setEncoding(true);
    try {
      const arrayBuffer = await audioBlob.arrayBuffer();
      const ctx = new AudioContext();
      const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
      const wavBlob = encodeWav(decoded);
      await ctx.close();

      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `recording-${Date.now()}.wav`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error(err);
      toast.error(t("ui.copyFailed"));
    } finally {
      setEncoding(false);
    }
  }, [audioBlob, t]);

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
              {isRecording ? t("ar.recording") : t("ar.paused")}
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
                {t("ar.startRec")}
              </button>
            )}

            {isRecording && (
              <>
                <button
                  type="button"
                  onClick={pauseRecording}
                  className="px-5 py-3 rounded-xl font-semibold border border-border text-t-secondary hover:bg-bg-secondary transition-colors"
                >
                  {t("ar.pause")}
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-5 py-3 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
                >
                  {t("ar.stop")}
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
                  {t("ar.resume")}
                </button>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="px-5 py-3 rounded-xl font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
                >
                  {t("ar.stop")}
                </button>
              </>
            )}

            {isStopped && (
              <button
                type="button"
                onClick={handleRecordAgain}
                className="px-5 py-3 rounded-xl font-semibold border border-border text-t-secondary hover:bg-bg-secondary transition-colors"
              >
                {t("ar.recordAgain")}
              </button>
            )}
          </div>
        </div>

        {/* Playback & Download */}
        {isStopped && audioUrl && (
          <div className="glass rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-t-primary">{t("ar.preview")}</h3>
              <span className="text-xs text-t-tertiary">{formatBytes(fileSize)}</span>
            </div>

            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio src={audioUrl} controls className="w-full" />

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 min-w-[180px] px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-opacity"
              >
                {t("ar.download")}
              </button>
              <button
                type="button"
                onClick={handleDownloadWav}
                disabled={encoding}
                className="flex-1 min-w-[180px] px-6 py-3 rounded-xl font-semibold text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors disabled:opacity-50"
              >
                {encoding ? t("ar.encodingWav") : t("ar.downloadWav")}
              </button>
            </div>

            <p className="text-xs text-t-tertiary">
              {t("ar.format")}: {mimeType.split(";")[0]} &nbsp;·&nbsp;
              {t("ar.duration")}: {formatDuration(duration)} &nbsp;·&nbsp;
              {t("ar.size")}: {formatBytes(fileSize)}
            </p>
          </div>
        )}

        {/* Permission note */}
        {isIdle && !audioUrl && (
          <div className="glass rounded-xl p-4">
            <p className="text-xs text-t-tertiary text-center">{t("ar.permNote")}</p>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
