/** Middleware sets this to the effective UI locale (user preference or geo). */
export const LOCALE_COOKIE = "zapfile-geo-locale";

/** When set, middleware prefers this over geo-derived locale. */
export const LOCALE_PREF_COOKIE = "zapfile-locale-pref";

/** Request header middleware sets on localized URLs (`/tr/...`): the page's fixed language. */
export const URL_LOCALE_HEADER = "x-zapfile-url-locale";
