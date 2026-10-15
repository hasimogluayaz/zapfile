import type { Locale } from "../locales";
import tr from "./tr.json";
import de from "./de.json";
import fr from "./fr.json";
import es from "./es.json";
import pt from "./pt.json";
import it from "./it.json";
import ja from "./ja.json";
import ar from "./ar.json";

/**
 * Strings translated after a language's main dictionary was written, merged
 * over it in `i18n.tsx`. One JSON file per language, keyed like `en`.
 * `npm run verify:i18n` fails when a string the site shows is missing.
 */
export const localeCompletions: Partial<Record<Locale, Record<string, string>>> = {
  tr,
  de,
  fr,
  es,
  pt,
  it,
  ja,
  ar,
};
