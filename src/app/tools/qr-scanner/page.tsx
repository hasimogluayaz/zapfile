"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  CalendarDays,
  Camera,
  CameraOff,
  Contact,
  Copy,
  Download,
  ExternalLink,
  Flashlight,
  ImageUp,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  SwitchCamera,
  Type,
  Wifi,
  X,
} from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { Segmented, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { scanQr, type QrResult } from "@/lib/image-engine";
import { downloadBlob } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { parsePayload, type Parsed } from "./qr-parse";

type Mode = "image" | "camera";

interface Scan {
  id: number;
  text: string;
  parsed: Parsed;
  at: number;
}

interface Shot {
  url: string;
  w: number;
  h: number;
  corners?: QrResult["corners"];
}

const KIND_ICON = {
  url: ExternalLink,
  wifi: Wifi,
  vcard: Contact,
  event: CalendarDays,
  email: Mail,
  tel: Phone,
  sms: MessageSquare,
  geo: MapPin,
  text: Type,
} as const;

let seq = 0;

export default function QrScannerPage() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("image");
  const [scans, setScans] = useState<Scan[]>([]);
  const [shot, setShot] = useState<Shot | null>(null);
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [camState, setCamState] = useState<"off" | "starting" | "on" | "denied" | "unsupported">("off");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [torch, setTorch] = useState<{ supported: boolean; on: boolean }>({ supported: false, on: false });

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const loopRef = useRef(0);
  const lastRef = useRef<{ text: string; at: number } | null>(null);

  const addScan = useCallback((text: string) => {
    setScans((prev) => [{ id: ++seq, text, parsed: parsePayload(text), at: Date.now() }, ...prev.filter((s) => s.text !== text)].slice(0, 20));
  }, []);

  // ── Images ──
  const scanFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setNotFound(false);
      setShot((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return null;
      });
      const url = URL.createObjectURL(file);
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        const size = { w: bitmap.width, h: bitmap.height };
        const result = await scanQr(bitmap);
        setShot({ url, ...size, corners: result?.corners });
        if (result?.text) addScan(result.text);
        else setNotFound(true);
      } catch {
        URL.revokeObjectURL(url);
        toast.error(t("ui.failedLoad"));
      } finally {
        setBusy(false);
      }
    },
    [addScan, t],
  );

  useEffect(
    () => () => {
      setShot((old) => {
        if (old) URL.revokeObjectURL(old.url);
        return null;
      });
    },
    [],
  );

  // ── Camera ──
  const stopCamera = useCallback(() => {
    loopRef.current++;
    streamRef.current?.getTracks().forEach((tr) => tr.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setTorch({ supported: false, on: false });
    setCamState((s) => (s === "denied" || s === "unsupported" ? s : "off"));
  }, []);

  const startCamera = useCallback(
    async (face = facing) => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCamState("unsupported");
        return;
      }
      stopCamera();
      setCamState("starting");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: face }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        const track = stream.getVideoTracks()[0];
        const caps = (track?.getCapabilities?.() ?? {}) as { torch?: boolean };
        setTorch({ supported: !!caps.torch, on: false });
        setCamState("on");
        const run = ++loopRef.current;
        // Scan frames in the image engine's worker, one at a time, so the preview never stutters.
        const tick = async () => {
          if (run !== loopRef.current) return;
          const v = videoRef.current;
          if (v && v.readyState >= 2 && v.videoWidth) {
            try {
              const k = Math.min(1, 960 / Math.max(v.videoWidth, v.videoHeight));
              const frame = await createImageBitmap(v, { resizeWidth: Math.round(v.videoWidth * k), resizeHeight: Math.round(v.videoHeight * k) });
              const hit = await scanQr(frame);
              if (run !== loopRef.current) return;
              if (hit?.text) {
                const last = lastRef.current;
                // The same code held in view is reported once.
                if (!last || last.text !== hit.text || Date.now() - last.at > 4000) {
                  addScan(hit.text);
                  navigator.vibrate?.(40);
                }
                lastRef.current = { text: hit.text, at: Date.now() };
              }
            } catch {
              /* a dropped frame */
            }
          }
          setTimeout(tick, 120);
        };
        tick();
      } catch (e) {
        setCamState(e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError") ? "denied" : "unsupported");
      }
    },
    [addScan, facing, stopCamera],
  );

  useEffect(() => {
    if (mode !== "camera") stopCamera();
  }, [mode, stopCamera]);
  useEffect(() => () => stopCamera(), [stopCamera]);

  const flip = () => {
    const next = facing === "environment" ? "user" : "environment";
    setFacing(next);
    if (camState === "on") startCamera(next);
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch.on } as MediaTrackConstraintSet] });
      setTorch((s) => ({ ...s, on: !s.on }));
    } catch {
      setTorch({ supported: false, on: false });
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("ui.copied"));
    } catch {
      toast.error(t("ui.copyFailed"));
    }
  };

  const latest = scans[0] ?? null;

  return (
    <ToolLayout toolName={t("tool.qr-scanner.name")} toolDescription={t("tool.qr-scanner.desc")}>
      <div className="space-y-5">
        <Segmented<Mode>
          label={t("qrscan.v2.source")}
          value={mode}
          onChange={setMode}
          options={[
            { value: "image", label: t("qrscan.upload"), icon: <ImageUp className="h-4 w-4" aria-hidden="true" /> },
            { value: "camera", label: t("qrscan.camera"), icon: <Camera className="h-4 w-4" aria-hidden="true" /> },
          ]}
        />

        {mode === "image" ? (
          <div className="space-y-4">
            <FileDropzone
              onFilesSelected={(files) => files[0] && scanFile(files[0])}
              accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".avif"] }}
              multiple={false}
              formats={["PNG", "JPG", "WEBP", "GIF", "BMP"]}
              label={t("qrscan.v2.drop")}
            />
            {(busy || shot) && (
              <div className="glass flex justify-center p-4">
                {busy ? (
                  <p className="flex items-center gap-2 py-10 text-[14px] text-t-secondary" role="status">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    {t("qrscan.v2.scanning")}
                  </p>
                ) : shot ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={shot.url} alt="" className="block max-h-[420px] w-auto max-w-full rounded-lg" />
                    {shot.corners && shot.corners.length >= 4 && (
                      <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${shot.w} ${shot.h}`} preserveAspectRatio="none" aria-hidden="true">
                        <polygon
                          points={shot.corners.map((p) => `${p.x},${p.y}`).join(" ")}
                          fill="rgb(255 214 10 / 0.18)"
                          stroke="#FFD60A"
                          strokeWidth={4}
                          vectorEffect="non-scaling-stroke"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                ) : null}
              </div>
            )}
            {notFound && !busy && (
              <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-[13px] text-t-secondary">{t("qrscan.v2.notFound")}</p>
            )}
          </div>
        ) : (
          <div className="glass space-y-3 p-4">
            <div className="relative mx-auto aspect-[4/3] w-full max-w-[640px] overflow-hidden rounded-xl bg-[#0b0c0f]">
              <video ref={videoRef} playsInline muted className={`h-full w-full object-cover ${facing === "user" ? "-scale-x-100" : ""} ${camState === "on" ? "" : "invisible"}`} />
              {camState === "on" && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden="true">
                  <div className="h-[58%] w-auto aspect-square rounded-2xl border-2 border-volt/90 shadow-[0_0_0_9999px_rgb(0_0_0/0.35)]" />
                </div>
              )}
              {camState !== "on" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-[14px] text-white/80">
                  {camState === "starting" ? (
                    <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                  ) : camState === "denied" || camState === "unsupported" ? (
                    <>
                      <CameraOff className="h-8 w-8" aria-hidden="true" />
                      <p>{camState === "denied" ? t("qrscan.ui.cameraDenied") : t("qrscan.v2.noCamera")}</p>
                    </>
                  ) : (
                    <>
                      <Camera className="h-8 w-8" aria-hidden="true" />
                      <p>{t("qrscan.v2.cameraIntro")}</p>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {camState === "on" ? (
                <button type="button" onClick={stopCamera} className={buttonSecondary}>
                  <X className="h-4 w-4" aria-hidden="true" />
                  {t("qrscan.v2.stop")}
                </button>
              ) : (
                <button type="button" onClick={() => startCamera()} disabled={camState === "starting"} className={buttonPrimary}>
                  <Camera className="h-4 w-4" aria-hidden="true" />
                  {t("qrscan.v2.start")}
                </button>
              )}
              <button type="button" onClick={flip} className={buttonSecondary} aria-label={t("qrscan.v2.flip")} title={t("qrscan.v2.flip")}>
                <SwitchCamera className="h-4 w-4" aria-hidden="true" />
              </button>
              {torch.supported && (
                <button type="button" onClick={toggleTorch} aria-pressed={torch.on} className={`${buttonSecondary} ${torch.on ? "bg-bg-secondary" : ""}`} aria-label={t("qrscan.v2.torch")} title={t("qrscan.v2.torch")}>
                  <Flashlight className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
            <p className="text-center text-[12.5px] text-t-tertiary">{t("qrscan.v2.cameraPrivacy")}</p>
          </div>
        )}

        {latest && <ResultCard scan={latest} onCopy={copy} />}

        {scans.length > 1 && (
          <div className="glass space-y-2 p-5">
            <div className="flex items-center justify-between">
              <p className={sectionTitle}>{t("qrscan.v2.history")}</p>
              <button type="button" onClick={() => setScans([])} className="rounded-lg px-2.5 py-2 text-[13px] font-medium text-t-secondary hover:bg-bg-secondary hover:text-t-primary">
                <RefreshCw className="me-1.5 inline h-3.5 w-3.5" aria-hidden="true" />
                {t("ui.clearAll")}
              </button>
            </div>
            <ul className="divide-y divide-border">
              {scans.slice(1).map((s) => {
                const Icon = KIND_ICON[s.parsed.kind];
                return (
                  <li key={s.id} className="flex items-center gap-3 py-2">
                    <Icon className="h-4 w-4 shrink-0 text-t-tertiary" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-t-secondary" dir="ltr">
                      {s.text}
                    </span>
                    <button type="button" onClick={() => copy(s.text)} aria-label={t("qrscan.copy")} className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-t-tertiary hover:bg-bg-secondary hover:text-t-primary">
                      <Copy className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}

function Row({ label, value, onCopy, mono }: { label: string; value: string; onCopy?: (v: string) => void; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="w-28 shrink-0 text-[13px] text-t-tertiary">{label}</span>
      <span className={`min-w-0 flex-1 whitespace-pre-wrap break-words text-[14px] text-t-primary ${mono ? "font-mono" : ""}`}>{value || "—"}</span>
      {onCopy && value && (
        <button type="button" onClick={() => onCopy(value)} aria-label={label} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-t-tertiary hover:bg-bg-secondary hover:text-t-primary">
          <Copy className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

function ResultCard({ scan, onCopy }: { scan: Scan; onCopy: (v: string) => void }) {
  const { t } = useI18n();
  const p = scan.parsed;
  const Icon = KIND_ICON[p.kind];
  const actionClass = `${buttonPrimary} !py-2.5 !text-[14px]`;
  return (
    <div className="glass space-y-4 p-5" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-secondary text-t-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-t-primary">{t(`qrscan.v2.kind.${p.kind}`)}</p>
          <p className="text-[12.5px] text-t-tertiary">{new Date(scan.at).toLocaleTimeString()}</p>
        </div>
        <button type="button" onClick={() => onCopy(scan.text)} className={buttonSecondary}>
          <Copy className="h-4 w-4" aria-hidden="true" />
          {t("qrscan.copy")}
        </button>
      </div>

      {p.kind === "url" && (
        <div className="space-y-3">
          <p className="break-all font-mono text-[14px] text-t-primary" dir="ltr">
            {scan.text}
          </p>
          <p className="text-[12.5px] text-t-tertiary">{t("qrscan.v2.urlCheck", { host: p.host })}</p>
          <a href={p.url} target="_blank" rel="noopener noreferrer nofollow" className={actionClass}>
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            {t("qrscan.v2.open", { host: p.host })}
          </a>
        </div>
      )}
      {p.kind === "wifi" && (
        <div className="divide-y divide-border">
          <Row label={t("qr.wifi.ssid")} value={p.ssid} onCopy={onCopy} />
          <Row label={t("qr.wifi.password")} value={p.password} onCopy={onCopy} mono />
          <Row label={t("qr.wifi.security")} value={p.security || t("qr.wifiNoPass")} />
          {p.hidden && <Row label={t("qr.wifi.hidden")} value={t("qrscan.v2.yes")} />}
        </div>
      )}
      {p.kind === "vcard" && (
        <div className="space-y-3">
          <p className="text-[16px] font-semibold text-t-primary">{p.name}</p>
          <div className="divide-y divide-border">
            {p.fields.map(([k, v], i) => (
              <Row key={i} label={t(`qrscan.v2.field.${k}`)} value={v} onCopy={onCopy} />
            ))}
          </div>
          <button type="button" onClick={() => downloadBlob(new Blob([scan.text], { type: "text/vcard" }), `${(p.name || "contact").replace(/[\\/:*?"<>|]+/g, "-")}.vcf`)} className={actionClass}>
            <Download className="h-4 w-4" aria-hidden="true" />
            {t("qrscan.v2.saveContact")}
          </button>
        </div>
      )}
      {p.kind === "event" && (
        <div className="space-y-3">
          <p className="text-[16px] font-semibold text-t-primary">{p.title}</p>
          <div className="divide-y divide-border">
            {p.fields.map(([k, v], i) => (
              <Row key={i} label={t(`qr.v2.${k}`)} value={v} />
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              const body = /BEGIN:VCALENDAR/i.test(scan.text) ? scan.text : `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//ZapFile//QR//EN\r\n${scan.text.trim()}\r\nEND:VCALENDAR\r\n`;
              downloadBlob(new Blob([body], { type: "text/calendar" }), "event.ics");
            }}
            className={actionClass}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {t("qrscan.v2.addCalendar")}
          </button>
        </div>
      )}
      {p.kind === "email" && (
        <div className="space-y-3">
          <div className="divide-y divide-border">
            <Row label={t("qr.v2.to")} value={p.to} onCopy={onCopy} />
            {p.subject && <Row label={t("qr.v2.subject")} value={p.subject} />}
            {p.body && <Row label={t("qr.v2.message")} value={p.body} />}
          </div>
          <a href={`mailto:${p.to}?${new URLSearchParams({ ...(p.subject ? { subject: p.subject } : {}), ...(p.body ? { body: p.body } : {}) }).toString().replace(/\+/g, "%20")}`} className={actionClass}>
            <Mail className="h-4 w-4" aria-hidden="true" />
            {t("qrscan.v2.writeEmail")}
          </a>
        </div>
      )}
      {p.kind === "tel" && (
        <div className="space-y-3">
          <p className="font-mono text-[18px] text-t-primary" dir="ltr">
            {p.number}
          </p>
          <a href={`tel:${p.number}`} className={actionClass}>
            <Phone className="h-4 w-4" aria-hidden="true" />
            {t("qrscan.v2.call")}
          </a>
        </div>
      )}
      {p.kind === "sms" && (
        <div className="space-y-3">
          <div className="divide-y divide-border">
            <Row label={t("qr.typeTel")} value={p.number} onCopy={onCopy} />
            {p.message && <Row label={t("qr.v2.message")} value={p.message} />}
          </div>
          <a href={`sms:${p.number}${p.message ? `?body=${encodeURIComponent(p.message)}` : ""}`} className={actionClass}>
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
            {t("qrscan.v2.sendSms")}
          </a>
        </div>
      )}
      {p.kind === "geo" && (
        <div className="space-y-3">
          <p className="font-mono text-[15px] text-t-primary" dir="ltr">
            {p.lat}, {p.lng}
          </p>
          <a href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`} target="_blank" rel="noopener noreferrer" className={actionClass}>
            <MapPin className="h-4 w-4" aria-hidden="true" />
            {t("qrscan.v2.openMap")}
          </a>
        </div>
      )}
      {p.kind === "text" && (
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-bg-secondary p-3 font-mono text-[13.5px] text-t-primary">{scan.text}</pre>
      )}
    </div>
  );
}
