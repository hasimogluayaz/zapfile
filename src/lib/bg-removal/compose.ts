/**
 * Canvas helpers for previewing and exporting a cutout over a backdrop.
 */
import type { CutoutDocument, OutputKind, Rect } from "./document";

export type Backdrop =
  | { kind: "transparent" }
  | { kind: "color"; color: string }
  /** The original photo, blurred ("portrait mode"). `amount` is 0–1. */
  | { kind: "blur"; amount: number }
  | { kind: "image"; image: CanvasImageSource & { width: number; height: number } };

export type ExportFormat = "image/png" | "image/webp" | "image/jpeg";

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", { willReadFrequently: false });
  if (!ctx) throw new Error("Canvas 2D is not available");
  return ctx;
}

/** A canvas holding raw RGBA pixels. */
export function canvasFromPixels(data: Uint8ClampedArray, width: number, height: number): HTMLCanvasElement {
  const canvas = createCanvas(width, height);
  context2d(canvas).putImageData(new ImageData(data as Uint8ClampedArray<ArrayBuffer>, width, height), 0, 0);
  return canvas;
}

let filterSupport: boolean | null = null;
function supportsCanvasFilter(): boolean {
  if (filterSupport !== null) return filterSupport;
  try {
    const ctx = createCanvas(1, 1).getContext("2d") as CanvasRenderingContext2D & { filter?: string };
    ctx.filter = "blur(2px)";
    filterSupport = ctx.filter === "blur(2px)";
  } catch {
    filterSupport = false;
  }
  return filterSupport;
}

/** Blur radius in pixels for a 0–1 amount at the given image size. */
export function blurRadius(amount: number, width: number, height: number): number {
  return Math.max(1, Math.round(Math.max(width, height) * (0.004 + amount * 0.036)));
}

/**
 * Blurred copy of `source`. Uses the canvas `filter` when available and a
 * multi-step downscale otherwise (older Safari). Edges are extended so the
 * blur never fades to transparent at the borders.
 */
export function blurredCanvas(
  source: HTMLCanvasElement,
  amount: number,
): HTMLCanvasElement {
  const { width, height } = source;
  const radius = blurRadius(amount, width, height);
  const out = createCanvas(width, height);
  const ctx = context2d(out);
  if (supportsCanvasFilter()) {
    ctx.filter = `blur(${radius}px)`;
    const m = radius * 2;
    ctx.drawImage(source, -m, -m, width + m * 2, height + m * 2);
    ctx.filter = "none";
    return out;
  }
  // Downscale to roughly the blur radius, then upscale smoothly in two steps.
  const factor = Math.max(2, radius);
  const sw = Math.max(1, Math.round(width / factor));
  const sh = Math.max(1, Math.round(height / factor));
  const small = createCanvas(sw, sh);
  const sctx = context2d(small);
  sctx.imageSmoothingQuality = "high";
  sctx.drawImage(source, 0, 0, sw, sh);
  const mid = createCanvas(Math.min(width, sw * 4), Math.min(height, sh * 4));
  const mctx = context2d(mid);
  mctx.imageSmoothingQuality = "high";
  mctx.drawImage(small, 0, 0, mid.width, mid.height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(mid, 0, 0, width, height);
  return out;
}

/** Draw `image` to fully cover `rect` (centre crop), like CSS object-fit: cover. */
export function drawCover(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
  rect: Rect,
) {
  const scale = Math.max(rect.width / image.width, rect.height / image.height);
  const w = image.width * scale;
  const h = image.height * scale;
  ctx.drawImage(image, rect.x + (rect.width - w) / 2, rect.y + (rect.height - h) / 2, w, h);
}

export interface ExportOptions {
  output: OutputKind;
  backdrop: Backdrop;
  format: ExportFormat;
  /** 0–1, for JPEG/WebP. */
  quality: number;
  /** Crop to the subject's bounding box (subject output only). */
  cropToSubject: boolean;
  /** Padding around the subject when cropping, as a fraction of its size. */
  padding: number;
  /** Longest side of the exported image; 0 = original size. */
  maxSide: number;
  /** Blurred original, reused when the backdrop is "blur". */
  blurred?: HTMLCanvasElement | null;
}

/** Render the final image at export resolution. */
export function renderExport(doc: CutoutDocument, original: HTMLCanvasElement, options: ExportOptions): HTMLCanvasElement {
  const { width: W, height: H } = doc;
  const layerData = new Uint8ClampedArray(W * H * 4);
  doc.renderOutput(options.output, layerData);
  const layer = canvasFromPixels(layerData, W, H);

  // Region of the source to export.
  let region: Rect = { x: 0, y: 0, width: W, height: H };
  if (options.cropToSubject && options.output === "subject") {
    const box = doc.subjectBounds();
    if (box) {
      const pad = Math.round(Math.max(box.width, box.height) * options.padding);
      region = {
        x: box.x - pad,
        y: box.y - pad,
        width: box.width + pad * 2,
        height: box.height + pad * 2,
      };
    }
  }

  let scale = 1;
  if (options.maxSide > 0) scale = Math.min(1, options.maxSide / Math.max(region.width, region.height));
  const outW = Math.max(1, Math.round(region.width * scale));
  const outH = Math.max(1, Math.round(region.height * scale));
  const canvas = createCanvas(outW, outH);
  const ctx = context2d(canvas);
  ctx.imageSmoothingQuality = "high";

  const full: Rect = { x: 0, y: 0, width: outW, height: outH };
  // Where the source image lands on the output canvas.
  const place = { x: -region.x * scale, y: -region.y * scale, width: W * scale, height: H * scale };

  const opaque = options.format === "image/jpeg";
  const backdrop = options.output === "subject" ? options.backdrop : { kind: "transparent" as const };
  if (backdrop.kind === "color") {
    ctx.fillStyle = backdrop.color;
    ctx.fillRect(0, 0, outW, outH);
  } else if (backdrop.kind === "blur") {
    const blurred = options.blurred ?? blurredCanvas(original, backdrop.amount);
    ctx.drawImage(blurred, place.x, place.y, place.width, place.height);
  } else if (backdrop.kind === "image") {
    drawCover(ctx, backdrop.image, full);
  } else if (opaque) {
    ctx.fillStyle = options.output === "mask" ? "#000000" : "#ffffff";
    ctx.fillRect(0, 0, outW, outH);
  }
  ctx.drawImage(layer, place.x, place.y, place.width, place.height);
  return canvas;
}

export function canvasToBlob(canvas: HTMLCanvasElement, format: ExportFormat, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Export failed"));
        // Browsers silently fall back to PNG for unsupported types (WebP on old Safari).
        else resolve(blob);
      },
      format,
      format === "image/png" ? undefined : quality,
    );
  });
}

export function extensionFor(type: string): string {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/webp") return "webp";
  return "png";
}
