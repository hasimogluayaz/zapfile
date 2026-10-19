"use client";

/// <reference types="react/canary" />
import {
  use,
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
import { usePathname } from "next/navigation";
import type { Locale } from "./locales";
import { SUPPORTED_LOCALES, isRtlLocale } from "./locales";
import { LOCALE_COOKIE, LOCALE_PREF_COOKIE } from "./locale-cookies";
import { loadMessages, type Messages } from "./i18n-dicts/load";
import { blogHref as buildBlogHref, homeHref as buildHomeHref, pathForLocale, toolHref as buildToolHref, urlLocaleFromPathname } from "./localized-routes";

export type { Locale } from "./locales";

// Dictionaries live in `i18n-dicts/` (one module per language). Each loads as
// its own chunk: cached by the browser once, and never part of a page's HTML
// or RSC payload (prefetching 30 links would otherwise fetch it 30 times).
const requested: Partial<Record<Locale, Promise<Messages>>> = {};
function messagesOf(locale: Locale): Promise<Messages> {
  return (requested[locale] ??= loadMessages(locale)
    .catch(() => loadMessages(locale))
    .catch(() => {
      delete requested[locale];
      return {};
    }));
}

// ─── Context ────────────────────────────────────────────────────
interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Link to a tool in the current language (`/tr/pdf-birlestir` or `/tools/merge-pdf`). */
  toolHref: (slug: string) => string;
  /** Blog index (no slug) or post in the current language (`/tr/blog/...` or `/blog/...`). */
  blogHref: (slug?: string) => string;
  /** Home page in the current language (`/tr` or `/`). */
  homeHref: () => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
  toolHref: (slug) => `/tools/${slug}`,
  blogHref: (slug) => (slug ? `/blog/${slug}` : "/blog"),
  homeHref: () => "/",
});

function readCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}=([^;]*)`),
  );
  if (!m) return null;
  return decodeURIComponent(m[1]!.trim());
}

function readCookieLocale(): Locale | null {
  const v = readCookieValue(LOCALE_COOKIE);
  if (!v) return null;
  return SUPPORTED_LOCALES.includes(v as Locale) ? (v as Locale) : null;
}

function setLocalePrefCookie(locale: Locale): void {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 365;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${LOCALE_PREF_COOKIE}=${locale}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

/** When Vercel/geo omits country, infer locale from system timezone (e.g. Turkey → tr). */
const ARABIC_PRIMARY_TIMEZONES = new Set([
  "Asia/Riyadh",
  "Asia/Dubai",
  "Asia/Kuwait",
  "Asia/Bahrain",
  "Asia/Qatar",
  "Asia/Baghdad",
  "Asia/Aden",
  "Asia/Muscat",
  "Asia/Amman",
  "Asia/Beirut",
  "Asia/Damascus",
  "Africa/Cairo",
  "Africa/Khartoum",
  "Africa/Tripoli",
  "Africa/Tunis",
  "Africa/Algiers",
  "Africa/Casablanca",
]);

function localeFromTimeZone(): Locale | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return null;
    if (tz === "Europe/Istanbul") return "tr";
    if (tz === "Asia/Tokyo") return "ja";
    if (ARABIC_PRIMARY_TIMEZONES.has(tz)) return "ar";
  } catch {
    return null;
  }
  return null;
}

const BROWSER_LANG_PREFIXES: [string, Locale][] = [
  ["tr", "tr"],
  ["de", "de"],
  ["fr", "fr"],
  ["es", "es"],
  ["pt", "pt"],
  ["it", "it"],
  ["ja", "ja"],
];

function localeFromBrowserLang(): Locale | null {
  if (typeof navigator === "undefined") return null;
  const list = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  for (const raw of list) {
    const browserLang = raw.toLowerCase();
    if (browserLang === "ar" || browserLang.startsWith("ar-")) return "ar";
    for (const [prefix, loc] of BROWSER_LANG_PREFIXES) {
      if (browserLang.startsWith(prefix)) return loc;
    }
  }
  return null;
}

function stripLangSearchParamIfStale(chosen: Locale): void {
  const params = new URLSearchParams(window.location.search);
  const urlLang = params.get("lang");
  if (urlLang && urlLang !== chosen) {
    const url = new URL(window.location.href);
    url.searchParams.delete("lang");
    window.history.replaceState({}, "", url);
  }
}

export function I18nProvider({
  children,
  initialLocale = "en",
  pageLocale,
}: {
  children: React.ReactNode;
  /** From server cookie — aligns first paint with middleware locale. */
  initialLocale?: Locale;
  /** The language the page is prerendered in. */
  pageLocale: Locale;
}) {
  // Suspends until the page's strings are there: on the server while
  // prerendering, in the browser until the chunk arrives (before hydration).
  const pageMessages = use(messagesOf(pageLocale));
  const bootLocale =
    initialLocale && SUPPORTED_LOCALES.includes(initialLocale) ? initialLocale : "en";
  const [preferredLocale, setLocaleState] = useState<Locale>(bootLocale);
  // A localized URL (`/tr/pdf-birlestir`) fixes the language, on the server
  // render too, so search engines see that page in its own language.
  const pathname = usePathname();
  const wanted: Locale = urlLocaleFromPathname(pathname) ?? preferredLocale;

  // Other languages are downloaded when first needed; until then the page
  // stays in the language it has.
  const [loaded, setLoaded] = useState<Partial<Record<Locale, Messages>>>(() => ({
    [pageLocale]: pageMessages,
  }));
  const [shownLocale, setShownLocale] = useState<Locale>(pageLocale);
  useEffect(() => {
    if (loaded[wanted]) {
      setShownLocale(wanted);
      return;
    }
    let cancelled = false;
    messagesOf(wanted)
      .then((messages) => {
        if (cancelled) return;
        setLoaded((prev) => ({ ...prev, [wanted]: messages }));
        setShownLocale(wanted);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [wanted, loaded]);
  const locale = loaded[wanted] ? wanted : shownLocale;
  const messages = loaded[locale] ?? pageMessages;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlLang = params.get("lang");
    const saved = localStorage.getItem("zapfile-locale") as Locale | null;
    const savedExplicit = localStorage.getItem("zapfile-locale-explicit") === "true";

    let resolved: Locale = bootLocale;

    if (saved && savedExplicit && SUPPORTED_LOCALES.includes(saved)) {
      resolved = saved;
    } else {
      const cookieLoc = readCookieLocale();
      if (cookieLoc && cookieLoc !== "en") {
        resolved = cookieLoc;
        stripLangSearchParamIfStale(cookieLoc);
      } else {
        const fromTz = localeFromTimeZone();
        if (fromTz) {
          resolved = fromTz;
          stripLangSearchParamIfStale(fromTz);
        } else {
          const fromBrowser = localeFromBrowserLang();
          if (fromBrowser) {
            resolved = fromBrowser;
            stripLangSearchParamIfStale(fromBrowser);
          } else if (urlLang && SUPPORTED_LOCALES.includes(urlLang as Locale)) {
            resolved = urlLang as Locale;
          } else if (cookieLoc) {
            resolved = cookieLoc;
          }
        }
      }
    }

    setLocaleState(resolved);
  }, [bootLocale]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtlLocale(locale) ? "rtl" : "ltr";
  }, [locale]);

  const setLocale = useCallback((newLocale: Locale) => {
    if (!SUPPORTED_LOCALES.includes(newLocale)) return;
    setLocaleState(newLocale);
    localStorage.setItem("zapfile-locale", newLocale);
    localStorage.setItem("zapfile-locale-explicit", "true");
    setLocalePrefCookie(newLocale);
    if (typeof window !== "undefined") {
      // Tool and blog pages have their own URL per language: go there.
      const target = pathForLocale(window.location.pathname, newLocale);
      if (target && target !== window.location.pathname) {
        window.location.assign(target);
        return;
      }
      const url = new URL(window.location.href);
      url.searchParams.set("lang", newLocale);
      window.history.replaceState({}, "", url);
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      let text = messages[key] ?? key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.split(`{${k}}`).join(String(v));
        });
      }
      return text;
    },
    [messages],
  );

  const toolHref = useCallback((slug: string) => buildToolHref(slug, locale), [locale]);
  const blogHref = useCallback((slug?: string) => buildBlogHref(locale, slug), [locale]);
  const homeHref = useCallback(() => buildHomeHref(locale), [locale]);

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, toolHref, blogHref, homeHref }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
