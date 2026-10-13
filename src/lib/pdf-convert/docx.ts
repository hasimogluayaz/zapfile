/**
 * Writes a DocumentModel as a Word document (.docx, Office Open XML) with
 * real Word structure: Heading 1–3 styles (navigation pane works), bullet
 * lists, tables with merged cells and shading, inline pictures, page size
 * and margins per page, running header/footer with a live PAGE field.
 * Pure (JSZip only) so it runs in a worker.
 */
import JSZip from "jszip";
import type { Block, DocumentModel, ImageAsset, ImageBlock, ParagraphBlock, SectionModel, TableBlock, TextRun } from "./model";

const TW = 20; // twips per point
const EMU = 12700; // EMU per point

// XML 1.0 allows only these characters.
const INVALID_XML = /[^\u0009\u000A\u000D -퟿-�\u{10000}-\u{10FFFF}]/gu;

function esc(text: string): string {
  return text
    .replace(INVALID_XML, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function hex(color: string): string {
  const c = color.replace("#", "").toUpperCase();
  return /^[0-9A-F]{6}$/.test(c) ? c : "000000";
}

const tw = (pt: number) => Math.round(pt * TW);

interface Ctx {
  doc: DocumentModel;
  images: Map<string, ImageAsset>;
  rels: { id: string; target: string; type: string }[];
  media: { name: string; bytes: ArrayBuffer }[];
  imageRel: Map<string, string>;
  drawingId: number;
  /** Shift (points) to apply to indents of the current page, when sections share margins. */
  indentShift: number;
}

function runXml(run: TextRun, ctx: Ctx, inHeading = false): string {
  const props: string[] = [];
  if (run.font !== ctx.doc.bodyFont) props.push(`<w:rFonts w:ascii="${esc(run.font)}" w:hAnsi="${esc(run.font)}" w:cs="${esc(run.font)}" w:eastAsia="${esc(run.font)}"/>`);
  // Heading styles are bold and larger; runs state their real look explicitly.
  if (run.bold) props.push("<w:b/><w:bCs/>");
  else if (inHeading) props.push('<w:b w:val="0"/><w:bCs w:val="0"/>');
  if (run.italic) props.push("<w:i/><w:iCs/>");
  if (run.color !== "#000000") props.push(`<w:color w:val="${hex(run.color)}"/>`);
  const half = Math.max(2, Math.round(run.size * 2));
  if (inHeading || half !== Math.round(ctx.doc.bodySize * 2)) props.push(`<w:sz w:val="${half}"/><w:szCs w:val="${half}"/>`);
  if (run.underline) props.push('<w:u w:val="single"/>');
  if (run.vertAlign) props.push(`<w:vertAlign w:val="${run.vertAlign}"/>`);
  const rPr = props.length ? `<w:rPr>${props.join("")}</w:rPr>` : "";
  // Tabs and line breaks are elements, not characters.
  const parts = run.text.split(/(\t|\n)/);
  const body = parts
    .map((p) => (p === "\t" ? "<w:tab/>" : p === "\n" ? "<w:br/>" : p ? `<w:t xml:space="preserve">${esc(p)}</w:t>` : ""))
    .join("");
  return body ? `<w:r>${rPr}${body}</w:r>` : "";
}

function paragraphXml(p: ParagraphBlock, ctx: Ctx, extra: { pageBreakBefore?: boolean; inTable?: boolean } = {}): string {
  // Child order follows the CT_PPr schema sequence; Word rejects files that don't.
  const pPr: string[] = [];
  if (p.heading) pPr.push(`<w:pStyle w:val="Heading${p.heading}"/>`);
  else if (p.list) pPr.push('<w:pStyle w:val="ListParagraph"/>');
  if (extra.pageBreakBefore) pPr.push("<w:pageBreakBefore/>");
  if (p.list) pPr.push(`<w:numPr><w:ilvl w:val="${p.list.level}"/><w:numId w:val="1"/></w:numPr>`);
  if (p.borderBottom) pPr.push(`<w:pBdr><w:bottom w:val="single" w:sz="${Math.max(2, Math.round(p.borderBottom.width * 8))}" w:space="${Math.max(1, Math.min(31, Math.round(p.borderBottom.space ?? 1)))}" w:color="${hex(p.borderBottom.color)}"/></w:pBdr>`);
  if (p.rtl) pPr.push("<w:bidi/>");
  const before = extra.inTable ? 0 : tw(p.spaceBefore);
  const line = Math.round(240 * (p.lineSpacing || 1));
  pPr.push(`<w:spacing w:before="${before}" w:after="0" w:line="${line}" w:lineRule="auto"/>`);
  const indent = Math.max(0, p.indent + (extra.inTable ? 0 : ctx.indentShift));
  if (p.list) {
    // Bullet hangs one tab to the left of the text.
    const hang = Math.min(indent, 18);
    pPr.push(`<w:ind w:left="${tw(indent)}" w:hanging="${tw(hang)}"/>`);
  } else if (indent > 0.5 || Math.abs(p.firstLine) > 0.5) {
    const first = p.firstLine >= 0 ? `w:firstLine="${tw(p.firstLine)}"` : `w:hanging="${tw(Math.min(-p.firstLine, indent))}"`;
    pPr.push(`<w:ind w:left="${tw(indent)}" ${first}/>`);
  }
  if (p.align !== "left") pPr.push(`<w:jc w:val="${p.align === "justify" ? "both" : p.align}"/>`);
  const runs = p.runs.map((r) => runXml(r, ctx, p.heading > 0)).join("");
  return `<w:p><w:pPr>${pPr.join("")}</w:pPr>${runs}</w:p>`;
}

function imageRunXml(id: string, w: number, h: number, ctx: Ctx): string {
  const asset = ctx.images.get(id);
  if (!asset) return "";
  let rel = ctx.imageRel.get(id);
  if (!rel) {
    const ext = asset.mime === "image/png" ? "png" : "jpeg";
    const name = `image${ctx.media.length + 1}.${ext}`;
    ctx.media.push({ name, bytes: asset.bytes });
    rel = `rIdImg${ctx.media.length}`;
    ctx.rels.push({ id: rel, target: `media/${name}`, type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" });
    ctx.imageRel.set(id, rel);
  }
  const n = ++ctx.drawingId;
  const cx = Math.max(1, Math.round(w * EMU));
  const cy = Math.max(1, Math.round(h * EMU));
  return (
    `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0">` +
    `<wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/>` +
    `<wp:docPr id="${n}" name="Picture ${n}"/>` +
    `<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
    `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic><pic:nvPicPr><pic:cNvPr id="${n}" name="Picture ${n}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="${rel}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`
  );
}

function imageXml(b: ImageBlock, ctx: Ctx, pageBreakBefore: boolean): string {
  const pPr: string[] = [];
  if (pageBreakBefore) pPr.push("<w:pageBreakBefore/>");
  pPr.push(`<w:spacing w:before="${tw(b.spaceBefore)}" w:after="0" w:line="240" w:lineRule="auto"/>`);
  const indent = Math.max(0, b.indent + ctx.indentShift);
  if (b.align === "left" && indent > 0.5) pPr.push(`<w:ind w:left="${tw(indent)}"/>`);
  if (b.align !== "left") pPr.push(`<w:jc w:val="${b.align}"/>`);
  const runs = b.items.map((it, i) => (i ? '<w:r><w:t xml:space="preserve"> </w:t></w:r>' : "") + imageRunXml(it.id, it.w, it.h, ctx)).join("");
  return `<w:p><w:pPr>${pPr.join("")}</w:pPr>${runs}</w:p>`;
}

function tableXml(t: TableBlock, ctx: Ctx): string {
  const total = t.columns.reduce((s, c) => s + c, 0);
  const border = t.ruled ? '<w:top w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:left w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:right w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="auto"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="auto"/>' : '<w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="nil"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/>';
  const indent = Math.max(0, t.indent + ctx.indentShift);
  let xml =
    `<w:tbl><w:tblPr><w:tblW w:w="${tw(total)}" w:type="dxa"/><w:tblInd w:w="${tw(indent)}" w:type="dxa"/>` +
    `<w:tblBorders>${border}</w:tblBorders><w:tblLayout w:type="fixed"/>` +
    `<w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="57" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="57" w:type="dxa"/></w:tblCellMar>` +
    `<w:tblLook w:val="0000" w:firstRow="0" w:lastRow="0" w:firstColumn="0" w:lastColumn="0" w:noHBand="1" w:noVBand="1"/></w:tblPr>` +
    `<w:tblGrid>${t.columns.map((c) => `<w:gridCol w:w="${tw(c)}"/>`).join("")}</w:tblGrid>`;
  for (const row of t.rows) {
    xml += `<w:tr><w:trPr><w:trHeight w:val="${tw(Math.max(8, row.height))}" w:hRule="atLeast"/><w:cantSplit/></w:trPr>`;
    let col = 0;
    for (const cell of row.cells) {
      const span = Math.max(1, cell.colSpan);
      const width = t.columns.slice(col, col + span).reduce((s, c) => s + c, 0);
      col += span;
      const tcPr: string[] = [`<w:tcW w:w="${tw(width)}" w:type="dxa"/>`];
      if (span > 1) tcPr.push(`<w:gridSpan w:val="${span}"/>`);
      if (cell.rowSpan > 1) tcPr.push('<w:vMerge w:val="restart"/>');
      else if (cell.rowSpan === 0) tcPr.push("<w:vMerge/>");
      if (cell.shading) tcPr.push(`<w:shd w:val="clear" w:color="auto" w:fill="${hex(cell.shading)}"/>`);
      tcPr.push('<w:vAlign w:val="center"/>');
      const paras = cell.paragraphs.length
        ? cell.paragraphs.map((p) => paragraphXml(p, ctx, { inTable: true })).join("")
        : '<w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr></w:p>';
      xml += `<w:tc><w:tcPr>${tcPr.join("")}</w:tcPr>${paras}</w:tc>`;
    }
    // Pad rows that don't fill the grid (malformed spans) so Word accepts the table.
    while (col < t.columns.length) {
      xml += `<w:tc><w:tcPr><w:tcW w:w="${tw(t.columns[col]!)}" w:type="dxa"/></w:tcPr><w:p/></w:tc>`;
      col++;
    }
    xml += "</w:tr>";
  }
  return xml + "</w:tbl>";
}

function blockXml(b: Block, ctx: Ctx, pageBreakBefore: boolean): string {
  if (b.kind === "paragraph") return paragraphXml(b, ctx, { pageBreakBefore });
  if (b.kind === "image") return imageXml(b, ctx, pageBreakBefore);
  const brk = pageBreakBefore ? '<w:p><w:pPr><w:pageBreakBefore/><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p>' : "";
  // Word needs a paragraph between two adjacent tables or they merge.
  return brk + tableXml(b, ctx) + '<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/></w:pPr></w:p>';
}

interface Group {
  sections: SectionModel[];
  width: number;
  height: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

/** Consecutive pages with the same size share one Word section (and its margins). */
function groupSections(sections: SectionModel[]): Group[] {
  const groups: Group[] = [];
  for (const s of sections) {
    const last = groups[groups.length - 1];
    if (last && Math.abs(last.width - s.width) < 2 && Math.abs(last.height - s.height) < 2) {
      last.sections.push(s);
    } else {
      groups.push({ sections: [s], width: s.width, height: s.height, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0 });
    }
  }
  for (const g of groups) {
    const m = (pick: (s: SectionModel) => number) => Math.round(Math.min(...g.sections.map(pick)));
    g.marginTop = m((s) => s.marginTop);
    g.marginBottom = m((s) => s.marginBottom);
    g.marginLeft = m((s) => s.marginLeft);
    g.marginRight = m((s) => s.marginRight);
  }
  return groups;
}

function sectPr(g: Group, hasHeader: boolean, hasFooter: boolean, last: boolean): string {
  const landscape = g.width > g.height;
  const refs =
    (hasHeader ? '<w:headerReference w:type="default" r:id="rIdHeader"/>' : "") +
    (hasFooter ? '<w:footerReference w:type="default" r:id="rIdFooter"/>' : "");
  const headerDist = Math.max(10, Math.min(36, g.marginTop / 2));
  const footerDist = Math.max(10, Math.min(36, g.marginBottom / 2));
  return (
    `<w:sectPr>${refs}${last ? "" : '<w:type w:val="nextPage"/>'}` +
    `<w:pgSz w:w="${tw(g.width)}" w:h="${tw(g.height)}"${landscape ? ' w:orient="landscape"' : ""}/>` +
    `<w:pgMar w:top="${tw(g.marginTop)}" w:right="${tw(g.marginRight)}" w:bottom="${tw(g.marginBottom)}" w:left="${tw(g.marginLeft)}" w:header="${tw(headerDist)}" w:footer="${tw(footerDist)}" w:gutter="0"/>` +
    `<w:cols w:space="720"/></w:sectPr>`
  );
}

const NS =
  'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ' +
  'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ' +
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" ' +
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"';

function stylesXml(doc: DocumentModel): string {
  const f = esc(doc.bodyFont);
  const sz = Math.round(doc.bodySize * 2);
  const heading = (n: number, size: number) =>
    `<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/>` +
    `<w:pPr><w:keepNext/><w:keepLines/><w:outlineLvl w:val="${n - 1}"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr></w:style>`;
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${f}" w:hAnsi="${f}" w:cs="${f}" w:eastAsia="${f}"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/><w:lang w:val="en-US"/></w:rPr></w:rPrDefault>` +
    `<w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>` +
    `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>` +
    heading(1, Math.round(sz * 1.8)) +
    heading(2, Math.round(sz * 1.45)) +
    heading(3, Math.round(sz * 1.15)) +
    `<w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:uiPriority w:val="34"/><w:qFormat/></w:style>` +
    `<w:style w:type="paragraph" w:styleId="Header"><w:name w:val="header"/><w:basedOn w:val="Normal"/></w:style>` +
    `<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/></w:style>` +
    `<w:style w:type="table" w:default="1" w:styleId="TableNormal"><w:name w:val="Normal Table"/><w:tblPr><w:tblInd w:w="0" w:type="dxa"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="108" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="108" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style>` +
    `</w:styles>`
  );
}

function numberingXml(): string {
  const bullets = ["•", "◦", "▪", "•", "◦"];
  const levels = bullets
    .map(
      (b, i) =>
        `<w:lvl w:ilvl="${i}"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="${b}"/><w:lvlJc w:val="left"/>` +
        `<w:pPr><w:ind w:left="${360 * (i + 1)}" w:hanging="360"/></w:pPr><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:hint="default"/></w:rPr></w:lvl>`,
    )
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
    `<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="hybridMultilevel"/>${levels}</w:abstractNum>` +
    `<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>`
  );
}

function headerFooterXml(kind: "hdr" | "ftr", text: string | null, pageNumbers: boolean): string {
  const style = kind === "hdr" ? "Header" : "Footer";
  const parts: string[] = [];
  if (text) parts.push(`<w:r><w:t xml:space="preserve">${esc(text)}${pageNumbers ? " " : ""}</w:t></w:r>`);
  if (pageNumbers) parts.push('<w:fldSimple w:instr=" PAGE "><w:r><w:t>1</w:t></w:r></w:fldSimple>');
  const jc = kind === "ftr" && pageNumbers && !text ? '<w:jc w:val="center"/>' : "";
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:${kind} ${NS}><w:p><w:pPr><w:pStyle w:val="${style}"/>${jc}</w:pPr>${parts.join("")}</w:p></w:${kind}>`
  );
}

export interface DocxOptions {
  /** Start every PDF page on a new Word page (default true). */
  keepPageBreaks?: boolean;
}

export async function writeDocx(doc: DocumentModel, assets: ImageAsset[], options: DocxOptions = {}): Promise<Uint8Array> {
  const keepPageBreaks = options.keepPageBreaks !== false;
  const ctx: Ctx = {
    doc,
    images: new Map(assets.map((a) => [a.id, a])),
    rels: [],
    media: [],
    imageRel: new Map(),
    drawingId: 0,
    indentShift: 0,
  };
  const hasHeader = !!doc.header;
  const hasFooter = !!doc.footer || doc.footerPageNumbers;
  const groups = groupSections(doc.sections);
  let body = "";
  groups.forEach((g, gi) => {
    g.sections.forEach((s, si) => {
      ctx.indentShift = s.marginLeft - g.marginLeft;
      s.blocks.forEach((b, bi) => {
        const breakHere = keepPageBreaks && bi === 0 && si > 0;
        body += blockXml(b, ctx, breakHere);
      });
      if (s.blocks.length === 0 && keepPageBreaks && si > 0) {
        body += '<w:p><w:pPr><w:pageBreakBefore/></w:pPr></w:p>';
      }
    });
    const last = gi === groups.length - 1;
    if (!last) {
      // Section break: a tiny paragraph carrying the section properties.
      body += `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>${sectPr(g, hasHeader, hasFooter, false)}</w:pPr></w:p>`;
    } else {
      body += sectPr(g, hasHeader, hasFooter, true);
    }
  });
  if (!body.includes("<w:p")) body = "<w:p/>" + body;

  const zip = new JSZip();
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body}</w:body></w:document>`;
  zip.file("word/document.xml", documentXml);
  zip.file("word/styles.xml", stylesXml(doc));
  zip.file("word/numbering.xml", numberingXml());
  zip.file(
    "word/settings.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:defaultTabStop w:val="720"/><w:characterSpacingControl w:val="doNotCompress"/><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>`,
  );
  if (hasHeader) zip.file("word/header1.xml", headerFooterXml("hdr", doc.header, false));
  if (hasFooter) zip.file("word/footer1.xml", headerFooterXml("ftr", doc.footer, doc.footerPageNumbers));
  for (const m of ctx.media) zip.file(`word/media/${m.name}`, m.bytes);

  const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const docRels = [
    { id: "rIdStyles", target: "styles.xml", type: `${R}/styles` },
    { id: "rIdNumbering", target: "numbering.xml", type: `${R}/numbering` },
    { id: "rIdSettings", target: "settings.xml", type: `${R}/settings` },
    ...(hasHeader ? [{ id: "rIdHeader", target: "header1.xml", type: `${R}/header` }] : []),
    ...(hasFooter ? [{ id: "rIdFooter", target: "footer1.xml", type: `${R}/footer` }] : []),
    ...ctx.rels,
  ];
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${docRels
      .map((r) => `<Relationship Id="${r.id}" Type="${r.type}" Target="${r.target}"/>`)
      .join("")}</Relationships>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      `<Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/>` +
      `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>` +
      `<Relationship Id="rId3" Type="${R}/extended-properties" Target="docProps/app.xml"/></Relationships>`,
  );
  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  zip.file(
    "docProps/core.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">` +
      `<dc:title>${esc(doc.title)}</dc:title><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`,
  );
  zip.file(
    "docProps/app.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>ZapFile</Application></Properties>`,
  );
  const overrides = [
    ["/word/document.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"],
    ["/word/styles.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"],
    ["/word/numbering.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"],
    ["/word/settings.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"],
    ...(hasHeader ? [["/word/header1.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"]] : []),
    ...(hasFooter ? [["/word/footer1.xml", "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"]] : []),
    ["/docProps/core.xml", "application/vnd.openxmlformats-package.core-properties+xml"],
    ["/docProps/app.xml", "application/vnd.openxmlformats-officedocument.extended-properties+xml"],
  ];
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
      `<Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/>` +
      overrides.map(([p, t]) => `<Override PartName="${p}" ContentType="${t}"/>`).join("") +
      `</Types>`,
  );
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 }, mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}
