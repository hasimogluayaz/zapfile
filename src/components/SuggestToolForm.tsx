"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useI18n } from "@/lib/i18n";

export default function SuggestToolForm() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [toolName, setToolName] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolName.trim()) { toast.error("Please enter a tool name."); return; }
    if (sending) return;

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
    form.action = "https://formsubmit.co/hasimogluayaz@gmail.com";
    form.method = "POST";
    form.target = iframeName;
    form.style.display = "none";

    const addField = (name: string, value: string) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.appendChild(input);
    };

    addField("_subject", `ZapFile · Tool suggestion: ${toolName.trim()}`);
    addField("_template", "table");
    addField("_captcha", "false");
    addField("tool_name", toolName.trim());
    addField("description", description.trim() || "(none)");
    addField("page_url", window.location.href);
    addField("user_agent", navigator.userAgent);
    addField("submitted_at", new Date().toISOString());

    document.body.appendChild(form);
    form.submit();
    setTimeout(() => form.remove(), 1000);

    setSubmitted(true);
    setSending(false);
    toast.success("Thank you! Your suggestion has been sent.");
  };

  const handleReset = () => {
    setToolName("");
    setDescription("");
    setSubmitted(false);
    setOpen(false);
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
              <form onSubmit={handleSubmit} className="space-y-4 pt-5">
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
