import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hash Generator (SHA-256, SHA-512) - Free Online Tool",
  description:
    "Generate SHA-1, SHA-256, SHA-384, SHA-512 hashes from text or files. Free, private, browser-based.",
  openGraph: {
    title: "Hash Generator - Free Online Tool | ZapFile",
    description:
      "Generate SHA-1, SHA-256, SHA-384, SHA-512 hashes from text or files. Free, private, browser-based.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
