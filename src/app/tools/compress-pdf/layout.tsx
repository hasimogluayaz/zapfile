import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compress PDF - Free Online Tool | ZapFile",
  description:
    "Compress PDF files instantly in your browser. No uploads, no limits. Reduce file size while maintaining quality.",
  openGraph: {
    title: "Compress PDF - Free Online Tool | ZapFile",
    description:
      "Compress PDF files instantly in your browser. No uploads, no limits. Reduce file size while maintaining quality.",
    url: "https://zapfile.xyz/tools/compress-pdf",
  },
  alternates: {
    canonical: "https://zapfile.xyz/tools/compress-pdf",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
