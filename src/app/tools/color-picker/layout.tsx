import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Color Picker & Converter - Free Online Tool | ZapFile",
  description:
    "Pick colors and convert between HEX, RGB, and HSL formats. Copy to clipboard instantly.",
  openGraph: {
    title: "Color Picker & Converter - Free Online Tool | ZapFile",
    description:
      "Pick colors and convert between HEX, RGB, and HSL formats. Copy to clipboard instantly.",
    url: "https://zapfile.xyz/tools/color-picker",
  },
  alternates: {
    canonical: "https://zapfile.xyz/tools/color-picker",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
