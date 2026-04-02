import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "QR Code Generator - Free Online Tool | ZapFile",
  description:
    "Generate custom QR codes for URLs, text, phone numbers. Add colors and logos. Download as PNG or SVG.",
  openGraph: {
    title: "QR Code Generator - Free Online Tool | ZapFile",
    description:
      "Generate custom QR codes for URLs, text, phone numbers. Add colors and logos. Download as PNG or SVG.",
    url: "https://zapfile.xyz/tools/qr-generator",
  },
  alternates: {
    canonical: "https://zapfile.xyz/tools/qr-generator",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
