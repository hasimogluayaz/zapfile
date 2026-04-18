"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";

interface GeoInfo {
  ip: string;
  country_name: string;
  city: string;
  region: string;
  org: string;
  timezone: string;
  country_code: string;
}

function Spinner() {
  return (
    <svg
      className="w-8 h-8 animate-spin text-indigo-400"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-white/[0.06] last:border-0">
      <span className="text-sm text-t-secondary shrink-0">{label}</span>
      <span className="text-sm font-semibold text-t-primary text-right">
        {value || "—"}
      </span>
    </div>
  );
}

export default function IpAddressPage() {
  const [geo, setGeo] = useState<GeoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    setGeo(null);
    try {
      // Step 1: get public IP
      const ipRes = await fetch("https://api.ipify.org?format=json");
      if (!ipRes.ok) throw new Error("Failed to fetch IP");
      const { ip } = (await ipRes.json()) as { ip: string };

      // Step 2: get geo info
      const geoRes = await fetch(`https://ipapi.co/${ip}/json/`);
      if (!geoRes.ok) throw new Error("Failed to fetch location");
      const data = (await geoRes.json()) as GeoInfo;
      setGeo({ ...data, ip });
    } catch {
      setError(
        "Could not fetch your IP information. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  const copyIp = async () => {
    if (!geo?.ip) return;
    try {
      await navigator.clipboard.writeText(geo.ip);
      toast.success("IP address copied!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <ToolLayout
      toolName="My IP Address"
      toolDescription="See your public IP address, location, ISP, and timezone — all detected in your browser."
    >
      <div className="space-y-6">
        {/* IP Display */}
        <div className="glass rounded-xl p-6 text-center">
          {loading && (
            <div className="flex flex-col items-center gap-4 py-6">
              <Spinner />
              <p className="text-sm text-t-secondary">Detecting your IP…</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="text-4xl">⚠️</div>
              <p className="text-sm text-t-secondary max-w-xs">{error}</p>
              <button
                onClick={fetchInfo}
                className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-all"
              >
                Try Again
              </button>
            </div>
          )}

          {geo && !loading && (
            <>
              <p className="text-sm text-t-secondary mb-2">Your public IP address</p>
              <p className="font-mono text-4xl font-bold text-t-primary tracking-wide mb-4">
                {geo.ip}
              </p>
              <button
                onClick={copyIp}
                className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-all"
              >
                Copy IP
              </button>
            </>
          )}
        </div>

        {/* Details */}
        {geo && !loading && (
          <div className="glass rounded-xl p-6">
            <h2 className="text-sm font-medium text-t-secondary mb-4">
              Location &amp; Network Details
            </h2>
            <div className="divide-y divide-white/[0.06]">
              <InfoRow label="Country" value={`${geo.country_name} (${geo.country_code})`} />
              <InfoRow label="City" value={geo.city} />
              <InfoRow label="Region" value={geo.region} />
              <InfoRow label="ISP / Org" value={geo.org} />
              <InfoRow label="Timezone" value={geo.timezone} />
            </div>
          </div>
        )}

        {/* Refresh */}
        {geo && !loading && (
          <div className="text-center">
            <button
              onClick={fetchInfo}
              className="px-6 py-3 rounded-xl font-semibold text-t-primary bg-bg-secondary border border-border hover:bg-bg-secondary/80 transition-all"
            >
              Refresh
            </button>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
