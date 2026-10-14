"use client";

import ToolLayout from "@/components/ToolLayout";
import OfficeToPdfTool from "@/components/office/OfficeToPdfTool";
import { useI18n } from "@/lib/i18n";

export default function HtmlToPdfPage() {
  const { t } = useI18n();
  return (
    <ToolLayout toolName={t("tool.html-to-pdf.name")} toolDescription={t("tool.html-to-pdf.desc")} showTrustPanel={false}>
      <OfficeToPdfTool kind="html" />
    </ToolLayout>
  );
}
