"use client";

import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import { useI18n } from "@/lib/i18n";

type Position =
  | "bottom-center"
  | "bottom-right"
  | "bottom-left"
  | "top-center"
  | "top-right"
  | "top-left";

type NumberFormat = "page" | "page-total";

type FontChoice =
  | StandardFonts.Helvetica
  | StandardFonts.TimesRoman
  | StandardFonts.Courier;

const POSITION_GRID: { value: Position; cell: string }[] = [
  { value: "top-left", cell: "TL" },
  { value: "top-center", cell: "TC" },
  { value: "top-right", cell: "TR" },
  { value: "bottom-left", cell: "BL" },
  { value: "bottom-center", cell: "BC" },
  { value: "bottom-right", cell: "BR" },
];

const FONT_OPTIONS: { value: FontChoice; label: string }[] = [
  { value: StandardFonts.Helvetica, label: "Helvetica" },
  { value: StandardFonts.TimesRoman, label: "Times" },
  { value: StandardFonts.Courier, label: "Courier" },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToPdfRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const safe = normalized.length === 3
    ? normalized
        .split("")
        .map((char) => `${char}${char}`)
        .join("")
    : normalized.padEnd(6, "0").slice(0, 6);

  const r = Number.parseInt(safe.slice(0, 2), 16) / 255;
  const g = Number.parseInt(safe.slice(2, 4), 16) / 255;
  const b = Number.parseInt(safe.slice(4, 6), 16) / 255;
  return rgb(r, g, b);
}

function buildLabel(
  currentNumber: number,
  totalNumberedPages: number,
  format: NumberFormat,
  prefix: string,
  suffix: string,
  digits: number,
) {
  const base = String(currentNumber).padStart(digits, "0");
  const numbered = format === "page-total" ? `${base} / ${totalNumberedPages}` : base;
  return `${prefix}${numbered}${suffix}`;
}

function resolveCoordinates(
  width: number,
  height: number,
  textWidth: number,
  fontSize: number,
  position: Position,
  marginX: number,
  marginY: number,
) {
  switch (position) {
    case "bottom-left":
      return { x: marginX, y: marginY };
    case "bottom-center":
      return { x: (width - textWidth) / 2, y: marginY };
    case "bottom-right":
      return { x: width - textWidth - marginX, y: marginY };
    case "top-left":
      return { x: marginX, y: height - fontSize - marginY };
    case "top-center":
      return { x: (width - textWidth) / 2, y: height - fontSize - marginY };
    case "top-right":
      return { x: width - textWidth - marginX, y: height - fontSize - marginY };
    default:
      return { x: marginX, y: marginY };
  }
}

export default function PdfPageNumbersPage() {
  const { locale } = useI18n();
  const copy = locale === "tr"
    ? {
        dropLabel: "Numaralandırmak istediğiniz PDF dosyasını bırakın",
        fileReady: "Dosya hazır",
        quickSetup: "Hızlı ayarlar",
        pageRange: "Sayfa aralığı",
        firstPage: "İlk sayfa",
        lastPage: "Son sayfa",
        formatting: "Biçim",
        prefix: "Önek",
        suffix: "Sonek",
        digits: "Sıfır dolgusu",
        labelStyle: "Numara stili",
        numberOnly: "Sadece numara",
        numberAndTotal: "Numara / toplam",
        appearance: "Görünüm",
        font: "Yazı tipi",
        fontSize: "Boyut",
        opacity: "Saydamlık",
        color: "Renk",
        marginX: "Yatay boşluk",
        marginY: "Dikey boşluk",
        sample: "Örnek çıktı",
        numberedPages: "Numaralanacak sayfa",
        actualRange: "Uygulama aralığı",
        process: "Sayfa numaralarını uygula",
        processing: "PDF işleniyor...",
        resultTitle: "Hazır çıktı",
        anotherFile: "Başka PDF seç",
        invalidPdf: "PDF okunamadı. Başka bir dosya deneyin.",
        invalidRange: "Sayfa aralığını kontrol edin.",
        success: "Sayfa numaraları eklendi.",
        fail: "Sayfa numaraları eklenemedi.",
        startHint: "İlk numaralı sayfada görünecek sayı.",
        positionHint: "Konumu seçin, sonra boyut ve boşlukları ince ayarlayın.",
        fromLabel: "Başlangıç",
      }
    : {
        dropLabel: "Drop the PDF you want to number",
        fileReady: "File ready",
        quickSetup: "Quick setup",
        pageRange: "Page range",
        firstPage: "First page",
        lastPage: "Last page",
        formatting: "Formatting",
        prefix: "Prefix",
        suffix: "Suffix",
        digits: "Zero padding",
        labelStyle: "Number style",
        numberOnly: "Number only",
        numberAndTotal: "Number / total",
        appearance: "Appearance",
        font: "Font",
        fontSize: "Size",
        opacity: "Opacity",
        color: "Color",
        marginX: "Horizontal margin",
        marginY: "Vertical margin",
        sample: "Sample output",
        numberedPages: "Pages to number",
        actualRange: "Applied range",
        process: "Apply page numbers",
        processing: "Processing PDF...",
        resultTitle: "Ready to download",
        anotherFile: "Choose another PDF",
        invalidPdf: "Could not read that PDF. Please try another file.",
        invalidRange: "Please review the page range.",
        success: "Page numbers added.",
        fail: "Failed to add page numbers.",
        startHint: "The number that appears on the first numbered page.",
        positionHint: "Pick a placement, then fine-tune size and margins.",
        fromLabel: "Start from",
      };

  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [position, setPosition] = useState<Position>("bottom-center");
  const [startFrom, setStartFrom] = useState(1);
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(1);
  const [numberFormat, setNumberFormat] = useState<NumberFormat>("page");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [digits, setDigits] = useState(1);
  const [fontChoice, setFontChoice] = useState<FontChoice>(StandardFonts.Helvetica);
  const [fontSize, setFontSize] = useState(11);
  const [opacity, setOpacity] = useState(65);
  const [color, setColor] = useState("#666666");
  const [marginX, setMarginX] = useState(36);
  const [marginY, setMarginY] = useState(28);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);

  const positionedLabel = useMemo(
    () => buildLabel(startFrom, Math.max(1, rangeEnd - rangeStart + 1), numberFormat, prefix, suffix, digits),
    [digits, numberFormat, prefix, rangeEnd, rangeStart, startFrom, suffix],
  );

  const normalizedRange = useMemo(() => {
    if (!pageCount) return { from: 1, to: 1, count: 0 };
    const from = clamp(rangeStart || 1, 1, pageCount);
    const to = clamp(rangeEnd || pageCount, from, pageCount);
    return {
      from,
      to,
      count: to - from + 1,
    };
  }, [pageCount, rangeEnd, rangeStart]);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const nextFile = files[0];
      if (!nextFile) return;

      setFile(nextFile);
      setResultBlob(null);
      setProgress(0);

      try {
        const pdfDoc = await PDFDocument.load(await nextFile.arrayBuffer());
        const totalPages = pdfDoc.getPageCount();
        setPageCount(totalPages);
        setRangeStart(1);
        setRangeEnd(totalPages);
      } catch (error) {
        console.error(error);
        setFile(null);
        setPageCount(0);
        toast.error(copy.invalidPdf);
      }
    },
    [copy.invalidPdf],
  );

  const reset = useCallback(() => {
    setFile(null);
    setPageCount(0);
    setRangeStart(1);
    setRangeEnd(1);
    setResultBlob(null);
    setProgress(0);
  }, []);

  const handleAddPageNumbers = useCallback(async () => {
    if (!file || !pageCount) return;

    const from = clamp(rangeStart || 1, 1, pageCount);
    const to = clamp(rangeEnd || pageCount, from, pageCount);
    if (from > to) {
      toast.error(copy.invalidRange);
      return;
    }

    setProcessing(true);
    setProgress(8);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const font = await pdfDoc.embedFont(fontChoice);
      const pages = pdfDoc.getPages();
      const totalNumberedPages = to - from + 1;
      const numberColor = hexToPdfRgb(color);
      setProgress(24);

      let numberedIndex = 0;
      for (let i = 0; i < pages.length; i++) {
        const pageNumber = i + 1;
        if (pageNumber < from || pageNumber > to) {
          continue;
        }

        const page = pages[i];
        const { width, height } = page.getSize();
        const currentNumber = startFrom + numberedIndex;
        const label = buildLabel(
          currentNumber,
          totalNumberedPages,
          numberFormat,
          prefix,
          suffix,
          digits,
        );
        const textWidth = font.widthOfTextAtSize(label, fontSize);
        const { x, y } = resolveCoordinates(
          width,
          height,
          textWidth,
          fontSize,
          position,
          marginX,
          marginY,
        );

        page.drawText(label, {
          x,
          y,
          size: fontSize,
          font,
          opacity: opacity / 100,
          color: numberColor,
        });

        numberedIndex += 1;
        setProgress(24 + Math.round((numberedIndex / totalNumberedPages) * 70));
      }

      const pdfBytes = await pdfDoc.save();
      setResultBlob(new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }));
      setProgress(100);
      toast.success(copy.success);
    } catch (error) {
      console.error(error);
      toast.error(copy.fail);
    } finally {
      setProcessing(false);
    }
  }, [
    color,
    copy.fail,
    copy.invalidRange,
    copy.success,
    digits,
    file,
    fontChoice,
    fontSize,
    marginX,
    marginY,
    numberFormat,
    opacity,
    pageCount,
    position,
    prefix,
    rangeEnd,
    rangeStart,
    startFrom,
    suffix,
  ]);

  return (
    <ToolLayout
      toolName="PDF Page Numbers"
      toolDescription="Add page numbers to your PDF document. Choose position, formatting, and page range."
    >
      <div className="space-y-6">
        {!file ? (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{ "application/pdf": [".pdf"] }}
            formats={["PDF"]}
            label={copy.dropLabel}
          />
        ) : (
          <>
            <div className="glass rounded-2xl p-5 sm:p-6 space-y-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.22em] text-t-secondary">
                    {copy.fileReady}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-t-primary truncate">
                    {file.name}
                  </p>
                  <p className="mt-1 text-sm text-t-secondary">
                    {pageCount} {pageCount === 1 ? "page" : "pages"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  className="shrink-0 rounded-xl border border-border bg-bg-secondary px-4 py-2 text-sm font-medium text-t-secondary transition-colors hover:text-t-primary"
                >
                  {copy.anotherFile}
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-border bg-bg-secondary/70 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                    {copy.actualRange}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-t-primary">
                    {normalizedRange.from}-{normalizedRange.to}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-bg-secondary/70 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                    {copy.numberedPages}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-t-primary">
                    {normalizedRange.count}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-bg-secondary/70 p-4">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-t-secondary">
                    {copy.sample}
                  </p>
                  <p className="mt-2 text-xl font-semibold text-t-primary">
                    {positionedLabel}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-5">
                <div className="glass rounded-2xl p-5 space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-t-primary">{copy.quickSetup}</p>
                    <p className="mt-1 text-xs text-t-secondary">{copy.positionHint}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {POSITION_GRID.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setPosition(item.value)}
                        className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-all ${
                          position === item.value
                            ? "border-accent bg-accent/15 text-t-primary shadow-[0_0_0_1px_rgba(99,102,241,0.16)]"
                            : "border-border bg-bg-secondary text-t-secondary hover:border-accent/40 hover:text-t-primary"
                        }`}
                      >
                        {item.cell}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-t-secondary">
                        {copy.fromLabel}
                      </label>
                      <input
                        type="number"
                        min={-9999}
                        value={startFrom}
                        onChange={(event) => setStartFrom(Number(event.target.value || 1))}
                        className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-t-primary focus:border-accent/50 focus:outline-none"
                      />
                      <p className="mt-1.5 text-xs text-t-secondary">{copy.startHint}</p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-t-secondary">
                        {copy.digits}
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={4}
                        step={1}
                        value={digits}
                        onChange={(event) => setDigits(Number(event.target.value))}
                        className="w-full accent-accent"
                      />
                      <div className="mt-2 flex items-center justify-between text-xs text-t-secondary">
                        <span>1</span>
                        <span>{digits}</span>
                        <span>4</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="glass rounded-2xl p-5 space-y-4">
                  <p className="text-sm font-semibold text-t-primary">{copy.pageRange}</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-t-secondary">
                        {copy.firstPage}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={pageCount}
                        value={rangeStart}
                        onChange={(event) => setRangeStart(Number(event.target.value || 1))}
                        className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-t-primary focus:border-accent/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-t-secondary">
                        {copy.lastPage}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={pageCount}
                        value={rangeEnd}
                        onChange={(event) => setRangeEnd(Number(event.target.value || pageCount))}
                        className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-t-primary focus:border-accent/50 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="glass rounded-2xl p-5 space-y-4">
                  <p className="text-sm font-semibold text-t-primary">{copy.formatting}</p>
                  <div className="flex flex-wrap gap-2">
                    {([
                      { value: "page" as const, label: copy.numberOnly },
                      { value: "page-total" as const, label: copy.numberAndTotal },
                    ]).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setNumberFormat(option.value)}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                          numberFormat === option.value
                            ? "border-accent bg-accent/15 text-t-primary"
                            : "border-border bg-bg-secondary text-t-secondary hover:border-accent/40 hover:text-t-primary"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-t-secondary">
                        {copy.prefix}
                      </label>
                      <input
                        type="text"
                        value={prefix}
                        onChange={(event) => setPrefix(event.target.value)}
                        placeholder="Page "
                        className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-t-primary placeholder:text-t-secondary/50 focus:border-accent/50 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-t-secondary">
                        {copy.suffix}
                      </label>
                      <input
                        type="text"
                        value={suffix}
                        onChange={(event) => setSuffix(event.target.value)}
                        placeholder=""
                        className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-t-primary placeholder:text-t-secondary/50 focus:border-accent/50 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="glass rounded-2xl p-5 space-y-4">
                  <p className="text-sm font-semibold text-t-primary">{copy.appearance}</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-t-secondary">
                        {copy.font}
                      </label>
                      <select
                        value={fontChoice}
                        onChange={(event) => setFontChoice(event.target.value as FontChoice)}
                        className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-t-primary focus:border-accent/50 focus:outline-none"
                      >
                        {FONT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-t-secondary">
                        {copy.color}
                      </label>
                      <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-secondary px-3 py-2">
                        <input
                          type="color"
                          value={color}
                          onChange={(event) => setColor(event.target.value)}
                          className="h-9 w-9 rounded-lg border border-border bg-transparent p-0.5"
                        />
                        <span className="text-sm font-mono text-t-secondary">{color}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm text-t-secondary">
                        <label>{copy.fontSize}</label>
                        <span className="font-mono">{fontSize}px</span>
                      </div>
                      <input
                        type="range"
                        min={8}
                        max={28}
                        step={1}
                        value={fontSize}
                        onChange={(event) => setFontSize(Number(event.target.value))}
                        className="w-full accent-accent"
                      />
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm text-t-secondary">
                        <label>{copy.opacity}</label>
                        <span className="font-mono">{opacity}%</span>
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={100}
                        step={1}
                        value={opacity}
                        onChange={(event) => setOpacity(Number(event.target.value))}
                        className="w-full accent-accent"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm text-t-secondary">
                        <label>{copy.marginX}</label>
                        <span className="font-mono">{marginX}px</span>
                      </div>
                      <input
                        type="range"
                        min={12}
                        max={96}
                        step={1}
                        value={marginX}
                        onChange={(event) => setMarginX(Number(event.target.value))}
                        className="w-full accent-accent"
                      />
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm text-t-secondary">
                        <label>{copy.marginY}</label>
                        <span className="font-mono">{marginY}px</span>
                      </div>
                      <input
                        type="range"
                        min={12}
                        max={96}
                        step={1}
                        value={marginY}
                        onChange={(event) => setMarginY(Number(event.target.value))}
                        className="w-full accent-accent"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {(progress > 0 || processing) && (
              <div className="glass rounded-2xl p-4">
                <ProgressBar progress={progress} label={processing ? copy.processing : undefined} />
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              {!resultBlob ? (
                <button
                  type="button"
                  onClick={handleAddPageNumbers}
                  disabled={processing}
                  className={`inline-flex items-center rounded-2xl px-6 py-3 text-sm font-semibold text-white transition-all ${
                    processing
                      ? "cursor-not-allowed bg-bg-secondary text-t-secondary"
                      : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg hover:shadow-indigo-500/25"
                  }`}
                >
                  {processing ? copy.processing : copy.process}
                </button>
              ) : (
                <>
                  <DownloadButton
                    blob={resultBlob}
                    filename={`numbered_${file.name}`}
                  />
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                    {copy.resultTitle}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </ToolLayout>
  );
}
