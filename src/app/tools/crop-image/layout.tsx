import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Crop Image - Free Online Tool | ZapFile",
  description:
    "Crop images with preset aspect ratios (1:1, 16:9, 4:3) or free-form selection. Free online tool.",
  openGraph: {
    title: "Crop Image - Free Online Tool | ZapFile",
    description:
      "Crop images with preset aspect ratios (1:1, 16:9, 4:3) or free-form selection. Free online tool.",
    url: "https://zapfile.xyz/tools/crop-image",
  },
  alternates: {
    canonical: "https://zapfile.xyz/tools/crop-image",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
