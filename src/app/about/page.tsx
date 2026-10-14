import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";
import AboutClient from "./AboutClient";

export const metadata: Metadata = {
  title: "About ZapFile - Free Browser-Based File Tools",
  description:
    "Learn about ZapFile - free, private, browser-based file tools. Most tools run in your browser, and none need an account.",
  alternates: {
    canonical: `${SITE_URL}/about`,
  },
};

export default function AboutPage() {
  return <AboutClient />;
}
