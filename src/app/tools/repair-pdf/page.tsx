"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Download, FileWarning, RefreshCw } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProgressBar from "@/components/ProgressBar";
import { buttonPrimary, buttonSecondary } from "@/components/ui/controls";
import { downloadBlob, formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { openPdf } from "@/lib/pdfjs";
import { renderPagePreview } from "@/lib/pdf-stamp/preview";
import { encodeCanvas, makeCanvas, ctx2d, releaseCanvas } from "@/lib/image-editor-kit";
import { useI18n } from "@/lib/i18n";
import { WorkerTaskError, runWorkerTask } from "../merge-pdf/worker-task";
import type { RepairRequest } from "./repair.worker";

type Outcome =
  | { kind: "rebuilt"; blob: Blob; pages: number; lost: number; wasReadable: boolean }
  | { kind: "images"; blob: Blob; pages: number }
  | { kind: "failed" };

const worker = () => new Worker(new URL("./repair.worker.ts", import.meta.url), { type: "module" });

/** Can pdf.js open and draw it? Returns the page count, or null. */
async function readable(bytes: Uint8Array): Promise<number | null> {
  try {
    const pdf = await openPdf(bytes);
    try {
      const p = await renderPagePreview(pdf, 1, 200);
      p.bitmap.close();
      return pdf.numPages;
    } finally {
      void pdf.destroy();
    }
  } catch {
    return null;
  }
}

export default function RepairPdfPage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<{ value: number; label: string } | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const repair = useCallback(
    async (files: File[]) => {
      const f = files[0];
      if (!f) return;
      setFile(f);
      setOutcome(null);
      const original = new Uint8Array(await f.arrayBuffer());
      try {
        setProgress({ value: 10, label: t("repair.checking") });
        const before = await readable(original);
        setProgress({ value: 35, label: t("repair.rebuilding") });
        try {
          const res = await runWorkerTask(worker, { kind: "rebuild", bytes: original.slice().buffer } satisfies RepairRequest, [], () => {}, new AbortController().signal);
          const pages = await readable(res.bytes);
          if (pages) {
            setOutcome({ kind: "rebuilt", blob: new Blob([res.bytes as BlobPart], { type: "application/pdf" }), pages, lost: Number(res.name ?? 0), wasReadable: before !== null });
            return;
          }
        } catch (e) {
          if (!(e instanceof WorkerTaskError)) throw e;
        }
        // Structure is beyond repair: rebuild from what pdf.js can still draw.
        if (before === null) {
          setOutcome({ kind: "failed" });
          return;
        }
        const pdf = await openPdf(original);
        try {
          const pages: { jpeg: ArrayBuffer; width: number; height: number }[] = [];
          for (let n = 1; n <= pdf.numPages; n++) {
            setProgress({ value: 40 + Math.round((n / pdf.numPages) * 50), label: t("repair.recovering", { n, total: pdf.numPages }) });
            try {
              const page = await pdf.getPage(n);
              const vp = page.getViewport({ scale: 1 });
              page.cleanup();
              const r = await renderPagePreview(pdf, n, Math.round((vp.width * 170) / 72));
              const c = makeCanvas(r.bitmap.width, r.bitmap.height);
              ctx2d(c).drawImage(r.bitmap, 0, 0);
              r.bitmap.close();
              pages.push({ jpeg: await (await encodeCanvas(c, "image/jpeg", 0.88)).arrayBuffer(), width: vp.width, height: vp.height });
              releaseCanvas(c);
            } catch {
              /* page can't be drawn either: leave it out */
            }
          }
          if (!pages.length) {
            setOutcome({ kind: "failed" });
            return;
          }
          const res = await runWorkerTask(worker, { kind: "images", pages } satisfies RepairRequest, pages.map((p) => p.jpeg), () => {}, new AbortController().signal);
          setOutcome({ kind: "images", blob: new Blob([res.bytes as BlobPart], { type: "application/pdf" }), pages: pages.length });
        } finally {
          void pdf.destroy();
        }
      } catch (error) {
        console.error(error);
        setOutcome({ kind: "failed" });
      } finally {
        setProgress(null);
      }
    },
    [t],
  );

  const name = file ? `${getFileNameWithoutExtension(file.name)}_repaired.pdf` : "repaired.pdf";

  return (
    <ToolLayout toolName={t("tool.repair-pdf.name")} toolDescription={t("tool.repair-pdf.desc")}>
      <div className="space-y-5">
        {!progress && !outcome && <FileDropzone onFilesSelected={repair} accept={{ "application/pdf": [".pdf"] }} formats={["PDF"]} label={t("repair.drop")} />}
        {progress && (
          <div className="glass space-y-2 p-5">
            {file && <p className="truncate text-[14px] font-semibold text-t-primary">{file.name}</p>}
            <ProgressBar progress={progress.value} label={progress.label} />
          </div>
        )}
        {outcome && file && (
          <div className="glass space-y-4 p-5" aria-live="polite">
            <div className="flex items-start gap-3">
              {outcome.kind === "failed" ? (
                <FileWarning className="mt-0.5 h-6 w-6 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
              ) : outcome.kind === "images" ? (
                <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-green-600 dark:text-green-400" aria-hidden="true" />
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate text-[15px] font-semibold text-t-primary">
                  {file.name} <span className="font-normal text-t-tertiary">· {formatFileSize(file.size)}</span>
                </p>
                <p className="text-[14px] text-t-secondary">
                  {outcome.kind === "failed"
                    ? t("repair.failed")
                    : outcome.kind === "images"
                      ? t("repair.images", { n: outcome.pages })
                      : outcome.wasReadable
                        ? t("repair.cleaned", { n: outcome.pages })
                        : t("repair.rebuilt", { n: outcome.pages })}
                </p>
                {outcome.kind === "rebuilt" && outcome.lost > 0 && <p className="text-[13px] text-amber-700 dark:text-amber-400">{t("repair.lost", { n: outcome.lost })}</p>}
                {outcome.kind === "images" && (
                  <p className="text-[13px] text-t-tertiary">
                    {t("repair.imagesHint")}{" "}
                    <Link href="/tools/ocr-pdf" className="font-medium text-t-primary underline underline-offset-4">
                      OCR PDF
                    </Link>
                  </p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {outcome.kind !== "failed" && (
                <button type="button" className={buttonPrimary} onClick={() => downloadBlob(outcome.blob, name)}>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {t("repair.download")} ({formatFileSize(outcome.blob.size)})
                </button>
              )}
              <button
                type="button"
                className={buttonSecondary}
                onClick={() => {
                  setOutcome(null);
                  setFile(null);
                }}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {t("repair.another")}
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
