import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";
import PrivacyClient from "./PrivacyClient";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "ZapFile privacy policy. Your files never leave your browser.",
  alternates: {
    canonical: `${SITE_URL}/privacy`,
  },
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
