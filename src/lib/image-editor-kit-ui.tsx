"use client";

/**
 * Output format + quality picker shared by the image editors, so every tool
 * offers "keep original format / JPG / PNG / WebP" instead of PNG-only.
 */
import { Segmented, Slider, sectionTitle } from "@/components/ui/controls";
import { useI18n } from "@/lib/i18n";
import { resolveFormat, type FormatChoice } from "./image-editor-kit";

const LABEL: Record<string, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
};

export function formatLabel(type: string): string {
  return LABEL[type] ?? "PNG";
}

export function ExportFormatPicker({
  value,
  onChange,
  quality,
  onQualityChange,
  sourceType,
  mixedSources = false,
}: {
  value: FormatChoice;
  onChange: (v: FormatChoice) => void;
  quality: number;
  onQualityChange: (q: number) => void;
  /** MIME type of the (first) source image. */
  sourceType: string;
  /** Batch with several source types: "original" means per-file. */
  mixedSources?: boolean;
}) {
  const { t } = useI18n();
  const resolved = resolveFormat(sourceType, value);
  const lossy = value === "original" && mixedSources ? true : resolved !== "image/png";
  const sourceIsPhoto = sourceType === "image/jpeg";
  const sourceMayHaveAlpha = sourceType === "image/png" || sourceType === "image/webp" || sourceType === "image/gif";
  return (
    <div className="space-y-3">
      <p className={sectionTitle}>{t("imgedit.v2.outputFormat")}</p>
      <Segmented<FormatChoice>
        label={t("imgedit.v2.outputFormat")}
        size="sm"
        value={value}
        onChange={onChange}
        options={[
          {
            value: "original",
            label: mixedSources
              ? t("imgedit.v2.keepFormatMixed")
              : t("imgedit.v2.keepFormat", { format: formatLabel(resolveFormat(sourceType, "original")) }),
          },
          { value: "image/jpeg", label: "JPG" },
          { value: "image/png", label: "PNG" },
          { value: "image/webp", label: "WebP" },
        ]}
      />
      {lossy && (
        <Slider
          label={t("ui.quality")}
          value={Math.round(quality * 100)}
          min={50}
          max={100}
          onChange={(v) => onQualityChange(v / 100)}
          display={`${Math.round(quality * 100)}%`}
        />
      )}
      {resolved === "image/png" && sourceIsPhoto && !mixedSources && (
        <p className="text-[12px] leading-snug text-t-tertiary">{t("imgedit.v2.pngLarge")}</p>
      )}
      {resolved === "image/jpeg" && sourceMayHaveAlpha && !mixedSources && (
        <p className="text-[12px] leading-snug text-t-tertiary">{t("imgedit.v2.jpgNoAlpha")}</p>
      )}
    </div>
  );
}
