"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

type Difficulty = "easy" | "medium" | "hard";

const SAMPLE_TEXTS: Record<Difficulty, string[]> = {
  easy: [
    "The sun is bright today. I love to walk in the park on warm afternoons.",
    "A cat sat on the mat. The dog ran outside to play with the ball.",
    "She opened the door and smiled at the visitor waiting outside.",
    "It was a nice day so we decided to have lunch in the garden.",
  ],
  medium: [
    "The quick brown fox jumps over the lazy dog near the river bank every morning.",
    "Learning to type faster requires consistent practice and proper finger placement on the keyboard.",
    "Technology has transformed the way people communicate across vast distances in modern society.",
    "Creativity and innovation are essential qualities for thriving in a rapidly changing world.",
  ],
  hard: [
    "Asynchronous programming paradigms facilitate concurrent execution of tasks without blocking the main thread.",
    "The intrinsic complexity of distributed systems necessitates rigorous fault-tolerance mechanisms and consensus algorithms.",
    "Polymorphic behavior in object-oriented languages enables flexible and extensible software architecture patterns.",
    "Cryptographic hash functions provide deterministic, collision-resistant mappings from arbitrary data to fixed-length digests.",
  ],
};

type CharState = "pending" | "correct" | "incorrect";

interface CharData {
  char: string;
  state: CharState;
}

export default function TypingSpeedTestPage() {
  const { t } = useI18n();

  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [targetText, setTargetText] = useState<string>("");
  const [charData, setCharData] = useState<CharData[]>([]);
  const [userInput, setUserInput] = useState<string>("");
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [errorCount, setErrorCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pickText = useCallback((diff: Difficulty) => {
    const texts = SAMPLE_TEXTS[diff];
    return texts[Math.floor(Math.random() * texts.length)];
  }, []);

  const initText = useCallback(
    (diff: Difficulty) => {
      const text = pickText(diff);
      setTargetText(text);
      setCharData(text.split("").map((c) => ({ char: c, state: "pending" })));
      setUserInput("");
      setIsStarted(false);
      setIsFinished(false);
      setStartTime(null);
      setEndTime(null);
      setWpm(0);
      setAccuracy(100);
      setErrorCount(0);
      setElapsed(0);
    },
    [pickText]
  );

  useEffect(() => {
    initText(difficulty);
  }, []);

  useEffect(() => {
    if (isStarted && !isFinished) {
      timerRef.current = setInterval(() => {
        setElapsed(Date.now() - (startTime ?? Date.now()));
      }, 200);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isStarted, isFinished, startTime]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isFinished) return;
    const value = e.target.value;

    if (!isStarted && value.length > 0) {
      const now = Date.now();
      setIsStarted(true);
      setStartTime(now);
    }

    setUserInput(value);

    const updated: CharData[] = targetText.split("").map((char, i) => {
      if (i >= value.length) return { char, state: "pending" };
      return { char, state: value[i] === char ? "correct" : "incorrect" };
    });
    setCharData(updated);

    const errors = updated.filter((c) => c.state === "incorrect").length;
    setErrorCount(errors);

    const typed = value.length;
    const correct = updated.filter((c) => c.state === "correct").length;
    const acc = typed > 0 ? Math.round((correct / typed) * 100) : 100;
    setAccuracy(acc);

    if (value.length >= targetText.length) {
      const now = Date.now();
      setIsFinished(true);
      setEndTime(now);
      const minutes = (now - (startTime ?? now)) / 60000;
      const calculatedWpm =
        minutes > 0 ? Math.round(targetText.length / 5 / minutes) : 0;
      setWpm(calculatedWpm);
      toast.success(t("typing.done"));
    }
  };

  const handleReset = () => {
    initText(difficulty);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleDifficultyChange = (d: Difficulty) => {
    setDifficulty(d);
    initText(d);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const formatTime = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return m > 0 ? `${m}m ${rem}s` : `${s}s`;
  };

  const displayElapsed = isFinished
    ? endTime && startTime
      ? formatTime(endTime - startTime)
      : "0s"
    : formatTime(elapsed);

  const displayWpm = isFinished
    ? wpm
    : isStarted && startTime
    ? Math.round(
        (userInput.length / 5 / ((Date.now() - startTime) / 60000)) || 0
      )
    : 0;

  const DIFFICULTY_BUTTONS: { key: Difficulty; label: string }[] = [
    { key: "easy", label: t("typing.easy") },
    { key: "medium", label: t("typing.medium") },
    { key: "hard", label: t("typing.hard") },
  ];

  return (
    <ToolLayout
      toolName={t("tool.typing-speed-test.name")}
      toolDescription={t("tool.typing-speed-test.desc")}
    >
      <div className="space-y-6">
        {/* Difficulty selector */}
        <div className="glass rounded-2xl p-6">
          <p className="text-sm font-medium text-brand-muted mb-3">
            {t("typing.difficulty")}
          </p>
          <div className="flex gap-2 flex-wrap">
            {DIFFICULTY_BUTTONS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handleDifficultyChange(key)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  difficulty === key
                    ? "bg-brand-indigo/20 border border-brand-indigo text-brand-text"
                    : "bg-white/[0.04] border border-white/[0.08] text-brand-muted hover:border-white/20"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Text display */}
        <div className="glass rounded-2xl p-6">
          <div
            className="font-mono text-base leading-8 select-none mb-5 p-4 rounded-xl bg-white/[0.04] border border-white/[0.08]"
            aria-label="Target text"
          >
            {charData.map((cd, i) => (
              <span
                key={i}
                className={
                  cd.state === "correct"
                    ? "text-emerald-400"
                    : cd.state === "incorrect"
                    ? "text-red-400 bg-red-500/20 rounded-sm"
                    : "text-brand-muted"
                }
              >
                {cd.char}
              </span>
            ))}
          </div>

          {/* Typing area */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={userInput}
              onChange={handleInput}
              disabled={isFinished}
              placeholder={isFinished ? "" : t("typing.startPrompt")}
              rows={4}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              autoComplete="off"
              className={`w-full px-4 py-3 rounded-xl bg-white/[0.04] border text-brand-text placeholder:text-brand-muted/50 focus:outline-none resize-none font-mono text-sm transition-colors ${
                isFinished
                  ? "border-white/[0.04] opacity-50 cursor-not-allowed"
                  : isStarted
                  ? "border-brand-indigo/40 focus:border-brand-indigo/60"
                  : "border-white/[0.08] focus:border-brand-indigo/40"
              }`}
            />
            {isStarted && !isFinished && (
              <span className="absolute top-3 right-3 text-xs text-brand-muted/60 font-mono">
                {userInput.length}/{targetText.length}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-5">
            <button
              onClick={handleReset}
              className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-brand hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {t("typing.reset")}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: t("typing.wpm"),
              value: displayWpm,
              unit: "",
              highlight: isFinished,
            },
            {
              label: t("typing.accuracy"),
              value: accuracy,
              unit: "%",
              highlight: false,
            },
            {
              label: t("typing.time"),
              value: displayElapsed,
              unit: "",
              highlight: false,
            },
            {
              label: t("typing.errors"),
              value: errorCount,
              unit: "",
              highlight: false,
            },
          ].map(({ label, value, unit, highlight }) => (
            <div
              key={label}
              className={`glass rounded-2xl p-5 text-center transition-all ${
                highlight ? "border border-brand-indigo/40" : ""
              }`}
            >
              <p className="text-xs font-medium text-brand-muted uppercase tracking-wider mb-1">
                {label}
              </p>
              <p
                className={`text-3xl font-bold ${
                  highlight ? "text-brand-indigo" : "text-brand-text"
                }`}
              >
                {value}
                {unit}
              </p>
            </div>
          ))}
        </div>

        {/* Finished banner */}
        {isFinished && (
          <div className="glass rounded-2xl p-6 border border-emerald-500/30 text-center">
            <p className="text-lg font-semibold text-emerald-400 mb-1">
              {t("typing.done")}
            </p>
            <p className="text-sm text-brand-muted">
              {t("typing.wpm")}: <span className="text-brand-text font-bold">{wpm}</span>{" "}
              &nbsp;·&nbsp; {t("typing.accuracy")}:{" "}
              <span className="text-brand-text font-bold">{accuracy}%</span>
              &nbsp;·&nbsp; {t("typing.errors")}:{" "}
              <span className="text-brand-text font-bold">{errorCount}</span>
            </p>
            <button
              onClick={handleReset}
              className="mt-4 px-6 py-2.5 rounded-xl font-semibold text-white bg-gradient-brand hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] text-sm"
            >
              {t("typing.reset")}
            </button>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
