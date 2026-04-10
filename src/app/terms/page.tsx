import type { Metadata } from "next";
import TermsClient from "./TermsClient";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "ZapFile terms of service.",
};

export default function TermsPage() {
  return <TermsClient />;
}
