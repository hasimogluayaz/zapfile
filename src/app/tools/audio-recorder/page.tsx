"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AlertCircle, Download, Mic, Pause, Play, RotateCcw, Square, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import ProgressBar from "@/components/ProgressBar";
import { Toggle, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { downloadBlob, formatFileSize } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import WaveformEditor from "./WaveformEditor";
import type { EncodeRequest, EncodeResponse } from "./encode.worker";

type RecState = "idle" | "recording" | "paused" | "stopped";
type ExportFormat = "wav" | "mp3";

const MIME_CANDIDATES = [
  "audio/webm;codecs=opus",
  "audio/ogg;codecs=opus",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/webm",
  "audio/aac",
];

function extensionFor(mime: string): string {
  const base = mime.split(";")[0].trim().toLowerCase();
  if (base.includes("webm")) return "webm";
  if (base.includes("ogg")) return "ogg";
  if (base.includes("mp4") || base.includes("m4a")) return "m4a";
  if (base.includes("aac")) return "aac";
  if (base.includes("mpeg")) return "mp3";
  if (base.includes("wav")) return "wav";
  return "webm";
}

function formatClock(seconds: number, tenths = true): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  const sec = tenths ? rest.toFixed(1).padStart(4, "0") : Math.floor(rest).toString().padStart(2, "0");
  return `${m.toString().padStart(2, "0")}:${sec}`;
}

function stamp(date: Date): string {
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}_${p(date.getHours())}-${p(date.getMinutes())}-${p(date.getSeconds())}`;
}

/** Peak envelope (max |sample| per bucket), computed in slices so the UI stays responsive. */
async function computePeaks(buffer: AudioBuffer, buckets = 2000): Promise<Float32Array> {
  const out = new Float32Array(buckets);
  const channels = Array.from({ length: Math.min(2, buffer.numberOfChannels) }, (_, c) => buffer.getChannelData(c));
  const per = buffer.length / buckets;
  for (let b = 0; b < buckets; b++) {
    const from = Math.floor(b * per);
    const to = Math.min(buffer.length, Math.floor((b + 1) * per));
    let peak = 0;
    for (const data of channels) {
      for (let i = from; i < to; i++) {
        const v = data[i] < 0 ? -data[i] : data[i];
        if (v > peak) peak = v;
      }
    }
    out[b] = peak;
    if (b % 200 === 199) await new Promise((r) => setTimeout(r, 0));
  }
  // Normalise so quiet recordings are still visible.
  let max = 0;
  for (let i = 0; i < buckets; i++) if (out[i] > max) max = out[i];
  if (max > 0) for (let i = 0; i < buckets; i++) out[i] = Math.min(1, out[i] / max);
  return out;
}

interface Recording {
  blob: Blob;
  url: string;
  mime: string;
  startedAt: Date;
  /** Seconds — from the decoded audio when available, else measured. */
  duration: number;
  buffer: AudioBuffer | null;
  peaks: Float32Array | null;
}

export default function AudioRecorderPage() {
  const { t } = useI18n();
  const [supported, setSupported] = useState(true);
  const [state, setState] = useState<RecState>("idle");
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState("");
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [recording, setRecording] = useState<Recording | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [trim, setTrim] = useState<[number, number]>([0, 0]);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState<{ format: ExportFormat; fraction: number } | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const meterCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef(0);
  const chunksRef = useRef<Blob[]>([]);
  const timingRef = useRef({ accum: 0, segStart: 0, running: false });
  const timerElRef = useRef<HTMLDivElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const levelsRef = useRef<number[]>([]);
  const startedAtRef = useRef<Date>(new Date());
  const recordingUrlRef = useRef<string | null>(null);
  const runRef = useRef(0);
  const encodeWorkerRef = useRef<Worker | null>(null);

  // Playback (Web Audio: exact seeking, no Infinity-duration WebM issues)
  const playCtxRef = useRef<AudioContext | null>(null);
  const nodeRef = useRef<AudioBufferSourceNode | null>(null);
  const playRef = useRef({ startedAt: 0, offset: 0, playing: false, until: 0 });

  const elapsed = () => {
    const tm = timingRef.current;
    return (tm.accum + (tm.running ? performance.now() - tm.segStart : 0)) / 1000;
  };

  const refreshDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list.filter((d) => d.kind === "audioinput" && d.deviceId !== "default" && d.deviceId !== "communications"));
    } catch {
      setDevices([]);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setSupported(false);
      return;
    }
    refreshDevices();
    navigator.mediaDevices.addEventListener?.("devicechange", refreshDevices);
    return () => navigator.mediaDevices.removeEventListener?.("devicechange", refreshDevices);
  }, [refreshDevices]);

  // ---------------------------------------------------------------- live view
  const drawLive = useCallback(() => {
    const canvas = liveCanvasRef.current;
    const analyser = analyserRef.current;
    if (timerElRef.current) timerElRef.current.textContent = formatClock(elapsed());
    if (canvas) {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      const barW = Math.max(2, Math.round(3 * dpr));
      const gap = Math.max(1, Math.round(2 * dpr));
      const max = Math.max(1, Math.floor(w / (barW + gap)));
      const levels = levelsRef.current;
      if (analyser && timingRef.current.running) {
        const data = new Float32Array(analyser.fftSize);
        analyser.getFloatTimeDomainData(data);
        let peak = 0;
        for (let i = 0; i < data.length; i++) {
          const v = Math.abs(data[i]);
          if (v > peak) peak = v;
        }
        levels.push(Math.min(1, Math.sqrt(peak))); // perceptual-ish scale
        if (levels.length > max) levels.splice(0, levels.length - max);
      }
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = getComputedStyle(canvas).color;
        const mid = h / 2;
        for (let i = 0; i < levels.length; i++) {
          const x = w - (levels.length - i) * (barW + gap);
          const bh = Math.max(barW, levels[i] * (h - 4 * dpr));
          ctx.fillRect(x, mid - bh / 2, barW, bh);
        }
      }
    }
    rafRef.current = requestAnimationFrame(drawLive);
  }, []);

  const teardownInput = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (meterCtxRef.current && meterCtxRef.current.state !== "closed") meterCtxRef.current.close().catch(() => undefined);
    meterCtxRef.current = null;
    analyserRef.current = null;
  }, []);

  // ---------------------------------------------------------------- playback
  const stopNode = useCallback(() => {
    const node = nodeRef.current;
    if (node) {
      node.onended = null;
      try {
        node.stop();
      } catch {
        /* already stopped */
      }
      node.disconnect();
    }
    nodeRef.current = null;
  }, []);

  const getTime = useCallback(() => {
    const p = playRef.current;
    const ctx = playCtxRef.current;
    if (!p.playing || !ctx) return p.offset;
    return Math.min(p.until, p.offset + (ctx.currentTime - p.startedAt));
  }, []);

  const pause = useCallback(() => {
    const p = playRef.current;
    if (!p.playing) return;
    p.offset = getTime();
    p.playing = false;
    stopNode();
    setPlaying(false);
  }, [getTime, stopNode]);

  const playFrom = useCallback(
    (from: number, free = false) => {
      const buffer = recording?.buffer;
      if (!buffer) return;
      stopNode();
      let ctx = playCtxRef.current;
      if (!ctx || ctx.state === "closed") {
        ctx = new AudioContext();
        playCtxRef.current = ctx;
      }
      ctx.resume().catch(() => undefined);
      const [ts, te] = trim;
      // The play button restarts at the selection; a seek may land anywhere.
      const inside = from >= ts - 0.001 && from < te - 0.02;
      const start = Math.max(0, Math.min(buffer.duration - 0.01, inside || free ? from : ts));
      const until = start < te - 0.02 ? te : buffer.duration;
      const node = ctx.createBufferSource();
      node.buffer = buffer;
      node.connect(ctx.destination);
      node.start(0, start, Math.max(0.01, until - start));
      nodeRef.current = node;
      playRef.current = { startedAt: ctx.currentTime, offset: start, playing: true, until };
      node.onended = () => {
        if (nodeRef.current !== node) return;
        nodeRef.current = null;
        playRef.current = { ...playRef.current, playing: false, offset: ts };
        setPlaying(false);
      };
      setPlaying(true);
    },
    [recording, trim, stopNode],
  );

  const seek = useCallback(
    (time: number) => {
      if (playRef.current.playing) playFrom(time, true);
      else playRef.current.offset = time;
    },
    [playFrom],
  );

  // ---------------------------------------------------------------- recording
  const resetRecording = useCallback(() => {
    runRef.current++;
    stopNode();
    playRef.current = { startedAt: 0, offset: 0, playing: false, until: 0 };
    setPlaying(false);
    encodeWorkerRef.current?.terminate();
    encodeWorkerRef.current = null;
    setExporting(null);
    if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
    recordingUrlRef.current = null;
    setRecording(null);
    setPreparing(false);
  }, [stopNode]);

  useEffect(
    () => () => {
      runRef.current++;
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }
      teardownInput();
      stopNode();
      playCtxRef.current?.close().catch(() => undefined);
      encodeWorkerRef.current?.terminate();
      if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
    },
    [teardownInput, stopNode],
  );

  const finishRecording = useCallback(
    async (chunks: Blob[], mime: string, measured: number) => {
      const run = ++runRef.current;
      const blob = new Blob(chunks, { type: mime });
      const url = URL.createObjectURL(blob);
      if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
      recordingUrlRef.current = url;
      const base: Recording = { blob, url, mime, startedAt: startedAtRef.current, duration: measured, buffer: null, peaks: null };
      setRecording(base);
      setTrim([0, measured]);
      setState("stopped");
      setPreparing(true);
      try {
        const ctx = new AudioContext();
        let buffer: AudioBuffer;
        try {
          buffer = await ctx.decodeAudioData(await blob.arrayBuffer());
        } finally {
          ctx.close().catch(() => undefined);
        }
        const peaks = await computePeaks(buffer);
        if (run !== runRef.current) return;
        setRecording({ ...base, duration: buffer.duration, buffer, peaks });
        setTrim([0, buffer.duration]);
      } catch (err) {
        console.warn("decode failed", err);
      } finally {
        if (run === runRef.current) setPreparing(false);
      }
    },
    [],
  );

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }, []);

  const startRecording = useCallback(async () => {
    resetRecording();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          noiseSuppression,
          echoCancellation,
          autoGainControl: noiseSuppression || echoCancellation,
        },
      });
      streamRef.current = stream;
      refreshDevices(); // labels become available after permission

      const meterCtx = new AudioContext();
      meterCtxRef.current = meterCtx;
      const analyser = meterCtx.createAnalyser();
      analyser.fftSize = 1024;
      meterCtx.createMediaStreamSource(stream).connect(analyser);
      analyserRef.current = analyser;

      const preferred = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported?.(m));
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const tm = timingRef.current;
        if (tm.running) tm.accum += performance.now() - tm.segStart;
        tm.running = false;
        // Trust what the recorder actually produced (older Safari: audio/mp4, not webm).
        const mime = recorder.mimeType || chunksRef.current[0]?.type || preferred || "audio/webm";
        teardownInput();
        finishRecording(chunksRef.current, mime, tm.accum / 1000);
      };
      stream.getAudioTracks()[0]?.addEventListener("ended", () => {
        if (recorder.state !== "inactive") {
          toast.error(t("ar.v2.deviceLost"));
          recorder.stop();
        }
      });

      levelsRef.current = [];
      startedAtRef.current = new Date();
      recorder.start(250);
      timingRef.current = { accum: 0, segStart: performance.now(), running: true };
      setState("recording");
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(drawLive);
    } catch (err) {
      teardownInput();
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") toast.error(t("ar.micDenied"));
      else if (name === "NotFoundError" || name === "OverconstrainedError") toast.error(t("ar.v2.noMic"));
      else if (name === "NotReadableError") toast.error(t("ar.v2.micBusy"));
      else toast.error(t("ar.v2.micError"));
      setState("idle");
    }
  }, [resetRecording, deviceId, noiseSuppression, echoCancellation, refreshDevices, teardownInput, finishRecording, drawLive, t]);

  const pauseRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec?.state !== "recording") return;
    rec.pause();
    const tm = timingRef.current;
    tm.accum += performance.now() - tm.segStart;
    tm.running = false;
    setState("paused");
  }, []);

  const resumeRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec?.state !== "paused") return;
    rec.resume();
    timingRef.current.segStart = performance.now();
    timingRef.current.running = true;
    setState("recording");
  }, []);

  const recordAgain = useCallback(() => {
    resetRecording();
    setState("idle");
  }, [resetRecording]);

  // ---------------------------------------------------------------- export
  const duration = recording?.duration ?? 0;
  const [trimStart, trimEnd] = trim;
  const trimmed = !!recording?.buffer && (trimStart > 0.05 || trimEnd < duration - 0.05);
  const fileBase = recording ? `recording-${stamp(recording.startedAt)}` : "recording";

  const exportAs = useCallback(
    (format: ExportFormat) => {
      const buffer = recording?.buffer;
      if (!buffer || exporting) return;
      const s0 = Math.max(0, Math.floor(trimStart * buffer.sampleRate));
      const s1 = Math.min(buffer.length, Math.ceil(trimEnd * buffer.sampleRate));
      const channels = Array.from({ length: Math.min(2, buffer.numberOfChannels) }, (_, c) => buffer.getChannelData(c).slice(s0, s1));
      const worker = new Worker(new URL("./encode.worker.ts", import.meta.url), { type: "module" });
      encodeWorkerRef.current = worker;
      setExporting({ format, fraction: 0 });
      const finish = () => {
        worker.terminate();
        if (encodeWorkerRef.current === worker) encodeWorkerRef.current = null;
        setExporting(null);
      };
      worker.onmessage = (event: MessageEvent<EncodeResponse>) => {
        if (encodeWorkerRef.current !== worker) return;
        const msg = event.data;
        if (msg.type === "progress") setExporting({ format, fraction: msg.fraction });
        else if (msg.type === "done") {
          downloadBlob(msg.blob, `${fileBase}${trimmed ? "-trimmed" : ""}.${format}`);
          finish();
        } else {
          console.error(msg.message);
          toast.error(t("ar.v2.exportFailed"));
          finish();
        }
      };
      worker.onerror = (event) => {
        event.preventDefault();
        if (encodeWorkerRef.current !== worker) return;
        toast.error(t("ar.v2.exportFailed"));
        finish();
      };
      const request: EncodeRequest = { format, channels, sampleRate: buffer.sampleRate, kbps: 192 };
      worker.postMessage(request, channels.map((c) => c.buffer));
    },
    [recording, exporting, trimStart, trimEnd, fileBase, trimmed, t],
  );

  const cancelExport = () => {
    encodeWorkerRef.current?.terminate();
    encodeWorkerRef.current = null;
    setExporting(null);
  };

  const downloadOriginal = () => {
    if (!recording) return;
    downloadBlob(recording.blob, `${fileBase}.${extensionFor(recording.mime)}`);
  };

  const isRecording = state === "recording";
  const isPaused = state === "paused";
  const live = isRecording || isPaused;

  if (!supported) {
    return (
      <ToolLayout toolName={t("tool.audio-recorder.name")} toolDescription={t("tool.audio-recorder.desc")}>
        <div role="alert" className="glass flex items-start gap-3 p-5">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-t-secondary" aria-hidden="true" />
          <p className="text-[14px] text-t-primary">{t("ar.v2.unsupported")}</p>
        </div>
      </ToolLayout>
    );
  }

  return (
    <ToolLayout toolName={t("tool.audio-recorder.name")} toolDescription={t("tool.audio-recorder.desc")}>
      <div className="space-y-5">
        {/* Recorder */}
        <div className="glass space-y-5 p-5 sm:p-6">
          <div className="flex flex-col items-center gap-3">
            {/* While live, the rAF loop writes the time straight into this element. */}
            <div
              key={live ? "live" : "static"}
              ref={live ? timerElRef : undefined}
              aria-live="off"
              className={`min-h-[60px] font-mono text-5xl font-semibold tabular-nums tracking-wide ${
                isRecording ? "text-red-700 dark:text-red-400" : "text-t-primary"
              }`}
            >
              {live ? null : formatClock(state === "stopped" ? duration : 0)}
            </div>
            {live && (
              <div className="flex items-center gap-2 text-[13px] text-t-secondary" role="status">
                <span className={`h-2 w-2 rounded-full ${isRecording ? "animate-pulse bg-red-500" : "bg-t-tertiary"}`} />
                {isRecording ? t("ar.recording") : t("ar.paused")}
              </div>
            )}
          </div>

          {state !== "stopped" && (
            <canvas
              ref={liveCanvasRef}
              aria-hidden="true"
              className={`h-20 w-full rounded-xl bg-bg-secondary ${isRecording ? "text-t-primary" : "text-t-tertiary"}`}
            />
          )}

          <div className="flex flex-wrap justify-center gap-3">
            {state === "idle" && (
              <button type="button" onClick={startRecording} className={buttonPrimary}>
                <Mic className="h-4 w-4" aria-hidden="true" />
                {t("ar.startRec")}
              </button>
            )}
            {live && (
              <>
                <button type="button" onClick={isRecording ? pauseRecording : resumeRecording} className={buttonSecondary}>
                  {isRecording ? <Pause className="h-4 w-4" aria-hidden="true" /> : <Mic className="h-4 w-4" aria-hidden="true" />}
                  {isRecording ? t("ar.pause") : t("ar.resume")}
                </button>
                <button type="button" onClick={stopRecording} className={buttonPrimary}>
                  <Square className="h-4 w-4" aria-hidden="true" />
                  {t("ar.stop")}
                </button>
              </>
            )}
            {state === "stopped" && (
              <button type="button" onClick={recordAgain} className={buttonSecondary}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                {t("ar.recordAgain")}
              </button>
            )}
          </div>

          {state === "idle" && (
            <div className="space-y-4 border-t border-border pt-5">
              <label className="block">
                <span className="mb-1.5 block text-[13px] text-t-secondary">{t("ar.v2.micLabel")}</span>
                <select
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-[14px] text-t-primary focus:border-accent focus:outline-none"
                >
                  <option value="">{t("ar.v2.micDefault")}</option>
                  {devices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || t("ar.v2.micN", { n: i + 1 })}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <Toggle checked={noiseSuppression} onChange={setNoiseSuppression} label={t("ar.v2.noiseSuppression")} description={t("ar.v2.noiseHint")} />
                <Toggle checked={echoCancellation} onChange={setEchoCancellation} label={t("ar.v2.echoCancellation")} description={t("ar.v2.echoHint")} />
              </div>
              <p className="text-[12.5px] text-t-tertiary">{t("ar.permNote")}</p>
            </div>
          )}
        </div>

        {/* Review, trim, export */}
        {state === "stopped" && recording && (
          <div className="glass space-y-5 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={sectionTitle}>{t("ar.preview")}</p>
              <p className="text-[12.5px] tabular-nums text-t-tertiary">
                {extensionFor(recording.mime).toUpperCase()} · {formatClock(duration)} · {formatFileSize(recording.blob.size)}
              </p>
            </div>

            {recording.buffer && recording.peaks ? (
              <>
                <WaveformEditor
                  peaks={recording.peaks}
                  duration={duration}
                  trimStart={trimStart}
                  trimEnd={trimEnd}
                  onTrim={(s, e) => setTrim([s, e])}
                  onSeek={seek}
                  getTime={getTime}
                  playing={playing}
                  labels={{ start: t("ar.v2.trimStart"), end: t("ar.v2.trimEnd"), seek: t("ar.v2.seek") }}
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => (playing ? pause() : playFrom(playRef.current.offset))}
                      aria-label={playing ? t("ar.pause") : t("ar.v2.play")}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-accent text-on-accent transition hover:bg-accent-hover"
                    >
                      {playing ? <Pause className="h-5 w-5" aria-hidden="true" /> : <Play className="h-5 w-5" aria-hidden="true" />}
                    </button>
                    <span className="text-[13px] tabular-nums text-t-secondary">
                      {t("ar.v2.selection", { start: formatClock(trimStart), end: formatClock(trimEnd), len: formatClock(trimEnd - trimStart) })}
                    </span>
                  </div>
                  {trimmed && (
                    <button type="button" onClick={() => setTrim([0, duration])} className={`${buttonSecondary} min-h-[36px] px-3 py-1.5`}>
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      {t("ar.v2.resetTrim")}
                    </button>
                  )}
                </div>
                <p className="text-[12.5px] text-t-tertiary">{t("ar.v2.trimHint")}</p>
              </>
            ) : preparing ? (
              <div className="h-28 animate-pulse rounded-xl bg-bg-secondary" />
            ) : (
              <>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio src={recording.url} controls className="w-full" />
                <p className="text-[12.5px] text-t-tertiary">{t("ar.v2.decodeUnavailable")}</p>
              </>
            )}

            <div className="space-y-3 border-t border-border pt-5">
              <p className={sectionTitle}>{t("ar.v2.export")}</p>
              {exporting ? (
                <div className="space-y-3" aria-live="polite">
                  <ProgressBar
                    progress={exporting.fraction * 100}
                    label={exporting.format === "mp3" ? t("ar.encodingMp3") : t("ar.encodingWav")}
                  />
                  <button type="button" onClick={cancelExport} className={`${buttonSecondary} w-full`}>
                    <X className="h-4 w-4" aria-hidden="true" />
                    {t("ar.v2.cancel")}
                  </button>
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-3">
                  <button type="button" onClick={() => exportAs("mp3")} disabled={!recording.buffer} className={buttonPrimary}>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {t("ar.downloadMp3")}
                  </button>
                  <button type="button" onClick={() => exportAs("wav")} disabled={!recording.buffer} className={buttonSecondary}>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {t("ar.downloadWav")}
                  </button>
                  <button type="button" onClick={downloadOriginal} disabled={trimmed} className={buttonSecondary}>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {t("ar.v2.downloadOriginal", { format: extensionFor(recording.mime).toUpperCase() })}
                  </button>
                </div>
              )}
              {trimmed && !exporting && <p className="text-[12.5px] text-t-tertiary">{t("ar.v2.originalTrimmedNote")}</p>}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
