"use client";

import { useI18n } from "@/lib/i18n";

export default function SkipToContent() {
  const { t } = useI18n();
  return (
    <a href="#main-content" className="skip-link">
      {t("a11y.skipToContent")}
    </a>
  );
}
