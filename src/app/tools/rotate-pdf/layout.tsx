import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Rotate PDF - Free Online Tool | ZapFile",
  description:
    "Rotate PDF pages 90, 180 or 270 degrees. Rotate individual pages or all at once. Free online tool.",
  openGraph: {
    title: "Rotate PDF - Free Online Tool | ZapFile",
    description:
      "Rotate PDF pages 90, 180 or 270 degrees. Rotate individual pages or all at once. Free online tool.",
    url: "https://zapfile.xyz/tools/rotate-pdf",
  },
  alternates: {
    canonical: "https://zapfile.xyz/tools/rotate-pdf",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
