import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Merge PDF - Free Online Tool | ZapFile",
  description:
    "Merge multiple PDF files into one document instantly. Drag and drop to reorder. 100% private, browser-based.",
  openGraph: {
    title: "Merge PDF - Free Online Tool | ZapFile",
    description:
      "Merge multiple PDF files into one document instantly. Drag and drop to reorder. 100% private, browser-based.",
    url: "https://zapfile.xyz/tools/merge-pdf",
  },
  alternates: {
    canonical: "https://zapfile.xyz/tools/merge-pdf",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
