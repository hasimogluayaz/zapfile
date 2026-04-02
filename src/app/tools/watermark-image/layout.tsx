import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Add Watermark to Image - Free Online Tool | ZapFile",
  description: "Add custom text watermarks to images. Control position, opacity, size and color. Free and private.",
  openGraph: {
    title: "Add Watermark to Image - Free Online Tool | ZapFile",
    description: "Add custom text watermarks to images. Control position, opacity, size and color. Free and private.",
    url: "https://zapfile.xyz/tools/watermark-image",
  },
  alternates: { canonical: "https://zapfile.xyz/tools/watermark-image" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
