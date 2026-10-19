"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Copy, Download, Eye, EyeOff, KeyRound, Loader2, RefreshCw, Hash, WholeWord } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import PasswordStrengthChecker from "@/components/PasswordStrengthChecker";
import { Segmented, Slider, Toggle, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { downloadBlob } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import {
  crackSeconds,
  generatePassphrase,
  generatePassword,
  generatePin,
  passphraseEntropy,
  passwordEntropy,
  type PassphraseOptions,
  type PasswordOptions,
  type SetKey,
} from "./pw-core";

type Mode = "password" | "passphrase" | "pin";

interface Settings {
  mode: Mode;
  pw: PasswordOptions;
  pp: PassphraseOptions;
  pinLength: number;
  count: number;
}

const DEFAULTS: Settings = {
  mode: "password",
  pw: { length: 20, sets: { upper: true, lower: true, digits: true, symbols: true }, excludeSimilar: false, excludeAmbiguous: false },
  pp: { words: 5, separator: "-", capitalize: true, addNumber: true },
  pinLength: 6,
  count: 1,
};
const STORE_KEY = "zapfile.password.v2";
const SET_LABEL: Record<SetKey, string> = { upper: "pw.uppercase", lower: "pw.lowercase", digits: "pw.numbers", symbols: "pw.symbols" };
const SEPARATORS = ["-", " ", ".", "_", ""];

function strengthOf(bits: number): { key: string; bar: string; pct: number } {
  if (bits < 40) return { key: "pw.weak", bar: "bg-red-500", pct: 22 };
  if (bits < 60) return { key: "pw.medium", bar: "bg-amber-500", pct: 48 };
  if (bits < 80) return { key: "pw.strong", bar: "bg-emerald-500", pct: 74 };
  return { key: "pw.veryStrong", bar: "bg-emerald-500", pct: 100 };
}

function crackLabel(bits: number, t: (k: string, p?: Record<string, string | number>) => string): string {
  const s = crackSeconds(bits);
  if (s < 1) return t("pw.instant");
  if (s < 60) return t("pw.seconds", { n: Math.round(s) });
  if (s < 3600) return t("pw.minutes", { n: Math.round(s / 60) });
  if (s < 86400) return t("pw.hours", { n: Math.round(s / 3600) });
  if (s < 31536000) return t("pw.days", { n: Math.round(s / 86400) });
  const y = s / 31536000;
  if (y < 100) return t("pw.years", { n: Math.round(y) });
  if (y < 1e4) return t("pw.centuries");
  return t("pw.millennia");
}

/** Colour digits and symbols so a password is easy to read back or type. */
function Pretty({ value }: { value: string }) {
  return (
    <>
      {Array.from(value).map((c, i) => (
        <span key={i} className={/\d/.test(c) ? "text-sky-700 dark:text-sky-400" : /[A-Za-z]/.test(c) || c === " " ? "" : "text-rose-700 dark:text-rose-400"}>
          {c}
        </span>
      ))}
    </>
  );
}

export default function PasswordGeneratorPage() {
  const { t } = useI18n();
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [words, setWords] = useState<string[] | null>(null);
  const [values, setValues] = useState<string[]>([]);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Settings>;
        setS({ ...DEFAULTS, ...saved, pw: { ...DEFAULTS.pw, ...saved.pw, sets: { ...DEFAULTS.pw.sets, ...saved.pw?.sets } }, pp: { ...DEFAULTS.pp, ...saved.pp } });
      }
    } catch {
      /* defaults */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(s));
    } catch {
      /* blocked */
    }
  }, [s]);

  // The 7,776-word list is only downloaded when passphrases are used.
  useEffect(() => {
    if (s.mode !== "passphrase" || words) return;
    import("./eff-wordlist").then((m) => setWords(m.default)).catch(() => toast.error(t("ui.failedLoad")));
  }, [s.mode, words, t]);

  const anySet = Object.values(s.pw.sets).some(Boolean);

  const generate = useCallback(() => {
    const one = (): string => {
      if (s.mode === "pin") return generatePin(s.pinLength);
      if (s.mode === "passphrase") return words ? generatePassphrase(words, s.pp) : "";
      return anySet ? generatePassword(s.pw) : "";
    };
    setValues(Array.from({ length: s.count }, one).filter(Boolean));
  }, [s, words, anySet]);

  useEffect(() => generate(), [generate]);

  const bits = useMemo(() => {
    if (s.mode === "pin") return s.pinLength * Math.log2(10);
    if (s.mode === "passphrase") return passphraseEntropy(7776, s.pp);
    return passwordEntropy(s.pw);
  }, [s]);
  const strength = strengthOf(bits);

  const patch = (p: Partial<Settings>) => setS((cur) => ({ ...cur, ...p }));
  const patchPw = (p: Partial<PasswordOptions>) => setS((cur) => ({ ...cur, pw: { ...cur.pw, ...p } }));
  const patchPp = (p: Partial<PassphraseOptions>) => setS((cur) => ({ ...cur, pp: { ...cur.pp, ...p } }));

  const toggleSet = (k: SetKey) => {
    const next = { ...s.pw.sets, [k]: !s.pw.sets[k] };
    if (!Object.values(next).some(Boolean)) {
      toast.error(t("pw.mustEnable"));
      return;
    }
    patchPw({ sets: next });
  };

  const copy = async (text: string, many = false) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(many ? t("pw.v2.copiedAll", { n: values.length }) : t("pw.copied"));
    } catch {
      toast.error(t("ui.copyFailed"));
    }
  };

  const main = values[0] ?? "";
  const mask = (v: string) => (hidden ? "•".repeat(Math.min(v.length, 40)) : v);

  return (
    <ToolLayout toolName={t("tool.password-generator.name")} toolDescription={t("tool.password-generator.desc")}>
      <div className="space-y-5">
        <Segmented<Mode>
          label={t("pw.v2.type")}
          value={s.mode}
          onChange={(mode) => patch({ mode })}
          options={[
            { value: "password", label: t("pw.v2.password"), icon: <KeyRound className="h-4 w-4" aria-hidden="true" /> },
            { value: "passphrase", label: t("pw.v2.passphrase"), icon: <WholeWord className="h-4 w-4" aria-hidden="true" /> },
            { value: "pin", label: "PIN", icon: <Hash className="h-4 w-4" aria-hidden="true" /> },
          ]}
        />

        {/* Result */}
        <div className="glass space-y-4 p-5 sm:p-6">
          <div className="flex items-start gap-2">
            <output
              className="min-h-[64px] min-w-0 flex-1 break-all rounded-xl border border-border bg-bg-secondary px-4 py-4 font-mono text-[19px] leading-relaxed text-t-primary sm:text-[21px]"
              aria-live="polite"
              aria-label={t("pw.generated")}
            >
              {main ? hidden ? mask(main) : <Pretty value={main} /> : s.mode === "passphrase" && !words ? <Loader2 className="h-5 w-5 animate-spin text-t-tertiary" aria-hidden="true" /> : null}
            </output>
            <button type="button" onClick={() => setHidden((h) => !h)} aria-pressed={hidden} aria-label={hidden ? t("pw.v2.show") : t("pw.v2.hide")} title={hidden ? t("pw.v2.show") : t("pw.v2.hide")} className={`${buttonSecondary} h-[64px] w-12 !px-0`}>
              {hidden ? <Eye className="h-4 w-4" aria-hidden="true" /> : <EyeOff className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-[13px]">
              <span className="text-t-secondary">{t("pw.strength")}</span>
              <span className="font-semibold text-t-primary">
                {t(strength.key)}
                <span className="ms-2 font-normal text-t-tertiary tabular-nums">
                  {Math.round(bits)} {t("pw.bits")}
                </span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-bg-tertiary">
              <div className={`h-full rounded-full transition-all duration-300 ${strength.bar}`} style={{ width: `${strength.pct}%` }} />
            </div>
            <p className="mt-2 flex justify-between text-[12.5px] text-t-tertiary">
              <span>{t("pw.crackTime")}</span>
              <span className="font-medium text-t-secondary">{crackLabel(bits, t)}</span>
            </p>
            {s.mode === "pin" && <p className="mt-1 text-[12.5px] text-t-tertiary">{t("pw.v2.pinNote")}</p>}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => copy(main)} disabled={!main} className={buttonPrimary}>
              <Copy className="h-4 w-4" aria-hidden="true" />
              {t("ui.copy")}
            </button>
            <button type="button" onClick={generate} className={buttonSecondary}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t("ui.regenerate")}
            </button>
          </div>
        </div>

        {/* Settings */}
        <div className="glass space-y-5 p-5 sm:p-6">
          <p className={sectionTitle}>{t("ui.settings")}</p>
          {s.mode === "password" && (
            <>
              <Slider label={t("pw.length")} value={s.pw.length} min={6} max={128} onChange={(length) => patchPw({ length })} display={s.pw.length} />
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(SET_LABEL) as SetKey[]).map((k) => (
                  <Toggle key={k} checked={s.pw.sets[k]} onChange={() => toggleSet(k)} label={t(SET_LABEL[k])} />
                ))}
              </div>
              <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                <Toggle checked={s.pw.excludeSimilar} onChange={(v) => patchPw({ excludeSimilar: v })} label={t("pw.excludeSimilar")} />
                <Toggle checked={s.pw.excludeAmbiguous} onChange={(v) => patchPw({ excludeAmbiguous: v })} label={t("pw.excludeAmbiguous")} />
              </div>
              <p className="text-[12.5px] text-t-tertiary">{t("pw.v2.everyType")}</p>
            </>
          )}
          {s.mode === "passphrase" && (
            <>
              <Slider label={t("pw.v2.words")} value={s.pp.words} min={3} max={12} onChange={(n) => patchPp({ words: n })} display={s.pp.words} />
              <div className="space-y-2">
                <p className="text-[13px] text-t-secondary">{t("pw.v2.separator")}</p>
                <Segmented<string>
                  label={t("pw.v2.separator")}
                  size="sm"
                  value={s.pp.separator}
                  onChange={(separator) => patchPp({ separator })}
                  options={SEPARATORS.map((sep) => ({ value: sep, label: sep === " " ? t("pw.v2.space") : sep === "" ? t("pw.v2.none") : sep }))}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Toggle checked={s.pp.capitalize} onChange={(v) => patchPp({ capitalize: v })} label={t("pw.v2.capitalize")} />
                <Toggle checked={s.pp.addNumber} onChange={(v) => patchPp({ addNumber: v })} label={t("pw.v2.addNumber")} />
              </div>
              <p className="text-[12.5px] text-t-tertiary">{t("pw.v2.passphraseNote")}</p>
            </>
          )}
          {s.mode === "pin" && <Slider label={t("pw.length")} value={s.pinLength} min={4} max={12} onChange={(pinLength) => patch({ pinLength })} display={s.pinLength} />}

          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-[13px] text-t-secondary">{t("pw.v2.howMany")}</p>
            <Segmented<number> label={t("pw.v2.howMany")} size="sm" value={s.count} onChange={(count) => patch({ count })} options={[1, 5, 10, 25, 50].map((n) => ({ value: n, label: String(n) }))} />
          </div>
        </div>

        {values.length > 1 && (
          <div className="glass space-y-3 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={sectionTitle}>{t("pw.v2.list", { n: values.length })}</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => copy(values.join("\n"), true)} className={buttonSecondary}>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  {t("pw.v2.copyAll")}
                </button>
                <button type="button" onClick={() => downloadBlob(new Blob([values.join("\n") + "\n"], { type: "text/plain" }), `${s.mode}s.txt`)} className={buttonSecondary}>
                  <Download className="h-4 w-4" aria-hidden="true" />
                  .txt
                </button>
              </div>
            </div>
            <ul className="divide-y divide-border">
              {values.map((v, i) => (
                <li key={i} className="flex items-center gap-2 py-1.5">
                  <span className="w-7 shrink-0 text-end text-[12px] tabular-nums text-t-tertiary">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[14px] text-t-primary" dir="ltr">
                    {hidden ? mask(v) : <Pretty value={v} />}
                  </span>
                  <button type="button" onClick={() => copy(v)} aria-label={`${t("ui.copy")} ${i + 1}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-t-tertiary hover:bg-bg-secondary hover:text-t-primary">
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-center text-[12.5px] text-t-tertiary">{t("pw.v2.privacy")}</p>

        <div className="border-t border-border pt-6">
          <PasswordStrengthChecker />
        </div>
      </div>
    </ToolLayout>
  );
}
