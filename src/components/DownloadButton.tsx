"use client";

import { downloadBlob } from "@/lib/utils";

interface DownloadButtonProps {
  blob: Blob;
  filename: string;
  label?: string;
}

export default function DownloadButton({ blob, filename, label = "Download" }: DownloadButtonProps) {
  return (
    <button
      onClick={() => downloadBlob(blob, filename)}
      className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-medium bg-emerald-600 text-white hover:bg-emerald-500 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      {label}
    </button>
  );
}
