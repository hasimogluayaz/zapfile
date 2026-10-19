"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, Copy, Download, Loader2, Trash2 } from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { Segmented, Slider, sectionTitle } from "@/components/ui/controls";
import { processImage } from "@/lib/image-engine";
import { downloadBlob, formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useStoredPref } from "@/lib/text-tools/hooks";

type Snippet = "datauri" | "raw" | "html" | "css" | "markdown" | "json";
type Optimize = "original" | "webp" | "same";

interface Item {
  id: number;
  file: File;
  url: string;
  /** Encoded result (after optional optimisation). */
  out: { dataUri: string; bytes: number; mime: string; w: number; h: number } | null;
  error: boolean;
}

const MAX_WIDTHS = [0, 64, 128, 256, 512, 1024, 2048];
let seq = 0;

function readDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** SVG is text: URL-encoding is ~30% smaller than Base64 and works everywhere. */
function svgDataUri(svg: string): string {
  const body = svg
    .replace(/\s+/g, " ")
    .trim()
    .replace(/"/g, "'")
    .replace(/[\r\n%#()<>?[\\\]^`{|}]/g, encodeURIComponent);
  return `data:image/svg+xml,${body}`;
}

async function imageSize(blob: Blob): Promise<{ w: number; h: number }> {
  try {
    const bmp = await createImageBitmap(blob);
    const s = { w: bmp.width, h: bmp.height };
    bmp.close();
    return s;
  } catch {
    return { w: 0, h: 0 };
  }
}

export default function ImageToBase64Page() {
  const { t } = useI18n();
  const [items, setItems] = useState<Item[]>([]);
  const [snippet, setSnippet] = useStoredPref<Snippet>("imgb64.snippet", "datauri", ["datauri", "raw", "html", "css", "markdown", "json"]);
  const [optimize, setOptimize] = useStoredPref<Optimize>("imgb64.optimize", "original", ["original", "webp", "same"]);
  const [maxWidth, setMaxWidth] = useStoredPref<number>("imgb64.maxw", 0);
  const [quality, setQuality] = useStoredPref<number>("imgb64.q", 85);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.url)), []);

  const encode = useCallback(
    async (file: File): Promise<Item["out"]> => {
      if (file.type === "image/svg+xml" || /\.svg$/i.test(file.name)) {
        const text = await file.text();
        const dataUri = svgDataUri(text);
        const m = /viewBox=["'][\d.\s-]*?([\d.]+)[\s,]+([\d.]+)["']/.exec(text);
        return { dataUri, bytes: dataUri.length, mime: "image/svg+xml", w: m ? Math.round(+m[1]!) : 0, h: m ? Math.round(+m[2]!) : 0 };
      }
      // Animated GIFs and icons are embedded as they are.
      const keep = optimize === "original" || file.type === "image/gif" || file.type === "image/x-icon";
      let blob: Blob = file;
      let w = 0;
      let h = 0;
      if (!keep) {
        const format = optimize === "webp" ? "image/webp" : file.type === "image/png" ? "image/png" : file.type === "image/webp" ? "image/webp" : "image/jpeg";
        const res = await processImage({
          input: file,
          transform: maxWidth ? { resize: { width: maxWidth, height: maxWidth * 20, fit: "contain" } } : undefined,
          encode: { format, quality: quality / 100 },
          keepOriginalIfLarger: !maxWidth && optimize === "same",
        });
        blob = res.blob;
        w = res.width;
        h = res.height;
      } else {
        ({ w, h } = await imageSize(file));
      }
      const dataUri = await readDataUrl(blob);
      return { dataUri, bytes: dataUri.length, mime: blob.type || file.type, w, h };
    },
    [optimize, maxWidth, quality],
  );

  // (Re-)encode everything when the options change.
  useEffect(() => {
    let live = true;
    const list = itemsRef.current;
    if (!list.length) return;
    setItems((prev) => prev.map((i) => ({ ...i, out: null, error: false })));
    (async () => {
      for (const it of list) {
        try {
          const out = await encode(it.file);
          if (live) setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, out } : p)));
        } catch {
          if (live) setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, error: true } : p)));
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [encode]);

  const addFiles = async (files: File[]) => {
    const added = files.map((file) => ({ id: ++seq, file, url: URL.createObjectURL(file), out: null, error: false }) as Item);
    setItems((prev) => [...prev, ...added]);
    for (const it of added) {
      try {
        const out = await encode(it.file);
        setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, out } : p)));
      } catch {
        setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, error: true } : p)));
      }
    }
  };

  const snippetFor = (it: Item): string => {
    if (!it.out) return "";
    const { dataUri, w, h } = it.out;
    const name = getFileNameWithoutExtension(it.file.name);
    switch (snippet) {
      case "raw":
        return dataUri.startsWith("data:image/svg+xml,") ? btoa(unescape(encodeURIComponent(decodeURIComponent(dataUri.slice(19))))) : dataUri.slice(dataUri.indexOf(",") + 1);
      case "html":
        return `<img src="${dataUri.replace(/"/g, "&quot;")}" alt="${name}"${w ? ` width="${w}" height="${h}"` : ""}>`;
      case "css":
        return `background-image: url("${dataUri.replace(/"/g, "'")}");`;
      case "markdown":
        return `![${name}](${dataUri})`;
      case "json":
        return JSON.stringify(dataUri);
      default:
        return dataUri;
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

  return (
    <ToolLayout toolName={t("tool.image-to-base64.name")} toolDescription={t("tool.image-to-base64.desc")}>
      <div className="space-y-5">
        <FileDropzone
          onFilesSelected={addFiles}
          accept={{ "image/*": [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif", ".ico", ".bmp"] }}
          multiple
          formats={["PNG", "JPG", "WEBP", "SVG", "GIF", "AVIF", "ICO"]}
          label={t("imgb64.v2.drop")}
        />

        <div className="glass space-y-4 p-5">
          <div className="space-y-2">
            <p className={sectionTitle}>{t("imgb64.v2.output")}</p>
            <Segmented<Snippet>
              label={t("imgb64.v2.output")}
              size="sm"
              value={snippet}
              onChange={setSnippet}
              options={[
                { value: "datauri", label: "Data URI" },
                { value: "raw", label: "Base64" },
                { value: "html", label: "<img>" },
                { value: "css", label: "CSS" },
                { value: "markdown", label: "Markdown" },
                { value: "json", label: "JSON" },
              ]}
            />
          </div>
          <div className="space-y-2">
            <p className={sectionTitle}>{t("imgb64.v2.optimize")}</p>
            <Segmented<Optimize>
              label={t("imgb64.v2.optimize")}
              size="sm"
              value={optimize}
              onChange={setOptimize}
              options={[
                { value: "original", label: t("imgb64.v2.asIs") },
                { value: "same", label: t("imgb64.v2.compress") },
                { value: "webp", label: "WebP" },
              ]}
            />
            {optimize !== "original" && (
              <div className="grid gap-4 pt-2 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-[13px] text-t-secondary">{t("imgb64.v2.maxWidth")}</span>
                  <select value={maxWidth} onChange={(e) => setMaxWidth(Number(e.target.value))} className="h-10 w-full rounded-xl border border-border bg-bg-secondary px-3 text-[14px] text-t-primary">
                    {MAX_WIDTHS.map((w) => (
                      <option key={w} value={w}>
                        {w ? `${w} px` : t("imgb64.v2.keepSize")}
                      </option>
                    ))}
                  </select>
                </label>
                <Slider label={t("ui.quality")} value={quality} min={40} max={100} onChange={setQuality} display={`${quality}%`} />
              </div>
            )}
            <p className="text-[12.5px] text-t-tertiary">{t("imgb64.v2.optimizeHint")}</p>
          </div>
        </div>

        {items.map((it) => {
          const text = snippetFor(it);
          const big = it.out && it.out.bytes > 20 * 1024;
          return (
            <div key={it.id} className="glass space-y-3 p-5">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.url} alt="" className="h-14 w-14 rounded-lg border border-border object-contain" style={{ background: "repeating-conic-gradient(#e5e5e5 0% 25%, #fff 0% 50%) 50% / 10px 10px" }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-t-primary">{it.file.name}</p>
                  <p className="text-[12.5px] tabular-nums text-t-tertiary">
                    {formatFileSize(it.file.size)}
                    {it.out ? ` → ${formatFileSize(it.out.bytes)} ${t("imgb64.v2.asText")}` : ""}
                    {it.out?.w ? ` · ${it.out.w}×${it.out.h}` : ""}
                    {it.out?.mime ? ` · ${it.out.mime.replace("image/", "").toUpperCase()}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    URL.revokeObjectURL(it.url);
                    setItems((prev) => prev.filter((p) => p.id !== it.id));
                  }}
                  aria-label={t("ui.remove")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-t-tertiary hover:bg-bg-secondary hover:text-t-primary"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              {it.error ? (
                <p className="text-[13px] text-red-700 dark:text-red-400">{t("imgb64.readFail")}</p>
              ) : !it.out ? (
                <p className="flex items-center gap-2 text-[13px] text-t-secondary">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {t("ui.processing")}
                </p>
              ) : (
                <>
                  <textarea readOnly value={text.length > 200_000 ? text.slice(0, 200_000) + "…" : text} rows={4} dir="ltr" aria-label={it.file.name} className="block w-full resize-y break-all rounded-xl border border-border bg-bg-secondary px-3 py-2.5 font-mono text-[12px] leading-5 text-t-secondary" />
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => copy(text)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-[13px] font-semibold text-on-accent hover:bg-accent-hover">
                      <Copy className="h-4 w-4" aria-hidden="true" />
                      {t("ui.copy")}
                    </button>
                    <button type="button" onClick={() => downloadBlob(new Blob([text], { type: "text/plain" }), `${getFileNameWithoutExtension(it.file.name)}.${snippet === "css" ? "css" : snippet === "html" ? "html" : "txt"}`)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-[13px] font-medium text-t-primary hover:bg-bg-secondary">
                      <Download className="h-4 w-4" aria-hidden="true" />
                      {t("ui.download")}
                    </button>
                    {big && (
                      <span className="flex items-center gap-1.5 text-[12.5px] text-amber-700 dark:text-amber-400">
                        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                        {t("imgb64.v2.bigWarn")}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </ToolLayout>
  );
}
