"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Check, Link2, Share } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const iconBtn =
  "flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-t-secondary shadow-sm transition-colors hover:text-t-primary hover:border-t-primary/25 disabled:opacity-50";

export default function ToolShareBar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const currentUrl = () =>
    `${window.location.origin}${pathname}${window.location.search}`;

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${pathname}${window.location.search}`,
      );
      setCopied(true);
      toast.success(t("share.copied"));
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error(t("share.fail"));
    }
  }, [pathname, t]);

  const nativeShare = async () => {
    try {
      await navigator.share({ title: document.title, url: currentUrl() });
    } catch {
      /* user cancelled */
    }
  };

  const shareOnX = () => {
    const text = encodeURIComponent(`${document.title} ${currentUrl()}`);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  if (!pathname?.startsWith("/tools/")) return null;

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={copyLink}
        className={iconBtn}
        aria-label={t("share.copy")}
        title={t("share.copy")}
      >
        {copied ? (
          <Check className="h-4 w-4" aria-hidden="true" />
        ) : (
          <Link2 className="h-4 w-4" aria-hidden="true" />
        )}
      </button>
      {canShare ? (
        <button
          type="button"
          onClick={nativeShare}
          className={iconBtn}
          aria-label={t("share.native")}
          title={t("share.native")}
        >
          <Share className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          onClick={shareOnX}
          className={iconBtn}
          aria-label={t("share.tweet")}
          title={t("share.tweet")}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </button>
      )}
    </div>
  );
}
