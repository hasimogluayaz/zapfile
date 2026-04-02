import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compress Image - Free Online Tool | ZapFile",
  description:
    "Compress images with adjustable quality. Batch processing supported. 100% private, no uploads.",
  openGraph: {
    title: "Compress Image - Free Online Tool | ZapFile",
    description:
      "Compress images with adjustable quality. Batch processing supported. 100% private, no uploads.",
    url: "https://zapfile.xyz/tools/compress-image",
  },
  alternates: {
    canonical: "https://zapfile.xyz/tools/compress-image",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
