"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AlertCircle, Download, Film, Loader2, RefreshCw, Sparkles, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProgressBar from "@/components/ProgressBar";
import { Segmented, Toggle, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { downloadBlob, formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import Timeline, { formatClock } from "./Timeline";
import { frameDelaysCs, repeatFor, type GifJob, type PaletteMode } from "./gif-core";
import type { GifWorkerIn, GifWorkerOut } from "./gif.worker";

// ---------------------------------------------------------------------------
// Formats: only offer what this browser can actually decode.
// ---------------------------------------------------------------------------

const CANDIDATES: { mime: string; probe: string[]; exts: string[]; label: string }[] = [
  { mime: "video/mp4", probe: ["video/mp4"], exts: [".mp4", ".m4v"], label: "MP4" },
  { mime: "video/webm", probe: ["video/webm"], exts: [".webm"], label: "WebM" },
  // Most .mov files are H.264 in an ISO-BMFF container that MP4-capable browsers decode.
  { mime: "video/quicktime", probe: ["video/quicktime", "video/mp4"], exts: [".mov"], label: "MOV" },
  { mime: "video/ogg", probe: ["video/ogg"], exts: [".ogv"], label: "OGV" },
  { mime: "video/x-matroska", probe: ["video/x-matroska", 'video/webm; codecs="vp9"'], exts: [".mkv"], label: "MKV" },
];
const DEFAULT_FORMATS = CANDIDATES.slice(0, 3);

const FPS_OPTIONS = [5, 10, 15, 20, 25] as const;
const SPEED_OPTIONS = [0.5, 0.75, 1, 1.5, 2] as const;
const WIDTH_PRESETS = [240, 320, 480, 640] as const;
const COLOR_OPTIONS = [64, 128, 256] as const;
const MAX_FRAMES = 400;
const MAX_CLIP = 30; // seconds of source video
const IN_FLIGHT = 6; // frames sent to the worker but not yet encoded

type Loop = "forever" | "once" | 2 | 3;

interface Meta {
  duration: number;
  width: number;
  height: number;
}

interface Output {
  blob: Blob;
  url: string;
  sig: string;
  width: number;
  height: number;
  frames: number;
}

interface Progress {
  extracted: number;
  encoded: number;
  total: number;
}

class Cancelled extends Error {}

function seekTo(video: HTMLVideoElement, time: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new Cancelled());
    if (!video.seeking && Math.abs(video.currentTime - time) < 0.0005 && video.readyState >= 2) return resolve();
    const cleanup = () => {
      clearTimeout(timer);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      signal.removeEventListener("abort", onAbort);
    };
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("decode"));
    };
    const onAbort = () => {
      cleanup();
      reject(new Cancelled());
    };
    const timer = setTimeout(onError, 10000);
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    signal.addEventListener("abort", onAbort);
    video.currentTime = time;
  });
}

function openVideo(src: string, signal: AbortSignal): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    const done = () => {
      video.removeEventListener("loadeddata", done);
      video.removeEventListener("error", fail);
      resolve(video);
    };
    const fail = () => {
      video.removeEventListener("loadeddata", done);
      video.removeEventListener("error", fail);
      reject(signal.aborted ? new Cancelled() : new Error("decode"));
    };
    video.addEventListener("loadeddata", done);
    video.addEventListener("error", fail);
    signal.addEventListener("abort", fail, { once: true });
    video.src = src;
  });
}

function releaseVideo(video: HTMLVideoElement | null) {
  if (!video) return;
  video.removeAttribute("src");
  video.load();
}

/** Rough bytes/pixel after LZW, by colour count; dithering adds noise that compresses worse. */
function estimateBytes(w: number, h: number, frames: number, colors: number, dither: boolean, mode: PaletteMode) {
  const perPixel = colors <= 64 ? 0.3 : colors <= 128 ? 0.38 : 0.46;
  const palettes = mode === "local" ? frames * colors * 3 : colors * 3;
  return Math.round(w * h * frames * perPixel * (dither ? 1.35 : 1) + palettes + frames * 20);
}

export default function VideoToGifPage() {
  const { t } = useI18n();

  const [formats, setFormats] = useState(DEFAULT_FORMATS);
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState(-1);

  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [fps, setFps] = useState<number>(10);
  const [speed, setSpeed] = useState<number>(1);
  const [widthChoice, setWidthChoice] = useState<number | "custom">(480);
  const [customWidth, setCustomWidth] = useState("400");
  const [colors, setColors] = useState<number>(256);
  const [paletteMode, setPaletteMode] = useState<PaletteMode>("global");
  const [dither, setDither] = useState(false);
  const [loop, setLoop] = useState<Loop>("forever");

  const [progress, setProgress] = useState<Progress | null>(null);
  const [output, setOutput] = useState<Output | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const urlRef = useRef<string | null>(null);
  const outputUrlRef = useRef<string | null>(null);
  const runRef = useRef<{ ac: AbortController; worker: Worker | null } | null>(null);

  // Feature-detect decodable containers after mount (SSR renders the defaults).
  useEffect(() => {
    const probe = document.createElement("video");
    const ok = CANDIDATES.filter((c) => c.probe.some((m) => probe.canPlayType(m) !== ""));
    if (ok.length) setFormats(ok);
  }, []);

  const accept = useMemo(() => Object.fromEntries(formats.map((f) => [f.mime, f.exts])), [formats]);

  const cancelRun = useCallback(() => {
    const run = runRef.current;
    if (!run) return;
    run.ac.abort();
    run.worker?.terminate();
    runRef.current = null;
    setProgress(null);
  }, []);

  const clearOutput = useCallback(() => {
    if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
    outputUrlRef.current = null;
    setOutput(null);
  }, []);

  useEffect(
    () => () => {
      runRef.current?.ac.abort();
      runRef.current?.worker?.terminate();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      if (outputUrlRef.current) URL.revokeObjectURL(outputUrlRef.current);
    },
    [],
  );

  const handleFiles = useCallback(
    (files: File[]) => {
      const f = files[0];
      if (!f) return;
      cancelRun();
      clearOutput();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(f);
      urlRef.current = url;
      setFile(f);
      setVideoUrl(url);
      setMeta(null);
      setLoadError(null);
      setPlayhead(-1);
      setStart(0);
      setEnd(0);
    },
    [cancelRun, clearOutput],
  );

  const handleReset = useCallback(() => {
    cancelRun();
    clearOutput();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setFile(null);
    setVideoUrl(null);
    setMeta(null);
    setLoadError(null);
  }, [cancelRun, clearOutput]);

  const onLoadedMetadata = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!v.videoWidth || !v.videoHeight) {
      setLoadError(t("vid2gif.v2.noVideoTrack"));
      return;
    }
    const duration = Number.isFinite(v.duration) ? v.duration : 0;
    if (!(duration > 0)) {
      setLoadError(t("vid2gif.v2.noDuration"));
      return;
    }
    setMeta({ duration, width: v.videoWidth, height: v.videoHeight });
    setStart(0);
    setEnd(Math.min(duration, 5));
  }, [t]);

  const onVideoError = useCallback(() => {
    setLoadError(t("vid2gif.v2.decodeError"));
  }, [t]);

  // Preview: play at the chosen speed and loop inside the selection.
  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = speed;
  }, [speed, meta]);

  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (!v.paused && (v.currentTime >= end || v.currentTime < start - 0.3)) v.currentTime = start;
    setPlayhead(v.currentTime);
  }, [start, end]);

  const scrubTo = useCallback((time: number) => {
    const v = videoRef.current;
    if (!v) return;
    if (!v.paused) v.pause();
    const fast = (v as HTMLVideoElement & { fastSeek?: (t: number) => void }).fastSeek;
    if (fast) fast.call(v, time);
    else v.currentTime = time;
    setPlayhead(time);
  }, []);

  // ---- Derived output geometry ----
  const requestedWidth = widthChoice === "custom" ? Math.round(Number(customWidth)) : widthChoice;
  const customInvalid = widthChoice === "custom" && !(requestedWidth >= 64 && requestedWidth <= 1280);
  const outW = meta ? Math.max(16, Math.min(Number.isFinite(requestedWidth) ? requestedWidth : 480, meta.width)) : 0;
  const outH = meta ? Math.max(1, Math.round((outW * meta.height) / meta.width)) : 0;
  const clipLength = Math.max(0, end - start);
  const frameCount = Math.max(1, Math.round((clipLength / speed) * fps));
  const tooManyFrames = frameCount > MAX_FRAMES;
  const gifSeconds = frameCount / fps;
  const estimate = meta ? estimateBytes(outW, outH, frameCount, colors, dither, paletteMode) : 0;

  const signature = JSON.stringify([start, end, fps, speed, outW, outH, colors, paletteMode, dither, loop]);
  const outputStale = !!output && output.sig !== signature;

  const convert = useCallback(async () => {
    const v = videoRef.current;
    if (!v || !meta || !videoUrl || !file) return;
    if (clipLength < 0.1) {
      toast.error(t("gif.ui.endAfterStart"));
      return;
    }
    cancelRun();
    clearOutput();
    v.pause();

    const ac = new AbortController();
    const run: { ac: AbortController; worker: Worker | null } = { ac, worker: null };
    runRef.current = run;
    const total = frameCount;
    const sig = signature;
    const width = outW;
    const height = outH;
    const step = speed / fps; // seconds of source video per GIF frame
    const times = Array.from({ length: total }, (_, i) => Math.min(meta.duration - 0.01, start + i * step));
    setProgress({ extracted: 0, encoded: 0, total });

    let extractor: HTMLVideoElement | null = null;
    try {
      const worker = new Worker(new URL("./gif.worker.ts", import.meta.url), { type: "module" });
      run.worker = worker;
      let encoded = 0;
      let wake: (() => void) | null = null;
      let finished!: (buffer: ArrayBuffer) => void;
      let failed!: (err: Error) => void;
      const result = new Promise<ArrayBuffer>((res, rej) => {
        finished = res;
        failed = rej;
      });
      result.catch(() => undefined);
      ac.signal.addEventListener("abort", () => wake?.(), { once: true });
      worker.onmessage = (event: MessageEvent<GifWorkerOut>) => {
        const msg = event.data;
        if (msg.type === "frameDone") {
          encoded = msg.count;
          if (runRef.current === run) setProgress((p) => (p ? { ...p, encoded } : p));
          wake?.();
          wake = null;
        } else if (msg.type === "done") finished(msg.buffer);
        else failed(new Error(msg.message));
        if (msg.type !== "frameDone") {
          wake?.();
          wake = null;
        }
      };
      worker.onerror = (event) => {
        event.preventDefault();
        failed(new Error(event.message || "worker"));
        wake?.();
      };
      const post = (msg: GifWorkerIn, transfer: Transferable[] = []) => worker.postMessage(msg, transfer);

      const job: GifJob = {
        width,
        height,
        colors,
        mode: paletteMode,
        dither,
        repeat: repeatFor(loop),
        delaysCs: frameDelaysCs(total, fps),
      };
      post({ type: "init", job });

      extractor = await openVideo(videoUrl, ac.signal);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("canvas");
      const grab = async (time: number) => {
        await seekTo(extractor!, time, ac.signal);
        ctx.drawImage(extractor!, 0, 0, width, height);
        return ctx.getImageData(0, 0, width, height).data.buffer as ArrayBuffer;
      };

      // One palette for the whole GIF, learned from frames spread over the clip.
      if (paletteMode === "global") {
        const n = Math.min(8, total);
        const buffers: ArrayBuffer[] = [];
        for (let k = 0; k < n; k++) {
          buffers.push(await grab(times[Math.floor(((k + 0.5) / n) * total)]));
        }
        post({ type: "samples", buffers }, buffers);
      }

      for (let i = 0; i < total; i++) {
        if (ac.signal.aborted) throw new Cancelled();
        while (i - encoded >= IN_FLIGHT) {
          await new Promise<void>((res) => {
            wake = res;
          });
          if (ac.signal.aborted) throw new Cancelled();
        }
        const buffer = await grab(times[i]);
        post({ type: "frame", buffer }, [buffer]);
        if (runRef.current === run) setProgress((p) => (p ? { ...p, extracted: i + 1 } : p));
      }
      post({ type: "finish" });
      const bytes = await Promise.race([
        result,
        new Promise<never>((_, rej) => ac.signal.addEventListener("abort", () => rej(new Cancelled()), { once: true })),
      ]);
      if (runRef.current !== run) return;
      worker.terminate();
      runRef.current = null;
      const blob = new Blob([bytes], { type: "image/gif" });
      const url = URL.createObjectURL(blob);
      outputUrlRef.current = url;
      setOutput({ blob, url, sig, width, height, frames: total });
      setProgress(null);
      toast.success(t("gif.ui.created"));
    } catch (err) {
      if (err instanceof Cancelled || runRef.current !== run) return;
      console.error(err);
      run.worker?.terminate();
      runRef.current = null;
      setProgress(null);
      toast.error(err instanceof Error && err.message === "decode" ? t("vid2gif.v2.decodeError") : t("gif.ui.conversionFailed"));
    } finally {
      releaseVideo(extractor);
    }
  }, [meta, videoUrl, file, clipLength, cancelRun, clearOutput, frameCount, signature, outW, outH, speed, fps, start, colors, paletteMode, dither, loop, t]);

  const download = () => {
    if (!output || !file) return;
    downloadBlob(output.blob, `${getFileNameWithoutExtension(file.name)}.gif`);
  };

  const busy = progress !== null;
  const pctExtract = progress ? (progress.extracted / progress.total) * 100 : 0;
  const pctEncode = progress ? (progress.encoded / progress.total) * 100 : 0;

  const loopOptions: { value: string; label: string }[] = [
    { value: "forever", label: t("vid2gif.loopForever") },
    { value: "once", label: t("vid2gif.loopOnce") },
    { value: "2", label: t("vid2gif.loopNTimes", { n: 2 }) },
    { value: "3", label: t("vid2gif.loopNTimes", { n: 3 }) },
  ];
  const colorLabels: Record<number, string> = {
    64: t("gif.ui.colorLow"),
    128: t("gif.ui.colorMedium"),
    256: t("gif.ui.colorHigh"),
  };

  return (
    <ToolLayout toolName={t("tool.video-to-gif.name")} toolDescription={t("tool.video-to-gif.desc")}>
      <div className="space-y-5">
        {!file ? (
          <FileDropzone
            onFilesSelected={handleFiles}
            accept={accept}
            multiple={false}
            label={t("vid2gif.dropLabel")}
            formats={formats.map((f) => f.label)}
          />
        ) : (
          <>
            {/* Source */}
            <div className="glass space-y-4 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Film className="h-4 w-4 shrink-0 text-t-tertiary" aria-hidden="true" />
                  <p className="truncate text-[14px] font-medium text-t-primary">{file.name}</p>
                  <span className="shrink-0 text-[12.5px] text-t-tertiary">{formatFileSize(file.size)}</span>
                </div>
                <button type="button" onClick={handleReset} className={`${buttonSecondary} min-h-[36px] px-3 py-1.5`}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  {t("gif.ui.newFile")}
                </button>
              </div>

              {loadError ? (
                <div role="alert" className="flex items-start gap-3 rounded-xl border border-border bg-bg-secondary p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
                  <p className="text-[14px] text-t-primary">{loadError}</p>
                </div>
              ) : (
                <>
                  {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                  <video
                    ref={videoRef}
                    src={videoUrl ?? undefined}
                    onLoadedMetadata={onLoadedMetadata}
                    onError={onVideoError}
                    onTimeUpdate={onTimeUpdate}
                    onSeeked={onTimeUpdate}
                    controls
                    playsInline
                    muted
                    preload="metadata"
                    className="max-h-72 w-full rounded-xl bg-ink"
                  />
                  {meta && (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className={sectionTitle}>{t("gif.ui.trimClip")}</p>
                        <p className="text-[13px] tabular-nums text-t-secondary">
                          {formatClock(start)} – {formatClock(end)}{" "}
                          <span className="text-t-tertiary">({t("vid2gif.v2.seconds", { n: clipLength.toFixed(1) })})</span>
                        </p>
                      </div>
                      <Timeline
                        src={videoUrl!}
                        duration={meta.duration}
                        aspect={meta.width / meta.height}
                        start={start}
                        end={end}
                        maxLength={MAX_CLIP}
                        playhead={playhead}
                        onChange={(s, e) => {
                          setStart(s);
                          setEnd(e);
                        }}
                        onScrub={scrubTo}
                        labels={{ start: t("gif.ui.startTime"), end: t("gif.ui.endTime"), range: t("vid2gif.v2.selection") }}
                      />
                      <p className="text-[12.5px] text-t-tertiary">{t("vid2gif.v2.trimHint")}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {meta && !loadError && (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                {/* Settings */}
                <div className="glass space-y-5 p-5">
                  <div className="space-y-2">
                    <p className={sectionTitle}>{t("vid2gif.v2.speed")}</p>
                    <Segmented
                      label={t("vid2gif.v2.speed")}
                      size="sm"
                      value={speed}
                      onChange={setSpeed}
                      options={SPEED_OPTIONS.map((s) => ({ value: s, label: `${s}×` }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className={sectionTitle}>{t("vid2gif.frameRate")}</p>
                    <Segmented
                      label={t("vid2gif.frameRate")}
                      size="sm"
                      value={fps}
                      onChange={setFps}
                      options={FPS_OPTIONS.map((f) => ({ value: f, label: t("gif.ui.fps", { n: f }) }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className={sectionTitle}>{t("gifmaker.outputWidth")}</p>
                    <Segmented
                      label={t("gifmaker.outputWidth")}
                      size="sm"
                      value={widthChoice}
                      onChange={setWidthChoice}
                      options={[
                        ...WIDTH_PRESETS.map((w) => ({ value: w as number | "custom", label: `${w}`, disabled: w > meta.width })),
                        { value: "custom" as const, label: t("vid2gif.v2.custom") },
                      ]}
                    />
                    {widthChoice === "custom" && (
                      <label className="flex items-center gap-2 text-[13px] text-t-secondary">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={64}
                          max={1280}
                          step={10}
                          value={customWidth}
                          onChange={(e) => setCustomWidth(e.target.value)}
                          aria-invalid={customInvalid}
                          aria-label={t("vid2gif.v2.customWidth")}
                          className="w-28 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-[14px] text-t-primary focus:border-accent focus:outline-none"
                        />
                        px
                      </label>
                    )}
                    {customInvalid && <p className="text-[12.5px] text-red-700 dark:text-red-400">{t("vid2gif.v2.widthRange")}</p>}
                    <p className="text-[12.5px] tabular-nums text-t-tertiary">
                      {t("vid2gif.v2.outputDims", { w: outW, h: outH })}
                      {requestedWidth > meta.width && !customInvalid ? ` · ${t("vid2gif.v2.noUpscale")}` : ""}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className={sectionTitle}>{t("gif.ui.colorQuality")}</p>
                    <Segmented
                      label={t("gif.ui.colorQuality")}
                      size="sm"
                      value={colors}
                      onChange={setColors}
                      options={COLOR_OPTIONS.map((c) => ({ value: c, label: `${colorLabels[c]} · ${c}` }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className={sectionTitle}>{t("vid2gif.loop")}</p>
                    <Segmented
                      label={t("vid2gif.loop")}
                      size="sm"
                      value={String(loop)}
                      onChange={(v) => setLoop(v === "forever" || v === "once" ? v : (Number(v) as 2 | 3))}
                      options={loopOptions}
                    />
                  </div>

                  <div className="space-y-4 border-t border-border pt-4">
                    <Toggle
                      checked={paletteMode === "local"}
                      onChange={(on) => setPaletteMode(on ? "local" : "global")}
                      label={t("vid2gif.v2.localPalette")}
                      description={t("vid2gif.v2.localPaletteHint")}
                    />
                    <Toggle checked={dither} onChange={setDither} label={t("vid2gif.v2.dither")} description={t("vid2gif.v2.ditherHint")} />
                  </div>
                </div>

                {/* Summary, progress, result */}
                <div className="space-y-5">
                  <div className="glass space-y-4 p-5" aria-live="polite">
                    <dl className="grid grid-cols-2 gap-3 text-[13px]">
                      <div className="rounded-xl bg-bg-secondary p-3">
                        <dt className="text-t-tertiary">{t("gif.ui.frames")}</dt>
                        <dd className="mt-0.5 font-semibold tabular-nums text-t-primary">{frameCount}</dd>
                      </div>
                      <div className="rounded-xl bg-bg-secondary p-3">
                        <dt className="text-t-tertiary">{t("vid2gif.v2.gifLength")}</dt>
                        <dd className="mt-0.5 font-semibold tabular-nums text-t-primary">{t("vid2gif.v2.seconds", { n: gifSeconds.toFixed(1) })}</dd>
                      </div>
                      <div className="rounded-xl bg-bg-secondary p-3">
                        <dt className="text-t-tertiary">{t("vid2gif.v2.dimensions")}</dt>
                        <dd className="mt-0.5 font-semibold tabular-nums text-t-primary">
                          {outW} × {outH}
                        </dd>
                      </div>
                      <div className="rounded-xl bg-bg-secondary p-3">
                        <dt className="text-t-tertiary">{output && !outputStale ? t("vid2gif.v2.fileSize") : t("gif.ui.estSize")}</dt>
                        <dd className="mt-0.5 font-semibold tabular-nums text-t-primary">
                          {output && !outputStale ? formatFileSize(output.blob.size) : `~${formatFileSize(estimate)}`}
                        </dd>
                      </div>
                    </dl>

                    {tooManyFrames && (
                      <p role="alert" className="flex items-start gap-2 text-[13px] text-red-700 dark:text-red-400">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        {t("vid2gif.v2.tooManyFrames", { n: frameCount, max: MAX_FRAMES })}
                      </p>
                    )}

                    {busy ? (
                      <div className="space-y-3">
                        <ProgressBar progress={pctExtract} label={t("gif.ui.extractProgress", { n: Math.round(pctExtract) })} />
                        <ProgressBar progress={pctEncode} label={t("gif.ui.encodeProgress", { n: Math.round(pctEncode) })} />
                        <button type="button" onClick={cancelRun} className={`${buttonSecondary} w-full`}>
                          <X className="h-4 w-4" aria-hidden="true" />
                          {t("vid2gif.v2.cancel")}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={convert}
                        disabled={tooManyFrames || customInvalid || clipLength < 0.1}
                        className={`${buttonPrimary} w-full`}
                      >
                        <Sparkles className="h-4 w-4" aria-hidden="true" />
                        {output ? t("vid2gif.v2.recreate") : t("vid2gif.create")}
                      </button>
                    )}
                  </div>

                  {busy && !output && (
                    <div className="glass flex items-center justify-center gap-2 p-6 text-[13px] text-t-secondary">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      {progress && progress.extracted < progress.total ? t("gif.ui.extractingFrames") : t("gif.ui.encodingGif")}
                    </div>
                  )}

                  {output && (
                    <div className="glass space-y-4 p-5">
                      <div className="flex items-center justify-between gap-3">
                        <p className={sectionTitle}>{t("gif.ui.animatedGif")}</p>
                        <span className="text-[13px] font-semibold tabular-nums text-t-primary">{formatFileSize(output.blob.size)}</span>
                      </div>
                      <div className="flex items-center justify-center overflow-hidden rounded-xl border border-border bg-bg-secondary">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={output.url}
                          alt={t("gif.ui.previewAlt")}
                          width={output.width}
                          height={output.height}
                          className={`max-h-80 w-auto max-w-full object-contain transition-opacity ${outputStale ? "opacity-40" : ""}`}
                        />
                      </div>
                      <p className="text-[12.5px] tabular-nums text-t-tertiary">
                        {output.width} × {output.height} · {t("vid2gif.v2.framesCount", { n: output.frames })}
                      </p>
                      {outputStale ? (
                        <p className="flex items-start gap-2 rounded-xl bg-bg-secondary p-3 text-[13px] text-t-secondary">
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                          {t("vid2gif.v2.stale")}
                        </p>
                      ) : (
                        <button type="button" onClick={download} className={`${buttonPrimary} w-full`}>
                          <Download className="h-4 w-4" aria-hidden="true" />
                          {t("gif.ui.downloadGif")}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </ToolLayout>
  );
}
