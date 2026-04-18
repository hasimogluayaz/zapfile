"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ToolCard from "@/components/ToolCard";
import ToolOfTheDay from "@/components/ToolOfTheDay";
import SuggestToolForm from "@/components/SuggestToolForm";
import { tools, categoryEmojis, getToolBySlug, type ToolCategory } from "@/lib/tools";
import { toolField } from "@/lib/tool-i18n";
import { useI18n } from "@/lib/i18n";
import { useRecentTools } from "@/hooks/useRecentTools";
import Link from "next/link";

const categories: ToolCategory[] = ["pdf", "image", "video", "utility"];
const catKeys: Record<ToolCategory, string> = {
  pdf: "cat.pdf",
  image: "cat.image",
  video: "cat.video",
  utility: "cat.utility",
};

export default function Home() {
  const { t } = useI18n();
  const { recentSlugs, ready: recentReady } = useRecentTools();
  const recentTools = recentSlugs
    .map((slug) => getToolBySlug(slug))
    .filter(Boolean) as NonNullable<ReturnType<typeof getToolBySlug>>[];

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-purple-500/5 blur-3xl" />
          </div>

          <div className="max-w-6xl mx-auto px-5 pt-20 pb-16 text-center relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent-light border border-accent/10 text-accent text-[12px] font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t("hero.badge")}
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-t-primary leading-tight">
              {t("hero.title1")} <br className="hidden sm:block" />
              <span className="gradient-text">{t("hero.title2")}</span>
              {t("hero.title3") ? ` ${t("hero.title3")}` : ""}
            </h1>

            <p className="mt-5 text-[16px] text-t-secondary max-w-lg mx-auto leading-relaxed">
              {t("hero.subtitle")}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/tools"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold bg-accent text-white hover:bg-accent-hover transition-all hover:shadow-lg hover:shadow-accent/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                {t("hero.cta")}
                <svg
                  className="w-4 h-4 rtl:rotate-180"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
              <span className="text-[13px] text-t-tertiary">
                {t("hero.toolCount", { count: tools.length })}
              </span>
            </div>

            {/* Trust badges */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-[12px] text-t-tertiary">
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-emerald-500"
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
                {t("hero.trust1")}
              </span>
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                {t("hero.trust2")}
              </span>
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                {t("hero.trust3")}
              </span>
            </div>
          </div>
        </section>

        {/* Tool of the Day */}
        <ToolOfTheDay />

        {/* Recent Tools */}
        {recentReady && recentTools.length > 0 && (
          <section className="max-w-6xl mx-auto px-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-accent"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h2 className="text-[16px] font-bold text-t-primary">
                  {t("recently.title")}
                </h2>
                <span className="text-[11px] text-t-tertiary bg-bg-secondary px-2 py-0.5 rounded-full font-medium">
                  {recentTools.length}
                </span>
              </div>
              <Link href="/tools" className="text-[12px] text-accent hover:underline font-medium">
                {t("hero.cta")} →
              </Link>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {recentTools.map((tool) => (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl bg-surface border border-border hover:border-accent/30 hover:shadow-card-hover hover:bg-accent/5 transition-all duration-200 min-w-[200px] max-w-[260px] group"
                >
                  <span className="text-xl group-hover:scale-110 transition-transform duration-200">{tool.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-t-primary truncate group-hover:text-accent transition-colors">
                      {toolField(t, tool.slug, tool, "name")}
                    </p>
                    <p className="text-[11px] text-t-tertiary truncate">
                      {toolField(t, tool.slug, tool, "desc")}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Category Nav Tabs */}
        <section className="max-w-6xl mx-auto px-5 pb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {categories.map((category) => (
              <a
                key={category}
                href={`#${category}`}
                className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-bg-secondary border border-border text-[13px] font-medium text-t-secondary hover:bg-accent hover:text-white hover:border-accent transition-all duration-150"
              >
                <span>{categoryEmojis[category]}</span>
                <span>{t(catKeys[category])}</span>
              </a>
            ))}
          </div>
        </section>

        {/* Tools */}
        <section className="max-w-6xl mx-auto px-5 pb-20">
          {categories.map((category) => {
            const categoryTools = tools.filter(
              (tool) => tool.category === category,
            );
            return (
              <div key={category} className="mb-12" id={category}>
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-xl">{categoryEmojis[category]}</span>
                  <h2 className="text-[20px] font-bold text-t-primary">
                    {t(catKeys[category])}
                  </h2>
                  <span className="text-[12px] text-t-tertiary bg-bg-secondary px-2 py-0.5 rounded-full font-medium">
                    {categoryTools.length}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {categoryTools.map((tool) => (
                    <ToolCard key={tool.slug} tool={tool} />
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* Privacy & Trust */}
        <section className="max-w-6xl mx-auto px-5 pb-20">
          {/* Privacy Hero Block */}
          <div className="glass rounded-2xl p-8 sm:p-12 text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[12px] font-medium mb-6">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {t("home.privacy.badge")}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-t-primary mb-10">
              {t("home.privacy.heading")}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Zero Uploads */}
              <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-bg-secondary/50">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 11v4m-2-2h4" />
                  </svg>
                </div>
                <h3 className="text-[15px] font-bold text-t-primary">
                  {t("home.privacy.zeroUploads.title")}
                </h3>
                <p className="text-[13px] text-t-secondary leading-relaxed">
                  {t("home.privacy.zeroUploads.desc")}
                </p>
              </div>

              {/* No Server Storage */}
              <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-bg-secondary/50">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                    <line x1="4" y1="4" x2="20" y2="20" strokeLinecap="round" strokeWidth={1.5} />
                  </svg>
                </div>
                <h3 className="text-[15px] font-bold text-t-primary">
                  {t("home.privacy.noServer.title")}
                </h3>
                <p className="text-[13px] text-t-secondary leading-relaxed">
                  {t("home.privacy.noServer.desc")}
                </p>
              </div>

              {/* No Account Required */}
              <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-bg-secondary/50">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 12l4-4m0 0l-4-4m4 4H14" />
                  </svg>
                </div>
                <h3 className="text-[15px] font-bold text-t-primary">
                  {t("home.privacy.noAccount.title")}
                </h3>
                <p className="text-[13px] text-t-secondary leading-relaxed">
                  {t("home.privacy.noAccount.desc")}
                </p>
              </div>
            </div>
          </div>

          {/* How It Works */}
          <div className="glass rounded-2xl p-8 sm:p-10 mb-8">
            <h3 className="text-[18px] font-bold text-t-primary text-center mb-8">
              {t("home.privacy.howTitle")}
            </h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
              {/* Step 1 */}
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-accent/10">
                <span className="w-7 h-7 rounded-full bg-accent text-white text-[13px] font-bold flex items-center justify-center">1</span>
                <span className="text-[14px] font-semibold text-accent">{t("home.privacy.step1")}</span>
              </div>
              {/* Arrow */}
              <svg className="w-5 h-5 text-t-tertiary hidden sm:block rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <svg className="w-5 h-5 text-t-tertiary sm:hidden rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              {/* Step 2 */}
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-accent/10">
                <span className="w-7 h-7 rounded-full bg-accent text-white text-[13px] font-bold flex items-center justify-center">2</span>
                <span className="text-[14px] font-semibold text-accent">{t("home.privacy.step2")}</span>
              </div>
              {/* Arrow */}
              <svg className="w-5 h-5 text-t-tertiary hidden sm:block rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              <svg className="w-5 h-5 text-t-tertiary sm:hidden rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
              {/* Step 3 */}
              <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-accent/10">
                <span className="w-7 h-7 rounded-full bg-accent text-white text-[13px] font-bold flex items-center justify-center">3</span>
                <span className="text-[14px] font-semibold text-accent">{t("home.privacy.step3")}</span>
              </div>
            </div>
            <p className="text-[13px] text-t-secondary text-center mt-6 max-w-lg mx-auto leading-relaxed">
              {t("home.privacy.howDesc")}
            </p>
          </div>

          {/* Comparison banner */}
          <div className="glass rounded-2xl px-6 py-5 flex items-center gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <p className="text-[14px] text-t-secondary leading-relaxed">
              {t("home.privacy.comparison")}
            </p>
          </div>
        </section>

        {/* Suggest a Tool */}
        <SuggestToolForm />

        {/* Bottom CTA */}
        <section className="border-t border-border bg-bg-secondary">
          <div className="max-w-6xl mx-auto px-5 py-16 text-center">
            <h3 className="text-2xl font-bold text-t-primary mb-3">
              {t("cta.title")}
            </h3>
            <p className="text-t-secondary text-[14px] mb-6 max-w-md mx-auto">
              {t("cta.subtitle", { count: tools.length })}
            </p>
            <Link
              href="/tools"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold bg-accent text-white hover:bg-accent-hover transition-all hover:shadow-lg hover:shadow-accent/20"
            >
              {t("hero.cta")}
              <svg
                className="w-4 h-4 rtl:rotate-180"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
