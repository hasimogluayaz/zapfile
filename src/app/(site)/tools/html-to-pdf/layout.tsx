import type { Metadata } from "next";
import { buildToolMetadata, buildToolJsonLd } from "@/lib/build-tool-metadata";

export const metadata: Metadata = buildToolMetadata("html-to-pdf");

export default function Layout({ children }: { children: React.ReactNode }) {
  const jsonLd = buildToolJsonLd("html-to-pdf");
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
