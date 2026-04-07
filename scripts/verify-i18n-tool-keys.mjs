import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const tools = fs.readFileSync(path.join(root, "src/lib/tools.ts"), "utf8");
const i18n = fs.readFileSync(path.join(root, "src/lib/i18n.tsx"), "utf8");
const slugs = [...tools.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);
const missing = [];
for (const s of slugs) {
  if (!i18n.includes(`"tool.${s}.name"`)) missing.push(`${s} .name`);
  if (!i18n.includes(`"tool.${s}.desc"`)) missing.push(`${s} .desc`);
}
if (missing.length) {
  console.error("Missing i18n keys:", missing.join(", "));
  process.exit(1);
}
console.log(`OK: ${slugs.length} tools have tool.*.name and tool.*.desc in i18n.tsx`);
