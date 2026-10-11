"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

/** "3 hours ago" / "in 2 days", in the UI language (Intl handles plurals). */
function getRelativeTime(date: Date, locale: string): string {
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSeconds);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (abs < 60) return rtf.format(diffSeconds, "second");
  if (abs < 3600) return rtf.format(Math.trunc(diffSeconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.trunc(diffSeconds / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.trunc(diffSeconds / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.trunc(diffSeconds / (86400 * 30)), "month");
  return rtf.format(Math.trunc(diffSeconds / (86400 * 365)), "year");
}

function toDatetimeLocalString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function TimestampConverterPage() {
  const { t, locale } = useI18n();
  // Time-dependent values start empty and are filled after mount, so the
  // server-rendered HTML (UTC, earlier second) never mismatches the client.
  const [currentTimestamp, setCurrentTimestamp] = useState<number | null>(null);

  // Unix -> Date
  const [unixInput, setUnixInput] = useState("");
  const [convertedDate, setConvertedDate] = useState<Date | null>(null);
  const [unixError, setUnixError] = useState("");

  // Date -> Unix
  const [dateInput, setDateInput] = useState("");
  const [convertedUnix, setConvertedUnix] = useState<number | null>(null);

  // Live clock
  useEffect(() => {
    setCurrentTimestamp(Math.floor(Date.now() / 1000));
    const interval = setInterval(() => {
      setCurrentTimestamp(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Unix -> Date conversion
  const convertUnixToDate = useCallback(() => {
    const trimmed = unixInput.trim();
    if (!trimmed) {
      setConvertedDate(null);
      setUnixError("");
      return;
    }
    const num = Number(trimmed);
    if (isNaN(num)) {
      setUnixError("Please enter a valid number");
      setConvertedDate(null);
      return;
    }
    // Handle seconds vs milliseconds: if > 1e12, treat as milliseconds
    const ms = num > 1e12 ? num : num * 1000;
    const date = new Date(ms);
    if (isNaN(date.getTime())) {
      setUnixError("Invalid timestamp");
      setConvertedDate(null);
      return;
    }
    setUnixError("");
    setConvertedDate(date);
  }, [unixInput]);

  useEffect(() => {
    convertUnixToDate();
  }, [convertUnixToDate]);

  // Date -> Unix conversion
  const convertDateToUnix = useCallback(() => {
    if (!dateInput) {
      setConvertedUnix(null);
      return;
    }
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) {
      setConvertedUnix(null);
      return;
    }
    setConvertedUnix(date.getTime());
  }, [dateInput]);

  useEffect(() => {
    convertDateToUnix();
  }, [convertDateToUnix]);

  // Pre-fill on mount
  useEffect(() => {
    const now = new Date();
    setUnixInput(Math.floor(now.getTime() / 1000).toString());
    setDateInput(toDatetimeLocalString(now));
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const copyToClipboard = async (text: string, _label?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("ui.copied"));
    } catch {
      toast.error(t("ui.copyFailed"));
    }
  };

  const dateFormats = convertedDate
    ? [
        {
          label: t("ts.iso"),
          value: convertedDate.toISOString(),
        },
        {
          label: t("ts.localDate"),
          value: convertedDate.toLocaleString(locale),
        },
        {
          label: t("ts.utcDate"),
          value: convertedDate.toUTCString(),
        },
        {
          label: t("ts.relative"),
          value: getRelativeTime(convertedDate, locale),
        },
      ]
    : [];

  return (
    <ToolLayout
      toolName="Timestamp Converter"
      toolDescription="Convert between Unix timestamps and human-readable dates. Multiple formats supported. Everything runs in your browser."
    >
      <div className="space-y-6">
        {/* Current Timestamp */}
        <div className="glass rounded-2xl p-6 text-center">
          <p className="text-sm text-t-secondary mb-2">
            {t("ts.currentTimestamp")}
          </p>
          <button
            onClick={() =>
              currentTimestamp !== null && copyToClipboard(currentTimestamp.toString())
            }
            className="text-3xl font-bold font-mono gradient-text hover:opacity-80 transition-opacity cursor-pointer tabular-nums"
          >
            {currentTimestamp ?? "\u00a0"}
          </button>
          <p className="text-xs text-t-tertiary mt-2">{t("ts.clickCopy")}</p>
        </div>

        {/* Unix -> Date */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-t-primary mb-4">
            {t("ts.toDate")}
          </h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={unixInput}
              onChange={(e) => setUnixInput(e.target.value)}
              placeholder={t("ts.enterTimestamp")}
              className="flex-1 px-4 py-3 rounded-xl bg-bg-secondary border border-border text-t-primary placeholder:text-t-tertiary focus:outline-none focus:border-accent text-sm font-mono transition-colors"
            />
            <button
              onClick={() =>
                setUnixInput(Math.floor(Date.now() / 1000).toString())
              }
              className="px-4 py-3 rounded-xl text-sm font-medium text-t-secondary bg-bg-secondary border border-border hover:bg-bg-tertiary hover:text-t-primary transition-all whitespace-nowrap"
            >
              {t("ts.now")}
            </button>
          </div>

          {unixError && (
            <p className="text-xs text-red-700 dark:text-red-400 mt-2">{unixError === "Please enter a valid number" ? t("ts.invalidNumber") : t("ts.invalidTimestamp")}</p>
          )}

          {dateFormats.length > 0 && (
            <div className="mt-4 space-y-3">
              {dateFormats.map(({ label, value }) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-bg-secondary border border-border"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-t-tertiary mb-0.5">{label}</p>
                    <p className="text-sm text-t-primary font-mono truncate">
                      {value}
                    </p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(value, label)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-t-secondary bg-bg-secondary border border-border hover:bg-bg-tertiary hover:text-t-primary transition-all"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                    {t("ui.copy")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Date -> Unix */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-semibold text-t-primary mb-4">
            {t("ts.toTimestamp")}
          </h3>
          <input
            type="datetime-local"
            value={dateInput}
            onChange={(e) => setDateInput(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border text-t-primary focus:outline-none focus:border-accent text-sm transition-colors"
          />

          {convertedUnix !== null && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-bg-secondary border border-border">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-t-tertiary mb-0.5">
                    {t("ts.seconds")}
                  </p>
                  <p className="text-sm text-t-primary font-mono">
                    {Math.floor(convertedUnix / 1000)}
                  </p>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(
                      Math.floor(convertedUnix / 1000).toString(),
                      "Unix timestamp (seconds)"
                    )
                  }
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-t-secondary bg-bg-secondary border border-border hover:bg-bg-tertiary hover:text-t-primary transition-all"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  {t("ui.copy")}
                </button>
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-bg-secondary border border-border">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-t-tertiary mb-0.5">
                    {t("ts.milliseconds")}
                  </p>
                  <p className="text-sm text-t-primary font-mono">
                    {convertedUnix}
                  </p>
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(
                      convertedUnix.toString(),
                      "Unix timestamp (milliseconds)"
                    )
                  }
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-t-secondary bg-bg-secondary border border-border hover:bg-bg-tertiary hover:text-t-primary transition-all"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                  {t("ui.copy")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
