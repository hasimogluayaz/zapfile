"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ImageCompareSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
  /** Extra classes for the frame (e.g. max height). The stage keeps the image's aspect ratio inside it. */
  frameClassName?: string;
  dragHandleAriaLabel?: string;
  rangeAriaLabel?: string;
}

/**
 * Before/after comparison. Both images fill the same stage (sized to the
 * image's aspect ratio), and the "before" layer is revealed with clip-path,
 * so the two can never drift out of alignment.
 */
export default function ImageCompareSlider({
  beforeSrc,
  afterSrc,
  beforeLabel = "Before",
  afterLabel = "After",
  className = "",
  frameClassName = "aspect-[4/3] max-h-80",
  rangeAriaLabel = "Compare before and after",
}: ImageCompareSliderProps) {
  const [pct, setPct] = useState(50);
  const [ratio, setRatio] = useState<number | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  useEffect(() => setPct(50), [beforeSrc]);

  const setFromClientX = useCallback((clientX: number) => {
    const el = stage.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPct(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") setPct((p) => Math.max(0, p - step));
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") setPct((p) => Math.min(100, p + step));
    else if (e.key === "Home") setPct(0);
    else if (e.key === "End") setPct(100);
    else return;
    e.preventDefault();
  };

  return (
    <div className={`select-none ${className}`}>
      <div
        className={`flex items-center justify-center overflow-hidden rounded-xl border border-border bg-bg-secondary ${frameClassName}`}
        style={{ containerType: "size" }}
      >
        <div
          ref={stage}
          className="relative touch-none cursor-ew-resize"
          // Largest box with the image's aspect ratio that fits the frame.
          style={
            ratio
              ? { width: `min(100cqw, ${ratio} * 100cqh)`, aspectRatio: String(ratio) }
              : { width: "100%", height: "100%" }
          }
          onPointerDown={(e) => {
            dragging.current = true;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            setFromClientX(e.clientX);
          }}
          onPointerMove={(e) => dragging.current && setFromClientX(e.clientX)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={afterSrc}
            alt=""
            draggable={false}
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={beforeSrc}
            alt=""
            draggable={false}
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight);
            }}
            className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }}
          />
          <span className="pointer-events-none absolute start-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11.5px] font-medium text-white">
            {beforeLabel}
          </span>
          <span className="pointer-events-none absolute end-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[11.5px] font-medium text-white">
            {afterLabel}
          </span>
          <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white shadow-[0_0_6px_rgba(0,0,0,0.35)]" style={{ left: `${pct}%` }} />
          <div
            role="slider"
            tabIndex={0}
            aria-label={rangeAriaLabel}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
            onKeyDown={onKey}
            className="absolute top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-[#16181d] shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-volt"
            style={{ left: `${pct}%` }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 6l-6 6 6 6M15 6l6 6-6 6" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
