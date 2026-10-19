"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { Check, Copy, Download, FileText, ScanText, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProgressBar from "@/components/ProgressBar";
import { Segmented, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { decodeImage, encodeCanvas } from "@/lib/image-editor-kit";
import { downloadBlob, formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { editablePdfBytes, pdfInputErrorKey } from "@/lib/pdf-input";
import { openPdf } from "@/lib/pdfjs";
import { extractPage } from "@/lib/pdf-convert/extract";
import { pdfFontUrl } from "@/lib/pdf-stamp/fonts";
import { useI18n } from "@/lib/i18n";
import { runWorkerTask } from "../merge-pdf/worker-task";
import type { OcrRequest, OcrWord } from "./ocr.worker";

const LANGS: { code: string; label: string }[] = [
  { code: "eng", label: "English" },
  { code: "tur", label: "Türkçe" },
  { code: "deu", label: "Deutsch" },
  { code: "fra", label: "Français" },
  { code: "spa", label: "Español" },
  { code: "por", label: "Português" },
  { code: "ita", label: "Italiano" },
  { code: "rus", label: "Русский" },
  { code: "ara", label: "العربية" },
  { code: "jpn", label: "日本語" },
  { code: "chi_sim", label: "中文 (简体)" },
  { code: "kor", label: "한국어" },
];
const LOCALE_LANG: Record<string, string> = { tr: "tur", de: "deu", fr: "fra", es: "spa", pt: "por", it: "ita", ja: "jpn", ar: "ara" };
const TESS = `/vendor/tesseract-${process.env.NEXT_PUBLIC_TESSERACT_VERSION ?? "7.0.0"}`;
const DPI = 300;

type Mode = "auto" | "all";

interface Loaded {
  file: File;
  /** PDF bytes (images are wrapped into a one-page PDF). */
  bytes: Uint8Array;
  pdf: PDFDocumentProxy;
  pages: number;
  fromImage: boolean;
}

interface Result {
  pdf: Blob;
  text: string;
  pages: number;
  words: number;
}

const isTiff = (f: File) => f.type === "image/tiff" || /\.tiff?$/i.test(f.name);

/**
 * A TIFF scan (browsers other than Safari can't decode TIFF) becomes one PDF
 * page per TIFF page, sized from its resolution tags.
 */
async function tiffToPdf(file: File): Promise<Uint8Array> {
  const [{ PDFDocument }, UTIF] = await Promise.all([import("pdf-lib"), import("utif2")]);
  const buf = await file.arrayBuffer();
  const ifds = UTIF.decode(buf).filter((ifd) => ifd.t256 && ifd.t257);
  if (!ifds.length) throw new Error("No TIFF pages");
  const doc = await PDFDocument.create();
  for (const ifd of ifds) {
    UTIF.decodeImage(buf, ifd);
    const w = ifd.width as number, h = ifd.height as number;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const rgba = new Uint8ClampedArray(w * h * 4);
    rgba.set(UTIF.toRGBA8(ifd));
    c.getContext("2d")!.putImageData(new ImageData(rgba, w, h), 0, 0);
    const jpeg = await encodeCanvas(c, "image/jpeg", 0.92);
    c.width = c.height = 0;
    const img = await doc.embedJpg(await jpeg.arrayBuffer());
    // XResolution is a rational [num, den]; unit 3 means per centimetre.
    const res = ifd.t282 as number[] | undefined;
    let dpi = res && res[0] ? res[0] / (res[1] || 1) : 200;
    if ((ifd.t296 as number[] | undefined)?.[0] === 3) dpi *= 2.54;
    if (!(dpi >= 50 && dpi <= 1200)) dpi = 200;
    doc.addPage([(w * 72) / dpi, (h * 72) / dpi]).drawImage(img, { x: 0, y: 0, width: (w * 72) / dpi, height: (h * 72) / dpi });
  }
  return doc.save();
}

/** An image becomes a one-page PDF of its size (72 dpi), so the same pipeline applies. */
async function imageToPdf(file: File): Promise<Uint8Array> {
  if (isTiff(file)) {
    try {
      return await tiffToPdf(file);
    } catch {
      // Safari decodes TIFF natively: try that below.
    }
  }
  const { PDFDocument } = await import("pdf-lib");
  const d = await decodeImage(file);
  const c = document.createElement("canvas");
  c.width = d.width;
  c.height = d.height;
  c.getContext("2d")!.drawImage(d.bitmap, 0, 0);
  d.bitmap.close();
  const jpeg = await encodeCanvas(c, "image/jpeg", 0.92);
  c.width = c.height = 0;
  const doc = await PDFDocument.create();
  const img = await doc.embedJpg(await jpeg.arrayBuffer());
  // Assume a 200 dpi scan for the page size.
  const w = (d.width * 72) / 200, h = (d.height * 72) / 200;
  doc.addPage([w, h]).drawImage(img, { x: 0, y: 0, width: w, height: h });
  return doc.save();
}

export default function OcrPdfPage() {
  const { t, locale } = useI18n();
  const [doc, setDoc] = useState<Loaded | null>(null);
  const [opening, setOpening] = useState(false);
  const [langs, setLangs] = useState<string[]>(() => ["eng"]);
  const [mode, setMode] = useState<Mode>("auto");
  const [progress, setProgress] = useState<{ value: number; label: string } | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const abortRef = useRef<{ aborted: boolean } | null>(null);

  useEffect(() => {
    const l = LOCALE_LANG[locale];
    setLangs(l ? [l, "eng"] : ["eng"]);
  }, [locale]);
  useEffect(() => () => void doc?.pdf.destroy(), [doc]);

  const open = useCallback(
    async (files: File[]) => {
      const f = files[0];
      if (!f) return;
      setOpening(true);
      setResult(null);
      const isPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
      try {
        const bytes = isPdf ? await editablePdfBytes(f) : await imageToPdf(f);
        const pdf = await openPdf(bytes);
        setDoc({ file: f, bytes, pdf, pages: pdf.numPages, fromImage: !isPdf });
      } catch (error) {
        toast.error(t(isPdf ? pdfInputErrorKey(error) : "dropper.loadFail"));
      } finally {
        setOpening(false);
      }
    },
    [t],
  );

  const toggleLang = (code: string) =>
    setLangs((prev) => (prev.includes(code) ? (prev.length > 1 ? prev.filter((c) => c !== code) : prev) : prev.length >= 3 ? [...prev.slice(1), code] : [...prev, code]));

  const run = async () => {
    if (!doc) return;
    const token = { aborted: false };
    abortRef.current = token;
    setResult(null);
    setProgress({ value: 0, label: t("ocr.loading") });
    const Tesseract = await import("tesseract.js");
    let worker: Awaited<ReturnType<typeof Tesseract.createWorker>> | null = null;
    try {
      worker = await Tesseract.createWorker(langs, 1, {
        workerPath: `${TESS}/worker.min.js`,
        corePath: TESS,
        langPath: "/tessdata/4.0.0_best_int",
        gzip: true,
        cacheMethod: "write",
        logger: (m: { status: string; progress: number }) => {
          if (m.status.startsWith("loading") && !token.aborted) setProgress({ value: Math.round(m.progress * 8), label: t("ocr.loading") });
        },
      });
      const pages: OcrRequest["pages"] = [];
      const texts: string[] = [];
      let wordCount = 0;
      for (let n = 1; n <= doc.pages; n++) {
        if (token.aborted) throw new DOMException("Aborted", "AbortError");
        setProgress({ value: 8 + Math.round(((n - 1) / doc.pages) * 84), label: t("ocr.page", { n, total: doc.pages }) });
        const page = await doc.pdf.getPage(n);
        const vp1 = page.getViewport({ scale: 1 });
        // Skip pages that already have real text, unless asked to redo everything.
        if (mode === "auto" && !doc.fromImage) {
          const { page: model } = await extractPage(doc.pdf, n, { images: false });
          const visible = model.glyphs.filter((g) => !g.space && !g.hidden).length;
          if (visible > 25) {
            texts.push("");
            page.cleanup();
            continue;
          }
        }
        const scale = Math.min(DPI / 72, 4200 / Math.max(vp1.width, vp1.height));
        const vp = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(vp.width);
        canvas.height = Math.round(vp.height);
        const ctx = canvas.getContext("2d")!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, canvasContext: ctx, viewport: vp }).promise;
        page.cleanup();
        const { data } = await worker.recognize(canvas, {}, { text: true, blocks: true });
        canvas.width = canvas.height = 0;
        const words: OcrWord[] = [];
        for (const block of data.blocks ?? []) {
          for (const para of block.paragraphs) {
            for (const line of para.lines) {
              const lh = Math.max(1, line.bbox.y1 - line.bbox.y0);
              const b = line.baseline;
              for (const w of line.words) {
                if (!w.text.trim() || w.confidence < 20) continue;
                // Baseline at the word's centre, from the line's baseline segment.
                const cx = (w.bbox.x0 + w.bbox.x1) / 2;
                const by = b && b.x1 !== b.x0 ? b.y0 + ((b.y1 - b.y0) * (cx - b.x0)) / (b.x1 - b.x0) : w.bbox.y1;
                words.push({ text: w.text, x0: w.bbox.x0 / scale, x1: w.bbox.x1 / scale, baseline: by / scale, size: (lh * 0.78) / scale });
              }
            }
          }
        }
        wordCount += words.length;
        pages.push({ page: n, words });
        texts.push(data.text.trim());
      }
      setProgress({ value: 94, label: t("ocr.writing") });
      const bytes = doc.bytes.slice().buffer as ArrayBuffer;
      const font = await (await fetch(pdfFontUrl("sans"))).arrayBuffer();
      const res = await runWorkerTask(() => new Worker(new URL("./ocr.worker.ts", import.meta.url), { type: "module" }), { bytes, pages, font } satisfies OcrRequest, [bytes, font], () => {}, new AbortController().signal);
      setResult({
        pdf: new Blob([res.bytes as BlobPart], { type: "application/pdf" }),
        text: texts.map((tx, i) => (tx ? `--- ${t("compare.pageShort", { n: i + 1 })} ---\n${tx}` : "")).filter(Boolean).join("\n\n"),
        pages: pages.length,
        words: wordCount,
      });
    } catch (error) {
      if ((error as { name?: string })?.name !== "AbortError") {
        console.error(error);
        toast.error(t("ocr.failed"));
      }
    } finally {
      await worker?.terminate().catch(() => undefined);
      setProgress(null);
    }
  };

  const base = doc ? getFileNameWithoutExtension(doc.file.name) : "document";

  return (
    <ToolLayout toolName={t("tool.ocr-pdf.name")} toolDescription={t("tool.ocr-pdf.desc")}>
      {!doc ? (
        <FileDropzone
          onFilesSelected={open}
          accept={{ "application/pdf": [".pdf"], "image/*": [".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".bmp"] }}
          formats={["PDF", "JPG", "PNG", "WEBP"]}
          label={opening ? t("p2o.opening") : t("ocr.drop")}
        />
      ) : (
        <div className="space-y-5">
          <div className="glass flex items-center gap-4 p-4">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-bg-secondary">
              <FileText className="h-6 w-6 text-t-secondary" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-t-primary">{doc.file.name}</p>
              <p className="text-[13px] tabular-nums text-t-tertiary">
                {formatFileSize(doc.file.size)} · {t(doc.pages === 1 ? "pdfsec.pagesOne" : "pdfsec.pages", { count: doc.pages })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDoc(null);
                setResult(null);
              }}
              disabled={!!progress} className="flex h-10 w-10 items-center justify-center rounded-full text-t-tertiary hover:bg-bg-secondary hover:text-t-primary" aria-label={t("rotpdf.changeFile")}>
              <X className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </div>

          <div className="glass space-y-4 p-5">
            <div>
              <p className={sectionTitle}>{t("ocr.languages")}</p>
              <p className="mt-1 text-[12.5px] text-t-tertiary">{t("ocr.languagesHint")}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {LANGS.map((l) => {
                  const on = langs.includes(l.code);
                  return (
                    <button
                      key={l.code}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleLang(l.code)}
                      disabled={!!progress}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition ${on ? "border-t-primary bg-accent text-on-accent" : "border-border text-t-secondary hover:text-t-primary"}`}
                    >
                      {on && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                      {l.label}
                    </button>
                  );
                })}
              </div>
            </div>
            {!doc.fromImage && (
              <div>
                <p className={sectionTitle}>{t("p2o.pages")}</p>
                <div className="mt-2">
                  <Segmented<Mode>
                    label={t("p2o.pages")}
                    size="sm"
                    value={mode}
                    onChange={setMode}
                    options={[
                      { value: "auto", label: t("ocr.modeAuto") },
                      { value: "all", label: t("ocr.modeAll") },
                    ]}
                  />
                </div>
              </div>
            )}
            {progress ? (
              <div className="space-y-3">
                <ProgressBar progress={progress.value} label={progress.label} />
                <button type="button" className={buttonSecondary} onClick={() => abortRef.current && (abortRef.current.aborted = true)}>
                  {t("bg.cancel")}
                </button>
              </div>
            ) : (
              <button type="button" className={buttonPrimary} onClick={run}>
                <ScanText className="h-4 w-4" aria-hidden="true" />
                {t("ocr.run")}
              </button>
            )}
          </div>

          {result && (
            <div className="glass space-y-4 p-5" aria-live="polite">
              {result.pages === 0 ? (
                <p className="text-[14px] text-t-secondary">{t("ocr.nothing")}</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="min-w-0 flex-1 text-[14px] text-t-primary">{t("ocr.done", { pages: result.pages, words: result.words.toLocaleString(locale) })}</p>
                    <button type="button" className={buttonPrimary} onClick={() => downloadBlob(result.pdf, `${base}_ocr.pdf`)}>
                      <Download className="h-4 w-4" aria-hidden="true" />
                      {t("ocr.downloadPdf")}
                    </button>
                    <button type="button" className={buttonSecondary} onClick={() => downloadBlob(new Blob([result.text], { type: "text/plain;charset=utf-8" }), `${base}.txt`)}>
                      TXT
                    </button>
                    <button
                      type="button"
                      className={buttonSecondary}
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(result.text);
                          toast.success(t("ui.copied"));
                        } catch {
                          toast.error(t("ui.copyFailed"));
                        }
                      }}
                    >
                      <Copy className="h-4 w-4" aria-hidden="true" />
                      {t("ui.copy")}
                    </button>
                  </div>
                  <pre dir="auto" className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-bg-secondary p-3 text-[13px] leading-5 text-t-primary">{result.text}</pre>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </ToolLayout>
  );
}
