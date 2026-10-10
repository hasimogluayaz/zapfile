"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ClipboardEvent as ReactClipboardEvent } from "react";
import { useDropzone, type Accept, type FileRejection } from "react-dropzone";
import toast from "react-hot-toast";
import { useI18n } from "@/lib/i18n";
import { formatFileSize } from "@/lib/utils";

// Only one dropzone per page handles document-level paste (pages may render two).
let pasteOwner: symbol | null = null;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable
  );
}

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: Accept;
  multiple?: boolean;
  maxSize?: number;
  label?: string;
  formats?: string[];
}

function getAcceptedExtensions(accept?: Accept): string[] {
  if (!accept) return [];
  const exts: string[] = [];
  for (const extensions of Object.values(accept)) {
    exts.push(...extensions.map((e) => e.toLowerCase()));
  }
  return exts;
}

export default function FileDropzone({
  onFilesSelected,
  accept,
  multiple = false,
  maxSize,
  label,
  formats = [],
}: FileDropzoneProps) {
  const { t } = useI18n();
  const acceptedExtensions = getAcceptedExtensions(accept);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      // Double-check file extensions manually (browser accept isn't always strict)
      if (acceptedExtensions.length > 0) {
        const validFiles = acceptedFiles.filter((file) => {
          const ext = "." + file.name.split(".").pop()?.toLowerCase();
          return acceptedExtensions.includes(ext);
        });

        if (validFiles.length === 0) {
          toast.error(t("dropzone.invalidType", { formats: formats.join(", ") }));
          return;
        }

        if (validFiles.length < acceptedFiles.length) {
          const skipped = acceptedFiles.length - validFiles.length;
          toast.error(t("dropzone.skipped", { count: skipped }));
        }

        onFilesSelected(validFiles);
      } else {
        onFilesSelected(acceptedFiles);
      }
    },
    [onFilesSelected, acceptedExtensions, formats, t],
  );

  const onDropRejected = useCallback(
    (rejections: FileRejection[]) => {
      if (rejections.length === 0) return;
      const tooLarge = rejections.some((r) =>
        r.errors.some((e) => e.code === "file-too-large"),
      );
      if (tooLarge && maxSize) {
        toast.error(t("dropzone.tooLarge", { size: formatFileSize(maxSize) }));
      } else if (rejections.some((r) => r.errors.some((e) => e.code === "too-many-files"))) {
        toast.error(t("dropzone.oneFile"));
      } else {
        toast.error(t("dropzone.invalidType", { formats: formats.join(", ") }));
      }
    },
    [formats, maxSize, t],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept,
    multiple,
    maxSize,
  });

  const handlePaste = useCallback(
    (e: ReactClipboardEvent<HTMLDivElement>) => {
      const files = Array.from(e.clipboardData?.files || []);
      if (files.length === 0) return;
      e.preventDefault();
      onDrop(files);
    },
    [onDrop],
  );

  // Paste anywhere on the page (not just when the dropzone is focused).
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;
  useEffect(() => {
    const id = Symbol("dropzone");
    if (pasteOwner === null) pasteOwner = id;
    const onDocPaste = (e: ClipboardEvent) => {
      if (pasteOwner !== id || e.defaultPrevented) return;
      if (isTypingTarget(e.target)) return;
      const files = Array.from(e.clipboardData?.files || []);
      if (files.length === 0) return;
      e.preventDefault();
      onDropRef.current(multiple ? files : files.slice(0, 1));
    };
    document.addEventListener("paste", onDocPaste);
    return () => {
      document.removeEventListener("paste", onDocPaste);
      if (pasteOwner === id) pasteOwner = null;
    };
  }, [multiple]);

  return (
    <div
      {...getRootProps({
        onPaste: handlePaste,
        tabIndex: 0,
      })}
      className={`dropzone rounded-xl p-8 text-center cursor-pointer ${
        isDragActive ? "dropzone-active" : ""
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center">
          <svg
            className="w-5 h-5 text-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>
        <div>
          <p className="text-[13px] font-medium text-t-primary">
            {isDragActive ? t("dropzone.dropHere") : label || t("tool.dropLabel")}
          </p>
          {!isDragActive && (
            <p className="text-[12px] text-t-tertiary mt-0.5">
              {t("tool.dropSub")} · {t("tool.pasteHint")}
            </p>
          )}
        </div>
        {formats.length > 0 && (
          <div className="flex gap-1.5 flex-wrap justify-center">
            {formats.map((f) => (
              <span
                key={f}
                className="text-[10px] font-medium text-t-tertiary bg-bg-secondary px-2 py-0.5 rounded border border-border"
              >
                {f.toUpperCase()}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
