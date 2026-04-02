"use client";

import { formatFileSize } from "@/lib/utils";

interface FileSizeCompareProps {
  originalSize: number;
  newSize: number;
}

export default function FileSizeCompare({ originalSize, newSize }: FileSizeCompareProps) {
  const saved = ((1 - newSize / originalSize) * 100).toFixed(1);
  const isSmaller = newSize < originalSize;

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-bg-secondary">
      <div className="text-center flex-1">
        <p className="text-[10px] uppercase tracking-wider text-t-tertiary font-medium">Original</p>
        <p className="text-[15px] font-semibold text-t-primary mt-0.5 tabular-nums">{formatFileSize(originalSize)}</p>
      </div>
      <svg className="w-4 h-4 text-t-tertiary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
      <div className="text-center flex-1">
        <p className="text-[10px] uppercase tracking-wider text-t-tertiary font-medium">Result</p>
        <p className="text-[15px] font-semibold text-t-primary mt-0.5 tabular-nums">{formatFileSize(newSize)}</p>
      </div>
      {isSmaller && (
        <div className="text-center flex-1">
          <p className="text-[10px] uppercase tracking-wider text-t-tertiary font-medium">Saved</p>
          <p className="text-[15px] font-semibold text-emerald-500 mt-0.5 tabular-nums">-{saved}%</p>
        </div>
      )}
    </div>
  );
}
