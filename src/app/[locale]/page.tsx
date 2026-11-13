import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isToolUrlLocale } from "@/lib/localized-routes";
import HomeClient from "../HomeClient";
import { homeMetadata } from "../home-page";

/**
 * The home page in another language (`/tr`, `/de`, …). Same component as `/`;
 * the I18nProvider takes the language from the path. Any other single-segment
 * path that reaches this route is a 404.
 */

// The languages come from the layout's generateStaticParams.

type Params = { locale: string };

export async function generateMetadata(props: { params: Promise<Params> }): Promise<Metadata> {
  const params = await props.params;
  return isToolUrlLocale(params.locale) ? homeMetadata(params.locale) : {};
}

export default async function LocalizedHome(props: { params: Promise<Params> }) {
  const params = await props.params;
  if (!isToolUrlLocale(params.locale)) notFound();
  return <HomeClient />;
}
