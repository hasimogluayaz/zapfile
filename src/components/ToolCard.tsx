import Link from "next/link";
import type { Tool } from "@/lib/tools";
import { useI18n } from "@/lib/i18n";
import { toolField } from "@/lib/tool-i18n";

const toolColors: Record<string, { bg: string; ring: string }> = {
  // PDF — warm reds/oranges
  "compress-pdf":     { bg: "from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/20",    ring: "from-red-400 to-orange-400" },
  "merge-pdf":        { bg: "from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/20", ring: "from-orange-400 to-amber-400" },
  "split-pdf":        { bg: "from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/20", ring: "from-amber-400 to-yellow-400" },
  "pdf-to-images":    { bg: "from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/20",   ring: "from-rose-400 to-pink-400" },
  "rotate-pdf":       { bg: "from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/20",     ring: "from-red-400 to-rose-400" },
  "pdf-page-numbers": { bg: "from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/20", ring: "from-violet-400 to-purple-400" },
  // Image — blues/purples/greens
  "compress-image":   { bg: "from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/20",   ring: "from-blue-400 to-cyan-400" },
  "resize-image":     { bg: "from-sky-100 to-blue-100 dark:from-sky-900/30 dark:to-blue-900/20",     ring: "from-sky-400 to-blue-400" },
  "convert-image":    { bg: "from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/20", ring: "from-violet-400 to-indigo-400" },
  "crop-image":       { bg: "from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/20",   ring: "from-pink-400 to-rose-400" },
  "rotate-image":     { bg: "from-cyan-100 to-teal-100 dark:from-cyan-900/30 dark:to-teal-900/20",   ring: "from-cyan-400 to-teal-400" },
  "watermark-image":  { bg: "from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/20", ring: "from-indigo-400 to-violet-400" },
  "image-to-pdf":     { bg: "from-purple-100 to-fuchsia-100 dark:from-purple-900/30 dark:to-fuchsia-900/20", ring: "from-purple-400 to-fuchsia-400" },
  "blur-image":       { bg: "from-slate-100 to-gray-100 dark:from-slate-800/40 dark:to-gray-800/30", ring: "from-slate-400 to-gray-400" },
  "favicon-generator":{ bg: "from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/20", ring: "from-yellow-400 to-amber-400" },
  // Utilities
  "qr-generator":     { bg: "from-fuchsia-100 to-pink-100 dark:from-fuchsia-900/30 dark:to-pink-900/20", ring: "from-fuchsia-400 to-pink-400" },
  "svg-to-png":       { bg: "from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/20",    ring: "from-orange-400 to-red-400" },
  "color-picker":     { bg: "from-violet-100 to-fuchsia-100 dark:from-violet-900/30 dark:to-fuchsia-900/20", ring: "from-violet-400 to-fuchsia-400" },
  "json-formatter":   { bg: "from-yellow-100 to-lime-100 dark:from-yellow-900/30 dark:to-lime-900/20",  ring: "from-yellow-400 to-lime-400" },
  "hash-generator":   { bg: "from-gray-100 to-slate-100 dark:from-gray-800/40 dark:to-slate-800/30",   ring: "from-gray-400 to-slate-400" },
  "word-counter":     { bg: "from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/20",   ring: "from-blue-400 to-indigo-400" },
  "audio-waveform":   { bg: "from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/20", ring: "from-indigo-400 to-purple-400" },
};

const defaultColor = { bg: "from-indigo-100 to-violet-100 dark:from-indigo-900/30 dark:to-violet-900/20", ring: "from-indigo-400 to-violet-400" };

export default function ToolCard({ tool }: { tool: Tool }) {
  const colors = toolColors[tool.slug] ?? defaultColor;
  const { t } = useI18n();
  const name = toolField(t, tool.slug, tool, "name");
  const desc = toolField(t, tool.slug, tool, "desc");

  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="card-premium group relative flex flex-col items-center gap-3 p-5 text-center min-h-[140px] justify-center"
      aria-label={name}
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
          <span className="text-3xl leading-none drop-shadow-sm">{tool.emoji}</span>
        </div>
      </div>

      <p className="text-[13px] font-semibold text-t-primary group-hover:text-accent transition-colors leading-snug w-full line-clamp-2">
        {name}
      </p>
    </Link>
  );
}
