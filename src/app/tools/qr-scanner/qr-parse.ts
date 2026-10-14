/** Recognise what a scanned QR payload is, so the result can offer the right action. */

export type Parsed =
  | { kind: "url"; url: string; host: string }
  | { kind: "wifi"; ssid: string; password: string; security: string; hidden: boolean }
  | { kind: "vcard"; name: string; fields: [string, string][] }
  | { kind: "event"; title: string; fields: [string, string][] }
  | { kind: "email"; to: string; subject: string; body: string }
  | { kind: "tel"; number: string }
  | { kind: "sms"; number: string; message: string }
  | { kind: "geo"; lat: number; lng: number }
  | { kind: "text" };

/** Split on `sep` unless backslash-escaped, then unescape. */
function splitEscaped(s: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c === "\\" && i + 1 < s.length) {
      cur += s[++i];
    } else if (c === sep) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function parseWifi(text: string): Parsed | null {
  if (!/^WIFI:/i.test(text)) return null;
  const fields: Record<string, string> = {};
  for (const part of splitEscaped(text.slice(5), ";")) {
    const i = part.indexOf(":");
    if (i > 0) fields[part.slice(0, i).toUpperCase()] = part.slice(i + 1);
  }
  return {
    kind: "wifi",
    ssid: fields.S ?? "",
    password: fields.P ?? "",
    security: fields.T && fields.T.toLowerCase() !== "nopass" ? fields.T : "",
    hidden: /^true$/i.test(fields.H ?? ""),
  };
}

function unescapeIcs(v: string): string {
  return v.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
}

/** Lines of a vCard / iCalendar, with folded lines joined. */
function contentLines(text: string): [string, string][] {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const out: [string, string][] = [];
  for (const line of unfolded.split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i <= 0) continue;
    const name = line.slice(0, i).split(";")[0]!.toUpperCase();
    out.push([name, unescapeIcs(line.slice(i + 1))]);
  }
  return out;
}

function icsDate(v: string): string {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/.exec(v);
  if (!m) return v;
  if (!m[4]) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString();
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] ?? "00"}${m[7] ? "Z" : ""}`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleString();
}

export function parsePayload(raw: string): Parsed {
  const text = raw.trim();
  const wifi = parseWifi(text);
  if (wifi) return wifi;

  if (/^BEGIN:VCARD/i.test(text)) {
    const lines = contentLines(text);
    const get = (k: string) => lines.find(([n]) => n === k)?.[1] ?? "";
    let name = get("FN");
    if (!name) {
      const [last = "", first = ""] = get("N").split(";");
      name = [first, last].filter(Boolean).join(" ");
    }
    const labels: Record<string, string> = { ORG: "org", TITLE: "title", TEL: "tel", EMAIL: "email", URL: "url", ADR: "address", NOTE: "note" };
    const fields = lines
      .filter(([n]) => labels[n])
      .map(([n, v]) => [labels[n]!, n === "ADR" ? v.split(";").filter(Boolean).join(", ") : v] as [string, string]);
    return { kind: "vcard", name, fields };
  }

  if (/^BEGIN:(VEVENT|VCALENDAR)/i.test(text)) {
    const lines = contentLines(text);
    const get = (k: string) => lines.find(([n]) => n === k)?.[1] ?? "";
    const fields: [string, string][] = [];
    if (get("DTSTART")) fields.push(["starts", icsDate(get("DTSTART"))]);
    if (get("DTEND")) fields.push(["ends", icsDate(get("DTEND"))]);
    if (get("LOCATION")) fields.push(["location", get("LOCATION")]);
    if (get("DESCRIPTION")) fields.push(["description", get("DESCRIPTION")]);
    return { kind: "event", title: get("SUMMARY"), fields };
  }

  const mailto = /^mailto:([^?]*)(?:\?(.*))?$/i.exec(text);
  if (mailto) {
    const params = new URLSearchParams(mailto[2] ?? "");
    return { kind: "email", to: decodeURIComponent(mailto[1] ?? ""), subject: params.get("subject") ?? "", body: params.get("body") ?? "" };
  }
  const matmsg = /^MATMSG:(.*)$/i.exec(text);
  if (matmsg) {
    const f: Record<string, string> = {};
    for (const part of splitEscaped(matmsg[1]!, ";")) {
      const i = part.indexOf(":");
      if (i > 0) f[part.slice(0, i).toUpperCase()] = part.slice(i + 1);
    }
    return { kind: "email", to: f.TO ?? "", subject: f.SUB ?? "", body: f.BODY ?? "" };
  }

  const tel = /^tel:(.+)$/i.exec(text);
  if (tel) return { kind: "tel", number: tel[1]!.trim() };

  const smsto = /^SMSTO:([^:]*)(?::([\s\S]*))?$/i.exec(text);
  if (smsto) return { kind: "sms", number: smsto[1]!.trim(), message: smsto[2] ?? "" };
  const sms = /^sms:([^?]*)(?:\?body=(.*))?$/i.exec(text);
  if (sms) return { kind: "sms", number: sms[1]!.trim(), message: decodeURIComponent(sms[2] ?? "") };

  const geo = /^geo:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/i.exec(text);
  if (geo) return { kind: "geo", lat: Number(geo[1]), lng: Number(geo[2]) };

  if (/^https?:\/\/\S+$/i.test(text)) {
    try {
      const u = new URL(text);
      return { kind: "url", url: u.href, host: u.hostname };
    } catch {
      /* not a URL after all */
    }
  }
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(text)) {
    try {
      const u = new URL(`https://${text}`);
      return { kind: "url", url: u.href, host: u.hostname };
    } catch {
      /* plain text */
    }
  }
  return { kind: "text" };
}
