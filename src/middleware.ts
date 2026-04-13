import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { localeFromCountryCode } from "@/lib/region-locale";
import type { Locale } from "@/lib/locales";

const GEO_COOKIE = "zapfile-geo-locale";

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
  const res = NextResponse.next();
  const country = detectCountry(request);
  const locale: Locale = localeFromCountryCode(country);

  res.cookies.set(GEO_COOKIE, locale, {
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
