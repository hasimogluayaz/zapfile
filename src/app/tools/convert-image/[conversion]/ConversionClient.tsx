"use client";

import type { ConversionDef } from "@/lib/conversions";
import type { OutputFormat } from "@/lib/image-engine";
import { useI18n } from "@/lib/i18n";
import ConvertImageTool from "../ConvertImageTool";

const TARGETS: Record<string, OutputFormat> = {
  png: "image/png",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  webp: "image/webp",
};

/** Landing-page converter: the shared tool with the target format fixed. */
export default function ConversionClient({ conversion }: { conversion: ConversionDef }) {
  const { t } = useI18n();
  return (
    <ConvertImageTool
      target={TARGETS[conversion.outputFormat ?? ""] ?? (conversion.toMime as OutputFormat)}
      accept={conversion.acceptMap}
      formats={[conversion.fromLabel]}
      dropLabel={t("convroute.dropHint", { from: conversion.fromLabel })}
      stacked
    />
  );
}
