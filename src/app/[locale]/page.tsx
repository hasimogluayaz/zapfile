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

// Rendered per request like every page; don't add `dynamicParams = false`
// (see `[toolSlug]/page.tsx`).
export const dynamic = "force-dynamic";

type Params = { locale: string };

export function generateMetadata({ params }: { params: Params }): Metadata {
  return isToolUrlLocale(params.locale) ? homeMetadata(params.locale) : {};
}

export default function LocalizedHome({ params }: { params: Params }) {
  if (!isToolUrlLocale(params.locale)) notFound();
  return <HomeClient />;
}
