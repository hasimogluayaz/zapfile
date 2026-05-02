"use client";

import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";
import { rgb } from "pdf-lib";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import { formatFileSize } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface ImageItem {
  file: File;
  preview: string;
  id: string;
  width: number;
  height: number;
}

type PageSize = "a4" | "letter" | "square" | "fit";
type Orientation = "auto" | "portrait" | "landscape";
type FitMode = "contain" | "cover" | "stretch";

const PAGE_SIZES = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
  square: { width: 720, height: 720 },
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "").padEnd(6, "0").slice(0, 6);
  return rgb(
    Number.parseInt(normalized.slice(0, 2), 16) / 255,
    Number.parseInt(normalized.slice(2, 4), 16) / 255,
    Number.parseInt(normalized.slice(4, 6), 16) / 255,
  );
}

function resolvePageSize(item: ImageItem, pageSize: PageSize, orientation: Orientation) {
  if (pageSize === "fit") {
    return { width: item.width, height: item.height };
  }

  const base = PAGE_SIZES[pageSize];
  const shouldLandscape =
    orientation === "landscape" ||
    (orientation === "auto" && item.width > item.height);

  return shouldLandscape
    ? { width: Math.max(base.width, base.height), height: Math.min(base.width, base.height) }
    : { width: Math.min(base.width, base.height), height: Math.max(base.width, base.height) };
}

function resolveImagePlacement(
  imgWidth: number,
  imgHeight: number,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  fitMode: FitMode,
) {
  const maxW = Math.max(1, pageWidth - margin * 2);
  const maxH = Math.max(1, pageHeight - margin * 2);

  if (fitMode === "stretch") {
    return { x: margin, y: margin, width: maxW, height: maxH };
  }

  const containScale = Math.min(maxW / imgWidth, maxH / imgHeight);
  const coverScale = Math.max(maxW / imgWidth, maxH / imgHeight);
  const scale = fitMode === "cover" ? coverScale : containScale;
  const width = imgWidth * scale;
  const height = imgHeight * scale;

  return {
    x: (pageWidth - width) / 2,
    y: (pageHeight - height) / 2,
    width,
    height,
  };
}

async function loadImageMeta(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = url;
    });
    return {
      preview: url,
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

export default function ImageToPdfPage() {
  const { locale, t } = useI18n();
  const copy = locale === "tr"
    ? {
        dropLabel: "PDF'e dönüştürmek istediğiniz görselleri bırakın",
        settings: "PDF ayarları",
        layout: "Yerleşim",
        pageSize: "Sayfa boyutu",
        orientation: "Yön",
        fitMode: "Görsel yerleşimi",
        margin: "Kenar boşluğu",
        background: "Arka plan",
        outputName: "Çıktı adı",
        selected: "Seçilen görseller",
        contain: "Sığdır",
        cover: "Doldur",
        stretch: "Esnet",
        auto: "Otomatik",
        portrait: "Dikey",
        landscape: "Yatay",
        create: "PDF oluştur",
        creating: "PDF hazırlanıyor...",
        success: "{count} görsel PDF'e dönüştürüldü.",
        fail: "PDF oluşturulamadı.",
        download: "PDF indir",
        newBatch: "Yeni görseller",
        clearAll: "Temizle",
        moveUp: "Yukarı taşı",
        moveDown: "Aşağı taşı",
      }
    : {
        dropLabel: "Drop images to build a PDF",
        settings: "PDF settings",
        layout: "Layout",
        pageSize: "Page size",
        orientation: "Orientation",
        fitMode: "Image fit",
        margin: "Margin",
        background: "Background",
        outputName: "Output name",
        selected: "Selected images",
        contain: "Contain",
        cover: "Cover",
        stretch: "Stretch",
        auto: "Auto",
        portrait: "Portrait",
        landscape: "Landscape",
        create: "Create PDF",
        creating: "Creating PDF...",
        success: "{count} images converted to PDF.",
        fail: "Failed to create PDF.",
        download: "Download PDF",
        newBatch: "New images",
        clearAll: "Clear all",
        moveUp: "Move up",
        moveDown: "Move down",
      };

  const [images, setImages] = useState<ImageItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [pageSize, setPageSize] = useState<PageSize>("a4");
  const [orientation, setOrientation] = useState<Orientation>("auto");
  const [fitMode, setFitMode] = useState<FitMode>("contain");
  const [margin, setMargin] = useState(24);
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [outputName, setOutputName] = useState("images.pdf");
  const dragFromIndex = useRef<number | null>(null);

  const handleFilesSelected = useCallback(
    async (files: File[]) => {
      const imageFiles = files.filter((file) => file.type.startsWith("image/"));
      if (imageFiles.length === 0) return;

      try {
        const loaded = await Promise.all(
          imageFiles.map(async (file) => {
            const meta = await loadImageMeta(file);
            return {
              file,
              id: makeId(),
              preview: meta.preview,
              width: meta.width,
              height: meta.height,
            };
          }),
        );

        setImages((prev) => [...prev, ...loaded]);
        setResultBlob(null);
        if (images.length === 0 && loaded[0]) {
          setOutputName(`${loaded[0].file.name.replace(/\.[^.]+$/, "")}.pdf`);
        }
      } catch (error) {
        console.error(error);
        toast.error(t("ui.failedLoad"));
      }
    },
    [images.length, t],
  );

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((img) => img.id !== id);
    });
    setResultBlob(null);
  }, []);

  const moveImage = useCallback((id: string, direction: "up" | "down") => {
    setImages((prev) => {
      const idx = prev.findIndex((img) => img.id === id);
      if (idx === -1) return prev;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
    });
    setResultBlob(null);
  }, []);

  const handleDragStart = useCallback((index: number) => {
    dragFromIndex.current = index;
  }, []);

  const handleDrop = useCallback((index: number) => {
    const from = dragFromIndex.current;
    dragFromIndex.current = null;
    if (from === null || from === index) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setResultBlob(null);
  }, []);

  const handleProcess = useCallback(async () => {
    if (images.length === 0) return;
    setProcessing(true);
    setProgress(5);
    setResultBlob(null);

    try {
      const { PDFDocument } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.create();
      const pageFill = hexToRgb(backgroundColor);

      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        const arrayBuffer = await item.file.arrayBuffer();
        const mimeType = item.file.type;

        let embeddedImage;
        if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
          embeddedImage = await pdfDoc.embedJpg(arrayBuffer);
        } else {
          const bitmap = await createImageBitmap(item.file);
          const canvas = document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas unavailable");
          ctx.drawImage(bitmap, 0, 0);
          bitmap.close();
          const pngBlob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Image conversion failed"));
            }, "image/png");
          });
          embeddedImage = await pdfDoc.embedPng(await pngBlob.arrayBuffer());
        }

        const pageBox = resolvePageSize(item, pageSize, orientation);
        const page = pdfDoc.addPage([pageBox.width, pageBox.height]);
        page.drawRectangle({
          x: 0,
          y: 0,
          width: pageBox.width,
          height: pageBox.height,
          color: pageFill,
        });

        const safeMargin = pageSize === "fit" ? 0 : margin;
        const placement = resolveImagePlacement(
          embeddedImage.width,
          embeddedImage.height,
          pageBox.width,
          pageBox.height,
          safeMargin,
          fitMode,
        );
        page.drawImage(embeddedImage, placement);
        setProgress(5 + Math.round(((i + 1) / images.length) * 88));
      }

      const pdfBytes = await pdfDoc.save({ useObjectStreams: true });
      setResultBlob(new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" }));
      setProgress(100);
      toast.success(copy.success.replace("{count}", String(images.length)));
    } catch (error) {
      console.error(error);
      toast.error(copy.fail);
    } finally {
      setProcessing(false);
    }
  }, [
    backgroundColor,
    copy.fail,
    copy.success,
    fitMode,
    images,
    margin,
    orientation,
    pageSize,
  ]);

  const reset = useCallback(() => {
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    setImages([]);
    setProgress(0);
    setResultBlob(null);
  }, [images]);

  return (
    <ToolLayout
      toolName="Image to PDF"
      toolDescription="Convert JPG, PNG, or WebP images to a PDF with layout, margin, and ordering controls."
    >
      <div className="space-y-6">
        <FileDropzone
          onFilesSelected={handleFilesSelected}
          accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp"] }}
          formats={["JPG", "PNG", "WEBP"]}
          multiple
          label={copy.dropLabel}
        />

        {images.length > 0 && (
          <>
            <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
              <div className="glass rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-t-primary">
                    {copy.selected}: {images.length}
                  </p>
                  <button
                    type="button"
                    onClick={reset}
                    className="text-sm font-medium text-t-secondary transition-colors hover:text-red-400"
                  >
                    {copy.clearAll}
                  </button>
                </div>

                <div className="space-y-3 max-h-[34rem] overflow-y-auto pe-1">
                  {images.map((img, idx) => (
                    <div
                      key={img.id}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={() => handleDrop(idx)}
                      className="flex items-center gap-3 rounded-xl border border-border bg-bg-secondary/70 p-3"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.preview}
                        alt={img.file.name}
                        className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-t-primary">{img.file.name}</p>
                        <p className="mt-1 text-xs text-t-secondary">
                          {img.width}x{img.height}px - {formatFileSize(img.file.size)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveImage(img.id, "up")}
                          disabled={idx === 0}
                          className="rounded-lg px-2 py-1.5 text-sm text-t-secondary transition-colors hover:bg-bg-primary hover:text-t-primary disabled:opacity-30"
                          title={copy.moveUp}
                        >
                          ^
                        </button>
                        <button
                          type="button"
                          onClick={() => moveImage(img.id, "down")}
                          disabled={idx === images.length - 1}
                          className="rounded-lg px-2 py-1.5 text-sm text-t-secondary transition-colors hover:bg-bg-primary hover:text-t-primary disabled:opacity-30"
                          title={copy.moveDown}
                        >
                          v
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(img.id)}
                          className="rounded-lg px-2 py-1.5 text-sm text-t-secondary transition-colors hover:bg-red-500/10 hover:text-red-400"
                          title={t("ui.remove")}
                        >
                          x
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass rounded-2xl p-5 space-y-4">
                <p className="text-sm font-semibold text-t-primary">{copy.settings}</p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-t-secondary">
                      {copy.pageSize}
                    </label>
                    <select
                      value={pageSize}
                      onChange={(event) => setPageSize(event.target.value as PageSize)}
                      className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-t-primary focus:border-accent/50 focus:outline-none"
                    >
                      <option value="a4">A4</option>
                      <option value="letter">Letter</option>
                      <option value="square">Square</option>
                      <option value="fit">{t("img2pdf.fitToImage")}</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-t-secondary">
                      {copy.orientation}
                    </label>
                    <select
                      value={orientation}
                      onChange={(event) => setOrientation(event.target.value as Orientation)}
                      className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-t-primary focus:border-accent/50 focus:outline-none"
                    >
                      <option value="auto">{copy.auto}</option>
                      <option value="portrait">{copy.portrait}</option>
                      <option value="landscape">{copy.landscape}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-t-secondary">
                    {copy.fitMode}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      ["contain", copy.contain],
                      ["cover", copy.cover],
                      ["stretch", copy.stretch],
                    ] as const).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFitMode(value)}
                        className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
                          fitMode === value
                            ? "border-accent bg-accent/15 text-t-primary"
                            : "border-border bg-bg-secondary text-t-secondary hover:border-accent/40"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between text-sm text-t-secondary">
                    <label>{copy.margin}</label>
                    <span className="font-mono">{pageSize === "fit" ? 0 : margin}px</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={96}
                    step={4}
                    value={pageSize === "fit" ? 0 : margin}
                    disabled={pageSize === "fit"}
                    onChange={(event) => setMargin(Number(event.target.value))}
                    className="w-full accent-accent disabled:opacity-40"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-t-secondary">
                    {copy.background}
                  </label>
                  <div className="flex items-center gap-3 rounded-xl border border-border bg-bg-secondary px-3 py-2">
                    <input
                      type="color"
                      value={backgroundColor}
                      onChange={(event) => setBackgroundColor(event.target.value)}
                      className="h-9 w-9 rounded-lg border border-border bg-transparent p-0.5"
                    />
                    <span className="text-sm font-mono text-t-secondary">{backgroundColor}</span>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-t-secondary">
                    {copy.outputName}
                  </label>
                  <input
                    type="text"
                    value={outputName}
                    onChange={(event) => setOutputName(event.target.value)}
                    className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2.5 text-sm text-t-primary focus:border-accent/50 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {processing && (
              <div className="glass rounded-2xl p-4">
                <ProgressBar progress={progress} label={copy.creating} />
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {!resultBlob && (
                <button
                  type="button"
                  onClick={() => void handleProcess()}
                  disabled={processing || images.length === 0}
                  className={`rounded-2xl px-6 py-3 text-sm font-semibold text-white transition-all ${
                    processing
                      ? "cursor-not-allowed bg-bg-secondary text-t-secondary"
                      : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg hover:shadow-indigo-500/25"
                  }`}
                >
                  {processing ? copy.creating : copy.create}
                </button>
              )}

              {resultBlob && (
                <>
                  <DownloadButton
                    blob={resultBlob}
                    filename={outputName.toLowerCase().endsWith(".pdf") ? outputName : `${outputName}.pdf`}
                    label={copy.download}
                  />
                  <button
                    type="button"
                    onClick={() => setResultBlob(null)}
                    className="rounded-xl border border-border bg-bg-secondary px-5 py-2.5 text-sm font-semibold text-t-secondary transition-colors hover:text-t-primary"
                  >
                    {copy.newBatch}
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </ToolLayout>
  );
}
