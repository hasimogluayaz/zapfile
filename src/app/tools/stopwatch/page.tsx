"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

interface Lap {
  lapNumber: number;
  lapTime: number;
  totalTime: number;
}

function formatTime(ms: number, showMs = true): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const cs = Math.floor((ms % 1000) / 10);

  const hStr = h > 0 ? `${String(h).padStart(2, "0")}:` : "";
  const mStr = `${String(m).padStart(2, "0")}:`;
  const sStr = String(s).padStart(2, "0");
  const csStr = showMs ? `.${String(cs).padStart(2, "0")}` : "";

  return `${hStr}${mStr}${sStr}${csStr}`;
}

export default function StopwatchPage() {
  const { t } = useI18n();
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [laps, setLaps] = useState<Lap[]>([]);
  const startTimeRef = useRef<number>(0);
  const baseElapsedRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  const tick = useCallback(() => {
    setElapsed(baseElapsedRef.current + (Date.now() - startTimeRef.current));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (running) {
      startTimeRef.current = Date.now();
      rafRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [running, tick]);

  const handleStartStop = useCallback(() => {
    if (running) {
      baseElapsedRef.current += Date.now() - startTimeRef.current;
      setRunning(false);
    } else {
      setRunning(true);
    }
  }, [running]);

  const handleLap = useCallback(() => {
    if (!running) return;
    const total = baseElapsedRef.current + (Date.now() - startTimeRef.current);
    const prevTotal = laps.length > 0 ? laps[0].totalTime : 0;
    setLaps((prev) => [
      { lapNumber: prev.length + 1, lapTime: total - prevTotal, totalTime: total },
      ...prev,
    ]);
  }, [running, laps]);

  const handleReset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setRunning(false);
    setElapsed(0);
    setLaps([]);
    baseElapsedRef.current = 0;
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") { e.preventDefault(); handleStartStop(); }
      if (e.code === "KeyL") handleLap();
      if (e.code === "KeyR") handleReset();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleStartStop, handleLap, handleReset]);

  const fastestLap = laps.length > 1 ? Math.min(...laps.map((l) => l.lapTime)) : null;
  const slowestLap = laps.length > 1 ? Math.max(...laps.map((l) => l.lapTime)) : null;
  const avgLap =
    laps.length > 0 ? laps.reduce((sum, l) => sum + l.lapTime, 0) / laps.length : null;

  return (
    <ToolLayout
      toolName="Stopwatch"
      toolDescription="Online stopwatch with lap times. Press Space to start/stop, L for lap, R to reset."
    >
      <div className="space-y-6">
        {/* Main Display */}
        <div className="glass rounded-2xl p-8 flex flex-col items-center">
          <div className="font-mono text-6xl sm:text-7xl font-bold text-t-primary tracking-wider tabular-nums mb-8 select-none">
            {formatTime(elapsed)}
          </div>

          {/* Controls */}
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              onClick={handleStartStop}
              className={`px-8 py-3 rounded-xl font-semibold text-white transition-all hover:opacity-90 active:scale-95 ${
                running
                  ? "bg-gradient-to-r from-red-500 to-rose-500"
                  : "bg-gradient-to-r from-indigo-500 to-purple-500"
              }`}
            >
              {running ? t("sw.stop") : elapsed > 0 ? t("sw.resume") : t("sw.start")}
            </button>
            <button
              onClick={handleLap}
              disabled={!running}
              className="px-6 py-3 rounded-xl font-semibold text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t("sw.lap")}
            </button>
            <button
              onClick={handleReset}
              disabled={running && elapsed === 0}
              className="px-6 py-3 rounded-xl font-semibold text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t("sw.reset")}
            </button>
          </div>

          {/* Keyboard hints */}
          <div className="mt-5 flex gap-4 text-[11px] text-t-tertiary">
            <span><kbd className="px-1.5 py-0.5 rounded bg-bg-secondary border border-border font-mono">Space</kbd> {t("sw.startStop")}</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-bg-secondary border border-border font-mono">L</kbd> {t("sw.lap")}</span>
            <span><kbd className="px-1.5 py-0.5 rounded bg-bg-secondary border border-border font-mono">R</kbd> {t("sw.reset")}</span>
          </div>
        </div>

        {/* Lap statistics */}
        {laps.length >= 2 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="glass rounded-xl p-4 text-center">
              <div className="text-xs text-t-tertiary mb-1">{t("sw.fastestLap")}</div>
              <div className="font-mono font-bold text-emerald-500 tabular-nums">
                {fastestLap !== null ? formatTime(fastestLap) : "—"}
              </div>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <div className="text-xs text-t-tertiary mb-1">{t("sw.avgLap")}</div>
              <div className="font-mono font-bold text-t-primary tabular-nums">
                {avgLap !== null ? formatTime(avgLap) : "—"}
              </div>
            </div>
            <div className="glass rounded-xl p-4 text-center">
              <div className="text-xs text-t-tertiary mb-1">{t("sw.slowestLap")}</div>
              <div className="font-mono font-bold text-red-400 tabular-nums">
                {slowestLap !== null ? formatTime(slowestLap) : "—"}
              </div>
            </div>
          </div>
        )}

        {/* Lap Times */}
        {laps.length > 0 && (
          <div className="glass rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold text-t-primary">{t("sw.lapTimes")}</span>
              <span className="text-xs text-t-tertiary">{t("sw.lapsCount", { n: laps.length })}</span>
            </div>
            <div className="divide-y divide-border max-h-72 overflow-y-auto">
              {laps.map((lap) => {
                const isFastest = fastestLap !== null && lap.lapTime === fastestLap;
                const isSlowest = slowestLap !== null && lap.lapTime === slowestLap;
                return (
                  <div
                    key={lap.lapNumber}
                    className={`flex items-center justify-between px-5 py-3 text-sm ${
                      isFastest ? "bg-emerald-500/10" : isSlowest ? "bg-red-500/10" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-t-tertiary tabular-nums w-10">#{lap.lapNumber}</span>
                      {isFastest && <span className="text-[10px] text-emerald-500 font-semibold">{t("sw.best")}</span>}
                      {isSlowest && <span className="text-[10px] text-red-400 font-semibold">{t("sw.slow")}</span>}
                    </div>
                    <span className={`font-mono font-semibold tabular-nums ${isFastest ? "text-emerald-500" : isSlowest ? "text-red-400" : "text-t-primary"}`}>
                      {formatTime(lap.lapTime)}
                    </span>
                    <span className="font-mono text-t-tertiary tabular-nums text-xs">
                      {formatTime(lap.totalTime)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
