"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

interface ColorData {
  hex: string;
  r: number;
  g: number;
  b: number;
  h: number;
  s: number;
  l: number;
}

function randomHex(): string {
  return (
    "#" +
    Math.floor(Math.random() * 0xffffff)
      .toString(16)
      .padStart(6, "0")
      .toUpperCase()
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHsl(
  r: number,
  g: number,
  b: number,
): { h: number; s: number; l: number } {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const max = Math.max(rn, gn, bn),
    min = Math.min(rn, gn, bn);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
        break;
      case gn:
        h = ((bn - rn) / d + 2) / 6;
        break;
      case bn:
        h = ((rn - gn) / d + 4) / 6;
        break;
    }
  }
  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

function buildColorData(hex: string): ColorData {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  return { hex, r, g, b, h, s, l };
}

function getContrastColor(r: number, g: number, b: number): "white" | "black" {
  const luminance =
    0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
  return luminance > 0.5 ? "black" : "white";
}

// ─── Color harmony helpers ────────────────────────────────────────

type HarmonyMode =
  | "none"
  | "complementary"
  | "analogous"
  | "triadic"
  | "split-complementary"
  | "tetradic";

const HARMONY_MODES: { value: HarmonyMode; labelKey: string }[] = [
  { value: "none", labelKey: "rc.harmony.none" },
  { value: "complementary", labelKey: "rc.harmony.complementary" },
  { value: "analogous", labelKey: "rc.harmony.analogous" },
  { value: "triadic", labelKey: "rc.harmony.triadic" },
  { value: "split-complementary", labelKey: "rc.harmony.splitComp" },
  { value: "tetradic", labelKey: "rc.harmony.tetradic" },
];

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100;
  const ln = l / 100;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

function getHarmonyColors(base: ColorData, mode: HarmonyMode): ColorData[] {
  if (mode === "none") return [];
  const { h, s, l } = base;
  const makeColor = (hue: number): ColorData => {
    const nh = ((hue % 360) + 360) % 360;
    const hex = hslToHex(nh, s, l);
    return buildColorData(hex);
  };
  switch (mode) {
    case "complementary":
      return [makeColor(h + 180)];
    case "analogous":
      return [makeColor(h - 30), makeColor(h + 30)];
    case "triadic":
      return [makeColor(h + 120), makeColor(h + 240)];
    case "split-complementary":
      return [makeColor(h + 150), makeColor(h + 210)];
    case "tetradic":
      return [makeColor(h + 90), makeColor(h + 180), makeColor(h + 270)];
    default:
      return [];
  }
}

export default function RandomColorPage() {
  const { t } = useI18n();
  const [color, setColor] = useState<ColorData>(() =>
    buildColorData(randomHex()),
  );
  const [locked, setLocked] = useState(false);
  const [history, setHistory] = useState<ColorData[]>([]);
  const [harmonyMode, setHarmonyMode] = useState<HarmonyMode>("none");

  const harmonyColors = getHarmonyColors(color, harmonyMode);

  const generateNew = useCallback(() => {
    if (locked) return;
    const newColor = buildColorData(randomHex());
    setColor(newColor);
    setHistory((prev) => [newColor, ...prev].slice(0, 10));
  }, [locked]);

  useEffect(() => {
    setHistory([color]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        generateNew();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [generateNew]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("rc.copied", { value: text }), { duration: 3000 });
    } catch {
      toast.error(t("rc.copyFail"));
    }
  };

  const textColor = getContrastColor(color.r, color.g, color.b);

  return (
    <ToolLayout
      toolName={t("tool.random-color.name")}
      toolDescription={t("tool.random-color.desc")}
    >
      <div className="space-y-6">
        {/* Color Display */}
        <div
          className="w-full rounded-xl cursor-pointer transition-all select-none relative overflow-hidden"
          style={{ backgroundColor: color.hex, height: "200px" }}
          onClick={generateNew}
          title={locked ? t("rc.unlockHint") : t("rc.clickHint")}
        >
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-1"
            style={{ color: textColor }}
          >
            <span className="text-4xl font-bold font-mono tracking-wider opacity-90">
              {color.hex}
            </span>
            <span className="text-sm opacity-60">
              {locked ? `🔒 ${t("rc.locked")}` : t("rc.clickOrSpace")}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={generateNew}
            disabled={locked}
            className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t("rc.generateNew")}
            <span className="ml-2 text-xs opacity-70 font-normal">{t("rc.spaceKey")}</span>
          </button>
          <button
            onClick={() => setLocked((v) => !v)}
            className={`px-4 py-2 rounded-lg font-medium transition-all border ${
              locked
                ? "bg-amber-500/20 border-amber-500/50 text-amber-400 hover:bg-amber-500/30"
                : "text-t-secondary bg-bg-secondary border-border hover:text-t-primary"
            }`}
          >
            {locked ? `🔒 ${t("rc.locked")}` : `🔓 ${t("rc.lock")}`}
          </button>
        </div>

        {/* Contrast Info */}
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm"
              style={{ backgroundColor: color.hex, color: textColor }}
            >
              Aa
            </div>
            <div>
              <div className="text-sm font-medium text-t-primary">
                {t("rc.bestTextColor")}:{" "}
                <span className="font-mono">{textColor}</span>
              </div>
              <div className="text-xs text-t-tertiary">{t("rc.wcagNote")}</div>
            </div>
          </div>
        </div>

        {/* Color Values */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-sm font-semibold text-t-secondary mb-4">
            {t("rc.colorValues")}
          </h3>
          <div className="space-y-3">
            {[
              { label: t("rc.hexLabel"), value: color.hex },
              {
                label: t("rc.rgbLabel"),
                value: `rgb(${color.r}, ${color.g}, ${color.b})`,
              },
              {
                label: t("rc.hslLabel"),
                value: `hsl(${color.h}, ${color.s}%, ${color.l}%)`,
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xs font-mono font-bold text-t-tertiary w-10 flex-shrink-0">
                  {label}
                </span>
                <code className="flex-1 px-3 py-2 rounded-lg bg-bg-secondary border border-border text-t-primary text-sm font-mono">
                  {value}
                </code>
                <button
                  onClick={() => copy(value)}
                  className="px-3 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors text-xs"
                >
                  {t("ui.copy")}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Color Harmony Mode */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-sm font-semibold text-t-secondary mb-3">
            {t("rc.harmonyMode")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {HARMONY_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setHarmonyMode(mode.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  harmonyMode === mode.value
                    ? "bg-indigo-500/20 border border-indigo-500/50 text-indigo-400"
                    : "text-t-secondary bg-bg-secondary border border-border hover:text-t-primary"
                }`}
              >
                {t(mode.labelKey)}
              </button>
            ))}
          </div>

          {/* Harmony Swatches */}
          {harmonyColors.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-t-tertiary mb-2">
                {t("rc.harmonySwatches")}
              </p>
              <div className="flex gap-3 flex-wrap">
                {/* Base color */}
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => copy(color.hex)}
                    title={`Base: ${color.hex}`}
                    className="w-14 h-14 rounded-xl border-2 border-white/30 transition-all hover:scale-110 shadow-lg"
                    style={{ backgroundColor: color.hex }}
                  >
                    <span
                      className="text-[8px] font-bold"
                      style={{ color: textColor }}
                    >
                      {t("rc.baseLabel")}
                    </span>
                  </button>
                  <span className="text-[10px] font-mono text-t-tertiary">
                    {color.hex}
                  </span>
                </div>
                {harmonyColors.map((hc, i) => {
                  const hcText = getContrastColor(hc.r, hc.g, hc.b);
                  return (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => copy(hc.hex)}
                        title={hc.hex}
                        className="w-14 h-14 rounded-xl border-2 border-transparent transition-all hover:scale-110 hover:border-white/30 shadow-lg"
                        style={{ backgroundColor: hc.hex }}
                      >
                        <span
                          className="text-[8px] font-semibold opacity-60"
                          style={{ color: hcText }}
                        >
                          {i + 1}
                        </span>
                      </button>
                      <span className="text-[10px] font-mono text-t-tertiary">
                        {hc.hex}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Color History */}
        {history.length > 0 && (
          <div className="glass rounded-xl p-6">
            <h3 className="text-sm font-semibold text-t-secondary mb-4">
              {t("rc.history")}
              <span className="ml-1.5 text-xs font-normal text-t-tertiary">
                ({t("rc.historyHint")})
              </span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {history.map((c, i) => (
                <button
                  key={`${c.hex}-${i}`}
                  onClick={() => setColor(c)}
                  title={c.hex}
                  className={`w-10 h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                    c.hex === color.hex
                      ? "border-white/60 scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
