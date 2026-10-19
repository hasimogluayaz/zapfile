import type { Metadata } from "next";
import { buildToolMetadata, buildToolJsonLd } from "@/lib/build-tool-metadata";

export const metadata: Metadata = buildToolMetadata("text-to-speech");

export default function Layout({ children }: { children: React.ReactNode }) {
  const jsonLd = buildToolJsonLd("text-to-speech");
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
