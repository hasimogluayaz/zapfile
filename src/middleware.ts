import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { localeFromCountryCode } from "@/lib/region-locale";
import type { Locale } from "@/lib/locales";
import { SUPPORTED_LOCALES } from "@/lib/locales";
import { LOCALE_COOKIE, LOCALE_PREF_COOKIE, URL_LOCALE_HEADER } from "@/lib/locale-cookies";
import { parseLocalizedToolPath } from "@/lib/localized-routes";

function detectCountry(request: NextRequest): string | undefined {
  const g = request.geo;
  if (g?.country) return g.country;
  const v = request.headers.get("x-vercel-ip-country");
  if (v && v !== "ZZ") return v;
  const cf = request.headers.get("cf-ipcountry");
  if (cf && cf !== "XX" && cf !== "T1") return cf;
  return undefined;
}

export function middleware(request: NextRequest) {
  // Localized tool URLs (`/tr/pdf-birlestir`): tell the root layout the page's
  // language for `<html lang>`.
  const urlLocale = parseLocalizedToolPath(request.nextUrl.pathname)?.locale;
  let res: NextResponse;
  if (urlLocale) {
    const headers = new Headers(request.headers);
    headers.set(URL_LOCALE_HEADER, urlLocale);
    res = NextResponse.next({ request: { headers } });
  } else {
    res = NextResponse.next();
  }
  const country = detectCountry(request);
  const pref = request.cookies.get(LOCALE_PREF_COOKIE)?.value;
  const locale: Locale =
    pref && SUPPORTED_LOCALES.includes(pref as Locale)
      ? (pref as Locale)
      : localeFromCountryCode(country);

  res.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

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
    "/((?!_next/static|_next/image|_next/data|favicon.ico|sw\\.js|sitemap\\.xml|robots\\.txt|feed\\.xml|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|eot|webmanifest|txt|xml)$).*)",
  ],
};
