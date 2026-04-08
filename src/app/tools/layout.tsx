import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "All Free Online File Tools | ZapFile",
  description:
    "Browse all free online file tools: PDF, image, video, and utility tools. Fast, private, and browser-based.",
  openGraph: {
    title: "All Free Online File Tools | ZapFile",
    description:
      "Browse all free online file tools. Fast, private, browser-based processing.",
    url: "https://zapfile.xyz/tools",
  },
  alternates: {
    canonical: "https://zapfile.xyz/tools",
    languages: {
      en: "https://zapfile.xyz/tools?lang=en",
      tr: "https://zapfile.xyz/tools?lang=tr",
      de: "https://zapfile.xyz/tools?lang=de",
      fr: "https://zapfile.xyz/tools?lang=fr",
      es: "https://zapfile.xyz/tools?lang=es",
      pt: "https://zapfile.xyz/tools?lang=pt",
      it: "https://zapfile.xyz/tools?lang=it",
      ja: "https://zapfile.xyz/tools?lang=ja",
      ar: "https://zapfile.xyz/tools?lang=ar",
      "x-default": "https://zapfile.xyz/tools",
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
