/**
 * Copies runtime assets that libraries load at runtime (workers, wasm, font
 * data) into public/vendor so they are served from our own origin instead of
 * a third-party CDN. Runs automatically before `dev` and `build`.
 *
 * Paths are versioned so a library upgrade never serves a stale worker.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
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
  return path.dirname(require.resolve(`${name}/package.json`));
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

console.log("vendor assets copied to public/vendor");
