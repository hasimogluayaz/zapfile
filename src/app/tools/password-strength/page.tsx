"use client";

import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";

// ── Common passwords breach list ──────────────────────────────────────────────

const COMMON_PASSWORDS = new Set([
  "123456","password","123456789","12345678","12345","1234567","1234567890",
  "qwerty","abc123","football","monkey","letmein","shadow","master","dragon",
  "111111","baseball","iloveyou","trustno1","sunshine","princess","welcome",
  "admin","login","666666","passw0rd","superman","michael","batman","password1",
]);

// ── Keyboard / pattern detection ──────────────────────────────────────────────

const KEYBOARD_PATTERNS = [
  "qwerty","qwertz","azerty","asdfgh","zxcvbn","12345","23456","34567",
  "45678","56789","98765","87654","76543","65432","54321","abcdef","fedcba",
];

function detectPatterns(password: string): string[] {
  const lp = password.toLowerCase();
  const warnings: string[] = [];

  // Keyboard sequences
  for (const pattern of KEYBOARD_PATTERNS) {
    if (lp.includes(pattern)) {
      warnings.push(`Contains keyboard pattern "${pattern}"`);
      break;
    }
  }

  // Repeated characters (3+)
  if (/(.)\1{2,}/.test(password)) {
    warnings.push("Contains repeated characters (e.g. aaa, 111)");
  }

  // Date patterns
  if (/(?:19|20)\d{2}/.test(password)) {
    warnings.push("Contains a year (19xx / 20xx) — easy to guess");
  }

  // Only digits
  if (/^\d+$/.test(password)) {
    warnings.push("Password is all numbers — very weak");
  }

  // Only letters
  if (/^[a-zA-Z]+$/.test(password)) {
    warnings.push("Password is all letters — no numbers or symbols");
  }

  return warnings;
}

// ── Analysis ──────────────────────────────────────────────────────────────────

interface PasswordAnalysis {
  length: number;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSymbols: boolean;
  charsetSize: number;
  entropy: number;
  score: number; // 0-100
  label: "Very Weak" | "Weak" | "Fair" | "Strong" | "Very Strong";
  crackTime: string;
  isBreached: boolean;
  suggestions: string[];
  patternWarnings: string[];
}

function analyzePassword(password: string): PasswordAnalysis {
  const length = password.length;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSymbols = /[^a-zA-Z0-9]/.test(password);

  let charsetSize = 0;
  if (hasLowercase) charsetSize += 26;
  if (hasUppercase) charsetSize += 26;
  if (hasNumbers) charsetSize += 10;
  if (hasSymbols) charsetSize += 32;
  if (charsetSize === 0) charsetSize = 26;

  const entropy = length > 0 ? Math.log2(Math.pow(charsetSize, length)) : 0;

  // Score (0-100)
  const criteriaMet = [hasUppercase, hasLowercase, hasNumbers, hasSymbols].filter(Boolean).length;
  const entropyScore = Math.min(60, (entropy / 128) * 60);
  const lengthScore = Math.min(25, (length / 20) * 25);
  const criteriaScore = (criteriaMet / 4) * 15;
  const score = Math.round(entropyScore + lengthScore + criteriaScore);

  let label: PasswordAnalysis["label"];
  if (score < 20) label = "Very Weak";
  else if (score < 40) label = "Weak";
  else if (score < 60) label = "Fair";
  else if (score < 80) label = "Strong";
  else label = "Very Strong";

  // Crack time — 100 billion guesses/sec (modern GPU cluster)
  const GUESSES_PER_SECOND = 1e11;
  const combinations = charsetSize > 0 && length > 0 ? Math.pow(charsetSize, length) : 0;
  const seconds = combinations / GUESSES_PER_SECOND;

  let crackTime: string;
  if (seconds < 1) crackTime = "Instantly";
  else if (seconds < 60) crackTime = `${Math.round(seconds)} seconds`;
  else if (seconds < 3600) crackTime = `${Math.round(seconds / 60)} minutes`;
  else if (seconds < 86400) crackTime = `${Math.round(seconds / 3600)} hours`;
  else if (seconds < 2592000) crackTime = `${Math.round(seconds / 86400)} days`;
  else if (seconds < 31536000) crackTime = `${Math.round(seconds / 2592000)} months`;
  else if (seconds < 3.156e9) crackTime = `${Math.round(seconds / 31536000)} years`;
  else if (seconds < 3.156e12) crackTime = `${Math.round(seconds / 3.156e9)} thousand years`;
  else if (seconds < 3.156e15) crackTime = `${Math.round(seconds / 3.156e12)} million years`;
  else crackTime = "Centuries";

  // Breach check
  const isBreached = COMMON_PASSWORDS.has(password.toLowerCase());

  // Improvement suggestions
  const suggestions: string[] = [];
  if (!hasUppercase) suggestions.push("Add uppercase letters (A-Z)");
  if (!hasLowercase) suggestions.push("Add lowercase letters (a-z)");
  if (!hasNumbers) suggestions.push("Add numbers (0-9)");
  if (!hasSymbols) suggestions.push("Add symbols (!@#$%^&*)");
  if (length < 12) suggestions.push("Make it longer — aim for at least 12 characters");
  if (length < 16 && criteriaMet >= 3) suggestions.push("16+ characters is ideal for maximum security");

  // Pattern warnings
  const patternWarnings = detectPatterns(password);
  if (isBreached) patternWarnings.unshift("This password is in the top common passwords list!");

  return {
    length, hasUppercase, hasLowercase, hasNumbers, hasSymbols,
    charsetSize, entropy, score, label, crackTime,
    isBreached, suggestions, patternWarnings,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function strengthGradient(score: number): string {
  if (score < 20) return "from-red-600 to-red-500";
  if (score < 40) return "from-orange-500 to-orange-400";
  if (score < 60) return "from-amber-500 to-yellow-400";
  if (score < 80) return "from-emerald-500 to-green-400";
  return "from-emerald-500 to-teal-400";
}

function strengthTextColor(score: number): string {
  if (score < 20) return "text-red-400";
  if (score < 40) return "text-orange-400";
  if (score < 60) return "text-amber-400";
  if (score < 80) return "text-emerald-400";
  return "text-teal-400";
}

function CheckRow({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`text-base leading-none ${passed ? "text-emerald-400" : "text-red-400"}`}>
        {passed ? "✓" : "✗"}
      </span>
      <span className={passed ? "text-t-primary" : "text-t-secondary"}>{label}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PasswordStrengthPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const analysis = useMemo<PasswordAnalysis | null>(() => {
    if (!password) return null;
    return analyzePassword(password);
  }, [password]);

  const copyPassword = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      toast.success("Password copied!");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <ToolLayout
      toolName="Password Strength Tester"
      toolDescription="Analyze your password's strength, entropy, and estimated crack time — all processed locally in your browser."
    >
      <div className="space-y-5">
        {/* Input Card */}
        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-t-secondary">Enter your password</label>
            {password && (
              <span className="text-xs font-mono text-t-secondary bg-bg-secondary px-2 py-1 rounded-lg border border-border">
                {password.length} chars
              </span>
            )}
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Type your password here…"
              className="w-full px-4 py-3 pr-20 rounded-xl bg-white/[0.04] border border-white/[0.08] text-t-primary placeholder:text-t-secondary/40 focus:outline-none focus:border-indigo-500/40 font-mono text-sm"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              {password && (
                <button
                  onClick={copyPassword}
                  className="p-2 rounded-lg text-t-secondary hover:text-t-primary hover:bg-white/[0.08] transition-all"
                  aria-label="Copy password"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              )}
              <button
                onClick={() => setShowPassword((v) => !v)}
                className="p-2 rounded-lg text-t-secondary hover:text-t-primary hover:bg-white/[0.08] transition-all"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Animated strength bar */}
          {analysis && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-t-secondary">Strength</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-t-secondary">{analysis.score}/100</span>
                  <span className={`text-xs font-semibold ${strengthTextColor(analysis.score)}`}>
                    {analysis.label}
                  </span>
                </div>
              </div>
              <div className="h-2.5 rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${strengthGradient(analysis.score)}`}
                  style={{ width: `${analysis.score}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {analysis && (
          <>
            {/* Breach warning */}
            {analysis.isBreached && (
              <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-sm text-red-300 font-medium">
                  This password appears in common breach lists. Do not use it.
                </p>
              </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="glass rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-t-primary font-mono">{analysis.length}</p>
                <p className="text-xs text-t-secondary mt-1">Characters</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-t-primary font-mono">
                  {analysis.entropy.toFixed(0)}
                </p>
                <p className="text-xs text-t-secondary mt-1">Entropy bits</p>
              </div>
              <div className="glass rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-t-primary font-mono">{analysis.charsetSize}</p>
                <p className="text-xs text-t-secondary mt-1">Charset size</p>
              </div>
            </div>

            {/* Crack Time */}
            <div className="glass rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-t-secondary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                </svg>
                <p className="text-sm font-medium text-t-secondary">Time to Crack</p>
              </div>
              <p className={`text-2xl font-bold ${strengthTextColor(analysis.score)}`}>
                {analysis.crackTime}
              </p>
              <p className="text-xs text-t-secondary mt-1">
                At 100 billion guesses/sec (modern GPU cluster)
              </p>
            </div>

            {/* Criteria checklist */}
            <div className="glass rounded-xl p-5">
              <p className="text-sm font-medium text-t-secondary mb-4">Criteria</p>
              <div className="space-y-2.5">
                <CheckRow label="At least 8 characters" passed={analysis.length >= 8} />
                <CheckRow label="At least 12 characters (recommended)" passed={analysis.length >= 12} />
                <CheckRow label="At least 16 characters (ideal)" passed={analysis.length >= 16} />
                <CheckRow label="Contains uppercase letters (A-Z)" passed={analysis.hasUppercase} />
                <CheckRow label="Contains lowercase letters (a-z)" passed={analysis.hasLowercase} />
                <CheckRow label="Contains numbers (0-9)" passed={analysis.hasNumbers} />
                <CheckRow label="Contains symbols (!@#$…)" passed={analysis.hasSymbols} />
                <CheckRow label="Not a commonly used password" passed={!analysis.isBreached} />
              </div>
            </div>

            {/* Pattern warnings */}
            {analysis.patternWarnings.length > 0 && (
              <div className="glass rounded-xl p-5">
                <p className="text-sm font-medium text-amber-400 mb-3">Pattern Warnings</p>
                <ul className="space-y-2">
                  {analysis.patternWarnings.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-t-secondary">
                      <span className="text-amber-400 mt-0.5 shrink-0">!</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Suggestions */}
            {analysis.suggestions.length > 0 && (
              <div className="glass rounded-xl p-5">
                <p className="text-sm font-medium text-t-secondary mb-3">Suggestions</p>
                <ul className="space-y-2">
                  {analysis.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-t-secondary">
                      <span className="text-indigo-400 mt-0.5 shrink-0">→</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Privacy note */}
            <div className="flex items-center gap-2 text-xs text-t-secondary bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Your password is never sent anywhere. All analysis happens entirely in your browser.
            </div>
          </>
        )}
      </div>
    </ToolLayout>
  );
}
