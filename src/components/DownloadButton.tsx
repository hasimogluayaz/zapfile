"use client";

import { Download } from "lucide-react";
import { downloadBlob } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface DownloadButtonProps {
  blob: Blob;
  filename: string;
  label?: string;
}

export default function DownloadButton({ blob, filename, label }: DownloadButtonProps) {
  const { t } = useI18n();
  const displayLabel = label ?? t("ui.download");
  return (
    <button
      type="button"
      onClick={() => downloadBlob(blob, filename)}
      className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-[14px] font-semibold text-on-accent transition hover:bg-accent-hover"
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      {displayLabel}
    </button>
  );
}
