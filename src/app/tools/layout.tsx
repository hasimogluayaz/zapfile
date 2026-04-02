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
  },
};

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
