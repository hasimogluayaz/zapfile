import { SITEMAP_LANGS, XML_HEADERS, languageSitemapXml } from "@/lib/sitemap-xml";

// `/sitemaps/en.xml`, `/sitemaps/tr.xml`, …: prerendered at build time.
export const dynamic = "force-static";

export function generateStaticParams() {
  return SITEMAP_LANGS.map((lang) => ({ file: `${lang}.xml` }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const xml = languageSitemapXml(file.replace(/\.xml$/, ""));
  if (!xml) return new Response("Not found", { status: 404 });
  return new Response(xml, { headers: XML_HEADERS });
}
