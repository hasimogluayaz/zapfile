import Link from "next/link";
import type { Tool } from "@/lib/tools";
import { useI18n } from "@/lib/i18n";

// Color map for each tool category + specific tools for variety
const toolColors: Record<string, { bg: string; text: string }> = {
  // PDF tools — warm reds/oranges
  "compress-pdf": { bg: "bg-red-50", text: "text-red-500" },
  "merge-pdf": { bg: "bg-orange-50", text: "text-orange-500" },
  "split-pdf": { bg: "bg-amber-50", text: "text-amber-600" },
  "pdf-to-images": { bg: "bg-rose-50", text: "text-rose-500" },
  "rotate-pdf": { bg: "bg-red-50", text: "text-red-400" },
  // Image tools — blues/purples/greens
  "compress-image": { bg: "bg-blue-50", text: "text-blue-500" },
  "resize-image": { bg: "bg-sky-50", text: "text-sky-500" },
  "convert-image": { bg: "bg-violet-50", text: "text-violet-500" },
  "crop-image": { bg: "bg-pink-50", text: "text-pink-500" },
  "rotate-image": { bg: "bg-cyan-50", text: "text-cyan-500" },
  "watermark-image": { bg: "bg-indigo-50", text: "text-indigo-500" },
  "remove-background": { bg: "bg-emerald-50", text: "text-emerald-500" },
  "image-to-pdf": { bg: "bg-purple-50", text: "text-purple-500" },
  // Video & Audio — teals/greens
  "compress-video": { bg: "bg-teal-50", text: "text-teal-500" },
  "extract-audio": { bg: "bg-green-50", text: "text-green-500" },
  "video-to-gif": { bg: "bg-lime-50", text: "text-lime-600" },
  // Utilities — mixed
  "qr-generator": { bg: "bg-fuchsia-50", text: "text-fuchsia-500" },
  "svg-to-png": { bg: "bg-orange-50", text: "text-orange-500" },
  "base64-encode": { bg: "bg-slate-100", text: "text-slate-500" },
  "color-picker": { bg: "bg-violet-50", text: "text-violet-500" },
  "json-formatter": { bg: "bg-yellow-50", text: "text-yellow-600" },
  "hash-generator": { bg: "bg-gray-100", text: "text-gray-500" },
  "word-counter": { bg: "bg-blue-50", text: "text-blue-500" },
};

const defaultColor = { bg: "bg-indigo-50", text: "text-indigo-500" };

export default function ToolCard({ tool }: { tool: Tool }) {
  const colors = toolColors[tool.slug] || defaultColor;
  const { t } = useI18n();

  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="group flex items-start gap-4 p-5 rounded-2xl bg-surface border border-border hover:border-accent/20 hover:shadow-card-hover transition-all duration-200"
    >
      {/* Colored icon */}
      <div
        className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}
      >
        <span className={`text-2xl`}>{tool.emoji}</span>
      </div>
      <div className="min-w-0 pt-0.5">
        <p className="text-[14px] font-semibold text-t-primary group-hover:text-accent transition-colors">
          {t(`tool.${tool.slug}.name`) !== `tool.${tool.slug}.name`
            ? t(`tool.${tool.slug}.name`)
            : tool.name}
        </p>
        <p className="text-[12px] text-t-tertiary mt-1 line-clamp-2 leading-relaxed">
          {t(`tool.${tool.slug}.desc`) !== `tool.${tool.slug}.desc`
            ? t(`tool.${tool.slug}.desc`)
            : tool.description}
        </p>
      </div>
    </Link>
  );
}
