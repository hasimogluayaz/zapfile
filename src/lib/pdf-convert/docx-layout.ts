/**
 * PDF → Word, exact layout: every page keeps its look. Built from the same slide model as PDF →
 * PowerPoint (slides.ts): text boxes (editable, one paragraph per line), filled rectangles, lines and
 * pictures, each anchored to its position on the page. Used for designed pages (brochures, offers,
 * flyers) where reflowing the text into paragraphs would break the layout. Pure: runs in the worker.
 */
import JSZip from "jszip";
import { esc, hex } from "./docx";
import type { ImageAsset, PageModel, TextRun } from "./model";
import { buildSlide, type SlideItem, type SlideModel } from "./slides";

const EMU = 12700; // per point
const emu = (pt: number) => Math.max(0, Math.round(pt * EMU));
const tw = (pt: number) => Math.round(pt * 20);

/**
 * Is reflowing this document likely to wreck it? Designed pages carry several pictures, or a picture
 * plus many separate text boxes; plain documents (one logo, a chart) keep the editable flowing mode.
 */
export function prefersExactLayout(pages: PageModel[]): boolean {
  const usable = pages.filter((p) => !p.scanned);
  if (!usable.length) return false;
  const designed = usable.filter((p) => {
    const pictures = p.images.filter((im) => !im.figure && im.w * im.h > p.width * p.height * 0.004).length;
    if (pictures >= 2) return true;
    if (pictures < 1) return false;
    const boxes = buildSlide(p).items.filter((it) => it.kind === "text").length;
    return boxes >= 10;
  }).length;
  return designed / usable.length >= 0.4;
}

interface Ctx {
  id: number;
  z: number;
  imageRel: Map<string, string>;
}

function runXml(r: TextRun): string {
  const font = esc(r.font);
  const half = Math.max(2, Math.round(r.size * 2));
  const props = [
    `<w:rFonts w:ascii="${font}" w:hAnsi="${font}" w:cs="${font}" w:eastAsia="${font}"/>`,
    r.bold ? "<w:b/><w:bCs/>" : "",
    r.italic ? "<w:i/><w:iCs/>" : "",
    `<w:color w:val="${hex(r.color)}"/>`,
    `<w:sz w:val="${half}"/><w:szCs w:val="${half}"/>`,
    r.underline ? '<w:u w:val="single"/>' : "",
    r.vertAlign ? `<w:vertAlign w:val="${r.vertAlign}"/>` : "",
  ].join("");
  const body = r.text
    .split("\t")
    .map((p, i) => (i ? "<w:tab/>" : "") + (p ? `<w:t xml:space="preserve">${esc(p)}</w:t>` : ""))
    .join("");
  return `<w:r><w:rPr>${props}</w:rPr>${body}</w:r>`;
}

/** wp:anchor wrapper, positioned from the page's top-left corner, drawn in item order. */
function anchor(c: Ctx, x: number, y: number, w: number, h: number, name: string, graphic: string): string {
  const id = c.id++;
  const z = c.z++;
  return (
    `<w:r><w:drawing><wp:anchor distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="${251658240 + z}" behindDoc="0" locked="0" layoutInCell="1" allowOverlap="1">` +
    `<wp:simplePos x="0" y="0"/><wp:positionH relativeFrom="page"><wp:posOffset>${emu(x)}</wp:posOffset></wp:positionH><wp:positionV relativeFrom="page"><wp:posOffset>${emu(y)}</wp:posOffset></wp:positionV>` +
    `<wp:extent cx="${Math.max(1, emu(w))}" cy="${Math.max(1, emu(h))}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:wrapNone/><wp:docPr id="${id}" name="${name} ${id}"/><wp:cNvGraphicFramePr/>` +
    `<a:graphic>${graphic}</a:graphic></wp:anchor></w:drawing></w:r>`
  );
}

const WPS = "http://schemas.microsoft.com/office/word/2010/wordprocessingShape";

function itemXml(it: SlideItem, c: Ctx): string {
  switch (it.kind) {
    case "rect":
      return anchor(
        c, it.x, it.y, it.w, it.h, "Rectangle",
        `<a:graphicData uri="${WPS}"><wps:wsp><wps:cNvSpPr/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${Math.max(1, emu(it.w))}" cy="${Math.max(1, emu(it.h))}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${hex(it.color)}"/></a:solidFill><a:ln><a:noFill/></a:ln></wps:spPr><wps:bodyPr/></wps:wsp></a:graphicData>`,
      );
    case "line": {
      const x = Math.min(it.x0, it.x1), y = Math.min(it.y0, it.y1);
      const w = Math.abs(it.x1 - it.x0), h = Math.abs(it.y1 - it.y0);
      const flip = (it.x1 < it.x0) !== (it.y1 < it.y0) ? ' flipV="1"' : "";
      return anchor(
        c, x, y, w, h, "Line",
        `<a:graphicData uri="${WPS}"><wps:wsp><wps:cNvCnPr/><wps:spPr><a:xfrm${flip}><a:off x="0" y="0"/><a:ext cx="${Math.max(1, emu(w))}" cy="${Math.max(1, emu(h))}"/></a:xfrm><a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="${Math.max(3175, emu(it.width))}"><a:solidFill><a:srgbClr val="${hex(it.color)}"/></a:solidFill></a:ln></wps:spPr><wps:bodyPr/></wps:wsp></a:graphicData>`,
      );
    }
    case "image": {
      const rel = c.imageRel.get(it.id);
      if (!rel) return "";
      const pid = c.id;
      return anchor(
        c, it.x, it.y, it.w, it.h, "Picture",
        `<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic><pic:nvPicPr><pic:cNvPr id="${pid}" name="Picture ${pid}"/><pic:cNvPicPr><a:picLocks noChangeAspect="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="${rel}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${Math.max(1, emu(it.w))}" cy="${Math.max(1, emu(it.h))}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData>`,
      );
    }
    case "text": {
      // Word measures substituted fonts a little differently: widen the box (it has no fill) so lines
      // never wrap or get cut, growing away from the alignment edge, and let the height follow the text.
      const extra = it.w * 0.12 + (it.lines[0]?.runs[0]?.size ?? 12);
      const x = it.align === "center" ? it.x - extra / 2 : it.align === "right" ? it.x - extra : it.x;
      it = { ...it, x: Math.max(0, x), w: it.w + extra };
      const jc = it.align === "center" ? "center" : it.align === "right" ? "right" : it.align === "justify" ? "both" : "left";
      const paras = it.lines
        .map((l) => {
          const size = l.runs[0]?.size ?? 12;
          // Exact line pitch keeps every baseline where the PDF had it.
          const pitch = Math.max(size * 1.0, l.pitch);
          return `<w:p><w:pPr><w:spacing w:before="0" w:after="0" w:line="${tw(pitch)}" w:lineRule="exact"/><w:jc w:val="${jc}"/></w:pPr>${l.runs.map(runXml).join("")}</w:p>`;
        })
        .join("");
      return anchor(
        c, it.x, it.y, it.w, it.h, "Text Box",
        `<a:graphicData uri="${WPS}"><wps:wsp><wps:cNvSpPr txBox="1"/><wps:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${Math.max(1, emu(it.w))}" cy="${Math.max(1, emu(it.h))}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/><a:ln><a:noFill/></a:ln></wps:spPr><wps:txbx><w:txbxContent>${paras}</w:txbxContent></wps:txbx><wps:bodyPr rot="0" vert="horz" wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" anchor="t" anchorCtr="0"><a:spAutoFit/></wps:bodyPr></wps:wsp></a:graphicData>`,
      );
    }
  }
}

const NS =
  'xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" mc:Ignorable="w14"';

function sectPr(s: SlideModel, last: boolean): string {
  const orient = s.width > s.height ? ' w:orient="landscape"' : "";
  return `<w:sectPr>${last ? "" : '<w:type w:val="nextPage"/>'}<w:pgSz w:w="${tw(s.width)}" w:h="${tw(s.height)}"${orient}/><w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>`;
}

export interface DocxLayoutStats {
  pages: number;
  textBoxes: number;
  images: number;
}

export async function writeDocxLayout(pages: PageModel[], assets: ImageAsset[], title: string): Promise<{ bytes: Uint8Array; stats: DocxLayoutStats }> {
  const zip = new JSZip();
  const slides = pages.map(buildSlide);
  const byId = new Map(assets.map((a) => [a.id, a]));
  const imageRel = new Map<string, string>();
  const rels: string[] = [];
  let n = 0;
  for (const s of slides) {
    for (const it of s.items) {
      if (it.kind !== "image" || imageRel.has(it.id)) continue;
      const asset = byId.get(it.id);
      if (!asset) continue;
      n++;
      const ext = asset.mime === "image/png" ? "png" : "jpeg";
      zip.file(`word/media/image${n}.${ext}`, asset.bytes);
      imageRel.set(it.id, `rIdImg${n}`);
      rels.push(`<Relationship Id="rIdImg${n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image${n}.${ext}"/>`);
    }
  }

  const c: Ctx = { id: 1, z: 0, imageRel };
  let textBoxes = 0;
  let images = 0;
  const body = slides
    .map((s, i) => {
      const last = i === slides.length - 1;
      const drawings = s.items
        .map((it) => {
          if (it.kind === "text") textBoxes++;
          if (it.kind === "image" && imageRel.has(it.id)) images++;
          return itemXml(it, c);
        })
        .join("");
      // One tiny paragraph per page holds its drawings (and ends its section).
      const pPr = `<w:pPr><w:spacing w:before="0" w:after="0" w:line="20" w:lineRule="exact"/>${last ? "" : sectPr(s, false)}</w:pPr>`;
      return `<w:p>${pPr}${drawings}</w:p>`;
    })
    .join("");
  const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document ${NS}><w:body>${body}${sectPr(slides[slides.length - 1] ?? { width: 595, height: 842, items: [] }, true)}</w:body></w:document>`;

  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Default Extension="jpeg" ContentType="image/jpeg"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`,
  );
  zip.file(
    "word/_rels/document.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${rels.join("")}</Relationships>`,
  );
  zip.file(
    "word/styles.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="tr-TR"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style></w:styles>`,
  );
  zip.file(
    "docProps/core.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(title)}</dc:title><dc:creator>ZapFile</dc:creator></cp:coreProperties>`,
  );
  zip.file("word/document.xml", document);
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return { bytes, stats: { pages: slides.length, textBoxes, images } };
}
