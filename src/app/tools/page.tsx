"use client";

import { useState, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ToolCard from "@/components/ToolCard";
import { tools, categoryLabels, categoryEmojis, type ToolCategory } from "@/lib/tools";

const categories: ToolCategory[] = ["pdf", "image", "video", "utility"];

export default function ToolsPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<ToolCategory | "all">("all");

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const q = search.toLowerCase();
      const matchesSearch = !q || tool.name.toLowerCase().includes(q) || tool.description.toLowerCase().includes(q);
      const matchesCat = activeCategory === "all" || tool.category === activeCategory;
      return matchesSearch && matchesCat;
    });
  }, [search, activeCategory]);

  const grouped = useMemo(() => {
    if (activeCategory !== "all" || search) return null;
    return categories
      .map((c) => ({ category: c, tools: filteredTools.filter((t) => t.category === c) }))
      .filter((g) => g.tools.length > 0);
  }, [filteredTools, activeCategory, search]);

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-5 py-10">
          <h1 className="text-xl font-semibold text-t-primary">All Tools</h1>
          <p className="text-[13px] text-t-secondary mt-1 mb-6">
            {tools.length} tools, all free and private.
          </p>

          {/* Search + Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-t-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg text-[13px] bg-bg-secondary border border-border text-t-primary placeholder:text-t-tertiary focus:outline-none focus:border-accent transition-colors"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(["all", ...categories] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                    activeCategory === cat
                      ? "bg-accent text-white"
                      : "bg-bg-secondary text-t-secondary hover:text-t-primary border border-border"
                  }`}
                >
                  {cat === "all" ? "All" : `${categoryEmojis[cat]} ${categoryLabels[cat]}`}
                </button>
              ))}
            </div>
          </div>

          {/* Results */}
          {filteredTools.length === 0 ? (
            <p className="text-center text-t-tertiary text-[13px] py-12">
              No tools match &ldquo;{search}&rdquo;
            </p>
          ) : grouped ? (
            grouped.map((g) => (
              <div key={g.category} className="mb-8">
                <h2 className="text-[12px] font-semibold text-t-tertiary uppercase tracking-wider mb-2.5">
                  {categoryEmojis[g.category]} {categoryLabels[g.category]}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {g.tools.map((tool) => <ToolCard key={tool.slug} tool={tool} />)}
                </div>
              </div>
            ))
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {filteredTools.map((tool) => <ToolCard key={tool.slug} tool={tool} />)}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
