"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

type TimerState = "work" | "short-break" | "long-break";
type PlayState = "idle" | "running" | "paused";

const POMO_STORAGE_KEY = "zapfile-pomodoro-v1";
const POMO_STATS_KEY = "zapfile-pomodoro-stats-v1";

interface PomodoroPersist {
  workDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  sessionsBeforeLong: number;
  timerState: TimerState;
  playState: PlayState;
  timeLeft: number;
  currentSession: number;
  /** When running: wall-clock ms when current phase should reach 0 */
  wallEndAt: number | null;
  soundEnabled?: boolean;
  autoStartBreaks?: boolean;
  autoStartWork?: boolean;
  taskName?: string;
}

interface PomodoroStats {
  /** YYYY-MM-DD date string */
  date: string;
  completed: number;
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function playBeep() {
  try {
    const ctx = new AudioContext();
    // Two-tone chime: bright then soft
    const playTone = (freq: number, startOffset: number, duration: number, vol: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + startOffset);
      gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + startOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + startOffset);
      osc.stop(ctx.currentTime + startOffset + duration);
    };
    playTone(880, 0, 0.25, 0.25);
    playTone(660, 0.18, 0.3, 0.2);
    setTimeout(() => ctx.close(), 700);
  } catch {
    // Audio not available
  }
}

export default function PomodoroTimerPage() {
  const { t } = useI18n();
  const [workDuration, setWorkDuration] = useState(25);
  const [shortBreakDuration, setShortBreakDuration] = useState(5);
  const [longBreakDuration, setLongBreakDuration] = useState(15);
  const [sessionsBeforeLong, setSessionsBeforeLong] = useState(4);

  const [timerState, setTimerState] = useState<TimerState>("work");
  const [playState, setPlayState] = useState<PlayState>("idle");
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [currentSession, setCurrentSession] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoStartBreaks, setAutoStartBreaks] = useState(false);
  const [autoStartWork, setAutoStartWork] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [completedToday, setCompletedToday] = useState(0);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission | "unavailable">("default");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const originalTitle = useRef("");
  const [storageReady, setStorageReady] = useState(false);

  // Detect notification support
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifPerm("unavailable");
    } else {
      setNotifPerm(Notification.permission);
    }
  }, []);

  const requestNotif = async () => {
    if (notifPerm === "unavailable" || !("Notification" in window)) return;
    try {
      const p = await Notification.requestPermission();
      setNotifPerm(p);
    } catch {
      /* ignore */
    }
  };

  const sendNotif = useCallback(
    (title: string, body: string) => {
      if (typeof window === "undefined") return;
      if (!("Notification" in window)) return;
      if (Notification.permission !== "granted") return;
      try {
        new Notification(title, { body, icon: "/favicon.ico", tag: "pomodoro" });
      } catch {
        /* ignore */
      }
    },
    []
  );

  // Load today's completed count
  useEffect(() => {
    try {
      const raw = localStorage.getItem(POMO_STATS_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) as PomodoroStats;
      if (s && s.date === todayStr() && typeof s.completed === "number") {
        setCompletedToday(s.completed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const incrementCompleted = useCallback(() => {
    setCompletedToday((prev) => {
      const next = prev + 1;
      try {
        const stats: PomodoroStats = { date: todayStr(), completed: next };
        localStorage.setItem(POMO_STATS_KEY, JSON.stringify(stats));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const getTotalSeconds = useCallback(
    (state: TimerState): number => {
      switch (state) {
        case "work":
          return workDuration * 60;
        case "short-break":
          return shortBreakDuration * 60;
        case "long-break":
          return longBreakDuration * 60;
      }
    },
    [workDuration, shortBreakDuration, longBreakDuration]
  );

  // Store original title on mount
  useEffect(() => {
    originalTitle.current = document.title;
    return () => {
      document.title = originalTitle.current;
    };
  }, []);

  // Restore from localStorage (once)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(POMO_STORAGE_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as PomodoroPersist;
      if (typeof p.workDuration === "number") setWorkDuration(p.workDuration);
      if (typeof p.shortBreakDuration === "number") setShortBreakDuration(p.shortBreakDuration);
      if (typeof p.longBreakDuration === "number") setLongBreakDuration(p.longBreakDuration);
      if (typeof p.sessionsBeforeLong === "number") setSessionsBeforeLong(p.sessionsBeforeLong);
      if (p.timerState === "work" || p.timerState === "short-break" || p.timerState === "long-break") {
        setTimerState(p.timerState);
      }
      if (typeof p.currentSession === "number") setCurrentSession(p.currentSession);
      if (typeof p.soundEnabled === "boolean") setSoundEnabled(p.soundEnabled);
      if (typeof p.autoStartBreaks === "boolean") setAutoStartBreaks(p.autoStartBreaks);
      if (typeof p.autoStartWork === "boolean") setAutoStartWork(p.autoStartWork);
      if (typeof p.taskName === "string") setTaskName(p.taskName);
      if (p.playState === "running" && p.wallEndAt && typeof p.wallEndAt === "number") {
        const tl = Math.max(0, Math.ceil((p.wallEndAt - Date.now()) / 1000));
        setTimeLeft(tl);
        setPlayState(tl > 0 ? "running" : "idle");
        if (tl === 0) {
          setTimerState("work");
          setTimeLeft(p.workDuration * 60);
          setCurrentSession(1);
        }
      } else if (p.playState === "paused" || p.playState === "idle") {
        setPlayState(p.playState);
        if (typeof p.timeLeft === "number") setTimeLeft(p.timeLeft);
      }
    } catch {
      /* ignore corrupt storage */
    } finally {
      setStorageReady(true);
    }
  }, []);

  // Persist settings + timer state
  useEffect(() => {
    if (!storageReady) return;
    try {
      const wallEndAt =
        playState === "running" ? Date.now() + timeLeft * 1000 : null;
      const payload: PomodoroPersist = {
        workDuration,
        shortBreakDuration,
        longBreakDuration,
        sessionsBeforeLong,
        timerState,
        playState,
        timeLeft,
        currentSession,
        wallEndAt,
        soundEnabled,
        autoStartBreaks,
        autoStartWork,
        taskName,
      };
      localStorage.setItem(POMO_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* quota / private mode */
    }
  }, [
    workDuration,
    shortBreakDuration,
    longBreakDuration,
    sessionsBeforeLong,
    timerState,
    playState,
    timeLeft,
    currentSession,
    storageReady,
    soundEnabled,
    autoStartBreaks,
    autoStartWork,
    taskName,
  ]);

  // Update document title
  useEffect(() => {
    if (playState === "running" || playState === "paused") {
      const label =
        timerState === "work"
          ? t("pomo.work")
          : timerState === "short-break"
          ? t("pomo.break")
          : t("pomo.longBreak");
      document.title = `${formatTime(timeLeft)} - ${label} | Pomodoro`;
    } else {
      document.title = originalTitle.current;
    }
  }, [timeLeft, timerState, playState]);

  // Timer tick
  useEffect(() => {
    if (playState === "running") {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [playState]);

  // Handle timer completion
  useEffect(() => {
    if (timeLeft === 0 && playState === "running") {
      if (soundEnabled) playBeep();
      handleTimerComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, playState]);

  const handleTimerComplete = () => {
    if (timerState === "work") {
      incrementCompleted();
      sendNotif(t("pomo.notifWorkDone"), taskName || t("pomo.shortBreakMsg"));
      if (currentSession >= sessionsBeforeLong) {
        setTimerState("long-break");
        setTimeLeft(longBreakDuration * 60);
        toast.success(t("pomo.longBreakMsg"));
      } else {
        setTimerState("short-break");
        setTimeLeft(shortBreakDuration * 60);
        toast.success(t("pomo.shortBreakMsg"));
      }
      setPlayState(autoStartBreaks ? "running" : "idle");
    } else {
      // Break finished
      sendNotif(t("pomo.notifBreakDone"), t("pomo.focusMsg"));
      if (timerState === "long-break") {
        setCurrentSession(1);
      } else {
        setCurrentSession((prev) => prev + 1);
      }
      setTimerState("work");
      setTimeLeft(workDuration * 60);
      toast.success(t("pomo.focusMsg"));
      setPlayState(autoStartWork ? "running" : "idle");
    }
  };

  const handleStart = () => {
    if (playState === "idle") {
      setTimeLeft(getTotalSeconds(timerState));
    }
    setPlayState("running");
  };

  const handlePause = () => {
    setPlayState("paused");
  };

  const handleReset = () => {
    setPlayState("idle");
    setTimerState("work");
    setTimeLeft(workDuration * 60);
    setCurrentSession(1);
  };

  const handleSkip = () => {
    setPlayState("idle");
    if (timerState === "work") {
      if (currentSession >= sessionsBeforeLong) {
        setTimerState("long-break");
        setTimeLeft(longBreakDuration * 60);
      } else {
        setTimerState("short-break");
        setTimeLeft(shortBreakDuration * 60);
      }
    } else {
      if (timerState === "long-break") {
        setCurrentSession(1);
      } else {
        setCurrentSession((prev) => prev + 1);
      }
      setTimerState("work");
      setTimeLeft(workDuration * 60);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        setPlayState((prev) => {
          if (prev === "running") return "paused";
          if (prev === "idle") {
            setTimeLeft(getTotalSeconds(timerState));
          }
          return "running";
        });
      } else if (e.code === "KeyR") {
        setPlayState("idle");
        setTimerState("work");
        setTimeLeft(workDuration * 60);
        setCurrentSession(1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [timerState, workDuration, getTotalSeconds]);

  // Update timeLeft when durations change in idle state
  useEffect(() => {
    if (playState === "idle") {
      setTimeLeft(getTotalSeconds(timerState));
    }
  }, [workDuration, shortBreakDuration, longBreakDuration, playState, timerState, getTotalSeconds]);

  // SVG progress ring
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const totalSeconds = getTotalSeconds(timerState);
  const progress = totalSeconds > 0 ? timeLeft / totalSeconds : 0;
  const strokeDashoffset = circumference * (1 - progress);

  const isWork = timerState === "work";
  const ringColor = isWork ? "stroke-indigo-500" : "stroke-emerald-500";
  const stateLabel =
    timerState === "work"
      ? t("pomo.focus")
      : timerState === "short-break"
      ? t("pomo.shortBreak")
      : t("pomo.longBreak");

  return (
    <ToolLayout
      toolName={t("tool.pomodoro-timer.name")}
      toolDescription={t("tool.pomodoro-timer.desc")}
    >
      <div className="space-y-6">
        {/* Task name input */}
        <div className="glass rounded-xl p-4">
          <label className="block text-xs text-t-secondary mb-1.5 font-medium">
            {t("pomo.taskLabel")}
          </label>
          <input
            type="text"
            value={taskName}
            onChange={(e) => setTaskName(e.target.value)}
            placeholder={t("pomo.taskPlaceholder")}
            className="w-full px-3 py-2 rounded-lg bg-bg-secondary border border-border text-t-primary text-sm focus:outline-none focus:border-indigo-500/50"
          />
        </div>

        {/* Timer Display */}
        <div className="glass rounded-xl p-8 flex flex-col items-center">
          {/* State Label */}
          <div className="mb-6">
            <span
              className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
                isWork
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "bg-emerald-500/20 text-emerald-400"
              }`}
            >
              {stateLabel}
            </span>
            <span className="text-sm text-t-tertiary ml-3">
              {t("pomo.session")} {currentSession}/{sessionsBeforeLong}
            </span>
            <span className="text-sm text-amber-400 ml-3" title={t("pomo.completedToday")}>
              🍅 {completedToday}
            </span>
          </div>

          {/* SVG Circle Timer */}
          <div className="relative w-[280px] h-[280px]">
            <svg
              className="w-full h-full -rotate-90"
              viewBox="0 0 280 280"
            >
              {/* Background circle */}
              <circle
                cx="140"
                cy="140"
                r={radius}
                fill="none"
                stroke="currentColor"
                className="text-bg-secondary"
                strokeWidth="8"
              />
              {/* Progress circle */}
              <circle
                cx="140"
                cy="140"
                r={radius}
                fill="none"
                className={ringColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                style={{ transition: "stroke-dashoffset 0.5s ease" }}
              />
            </svg>
            {/* Time display */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-5xl font-bold text-t-primary font-mono tracking-wider">
                {formatTime(timeLeft)}
              </span>
              <span className="text-sm text-t-tertiary mt-2">
                {playState === "running"
                  ? t("pomo.running")
                  : playState === "paused"
                  ? t("pomo.paused")
                  : t("pomo.ready")}
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-3 mt-8">
            {playState === "running" ? (
              <button
                onClick={handlePause}
                className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg transition-all"
              >
                {t("pomo.pause")}
              </button>
            ) : (
              <button
                onClick={handleStart}
                className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg transition-all"
              >
                {playState === "paused" ? t("pomo.resume") : t("pomo.start")}
              </button>
            )}
            <button
              onClick={handleSkip}
              className="px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors"
            >
              {t("pomo.skip")}
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors"
            >
              {t("ui.reset")}
            </button>
          </div>

          <p className="mt-4 text-[11px] text-t-tertiary">
            <kbd className="px-1.5 py-0.5 rounded bg-bg-secondary border border-border font-mono text-[10px]">Space</kbd>
            {" / "}
            <kbd className="px-1.5 py-0.5 rounded bg-bg-secondary border border-border font-mono text-[10px]">R</kbd>
            {" — "}{t("pomo.kbdHint")}
          </p>
        </div>

        {/* Preferences */}
        <div className="glass rounded-xl p-6 space-y-3">
          <h3 className="text-sm font-semibold text-t-primary mb-1">{t("ui.settings")}</h3>

          {/* Sound toggle */}
          <label className="flex items-center justify-between cursor-pointer py-1">
            <span className="text-sm text-t-secondary flex items-center gap-2">
              <span>{soundEnabled ? "🔊" : "🔇"}</span> {t("pomo.sound")}
            </span>
            <button
              type="button"
              onClick={() => setSoundEnabled((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                soundEnabled ? "bg-indigo-500" : "bg-bg-secondary border border-border"
              }`}
              aria-label={soundEnabled ? t("pomo.soundOn") : t("pomo.soundOff")}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  soundEnabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>

          {/* Notifications */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-t-secondary flex items-center gap-2">
              <span>🔔</span> {t("pomo.notifications")}
            </span>
            {notifPerm === "granted" ? (
              <span className="text-xs text-emerald-400 font-medium">✓ {t("pomo.notifEnabled")}</span>
            ) : notifPerm === "denied" ? (
              <span className="text-xs text-red-400">{t("pomo.notifDenied")}</span>
            ) : notifPerm === "unavailable" ? (
              <span className="text-xs text-t-tertiary">{t("pomo.notifUnavailable")}</span>
            ) : (
              <button
                type="button"
                onClick={requestNotif}
                className="px-3 py-1 rounded-lg text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
              >
                {t("pomo.enableNotif")}
              </button>
            )}
          </div>

          {/* Auto-start breaks */}
          <label className="flex items-center justify-between cursor-pointer py-1">
            <span className="text-sm text-t-secondary">{t("pomo.autoStartBreaks")}</span>
            <button
              type="button"
              onClick={() => setAutoStartBreaks((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                autoStartBreaks ? "bg-emerald-500" : "bg-bg-secondary border border-border"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  autoStartBreaks ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>

          {/* Auto-start next work session */}
          <label className="flex items-center justify-between cursor-pointer py-1">
            <span className="text-sm text-t-secondary">{t("pomo.autoStartWork")}</span>
            <button
              type="button"
              onClick={() => setAutoStartWork((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                autoStartWork ? "bg-indigo-500" : "bg-bg-secondary border border-border"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  autoStartWork ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </label>
        </div>

        {/* Durations */}
        <div className="glass rounded-xl p-6">
          <h3 className="text-sm font-semibold text-t-primary mb-4">
            ⏱️ {t("pomo.workDuration")} · {t("pomo.shortBreakDur")} · {t("pomo.longBreakDur")}
          </h3>
          <div className="space-y-5">
            {/* Work Duration */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-t-secondary">{t("pomo.workDuration")}</label>
                <span className="text-sm text-t-primary font-mono">{workDuration} min</span>
              </div>
              <input
                type="range"
                min="1"
                max="60"
                value={workDuration}
                onChange={(e) => setWorkDuration(parseInt(e.target.value))}
                className="w-full h-2 bg-bg-secondary rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            {/* Short Break */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-t-secondary">{t("pomo.shortBreakDur")}</label>
                <span className="text-sm text-t-primary font-mono">{shortBreakDuration} min</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={shortBreakDuration}
                onChange={(e) => setShortBreakDuration(parseInt(e.target.value))}
                className="w-full h-2 bg-bg-secondary rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Long Break */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-t-secondary">{t("pomo.longBreakDur")}</label>
                <span className="text-sm text-t-primary font-mono">{longBreakDuration} min</span>
              </div>
              <input
                type="range"
                min="1"
                max="60"
                value={longBreakDuration}
                onChange={(e) => setLongBreakDuration(parseInt(e.target.value))}
                className="w-full h-2 bg-bg-secondary rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            {/* Sessions before long break */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-t-secondary">{t("pomo.sessions")}</label>
                <span className="text-sm text-t-primary font-mono">{sessionsBeforeLong}</span>
              </div>
              <input
                type="range"
                min="2"
                max="8"
                value={sessionsBeforeLong}
                onChange={(e) => setSessionsBeforeLong(parseInt(e.target.value))}
                className="w-full h-2 bg-bg-secondary rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
