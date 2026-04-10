/**
 * Canonical public site origin. Must match the Vercel primary domain.
 * Using www avoids 307 apex→www redirects that break Google Search Console sitemap fetch.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.zapfile.xyz"
).replace(/\/$/, "");
