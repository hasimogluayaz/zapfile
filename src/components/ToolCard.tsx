import Link from "next/link";
import type { Tool } from "@/lib/tools";

export default function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="group flex items-center gap-3 p-3.5 rounded-lg border border-border hover:border-accent/30 hover:bg-accent-light transition-all duration-150"
    >
      <span className="text-xl flex-shrink-0 w-8 text-center">{tool.emoji}</span>
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-t-primary group-hover:text-accent transition-colors">
          {tool.name}
        </p>
        <p className="text-[12px] text-t-tertiary mt-0.5 truncate">
          {tool.description}
        </p>
      </div>
    </Link>
  );
}
