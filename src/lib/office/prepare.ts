/**
 * Fix-ups applied to Word files before LibreOffice converts them (both on the server and in the browser).
 *
 * Formula fields (`=SUM(LEFT)`, `=PRODUCT(ABOVE)` …) are replaced by the result Word saved with the
 * document. LibreOffice recalculates them itself and gets them wrong: it reads "1.150" (Turkish thousands
 * separator) as 1.15, and treats text cells as zero, so totals come out as "0₺". Word shows the saved
 * result too, so this matches what the author sees.
 */

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

/** Returns the file unchanged unless something had to be fixed. */
export async function prepareOfficeFile(file: File): Promise<File> {
  if (!/\.docx$/i.test(file.name)) return file;
  try {
    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(file);
    let changed = false;
    for (const name of Object.keys(zip.files)) {
      if (!/^word\/(document|header\d*|footer\d*|footnotes|endnotes)\.xml$/.test(name)) continue;
      const xml = await zip.file(name)!.async("string");
      if (!/<w:instrText[^>]*>\s*=|w:instr="\s*=|<w:lastRenderedPageBreak/.test(xml)) continue;
      const fixed = unwrapFormulaFields(xml);
      if (fixed !== xml) {
        zip.file(name, fixed);
        changed = true;
      }
    }
    if (!changed) return file;
    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", mimeType: file.type || undefined });
    return new File([blob], file.name, { type: file.type, lastModified: file.lastModified });
  } catch {
    return file; // unreadable as a ZIP: let LibreOffice deal with it
  }
}

/** Remove the field code of formula fields, keeping their saved result runs. */
export function unwrapFormulaFields(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) return xml;
  let changed = false;

  // Simple fields: <w:fldSimple w:instr="=SUM(LEFT)"><w:r>result</w:r></w:fldSimple>
  for (const f of Array.from(doc.getElementsByTagNameNS(W, "fldSimple"))) {
    if (!/^\s*=/.test(f.getAttributeNS(W, "instr") ?? f.getAttribute("w:instr") ?? "")) continue;
    while (f.firstChild) f.parentNode!.insertBefore(f.firstChild, f);
    f.remove();
    changed = true;
  }

  // Complex fields: runs with fldChar begin … instrText … separate … result … end, possibly across
  // paragraphs. Walk every fldChar/instrText in document order and track nesting.
  type Frame = { begin: Element; instr: string; separate: Element | null; formula: boolean };
  const stack: Frame[] = [];
  const nodes = Array.from(doc.getElementsByTagNameNS(W, "*")).filter((n) => n.localName === "fldChar" || n.localName === "instrText");
  const toRemove = new Set<Element>(); // runs to delete
  const instrRuns: Element[][] = [];
  for (const n of nodes) {
    const run = n.parentElement;
    if (!run) continue;
    if (n.localName === "instrText") {
      const top = stack[stack.length - 1];
      if (top && !top.separate) {
        top.instr += n.textContent ?? "";
        (instrRuns[stack.length - 1] ??= []).push(run);
      }
      continue;
    }
    const type = n.getAttributeNS(W, "fldCharType") ?? n.getAttribute("w:fldCharType");
    if (type === "begin") {
      stack.push({ begin: run, instr: "", separate: null, formula: false });
      instrRuns[stack.length - 1] = [];
    } else if (type === "separate") {
      const top = stack[stack.length - 1];
      if (top) {
        top.separate = run;
        top.formula = /^\s*=/.test(top.instr);
      }
    } else if (type === "end") {
      const top = stack.pop();
      const runs = instrRuns.pop() ?? [];
      if (top?.formula && top.separate) {
        toRemove.add(top.begin);
        runs.forEach((r) => toRemove.add(r));
        toRemove.add(top.separate);
        toRemove.add(run);
      }
    }
  }
  for (const r of toRemove) {
    // A run may hold other content next to the field char; only drop runs that are field plumbing.
    const meaningful = Array.from(r.children).some((c) => !["rPr", "fldChar", "instrText"].includes(c.localName));
    if (meaningful) {
      Array.from(r.children).forEach((c) => (c.localName === "fldChar" || c.localName === "instrText") && c.remove());
    } else r.remove();
    changed = true;
  }
  if (keepWordPageStarts(doc)) changed = true;
  return changed ? new XMLSerializer().serializeToString(doc) : xml;
}

const directChildren = (el: Element, name: string) => Array.from(el.children).filter((c) => c.localName === name);

/**
 * Designed documents often hang a whole page's titles and boxes on an empty paragraph. Word saved where it
 * started a new page (<w:lastRenderedPageBreak/> at the paragraph start); LibreOffice's line heights differ
 * a little, so such an anchor can slip onto the end of the previous page and drag the boxes with it.
 * For empty paragraphs that only carry floating shapes, make that page start explicit.
 */
function keepWordPageStarts(doc: Document): boolean {
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  if (!body) return false;
  let changed = false;
  for (const p of directChildren(body, "p")) {
    const runs = directChildren(p, "r");
    const first = runs[0];
    if (!first || !directChildren(first, "lastRenderedPageBreak").length) continue;
    // Text outside the floating shapes (text inside text boxes doesn't count).
    const ownText = runs.some((r) => directChildren(r, "t").some((t) => (t.textContent ?? "").trim()));
    const floats = p.getElementsByTagNameNS("http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing", "anchor").length > 0;
    if (ownText || !floats) continue;
    let pPr = directChildren(p, "pPr")[0];
    if (!pPr) {
      pPr = doc.createElementNS(W, "w:pPr");
      p.insertBefore(pPr, p.firstChild);
    }
    if (directChildren(pPr, "pageBreakBefore").length) continue;
    // Schema order: pStyle, keepNext, keepLines, pageBreakBefore, …
    const before = Array.from(pPr.children).find((c) => !["pStyle", "keepNext", "keepLines"].includes(c.localName)) ?? null;
    pPr.insertBefore(doc.createElementNS(W, "w:pageBreakBefore"), before);
    changed = true;
  }
  return changed;
}
