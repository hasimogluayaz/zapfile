"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";

type TestState = "idle" | "testing-ping" | "testing-download" | "done";

interface SpeedResult {
  ping: number | null;
  download: number | null;
}

function getSpeedColor(mbps: number | null): string {
  if (mbps === null) return "text-t-secondary";
  if (mbps >= 25) return "text-emerald-400";
  if (mbps >= 5) return "text-amber-400";
  return "text-red-400";
}

function getPingColor(ms: number | null): string {
  if (ms === null) return "text-t-secondary";
  if (ms <= 50) return "text-emerald-400";
  if (ms <= 150) return "text-amber-400";
  return "text-red-400";
}

function getSpeedLabel(mbps: number | null): string {
  if (mbps === null) return "";
  if (mbps >= 100) return "Excellent";
  if (mbps >= 25) return "Fast";
  if (mbps >= 5) return "Moderate";
  return "Slow";
}

function getPingLabel(ms: number | null): string {
  if (ms === null) return "";
  if (ms <= 20) return "Excellent";
  if (ms <= 50) return "Good";
  if (ms <= 150) return "Fair";
  return "Poor";
}

function SpeedGauge({ value, max, unit }: { value: number | null; max: number; unit: string }) {
  const pct = value !== null ? Math.min(100, (value / max) * 100) : 0;
  const color =
    pct >= 66 ? "from-emerald-500 to-emerald-400" :
    pct >= 33 ? "from-amber-500 to-amber-400" :
    "from-red-500 to-red-400";

  return (
    <div className="w-full">
      <div className="h-3 rounded-full bg-white/[0.08] overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-t-secondary">0 {unit}</span>
        <span className="text-xs text-t-secondary">{max} {unit}</span>
      </div>
    </div>
  );
}

export default function InternetSpeedPage() {
  const [state, setState] = useState<TestState>("idle");
  const [result, setResult] = useState<SpeedResult>({ ping: null, download: null });
  const [progress, setProgress] = useState(0);

  const runTest = useCallback(async () => {
    setState("testing-ping");
    setProgress(0);
    setResult({ ping: null, download: null });

    let ping: number | null = null;
    let download: number | null = null;

    // ── Ping test ──
    try {
      // Use a tiny image on Cloudflare's CDN (CORS-friendly)
      const PING_URL =
        "https://www.cloudflare.com/favicon.ico?" + Date.now();
      const t0 = performance.now();
      await fetch(PING_URL, { method: "HEAD", mode: "no-cors", cache: "no-store" });
      ping = Math.round(performance.now() - t0);
    } catch {
      ping = null;
    }

    setResult((r) => ({ ...r, ping }));
    setProgress(40);

    // ── Download test ──
    setState("testing-download");

    // Multiple reliable CORS-friendly endpoints — tried in order, first success wins
    const DOWNLOAD_URLS = [
      "https://speed.cloudflare.com/__down?bytes=2000000",       // 2 MB – Cloudflare primary
      "https://speed.cloudflare.com/__down?bytes=1000000",       // 1 MB – Cloudflare fallback
      "https://httpbin.org/bytes/1000000",                        // 1 MB – httpbin fallback
    ];

    for (const url of DOWNLOAD_URLS) {
      try {
        const cacheBust = url.includes("?") ? `&_=${Date.now()}` : `?_=${Date.now()}`;
        const t0 = performance.now();
        const res = await fetch(url + cacheBust, { cache: "no-store" });
        if (!res.ok) continue;
        const blob = await res.blob();
        const elapsed = (performance.now() - t0) / 1000; // seconds
        const bits = blob.size * 8;
        download = parseFloat((bits / elapsed / 1_000_000).toFixed(2));
        break;
      } catch {
        continue;
      }
    }

    if (download === null) {
      toast.error("Download test failed. Your network may be blocking test endpoints.");
    }

    setResult({ ping, download });
    setProgress(100);
    setState("done");
  }, []);

  const isTesting = state === "testing-ping" || state === "testing-download";

  return (
    <ToolLayout
      toolName="Internet Speed Test"
      toolDescription="Test your connection ping and download speed directly in your browser — no plugins required."
    >
      <div className="space-y-6">
        {/* Result Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Ping */}
          <div className="glass rounded-xl p-6">
            <p className="text-sm text-t-secondary mb-1">Ping</p>
            <p
              className={`text-4xl font-bold font-mono mb-1 ${getPingColor(result.ping)}`}
            >
              {result.ping !== null ? result.ping : "—"}
            </p>
            <p className="text-xs text-t-secondary">
              ms{result.ping !== null ? ` · ${getPingLabel(result.ping)}` : ""}
            </p>
            <div className="mt-4">
              <SpeedGauge value={result.ping} max={300} unit="ms" />
            </div>
          </div>

          {/* Download */}
          <div className="glass rounded-xl p-6">
            <p className="text-sm text-t-secondary mb-1">Download</p>
            <p
              className={`text-4xl font-bold font-mono mb-1 ${getSpeedColor(result.download)}`}
            >
              {result.download !== null ? result.download : "—"}
            </p>
            <p className="text-xs text-t-secondary">
              Mbps
              {result.download !== null ? ` · ${getSpeedLabel(result.download)}` : ""}
            </p>
            <div className="mt-4">
              <SpeedGauge value={result.download} max={200} unit="Mbps" />
            </div>
          </div>
        </div>

        {/* Progress bar while testing */}
        {isTesting && (
          <div className="glass rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-t-secondary">
                {state === "testing-ping" ? "Measuring ping…" : "Measuring download speed…"}
              </span>
              <span className="text-sm font-semibold text-t-primary">{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Run Test Button */}
        <div className="flex justify-center">
          <button
            onClick={runTest}
            disabled={isTesting}
            className="px-8 py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {isTesting ? (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Testing…
              </span>
            ) : state === "done" ? (
              "Run Again"
            ) : (
              "Run Test"
            )}
          </button>
        </div>

        {/* Legend */}
        <div className="glass rounded-xl p-4">
          <p className="text-sm font-medium text-t-secondary mb-3">Speed Guide</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-semibold text-t-primary mb-1">Download Speed</p>
              <p><span className="text-emerald-400">●</span> Fast — 25+ Mbps</p>
              <p><span className="text-amber-400">●</span> Moderate — 5–25 Mbps</p>
              <p><span className="text-red-400">●</span> Slow — &lt;5 Mbps</p>
            </div>
            <div>
              <p className="font-semibold text-t-primary mb-1">Ping (Latency)</p>
              <p><span className="text-emerald-400">●</span> Excellent — &lt;50 ms</p>
              <p><span className="text-amber-400">●</span> Fair — 50–150 ms</p>
              <p><span className="text-red-400">●</span> Poor — 150+ ms</p>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
