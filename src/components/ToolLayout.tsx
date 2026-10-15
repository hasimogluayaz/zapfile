"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Header from "./Header";
import Footer from "./Footer";
import AdPlaceholder from "./AdPlaceholder";
import TrustPanel from "./TrustPanel";
import ToolShareBar from "./ToolShareBar";
import { useI18n } from "@/lib/i18n";
import { usePathname } from "next/navigation";
import { ChevronRight, Lock, Plus, Star } from "lucide-react";
import ToolIcon, { CategoryIcon } from "./ToolIcon";
import ToolCard from "./ToolCard";
import {
  getToolBySlug,
  tools,
  type ToolCategory,
} from "@/lib/tools";
import { toolField } from "@/lib/tool-i18n";
import { useFavoriteTools } from "@/hooks/useFavoriteTools";
import { useRecentTools } from "@/hooks/useRecentTools";
import { toolSlugFromPathname } from "@/lib/tool-slug";
import { parseLocalizedToolPath } from "@/lib/localized-routes";
import { getToolFaqs } from "@/lib/tool-faqs";

interface ToolLayoutProps {
  children: React.ReactNode;
  toolName: string;
  toolDescription: string;
  faq?: { q: string; a: string }[];
  /** Show privacy / local-processing explainer (default: true) */
  showTrustPanel?: boolean;
}

const catKeys: Record<ToolCategory, string> = {
  pdf: "cat.pdf",
  image: "cat.image",
  video: "cat.video",
  utility: "cat.utility",
};

export default function ToolLayout({
  children,
  toolName,
  toolDescription,
  faq,
  showTrustPanel = true,
}: ToolLayoutProps) {
  const { t, locale, toolHref, homeHref } = useI18n();
  const pathname = usePathname();
  const slug = toolSlugFromPathname(pathname);
  // Localized URLs (`/tr/...`) get no English FAQPage from a tool layout.
  const localizedRoute = parseLocalizedToolPath(pathname) !== null;
  const { trackTool } = useRecentTools();
  const { isFavorite, toggleFavorite, ready: favReady } = useFavoriteTools();
  const [openFaqIndices, setOpenFaqIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (slug) trackTool(slug);
  }, [slug, trackTool]);

  const currentTool = getToolBySlug(slug);

  const finalName = currentTool
    ? toolField(t, slug, currentTool, "name")
    : toolName;
  const finalDesc = currentTool
    ? toolField(t, slug, currentTool, "desc")
    : toolDescription;

  const relatedTools = useMemo(() => {
    if (!currentTool) return [];
    const sameCategory = tools.filter(
      (tool) =>
        tool.category === currentTool.category &&
        tool.slug !== currentTool.slug,
    );
    const otherCategory = tools.filter(
      (tool) =>
        tool.category !== currentTool.category &&
        tool.slug !== currentTool.slug,
    );
    return [...sameCategory, ...otherCategory].slice(0, 6);
  }, [currentTool]);

  const sideRailGroups = useMemo(() => {
    const categories: ToolCategory[] = ["pdf", "image", "video", "utility"];
    const ordered = currentTool
      ? [
          currentTool.category,
          ...categories.filter((category) => category !== currentTool.category),
        ]
      : categories;

    return ordered.map((category) => ({
      category,
      items: tools.filter((tool) => tool.category === category),
    }));
  }, [currentTool]);

  // Tool-specific FAQs are already emitted as FAQPage JSON-LD by each tool's
  // server layout; emitting a second FAQPage here would duplicate it.
  const toolFaqs = useMemo(() => getToolFaqs(slug), [slug]);

  const faqItems = useMemo(() => {
    if (faq) return faq;

    const commonFaqs = [
      { q: t("faq.free.q"), a: t("faq.free.a") },
      { q: t("faq.safe.q"), a: t(showTrustPanel ? "faq.safe.a" : "faq.safe.aServer") },
      { q: t("faq.account.q"), a: t("faq.account.a") },
    ];

    const category = currentTool?.category;
    let categoryFaqs: { q: string; a: string }[] = [];

    if (category === "pdf") {
      categoryFaqs = [{ q: t("faq.filesize.q"), a: t("faq.filesize.a") }];
    } else if (category === "image") {
      categoryFaqs = [
        { q: t("faq.formats.q"), a: t("faq.formats.a") },
        { q: t("faq.filesize.q"), a: t("faq.filesize.a") },
      ];
    } else if (category === "video" && (slug === "text-to-speech" || slug === "audio-recorder")) {
      // Nothing to upload or convert here: offline/mobile answers fit better.
      categoryFaqs = [
        { q: t("faq.offline.q"), a: t("faq.offline.a") },
        { q: t("faq.mobile.q"), a: t("faq.mobile.a") },
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

    // The curated per-tool FAQs are English-only; show them (so the visible
    // content matches the structured data) when browsing in English.
    const specific =
      locale === "en" && toolFaqs
        ? toolFaqs.map((f) => ({ q: f.question, a: f.answer }))
        : [];
    const seen = new Set(specific.map((f) => f.q));
    return [
      ...specific,
      ...[...commonFaqs, ...categoryFaqs].filter((f) => !seen.has(f.q)),
    ];
  }, [faq, currentTool, t, locale, toolFaqs, slug, showTrustPanel]);

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
        <div className="mx-auto flex w-full max-w-[1780px] gap-8 px-4 pb-16 pt-6 sm:px-6">
          <aside className="hidden w-60 shrink-0 xl:block">
            <nav
              aria-label={t("nav.allTools")}
              className="sticky top-[4.5rem] max-h-[calc(100vh-5.5rem)] overflow-y-auto pb-6 pe-1"
            >
              <Link
                href="/tools"
                className="mb-4 flex items-center justify-between rounded-xl px-2.5 py-2 text-[13px] font-semibold text-t-primary hover:bg-bg-secondary"
              >
                <span>{t("nav.allTools")}</span>
                <span className="text-[12px] font-normal tabular-nums text-t-tertiary">
                  {tools.length}
                </span>
              </Link>

              <div className="space-y-5">
                {sideRailGroups.map(({ category, items }) => (
                  <div key={category}>
                    <p className="mb-1 flex items-center gap-2 px-2.5 text-[12px] font-semibold text-t-tertiary">
                      <CategoryIcon category={category} className="h-3.5 w-3.5" />
                      {t(catKeys[category])}
                    </p>
                    <div>
                      {items.map((tool) => {
                        const active = tool.slug === slug;
                        return (
                          <Link
                            key={tool.slug}
                            href={toolHref(tool.slug)}
                            aria-current={active ? "page" : undefined}
                            className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[13px] transition-colors ${
                              active
                                ? "bg-surface font-medium text-t-primary shadow-sm ring-1 ring-border"
                                : "text-t-secondary hover:bg-bg-secondary hover:text-t-primary"
                            }`}
                          >
                            {active && (
                              <span
                                className="absolute inset-y-2 start-0 w-[3px] rounded-full bg-volt"
                                aria-hidden="true"
                              />
                            )}
                            <ToolIcon slug={tool.slug} className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 truncate">
                              {toolField(t, tool.slug, tool, "name")}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </nav>
          </aside>

          <div className="min-w-0 flex-1">
            <header className="mb-6">
              <nav
                aria-label={t("breadcrumb.label")}
                className="mb-4 flex flex-wrap items-center gap-1 text-[12.5px] text-t-tertiary"
              >
                <Link href={homeHref()} className="hover:text-t-primary">
                  {t("tool.home")}
                </Link>
                <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
                <Link href="/tools" className="hover:text-t-primary">
                  {t("tool.tools")}
                </Link>
                {currentTool && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" aria-hidden="true" />
                    <Link href={`/tools#${currentTool.category}`} className="hover:text-t-primary">
                      {t(catKeys[currentTool.category])}
                    </Link>
                  </>
                )}
              </nav>

              <div className="flex flex-wrap items-start gap-4 sm:flex-nowrap sm:items-center">
                {currentTool && (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] bg-t-primary text-bg shadow-panel">
                    <ToolIcon slug={currentTool.slug} className="h-7 w-7" strokeWidth={1.6} />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.035em] text-t-primary sm:text-[34px]">
                    {finalName}
                  </h1>
                  <p className="mt-1 max-w-[70ch] text-[15px] leading-relaxed text-t-secondary">
                    {finalDesc}
                  </p>
                </div>

                <div className="flex w-full shrink-0 items-center gap-1.5 sm:w-auto">
                  {currentTool && favReady && (
                    <button
                      type="button"
                      onClick={() => toggleFavorite(currentTool.slug)}
                      aria-pressed={isFavorite(currentTool.slug)}
                      aria-label={t("nav.favoriteToggle")}
                      title={isFavorite(currentTool.slug) ? t("fav.remove") : t("fav.add")}
                      className={`flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium shadow-sm transition-colors ${
                        isFavorite(currentTool.slug)
                          ? "border-volt bg-volt text-ink"
                          : "border-border bg-surface text-t-secondary hover:border-t-primary/25 hover:text-t-primary"
                      }`}
                    >
                      <Star
                        className={`h-4 w-4 ${isFavorite(currentTool.slug) ? "fill-current" : ""}`}
                        aria-hidden="true"
                      />
                      <span className="hidden sm:inline">
                        {isFavorite(currentTool.slug) ? t("fav.remove") : t("fav.add")}
                      </span>
                    </button>
                  )}
                  <ToolShareBar />
                </div>
              </div>
            </header>

            <div className="animate-fade-up">{children}</div>

            <div className="mt-16 grid gap-10 border-t border-border pt-10 lg:grid-cols-[1fr_minmax(0,420px)]">
              {faqItems.length > 0 && (
                <section aria-labelledby="faq-title">
                  <h2
                    id="faq-title"
                    className="mb-4 text-[20px] font-semibold tracking-[-0.02em] text-t-primary"
                  >
                    {t("faq.title")}
                  </h2>
                  <div className="divide-y divide-border overflow-hidden rounded-[20px] border border-border bg-surface shadow-card">
                    {faqItems.map((item, index) => {
                      const open = openFaqIndices.has(index);
                      return (
                        <div key={index}>
                          <button
                            type="button"
                            onClick={() => toggleFaq(index)}
                            aria-expanded={open}
                            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start hover:bg-surface-hover"
                          >
                            <span className="text-[14.5px] font-medium text-t-primary">
                              {item.q}
                            </span>
                            <Plus
                              className={`h-4 w-4 shrink-0 text-t-tertiary transition-transform duration-200 ${
                                open ? "rotate-45" : ""
                              }`}
                              aria-hidden="true"
                            />
                          </button>
                          {open && (
                            <p className="px-5 pb-4 text-[14px] leading-relaxed text-t-secondary">
                              {item.a}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {(!toolFaqs || localizedRoute) && (
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
                  )}
                </section>
              )}

              <div className="space-y-10">
                {relatedTools.length > 0 && (
                  <section aria-labelledby="related-title">
                    <h2
                      id="related-title"
                      className="mb-4 text-[20px] font-semibold tracking-[-0.02em] text-t-primary"
                    >
                      {t("related.title")}
                    </h2>
                    <div className="grid gap-1 rounded-[20px] border border-border bg-surface p-2 shadow-card">
                      {relatedTools.slice(0, 4).map((tool) => (
                        <ToolCard key={tool.slug} tool={tool} />
                      ))}
                    </div>
                  </section>
                )}

                {showTrustPanel && (
                  <details className="group rounded-[20px] border border-border bg-surface px-5 py-4 shadow-card">
                    <summary className="flex cursor-pointer list-none items-center gap-2.5 text-[14.5px] font-medium text-t-primary [&::-webkit-details-marker]:hidden">
                      <Lock className="h-4 w-4 text-t-secondary" aria-hidden="true" />
                      <span className="flex-1">{t("trust.panelTitle")}</span>
                      <Plus
                        className="h-4 w-4 text-t-tertiary transition-transform group-open:rotate-45"
                        aria-hidden="true"
                      />
                    </summary>
                    <div className="mt-4">
                      <TrustPanel />
                    </div>
                  </details>
                )}
              </div>
            </div>

            <AdPlaceholder position="bottom" />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
