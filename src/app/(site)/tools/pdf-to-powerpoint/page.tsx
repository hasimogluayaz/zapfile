"use client";

import ToolLayout from "@/components/ToolLayout";
import PdfConvertTool from "@/components/pdf-convert/PdfConvertTool";
import { useI18n } from "@/lib/i18n";

export default function PdfToPowerPointPage() {
  const { t } = useI18n();
  return (
    <ToolLayout toolName={t("tool.pdf-to-powerpoint.name")} toolDescription={t("tool.pdf-to-powerpoint.desc")}>
      <PdfConvertTool kind="pptx" />
    </ToolLayout>
  );
}
