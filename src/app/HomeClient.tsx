"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { EyeOff, HardDrive, ServerOff, UserX } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ToolCard from "@/components/ToolCard";
import DropPad from "@/components/DropPad";
import SuggestToolForm from "@/components/SuggestToolForm";
import ToolIcon, { CategoryIcon } from "@/components/ToolIcon";
import Illustration from "@/components/Illustration";
import { tools, getToolBySlug, type Tool, type ToolCategory } from "@/lib/tools";
import { toolField } from "@/lib/tool-i18n";
import { useI18n } from "@/lib/i18n";
import { useRecentTools } from "@/hooks/useRecentTools";
import { useFavoriteTools } from "@/hooks/useFavoriteTools";
import { searchTools } from "@/lib/search";

const categories: ToolCategory[] = ["pdf", "image", "video", "utility"];
const catKeys: Record<ToolCategory, string> = {
  pdf: "cat.pdf",
  image: "cat.image",
  video: "cat.video",
  utility: "cat.utility",
};

function bySlugs(slugs: string[]): Tool[] {
  return slugs
    .map((slug) => getToolBySlug(slug))
    .filter((tool): tool is Tool => Boolean(tool));
}

export default function Home() {
  const { t, toolHref } = useI18n();
  const { recentSlugs, ready: recentReady } = useRecentTools();
  const { favorites, ready: favReady } = useFavoriteTools();
  const [query, setQuery] = useState("");

  const searching = query.trim().length > 0;
  const searchResults = useMemo(
    () => (searching ? searchTools(tools, query, t) : []),
    [searching, query, t],
  );

  // Favorites first, then recently used, without duplicates.
  const yourTools = useMemo(() => {
    if (!favReady || !recentReady) return [];
    const favSet = new Set(favorites);
    return [
      ...bySlugs(favorites).map((tool) => ({ tool, fav: true })),
      ...bySlugs(recentSlugs.filter((s) => !favSet.has(s))).map((tool) => ({
        tool,
        fav: false,
      })),
    ].slice(0, 10);
  }, [favorites, recentSlugs, favReady, recentReady]);

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-12 sm:px-6 sm:pt-20 lg:grid-cols-[1fr_minmax(0,500px)] lg:gap-16 lg:pb-20 lg:pt-24">
          <div className="animate-fade-up">
            <h1 className="max-w-[13ch] text-[42px] font-semibold leading-[1.02] tracking-[-0.045em] text-t-primary sm:text-[60px] lg:text-[68px]">
              {t("home.hero.title")}
            </h1>
            <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-t-secondary sm:text-[18px]">
              {t("home.hero.subtitle", { count: tools.length })}
            </p>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-[13.5px] text-t-secondary">
              <li className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-t-primary" strokeWidth={1.75} aria-hidden="true" />
                {t("hero.trust1")}
              </li>
              <li className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-t-primary" strokeWidth={1.75} aria-hidden="true" />
                {t("home.privacy.noAccount.title")}
              </li>
            </ul>
          </div>
          <DropPad query={query} onQueryChange={setQuery} />
        </section>

        {/* Your tools: favorites + recent */}
        {!searching && yourTools.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6" aria-labelledby="your-tools">
            <h2 id="your-tools" className="mb-3 text-[15px] font-semibold text-t-primary">
              {t("home.yourTools")}
            </h2>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-hide sm:mx-0 sm:flex-wrap sm:px-0">
              {yourTools.map(({ tool, fav }) => (
                <Link
                  key={tool.slug}
                  href={toolHref(tool.slug)}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-border bg-surface py-1.5 pe-3.5 ps-1.5 text-[13.5px] font-medium text-t-primary shadow-sm transition-colors hover:border-t-primary/25"
                >
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${
                      fav ? "volt-mark" : "bg-bg-secondary"
                    }`}
                  >
                    <ToolIcon slug={tool.slug} className="h-3.5 w-3.5" />
                  </span>
                  {toolField(t, tool.slug, tool, "name")}
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Search results */}
        {searching && (
          <section
            id="all-tools"
            className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-20 sm:px-6"
            aria-live="polite"
          >
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-t-primary">
                {t("search.resultCount", { count: searchResults.length })}
              </h2>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-[13.5px] font-medium text-t-secondary underline-offset-4 hover:text-t-primary hover:underline"
              >
                {t("search.clear")}
              </button>
            </div>
            {searchResults.length > 0 ? (
              <div className="grid grid-cols-1 gap-1 rounded-[24px] border border-border bg-surface p-2 shadow-card sm:grid-cols-2 lg:grid-cols-3">
                {searchResults.map((tool) => (
                  <ToolCard key={tool.slug} tool={tool} />
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-border bg-surface px-6 py-12 text-center">
                <Illustration name="no-results" size={150} className="mb-5" />
                <p className="text-[14px] text-t-secondary">{t("tools.noResults", { query })}</p>
              </div>
            )}
          </section>
        )}

        {/* Directory */}
        <section
          id={searching ? undefined : "all-tools"}
          className={`mx-auto max-w-6xl scroll-mt-20 px-4 pb-20 sm:px-6 ${searching ? "hidden" : ""}`}
        >
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-t border-border pt-10">
            <h2 className="text-[28px] font-semibold tracking-[-0.03em] text-t-primary sm:text-[34px]">
              {t("nav.allTools")}
            </h2>
            <nav className="segmented" aria-label={t("nav.allTools")}>
              {categories.map((category) => (
                <a
                  key={category}
                  href={`#${category}`}
                  aria-label={t(catKeys[category])}
                  className="flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[13px] font-medium text-t-secondary transition-colors hover:bg-surface hover:text-t-primary hover:shadow-sm"
                >
                  <CategoryIcon category={category} className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t(catKeys[category])}</span>
                </a>
              ))}
            </nav>
          </div>

          <div className="space-y-12">
            {categories.map((category) => {
              const categoryTools = tools.filter((tool) => tool.category === category);
              return (
                <div key={category} id={category} className="scroll-mt-20">
                  <div className="mb-3 flex items-center gap-2.5 px-1">
                    <CategoryIcon category={category} className="h-[18px] w-[18px] text-t-primary" />
                    <h3 className="text-[17px] font-semibold tracking-[-0.015em] text-t-primary">
                      {t(catKeys[category])}
                    </h3>
                    <span className="text-[13px] tabular-nums text-t-tertiary">
                      {categoryTools.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-1 rounded-[24px] border border-border bg-surface p-2 shadow-card sm:grid-cols-2 lg:grid-cols-3">
                    {categoryTools.map((tool) => (
                      <ToolCard key={tool.slug} tool={tool} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Privacy: the reason ZapFile exists */}
        <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <div className="overflow-hidden rounded-[32px] bg-ink px-6 py-12 text-white ring-1 ring-white/5 sm:px-12 sm:py-16">
            <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
              <div>
                <h2 className="max-w-[16ch] text-[30px] font-semibold leading-[1.08] tracking-[-0.035em] sm:text-[40px]">
                  {t("home.privacy.heading")}
                </h2>
                <p className="mt-5 max-w-[44ch] text-[15px] leading-relaxed text-white/65">
                  {t("home.privacy.howDesc")}
                </p>
              </div>
              <ul className="grid gap-8 sm:grid-cols-3 lg:gap-6">
                {[
                  { Icon: EyeOff, title: "home.privacy.zeroUploads.title", desc: "home.privacy.zeroUploads.desc" },
                  { Icon: ServerOff, title: "home.privacy.noServer.title", desc: "home.privacy.noServer.desc" },
                  { Icon: UserX, title: "home.privacy.noAccount.title", desc: "home.privacy.noAccount.desc" },
                ].map(({ Icon, title, desc }) => (
                  <li key={title}>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-volt text-ink">
                      <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
                    </span>
                    <h3 className="mt-4 text-[15px] font-semibold">{t(title)}</h3>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-white/60">{t(desc)}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <SuggestToolForm />
      </main>
      <Footer />
    </>
  );
}
