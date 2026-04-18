"use client";

import Link from "next/link";
import { tools } from "@/lib/tools";
import { toolField } from "@/lib/tool-i18n";
import { useI18n } from "@/lib/i18n";

/**
 * Picks a deterministic "tool of the day" based on the current date.
 * Changes every day, same tool for all visitors on a given day.
 */
function getTodaysTool() {
  const now = new Date();
  const dayOfYear =
    Math.floor(
      (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) /
        86400000
    ) - 1;
  return tools[dayOfYear % tools.length];
}

export default function ToolOfTheDay() {
  const { t } = useI18n();
  const tool = getTodaysTool();

  if (!tool) return null;

  return (
    <section className="max-w-6xl mx-auto px-5 pb-8">
      <Link
        href={`/tools/${tool.slug}`}
        className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-accent/10 via-purple-500/5 to-transparent border border-accent/20 hover:border-accent/40 transition-all duration-200 hover:shadow-lg hover:shadow-accent/5"
      >
        {/* Badge */}
        <div className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/20 text-accent text-[11px] font-semibold self-start">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          {t("home.toolOfDay") || "Tool of the Day"}
        </div>

        {/* Tool info */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <span className="text-3xl shrink-0">{tool.emoji}</span>
          <div className="min-w-0">
            <p className="font-bold text-t-primary text-[15px] group-hover:text-accent transition-colors">
              {toolField(t, tool.slug, tool, "name")}
            </p>
            <p className="text-[13px] text-t-secondary mt-0.5 truncate">
              {toolField(t, tool.slug, tool, "desc")}
            </p>
          </div>
        </div>

        {/* Arrow */}
        <svg
          className="w-5 h-5 text-t-tertiary group-hover:text-accent group-hover:translate-x-1 transition-all duration-200 shrink-0 hidden sm:block rtl:rotate-180"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </Link>
    </section>
  );
}
