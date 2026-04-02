"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ToolCard from "@/components/ToolCard";
import { tools, categoryEmojis, type ToolCategory } from "@/lib/tools";
import { useI18n } from "@/lib/i18n";
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

  return (
    <>
      <Header />
      <main className="flex-1">
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
              <span className="gradient-text">{t("hero.title2")}</span>{" "}
              {t("hero.title3") && t("hero.title3")}
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
                  className="w-4 h-4"
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
                  <h2 className="text-[18px] font-bold text-t-primary">
                    {t(catKeys[category])}
                  </h2>
                  <span className="text-[12px] text-t-tertiary bg-bg-secondary px-2 py-0.5 rounded-full">
                    {categoryTools.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {categoryTools.map((tool) => (
                    <ToolCard key={tool.slug} tool={tool} />
                  ))}
                </div>
              </div>
            );
          })}
        </section>

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
                className="w-4 h-4"
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
