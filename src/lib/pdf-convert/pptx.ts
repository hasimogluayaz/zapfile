/**
 * Writes slides as a PowerPoint presentation (.pptx, Office Open XML) with one slide master,
 * one blank layout and a standard theme. Text boxes, rectangles, lines and pictures are plain
 * DrawingML shapes, so everything stays editable. Pure (JSZip only) so it runs in a worker.
 */
import JSZip from "jszip";
import { esc, hex } from "./docx";
import type { ImageAsset, TextRun } from "./model";
import type { SlideItem, SlideModel } from "./slides";

const EMU = 12700; // per point
const emu = (pt: number) => Math.round(pt * EMU);

const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

function runXml(r: TextRun): string {
  const attrs = [`lang="en-US"`, `sz="${Math.max(100, Math.round(r.size * 100))}"`, r.bold ? 'b="1"' : 'b="0"', r.italic ? 'i="1"' : "", r.underline ? 'u="sng"' : "", r.vertAlign === "superscript" ? 'baseline="30000"' : r.vertAlign === "subscript" ? 'baseline="-25000"' : "", 'dirty="0"']
    .filter(Boolean)
    .join(" ");
  const font = esc(r.font);
  return `<a:r><a:rPr ${attrs}><a:solidFill><a:srgbClr val="${hex(r.color)}"/></a:solidFill><a:latin typeface="${font}"/><a:ea typeface="${font}"/><a:cs typeface="${font}"/></a:rPr><a:t>${esc(r.text.replace(/\t/g, "    "))}</a:t></a:r>`;
}

interface ShapeCtx {
  id: number;
  k: number;
  ox: number;
  oy: number;
  imageRel: Map<string, string>;
}

function xfrm(c: ShapeCtx, x: number, y: number, w: number, h: number, flip = ""): string {
  return `<a:xfrm${flip}><a:off x="${emu(c.ox + x * c.k)}" y="${emu(c.oy + y * c.k)}"/><a:ext cx="${Math.max(1, emu(w * c.k))}" cy="${Math.max(1, emu(h * c.k))}"/></a:xfrm>`;
}

function itemXml(it: SlideItem, c: ShapeCtx): string {
  const id = c.id++;
  switch (it.kind) {
    case "rect":
      return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Rectangle ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${xfrm(c, it.x, it.y, it.w, it.h)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="${hex(it.color)}"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr></p:sp>`;
    case "line": {
      const x = Math.min(it.x0, it.x1), y = Math.min(it.y0, it.y1);
      const flip = (it.x1 < it.x0) !== (it.y1 < it.y0) ? ' flipV="1"' : "";
      return `<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${id}" name="Line ${id}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr>${xfrm(c, x, y, Math.abs(it.x1 - it.x0), Math.abs(it.y1 - it.y0), flip)}<a:prstGeom prst="line"><a:avLst/></a:prstGeom><a:ln w="${emu(it.width * c.k)}"><a:solidFill><a:srgbClr val="${hex(it.color)}"/></a:solidFill></a:ln></p:spPr></p:cxnSp>`;
    }
    case "image": {
      const rel = c.imageRel.get(it.id);
      if (!rel) return "";
      return `<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="Picture ${id}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${rel}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${xfrm(c, it.x, it.y, it.w, it.h)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
    }
    case "text": {
      const algn = it.align === "center" ? "ctr" : it.align === "right" ? "r" : it.align === "justify" ? "just" : "l";
      const paras = it.lines
        .map((l) => {
          const pitch = Math.max(100, Math.round(l.pitch * c.k * 100));
          const body = l.runs.length ? l.runs.map((r) => runXml({ ...r, size: r.size * c.k })).join("") : "";
          const size = Math.round((l.runs[0]?.size ?? 12) * c.k * 100);
          return `<a:p><a:pPr algn="${algn}"><a:lnSpc><a:spcPts val="${pitch}"/></a:lnSpc><a:spcBef><a:spcPts val="0"/></a:spcBef><a:spcAft><a:spcPts val="0"/></a:spcAft><a:buNone/></a:pPr>${body}<a:endParaRPr lang="en-US" sz="${Math.max(100, size)}" dirty="0"/></a:p>`;
        })
        .join("");
      return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="TextBox ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr>${xfrm(c, it.x, it.y, it.w, it.h)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="none" lIns="0" tIns="0" rIns="0" bIns="0" rtlCol="0" anchor="t"><a:noAutofit/></a:bodyPr><a:lstStyle/>${paras}</p:txBody></p:sp>`;
    }
  }
}

const THEME = `${XML}<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme"><a:themeElements><a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="44546A"/></a:dk2><a:lt2><a:srgbClr val="E7E6E6"/></a:lt2><a:accent1><a:srgbClr val="4472C4"/></a:accent1><a:accent2><a:srgbClr val="ED7D31"/></a:accent2><a:accent3><a:srgbClr val="A5A5A5"/></a:accent3><a:accent4><a:srgbClr val="FFC000"/></a:accent4><a:accent5><a:srgbClr val="5B9BD5"/></a:accent5><a:accent6><a:srgbClr val="70AD47"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri Light"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`;

const EMPTY_TREE = '<p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld>';

const MASTER = `${XML}<p:sldMaster ${NS}><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr></p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle><a:lvl1pPr><a:defRPr sz="4400"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mj-lt"/></a:defRPr></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr><a:defRPr sz="2800"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl1pPr></p:bodyStyle><p:otherStyle><a:lvl1pPr><a:defRPr sz="1800"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl1pPr></p:otherStyle></p:txStyles></p:sldMaster>`;

const LAYOUT = `${XML}<p:sldLayout ${NS} type="blank" preserve="1"><p:cSld name="Blank">${EMPTY_TREE.replace("<p:cSld>", "").replace("</p:cSld>", "")}</p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;

export interface PptxStats {
  slides: number;
  textBoxes: number;
  images: number;
  shapes: number;
}

export async function writePptx(slides: SlideModel[], assets: ImageAsset[], title: string): Promise<{ bytes: Uint8Array; stats: PptxStats }> {
  const zip = new JSZip();
  // Slide size from the first page (PowerPoint allows 1–56 inches per side).
  const first = slides[0] ?? { width: 960, height: 540 };
  const clampPt = (v: number) => Math.min(4032, Math.max(72, v));
  const SW = clampPt(first.width), SH = clampPt(first.height);
  const stats: PptxStats = { slides: slides.length, textBoxes: 0, images: 0, shapes: 0 };
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const mediaName = new Map<string, string>();

  const ct: string[] = [
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
    '<Default Extension="xml" ContentType="application/xml"/>',
    '<Default Extension="png" ContentType="image/png"/>',
    '<Default Extension="jpeg" ContentType="image/jpeg"/>',
    '<Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>',
    '<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>',
    '<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>',
    '<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>',
    '<Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>',
    '<Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/>',
    '<Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>',
    '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
    '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>',
  ];

  slides.forEach((s, i) => {
    const n = i + 1;
    // Fit pages of another size into the slide, centred.
    const k = Math.min(SW / s.width, SH / s.height);
    const ctx: ShapeCtx = { id: 2, k, ox: (SW - s.width * k) / 2, oy: (SH - s.height * k) / 2, imageRel: new Map() };
    const rels = [`<Relationship Id="rId1" Type="${REL}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>`];
    for (const it of s.items) {
      if (it.kind !== "image" || ctx.imageRel.has(it.id)) continue;
      const a = assetById.get(it.id);
      if (!a) continue;
      let name = mediaName.get(a.id);
      if (!name) {
        name = `image${mediaName.size + 1}.${a.mime === "image/png" ? "png" : "jpeg"}`;
        mediaName.set(a.id, name);
        zip.file(`ppt/media/${name}`, a.bytes);
      }
      const rid = `rId${rels.length + 1}`;
      rels.push(`<Relationship Id="${rid}" Type="${REL}/image" Target="../media/${name}"/>`);
      ctx.imageRel.set(it.id, rid);
    }
    const shapes = s.items.map((it) => itemXml(it, ctx)).join("");
    for (const it of s.items) {
      if (it.kind === "text") stats.textBoxes++;
      else if (it.kind === "image") stats.images++;
      else stats.shapes++;
    }
    zip.file(
      `ppt/slides/slide${n}.xml`,
      `${XML}<p:sld ${NS}><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${shapes}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`,
    );
    zip.file(`ppt/slides/_rels/slide${n}.xml.rels`, `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join("")}</Relationships>`);
    ct.push(`<Override PartName="/ppt/slides/slide${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`);
  });

  zip.file("[Content_Types].xml", `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${ct.join("")}</Types>`);
  zip.file(
    "_rels/.rels",
    `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${REL}/extended-properties" Target="docProps/app.xml"/></Relationships>`,
  );
  const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  zip.file(
    "docProps/core.xml",
    `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(title)}</dc:title><dc:creator>ZapFile</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`,
  );
  zip.file(
    "docProps/app.xml",
    `${XML}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>ZapFile</Application><Slides>${slides.length}</Slides></Properties>`,
  );
  const sldIds = slides.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`).join("");
  zip.file(
    "ppt/presentation.xml",
    `${XML}<p:presentation ${NS} saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${sldIds}</p:sldIdLst><p:sldSz cx="${emu(SW)}" cy="${emu(SH)}"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle><a:lvl1pPr><a:defRPr sz="1800"><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl1pPr></p:defaultTextStyle></p:presentation>`,
  );
  const presRels = [
    `<Relationship Id="rId1" Type="${REL}/slideMaster" Target="slideMasters/slideMaster1.xml"/>`,
    ...slides.map((_, i) => `<Relationship Id="rId${i + 2}" Type="${REL}/slide" Target="slides/slide${i + 1}.xml"/>`),
    `<Relationship Id="rId${slides.length + 2}" Type="${REL}/theme" Target="theme/theme1.xml"/>`,
    `<Relationship Id="rId${slides.length + 3}" Type="${REL}/presProps" Target="presProps.xml"/>`,
    `<Relationship Id="rId${slides.length + 4}" Type="${REL}/viewProps" Target="viewProps.xml"/>`,
    `<Relationship Id="rId${slides.length + 5}" Type="${REL}/tableStyles" Target="tableStyles.xml"/>`,
  ];
  zip.file("ppt/_rels/presentation.xml.rels", `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${presRels.join("")}</Relationships>`);
  zip.file("ppt/presProps.xml", `${XML}<p:presentationPr ${NS}/>`);
  zip.file("ppt/viewProps.xml", `${XML}<p:viewPr ${NS}><p:normalViewPr><p:restoredLeft sz="15620"/><p:restoredTop sz="94660"/></p:normalViewPr><p:gridSpacing cx="76200" cy="76200"/></p:viewPr>`);
  zip.file("ppt/tableStyles.xml", `${XML}<a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>`);
  zip.file("ppt/theme/theme1.xml", THEME);
  zip.file("ppt/slideMasters/slideMaster1.xml", MASTER);
  zip.file(
    "ppt/slideMasters/_rels/slideMaster1.xml.rels",
    `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="${REL}/theme" Target="../theme/theme1.xml"/></Relationships>`,
  );
  zip.file("ppt/slideLayouts/slideLayout1.xml", LAYOUT);
  zip.file(
    "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
    `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${REL}/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`,
  );
  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 }, mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
  return { bytes, stats };
}
