import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getImageConversions,
  getConversionBySlug,
} from "@/lib/conversions";
import ConversionMarketingClient from "./ConversionMarketingClient";
import { SITE_URL } from "@/lib/site-url";

const BASE_URL = SITE_URL;

export function generateStaticParams() {
  return getImageConversions().map((c) => ({ conversion: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ conversion: string }>;
}): Promise<Metadata> {
  const { conversion: slug } = await params;
  const conv = getConversionBySlug(slug);
  if (!conv) return {};

  const title = `${conv.fromLabel} to ${conv.toLabel} Converter - Free Online Tool | ZapFile`;
  const description = `Convert ${conv.fromLabel} images to ${conv.toLabel} format online for free. Fast, private, browser-based ${conv.fromLabel} to ${conv.toLabel} conversion with no upload required.`;
  const canonicalUrl = `${BASE_URL}/tools/convert-image/${conv.slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "ZapFile",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function ConversionPage({
  params,
}: {
  params: Promise<{ conversion: string }>;
}) {
  const { conversion: slug } = await params;
  const conv = getConversionBySlug(slug);
  if (!conv) notFound();

  const allConversions = getImageConversions().filter(
    (c) => c.slug !== conv.slug,
  );

  return (
    <ConversionMarketingClient
      conversion={conv}
      allConversions={allConversions}
    />
  );
}
