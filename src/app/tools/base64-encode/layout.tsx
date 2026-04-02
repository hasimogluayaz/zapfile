import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Base64 Encoder/Decoder - Free Online Tool | ZapFile",
  description:
    "Encode and decode Base64 strings or files. Fast, free, browser-based tool.",
  openGraph: {
    title: "Base64 Encoder/Decoder - Free Online Tool | ZapFile",
    description:
      "Encode and decode Base64 strings or files. Fast, free, browser-based tool.",
    url: "https://zapfile.xyz/tools/base64-encode",
  },
  alternates: {
    canonical: "https://zapfile.xyz/tools/base64-encode",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
