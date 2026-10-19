"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Copy, RefreshCw } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import { Segmented, Slider, Toggle, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { useI18n } from "@/lib/i18n";
import { useStoredPref } from "@/lib/text-tools/hooks";

type GenerateType = "paragraphs" | "sentences" | "words";

const LOREM_WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit",
  "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore",
  "magna", "aliqua", "enim", "ad", "minim", "veniam", "quis", "nostrud",
  "exercitation", "ullamco", "laboris", "nisi", "aliquip", "ex", "ea", "commodo",
  "consequat", "duis", "aute", "irure", "in", "reprehenderit", "voluptate",
  "velit", "esse", "cillum", "fugiat", "nulla", "pariatur", "excepteur", "sint",
  "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia",
  "deserunt", "mollit", "anim", "id", "est", "laborum", "at", "vero", "eos",
  "accusamus", "iusto", "odio", "dignissimos", "ducimus", "blanditiis",
  "praesentium", "voluptatum", "deleniti", "atque", "corrupti", "quos", "dolores",
  "quas", "molestias", "excepturi", "obcaecati", "cupiditate", "provident",
  "similique", "mollitia", "animi", "recusandae", "tenetur", "a", "sapiente",
  "delectus", "rerum", "hic", "necessitatibus", "saepe", "eveniet",
  "voluptates", "repudiandae", "recusandae", "numquam", "eius", "modi",
  "tempora", "quaerat", "voluptatem", "quia", "consequuntur", "magni",
  "dolorem", "porro", "quisquam", "nihil", "impedit", "quo", "minus",
  "maxime", "placeat", "facere", "possimus", "omnis", "voluptas", "assumenda",
  "repellendus", "temporibus", "quibusdam", "illum", "fugit", "aspernatur",
  "aut", "odit", "consequatur", "vel", "rem", "aperiam", "eaque", "ipsa",
  "quae", "ab", "illo", "inventore", "veritatis", "quasi", "architecto",
  "beatae", "vitae", "dicta", "explicabo", "nemo", "ipsam", "voluptatibus",
  "maiores", "alias", "perferendis", "doloribus", "asperiores", "repellat",
  "hanc", "ego", "cum", "soluta", "nobis", "eligendi", "optio", "cumque",
  "impedit", "neque", "porro", "libero", "tempore", "cumque", "quod",
  "autem", "harum", "rerum", "facilis", "expedita", "distinctio", "nam",
  "totam", "accusantium", "doloremque", "laudantium", "aperiam", "eaque",
  "perspiciatis", "unde", "debitis", "aut", "rerum", "necessitatibus",
  "saepe", "eveniet", "ut", "et", "voluptates", "repudiandae", "sint",
  "molestiae", "non", "recusandae", "itaque", "earum", "rerum", "sapiente",
  "delectus", "officiis", "debitis", "aut", "rerum", "necessitatibus",
  "temporibus", "autem", "quibusdam", "aut", "officiis", "suscipit",
];

const LOREM_START = "Lorem ipsum dolor sit amet, consectetur adipiscing elit";
const WORDS = Array.from(new Set(LOREM_WORDS));

type Format = "text" | "html" | "markdown";

function pick(prev?: string): string {
  // Never repeat the previous word.
  for (;;) {
    const w = WORDS[Math.floor(Math.random() * WORDS.length)]!;
    if (w !== prev) return w;
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function sentence(): string {
  const length = 7 + Math.floor(Math.random() * 11);
  const words: string[] = [];
  for (let i = 0; i < length; i++) words.push(pick(words[i - 1]));
  // A comma in longer sentences reads more naturally.
  if (length > 10) {
    const at = 3 + Math.floor(Math.random() * (length - 6));
    words[at] += ",";
  }
  words[0] = capitalize(words[0]!);
  return words.join(" ") + (Math.random() < 0.08 ? "?" : ".");
}

function paragraph(): string {
  const n = 4 + Math.floor(Math.random() * 4);
  return Array.from({ length: n }, sentence).join(" ");
}

function generate(type: GenerateType | "chars", count: number, startWithLorem: boolean): string[] {
  if (type === "paragraphs") {
    const ps = Array.from({ length: count }, paragraph);
    if (startWithLorem) ps[0] = `${LOREM_START}. ${ps[0]}`;
    return ps;
  }
  if (type === "sentences") {
    const ss = Array.from({ length: count }, sentence);
    if (startWithLorem) ss[0] = `${LOREM_START}.`;
    return [ss.join(" ")];
  }
  if (type === "words") {
    const ws: string[] = [];
    for (let i = 0; i < count; i++) ws.push(pick(ws[i - 1]));
    if (startWithLorem) LOREM_START.toLowerCase().replace(",", "").split(" ").slice(0, count).forEach((w, i) => (ws[i] = w));
    ws[0] = capitalize(ws[0]!);
    return [ws.join(" ")];
  }
  // Exact character count (for testing field limits), ending on a full word.
  let out = startWithLorem ? `${LOREM_START}. ` : "";
  while (out.length < count) out += sentence() + " ";
  out = out.slice(0, count);
  const cut = out.lastIndexOf(" ");
  if (cut > count * 0.8) out = out.slice(0, cut);
  out = out.replace(/[ ,]+$/, "");
  if (out.length < count && !/[.?]$/.test(out)) out += ".";
  return [out.slice(0, count)];
}

function render(parts: string[], format: Format, type: string): string {
  if (format === "text") return parts.join("\n\n");
  if (format === "html") return parts.map((p) => `<p>${p}</p>`).join("\n");
  return parts.join("\n\n") + (type === "paragraphs" ? "\n" : "");
}

export default function LoremIpsumPage() {
  const { t, locale } = useI18n();
  const [type, setType] = useStoredPref<GenerateType | "chars">("lorem.type", "paragraphs", ["paragraphs", "sentences", "words", "chars"]);
  const [count, setCount] = useStoredPref<number>("lorem.count", 3);
  const [startWithLorem, setStartWithLorem] = useStoredPref<boolean>("lorem.start", true);
  const [format, setFormat] = useStoredPref<Format>("lorem.format", "text", ["text", "html", "markdown"]);
  const [parts, setParts] = useState<string[]>([]);

  const limits: Record<string, [number, number, number]> = { paragraphs: [1, 50, 3], sentences: [1, 100, 10], words: [1, 1000, 50], chars: [10, 5000, 280] };
  const [min, max] = limits[type]!;
  const safeCount = Math.min(max, Math.max(min, count));

  const regenerate = useCallback(() => setParts(generate(type, safeCount, startWithLorem)), [type, safeCount, startWithLorem]);
  useEffect(() => regenerate(), [regenerate]);

  const text = render(parts, format, type);
  const plain = parts.join("\n\n");
  const words = plain.trim() ? plain.trim().split(/\s+/).length : 0;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("lorem.textCopied"));
    } catch {
      toast.error(t("ui.copyFailed"));
    }
  };

  return (
    <ToolLayout toolName={t("tool.lorem-ipsum.name")} toolDescription={t("tool.lorem-ipsum.desc")}>
      <div className="space-y-5">
        <div className="glass space-y-5 p-5 sm:p-6">
          <Segmented<GenerateType | "chars">
            label={t("ui.type")}
            value={type}
            onChange={(v) => {
              setType(v);
              setCount(limits[v]![2]);
            }}
            options={[
              { value: "paragraphs", label: t("lorem.paragraphs") },
              { value: "sentences", label: t("lorem.sentences") },
              { value: "words", label: t("lorem.words") },
              { value: "chars", label: t("lorem.v2.chars") },
            ]}
          />
          <div className="flex flex-wrap items-end gap-4">
            <Slider className="min-w-[220px] flex-1" label={t("lorem.count")} value={safeCount} min={min} max={type === "chars" ? 1000 : type === "words" ? 300 : max} onChange={setCount} display={safeCount} />
            <label className="block">
              <span className="sr-only">{t("lorem.count")}</span>
              <input type="number" min={min} max={max} value={safeCount} onChange={(e) => setCount(Number(e.target.value) || min)} className="h-10 w-24 rounded-xl border border-border bg-bg-secondary px-3 text-[14px] tabular-nums text-t-primary" />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Toggle checked={startWithLorem} onChange={setStartWithLorem} label={t("lorem.startWith")} />
            <Segmented<Format>
              label={t("lorem.v2.format")}
              size="sm"
              value={format}
              onChange={setFormat}
              options={[
                { value: "text", label: t("lorem.v2.plain") },
                { value: "html", label: "HTML" },
                { value: "markdown", label: "Markdown" },
              ]}
            />
          </div>
        </div>

        <div className="glass space-y-3 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={sectionTitle}>{t("lorem.generatedText")}</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={regenerate} className={buttonSecondary}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {t("ui.regenerate")}
              </button>
              <button type="button" onClick={copy} disabled={!text} className={buttonPrimary}>
                <Copy className="h-4 w-4" aria-hidden="true" />
                {t("ui.copy")}
              </button>
            </div>
          </div>
          <div className={`max-h-[28rem] overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-bg-secondary px-4 py-4 text-[14.5px] leading-relaxed text-t-primary ${format === "text" ? "" : "font-mono text-[13px]"}`}>{text}</div>
          <p className="text-[12.5px] tabular-nums text-t-tertiary">
            {words.toLocaleString(locale)} {t("ui.words")} · {plain.length.toLocaleString(locale)} {t("ui.characters")}
          </p>
        </div>
      </div>
    </ToolLayout>
  );
}
