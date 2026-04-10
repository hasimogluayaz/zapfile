import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const s = fs.readFileSync(path.join(__dirname, "../src/lib/i18n.tsx"), "utf8");

function extractKeysBetween(startMarker, endMarker) {
  const i = s.indexOf(startMarker);
  const j = s.indexOf(endMarker, i + startMarker.length);
  if (i < 0 || j < 0) return null;
  const block = s.slice(i + startMarker.length, j);
  const keys = new Set();
  const re = /"([^"]+)":/g;
  let m;
  while ((m = re.exec(block))) keys.add(m[1]);
  return keys;
}

const en = extractKeysBetween("  en: {", "  tr:");
const tr = extractKeysBetween("  tr: {", "  de:");
if (!en || !tr) {
  console.error("Could not parse en/tr blocks");
  process.exit(1);
}

const missingInTr = [...en].filter((k) => !tr.has(k)).sort();
const extraInTr = [...tr].filter((k) => !en.has(k)).sort();

console.log("EN keys:", en.size, "TR keys:", tr.size);
console.log("Missing in TR:", missingInTr.length);
missingInTr.forEach((k) => console.log("  ", k));
console.log("Extra in TR (not in EN):", extraInTr.length);
extraInTr.slice(0, 50).forEach((k) => console.log("  ", k));
if (extraInTr.length > 50) console.log("  ...", extraInTr.length - 50, "more");
