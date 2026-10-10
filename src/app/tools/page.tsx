"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ToolCard from "@/components/ToolCard";
import { tools, categoryEmojis, type ToolCategory } from "@/lib/tools";
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
    f === "all"
      ? t("tools.all")
      : f === "favorites"
        ? `★ ${t("nav.favorites")}`
        : `${categoryEmojis[f]} ${t(catKeys[f])}`;

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <div className="max-w-6xl mx-auto px-5 py-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-t-primary">
            {t("tools.title")}
          </h1>
          <p className="text-[14px] text-t-secondary mt-2 mb-7">
            {t("tools.subtitle", { count: tools.length })}
          </p>

          {/* Search + Filters */}
          <div className="sticky top-16 z-20 -mx-5 px-5 py-3 mb-6 bg-bg/85 backdrop-blur-xl">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="relative w-full lg:max-w-sm">
                <svg
                  className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-t-tertiary"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
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
                  className="w-full ps-10 pe-3 py-2.5 rounded-xl text-[14px] bg-surface border border-border text-t-primary placeholder:text-t-tertiary shadow-card focus:outline-none focus-visible:outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition"
                />
              </div>
              <div
                className="flex gap-1.5 overflow-x-auto scrollbar-hide"
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
                      className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12.5px] font-medium transition-colors ${
                        selected
                          ? "bg-accent text-white shadow-md shadow-accent/25"
                          : "bg-surface text-t-secondary hover:text-t-primary border border-border"
                      }`}
                    >
                      {filterLabel(cat)}
                      <span
                        className={`text-[11px] tabular-nums ${
                          selected ? "text-white/80" : "text-t-tertiary"
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
            <div className="text-center py-16">
              <p className="text-4xl mb-3" aria-hidden="true">
                🔍
              </p>
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
                className="mt-4 text-[13px] font-medium text-accent hover:underline"
              >
                {t("search.clear")}
              </button>
            </div>
          ) : grouped ? (
            grouped.map((g) => (
              <section key={g.category} className="mb-10" id={g.category}>
                <h2 className="flex items-center gap-2 text-[13px] font-semibold text-t-tertiary uppercase tracking-wider mb-3">
                  <span>{categoryEmojis[g.category]}</span>
                  {t(catKeys[g.category])}
                  <span className="text-[11px] font-medium normal-case tracking-normal bg-bg-secondary px-2 py-0.5 rounded-full">
                    {g.tools.length}
                  </span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {g.tools.map((tool) => (
                    <ToolCard key={tool.slug} tool={tool} />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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
