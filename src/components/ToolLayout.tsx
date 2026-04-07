"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Header from "./Header";
import Footer from "./Footer";
import AdPlaceholder from "./AdPlaceholder";
import ToolShareBar from "./ToolShareBar";
import { useI18n } from "@/lib/i18n";
import { usePathname } from "next/navigation";
import { tools, getToolBySlug } from "@/lib/tools";
import { useRecentTools } from "@/hooks/useRecentTools";
import { useFavoriteTools } from "@/hooks/useFavoriteTools";

interface ToolLayoutProps {
  children: React.ReactNode;
  toolName: string;
  toolDescription: string;
  faq?: { q: string; a: string }[];
}

export default function ToolLayout({
  children,
  toolName,
  toolDescription,
  faq,
}: ToolLayoutProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const slug = pathname?.split("/").pop() || "";
  const { trackTool } = useRecentTools();
  const { isFavorite, toggleFavorite, ready: favReady } = useFavoriteTools();
  const [openFaqIndices, setOpenFaqIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (slug) trackTool(slug);
  }, [slug, trackTool]);

  const finalName =
    slug && t(`tool.${slug}.name`) !== `tool.${slug}.name`
      ? t(`tool.${slug}.name`)
      : toolName;
  const finalDesc =
    slug && t(`tool.${slug}.desc`) !== `tool.${slug}.desc`
      ? t(`tool.${slug}.desc`)
      : toolDescription;

  const currentTool = getToolBySlug(slug);

  const relatedTools = useMemo(() => {
    if (!currentTool) return [];
    const sameCategory = tools.filter(
      (t) => t.category === currentTool.category && t.slug !== currentTool.slug
    );
    const otherCategory = tools.filter(
      (t) => t.category !== currentTool.category && t.slug !== currentTool.slug
    );
    return [...sameCategory, ...otherCategory].slice(0, 4);
  }, [currentTool]);

  const faqItems = useMemo(() => {
    if (faq) return faq;

    const commonFaqs = [
      { q: t("faq.free.q"), a: t("faq.free.a") },
      { q: t("faq.safe.q"), a: t("faq.safe.a") },
      { q: t("faq.account.q"), a: t("faq.account.a") },
    ];

    const category = currentTool?.category;
    let categoryFaqs: { q: string; a: string }[] = [];

    if (category === "pdf") {
      categoryFaqs = [
        { q: t("faq.filesize.q"), a: t("faq.filesize.a") },
      ];
    } else if (category === "image") {
      categoryFaqs = [
        { q: t("faq.formats.q"), a: t("faq.formats.a") },
        { q: t("faq.filesize.q"), a: t("faq.filesize.a") },
      ];
    } else if (category === "video") {
      categoryFaqs = [
        { q: t("faq.formats.q"), a: t("faq.formats.a") },
        { q: t("faq.slow.q"), a: t("faq.slow.a") },
      ];
    } else {
      categoryFaqs = [
        { q: t("faq.offline.q"), a: t("faq.offline.a") },
        { q: t("faq.mobile.q"), a: t("faq.mobile.a") },
      ];
    }

    return [...commonFaqs, ...categoryFaqs];
  }, [faq, currentTool, t]);

  const toggleFaq = (index: number) => {
    setOpenFaqIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <div className="max-w-2xl mx-auto px-5 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-[12px] text-t-tertiary mb-6">
            <Link href="/" className="hover:text-accent transition-colors">
              {t("tool.home")}
            </Link>
            <svg
              className="w-3 h-3 text-t-tertiary/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
            <Link href="/tools" className="hover:text-accent transition-colors">
              {t("tool.tools")}
            </Link>
            <svg
              className="w-3 h-3 text-t-tertiary/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span className="text-t-secondary font-medium">{finalName}</span>
          </nav>

          <AdPlaceholder position="top" />

          <ToolShareBar />

          {/* Tool header */}
          <div className="mb-8 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-t-primary">{finalName}</h1>
              <p className="text-[14px] text-t-secondary mt-2 leading-relaxed">
                {finalDesc}
              </p>
            </div>
            {currentTool && favReady && (
              <button
                type="button"
                onClick={() => toggleFavorite(currentTool.slug)}
                aria-pressed={isFavorite(currentTool.slug)}
                aria-label={t("nav.favoriteToggle")}
                className="shrink-0 mt-0.5 p-2 rounded-xl border border-border text-xl leading-none hover:bg-bg-secondary transition-colors text-amber-500"
              >
                {isFavorite(currentTool.slug) ? "★" : "☆"}
              </button>
            )}
          </div>

          {/* Tool content */}
          <div className="animate-fade-up">{children}</div>

          {/* Related Tools */}
          {relatedTools.length > 0 && (
            <section className="mt-16 mb-8">
              <h2 className="text-xl font-semibold text-t-primary mb-6">
                {t("related.title")}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {relatedTools.map((tool) => (
                  <Link
                    key={tool.slug}
                    href={`/tools/${tool.slug}`}
                    className="glass rounded-xl p-4 hover:border-accent/50 border border-transparent transition-all group"
                  >
                    <span className="text-2xl">{tool.emoji}</span>
                    <h3 className="font-medium text-t-primary mt-2 group-hover:text-accent transition-colors">
                      {t(`tool.${tool.slug}.name`)}
                    </h3>
                    <p className="text-xs text-t-tertiary mt-1 line-clamp-2">
                      {t(`tool.${tool.slug}.desc`)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* FAQ */}
          {faqItems.length > 0 && (
            <section className="mt-12 mb-8">
              <h2 className="text-xl font-semibold text-t-primary mb-6">
                {t("faq.title")}
              </h2>
              <div className="space-y-3">
                {faqItems.map((item, index) => (
                  <div key={index} className="glass rounded-xl overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleFaq(index)}
                      aria-expanded={openFaqIndices.has(index)}
                      className="w-full px-6 py-4 flex items-center justify-between text-left"
                    >
                      <span className="font-medium text-t-primary">
                        {item.q}
                      </span>
                      <svg
                        className={`w-4 h-4 text-t-tertiary shrink-0 ml-4 transition-transform duration-200 ${
                          openFaqIndices.has(index) ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                    {openFaqIndices.has(index) && (
                      <div className="px-6 pb-4 text-t-secondary text-sm">
                        {item.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                  __html: JSON.stringify({
                    "@context": "https://schema.org",
                    "@type": "FAQPage",
                    mainEntity: faqItems.map((item) => ({
                      "@type": "Question",
                      name: item.q,
                      acceptedAnswer: {
                        "@type": "Answer",
                        text: item.a,
                      },
                    })),
                  }),
                }}
              />
            </section>
          )}

          {/* Privacy badge */}
          <div className="mt-12 flex items-center justify-center gap-2 text-[12px] text-t-tertiary">
            <svg
              className="w-3.5 h-3.5 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            {t("tool.privacy")}
          </div>

          <AdPlaceholder position="bottom" />
        </div>
      </main>
      <Footer />
    </>
  );
}
