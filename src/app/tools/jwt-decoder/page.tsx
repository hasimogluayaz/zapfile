"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

interface JwtSections {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
}

function base64urlDecode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return atob(padded);
}

function parseJwt(token: string): JwtSections {
  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT structure");
  }
  const header = JSON.parse(base64urlDecode(parts[0]));
  const payload = JSON.parse(base64urlDecode(parts[1]));
  return { header, payload, signature: parts[2] };
}

function formatUnixDate(unix: unknown): string | null {
  if (typeof unix !== "number") return null;
  return new Date(unix * 1000).toLocaleString();
}

function CopyIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

export default function JwtDecoderPage() {
  const { t } = useI18n();
  const [input, setInput] = useState("");
  const [decoded, setDecoded] = useState<JwtSections | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decode = () => {
    setError(null);
    setDecoded(null);
    if (!input.trim()) {
      toast.error(t("jwt.invalid"));
      return;
    }
    try {
      const result = parseJwt(input);
      setDecoded(result);
    } catch {
      setError(t("jwt.invalid"));
      toast.error(t("jwt.invalid"));
    }
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const isExpired = (): boolean => {
    if (!decoded) return false;
    const exp = decoded.payload.exp;
    if (typeof exp !== "number") return false;
    return Date.now() / 1000 > exp;
  };

  const payload = decoded?.payload ?? {};
  const exp = payload.exp as number | undefined;
  const iat = payload.iat as number | undefined;
  const expired = decoded ? isExpired() : false;

  return (
    <ToolLayout
      toolName={t("tool.jwt-decoder.name")}
      toolDescription={t("tool.jwt-decoder.desc")}
    >
      <div className="space-y-8">
        {/* Input Section */}
        <div className="glass rounded-2xl p-6">
          <label className="block text-sm font-medium text-brand-muted mb-3">
            JWT Token
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("jwt.placeholder")}
            rows={5}
            className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-indigo/40 resize-none font-mono text-sm"
          />

          {error && (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          )}

          <div className="flex gap-3 mt-4">
            <button
              onClick={decode}
              className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-brand hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {t("jwt.decode")}
            </button>
            <button
              onClick={() => { setInput(""); setDecoded(null); setError(null); }}
              className="px-6 py-3 rounded-xl font-semibold text-brand-text bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all"
            >
              {t("ui.clear")}
            </button>
          </div>
        </div>

        {/* Decoded Output */}
        {decoded && (
          <div className="space-y-4">
            {/* Expiry status */}
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                  expired
                    ? "bg-red-500/15 text-red-400 border border-red-500/20"
                    : "bg-green-500/15 text-green-400 border border-green-500/20"
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${expired ? "bg-red-400" : "bg-green-400"}`} />
                {expired ? t("jwt.expired") : t("jwt.valid")}
              </span>

              {iat && (
                <span className="text-xs text-brand-muted">
                  {t("jwt.issuedAt")}: {formatUnixDate(iat)}
                </span>
              )}
              {exp && (
                <span className="text-xs text-brand-muted">
                  {t("jwt.expiresAt")}: {formatUnixDate(exp)}
                </span>
              )}
            </div>

            {/* Header */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-brand-text">{t("jwt.header")}</span>
                <button
                  onClick={() => copyText(JSON.stringify(decoded.header, null, 2), t("jwt.header"))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-muted bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-brand-text transition-all"
                >
                  <CopyIcon />
                  {t("jwt.copy")}
                </button>
              </div>
              <pre className="font-mono text-sm text-brand-muted bg-white/[0.04] rounded-xl p-4 overflow-x-auto select-all whitespace-pre-wrap break-all">
                {JSON.stringify(decoded.header, null, 2)}
              </pre>
            </div>

            {/* Payload */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-brand-text">{t("jwt.payload")}</span>
                <button
                  onClick={() => copyText(JSON.stringify(decoded.payload, null, 2), t("jwt.payload"))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-muted bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-brand-text transition-all"
                >
                  <CopyIcon />
                  {t("jwt.copy")}
                </button>
              </div>
              <pre className="font-mono text-sm text-brand-muted bg-white/[0.04] rounded-xl p-4 overflow-x-auto select-all whitespace-pre-wrap break-all">
                {JSON.stringify(decoded.payload, null, 2)}
              </pre>
            </div>

            {/* Signature */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-brand-text">{t("jwt.signature")}</span>
                <button
                  onClick={() => copyText(decoded.signature, t("jwt.signature"))}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-muted bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-brand-text transition-all"
                >
                  <CopyIcon />
                  {t("jwt.copy")}
                </button>
              </div>
              <p className="font-mono text-sm text-brand-muted bg-white/[0.04] rounded-xl p-4 break-all select-all">
                {decoded.signature}
              </p>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
