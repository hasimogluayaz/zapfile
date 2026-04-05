"use client";

import { useState, useMemo } from "react";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

type Category = "css" | "length" | "weight" | "temperature" | "data";

const CATEGORIES_RAW = [
  {
    key: "css" as Category,
    labelKey: "unit.cssUnits",
    units: [
      { nameKey: "unit.pixels", abbr: "px" },
      { nameKey: "Rem", abbr: "rem" },
      { nameKey: "Em", abbr: "em" },
      { nameKey: "unit.points", abbr: "pt" },
    ],
  },
  {
    key: "length" as Category,
    labelKey: "unit.length",
    units: [
      { nameKey: "unit.centimeters", abbr: "cm" },
      { nameKey: "unit.millimeters", abbr: "mm" },
      { nameKey: "unit.meters", abbr: "m" },
      { nameKey: "unit.inches", abbr: "in" },
      { nameKey: "unit.feet", abbr: "ft" },
      { nameKey: "unit.yards", abbr: "yd" },
    ],
  },
  {
    key: "weight" as Category,
    labelKey: "unit.weight",
    units: [
      { nameKey: "unit.grams", abbr: "g" },
      { nameKey: "unit.kilograms", abbr: "kg" },
      { nameKey: "unit.pounds", abbr: "lb" },
      { nameKey: "unit.ounces", abbr: "oz" },
    ],
  },
  {
    key: "temperature" as Category,
    labelKey: "unit.temperature",
    units: [
      { nameKey: "unit.celsius", abbr: "\u00B0C" },
      { nameKey: "unit.fahrenheit", abbr: "\u00B0F" },
      { nameKey: "unit.kelvin", abbr: "K" },
    ],
  },
  {
    key: "data" as Category,
    labelKey: "unit.data",
    units: [
      { nameKey: "unit.bytes", abbr: "B" },
      { nameKey: "unit.kilobytes", abbr: "KB" },
      { nameKey: "unit.megabytes", abbr: "MB" },
      { nameKey: "unit.gigabytes", abbr: "GB" },
      { nameKey: "unit.terabytes", abbr: "TB" },
    ],
  },
];

// Conversion factors to a base unit per category
// CSS: base = px
// Length: base = meters
// Weight: base = grams
// Data: base = bytes

const CSS_TO_PX: Record<string, (val: number, base: number) => number> = {
  px: (v) => v,
  rem: (v, base) => v * base,
  em: (v, base) => v * base,
  pt: (v) => v * (96 / 72),
};

const PX_FROM: Record<string, (px: number, base: number) => number> = {
  px: (v) => v,
  rem: (v, base) => v / base,
  em: (v, base) => v / base,
  pt: (v) => v / (96 / 72),
};

const LENGTH_TO_M: Record<string, number> = {
  cm: 0.01,
  mm: 0.001,
  m: 1,
  in: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
};

const WEIGHT_TO_G: Record<string, number> = {
  g: 1,
  kg: 1000,
  lb: 453.592,
  oz: 28.3495,
};

const DATA_TO_B: Record<string, number> = {
  B: 1,
  KB: 1024,
  MB: 1024 ** 2,
  GB: 1024 ** 3,
  TB: 1024 ** 4,
};

function convertTemperature(value: number, from: string, to: string): number {
  // Convert to Celsius first
  let celsius: number;
  switch (from) {
    case "\u00B0C": celsius = value; break;
    case "\u00B0F": celsius = (value - 32) * (5 / 9); break;
    case "K": celsius = value - 273.15; break;
    default: celsius = value;
  }
  // Convert from Celsius to target
  switch (to) {
    case "\u00B0C": return celsius;
    case "\u00B0F": return celsius * (9 / 5) + 32;
    case "K": return celsius + 273.15;
    default: return celsius;
  }
}

function formatNumber(n: number): string {
  if (Number.isInteger(n) && Math.abs(n) < 1e15) return n.toString();
  if (Math.abs(n) < 0.0001 && n !== 0) return n.toExponential(6);
  const str = n.toPrecision(10);
  // Remove trailing zeros after decimal
  if (str.includes(".")) {
    return str.replace(/\.?0+$/, "");
  }
  return str;
}

export default function UnitConverterPage() {
  const { t } = useI18n();
  const [category, setCategory] = useState<Category>("css");
  const [inputValue, setInputValue] = useState("16");
  const [fromUnit, setFromUnit] = useState("px");
  const [baseFontSize, setBaseFontSize] = useState("16");

  const CATEGORIES = CATEGORIES_RAW.map((cat) => ({
    ...cat,
    label: t(cat.labelKey as Parameters<typeof t>[0]),
    units: cat.units.map((u) => ({
      abbr: u.abbr,
      name: u.nameKey.includes(".") ? t(u.nameKey as Parameters<typeof t>[0]) : u.nameKey,
    })),
  }));

  const currentCategory = CATEGORIES.find((c) => c.key === category)!;

  // Reset unit when category changes
  const handleCategoryChange = (cat: Category) => {
    setCategory(cat);
    setInputValue("16");
    const catDef = CATEGORIES.find((c) => c.key === cat)!;
    setFromUnit(catDef.units[0].abbr);
  };

  const conversions = useMemo(() => {
    const val = parseFloat(inputValue);
    if (isNaN(val)) return {};

    const results: Record<string, string> = {};
    const base = parseFloat(baseFontSize) || 16;

    const rawCategory = CATEGORIES_RAW.find((c) => c.key === category)!;
    for (const unit of rawCategory.units) {
      if (unit.abbr === fromUnit) {
        results[unit.abbr] = formatNumber(val);
        continue;
      }

      let converted: number;

      switch (category) {
        case "css": {
          const px = CSS_TO_PX[fromUnit](val, base);
          converted = PX_FROM[unit.abbr](px, base);
          break;
        }
        case "length": {
          const meters = val * LENGTH_TO_M[fromUnit];
          converted = meters / LENGTH_TO_M[unit.abbr];
          break;
        }
        case "weight": {
          const grams = val * WEIGHT_TO_G[fromUnit];
          converted = grams / WEIGHT_TO_G[unit.abbr];
          break;
        }
        case "temperature": {
          converted = convertTemperature(val, fromUnit, unit.abbr);
          break;
        }
        case "data": {
          const bytes = val * DATA_TO_B[fromUnit];
          converted = bytes / DATA_TO_B[unit.abbr];
          break;
        }
        default:
          converted = val;
      }

      results[unit.abbr] = formatNumber(converted);
    }

    return results;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue, fromUnit, category, baseFontSize]);

  return (
    <ToolLayout
      toolName="Unit Converter"
      toolDescription="Convert between px, rem, cm, inches and more"
    >
      <div className="space-y-6">
        {/* Category Tabs */}
        <div className="glass rounded-xl p-4">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => handleCategoryChange(cat.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  category === cat.key
                    ? "bg-accent text-white"
                    : "text-t-secondary hover:text-t-primary bg-bg-secondary border border-border"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Base Font Size (CSS only) */}
        {category === "css" && (
          <div className="glass rounded-xl p-6">
            <label className="block text-sm text-t-secondary mb-2">
              {t("unit.baseFontSize")}
            </label>
            <input
              type="number"
              value={baseFontSize}
              onChange={(e) => setBaseFontSize(e.target.value)}
              min="1"
              max="100"
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-3 text-t-primary placeholder-t-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono"
            />
            <p className="text-xs text-t-tertiary mt-2">
              {t("unit.remCalc")}
            </p>
          </div>
        )}

        {/* Input */}
        <div className="glass rounded-xl p-6">
          <label className="block text-sm text-t-secondary mb-2">{t("unit.enterValue")}</label>
          <div className="flex gap-3">
            <input
              type="number"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t("unit.enterValue")}
              className="flex-1 bg-bg-secondary border border-border rounded-lg px-4 py-3 text-t-primary placeholder-t-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono"
            />
            <select
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
              className="bg-bg-secondary border border-border rounded-lg px-4 py-3 text-t-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
            >
              {currentCategory.units.map((unit) => (
                <option key={unit.abbr} value={unit.abbr}>
                  {unit.abbr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        {inputValue && !isNaN(parseFloat(inputValue)) && (
          <div className="glass rounded-xl p-6">
            <label className="block text-sm text-t-secondary mb-4">{t("unit.conversions")}</label>
            <div className="grid gap-3">
              {currentCategory.units.map((unit) => (
                <div
                  key={unit.abbr}
                  className={`flex items-center justify-between bg-bg-secondary border rounded-lg px-4 py-3 ${
                    unit.abbr === fromUnit
                      ? "border-accent/50 bg-accent/5"
                      : "border-border"
                  }`}
                >
                  <div>
                    <span className="text-sm text-t-secondary">{unit.name}</span>
                    <span className="text-xs text-t-tertiary ml-2">({unit.abbr})</span>
                  </div>
                  <span className="text-t-primary font-mono font-semibold">
                    {conversions[unit.abbr] ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
