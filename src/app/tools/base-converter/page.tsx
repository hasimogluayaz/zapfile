"use client";

import { useMemo, useState } from "react";
import ToolLayout from "@/components/ToolLayout";
import { Segmented, Toggle, sectionTitle } from "@/components/ui/controls";
import { useI18n } from "@/lib/i18n";
import { useStoredPref } from "@/lib/text-tools/hooks";
import { CopyButton } from "@/lib/text-tools/ui";

const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";
const PREFIX: Record<number, RegExp> = { 2: /^0b/i, 8: /^0o/i, 16: /^0x/i };

/** Parse an integer in any base 2–36 (sign, 0x/0b/0o prefixes, _ , ' and spaces allowed). */
function parse(raw: string, base: number): bigint | null | "bad" {
  let s = raw.trim().replace(/[\s_',]/g, "");
  if (!s) return null;
  let neg = false;
  if (s[0] === "-" || s[0] === "+") {
    neg = s[0] === "-";
    s = s.slice(1);
  }
  if (PREFIX[base]) s = s.replace(PREFIX[base]!, "");
  if (!s) return "bad";
  const b = BigInt(base);
  let n = BigInt(0);
  for (const ch of s.toLowerCase()) {
    const d = DIGITS.indexOf(ch);
    if (d < 0 || d >= base) return "bad";
    n = n * b + BigInt(d);
  }
  return neg ? -n : n;
}

function group(s: string, size: number, sep = " "): string {
  const neg = s.startsWith("-");
  const body = neg ? s.slice(1) : s;
  const out: string[] = [];
  for (let i = body.length; i > 0; i -= size) out.unshift(body.slice(Math.max(0, i - size), i));
  return (neg ? "-" : "") + out.join(sep);
}

const WIDTHS = [8, 16, 32, 64, 128] as const;
type Width = (typeof WIDTHS)[number];

interface FieldDef {
  base: number;
  label: string;
  group: number;
  sep: string;
}

export default function BaseConverterPage() {
  const { t, locale } = useI18n();
  const [source, setSource] = useState<{ base: number; text: string }>({ base: 10, text: "255" });
  const [custom, setCustom] = useStoredPref<number>("base.custom", 36);
  const [grouping, setGrouping] = useStoredPref<boolean>("base.group", true);
  const [upper, setUpper] = useStoredPref<boolean>("base.upper", true);
  const [width, setWidth] = useStoredPref<Width>("base.width", 32, WIDTHS);

  const value = useMemo(() => parse(source.text, source.base), [source]);
  const n = typeof value === "bigint" ? value : null;

  const fields: FieldDef[] = [
    { base: 2, label: t("base.binary"), group: 4, sep: " " },
    { base: 8, label: t("base.octal"), group: 3, sep: " " },
    { base: 10, label: t("base.decimal"), group: 3, sep: "," },
    { base: 16, label: t("base.hex"), group: 4, sep: " " },
  ];
  if (![2, 8, 10, 16].includes(custom)) fields.push({ base: custom, label: t("base.v2.baseN", { n: custom }), group: 4, sep: " " });

  const render = (num: bigint, f: FieldDef) => {
    let s = num.toString(f.base);
    if (upper) s = s.toUpperCase();
    if (!grouping) return s;
    return f.base === 10 ? (num < 0 ? "-" : "") + (num < 0 ? -num : num).toLocaleString("en-US") : group(s, f.group, f.sep);
  };

  // Two's complement view for negative numbers (and the unsigned range check).
  const twos = useMemo(() => {
    if (n === null) return null;
    const w = BigInt(width);
    const min = -(BigInt(1) << (w - BigInt(1)));
    const maxU = (BigInt(1) << w) - BigInt(1);
    if (n < min || n > maxU) return { fits: false as const };
    const u = n < 0 ? (BigInt(1) << w) + n : n;
    const bin = u.toString(2).padStart(width, "0");
    const hex = u.toString(16).padStart(width / 4, "0");
    const signed = u >= BigInt(1) << (w - BigInt(1)) ? u - (BigInt(1) << w) : u;
    return { fits: true as const, bin, hex: upper ? hex.toUpperCase() : hex, unsigned: u, signed };
  }, [n, width, upper]);

  const bits = n === null ? 0 : (n < 0 ? -n : n).toString(2).length;
  const charInfo = (() => {
    if (n === null || n < BigInt(33) || n > BigInt(0x10ffff) || (n >= BigInt(0xd800) && n <= BigInt(0xdfff))) return null;
    const c = String.fromCodePoint(Number(n));
    // Only visible characters (letters, digits, punctuation, symbols).
    return /[\p{L}\p{N}\p{P}\p{S}]/u.test(c) ? c : null;
  })();

  const input = (f: FieldDef) => {
    const active = source.base === f.base;
    const shown = active ? source.text : n !== null ? render(n, f) : "";
    const bad = active && value === "bad";
    return (
      <label key={f.base} className="block">
        <span className="mb-1.5 flex items-center justify-between gap-2 text-[13px] text-t-secondary">
          <span>
            {f.label} <span className="text-t-tertiary">({t("base.v2.base", { n: f.base })})</span>
          </span>
          <CopyButton getText={() => (n !== null ? n.toString(f.base) : "")} disabled={n === null} />
        </span>
        <input
          value={shown}
          onChange={(e) => setSource({ base: f.base, text: e.target.value })}
          spellCheck={false}
          autoComplete="off"
          inputMode={f.base === 10 ? "numeric" : "text"}
          dir="ltr"
          aria-invalid={bad}
          className={`h-12 w-full rounded-xl border bg-bg-secondary px-3 font-mono text-[15px] text-t-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60 ${bad ? "border-red-500/60" : "border-border"}`}
        />
        {bad && <span className="mt-1 block text-[12.5px] text-red-700 dark:text-red-400">{t("base.v2.badDigit", { base: f.base })}</span>}
      </label>
    );
  };

  return (
    <ToolLayout toolName={t("tool.base-converter.name")} toolDescription={t("tool.base-converter.desc")}>
      <div className="space-y-5">
        <div className="glass space-y-4 p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{fields.map(input)}</div>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3 border-t border-border pt-4">
            <label className="block">
              <span className="mb-1.5 block text-[13px] text-t-secondary">{t("base.v2.customBase")}</span>
              <select value={custom} onChange={(e) => setCustom(Number(e.target.value))} className="h-10 rounded-xl border border-border bg-bg-secondary px-3 text-[14px] text-t-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60">
                {Array.from({ length: 35 }, (_, i) => i + 2).map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>
            <Toggle checked={grouping} onChange={setGrouping} label={t("base.v2.grouping")} />
            <Toggle checked={upper} onChange={setUpper} label={t("base.v2.upper")} />
          </div>
          <p className="text-[12.5px] text-t-tertiary">{t("base.v2.hint")}</p>
        </div>

        {n !== null && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="glass space-y-3 p-5">
              <p className={sectionTitle}>{t("base.v2.twos")}</p>
              <Segmented<Width> label={t("base.v2.width")} size="sm" value={width} onChange={setWidth} options={WIDTHS.map((w) => ({ value: w, label: `${w}-bit` }))} />
              {twos?.fits ? (
                <dl className="space-y-2 text-[13.5px]">
                  <div>
                    <dt className="text-t-tertiary">{t("base.binary")}</dt>
                    <dd className="break-all font-mono text-t-primary" dir="ltr">
                      {group(twos.bin, 4)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-t-tertiary">{t("base.hex")}</dt>
                    <dd className="font-mono text-t-primary" dir="ltr">
                      0x{group(twos.hex, 4, "_")}
                    </dd>
                  </div>
                  <div className="flex gap-6">
                    <div>
                      <dt className="text-t-tertiary">{t("base.v2.signed")}</dt>
                      <dd className="font-mono tabular-nums text-t-primary">{twos.signed.toString()}</dd>
                    </div>
                    <div>
                      <dt className="text-t-tertiary">{t("base.v2.unsigned")}</dt>
                      <dd className="font-mono tabular-nums text-t-primary">{twos.unsigned.toString()}</dd>
                    </div>
                  </div>
                </dl>
              ) : (
                <p className="text-[13px] text-amber-700 dark:text-amber-400">{t("base.v2.noFit", { w: width })}</p>
              )}
            </div>
            <div className="glass space-y-3 p-5">
              <p className={sectionTitle}>{t("base.v2.facts")}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[13.5px]">
                <dt className="text-t-tertiary">{t("base.v2.bits")}</dt>
                <dd className="tabular-nums text-t-primary">{bits.toLocaleString(locale)}</dd>
                <dt className="text-t-tertiary">{t("base.v2.bytes")}</dt>
                <dd className="tabular-nums text-t-primary">{Math.max(1, Math.ceil(bits / 8)).toLocaleString(locale)}</dd>
                <dt className="text-t-tertiary">{t("base.v2.parity")}</dt>
                <dd className="text-t-primary">{n % BigInt(2) === BigInt(0) ? t("base.v2.even") : t("base.v2.odd")}</dd>
                {n > 0 && (n & (n - BigInt(1))) === BigInt(0) && (
                  <>
                    <dt className="text-t-tertiary">{t("base.v2.power")}</dt>
                    <dd className="text-t-primary">
                      2<sup>{bits - 1}</sup>
                    </dd>
                  </>
                )}
                {charInfo && (
                  <>
                    <dt className="text-t-tertiary">{t("base.v2.char")}</dt>
                    <dd className="text-t-primary">
                      <span className="rounded bg-bg-secondary px-1.5 py-0.5 font-mono">{charInfo}</span> <span className="text-t-tertiary">U+{n.toString(16).toUpperCase().padStart(4, "0")}</span>
                    </dd>
                  </>
                )}
              </dl>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
