/** Timestamp parsing (s / ms / µs / ns, ISO, RFC 2822) and time-zone helpers. */

export type Unit = "s" | "ms" | "us" | "ns";

export interface Parsed {
  ms: number;
  /** How the input was read. */
  as: Unit | "date";
}

/** Guess the unit of a bare number from its magnitude (dates between 1973 and 5138). */
export function guessUnit(digits: number): Unit {
  if (digits <= 11) return "s";
  if (digits <= 14) return "ms";
  if (digits <= 17) return "us";
  return "ns";
}

export function parseInput(raw: string, force: Unit | "auto"): Parsed | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^now$/i.test(s)) return { ms: Date.now(), as: "date" };
  const num = /^[-+]?\d+(\.\d+)?$/.test(s.replace(/[_,\s]/g, "")) ? s.replace(/[_,\s]/g, "") : null;
  if (num) {
    const intDigits = num.replace(/^[-+]/, "").split(".")[0]!.length;
    const unit = force === "auto" ? guessUnit(intDigits) : force;
    const n = Number(num);
    const ms = unit === "s" ? n * 1000 : unit === "ms" ? n : unit === "us" ? n / 1000 : n / 1e6;
    return Number.isFinite(ms) && Math.abs(ms) <= 8.64e15 ? { ms, as: unit } : null;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : { ms: d.getTime(), as: "date" };
}

/** Offset (minutes, east of UTC) of a time zone at an instant. */
export function zoneOffset(ms: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(ms));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

/** A wall-clock time ("2026-03-29T02:30") in a zone → epoch ms (DST-aware). */
export function wallToEpoch(wall: string, timeZone: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(wall);
  if (!m) return null;
  const guess = Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!, +(m[6] ?? 0));
  let ms = guess - zoneOffset(guess, timeZone) * 60000;
  ms = guess - zoneOffset(ms, timeZone) * 60000;
  return ms;
}

export function formatOffset(min: number): string {
  const sign = min < 0 ? "-" : "+";
  const a = Math.abs(min);
  return `UTC${sign}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
}

/** ISO 8601 with the zone's own offset, e.g. 2026-10-13T12:00:00+03:00. */
export function isoInZone(ms: number, timeZone: string): string {
  const off = zoneOffset(ms, timeZone);
  const d = new Date(ms + off * 60000);
  const base = d.toISOString().slice(0, 19);
  const frac = ms % 1000 ? `.${String(((ms % 1000) + 1000) % 1000).padStart(3, "0")}` : "";
  return off === 0 ? `${base}${frac}Z` : `${base}${frac}${formatOffset(off).slice(3)}`;
}

/** ISO 8601 week number of the calendar date in `ms` (read with UTC getters). */
export function isoWeek(ms: number): number {
  const s = new Date(ms);
  const d = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / 86400000 + 1) / 7);
}

export function dayOfYear(ms: number): number {
  const d = new Date(ms);
  return Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000) + 1;
}
