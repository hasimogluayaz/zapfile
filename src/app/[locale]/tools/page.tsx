import { notFound } from "next/navigation";
import ToolsPage from "@/app/(site)/tools/page";
import { isToolUrlLocale } from "@/lib/localized-routes";
import { toolsIndexMetadata } from "@/lib/tools-index-seo";

/**
 * The tool list in another language (`/tr/tools`, `/de/tools`, …). Same
 * component as `/tools`; the I18nProvider takes the language from the path.
 * Prerendered for every language (the layout's generateStaticParams).
 */

export function generateMetadata({ params }: { params: { locale: string } }) {
  return isToolUrlLocale(params.locale) ? toolsIndexMetadata(params.locale) : {};
}

export default function Page({ params }: { params: { locale: string } }) {
  if (!isToolUrlLocale(params.locale)) notFound();
  return <ToolsPage />;
}
