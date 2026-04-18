"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
  excludeSimilar: boolean;
  excludeAmbiguous: boolean;
}

const CHAR_SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
};

const SIMILAR_CHARS = /[0O1lI]/g;
const AMBIGUOUS_CHARS = /[{}[\]()/\\'"`~,;:.<>]/g;

function buildCharset(options: PasswordOptions): string {
  let charset = "";
  if (options.uppercase) charset += CHAR_SETS.uppercase;
  if (options.lowercase) charset += CHAR_SETS.lowercase;
  if (options.numbers) charset += CHAR_SETS.numbers;
  if (options.symbols) charset += CHAR_SETS.symbols;
  if (options.excludeSimilar) charset = charset.replace(SIMILAR_CHARS, "");
  if (options.excludeAmbiguous) charset = charset.replace(AMBIGUOUS_CHARS, "");
  return charset;
}

function generatePassword(options: PasswordOptions): string {
  const charset = buildCharset(options);
  if (charset.length === 0) return "";
  const array = new Uint32Array(options.length);
  crypto.getRandomValues(array);
  return Array.from(array, (val) => charset[val % charset.length]).join("");
}

function computeEntropy(length: number, charsetSize: number): number {
  if (charsetSize <= 1 || length <= 0) return 0;
  return length * Math.log2(charsetSize);
}

// Estimate crack time assuming 100 billion guesses / sec (well-funded attacker offline)
function formatCrackTime(
  entropyBits: number,
  t: (k: string, p?: Record<string, string | number>) => string
): { label: string; color: string } {
  if (entropyBits <= 0) return { label: t("pw.instant"), color: "text-red-400" };
  const guesses = Math.pow(2, entropyBits - 1); // average
  const guessesPerSec = 1e11;
  const sec = guesses / guessesPerSec;
  if (sec < 1) return { label: t("pw.instant"), color: "text-red-400" };
  if (sec < 60) return { label: t("pw.seconds", { n: Math.round(sec) }), color: "text-red-400" };
  const min = sec / 60;
  if (min < 60) return { label: t("pw.minutes", { n: Math.round(min) }), color: "text-orange-400" };
  const hr = min / 60;
  if (hr < 24) return { label: t("pw.hours", { n: Math.round(hr) }), color: "text-orange-400" };
  const days = hr / 24;
  if (days < 365) return { label: t("pw.days", { n: Math.round(days) }), color: "text-yellow-400" };
  const years = days / 365;
  if (years < 100) return { label: t("pw.years", { n: Math.round(years) }), color: "text-emerald-400" };
  if (years < 10000) return { label: t("pw.centuries"), color: "text-emerald-400" };
  return { label: t("pw.millennia"), color: "text-emerald-400" };
}

function getStrength(entropy: number): { strengthKey: string; color: string; percent: number } {
  if (entropy < 28) return { strengthKey: "pw.weak", color: "bg-red-500", percent: 25 };
  if (entropy < 50) return { strengthKey: "pw.medium", color: "bg-yellow-500", percent: 50 };
  if (entropy < 80) return { strengthKey: "pw.strong", color: "bg-emerald-500", percent: 75 };
  return { strengthKey: "pw.veryStrong", color: "bg-emerald-400", percent: 100 };
}

export default function PasswordGeneratorPage() {
  const { t } = useI18n();
  const [options, setOptions] = useState<PasswordOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
    excludeSimilar: false,
    excludeAmbiguous: false,
  });
  const [password, setPassword] = useState("");
  const [history, setHistory] = useState<string[]>([]);

  const generate = useCallback(() => {
    const result = generatePassword(options);
    setPassword(result);
    if (result) {
      setHistory((prev) => [result, ...prev.filter((p) => p !== result)].slice(0, 5));
    }
  }, [options]);

  useEffect(() => {
    generate();
  }, [generate]);

  const charsetSize = buildCharset(options).length;
  const entropy = computeEntropy(options.length, charsetSize);
  const strength = getStrength(entropy);
  const crackTime = formatCrackTime(entropy, t);

  const copyText = async (value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t("pw.copied"));
    } catch {
      toast.error(t("ui.copyFailed"));
    }
  };

  const toggleOption = (key: keyof Omit<PasswordOptions, "length">) => {
    const newOptions = { ...options, [key]: !options[key] };
    const charTypes = [newOptions.uppercase, newOptions.lowercase, newOptions.numbers, newOptions.symbols];
    const anyEnabled = charTypes.some(Boolean);
    if (!anyEnabled && ["uppercase", "lowercase", "numbers", "symbols"].includes(key)) {
      toast.error(t("pw.mustEnable"));
      return;
    }
    if (buildCharset(newOptions).length === 0) {
      toast.error(t("pw.mustEnable"));
      return;
    }
    setOptions(newOptions);
  };

  const checkboxes: { key: keyof Omit<PasswordOptions, "length">; label: string }[] = [
    { key: "uppercase", label: t("pw.uppercase") },
    { key: "lowercase", label: t("pw.lowercase") },
    { key: "numbers", label: t("pw.numbers") },
    { key: "symbols", label: t("pw.symbols") },
    { key: "excludeSimilar", label: t("pw.excludeSimilar") },
    { key: "excludeAmbiguous", label: t("pw.excludeAmbiguous") },
  ];

  return (
    <ToolLayout
      toolName="Password Generator"
      toolDescription="Generate strong, secure random passwords with customizable length and character types. Everything runs in your browser."
    >
      <div className="space-y-6">
        {/* Password Display */}
        <div className="glass rounded-2xl p-6">
          <label className="text-sm font-medium text-t-secondary mb-3 block">
            {t("pw.generated")}
          </label>
          <div className="relative">
            <div className="w-full px-4 py-4 rounded-xl bg-bg-secondary border border-border text-t-primary font-mono text-lg leading-relaxed break-all select-all min-h-[60px]">
              {password || (
                <span className="text-t-tertiary">{t("pw.enableOne")}</span>
              )}
            </div>
          </div>

          {/* Strength Indicator */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-t-secondary">{t("pw.strength")}</span>
              <span className="text-xs font-semibold text-t-primary">
                {t(strength.strengthKey)}
                <span className="text-t-tertiary ml-2 font-normal">
                  · {Math.round(entropy)} {t("pw.bits")} {t("pw.entropy").toLowerCase()}
                </span>
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                style={{ width: `${strength.percent}%` }}
              />
            </div>
          </div>

          {/* Crack time */}
          <div className="mt-3 flex items-center justify-between text-xs">
            <span className="text-t-secondary">⚡ {t("pw.crackTime")}</span>
            <span className={`font-semibold ${crackTime.color}`}>{crackTime.label}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => copyText(password)}
              disabled={!password}
              className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {t("ui.copy")}
            </button>
            <button
              onClick={generate}
              className="px-6 py-3 rounded-xl font-semibold text-t-primary bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all"
            >
              {t("ui.regenerate")}
            </button>
          </div>
        </div>

        {/* Settings */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-medium text-t-secondary mb-5">
            {t("ui.settings")}
          </h3>

          {/* Length Slider */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-t-primary">{t("pw.length")}</label>
              <span className="text-sm font-semibold text-t-primary tabular-nums">
                {options.length}
              </span>
            </div>
            <input
              type="range"
              min={8}
              max={128}
              value={options.length}
              onChange={(e) =>
                setOptions({ ...options, length: Number(e.target.value) })
              }
              className="w-full accent-indigo-500"
            />
            <div className="flex justify-between text-xs text-t-tertiary mt-1">
              <span>8</span>
              <span>128</span>
            </div>
          </div>

          {/* Character Type Checkboxes */}
          <div className="space-y-3">
            {checkboxes.map(({ key, label }) => (
              <label
                key={key}
                className="flex items-center gap-3 cursor-pointer group"
                onClick={(e) => {
                  e.preventDefault();
                  toggleOption(key);
                }}
              >
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    options[key]
                      ? "bg-indigo-500 border-indigo-500"
                      : "border-white/20 bg-transparent group-hover:border-white/40"
                  }`}
                >
                  {options[key] && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={3}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-t-primary">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* History */}
        {history.length > 1 && (
          <div className="glass rounded-2xl p-6">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-sm font-medium text-t-secondary">
                {t("pw.history")}
              </h3>
              <span className="text-xs text-t-tertiary">{t("pw.historyHint")}</span>
            </div>
            <div className="space-y-1.5">
              {history.map((p, i) => (
                <button
                  key={`${p}-${i}`}
                  onClick={() => copyText(p)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-bg-secondary border border-border hover:border-indigo-500/40 transition-colors font-mono text-[13px] text-t-primary truncate"
                  title={t("ui.copy")}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
