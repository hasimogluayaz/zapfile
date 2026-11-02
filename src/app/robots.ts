import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
    ],
    // The per-language index first (what Search Console should read), the single file too.
    sitemap: [`${SITE_URL}/sitemap-index.xml`, `${SITE_URL}/sitemap.xml`],
  };
}
