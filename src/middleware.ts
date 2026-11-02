import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { localeFromCountryCode } from "@/lib/region-locale";
import type { Locale } from "@/lib/locales";
import { SUPPORTED_LOCALES } from "@/lib/locales";
import { LOCALE_COOKIE, LOCALE_PREF_COOKIE } from "@/lib/locale-cookies";
import { pathForLocale } from "@/lib/localized-routes";

function detectCountry(request: NextRequest): string | undefined {
  const g = request.geo;
  if (g?.country) return g.country;
  const v = request.headers.get("x-vercel-ip-country");
  if (v && v !== "ZZ") return v;
  const cf = request.headers.get("cf-ipcountry");
  if (cf && cf !== "XX" && cf !== "T1") return cf;
  return undefined;
}

/**
 * Old `?lang=xx` addresses (the site used them before every language had its
 * own URLs) are the same page under another address for search engines:
 * "Crawled – currently not indexed" / "Alternate page" in Search Console.
 * Send them permanently to the page's URL in that language (`/tools/merge-pdf?lang=tr`
 * → `/tr/pdf-birlestir`), or to the address without `?lang=` when the page
 * has a single URL (its language is then picked in the browser).
 */
function langRedirect(request: NextRequest): NextResponse | null {
  const { nextUrl } = request;
  if (!nextUrl.searchParams.has("lang")) return null;
  const lang = nextUrl.searchParams.get("lang") ?? "";
  const url = nextUrl.clone();
  url.searchParams.delete("lang");
  if (SUPPORTED_LOCALES.includes(lang as Locale)) {
    url.pathname = pathForLocale(nextUrl.pathname, lang as Locale) ?? nextUrl.pathname;
  }
  return NextResponse.redirect(url, 301);
}

/**
 * Remembers the visitor's likely language (explicit choice, else country) in a
 * cookie the I18nProvider reads in the browser. Pages are prerendered and
 * don't depend on it.
 */
export function middleware(request: NextRequest) {
  const redirect = langRedirect(request);
  if (redirect) return redirect;

  const res = NextResponse.next();
  const country = detectCountry(request);
  const pref = request.cookies.get(LOCALE_PREF_COOKIE)?.value;
  const locale: Locale =
    pref && SUPPORTED_LOCALES.includes(pref as Locale)
      ? (pref as Locale)
      : localeFromCountryCode(country);

  if (request.cookies.get(LOCALE_COOKIE)?.value !== locale) {
    res.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Run on all app paths except:
     * - Next.js internals (_next/static, _next/image, _next/data)
     * - Static assets (fonts, images, icons, manifests)
     * - SEO files (sitemap.xml, robots.txt, feed.xml)
     */
    {
      source:
        "/((?!_next/static|_next/image|_next/data|api/|vendor/|tessdata/|favicon.ico|sw\\.js|sitemap\\.xml|robots\\.txt|feed\\.xml|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|eot|webmanifest|txt|xml|js|mjs|wasm|json|gz)$).*)",
      // Page loads only: client-side navigations and prefetches don't need the cookie.
      missing: [{ type: "header", key: "rsc" }],
    },
  ],
};
