"use client";

import ToolLayout from "@/components/ToolLayout";
import OfficeToPdfTool from "@/components/office/OfficeToPdfTool";
import { useI18n } from "@/lib/i18n";

export default function WordToPdfPage() {
  const { t } = useI18n();
  return (
    <ToolLayout toolName={t("tool.word-to-pdf.name")} toolDescription={t("tool.word-to-pdf.desc")} showTrustPanel={false}>
      <OfficeToPdfTool kind="word" />
    </ToolLayout>
  );
}
