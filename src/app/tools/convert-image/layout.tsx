import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Convert Image Format - Free Online Tool | ZapFile",
  description:
    "Convert images between PNG, JPG, WEBP, and AVIF formats. Fast, free, and private.",
  openGraph: {
    title: "Convert Image Format - Free Online Tool | ZapFile",
    description:
      "Convert images between PNG, JPG, WEBP, and AVIF formats. Fast, free, and private.",
    url: "https://zapfile.xyz/tools/convert-image",
  },
  alternates: {
    canonical: "https://zapfile.xyz/tools/convert-image",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
