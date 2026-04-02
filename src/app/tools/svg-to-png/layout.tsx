import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SVG to PNG Converter - Free Online Tool | ZapFile",
  description:
    "Convert SVG files to PNG with custom dimensions. High-quality rendering. Free and private.",
  openGraph: {
    title: "SVG to PNG Converter - Free Online Tool | ZapFile",
    description:
      "Convert SVG files to PNG with custom dimensions. High-quality rendering. Free and private.",
    url: "https://zapfile.xyz/tools/svg-to-png",
  },
  alternates: {
    canonical: "https://zapfile.xyz/tools/svg-to-png",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
