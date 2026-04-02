import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Extract Audio from Video - Free Online Tool | ZapFile",
  description:
    "Extract audio from video files as MP3 or WAV. Fast, free, and 100% private.",
  openGraph: {
    title: "Extract Audio from Video - Free Online Tool | ZapFile",
    description:
      "Extract audio from video files as MP3 or WAV. Fast, free, and 100% private.",
    url: "https://zapfile.xyz/tools/extract-audio",
  },
  alternates: {
    canonical: "https://zapfile.xyz/tools/extract-audio",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
