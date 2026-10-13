"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Copy, Download, ImagePlus, Loader2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { Segmented, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { ctx2d, decodeImage, makeCanvas, releaseCanvas, resizeBitmap } from "@/lib/image-editor-kit";
import { downloadBlob, getFileNameWithoutExtension } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useStoredPref } from "@/lib/text-tools/hooks";
import { extractPalette, isLight, rgbToHsl, type Swatch } from "./palette-core";

type Export = "css" | "tailwind" | "scss" | "json";

export default function ColorPalettePage() {
  const { t } = useI18n();
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [pixels, setPixels] = useState<Uint8ClampedArray | null>(null);
  const [busy, setBusy] = useState(false);
  const [count, setCount] = useStoredPref<number>("palette.count", 6, [5, 6, 8, 10, 12]);
  const [fmt, setFmt] = useStoredPref<Export>("palette.export", "css", ["css", "tailwind", "scss", "json"]);

  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  const load = async (f: File) => {
    setBusy(true);
    try {
      const decoded = await decodeImage(f);
      const k = Math.min(1, 160 / Math.max(decoded.width, decoded.height));
      const small = await resizeBitmap(decoded.bitmap, Math.max(1, Math.round(decoded.width * k)), Math.max(1, Math.round(decoded.height * k)));
      decoded.bitmap.close();
      const c = makeCanvas(small.width, small.height);
      const ctx = ctx2d(c, { willReadFrequently: true });
      ctx.drawImage(small, 0, 0);
      const data = ctx.getImageData(0, 0, small.width, small.height).data;
      small.close();
      releaseCanvas(c);
      setFile(f);
      setUrl(URL.createObjectURL(f));
      setPixels(data);
    } catch {
      toast.error(t("ui.failedLoad"));
    } finally {
      setBusy(false);
    }
  };

  const palette = useMemo<Swatch[]>(() => (pixels ? extractPalette(pixels, count) : []), [pixels, count]);

  const copy = async (text: string, msg = t("palette.copied")) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(msg);
    } catch {
      toast.error(t("ui.copyFailed"));
    }
  };

  const code = useMemo(() => {
    const names = palette.map((_, i) => `color-${i + 1}`);
    switch (fmt) {
      case "tailwind":
        return `// tailwind.config.js → theme.extend.colors\nbrand: {\n${palette.map((s, i) => `  ${(i + 1) * 100}: "${s.hex}",`).join("\n")}\n}`;
      case "scss":
        return palette.map((s, i) => `$${names[i]}: ${s.hex};`).join("\n");
      case "json":
        return JSON.stringify(palette.map((s) => ({ hex: s.hex, rgb: [s.r, s.g, s.b], share: Math.round(s.share * 1000) / 10 })), null, 2);
      default:
        return `:root {\n${palette.map((s, i) => `  --${names[i]}: ${s.hex};`).join("\n")}\n}`;
    }
  }, [palette, fmt]);

  const downloadPng = async () => {
    const w = 1200;
    const h = 400;
    const c = makeCanvas(w, h);
    const ctx = ctx2d(c);
    let x = 0;
    palette.forEach((s, i) => {
      const sw = i === palette.length - 1 ? w - x : Math.round(w / palette.length);
      ctx.fillStyle = s.hex;
      ctx.fillRect(x, 0, sw, h);
      ctx.fillStyle = isLight(s) ? "#16181d" : "#ffffff";
      ctx.font = "600 22px ui-monospace, Menlo, monospace";
      ctx.fillText(s.hex, x + 20, h - 28);
      x += sw;
    });
    c.toBlob((b) => {
      if (b) downloadBlob(b, `${file ? getFileNameWithoutExtension(file.name) : "palette"}-palette.png`);
      releaseCanvas(c);
    }, "image/png");
  };

  return (
    <ToolLayout toolName={t("tool.color-palette.name")} toolDescription={t("tool.color-palette.desc")}>
      <div className="space-y-5">
        {!url ? (
          busy ? (
            <div className="glass flex h-56 items-center justify-center gap-2 text-[14px] text-t-secondary" role="status">
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              {t("ui.loading")}
            </div>
          ) : (
            <FileDropzone
              onFilesSelected={(fs) => fs[0] && load(fs[0])}
              accept={{ "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".bmp"] }}
              multiple={false}
              formats={["JPG", "PNG", "WEBP", "GIF", "AVIF"]}
              label={t("palette.hint")}
            />
          )
        ) : (
          <>
            <div className="glass grid gap-5 p-5 md:grid-cols-[minmax(0,320px)_1fr]">
              <div className="space-y-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={t("palette.ui.uploadedPreview")} className="max-h-72 w-full rounded-xl object-contain" />
                <label className={`${buttonSecondary} w-full cursor-pointer`}>
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  {t("wm.newImage")}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && load(e.target.files[0])} />
                </label>
              </div>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className={sectionTitle}>{t("palette.colors")}</p>
                  <Segmented<number> label={t("palette.count")} size="sm" value={count} onChange={setCount} options={[5, 6, 8, 10, 12].map((n) => ({ value: n, label: String(n) }))} />
                </div>
                {/* Proportional strip */}
                <div className="flex h-14 overflow-hidden rounded-xl border border-border" aria-hidden="true">
                  {palette.map((s) => (
                    <div key={s.hex} style={{ background: s.hex, flexGrow: Math.max(0.04, s.share) }} />
                  ))}
                </div>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {palette.map((s) => {
                    const [h, sat, l] = rgbToHsl(s.r, s.g, s.b);
                    return (
                      <li key={s.hex} className="overflow-hidden rounded-xl border border-border">
                        <button type="button" onClick={() => copy(s.hex)} className="flex h-20 w-full items-end p-2 text-start" style={{ background: s.hex, color: isLight(s) ? "#16181d" : "#ffffff" }} title={t("palette.ui.clickSwatch")}>
                          <span className="font-mono text-[13px] font-semibold">{s.hex}</span>
                        </button>
                        <div className="space-y-0.5 p-2 text-[12px] text-t-secondary">
                          <button type="button" onClick={() => copy(`rgb(${s.r} ${s.g} ${s.b})`)} className="block font-mono hover:text-t-primary">
                            rgb({s.r} {s.g} {s.b})
                          </button>
                          <button type="button" onClick={() => copy(`hsl(${h} ${sat}% ${l}%)`)} className="block font-mono hover:text-t-primary">
                            hsl({h} {sat}% {l}%)
                          </button>
                          <p className="tabular-nums text-t-tertiary">{t("palette.v2.share", { pct: (s.share * 100).toFixed(1) })}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <div className="glass space-y-3 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Segmented<Export>
                  label={t("palette.v2.export")}
                  size="sm"
                  value={fmt}
                  onChange={setFmt}
                  options={[
                    { value: "css", label: "CSS" },
                    { value: "tailwind", label: "Tailwind" },
                    { value: "scss", label: "SCSS" },
                    { value: "json", label: "JSON" },
                  ]}
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => copy(code, t("ui.copied"))} className={buttonSecondary}>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    {t("ui.copy")}
                  </button>
                  <button type="button" onClick={downloadPng} className={buttonSecondary}>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    PNG
                  </button>
                </div>
              </div>
              <pre dir="ltr" className="overflow-auto rounded-xl bg-bg-secondary p-3 font-mono text-[13px] leading-5 text-t-primary">
                {code}
              </pre>
              <p className="text-[12.5px] text-t-tertiary">{t("palette.v2.how")}</p>
            </div>
          </>
        )}
      </div>
    </ToolLayout>
  );
}
