import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ToolCard from "@/components/ToolCard";
import { tools, categoryLabels, categoryEmojis, type ToolCategory } from "@/lib/tools";
import Link from "next/link";

const categories: ToolCategory[] = ["pdf", "image", "video", "utility"];

export default function Home() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="max-w-5xl mx-auto px-5 pt-16 pb-12 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-t-primary">
            The file tools you{" "}
            <span className="gradient-text">actually want</span> to use
          </h1>
          <p className="mt-3 text-[15px] text-t-secondary max-w-md mx-auto leading-relaxed">
            Fast, private, and free. Everything runs in your browser &mdash; no uploads, no accounts.
          </p>
          <div className="mt-6 flex items-center justify-center gap-5 text-[12px] text-t-tertiary">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              100% Private
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              Instant
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              No Limits
            </span>
          </div>
        </section>

        {/* Tools */}
        <section className="max-w-5xl mx-auto px-5 pb-20">
          {categories.map((category) => {
            const categoryTools = tools.filter((t) => t.category === category);
            return (
              <div key={category} className="mb-10">
                <h2 className="text-[13px] font-semibold text-t-secondary uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span>{categoryEmojis[category]}</span>
                  {categoryLabels[category]}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {categoryTools.map((tool) => (
                    <ToolCard key={tool.slug} tool={tool} />
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* Bottom CTA */}
        <section className="border-t border-border">
          <div className="max-w-5xl mx-auto px-5 py-14 text-center">
            <p className="text-t-secondary text-[14px] mb-4">
              {tools.length} free tools, zero sign-ups.
            </p>
            <Link
              href="/tools"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-[13px] font-medium bg-accent text-white hover:bg-accent-hover transition-colors"
            >
              Browse All Tools
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
