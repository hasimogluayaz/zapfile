"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

function getRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const absDiff = Math.abs(diff);
  const isFuture = diff < 0;

  const seconds = Math.floor(absDiff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  let label: string;
  if (seconds < 60) label = `${seconds} second${seconds !== 1 ? "s" : ""}`;
  else if (minutes < 60) label = `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  else if (hours < 24) label = `${hours} hour${hours !== 1 ? "s" : ""}`;
  else if (days < 30) label = `${days} day${days !== 1 ? "s" : ""}`;
  else if (months < 12) label = `${months} month${months !== 1 ? "s" : ""}`;
  else label = `${years} year${years !== 1 ? "s" : ""}`;

  return isFuture ? `in ${label}` : `${label} ago`;
}

function toDatetimeLocalString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function TimestampConverterPage() {
  const { t } = useI18n();
  const [currentTimestamp, setCurrentTimestamp] = useState(
    Math.floor(Date.now() / 1000)
  );

  // Unix -> Date
  const [unixInput, setUnixInput] = useState(
    Math.floor(Date.now() / 1000).toString()
  );
  const [convertedDate, setConvertedDate] = useState<Date | null>(null);
  const [unixError, setUnixError] = useState("");

  // Date -> Unix
  const [dateInput, setDateInput] = useState(
    toDatetimeLocalString(new Date())
  );
  const [convertedUnix, setConvertedUnix] = useState<number | null>(null);

  // Live clock
  useEffect(() => {
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
          value: convertedDate.toLocaleString(),
        },
        {
          label: t("ts.utcDate"),
          value: convertedDate.toUTCString(),
        },
        {
          label: t("ts.relative"),
          value: getRelativeTime(convertedDate),
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
              copyToClipboard(currentTimestamp.toString(), "Current timestamp")
            }
            className="text-3xl font-bold font-mono gradient-text hover:opacity-80 transition-opacity cursor-pointer tabular-nums"
          >
            {currentTimestamp}
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
              className="px-4 py-3 rounded-xl text-sm font-medium text-t-secondary bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-t-primary transition-all whitespace-nowrap"
            >
              {t("ts.now")}
            </button>
          </div>

          {unixError && (
            <p className="text-xs text-red-400 mt-2">{unixError === "Please enter a valid number" ? t("ts.invalidNumber") : t("ts.invalidTimestamp")}</p>
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
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-t-secondary bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-t-primary transition-all"
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
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-t-secondary bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-t-primary transition-all"
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
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-t-secondary bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-t-primary transition-all"
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
