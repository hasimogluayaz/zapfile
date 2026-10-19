import { buildToolJsonLd } from "@/lib/build-tool-metadata";
import ConvertImagePage from "./ConvertImagePage";

// Structured data lives here, not in layout.tsx: the layout also wraps the
// /convert-image/<conversion> pages, which describe themselves.
export default function Page() {
  const jsonLd = buildToolJsonLd("convert-image");
  return (
    <>
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      <ConvertImagePage />
    </>
  );
}
