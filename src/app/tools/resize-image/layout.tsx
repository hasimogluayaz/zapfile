import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resize Image - Free Online Tool | ZapFile",
  description:
    "Resize images to any dimension. Lock aspect ratio option. Free, private, browser-based tool.",
  openGraph: {
    title: "Resize Image - Free Online Tool | ZapFile",
    description:
      "Resize images to any dimension. Lock aspect ratio option. Free, private, browser-based tool.",
    url: "https://zapfile.xyz/tools/resize-image",
  },
  alternates: {
    canonical: "https://zapfile.xyz/tools/resize-image",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
