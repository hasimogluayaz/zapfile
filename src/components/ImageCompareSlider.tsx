"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface ImageCompareSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export default function ImageCompareSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "Before",
  afterLabel = "After",
  className = "",
}: ImageCompareSliderProps) {
  const [pct, setPct] = useState(50);
  const dragging = useRef(false);
  const wrap = useRef<HTMLDivElement>(null);
  const [boxW, setBoxW] = useState(0);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.offsetWidth));
    ro.observe(el);
    setBoxW(el.offsetWidth);
    return () => ro.disconnect();
  }, []);

  const setFromClientX = useCallback((clientX: number) => {
    const el = wrap.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - r.left, 0), r.width);
    setPct(Math.round((x / r.width) * 100));
  }, []);

  useEffect(() => {
    const up = () => {
      dragging.current = false;
    };
    const move = (e: MouseEvent) => {
      if (!dragging.current) return;
      setFromClientX(e.clientX);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [setFromClientX]);

  return (
    <div className={`relative select-none ${className}`}>
      <div
        ref={wrap}
        className="relative overflow-hidden rounded-xl border border-border aspect-[4/3] max-h-80 bg-bg-secondary"
        onMouseMove={(e) => {
          if (!dragging.current) return;
          setFromClientX(e.clientX);
        }}
        onMouseUp={() => {
          dragging.current = false;
        }}
        onMouseLeave={() => {
          dragging.current = false;
        }}
      >
        {/* After (full background) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={afterSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        />
        {/* Before (clipped) */}
        <div
          className="absolute inset-y-0 left-0 overflow-hidden top-0"
          style={{ width: `${pct}%` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={beforeSrc}
            alt=""
            className="absolute left-0 top-0 h-full object-contain pointer-events-none"
            style={{ width: boxW ? `${boxW}px` : "100%" }}
          />
        </div>
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-md z-10 pointer-events-none"
          style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
        />
        <button
          type="button"
          aria-label="Drag to compare before and after"
          className="absolute top-1/2 z-20 w-10 h-10 -ml-5 rounded-full bg-white shadow-lg border-2 border-accent flex items-center justify-center text-accent text-xs font-bold cursor-ew-resize"
          style={{ left: `${pct}%`, transform: "translate(-50%, -50%)" }}
          onMouseDown={(e) => {
            e.preventDefault();
            dragging.current = true;
            setFromClientX(e.clientX);
          }}
        >
          ⇄
        </button>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pct}
        onChange={(e) => setPct(Number(e.target.value))}
        className="w-full mt-2 accent-accent"
        aria-label="Compare before and after"
      />
      <div className="flex justify-between text-xs text-t-tertiary mt-1">
        <span>{beforeLabel}</span>
        <span>{afterLabel}</span>
      </div>
    </div>
  );
}
