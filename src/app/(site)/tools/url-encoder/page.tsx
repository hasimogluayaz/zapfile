"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownUp, Link2, Plus, Trash2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import { Segmented, Toggle, sectionTitle } from "@/components/ui/controls";
import { useI18n } from "@/lib/i18n";
import { useStoredPref, useStoredText } from "@/lib/text-tools/hooks";
import { CopyButton, smallButton } from "@/lib/text-tools/ui";

type Scope = "component" | "uri";

function encodeText(text: string, scope: Scope, plus: boolean): string {
  let out = scope === "component" ? encodeURIComponent(text) : encodeURI(text);
  // encodeURIComponent leaves !'()* alone; RFC 3986 reserves them.
  if (scope === "component") out = out.replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
  if (plus) out = out.replace(/%20/g, "+");
  return out;
}

/** Decode, reporting the first malformed escape instead of silently giving up. */
function decodeText(text: string, plus: boolean): { ok: true; value: string } | { ok: false; at: number; seq: string } {
  const src = plus ? text.replace(/\+/g, " ") : text;
  try {
    return { ok: true, value: decodeURIComponent(src) };
  } catch {
    const re = /%(?:[0-9a-fA-F]{2})+|%.{0,2}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      try {
        decodeURIComponent(m[0]);
      } catch {
        return { ok: false, at: m.index + 1, seq: m[0] };
      }
    }
    return { ok: false, at: 1, seq: src.slice(0, 6) };
  }
}

interface Param {
  key: string;
  value: string;
}

export default function UrlEncoderPage() {
  const { t } = useI18n();
  const [text, setText] = useStoredText("url-encoder");
  const [direction, setDirection] = useStoredPref<"encode" | "decode">("url.dir", "encode", ["encode", "decode"]);
  const [scope, setScope] = useStoredPref<Scope>("url.scope", "component", ["component", "uri"]);
  const [plus, setPlus] = useStoredPref<boolean>("url.plus", false);

  const result = useMemo(() => {
    if (!text) return { ok: true as const, value: "" };
    return direction === "encode" ? { ok: true as const, value: encodeText(text, scope, plus) } : decodeText(text, plus);
  }, [text, direction, scope, plus]);

  // URL breakdown for whatever full URL is on either side.
  const urlSource = /^[a-z][a-z0-9+.-]*:\/\//i.test(text.trim()) ? text.trim() : result.ok && /^[a-z][a-z0-9+.-]*:\/\//i.test(result.value.trim()) ? result.value.trim() : "";
  const parsed = useMemo(() => {
    if (!urlSource) return null;
    try {
      return new URL(urlSource);
    } catch {
      return null;
    }
  }, [urlSource]);

  const [params, setParams] = useState<Param[] | null>(null);
  const shownParams: Param[] = params ?? (parsed ? Array.from(parsed.searchParams, ([key, value]) => ({ key, value })) : []);
  const rebuilt = useMemo(() => {
    if (!parsed || !params) return null;
    const u = new URL(parsed.href);
    u.search = "";
    for (const p of params) if (p.key) u.searchParams.append(p.key, p.value);
    return u.href;
  }, [parsed, params]);

  const setParam = (i: number, patch: Partial<Param>) => setParams(shownParams.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const swap = () => {
    if (!result.ok) return;
    setText(result.value);
    setDirection(direction === "encode" ? "decode" : "encode");
    setParams(null);
  };

  const field =
    "block w-full resize-y rounded-xl border border-border bg-bg-secondary px-3 py-3 font-mono text-[13.5px] leading-5 text-t-primary placeholder:text-t-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40";

  return (
    <ToolLayout toolName={t("tool.url-encoder.name")} toolDescription={t("tool.url-encoder.desc")}>
      <div className="space-y-5">
        <div className="glass flex flex-wrap items-center gap-x-5 gap-y-3 p-4">
          <Segmented<"encode" | "decode">
            label={t("b64.v2.direction")}
            value={direction}
            onChange={(d) => {
              setDirection(d);
              setParams(null);
            }}
            options={[
              { value: "encode", label: t("b64.v2.encode") },
              { value: "decode", label: t("b64.v2.decode") },
            ]}
          />
          {direction === "encode" && (
            <Segmented<Scope>
              label={t("urlenc.encodingMode")}
              size="sm"
              value={scope}
              onChange={setScope}
              options={[
                { value: "component", label: t("urlenc.v2.component") },
                { value: "uri", label: t("urlenc.v2.fullUrl") },
              ]}
            />
          )}
          <Toggle checked={plus} onChange={setPlus} label={t("urlenc.v2.plus")} />
        </div>

        <div className="glass space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-t-secondary">{direction === "encode" ? t("urlenc.decoded") : t("urlenc.encoded")}</span>
            {text && (
              <button type="button" className={smallButton} onClick={() => setText("")}>
                {t("ui.clear")}
              </button>
            )}
          </div>
          <textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setParams(null);
            }}
            rows={4}
            spellCheck={false}
            dir="ltr"
            placeholder={direction === "encode" ? t("urlenc.enterPlain") : t("urlenc.enterEncoded")}
            className={field}
          />
          <div className="flex justify-center">
            <button type="button" className={smallButton} onClick={swap} disabled={!text || !result.ok}>
              <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
              {t("b64.v2.swap")}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-t-secondary">{direction === "encode" ? t("urlenc.encoded") : t("urlenc.decoded")}</span>
            <CopyButton getText={() => (result.ok ? result.value : "")} disabled={!text || !result.ok} />
          </div>
          {result.ok ? (
            <textarea readOnly value={result.value} rows={4} dir="ltr" className={field} aria-label={t("ui.output")} />
          ) : (
            <p className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-[13px] text-red-800 dark:text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {t("urlenc.v2.malformed", { seq: result.seq, pos: result.at })}
            </p>
          )}
          {direction === "encode" && <p className="text-[12.5px] text-t-tertiary">{scope === "component" ? t("urlenc.v2.componentHint") : t("urlenc.v2.fullUrlHint")}</p>}
        </div>

        {parsed && (
          <div className="glass space-y-4 p-4 sm:p-5">
            <p className={`${sectionTitle} flex items-center gap-2`}>
              <Link2 className="h-4 w-4" aria-hidden="true" />
              {t("urlenc.v2.breakdown")}
            </p>
            <dl className="grid gap-x-4 gap-y-2 text-[13.5px] sm:grid-cols-[140px_1fr]">
              {(
                [
                  ["urlenc.v2.protocol", parsed.protocol],
                  ["urlenc.v2.host", parsed.hostname],
                  ["urlenc.v2.port", parsed.port],
                  ["urlenc.v2.path", decodeURIComponent(parsed.pathname)],
                  ["urlenc.v2.fragment", parsed.hash ? decodeURIComponent(parsed.hash.slice(1)) : ""],
                ] as const
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-t-tertiary">{t(k)}</dt>
                    <dd className="break-all font-mono text-t-primary" dir="ltr">
                      {v}
                    </dd>
                  </div>
                ))}
            </dl>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-t-secondary">{t("urlenc.v2.params", { n: shownParams.length })}</span>
                <button type="button" className={smallButton} onClick={() => setParams([...shownParams, { key: "", value: "" }])}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t("urlenc.v2.addParam")}
                </button>
              </div>
              {shownParams.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input value={p.key} onChange={(e) => setParam(i, { key: e.target.value })} aria-label={t("urlenc.v2.key")} placeholder={t("urlenc.v2.key")} dir="ltr" className="h-10 w-1/3 min-w-0 rounded-lg border border-border bg-bg-secondary px-2.5 font-mono text-[13px] text-t-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40" />
                  <input value={p.value} onChange={(e) => setParam(i, { value: e.target.value })} aria-label={t("urlenc.v2.value")} placeholder={t("urlenc.v2.value")} dir="ltr" className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-bg-secondary px-2.5 font-mono text-[13px] text-t-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40" />
                  <button type="button" onClick={() => setParams(shownParams.filter((_, j) => j !== i))} aria-label={t("ui.remove")} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-t-tertiary hover:bg-bg-secondary hover:text-t-primary">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
            {rebuilt && (
              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-t-secondary">{t("urlenc.v2.rebuilt")}</span>
                  <CopyButton getText={() => rebuilt} />
                </div>
                <p className="break-all rounded-xl bg-bg-secondary p-3 font-mono text-[13px] text-t-primary" dir="ltr">
                  {rebuilt}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
