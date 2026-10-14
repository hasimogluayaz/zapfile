"use client";

/**
 * Word / Excel / PowerPoint / HTML → PDF. Fast mode converts on our server (src/lib/office/server.ts);
 * private mode, and the fallback when the server can't be reached, runs LibreOffice in the browser
 * (src/lib/office/engine.ts). Several files convert one after another, each with a first-page preview.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { AlertTriangle, Check, Code2, Combine, Download, FileText, KeyRound, Loader2, Presentation, RefreshCw, Sheet, ShieldCheck, Trash2, X, Zap } from "lucide-react";
import FileDropzone from "@/components/FileDropzone";
import ProgressBar from "@/components/ProgressBar";
import { Segmented, Toggle, buttonPrimary, buttonSecondary, sectionTitle } from "@/components/ui/controls";
import { persistPendingFiles, restorePersistedFiles, setPendingFiles } from "@/lib/file-handoff";
import { useI18n } from "@/lib/i18n";
import { downloadBlob, formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import { ENGINE_DOWNLOAD_BYTES, OfficeEngineError, canRunOfficeEngine, engineCached, getOfficeEngine, offProgress, officeToPdf, type EngineProgress } from "@/lib/office/engine";
import { prepareOfficeFile } from "@/lib/office/prepare";
import { OFFICE_API_URL, OfficeServerError, SERVER_MAX_BYTES, serverToPdf } from "@/lib/office/server";

export type OfficeKind = "word" | "excel" | "powerpoint" | "html";

const ACCEPT: Record<OfficeKind, { accept: Record<string, string[]>; formats: string[] }> = {
  word: {
    accept: {
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
      "application/vnd.oasis.opendocument.text": [".odt"],
      "application/rtf": [".rtf"],
      "text/plain": [".txt"],
    },
    formats: ["DOCX", "DOC", "ODT", "RTF", "TXT"],
  },
  excel: {
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.oasis.opendocument.spreadsheet": [".ods"],
      "text/csv": [".csv"],
    },
    formats: ["XLSX", "XLS", "ODS", "CSV"],
  },
  powerpoint: {
    accept: {
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.oasis.opendocument.presentation": [".odp"],
    },
    formats: ["PPTX", "PPT", "ODP"],
  },
  html: {
    accept: { "text/html": [".html", ".htm", ".xhtml"] },
    formats: ["HTML", "HTM"],
  },
};

const ICON = { word: FileText, excel: Sheet, powerpoint: Presentation, html: Code2 };

type Status = "queued" | "converting" | "done" | "error" | "password";

interface Job {
  id: number;
  file: File;
  status: Status;
  pdf?: Blob;
  pages?: number;
  thumb?: string;
  password?: string;
  key?: string;
  error?: string;
  /** Needs the in-browser engine (e.g. a password), which this page can't run until it reloads. */
  needsPrivate?: boolean;
}

type Mode = "fast" | "private";

let nextId = 1;
const RELOAD_FLAG = "zapfile:coi-reload";
const MODE_KEY = "zapfile:office-mode";

async function inspectPdf(bytes: Uint8Array): Promise<{ pages: number; thumb: string | null }> {
  const { openPdf } = await import("@/lib/pdfjs");
  const { renderRegion } = await import("@/lib/pdf-convert/extract");
  const pdf = await openPdf(bytes);
  try {
    let thumb: string | null = null;
    try {
      const img = await renderRegion(pdf, 1, null, 40);
      thumb = URL.createObjectURL(new Blob([img.bytes], { type: img.mime }));
    } catch {
      thumb = null;
    }
    return { pages: pdf.numPages, thumb };
  } finally {
    void pdf.destroy();
  }
}

export default function OfficeToPdfTool({ kind }: { kind: OfficeKind }) {
  const { t } = useI18n();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pdfa, setPdfa] = useState(false);
  const [engine, setEngine] = useState<EngineProgress | null>(null);
  const [engineError, setEngineError] = useState<OfficeEngineError | null>(null);
  const [cached, setCached] = useState<boolean | null>(null);
  const [merging, setMerging] = useState(false);
  // "fast": convert on our server (default when it is configured); "private": in this browser only.
  const [mode, setModeState] = useState<Mode>(OFFICE_API_URL ? "fast" : "private");
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const [ready, setReady] = useState(false);
  // Can this page run the in-browser engine? null = not checked yet.
  const [local, setLocal] = useState<{ ok: boolean; reason?: "isolation" | "browser" } | null>(null);
  const localRef = useRef(local);
  localRef.current = local;
  const jobsRef = useRef(jobs);
  jobsRef.current = jobs;
  const busy = useRef(false);
  const fallbackNoted = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(MODE_KEY);
      if (saved === "private" || (saved === "fast" && OFFICE_API_URL)) setModeState(saved);
    } catch {
      /* storage blocked */
    }
    // Files handed over from the home page survive the reload below.
    void restorePersistedFiles().then(() => setReady(true));
  }, []);

  const setMode = (m: Mode) => {
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* storage blocked */
    }
  };

  // The in-browser engine needs a cross-origin isolated page. Client-side navigation keeps the previous
  // page's (non-isolated) context, so in private mode load this page fresh once if needed.
  useEffect(() => {
    const can = canRunOfficeEngine();
    setLocal(can);
    if (can.ok) {
      sessionStorage.removeItem(RELOAD_FLAG);
      void engineCached().then(setCached);
      return;
    }
    if (mode === "private" && can.reason === "isolation" && !sessionStorage.getItem(RELOAD_FLAG)) {
      sessionStorage.setItem(RELOAD_FLAG, "1");
      const keep = jobsRef.current.filter((j) => j.status !== "done").map((j) => j.file);
      if (keep.length) setPendingFiles(keep);
      void persistPendingFiles().then(() => location.reload());
    }
  }, [mode]);

  useEffect(() => () => jobsRef.current.forEach((j) => j.thumb && URL.revokeObjectURL(j.thumb)), []);

  // Private mode: start downloading and booting the engine as soon as the user shows intent (drags a file
  // over the page, or taps the drop area to open the file picker), so it loads while they pick the file.
  // Not on page load: visitors who only look would download the engine for nothing.
  const [prefetching, setPrefetching] = useState(false);
  const warmedUp = useRef(false);
  const warmUp = useCallback(() => {
    if (warmedUp.current || mode !== "private" || !local?.ok) return;
    warmedUp.current = true;
    setPrefetching(true);
    getOfficeEngine((p) => setEngine(p)).catch(() => {
      warmedUp.current = false;
      setPrefetching(false); // errors surface when a file is converted
    });
  }, [mode, local]);
  useEffect(() => {
    window.addEventListener("dragenter", warmUp);
    return () => window.removeEventListener("dragenter", warmUp);
  }, [warmUp]);

  const update = (id: number, patch: Partial<Job>) => setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));

  const settingsKey = JSON.stringify({ pdfa });
  const settingsRef = useRef({ pdfa, settingsKey });
  settingsRef.current = { pdfa, settingsKey };

  // Work through the queue one file at a time (the engine has a single worker).
  const pump = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      for (;;) {
        const job = jobsRef.current.find((j) => j.status === "queued");
        if (!job) break;
        update(job.id, { status: "converting", error: undefined });
        const { pdfa: asPdfa, settingsKey: key } = settingsRef.current;
        const input = await prepareOfficeFile(job.file);
        let bytes: Uint8Array | null = null;
        if (modeRef.current === "fast" && !job.password && input.size <= SERVER_MAX_BYTES) {
          try {
            bytes = await serverToPdf(input, { pdfa: asPdfa });
          } catch (e) {
            const code = e instanceof OfficeServerError ? e.code : "network";
            // The in-browser engine takes over (it can also ask for a document password).
            if (!localRef.current?.ok) {
              update(job.id, { status: "error", error: t(code === "password" ? "office.needsPrivate" : code === "convert" ? "office.convertFailed" : "office.serverFailed"), needsPrivate: code === "password" });
              continue;
            }
            if (code !== "password" && code !== "convert" && !fallbackNoted.current) {
              fallbackNoted.current = true;
              toast(t("office.serverFallback"));
            }
          }
        }
        try {
          if (!bytes) {
            const onProgress = (p: EngineProgress) => setEngine(p);
            await getOfficeEngine(onProgress);
            offProgress(onProgress);
            setEngineError(null);
            bytes = await officeToPdf(input, { pdfa: asPdfa, password: job.password });
          }
          const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
          const info = await inspectPdf(bytes).catch(() => ({ pages: 0, thumb: null }));
          const old = jobsRef.current.find((j) => j.id === job.id)?.thumb;
          if (old) URL.revokeObjectURL(old);
          update(job.id, { status: "done", pdf: blob, pages: info.pages, thumb: info.thumb ?? undefined, key });
        } catch (e) {
          const err = e instanceof OfficeEngineError ? e : new OfficeEngineError("convert", String(e));
          if (err.code === "password") {
            update(job.id, { status: "password", error: job.password ? t("office.wrongPassword") : undefined });
          } else if (err.code === "convert") {
            update(job.id, { status: "error", error: t("office.convertFailed") });
          } else {
            // Engine could not start: stop the queue and show why.
            setEngineError(err);
            setJobs((prev) => prev.map((j) => (j.status === "converting" || j.status === "queued" ? { ...j, status: "error", error: t("office.engineFailed") } : j)));
            break;
          }
        }
      }
    } finally {
      busy.current = false;
    }
  }, [t]);

  useEffect(() => {
    if (jobs.some((j) => j.status === "queued")) void pump();
  }, [jobs, pump]);

  // Changing options re-converts finished files.
  useEffect(() => {
    setJobs((prev) => (prev.some((j) => j.status === "done" && j.key !== settingsKey) ? prev.map((j) => (j.status === "done" && j.key !== settingsKey ? { ...j, status: "queued" } : j)) : prev));
  }, [settingsKey]);

  const addFiles = (files: File[]) => {
    setJobs((prev) => [...prev, ...files.map((file) => ({ id: nextId++, file, status: "queued" as Status }))]);
  };
  const remove = (id: number) =>
    setJobs((prev) => {
      const j = prev.find((x) => x.id === id);
      if (j?.thumb) URL.revokeObjectURL(j.thumb);
      return prev.filter((x) => x.id !== id);
    });
  const retry = (id: number, password?: string) => update(id, { status: "queued", password, error: undefined, needsPrivate: false });

  const done = jobs.filter((j) => j.status === "done" && j.pdf);
  const pdfName = (j: Job) => `${getFileNameWithoutExtension(j.file.name)}.pdf`;

  const downloadAll = async () => {
    const { zipFiles } = await import("@/lib/image-tools-kit");
    downloadBlob(await zipFiles(done.map((j) => ({ name: pdfName(j), blob: j.pdf! }))), "zapfile-pdf.zip");
  };
  const mergeAll = async () => {
    setMerging(true);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const out = await PDFDocument.create();
      for (const j of done) {
        const src = await PDFDocument.load(await j.pdf!.arrayBuffer());
        (await out.copyPages(src, src.getPageIndices())).forEach((p) => out.addPage(p));
      }
      downloadBlob(new Blob([(await out.save()) as BlobPart], { type: "application/pdf" }), "zapfile-merged.pdf");
    } catch {
      toast.error(t("office.convertFailed"));
    } finally {
      setMerging(false);
    }
  };

  const Icon = ICON[kind];
  const { accept, formats } = ACCEPT[kind];
  const mb = (n: number) => `${Math.round(n / 1_000_000)} MB`;
  const preparing = (prefetching || jobs.some((j) => j.status === "converting")) && engine && engine.phase !== "ready" && !engineError;

  if (!ready || (mode === "private" && local === null)) {
    return (
      <div className="glass flex h-56 items-center justify-center gap-2 text-[14px] text-t-secondary" role="status">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
        {t("ui.loading")}
      </div>
    );
  }

  const modeSwitch = OFFICE_API_URL ? (
    <div className="space-y-1.5">
      <Segmented
        label={t("office.mode")}
        value={mode}
        onChange={setMode}
        options={[
          { value: "fast", label: t("office.mode.fast"), icon: <Zap className="h-4 w-4" aria-hidden="true" /> },
          { value: "private", label: t("office.mode.private"), icon: <ShieldCheck className="h-4 w-4" aria-hidden="true" /> },
        ]}
      />
      <p className="text-[12.5px] text-t-tertiary">{mode === "fast" ? t("office.mode.fastHint") : t("office.mode.privateHint", { size: mb(ENGINE_DOWNLOAD_BYTES) })}</p>
    </div>
  ) : null;

  if (mode === "private" && local && !local.ok) {
    return (
      <div className="space-y-5">
        {modeSwitch}
        <div role="alert" className="glass flex items-start gap-3 p-5 text-[14px]">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-t-secondary" aria-hidden="true" />
          <div className="space-y-2">
            <p className="font-medium text-t-primary">{t("office.unsupported")}</p>
            <p className="text-t-secondary">{t("office.unsupportedHint")}</p>
            {local.reason === "isolation" && (
              <button type="button" className={buttonSecondary} onClick={() => location.reload()}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {t("office.reload")}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {modeSwitch}

      <div onPointerDown={warmUp} onKeyDown={warmUp}>
        <FileDropzone
          onFilesSelected={addFiles}
          accept={accept}
          multiple
          formats={formats}
          label={t(`office.drop.${kind}`)}
          privacyNote={mode === "fast" ? t("office.serverPrivacy") : undefined}
        />
      </div>

      {kind === "html" && jobs.length === 0 && <p className="text-[13px] text-t-tertiary">{t("office.htmlNote")}</p>}

      {mode === "private" && jobs.length === 0 && cached === false && !preparing && (
        <p className="flex items-start gap-2 text-[13px] text-t-tertiary">
          <Download className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t("office.firstRun", { size: mb(ENGINE_DOWNLOAD_BYTES) })}
        </p>
      )}

      {preparing && (
        <div className="glass space-y-3 p-5" aria-live="polite">
          {engine.phase === "download" && !engine.fromCache ? (
            <ProgressBar
              progress={Math.round(((engine.loaded ?? 0) / (engine.total || ENGINE_DOWNLOAD_BYTES)) * 100)}
              label={t("office.downloading", { done: mb(engine.loaded ?? 0), total: mb(engine.total ?? ENGINE_DOWNLOAD_BYTES) })}
            />
          ) : (
            <div className="flex items-center gap-2 text-[14px] text-t-secondary">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t("office.starting")}
            </div>
          )}
          <p className="text-[12.5px] text-t-tertiary">{t("office.engineNote")}</p>
        </div>
      )}

      {engineError && (
        <div role="alert" className="glass flex flex-wrap items-start gap-3 p-4 text-[14px]">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-t-secondary" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-t-primary">{engineError.code === "memory" ? t("office.memory") : engineError.code === "download" ? t("office.downloadFailed") : t("office.engineFailed")}</p>
          <button type="button" className={buttonSecondary} onClick={() => setJobs((prev) => prev.map((j) => (j.status === "error" ? { ...j, status: "queued", error: undefined } : j)))}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t("p2o.retry")}
          </button>
        </div>
      )}

      {jobs.length > 0 && (
        <>
          <ul className="space-y-2.5">
            {jobs.map((j) => (
              <li key={j.id} className="glass flex flex-wrap items-center gap-4 p-3.5">
                <div className="flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white">
                  {j.thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={j.thumb} alt="" className="h-full w-full object-contain" />
                  ) : j.status === "converting" ? (
                    <Loader2 className="h-5 w-5 animate-spin text-t-tertiary" aria-hidden="true" />
                  ) : (
                    <Icon className="h-5 w-5 text-t-tertiary" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-semibold text-t-primary" title={j.file.name}>
                    {j.file.name}
                  </p>
                  <p className="text-[12.5px] tabular-nums text-t-tertiary">
                    {formatFileSize(j.file.size)}
                    {j.status === "done" && j.pdf && (
                      <>
                        {" → "}PDF · {formatFileSize(j.pdf.size)}
                        {j.pages ? ` · ${t(j.pages === 1 ? "pdfsec.pagesOne" : "pdfsec.pages", { count: j.pages })}` : ""}
                      </>
                    )}
                    {j.status === "queued" && ` · ${t("office.queued")}`}
                    {j.status === "converting" && ` · ${t("office.converting")}`}
                  </p>
                  {j.status === "error" && <p className="mt-1 text-[12.5px] text-red-700 dark:text-red-400">{j.error}</p>}
                  {j.status === "error" && j.needsPrivate && (
                    <button type="button" className={`${buttonSecondary} mt-2`} onClick={() => setMode("private")}>
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      {t("office.usePrivate")}
                    </button>
                  )}
                  {j.status === "password" && (
                    <form
                      className="mt-2 flex flex-wrap items-center gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const v = new FormData(e.currentTarget).get("pw");
                        if (typeof v === "string" && v) retry(j.id, v);
                      }}
                    >
                      <KeyRound className="h-4 w-4 text-t-tertiary" aria-hidden="true" />
                      <input
                        name="pw"
                        type="password"
                        autoComplete="off"
                        placeholder={t("office.password")}
                        aria-label={t("office.password")}
                        className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-bg-secondary px-3 text-[13.5px] text-t-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60 sm:max-w-[220px]"
                      />
                      <button type="submit" className={buttonSecondary}>
                        {t("office.unlock")}
                      </button>
                      {j.error && <span className="w-full text-[12.5px] text-red-700 dark:text-red-400">{j.error}</span>}
                    </form>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {j.status === "done" && j.pdf && (
                    <button type="button" className={buttonPrimary} onClick={() => downloadBlob(j.pdf!, pdfName(j))}>
                      <Download className="h-4 w-4" aria-hidden="true" />
                      PDF
                    </button>
                  )}
                  {j.status === "error" && !engineError && (
                    <button type="button" className={buttonSecondary} onClick={() => retry(j.id, j.password)} aria-label={t("p2o.retry")}>
                      <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                  {j.status !== "converting" && (
                    <button
                      type="button"
                      onClick={() => remove(j.id)}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-t-tertiary hover:bg-bg-secondary hover:text-t-primary"
                      aria-label={t("office.remove", { name: j.file.name })}
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="glass flex flex-wrap items-center gap-4 p-4">
            <Toggle checked={pdfa} onChange={setPdfa} label={t("office.pdfa")} description={t("office.pdfaHint")} />
            <div className="ms-auto flex flex-wrap gap-2">
              {done.length > 1 && (
                <>
                  <button type="button" className={buttonSecondary} onClick={mergeAll} disabled={merging}>
                    {merging ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Combine className="h-4 w-4" aria-hidden="true" />}
                    {t("office.merge")}
                  </button>
                  <button type="button" className={buttonPrimary} onClick={downloadAll}>
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {t("office.downloadZip", { n: done.length })}
                  </button>
                </>
              )}
              <button
                type="button"
                className={buttonSecondary}
                onClick={() => {
                  jobs.forEach((j) => j.thumb && URL.revokeObjectURL(j.thumb));
                  setJobs((prev) => prev.filter((j) => j.status === "converting"));
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {t("ui.clearAll")}
              </button>
            </div>
          </div>
          {done.length > 0 && jobs.every((j) => j.status === "done") && (
            <p className={`${sectionTitle} flex items-center gap-1.5`}>
              <Check className="h-4 w-4" aria-hidden="true" />
              {t("office.allDone")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
