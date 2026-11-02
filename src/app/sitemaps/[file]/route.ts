import { SITEMAP_LANGS, XML_HEADERS, languageSitemapXml } from "@/lib/sitemap-xml";

// `/sitemaps/en.xml`, `/sitemaps/tr.xml`, …: prerendered at build time.
export const dynamic = "force-static";

export function generateStaticParams() {
  return SITEMAP_LANGS.map((lang) => ({ file: `${lang}.xml` }));
}

export function GET(_request: Request, { params }: { params: { file: string } }) {
  const xml = languageSitemapXml(params.file.replace(/\.xml$/, ""));
  if (!xml) return new Response("Not found", { status: 404 });
  return new Response(xml, { headers: XML_HEADERS });
}
