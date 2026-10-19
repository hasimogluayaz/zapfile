"use client";

import ToolLayout from "@/components/ToolLayout";
import OfficeToPdfTool from "@/components/office/OfficeToPdfTool";
import { useI18n } from "@/lib/i18n";

export default function PowerPointToPdfPage() {
  const { t } = useI18n();
  return (
    <ToolLayout toolName={t("tool.powerpoint-to-pdf.name")} toolDescription={t("tool.powerpoint-to-pdf.desc")} showTrustPanel={false}>
      <OfficeToPdfTool kind="powerpoint" />
    </ToolLayout>
  );
}
