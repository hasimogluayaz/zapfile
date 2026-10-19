/** Collage geometry. Pure: works in a reference space whose long side is 1000, scaled at draw time. */

export type TemplateId = "grid" | "feature-left" | "feature-top" | "columns" | "rows" | "mosaic";
export const TEMPLATES: TemplateId[] = ["grid", "feature-left", "feature-top", "columns", "rows", "mosaic"];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const REF = 1000;

/** `k` cells inside `r`, `cols` per row, a short last row stretched so no cell is left empty. */
function gridIn(r: Rect, k: number, cols: number): Rect[] {
  const rows = Math.ceil(k / cols);
  const out: Rect[] = [];
  for (let row = 0; row < rows; row++) {
    const inRow = row === rows - 1 ? k - cols * (rows - 1) : cols;
    for (let c = 0; c < inRow; c++) out.push({ x: r.x + (c / inRow) * r.w, y: r.y + (row / rows) * r.h, w: r.w / inRow, h: r.h / rows });
  }
  return out;
}

/** Normalised (0–1) cells for a fixed template; `aspect` is canvas width / height. */
export function templateCells(id: Exclude<TemplateId, "mosaic">, n: number, aspect: number): Rect[] {
  const full: Rect = { x: 0, y: 0, w: 1, h: 1 };
  if (n <= 1) return [full];
  switch (id) {
    case "columns":
      return gridIn(full, n, n);
    case "rows":
      return gridIn(full, n, 1);
    case "feature-left": {
      const fw = n === 2 ? 0.5 : 0.6;
      const rest = n - 1;
      return [{ x: 0, y: 0, w: fw, h: 1 }, ...gridIn({ x: fw, y: 0, w: 1 - fw, h: 1 }, rest, rest <= 3 ? 1 : 2)];
    }
    case "feature-top": {
      const fh = n === 2 ? 0.5 : 0.62;
      const rest = n - 1;
      const rows = rest <= 4 ? 1 : 2;
      return [{ x: 0, y: 0, w: 1, h: fh }, ...gridIn({ x: 0, y: fh, w: 1, h: 1 - fh }, rest, Math.ceil(rest / rows))];
    }
    default: {
      // Cells as close to square as the canvas allows.
      let best = 1, bestScore = Infinity;
      for (let cols = 1; cols <= n; cols++) {
        const rows = Math.ceil(n / cols);
        const cellAspect = aspect * (rows / cols);
        const score = Math.abs(Math.log(cellAspect)) + (cols * rows - n) * 0.35;
        if (score <= bestScore + 1e-9) {
          bestScore = score;
          best = cols;
        }
      }
      return gridIn(full, n, best);
    }
  }
}

/** Split images (in order) into rows whose aspect sums are as even as possible. */
export function mosaicRows(aspects: number[], rows: number): number[][] {
  const n = aspects.length;
  rows = Math.max(1, Math.min(n, rows));
  const pre = [0];
  for (const a of aspects) pre.push(pre[pre.length - 1]! + a);
  const target = pre[n]! / rows;
  // cost[r][i]: best cost of putting the first i images into r rows.
  const cost = Array.from({ length: rows + 1 }, () => new Array<number>(n + 1).fill(Infinity));
  const cut = Array.from({ length: rows + 1 }, () => new Array<number>(n + 1).fill(0));
  cost[0]![0] = 0;
  for (let r = 1; r <= rows; r++)
    for (let i = r; i <= n; i++)
      for (let j = r - 1; j < i; j++) {
        const c = cost[r - 1]![j]! + (pre[i]! - pre[j]! - target) ** 2;
        if (c < cost[r]![i]!) {
          cost[r]![i] = c;
          cut[r]![i] = j;
        }
      }
  const out: number[][] = [];
  let i = n;
  for (let r = rows; r >= 1; r--) {
    const j = cut[r]![i]!;
    out.unshift(Array.from({ length: i - j }, (_, k) => j + k));
    i = j;
  }
  return out;
}

export interface LayoutInput {
  template: TemplateId;
  /** Width / height of each image, in order. */
  aspects: number[];
  /** Canvas width / height (ignored by mosaic, which sizes itself). */
  aspect: number;
  /** Spacing between cells and around the edge, in reference px. */
  gap: number;
  padding: number;
  /** Mosaic rows; 0 = automatic. */
  rows: number;
}

export interface Layout {
  width: number;
  height: number;
  cells: Rect[];
}

/** Pixel layout in reference space (long side = REF). */
export function computeLayout(o: LayoutInput): Layout {
  const n = o.aspects.length;
  if (o.template === "mosaic") {
    const sum = o.aspects.reduce((a, b) => a + b, 0);
    const groups = mosaicRows(o.aspects, o.rows || Math.max(1, Math.round(Math.sqrt(sum))));
    // Lay out at width REF, then scale so the long side is REF.
    const W = REF, inner = W - 2 * o.padding;
    let y = o.padding;
    const cells: Rect[] = new Array(n);
    groups.forEach((g, gi) => {
      const s = g.reduce((a, i) => a + o.aspects[i]!, 0);
      const h = (inner - (g.length - 1) * o.gap) / s;
      let x = o.padding;
      g.forEach((i) => {
        const w = o.aspects[i]! * h;
        cells[i] = { x, y, w, h };
        x += w + o.gap;
      });
      y += h + (gi < groups.length - 1 ? o.gap : 0);
    });
    const H = y + o.padding;
    const k = H > W ? REF / H : 1;
    return { width: W * k, height: H * k, cells: k === 1 ? cells : cells.map((c) => ({ x: c.x * k, y: c.y * k, w: c.w * k, h: c.h * k })) };
  }
  const W = o.aspect >= 1 ? REF : REF * o.aspect;
  const H = o.aspect >= 1 ? REF / o.aspect : REF;
  const iw = W - 2 * o.padding, ih = H - 2 * o.padding;
  // Map 0–1 rects onto the inner box widened by one gap, then trim a gap: shared edges get exactly one gap.
  const cells = templateCells(o.template, n, iw / ih).map((r) => ({
    x: o.padding + r.x * (iw + o.gap),
    y: o.padding + r.y * (ih + o.gap),
    w: r.w * (iw + o.gap) - o.gap,
    h: r.h * (ih + o.gap) - o.gap,
  }));
  return { width: W, height: H, cells };
}

export interface Framing {
  /** Focal point 0–1 used when the image overflows its cell. */
  px: number;
  py: number;
  /** ≥ 1, on top of the cover scale. */
  zoom: number;
}

/** Where to draw an image of iw×ih inside `cell`: cover (with pan/zoom) or contain. */
export function placeImage(cell: Rect, iw: number, ih: number, fit: "cover" | "contain", f: Framing): Rect {
  if (fit === "contain") {
    const s = Math.min(cell.w / iw, cell.h / ih);
    const w = iw * s, h = ih * s;
    return { x: cell.x + (cell.w - w) / 2, y: cell.y + (cell.h - h) / 2, w, h };
  }
  const s = Math.max(cell.w / iw, cell.h / ih) * Math.max(1, f.zoom);
  const w = iw * s, h = ih * s;
  return { x: cell.x - (w - cell.w) * f.px, y: cell.y - (h - cell.h) * f.py, w, h };
}

export function hitCell(cells: Rect[], x: number, y: number): number {
  return cells.findIndex((c) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h);
}
