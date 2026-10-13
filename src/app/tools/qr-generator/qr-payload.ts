/**
 * QR payload builders. Each follows the de-facto format that phone cameras
 * (iOS, Android/ZXing) understand, with the escaping their specs require.
 */

export type QRType = "url" | "text" | "wifi" | "vcard" | "email" | "sms" | "tel" | "geo" | "event";

export interface WifiData {
  ssid: string;
  password: string;
  security: "WPA" | "WEP" | "nopass";
  hidden: boolean;
}

export interface VCardData {
  firstName: string;
  lastName: string;
  org: string;
  title: string;
  phone: string;
  email: string;
  url: string;
  address: string;
}

export interface EmailData {
  to: string;
  subject: string;
  body: string;
}

export interface SmsData {
  phone: string;
  message: string;
}

export interface GeoData {
  lat: string;
  lng: string;
}

export interface EventData {
  title: string;
  start: string; // datetime-local or date value
  end: string;
  allDay: boolean;
  location: string;
  description: string;
}

/** Wi-Fi (ZXing "WIFI:" format): \ ; , : " must be backslash-escaped. */
export function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

export function buildWifi(w: WifiData): string {
  const parts = [`T:${w.security === "nopass" ? "nopass" : w.security}`, `S:${escapeWifi(w.ssid)}`];
  if (w.security !== "nopass") parts.push(`P:${escapeWifi(w.password)}`);
  if (w.hidden) parts.push("H:true");
  return `WIFI:${parts.join(";")};;`;
}

/** vCard 3.0 / iCalendar text escaping (RFC 2426 / RFC 5545). */
export function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export function buildVCard(v: VCardData): string {
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];
  lines.push(`N:${escapeText(v.lastName.trim())};${escapeText(v.firstName.trim())};;;`);
  const full = [v.firstName.trim(), v.lastName.trim()].filter(Boolean).join(" ") || v.org.trim();
  lines.push(`FN:${escapeText(full)}`);
  if (v.org.trim()) lines.push(`ORG:${escapeText(v.org.trim())}`);
  if (v.title.trim()) lines.push(`TITLE:${escapeText(v.title.trim())}`);
  if (v.phone.trim()) lines.push(`TEL;TYPE=CELL:${v.phone.trim()}`);
  if (v.email.trim()) lines.push(`EMAIL:${v.email.trim()}`);
  if (v.url.trim()) lines.push(`URL:${normalizeUrl(v.url.trim())}`);
  if (v.address.trim()) lines.push(`ADR:;;${escapeText(v.address.trim())};;;;`);
  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export function buildEmail(e: EmailData): string {
  const params: string[] = [];
  if (e.subject.trim()) params.push(`subject=${encodeURIComponent(e.subject)}`);
  if (e.body.trim()) params.push(`body=${encodeURIComponent(e.body)}`);
  return `mailto:${e.to.trim()}${params.length ? `?${params.join("&")}` : ""}`;
}

export function cleanPhone(phone: string): string {
  return phone.replace(/[^\d+*#]/g, "");
}

export function buildSms(s: SmsData): string {
  return s.message ? `SMSTO:${cleanPhone(s.phone)}:${s.message}` : `SMSTO:${cleanPhone(s.phone)}`;
}

export function buildTel(phone: string): string {
  return `tel:${cleanPhone(phone)}`;
}

export function parseCoord(value: string, limit: number): number | null {
  const n = Number(value.trim().replace(",", "."));
  return value.trim() !== "" && Number.isFinite(n) && Math.abs(n) <= limit ? n : null;
}

export function buildGeo(g: GeoData): string {
  const lat = parseCoord(g.lat, 90);
  const lng = parseCoord(g.lng, 180);
  return `geo:${lat ?? 0},${lng ?? 0}`;
}

function icsDate(value: string, allDay: boolean): string | null {
  if (!value) return null;
  if (allDay) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    return m ? `${m[1]}${m[2]}${m[3]}` : null;
  }
  const d = new Date(value); // datetime-local is parsed as local time
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function nextDay(value: string): string {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + 1));
  return date.toISOString().slice(0, 10);
}

export function buildEvent(e: EventData): string {
  const start = icsDate(e.start, e.allDay);
  let end = icsDate(e.end, e.allDay);
  if (e.allDay && e.start) end = icsDate(e.end && e.end >= e.start ? nextDay(e.end) : nextDay(e.start), true);
  const lines = ["BEGIN:VEVENT", `SUMMARY:${escapeText(e.title.trim())}`];
  if (start) lines.push(e.allDay ? `DTSTART;VALUE=DATE:${start}` : `DTSTART:${start}`);
  if (end) lines.push(e.allDay ? `DTEND;VALUE=DATE:${end}` : `DTEND:${end}`);
  if (e.location.trim()) lines.push(`LOCATION:${escapeText(e.location.trim())}`);
  if (e.description.trim()) lines.push(`DESCRIPTION:${escapeText(e.description.trim())}`);
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

/** Add https:// when the user typed a bare domain. */
export function normalizeUrl(value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (/^[a-z][a-z0-9+.-]*:/i.test(v)) return v;
  return `https://${v}`;
}
