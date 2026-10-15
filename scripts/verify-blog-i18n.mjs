// Every blog post must have a body in every language, with the same section
// structure as the English original and only links to tools that exist.
import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const ts = require("typescript");

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

const { getAllPosts } = require(path.join(root, "src/lib/blog.ts"));
const { tools } = require(path.join(root, "src/lib/tools.ts"));
const { TOOL_URL_LOCALES } = require(path.join(root, "src/lib/localized-routes.ts"));

const posts = getAllPosts();
const toolSlugs = new Set(tools.map((t) => t.slug));
const headings = (md) => md.split("\n").filter((l) => /^#{1,6} /.test(l)).length;
const toolLinks = (md) => [...md.matchAll(/\]\(\/tools\/([a-z0-9-]+)\)/g)].map((m) => m[1]);

let failed = false;
const fail = (msg) => {
  failed = true;
  console.error(msg);
};
for (const post of posts) {
  for (const slug of toolLinks(post.content)) if (!toolSlugs.has(slug)) fail(`en ${post.slug}: unknown tool /tools/${slug}`);
}
for (const locale of TOOL_URL_LOCALES) {
  const bodies = require(path.join(root, `src/lib/blog-i18n/${locale}.ts`)).default;
  for (const post of posts) {
    const md = bodies[post.slug];
    if (!md || !md.trim()) {
      fail(`${locale}: missing post ${post.slug}`);
      continue;
    }
    if (headings(md) !== headings(post.content))
      fail(`${locale} ${post.slug}: ${headings(md)} headings, English has ${headings(post.content)}`);
    for (const slug of toolLinks(md)) if (!toolSlugs.has(slug)) fail(`${locale} ${post.slug}: unknown tool /tools/${slug}`);
    const want = [...new Set(toolLinks(post.content))].sort().join(",");
    const got = [...new Set(toolLinks(md))].sort().join(",");
    if (want !== got) fail(`${locale} ${post.slug}: tool links [${got}], English has [${want}]`);
  }
  for (const slug of Object.keys(bodies)) if (!posts.some((p) => p.slug === slug)) fail(`${locale}: unknown post ${slug}`);
}
if (failed) process.exit(1);
console.log(`Blog: ${posts.length} posts translated into ${TOOL_URL_LOCALES.length} languages.`);
