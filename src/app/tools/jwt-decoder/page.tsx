"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Copy, KeyRound, ShieldAlert, ShieldCheck, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { Toggle, sectionTitle } from "@/components/ui/controls";
import { useI18n } from "@/lib/i18n";
import { useStoredText } from "@/lib/text-tools/hooks";
import { smallButton } from "@/lib/text-tools/ui";
import { algInfo, decodeJwt, verifyJwt, type VerifyResult } from "./jwt-core";

const SAMPLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkF5xZ9lIFnEsWxtYXoiLCJyb2xlIjoiYWRtaW4iLCJpc3MiOiJodHRwczovL2F1dGguZXhhbXBsZS5jb20iLCJhdWQiOiJ6YXBmaWxlIiwiaWF0IjoxNzAwMDAwMDAwLCJleHAiOjIwMDAwMDAwMDB9.e_5O9Kk-ZaEGUIxXn6YfEdqPdMAQVyhPdb9lZaQIsfQ";
const SAMPLE_SECRET = "zapfile-demo-secret";

const CLAIMS: Record<string, string> = {
  iss: "jwt.v2.claim.iss",
  sub: "jwt.v2.claim.sub",
  aud: "jwt.v2.claim.aud",
  exp: "jwt.v2.claim.exp",
  nbf: "jwt.v2.claim.nbf",
  iat: "jwt.v2.claim.iat",
  jti: "jwt.v2.claim.jti",
  auth_time: "jwt.v2.claim.authTime",
  scope: "jwt.v2.claim.scope",
  azp: "jwt.v2.claim.azp",
};
const TIME = new Set(["exp", "nbf", "iat", "auth_time"]);

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

function relative(seconds: number, now: number, locale: string): string {
  const diff = seconds - now / 1000;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (abs < 60) return rtf.format(Math.round(diff), "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 86400 * 60) return rtf.format(Math.round(diff / 86400), "day");
  if (abs < 86400 * 730) return rtf.format(Math.round(diff / (86400 * 30)), "month");
  return rtf.format(Math.round(diff / (86400 * 365)), "year");
}

export default function JwtDecoderPage() {
  const { t, locale } = useI18n();
  const [token, setToken] = useStoredText("jwt-decoder");
  const [key, setKey] = useState("");
  const [b64Secret, setB64Secret] = useState(false);
  const [verify, setVerify] = useState<VerifyResult | null>(null);
  const now = useNow();

  const decoded = useMemo(() => (token.trim() ? decodeJwt(token) : null), [token]);
  const ok = decoded?.ok ? decoded : null;
  const alg = ok ? algInfo(ok.header.alg) : null;
  const payload = ok && ok.payload && typeof ok.payload === "object" && !Array.isArray(ok.payload) ? (ok.payload as Record<string, unknown>) : null;

  useEffect(() => {
    if (!ok || !key.trim()) {
      setVerify(null);
      return;
    }
    let live = true;
    const id = setTimeout(() => verifyJwt(ok.parts, ok.header, key, b64Secret).then((r) => live && setVerify(r)), 150);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [ok, key, b64Secret]);

  const exp = typeof payload?.exp === "number" ? payload.exp : null;
  const nbf = typeof payload?.nbf === "number" ? payload.nbf : null;
  const nowS = now / 1000;
  const status = !payload ? null : exp !== null && exp < nowS ? "expired" : nbf !== null && nbf > nowS ? "notYet" : exp !== null ? "active" : "noExp";

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("jwt.ui.itemCopied", { label }));
    } catch {
      toast.error(t("ui.copyFailed"));
    }
  };

  const pretty = (v: unknown) => JSON.stringify(v, null, 2);
  const unsigned = ok && String(ok.header.alg).toLowerCase() === "none";

  return (
    <ToolLayout toolName={t("tool.jwt-decoder.name")} toolDescription={t("tool.jwt-decoder.desc")}>
      <div className="space-y-5">
        <div className="glass space-y-3 p-5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-medium text-t-secondary">{t("jwt.ui.tokenLabel")}</span>
            <div className="flex gap-2">
              <button
                type="button"
                className={smallButton}
                onClick={() => {
                  setToken(SAMPLE);
                  setKey(SAMPLE_SECRET);
                  setB64Secret(false);
                }}
              >
                {t("json.sample")}
              </button>
              {token && (
                <button type="button" className={smallButton} onClick={() => setToken("")}>
                  {t("ui.clear")}
                </button>
              )}
            </div>
          </div>
          <textarea
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder={t("jwt.placeholder")}
            rows={4}
            spellCheck={false}
            dir="ltr"
            className="block w-full resize-y break-all rounded-xl border border-border bg-bg-secondary px-3 py-3 font-mono text-[13px] leading-5 text-t-primary placeholder:text-t-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
          />
          {ok && (
            <p className="break-all rounded-xl border border-border bg-surface px-3 py-2.5 font-mono text-[12.5px] leading-5" dir="ltr" aria-hidden="true">
              <span className="text-rose-700 dark:text-rose-400">{ok.parts[0]}</span>
              <span className="text-t-tertiary">.</span>
              <span className="text-violet-700 dark:text-violet-300">{ok.parts[1]}</span>
              <span className="text-t-tertiary">.</span>
              <span className="text-sky-700 dark:text-sky-400">{ok.parts[2]}</span>
            </p>
          )}
          {decoded && !decoded.ok && (
            <p className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 p-3 text-[13px] text-red-800 dark:text-red-300">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              {t(`jwt.v2.err.${decoded.reason}`, { n: decoded.parts.length })}
            </p>
          )}
        </div>

        {ok && (
          <>
            {status && (
              <div
                className={`flex items-center gap-3 rounded-xl border p-4 text-[14px] ${
                  status === "expired" ? "border-red-500/25 bg-red-500/10 text-red-800 dark:text-red-300" : status === "notYet" ? "border-amber-500/25 bg-amber-500/10 text-t-primary" : "border-emerald-500/25 bg-emerald-500/10 text-t-primary"
                }`}
                aria-live="polite"
              >
                <Clock className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span>
                  {status === "expired"
                    ? t("jwt.v2.expired", { when: relative(exp!, now, locale) })
                    : status === "notYet"
                      ? t("jwt.v2.notYet", { when: relative(nbf!, now, locale) })
                      : status === "active"
                        ? t("jwt.v2.active", { when: relative(exp!, now, locale) })
                        : t("jwt.v2.noExp")}
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="glass space-y-2 p-5">
                <div className="flex items-center justify-between">
                  <p className={`${sectionTitle} !text-rose-700 dark:!text-rose-400`}>{t("jwt.header")}</p>
                  <button type="button" onClick={() => copy(pretty(ok.header), t("jwt.header"))} className={smallButton} aria-label={`${t("jwt.copy")} ${t("jwt.header")}`}>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <pre dir="ltr" className="overflow-auto rounded-xl bg-bg-secondary p-3 font-mono text-[13px] leading-5 text-t-primary">
                  {pretty(ok.header)}
                </pre>
                <p className="text-[12.5px] text-t-tertiary">{alg ? t("jwt.v2.algInfo", { alg: String(ok.header.alg), name: alg.name, hash: alg.hash }) : unsigned ? t("jwt.v2.algNone") : t("jwt.v2.algUnknown", { alg: String(ok.header.alg ?? "?") })}</p>
              </div>
              <div className="glass space-y-2 p-5">
                <div className="flex items-center justify-between">
                  <p className={`${sectionTitle} !text-violet-700 dark:!text-violet-300`}>{t("jwt.payload")}</p>
                  <button type="button" onClick={() => copy(payload ? pretty(payload) : ok.payloadText, t("jwt.payload"))} className={smallButton} aria-label={`${t("jwt.copy")} ${t("jwt.payload")}`}>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <pre dir="ltr" className="max-h-[420px] overflow-auto rounded-xl bg-bg-secondary p-3 font-mono text-[13px] leading-5 text-t-primary">
                  {payload ? pretty(payload) : ok.payloadText}
                </pre>
              </div>
            </div>

            {payload && Object.keys(payload).some((k) => CLAIMS[k]) && (
              <div className="glass space-y-2 p-5">
                <p className={sectionTitle}>{t("jwt.v2.claims")}</p>
                <dl className="divide-y divide-border">
                  {Object.entries(payload)
                    .filter(([k]) => CLAIMS[k])
                    .map(([k, v]) => (
                      <div key={k} className="flex flex-wrap items-baseline gap-x-4 gap-y-0.5 py-2">
                        <dt className="w-44 shrink-0 text-[13px] text-t-tertiary">
                          {t(CLAIMS[k]!)} <code className="text-[11.5px]">{k}</code>
                        </dt>
                        <dd className="min-w-0 flex-1 break-words text-[14px] text-t-primary">
                          {TIME.has(k) && typeof v === "number" ? (
                            <>
                              {new Date(v * 1000).toLocaleString(locale)} <span className="text-t-tertiary">· {relative(v, now, locale)}</span>
                            </>
                          ) : Array.isArray(v) ? (
                            v.join(", ")
                          ) : (
                            String(v)
                          )}
                        </dd>
                      </div>
                    ))}
                </dl>
              </div>
            )}

            <div className="glass space-y-3 p-5">
              <p className={`${sectionTitle} flex items-center gap-2`}>
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                {t("jwt.v2.verifyTitle")}
              </p>
              {alg ? (
                <>
                  <textarea
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    rows={alg.kind === "hmac" ? 2 : 5}
                    spellCheck={false}
                    dir="ltr"
                    autoComplete="off"
                    placeholder={alg.kind === "hmac" ? t("jwt.v2.secretPh") : t("jwt.v2.publicKeyPh")}
                    aria-label={alg.kind === "hmac" ? t("jwt.v2.secretPh") : t("jwt.v2.publicKeyPh")}
                    className="block w-full resize-y rounded-xl border border-border bg-bg-secondary px-3 py-2.5 font-mono text-[13px] text-t-primary placeholder:text-t-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                  />
                  {alg.kind === "hmac" && <Toggle checked={b64Secret} onChange={setB64Secret} label={t("jwt.v2.b64Secret")} />}
                  {verify && (
                    <p
                      className={`flex items-center gap-2 text-[14px] font-medium ${verify === "valid" ? "text-emerald-700 dark:text-emerald-400" : verify === "badKey" ? "text-amber-700 dark:text-amber-400" : "text-red-700 dark:text-red-400"}`}
                      aria-live="polite"
                    >
                      {verify === "valid" ? <ShieldCheck className="h-5 w-5" aria-hidden="true" /> : verify === "badKey" ? <AlertTriangle className="h-5 w-5" aria-hidden="true" /> : <ShieldAlert className="h-5 w-5" aria-hidden="true" />}
                      {t(`jwt.v2.verify.${verify}`)}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-[13px] text-t-tertiary">{unsigned ? t("jwt.v2.algNone") : t("jwt.v2.algUnknown", { alg: String(ok.header.alg ?? "?") })}</p>
              )}
              <p className="flex items-start gap-2 text-[12.5px] text-t-tertiary">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {t("jwt.v2.private")}
              </p>
            </div>
          </>
        )}
      </div>
    </ToolLayout>
  );
}
