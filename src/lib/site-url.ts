/**
 * Canonical public site origin. Must match the Vercel primary domain
 * AND the Google Search Console property domain (https://zapfile.xyz/).
 * Using the apex domain avoids cross-domain sitemap redirect issues with GSC.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://zapfile.xyz"
).replace(/\/$/, "");
