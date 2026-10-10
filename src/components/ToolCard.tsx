"use client";

import Link from "next/link";
import type { Tool, ToolCategory } from "@/lib/tools";
import { useI18n } from "@/lib/i18n";
import { toolField } from "@/lib/tool-i18n";
import { useFavoriteTools } from "@/hooks/useFavoriteTools";

type Palette = { bg: string; ring: string };

// Each category gets a family of hues; tools pick one deterministically by slug.
const palettes: Record<ToolCategory, Palette[]> = {
  pdf: [
    { bg: "from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/20", ring: "from-red-400 to-orange-400" },
    { bg: "from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/20", ring: "from-orange-400 to-amber-400" },
    { bg: "from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/20", ring: "from-rose-400 to-pink-400" },
    { bg: "from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/20", ring: "from-amber-400 to-yellow-400" },
  ],
  image: [
    { bg: "from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/20", ring: "from-blue-400 to-cyan-400" },
    { bg: "from-sky-100 to-indigo-100 dark:from-sky-900/30 dark:to-indigo-900/20", ring: "from-sky-400 to-indigo-400" },
    { bg: "from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/20", ring: "from-violet-400 to-purple-400" },
    { bg: "from-cyan-100 to-teal-100 dark:from-cyan-900/30 dark:to-teal-900/20", ring: "from-cyan-400 to-teal-400" },
  ],
  video: [
    { bg: "from-fuchsia-100 to-pink-100 dark:from-fuchsia-900/30 dark:to-pink-900/20", ring: "from-fuchsia-400 to-pink-400" },
    { bg: "from-purple-100 to-fuchsia-100 dark:from-purple-900/30 dark:to-fuchsia-900/20", ring: "from-purple-400 to-fuchsia-400" },
  ],
  utility: [
    { bg: "from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/20", ring: "from-emerald-400 to-teal-400" },
    { bg: "from-lime-100 to-emerald-100 dark:from-lime-900/30 dark:to-emerald-900/20", ring: "from-lime-400 to-emerald-400" },
    { bg: "from-teal-100 to-sky-100 dark:from-teal-900/30 dark:to-sky-900/20", ring: "from-teal-400 to-sky-400" },
    { bg: "from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/20", ring: "from-indigo-400 to-violet-400" },
    { bg: "from-slate-100 to-gray-100 dark:from-slate-800/40 dark:to-gray-800/30", ring: "from-slate-400 to-gray-400" },
  ],
};

function paletteFor(tool: Tool): Palette {
  const family = palettes[tool.category] ?? palettes.utility;
  let hash = 0;
  for (let i = 0; i < tool.slug.length; i++) {
    hash = (hash * 31 + tool.slug.charCodeAt(i)) >>> 0;
  }
  return family[hash % family.length]!;
}

export default function ToolCard({ tool }: { tool: Tool }) {
  const colors = paletteFor(tool);
  const { t } = useI18n();
  const { isFavorite, toggleFavorite, ready } = useFavoriteTools();
  const name = toolField(t, tool.slug, tool, "name");
  const desc = toolField(t, tool.slug, tool, "desc");
  const fav = ready && isFavorite(tool.slug);

  return (
    <div className="card-premium group relative min-h-[140px]">
      <Link
        href={`/tools/${tool.slug}`}
        className="flex h-full flex-col items-center justify-center gap-3 p-5 text-center"
        title={desc}
      >
        {/* Icon with gradient halo */}
        <div className="relative">
          <div
            className={`absolute inset-0 -m-1 rounded-2xl bg-gradient-to-br ${colors.ring} opacity-0 blur-md group-hover:opacity-60 transition-opacity duration-300`}
            aria-hidden="true"
          />
          <div
            className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${colors.bg} flex items-center justify-center group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]`}
          >
            <span className="text-3xl leading-none drop-shadow-sm" aria-hidden="true">
              {tool.emoji}
            </span>
          </div>
        </div>

        <p className="text-[13px] font-semibold text-t-primary group-hover:text-accent transition-colors leading-snug w-full line-clamp-2">
          {name}
        </p>
      </Link>

      {ready && (
        <button
          type="button"
          onClick={() => toggleFavorite(tool.slug)}
          aria-pressed={fav}
          aria-label={`${fav ? t("fav.remove") : t("fav.add")}: ${name}`}
          title={fav ? t("fav.remove") : t("fav.add")}
          className={`absolute top-2 end-2 z-[1] flex h-7 w-7 items-center justify-center rounded-full text-[15px] leading-none transition-all ${
            fav
              ? "text-amber-500 opacity-100"
              : "text-t-tertiary opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 hover:text-amber-500"
          } hover:bg-bg-secondary`}
        >
          {fav ? "★" : "☆"}
        </button>
      )}
    </div>
  );
}
