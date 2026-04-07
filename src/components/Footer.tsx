"use client";

import Link from "next/link";
import Image from "next/image";
import { useI18n } from "@/lib/i18n";
import { getToolBySlug } from "@/lib/tools";
import { toolField } from "@/lib/tool-i18n";

const toolSlugs = [
  "merge-pdf",
  "compress-image",
  "qr-generator",
  "json-formatter",
  "password-generator",
  "pdf-to-images",
];

const resourceLinks = [
  { key: "footer.allTools", href: "/tools" },
  { key: "nav.about", href: "/about" },
  { key: "nav.blog", href: "/blog" },
  { key: "nav.rssFeed", href: "/feed.xml" },
  { key: "footer.compare", href: "/compare/zapfile-vs-smallpdf" },
  { key: "footer.privacy", href: "/privacy" },
  { key: "footer.terms", href: "/terms" },
];

export default function Footer() {
  const { t } = useI18n();

  return (
    <footer className="border-t border-border bg-bg mt-auto">
      <div className="max-w-6xl mx-auto px-5 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Column 1: Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2 mb-3">
              <Image
                src="/android-chrome-192x192.png"
                alt="ZapFile"
                width={28}
                height={28}
                className="rounded-lg"
              />
              <span className="text-[16px] font-bold text-t-primary">
                ZapFile
              </span>
            </Link>
            <p className="text-t-tertiary text-[13px] leading-relaxed max-w-[250px]">
              {t("footer.brand")}
            </p>
          </div>

          {/* Column 2: Tools */}
          <div>
            <h3 className="text-[13px] font-semibold text-t-primary mb-3">
              {t("footer.popular")}
            </h3>
            <ul className="space-y-2">
              {toolSlugs.map((slug) => {
                const tool = getToolBySlug(slug);
                if (!tool) return null;
                return (
                  <li key={slug}>
                    <Link
                      href={`/tools/${slug}`}
                      className="text-t-secondary hover:text-t-primary transition-colors text-[13px]"
                    >
                      {toolField(t, slug, tool, "name")}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h3 className="text-[13px] font-semibold text-t-primary mb-3">
              {t("footer.product")}
            </h3>
            <p className="text-[12px] text-t-tertiary mb-3">
              <a
                href={t("footer.newsletterHint")}
                className="text-accent hover:underline"
              >
                {t("footer.newsletter")}
              </a>
            </p>
            <ul className="space-y-2">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-t-secondary hover:text-t-primary transition-colors text-[13px]"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-t-tertiary text-[12px]">
            &copy; {new Date().getFullYear()} ZapFile.
          </p>
          <p className="text-t-tertiary text-[12px]">
            {t("footer.copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
}
