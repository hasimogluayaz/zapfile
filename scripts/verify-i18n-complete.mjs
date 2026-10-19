// Every language must translate every string the site actually shows, and keep
// its {placeholders}. Loads src/lib/i18n-dicts/all.ts through the TypeScript compiler.
import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const ts = require("typescript");

// Minimal require hook: .ts/.tsx → CommonJS, "@/…" → src/…
for (const ext of [".ts", ".tsx"]) {
  Module._extensions[ext] = (module, filename) => {
    const source = fs.readFileSync(filename, "utf8");
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: filename,
    });
    module._compile(outputText, filename);
  };
}
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request.startsWith("@/")) request = path.join(root, "src", request.slice(2));
  return resolve.call(this, request, ...rest);
};

const { untranslatedKeys, allTranslations } = require(path.join(root, "src/lib/i18n-dicts/all.ts"));
const { SUPPORTED_LOCALES } = require(path.join(root, "src/lib/locales.ts"));

// Keys the code uses: quoted literally, or under a prefix built with a template (t(`qr.v2.${…}`)).
const dictionaryFiles = new Set(
  ["i18n-partial-static-pages.ts", "i18n-partial-blog-chrome.ts"].map((f) =>
    path.join(root, "src/lib", f),
  ),
);
let code = "";
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "i18n-completions" && entry.name !== "i18n-dicts") walk(p);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !dictionaryFiles.has(p)) {
      code += fs.readFileSync(p, "utf8") + "\n";
    }
  }
})(path.join(root, "src"));
const prefixes = [...code.matchAll(/`([a-zA-Z][a-zA-Z0-9_.-]*\.)\$\{/g)].map((m) => m[1]);
const used = (key) =>
  code.includes(`"${key}"`) || code.includes(`'${key}'`) || code.includes(`\`${key}\``) || prefixes.some((p) => key.startsWith(p));

const all = allTranslations();
const placeholders = (s) => [...s.matchAll(/\{([a-zA-Z]\w*)\}/g)].map((m) => m[1]).sort().join(",");
let failed = false;
for (const locale of SUPPORTED_LOCALES) {
  if (locale === "en") continue;
  const missing = untranslatedKeys(locale).filter(used);
  const broken = Object.keys(all.en).filter((k) => placeholders(all.en[k]) !== placeholders(all[locale][k]));
  if (missing.length || broken.length) failed = true;
  console.log(
    `${locale}: ${missing.length ? `${missing.length} untranslated (${missing.slice(0, 5).join(", ")}…)` : "complete"}` +
      (broken.length ? `, placeholders differ in ${broken.slice(0, 5).join(", ")}` : ""),
  );
}
if (failed) process.exit(1);
