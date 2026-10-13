"use client";

import { useMemo, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";
import { useStoredPref } from "@/lib/text-tools/hooks";
import { CopyButton } from "@/lib/text-tools/ui";
import { CATEGORIES, formatValue, fromBase, toBase, unitName, type CategoryKey } from "./units";

/** Accept "1,5", "1.5", "1 234,5", "1,234.5" and exponents. */
function parseNum(raw: string): number | null {
  let s = raw.trim().replace(/[\s '_]/g, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) s = s.lastIndexOf(",") > s.lastIndexOf(".") ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  // One comma is a decimal comma ("1,5"); several are thousands separators ("1,234,567").
  else if (s.includes(",")) s = s.split(",").length > 2 ? s.replace(/,/g, "") : s.replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default function UnitConverterPage() {
  const { t, locale } = useI18n();
  const [catKey, setCatKey] = useStoredPref<CategoryKey>("unit.cat", "length", CATEGORIES.map((c) => c.key));
  const [rootPx, setRootPx] = useStoredPref<number>("unit.root", 16);
  const cat = CATEGORIES.find((c) => c.key === catKey) ?? CATEGORIES[0]!;
  const [source, setSource] = useState<{ cat: CategoryKey; unit: string; text: string }>({ cat: "length", unit: "m", text: "1" });

  const src = source.cat === cat.key ? source : { cat: cat.key, unit: cat.defaultUnit, text: "1" };
  const ctx = useMemo(() => ({ rootPx: rootPx > 0 ? rootPx : 16 }), [rootPx]);
  const value = parseNum(src.text);
  const base = useMemo(() => {
    const u = cat.units.find((x) => x.id === src.unit);
    return u && value !== null ? toBase(u, value, ctx) : null;
  }, [cat, src.unit, value, ctx]);

  return (
    <ToolLayout toolName={t("tool.unit-converter.name")} toolDescription={t("tool.unit-converter.desc")}>
      <div className="space-y-5">
        <div className="glass p-3">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t("unit.v2.category")}>
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                role="tab"
                aria-selected={c.key === cat.key}
                onClick={() => setCatKey(c.key)}
                className={`rounded-lg px-3 py-2 text-[13.5px] font-medium transition ${c.key === cat.key ? "bg-accent text-on-accent" : "text-t-secondary hover:bg-bg-secondary hover:text-t-primary"}`}
              >
                {t(c.labelKey)}
              </button>
            ))}
          </div>
        </div>

        {cat.key === "css" && (
          <div className="glass flex flex-wrap items-end gap-4 p-5">
            <label className="block">
              <span className="mb-1.5 block text-[13px] text-t-secondary">{t("unit.baseFontSize")}</span>
              <input
                type="number"
                min={1}
                value={rootPx}
                onChange={(e) => setRootPx(Number(e.target.value) || 16)}
                className="h-11 w-28 rounded-xl border border-border bg-bg-secondary px-3 text-[14px] tabular-nums text-t-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
              />
            </label>
            <p className="pb-2 text-[12.5px] text-t-tertiary">{t("unit.v2.cssNote")}</p>
          </div>
        )}

        <div className="glass p-5">
          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            {cat.units.map((u) => {
              const active = src.unit === u.id;
              const shown = active ? src.text : base !== null ? formatValue(fromBase(u, base, ctx), locale) : "";
              const name = unitName(u, locale);
              const bad = active && src.text.trim() !== "" && value === null;
              return (
                <label key={u.id} className="block">
                  <span className="mb-1.5 flex items-center justify-between gap-2 text-[13px] text-t-secondary">
                    <span className="truncate">
                      <span className="font-semibold text-t-primary">{u.symbol}</span>
                      {name && name !== u.symbol ? <span className="ms-1.5 text-t-tertiary">{name}</span> : null}
                    </span>
                    <CopyButton getText={() => (base !== null ? String(+fromBase(u, base, ctx).toPrecision(12)) : "")} disabled={base === null} iconOnly />
                  </span>
                  <input
                    value={shown}
                    onChange={(e) => setSource({ cat: cat.key, unit: u.id, text: e.target.value })}
                    inputMode="decimal"
                    dir="ltr"
                    aria-invalid={bad}
                    className={`h-12 w-full rounded-xl border bg-bg-secondary px-3 font-mono text-[15px] tabular-nums text-t-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60 ${active ? "border-accent/60" : bad ? "border-red-500/60" : "border-border"}`}
                  />
                </label>
              );
            })}
          </div>
          <p className="mt-4 text-[12.5px] text-t-tertiary">{cat.key === "data" ? t("unit.v2.dataNote") : t("unit.v2.hint")}</p>
        </div>
      </div>
    </ToolLayout>
  );
}
