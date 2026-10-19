import type { Metadata } from "next";
import { buildToolMetadata, buildToolJsonLd } from "@/lib/build-tool-metadata";

export const metadata: Metadata = buildToolMetadata("svg-to-png");

export default function Layout({ children }: { children: React.ReactNode }) {
  const jsonLd = buildToolJsonLd("svg-to-png");
  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
