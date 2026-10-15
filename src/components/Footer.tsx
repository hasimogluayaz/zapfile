"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { getToolBySlug } from "@/lib/tools";
import { toolField } from "@/lib/tool-i18n";
import { Logo } from "@/components/Header";

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
  { key: "nav.workflows", href: "/workflows" },
  { key: "nav.about", href: "/about" },
  { key: "nav.changelog", href: "/changelog" },
  { key: "nav.blog", href: "/blog" },
  { key: "footer.privacy", href: "/privacy" },
  { key: "footer.terms", href: "/terms" },
];

export default function Footer() {
  const { t, toolHref, blogHref } = useI18n();

  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex rounded-lg" aria-label="ZapFile">
              <Logo />
            </Link>
            <p className="mt-4 max-w-[34ch] text-[14px] leading-relaxed text-t-secondary">
              {t("footer.brand")}
            </p>
            <a
              href={t("footer.newsletterHint")}
              className="mt-5 inline-flex text-[13.5px] font-medium text-t-primary underline decoration-volt decoration-2 underline-offset-4"
            >
              {t("footer.newsletter")}
            </a>
          </div>

          <nav aria-labelledby="footer-popular">
            <h3 id="footer-popular" className="mb-4 text-[13px] font-semibold text-t-primary">
              {t("footer.popular")}
            </h3>
            <ul className="space-y-2.5">
              {toolSlugs.map((slug) => {
                const tool = getToolBySlug(slug);
                if (!tool) return null;
                return (
                  <li key={slug}>
                    <Link
                      href={toolHref(slug)}
                      className="text-[13.5px] text-t-secondary transition-colors hover:text-t-primary"
                    >
                      {toolField(t, slug, tool, "name")}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <nav aria-labelledby="footer-product">
            <h3 id="footer-product" className="mb-4 text-[13px] font-semibold text-t-primary">
              {t("footer.product")}
            </h3>
            <ul className="space-y-2.5">
              {resourceLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href === "/blog" ? blogHref() : link.href}
                    className="text-[13.5px] text-t-secondary transition-colors hover:text-t-primary"
                  >
                    {t(link.key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col justify-between gap-2 border-t border-border pt-6 text-[12.5px] text-t-tertiary sm:flex-row">
          <p>&copy; {new Date().getFullYear()} ZapFile</p>
          <p>{t("footer.copyright")}</p>
        </div>
      </div>
    </footer>
  );
}
