import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";
import ChangelogClient from "./ChangelogClient";

export const metadata: Metadata = {
  title: "Changelog",
  description: "ZapFile release history: new tools, improvements and fixes.",
  alternates: {
    canonical: `${SITE_URL}/changelog`,
  },
};

export default function ChangelogPage() {
  return <ChangelogClient />;
}
