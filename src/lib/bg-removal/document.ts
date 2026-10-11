/**
 * Editable cutout: the original photo, the current RGBA result, brush
 * editing with tile-based undo/redo, and the derived output images.
 *
 * Colours are straight (non-premultiplied) alpha throughout.
 */

export type BrushMode = "erase" | "restore";
export type OutputKind = "subject" | "mask" | "background";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const TILE = 128;

interface TilePatch {
  tile: number;
  before: Uint8ClampedArray;
  after: Uint8ClampedArray;
}

interface StrokeState {
  mode: BrushMode;
  radius: number;
  hardness: number;
  /** Per-tile pixel data at stroke start (lazily captured). */
  backups: Map<number, Uint8ClampedArray>;
  /** Per-tile max brush coverage within this stroke (0–255). */
  coverage: Map<number, Uint8Array>;
  last: { x: number; y: number } | null;
}

export class CutoutDocument {
  readonly width: number;
  readonly height: number;
  /** Original photo pixels (never modified). */
  readonly original: Uint8ClampedArray;
  /** Current cutout pixels (RGB + alpha), edited in place. */
  readonly pixels: Uint8ClampedArray;
  private readonly tilesX: number;
  private readonly tilesY: number;
  private undoStack: TilePatch[][] = [];
  private redoStack: TilePatch[][] = [];
  private stroke: StrokeState | null = null;
  /** Increments on every change; lets views know when to redraw. */
  version = 0;

  constructor(original: Uint8ClampedArray, cutout: Uint8ClampedArray, width: number, height: number) {
    this.width = width;
    this.height = height;
    this.original = original;
    this.pixels = cutout;
    this.tilesX = Math.ceil(width / TILE);
    this.tilesY = Math.ceil(height / TILE);
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }
  get canRedo() {
    return this.redoStack.length > 0;
  }
  get isEdited() {
    return this.undoStack.length > 0;
  }

  /** Replace the whole cutout (e.g. after re-refining); clears history. */
  replace(cutout: Uint8ClampedArray) {
    this.pixels.set(cutout);
    this.undoStack = [];
    this.redoStack = [];
    this.version++;
  }

  // ── Tiles ──────────────────────────────────────────────────────────────

  private tileRect(tile: number): Rect {
    const tx = tile % this.tilesX;
    const ty = (tile - tx) / this.tilesX;
    const x = tx * TILE;
    const y = ty * TILE;
    return { x, y, width: Math.min(TILE, this.width - x), height: Math.min(TILE, this.height - y) };
  }

  private readTile(tile: number): Uint8ClampedArray {
    const r = this.tileRect(tile);
    const out = new Uint8ClampedArray(r.width * r.height * 4);
    for (let row = 0; row < r.height; row++) {
      const start = ((r.y + row) * this.width + r.x) * 4;
      out.set(this.pixels.subarray(start, start + r.width * 4), row * r.width * 4);
    }
    return out;
  }

  private writeTile(tile: number, data: Uint8ClampedArray) {
    const r = this.tileRect(tile);
    for (let row = 0; row < r.height; row++) {
      const start = ((r.y + row) * this.width + r.x) * 4;
      this.pixels.set(data.subarray(row * r.width * 4, (row + 1) * r.width * 4), start);
    }
  }

  private tilesBounds(tiles: number[]): Rect | null {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const t of tiles) {
      const r = this.tileRect(t);
      x0 = Math.min(x0, r.x);
      y0 = Math.min(y0, r.y);
      x1 = Math.max(x1, r.x + r.width);
      y1 = Math.max(y1, r.y + r.height);
    }
    return x0 === Infinity ? null : { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  }

  // ── Brush ──────────────────────────────────────────────────────────────

  beginStroke(mode: BrushMode, radius: number, hardness: number) {
    this.stroke = {
      mode,
      radius: Math.max(0.5, radius),
      hardness: Math.min(0.99, Math.max(0, hardness)),
      backups: new Map(),
      coverage: new Map(),
      last: null,
    };
  }

  /**
   * Extend the current stroke to (x, y) in image pixels. Returns the dirty
   * rectangle to redraw, or null when nothing changed.
   */
  strokeTo(x: number, y: number): Rect | null {
    const s = this.stroke;
    if (!s) return null;
    const from = s.last ?? { x, y };
    s.last = { x, y };
    const dist = Math.hypot(x - from.x, y - from.y);
    const spacing = Math.max(0.5, s.radius * 0.2);
    const steps = Math.max(1, Math.ceil(dist / spacing));
    let dirty: Rect | null = null;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const r = this.stamp(from.x + (x - from.x) * t, from.y + (y - from.y) * t);
      if (r) dirty = union(dirty, r);
    }
    if (dirty) this.version++;
    return dirty;
  }

  private stamp(cx: number, cy: number): Rect | null {
    const s = this.stroke!;
    const r = s.radius;
    const x0 = Math.max(0, Math.floor(cx - r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const x1 = Math.min(this.width - 1, Math.ceil(cx + r));
    const y1 = Math.min(this.height - 1, Math.ceil(cy + r));
    if (x0 > x1 || y0 > y1) return null;
    const W = this.width;
    const px = this.pixels;
    const orig = this.original;
    const hard = s.hardness;

    for (let y = y0; y <= y1; y++) {
      const ty = Math.floor(y / TILE);
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
        if (d >= 1) continue;
        // Solid core up to `hardness`, smooth falloff to the rim.
        let f = 1;
        if (d > hard) {
          const u = (d - hard) / (1 - hard);
          f = 1 - u * u * (3 - 2 * u);
        }
        const cov = Math.round(f * 255);
        if (cov <= 0) continue;

        const tx = Math.floor(x / TILE);
        const tile = ty * this.tilesX + tx;
        let backup = s.backups.get(tile);
        let coverage = s.coverage.get(tile);
        if (!backup || !coverage) {
          backup = this.readTile(tile);
          coverage = new Uint8Array(TILE * TILE);
          s.backups.set(tile, backup);
          s.coverage.set(tile, coverage);
        }
        const tileX = tx * TILE;
        const tileW = Math.min(TILE, W - tileX);
        const li = (y - ty * TILE) * tileW + (x - tileX);
        if (cov <= coverage[li]) continue;
        coverage[li] = cov;

        const c = cov / 255;
        const b = li * 4;
        const o = (y * W + x) * 4;
        const a0 = backup[b + 3] / 255;
        if (s.mode === "erase") {
          px[o + 3] = Math.round(a0 * (1 - c) * 255);
        } else {
          // Blend toward the original photo, fully opaque at full coverage.
          const a = a0 + (1 - a0) * c;
          px[o + 3] = Math.round(a * 255);
          if (a > 0) {
            const wOld = (a0 * (1 - c)) / a;
            const wOrig = 1 - wOld;
            px[o] = backup[b] * wOld + orig[o] * wOrig;
            px[o + 1] = backup[b + 1] * wOld + orig[o + 1] * wOrig;
            px[o + 2] = backup[b + 2] * wOld + orig[o + 2] * wOrig;
          }
        }
      }
    }
    return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
  }

  endStroke() {
    const s = this.stroke;
    this.stroke = null;
    if (!s || s.backups.size === 0) return;
    const patches: TilePatch[] = [];
    s.backups.forEach((before, tile) => {
      patches.push({ tile, before, after: this.readTile(tile) });
    });
    this.undoStack.push(patches);
    if (this.undoStack.length > 60) this.undoStack.shift();
    this.redoStack = [];
  }

  undo(): Rect | null {
    const patches = this.undoStack.pop();
    if (!patches) return null;
    for (const p of patches) this.writeTile(p.tile, p.before);
    this.redoStack.push(patches);
    this.version++;
    return this.tilesBounds(patches.map((p) => p.tile));
  }

  redo(): Rect | null {
    const patches = this.redoStack.pop();
    if (!patches) return null;
    for (const p of patches) this.writeTile(p.tile, p.after);
    this.undoStack.push(patches);
    this.version++;
    return this.tilesBounds(patches.map((p) => p.tile));
  }

  // ── Outputs ────────────────────────────────────────────────────────────

  /** Write `kind` output pixels for `rect` into `target` (full-size RGBA buffer). */
  renderOutput(kind: OutputKind, target: Uint8ClampedArray, rect?: Rect) {
    const r = rect ?? { x: 0, y: 0, width: this.width, height: this.height };
    const W = this.width;
    const src = this.pixels;
    const orig = this.original;
    for (let y = r.y; y < r.y + r.height; y++) {
      let o = (y * W + r.x) * 4;
      for (let x = 0; x < r.width; x++, o += 4) {
        const a = src[o + 3];
        if (kind === "subject") {
          target[o] = src[o];
          target[o + 1] = src[o + 1];
          target[o + 2] = src[o + 2];
          target[o + 3] = a;
        } else if (kind === "mask") {
          target[o] = target[o + 1] = target[o + 2] = a;
          target[o + 3] = 255;
        } else {
          target[o] = orig[o];
          target[o + 1] = orig[o + 1];
          target[o + 2] = orig[o + 2];
          target[o + 3] = 255 - a;
        }
      }
    }
  }

  /** Bounding box of pixels with alpha ≥ `threshold` (for "crop to subject"). */
  subjectBounds(threshold = 8): Rect | null {
    const W = this.width;
    const H = this.height;
    const px = this.pixels;
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) {
      let o = y * W * 4 + 3;
      for (let x = 0; x < W; x++, o += 4) {
        if (px[o] >= threshold) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          y1 = y;
        }
      }
    }
    return x1 < 0 ? null : { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
  }
}

export function union(a: Rect | null, b: Rect): Rect {
  if (!a) return { ...b };
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(a.x + a.width, b.x + b.width) - x,
    height: Math.max(a.y + a.height, b.y + b.height) - y,
  };
}
