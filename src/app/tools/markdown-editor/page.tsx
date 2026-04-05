"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

/* ------------------------------------------------------------------ */
/*  Markdown parser - regex-based, no external dependencies           */
/* ------------------------------------------------------------------ */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseMarkdown(raw: string): string {
  // Escape HTML entities first (XSS prevention)
  let html = escapeHtml(raw);

  // Code blocks (``` ... ```)
  html = html.replace(
    /```([\s\S]*?)```/g,
    (_match, code: string) =>
      `<pre class="md-code-block">${code.replace(/^\n/, "")}</pre>`
  );

  // Inline code
  html = html.replace(
    /`([^`\n]+)`/g,
    '<code class="md-inline-code">$1</code>'
  );

  // Headings
  html = html.replace(
    /^### (.+)$/gm,
    '<h3 class="md-h3">$1</h3>'
  );
  html = html.replace(
    /^## (.+)$/gm,
    '<h2 class="md-h2">$1</h2>'
  );
  html = html.replace(
    /^# (.+)$/gm,
    '<h1 class="md-h1">$1</h1>'
  );

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="md-hr" />');

  // Images (must come before links)
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<img src="$2" alt="$1" class="md-img" />'
  );

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" class="md-link" target="_blank" rel="noopener noreferrer">$1</a>'
  );

  // Bold and italic
  html = html.replace(
    /\*\*\*(.+?)\*\*\*/g,
    "<strong><em>$1</em></strong>"
  );
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Blockquotes (consecutive lines starting with >)
  html = html.replace(
    /^(?:&gt; .+\n?)+/gm,
    (block) => {
      const inner = block
        .replace(/^&gt; /gm, "")
        .trim();
      return `<blockquote class="md-blockquote">${inner}</blockquote>\n`;
    }
  );

  // Unordered lists (consecutive lines starting with -)
  html = html.replace(
    /^(?:- .+\n?)+/gm,
    (block) => {
      const items = block
        .split("\n")
        .filter((l) => l.startsWith("- "))
        .map((l) => `<li>${l.slice(2)}</li>`)
        .join("");
      return `<ul class="md-ul">${items}</ul>\n`;
    }
  );

  // Ordered lists (consecutive lines starting with digits.)
  html = html.replace(
    /^(?:\d+\. .+\n?)+/gm,
    (block) => {
      const items = block
        .split("\n")
        .filter((l) => /^\d+\. /.test(l))
        .map((l) => `<li>${l.replace(/^\d+\. /, "")}</li>`)
        .join("");
      return `<ol class="md-ol">${items}</ol>\n`;
    }
  );

  // Paragraphs: split on double newlines, wrap loose text
  html = html
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      // Don't wrap blocks that already start with an HTML tag
      if (/^<(h[1-6]|ul|ol|pre|blockquote|hr|img|div)/.test(trimmed)) {
        return trimmed;
      }
      // Replace single newlines with <br>
      return `<p class="md-p">${trimmed.replace(/\n/g, "<br />")}</p>`;
    })
    .join("\n");

  return html;
}

/* ------------------------------------------------------------------ */
/*  Toolbar button definitions                                        */
/* ------------------------------------------------------------------ */

interface ToolbarAction {
  label: string;
  icon: string;
  prefix: string;
  suffix: string;
  placeholder: string;
  block?: boolean;
}

// toolbarActions are defined inside the component to access t()

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function MarkdownEditorPage() {
  const { t } = useI18n();
  const [markdown, setMarkdown] = useState("");

  const toolbarActions: ToolbarAction[] = [
    { label: t("md.bold"), icon: "B", prefix: "**", suffix: "**", placeholder: "bold text" },
    { label: t("md.italic"), icon: "I", prefix: "*", suffix: "*", placeholder: "italic text" },
    { label: t("md.heading"), icon: "H", prefix: "# ", suffix: "", placeholder: "Heading", block: true },
    { label: t("md.link"), icon: "🔗", prefix: "[", suffix: "](url)", placeholder: "link text" },
    { label: t("md.code"), icon: "<>", prefix: "`", suffix: "`", placeholder: "code" },
    { label: t("md.list"), icon: "- ", prefix: "- ", suffix: "", placeholder: "list item", block: true },
    { label: t("md.quote"), icon: ">", prefix: "> ", suffix: "", placeholder: "quote", block: true },
  ];
  const [mobileTab, setMobileTab] = useState<"edit" | "preview">("edit");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const renderedHtml = useMemo(() => parseMarkdown(markdown), [markdown]);

  const wordCount = useMemo(() => {
    const trimmed = markdown.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [markdown]);

  const insertMarkdown = useCallback(
    (action: ToolbarAction) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = markdown.slice(start, end);
      const text = selected || action.placeholder;

      let insertion: string;
      if (action.block) {
        // For block-level syntax, ensure it starts on a new line
        const before = markdown.slice(0, start);
        const needsNewline = before.length > 0 && !before.endsWith("\n");
        insertion =
          (needsNewline ? "\n" : "") + action.prefix + text + action.suffix;
      } else {
        insertion = action.prefix + text + action.suffix;
      }

      const newMarkdown =
        markdown.slice(0, start) + insertion + markdown.slice(end);
      setMarkdown(newMarkdown);

      // Restore cursor position after the inserted text
      requestAnimationFrame(() => {
        textarea.focus();
        const cursorPos = start + insertion.length;
        textarea.setSelectionRange(cursorPos, cursorPos);
      });
    },
    [markdown]
  );

  const copyHtml = async () => {
    if (!renderedHtml.trim()) {
      toast.error(t("md.nothingCopy"));
      return;
    }
    try {
      await navigator.clipboard.writeText(renderedHtml);
      toast.success(t("md.htmlCopied"));
    } catch {
      toast.error(t("ui.copyFailed"));
    }
  };

  const copyMarkdown = async () => {
    if (!markdown.trim()) {
      toast.error(t("md.nothingCopy"));
      return;
    }
    try {
      await navigator.clipboard.writeText(markdown);
      toast.success(t("md.mdCopied"));
    } catch {
      toast.error(t("ui.copyFailed"));
    }
  };

  const handleClear = () => {
    setMarkdown("");
    toast.success(t("md.cleared"));
  };

  /* ---------------------------------------------------------------- */
  /*  Preview styles (inline CSS-in-Tailwind via wrapper classes)      */
  /* ---------------------------------------------------------------- */
  const previewWrapperClass = [
    "[&_.md-h1]:text-2xl [&_.md-h1]:font-bold [&_.md-h1]:text-t-primary [&_.md-h1]:mb-3 [&_.md-h1]:mt-4",
    "[&_.md-h2]:text-xl [&_.md-h2]:font-bold [&_.md-h2]:text-t-primary [&_.md-h2]:mb-2 [&_.md-h2]:mt-3",
    "[&_.md-h3]:text-lg [&_.md-h3]:font-semibold [&_.md-h3]:text-t-primary [&_.md-h3]:mb-2 [&_.md-h3]:mt-3",
    "[&_.md-p]:text-t-primary [&_.md-p]:leading-relaxed [&_.md-p]:mb-3",
    "[&_.md-link]:text-indigo-400 [&_.md-link]:underline [&_.md-link]:hover:text-indigo-300",
    "[&_.md-code-block]:block [&_.md-code-block]:bg-bg-secondary [&_.md-code-block]:rounded-lg [&_.md-code-block]:p-4 [&_.md-code-block]:my-3 [&_.md-code-block]:text-sm [&_.md-code-block]:font-mono [&_.md-code-block]:text-t-primary [&_.md-code-block]:overflow-x-auto [&_.md-code-block]:whitespace-pre",
    "[&_.md-inline-code]:bg-bg-secondary [&_.md-inline-code]:rounded [&_.md-inline-code]:px-1.5 [&_.md-inline-code]:py-0.5 [&_.md-inline-code]:text-sm [&_.md-inline-code]:font-mono [&_.md-inline-code]:text-indigo-300",
    "[&_.md-blockquote]:border-l-4 [&_.md-blockquote]:border-indigo-500 [&_.md-blockquote]:pl-4 [&_.md-blockquote]:my-3 [&_.md-blockquote]:text-t-secondary [&_.md-blockquote]:italic",
    "[&_.md-ul]:list-disc [&_.md-ul]:pl-6 [&_.md-ul]:my-3 [&_.md-ul]:text-t-primary [&_.md-ul]:space-y-1",
    "[&_.md-ol]:list-decimal [&_.md-ol]:pl-6 [&_.md-ol]:my-3 [&_.md-ol]:text-t-primary [&_.md-ol]:space-y-1",
    "[&_.md-hr]:border-border [&_.md-hr]:my-4",
    "[&_.md-img]:max-w-full [&_.md-img]:rounded-lg [&_.md-img]:my-3",
    "[&_strong]:font-bold [&_em]:italic",
  ].join(" ");

  return (
    <ToolLayout
      toolName="Markdown Editor"
      toolDescription="Write and preview Markdown with live rendering"
    >
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="glass rounded-xl p-4">
          <div className="flex flex-wrap items-center gap-2">
            {toolbarActions.map((action) => (
              <button
                key={action.label}
                onClick={() => insertMarkdown(action)}
                title={action.label}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-t-secondary bg-bg-secondary border border-border hover:text-t-primary hover:bg-bg-secondary/80 transition-colors"
              >
                {action.icon}
              </button>
            ))}

            <div className="flex-1" />

            <button
              onClick={copyHtml}
              className="px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors text-sm"
            >
              {t("md.copyHtml")}
            </button>
            <button
              onClick={copyMarkdown}
              className="px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors text-sm"
            >
              {t("md.copyMd")}
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 rounded-lg text-t-secondary bg-bg-secondary border border-border hover:text-t-primary transition-colors text-sm"
            >
              {t("ui.clear")}
            </button>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="flex gap-2 md:hidden">
          {(["edit", "preview"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all capitalize ${
                mobileTab === tab
                  ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                  : "bg-bg-secondary border border-border text-t-secondary hover:text-t-primary"
              }`}
            >
              {tab === "edit" ? t("md.edit") : t("md.preview")}
            </button>
          ))}
        </div>

        {/* Editor + Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Editor panel */}
          <div
            className={`glass rounded-xl p-6 ${
              mobileTab !== "edit" ? "hidden md:block" : ""
            }`}
          >
            <label className="block text-sm font-medium text-t-secondary mb-2">
              {t("md.markdown")}
            </label>
            <textarea
              ref={textareaRef}
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder={t("md.placeholder")}
              rows={20}
              spellCheck={false}
              className="w-full bg-bg-secondary border border-border rounded-lg px-4 py-3 text-t-primary placeholder-t-tertiary focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono text-sm resize-y leading-relaxed"
            />
          </div>

          {/* Preview panel */}
          <div
            className={`glass rounded-xl p-6 ${
              mobileTab !== "preview" ? "hidden md:block" : ""
            }`}
          >
            <label className="block text-sm font-medium text-t-secondary mb-2">
              {t("ui.preview")}
            </label>
            <div
              className={`min-h-[480px] bg-bg-secondary border border-border rounded-lg px-4 py-3 overflow-auto text-sm ${previewWrapperClass}`}
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </div>
        </div>

        {/* Word count */}
        <div className="glass rounded-xl p-4 flex items-center justify-between text-sm">
          <span className="text-t-secondary">
            {wordCount.toLocaleString()} {t("ui.words")}
          </span>
          <span className="text-t-tertiary">
            {markdown.length.toLocaleString()} {t("ui.characters")}
          </span>
        </div>
      </div>
    </ToolLayout>
  );
}
