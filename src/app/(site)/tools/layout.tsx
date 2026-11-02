import type { Metadata } from "next";
import { toolsIndexMetadata } from "@/lib/tools-index-seo";

// The tool list's metadata (`/tools`; `/tr/tools`, … in [locale]/tools).
// Every tool page under /tools sets its own title, description, canonical and hreflang.
export const metadata: Metadata = toolsIndexMetadata("en");

export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
