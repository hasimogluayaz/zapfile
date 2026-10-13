/**
 * PDF → Excel: tables (ruled and whitespace-aligned) and text rows written as
 * a real .xlsx workbook. Numbers become numbers (with thousands separators,
 * decimals, negatives in parentheses, percentages and currency symbols
 * understood for both 1,234.56 and 1.234,56 conventions), ISO dates become
 * dates, merged cells stay merged and header rows stay bold.
 */
import JSZip from "jszip";
import { runningLines, sheetItems, type SheetItem } from "./layout";
import type { PageModel, TableBlock } from "./model";

export interface XlsxOptions {
  /** "page": one sheet per page; "single": everything on one sheet; "table": one sheet per table. */
  layout: "page" | "single" | "table";
  /** Keep only tables (drop running text). */
  tablesOnly: boolean;
  /** Turn number-looking text into numbers. */
  numbers: boolean;
}

interface Cell {
  text: string;
  bold: boolean;
  shading?: string;
  border: boolean;
}

interface SheetData {
  name: string;
  rows: (Cell | null)[][];
  merges: string[];
  freeze: boolean;
}

function colName(n: number): string {
  let s = "";
  n++;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const INVALID_XML = /[^\u0009\u000A\u000D -퟿-�\u{10000}-\u{10FFFF}]/gu;
function esc(text: string): string {
  return text.replace(INVALID_XML, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── Numbers ─────────────────────────────────────────────────────────────────

type Parsed = { value: number; format: "int" | "dec1" | "dec2" | "dec" | "pct" | "pct1" | "pct2" | "date" } | null;

/** Decide whether "," is the decimal separator in this document. */
function detectDecimalComma(texts: string[]): boolean {
  let comma = 0;
  let dot = 0;
  for (const t of texts) {
    const u = t.replace(/^%/, "");
    if (/^\(?-?[^\d]{0,3}\d{1,3}(\.\d{3})+,\d{1,2}\)?%?$/.test(u) || /^\(?-?\d+,\d{1,2}\)?%?$/.test(u)) comma++;
    if (/^\(?-?[^\d]{0,3}\d{1,3}(,\d{3})+\.\d{1,2}\)?%?$/.test(u) || /^\(?-?\d+\.\d{1,2}\)?%?$/.test(u)) dot++;
  }
  return comma > dot;
}

function parseNumber(raw: string, decimalComma: boolean): Parsed {
  let t = raw.trim();
  if (!t || t.length > 32) return null;
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const y = +iso[1]!;
    const m = +iso[2]!;
    const d = +iso[3]!;
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const serial = (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000;
    return { value: serial, format: "date" };
  }
  // Leading zeros (IDs, postcodes) and long digit strings (account numbers) stay text.
  if (/^0\d/.test(t) || /^\d{12,}$/.test(t)) return null;
  let negative = false;
  if (/^\(.*\)$/.test(t)) {
    negative = true;
    t = t.slice(1, -1).trim();
  }
  if (/^[-−–]/.test(t)) {
    negative = true;
    t = t.slice(1).trim();
  } else if (/[-−–]$/.test(t)) {
    negative = true;
    t = t.slice(0, -1).trim();
  }
  let percent = false;
  // "12%" and the Turkish / French style "%12".
  if (t.endsWith("%")) {
    percent = true;
    t = t.slice(0, -1).trim();
  } else if (t.startsWith("%")) {
    percent = true;
    t = t.slice(1).trim();
  }
  // Currency symbols / codes on either side.
  t = t.replace(/^(?:[$€£¥₺₹₽]|USD|EUR|GBP|TRY|TL|JPY)\s*/i, "").replace(/\s*(?:[$€£¥₺₹₽]|USD|EUR|GBP|TRY|TL|JPY)$/i, "");
  if (/^[-−–]/.test(t)) {
    negative = !negative;
    t = t.slice(1);
  }
  const thousands = decimalComma ? /[.\s  ]/g : /[,\s  ]/g;
  const decimal = decimalComma ? "," : ".";
  const groupedOk = decimalComma
    ? /^\d{1,3}([.\s  ]\d{3})*(,\d+)?$|^\d+(,\d+)?$/
    : /^\d{1,3}([,\s  ]\d{3})*(\.\d+)?$|^\d+(\.\d+)?$/;
  if (!groupedOk.test(t)) return null;
  const plain = t.replace(thousands, "").replace(decimal, ".");
  const value = Number(plain);
  if (!Number.isFinite(value)) return null;
  const decimals = plain.includes(".") ? plain.split(".")[1]!.length : 0;
  const signed = negative ? -value : value;
  // Keep the precision the PDF showed: 20.8% stays 20.8%, not 20.80%.
  if (percent) return { value: signed / 100, format: decimals === 0 ? "pct" : decimals === 1 ? "pct1" : "pct2" };
  return { value: signed, format: decimals === 0 ? "int" : decimals === 1 ? "dec1" : decimals === 2 ? "dec2" : "dec" };
}

// ── Sheets ──────────────────────────────────────────────────────────────────

function tableRows(table: TableBlock, boldRows: Set<number>, startRow: number, merges: string[]): (Cell | null)[][] {
  const rows: (Cell | null)[][] = [];
  table.rows.forEach((row, r) => {
    const out: (Cell | null)[] = [];
    let c = 0;
    for (const cell of row.cells) {
      const span = Math.max(1, cell.colSpan);
      if (cell.rowSpan === 0) {
        for (let k = 0; k < span; k++) out[c + k] = { text: "", bold: false, border: table.ruled, shading: cell.shading };
      } else {
        out[c] = { text: cell.text.replace(/\n+/g, "\n").trim(), bold: boldRows.has(r), shading: cell.shading, border: table.ruled };
        for (let k = 1; k < span; k++) out[c + k] = { text: "", bold: false, border: table.ruled, shading: cell.shading };
        const rs = Math.max(1, cell.rowSpan);
        if (span > 1 || rs > 1) merges.push(`${colName(c)}${startRow + r + 1}:${colName(c + span - 1)}${startRow + r + rs}`);
      }
      c += span;
    }
    rows.push(out);
  });
  return rows;
}

function buildSheets(pages: PageModel[], perPage: SheetItem[][], options: XlsxOptions): SheetData[] {
  const sheets: SheetData[] = [];
  const newSheet = (name: string): SheetData => ({ name, rows: [], merges: [], freeze: false });
  const appendItems = (sheet: SheetData, items: SheetItem[]) => {
    for (const it of items) {
      if (it.kind === "table") {
        if (sheet.rows.length && sheet.rows[sheet.rows.length - 1]!.some(Boolean)) sheet.rows.push([]);
        sheet.rows.push(...tableRows(it.table, it.boldRows, sheet.rows.length, sheet.merges));
        sheet.rows.push([]);
      } else if (!options.tablesOnly) {
        sheet.rows.push(it.cells.map((c) => ({ text: c.text, bold: c.bold, border: false })));
      }
    }
  };
  if (options.layout === "single") {
    const sheet = newSheet("Sheet1");
    perPage.forEach((items) => appendItems(sheet, items));
    sheets.push(sheet);
  } else if (options.layout === "page") {
    perPage.forEach((items, i) => {
      const sheet = newSheet(`Page ${pages[i]!.index + 1}`);
      appendItems(sheet, items);
      sheets.push(sheet);
    });
  } else {
    let n = 0;
    perPage.forEach((items) => {
      for (const it of items) {
        if (it.kind !== "table") continue;
        const sheet = newSheet(`Table ${++n}`);
        sheet.rows.push(...tableRows(it.table, it.boldRows, 0, sheet.merges));
        sheet.freeze = it.boldRows.has(0) && it.table.rows.length > 2;
        sheets.push(sheet);
      }
    });
    if (sheets.length === 0) {
      // No tables found: fall back to page sheets so the user still gets the content.
      return buildSheets(pages, perPage, { ...options, layout: "page", tablesOnly: false });
    }
  }
  // Trim trailing empty rows; drop sheets that ended up empty (but keep at least one).
  for (const s of sheets) while (s.rows.length && !s.rows[s.rows.length - 1]!.some(Boolean)) s.rows.pop();
  const nonEmpty = sheets.filter((s) => s.rows.length);
  return nonEmpty.length ? nonEmpty : [sheets[0] ?? newSheet("Sheet1")];
}

// ── Writer ──────────────────────────────────────────────────────────────────

const NUMFMT: Record<string, number> = { int: 3, dec1: 166, dec2: 4, dec: 0, pct: 9, pct1: 165, pct2: 10, date: 164 };

export async function writeXlsx(
  pages: PageModel[],
  title: string,
  options: XlsxOptions,
): Promise<{ bytes: Uint8Array; sheets: number; rows: number; tables: number }> {
  const isRunning = runningLines(pages);
  const perPage = pages.map((p) => sheetItems(p, isRunning));
  const sheets = buildSheets(pages, perPage, options);
  const allTexts = sheets.flatMap((s) => s.rows.flatMap((r) => r.filter(Boolean).map((c) => c!.text)));
  const decimalComma = detectDecimalComma(allTexts);

  // Styles: index by (bold, border, numFmt, fill).
  const fills: string[] = [];
  const xfs: { font: number; border: number; numFmt: number; fill: number; wrap: boolean }[] = [{ font: 0, border: 0, numFmt: 0, fill: 0, wrap: false }];
  const xfIndex = new Map<string, number>([["0|0|0|0|0", 0]]);
  const styleOf = (bold: boolean, border: boolean, numFmt: number, shading: string | undefined, wrap: boolean) => {
    let fill = 0;
    if (shading && /^#[0-9a-f]{6}$/i.test(shading) && shading.toLowerCase() !== "#ffffff") {
      let i = fills.indexOf(shading.toUpperCase());
      if (i < 0) {
        fills.push(shading.toUpperCase());
        i = fills.length - 1;
      }
      fill = i + 2;
    }
    const key = `${bold ? 1 : 0}|${border ? 1 : 0}|${numFmt}|${fill}|${wrap ? 1 : 0}`;
    let idx = xfIndex.get(key);
    if (idx === undefined) {
      idx = xfs.length;
      xfs.push({ font: bold ? 1 : 0, border: border ? 1 : 0, numFmt, fill, wrap });
      xfIndex.set(key, idx);
    }
    return idx;
  };

  const zip = new JSZip();
  let totalRows = 0;
  const usedNames = new Set<string>();
  const sheetNames: string[] = [];
  sheets.forEach((sheet, si) => {
    let name = sheet.name.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || `Sheet${si + 1}`;
    for (let k = 2; usedNames.has(name.toLowerCase()); k++) name = `${sheet.name.slice(0, 27)} (${k})`;
    usedNames.add(name.toLowerCase());
    sheetNames.push(name);
    const widths: number[] = [];
    let xml = "";
    sheet.rows.forEach((row, r) => {
      if (!row.length) return;
      let cells = "";
      let lastFilled = -1;
      row.forEach((cell, c) => {
        if (cell?.text) lastFilled = c;
      });
      row.forEach((cell, c) => {
        if (!cell) return;
        const ref = `${colName(c)}${r + 1}`;
        const text = cell.text;
        // Free text in the last filled cell spills into the empty cells to its right,
        // so it must not widen the column (that would stretch the tables below).
        if (c !== lastFilled || cell.border) {
          const longest = Math.max(0, ...text.split("\n").map((l) => l.length));
          widths[c] = Math.max(widths[c] ?? 0, Math.min(60, longest * 1.1 + 2));
        }
        const parsed = options.numbers && text ? parseNumber(text, decimalComma) : null;
        if (parsed) {
          const s = styleOf(cell.bold, cell.border, NUMFMT[parsed.format]!, cell.shading, false);
          cells += `<c r="${ref}"${s ? ` s="${s}"` : ""}><v>${parsed.value}</v></c>`;
        } else if (text) {
          const s = styleOf(cell.bold, cell.border, 0, cell.shading, text.includes("\n"));
          cells += `<c r="${ref}" t="inlineStr"${s ? ` s="${s}"` : ""}><is><t xml:space="preserve">${esc(text)}</t></is></c>`;
        } else if (cell.border || cell.shading) {
          const s = styleOf(false, cell.border, 0, cell.shading, false);
          cells += `<c r="${ref}"${s ? ` s="${s}"` : ""}/>`;
        }
      });
      if (cells) xml += `<row r="${r + 1}">${cells}</row>`;
    });
    totalRows += sheet.rows.filter((r) => r.some(Boolean)).length;
    const cols = widths.length
      ? `<cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${Math.max(8, Math.round((w || 8) * 10) / 10)}" customWidth="1"/>`).join("")}</cols>`
      : "";
    const pane = sheet.freeze
      ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
      : `<sheetViews><sheetView workbookViewId="0"${si === 0 ? ' tabSelected="1"' : ""}/></sheetViews>`;
    const merges = sheet.merges.length ? `<mergeCells count="${sheet.merges.length}">${sheet.merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : "";
    zip.file(
      `xl/worksheets/sheet${si + 1}.xml`,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${pane}<sheetFormatPr defaultRowHeight="15"/>${cols}<sheetData>${xml}</sheetData>${merges}<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`,
    );
  });

  const fillXml =
    `<fills count="${fills.length + 2}"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>` +
    fills.map((f) => `<fill><patternFill patternType="solid"><fgColor rgb="FF${f.slice(1)}"/><bgColor indexed="64"/></patternFill></fill>`).join("") +
    `</fills>`;
  zip.file(
    "xl/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
      `<numFmts count="3"><numFmt numFmtId="164" formatCode="yyyy\\-mm\\-dd"/><numFmt numFmtId="165" formatCode="0.0%"/><numFmt numFmtId="166" formatCode="#,##0.0"/></numFmts>` +
      `<fonts count="2"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts>` +
      fillXml +
      `<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right><top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom><diagonal/></border></borders>` +
      `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
      `<cellXfs count="${xfs.length}">${xfs
        .map(
          (x) =>
            `<xf numFmtId="${x.numFmt}" fontId="${x.font}" fillId="${x.fill}" borderId="${x.border}" xfId="0"${x.numFmt ? ' applyNumberFormat="1"' : ""}${x.font ? ' applyFont="1"' : ""}${x.fill ? ' applyFill="1"' : ""}${x.border ? ' applyBorder="1"' : ""}${x.wrap ? ' applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>' : "/>"}`,
        )
        .join("")}</cellXfs>` +
      `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`,
  );
  zip.file(
    "xl/workbook.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheetNames
      .map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
      .join("")}</sheets></workbook>`,
  );
  const R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  zip.file(
    "xl/_rels/workbook.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheetNames
      .map((_, i) => `<Relationship Id="rId${i + 1}" Type="${R}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
      .join("")}<Relationship Id="rIdStyles" Type="${R}/styles" Target="styles.xml"/></Relationships>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
  );
  zip.file(
    "docProps/core.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc(title)}</dc:title></cp:coreProperties>`,
  );
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      sheetNames.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("") +
      `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
  );
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });
  const tables = perPage.reduce((n, items) => n + items.filter((it) => it.kind === "table").length, 0);
  return { bytes, sheets: sheetNames.length, rows: totalRows, tables };
}
