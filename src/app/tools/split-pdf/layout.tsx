import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Split PDF - Free Online Tool | ZapFile",
  description:
    "Split PDF files by selecting specific pages. Download as separate files or ZIP. Free and private.",
  openGraph: {
    title: "Split PDF - Free Online Tool | ZapFile",
    description:
      "Split PDF files by selecting specific pages. Download as separate files or ZIP. Free and private.",
    url: "https://zapfile.xyz/tools/split-pdf",
  },
  alternates: {
    canonical: "https://zapfile.xyz/tools/split-pdf",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
