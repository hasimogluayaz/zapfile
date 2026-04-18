"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";

interface City {
  name: string;
  country: string;
  flag: string;
  timezone: string;
}

const CITIES: City[] = [
  { name: "Istanbul", country: "Turkey", flag: "🇹🇷", timezone: "Europe/Istanbul" },
  { name: "London", country: "UK", flag: "🇬🇧", timezone: "Europe/London" },
  { name: "New York", country: "USA", flag: "🇺🇸", timezone: "America/New_York" },
  { name: "Los Angeles", country: "USA", flag: "🇺🇸", timezone: "America/Los_Angeles" },
  { name: "Tokyo", country: "Japan", flag: "🇯🇵", timezone: "Asia/Tokyo" },
  { name: "Dubai", country: "UAE", flag: "🇦🇪", timezone: "Asia/Dubai" },
  { name: "Sydney", country: "Australia", flag: "🇦🇺", timezone: "Australia/Sydney" },
  { name: "Paris", country: "France", flag: "🇫🇷", timezone: "Europe/Paris" },
  { name: "Berlin", country: "Germany", flag: "🇩🇪", timezone: "Europe/Berlin" },
  { name: "Singapore", country: "Singapore", flag: "🇸🇬", timezone: "Asia/Singapore" },
  { name: "São Paulo", country: "Brazil", flag: "🇧🇷", timezone: "America/Sao_Paulo" },
  { name: "Mumbai", country: "India", flag: "🇮🇳", timezone: "Asia/Kolkata" },
  { name: "Moscow", country: "Russia", flag: "🇷🇺", timezone: "Europe/Moscow" },
  { name: "Beijing", country: "China", flag: "🇨🇳", timezone: "Asia/Shanghai" },
  { name: "Cairo", country: "Egypt", flag: "🇪🇬", timezone: "Africa/Cairo" },
  { name: "Toronto", country: "Canada", flag: "🇨🇦", timezone: "America/Toronto" },
];

function getTimeInZone(timezone: string, use24h: boolean): { time: string; date: string; offset: string; hour: number } {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: !use24h,
  });
  const dateStr = now.toLocaleDateString("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const hour = parseInt(
    now.toLocaleTimeString("en-US", { timeZone: timezone, hour: "numeric", hour12: false })
  );

  // Get UTC offset
  const offsetMin = -new Date(
    now.toLocaleString("en-US", { timeZone: timezone })
  ).getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const absMin = Math.abs(offsetMin);
  const h = Math.floor(absMin / 60);
  const m = absMin % 60;
  const offset = `UTC${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

  return { time: timeStr, date: dateStr, offset, hour };
}

function isDaytime(hour: number): boolean {
  return hour >= 6 && hour < 20;
}

export default function WorldClockPage() {
  const [now, setNow] = useState<Date | null>(null);
  const [use24h, setUse24h] = useState(true);
  const [search, setSearch] = useState("");
  const [localTZ] = useState(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return ""; }
  });

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const filtered = CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.country.toLowerCase().includes(search.toLowerCase())
  );

  if (!now) return null;

  return (
    <ToolLayout
      toolName="World Clock"
      toolDescription="See current time in cities around the world. Updates every second."
    >
      <div className="space-y-5">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Search city or country…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-bg-secondary border border-border text-t-primary text-sm focus:outline-none focus:border-accent/50"
          />
          <button
            onClick={() => setUse24h((v) => !v)}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors whitespace-nowrap"
          >
            {use24h ? "12h format" : "24h format"}
          </button>
        </div>

        {/* Clocks Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((city) => {
            const { time, date, offset, hour } = getTimeInZone(city.timezone, use24h);
            const isLocal = city.timezone === localTZ;
            const daytime = isDaytime(hour);

            return (
              <div
                key={city.timezone}
                className={`glass rounded-xl p-4 flex items-center gap-4 ${
                  isLocal ? "ring-1 ring-accent/40" : ""
                }`}
              >
                {/* Flag + day/night */}
                <div className="relative shrink-0">
                  <span className="text-3xl">{city.flag}</span>
                  <span className="absolute -bottom-1 -right-1 text-base">
                    {daytime ? "☀️" : "🌙"}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-t-primary text-sm truncate">{city.name}</span>
                    {isLocal && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/20 text-accent font-semibold shrink-0">
                        LOCAL
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-t-tertiary">{city.country} · {offset}</div>
                  <div className="text-xs text-t-secondary mt-0.5">{date}</div>
                </div>

                {/* Time */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(time).then(() =>
                      toast.success(`Copied: ${time}`)
                    );
                  }}
                  className="font-mono text-right font-bold text-t-primary text-lg tabular-nums hover:text-accent transition-colors shrink-0"
                  title="Click to copy"
                >
                  {time}
                </button>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-t-tertiary text-sm py-8">No cities found for &ldquo;{search}&rdquo;</p>
        )}
      </div>
    </ToolLayout>
  );
}
