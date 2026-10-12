/**
 * Region rendering for the Blur Image tool. Geometry is stored normalised
 * (0–1 of the image) and every radius is relative to the region or image
 * size, so the on-screen proxy and the full-resolution export look the same.
 */
import { blurCanvas, blurRect, ctx2d, makeCanvas, releaseCanvas } from "@/lib/image-editor-kit";

export type Shape = "rect" | "ellipse" | "brush";
export type Effect = "blur" | "pixelate" | "blackout";

export interface Region {
  id: string;
  shape: Shape;
  effect: Effect;
  /** 1–100 */
  strength: number;
  /** 0–100, grows outward so the region itself stays fully covered. */
  feather: number;
  /** rect / ellipse box, normalised to image width/height. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** brush: flat [x0, y0, x1, y1, …] normalised. */
  points?: number[];
  /** brush diameter, normalised to the image's long side. */
  size?: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Bounding box in pixels for an image of W×H. */
export function regionBox(r: Region, W: number, H: number): Box {
  if (r.shape === "brush" && r.points && r.points.length >= 2) {
    const rad = ((r.size ?? 0.04) * Math.max(W, H)) / 2;
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < r.points.length; i += 2) {
      const px = r.points[i] * W;
      const py = r.points[i + 1] * H;
      if (px < x0) x0 = px;
      if (px > x1) x1 = px;
      if (py < y0) y0 = py;
      if (py > y1) y1 = py;
    }
    return { x: x0 - rad, y: y0 - rad, w: x1 - x0 + rad * 2, h: y1 - y0 + rad * 2 };
  }
  return { x: r.x * W, y: r.y * H, w: r.w * W, h: r.h * H };
}

/** Characteristic size the effect strength is relative to. */
function baseSize(r: Region, b: Box, W: number, H: number): number {
  if (r.shape === "brush") return (r.size ?? 0.04) * Math.max(W, H);
  return Math.max(1, Math.min(b.w, b.h));
}

/** Fill the region's shape (optionally grown by `grow` px) into ctx, scaled by 1/s. */
function fillShape(ctx: CanvasRenderingContext2D, r: Region, W: number, H: number, ox: number, oy: number, s: number, grow: number) {
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#000";
  if (r.shape === "brush" && r.points && r.points.length >= 2) {
    const width = ((r.size ?? 0.04) * Math.max(W, H) + grow * 2) / s;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    const px = (i: number) => (r.points![i] * W - ox) / s;
    const py = (i: number) => (r.points![i + 1] * H - oy) / s;
    if (r.points.length === 2) {
      ctx.arc(px(0), py(0), width / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.moveTo(px(0), py(0));
    for (let i = 2; i < r.points.length; i += 2) ctx.lineTo(px(i), py(i));
    ctx.stroke();
    return;
  }
  const b = regionBox(r, W, H);
  ctx.beginPath();
  if (r.shape === "ellipse") {
    ctx.ellipse(
      (b.x + b.w / 2 - ox) / s,
      (b.y + b.h / 2 - oy) / s,
      Math.max(0.5, (b.w / 2 + grow) / s),
      Math.max(0.5, (b.h / 2 + grow) / s),
      0,
      0,
      Math.PI * 2,
    );
  } else {
    ctx.rect((b.x - grow - ox) / s, (b.y - grow - oy) / s, (b.w + grow * 2) / s, (b.h + grow * 2) / s);
  }
  ctx.fill();
}

/** Apply one region on top of what the canvas already shows (overlaps stay covered). */
export function renderRegion(ctx: CanvasRenderingContext2D, W: number, H: number, r: Region): void {
  const b = regionBox(r, W, H);
  if (b.w < 1 || b.h < 1) return;
  const base = baseSize(r, b, W, H);
  const s = Math.max(0, Math.min(1, r.strength / 100));
  const feather = (r.feather / 100) * 0.5 * base;
  const ax = Math.max(0, Math.floor(b.x - feather));
  const ay = Math.max(0, Math.floor(b.y - feather));
  const aw = Math.min(W, Math.ceil(b.x + b.w + feather)) - ax;
  const ah = Math.min(H, Math.ceil(b.y + b.h + feather)) - ay;
  if (aw < 1 || ah < 1) return;
  const src = ctx.canvas;
  const long = Math.max(W, H);

  let effect: HTMLCanvasElement;
  if (r.effect === "blur") {
    const radius = Math.max(2, Math.min(0.06 * long, (0.06 + 0.34 * s) * base));
    effect = blurRect(src, W, H, ax, ay, aw, ah, radius);
  } else if (r.effect === "pixelate") {
    const block = Math.max(3, (0.05 + 0.25 * s) * base);
    const sw = Math.max(1, Math.ceil(aw / block));
    const sh = Math.max(1, Math.ceil(ah / block));
    const small = makeCanvas(sw, sh);
    ctx2d(small).drawImage(src, ax, ay, aw, ah, 0, 0, sw, sh);
    effect = makeCanvas(aw, ah);
    const ec = ctx2d(effect);
    ec.imageSmoothingEnabled = false;
    ec.drawImage(small, 0, 0, aw, ah);
    releaseCanvas(small);
  } else {
    effect = makeCanvas(aw, ah);
    const ec = ctx2d(effect);
    ec.fillStyle = "#000";
    ec.fillRect(0, 0, aw, ah);
  }

  const needsMask = !(r.shape === "rect" && feather < 0.5);
  if (needsMask) {
    const ec = ctx2d(effect);
    ec.globalCompositeOperation = "destination-in";
    if (feather >= 0.5) {
      // Soft edge: shape grown by f/2, blurred by f/4 → ~98 % at the shape edge,
      // ~2 % at the outer border. Computed at reduced scale (it's smooth anyway).
      const m = Math.max(1, feather / 6);
      const mask = makeCanvas(aw / m, ah / m);
      fillShape(ctx2d(mask), r, W, H, ax, ay, m, feather / 2);
      const soft = blurCanvas(mask, feather / 4 / m);
      ec.drawImage(soft, 0, 0, aw, ah);
      releaseCanvas(mask);
      releaseCanvas(soft);
    } else {
      const mask = makeCanvas(aw, ah);
      fillShape(ctx2d(mask), r, W, H, ax, ay, 1, 0);
      ec.drawImage(mask, 0, 0);
      releaseCanvas(mask);
    }
    ec.globalCompositeOperation = "source-over";
  }
  ctx.drawImage(effect, ax, ay);
  releaseCanvas(effect);
}

/** Distance-based hit test in pixel space (tolerance in px). */
export function hitTest(r: Region, px: number, py: number, W: number, H: number, tol: number): boolean {
  if (r.shape === "brush" && r.points) {
    const rad = ((r.size ?? 0.04) * Math.max(W, H)) / 2 + tol;
    const pts = r.points;
    if (pts.length === 2) return Math.hypot(px - pts[0] * W, py - pts[1] * H) <= rad;
    for (let i = 2; i < pts.length; i += 2) {
      const ax = pts[i - 2] * W;
      const ay = pts[i - 1] * H;
      const bx = pts[i] * W;
      const by = pts[i + 1] * H;
      const dx = bx - ax;
      const dy = by - ay;
      const len = dx * dx + dy * dy;
      const t = len ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len)) : 0;
      if (Math.hypot(px - (ax + dx * t), py - (ay + dy * t)) <= rad) return true;
    }
    return false;
  }
  const b = regionBox(r, W, H);
  if (r.shape === "ellipse") {
    const rx = b.w / 2 + tol;
    const ry = b.h / 2 + tol;
    const nx = (px - (b.x + b.w / 2)) / rx;
    const ny = (py - (b.y + b.h / 2)) / ry;
    return nx * nx + ny * ny <= 1;
  }
  return px >= b.x - tol && px <= b.x + b.w + tol && py >= b.y - tol && py <= b.y + b.h + tol;
}
