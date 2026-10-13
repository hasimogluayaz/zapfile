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

// ── LibreOffice WebAssembly (Word/Excel/PowerPoint → PDF) ────────────────────
// Only the small loader scripts: soffice.wasm/.data are too big for a deployment
// and are fetched from models/libreoffice-<version>/ at runtime (see src/lib/office).
{
  const dir = pkgDir("@matbee/libreoffice-converter");
  const out = path.join(vendorRoot, `libreoffice-${pkgVersion("@matbee/libreoffice-converter")}`);
  fs.mkdirSync(out, { recursive: true });
  for (const [from, to] of [
    ["wasm/soffice.js", "soffice.js"],
    ["wasm/soffice.worker.js", "soffice.worker.js"],
  ]) {
    fs.copyFileSync(path.join(dir, from), path.join(out, to));
  }
  // Serve the engine parts from our own origin too, when the deployment includes models/ (see .vercelignore).
  const parts = path.join(root, "models", `libreoffice-${pkgVersion("@matbee/libreoffice-converter")}`);
  if (fs.existsSync(parts)) {
    fs.mkdirSync(path.join(out, "engine"), { recursive: true });
    for (const f of fs.readdirSync(parts).filter((n) => n.endsWith(".bin"))) fs.copyFileSync(path.join(parts, f), path.join(out, "engine", f));
  }
  // The worker logs every LibreOffice step to the console; keep errors, drop the chatter.
  const worker = fs.readFileSync(path.join(dir, "dist/browser.worker.global.js"), "utf8");
  const quiet = worker.replace("print:console.log,printErr:console.error", "print:()=>{},printErr:()=>{}");
  if (quiet === worker) throw new Error("copy-vendor-assets: LibreOffice worker log hook not found");
  fs.writeFileSync(
    path.join(out, "browser.worker.js"),
    `self.console.log=()=>{};self.console.info=()=>{};self.console.debug=()=>{};\n${quiet}`,
  );
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

// ── Tesseract OCR (worker + LSTM cores; language data lives in public/tessdata) ──
{
  const out = path.join(vendorRoot, `tesseract-${pkgVersion("tesseract.js")}`);
  fs.mkdirSync(out, { recursive: true });
  fs.copyFileSync(path.join(pkgDir("tesseract.js"), "dist", "worker.min.js"), path.join(out, "worker.min.js"));
  const core = pkgDir("tesseract.js-core");
  for (const f of ["tesseract-core-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js", "tesseract-core-relaxedsimd-lstm.wasm.js"]) {
    fs.copyFileSync(path.join(core, f), path.join(out, f));
  }
}

// ── PDF text fonts (DejaVu, Bitstream Vera licence) and signature fonts (OFL) ──
{
  const dir = pkgDir("dejavu-fonts-ttf");
  const out = path.join(vendorRoot, `dejavu-${pkgVersion("dejavu-fonts-ttf")}`);
  fs.mkdirSync(out, { recursive: true });
  for (const f of ["DejaVuSans.ttf", "DejaVuSans-Bold.ttf", "DejaVuSerif.ttf", "DejaVuSerif-Bold.ttf", "DejaVuSansMono.ttf"]) {
    fs.copyFileSync(path.join(dir, "ttf", f), path.join(out, f));
  }
  fs.copyFileSync(path.join(dir, "LICENSE"), path.join(out, "LICENSE"));
  for (const [pkg, file] of [
    ["@fontsource/dancing-script", "dancing-script"],
    ["@fontsource/great-vibes", "great-vibes"],
    ["@fontsource/caveat", "caveat"],
  ]) {
    const fdir = pkgDir(pkg);
    const fout = path.join(vendorRoot, `${file}-${pkgVersion(pkg)}`);
    fs.mkdirSync(fout, { recursive: true });
    for (const subset of ["latin", "latin-ext"]) {
      const name = `${file}-${subset}-400-normal.woff2`;
      fs.copyFileSync(path.join(fdir, "files", name), path.join(fout, name));
    }
    fs.copyFileSync(path.join(fdir, "LICENSE"), path.join(fout, "LICENSE"));
  }
}

console.log("vendor assets copied to public/vendor");
