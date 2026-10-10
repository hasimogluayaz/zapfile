"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ToolCard from "@/components/ToolCard";
import { Search, SearchX, Star } from "lucide-react";
import { tools, type ToolCategory } from "@/lib/tools";
import { CategoryIcon } from "@/components/ToolIcon";
import { useI18n } from "@/lib/i18n";
import { searchTools } from "@/lib/search";
import { useFavoriteTools } from "@/hooks/useFavoriteTools";

const categories: ToolCategory[] = ["pdf", "image", "video", "utility"];
const catKeys: Record<ToolCategory, string> = {
  pdf: "cat.pdf",
  image: "cat.image",
  video: "cat.video",
  utility: "cat.utility",
};

type Filter = ToolCategory | "all" | "favorites";

function isFilter(value: string | null): value is Filter {
  return (
    value === "all" ||
    value === "favorites" ||
    categories.includes(value as ToolCategory)
  );
}

export default function ToolsPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<Filter>("all");
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();
  const { favorites, ready: favReady } = useFavoriteTools();

  // Restore ?q= / ?cat= so filtered views can be shared and survive reloads.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    const cat = params.get("cat");
    if (q) setSearch(q);
    if (isFilter(cat)) setActiveCategory(cat);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (search.trim()) params.set("q", search.trim());
    else params.delete("q");
    if (activeCategory !== "all") params.set("cat", activeCategory);
    else params.delete("cat");
    const qs = params.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(window.history.state, "", next);
    }
  }, [search, activeCategory]);

  const filteredTools = useMemo(() => {
    const scoped = tools.filter((tool) =>
      activeCategory === "all"
        ? true
        : activeCategory === "favorites"
          ? favorites.includes(tool.slug)
          : tool.category === activeCategory,
    );
    return searchTools(scoped, search, t);
  }, [search, activeCategory, favorites, t]);

  const grouped = useMemo(() => {
    if (activeCategory !== "all" || search.trim()) return null;
    return categories
      .map((c) => ({
        category: c,
        tools: filteredTools.filter((tool) => tool.category === c),
      }))
      .filter((g) => g.tools.length > 0);
  }, [filteredTools, activeCategory, search]);

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: tools.length };
    for (const c of categories) {
      out[c] = tools.filter((tool) => tool.category === c).length;
    }
    out.favorites = favorites.length;
    return out;
  }, [favorites]);

  const filters: Filter[] = [
    "all",
    ...(favReady && favorites.length > 0 ? (["favorites"] as const) : []),
    ...categories,
  ];

  const filterLabel = (f: Filter) =>
    f === "all" ? (
      t("tools.all")
    ) : f === "favorites" ? (
      <>
        <Star className="h-3.5 w-3.5 fill-volt text-volt-ink" aria-hidden="true" />
        {t("nav.favorites")}
      </>
    ) : (
      <>
        <CategoryIcon category={f} className="h-3.5 w-3.5" />
        {t(catKeys[f])}
      </>
    );

  const panel =
    "grid grid-cols-1 gap-1 rounded-[24px] border border-border bg-surface p-2 shadow-card sm:grid-cols-2 lg:grid-cols-3";

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16">
          <h1 className="text-[40px] font-semibold leading-none tracking-[-0.04em] text-t-primary sm:text-[52px]">
            {t("tools.title")}
          </h1>
          <p className="mb-8 mt-4 text-[16px] text-t-secondary">
            {t("tools.subtitle", { count: tools.length })}
          </p>

          {/* Search + Filters */}
          <div className="sticky top-14 z-20 -mx-4 mb-8 bg-bg/85 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="relative w-full lg:max-w-sm">
                <Search className="absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-t-tertiary" strokeWidth={2} aria-hidden="true" />
                <input
                  ref={inputRef}
                  type="search"
                  placeholder={t("search.placeholder")}
                  aria-label={t("a11y.searchTools")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setSearch("");
                  }}
                  className="w-full rounded-full border border-border bg-surface py-2.5 pe-4 ps-10 text-[15px] text-t-primary shadow-sm transition placeholder:text-t-tertiary focus:border-t-primary/40 focus:outline-none focus-visible:outline-none focus-visible:shadow-none"
                />
              </div>
              <div
                className="segmented max-w-full overflow-x-auto scrollbar-hide"
                role="tablist"
                aria-label={t("tools.title")}
              >
                {filters.map((cat) => {
                  const selected = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setActiveCategory(cat)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
                        selected
                          ? "bg-surface text-t-primary shadow-sm"
                          : "text-t-secondary hover:text-t-primary"
                      }`}
                    >
                      {filterLabel(cat)}
                      <span
                        className={`text-[11px] tabular-nums ${
                          "text-t-tertiary"
                        }`}
                      >
                        {counts[cat]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {search.trim() && filteredTools.length > 0 && (
            <p className="text-[12px] text-t-tertiary mb-4" aria-live="polite">
              {t("search.resultCount", { count: filteredTools.length })}
            </p>
          )}

          {/* Results */}
          {filteredTools.length === 0 ? (
            <div className="rounded-[24px] border border-border bg-surface px-6 py-16 text-center">
              <SearchX className="mx-auto mb-4 h-8 w-8 text-t-tertiary" strokeWidth={1.5} aria-hidden="true" />
              <p className="text-t-secondary text-[14px]">
                {search.trim()
                  ? t("tools.noResults", { query: search })
                  : t("nav.noResults")}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActiveCategory("all");
                  inputRef.current?.focus();
                }}
                className="mt-5 rounded-full bg-t-primary px-4 py-2 text-[13px] font-semibold text-bg"
              >
                {t("search.clear")}
              </button>
            </div>
          ) : grouped ? (
            grouped.map((g) => (
              <section key={g.category} className="mb-12 scroll-mt-32" id={g.category}>
                <h2 className="mb-3 flex items-center gap-2.5 px-1 text-[17px] font-semibold tracking-[-0.015em] text-t-primary">
                  <CategoryIcon category={g.category} className="h-[18px] w-[18px]" />
                  {t(catKeys[g.category])}
                  <span className="text-[13px] font-normal tabular-nums text-t-tertiary">
                    {g.tools.length}
                  </span>
                </h2>
                <div className={panel}>
                  {g.tools.map((tool) => (
                    <ToolCard key={tool.slug} tool={tool} />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className={panel}>
              {filteredTools.map((tool) => (
                <ToolCard key={tool.slug} tool={tool} />
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
