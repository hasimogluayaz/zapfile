import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Word Counter & Text Analyzer - Free Online Tool",
  description:
    "Count words, characters, sentences, paragraphs, and estimate reading time. Free, private, browser-based.",
  openGraph: {
    title: "Word Counter & Text Analyzer - Free Online Tool | ZapFile",
    description:
      "Count words, characters, sentences, paragraphs, and estimate reading time.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
