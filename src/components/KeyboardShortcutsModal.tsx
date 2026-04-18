"use client";

import { useEffect, useRef, useMemo } from "react";
import { useI18n } from "@/lib/i18n";

function primaryModifierLabel(): string {
  if (typeof navigator === "undefined") return "Ctrl";
  const ua = navigator.userAgent || "";
  const p = navigator.platform || "";
  if (/Mac|iPhone|iPod|iPad/i.test(p) || ua.includes("Mac OS")) return "⌘";
  return "Ctrl";
}

export default function KeyboardShortcutsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const mod = useMemo(() => primaryModifierLabel(), []);

  if (!open) return null;

  const Row = ({ keys, desc }: { keys: string; desc: string }) => (
    <div className="flex flex-wrap items-baseline justify-between gap-2 py-2 border-b border-border last:border-0">
      <span className="text-[13px] text-t-secondary">{desc}</span>
      <kbd className="shrink-0 px-2 py-1 rounded-lg bg-bg-secondary border border-border font-mono text-[12px] text-t-primary">
        {keys}
      </kbd>
    </div>
  );

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] bg-bg/85 backdrop-blur-sm px-4"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl overflow-hidden animate-fade-in max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-t-primary">
            {t("shortcuts.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-t-secondary hover:text-t-primary hover:bg-bg-secondary"
            aria-label={t("ui.close")}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-3 overflow-y-auto text-sm">
          <p className="text-[12px] text-t-tertiary mb-3">{t("shortcuts.intro")}</p>
          <Row keys={`${mod} + K`} desc={t("shortcuts.search")} />
          <Row keys="?" desc={t("shortcuts.thisHelp")} />
          <Row keys="Esc" desc={t("shortcuts.closeModal")} />
          <p className="text-[11px] font-semibold uppercase tracking-wider text-t-tertiary mt-4 mb-2">
            {t("shortcuts.toolsHint")}
          </p>
          <Row keys="Space / L / R" desc={t("shortcuts.stopwatchHint")} />
          <Row keys="← / →" desc={t("shortcuts.compareHint")} />
        </div>
      </div>
    </div>
  );
}
