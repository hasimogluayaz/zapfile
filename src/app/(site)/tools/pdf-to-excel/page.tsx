"use client";

import ToolLayout from "@/components/ToolLayout";
import PdfConvertTool from "@/components/pdf-convert/PdfConvertTool";
import { useI18n } from "@/lib/i18n";

export default function PdfToExcelPage() {
  const { t } = useI18n();
  return (
    <ToolLayout toolName={t("tool.pdf-to-excel.name")} toolDescription={t("tool.pdf-to-excel.desc")}>
      <PdfConvertTool kind="xlsx" />
    </ToolLayout>
  );
}
