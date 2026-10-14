/**
 * ZapFile Office → PDF API.
 *
 * POST /convert           body: the document (raw bytes)
 *   X-Filename: <url-encoded name>   (the extension picks the import filter)
 *   ?pdfa=1                           PDF/A-2b output
 *   → 200 application/pdf | 4xx/5xx { code, message }
 * GET /health             → { ok, busy, queued }
 *
 * Every conversion runs LibreOffice headless in its own temp directory, which is deleted right after.
 * Nothing is logged about the files. No dependencies besides Node and LibreOffice.
 */

import http from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const PORT = Number(process.env.PORT ?? 8080);
const SOFFICE = process.env.SOFFICE ?? "soffice";
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY ?? 1));
const MAX_QUEUE = Number(process.env.MAX_QUEUE ?? 20);
const MAX_BYTES = Number(process.env.MAX_MB ?? 50) * 1024 * 1024;
const TIMEOUT_MS = Number(process.env.TIMEOUT_S ?? 90) * 1000;
const RATE_PER_MIN = Number(process.env.RATE_PER_MIN ?? 30);
const WORK = process.env.WORK_DIR ?? path.join(os.tmpdir(), "zapfile-office");
// Exact origins, plus an optional pattern for preview deployments.
const ORIGINS = new Set((process.env.ALLOWED_ORIGINS ?? "https://www.zapfile.xyz,https://zapfile.xyz").split(",").map((s) => s.trim()).filter(Boolean));
const ORIGIN_RE = process.env.ALLOWED_ORIGIN_REGEX ? new RegExp(process.env.ALLOWED_ORIGIN_REGEX) : null;

/** Extension → [document family, PDF export filter]. */
const FORMATS = {
  doc: "writer", docx: "writer", odt: "writer", rtf: "writer", txt: "writer",
  xls: "calc", xlsx: "calc", ods: "calc", csv: "calc",
  ppt: "impress", pptx: "impress", odp: "impress",
  html: "web", htm: "web", xhtml: "web",
};
const FILTER = { writer: "writer_pdf_Export", calc: "calc_pdf_Export", impress: "impress_pdf_Export", web: "writer_web_pdf_Export" };

// Macros off, no update checks, no remote content: written into every LibreOffice profile.
const PROFILE_XCU = `<?xml version="1.0" encoding="UTF-8"?>
<oor:items xmlns:oor="http://openoffice.org/2001/registry" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
<item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item>
<item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="DisableMacrosExecution" oor:op="fuse"><value>true</value></prop></item>
<item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="BlockUntrustedRefererLinks" oor:op="fuse"><value>true</value></prop></item>
<item oor:path="/org.openoffice.Office.Common/Misc"><prop oor:name="UseOpenCL" oor:op="fuse"><value>false</value></prop></item>
<item oor:path="/org.openoffice.Office.Jobs/Jobs/org.openoffice.Office.Jobs:Job['UpdateCheck']/Arguments"><prop oor:name="AutoCheckEnabled" oor:op="fuse"><value>false</value></prop></item>
</oor:items>
`;

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// ---- Slots: one LibreOffice profile per concurrent conversion (profiles can't be shared). ----
const freeSlots = [];
const waiting = [];
async function initSlots() {
  await mkdir(WORK, { recursive: true });
  for (let i = 0; i < CONCURRENCY; i++) {
    const profile = path.join(WORK, `profile-${i}`);
    await mkdir(path.join(profile, "user"), { recursive: true });
    await writeFile(path.join(profile, "user", "registrymodifications.xcu"), PROFILE_XCU);
    freeSlots.push(profile);
  }
}
function acquire() {
  const slot = freeSlots.pop();
  if (slot) return Promise.resolve(slot);
  if (waiting.length >= MAX_QUEUE) return Promise.reject(new HttpError(503, "busy", "Server is busy"));
  return new Promise((resolve) => waiting.push(resolve));
}
function release(slot) {
  const next = waiting.shift();
  if (next) next(slot);
  else freeSlots.push(slot);
}

// ---- Rate limit per client IP (fixed one-minute windows). ----
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.start > 60_000) {
    hits.set(ip, { start: now, n: 1 });
    return false;
  }
  return ++h.n > RATE_PER_MIN;
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, h] of hits) if (now - h.start > 60_000) hits.delete(ip);
}, 60_000).unref();

function runSoffice(args, cwd) {
  return new Promise((resolve, reject) => {
    const p = spawn(SOFFICE, args, { cwd, detached: true, stdio: ["ignore", "ignore", "pipe"], env: { ...process.env, HOME: cwd } });
    let err = "";
    p.stderr.on("data", (d) => (err = (err + d).slice(-2000)));
    const timer = setTimeout(() => {
      try {
        process.kill(-p.pid, "SIGKILL"); // the whole process group
      } catch {
        /* already gone */
      }
      reject(new HttpError(504, "timeout", "Conversion took too long"));
    }, TIMEOUT_MS);
    p.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    p.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else reject(new HttpError(422, "convert", `LibreOffice exited with ${code}: ${err.trim().split("\n").pop() ?? ""}`));
    });
  });
}

/** OLE container with an EncryptedPackage stream = password-protected OOXML. */
function looksEncrypted(buf, ext) {
  const ole = buf.length > 8 && buf.readUInt32BE(0) === 0xd0cf11e0 && buf.readUInt32BE(4) === 0xa1b11ae1;
  if (!ole) return false;
  if (["docx", "xlsx", "pptx"].includes(ext)) return true;
  return buf.includes(Buffer.from("EncryptedPackage", "utf16le"));
}

async function convert(input, name, ext, pdfa) {
  const family = FORMATS[ext];
  const target = pdfa ? `pdf:${FILTER[family]}:${JSON.stringify({ SelectPdfVersion: { type: "long", value: "2" } })}` : "pdf";
  const slot = await acquire();
  const dir = await mkdtemp(path.join(WORK, "job-"));
  try {
    // The base name shows up in sheet headers and the PDF title, so keep the user's (sanitised).
    const base = path.basename(name, path.extname(name)).replace(/[^\p{L}\p{N} ._()-]/gu, "_").slice(0, 80).trim() || "document";
    const src = path.join(dir, `${base}.${ext}`);
    await writeFile(src, input);
    const args = ["--headless", "--norestore", "--nolockcheck", "--nodefault", "--nofirststartwizard", `-env:UserInstallation=file://${slot}`];
    if (family === "web") args.push("--infilter=HTML (StarWriter)");
    await runSoffice([...args, "--convert-to", target, "--outdir", path.join(dir, "out"), src], dir);
    const out = (await readdir(path.join(dir, "out")).catch(() => [])).find((f) => f.endsWith(".pdf"));
    if (!out) throw new HttpError(422, "convert", "No output");
    return await readFile(path.join(dir, "out", out));
  } finally {
    release(slot);
    await rm(dir, { recursive: true, force: true });
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const len = Number(req.headers["content-length"] ?? 0);
    if (len > MAX_BYTES) return reject(new HttpError(413, "too_large", "File is too large"));
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > MAX_BYTES) {
        req.destroy();
        reject(new HttpError(413, "too_large", "File is too large"));
      } else chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && (ORIGINS.has(origin) || ORIGIN_RE?.test(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Filename");
    res.setHeader("Access-Control-Max-Age", "86400");
    // The tool pages are cross-origin isolated (COEP); let them read the response.
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    return true;
  }
  return !origin; // non-browser clients (curl, health checks)
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const allowed = cors(req, res);
  if (req.method === "OPTIONS") {
    res.writeHead(allowed ? 204 : 403);
    return res.end();
  }
  if (req.method === "GET" && url.pathname === "/health") {
    return sendJson(res, 200, { ok: true, busy: CONCURRENCY - freeSlots.length, queued: waiting.length });
  }
  if (req.method !== "POST" || url.pathname !== "/convert") return sendJson(res, 404, { code: "not_found" });
  if (!allowed) return sendJson(res, 403, { code: "origin", message: "Origin not allowed" });

  try {
    // Caddy puts the client address first in X-Forwarded-For.
    const ip = String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "").split(",")[0].trim();
    if (rateLimited(ip)) throw new HttpError(429, "rate", "Too many requests");
    let name = "";
    try {
      name = decodeURIComponent(String(req.headers["x-filename"] ?? ""));
    } catch {
      /* bad encoding: treat as missing */
    }
    const ext = (name.split(".").pop() ?? "").toLowerCase();
    if (!FORMATS[ext]) throw new HttpError(415, "format", "Unsupported file type");
    const input = await readBody(req);
    if (!input.length) throw new HttpError(400, "empty", "Empty file");
    if (looksEncrypted(input, ext)) throw new HttpError(422, "password", "Password-protected document");
    const pdf = await convert(input, name, ext, url.searchParams.get("pdfa") === "1");
    res.writeHead(200, { "Content-Type": "application/pdf", "Content-Length": pdf.length, "Cache-Control": "no-store" });
    res.end(pdf);
  } catch (e) {
    const err = e instanceof HttpError ? e : new HttpError(500, "internal", "Conversion failed");
    if (!(e instanceof HttpError)) console.error("convert error:", e?.message ?? e);
    if (!res.headersSent) sendJson(res, err.status, { code: err.code, message: err.message });
    else res.end();
  }
});

server.requestTimeout = TIMEOUT_MS + 30_000;
if (!existsSync(WORK)) await mkdir(WORK, { recursive: true });
await initSlots();
server.listen(PORT, () => console.log(`office-api on :${PORT}, ${CONCURRENCY} slot(s)`));
for (const sig of ["SIGTERM", "SIGINT"]) process.on(sig, () => server.close(() => process.exit(0)));
