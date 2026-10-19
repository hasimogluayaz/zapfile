import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";
import PrivacyClient from "./PrivacyClient";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "ZapFile privacy policy: files are processed on your device; Office to PDF fast mode converts on our server and deletes files immediately.",
  alternates: {
    canonical: `${SITE_URL}/privacy`,
  },
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
