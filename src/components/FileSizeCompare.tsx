"use client";

import { formatFileSize } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface FileSizeCompareProps {
  originalSize: number;
  newSize: number;
}

export default function FileSizeCompare({ originalSize, newSize }: FileSizeCompareProps) {
  const { t } = useI18n();
  const saved = ((1 - newSize / originalSize) * 100).toFixed(1);
  const isSmaller = newSize < originalSize;

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-bg-secondary">
      <div className="text-center flex-1">
        <p className="text-[10px] uppercase tracking-wider text-t-tertiary font-medium">{t("tool.original")}</p>
        <p className="text-[15px] font-semibold text-t-primary mt-0.5 tabular-nums">{formatFileSize(originalSize)}</p>
      </div>
      <svg className="w-4 h-4 text-t-tertiary flex-shrink-0 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
      <div className="text-center flex-1">
        <p className="text-[10px] uppercase tracking-wider text-t-tertiary font-medium">{t("tool.result")}</p>
        <p className="text-[15px] font-semibold text-t-primary mt-0.5 tabular-nums">{formatFileSize(newSize)}</p>
      </div>
      {isSmaller && (
        <div className="text-center flex-1">
          <p className="text-[10px] uppercase tracking-wider text-t-tertiary font-medium">{t("tool.saved")}</p>
          <p className="text-[15px] font-semibold text-emerald-500 mt-0.5 tabular-nums">-{saved}%</p>
        </div>
      )}
    </div>
  );
}
