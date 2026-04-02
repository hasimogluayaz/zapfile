import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "JSON Formatter & Validator - Free Online Tool",
  description:
    "Format, minify, and validate JSON data instantly. Free, private, and browser-based.",
  openGraph: {
    title: "JSON Formatter & Validator - Free Online Tool | ZapFile",
    description:
      "Format, minify, and validate JSON data instantly. Free, private, and browser-based.",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
