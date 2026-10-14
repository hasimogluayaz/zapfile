"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Check, Link2, Star, Wand2, X } from "lucide-react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { sectionTitle } from "@/components/ui/controls";
import { useI18n } from "@/lib/i18n";
import { smallButton } from "@/lib/text-tools/ui";
import { blend, nearestPassing, parseCssColor, ratioOf, toHex } from "@/lib/color-contrast-wcag";

const CHECKS = [
  { key: "aaNormal", min: 4.5, label: "AA", sub: "contrast.v2.normalText" },
  { key: "aaLarge", min: 3, label: "AA", sub: "contrast.v2.largeText" },
  { key: "aaaNormal", min: 7, label: "AAA", sub: "contrast.v2.normalText" },
  { key: "aaaLarge", min: 4.5, label: "AAA", sub: "contrast.v2.largeText" },
  { key: "ui", min: 3, label: "AA", sub: "contrast.v2.uiParts" },
] as const;

const PRESETS: [string, string][] = [
  ["#16181d", "#ffffff"],
  ["#ffd60a", "#16181d"],
  ["#6b7280", "#ffffff"],
  ["#ffffff", "#2563eb"],
  ["#b91c1c", "#fef2f2"],
];

function ColorField({ id, label, value, onChange, valid }: { id: string; label: string; value: string; onChange: (v: string) => void; valid: boolean }) {
  const { t } = useI18n();
  const parsed = parseCssColor(value);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-[13px] font-medium text-t-secondary">
        {label}
      </label>
      <div className="flex gap-2">
        <input type="color" value={parsed ? toHex(parsed) : "#000000"} onChange={(e) => onChange(e.target.value)} aria-label={label} className="h-11 w-12 shrink-0 cursor-pointer rounded-xl border border-border bg-bg-secondary p-1" />
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          dir="ltr"
          aria-invalid={!valid}
          className={`h-11 min-w-0 flex-1 rounded-xl border bg-bg-secondary px-3 font-mono text-[14px] text-t-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60 ${valid ? "border-border" : "border-red-500/60"}`}
        />
      </div>
      {!valid && <p className="text-[12.5px] text-red-700 dark:text-red-400">{t("contrast.v2.badColor")}</p>}
    </div>
  );
}

export default function ColorContrastPage() {
  const { t } = useI18n();
  const [fg, setFg] = useState("#6b7280");
  const [bg, setBg] = useState("#ffffff");

  // Shareable: ?fg=…&bg=… (read once, written on change).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("fg")) setFg(q.get("fg")!);
    if (q.get("bg")) setBg(q.get("bg")!);
  }, []);

  const fgC = useMemo(() => parseCssColor(fg), [fg]);
  const bgRaw = useMemo(() => parseCssColor(bg), [bg]);
  // A translucent background is judged on white, a translucent text on its background.
  const bgC = bgRaw ? blend(bgRaw, { r: 255, g: 255, b: 255, a: 1 }) : null;
  const fgEff = fgC && bgC ? blend(fgC, bgC) : null;
  const ratio = fgEff && bgC ? ratioOf(fgEff, bgC) : null;
  // WCAG: never round up (4.499 fails AA).
  const shown = ratio === null ? "—" : (Math.floor(ratio * 100) / 100).toFixed(2);

  const fixes = useMemo(() => {
    if (!fgEff || !bgC || !ratio) return [];
    const out: { target: number; label: string; fg: string | null; bg: string | null }[] = [];
    for (const [target, label] of [
      [4.5, "AA"],
      [7, "AAA"],
    ] as const) {
      if (ratio >= target) continue;
      out.push({ target, label, fg: nearestPassing(fgEff, bgC, target), bg: nearestPassing(bgC, fgEff, target) });
    }
    return out;
  }, [fgEff, bgC, ratio]);

  const share = async () => {
    const url = new URL(window.location.href);
    url.searchParams.set("fg", fg);
    url.searchParams.set("bg", bg);
    try {
      await navigator.clipboard.writeText(url.toString());
      toast.success(t("contrast.v2.linkCopied"));
    } catch {
      toast.error(t("ui.copyFailed"));
    }
  };

  const fgCss = fgC ? `rgb(${fgC.r} ${fgC.g} ${fgC.b} / ${fgC.a})` : "#000";
  const bgCss = bgRaw ? `rgb(${bgRaw.r} ${bgRaw.g} ${bgRaw.b} / ${bgRaw.a})` : "#fff";
  const grade = ratio === null ? null : ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA Large" : null;

  return (
    <ToolLayout toolName={t("tool.color-contrast.name")} toolDescription={t("tool.color-contrast.desc")}>
      <div className="space-y-5">
        <div className="glass space-y-4 p-5">
          <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto_1fr]">
            <ColorField id="fg" label={t("contrast.fg")} value={fg} onChange={setFg} valid={!!fgC} />
            <button
              type="button"
              onClick={() => {
                setFg(bg);
                setBg(fg);
              }}
              aria-label={t("contrast.swap")}
              title={t("contrast.swap")}
              className={`${smallButton} mb-0.5 !h-11 !w-11 justify-center !px-0`}
            >
              <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
            </button>
            <ColorField id="bg" label={t("contrast.bg")} value={bg} onChange={setBg} valid={!!bgRaw} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] text-t-tertiary">{t("contrast.v2.try")}</span>
            {PRESETS.map(([f, b]) => (
              <button key={f + b} type="button" onClick={() => (setFg(f), setBg(b))} className="h-8 rounded-lg border border-border px-2.5 text-[13px] font-semibold" style={{ color: f, background: b }} aria-label={`${f} / ${b}`}>
                Aa
              </button>
            ))}
            <button type="button" className={`${smallButton} ms-auto`} onClick={share}>
              <Link2 className="h-4 w-4" aria-hidden="true" />
              {t("contrast.v2.share")}
            </button>
          </div>
          <p className="text-[12.5px] text-t-tertiary">{t("contrast.v2.formats")}</p>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          {/* Live preview */}
          <div className="overflow-hidden rounded-2xl border border-border" style={{ background: bgCss }}>
            <div className="space-y-4 p-6 sm:p-8" style={{ color: fgCss }}>
              <p className="text-[30px] font-bold leading-tight">{t("contrast.ui.sampleHeading")}</p>
              <p className="text-[18.66px] font-bold">{t("contrast.v2.sampleLarge")}</p>
              <p className="text-[16px] leading-relaxed">{t("contrast.ui.sampleBody")}</p>
              <p className="text-[13px]">{t("contrast.v2.sampleSmall")}</p>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 items-center rounded-lg border-2 px-4 text-[14px] font-semibold" style={{ borderColor: fgCss }}>
                  {t("contrast.v2.button")}
                </span>
                <Star className="h-6 w-6" style={{ color: fgCss }} aria-hidden="true" />
                <span className="h-5 w-10 rounded-full" style={{ background: fgCss }} />
              </div>
            </div>
          </div>

          {/* Score */}
          <div className="glass space-y-4 p-5">
            <div>
              <p className={sectionTitle}>{t("contrast.ratio")}</p>
              <p className="mt-1 text-[44px] font-bold tabular-nums leading-none text-t-primary">
                {shown}
                <span className="text-[22px] font-semibold text-t-tertiary">:1</span>
              </p>
              {grade && <p className="mt-1 text-[13px] font-medium text-t-secondary">{t("contrast.v2.grade", { grade })}</p>}
            </div>
            <ul className="divide-y divide-border">
              {CHECKS.map((c) => {
                const pass = ratio !== null && ratio >= c.min;
                return (
                  <li key={c.key} className="flex items-center gap-3 py-2">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full ${pass ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" : "bg-red-500/15 text-red-700 dark:text-red-400"}`}>
                      {pass ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <X className="h-3.5 w-3.5" aria-hidden="true" />}
                    </span>
                    <span className="flex-1 text-[13.5px] text-t-primary">
                      <span className="font-semibold">{c.label}</span> · {t(c.sub)}
                    </span>
                    <span className="text-[12.5px] tabular-nums text-t-tertiary">{c.min}:1</span>
                    <span className="sr-only">{pass ? t("contrast.pass") : t("contrast.fail")}</span>
                  </li>
                );
              })}
            </ul>
            <p className="text-[12px] leading-snug text-t-tertiary">{t("contrast.largeDef")}</p>
          </div>
        </div>

        {fixes.length > 0 && (
          <div className="glass space-y-3 p-5">
            <p className={`${sectionTitle} flex items-center gap-2`}>
              <Wand2 className="h-4 w-4" aria-hidden="true" />
              {t("contrast.v2.fixTitle")}
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {fixes.flatMap((f) =>
                (["fg", "bg"] as const).map((which) => {
                  const hex = f[which];
                  if (!hex) return null;
                  const sample = which === "fg" ? { color: hex, background: bgCss } : { color: fgCss, background: hex };
                  return (
                    <button
                      key={f.label + which}
                      type="button"
                      onClick={() => (which === "fg" ? setFg(hex) : setBg(hex))}
                      className="flex items-center gap-3 rounded-xl border border-border p-3 text-start transition hover:bg-bg-secondary"
                    >
                      <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg border border-border text-[15px] font-semibold" style={sample}>
                        Aa
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-medium text-t-primary">{t(which === "fg" ? "contrast.v2.useText" : "contrast.v2.useBg", { level: f.label })}</span>
                        <span className="block font-mono text-[12.5px] text-t-tertiary">{hex}</span>
                      </span>
                    </button>
                  );
                }),
              )}
            </div>
            <p className="text-[12.5px] text-t-tertiary">{t("contrast.v2.fixHint")}</p>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
