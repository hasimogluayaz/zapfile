import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rotate Image - Free Online Tool | ZapFile",
  description: "Rotate images 90, 180, 270 degrees or flip horizontally and vertically. Free, private, browser-based tool.",
  openGraph: {
    title: "Rotate Image - Free Online Tool | ZapFile",
    description: "Rotate images 90, 180, 270 degrees or flip horizontally and vertically. Free, private, browser-based tool.",
    url: "https://zapfile.xyz/tools/rotate-image",
  },
  alternates: { canonical: "https://zapfile.xyz/tools/rotate-image" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
