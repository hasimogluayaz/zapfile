/**
 * Builds a PDF from page selections of one or more source documents with
 * pdf-lib, keeping what plain `copyPages` drops:
 *  - bookmarks (outlines) that point at kept pages, optionally nested under
 *    one bookmark per source file;
 *  - interactive form fields (AcroForm) whose widgets are all on kept pages,
 *    renamed when two files use the same field name;
 *  - internal links between kept pages (page references are remapped instead
 *    of duplicating the target page).
 * Runs in a worker (no DOM access).
 */
import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFHexString,
  PDFName,
  PDFNull,
  PDFNumber,
  PDFObjectCopier,
  PDFPage,
  PDFRef,
  PDFString,
  type PDFObject,
} from "pdf-lib";

export interface AssemblePart {
  doc: PDFDocument;
  /** 0-based page indices in output order. */
  pages: number[];
  /** Bookmark title for this part (used when `partBookmarks` is on). */
  title: string;
}

export interface AssembleOptions {
  partBookmarks: boolean;
  onPart?: (index: number) => void;
}

const N = {
  Outlines: PDFName.of("Outlines"),
  First: PDFName.of("First"),
  Last: PDFName.of("Last"),
  Next: PDFName.of("Next"),
  Prev: PDFName.of("Prev"),
  Parent: PDFName.of("Parent"),
  Title: PDFName.of("Title"),
  Count: PDFName.of("Count"),
  Dest: PDFName.of("Dest"),
  Dests: PDFName.of("Dests"),
  Names: PDFName.of("Names"),
  Kids: PDFName.of("Kids"),
  A: PDFName.of("A"),
  S: PDFName.of("S"),
  D: PDFName.of("D"),
  GoTo: PDFName.of("GoTo"),
  Type: PDFName.of("Type"),
  Fit: PDFName.of("Fit"),
  AcroForm: PDFName.of("AcroForm"),
  Fields: PDFName.of("Fields"),
  T: PDFName.of("T"),
  DA: PDFName.of("DA"),
  DR: PDFName.of("DR"),
  Font: PDFName.of("Font"),
  PageMode: PDFName.of("PageMode"),
  UseOutlines: PDFName.of("UseOutlines"),
};

function dictAt(dict: PDFDict, key: PDFName): PDFDict | undefined {
  const v = dict.lookup(key);
  return v instanceof PDFDict ? v : undefined;
}

function textOf(obj: PDFObject | undefined): string | null {
  if (obj instanceof PDFString || obj instanceof PDFHexString) return obj.decodeText();
  return null;
}

interface Target {
  ref: PDFRef;
  rest: PDFObject[];
}

interface OutlineNode {
  title: string;
  target: Target | null;
  children: OutlineNode[];
}

// ── Destinations ────────────────────────────────────────────────

const namedDestCache = new WeakMap<PDFDocument, Map<string, PDFObject>>();

function namedDests(doc: PDFDocument): Map<string, PDFObject> {
  let map = namedDestCache.get(doc);
  if (map) return map;
  map = new Map();
  // PDF 1.1 style: /Dests dictionary in the catalog.
  const old = dictAt(doc.catalog, N.Dests);
  if (old) {
    for (const [k, v] of old.entries()) map.set(k.decodeText(), v);
  }
  // PDF 1.2+: /Names /Dests name tree.
  const names = dictAt(doc.catalog, N.Names);
  const tree = names ? dictAt(names, N.Dests) : undefined;
  let budget = 100_000;
  const walk = (node: PDFDict, depth: number) => {
    if (depth > 32 || budget <= 0) return;
    const arr = node.lookup(N.Names);
    if (arr instanceof PDFArray) {
      for (let i = 0; i + 1 < arr.size() && budget-- > 0; i += 2) {
        const key = textOf(arr.lookup(i));
        if (key !== null) map!.set(key, arr.get(i + 1));
      }
    }
    const kids = node.lookup(N.Kids);
    if (kids instanceof PDFArray) {
      for (let i = 0; i < kids.size(); i++) {
        const kid = kids.lookup(i);
        if (kid instanceof PDFDict) walk(kid, depth + 1);
      }
    }
  };
  if (tree) walk(tree, 0);
  namedDestCache.set(doc, map);
  return map;
}

function resolveDest(doc: PDFDocument, value: PDFObject | undefined): PDFArray | null {
  let v: PDFObject | undefined = value;
  for (let hop = 0; hop < 4 && v; hop++) {
    if (v instanceof PDFRef) v = doc.context.lookup(v);
    if (v instanceof PDFArray) return v;
    if (v instanceof PDFDict) {
      v = v.get(N.D);
      continue;
    }
    const name = v instanceof PDFName ? v.decodeText() : textOf(v);
    if (name === null) return null;
    v = namedDests(doc).get(name);
  }
  return null;
}

function cloneSimple(obj: PDFObject): PDFObject | null {
  if (obj instanceof PDFName) return obj;
  if (obj instanceof PDFNumber) return PDFNumber.of(obj.asNumber());
  if (obj === PDFNull) return PDFNull;
  return null;
}

function mapTarget(dest: PDFArray | null, pageMap: Map<PDFRef, PDFRef>): Target | null {
  if (!dest || dest.size() === 0) return null;
  const first = dest.get(0);
  if (!(first instanceof PDFRef)) return null;
  const ref = pageMap.get(first);
  if (!ref) return null;
  const rest: PDFObject[] = [];
  for (let i = 1; i < dest.size(); i++) {
    const v = dest.lookup(i);
    const c = v ? cloneSimple(v) : null;
    if (!c) return { ref, rest: [N.Fit] };
    rest.push(c);
  }
  if (!(rest[0] instanceof PDFName)) return { ref, rest: [N.Fit] };
  return { ref, rest };
}

// ── Outlines ────────────────────────────────────────────────────

function readOutline(doc: PDFDocument, pageMap: Map<PDFRef, PDFRef>): OutlineNode[] {
  const root = dictAt(doc.catalog, N.Outlines);
  if (!root) return [];
  const seen = new Set<PDFDict>();
  let budget = 20_000;

  const walk = (first: PDFDict | undefined, depth: number): OutlineNode[] => {
    const out: OutlineNode[] = [];
    let item = first;
    while (item && !seen.has(item) && budget-- > 0) {
      seen.add(item);
      const children = depth < 24 ? walk(dictAt(item, N.First), depth + 1) : [];
      const title = textOf(item.lookup(N.Title));
      let destValue = item.get(N.Dest);
      let hadDest = destValue !== undefined;
      if (!hadDest) {
        const action = dictAt(item, N.A);
        if (action && action.lookup(N.S) === N.GoTo) {
          destValue = action.get(N.D);
          hadDest = destValue !== undefined;
        }
      }
      const target = hadDest ? mapTarget(resolveDest(doc, destValue), pageMap) : null;
      if (title !== null && (target || (!hadDest && children.length > 0))) {
        out.push({ title, target, children });
      } else {
        // Points at a page that wasn't kept: keep its children, if any.
        out.push(...children);
      }
      item = dictAt(item, N.Next);
    }
    return out;
  };

  return walk(dictAt(root, N.First), 0);
}

function writeOutline(doc: PDFDocument, nodes: OutlineNode[]) {
  if (nodes.length === 0) return;
  const ctx = doc.context;
  const rootRef = ctx.nextRef();

  const build = (items: OutlineNode[], parent: PDFRef): { first: PDFRef; last: PDFRef } => {
    const refs = items.map(() => ctx.nextRef());
    items.forEach((it, i) => {
      const dict = PDFDict.withContext(ctx);
      dict.set(N.Title, PDFHexString.fromText(it.title));
      dict.set(N.Parent, parent);
      if (i > 0) dict.set(N.Prev, refs[i - 1]);
      if (i < refs.length - 1) dict.set(N.Next, refs[i + 1]);
      if (it.target) {
        const arr = PDFArray.withContext(ctx);
        arr.push(it.target.ref);
        for (const r of it.target.rest) arr.push(r);
        dict.set(N.Dest, arr);
      }
      if (it.children.length > 0) {
        const sub = build(it.children, refs[i]);
        dict.set(N.First, sub.first);
        dict.set(N.Last, sub.last);
        // Negative count = collapsed.
        dict.set(N.Count, PDFNumber.of(-it.children.length));
      }
      ctx.assign(refs[i], dict);
    });
    return { first: refs[0], last: refs[refs.length - 1] };
  };

  const top = build(nodes, rootRef);
  const root = PDFDict.withContext(ctx);
  root.set(N.Type, N.Outlines);
  root.set(N.First, top.first);
  root.set(N.Last, top.last);
  root.set(N.Count, PDFNumber.of(nodes.length));
  ctx.assign(rootRef, root);
  doc.catalog.set(N.Outlines, rootRef);
}

// ── Forms ───────────────────────────────────────────────────────

interface FormAcc {
  fields: PDFRef[];
  names: Set<string>;
  da: PDFObject | null;
  dr: PDFDict | null;
}

function leafRefs(doc: PDFDocument, ref: PDFRef, depth = 0, out: PDFRef[] = []): PDFRef[] {
  if (depth > 16 || out.length > 5000) return out;
  const d = doc.context.lookup(ref);
  if (!(d instanceof PDFDict)) return out;
  const kids = d.get(N.Kids);
  const kidsArr = kids instanceof PDFRef ? doc.context.lookup(kids) : kids;
  if (!(kidsArr instanceof PDFArray) || kidsArr.size() === 0) {
    out.push(ref);
    return out;
  }
  for (let i = 0; i < kidsArr.size(); i++) {
    const k = kidsArr.get(i);
    if (k instanceof PDFRef) leafRefs(doc, k, depth + 1, out);
  }
  return out;
}

function collectForm(
  src: PDFDocument,
  out: PDFDocument,
  copier: PDFObjectCopier,
  keptAnnots: Set<PDFRef>,
  acc: FormAcc,
) {
  const acro = dictAt(src.catalog, N.AcroForm);
  if (!acro) return;
  const fields = acro.lookup(N.Fields);
  if (!(fields instanceof PDFArray)) return;
  let any = false;
  for (let i = 0; i < fields.size(); i++) {
    const raw = fields.get(i);
    if (!(raw instanceof PDFRef)) continue;
    const leaves = leafRefs(src, raw);
    if (leaves.length === 0 || !leaves.every((r) => keptAnnots.has(r))) continue;
    const copied = copier.copy(raw);
    if (!(copied instanceof PDFRef)) continue;
    const dict = out.context.lookup(copied);
    if (dict instanceof PDFDict) {
      const name = textOf(dict.lookup(N.T));
      if (name !== null) {
        let unique = name;
        for (let n = 2; acc.names.has(unique); n++) unique = `${name}_${n}`;
        if (unique !== name) dict.set(N.T, PDFHexString.fromText(unique));
        acc.names.add(unique);
      }
    }
    acc.fields.push(copied);
    any = true;
  }
  if (!any) return;
  const da = acro.lookup(N.DA);
  if (!acc.da && da) acc.da = cloneSimple(da) ?? (textOf(da) !== null ? PDFString.of(textOf(da)!) : null);
  const dr = dictAt(acro, N.DR);
  if (dr) {
    const copiedDr = copier.copy(dr);
    if (!acc.dr) acc.dr = copiedDr;
    else {
      const target = dictAt(acc.dr, N.Font);
      const fonts = dictAt(copiedDr, N.Font);
      if (target && fonts) {
        for (const [k, v] of fonts.entries()) if (!target.has(k)) target.set(k, v);
      }
    }
  }
}

function writeForm(out: PDFDocument, acc: FormAcc) {
  if (acc.fields.length === 0) return;
  const ctx = out.context;
  const acro = PDFDict.withContext(ctx);
  const arr = PDFArray.withContext(ctx);
  for (const f of acc.fields) arr.push(f);
  acro.set(N.Fields, arr);
  if (acc.da) acro.set(N.DA, acc.da);
  if (acc.dr) acro.set(N.DR, acc.dr);
  out.catalog.set(N.AcroForm, ctx.register(acro));
}

// ── Assembly ────────────────────────────────────────────────────

type CopierInternals = { traversedObjects?: Map<PDFObject, PDFObject> };

export async function assemblePdf(parts: AssemblePart[], options: AssembleOptions): Promise<PDFDocument> {
  const out = await PDFDocument.create({ updateMetadata: false });
  const outline: OutlineNode[] = [];
  const form: FormAcc = { fields: [], names: new Set(), da: null, dr: null };

  for (let pi = 0; pi < parts.length; pi++) {
    const { doc: src, pages, title } = parts[pi];
    options.onPart?.(pi);
    await src.flush();
    const srcPages = src.getPages();
    const copier = PDFObjectCopier.for(src.context, out.context);
    const traversed = (copier as unknown as CopierInternals).traversedObjects;

    // First occurrence of each kept page gets a pre-allocated ref, so links,
    // bookmarks and widgets that point at it resolve to the copy instead of
    // dragging in a duplicate of the page.
    const pageMap = new Map<PDFRef, PDFRef>();
    for (const idx of pages) {
      const ref = srcPages[idx]?.ref;
      if (ref && !pageMap.has(ref)) pageMap.set(ref, out.context.nextRef());
    }
    if (traversed instanceof Map) {
      pageMap.forEach((newRef, srcRef) => traversed.set(srcRef, newRef));
      // References to pages that were left out point at null instead of
      // copying those pages in as hidden baggage.
      let placeholder: PDFRef | null = null;
      for (const p of srcPages) {
        if (pageMap.has(p.ref)) continue;
        placeholder ??= out.context.register(PDFNull);
        traversed.set(p.ref, placeholder);
      }
    }

    const used = new Set<PDFRef>();
    const keptAnnots = new Set<PDFRef>();
    let firstRef: PDFRef | null = null;
    for (const idx of pages) {
      const srcPage = srcPages[idx];
      if (!srcPage) continue;
      const pre = pageMap.get(srcPage.ref);
      const ref = pre && !used.has(srcPage.ref) ? pre : out.context.nextRef();
      used.add(srcPage.ref);
      const node = copier.copy(srcPage.node);
      out.context.assign(ref, node);
      out.addPage(PDFPage.of(node, ref, out));
      firstRef ??= ref;
      const annots = srcPage.node.Annots();
      if (annots) {
        for (let i = 0; i < annots.size(); i++) {
          const a = annots.get(i);
          if (a instanceof PDFRef) keptAnnots.add(a);
        }
      }
    }
    // A pre-allocated ref that was never assigned would dangle.
    pageMap.forEach((newRef, srcRef) => {
      if (!used.has(srcRef)) out.context.assign(newRef, PDFNull);
    });

    let children: OutlineNode[] = [];
    try {
      children = readOutline(src, pageMap);
    } catch (error) {
      console.warn("Bookmarks skipped:", error);
    }
    if (options.partBookmarks && firstRef) {
      outline.push({ title, target: { ref: firstRef, rest: [N.Fit] }, children });
    } else {
      outline.push(...children);
    }

    try {
      collectForm(src, out, copier, keptAnnots, form);
    } catch (error) {
      console.warn("Form fields skipped:", error);
    }
  }

  try {
    writeOutline(out, outline);
    if (outline.length > 0 && options.partBookmarks) out.catalog.set(N.PageMode, N.UseOutlines);
  } catch (error) {
    console.warn("Bookmarks skipped:", error);
  }
  try {
    writeForm(out, form);
  } catch (error) {
    console.warn("Form fields skipped:", error);
  }
  return out;
}
