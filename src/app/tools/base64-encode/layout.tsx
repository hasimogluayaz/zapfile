import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/build-tool-metadata";

export const metadata: Metadata = buildToolMetadata("base64-encode");

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
