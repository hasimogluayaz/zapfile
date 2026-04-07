import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/build-tool-metadata";

export const metadata: Metadata = buildToolMetadata("convert-image");

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
