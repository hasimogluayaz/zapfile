"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Bold, Code, Columns2, Download, Eye, FileCode2, FileUp, Heading, Italic, Link2, List, ListChecks, ListOrdered, Pencil, Quote, Strikethrough, Table, Clipboard } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import { Segmented } from "@/components/ui/controls";
import { downloadBlob } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useStoredText } from "@/lib/text-tools/hooks";
import { SavedNote, baseName, readTextFile, smallButton } from "@/lib/text-tools/ui";

type View = "split" | "edit" | "preview";

const SAMPLE = `# Project notes

Write **bold**, *italic*, ~~strikethrough~~ and \`inline code\`. Links work too: [ZapFile](https://zapfile.xyz).

## Tasks
- [x] Draft the outline
- [ ] Review with the team
- [ ] Publish

## Comparison

| Feature | Free | Pro |
| :-- | :-: | --: |
| Markdown | ✓ | ✓ |
| Export to HTML | ✓ | ✓ |

> Tip: copy the preview as rich text and paste it straight into an email or a document.

\`\`\`js
function hello(name) {
  return \`Hello, \${name}!\`;
}
\`\`\`
`;

const EXPORT_CSS = `body{font:16px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;color:#16181d;max-width:760px;margin:40px auto;padding:0 20px}h1,h2,h3{line-height:1.25}h2{border-bottom:1px solid #e2e5ea;padding-bottom:.25em}code{font-family:ui-monospace,Menlo,Consolas,monospace;background:#eef0f3;padding:.15em .4em;border-radius:6px;font-size:.88em}pre{background:#eef0f3;padding:1em;border-radius:10px;overflow:auto}pre code{background:none;padding:0}blockquote{border-left:3px solid #e2e5ea;margin:0;padding:.1em 1em;color:#525761}table{border-collapse:collapse}th,td{border:1px solid #e2e5ea;padding:.4em .75em}th{background:#eef0f3}img{max-width:100%}`;

interface Rendered {
  html: string;
}

export default function MarkdownEditorPage() {
  const { t } = useI18n();
  const [text, setText, store] = useStoredText("markdown-editor");
  const [view, setView] = useState<View>("split");
  const [fileBase, setFileBase] = useState("document");
  const [rendered, setRendered] = useState<Rendered>({ html: "" });
  const taRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const syncing = useRef(false);
  const deferred = useDeferredValue(text);

  // marked (GitHub-flavoured) + DOMPurify, loaded on demand; output is always sanitized.
  useEffect(() => {
    let live = true;
    (async () => {
      const [{ marked }, { default: DOMPurify }] = await Promise.all([import("marked"), import("dompurify")]);
      const raw = await marked.parse(deferred, { gfm: true, breaks: false });
      const html = DOMPurify.sanitize(raw, { ADD_ATTR: ["target"] });
      if (live) setRendered({ html });
    })();
    return () => {
      live = false;
    };
  }, [deferred]);

  // Links in the preview open in a new tab.
  useEffect(() => {
    previewRef.current?.querySelectorAll("a[href]").forEach((a) => {
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener noreferrer nofollow");
    });
  }, [rendered, view]);

  const stats = useMemo(() => {
    const words = deferred.trim() ? deferred.trim().split(/\s+/).length : 0;
    return { words, chars: deferred.length, minutes: Math.max(1, Math.round(words / 238)) };
  }, [deferred]);

  // ── Editing helpers ──
  const edit = useCallback(
    (fn: (sel: string, before: string, after: string) => { text: string; select?: [number, number] }) => {
      const ta = taRef.current;
      if (!ta) return;
      const { selectionStart: s, selectionEnd: e, value } = ta;
      const res = fn(value.slice(s, e), value.slice(0, s), value.slice(e));
      // execCommand keeps the browser's own undo stack working.
      ta.focus();
      ta.setSelectionRange(s, e);
      if (!document.execCommand("insertText", false, res.text)) {
        setText(value.slice(0, s) + res.text + value.slice(e));
      }
      if (res.select) requestAnimationFrame(() => ta.setSelectionRange(s + res.select![0], s + res.select![1]));
    },
    [setText],
  );

  const wrap = (mark: string, placeholder: string) =>
    edit((sel) => {
      const body = sel || placeholder;
      return { text: `${mark}${body}${mark}`, select: [mark.length, mark.length + body.length] };
    });

  const linePrefix = (prefix: string | ((i: number) => string)) =>
    edit((sel, before) => {
      const atLineStart = before === "" || before.endsWith("\n");
      const lines = (sel || "").split("\n");
      const out = lines.map((l, i) => (typeof prefix === "function" ? prefix(i) : prefix) + l).join("\n");
      return { text: (atLineStart ? "" : "\n") + out };
    });

  const actions: { icon: typeof Bold; label: string; key?: string; run: () => void }[] = [
    { icon: Bold, label: t("md.bold"), key: "b", run: () => wrap("**", t("md.bold")) },
    { icon: Italic, label: t("md.italic"), key: "i", run: () => wrap("*", t("md.italic")) },
    { icon: Strikethrough, label: t("md.v2.strike"), run: () => wrap("~~", t("md.v2.strike")) },
    { icon: Heading, label: t("md.heading"), run: () => linePrefix("## ") },
    {
      icon: Link2,
      label: t("md.link"),
      key: "k",
      run: () =>
        edit((sel) => {
          const label = sel || t("md.link");
          // Select the URL part so it can be typed over.
          return { text: `[${label}](https://)`, select: [label.length + 3, label.length + 11] };
        }),
    },
    { icon: Code, label: t("md.code"), run: () => edit((sel) => (sel.includes("\n") ? { text: "```\n" + sel + "\n```" } : { text: "`" + (sel || "code") + "`", select: [1, 1 + (sel || "code").length] })) },
    { icon: Quote, label: t("md.quote"), run: () => linePrefix("> ") },
    { icon: List, label: t("md.list"), run: () => linePrefix("- ") },
    { icon: ListOrdered, label: t("md.v2.numbered"), run: () => linePrefix((i) => `${i + 1}. `) },
    { icon: ListChecks, label: t("md.v2.tasks"), run: () => linePrefix("- [ ] ") },
    { icon: Table, label: t("md.v2.table"), run: () => edit((_, before) => ({ text: `${before && !before.endsWith("\n\n") ? "\n\n" : ""}| ${t("md.v2.column")} 1 | ${t("md.v2.column")} 2 |\n| --- | --- |\n|  |  |\n` })) },
  ];

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.metaKey || e.ctrlKey) {
      const a = actions.find((x) => x.key === e.key.toLowerCase());
      if (a) {
        e.preventDefault();
        a.run();
      }
      return;
    }
    // Continue lists on Enter.
    if (e.key === "Enter" && !e.shiftKey) {
      const ta = e.currentTarget;
      const before = ta.value.slice(0, ta.selectionStart);
      const line = before.slice(before.lastIndexOf("\n") + 1);
      const m = /^(\s*)([-*+] \[[ x]\] |[-*+] |(\d+)\. |> )(.*)$/.exec(line);
      if (!m) return;
      e.preventDefault();
      if (!m[4]) {
        // Empty item: end the list.
        ta.setSelectionRange(ta.selectionStart - line.length, ta.selectionStart);
        document.execCommand("insertText", false, "");
        return;
      }
      const marker = m[3] ? `${Number(m[3]) + 1}. ` : m[2]!.replace("[x]", "[ ]");
      document.execCommand("insertText", false, `\n${m[1]}${marker}`);
    }
    if (e.key === "Tab") {
      e.preventDefault();
      document.execCommand("insertText", false, "  ");
    }
  };

  // Proportional scroll sync between editor and preview.
  const sync = (from: HTMLElement | null, to: HTMLElement | null) => {
    if (!from || !to || syncing.current) return;
    syncing.current = true;
    const k = from.scrollTop / Math.max(1, from.scrollHeight - from.clientHeight);
    to.scrollTop = k * (to.scrollHeight - to.clientHeight);
    requestAnimationFrame(() => (syncing.current = false));
  };

  const fullHtml = () =>
    `<!doctype html>\n<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${fileBase}</title><style>${EXPORT_CSS}</style></head><body>\n${rendered.html}\n</body></html>\n`;

  const copyRich = async () => {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([rendered.html], { type: "text/html" }),
          "text/plain": new Blob([previewRef.current?.innerText ?? text], { type: "text/plain" }),
        }),
      ]);
      toast.success(t("md.v2.richCopied"));
    } catch {
      toast.error(t("ui.copyFailed"));
    }
  };

  const copy = async (value: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(msg);
    } catch {
      toast.error(t("ui.copyFailed"));
    }
  };

  const openFile = async (file: File | undefined) => {
    if (!file) return;
    const content = await readTextFile(file, t);
    if (content === null) return;
    setText(content);
    setFileBase(baseName(file.name) || "document");
  };

  const height = "h-[min(70vh,640px)]";

  return (
    <ToolLayout toolName={t("tool.markdown-editor.name")} toolDescription={t("tool.markdown-editor.desc")}>
      <div className="space-y-4">
        <div className="glass flex flex-wrap items-center gap-2 p-3">
          <div className="flex flex-wrap items-center gap-1" role="toolbar" aria-label={t("md.v2.formatting")}>
            {actions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={a.run}
                disabled={view === "preview"}
                title={a.key ? `${a.label} (Ctrl+${a.key.toUpperCase()})` : a.label}
                aria-label={a.label}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-t-secondary transition hover:bg-bg-secondary hover:text-t-primary disabled:opacity-35"
              >
                <a.icon className="h-4 w-4" aria-hidden="true" />
              </button>
            ))}
          </div>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            <Segmented<View>
              label={t("md.v2.layout")}
              size="sm"
              value={view}
              onChange={setView}
              options={[
                { value: "edit", label: <Pencil className="h-4 w-4" aria-label={t("md.edit")} /> },
                { value: "split", label: <Columns2 className="h-4 w-4" aria-label={t("md.v2.split")} /> },
                { value: "preview", label: <Eye className="h-4 w-4" aria-label={t("md.preview")} /> },
              ]}
            />
          </div>
        </div>

        <div className={`grid gap-4 ${view === "split" ? "lg:grid-cols-2" : ""}`}>
          {view !== "preview" && (
            <div className="glass flex flex-col p-3">
              <textarea
                ref={taRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={onKeyDown}
                onScroll={(e) => view === "split" && sync(e.currentTarget, previewRef.current)}
                placeholder={t("md.placeholder")}
                spellCheck
                aria-label={t("md.markdown")}
                className={`${height} w-full resize-none rounded-xl border border-border bg-bg-secondary px-4 py-3 font-mono text-[14px] leading-6 text-t-primary placeholder:text-t-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40`}
              />
            </div>
          )}
          {view !== "edit" && (
            <div className="glass flex flex-col p-3">
              <div
                ref={previewRef}
                onScroll={(e) => view === "split" && sync(e.currentTarget, taRef.current)}
                className={`${height} overflow-auto rounded-xl border border-border bg-surface px-5 py-4`}
              >
                {text.trim() ? <div className="md-preview" dangerouslySetInnerHTML={{ __html: rendered.html }} /> : <p className="text-[14px] text-t-tertiary">{t("textkit.v2.outputPlaceholder")}</p>}
              </div>
            </div>
          )}
        </div>

        <div className="glass flex flex-wrap items-center gap-2 p-3">
          <span className="me-auto text-[12.5px] tabular-nums text-t-tertiary">
            {t("md.v2.stats", { words: stats.words.toLocaleString(), chars: stats.chars.toLocaleString(), min: stats.minutes })} · <SavedNote tooBig={store.tooBigToStore} />
          </span>
          <input ref={fileRef} type="file" accept=".md,.markdown,.mdx,.txt,text/markdown" className="sr-only" onChange={(e) => {
              openFile(e.target.files?.[0]);
              e.target.value = "";
            }} />
          <button type="button" className={smallButton} onClick={() => fileRef.current?.click()}>
            <FileUp className="h-4 w-4" aria-hidden="true" />
            {t("textkit.v2.openFile")}
          </button>
          {!text.trim() && (
            <button type="button" className={smallButton} onClick={() => setText(SAMPLE)}>
              {t("json.sample")}
            </button>
          )}
          <button type="button" className={smallButton} onClick={copyRich} disabled={!text.trim()} title={t("md.v2.richHint")}>
            <Clipboard className="h-4 w-4" aria-hidden="true" />
            {t("md.v2.copyRich")}
          </button>
          <button type="button" className={smallButton} onClick={() => copy(rendered.html, t("md.htmlCopied"))} disabled={!text.trim()}>
            <FileCode2 className="h-4 w-4" aria-hidden="true" />
            {t("md.copyHtml")}
          </button>
          <button type="button" className={smallButton} onClick={() => downloadBlob(new Blob([text], { type: "text/markdown" }), `${fileBase}.md`)} disabled={!text.trim()}>
            <Download className="h-4 w-4" aria-hidden="true" />
            .md
          </button>
          <button type="button" className={smallButton} onClick={() => downloadBlob(new Blob([fullHtml()], { type: "text/html" }), `${fileBase}.html`)} disabled={!text.trim()}>
            <Download className="h-4 w-4" aria-hidden="true" />
            .html
          </button>
          {text.trim() && (
            <button type="button" className={smallButton} onClick={() => setText("")}>
              {t("ui.clear")}
            </button>
          )}
        </div>
      </div>
    </ToolLayout>
  );
}
