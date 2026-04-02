import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PDF to Images - Free Online Tool | ZapFile",
  description:
    "Convert PDF pages to high-quality PNG or JPG images. Batch download as ZIP. No uploads required.",
  openGraph: {
    title: "PDF to Images - Free Online Tool | ZapFile",
    description:
      "Convert PDF pages to high-quality PNG or JPG images. Batch download as ZIP. No uploads required.",
    url: "https://zapfile.xyz/tools/pdf-to-images",
  },
  alternates: {
    canonical: "https://zapfile.xyz/tools/pdf-to-images",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
