import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Remove Background - Free Online Tool | ZapFile",
  description:
    "Remove image backgrounds automatically with AI. Get transparent PNG. No uploads, fully private.",
  openGraph: {
    title: "Remove Background - Free Online Tool | ZapFile",
    description:
      "Remove image backgrounds automatically with AI. Get transparent PNG. No uploads, fully private.",
    url: "https://zapfile.xyz/tools/remove-background",
  },
  alternates: {
    canonical: "https://zapfile.xyz/tools/remove-background",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
