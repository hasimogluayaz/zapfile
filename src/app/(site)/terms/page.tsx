import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";
import TermsClient from "./TermsClient";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "ZapFile terms of service.",
  alternates: {
    canonical: `${SITE_URL}/terms`,
  },
};

export default function TermsPage() {
  return <TermsClient />;
}
