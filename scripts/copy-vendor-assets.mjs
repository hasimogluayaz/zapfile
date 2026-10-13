/**
 * Copies runtime assets that libraries load at runtime (workers, wasm, font
 * data) into public/vendor so they are served from our own origin instead of
 * a third-party CDN. Runs automatically before `dev` and `build`.
 *
 * Paths are versioned so a library upgrade never serves a stale worker.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const vendorRoot = path.join(root, "public", "vendor");

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dest = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  }
}

function pkgDir(name) {
  // Resolve via node_modules: some packages don't export ./package.json.
  const dir = path.join(root, "node_modules", name);
  if (!fs.existsSync(path.join(dir, "package.json"))) {
    throw new Error(`copy-vendor-assets: ${name} is not installed`);
  }
  return dir;
}

function pkgVersion(name) {
  return JSON.parse(fs.readFileSync(path.join(pkgDir(name), "package.json"), "utf8")).version;
}

// Start clean so removed versions don't linger in public/vendor.
fs.rmSync(vendorRoot, { recursive: true, force: true });

// ── pdf.js (legacy build: works on older Safari/iOS too) ─────────────────────
{
  const dir = pkgDir("pdfjs-dist");
  const out = path.join(vendorRoot, `pdfjs-${pkgVersion("pdfjs-dist")}`);
  fs.mkdirSync(out, { recursive: true });
  fs.copyFileSync(
    path.join(dir, "legacy", "build", "pdf.worker.min.mjs"),
    path.join(out, "pdf.worker.min.mjs"),
  );
  for (const sub of ["cmaps", "standard_fonts", "wasm", "iccs"]) {
    const src = path.join(dir, sub);
    if (fs.existsSync(src)) copyDir(src, path.join(out, sub));
  }
}

// ── onnxruntime-web (background remover) ────────────────────────────────────
// ort.webgpu runs on the asyncify build (WebGPU + WASM EPs); ort.wasm is the
// smaller CPU-only build used when the browser has no WebGPU.
{
  const dist = path.join(pkgDir("onnxruntime-web"), "dist");
  const out = path.join(vendorRoot, `ort-${pkgVersion("onnxruntime-web")}`);
  fs.mkdirSync(out, { recursive: true });
  for (const file of [
    "ort.webgpu.min.mjs",
    "ort-wasm-simd-threaded.asyncify.mjs",
    "ort-wasm-simd-threaded.asyncify.wasm",
    "ort.wasm.min.mjs",
    "ort-wasm-simd-threaded.mjs",
    "ort-wasm-simd-threaded.wasm",
  ]) {
    fs.copyFileSync(path.join(dist, file), path.join(out, file));
  }
}

// ── Anton (meme generator's Impact-style font, SIL OFL) ─────────────────────
{
  const dir = pkgDir("@fontsource/anton");
  const out = path.join(vendorRoot, `anton-${pkgVersion("@fontsource/anton")}`);
  fs.mkdirSync(out, { recursive: true });
  for (const subset of ["latin", "latin-ext"]) {
    const file = `anton-${subset}-400-normal.woff2`;
    fs.copyFileSync(path.join(dir, "files", file), path.join(out, file));
  }
  fs.copyFileSync(path.join(dir, "LICENSE"), path.join(out, "LICENSE"));
}

console.log("vendor assets copied to public/vendor");
