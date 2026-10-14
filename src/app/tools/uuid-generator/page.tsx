"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Copy, Download, RefreshCw, ScanSearch } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import { Segmented, Slider, Toggle, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { downloadBlob } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useStoredPref } from "@/lib/text-tools/hooks";
import { NANO_ALPHABETS, inspectUuid, nanoBits, nanoId, ulid, uuidV4, uuidV7, type NanoAlphabet } from "./id-core";

type Kind = "v4" | "v7" | "ulid" | "nanoid";

const KIND_HINT: Record<Kind, string> = {
  v4: "uuid.v2.hintV4",
  v7: "uuid.v2.hintV7",
  ulid: "uuid.v2.hintUlid",
  nanoid: "uuid.v2.hintNano",
};
const ALPHA_LABEL: Record<NanoAlphabet, string> = {
  url: "uuid.v2.alphaUrl",
  alnum: "uuid.v2.alphaAlnum",
  lower: "uuid.v2.alphaLower",
  hex: "uuid.v2.alphaHex",
  digits: "uuid.v2.alphaDigits",
  noLookalikes: "uuid.v2.alphaNoLook",
};

export default function UuidGeneratorPage() {
  const { t, locale } = useI18n();
  const [kind, setKind] = useStoredPref<Kind>("uuid.kind", "v4", ["v4", "v7", "ulid", "nanoid"]);
  const [count, setCount] = useStoredPref<number>("uuid.count", 10);
  const [upper, setUpper] = useStoredPref<boolean>("uuid.upper", false);
  const [hyphens, setHyphens] = useStoredPref<boolean>("uuid.hyphens", true);
  const [braces, setBraces] = useStoredPref<boolean>("uuid.braces", false);
  const [nanoSize, setNanoSize] = useStoredPref<number>("uuid.nanoSize", 21);
  const [alphabet, setAlphabet] = useStoredPref<NanoAlphabet>("uuid.alpha", "url", Object.keys(NANO_ALPHABETS) as NanoAlphabet[]);
  const [ids, setIds] = useState<string[]>([]);
  const [inspect, setInspect] = useState("");

  const isUuid = kind === "v4" || kind === "v7";

  const generate = useCallback(() => {
    const one = () => {
      if (kind === "nanoid") return nanoId(nanoSize, NANO_ALPHABETS[alphabet]);
      if (kind === "ulid") return ulid();
      let id = kind === "v7" ? uuidV7() : uuidV4();
      if (!hyphens) id = id.replace(/-/g, "");
      if (upper) id = id.toUpperCase();
      if (braces) id = `{${id}}`;
      return id;
    };
    setIds(Array.from({ length: Math.max(1, Math.min(1000, count)) }, one));
  }, [kind, count, upper, hyphens, braces, nanoSize, alphabet]);

  useEffect(() => generate(), [generate]);

  const info = useMemo(() => (inspect.trim() ? inspectUuid(inspect) : null), [inspect]);

  const copy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(msg);
    } catch {
      toast.error(t("ui.copyFailed"));
    }
  };

  return (
    <ToolLayout toolName={t("tool.uuid-generator.name")} toolDescription={t("tool.uuid-generator.desc")}>
      <div className="space-y-5">
        <div className="glass space-y-4 p-5">
          <Segmented<Kind>
            label={t("uuid.type")}
            value={kind}
            onChange={setKind}
            options={[
              { value: "v4", label: "UUID v4" },
              { value: "v7", label: "UUID v7" },
              { value: "ulid", label: "ULID" },
              { value: "nanoid", label: "Nano ID" },
            ]}
          />
          <p className="text-[13px] text-t-secondary">{t(KIND_HINT[kind])}</p>

          {isUuid && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Toggle checked={hyphens} onChange={setHyphens} label={t("uuid.v2.hyphens")} />
              <Toggle checked={upper} onChange={setUpper} label={t("uuid.v2.uppercase")} />
              <Toggle checked={braces} onChange={setBraces} label={t("uuid.v2.braces")} />
            </div>
          )}
          {kind === "nanoid" && (
            <div className="space-y-4">
              <Slider label={t("uuid.v2.length")} value={nanoSize} min={4} max={64} onChange={setNanoSize} display={nanoSize} />
              <div className="space-y-2">
                <p className="text-[13px] text-t-secondary">{t("uuid.v2.alphabet")}</p>
                <Segmented<NanoAlphabet> label={t("uuid.v2.alphabet")} size="sm" value={alphabet} onChange={setAlphabet} options={(Object.keys(NANO_ALPHABETS) as NanoAlphabet[]).map((a) => ({ value: a, label: t(ALPHA_LABEL[a]) }))} />
              </div>
              <p className="text-[12.5px] text-t-tertiary">{t("uuid.v2.nanoBits", { bits: Math.round(nanoBits(nanoSize, NANO_ALPHABETS[alphabet])) })}</p>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
            <label className="block">
              <span className="mb-1.5 block text-[13px] text-t-secondary">{t("uuid.count")}</span>
              <input
                type="number"
                min={1}
                max={1000}
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
                className="h-11 w-28 rounded-xl border border-border bg-bg-secondary px-3 text-[14px] tabular-nums text-t-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
              />
            </label>
            <button type="button" onClick={generate} className={buttonPrimary}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t("uuid.generate")}
            </button>
          </div>
        </div>

        <div className="glass space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={sectionTitle}>{t("pw.v2.list", { n: ids.length })}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => copy(ids.join("\n"), t("uuid.ui.allCopied"))} className={buttonSecondary}>
                <Copy className="h-4 w-4" aria-hidden="true" />
                {t("uuid.copyAll")}
              </button>
              <button type="button" onClick={() => downloadBlob(new Blob([ids.join("\n") + "\n"], { type: "text/plain" }), `${kind}-ids.txt`)} className={buttonSecondary}>
                <Download className="h-4 w-4" aria-hidden="true" />
                .txt
              </button>
            </div>
          </div>
          <ul className="max-h-[480px] divide-y divide-border overflow-auto">
            {ids.map((id, i) => (
              <li key={i} className="flex items-center gap-2 py-1.5">
                <span className="w-9 shrink-0 text-end text-[12px] tabular-nums text-t-tertiary">{i + 1}</span>
                <code dir="ltr" className="min-w-0 flex-1 truncate font-mono text-[14px] text-t-primary">
                  {id}
                </code>
                <button type="button" onClick={() => copy(id, t("uuid.ui.copied"))} aria-label={`${t("ui.copy")} ${i + 1}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-t-tertiary hover:bg-bg-secondary hover:text-t-primary">
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="glass space-y-3 p-5">
          <p className={`${sectionTitle} flex items-center gap-2`}>
            <ScanSearch className="h-4 w-4" aria-hidden="true" />
            {t("uuid.v2.inspect")}
          </p>
          <input
            value={inspect}
            onChange={(e) => setInspect(e.target.value)}
            placeholder="018f3c2e-7b1a-7cde-9f00-1a2b3c4d5e6f"
            aria-label={t("uuid.v2.inspect")}
            spellCheck={false}
            dir="ltr"
            className="h-11 w-full rounded-xl border border-border bg-bg-secondary px-3 font-mono text-[14px] text-t-primary placeholder:text-t-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
          />
          {inspect.trim() &&
            (info ? (
              <dl className="grid gap-x-4 gap-y-1.5 text-[13.5px] sm:grid-cols-[160px_1fr]">
                <dt className="text-t-tertiary">{t("uuid.v2.version")}</dt>
                <dd className="text-t-primary">{info.nil ? "Nil UUID" : info.max ? "Max UUID" : `v${info.version}`}</dd>
                <dt className="text-t-tertiary">{t("uuid.v2.variant")}</dt>
                <dd className="text-t-primary">{info.variant}</dd>
                {info.time && (
                  <>
                    <dt className="text-t-tertiary">{t("uuid.v2.created")}</dt>
                    <dd className="text-t-primary">{info.time.toLocaleString(locale, { dateStyle: "medium", timeStyle: "medium" })}</dd>
                  </>
                )}
              </dl>
            ) : (
              <p className="text-[13px] text-red-700 dark:text-red-400">{t("uuid.v2.notUuid")}</p>
            ))}
        </div>
      </div>
    </ToolLayout>
  );
}
