import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/build-tool-metadata";

export const metadata: Metadata = buildToolMetadata("convert-image");

/** No structured data here: see page.tsx. */
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
