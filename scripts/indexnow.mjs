// Tell IndexNow search engines (Bing, Yandex, Seznam, Naver…) about every URL
// in the live sitemap. Run by .github/workflows/indexnow.yml after a deploy.
// The key is the file name of public/<key>.txt (its content is the key too).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const keyFile = fs.readdirSync(path.join(root, "public")).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error("No IndexNow key file in public/");
const key = keyFile.slice(0, -4);
const site = (process.env.SITE_URL || "https://zapfile.xyz").replace(/\/$/, "");

// The new deploy must serve the key before submitting.
const keyRes = await fetch(`${site}/${keyFile}`);
if (!keyRes.ok || (await keyRes.text()).trim() !== key) throw new Error(`${site}/${keyFile} does not serve the key`);

const sitemap = await (await fetch(`${site}/sitemap.xml`)).text();
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!urls.length) throw new Error("Sitemap has no URLs");

const body = JSON.stringify({ host: new URL(site).host, key, keyLocation: `${site}/${keyFile}`, urlList: urls.slice(0, 10000) });
// The first submission of a new key answers 403 SiteVerificationNotCompleted
// until IndexNow has fetched the key file: wait and try again.
for (let attempt = 1; attempt <= 6; attempt++) {
  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body,
  });
  const text = await res.text();
  console.log(`IndexNow: ${urls.length} URLs → HTTP ${res.status} ${text}`);
  if (res.status === 200 || res.status === 202) process.exit(0);
  if (!text.includes("SiteVerificationNotCompleted")) process.exit(1);
  await new Promise((r) => setTimeout(r, 120_000));
}
process.exit(1);
