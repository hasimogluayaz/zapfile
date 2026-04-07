"use client";

import { useState, useRef, useEffect, useId } from "react";
import { useI18n } from "@/lib/i18n";
import {
  SUPPORTED_LOCALES,
  LOCALE_LABELS,
  isRtlLocale,
  type Locale,
} from "@/lib/locales";

const FLAG: Record<Locale, string> = {
  en: "🇬🇧",
  tr: "🇹🇷",
  de: "🇩🇪",
  fr: "🇫🇷",
  es: "🇪🇸",
  pt: "🇧🇷",
  it: "🇮🇹",
  ja: "🇯🇵",
  ar: "🇸🇦",
  he: "🇮🇱",
};

interface LanguageSwitcherProps {
  /** Full width (mobile drawer) */
  fullWidth?: boolean;
}

export default function LanguageSwitcher({ fullWidth }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useI18n();
  const uid = useId();
  const triggerId = `${uid}-lang-trigger`;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`relative ${fullWidth ? "w-full" : ""}`}
    >
      <button
        type="button"
        id={triggerId}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={t("nav.language")}
        className={`flex items-center gap-2 rounded-xl border border-border bg-bg-secondary/90 px-3 py-2 text-left text-[13px] font-medium text-t-primary shadow-sm transition-all hover:border-accent/40 hover:bg-bg-tertiary/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 ${
          fullWidth ? "w-full justify-between" : "min-w-[10rem] max-w-[min(220px,32vw)]"
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-lg leading-none shrink-0" aria-hidden>
            {FLAG[locale]}
          </span>
          <span className="truncate">{LOCALE_LABELS[locale]}</span>
        </span>
        <svg
          className={`w-4 h-4 shrink-0 text-t-tertiary transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-labelledby={triggerId}
          className={`absolute z-[60] mt-1.5 max-h-[min(320px,70vh)] overflow-y-auto rounded-xl border border-border bg-surface py-1.5 shadow-xl ring-1 ring-black/5 dark:ring-white/10 ${
            fullWidth
              ? "start-0 end-0 w-full"
              : "min-w-[220px] ltr:right-0 rtl:left-0"
          }`}
        >
          {SUPPORTED_LOCALES.map((loc) => (
            <li key={loc} role="none">
              <button
                type="button"
                role="option"
                aria-selected={loc === locale}
                onClick={() => {
                  setLocale(loc);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] transition-colors ${
                  loc === locale
                    ? "bg-accent-light text-accent font-semibold"
                    : "text-t-secondary hover:bg-bg-secondary hover:text-t-primary"
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {FLAG[loc]}
                </span>
                <span
                  className="flex-1 truncate"
                  dir={isRtlLocale(loc) ? "rtl" : "ltr"}
                >
                  {LOCALE_LABELS[loc]}
                </span>
                {loc === locale && (
                  <svg
                    className="h-4 w-4 shrink-0 text-accent"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
