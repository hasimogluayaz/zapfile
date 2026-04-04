"use client";

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";

interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

const CHAR_SETS = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
};

function getStrength(
  length: number,
  options: PasswordOptions
): { label: string; color: string; percent: number } {
  const typesEnabled = [
    options.uppercase,
    options.lowercase,
    options.numbers,
    options.symbols,
  ].filter(Boolean).length;

  if (length < 8) {
    return { label: "Weak", color: "bg-red-500", percent: 25 };
  }
  if (length < 12) {
    return { label: "Medium", color: "bg-yellow-500", percent: 50 };
  }
  if (length < 16 || typesEnabled < 4) {
    return { label: "Strong", color: "bg-emerald-500", percent: 75 };
  }
  return { label: "Very Strong", color: "bg-emerald-400", percent: 100 };
}

function generatePassword(options: PasswordOptions): string {
  let charset = "";
  if (options.uppercase) charset += CHAR_SETS.uppercase;
  if (options.lowercase) charset += CHAR_SETS.lowercase;
  if (options.numbers) charset += CHAR_SETS.numbers;
  if (options.symbols) charset += CHAR_SETS.symbols;

  if (charset.length === 0) return "";

  const array = new Uint32Array(options.length);
  crypto.getRandomValues(array);

  return Array.from(array, (val) => charset[val % charset.length]).join("");
}

export default function PasswordGeneratorPage() {
  const [options, setOptions] = useState<PasswordOptions>({
    length: 16,
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });
  const [password, setPassword] = useState("");

  const generate = useCallback(() => {
    const result = generatePassword(options);
    setPassword(result);
  }, [options]);

  useEffect(() => {
    generate();
  }, [generate]);

  const strength = getStrength(options.length, options);

  const copyToClipboard = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      toast.success("Password copied to clipboard");
    } catch {
      toast.error("Failed to copy to clipboard");
    }
  };

  const toggleOption = (key: keyof Omit<PasswordOptions, "length">) => {
    const newOptions = { ...options, [key]: !options[key] };
    const anyEnabled =
      newOptions.uppercase ||
      newOptions.lowercase ||
      newOptions.numbers ||
      newOptions.symbols;
    if (!anyEnabled) {
      toast.error("At least one character type must be enabled");
      return;
    }
    setOptions(newOptions);
  };

  const checkboxes: { key: keyof Omit<PasswordOptions, "length">; label: string }[] = [
    { key: "uppercase", label: "Uppercase (A-Z)" },
    { key: "lowercase", label: "Lowercase (a-z)" },
    { key: "numbers", label: "Numbers (0-9)" },
    { key: "symbols", label: "Symbols (!@#$%^&*)" },
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
            Generated Password
          </label>
          <div className="relative">
            <div className="w-full px-4 py-4 rounded-xl bg-bg-secondary border border-border text-t-primary font-mono text-lg leading-relaxed break-all select-all min-h-[60px]">
              {password || (
                <span className="text-t-tertiary">
                  Enable at least one character type
                </span>
              )}
            </div>
          </div>

          {/* Strength Indicator */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-t-secondary">Strength</span>
              <span className="text-xs font-semibold text-t-primary">
                {strength.label}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                style={{ width: `${strength.percent}%` }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-5">
            <button
              onClick={copyToClipboard}
              disabled={!password}
              className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              Copy
            </button>
            <button
              onClick={generate}
              className="px-6 py-3 rounded-xl font-semibold text-t-primary bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all"
            >
              Regenerate
            </button>
          </div>
        </div>

        {/* Settings */}
        <div className="glass rounded-2xl p-6">
          <h3 className="text-sm font-medium text-t-secondary mb-5">
            Settings
          </h3>

          {/* Length Slider */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-t-primary">Password Length</label>
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
              >
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                    options[key]
                      ? "bg-indigo-500 border-indigo-500"
                      : "border-white/20 bg-transparent group-hover:border-white/40"
                  }`}
                  onClick={(e) => {
                    e.preventDefault();
                    toggleOption(key);
                  }}
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
                <input
                  type="checkbox"
                  checked={options[key]}
                  onChange={() => toggleOption(key)}
                  className="hidden"
                />
                <span className="text-sm text-t-primary">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
