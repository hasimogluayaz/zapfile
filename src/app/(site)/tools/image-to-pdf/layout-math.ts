/**
 * Page geometry shared by the live page previews and the PDF builder, so
 * what you see is exactly what you get. Units are PDF points (1/72 inch),
 * origin bottom-left like PDF.
 */

export type PageSize = "a4" | "letter" | "square" | "fit";
export type Orientation = "auto" | "portrait" | "landscape";
export type FitMode = "contain" | "cover" | "stretch";

export const PAGE_SIZES: Record<Exclude<PageSize, "fit">, { width: number; height: number }> = {
  a4: { width: 595.28, height: 841.89 },
  letter: { width: 612, height: 792 },
  square: { width: 720, height: 720 },
};

/** "Fit to image" treats pixels as 150 DPI and never exceeds an A3 sheet. */
const FIT_DPI = 150;
const A3_LONG = 1190.55;

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function pageBoxFor(
  imgW: number,
  imgH: number,
  pageSize: PageSize,
  orientation: Orientation,
  margin: number,
): { width: number; height: number } {
  if (pageSize === "fit") {
    let w = (imgW * 72) / FIT_DPI;
    let h = (imgH * 72) / FIT_DPI;
    const k = Math.min(1, A3_LONG / Math.max(w, h));
    w *= k;
    h *= k;
    return { width: w + margin * 2, height: h + margin * 2 };
  }
  const base = PAGE_SIZES[pageSize];
  const landscape = orientation === "landscape" || (orientation === "auto" && imgW > imgH);
  const long = Math.max(base.width, base.height);
  const short = Math.min(base.width, base.height);
  return landscape ? { width: long, height: short } : { width: short, height: long };
}

/** The margin box (images are clipped to it in cover mode). */
export function contentBox(pageW: number, pageH: number, margin: number): Box {
  const m = Math.max(0, Math.min(margin, pageW / 2 - 1, pageH / 2 - 1));
  return { x: m, y: m, width: Math.max(1, pageW - m * 2), height: Math.max(1, pageH - m * 2) };
}

/** Where the image is drawn on the page. */
export function placeImage(imgW: number, imgH: number, box: Box, fit: FitMode): Box {
  if (fit === "stretch") return { ...box };
  const scale =
    fit === "cover"
      ? Math.max(box.width / imgW, box.height / imgH)
      : Math.min(box.width / imgW, box.height / imgH);
  const width = imgW * scale;
  const height = imgH * scale;
  return {
    x: box.x + (box.width - width) / 2,
    y: box.y + (box.height - height) / 2,
    width,
    height,
  };
}

/** Full layout for one image (dimensions already oriented and rotated). */
export function layoutPage(
  imgW: number,
  imgH: number,
  opts: { pageSize: PageSize; orientation: Orientation; margin: number; fit: FitMode },
) {
  const page = pageBoxFor(imgW, imgH, opts.pageSize, opts.orientation, opts.margin);
  const box = contentBox(page.width, page.height, opts.margin);
  const fit = opts.pageSize === "fit" ? "contain" : opts.fit;
  const draw = placeImage(imgW, imgH, box, fit);
  return { page, box, draw, clip: fit === "cover" };
}

/** EXIF orientation (1–8) of a JPEG, read from its first bytes. 1 when absent. */
export function jpegOrientation(buf: Uint8Array): number {
  if (buf[0] !== 0xff || buf[1] !== 0xd8) return 1;
  let i = 2;
  while (i + 10 < buf.length) {
    if (buf[i] !== 0xff) return 1;
    const marker = buf[i + 1];
    if (marker === 0xda || marker === 0xd9) return 1;
    const len = (buf[i + 2] << 8) | buf[i + 3];
    if (marker === 0xe1 && buf[i + 4] === 0x45 && buf[i + 5] === 0x78 && buf[i + 6] === 0x69 && buf[i + 7] === 0x66) {
      const t = i + 10; // TIFF header
      const le = buf[t] === 0x49;
      const r16 = (o: number) => (le ? buf[o] | (buf[o + 1] << 8) : (buf[o] << 8) | buf[o + 1]);
      const r32 = (o: number) =>
        (le
          ? buf[o] | (buf[o + 1] << 8) | (buf[o + 2] << 16) | (buf[o + 3] << 24)
          : (buf[o] << 24) | (buf[o + 1] << 16) | (buf[o + 2] << 8) | buf[o + 3]) >>> 0;
      const ifd = t + r32(t + 4);
      if (ifd + 2 > buf.length) return 1;
      const count = r16(ifd);
      for (let k = 0; k < count; k++) {
        const e = ifd + 2 + k * 12;
        if (e + 12 > buf.length) break;
        if (r16(e) === 0x0112) {
          const v = r16(e + 8);
          return v >= 1 && v <= 8 ? v : 1;
        }
      }
      return 1;
    }
    i += 2 + len;
  }
  return 1;
}

/** Sniff the real container format from magic bytes. */
export function sniffKind(buf: Uint8Array): "jpeg" | "png" | "other" {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  return "other";
}
