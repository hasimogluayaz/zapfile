import RootShell, { rootMetadata, rootViewport } from "../root-shell";
import { TOOL_URL_LOCALES, isToolUrlLocale } from "@/lib/localized-routes";

/**
 * Root layout of the pages in another language (`/tr`, `/de/pdf-zusammenfuegen`,
 * `/ar/blog/…`): `<html lang>` and the strings come from the path. Paths that
 * aren't a language (any unknown URL ends up here) render the English 404.
 */
export const metadata = rootMetadata;
export const viewport = rootViewport;

export function generateStaticParams() {
  return TOOL_URL_LOCALES.map((locale) => ({ locale }));
}

export default function LocaleLayout({ children, params }: { children: React.ReactNode; params: { locale: string } }) {
  return <RootShell locale={isToolUrlLocale(params.locale) ? params.locale : "en"}>{children}</RootShell>;
}
