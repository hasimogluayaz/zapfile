import { intrinsicSize, parseSvg } from "../svg-to-png/svg";

export type Shape = "square" | "rounded" | "circle";
export type Fit = "contain" | "cover";

export interface Look {
  fit: Fit;
  /** Space around the artwork, as a fraction of the icon size (each side). */
  padding: number;
  /** Solid background, or null for transparent. */
  background: string | null;
  shape: Shape;
}

/**
 * standard: browser favicons + Android icons, exactly as designed.
 * apple:    iOS masks the icon itself and shows transparency as black, so it is
 *           always square and opaque.
 * maskable: opaque, artwork kept inside the 80 % safe-zone circle so any
 *           launcher mask (circle, squircle, teardrop) leaves it intact.
 */
export type Variant = "standard" | "apple" | "maskable";

/** Radius of the "rounded" shape, as a fraction of the icon size. */
export const ROUNDED_RADIUS = 0.22;

function shapePath(ctx: CanvasRenderingContext2D, size: number, shape: Shape) {
  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  } else {
    const r = shape === "rounded" ? size * ROUNDED_RADIUS : 0;
    ctx.moveTo(r, 0);
    ctx.arcTo(size, 0, size, size, r);
    ctx.arcTo(size, size, 0, size, r);
    ctx.arcTo(0, size, 0, 0, r);
    ctx.arcTo(0, 0, size, 0, r);
    ctx.closePath();
  }
}

export interface SourceLike {
  image: CanvasImageSource;
  width: number;
  height: number;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where the artwork goes inside an icon of `size` px. */
export function contentBox(size: number, aspect: number, look: Look, variant: Variant): Box {
  if (variant === "maskable" && look.fit === "contain") {
    // Largest rectangle of this aspect ratio inside the safe-zone circle (diameter 80 %).
    const d = size * 0.8;
    const h = d / Math.sqrt(1 + aspect * aspect);
    const w = h * aspect;
    return { x: (size - w) / 2, y: (size - h) / 2, w, h };
  }
  const inset = variant === "maskable" ? 0 : look.padding * size;
  return { x: inset, y: inset, w: size - inset * 2, h: size - inset * 2 };
}

/** Draws one icon variant at `size` px onto a new canvas. */
export function composeIcon(src: SourceLike, size: number, look: Look, variant: Variant): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const shape = variant === "standard" ? look.shape : "square";
  const background = variant === "standard" ? look.background : look.background ?? "#ffffff";
  shapePath(ctx, size, shape);
  ctx.clip();
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, size, size);
  }
  const aspect = src.width / src.height;
  const box = contentBox(size, aspect, look, variant);
  ctx.save();
  ctx.beginPath();
  ctx.rect(box.x, box.y, box.w, box.h);
  ctx.clip();
  const scale = look.fit === "cover" ? Math.max(box.w / src.width, box.h / src.height) : Math.min(box.w / src.width, box.h / src.height);
  const dw = src.width * scale;
  const dh = src.height * scale;
  ctx.drawImage(src.image, box.x + (box.w - dw) / 2, box.y + (box.h - dh) / 2, dw, dh);
  ctx.restore();
  return canvas;
}

function escapeAttr(v: string) {
  return v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * icon.svg for SVG sources: the original vector, wrapped with the chosen
 * background, padding and shape so it matches the PNG icons.
 */
export function buildIconSvg(text: string, look: Look): string | null {
  const plain = look.padding === 0 && !look.background && look.shape === "square" && look.fit === "contain";
  const parsed = parseSvg(text);
  if (!parsed) return null;
  if (plain) return new XMLSerializer().serializeToString(parsed.doc);
  const { root } = parsed;
  const size = intrinsicSize(root);
  if (!size.viewBox) root.setAttribute("viewBox", `0 0 ${size.width} ${size.height}`);
  const box = contentBox(100, size.width / size.height, look, "standard");
  root.setAttribute("x", String(box.x));
  root.setAttribute("y", String(box.y));
  root.setAttribute("width", String(box.w));
  root.setAttribute("height", String(box.h));
  root.setAttribute("preserveAspectRatio", look.fit === "cover" ? "xMidYMid slice" : "xMidYMid meet");
  const inner = new XMLSerializer().serializeToString(root);
  const r = look.shape === "rounded" ? 100 * ROUNDED_RADIUS : 0;
  const clip =
    look.shape === "circle" ? `<circle cx="50" cy="50" r="50"/>` : `<rect width="100" height="100" rx="${r}" ry="${r}"/>`;
  const bg = look.background ? `<rect width="100" height="100" fill="${escapeAttr(look.background)}"/>` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
    `<defs><clipPath id="zapfile-icon-shape">${clip}</clipPath></defs>` +
    `<g clip-path="url(#zapfile-icon-shape)">${bg}${inner}</g></svg>`
  );
}
