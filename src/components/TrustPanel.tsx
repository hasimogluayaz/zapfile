"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

/**
 * "Verify privacy locally" details, shown inside the tool page's
 * collapsible privacy section (which provides the title).
 */
export default function TrustPanel() {
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      <p className="text-[14px] leading-relaxed text-t-secondary">{t("trust.panelLead")}</p>
      <ul className="space-y-2 ps-4 text-[13.5px] leading-relaxed text-t-secondary marker:text-t-tertiary list-disc">
        <li>{t("trust.bullet1")}</li>
        <li>{t("trust.bullet2")}</li>
        <li>{t("trust.bullet3")}</li>
        <li>{t("trust.bulletNetwork")}</li>
        <li>{t("trust.bulletPwa")}</li>
      </ul>
      <div className="flex flex-wrap gap-x-5 gap-y-1 pt-1 text-[13px] font-medium">
        <Link
          href="/privacy"
          className="text-t-primary underline decoration-volt decoration-2 underline-offset-4"
        >
          {t("trust.linkPrivacy")}
        </Link>
        <Link
          href="/workflows"
          className="text-t-primary underline decoration-volt decoration-2 underline-offset-4"
        >
          {t("trust.linkWorkflows")}
        </Link>
      </div>
    </div>
  );
}
