"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { downloadBlob } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

type QRType = "url" | "text" | "tel" | "email" | "wifi";

interface WifiData {
  ssid: string;
  password: string;
  security: "WPA" | "WEP" | "nopass";
  hidden: boolean;
}

const LOGO_RATIO = 0.22; // logo occupies 22% of QR width

function buildWifiString(w: WifiData): string {
  return `WIFI:T:${w.security};S:${w.ssid};P:${w.password};H:${w.hidden};;`;
}

export default function QRGeneratorPage() {
  const { t } = useI18n();

  const [qrType, setQrType] = useState<QRType>("url");
  const [input, setInput] = useState("");
  const [wifi, setWifi] = useState<WifiData>({ ssid: "", password: "", security: "WPA", hidden: false });

  const [fgColor, setFgColor] = useState("#1a1a2e");
  const [bgColor, setBgColor] = useState("#ffffff");
  const [size, setSize] = useState(400);

  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);

  const PRESETS = [
    { label: "Dark", fg: "#1a1a2e", bg: "#ffffff" },
    { label: "Indigo", fg: "#4f46e5", bg: "#eef2ff" },
    { label: "Forest", fg: "#15803d", bg: "#f0fdf4" },
    { label: "Sunset", fg: "#b45309", bg: "#fffbeb" },
    { label: "Neon", fg: "#00ff88", bg: "#0f0f13" },
    { label: "Pure", fg: "#000000", bg: "#ffffff" },
  ];

  const TYPE_LABELS: Record<QRType, string> = {
    url: t("qr.typeUrl"),
    text: t("qr.typeText"),
    tel: t("qr.typeTel"),
    email: t("qr.typeEmail"),
    wifi: t("qr.typeWifi"),
  };

  const formatContent = useCallback((): string => {
    if (qrType === "wifi") return buildWifiString(wifi);
    if (qrType === "tel") return `tel:${input}`;
    if (qrType === "email") return `mailto:${input}`;
    return input;
  }, [qrType, input, wifi]);

  const hasContent = qrType === "wifi"
    ? wifi.ssid.trim().length > 0
    : input.trim().length > 0;

  useEffect(() => {
    if (!hasContent) { setQrDataUrl(null); return; }

    const generate = async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const content = formatContent();
        // Always use H error correction so logo overlay doesn't break scanability
        const ecl = logoDataUrl ? "H" : "M";

        const offscreen = document.createElement("canvas");
        await QRCode.toCanvas(offscreen, content, {
          width: size,
          margin: 2,
          color: { dark: fgColor, light: bgColor },
          errorCorrectionLevel: ecl,
        });

        if (logoDataUrl) {
          const ctx = offscreen.getContext("2d");
          if (ctx) {
            const logoSize = size * LOGO_RATIO;
            const lx = (size - logoSize) / 2;
            const ly = (size - logoSize) / 2;
            const pad = 6;
            const r = 10;

            // White-padded backing card
            ctx.save();
            ctx.fillStyle = bgColor;
            ctx.beginPath();
            ctx.roundRect(lx - pad, ly - pad, logoSize + pad * 2, logoSize + pad * 2, r + 2);
            ctx.fill();
            ctx.restore();

            // Draw logo clipped to rounded rect
            await new Promise<void>((res) => {
              const img = new Image();
              img.onload = () => {
                ctx.save();
                ctx.beginPath();
                ctx.roundRect(lx, ly, logoSize, logoSize, r);
                ctx.clip();
                ctx.drawImage(img, lx, ly, logoSize, logoSize);
                ctx.restore();
                res();
              };
              img.src = logoDataUrl;
            });
          }
        }

        setQrDataUrl(offscreen.toDataURL("image/png"));
      } catch {
        setQrDataUrl(null);
      }
    };

    const t = setTimeout(generate, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, wifi, fgColor, bgColor, size, qrType, logoDataUrl]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoDataUrl(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const removeLogo = () => {
    setLogoDataUrl(null);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const downloadPNG = () => {
    if (!qrDataUrl) return;
    fetch(qrDataUrl).then((r) => r.blob()).then((b) => downloadBlob(b, "qrcode.png"));
  };

  const downloadSVG = async () => {
    if (!hasContent) return;
    try {
      const QRCode = (await import("qrcode")).default;
      const svgStr = await QRCode.toString(formatContent(), {
        type: "svg",
        width: size,
        margin: 2,
        color: { dark: fgColor, light: bgColor },
      });
      downloadBlob(new Blob([svgStr], { type: "image/svg+xml" }), "qrcode.svg");
    } catch {
      toast.error(t("qr.svgExportFail"));
    }
  };

  const copySvgToClipboard = async () => {
    if (!hasContent) return;
    try {
      const QRCode = (await import("qrcode")).default;
      const svgStr = await QRCode.toString(formatContent(), {
        type: "svg",
        width: size,
        margin: 2,
        color: { dark: fgColor, light: bgColor },
      });
      await navigator.clipboard.writeText(svgStr);
      toast.success(t("qr.svgCopied"), { duration: 4000 });
    } catch {
      toast.error(t("qr.copyNotSupported"));
    }
  };

  const copyToClipboard = async () => {
    if (!qrDataUrl) return;
    try {
      const res = await fetch(qrDataUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.success(t("qr.copied"), { duration: 4000 });
    } catch {
      toast.error(t("qr.copyNotSupported"));
    }
  };

  return (
    <ToolLayout
      toolName={t("tool.qr-generator.name")}
      toolDescription={t("tool.qr-generator.desc")}
    >
      <div className="space-y-5">
        {/* Type selector */}
        <div className="glass rounded-2xl p-5">
          <p className="text-xs font-semibold text-t-tertiary uppercase tracking-wider mb-3">{t("qr.sectionType")}</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(TYPE_LABELS) as QRType[]).map((type) => (
              <button
                key={type}
                onClick={() => { setQrType(type); setInput(""); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  qrType === type
                    ? "bg-accent/15 border border-accent text-accent"
                    : "bg-bg-secondary border border-border text-t-secondary hover:border-border-strong hover:text-t-primary"
                }`}
              >
                {TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Left: settings */}
          <div className="lg:col-span-3 space-y-5">
            {/* Content input */}
            <div className="glass rounded-2xl p-5">
              <p className="text-xs font-semibold text-t-tertiary uppercase tracking-wider mb-3">{t("qr.content")}</p>

              {qrType === "wifi" ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={wifi.ssid}
                    onChange={(e) => setWifi((w) => ({ ...w, ssid: e.target.value }))}
                    placeholder={t("qr.wifi.ssid")}
                    className="w-full px-4 py-2.5 rounded-xl bg-bg-secondary border border-border text-t-primary placeholder:text-t-tertiary focus:outline-none focus:border-accent/50 text-sm"
                  />
                  <input
                    type="text"
                    value={wifi.password}
                    onChange={(e) => setWifi((w) => ({ ...w, password: e.target.value }))}
                    placeholder={t("qr.wifi.password")}
                    className="w-full px-4 py-2.5 rounded-xl bg-bg-secondary border border-border text-t-primary placeholder:text-t-tertiary focus:outline-none focus:border-accent/50 text-sm"
                  />
                  <div className="flex gap-3 items-center">
                    <select
                      value={wifi.security}
                      onChange={(e) => setWifi((w) => ({ ...w, security: e.target.value as WifiData["security"] }))}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-bg-secondary border border-border text-t-primary focus:outline-none focus:border-accent/50 text-sm"
                    >
                      <option value="WPA">WPA/WPA2</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">{t("qr.wifiNoPass")}</option>
                    </select>
                    <label className="flex items-center gap-2 text-sm text-t-secondary cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={wifi.hidden}
                        onChange={(e) => setWifi((w) => ({ ...w, hidden: e.target.checked }))}
                        className="accent-accent"
                      />
                      {t("qr.wifi.hidden")}
                    </label>
                  </div>
                </div>
              ) : qrType === "text" ? (
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={qrType === "text" ? t("qr.placeholderFreeText") : ""}
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl bg-bg-secondary border border-border text-t-primary placeholder:text-t-tertiary focus:outline-none focus:border-accent/50 text-sm resize-none"
                />
              ) : (
                <input
                  type={qrType === "email" ? "email" : "text"}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    qrType === "url" ? t("qr.phUrl") :
                    qrType === "tel" ? t("qr.phTel") :
                    t("qr.phEmail")
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-bg-secondary border border-border text-t-primary placeholder:text-t-tertiary focus:outline-none focus:border-accent/50 text-sm"
                />
              )}
            </div>

            {/* Colors */}
            <div className="glass rounded-2xl p-5">
              <p className="text-xs font-semibold text-t-tertiary uppercase tracking-wider mb-3">{t("qr.colors")}</p>

              {/* Presets */}
              <div className="flex flex-wrap gap-2 mb-4">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    title={p.label}
                    onClick={() => { setFgColor(p.fg); setBgColor(p.bg); }}
                    className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${
                      fgColor === p.fg && bgColor === p.bg ? "border-accent" : "border-transparent"
                    }`}
                    style={{ background: `linear-gradient(135deg, ${p.bg} 50%, ${p.fg} 50%)` }}
                  />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-t-tertiary mb-1.5">{t("qr.foreground")}</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={fgColor} onChange={(e) => setFgColor(e.target.value)}
                      className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 flex-shrink-0" />
                    <input type="text" value={fgColor} onChange={(e) => setFgColor(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-bg-secondary border border-border text-t-primary text-xs focus:outline-none focus:border-accent/50 font-mono min-w-0" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-t-tertiary mb-1.5">{t("qr.background")}</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                      className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 flex-shrink-0" />
                    <input type="text" value={bgColor} onChange={(e) => setBgColor(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-bg-secondary border border-border text-t-primary text-xs focus:outline-none focus:border-accent/50 font-mono min-w-0" />
                  </div>
                </div>
              </div>
            </div>

            {/* Logo upload */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-semibold text-t-tertiary uppercase tracking-wider">{t("qr.logo")}</p>
                  <p className="text-xs text-t-tertiary mt-0.5">{t("qr.logoHint")}</p>
                </div>
                {logoDataUrl && (
                  <button onClick={removeLogo}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10">
                    {t("qr.removeLogo")}
                  </button>
                )}
              </div>

              {logoDataUrl ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-bg-secondary border border-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logoDataUrl} alt="Logo preview" className="w-12 h-12 rounded-lg object-contain border border-border" />
                  <div>
                    <p className="text-sm text-t-primary font-medium">{t("qr.logoLoaded")}</p>
                    <p className="text-xs text-t-tertiary">{t("qr.logoCenterHint")}</p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-border hover:border-accent/50 text-t-tertiary hover:text-accent transition-all text-sm font-medium"
                >
                  + {t("qr.uploadLogo")} (PNG / JPG)
                </button>
              )}
              <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                className="hidden" onChange={handleLogoChange} />
            </div>

            {/* Size */}
            <div className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-t-tertiary uppercase tracking-wider">{t("qr.size")}</p>
                <span className="text-sm text-t-secondary font-mono">{size}px</span>
              </div>
              <input type="range" min="200" max="1200" step="100" value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="w-full accent-accent" />
              <div className="flex justify-between text-xs text-t-tertiary mt-1">
                <span>200px</span>
                <span>1200px</span>
              </div>
            </div>
          </div>

          {/* Right: preview */}
          <div className="lg:col-span-2 space-y-4">
            <div className="glass rounded-2xl p-6 flex items-center justify-center min-h-[280px] sticky top-4">
              {qrDataUrl ? (
                <div className="w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt="QR Code" className="w-full max-w-[260px] mx-auto rounded-xl block" />
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-bg-secondary border-2 border-dashed border-border flex items-center justify-center">
                    <span className="text-2xl">📱</span>
                  </div>
                  <p className="text-sm text-t-tertiary">{t("qr.enterContent")}</p>
                </div>
              )}
            </div>

            {qrDataUrl && (
              <div className="space-y-2">
                <button onClick={downloadPNG}
                  className="w-full py-3 rounded-xl font-semibold text-white bg-accent hover:bg-accent-hover transition-all hover:scale-[1.02] active:scale-[0.98] text-sm">
                  ⬇ {t("qr.downloadPNG")}
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button type="button" onClick={downloadSVG}
                    className="py-2.5 rounded-xl font-medium text-t-secondary bg-bg-secondary hover:bg-bg-tertiary transition-all border border-border text-sm">
                    {t("qr.downloadSVG")}
                  </button>
                  <button type="button" onClick={copySvgToClipboard}
                    className="py-2.5 rounded-xl font-medium text-t-secondary bg-bg-secondary hover:bg-bg-tertiary transition-all border border-border text-sm">
                    {t("qr.copySVG")}
                  </button>
                  <button type="button" onClick={copyToClipboard}
                    className="py-2.5 rounded-xl font-medium text-t-secondary bg-bg-secondary hover:bg-bg-tertiary transition-all border border-border text-sm">
                    {t("qr.copyImage")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ToolLayout>
  );
}
