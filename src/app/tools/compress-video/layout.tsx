import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compress Video - Free Online Tool | ZapFile",
  description:
    "Compress video files in your browser. Choose quality level. No uploads, no limits.",
  openGraph: {
    title: "Compress Video - Free Online Tool | ZapFile",
    description:
      "Compress video files in your browser. Choose quality level. No uploads, no limits.",
    url: "https://zapfile.xyz/tools/compress-video",
  },
  alternates: {
    canonical: "https://zapfile.xyz/tools/compress-video",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
