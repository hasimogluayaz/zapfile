"use client";

import { memo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { isLossless, type JVal } from "@/lib/text-tools/json-core";

const PAGE = 200;

export function pathSegment(parent: string, key: string | number): string {
  if (typeof key === "number") return `${parent}[${key}]`;
  return /^[A-Za-z_$][\w$]*$/.test(key) ? `${parent}.${key}` : `${parent}[${JSON.stringify(key)}]`;
}

function Leaf({ value }: { value: JVal }) {
  if (value === null) return <span className="italic text-t-tertiary">null</span>;
  if (typeof value === "boolean") return <span className="font-medium text-t-primary">{String(value)}</span>;
  if (typeof value === "number") return <span className="tabular-nums text-t-primary">{String(value)}</span>;
  if (typeof value === "string") {
    const short = value.length > 300 ? value.slice(0, 300) + "…" : value;
    return <span className="break-all text-t-secondary">{JSON.stringify(short)}</span>;
  }
  if (isLossless(value)) return <span className="tabular-nums text-t-primary">{value.n}</span>;
  return null;
}

const Node = memo(function Node({
  name,
  value,
  path,
  depth,
  selected,
  onSelect,
}: {
  name: string | number | null;
  value: JVal;
  path: string;
  depth: number;
  selected: string | null;
  onSelect: (path: string) => void;
}) {
  const { t } = useI18n();
  const isArr = Array.isArray(value);
  const isObj = value instanceof Map;
  const [open, setOpen] = useState(depth < 1);
  const [limit, setLimit] = useState(PAGE);
  const isSel = selected === path;
  const label =
    name === null ? (
      <span className="text-t-tertiary">$</span>
    ) : typeof name === "number" ? (
      <span className="tabular-nums text-t-tertiary">{name}</span>
    ) : (
      <span className="font-medium text-t-primary">{name}</span>
    );

  if (!isArr && !isObj) {
    return (
      <div role="treeitem" aria-selected={isSel} style={{ paddingInlineStart: depth * 16 + 22 }}>
        <button
          type="button"
          onClick={() => onSelect(path)}
          className={`my-px flex min-h-7 w-full items-baseline gap-1.5 rounded-md px-1.5 text-start hover:bg-bg-tertiary/60 ${isSel ? "bg-accent/10" : ""}`}
        >
          {label}
          <span className="text-t-tertiary">:</span>
          <Leaf value={value} />
        </button>
      </div>
    );
  }

  const size = isArr ? (value as JVal[]).length : (value as Map<string, JVal>).size;
  const entries: [string | number, JVal][] = [];
  if (open) {
    if (isArr) (value as JVal[]).slice(0, limit).forEach((v, i) => entries.push([i, v]));
    else {
      let k = 0;
      for (const [key, v] of value as Map<string, JVal>) {
        if (k++ >= limit) break;
        entries.push([key, v]);
      }
    }
  }

  return (
    <div role="treeitem" aria-expanded={open} aria-selected={isSel}>
      <div style={{ paddingInlineStart: depth * 16 }} className="flex items-center">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? t("json.v2.collapse") : t("json.v2.expand")}
          className="flex h-7 w-6 shrink-0 items-center justify-center rounded text-t-tertiary hover:text-t-primary"
        >
          <ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => onSelect(path)}
          className={`my-px flex min-h-7 items-baseline gap-1.5 rounded-md px-1.5 text-start hover:bg-bg-tertiary/60 ${isSel ? "bg-accent/10" : ""}`}
        >
          {label}
          <span className="text-t-tertiary">
            {isArr ? "[ ]" : "{ }"} {isArr ? t("json.v2.items", { count: size }) : t("json.v2.keys", { count: size })}
          </span>
        </button>
      </div>
      {open && (
        <div role="group">
          {entries.map(([k, v]) => (
            <Node
              key={typeof k === "number" ? `i${k}` : `k${k}`}
              name={k}
              value={v}
              path={pathSegment(path, k)}
              depth={depth + 1}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
          {size > limit && (
            <div style={{ paddingInlineStart: (depth + 1) * 16 + 22 }}>
              <button
                type="button"
                onClick={() => setLimit((l) => l + PAGE)}
                className="my-1 min-h-8 rounded-md px-2 text-[12.5px] font-medium text-t-primary underline underline-offset-2"
              >
                {t("json.v2.showMore", { count: Math.min(PAGE, size - limit), hidden: size - limit })}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default function JsonTree({
  value,
  selected,
  onSelect,
  height = 320,
}: {
  value: JVal;
  selected: string | null;
  onSelect: (path: string) => void;
  height?: number;
}) {
  const { t } = useI18n();
  return (
    <div
      dir="ltr"
      role="tree"
      aria-label={t("json.v2.tree")}
      className="resize-y overflow-auto rounded-xl border border-border bg-bg-secondary p-2 font-mono text-[13px] leading-5"
      style={{ height }}
    >
      <Node name={null} value={value} path="$" depth={0} selected={selected} onSelect={onSelect} />
    </div>
  );
}
