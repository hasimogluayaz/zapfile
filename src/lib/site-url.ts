/**
 * Canonical public site origin. Must match the Vercel primary domain (the
 * apex redirects to www) and the Google Search Console property, so
 * canonicals and the sitemap never point at a redirecting URL.
 * Vercel sets NEXT_PUBLIC_SITE_URL to the same value.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.zapfile.xyz"
).replace(/\/$/, "");
