"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  Check,
  Copy,
  Cpu,
  Download,
  Eraser,
  Hand,
  ImagePlus,
  Maximize2,
  Paintbrush,
  Redo2,
  RefreshCw,
  Undo2,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import CutoutEditor, { type CutoutEditorHandle, type EditorTool, type EditorView } from "@/components/bg-removal/CutoutEditor";
import { BgRemovalEngine, BgRemovalError, isModelCached, type ProgressEvent } from "@/lib/bg-removal/client";
import { CutoutDocument, type OutputKind } from "@/lib/bg-removal/document";
import {
  type Backdrop,
  type ExportFormat,
  blurredCanvas,
  canvasToBlob,
  context2d,
  createCanvas,
  extensionFor,
  renderExport,
} from "@/lib/bg-removal/compose";
import { fitPixels } from "@/lib/bg-removal/imaging";
import { DEFAULT_MODEL } from "@/lib/bg-removal/models";
import type { Backend, ErrorCode } from "@/lib/bg-removal/protocol";
import { DEFAULT_REFINE, type RefineOptions } from "@/lib/bg-removal/refine";
import { downloadBlob, formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

// ── Image loading ────────────────────────────────────────────────────────────

interface SourceImage {
  data: ImageData;
  canvas: HTMLCanvasElement;
  naturalWidth: number;
  naturalHeight: number;
}

function maxPixels(): number {
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return memory !== undefined && memory <= 4 ? 8_000_000 : 16_000_000;
}

async function decodeImage(file: File): Promise<SourceImage> {
  let source: (CanvasImageSource & { width: number; height: number }) | null = null;
  let release = () => {};
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    source = bitmap;
    release = () => bitmap.close();
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      source = img;
      release = () => URL.revokeObjectURL(url);
    } catch {
      URL.revokeObjectURL(url);
      throw new Error("decode");
    }
  }
  try {
    const naturalWidth = (source as HTMLImageElement).naturalWidth || source.width;
    const naturalHeight = (source as HTMLImageElement).naturalHeight || source.height;
    if (!naturalWidth || !naturalHeight) throw new Error("decode");
    const size = fitPixels({ width: naturalWidth, height: naturalHeight }, maxPixels());
    const canvas = createCanvas(size.width, size.height);
    const ctx = context2d(canvas);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, size.width, size.height);
    const data = ctx.getImageData(0, 0, size.width, size.height);
    return { data, canvas, naturalWidth, naturalHeight };
  } finally {
    release();
  }
}

// ── Small UI pieces ─────────────────────────────────────────────────────────

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = "md",
}: {
  value: T;
  options: { value: T; label: string; icon?: React.ReactNode; disabled?: boolean }[];
  onChange: (v: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          disabled={o.disabled}
          onClick={() => onChange(o.value)}
          className={`inline-flex items-center gap-1.5 rounded-[9px] font-medium transition-colors disabled:opacity-40 ${
            size === "sm" ? "px-2.5 py-1.5 text-[13px]" : "px-3 py-1.5 text-[13.5px]"
          } ${value === o.value ? "bg-surface text-t-primary shadow-sm" : "text-t-secondary hover:text-t-primary"}`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="h-6 w-10 rounded-full bg-bg-tertiary transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-volt" />
        <span className="absolute start-0.5 top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[14px] font-medium text-t-primary">{label}</span>
        {description && <span className="mt-0.5 block text-[12.5px] leading-snug text-t-tertiary">{description}</span>}
      </span>
    </label>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  display,
  className = "",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  display?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 flex items-center justify-between text-[12.5px] text-t-secondary">
        <span>{label}</span>
        <span className="tabular-nums text-t-tertiary">{display ?? value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[rgb(var(--accent-rgb))]"
      />
    </label>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${
        active ? "bg-accent text-on-accent" : "text-t-secondary hover:bg-bg-tertiary hover:text-t-primary"
      }`}
    >
      {children}
    </button>
  );
}

const SWATCHES = ["#ffffff", "#000000", "#f2f2f2", "#ffd60a", "#e8f0fe", "#fde2e4", "#d8f3dc", "#16181d"];

// ── Page ────────────────────────────────────────────────────────────────────

type Phase = "idle" | "working" | "ready" | "error";

export default function BackgroundRemoverPage() {
  const { t } = useI18n();

  const engineRef = useRef<BgRemovalEngine | null>(null);
  const editorRef = useRef<CutoutEditorHandle>(null);
  const runId = useRef(0);

  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [source, setSource] = useState<SourceImage | null>(null);
  const [doc, setDoc] = useState<CutoutDocument | null>(null);
  const [progress, setProgress] = useState<ProgressEvent | null>(null);
  const [error, setError] = useState<{ code: ErrorCode | "decode"; message: string } | null>(null);
  const [backend, setBackend] = useState<Backend | null>(null);
  const [timing, setTiming] = useState<number | null>(null);
  const [modelCached, setModelCached] = useState<boolean | null>(null);
  const [refining, setRefining] = useState(false);

  const [refine, setRefine] = useState<RefineOptions>(DEFAULT_REFINE);
  const [precision, setPrecision] = useState(false);
  const [output, setOutput] = useState<OutputKind>("subject");
  const [backdropKind, setBackdropKind] = useState<Backdrop["kind"]>("transparent");
  const [color, setColor] = useState("#ffffff");
  const [blurAmount, setBlurAmount] = useState(0.4);
  const [bgImage, setBgImage] = useState<ImageBitmap | null>(null);
  const [view, setView] = useState<EditorView>("result");
  const [tool, setTool] = useState<EditorTool>("pan");
  const [brushSize, setBrushSize] = useState(40);
  const [hardness, setHardness] = useState(0.6);
  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState({ undo: false, redo: false });

  const [format, setFormat] = useState<ExportFormat>("image/png");
  const [quality, setQuality] = useState(0.92);
  const [maxSide, setMaxSide] = useState(0);
  const [crop, setCrop] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    isModelCached().then(setModelCached);
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const blurred = useMemo(() => {
    if (!source || backdropKind !== "blur") return null;
    return blurredCanvas(source.canvas, blurAmount);
  }, [source, backdropKind, blurAmount]);

  const backdrop: Backdrop = useMemo(() => {
    if (backdropKind === "color") return { kind: "color", color };
    if (backdropKind === "blur") return { kind: "blur", amount: blurAmount };
    if (backdropKind === "image" && bgImage) return { kind: "image", image: bgImage };
    return { kind: "transparent" };
  }, [backdropKind, color, blurAmount, bgImage]);

  const getEngine = () => {
    if (!engineRef.current) {
      const engine = new BgRemovalEngine();
      engine.onProgress = (p) => setProgress(p);
      engine.onBackendChange = (b) => setBackend(b);
      engineRef.current = engine;
    }
    return engineRef.current;
  };

  const syncHistory = useCallback(() => {
    setHistory({ undo: !!doc?.canUndo, redo: !!doc?.canRedo });
  }, [doc]);

  const process = useCallback(
    async (input: File, options: RefineOptions, tta: boolean) => {
      const id = ++runId.current;
      setPhase("working");
      setError(null);
      setProgress(null);
      setDoc(null);
      setTiming(null);
      try {
        const image = await decodeImage(input).catch(() => {
          throw Object.assign(new Error("decode"), { code: "decode" as const });
        });
        if (id !== runId.current) return;
        setSource(image);
        const result = await getEngine().segment(image.data, options, tta);
        if (id !== runId.current) return;
        setModelCached(true);
        setTiming(result.inferenceMs + result.refineMs);
        const next = new CutoutDocument(
          new Uint8ClampedArray(image.data.data),
          result.data,
          result.width,
          result.height,
        );
        setDoc(next);
        setHistory({ undo: false, redo: false });
        setView("result");
        setPhase("ready");
      } catch (e) {
        if (id !== runId.current) return;
        const code: ErrorCode | "decode" =
          e instanceof BgRemovalError ? e.code : (e as { code?: "decode" }).code === "decode" ? "decode" : "runtime";
        console.error(e);
        setError({ code, message: e instanceof Error ? e.message : String(e) });
        setPhase("error");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const handleFiles = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setOutput("subject");
    setTool("pan");
    process(f, refine, precision);
  };

  const reset = () => {
    runId.current++;
    setFile(null);
    setSource(null);
    setDoc(null);
    setPhase("idle");
    setError(null);
    setProgress(null);
  };

  const cancel = () => {
    engineRef.current?.dispose();
    engineRef.current = null;
    reset();
  };

  const retry = () => {
    if (!file) return;
    if (error?.code === "runtime" || error?.code === "memory") {
      engineRef.current?.dispose();
      engineRef.current = null;
    }
    process(file, refine, precision);
  };

  const applyRefine = async (next: RefineOptions) => {
    if (!doc || refining) return;
    if (doc.isEdited && !window.confirm(t("bg.confirmReset"))) return;
    setRefine(next);
    setRefining(true);
    try {
      const result = await getEngine().refine(next);
      doc.replace(result.data);
      editorRef.current?.refresh(null);
      syncHistory();
    } catch (e) {
      console.error(e);
      toast.error(t("bg.err.refine"));
    } finally {
      setRefining(false);
    }
  };

  const togglePrecision = (value: boolean) => {
    if (!file || !doc) {
      setPrecision(value);
      return;
    }
    if (doc.isEdited && !window.confirm(t("bg.confirmReset"))) return;
    setPrecision(value);
    process(file, refine, value);
  };

  const undo = useCallback(() => {
    if (!doc) return;
    const rect = doc.undo();
    if (rect) editorRef.current?.refresh(rect);
    syncHistory();
  }, [doc, syncHistory]);

  const redo = useCallback(() => {
    if (!doc) return;
    const rect = doc.redo();
    if (rect) editorRef.current?.refresh(rect);
    syncHistory();
  }, [doc, syncHistory]);

  // Keyboard shortcuts while editing.
  useEffect(() => {
    if (phase !== "ready") return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (!mod && !e.altKey) {
        const k = e.key.toLowerCase();
        if (k === "e") setTool("erase");
        else if (k === "r") setTool("restore");
        else if (k === "h" || k === "v") setTool("pan");
        else if (k === "[") setBrushSize((s) => Math.max(4, Math.round(s / 1.2)));
        else if (k === "]") setBrushSize((s) => Math.min(300, Math.round(s * 1.2)));
        else if (k === "0") editorRef.current?.fit();
        else if (k === "1") editorRef.current?.zoomTo(1);
        else if (k === "+" || k === "=") editorRef.current?.zoomBy(1.25);
        else if (k === "-") editorRef.current?.zoomBy(0.8);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, redo, undo]);

  const chooseTool = (next: EditorTool) => {
    setTool(next);
    if (next !== "pan") {
      setView("result");
      if (output !== "subject") setOutput("subject");
    }
  };

  const loadBackgroundImage = async (f: File | undefined) => {
    if (!f) return;
    try {
      const bitmap = await createImageBitmap(f, { imageOrientation: "from-image" });
      setBgImage((old) => {
        old?.close();
        return bitmap;
      });
      setBackdropKind("image");
    } catch {
      toast.error(t("bg.err.bgImage"));
    }
  };

  const buildBlob = async () => {
    if (!doc || !source) throw new Error("No result");
    const canvas = renderExport(doc, source.canvas, {
      output,
      backdrop,
      format,
      quality,
      cropToSubject: crop,
      padding: 0.04,
      maxSide,
      blurred,
    });
    return canvasToBlob(canvas, format, quality);
  };

  const download = async () => {
    if (!file) return;
    setExporting(true);
    try {
      const blob = await buildBlob();
      const suffix = output === "subject" ? "no-bg" : output;
      downloadBlob(blob, `${getFileNameWithoutExtension(file.name)}-${suffix}.${extensionFor(blob.type)}`);
      toast.success(t("bg.downloaded"));
    } catch (e) {
      console.error(e);
      toast.error(t("bg.err.export"));
    } finally {
      setExporting(false);
    }
  };

  const copy = async () => {
    if (!doc || !source) return;
    try {
      if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) throw new Error("unsupported");
      // Clipboard images must be PNG; build lazily so Safari keeps the user gesture.
      const blobPromise = (async () => {
        const canvas = renderExport(doc, source.canvas, {
          output,
          backdrop,
          format: "image/png",
          quality: 1,
          cropToSubject: crop,
          padding: 0.04,
          maxSide,
          blurred,
        });
        return canvasToBlob(canvas, "image/png", 1);
      })();
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blobPromise })]);
      toast.success(t("bg.copied"));
    } catch {
      toast.error(t("bg.err.copy"));
    }
  };

  // ── Progress text ─────────────────────────────────────────────────────

  const progressInfo = (() => {
    const p = progress;
    if (!p || p.stage === "runtime") return { label: t("bg.stage.runtime"), pct: null as number | null };
    if (p.stage === "download") {
      if (p.fromCache) return { label: t("bg.stage.cache"), pct: null };
      const pct = p.total ? Math.min(100, (p.loaded ?? 0) / p.total * 100) : null;
      return {
        label: t("bg.stage.download", {
          loaded: formatFileSize(p.loaded ?? 0),
          total: formatFileSize(p.total ?? DEFAULT_MODEL.file.bytes),
        }),
        pct,
      };
    }
    if (p.stage === "init") return { label: t("bg.stage.init"), pct: null };
    if (p.stage === "inference") return { label: t("bg.stage.inference"), pct: null };
    return { label: t("bg.stage.refine"), pct: null };
  })();

  const errorText = (code: ErrorCode | "decode") => {
    switch (code) {
      case "download":
        return t("bg.err.download");
      case "memory":
        return t("bg.err.memory");
      case "decode":
        return t("bg.err.decode");
      case "unsupported":
        return t("bg.err.unsupported");
      case "inference":
        return t("bg.err.inference");
      default:
        return t("bg.err.runtime");
    }
  };

  const primaryButton =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-[15px] font-semibold text-on-accent transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40";
  const secondaryButton =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-[14px] font-medium text-t-primary transition hover:bg-bg-secondary disabled:cursor-not-allowed disabled:opacity-40";
  const sectionTitle = "mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-t-tertiary";

  const scaledDown = source && (source.naturalWidth !== source.data.width || source.naturalHeight !== source.data.height);
  const painting = tool !== "pan";

  return (
    <ToolLayout
      toolName="Background Remover"
      toolDescription="Remove image backgrounds with an AI model that runs on your device, then fine-tune edges with erase and restore brushes."
    >
      <div className="space-y-5">
        {phase === "idle" && (
          <>
            <FileDropzone
              onFilesSelected={handleFiles}
              accept={{
                "image/jpeg": [".jpg", ".jpeg"],
                "image/png": [".png"],
                "image/webp": [".webp"],
              }}
              label={t("bg.drop")}
              formats={["JPG", "PNG", "WEBP"]}
            />
            <p className="flex items-start gap-2 text-[13px] leading-relaxed text-t-tertiary">
              <Cpu className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {modelCached
                  ? t("bg.modelReady")
                  : t("bg.modelNote", { size: formatFileSize(DEFAULT_MODEL.file.bytes) })}
              </span>
            </p>
          </>
        )}

        {phase === "working" && (
          <div className="glass overflow-hidden p-0" aria-live="polite" aria-busy="true">
            <div className="relative flex h-[min(60vh,560px)] min-h-[300px] items-center justify-center bg-bg-secondary">
              {previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt="" className="max-h-full max-w-full object-contain opacity-40 blur-[1px]" />
              )}
              <div className="absolute inset-x-0 bottom-0 top-0 flex items-center justify-center p-6">
                <div className="w-full max-w-sm rounded-2xl border border-border bg-surface/95 p-5 shadow-lg backdrop-blur">
                  <p className="text-[15px] font-semibold text-t-primary">{progressInfo.label}</p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg-tertiary">
                    {progressInfo.pct === null ? (
                      <div className="h-full w-1/3 animate-[indeterminate_1.2s_ease-in-out_infinite] rounded-full bg-accent" />
                    ) : (
                      <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${progressInfo.pct}%` }} />
                    )}
                  </div>
                  {progress?.stage === "download" && !progress.fromCache && (
                    <p className="mt-3 text-[12.5px] leading-snug text-t-tertiary">{t("bg.downloadOnce")}</p>
                  )}
                  <button type="button" onClick={cancel} className="mt-4 text-[13px] font-medium text-t-secondary underline-offset-2 hover:text-t-primary hover:underline">
                    {t("bg.cancel")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {phase === "error" && error && (
          <div role="alert" className="glass space-y-4 p-6">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-t-primary">{t("bg.err.title")}</p>
                <p className="mt-1 text-[14px] text-t-secondary">{errorText(error.code)}</p>
                <details className="mt-2 text-[12px] text-t-tertiary">
                  <summary className="cursor-pointer">{t("bg.err.details")}</summary>
                  <p className="mt-1 break-words font-mono">{error.message}</p>
                </details>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {error.code !== "decode" && (
                <button type="button" onClick={retry} className={primaryButton}>
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                  {t("bg.retry")}
                </button>
              )}
              <button type="button" onClick={reset} className={secondaryButton}>
                <ImagePlus className="h-4 w-4" aria-hidden="true" />
                {t("bg.newImage")}
              </button>
            </div>
          </div>
        )}

        {phase === "ready" && doc && source && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
            {/* Editor */}
            <div className="glass overflow-hidden p-0">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
                <Segmented
                  label={t("bg.view")}
                  size="sm"
                  value={view}
                  onChange={(v) => {
                    setView(v);
                    if (v !== "result") setTool("pan");
                  }}
                  options={[
                    { value: "result", label: t("bg.view.result") },
                    { value: "compare", label: t("bg.view.compare") },
                    { value: "original", label: t("bg.view.original") },
                  ]}
                />
                <div className="flex items-center gap-0.5">
                  <IconButton label={t("bg.zoomOut")} onClick={() => editorRef.current?.zoomBy(0.8)}>
                    <ZoomOut className="h-[18px] w-[18px]" aria-hidden="true" />
                  </IconButton>
                  <button
                    type="button"
                    onClick={() => editorRef.current?.zoomTo(1)}
                    title={t("bg.actualSize")}
                    className="h-9 min-w-[3.5rem] rounded-lg px-1 text-[13px] tabular-nums text-t-secondary hover:bg-bg-tertiary hover:text-t-primary"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <IconButton label={t("bg.zoomIn")} onClick={() => editorRef.current?.zoomBy(1.25)}>
                    <ZoomIn className="h-[18px] w-[18px]" aria-hidden="true" />
                  </IconButton>
                  <IconButton label={t("bg.fit")} onClick={() => editorRef.current?.fit()}>
                    <Maximize2 className="h-[17px] w-[17px]" aria-hidden="true" />
                  </IconButton>
                </div>
              </div>

              <div
                className="relative max-h-[min(68vh,680px)] min-h-[260px] w-full bg-bg-secondary"
                style={{ aspectRatio: `${doc.width} / ${doc.height}` }}
              >
                <CutoutEditor
                  ref={editorRef}
                  doc={doc}
                  original={source.canvas}
                  blurred={blurred}
                  output={output}
                  backdrop={backdrop}
                  view={view}
                  tool={tool}
                  brushSize={brushSize}
                  hardness={hardness}
                  onStrokeEnd={syncHistory}
                  onZoomChange={setZoom}
                  labels={{
                    canvas: t("bg.canvasLabel"),
                    before: t("bg.before"),
                    after: t("bg.after"),
                    divider: t("bg.divider"),
                  }}
                />
                {refining && (
                  <div className="absolute inset-0 flex items-center justify-center bg-bg-secondary/40">
                    <span className="rounded-full bg-surface px-3 py-1.5 text-[13px] font-medium text-t-primary shadow">
                      {t("bg.stage.refine")}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-border px-3 py-2.5">
                <div className="flex items-center gap-0.5" role="toolbar" aria-label={t("bg.tools")}>
                  <IconButton label={`${t("bg.tool.pan")} (H)`} active={tool === "pan"} onClick={() => chooseTool("pan")}>
                    <Hand className="h-[18px] w-[18px]" aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`${t("bg.tool.erase")} (E)`} active={tool === "erase"} onClick={() => chooseTool("erase")}>
                    <Eraser className="h-[18px] w-[18px]" aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`${t("bg.tool.restore")} (R)`} active={tool === "restore"} onClick={() => chooseTool("restore")}>
                    <Paintbrush className="h-[18px] w-[18px]" aria-hidden="true" />
                  </IconButton>
                </div>
                {painting && (
                  <>
                    <Slider
                      className="w-32"
                      label={t("bg.brushSize")}
                      value={brushSize}
                      min={4}
                      max={300}
                      onChange={setBrushSize}
                      display={`${brushSize}px`}
                    />
                    <Slider
                      className="w-28"
                      label={t("bg.hardness")}
                      value={Math.round(hardness * 100)}
                      min={0}
                      max={95}
                      onChange={(v) => setHardness(v / 100)}
                      display={`${Math.round(hardness * 100)}%`}
                    />
                  </>
                )}
                <div className="ms-auto flex items-center gap-0.5">
                  <IconButton label={`${t("bg.undo")} (Ctrl+Z)`} onClick={undo} disabled={!history.undo}>
                    <Undo2 className="h-[18px] w-[18px]" aria-hidden="true" />
                  </IconButton>
                  <IconButton label={`${t("bg.redo")} (Ctrl+Shift+Z)`} onClick={redo} disabled={!history.redo}>
                    <Redo2 className="h-[18px] w-[18px]" aria-hidden="true" />
                  </IconButton>
                </div>
              </div>
              {painting && <p className="border-t border-border px-3 py-2 text-[12.5px] text-t-tertiary">{t("bg.brushHint")}</p>}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="glass flex items-center gap-3 p-4">
                <span className="volt-mark flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                  <Check className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-t-primary">{file?.name}</p>
                  <p className="text-[12.5px] text-t-tertiary">
                    {doc.width}×{doc.height}
                    {timing !== null && ` · ${(timing / 1000).toFixed(1)} s`}
                    {backend && ` · ${backend === "webgpu" ? "GPU" : "CPU"}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={reset}
                  aria-label={t("bg.newImage")}
                  title={t("bg.newImage")}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-t-tertiary hover:bg-bg-secondary hover:text-t-primary"
                >
                  <X className="h-[18px] w-[18px]" aria-hidden="true" />
                </button>
              </div>
              {scaledDown && (
                <p className="rounded-xl border border-border bg-bg-secondary px-3 py-2 text-[12.5px] text-t-secondary">
                  {t("bg.scaledDown", { w: source.data.width, h: source.data.height })}
                </p>
              )}

              <section className="glass p-4">
                <h2 className={sectionTitle}>{t("bg.background")}</h2>
                <Segmented
                  label={t("bg.background")}
                  size="sm"
                  value={backdropKind}
                  onChange={(v) => {
                    if (v === "image" && !bgImage) {
                      document.getElementById("bg-image-input")?.click();
                      return;
                    }
                    setBackdropKind(v);
                    if (output !== "subject") setOutput("subject");
                  }}
                  options={[
                    { value: "transparent", label: t("bg.bg.none") },
                    { value: "color", label: t("bg.bg.color") },
                    { value: "blur", label: t("bg.bg.blur") },
                    { value: "image", label: t("bg.bg.image") },
                  ]}
                />
                <input
                  id="bg-image-input"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  tabIndex={-1}
                  onChange={(e) => {
                    loadBackgroundImage(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                {backdropKind === "color" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {SWATCHES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        aria-label={c}
                        aria-pressed={color === c}
                        className={`h-8 w-8 rounded-lg border ${color === c ? "ring-2 ring-accent ring-offset-2 ring-offset-surface" : "border-border"}`}
                        style={{ background: c }}
                      />
                    ))}
                    <label className="relative flex h-8 w-8 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-border bg-[conic-gradient(red,yellow,lime,aqua,blue,magenta,red)]" title={t("bg.customColor")}>
                      <span className="sr-only">{t("bg.customColor")}</span>
                      <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
                    </label>
                  </div>
                )}
                {backdropKind === "blur" && (
                  <Slider
                    className="mt-3"
                    label={t("bg.blurAmount")}
                    value={Math.round(blurAmount * 100)}
                    min={0}
                    max={100}
                    onChange={(v) => setBlurAmount(v / 100)}
                    display={`${Math.round(blurAmount * 100)}%`}
                  />
                )}
                {backdropKind === "image" && (
                  <button
                    type="button"
                    onClick={() => document.getElementById("bg-image-input")?.click()}
                    className={`${secondaryButton} mt-3 w-full`}
                  >
                    <ImagePlus className="h-4 w-4" aria-hidden="true" />
                    {t("bg.changeImage")}
                  </button>
                )}
              </section>

              <section className="glass space-y-4 p-4">
                <h2 className={`${sectionTitle} !mb-0`}>{t("bg.edges")}</h2>
                <Toggle
                  checked={refine.edgeRefine}
                  disabled={refining}
                  onChange={(v) => applyRefine({ ...refine, edgeRefine: v })}
                  label={t("bg.opt.edges")}
                  description={t("bg.opt.edgesDesc")}
                />
                <Toggle
                  checked={refine.decontaminate}
                  disabled={refining}
                  onChange={(v) => applyRefine({ ...refine, decontaminate: v })}
                  label={t("bg.opt.spill")}
                  description={t("bg.opt.spillDesc")}
                />
                <Toggle
                  checked={refine.cleanup}
                  disabled={refining}
                  onChange={(v) => applyRefine({ ...refine, cleanup: v })}
                  label={t("bg.opt.cleanup")}
                  description={t("bg.opt.cleanupDesc")}
                />
                <Toggle
                  checked={precision}
                  disabled={refining}
                  onChange={togglePrecision}
                  label={t("bg.opt.precision")}
                  description={t("bg.opt.precisionDesc")}
                />
              </section>

              <section className="glass space-y-4 p-4">
                <h2 className={`${sectionTitle} !mb-0`}>{t("bg.export")}</h2>
                <div>
                  <p className="mb-2 text-[12.5px] text-t-secondary">{t("bg.output")}</p>
                  <Segmented
                    label={t("bg.output")}
                    size="sm"
                    value={output}
                    onChange={(v) => {
                      setOutput(v);
                      if (v !== "subject") setTool("pan");
                    }}
                    options={[
                      { value: "subject", label: t("bg.out.subject") },
                      { value: "mask", label: t("bg.out.mask") },
                      { value: "background", label: t("bg.out.background") },
                    ]}
                  />
                </div>
                <div>
                  <p className="mb-2 text-[12.5px] text-t-secondary">{t("bg.format")}</p>
                  <Segmented
                    label={t("bg.format")}
                    size="sm"
                    value={format}
                    onChange={setFormat}
                    options={[
                      { value: "image/png", label: "PNG" },
                      { value: "image/webp", label: "WebP" },
                      { value: "image/jpeg", label: "JPG" },
                    ]}
                  />
                  {format === "image/jpeg" && backdropKind === "transparent" && output !== "mask" && (
                    <p className="mt-2 text-[12px] text-t-tertiary">{t("bg.jpgNote")}</p>
                  )}
                </div>
                {format !== "image/png" && (
                  <Slider
                    label={t("bg.quality")}
                    value={Math.round(quality * 100)}
                    min={50}
                    max={100}
                    onChange={(v) => setQuality(v / 100)}
                    display={`${Math.round(quality * 100)}%`}
                  />
                )}
                <label className="block">
                  <span className="mb-1.5 block text-[12.5px] text-t-secondary">{t("bg.size")}</span>
                  <select
                    value={maxSide}
                    onChange={(e) => setMaxSide(Number(e.target.value))}
                    className="w-full rounded-xl border border-border bg-bg-secondary px-3 py-2 text-[14px] text-t-primary focus:border-t-primary/40 focus:outline-none"
                  >
                    <option value={0}>{t("bg.size.original", { w: doc.width, h: doc.height })}</option>
                    {[4096, 2048, 1080, 512].filter((s) => s < Math.max(doc.width, doc.height)).map((s) => (
                      <option key={s} value={s}>
                        {t("bg.size.max", { px: s })}
                      </option>
                    ))}
                  </select>
                </label>
                {output === "subject" && (
                  <Toggle checked={crop} onChange={setCrop} label={t("bg.crop")} description={t("bg.cropDesc")} />
                )}
                <div className="space-y-2 pt-1">
                  <button type="button" onClick={download} disabled={exporting || refining} className={`${primaryButton} w-full`}>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {t("bg.download")}
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={copy} disabled={exporting || refining} className={secondaryButton}>
                      <Copy className="h-4 w-4" aria-hidden="true" />
                      {t("bg.copy")}
                    </button>
                    <button type="button" onClick={reset} className={secondaryButton}>
                      <ImagePlus className="h-4 w-4" aria-hidden="true" />
                      {t("bg.newImage")}
                    </button>
                  </div>
                </div>
              </section>

              <p className="flex items-start gap-2 px-1 text-[12px] leading-relaxed text-t-tertiary">
                <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>{t("bg.privacy")}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
