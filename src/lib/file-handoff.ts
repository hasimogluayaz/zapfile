import { tools, type Tool } from "./tools";

/**
 * Files dropped on the home page are held in memory (never uploaded) and
 * picked up by the next tool page's FileDropzone after client navigation.
 */
let pending: { files: File[]; at: number } | null = null;

const MAX_AGE_MS = 5 * 60 * 1000;

export function extensionOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

export function setPendingFiles(files: File[]): void {
  pending = files.length ? { files, at: Date.now() } : null;
}

export function clearPendingFiles(): void {
  pending = null;
}

/** Take (and clear) pending files that match the accepted extensions. */
export function takePendingFiles(acceptedExtensions: string[]): File[] {
  if (!pending || Date.now() - pending.at > MAX_AGE_MS) {
    pending = null;
    return [];
  }
  const files =
    acceptedExtensions.length === 0
      ? pending.files
      : pending.files.filter((f) =>
          acceptedExtensions.includes(extensionOf(f.name)),
        );
  pending = null;
  return files;
}

/** Tools whose catalog formats accept every given file. */
export function toolsForFiles(files: File[]): Tool[] {
  if (files.length === 0) return [];
  const exts = files.map((f) => extensionOf(f.name));
  return tools.filter(
    (tool) =>
      tool.acceptedFormats.length > 0 &&
      exts.every((ext) => tool.acceptedFormats.includes(ext)),
  );
}

const PERSIST_CACHE = "zapfile-handoff";

/**
 * Keep pending files across one full page reload (tools that must reload to become cross-origin
 * isolated). Stored in Cache Storage on this device only; `restorePersistedFiles` removes them.
 */
export async function persistPendingFiles(): Promise<void> {
  if (!pending || typeof caches === "undefined") return;
  try {
    const cache = await caches.open(PERSIST_CACHE);
    await Promise.all(
      pending.files.map((f, i) =>
        cache.put(
          `https://handoff.zapfile.invalid/${i}`,
          new Response(f, { headers: { "content-type": f.type || "application/octet-stream", "x-name": encodeURIComponent(f.name), "x-at": String(pending!.at) } }),
        ),
      ),
    );
  } catch {
    /* storage unavailable: the user drops the file again */
  }
}

export async function restorePersistedFiles(): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    if (!(await caches.has(PERSIST_CACHE))) return;
    const cache = await caches.open(PERSIST_CACHE);
    const files: File[] = [];
    let at = 0;
    for (const req of [...(await cache.keys())].sort((a, b) => a.url.localeCompare(b.url, undefined, { numeric: true }))) {
      const res = await cache.match(req);
      if (!res) continue;
      at = Number(res.headers.get("x-at")) || Date.now();
      files.push(new File([await res.blob()], decodeURIComponent(res.headers.get("x-name") ?? "file"), { type: res.headers.get("content-type") ?? "" }));
    }
    await caches.delete(PERSIST_CACHE);
    if (files.length && Date.now() - at < MAX_AGE_MS) pending = { files, at };
  } catch {
    /* ignore */
  }
}
