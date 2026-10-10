"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { ArrowUpFromLine, FileIcon, Lock, Search, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toolField } from "@/lib/tool-i18n";
import { formatFileSize } from "@/lib/utils";
import {
  extensionOf,
  setPendingFiles,
  toolsForFiles,
} from "@/lib/file-handoff";
import ToolIcon from "@/components/ToolIcon";
import { tools } from "@/lib/tools";

/**
 * Home-page hero: drop any file to see the tools that can open it, then
 * jump into one with the file already loaded. Or type to filter tools.
 */
export default function DropPad({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (q: string) => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);

  const onDrop = useCallback((dropped: File[]) => {
    if (dropped.length) setFiles(dropped);
  }, []);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    multiple: true,
  });

  const matches = useMemo(() => toolsForFiles(files), [files]);

  const openTool = (slug: string) => {
    setPendingFiles(files);
    router.push(`/tools/${slug}`);
  };

  const fileLabel =
    files.length === 1
      ? files[0]!.name
      : t("home.drop.multi", { count: files.length });
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  return (
    <div
      {...getRootProps()}
      className={`relative rounded-[28px] border bg-surface p-2 shadow-float transition-[border-color,box-shadow] duration-200 ${
        isDragActive
          ? "border-volt ring-4 ring-volt/40"
          : "border-border"
      }`}
    >
      <input {...getInputProps()} aria-label={t("home.drop.browse")} />

      {files.length === 0 ? (
        <div
          className={`flex min-h-[248px] flex-col items-center justify-center rounded-[22px] border-[1.5px] border-dashed px-6 py-10 text-center transition-colors duration-200 ${
            isDragActive
              ? "border-transparent bg-volt/15"
              : "border-t-primary/15 bg-bg-secondary/50"
          }`}
        >
          <span
            className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors duration-200 ${
              "volt-mark shadow-sm"
            }`}
          >
            <ArrowUpFromLine className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <p className="mt-5 max-w-[22ch] text-[19px] font-semibold leading-tight tracking-[-0.02em] text-t-primary">
            {isDragActive ? t("dropzone.dropHere") : t("home.drop.title")}
          </p>
          <button
            type="button"
            onClick={open}
            className="mt-5 rounded-full bg-t-primary px-5 py-2.5 text-[14px] font-semibold text-bg transition-transform hover:bg-t-primary/90 active:scale-[0.97]"
          >
            {t("home.drop.browse")}
          </button>
          <p className="mt-4 flex items-center gap-1.5 text-[12.5px] text-t-tertiary">
            <Lock className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            {t("tool.privacy")}
          </p>
        </div>
      ) : (
        <div className="min-h-[248px] rounded-[22px] bg-bg-secondary/50 p-4 sm:p-5" aria-live="polite">
          <div className="flex items-center gap-3">
            <span className="volt-mark flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
              <FileIcon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-t-primary">{fileLabel}</p>
              <p className="text-[12.5px] text-t-tertiary">{formatFileSize(totalSize)}</p>
            </div>
            <button
              type="button"
              onClick={() => setFiles([])}
              className="flex h-9 w-9 items-center justify-center rounded-full text-t-tertiary hover:bg-surface hover:text-t-primary"
              aria-label={t("home.drop.reset")}
              title={t("home.drop.reset")}
            >
              <X className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </div>

          {matches.length > 0 ? (
            <>
              <p className="mb-2 mt-5 text-[13px] font-medium text-t-secondary">
                {t("home.drop.matches")}
              </p>
              <div className="grid max-h-[232px] grid-cols-1 gap-1.5 overflow-y-auto sm:grid-cols-2">
                {matches.map((tool) => (
                  <button
                    key={tool.slug}
                    type="button"
                    onClick={() => openTool(tool.slug)}
                    className="group flex items-center gap-2.5 rounded-xl bg-surface px-3 py-2.5 text-start shadow-sm ring-1 ring-border transition hover:ring-t-primary/30 active:scale-[0.99]"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-bg-secondary text-t-primary transition-colors group-hover:bg-volt group-hover:text-ink">
                      <ToolIcon slug={tool.slug} className="h-4 w-4" />
                    </span>
                    <span className="truncate text-[13.5px] font-medium text-t-primary">
                      {toolField(t, tool.slug, tool, "name")}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-6 rounded-xl bg-surface px-4 py-4 text-[13.5px] text-t-secondary ring-1 ring-border">
              {t("home.drop.none", {
                ext: extensionOf(files[0]?.name ?? "") || "?",
              })}
            </p>
          )}
        </div>
      )}

      <label className="mt-2 flex items-center gap-3 rounded-[20px] px-4 py-3 transition-colors focus-within:bg-bg-secondary/60">
        <Search className="h-[18px] w-[18px] shrink-0 text-t-tertiary" strokeWidth={2} aria-hidden="true" />
        <span className="sr-only">{t("a11y.searchTools")}</span>
        <input
          id="hero-search"
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onQueryChange("");
            if (e.key === "Enter") {
              e.preventDefault();
              document
                .getElementById("all-tools")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }}
          placeholder={t("search.heroPlaceholder", { count: tools.length })}
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-t-primary outline-none placeholder:text-t-tertiary focus-visible:shadow-none focus-visible:outline-none"
        />
      </label>
    </div>
  );
}
