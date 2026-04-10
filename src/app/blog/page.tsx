import type { Metadata } from "next";
import BlogClient from "./BlogClient";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Blog | ZapFile",
  description:
    "Tips, guides, and comparisons about image compression, PDF tools, file formats, and online privacy. Learn how to work with files faster and more privately.",
  openGraph: {
    title: "Blog | ZapFile",
    description:
      "Tips, guides, and comparisons about image compression, PDF tools, file formats, and online privacy.",
    url: `${SITE_URL}/blog`,
    type: "website",
  },
  alternates: {
    canonical: `${SITE_URL}/blog`,
  },
};

export default function BlogPage() {
  return <BlogClient />;
}
