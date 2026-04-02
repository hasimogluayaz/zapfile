import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Protect PDF - Free Online Tool | ZapFile",
  description:
    "Add password protection to PDF files. Encrypt your documents securely in the browser. No uploads.",
  openGraph: {
    title: "Protect PDF - Free Online Tool | ZapFile",
    description:
      "Add password protection to PDF files. Encrypt your documents securely in the browser. No uploads.",
    url: "https://zapfile.xyz/tools/protect-pdf",
  },
  alternates: {
    canonical: "https://zapfile.xyz/tools/protect-pdf",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
