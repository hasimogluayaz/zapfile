import { notFound } from "next/navigation";
import ToolsPage from "@/app/(site)/tools/page";
import { isToolUrlLocale } from "@/lib/localized-routes";
import { toolsIndexMetadata } from "@/lib/tools-index-seo";

/**
 * The tool list in another language (`/tr/tools`, `/de/tools`, …). Same
 * component as `/tools`; the I18nProvider takes the language from the path.
 * Prerendered for every language (the layout's generateStaticParams).
 */

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return isToolUrlLocale(locale) ? toolsIndexMetadata(locale) : {};
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isToolUrlLocale(locale)) notFound();
  return <ToolsPage />;
}
