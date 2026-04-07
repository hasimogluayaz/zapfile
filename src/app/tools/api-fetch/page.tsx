"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

export default function ApiFetchPage() {
  const { t } = useI18n();
  const [url, setUrl] = useState("https://jsonplaceholder.typicode.com/posts/1");
  const [method, setMethod] = useState<"GET" | "POST">("GET");
  const [body, setBody] = useState('{\n  "title": "foo"\n}');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [headersText, setHeadersText] = useState("");
  const [bodyOut, setBodyOut] = useState("");

  const send = async () => {
    let parsedBody: string | undefined;
    if (method === "POST" && body.trim()) {
      try {
        JSON.parse(body);
        parsedBody = body;
      } catch {
        toast.error(t("apifetch.invalidJson"));
        return;
      }
    }

    setLoading(true);
    setStatus(null);
    setHeadersText("");
    setBodyOut("");
    try {
      const res = await fetch(url, {
        method,
        headers:
          method === "POST" && parsedBody
            ? { "Content-Type": "application/json" }
            : undefined,
        body: method === "POST" ? parsedBody : undefined,
      });
      setStatus(res.status);
      const h: string[] = [];
      res.headers.forEach((v, k) => h.push(`${k}: ${v}`));
      setHeadersText(h.join("\n"));
      const ct = res.headers.get("content-type") || "";
      const raw = await res.text();
      if (ct.includes("application/json")) {
        try {
          setBodyOut(JSON.stringify(JSON.parse(raw), null, 2));
        } catch {
          setBodyOut(raw);
        }
      } else {
        setBodyOut(raw.slice(0, 50000));
      }
    } catch (e) {
      setBodyOut(e instanceof Error ? e.message : String(e));
      toast.error(t("apifetch.fail"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ToolLayout
      toolName="HTTP Fetch & JSON"
      toolDescription="Call APIs from the browser and inspect responses"
    >
      <div className="space-y-6">
        <p className="text-sm text-t-secondary leading-relaxed">{t("apifetch.cors")}</p>

        <div className="glass rounded-xl p-4 space-y-3">
          <label className="block text-sm font-medium text-t-secondary" htmlFor="api-url">
            {t("apifetch.url")}
          </label>
          <input
            id="api-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full font-mono text-sm px-3 py-2 rounded-lg bg-bg-secondary border border-border text-t-primary"
            autoComplete="off"
          />
          <div className="flex flex-wrap gap-3 items-center">
            <label className="text-sm text-t-secondary" htmlFor="api-method">
              {t("apifetch.method")}
            </label>
            <select
              id="api-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as "GET" | "POST")}
              className="text-sm rounded-lg border border-border bg-bg-secondary px-3 py-2"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </select>
            <button
              type="button"
              onClick={send}
              disabled={loading || !url.trim()}
              className="px-4 py-2 rounded-lg font-medium bg-accent text-white hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? "…" : t("apifetch.send")}
            </button>
          </div>
          {method === "POST" && (
            <>
              <label className="block text-sm font-medium text-t-secondary" htmlFor="api-body">
                {t("apifetch.body")}
              </label>
              <textarea
                id="api-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                className="w-full font-mono text-xs px-3 py-2 rounded-lg bg-bg-secondary border border-border text-t-primary"
                spellCheck={false}
              />
            </>
          )}
        </div>

        {status !== null && (
          <div className="space-y-4" role="region" aria-live="polite">
            <p className="text-sm">
              <span className="text-t-secondary">{t("apifetch.status")}: </span>
              <strong className="text-t-primary">{status}</strong>
            </p>
            <div>
              <h3 className="text-sm font-medium text-t-secondary mb-2">
                {t("apifetch.headers")}
              </h3>
              <pre className="text-xs font-mono p-4 rounded-lg bg-bg-secondary border border-border overflow-x-auto whitespace-pre-wrap">
                {headersText || "—"}
              </pre>
            </div>
            <div>
              <h3 className="text-sm font-medium text-t-secondary mb-2">
                {t("apifetch.bodyOut")}
              </h3>
              <pre className="text-xs font-mono p-4 rounded-lg bg-bg-secondary border border-border overflow-x-auto max-h-[400px] whitespace-pre-wrap">
                {bodyOut || "—"}
              </pre>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
