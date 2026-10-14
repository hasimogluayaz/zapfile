"use client";

import { useEffect, useRef } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";

/**
 * Recorded-audio waveform with trim handles and a scrubbable playhead.
 * The playhead position is read from `getTime()` inside a rAF loop and
 * written straight to the DOM — no React re-render per frame.
 */
export default function WaveformEditor({
  peaks,
  duration,
  trimStart,
  trimEnd,
  onTrim,
  onSeek,
  getTime,
  playing,
  labels,
}: {
  peaks: Float32Array;
  duration: number;
  trimStart: number;
  trimEnd: number;
  onTrim: (start: number, end: number) => void;
  onSeek: (time: number) => void;
  getTime: () => number;
  playing: boolean;
  labels: { start: string; end: string; seek: string };
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const drag = useRef<"start" | "end" | "seek" | null>(null);
  const minLen = Math.min(0.2, duration);

  // Draw the waveform whenever data, trim or size changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(wrap.clientWidth * dpr));
      const h = Math.max(1, Math.round(wrap.clientHeight * dpr));
      if (canvas.width !== w) canvas.width = w;
      if (canvas.height !== h) canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
      const color = getComputedStyle(canvas).color;
      const barW = Math.max(1, Math.round(2 * dpr));
      const gap = Math.max(1, Math.round(1 * dpr));
      const bars = Math.floor(w / (barW + gap));
      const mid = h / 2;
      ctx.fillStyle = color;
      for (let i = 0; i < bars; i++) {
        const from = Math.floor((i / bars) * peaks.length);
        const to = Math.max(from + 1, Math.floor(((i + 1) / bars) * peaks.length));
        let peak = 0;
        for (let j = from; j < to && j < peaks.length; j++) if (peaks[j] > peak) peak = peaks[j];
        const time = ((i + 0.5) / bars) * duration;
        ctx.globalAlpha = time >= trimStart && time <= trimEnd ? 1 : 0.25;
        const bh = Math.max(barW, peak * (h - 8 * dpr));
        ctx.fillRect(i * (barW + gap), mid - bh / 2, barW, bh);
      }
      ctx.globalAlpha = 1;
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [peaks, duration, trimStart, trimEnd]);

  // Playhead follows playback without React state.
  useEffect(() => {
    let raf = 0;
    const place = () => {
      const el = playheadRef.current;
      if (el && duration > 0) el.style.insetInlineStart = `${(Math.min(duration, Math.max(0, getTime())) / duration) * 100}%`;
    };
    const tick = () => {
      place();
      raf = requestAnimationFrame(tick);
    };
    place();
    if (playing) raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, getTime, duration]);

  const seekTo = (time: number) => {
    onSeek(time);
    const el = playheadRef.current;
    if (el && duration > 0) el.style.insetInlineStart = `${(time / duration) * 100}%`;
  };

  const timeAt = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.max(0, Math.min(duration, ((clientX - rect.left) / rect.width) * duration));
  };

  const setHandle = (kind: "start" | "end", time: number) => {
    if (kind === "start") onTrim(Math.max(0, Math.min(time, trimEnd - minLen)), trimEnd);
    else onTrim(trimStart, Math.min(duration, Math.max(time, trimStart + minLen)));
  };

  const down = (kind: "start" | "end" | "seek") => (event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    drag.current = kind;
    if (kind === "seek") seekTo(timeAt(event.clientX));
  };
  const move = (event: ReactPointerEvent<HTMLElement>) => {
    const kind = drag.current;
    if (!kind) return;
    const time = timeAt(event.clientX);
    if (kind === "seek") seekTo(time);
    else setHandle(kind, time);
  };
  const up = () => {
    drag.current = null;
  };

  const key = (kind: "start" | "end") => (event: ReactKeyboardEvent) => {
    const step = event.shiftKey ? 1 : 0.1;
    const value = kind === "start" ? trimStart : trimEnd;
    let next: number | null = null;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = value - step;
    else if (event.key === "ArrowRight" || event.key === "ArrowUp") next = value + step;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = duration;
    if (next === null) return;
    event.preventDefault();
    setHandle(kind, next);
  };

  const seekKey = (event: ReactKeyboardEvent) => {
    const step = event.shiftKey ? 5 : 1;
    const now = getTime();
    if (event.key === "ArrowLeft") seekTo(Math.max(0, now - step));
    else if (event.key === "ArrowRight") seekTo(Math.min(duration, now + step));
    else return;
    event.preventDefault();
  };

  const pct = (time: number) => (duration > 0 ? (time / duration) * 100 : 0);

  const handle = (kind: "start" | "end") => {
    const value = kind === "start" ? trimStart : trimEnd;
    return (
      <div
        role="slider"
        tabIndex={0}
        aria-label={kind === "start" ? labels.start : labels.end}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration * 10) / 10}
        aria-valuenow={Math.round(value * 10) / 10}
        onKeyDown={key(kind)}
        onPointerDown={down(kind)}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="absolute inset-y-0 z-20 flex w-9 -translate-x-1/2 cursor-ew-resize touch-none items-center justify-center rounded-md outline-none focus-visible:ring-2 focus-visible:ring-volt"
        style={{ insetInlineStart: `${pct(value)}%` }}
      >
        <span className="flex h-full w-[10px] items-center justify-center rounded-[4px] bg-volt shadow">
          <span className="h-5 w-[2px] rounded-full bg-volt-ink/60" />
        </span>
      </div>
    );
  };

  return (
    <div dir="ltr" className="select-none">
      <div
        ref={wrapRef}
        role="slider"
        tabIndex={0}
        aria-label={labels.seek}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration * 10) / 10}
        aria-valuenow={Math.round(getTime() * 10) / 10}
        onKeyDown={seekKey}
        onPointerDown={down("seek")}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        className="relative h-28 cursor-pointer touch-none rounded-xl bg-bg-secondary outline-none focus-visible:ring-2 focus-visible:ring-volt"
      >
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full text-t-primary" />
        <div
          className="pointer-events-none absolute inset-y-0 border-y-2 border-volt/70"
          style={{ insetInlineStart: `${pct(trimStart)}%`, width: `${pct(trimEnd) - pct(trimStart)}%` }}
        />
        <div ref={playheadRef} aria-hidden="true" className="pointer-events-none absolute inset-y-1 z-10 w-[2px] -translate-x-1/2 rounded-full bg-accent" />
        {handle("start")}
        {handle("end")}
      </div>
    </div>
  );
}
