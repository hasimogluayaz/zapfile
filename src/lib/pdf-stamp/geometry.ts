/**
 * Placement maths shared by stamp-like PDF tools (watermark, signature, text). Everything is in the
 * page's *visible* frame (what a viewer shows: crop box, /Rotate applied), in points, y up, so the
 * preview canvas and the pdf-lib writer agree. `toUser` maps back to PDF user space.
 */

export interface Frame {
  /** Crop box in user space. */
  box: { x: number; y: number; width: number; height: number };
  rotation: 0 | 90 | 180 | 270;
  /** Visible size. */
  width: number;
  height: number;
}

export function normalizeRotation(angle: number): 0 | 90 | 180 | 270 {
  return ((((Math.round(angle / 90) * 90) % 360) + 360) % 360) as 0 | 90 | 180 | 270;
}

export function makeFrame(box: Frame["box"], rotationAngle: number): Frame {
  const rotation = normalizeRotation(rotationAngle);
  const turned = rotation === 90 || rotation === 270;
  return { box, rotation, width: turned ? box.height : box.width, height: turned ? box.width : box.height };
}

/** Visible point (y up from the bottom-left) → user space; `angle` is what to add to a drawing's rotation. */
export function toUser(vx: number, vy: number, f: Frame): { x: number; y: number; angle: number } {
  const { box } = f;
  switch (f.rotation) {
    case 90:
      return { x: box.x + box.width - vy, y: box.y + vx, angle: 90 };
    case 180:
      return { x: box.x + box.width - vx, y: box.y + box.height - vy, angle: 180 };
    case 270:
      return { x: box.x + vy, y: box.y + box.height - vx, angle: 270 };
    default:
      return { x: box.x + vx, y: box.y + vy, angle: 0 };
  }
}

/** Rotate a local offset (y up) counter-clockwise by `deg`. */
export function rotateVec(dx: number, dy: number, deg: number): [number, number] {
  const r = (deg * Math.PI) / 180;
  return [dx * Math.cos(r) - dy * Math.sin(r), dx * Math.sin(r) + dy * Math.cos(r)];
}

/** Axis-aligned size of a w×h box rotated by `deg`. */
export function rotatedExtent(w: number, h: number, deg: number): [number, number] {
  const r = (deg * Math.PI) / 180;
  const c = Math.abs(Math.cos(r)), s = Math.abs(Math.sin(r));
  return [w * c + h * s, w * s + h * c];
}

export type Anchor = "tl" | "tc" | "tr" | "ml" | "mc" | "mr" | "bl" | "bc" | "br";
export const ANCHORS: Anchor[] = ["tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br"];

/**
 * Centres (visible frame, y up) for an item of w×h rotated by `deg`: one at an anchor, or a staggered
 * tile pattern covering the page. `margin` and `gap` are in points.
 */
export function placements(
  pageW: number,
  pageH: number,
  w: number,
  h: number,
  deg: number,
  where: Anchor | "tile",
  margin: number,
  gap: number,
): { x: number; y: number }[] {
  const [ew, eh] = rotatedExtent(w, h, deg);
  if (where === "tile") {
    const stepX = ew + gap, stepY = eh + gap;
    const out: { x: number; y: number }[] = [];
    // Centre the pattern on the page; odd rows shift by half a step (brick layout).
    const cols = Math.ceil(pageW / stepX) + 2, rows = Math.ceil(pageH / stepY) + 2;
    const x0 = pageW / 2 - Math.floor(cols / 2) * stepX, y0 = pageH / 2 - Math.floor(rows / 2) * stepY;
    for (let r = 0; r <= rows; r++) {
      const y = y0 + r * stepY;
      const shift = r % 2 ? stepX / 2 : 0;
      for (let c = -1; c <= cols; c++) {
        const x = x0 + c * stepX + shift;
        if (x + ew / 2 > 0 && x - ew / 2 < pageW && y + eh / 2 > 0 && y - eh / 2 < pageH) out.push({ x, y });
      }
    }
    return out;
  }
  const col = where[1] === "l" ? 0 : where[1] === "c" ? 1 : 2;
  const row = where[0] === "t" ? 0 : where[0] === "m" ? 1 : 2;
  const x = col === 0 ? margin + ew / 2 : col === 1 ? pageW / 2 : pageW - margin - ew / 2;
  const y = row === 0 ? pageH - margin - eh / 2 : row === 1 ? pageH / 2 : margin + eh / 2;
  return [{ x, y }];
}

/** Lines of a centred text block: x offset of each line's start and its baseline (y up), relative to the centre. */
export function textBlock(
  widths: number[],
  size: number,
  ascent: number,
  descent: number,
  lineHeight = 1.2,
): { w: number; h: number; lines: { dx: number; dy: number }[] } {
  const lh = size * lineHeight;
  const w = Math.max(0, ...widths);
  const h = lh * widths.length;
  const lines = widths.map((lw, i) => {
    const top = h / 2 - i * lh;
    const baseline = top - (lh - (ascent + descent)) / 2 - ascent;
    return { dx: -lw / 2, dy: baseline };
  });
  return { w, h, lines };
}

export function hexToRgb01(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean.padEnd(6, "0").slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return [0.4, 0.4, 0.4];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
