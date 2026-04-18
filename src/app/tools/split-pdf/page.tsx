"use client";

import { useState, useCallback, useRef } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProcessButton from "@/components/ProcessButton";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import { formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { pdfPageThumbnail } from "@/lib/pdf-thumb";

interface PageRange {
  start: number;
  end: number;
}

function parsePageRanges(input: string, totalPages: number): PageRange[] | null {
  const ranges: PageRange[] = [];
  const parts = input.split(",").map((s) => s.trim()).filter(Boolean);

  for (const part of parts) {
    if (part.includes("-")) {
      const [startStr, endStr] = part.split("-").map((s) => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end) || start < 1 || end < 1 || start > totalPages || end > totalPages || start > end) {
        return null;
      }

      ranges.push({ start, end });
    } else {
      const page = parseInt(part, 10);
      if (isNaN(page) || page < 1 || page > totalPages) {
        return null;
      }
      ranges.push({ start: page, end: page });
    }
  }

  return ranges.length > 0 ? ranges : null;
}

function formatRange(range: PageRange): string {
  return range.start === range.end
    ? `page-${range.start}`
    : `pages-${range.start}-${range.end}`;
}

export default function SplitPdfPage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [rangeInput, setRangeInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultFilename, setResultFilename] = useState("split-pdfs.zip");
  const [pageThumbs, setPageThumbs] = useState<string[]>([]);
  const [thumbsLoading, setThumbsLoading] = useState(false);
  const pdfBufferRef = useRef<ArrayBuffer | null>(null);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    const selected = files[0];
    if (!selected) return;

    if (selected.type !== "application/pdf" && !selected.name.toLowerCase().endsWith(".pdf")) {
      toast.error(t("split.invalidFile"));
      return;
    }

    try {
      const arrayBuffer = await selected.arrayBuffer();
      pdfBufferRef.current = arrayBuffer.slice(0);
      const { PDFDocument } = await import("pdf-lib");
      const doc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
      });
      const pageCount = doc.getPageCount();

      setFile(selected);
      setTotalPages(pageCount);
      setRangeInput("");
      setResultBlob(null);
      setProgress(0);
      setPageThumbs([]);
      setThumbsLoading(true);

      const buf = pdfBufferRef.current;
      if (buf) {
        const cap = Math.min(pageCount, 96);
        const thumbs: string[] = [];
        try {
          for (let p = 1; p <= cap; p++) {
            thumbs.push(await pdfPageThumbnail(buf, p, 108));
          }
          setPageThumbs(thumbs);
        } catch (e) {
          console.error(e);
          setPageThumbs([]);
        } finally {
          setThumbsLoading(false);
        }
      } else {
        setThumbsLoading(false);
      }

      toast.success(t("split.loaded", { count: pageCount }));
    } catch (error) {
      console.error("Error loading PDF:", error);
      toast.error(t("split.loadFail"));
      setThumbsLoading(false);
    }
  }, [t]);

  const handleSplit = useCallback(async () => {
    if (!file || totalPages === 0) return;

    const trimmed = rangeInput.trim();
    if (!trimmed) {
      toast.error(t("split.enterRanges"));
      return;
    }

    const ranges = parsePageRanges(trimmed, totalPages);
    if (!ranges) {
      toast.error(t("split.invalidRanges"));
      return;
    }

    setProcessing(true);
    setProgress(0);
    setResultBlob(null);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const JSZip = (await import("jszip")).default;
      setProgress(10);

      const arrayBuffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
      });
      setProgress(25);

      const zip = new JSZip();
      const baseName = getFileNameWithoutExtension(file.name);

      for (let i = 0; i < ranges.length; i++) {
        const range = ranges[i];
        const newDoc = await PDFDocument.create();

        // pdf-lib uses 0-based indexing; user input is 1-based
        const pageIndices: number[] = [];
        for (let p = range.start - 1; p <= range.end - 1; p++) {
          pageIndices.push(p);
        }

        const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
        for (const page of copiedPages) {
          newDoc.addPage(page);
        }

        const pdfBytes = await newDoc.save({ useObjectStreams: true });
        const rangeLabel = formatRange(range);
        zip.file(`${baseName}_${rangeLabel}.pdf`, pdfBytes);

        setProgress(25 + ((i + 1) / ranges.length) * 60);
      }

      setProgress(90);

      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      setResultBlob(zipBlob);
      setResultFilename(`${baseName}-split.zip`);
      setProgress(100);

      toast.success(t("split.success", { count: ranges.length }));
    } catch (error) {
      console.error("Split error:", error);
      toast.error(t("split.fail"));
    } finally {
      setProcessing(false);
    }
  }, [file, totalPages, rangeInput, t]);

  const handleReset = useCallback(() => {
    setFile(null);
    setTotalPages(0);
    setRangeInput("");
    setResultBlob(null);
    setProgress(0);
    setPageThumbs([]);
    pdfBufferRef.current = null;
  }, []);

  return (
    <ToolLayout
      toolName={t("tool.split-pdf.name")}
      toolDescription={t("tool.split-pdf.desc")}
    >
      <div className="space-y-6">
        {/* File Drop Area */}
        {!file && (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{ "application/pdf": [".pdf"] }}
            multiple={false}
            label={t("split.dropLabel")}
            formats={["pdf"]}
          />
        )}

        {/* File Info & Page Count */}
        {file && (
          <div className="glass rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-red-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-t-primary font-medium">{file.name}</p>
                  <p className="text-sm text-t-secondary">
                    {formatFileSize(file.size)} &middot;{" "}
                    {t("split.pagesCount", { count: totalPages })}
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="text-t-secondary hover:text-t-primary transition-colors p-2 rounded-lg hover:bg-bg-secondary"
                title={t("ui.remove")}
                type="button"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {totalPages > 0 && (
              <div className="mt-5 pt-5 border-t border-border space-y-3">
                <p className="text-[13px] font-semibold text-t-primary">
                  {t("split.pagePreview")}
                  {thumbsLoading && (
                    <span className="ml-2 text-[12px] font-normal text-t-secondary">
                      {t("split.thumbsLoading")}
                    </span>
                  )}
                </p>
                {pageThumbs.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-[320px] overflow-y-auto pr-1">
                    {pageThumbs.map((src, i) => (
                      <div
                        key={i}
                        className="rounded-lg border border-border overflow-hidden bg-bg-secondary"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt=""
                          className="w-full h-auto object-cover aspect-[3/4]"
                        />
                        <p className="text-[10px] text-center py-1 text-t-secondary tabular-nums">
                          {t("split.pageLabel", { n: i + 1 })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {totalPages > pageThumbs.length && pageThumbs.length > 0 && (
                  <p className="text-[11px] text-t-secondary">
                    {t("split.thumbsPartial", {
                      shown: pageThumbs.length,
                      total: totalPages,
                    })}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Page Range Input */}
        {file && totalPages > 0 && !resultBlob && (
          <div className="glass rounded-xl p-6 space-y-4">
            <div>
              <label
                htmlFor="pageRanges"
                className="block text-sm font-medium text-t-primary mb-2"
              >
                {t("split.pageRanges")}
              </label>
              <input
                id="pageRanges"
                type="text"
                value={rangeInput}
                onChange={(e) => setRangeInput(e.target.value)}
                placeholder={`e.g. 1-3, 5, 7-${totalPages}`}
                className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border text-t-primary placeholder:text-t-secondary/60 focus:outline-none focus:border-accent/50 transition-colors"
              />
              <p className="text-xs text-t-secondary mt-2">
                {t("split.rangesHelp")}
              </p>
            </div>

            {/* Quick select buttons */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRangeInput(`1-${totalPages}`)}
                className="px-3 py-1.5 text-xs rounded-lg bg-bg-secondary border border-border text-t-secondary hover:text-t-primary hover:border-accent/40 transition-colors"
              >
                {t("split.allPages")}
              </button>
              {totalPages > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setRangeInput(
                      Array.from({ length: totalPages }, (_, i) => String(i + 1)).join(", ")
                    )
                  }
                  className="px-3 py-1.5 text-xs rounded-lg bg-bg-secondary border border-border text-t-secondary hover:text-t-primary hover:border-accent/40 transition-colors"
                >
                  {t("split.eachPage")}
                </button>
              )}
              {totalPages >= 2 && (
                <button
                  type="button"
                  onClick={() => {
                    const mid = Math.ceil(totalPages / 2);
                    setRangeInput(`1-${mid}, ${mid + 1}-${totalPages}`);
                  }}
                  className="px-3 py-1.5 text-xs rounded-lg bg-bg-secondary border border-border text-t-secondary hover:text-t-primary hover:border-accent/40 transition-colors"
                >
                  {t("split.half")}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {processing && (
          <ProgressBar progress={progress} label={t("split.splittingPdf")} />
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-4">
          {file && !resultBlob && (
            <ProcessButton
              onClick={handleSplit}
              disabled={!file || !rangeInput.trim()}
              loading={processing}
              label={t("split.button")}
              loadingLabel={t("split.splitting")}
            />
          )}
          {resultBlob && (
            <>
              <DownloadButton
                blob={resultBlob}
                filename={resultFilename}
                label={t("split.download")}
              />
              <button
                type="button"
                onClick={handleReset}
                className="px-6 py-3 rounded-xl font-semibold text-t-secondary border border-border hover:text-t-primary hover:border-accent/40 transition-all duration-300"
              >
                {t("split.another")}
              </button>
            </>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
