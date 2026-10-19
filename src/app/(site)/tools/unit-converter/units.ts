/** Unit definitions: linear units are a factor to the category's base unit. */

export type CategoryKey = "length" | "weight" | "temperature" | "volume" | "area" | "speed" | "time" | "data" | "pressure" | "energy" | "angle" | "css";

export interface UnitDef {
  id: string;
  symbol: string;
  /** Intl unit identifier for a localized name, when one exists. */
  intl?: string;
  /** Factor to the base unit (value × factor = base). */
  factor?: number;
  toBase?: (v: number, ctx: Ctx) => number;
  fromBase?: (v: number, ctx: Ctx) => number;
}

export interface Ctx {
  /** CSS root font size in px. */
  rootPx: number;
}

export interface Category {
  key: CategoryKey;
  labelKey: string;
  units: UnitDef[];
  defaultUnit: string;
}

export const CATEGORIES: Category[] = [
  {
    key: "length",
    labelKey: "unit.length",
    defaultUnit: "m",
    units: [
      { id: "mm", symbol: "mm", intl: "millimeter", factor: 0.001 },
      { id: "cm", symbol: "cm", intl: "centimeter", factor: 0.01 },
      { id: "m", symbol: "m", intl: "meter", factor: 1 },
      { id: "km", symbol: "km", intl: "kilometer", factor: 1000 },
      { id: "in", symbol: "in", intl: "inch", factor: 0.0254 },
      { id: "ft", symbol: "ft", intl: "foot", factor: 0.3048 },
      { id: "yd", symbol: "yd", intl: "yard", factor: 0.9144 },
      { id: "mi", symbol: "mi", intl: "mile", factor: 1609.344 },
      { id: "nmi", symbol: "nmi", factor: 1852 },
    ],
  },
  {
    key: "weight",
    labelKey: "unit.weight",
    defaultUnit: "kg",
    units: [
      { id: "mg", symbol: "mg", factor: 1e-6 },
      { id: "g", symbol: "g", intl: "gram", factor: 0.001 },
      { id: "kg", symbol: "kg", intl: "kilogram", factor: 1 },
      { id: "t", symbol: "t", factor: 1000 },
      { id: "oz", symbol: "oz", intl: "ounce", factor: 0.028349523125 },
      { id: "lb", symbol: "lb", intl: "pound", factor: 0.45359237 },
      { id: "st", symbol: "st", intl: "stone", factor: 6.35029318 },
    ],
  },
  {
    key: "temperature",
    labelKey: "unit.temperature",
    defaultUnit: "c",
    units: [
      { id: "c", symbol: "°C", intl: "celsius", toBase: (v) => v, fromBase: (v) => v },
      { id: "f", symbol: "°F", intl: "fahrenheit", toBase: (v) => ((v - 32) * 5) / 9, fromBase: (v) => (v * 9) / 5 + 32 },
      { id: "k", symbol: "K", toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    ],
  },
  {
    key: "volume",
    labelKey: "unit.v2.volume",
    defaultUnit: "l",
    units: [
      { id: "ml", symbol: "ml", intl: "milliliter", factor: 0.001 },
      { id: "l", symbol: "l", intl: "liter", factor: 1 },
      { id: "m3", symbol: "m³", factor: 1000 },
      { id: "tsp", symbol: "tsp", factor: 0.00492892159375 },
      { id: "tbsp", symbol: "tbsp", factor: 0.01478676478125 },
      { id: "floz", symbol: "fl oz", intl: "fluid-ounce", factor: 0.0295735295625 },
      { id: "cup", symbol: "cup (US)", factor: 0.2365882365 },
      { id: "pt", symbol: "pt (US)", factor: 0.473176473 },
      { id: "gal", symbol: "gal (US)", intl: "gallon", factor: 3.785411784 },
      { id: "galuk", symbol: "gal (UK)", factor: 4.54609 },
    ],
  },
  {
    key: "area",
    labelKey: "unit.v2.area",
    defaultUnit: "m2",
    units: [
      { id: "cm2", symbol: "cm²", factor: 1e-4 },
      { id: "m2", symbol: "m²", factor: 1 },
      { id: "ha", symbol: "ha", intl: "hectare", factor: 1e4 },
      { id: "km2", symbol: "km²", factor: 1e6 },
      { id: "ft2", symbol: "ft²", factor: 0.09290304 },
      { id: "yd2", symbol: "yd²", factor: 0.83612736 },
      { id: "ac", symbol: "ac", intl: "acre", factor: 4046.8564224 },
      { id: "mi2", symbol: "mi²", factor: 2589988.110336 },
    ],
  },
  {
    key: "speed",
    labelKey: "unit.v2.speed",
    defaultUnit: "kmh",
    units: [
      { id: "ms", symbol: "m/s", intl: "meter-per-second", factor: 1 },
      { id: "kmh", symbol: "km/h", intl: "kilometer-per-hour", factor: 1 / 3.6 },
      { id: "mph", symbol: "mph", intl: "mile-per-hour", factor: 0.44704 },
      { id: "kn", symbol: "kn", factor: 1852 / 3600 },
      { id: "fts", symbol: "ft/s", intl: "foot-per-second", factor: 0.3048 },
    ],
  },
  {
    key: "time",
    labelKey: "unit.v2.time",
    defaultUnit: "h",
    units: [
      { id: "ms", symbol: "ms", intl: "millisecond", factor: 0.001 },
      { id: "s", symbol: "s", intl: "second", factor: 1 },
      { id: "min", symbol: "min", intl: "minute", factor: 60 },
      { id: "h", symbol: "h", intl: "hour", factor: 3600 },
      { id: "d", symbol: "d", intl: "day", factor: 86400 },
      { id: "wk", symbol: "wk", intl: "week", factor: 604800 },
      { id: "mo", symbol: "mo", intl: "month", factor: 2629746 },
      { id: "yr", symbol: "yr", intl: "year", factor: 31556952 },
    ],
  },
  {
    key: "data",
    labelKey: "unit.data",
    defaultUnit: "MB",
    units: [
      { id: "bit", symbol: "bit", intl: "bit", factor: 0.125 },
      { id: "B", symbol: "B", intl: "byte", factor: 1 },
      { id: "KB", symbol: "KB", intl: "kilobyte", factor: 1e3 },
      { id: "MB", symbol: "MB", intl: "megabyte", factor: 1e6 },
      { id: "GB", symbol: "GB", intl: "gigabyte", factor: 1e9 },
      { id: "TB", symbol: "TB", intl: "terabyte", factor: 1e12 },
      { id: "KiB", symbol: "KiB", factor: 1024 },
      { id: "MiB", symbol: "MiB", factor: 1024 ** 2 },
      { id: "GiB", symbol: "GiB", factor: 1024 ** 3 },
      { id: "TiB", symbol: "TiB", factor: 1024 ** 4 },
      { id: "Mbit", symbol: "Mbit", intl: "megabit", factor: 125000 },
      { id: "Gbit", symbol: "Gbit", intl: "gigabit", factor: 125000000 },
    ],
  },
  {
    key: "pressure",
    labelKey: "unit.v2.pressure",
    defaultUnit: "bar",
    units: [
      { id: "pa", symbol: "Pa", factor: 1 },
      { id: "kpa", symbol: "kPa", factor: 1000 },
      { id: "bar", symbol: "bar", factor: 1e5 },
      { id: "psi", symbol: "psi", factor: 6894.757293168 },
      { id: "atm", symbol: "atm", factor: 101325 },
      { id: "mmhg", symbol: "mmHg", factor: 133.322387415 },
    ],
  },
  {
    key: "energy",
    labelKey: "unit.v2.energy",
    defaultUnit: "kcal",
    units: [
      { id: "j", symbol: "J", factor: 1 },
      { id: "kj", symbol: "kJ", factor: 1000 },
      { id: "cal", symbol: "cal", factor: 4.184 },
      { id: "kcal", symbol: "kcal", factor: 4184 },
      { id: "wh", symbol: "Wh", factor: 3600 },
      { id: "kwh", symbol: "kWh", factor: 3.6e6 },
    ],
  },
  {
    key: "angle",
    labelKey: "unit.v2.angle",
    defaultUnit: "deg",
    units: [
      { id: "deg", symbol: "°", intl: "degree", factor: Math.PI / 180 },
      { id: "rad", symbol: "rad", factor: 1 },
      { id: "grad", symbol: "gon", factor: Math.PI / 200 },
      { id: "turn", symbol: "turn", factor: 2 * Math.PI },
    ],
  },
  {
    key: "css",
    labelKey: "unit.cssUnits",
    defaultUnit: "px",
    units: [
      { id: "px", symbol: "px", factor: 1 },
      { id: "rem", symbol: "rem", toBase: (v, c) => v * c.rootPx, fromBase: (v, c) => v / c.rootPx },
      { id: "pt", symbol: "pt", factor: 96 / 72 },
      { id: "pc", symbol: "pc", factor: 16 },
      { id: "in", symbol: "in", factor: 96 },
      { id: "cm", symbol: "cm", factor: 96 / 2.54 },
      { id: "mm", symbol: "mm", factor: 96 / 25.4 },
      { id: "pct", symbol: "%", toBase: (v, c) => (v / 100) * c.rootPx, fromBase: (v, c) => (v / c.rootPx) * 100 },
    ],
  },
];

export function toBase(u: UnitDef, v: number, ctx: Ctx): number {
  return u.toBase ? u.toBase(v, ctx) : v * (u.factor ?? 1);
}

export function fromBase(u: UnitDef, v: number, ctx: Ctx): number {
  return u.fromBase ? u.fromBase(v, ctx) : v / (u.factor ?? 1);
}

/** Localized long unit name from Intl (e.g. "kilomètres"), or null. */
export function unitName(u: UnitDef, locale: string): string | null {
  if (!u.intl) return null;
  try {
    const parts = new Intl.NumberFormat(locale, { style: "unit", unit: u.intl, unitDisplay: "long" }).formatToParts(2);
    const name = parts
      .filter((p) => p.type === "unit")
      .map((p) => p.value)
      .join("")
      .trim();
    return name || null;
  } catch {
    return null;
  }
}

/** Up to 10 significant digits; no digit grouping, so a shown value can be edited and read back. */
export function formatValue(v: number, locale: string): string {
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a !== 0 && (a < 1e-6 || a >= 1e15)) return v.toExponential(6).replace(/\.?0+e/, "e");
  return new Intl.NumberFormat(locale, { maximumSignificantDigits: 10, useGrouping: false }).format(v);
}
