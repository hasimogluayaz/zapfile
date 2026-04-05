/**
 * Lightweight markdown-to-HTML renderer.
 * Handles common elements without any external dependencies.
 */

export function renderMarkdown(md: string): string {
  let html = md;

  // Normalize line endings
  html = html.replace(/\r\n/g, "\n");

  // Code blocks (fenced) — must be processed before inline rules
  html = html.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_match, _lang, code) =>
      `<pre><code>${escapeHtml(code.trimEnd())}</code></pre>`,
  );

  // Blockquotes — collect consecutive > lines into one block
  html = html.replace(
    /(?:^>\s?.+\n?)+/gm,
    (block) => {
      const inner = block
        .split("\n")
        .map((line) => line.replace(/^>\s?/, ""))
        .join("\n")
        .trim();
      return `<blockquote>${inner}</blockquote>\n`;
    },
  );

  // Horizontal rules
  html = html.replace(/^---+$/gm, "<hr />");

  // Headings (h1-h3)
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Unordered lists — group consecutive lines starting with - or *
  html = html.replace(
    /(?:^[\-\*] .+\n?)+/gm,
    (block) => {
      const items = block
        .trim()
        .split("\n")
        .map((line) => `<li>${line.replace(/^[\-\*] /, "")}</li>`)
        .join("\n");
      return `<ul>${items}</ul>\n`;
    },
  );

  // Ordered lists — group consecutive lines starting with digits
  html = html.replace(
    /(?:^\d+\. .+\n?)+/gm,
    (block) => {
      const items = block
        .trim()
        .split("\n")
        .map((line) => `<li>${line.replace(/^\d+\. /, "")}</li>`)
        .join("\n");
      return `<ol>${items}</ol>\n`;
    },
  );

  // Inline code (single backtick)
  html = html.replace(
    /`([^`]+)`/g,
    "<code>$1</code>",
  );

  // Bold + italic combined
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");

  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

  // Italic
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" rel="noopener noreferrer">$1</a>',
  );

  // Wrap remaining plain text lines in <p> tags.
  // Split on double newlines to find paragraph boundaries.
  const blocks = html.split(/\n{2,}/);
  html = blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      // Skip blocks already wrapped in block-level elements
      if (
        /^<(h[1-6]|ul|ol|li|blockquote|pre|hr|p|div|table)[\s>]/i.test(trimmed)
      ) {
        return trimmed;
      }
      return `<p>${trimmed.replace(/\n/g, "<br />")}</p>`;
    })
    .join("\n");

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
