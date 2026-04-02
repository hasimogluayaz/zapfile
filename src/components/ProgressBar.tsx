"use client";

interface ProgressBarProps {
  progress: number;
  label?: string;
}

export default function ProgressBar({ progress, label }: ProgressBarProps) {
  const p = Math.min(100, Math.max(0, progress));

  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-[12px] text-t-secondary">{label}</span>
          <span className="text-[12px] font-medium text-t-primary tabular-nums">{Math.round(p)}%</span>
        </div>
      )}
      <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500 ease-out shimmer"
          style={{ width: `${p}%` }}
        />
      </div>
    </div>
  );
}
