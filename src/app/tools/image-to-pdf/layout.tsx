import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Image to PDF - Free Online Tool | ZapFile",
  description: "Convert JPG, PNG, or WEBP images to PDF. Combine multiple images into one PDF. Free, private, browser-based.",
  openGraph: {
    title: "Image to PDF - Free Online Tool | ZapFile",
    description: "Convert JPG, PNG, or WEBP images to PDF. Combine multiple images into one PDF. Free, private, browser-based.",
    url: "https://zapfile.xyz/tools/image-to-pdf",
  },
  alternates: { canonical: "https://zapfile.xyz/tools/image-to-pdf" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
