"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import type { Tool } from "@/lib/tools";
import { useI18n } from "@/lib/i18n";
import { toolField } from "@/lib/tool-i18n";
import { useFavoriteTools } from "@/hooks/useFavoriteTools";
import ToolIcon from "@/components/ToolIcon";

export default function ToolCard({ tool }: { tool: Tool }) {
  const { t, toolHref } = useI18n();
  const { isFavorite, toggleFavorite, ready } = useFavoriteTools();
  const name = toolField(t, tool.slug, tool, "name");
  const desc = toolField(t, tool.slug, tool, "desc");
  const fav = ready && isFavorite(tool.slug);

  return (
    <div className="group relative">
      <Link
        href={toolHref(tool.slug)}
        className="flex h-full items-start gap-3.5 rounded-2xl p-3 pe-10 transition-colors hover:bg-bg-secondary active:bg-bg-tertiary"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-t-primary shadow-sm transition-colors group-hover:border-transparent group-hover:bg-t-primary group-hover:text-bg">
          <ToolIcon slug={tool.slug} className="h-[19px] w-[19px]" />
        </span>
        <span className="min-w-0 pt-0.5">
          <span className="block text-[14.5px] font-semibold leading-snug tracking-[-0.01em] text-t-primary">
            {name}
          </span>
          <span className="mt-0.5 line-clamp-2 block text-[13px] leading-snug text-t-tertiary">
            {desc}
          </span>
        </span>
      </Link>

      {ready && (
        <button
          type="button"
          onClick={() => toggleFavorite(tool.slug)}
          aria-pressed={fav}
          aria-label={`${fav ? t("fav.remove") : t("fav.add")}: ${name}`}
          title={fav ? t("fav.remove") : t("fav.add")}
          className={`absolute end-2 top-2.5 flex h-8 w-8 items-center justify-center rounded-full transition-opacity hover:bg-surface ${
            fav
              ? "opacity-100"
              : "opacity-100 sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
          }`}
        >
          <Star
            className={`h-4 w-4 ${fav ? "fill-volt text-volt-ink" : "text-t-tertiary"}`}
            strokeWidth={2}
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  );
}
