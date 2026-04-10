import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "All Free Online File Tools | ZapFile",
  description:
    "Browse all free online file tools: PDF, image, video, and utility tools. Fast, private, and browser-based.",
  openGraph: {
    title: "All Free Online File Tools | ZapFile",
    description:
      "Browse all free online file tools. Fast, private, browser-based processing.",
    url: `${SITE_URL}/tools`,
  },
  alternates: {
    canonical: `${SITE_URL}/tools`,
    languages: {
      en: `${SITE_URL}/tools?lang=en`,
      tr: `${SITE_URL}/tools?lang=tr`,
      de: `${SITE_URL}/tools?lang=de`,
      fr: `${SITE_URL}/tools?lang=fr`,
      es: `${SITE_URL}/tools?lang=es`,
      pt: `${SITE_URL}/tools?lang=pt`,
      it: `${SITE_URL}/tools?lang=it`,
      ja: `${SITE_URL}/tools?lang=ja`,
      ar: `${SITE_URL}/tools?lang=ar`,
      "x-default": `${SITE_URL}/tools`,
    },
  },
};

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
