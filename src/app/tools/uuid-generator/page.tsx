"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

type IdType = "uuid" | "nanoid";

const NANOID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
const NANOID_LENGTH = 21;

function generateNanoId(): string {
  const bytes = new Uint8Array(NANOID_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => NANOID_CHARS[b % NANOID_CHARS.length])
    .join("");
}

function CopyIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

export default function UuidGeneratorPage() {
  const { t } = useI18n();
  const [idType, setIdType] = useState<IdType>("uuid");
  const [count, setCount] = useState(10);
  const [ids, setIds] = useState<string[]>([]);

  const generate = () => {
    const clamped = Math.min(100, Math.max(1, count));
    const result: string[] = [];
    for (let i = 0; i < clamped; i++) {
      result.push(idType === "uuid" ? crypto.randomUUID() : generateNanoId());
    }
    setIds(result);
    toast.success(`Generated ${clamped} ${idType === "uuid" ? "UUID v4" : "Nano ID"}s`);
  };

  const copyOne = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      toast.success("Copied");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const copyAll = async () => {
    if (ids.length === 0) return;
    try {
      await navigator.clipboard.writeText(ids.join("\n"));
      toast.success("All IDs copied");
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <ToolLayout
      toolName={t("tool.uuid-generator.name")}
      toolDescription={t("tool.uuid-generator.desc")}
    >
      <div className="space-y-8">
        {/* Controls */}
        <div className="glass rounded-2xl p-6">
          {/* Type Toggle */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-brand-muted mb-3">
              {t("uuid.type")}
            </label>
            <div className="flex gap-2">
              {(["uuid", "nanoid"] as IdType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setIdType(type)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    idType === type
                      ? "bg-brand-indigo/20 border border-brand-indigo text-brand-text"
                      : "bg-white/[0.04] border border-white/[0.08] text-brand-muted hover:border-white/20"
                  }`}
                >
                  {type === "uuid" ? t("uuid.v4") : t("uuid.nanoid")}
                </button>
              ))}
            </div>
          </div>

          {/* Count */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-brand-muted mb-3">
              {t("uuid.count")}
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-32 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-brand-text focus:outline-none focus:border-brand-indigo/40 text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={generate}
              className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-brand hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {t("uuid.generate")}
            </button>
            {ids.length > 0 && (
              <button
                onClick={() => setIds([])}
                className="px-6 py-3 rounded-xl font-semibold text-brand-text bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all"
              >
                {t("ui.clear")}
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {ids.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-brand-text">
                {ids.length} {idType === "uuid" ? t("uuid.v4") : t("uuid.nanoid")}
              </h3>
              <button
                onClick={copyAll}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium text-brand-muted bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-brand-text transition-all"
              >
                <CopyIcon />
                {t("uuid.copyAll")}
              </button>
            </div>

            <div className="glass rounded-2xl p-4 max-h-96 overflow-y-auto space-y-1.5">
              {ids.map((id, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] group transition-all"
                >
                  <span className="font-mono text-sm text-brand-muted select-all flex-1 truncate">
                    {id}
                  </span>
                  <button
                    onClick={() => copyOne(id)}
                    className="flex-shrink-0 text-brand-muted opacity-0 group-hover:opacity-100 hover:text-brand-text transition-all"
                    aria-label="Copy"
                  >
                    <CopyIcon />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
