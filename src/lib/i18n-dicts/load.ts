import type { Locale } from "../locales";

export type Messages = Record<string, string>;

/** A language's strings over English, so every key exists. */
export function mergeLocale(en: Messages, own: Messages): Messages {
  const out: Messages = {};
  for (const key of Object.keys(en)) {
    out[key] = own[key] ?? en[key]!;
  }
  return out;
}

const withEnglish = (own: Promise<[{ default: Messages }, { default: Messages }]>) =>
  Promise.all([import("./en"), own]).then(([en, [strings, completions]]) =>
    mergeLocale(en.default, { ...strings.default, ...completions.default }),
  );

/**
 * One language's strings, loaded on demand so a page only downloads its own
 * language (each import is its own chunk). The server passes the first one
 * to the I18nProvider; this loads the others when the language changes.
 */
const loaders: Record<Locale, () => Promise<Messages>> = {
  en: () => import("./en").then((m) => m.default),
  tr: () => withEnglish(Promise.all([import("./tr"), import("../i18n-completions/tr.json")])),
  de: () => withEnglish(Promise.all([import("./de"), import("../i18n-completions/de.json")])),
  fr: () => withEnglish(Promise.all([import("./fr"), import("../i18n-completions/fr.json")])),
  es: () => withEnglish(Promise.all([import("./es"), import("../i18n-completions/es.json")])),
  pt: () => withEnglish(Promise.all([import("./pt"), import("../i18n-completions/pt.json")])),
  it: () => withEnglish(Promise.all([import("./it"), import("../i18n-completions/it.json")])),
  ja: () => withEnglish(Promise.all([import("./ja"), import("../i18n-completions/ja.json")])),
  ar: () => withEnglish(Promise.all([import("./ar"), import("../i18n-completions/ar.json")])),
};

export function loadMessages(locale: Locale): Promise<Messages> {
  return loaders[locale]();
}
