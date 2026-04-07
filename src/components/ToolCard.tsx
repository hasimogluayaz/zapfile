import Link from "next/link";
import type { Tool } from "@/lib/tools";
import { useI18n } from "@/lib/i18n";
import { toolField } from "@/lib/tool-i18n";

const toolColors: Record<string, { bg: string; icon: string }> = {
  // PDF — warm reds/oranges
  "compress-pdf":    { bg: "bg-red-100 dark:bg-red-900/20",    icon: "text-red-500" },
  "merge-pdf":       { bg: "bg-orange-100 dark:bg-orange-900/20", icon: "text-orange-500" },
  "split-pdf":       { bg: "bg-amber-100 dark:bg-amber-900/20",  icon: "text-amber-600" },
  "pdf-to-images":   { bg: "bg-rose-100 dark:bg-rose-900/20",   icon: "text-rose-500" },
  "rotate-pdf":      { bg: "bg-red-100 dark:bg-red-900/20",     icon: "text-red-400" },
  "pdf-page-numbers":{ bg: "bg-violet-100 dark:bg-violet-900/20", icon: "text-violet-500" },
  "pdf-to-word":     { bg: "bg-blue-100 dark:bg-blue-900/20",   icon: "text-blue-600" },
  "pdf-to-excel":    { bg: "bg-emerald-100 dark:bg-emerald-900/20", icon: "text-emerald-600" },
  "pdf-to-pptx":     { bg: "bg-orange-100 dark:bg-orange-900/20", icon: "text-orange-600" },
  "word-to-pdf":     { bg: "bg-red-100 dark:bg-red-900/20",     icon: "text-red-500" },
  // Image — blues/purples/greens
  "compress-image":  { bg: "bg-blue-100 dark:bg-blue-900/20",   icon: "text-blue-500" },
  "resize-image":    { bg: "bg-sky-100 dark:bg-sky-900/20",     icon: "text-sky-500" },
  "convert-image":   { bg: "bg-violet-100 dark:bg-violet-900/20", icon: "text-violet-500" },
  "crop-image":      { bg: "bg-pink-100 dark:bg-pink-900/20",   icon: "text-pink-500" },
  "rotate-image":    { bg: "bg-cyan-100 dark:bg-cyan-900/20",   icon: "text-cyan-500" },
  "watermark-image": { bg: "bg-indigo-100 dark:bg-indigo-900/20", icon: "text-indigo-500" },
  "image-to-pdf":    { bg: "bg-purple-100 dark:bg-purple-900/20", icon: "text-purple-500" },
  "blur-image":      { bg: "bg-slate-100 dark:bg-slate-900/20", icon: "text-slate-500" },
  "favicon-generator":{ bg: "bg-yellow-100 dark:bg-yellow-900/20", icon: "text-yellow-600" },
  ocr:               { bg: "bg-cyan-100 dark:bg-cyan-900/20",   icon: "text-cyan-600" },
  // Audio
  "audio-waveform":  { bg: "bg-indigo-100 dark:bg-indigo-900/20", icon: "text-indigo-500" },
  // Utilities
  "qr-generator":    { bg: "bg-fuchsia-100 dark:bg-fuchsia-900/20", icon: "text-fuchsia-500" },
  "svg-to-png":      { bg: "bg-orange-100 dark:bg-orange-900/20", icon: "text-orange-500" },
  "base64-encode":   { bg: "bg-slate-100 dark:bg-slate-900/20", icon: "text-slate-500" },
  "color-picker":    { bg: "bg-violet-100 dark:bg-violet-900/20", icon: "text-violet-500" },
  "json-formatter":  { bg: "bg-yellow-100 dark:bg-yellow-900/20", icon: "text-yellow-600" },
  "hash-generator":  { bg: "bg-gray-100 dark:bg-gray-900/20",   icon: "text-gray-500" },
  "word-counter":    { bg: "bg-blue-100 dark:bg-blue-900/20",   icon: "text-blue-500" },
  "ascii-art":       { bg: "bg-stone-100 dark:bg-stone-900/20", icon: "text-stone-600" },
};

const defaultColor = { bg: "bg-indigo-100 dark:bg-indigo-900/20", icon: "text-indigo-500" };

export default function ToolCard({ tool }: { tool: Tool }) {
  const colors = toolColors[tool.slug] ?? defaultColor;
  const { t } = useI18n();

  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-surface border border-border hover:border-accent/30 hover:shadow-card-hover transition-all duration-200 text-center min-h-[110px] justify-center"
    >
      <div
        className={`w-14 h-14 rounded-2xl ${colors.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}
      >
        <span className="text-3xl leading-none">{tool.emoji}</span>
      </div>
      <p className="text-[13px] font-semibold text-t-primary group-hover:text-accent transition-colors leading-snug w-full line-clamp-2">
        {toolField(t, tool.slug, tool, "name")}
      </p>
    </Link>
  );
}
