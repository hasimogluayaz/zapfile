"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, Plus, X } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import { Segmented, sectionTitle } from "@/components/ui/controls";
import { useI18n } from "@/lib/i18n";
import { useStoredPref } from "@/lib/text-tools/hooks";
import { CopyButton, smallButton } from "@/lib/text-tools/ui";
import { dayOfYear, formatOffset, isoInZone, isoWeek, parseInput, wallToEpoch, zoneOffset, type Unit } from "./time-core";

const DEFAULT_ZONES = ["UTC", "America/New_York", "Europe/London", "Europe/Istanbul", "Asia/Tokyo"];
const ZONES_KEY = "zapfile.ts.zones";

function relative(ms: number, now: number, locale: string): string {
  const diff = (ms - now) / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.trunc(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.trunc(diff / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.trunc(diff / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.trunc(diff / (86400 * 30)), "month");
  return rtf.format(Math.trunc(diff / (86400 * 365)), "year");
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-40 shrink-0 text-[13px] text-t-tertiary">{label}</span>
      <code dir="ltr" className="min-w-0 flex-1 break-all font-mono text-[13.5px] text-t-primary">
        {value}
      </code>
      <CopyButton getText={() => value} iconOnly />
    </div>
  );
}

export default function TimestampConverterPage() {
  const { t, locale } = useI18n();
  const [now, setNow] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [unit, setUnit] = useStoredPref<Unit | "auto">("ts.unit", "auto", ["auto", "s", "ms", "us", "ns"]);
  const [zones, setZones] = useState<string[]>(DEFAULT_ZONES);
  const [allZones, setAllZones] = useState<string[]>([]);
  const [wall, setWall] = useState("");
  const [wallZone, setWallZone] = useState("UTC");
  const [adding, setAdding] = useState("");
  const localZone = useMemo(() => (typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC"), []);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    try {
      const saved = JSON.parse(localStorage.getItem(ZONES_KEY) ?? "null") as string[] | null;
      if (Array.isArray(saved) && saved.length) setZones(saved);
    } catch {
      /* defaults */
    }
    try {
      const list = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? DEFAULT_ZONES;
      // "UTC" and the device's own zone may be missing from the canonical list.
      setAllZones(Array.from(new Set(["UTC", Intl.DateTimeFormat().resolvedOptions().timeZone, ...list])));
    } catch {
      setAllZones(DEFAULT_ZONES);
    }
    setWallZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    return () => clearInterval(id);
  }, []);

  const saveZones = (z: string[]) => {
    setZones(z);
    try {
      localStorage.setItem(ZONES_KEY, JSON.stringify(z));
    } catch {
      /* blocked */
    }
  };

  const parsed = useMemo(() => parseInput(input, unit), [input, unit]);
  const ms = parsed?.ms ?? null;
  const wallMs = useMemo(() => (wall ? wallToEpoch(wall, wallZone) : null), [wall, wallZone]);

  const fmt = (v: number, timeZone: string) =>
    new Intl.DateTimeFormat(locale, { timeZone, dateStyle: "full", timeStyle: "long" }).format(new Date(v));

  const unitLabel: Record<Unit, string> = { s: t("ts.seconds"), ms: t("ts.milliseconds"), us: t("ts.v2.micro"), ns: t("ts.v2.nano") };

  return (
    <ToolLayout toolName={t("tool.timestamp-converter.name")} toolDescription={t("tool.timestamp-converter.desc")}>
      <div className="space-y-5">
        {/* Live clock */}
        <div className="glass flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className={sectionTitle}>{t("ts.currentTimestamp")}</p>
            <p className="mt-1 font-mono text-[28px] font-semibold tabular-nums text-t-primary" suppressHydrationWarning>
              {now === null ? " " : Math.floor(now / 1000)}
            </p>
          </div>
          <div className="flex gap-2">
            <CopyButton getText={() => String(Math.floor(Date.now() / 1000))} label={t("ts.seconds")} />
            <CopyButton getText={() => String(Date.now())} label={t("ts.milliseconds")} />
            <button type="button" className={smallButton} onClick={() => setInput(String(Math.floor(Date.now() / 1000)))}>
              <Clock className="h-4 w-4" aria-hidden="true" />
              {t("ts.now")}
            </button>
          </div>
        </div>

        {/* Any input */}
        <div className="glass space-y-4 p-5">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-t-secondary">{t("ts.v2.input")}</span>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="1700000000 · 1700000000000 · 2026-10-13T09:30:00Z"
              spellCheck={false}
              dir="ltr"
              className="h-12 w-full rounded-xl border border-border bg-bg-secondary px-3 font-mono text-[15px] text-t-primary placeholder:text-t-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented<Unit | "auto">
              label={t("ts.v2.unit")}
              size="sm"
              value={unit}
              onChange={setUnit}
              options={[
                { value: "auto", label: t("ts.v2.auto") },
                { value: "s", label: "s" },
                { value: "ms", label: "ms" },
                { value: "us", label: "µs" },
                { value: "ns", label: "ns" },
              ]}
            />
            {parsed && parsed.as !== "date" && <span className="text-[12.5px] text-t-tertiary">{t("ts.v2.readAs", { unit: unitLabel[parsed.as] })}</span>}
          </div>
          {input.trim() && !parsed && <p className="text-[13px] text-red-700 dark:text-red-400">{t("ts.v2.unreadable")}</p>}

          {ms !== null && now !== null && (
            <div className="divide-y divide-border border-t border-border">
              <Row label={t("ts.seconds")} value={String(Math.floor(ms / 1000))} />
              <Row label={t("ts.milliseconds")} value={String(Math.round(ms))} />
              <Row label="ISO 8601 (UTC)" value={new Date(ms).toISOString()} />
              {localZone !== "UTC" && localZone !== "Etc/UTC" && <Row label={`ISO 8601 (${localZone})`} value={isoInZone(ms, localZone)} />}
              <Row label="RFC 2822" value={new Date(ms).toUTCString()} />
              <Row label={t("ts.localDate")} value={fmt(ms, localZone)} />
              <Row label={t("ts.relative")} value={relative(ms, now, locale)} />
              <Row
                label={t("ts.v2.calendar")}
                value={t("ts.v2.calendarValue", { week: isoWeek(ms + zoneOffset(ms, localZone) * 60000), day: dayOfYear(ms + zoneOffset(ms, localZone) * 60000) })}
              />
            </div>
          )}
        </div>

        {/* World clock for the instant */}
        {ms !== null && (
          <div className="glass space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={sectionTitle}>{t("ts.v2.zones")}</p>
              <div className="flex gap-2">
                <select value={adding} onChange={(e) => setAdding(e.target.value)} aria-label={t("ts.v2.addZone")} className="h-9 max-w-[220px] rounded-lg border border-border bg-bg-secondary px-2 text-[13px] text-t-primary">
                  <option value="">{t("ts.v2.addZone")}</option>
                  {allZones
                    .filter((z) => !zones.includes(z))
                    .map((z) => (
                      <option key={z} value={z}>
                        {z.replace(/_/g, " ")}
                      </option>
                    ))}
                </select>
                <button type="button" className={smallButton} disabled={!adding} onClick={() => (saveZones([...zones, adding]), setAdding(""))}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t("urlenc.v2.addParam")}
                </button>
              </div>
            </div>
            <ul className="divide-y divide-border">
              {zones.map((z) => {
                let label = "";
                let off = 0;
                try {
                  label = fmt(ms, z);
                  off = zoneOffset(ms, z);
                } catch {
                  return null;
                }
                return (
                  <li key={z} className="flex items-center gap-3 py-2">
                    <div className="w-44 shrink-0">
                      <p className="text-[13.5px] font-medium text-t-primary">{z.replace(/_/g, " ")}</p>
                      <p className="text-[12px] tabular-nums text-t-tertiary">{formatOffset(off)}</p>
                    </div>
                    <span className="min-w-0 flex-1 text-[13.5px] text-t-secondary">{label}</span>
                    <CopyButton getText={() => isoInZone(ms, z)} iconOnly />
                    <button type="button" onClick={() => saveZones(zones.filter((x) => x !== z))} aria-label={`${t("ui.remove")} ${z}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-t-tertiary hover:bg-bg-secondary hover:text-t-primary">
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Date → timestamp */}
        <div className="glass space-y-4 p-5">
          <p className={sectionTitle}>{t("ts.toTimestamp")}</p>
          <div className="flex flex-wrap gap-3">
            <input
              type="datetime-local"
              step={1}
              value={wall}
              onChange={(e) => setWall(e.target.value)}
              aria-label={t("ts.v2.dateTime")}
              className="h-11 rounded-xl border border-border bg-bg-secondary px-3 text-[14px] text-t-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
            />
            <select value={wallZone} onChange={(e) => setWallZone(e.target.value)} aria-label={t("ts.v2.zone")} className="h-11 min-w-0 max-w-full rounded-xl border border-border bg-bg-secondary px-3 text-[14px] text-t-primary">
              {(allZones.length ? allZones : DEFAULT_ZONES).map((z) => (
                <option key={z} value={z}>
                  {z.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>
          {wallMs !== null && (
            <div className="divide-y divide-border border-t border-border">
              <Row label={t("ts.seconds")} value={String(Math.floor(wallMs / 1000))} />
              <Row label={t("ts.milliseconds")} value={String(wallMs)} />
              <Row label="ISO 8601 (UTC)" value={new Date(wallMs).toISOString()} />
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
