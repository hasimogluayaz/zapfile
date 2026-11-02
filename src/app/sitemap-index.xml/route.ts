import { sitemapIndexXml, XML_HEADERS } from "@/lib/sitemap-xml";

// Built once at build time and served from the CDN.
export const dynamic = "force-static";

export function GET() {
  return new Response(sitemapIndexXml(), { headers: XML_HEADERS });
}
