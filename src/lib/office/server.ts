/**
 * Fast mode for Office → PDF: the document goes over HTTPS to our conversion server
 * (server/office-api, LibreOffice), which converts it and deletes it right away.
 * NEXT_PUBLIC_OFFICE_API_URL overrides the address; set it to an empty string to turn fast mode off.
 */

export const OFFICE_API_URL = (process.env.NEXT_PUBLIC_OFFICE_API_URL ?? "https://api.zapfile.xyz").replace(/\/$/, "");

/** Larger files go to the in-browser engine (the server's limit is 50 MB). */
export const SERVER_MAX_BYTES = 45 * 1024 * 1024;

const TIMEOUT_MS = 120_000;

export class OfficeServerError extends Error {
  constructor(
    /** Server codes (password, convert, busy, rate, timeout, too_large, format, …) or "network". */
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export async function serverToPdf(file: File, opts: { pdfa?: boolean } = {}): Promise<Uint8Array> {
  if (!OFFICE_API_URL) throw new OfficeServerError("disabled", "fast mode is off");
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${OFFICE_API_URL}/convert${opts.pdfa ? "?pdfa=1" : ""}`, {
      method: "POST",
      body: file,
      headers: { "Content-Type": "application/octet-stream", "X-Filename": encodeURIComponent(file.name) },
      mode: "cors",
      credentials: "omit",
      signal: ac.signal,
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { code?: string; message?: string } | null;
      throw new OfficeServerError(body?.code ?? `http_${res.status}`, body?.message ?? res.statusText);
    }
    return new Uint8Array(await res.arrayBuffer());
  } catch (e) {
    if (e instanceof OfficeServerError) throw e;
    throw new OfficeServerError("network", (e as Error).message || String(e));
  } finally {
    clearTimeout(timer);
  }
}
