"use client";

import { useMemo, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";
import {
  contrastRatio,
  parseHex,
  wcagChecks,
} from "@/lib/color-contrast-wcag";

export default function ColorContrastPage() {
  const { t } = useI18n();
  const [fg, setFg] = useState("#1a1d2e");
  const [bg, setBg] = useState("#ffffff");

  const result = useMemo(() => {
    const r = contrastRatio(fg, bg);
    if (r === null) return null;
    return { ratio: r, checks: wcagChecks(r) };
  }, [fg, bg]);

  const validFg = parseHex(fg) !== null;
  const validBg = parseHex(bg) !== null;

  const swap = () => {
    setFg(bg);
    setBg(fg);
  };

  return (
    <ToolLayout
      toolName="Color Contrast Checker"
      toolDescription="Check WCAG contrast ratios for text and UI colors"
    >
      <div className="space-y-6">
        <p className="text-sm text-t-secondary">{t("contrast.largeDef")}</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="glass rounded-xl p-4 space-y-2">
            <label className="text-sm font-medium text-t-secondary" htmlFor="fg">
              {t("contrast.fg")}
            </label>
            <div className="flex gap-2">
              <input
                id="fg"
                type="color"
                value={validFg ? (fg.startsWith("#") ? fg : `#${fg}`) : "#000000"}
                onChange={(e) => setFg(e.target.value)}
                className="h-10 w-14 rounded border border-border cursor-pointer"
              />
              <input
                type="text"
                value={fg}
                onChange={(e) => setFg(e.target.value)}
                spellCheck={false}
                className="flex-1 font-mono text-sm px-3 py-2 rounded-lg bg-bg-secondary border border-border text-t-primary"
                aria-invalid={!validFg}
              />
            </div>
          </div>
          <div className="glass rounded-xl p-4 space-y-2">
            <label className="text-sm font-medium text-t-secondary" htmlFor="bg">
              {t("contrast.bg")}
            </label>
            <div className="flex gap-2">
              <input
                id="bg"
                type="color"
                value={validBg ? (bg.startsWith("#") ? bg : `#${bg}`) : "#ffffff"}
                onChange={(e) => setBg(e.target.value)}
                className="h-10 w-14 rounded border border-border cursor-pointer"
              />
              <input
                type="text"
                value={bg}
                onChange={(e) => setBg(e.target.value)}
                spellCheck={false}
                className="flex-1 font-mono text-sm px-3 py-2 rounded-lg bg-bg-secondary border border-border text-t-primary"
                aria-invalid={!validBg}
              />
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={swap}
          className="px-4 py-2 rounded-lg text-sm font-medium border border-border bg-bg-secondary hover:bg-bg-tertiary transition-colors"
        >
          {t("contrast.swap")}
        </button>

        {result && validFg && validBg && (
          <>
            <div
              className="rounded-xl p-8 text-center border border-border"
              style={{ backgroundColor: bg, color: fg }}
            >
              <p className="text-lg font-semibold">Sample heading text</p>
              <p className="text-sm mt-2 opacity-90">
                Body text for readability check.
              </p>
            </div>

            <div className="glass rounded-xl p-6 space-y-4">
              <p className="text-2xl font-bold text-t-primary">
                {t("contrast.ratio")}:{" "}
                <span className="text-accent">
                  {result.ratio.toFixed(2)}:1
                </span>
              </p>
              <ul className="space-y-2 text-sm">
                {(
                  [
                    ["contrast.aaNormal", result.checks.aaNormal],
                    ["contrast.aaLarge", result.checks.aaLarge],
                    ["contrast.aaaNormal", result.checks.aaaNormal],
                    ["contrast.aaaLarge", result.checks.aaaLarge],
                  ] as const
                ).map(([key, pass]) => (
                  <li
                    key={key}
                    className={`flex justify-between gap-4 ${
                      pass ? "text-emerald-500" : "text-red-400"
                    }`}
                  >
                    <span>{t(key as "contrast.aaNormal")}</span>
                    <span>{pass ? t("contrast.pass") : t("contrast.fail")}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {(!validFg || !validBg) && (
          <p className="text-sm text-amber-500" role="status">
            {t("contrast.invalidHex")}
          </p>
        )}
      </div>
    </ToolLayout>
  );
}
