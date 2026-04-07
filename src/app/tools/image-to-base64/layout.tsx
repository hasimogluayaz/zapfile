import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/build-tool-metadata";

export const metadata: Metadata = buildToolMetadata("image-to-base64");

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
