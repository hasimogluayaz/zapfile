"use client";

import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { useI18n } from "@/lib/i18n";

export default function ToolShareBar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);

  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}${pathname}${window.location.search}`
      : "";

  const copyLink = useCallback(async () => {
    if (!url) return;
    setBusy(true);
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("share.copied"));
    } catch {
      toast.error(t("share.fail"));
    } finally {
      setBusy(false);
    }
  }, [url, t]);

  const tweet = useCallback(() => {
    const text = encodeURIComponent(
      `ZapFile — free browser-based file tools. ${url}`,
    );
    window.open(
      `https://twitter.com/intent/tweet?text=${text}`,
      "_blank",
      "noopener,noreferrer",
    );
  }, [url]);

  if (!pathname?.startsWith("/tools/")) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <button
        type="button"
        onClick={copyLink}
        disabled={busy}
        className="text-[12px] font-medium px-3 py-1.5 rounded-lg border border-border text-t-secondary hover:bg-bg-secondary transition-colors disabled:opacity-50"
      >
        {t("share.copy")}
      </button>
      <button
        type="button"
        onClick={tweet}
        className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[#1d9bf0]/10 text-[#1d9bf0] border border-[#1d9bf0]/30 hover:bg-[#1d9bf0]/15 transition-colors"
      >
        {t("share.tweet")}
      </button>
    </div>
  );
}
