"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";

/**
 * Trim timeline: a strip of preview thumbnails with draggable in/out handles.
 * The selected range can also be dragged as a whole. Handles are sliders for
 * keyboard users (arrows ±0.1 s, Shift ±1 s, Home/End).
 */

const THUMBS = 10;
const STRIP_W = 960;
const STRIP_H = 72;

function waitFor(video: HTMLVideoElement, event: string, signal: AbortSignal, ms = 8000) {
  return new Promise<void>((resolve, reject) => {
    const done = () => {
      clearTimeout(timer);
      video.removeEventListener(event, done);
      video.removeEventListener("error", fail);
      resolve();
    };
    const fail = () => {
      clearTimeout(timer);
      video.removeEventListener(event, done);
      video.removeEventListener("error", fail);
      reject(new Error("decode"));
    };
    const timer = setTimeout(fail, ms);
    video.addEventListener(event, done);
    video.addEventListener("error", fail);
    signal.addEventListener("abort", fail, { once: true });
  });
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${m}:${rest.toFixed(1).padStart(4, "0")}`;
}

export default function Timeline({
  src,
  duration,
  aspect,
  start,
  end,
  maxLength,
  minLength = 0.1,
  playhead,
  onChange,
  onScrub,
  labels,
}: {
  src: string;
  duration: number;
  aspect: number;
  start: number;
  end: number;
  maxLength: number;
  minLength?: number;
  playhead: number;
  onChange: (start: number, end: number) => void;
  onScrub: (time: number) => void;
  labels: { start: string; end: string; range: string };
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ kind: "start" | "end" | "range"; offset: number; length: number } | null>(null);
  const [thumbsReady, setThumbsReady] = useState(false);

  // Thumbnails, drawn into one canvas strip from a private hidden <video>.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !(duration > 0)) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setThumbsReady(false);
    ctx.clearRect(0, 0, STRIP_W, STRIP_H);
    const ac = new AbortController();
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = src;
    (async () => {
      try {
        if (video.readyState < 2) await waitFor(video, "loadeddata", ac.signal);
        const cellW = STRIP_W / THUMBS;
        for (let i = 0; i < THUMBS; i++) {
          if (ac.signal.aborted) return;
          const time = Math.min(duration - 0.05, ((i + 0.5) / THUMBS) * duration);
          video.currentTime = Math.max(0, time);
          await waitFor(video, "seeked", ac.signal);
          const vw = video.videoWidth;
          const vh = video.videoHeight;
          if (!vw || !vh) return;
          // cover-crop into the cell
          const cellAspect = cellW / STRIP_H;
          let sw = vw;
          let sh = vh;
          if (vw / vh > cellAspect) sw = vh * cellAspect;
          else sh = vw / cellAspect;
          ctx.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, i * cellW, 0, cellW + 0.5, STRIP_H);
          if (i === 0) setThumbsReady(true);
        }
      } catch {
        // thumbnails are decorative; the trim handles still work without them
      } finally {
        video.removeAttribute("src");
        video.load();
      }
    })();
    return () => {
      ac.abort();
    };
  }, [src, duration, aspect]);

  const pct = (time: number) => (duration > 0 ? (time / duration) * 100 : 0);

  const timeAt = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.max(0, Math.min(duration, ((clientX - rect.left) / rect.width) * duration));
  };

  const apply = (kind: "start" | "end", time: number) => {
    if (kind === "start") {
      const s = Math.max(0, Math.min(time, end - minLength));
      const e = end - s > maxLength ? s + maxLength : end;
      onChange(s, e);
      onScrub(s);
    } else {
      const e = Math.min(duration, Math.max(time, start + minLength));
      const s = e - start > maxLength ? e - maxLength : start;
      onChange(s, e);
      onScrub(e);
    }
  };

  const onPointerDown = (kind: "start" | "end" | "range") => (event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    drag.current = { kind, offset: timeAt(event.clientX) - start, length: end - start };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    const time = timeAt(event.clientX);
    if (d.kind === "range") {
      const s = Math.max(0, Math.min(duration - d.length, time - d.offset));
      onChange(s, s + d.length);
      onScrub(s);
    } else {
      apply(d.kind, time);
    }
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  // Tapping the strip moves the nearer handle there.
  const onTrackPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const time = timeAt(event.clientX);
    const kind = Math.abs(time - start) <= Math.abs(time - end) ? "start" : "end";
    apply(kind, time);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    drag.current = { kind, offset: 0, length: end - start };
  };

  const onKey = (kind: "start" | "end") => (event: ReactKeyboardEvent) => {
    const step = event.shiftKey ? 1 : 0.1;
    const value = kind === "start" ? start : end;
    let next: number | null = null;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = value - step;
    else if (event.key === "ArrowRight" || event.key === "ArrowUp") next = value + step;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = duration;
    if (next === null) return;
    event.preventDefault();
    apply(kind, next);
  };

  const handle = (kind: "start" | "end") => {
    const value = kind === "start" ? start : end;
    return (
      <div
        role="slider"
        tabIndex={0}
        aria-label={kind === "start" ? labels.start : labels.end}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration * 10) / 10}
        aria-valuenow={Math.round(value * 10) / 10}
        aria-valuetext={formatClock(value)}
        onKeyDown={onKey(kind)}
        onPointerDown={onPointerDown(kind)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="group absolute top-0 z-20 flex h-full w-9 -translate-x-1/2 cursor-ew-resize touch-none items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-volt"
        style={{ insetInlineStart: `${pct(value)}%` }}
      >
        <span className="flex h-full w-3 items-center justify-center rounded-[4px] bg-volt shadow-md">
          <span className="h-5 w-[2px] rounded-full bg-volt-ink/60" />
        </span>
      </div>
    );
  };

  return (
    <div dir="ltr" className="select-none">
      <div
        ref={trackRef}
        className="relative h-[72px] touch-none overflow-visible rounded-xl bg-bg-secondary"
        onPointerDown={onTrackPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <canvas
          ref={canvasRef}
          width={STRIP_W}
          height={STRIP_H}
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full rounded-xl transition-opacity duration-300 ${thumbsReady ? "opacity-100" : "opacity-0"}`}
        />
        {/* dim outside the selection */}
        <div className="pointer-events-none absolute inset-y-0 start-0 rounded-s-xl bg-ink/55" style={{ width: `${pct(start)}%` }} />
        <div className="pointer-events-none absolute inset-y-0 end-0 rounded-e-xl bg-ink/55" style={{ width: `${100 - pct(end)}%` }} />
        {/* selection frame (draggable as a whole) */}
        <div
          aria-label={labels.range}
          onPointerDown={onPointerDown("range")}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className="absolute inset-y-0 z-10 cursor-grab touch-none border-y-[3px] border-volt active:cursor-grabbing"
          style={{ insetInlineStart: `${pct(start)}%`, width: `${pct(end) - pct(start)}%` }}
        />
        {/* playhead */}
        {playhead >= 0 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-[-4px] z-10 w-[2px] -translate-x-1/2 rounded-full bg-t-primary"
            style={{ insetInlineStart: `${pct(Math.min(duration, playhead))}%` }}
          />
        )}
        {handle("start")}
        {handle("end")}
      </div>
      <div className="mt-2 flex justify-between text-[12px] tabular-nums text-t-tertiary">
        <span>0:00.0</span>
        <span>{formatClock(duration)}</span>
      </div>
    </div>
  );
}
