"use client";

import ToolLayout from "@/components/ToolLayout";
import OfficeToPdfTool from "@/components/office/OfficeToPdfTool";
import { useI18n } from "@/lib/i18n";

export default function ExcelToPdfPage() {
  const { t } = useI18n();
  return (
    <ToolLayout toolName={t("tool.excel-to-pdf.name")} toolDescription={t("tool.excel-to-pdf.desc")} showTrustPanel={false}>
      <OfficeToPdfTool kind="excel" />
    </ToolLayout>
  );
}
