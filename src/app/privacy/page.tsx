import type { Metadata } from "next";
import PrivacyClient from "./PrivacyClient";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "ZapFile privacy policy. Your files never leave your browser.",
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
