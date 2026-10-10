"use client";

import { useState, useRef, useEffect, useId } from "react";
import { useI18n } from "@/lib/i18n";
import { SUPPORTED_LOCALES, LOCALE_LABELS, isRtlLocale } from "@/lib/locales";
import { Check, ChevronDown, Globe } from "lucide-react";

interface LanguageSwitcherProps {
  /** Full width (mobile drawer) */
  fullWidth?: boolean;
  /** Icon + language code only (desktop header) */
  compact?: boolean;
}

export default function LanguageSwitcher({ fullWidth, compact }: LanguageSwitcherProps) {
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
        aria-label={`${t("nav.language")}: ${LOCALE_LABELS[locale]}`}
        className={
          compact
            ? "flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] font-semibold uppercase text-t-secondary transition-colors hover:bg-bg-secondary hover:text-t-primary"
            : `flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-3 text-start text-[15px] font-medium text-t-primary transition-colors hover:bg-surface-hover ${
                fullWidth ? "w-full" : ""
              }`
        }
      >
        <Globe className={compact ? "h-[17px] w-[17px]" : "h-[18px] w-[18px] text-t-tertiary"} aria-hidden="true" />
        {compact ? (
          <span>{locale}</span>
        ) : (
          <>
            <span
              className="min-w-0 flex-1 truncate"
              dir={isRtlLocale(locale) ? "rtl" : "ltr"}
            >
              {LOCALE_LABELS[locale]}
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-t-tertiary transition-transform ${open ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </>
        )}
      </button>

      {open && (
        <ul
          role="listbox"
          aria-labelledby={triggerId}
          className={`absolute z-[60] mt-2 max-h-[min(360px,70vh)] overflow-y-auto rounded-2xl border border-border bg-surface p-1.5 shadow-float animate-pop-in ${
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
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start text-[13.5px] transition-colors ${
                  loc === locale
                    ? "font-semibold text-t-primary"
                    : "text-t-secondary hover:bg-bg-secondary hover:text-t-primary"
                }`}
              >
                <span
                  className="flex-1 truncate"
                  dir={isRtlLocale(loc) ? "rtl" : "ltr"}
                >
                  {LOCALE_LABELS[loc]}
                </span>
                {loc === locale && (
                  <Check className="h-4 w-4 shrink-0 text-t-primary" aria-hidden="true" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
