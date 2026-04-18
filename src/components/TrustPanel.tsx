"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

/**
 * Compact “verify privacy locally” panel shown on tool pages.
 */
export default function TrustPanel() {
  const { t } = useI18n();

  return (
    <aside className="mb-8 rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex flex-wrap items-start gap-3">
        <div
          className="shrink-0 w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-500"
          aria-hidden
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-[13px] font-semibold text-t-primary leading-snug">
            {t("trust.panelTitle")}
          </h2>
          <p className="text-[12px] text-t-secondary leading-relaxed">{t("trust.panelLead")}</p>
          <ul className="text-[11px] text-t-secondary space-y-1.5 list-disc ps-4 marker:text-emerald-500/80">
            <li>{t("trust.bullet1")}</li>
            <li>{t("trust.bullet2")}</li>
            <li>{t("trust.bullet3")}</li>
            <li>{t("trust.bulletNetwork")}</li>
            <li>{t("trust.bulletPwa")}</li>
          </ul>
          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-[11px]">
            <Link href="/privacy" className="text-accent hover:text-accent-hover underline-offset-2 hover:underline">
              {t("trust.linkPrivacy")}
            </Link>
            <Link href="/workflows" className="text-accent hover:text-accent-hover underline-offset-2 hover:underline">
              {t("trust.linkWorkflows")}
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
