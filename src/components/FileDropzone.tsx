"use client";

import { useCallback } from "react";
import { useDropzone, type Accept } from "react-dropzone";

interface FileDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: Accept;
  multiple?: boolean;
  maxSize?: number;
  label?: string;
  formats?: string[];
}

export default function FileDropzone({
  onFilesSelected,
  accept,
  multiple = false,
  maxSize,
  label = "Drop your file here or click to browse",
  formats = [],
}: FileDropzoneProps) {
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) onFilesSelected(acceptedFiles);
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept, multiple, maxSize,
  });

  return (
    <div
      {...getRootProps()}
      className={`dropzone rounded-xl p-8 text-center cursor-pointer ${
        isDragActive ? "dropzone-active" : ""
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-accent-light flex items-center justify-center">
          <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <div>
          <p className="text-[13px] font-medium text-t-primary">
            {isDragActive ? "Drop here" : label}
          </p>
          {!isDragActive && (
            <p className="text-[12px] text-t-tertiary mt-0.5">or drag and drop</p>
          )}
        </div>
        {formats.length > 0 && (
          <div className="flex gap-1.5">
            {formats.map((f) => (
              <span key={f} className="text-[10px] font-medium text-t-tertiary bg-bg-secondary px-2 py-0.5 rounded border border-border">
                {f.toUpperCase()}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
