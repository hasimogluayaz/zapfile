/**
 * DocumentModel → Markdown (GitHub flavoured): headings, emphasis, lists with nesting, tables,
 * images. With pictures, a ZIP holds `document.md` plus `images/`; without, just the Markdown.
 * Pure (JSZip only) so it runs in the worker.
 */
import JSZip from "jszip";
import type { DocumentModel, ImageAsset, ParagraphBlock, TableBlock, TextRun } from "./model";

const MD_SPECIAL = /([\\`*_[\]#<>|])/g;

function escapeMd(text: string): string {
  return text.replace(MD_SPECIAL, "\\$1");
}

function runsMd(runs: TextRun[]): string {
  let out = "";
  for (const r of runs) {
    const raw = r.text.replace(/\t/g, " ").replace(/\n/g, " ");
    if (!raw) continue;
    // Keep surrounding spaces outside the markers (`** bold**` is not bold in Markdown).
    const m = /^(\s*)(.*?)(\s*)$/s.exec(raw)!;
    let core = escapeMd(m[2]!);
    if (!core) {
      out += raw;
      continue;
    }
    if (r.vertAlign === "superscript") core = `<sup>${core}</sup>`;
    else if (r.vertAlign === "subscript") core = `<sub>${core}</sub>`;
    if (r.bold && r.italic) core = `***${core}***`;
    else if (r.bold) core = `**${core}**`;
    else if (r.italic) core = `*${core}*`;
    out += m[1] + core + m[3];
  }
  // Merge adjacent markers: "**a** **b**" stays readable, "**a****b**" → "**ab**".
  return out.replace(/\*\*\*\*/g, "").replace(/(?<!\*)\*\*(?!\*)\s*\*\*(?!\*)/g, " ").trim();
}

function paragraphMd(p: ParagraphBlock, listCounters: number[]): string {
  const text = runsMd(p.runs);
  if (!text) return "";
  if (p.heading) {
    // Headings carry their own weight; drop the bold markers inside.
    return `${"#".repeat(Math.min(6, p.heading))} ${text.replace(/^\*\*(.*)\*\*$/, "$1")}`;
  }
  if (p.list) {
    const level = Math.max(0, p.list.level);
    listCounters.length = level + 1;
    listCounters[level] = (listCounters[level] ?? 0) + 1;
    const indent = "   ".repeat(level);
    // The list marker detected from the PDF is part of the text: strip it.
    const body = text.replace(/^\\?[•◦▪▫‣⁃●○■□►▶✓✔➢➤∙·–—*]\s+/, "");
    return p.list.ordered ? `${indent}${listCounters[level]}. ${body}` : `${indent}- ${body}`;
  }
  listCounters.length = 0;
  return text;
}

function tableMd(t: TableBlock): string {
  const cols = t.columns.length;
  const grid: string[][] = t.rows.map((row) => {
    const out: string[] = [];
    for (const cell of row.cells) {
      const text = cell.rowSpan === 0 ? "" : cell.paragraphs.map((p) => runsMd(p.runs)).filter(Boolean).join("<br>");
      out.push(text.replace(/\|/g, "\\|"));
      for (let k = 1; k < cell.colSpan; k++) out.push("");
    }
    while (out.length < cols) out.push("");
    return out.slice(0, cols);
  });
  if (!grid.length) return "";
  // Header cells are bold by definition in Markdown tables.
  const header = grid[0]!.map((c) => c.replace(/^\*\*(.*)\*\*$/, "$1"));
  const lines = [`| ${header.join(" | ")} |`, `| ${header.map(() => "---").join(" | ")} |`, ...grid.slice(1).map((r) => `| ${r.join(" | ")} |`)];
  return lines.join("\n");
}

export async function writeMarkdown(doc: DocumentModel, assets: ImageAsset[], withImages: boolean): Promise<{ bytes: Uint8Array; zip: boolean; preview: string }> {
  const parts: string[] = [];
  const used = new Map<string, string>();
  const byId = new Map(assets.map((a) => [a.id, a]));
  const counters: number[] = [];
  for (const section of doc.sections) {
    for (const b of section.blocks) {
      if (b.kind === "paragraph") {
        const md = paragraphMd(b, counters);
        if (md) parts.push(md);
      } else if (b.kind === "table") {
        counters.length = 0;
        const md = tableMd(b);
        if (md) parts.push(md);
      } else if (withImages) {
        counters.length = 0;
        for (const item of b.items) {
          const a = byId.get(item.id);
          if (!a) continue;
          let name = used.get(a.id);
          if (!name) {
            name = `images/image-${used.size + 1}.${a.mime === "image/png" ? "png" : "jpg"}`;
            used.set(a.id, name);
          }
          parts.push(`![](${name})`);
        }
      }
    }
  }
  // Lists: consecutive items stay together, everything else is separated by a blank line.
  let md = "";
  parts.forEach((p, i) => {
    const prevList = i > 0 && /^\s*(-|\d+\.) /.test(parts[i - 1]!);
    const isList = /^\s*(-|\d+\.) /.test(p);
    md += i === 0 ? p : `${prevList && isList ? "\n" : "\n\n"}${p}`;
  });
  md = md.trim() + "\n";
  const preview = md.slice(0, 20000);
  if (!withImages || used.size === 0) return { bytes: new TextEncoder().encode(md), zip: false, preview };
  const zip = new JSZip();
  zip.file("document.md", md);
  for (const [id, name] of used) zip.file(name, byId.get(id)!.bytes);
  return { bytes: await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" }), zip: true, preview };
}
