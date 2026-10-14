"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Contact,
  Copy,
  Download,
  ImagePlus,
  Link2,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  QrCode,
  Trash2,
  Type,
  Wifi,
} from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import { Segmented, Slider, Toggle, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { scanQr } from "@/lib/image-engine";
import { decodeImage, makeProxy } from "@/lib/image-editor-kit";
import { downloadBlob } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import {
  buildEmail,
  buildEvent,
  buildGeo,
  buildSms,
  buildTel,
  buildVCard,
  buildWifi,
  normalizeUrl,
  parseCoord,
  type EmailData,
  type EventData,
  type GeoData,
  type QRType,
  type SmsData,
  type VCardData,
  type WifiData,
} from "./qr-payload";
import { contrast, drawQr, isDarker, makeMatrix, qrSvg, validHex, type Ecl, type EyeShape, type Matrix, type ModuleShape, type QrStyle } from "./qr-render";

const TYPES: { type: QRType; icon: typeof Link2; label: string }[] = [
  { type: "url", icon: Link2, label: "qr.typeUrl" },
  { type: "text", icon: Type, label: "qr.typeText" },
  { type: "wifi", icon: Wifi, label: "qr.typeWifi" },
  { type: "vcard", icon: Contact, label: "qr.v2.typeVcard" },
  { type: "email", icon: Mail, label: "qr.typeEmail" },
  { type: "sms", icon: MessageSquare, label: "qr.v2.typeSms" },
  { type: "tel", icon: Phone, label: "qr.typeTel" },
  { type: "geo", icon: MapPin, label: "qr.v2.typeGeo" },
  { type: "event", icon: CalendarDays, label: "qr.v2.typeEvent" },
];

const PRESETS = [
  { key: "qr.ui.presetPure", fg: "#000000", bg: "#ffffff" },
  { key: "qr.ui.presetDark", fg: "#16181d", bg: "#ffffff" },
  { key: "qr.v2.presetOcean", fg: "#1d4ed8", bg: "#ffffff" },
  { key: "qr.ui.presetForest", fg: "#166534", bg: "#f0fdf4" },
  { key: "qr.ui.presetSunset", fg: "#9a3412", bg: "#fff7ed" },
  { key: "qr.v2.presetVolt", fg: "#16181d", bg: "#ffd60a" },
];

const DEFAULT_STYLE: QrStyle = { fg: "#000000", bg: "#ffffff", transparent: false, modules: "square", eyes: "square", margin: 4 };
const STORE_KEY = "zapfile.qr.style.v2";
const PREVIEW_PX = 640;
const LOGO_RATIO = 0.22;

const inputClass =
  "h-11 w-full min-w-0 rounded-xl border border-border bg-bg-secondary px-3 text-[14px] text-t-primary placeholder:text-t-tertiary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60";

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] text-t-secondary">{label}</span>
      {children}
    </label>
  );
}

export default function QRGeneratorPage() {
  const { t } = useI18n();
  const [type, setType] = useState<QRType>("url");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [tel, setTel] = useState("");
  const [wifi, setWifi] = useState<WifiData>({ ssid: "", password: "", security: "WPA", hidden: false });
  const [vcard, setVcard] = useState<VCardData>({ firstName: "", lastName: "", org: "", title: "", phone: "", email: "", url: "", address: "" });
  const [email, setEmail] = useState<EmailData>({ to: "", subject: "", body: "" });
  const [sms, setSms] = useState<SmsData>({ phone: "", message: "" });
  const [geo, setGeo] = useState<GeoData>({ lat: "", lng: "" });
  const [event, setEvent] = useState<EventData>({ title: "", start: "", end: "", allDay: false, location: "", description: "" });

  const [style, setStyle] = useState<QrStyle>(DEFAULT_STYLE);
  const [ecl, setEcl] = useState<Ecl>("M");
  const [size, setSize] = useState(1024);
  const [logo, setLogo] = useState<{ bitmap: ImageBitmap; dataUrl: string; name: string } | null>(null);
  const [matrix, setMatrix] = useState<Matrix | null>(null);
  const [tooLong, setTooLong] = useState(false);
  const [verify, setVerify] = useState<"idle" | "checking" | "ok" | "fail">("idle");
  const [locating, setLocating] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoRef = useRef(logo);
  logoRef.current = logo;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) setStyle({ ...DEFAULT_STYLE, ...(JSON.parse(raw) as Partial<QrStyle>) });
    } catch {
      /* defaults */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(style));
    } catch {
      /* blocked */
    }
  }, [style]);
  useEffect(() => () => logoRef.current?.bitmap.close(), []);

  const payload = useMemo(() => {
    switch (type) {
      case "url":
        return url.trim() ? normalizeUrl(url) : "";
      case "text":
        return text;
      case "tel":
        return tel.trim() ? buildTel(tel) : "";
      case "wifi":
        return wifi.ssid.trim() ? buildWifi(wifi) : "";
      case "vcard":
        return [vcard.firstName, vcard.lastName, vcard.org, vcard.phone, vcard.email].some((v) => v.trim()) ? buildVCard(vcard) : "";
      case "email":
        return email.to.trim() ? buildEmail(email) : "";
      case "sms":
        return sms.phone.trim() ? buildSms(sms) : "";
      case "geo":
        return parseCoord(geo.lat, 90) !== null && parseCoord(geo.lng, 180) !== null ? buildGeo(geo) : "";
      case "event":
        return event.title.trim() && event.start ? buildEvent(event) : "";
    }
  }, [type, url, text, tel, wifi, vcard, email, sms, geo, event]);

  // A logo hides modules: it needs the highest error correction to stay scannable.
  const effectiveEcl: Ecl = logo ? "H" : ecl;

  useEffect(() => {
    if (!payload) {
      setMatrix(null);
      setTooLong(false);
      return;
    }
    let live = true;
    const id = setTimeout(() => {
      makeMatrix(payload, effectiveEcl)
        .then((m) => {
          if (!live) return;
          setMatrix(m);
          setTooLong(false);
        })
        .catch(() => {
          if (!live) return;
          setMatrix(null);
          setTooLong(true);
        });
    }, 120);
    return () => {
      live = false;
      clearTimeout(id);
    };
  }, [payload, effectiveEcl]);

  const logoDraw = logo ? { image: logo.bitmap, ratio: LOGO_RATIO, w: logo.bitmap.width, h: logo.bitmap.height } : null;

  // Preview + self-check: decode our own rendering, like a phone camera would.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !matrix) return;
    canvas.width = PREVIEW_PX;
    canvas.height = PREVIEW_PX;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawQr(ctx, matrix, style, PREVIEW_PX, logoDraw);
    setVerify("checking");
    let live = true;
    const id = setTimeout(async () => {
      try {
        // Scan on an opaque copy: a transparent code is judged on white paper.
        const probe = new OffscreenCanvas(PREVIEW_PX, PREVIEW_PX);
        const pctx = probe.getContext("2d")!;
        pctx.fillStyle = "#ffffff";
        pctx.fillRect(0, 0, PREVIEW_PX, PREVIEW_PX);
        pctx.drawImage(canvas, 0, 0);
        const result = await scanQr(probe.transferToImageBitmap());
        if (live) setVerify(result?.text === payload ? "ok" : "fail");
      } catch {
        if (live) setVerify("idle");
      }
    }, 350);
    return () => {
      live = false;
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrix, style, logo]);

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    try {
      const decoded = await decodeImage(file);
      const bitmap = await makeProxy(decoded.bitmap, 512);
      decoded.bitmap.close();
      // The SVG embeds a small PNG copy so it stays self-contained.
      const c = new OffscreenCanvas(bitmap.width, bitmap.height);
      c.getContext("2d")!.drawImage(bitmap, 0, 0);
      const blob = await c.convertToBlob({ type: "image/png" });
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = () => rej(r.error);
        r.readAsDataURL(blob);
      });
      setLogo((old) => {
        old?.bitmap.close();
        return { bitmap, dataUrl, name: file.name };
      });
    } catch {
      toast.error(t("ui.failedLoad"));
    }
  };

  const pngBlob = useCallback(async (): Promise<Blob | null> => {
    if (!matrix) return null;
    const c = new OffscreenCanvas(size, size);
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    drawQr(ctx, matrix, style, size, logoDraw);
    return c.convertToBlob({ type: "image/png" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrix, style, size, logo]);

  const svgText = () => (matrix ? qrSvg(matrix, style, size, logo ? { dataUrl: logo.dataUrl, ratio: LOGO_RATIO, w: logo.bitmap.width, h: logo.bitmap.height } : null) : "");

  const fileBase = `qr-${type}`;
  const downloadPng = async () => {
    const b = await pngBlob();
    if (b) downloadBlob(b, `${fileBase}.png`);
  };
  const downloadSvg = () => {
    const s = svgText();
    if (s) downloadBlob(new Blob([s], { type: "image/svg+xml" }), `${fileBase}.svg`);
  };
  const copyPng = async () => {
    try {
      const b = await pngBlob();
      if (!b) return;
      await navigator.clipboard.write([new ClipboardItem({ "image/png": b })]);
      toast.success(t("qr.copied"));
    } catch {
      toast.error(t("qr.copyNotSupported"));
    }
  };
  const copySvg = async () => {
    try {
      await navigator.clipboard.writeText(svgText());
      toast.success(t("qr.svgCopied"));
    } catch {
      toast.error(t("qr.copyNotSupported"));
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) });
        setLocating(false);
      },
      () => {
        toast.error(t("qr.v2.locationFailed"));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const setStyleKey = <K extends keyof QrStyle>(k: K, v: QrStyle[K]) => setStyle((s) => ({ ...s, [k]: v }));
  const lowContrast = !style.transparent && contrast(style.fg, style.bg) < 3;
  const inverted = !style.transparent && !isDarker(style.fg, style.bg);

  const v = <T extends object>(setter: React.Dispatch<React.SetStateAction<T>>, key: keyof T) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setter((o) => ({ ...o, [key]: e.target.value }));

  return (
    <ToolLayout toolName={t("tool.qr-generator.name")} toolDescription={t("tool.qr-generator.desc")}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="space-y-5">
          {/* Type */}
          <div className="glass space-y-3 p-5">
            <p className={sectionTitle}>{t("qr.sectionType")}</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 xl:grid-cols-9" role="radiogroup" aria-label={t("qr.sectionType")}>
              {TYPES.map(({ type: ty, icon: Icon, label }) => (
                <button
                  key={ty}
                  type="button"
                  role="radio"
                  aria-checked={type === ty}
                  onClick={() => setType(ty)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-[12.5px] font-medium transition ${
                    type === ty ? "border-accent bg-accent text-on-accent" : "border-border text-t-secondary hover:bg-bg-secondary hover:text-t-primary"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  {t(label)}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="glass space-y-3 p-5">
            <p className={sectionTitle}>{t("qr.content")}</p>
            {type === "url" && (
              <Field label={t("qr.typeUrl")}>
                <input type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder={t("qr.phUrl")} className={inputClass} autoFocus />
              </Field>
            )}
            {type === "text" && (
              <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t("qr.placeholderFreeText")} rows={5} className={`${inputClass} h-auto resize-y py-2.5`} />
            )}
            {type === "tel" && (
              <Field label={t("qr.typeTel")}>
                <input type="tel" value={tel} onChange={(e) => setTel(e.target.value)} placeholder={t("qr.phTel")} className={inputClass} />
              </Field>
            )}
            {type === "wifi" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("qr.wifi.ssid")}>
                  <input value={wifi.ssid} onChange={v(setWifi, "ssid")} className={inputClass} autoComplete="off" />
                </Field>
                <Field label={t("qr.wifi.password")}>
                  <input value={wifi.password} onChange={v(setWifi, "password")} disabled={wifi.security === "nopass"} className={inputClass} autoComplete="off" />
                </Field>
                <Field label={t("qr.wifi.security")}>
                  <select value={wifi.security} onChange={(e) => setWifi((w) => ({ ...w, security: e.target.value as WifiData["security"] }))} className={inputClass}>
                    <option value="WPA">WPA / WPA2 / WPA3</option>
                    <option value="WEP">WEP</option>
                    <option value="nopass">{t("qr.wifiNoPass")}</option>
                  </select>
                </Field>
                <div className="flex items-end pb-2">
                  <Toggle checked={wifi.hidden} onChange={(h) => setWifi((w) => ({ ...w, hidden: h }))} label={t("qr.wifi.hidden")} />
                </div>
                <p className="text-[12.5px] text-t-tertiary sm:col-span-2">{t("qr.v2.wifiHint")}</p>
              </div>
            )}
            {type === "vcard" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("qr.v2.firstName")}>
                  <input value={vcard.firstName} onChange={v(setVcard, "firstName")} className={inputClass} autoComplete="given-name" />
                </Field>
                <Field label={t("qr.v2.lastName")}>
                  <input value={vcard.lastName} onChange={v(setVcard, "lastName")} className={inputClass} autoComplete="family-name" />
                </Field>
                <Field label={t("qr.v2.org")}>
                  <input value={vcard.org} onChange={v(setVcard, "org")} className={inputClass} autoComplete="organization" />
                </Field>
                <Field label={t("qr.v2.jobTitle")}>
                  <input value={vcard.title} onChange={v(setVcard, "title")} className={inputClass} autoComplete="organization-title" />
                </Field>
                <Field label={t("qr.typeTel")}>
                  <input type="tel" value={vcard.phone} onChange={v(setVcard, "phone")} className={inputClass} autoComplete="tel" />
                </Field>
                <Field label={t("qr.typeEmail")}>
                  <input type="email" value={vcard.email} onChange={v(setVcard, "email")} className={inputClass} autoComplete="email" />
                </Field>
                <Field label={t("qr.v2.website")}>
                  <input type="url" value={vcard.url} onChange={v(setVcard, "url")} className={inputClass} autoComplete="url" />
                </Field>
                <Field label={t("qr.v2.address")}>
                  <input value={vcard.address} onChange={v(setVcard, "address")} className={inputClass} autoComplete="street-address" />
                </Field>
              </div>
            )}
            {type === "email" && (
              <div className="space-y-3">
                <Field label={t("qr.v2.to")}>
                  <input type="email" value={email.to} onChange={v(setEmail, "to")} placeholder={t("qr.phEmail")} className={inputClass} />
                </Field>
                <Field label={t("qr.v2.subject")}>
                  <input value={email.subject} onChange={v(setEmail, "subject")} className={inputClass} />
                </Field>
                <Field label={t("qr.v2.message")}>
                  <textarea value={email.body} onChange={v(setEmail, "body")} rows={3} className={`${inputClass} h-auto resize-y py-2.5`} />
                </Field>
              </div>
            )}
            {type === "sms" && (
              <div className="space-y-3">
                <Field label={t("qr.typeTel")}>
                  <input type="tel" value={sms.phone} onChange={v(setSms, "phone")} placeholder={t("qr.phTel")} className={inputClass} />
                </Field>
                <Field label={t("qr.v2.message")}>
                  <textarea value={sms.message} onChange={v(setSms, "message")} rows={3} className={`${inputClass} h-auto resize-y py-2.5`} />
                </Field>
              </div>
            )}
            {type === "geo" && (
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label={t("qr.v2.latitude")}>
                    <input inputMode="decimal" value={geo.lat} onChange={v(setGeo, "lat")} placeholder="41.0082" className={inputClass} aria-invalid={!!geo.lat && parseCoord(geo.lat, 90) === null} />
                  </Field>
                  <Field label={t("qr.v2.longitude")}>
                    <input inputMode="decimal" value={geo.lng} onChange={v(setGeo, "lng")} placeholder="28.9784" className={inputClass} aria-invalid={!!geo.lng && parseCoord(geo.lng, 180) === null} />
                  </Field>
                </div>
                <button type="button" onClick={useMyLocation} disabled={locating} className={buttonSecondary}>
                  {locating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <MapPin className="h-4 w-4" aria-hidden="true" />}
                  {t("qr.v2.myLocation")}
                </button>
              </div>
            )}
            {type === "event" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={t("qr.v2.eventTitle")} className="sm:col-span-2">
                  <input value={event.title} onChange={v(setEvent, "title")} className={inputClass} />
                </Field>
                <Field label={t("qr.v2.starts")}>
                  <input type={event.allDay ? "date" : "datetime-local"} value={event.allDay ? event.start.slice(0, 10) : event.start} onChange={v(setEvent, "start")} className={inputClass} />
                </Field>
                <Field label={t("qr.v2.ends")}>
                  <input type={event.allDay ? "date" : "datetime-local"} value={event.allDay ? event.end.slice(0, 10) : event.end} onChange={v(setEvent, "end")} className={inputClass} />
                </Field>
                <div className="sm:col-span-2">
                  <Toggle checked={event.allDay} onChange={(a) => setEvent((e) => ({ ...e, allDay: a }))} label={t("qr.v2.allDay")} />
                </div>
                <Field label={t("qr.v2.location")}>
                  <input value={event.location} onChange={v(setEvent, "location")} className={inputClass} />
                </Field>
                <Field label={t("qr.v2.description")}>
                  <input value={event.description} onChange={v(setEvent, "description")} className={inputClass} />
                </Field>
              </div>
            )}
          </div>

          {/* Style */}
          <div className="glass space-y-4 p-5">
            <p className={sectionTitle}>{t("qr.colors")}</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  title={t(p.key)}
                  aria-label={t(p.key)}
                  onClick={() => setStyle((s) => ({ ...s, fg: p.fg, bg: p.bg, transparent: false }))}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 transition ${style.fg === p.fg && style.bg === p.bg ? "border-accent" : "border-border"}`}
                  style={{ background: p.bg }}
                >
                  <QrCode className="h-5 w-5" style={{ color: p.fg }} aria-hidden="true" />
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(["fg", "bg"] as const).map((k) => (
                <Field key={k} label={k === "fg" ? t("qr.foreground") : t("qr.background")}>
                  <div className="flex items-center gap-2">
                    <input type="color" value={style[k]} onChange={(e) => setStyleKey(k, e.target.value)} disabled={k === "bg" && style.transparent} className="h-11 w-12 shrink-0 cursor-pointer rounded-xl border border-border bg-bg-secondary p-1 disabled:opacity-40" aria-label={k === "fg" ? t("qr.foreground") : t("qr.background")} />
                    <input
                      key={style[k]}
                      defaultValue={style[k]}
                      onBlur={(e) => validHex(e.target.value.trim()) && setStyleKey(k, e.target.value.trim())}
                      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                      disabled={k === "bg" && style.transparent}
                      aria-label={`${k === "fg" ? t("qr.foreground") : t("qr.background")} (HEX)`}
                      className={`${inputClass} font-mono text-[13px]`}
                    />
                  </div>
                </Field>
              ))}
            </div>
            <Toggle checked={style.transparent} onChange={(b) => setStyleKey("transparent", b)} label={t("qr.v2.transparent")} description={t("qr.v2.transparentHint")} />
            {(lowContrast || inverted) && (
              <p className="flex items-start gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-[13px] text-t-secondary">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                {inverted ? t("qr.v2.inverted") : t("qr.v2.lowContrast")}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p className="text-[13px] text-t-secondary">{t("qr.v2.modules")}</p>
                <Segmented<ModuleShape>
                  label={t("qr.v2.modules")}
                  size="sm"
                  value={style.modules}
                  onChange={(m) => setStyleKey("modules", m)}
                  options={[
                    { value: "square", label: t("qr.v2.square") },
                    { value: "rounded", label: t("qr.v2.rounded") },
                    { value: "dots", label: t("qr.v2.dots") },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <p className="text-[13px] text-t-secondary">{t("qr.v2.eyes")}</p>
                <Segmented<EyeShape>
                  label={t("qr.v2.eyes")}
                  size="sm"
                  value={style.eyes}
                  onChange={(m) => setStyleKey("eyes", m)}
                  options={[
                    { value: "square", label: t("qr.v2.square") },
                    { value: "rounded", label: t("qr.v2.rounded") },
                  ]}
                />
              </div>
            </div>
            <Slider label={t("qr.v2.margin")} value={style.margin} min={0} max={8} onChange={(m) => setStyleKey("margin", m)} display={style.margin} />
          </div>

          {/* Logo + correction */}
          <div className="glass space-y-4 p-5">
            <p className={sectionTitle}>{t("qr.logo")}</p>
            {logo ? (
              <div className="flex items-center gap-3 rounded-xl border border-border p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo.dataUrl} alt={t("qr.ui.logoPreview")} className="h-10 w-10 rounded-md object-contain" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-t-secondary">{logo.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    setLogo((old) => {
                      old?.bitmap.close();
                      return null;
                    })
                  }
                  aria-label={t("qr.removeLogo")}
                  title={t("qr.removeLogo")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-t-tertiary hover:bg-bg-secondary hover:text-t-primary"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <label className={`${buttonSecondary} w-full cursor-pointer`}>
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                {t("qr.uploadLogo")}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(e) => pickLogo(e.target.files?.[0])} />
              </label>
            )}
            <div className="space-y-2">
              <p className="text-[13px] text-t-secondary">{t("qr.errorLevel")}</p>
              <Segmented<Ecl>
                label={t("qr.errorLevel")}
                size="sm"
                value={effectiveEcl}
                onChange={setEcl}
                options={(["L", "M", "Q", "H"] as Ecl[]).map((l) => ({ value: l, label: `${l} · ${{ L: 7, M: 15, Q: 25, H: 30 }[l]}%`, disabled: !!logo && l !== "H" }))}
              />
              <p className="text-[12px] text-t-tertiary">{logo ? t("qr.v2.eclLogo") : t("qr.v2.eclHint")}</p>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-4 lg:sticky lg:top-20">
          <div className="glass space-y-4 p-5">
            <div
              className="relative mx-auto flex aspect-square w-full max-w-[320px] items-center justify-center overflow-hidden rounded-xl border border-border"
              style={style.transparent ? { background: "repeating-conic-gradient(#e5e5e5 0% 25%, #fff 0% 50%) 50% / 16px 16px" } : { background: style.bg }}
            >
              {matrix ? (
                <canvas ref={canvasRef} role="img" aria-label={t("qr.ui.qrAlt")} className="h-full w-full" />
              ) : (
                <div className="flex flex-col items-center gap-2 bg-bg-secondary p-6 text-center text-[13px] text-t-tertiary">
                  <QrCode className="h-10 w-10" aria-hidden="true" />
                  {tooLong ? t("qr.v2.tooLong") : t("qr.enterContent")}
                </div>
              )}
            </div>
            {matrix && (
              <p className={`flex items-center justify-center gap-1.5 text-[12.5px] ${verify === "fail" ? "text-amber-700 dark:text-amber-400" : "text-t-tertiary"}`} aria-live="polite">
                {verify === "ok" && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" aria-hidden="true" />}
                {verify === "fail" && <AlertTriangle className="h-4 w-4" aria-hidden="true" />}
                {verify === "checking" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                {verify === "ok" ? t("qr.v2.scanOk") : verify === "fail" ? t("qr.v2.scanFail") : verify === "checking" ? t("qr.v2.scanChecking") : null}
              </p>
            )}
            {matrix && (
              <p className="text-center text-[12px] text-t-tertiary tabular-nums">
                {t("qr.v2.info", { n: `${matrix.size}×${matrix.size}`, chars: payload.length })}
              </p>
            )}
          </div>

          <div className="glass space-y-4 p-5">
            <Slider label={t("qr.size")} value={size} min={256} max={4096} step={64} onChange={setSize} display={`${size} px`} />
            <button type="button" onClick={downloadPng} disabled={!matrix} className={`${buttonPrimary} w-full`}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {t("qr.downloadPNG")}
            </button>
            <div className="grid grid-cols-3 gap-2">
              <button type="button" onClick={downloadSvg} disabled={!matrix} className={`${buttonSecondary} !px-2`}>
                SVG
              </button>
              <button type="button" onClick={copyPng} disabled={!matrix} className={`${buttonSecondary} !px-2`} title={t("qr.copyImage")}>
                <Copy className="h-4 w-4" aria-hidden="true" />
                PNG
              </button>
              <button type="button" onClick={copySvg} disabled={!matrix} className={`${buttonSecondary} !px-2`} title={t("qr.copySVG")}>
                <Copy className="h-4 w-4" aria-hidden="true" />
                SVG
              </button>
            </div>
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
