"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!match) return null;
  return { r: parseInt(match[1], 16), g: parseInt(match[2], 16), b: parseInt(match[3], 16) };
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

export default function ColorPickerPage() {
  const { t } = useI18n();
  const [hex, setHex] = useState("#6366f1");
  const [rgb, setRgb] = useState({ r: 99, g: 102, b: 241 });
  const [hsl, setHsl] = useState({ h: 239, s: 84, l: 67 });

  const updateFromHex = (newHex: string) => {
    setHex(newHex);
    const parsed = hexToRgb(newHex);
    if (parsed) {
      setRgb(parsed);
      setHsl(rgbToHsl(parsed.r, parsed.g, parsed.b));
    }
  };

  const updateFromRgb = (r: number, g: number, b: number) => {
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    setRgb({ r, g, b });
    setHex(rgbToHex(r, g, b));
    setHsl(rgbToHsl(r, g, b));
  };

  const updateFromHsl = (h: number, s: number, l: number) => {
    h = Math.max(0, Math.min(360, h));
    s = Math.max(0, Math.min(100, s));
    l = Math.max(0, Math.min(100, l));
    setHsl({ h, s, l });
    const newRgb = hslToRgb(h, s, l);
    setRgb(newRgb);
    setHex(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("clr.copied", { value: text }));
    } catch {
      toast.error(t("clr.copyFail"));
    }
  };

  const presetColors = [
    "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
    "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef", "#ec4899",
    "#f43f5e", "#ffffff", "#94a3b8", "#475569", "#000000",
  ];

  const hexString = hex.toUpperCase();
  const rgbString = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  const hslString = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;

  return (
    <ToolLayout
      toolName={t("tool.color-picker.name")}
      toolDescription={t("tool.color-picker.desc")}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Color preview & picker */}
        <div className="space-y-6">
          {/* Large color preview */}
          <div className="glass rounded-xl p-6">
            <div
              className="w-full h-48 rounded-xl border border-border transition-colors duration-200"
              style={{ backgroundColor: hex }}
            />

            {/* Native color input */}
            <div className="mt-4 flex items-center gap-4">
              <input
                type="color"
                value={hex}
                onChange={(e) => updateFromHex(e.target.value)}
                className="w-14 h-14 rounded-xl cursor-pointer bg-transparent border-0"
              />
              <div className="flex-1">
                <p className="text-sm text-t-secondary mb-1">{t("clr.hex")}</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={hexString}
                    onChange={(e) => {
                      const v = e.target.value;
                      setHex(v);
                      if (/^#[0-9a-f]{6}$/i.test(v)) updateFromHex(v);
                    }}
                    className="flex-1 px-3 py-2 rounded-lg bg-bg-secondary border border-border text-t-primary font-mono text-sm focus:outline-none focus:border-accent/50"
                  />
                  <button
                    type="button"
                    onClick={() => copy(hexString)}
                    className="px-3 py-2 rounded-lg bg-bg-secondary text-t-secondary hover:text-t-primary hover:bg-bg-tertiary transition-colors text-sm border border-border"
                  >
                    {t("clr.copy")}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Preset colors */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-t-primary font-medium mb-3">{t("clr.presets")}</h3>
            <div className="flex flex-wrap gap-2">
              {presetColors.map((c) => (
                <button
                  key={c}
                  onClick={() => updateFromHex(c)}
                  className={`w-9 h-9 rounded-lg border-2 transition-transform hover:scale-110 ${
                    hex.toLowerCase() === c.toLowerCase() ? "border-white scale-110" : "border-white/10"
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Values */}
        <div className="space-y-6">
          {/* RGB */}
          <div className="glass rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-t-primary font-medium">{t("clr.rgb")}</h3>
              <button
                type="button"
                onClick={() => copy(rgbString)}
                className="px-3 py-1.5 text-xs rounded-lg bg-accent/15 text-accent hover:bg-accent/25 transition-colors border border-accent/30"
              >
                {t("clr.copy")}
              </button>
            </div>
            {(["r", "g", "b"] as const).map((channel) => (
              <div key={channel} className="flex items-center gap-4">
                <span className="text-sm text-t-secondary uppercase w-4">{channel}</span>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={rgb[channel]}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateFromRgb(
                      channel === "r" ? val : rgb.r,
                      channel === "g" ? val : rgb.g,
                      channel === "b" ? val : rgb.b
                    );
                  }}
                  className="flex-1 accent-accent"
                />
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={rgb[channel]}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateFromRgb(
                      channel === "r" ? val : rgb.r,
                      channel === "g" ? val : rgb.g,
                      channel === "b" ? val : rgb.b
                    );
                  }}
                  className="w-16 px-2 py-1.5 rounded-lg bg-bg-secondary border border-border text-t-primary text-sm text-center focus:outline-none focus:border-accent/50"
                />
              </div>
            ))}
            <p className="text-sm text-t-secondary font-mono">{rgbString}</p>
          </div>

          {/* HSL */}
          <div className="glass rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-t-primary font-medium">{t("clr.hsl")}</h3>
              <button
                type="button"
                onClick={() => copy(hslString)}
                className="px-3 py-1.5 text-xs rounded-lg bg-accent/15 text-accent hover:bg-accent/25 transition-colors border border-accent/30"
              >
                {t("clr.copy")}
              </button>
            </div>
            {([
              { key: "h" as const, label: "H", max: 360, unit: "\u00B0" },
              { key: "s" as const, label: "S", max: 100, unit: "%" },
              { key: "l" as const, label: "L", max: 100, unit: "%" },
            ]).map(({ key, label, max, unit }) => (
              <div key={key} className="flex items-center gap-4">
                <span className="text-sm text-t-secondary w-4">{label}</span>
                <input
                  type="range"
                  min="0"
                  max={max}
                  value={hsl[key]}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    updateFromHsl(
                      key === "h" ? val : hsl.h,
                      key === "s" ? val : hsl.s,
                      key === "l" ? val : hsl.l
                    );
                  }}
                  className="flex-1 accent-accent"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="0"
                    max={max}
                    value={hsl[key]}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      updateFromHsl(
                        key === "h" ? val : hsl.h,
                        key === "s" ? val : hsl.s,
                        key === "l" ? val : hsl.l
                      );
                    }}
                    className="w-16 px-2 py-1.5 rounded-lg bg-bg-secondary border border-border text-t-primary text-sm text-center focus:outline-none focus:border-accent/50"
                  />
                  <span className="text-xs text-t-secondary">{unit}</span>
                </div>
              </div>
            ))}
            <p className="text-sm text-t-secondary font-mono">{hslString}</p>
          </div>

          {/* CSS variable */}
          <div className="glass rounded-xl p-6">
            <h3 className="text-t-primary font-medium mb-3">{t("clr.css")}</h3>
            <div className="space-y-2">
              {[
                { label: t("clr.hex"), value: hexString },
                { label: t("clr.rgb"), value: rgbString },
                { label: t("clr.hsl"), value: hslString },
              ].map((item) => (
                <button
                  type="button"
                  key={item.label}
                  onClick={() => copy(`color: ${item.value};`)}
                  className="w-full text-left px-4 py-2 rounded-lg bg-bg-secondary hover:bg-bg-tertiary transition-colors font-mono text-sm text-t-secondary hover:text-t-primary border border-border"
                >
                  {t("clr.cssColor", { value: item.value })}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
