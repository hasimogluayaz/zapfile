import type { PdfFontKey } from "@/lib/pdf-stamp/fonts";
import type { Anchor } from "@/lib/pdf-stamp/geometry";

export interface WatermarkOptions {
  kind: "text" | "image";
  text: string;
  font: PdfFontKey;
  /** Font size as a share of the page's visible width (0.02–0.3). */
  size: number;
  color: string;
  /** 0–1 */
  opacity: number;
  /** Counter-clockwise degrees. */
  rotation: number;
  where: Anchor | "tile";
  /** Image width as a share of the page width. */
  imageScale: number;
  /** 1-based pages to stamp; null = all. */
  pages: number[] | null;
}

export interface WatermarkRequest {
  bytes: ArrayBuffer;
  options: WatermarkOptions;
  image?: { bytes: ArrayBuffer; type: "png" | "jpg"; width: number; height: number };
  fontBytes?: ArrayBuffer;
}

/** Margin around anchored stamps and gap between tiles, as shares of the page width. */
export const MARGIN = 0.05;
export const TILE_GAP = 0.08;
