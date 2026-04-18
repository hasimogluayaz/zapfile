"use client";

import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { useI18n } from "@/lib/i18n";

const RATE_LIMIT_KEY = "zapfile-suggest-last";
const RATE_LIMIT_MS = 5 * 60 * 1000; // 5 min between submissions per browser
const MIN_FILL_MS = 3000; // humans take > 3s to fill a form

export default function SuggestToolForm() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [toolName, setToolName] = useState("");
  const [description, setDescription] = useState("");
  // Honeypot — bots fill this, humans don't (it's invisible + aria-hidden)
  const [website, setWebsite] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const openedAt = useRef<number>(0);

  useEffect(() => {
    if (open && openedAt.current === 0) openedAt.current = Date.now();
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolName.trim()) { toast.error("Please enter a tool name."); return; }
    if (sending) return;

    // 1. Honeypot — if filled, silently fake success and drop
    if (website.trim() !== "") {
      setSubmitted(true);
      return;
    }

    // 2. Min fill time — forms filled in <3s are almost certainly bots
    const elapsed = Date.now() - (openedAt.current || Date.now());
    if (elapsed < MIN_FILL_MS) {
      toast.error("Please take a moment before submitting.");
      return;
    }

    // 3. Rate limit per browser — max 1 submission / 5 min
    try {
      const last = Number(localStorage.getItem(RATE_LIMIT_KEY) || "0");
      const remain = RATE_LIMIT_MS - (Date.now() - last);
      if (remain > 0) {
        const mins = Math.ceil(remain / 60000);
        toast.error(`Please wait ${mins} min before sending another suggestion.`);
        return;
      }
    } catch { /* ignore localStorage errors */ }

    // 4. Length / content sanity
    const name = toolName.trim().slice(0, 80);
    const desc = description.trim().slice(0, 500);
    if (name.length < 2) { toast.error("Tool name too short."); return; }

    setSending(true);

    // Use hidden iframe + classic form POST to avoid CORS on FormSubmit
    const iframeName = "zapfile-suggest-iframe";
    let iframe = document.getElementsByName(iframeName)[0] as HTMLIFrameElement | undefined;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.name = iframeName;
      iframe.style.display = "none";
      document.body.appendChild(iframe);
    }

    const form = document.createElement("form");
    // Hashed FormSubmit endpoint → routes to hasimogluayaz@gmail.com
    // without exposing the email in page source to scrapers.
    form.action = "https://formsubmit.co/c14b61512ad48efc9fd9ce471b1b09b1";
    form.method = "POST";
    form.target = iframeName;
    form.style.display = "none";

    const addField = (fname: string, value: string) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = fname;
      input.value = value;
      form.appendChild(input);
    };

    addField("_subject", `ZapFile · Tool suggestion: ${name}`);
    addField("_template", "table");
    addField("_captcha", "false");
    // FormSubmit built-in honeypot (second line of defense)
    addField("_honey", "");
    addField("tool_name", name);
    addField("description", desc || "(none)");
    addField("page_url", window.location.href);
    addField("user_agent", navigator.userAgent);
    addField("submitted_at", new Date().toISOString());
    addField("fill_time_sec", String(Math.round(elapsed / 1000)));

    document.body.appendChild(form);
    form.submit();
    setTimeout(() => form.remove(), 1000);

    try { localStorage.setItem(RATE_LIMIT_KEY, String(Date.now())); } catch { /* ignore */ }

    setSubmitted(true);
    setSending(false);
    toast.success("Thank you! Your suggestion has been sent.");
  };

  const handleReset = () => {
    setToolName("");
    setDescription("");
    setWebsite("");
    setSubmitted(false);
    setOpen(false);
    openedAt.current = 0;
  };

  return (
    <section className="max-w-6xl mx-auto px-5 pb-12">
      <div className="glass rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-4 hover:bg-bg-secondary/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">💡</span>
            <div className="text-left">
              <p className="text-sm font-semibold text-t-primary">
                {t("home.suggest.title") || "Suggest a Tool"}
              </p>
              <p className="text-xs text-t-tertiary">
                {t("home.suggest.subtitle") || "Missing a tool? Let us know what you need."}
              </p>
            </div>
          </div>
          <svg
            className={`w-4 h-4 text-t-tertiary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="px-6 pb-6 border-t border-border">
            {submitted ? (
              <div className="flex flex-col items-center py-8 gap-4 text-center">
                <span className="text-4xl">🎉</span>
                <div>
                  <p className="font-semibold text-t-primary">
                    {t("home.suggest.thanks") || "Thanks for your suggestion!"}
                  </p>
                  <p className="text-sm text-t-secondary mt-1">
                    {t("home.suggest.thanksDesc") || "We review all suggestions and add the most requested tools."}
                  </p>
                </div>
                <button
                  onClick={handleReset}
                  className="px-5 py-2 rounded-xl text-sm font-semibold text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors"
                >
                  Suggest another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 pt-5" autoComplete="off">
                {/* Honeypot — invisible to humans, filled by bots */}
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: "-9999px",
                    top: "-9999px",
                    width: 0,
                    height: 0,
                    overflow: "hidden",
                  }}
                >
                  <label>
                    Website (leave blank)
                    <input
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </label>
                </div>

                <div>
                  <label className="text-xs font-semibold text-t-secondary mb-1.5 block">
                    Tool Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={toolName}
                    onChange={(e) => setToolName(e.target.value)}
                    placeholder="e.g. JSON to CSV Converter"
                    maxLength={80}
                    className="w-full px-4 py-2.5 rounded-xl bg-bg-secondary border border-border text-t-primary text-sm focus:outline-none focus:border-accent/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-t-secondary mb-1.5 block">
                    What should it do? (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what the tool should do…"
                    rows={3}
                    maxLength={500}
                    className="w-full px-4 py-2.5 rounded-xl bg-bg-secondary border border-border text-t-primary text-sm resize-none focus:outline-none focus:border-accent/50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending}
                  className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? "Sending…" : "Submit Suggestion"}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
