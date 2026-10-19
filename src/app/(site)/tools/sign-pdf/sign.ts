import type { PdfFontKey } from "@/lib/pdf-stamp/fonts";

/** Something placed on a page. Coordinates are points in the page's visible frame, origin top-left, y down. */
export type Placed =
  | { id: number; page: number; kind: "image"; x: number; y: number; w: number; h: number; image: string }
  | { id: number; page: number; kind: "text"; x: number; y: number; size: number; text: string; color: string; font: PdfFontKey };

export interface SignRequest {
  bytes: ArrayBuffer;
  items: Placed[];
  images: Record<string, ArrayBuffer>;
  fonts: Partial<Record<PdfFontKey, ArrayBuffer>>;
}

/** DejaVu's vertical metrics (hhea), used so on-screen text boxes line up with the PDF. */
export const ASCENT = 0.928;
export const DESCENT = 0.236;
