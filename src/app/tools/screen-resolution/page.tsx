"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";

interface ScreenInfo {
  screenWidth: number;
  screenHeight: number;
  innerWidth: number;
  innerHeight: number;
  devicePixelRatio: number;
  colorDepth: number;
  deviceType: string;
  orientation: string;
}

function detectDeviceType(ua: string): string {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "Tablet";
  if (
    /mobile|iphone|ipod|android|blackberry|opera mini|iemobile|wpdesktop/i.test(
      ua
    )
  )
    return "Mobile";
  return "Desktop";
}

function InfoCard({
  label,
  value,
  icon,
  onCopy,
}: {
  label: string;
  value: string;
  icon: string;
  onCopy?: () => void;
}) {
  return (
    <div className="glass rounded-xl p-6 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xl">{icon}</span>
        {onCopy && (
          <button
            onClick={onCopy}
            className="text-xs text-t-secondary hover:text-t-primary transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.06]"
            aria-label={`Copy ${label}`}
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
          </button>
        )}
      </div>
      <p className="text-sm text-t-secondary">{label}</p>
      <p className="text-sm font-semibold text-t-primary">{value}</p>
    </div>
  );
}

export default function ScreenResolutionPage() {
  const [mounted, setMounted] = useState(false);
  const [info, setInfo] = useState<ScreenInfo | null>(null);

  const readInfo = () => {
    const ua = navigator.userAgent;
    setInfo({
      screenWidth: screen.width,
      screenHeight: screen.height,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
      colorDepth: screen.colorDepth,
      deviceType: detectDeviceType(ua),
      orientation:
        window.innerWidth >= window.innerHeight ? "Landscape" : "Portrait",
    });
  };

  useEffect(() => {
    setMounted(true);
    readInfo();

    const handler = () => readInfo();
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied!`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const copyAll = async () => {
    if (!info) return;
    const text = [
      `Screen Resolution: ${info.screenWidth} × ${info.screenHeight} px`,
      `Browser Window: ${info.innerWidth} × ${info.innerHeight} px`,
      `Device Pixel Ratio: ${info.devicePixelRatio}`,
      `Color Depth: ${info.colorDepth}-bit`,
      `Device Type: ${info.deviceType}`,
      `Orientation: ${info.orientation}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      toast.success("All info copied!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  if (!mounted || !info) {
    return (
      <ToolLayout
        toolName="Screen Resolution"
        toolDescription="View your screen size, browser window dimensions, device pixel ratio, and more."
      >
        <div className="glass rounded-xl p-6 flex items-center justify-center h-40">
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
        </div>
      </ToolLayout>
    );
  }

  return (
    <ToolLayout
      toolName="Screen Resolution"
      toolDescription="View your screen size, browser window dimensions, device pixel ratio, and more."
    >
      <div className="space-y-6">
        {/* Grid of info cards */}
        <div className="grid grid-cols-2 gap-4">
          <InfoCard
            label="Screen Resolution"
            value={`${info.screenWidth} × ${info.screenHeight} px`}
            icon="🖥️"
            onCopy={() =>
              copy(`${info.screenWidth} × ${info.screenHeight} px`, "Screen resolution")
            }
          />
          <InfoCard
            label="Browser Window"
            value={`${info.innerWidth} × ${info.innerHeight} px`}
            icon="🪟"
            onCopy={() =>
              copy(`${info.innerWidth} × ${info.innerHeight} px`, "Browser window size")
            }
          />
          <InfoCard
            label="Device Pixel Ratio"
            value={`${info.devicePixelRatio}x`}
            icon="🔍"
            onCopy={() => copy(`${info.devicePixelRatio}`, "Device pixel ratio")}
          />
          <InfoCard
            label="Color Depth"
            value={`${info.colorDepth}-bit`}
            icon="🎨"
            onCopy={() => copy(`${info.colorDepth}-bit`, "Color depth")}
          />
          <InfoCard
            label="Device Type"
            value={info.deviceType}
            icon={
              info.deviceType === "Mobile"
                ? "📱"
                : info.deviceType === "Tablet"
                ? "📟"
                : "💻"
            }
          />
          <InfoCard
            label="Orientation"
            value={info.orientation}
            icon={info.orientation === "Portrait" ? "📱" : "📺"}
          />
        </div>

        {/* Copy All */}
        <div className="flex justify-center">
          <button
            onClick={copyAll}
            className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-all"
          >
            Copy All Info
          </button>
        </div>

        {/* Live update note */}
        <p className="text-center text-xs text-t-secondary">
          Values update automatically when you resize the browser window.
        </p>
      </div>
    </ToolLayout>
  );
}
