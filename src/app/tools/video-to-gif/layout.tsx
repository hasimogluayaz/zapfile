import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Video to GIF - Free Online Tool | ZapFile",
  description:
    "Convert video clips to GIF. Set start/end time and quality. Browser-based, no uploads.",
  openGraph: {
    title: "Video to GIF - Free Online Tool | ZapFile",
    description:
      "Convert video clips to GIF. Set start/end time and quality. Browser-based, no uploads.",
    url: "https://zapfile.xyz/tools/video-to-gif",
  },
  alternates: {
    canonical: "https://zapfile.xyz/tools/video-to-gif",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
