"use client";

import { useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import DownloadButton from "@/components/DownloadButton";
import { formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface ExifTag {
  name: string;
  value: string;
}

// Common EXIF tag IDs
const EXIF_TAGS: Record<number, string> = {
  0x010f: "Camera Make",
  0x0110: "Camera Model",
  0x0112: "Orientation",
  0x011a: "X Resolution",
  0x011b: "Y Resolution",
  0x0128: "Resolution Unit",
  0x0131: "Software",
  0x0132: "Date Modified",
  0x8769: "Exif IFD Pointer",
  0x8825: "GPS IFD Pointer",
  // Exif sub-IFD tags
  0x829a: "Exposure Time",
  0x829d: "F-Number",
  0x8827: "ISO Speed",
  0x9000: "Exif Version",
  0x9003: "Date Taken",
  0x9004: "Date Digitized",
  0x920a: "Focal Length",
  0xa001: "Color Space",
  0xa002: "Image Width",
  0xa003: "Image Height",
  0xa405: "Focal Length (35mm)",
  0xa420: "Image Unique ID",
};

const GPS_TAGS: Record<number, string> = {
  0x0001: "GPS Latitude Ref",
  0x0002: "GPS Latitude",
  0x0003: "GPS Longitude Ref",
  0x0004: "GPS Longitude",
  0x0005: "GPS Altitude Ref",
  0x0006: "GPS Altitude",
};

function readUint16(view: DataView, offset: number, littleEndian: boolean): number {
  return view.getUint16(offset, littleEndian);
}

function readUint32(view: DataView, offset: number, littleEndian: boolean): number {
  return view.getUint32(offset, littleEndian);
}

function readTagValue(
  view: DataView,
  format: number,
  count: number,
  valueOffset: number,
  tiffStart: number,
  littleEndian: boolean
): string {
  switch (format) {
    case 1: // BYTE
      return view.getUint8(valueOffset).toString();
    case 2: { // ASCII
      const bytes: number[] = [];
      const actualOffset = count > 4 ? tiffStart + readUint32(view, valueOffset, littleEndian) : valueOffset;
      for (let i = 0; i < count - 1; i++) {
        const b = view.getUint8(actualOffset + i);
        if (b === 0) break;
        bytes.push(b);
      }
      return String.fromCharCode(...bytes);
    }
    case 3: // SHORT
      return readUint16(view, valueOffset, littleEndian).toString();
    case 4: // LONG
      return readUint32(view, valueOffset, littleEndian).toString();
    case 5: { // RATIONAL
      const actualOff = tiffStart + readUint32(view, valueOffset, littleEndian);
      const num = readUint32(view, actualOff, littleEndian);
      const den = readUint32(view, actualOff + 4, littleEndian);
      if (den === 0) return "0";
      if (den === 1) return num.toString();
      // For common ratios, show as fraction or decimal
      const val = num / den;
      if (val < 1) return `1/${Math.round(den / num)}`;
      return parseFloat(val.toFixed(2)).toString();
    }
    case 7: // UNDEFINED
      return `(${count} bytes)`;
    case 10: { // SRATIONAL
      const off = tiffStart + readUint32(view, valueOffset, littleEndian);
      const snum = view.getInt32(off, littleEndian);
      const sden = view.getInt32(off + 4, littleEndian);
      if (sden === 0) return "0";
      return parseFloat((snum / sden).toFixed(2)).toString();
    }
    default:
      return `(format ${format})`;
  }
}

function parseGPSCoordinate(
  view: DataView,
  valueOffset: number,
  tiffStart: number,
  littleEndian: boolean,
  count: number
): string {
  if (count !== 3) return "";
  const off = tiffStart + readUint32(view, valueOffset, littleEndian);
  const degNum = readUint32(view, off, littleEndian);
  const degDen = readUint32(view, off + 4, littleEndian);
  const minNum = readUint32(view, off + 8, littleEndian);
  const minDen = readUint32(view, off + 12, littleEndian);
  const secNum = readUint32(view, off + 16, littleEndian);
  const secDen = readUint32(view, off + 20, littleEndian);
  const deg = degDen ? degNum / degDen : 0;
  const min = minDen ? minNum / minDen : 0;
  const sec = secDen ? secNum / secDen : 0;
  return `${deg}\u00B0 ${min}\u2032 ${sec.toFixed(2)}\u2033`;
}

function readIFD(
  view: DataView,
  ifdOffset: number,
  tiffStart: number,
  littleEndian: boolean,
  tagMap: Record<number, string>
): { tags: ExifTag[]; subIfdOffset: number | null; gpsIfdOffset: number | null } {
  const tags: ExifTag[] = [];
  let subIfdOffset: number | null = null;
  let gpsIfdOffset: number | null = null;

  const entryCount = readUint16(view, ifdOffset, littleEndian);

  for (let i = 0; i < entryCount; i++) {
    const entryStart = ifdOffset + 2 + i * 12;
    if (entryStart + 12 > view.byteLength) break;

    const tag = readUint16(view, entryStart, littleEndian);
    const format = readUint16(view, entryStart + 2, littleEndian);
    const count = readUint32(view, entryStart + 4, littleEndian);
    const valueOffset = entryStart + 8;

    if (tag === 0x8769) {
      subIfdOffset = tiffStart + readUint32(view, valueOffset, littleEndian);
      continue;
    }
    if (tag === 0x8825) {
      gpsIfdOffset = tiffStart + readUint32(view, valueOffset, littleEndian);
      continue;
    }

    const name = tagMap[tag];
    if (!name) continue;

    try {
      const value = readTagValue(view, format, count, valueOffset, tiffStart, littleEndian);
      if (value && !value.startsWith("(")) {
        tags.push({ name, value });
      }
    } catch {
      // Skip tags we can't parse
    }
  }

  return { tags, subIfdOffset, gpsIfdOffset };
}

function parseExif(buffer: ArrayBuffer): ExifTag[] {
  const view = new DataView(buffer);
  const tags: ExifTag[] = [];

  // Find SOI marker
  if (view.getUint8(0) !== 0xff || view.getUint8(1) !== 0xd8) {
    return tags; // Not JPEG
  }

  // Search for APP1 marker (EXIF)
  let offset = 2;
  while (offset < view.byteLength - 4) {
    if (view.getUint8(offset) !== 0xff) {
      offset++;
      continue;
    }

    const marker = view.getUint8(offset + 1);
    if (marker === 0xe1) {
      // APP1 - EXIF data
      const segLen = view.getUint16(offset + 2);

      // Check for "Exif\0\0"
      const exifHeader =
        view.getUint8(offset + 4) === 0x45 &&
        view.getUint8(offset + 5) === 0x78 &&
        view.getUint8(offset + 6) === 0x69 &&
        view.getUint8(offset + 7) === 0x66 &&
        view.getUint8(offset + 8) === 0x00 &&
        view.getUint8(offset + 9) === 0x00;

      if (!exifHeader) {
        offset += 2 + segLen;
        continue;
      }

      const tiffStart = offset + 10;
      const byteOrder = view.getUint16(tiffStart);
      const littleEndian = byteOrder === 0x4949; // "II" = Intel = little-endian

      // Verify TIFF magic 42
      if (readUint16(view, tiffStart + 2, littleEndian) !== 42) {
        break;
      }

      const ifd0Offset = tiffStart + readUint32(view, tiffStart + 4, littleEndian);
      const result = readIFD(view, ifd0Offset, tiffStart, littleEndian, EXIF_TAGS);
      tags.push(...result.tags);

      // Read Exif sub-IFD
      if (result.subIfdOffset !== null && result.subIfdOffset < view.byteLength) {
        const subResult = readIFD(view, result.subIfdOffset, tiffStart, littleEndian, EXIF_TAGS);
        tags.push(...subResult.tags);
      }

      // Read GPS IFD
      if (result.gpsIfdOffset !== null && result.gpsIfdOffset < view.byteLength) {
        const gpsEntryCount = readUint16(view, result.gpsIfdOffset, littleEndian);
        for (let i = 0; i < gpsEntryCount; i++) {
          const entryStart = result.gpsIfdOffset + 2 + i * 12;
          if (entryStart + 12 > view.byteLength) break;

          const gpsTag = readUint16(view, entryStart, littleEndian);
          const gpsFormat = readUint16(view, entryStart + 2, littleEndian);
          const gpsCount = readUint32(view, entryStart + 4, littleEndian);
          const gpsValueOffset = entryStart + 8;

          const gpsName = GPS_TAGS[gpsTag];
          if (!gpsName) continue;

          try {
            if (gpsTag === 0x0002 || gpsTag === 0x0004) {
              // GPS coordinates (rational x3)
              const coord = parseGPSCoordinate(view, gpsValueOffset, tiffStart, littleEndian, gpsCount);
              if (coord) tags.push({ name: gpsName, value: coord });
            } else {
              const val = readTagValue(view, gpsFormat, gpsCount, gpsValueOffset, tiffStart, littleEndian);
              if (val && !val.startsWith("(")) {
                tags.push({ name: gpsName, value: val });
              }
            }
          } catch {
            // Skip unparseable GPS tags
          }
        }
      }

      break; // Found EXIF, stop searching
    } else if (marker >= 0xe0 && marker <= 0xef) {
      // Other APP markers
      const segLen = view.getUint16(offset + 2);
      offset += 2 + segLen;
    } else if (marker === 0xda) {
      break; // Start of scan, no more metadata
    } else {
      if (offset + 3 < view.byteLength) {
        const segLen = view.getUint16(offset + 2);
        offset += 2 + segLen;
      } else {
        break;
      }
    }
  }

  return tags;
}

export default function ExifViewerPage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [exifTags, setExifTags] = useState<ExifTag[]>([]);
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number } | null>(null);
  const [isJpeg, setIsJpeg] = useState(false);
  const [cleanedBlob, setCleanedBlob] = useState<Blob | null>(null);
  const [processing, setProcessing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleFilesSelected = useCallback((files: File[]) => {
    const f = files[0];
    setFile(f);
    setCleanedBlob(null);
    setExifTags([]);

    const isJpg =
      f.type === "image/jpeg" ||
      f.name.toLowerCase().endsWith(".jpg") ||
      f.name.toLowerCase().endsWith(".jpeg");
    setIsJpeg(isJpg);

    // Read file for EXIF parsing
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result as ArrayBuffer;
      if (isJpg) {
        const tags = parseExif(buffer);
        setExifTags(tags);
        if (tags.length === 0) {
          toast(t("exif.noExif"), { icon: "\u2139\uFE0F" });
        }
      }
    };
    reader.readAsArrayBuffer(f);

    // Load image for preview and dimensions
    const img = new window.Image();
    img.onload = () => {
      setImageInfo({ width: img.naturalWidth, height: img.naturalHeight });
      setPreview(URL.createObjectURL(f));
    };
    img.onerror = () => toast.error(t("ui.failedLoad"));
    img.src = URL.createObjectURL(f);
  }, []);

  const handleRemoveExif = useCallback(() => {
    if (!file) return;
    setProcessing(true);

    const img = new window.Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        setProcessing(false);
        return;
      }
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setProcessing(false);
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          setProcessing(false);
          if (blob) {
            setCleanedBlob(blob);
            toast.success(t("exif.removed"));
          } else {
            toast.error(t("exif.processFail"));
          }
        },
        "image/png"
      );
    };
    img.onerror = () => {
      setProcessing(false);
      toast.error(t("ui.failedLoad"));
    };
    img.src = URL.createObjectURL(file);
  }, [file]);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setExifTags([]);
    setImageInfo(null);
    setIsJpeg(false);
    setCleanedBlob(null);
  };

  return (
    <ToolLayout
      toolName="EXIF Viewer"
      toolDescription="View and remove image metadata (EXIF data)"
    >
      <canvas ref={canvasRef} className="hidden" />

      <div className="space-y-6">
        {!file ? (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{
              "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff"],
            }}
            formats={["JPG", "JPEG", "PNG", "WEBP"]}
            label={t("exif.dropText")}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              {/* Left: Image preview */}
              <div className="glass rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-medium text-brand-muted">
                    {t("exif.imagePreview")}
                  </p>
                  <button
                    onClick={reset}
                    className="text-[11px] text-brand-muted hover:text-red-400 transition-colors"
                  >
                    {t("ui.remove")}
                  </button>
                </div>
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full rounded-lg border border-white/10 object-contain max-h-72"
                  />
                ) : (
                  <div className="h-40 flex items-center justify-center rounded-lg border border-white/10 text-[12px] text-brand-muted">
                    Loading...
                  </div>
                )}
                <p className="text-[11px] text-brand-muted truncate">
                  {file.name} &middot; {formatFileSize(file.size)}
                </p>
              </div>

              {/* Right: Basic info */}
              <div className="glass rounded-xl p-4 space-y-4">
                <h3 className="text-[13px] font-semibold text-brand-text">
                  {t("exif.fileInfo")}
                </h3>
                <div className="space-y-2 text-[12px]">
                  <div className="flex justify-between">
                    <span className="text-brand-muted">{t("exif.fileName")}</span>
                    <span className="text-brand-text truncate ml-2 max-w-[160px]">
                      {file.name}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-muted">{t("exif.fileSize")}</span>
                    <span className="text-brand-text">{formatFileSize(file.size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-brand-muted">{t("exif.fileType")}</span>
                    <span className="text-brand-text">{file.type || "Unknown"}</span>
                  </div>
                  {imageInfo && (
                    <div className="flex justify-between">
                      <span className="text-brand-muted">{t("exif.dimensions")}</span>
                      <span className="text-brand-text">
                        {imageInfo.width} x {imageInfo.height}
                      </span>
                    </div>
                  )}
                </div>

                {/* Remove EXIF + Download */}
                <div className="space-y-2 pt-2">
                  {isJpeg && exifTags.length > 0 && (
                    <button
                      onClick={handleRemoveExif}
                      disabled={processing}
                      className={`w-full py-3 rounded-xl font-semibold text-[14px] text-white transition-all ${
                        processing
                          ? "bg-white/10 cursor-not-allowed text-brand-muted"
                          : "bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg hover:shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98]"
                      }`}
                    >
                      {processing ? t("exif.removingExif") : t("exif.removeExif")}
                    </button>
                  )}

                  {cleanedBlob && (
                    <div className="flex justify-center">
                      <DownloadButton
                        blob={cleanedBlob}
                        filename={`${getFileNameWithoutExtension(file.name)}-no-exif.png`}
                        label={t("exif.downloadCleaned")}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* EXIF Data Table */}
            {isJpeg && exifTags.length > 0 && (
              <div className="glass rounded-xl p-4 space-y-3">
                <h3 className="text-[13px] font-semibold text-brand-text">
                  {t("exif.metadata")} ({exifTags.length} {t("exif.tags")})
                </h3>
                <div className="overflow-hidden rounded-lg border border-white/10">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="bg-white/5">
                        <th className="text-left px-3 py-2 text-brand-muted font-medium">
                          {t("exif.tag")}
                        </th>
                        <th className="text-left px-3 py-2 text-brand-muted font-medium">
                          {t("ui.value")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {exifTags.map((tag, i) => (
                        <tr
                          key={i}
                          className="border-t border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="px-3 py-2 text-brand-muted whitespace-nowrap">
                            {tag.name}
                          </td>
                          <td className="px-3 py-2 text-brand-text break-all">
                            {tag.value}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* No EXIF info */}
            {isJpeg && exifTags.length === 0 && (
              <div className="glass rounded-xl p-6 text-center">
                <p className="text-[13px] text-brand-muted">
                  {t("exif.noExif")}
                </p>
              </div>
            )}

            {!isJpeg && (
              <div className="glass rounded-xl p-6 text-center">
                <p className="text-[13px] text-brand-muted">
                  {t("exif.jpegOnly")}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </ToolLayout>
  );
}
