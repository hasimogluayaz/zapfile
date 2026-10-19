/*
 * Every language at once, for `npm run verify:i18n`. Never import this from
 * app code: it would ship all nine languages to every visitor (pages load
 * theirs with `loadMessages`).
 */
import type { Locale } from "../locales";
import { SUPPORTED_LOCALES } from "../locales";
import { localeCompletions } from "../i18n-completions";
import { mergeLocale, type Messages } from "./load";
import en from "./en";
import tr from "./tr";
import de from "./de";
import fr from "./fr";
import es from "./es";
import pt from "./pt";
import it from "./it";
import ja from "./ja";
import ar from "./ar";

/** Each language's own strings, before the English fallback is filled in. */
const ownStrings: Record<Locale, Messages> = { en, tr, de, fr, es, pt, it, ja, ar };

const translations = Object.fromEntries(
  SUPPORTED_LOCALES.map((locale) => [
    locale,
    locale === "en" ? en : mergeLocale(en, { ...ownStrings[locale], ...localeCompletions[locale] }),
  ]),
) as Record<Locale, Messages>;

/** Keys that still show English in `locale` (checked by `npm run verify:i18n`). */
export function untranslatedKeys(locale: Locale): string[] {
  const own = { ...ownStrings[locale], ...localeCompletions[locale] };
  return Object.keys(en).filter((key) => own[key] === undefined);
}

/** Every language's final strings, for checks (`npm run verify:i18n`). */
export function allTranslations(): Record<Locale, Messages> {
  return translations;
}
