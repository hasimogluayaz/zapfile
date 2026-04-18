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

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break;
      case gn: h = ((bn - rn) / d + 2) / 6; break;
      case bn: h = ((rn - gn) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function buildColorData(hex: string): ColorData {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  return { hex, r, g, b, h, s, l };
}

function getContrastColor(r: number, g: number, b: number): "white" | "black" {
  const luminance = 0.2126 * (r / 255) + 0.7152 * (g / 255) + 0.0722 * (b / 255);
  return luminance > 0.5 ? "black" : "white";
}

export default function RandomColorPage() {
  const { t } = useI18n();
  const [color, setColor] = useState<ColorData>(() => buildColorData(randomHex()));
  const [locked, setLocked] = useState(false);
  const [history, setHistory] = useState<ColorData[]>([]);

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
      toast.success(t("rc.copied", { value: text }), { duration: 1500 });
    } catch {
      toast.error(t("rc.copyFail"));
    }
  };

  const textColor = getContrastColor(color.r, color.g, color.b);

  return (
    <ToolLayout
      toolName="Random Color Generator"
      toolDescription="Generate random colors with HEX, RGB, and HSL values. Press Space to generate."
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
            <span className="ml-2 text-xs opacity-70 font-normal">Space</span>
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
                {t("rc.bestTextColor")}: <span className="font-mono">{textColor}</span>
              </div>
              <div className="text-xs text-t-tertiary">{t("rc.wcagNote")}</div>
            </div>
          </div>
        </div>

        {/* Color Values */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-sm font-semibold text-t-secondary mb-4">{t("rc.colorValues")}</h3>
          <div className="space-y-3">
            {[
              { label: "HEX", value: color.hex },
              { label: "RGB", value: `rgb(${color.r}, ${color.g}, ${color.b})` },
              { label: "HSL", value: `hsl(${color.h}, ${color.s}%, ${color.l}%)` },
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
                    c.hex === color.hex ? "border-white/60 scale-110" : "border-transparent"
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
