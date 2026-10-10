"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ClipboardEvent as ReactClipboardEvent } from "react";
import { useDropzone, type Accept, type FileRejection } from "react-dropzone";
import toast from "react-hot-toast";
import { useI18n } from "@/lib/i18n";
import { formatFileSize } from "@/lib/utils";
import { takePendingFiles } from "@/lib/file-handoff";
import { Lock, Upload } from "lucide-react";

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

  // Pick up a file handed off from the home page's universal drop pad.
  const acceptedKey = acceptedExtensions.join(",");
  useEffect(() => {
    const handed = takePendingFiles(acceptedKey ? acceptedKey.split(",") : []);
    if (handed.length === 0) return;
    onDropRef.current(multiple ? handed : handed.slice(0, 1));
    // Run once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      {...getRootProps({
        onPaste: handlePaste,
        tabIndex: 0,
      })}
      className={`dropzone group relative px-6 py-10 sm:py-12 text-center cursor-pointer ${
        isDragActive ? "dropzone-active" : ""
      }`}
    >
      <input {...getInputProps()} aria-label={label || t("tool.dropLabel")} />
      <div className="flex flex-col items-center gap-4">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${
            isDragActive
              ? "volt-mark"
              : "bg-bg-secondary text-t-primary group-hover:bg-t-primary group-hover:text-bg"
          }`}
        >
          <Upload className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <div>
          <p className="text-[15px] font-semibold tracking-tight text-t-primary">
            {isDragActive ? t("dropzone.dropHere") : label || t("tool.dropLabel")}
          </p>
          {!isDragActive && (
            <p className="mt-1 text-[13px] text-t-tertiary">
              {t("tool.pasteHint")}
            </p>
          )}
        </div>
        {formats.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {formats.map((f) => (
              <span
                key={f}
                className="rounded-md border border-border bg-bg-secondary px-2 py-0.5 text-[11px] font-medium text-t-secondary"
              >
                {f.replace(/^\./, "").toUpperCase()}
              </span>
            ))}
          </div>
        )}
        <p className="flex items-center gap-1.5 text-[12px] text-t-tertiary">
          <Lock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
          {t("tool.privacy")}
        </p>
      </div>
    </div>
  );
}
