"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import toast from "react-hot-toast";
import {
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileLock2,
  FileText,
  Loader2,
  LockKeyhole,
  LockKeyholeOpen,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  X,
} from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProgressBar from "@/components/ProgressBar";
import { Segmented, Toggle, buttonPrimary, buttonSecondary } from "@/components/ui/controls";
import { useI18n } from "@/lib/i18n";
import { downloadBlob, formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";
import {
  FULL_PERMISSIONS,
  PdfPasswordError,
  PdfInvalidError,
  inspectPdf,
  protectPdf,
  randomOwnerPassword,
  unlockPdf,
  type PdfCipher,
  type PdfInfo,
  type PdfPermissions,
  type PrintPermission,
  type SecurityStage,
} from "@/lib/pdf-security";

type Mode = "protect" | "unlock";
type ResultKind = "protect" | "unlock" | "unrestrict";

interface Result {
  kind: ResultKind;
  blob: Blob;
  name: string;
  ownerPassword?: string;
}

const STAGE_PROGRESS: Record<SecurityStage, number> = { open: 12, encrypt: 38, save: 58, verify: 84 };

/** Rough strength estimate: character-set entropy with penalties for repeats. */
function passwordStrength(pw: string): { score: 0 | 1 | 2 | 3 | 4; bits: number } {
  if (!pw) return { score: 0, bits: 0 };
  let pool = 0;
  if (/[a-z]/.test(pw)) pool += 26;
  if (/[A-Z]/.test(pw)) pool += 26;
  if (/[0-9]/.test(pw)) pool += 10;
  if (/[^A-Za-z0-9]/.test(pw)) pool += 33;
  const unique = new Set(pw).size;
  const effectiveLength = Math.min(pw.length, unique * 2);
  const bits = Math.round(effectiveLength * Math.log2(Math.max(pool, 1)));
  const score = bits < 28 ? 1 : bits < 45 ? 2 : bits < 70 ? 3 : 4;
  return { score, bits };
}

function generatePassword(length = 18): string {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%^&*-_=+?"];
  const all = sets.join("");
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b, i) => (i < sets.length ? sets[i]![b % sets[i]!.length] : all[b % all.length]));
  // Shuffle so the guaranteed characters aren't always first.
  const shuffle = new Uint32Array(chars.length);
  crypto.getRandomValues(shuffle);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffle[i]! % (i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

const fieldClass =
  "w-full rounded-xl border border-border bg-bg-secondary px-3.5 py-2.5 text-[14px] text-t-primary placeholder:text-t-tertiary focus:border-t-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-volt/60";

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
  invalid,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  invalid?: boolean;
  hint?: string;
}) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-t-secondary">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="new-password"
          spellCheck={false}
          aria-invalid={invalid || undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={`${fieldClass} pe-11 font-mono ${invalid ? "border-red-500/60" : ""}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute end-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-t-tertiary hover:bg-bg-tertiary hover:text-t-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
          aria-label={visible ? t("pdfsec.hide") : t("pdfsec.show")}
          aria-pressed={visible}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
      {hint && (
        <p id={`${id}-hint`} className={`mt-1.5 text-[12.5px] ${invalid ? "text-red-600 dark:text-red-400" : "text-t-tertiary"}`}>
          {hint}
        </p>
      )}
    </div>
  );
}

export default function PdfEncryptPage() {
  const { t, locale } = useI18n();
  const [mode, setMode] = useState<Mode>("protect");
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<PdfInfo | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<SecurityStage | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const jobRef = useRef<AbortController | null>(null);
  const inspectRef = useRef<AbortController | null>(null);

  // Protect options
  const [requireOpenPassword, setRequireOpenPassword] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [restrict, setRestrict] = useState(false);
  const [ownerPassword, setOwnerPassword] = useState("");
  const [permissions, setPermissions] = useState<PdfPermissions>({
    ...FULL_PERMISSIONS,
    copying: false,
    modifying: false,
  });
  const [cipher, setCipher] = useState<PdfCipher>("AES-256");
  const [currentPassword, setCurrentPassword] = useState("");

  // Unlock options
  const [unlockPassword, setUnlockPassword] = useState("");
  const [wrongPassword, setWrongPassword] = useState(false);

  const strength = useMemo(() => passwordStrength(password), [password]);

  // Any change to the settings invalidates a finished result (and cancels a
  // run in flight), so the download always matches what is on screen.
  useEffect(() => {
    jobRef.current?.abort();
    setResult(null);
    setError(null);
    setWrongPassword(false);
  }, [mode, requireOpenPassword, password, confirm, restrict, ownerPassword, permissions, cipher, currentPassword, unlockPassword]);

  useEffect(
    () => () => {
      jobRef.current?.abort();
      inspectRef.current?.abort();
    },
    [],
  );

  const handleFiles = useCallback(
    async (files: File[]) => {
      const pdf = files[0];
      if (!pdf) return;
      jobRef.current?.abort();
      inspectRef.current?.abort();
      const controller = new AbortController();
      inspectRef.current = controller;
      setResult(null);
      setError(null);
      setFile(pdf);
      setInfo(null);
      setCurrentPassword("");
      setUnlockPassword("");
      setInspecting(true);
      try {
        const inspected = await inspectPdf(new Uint8Array(await pdf.arrayBuffer()), { signal: controller.signal });
        if (controller.signal.aborted) return;
        setInfo(inspected);
        // A file that needs a password most likely needs unlocking; files with
        // only usage restrictions open in Protect, with one-click removal shown.
        setMode(inspected.encrypted && !inspected.restrictionsOnly ? "unlock" : "protect");
      } catch (e) {
        if (isAbort(e) || controller.signal.aborted) return;
        setFile(null);
        toast.error(t("pdfsec.invalid"));
      } finally {
        if (inspectRef.current === controller) setInspecting(false);
      }
    },
    [t],
  );

  const clearFile = () => {
    jobRef.current?.abort();
    inspectRef.current?.abort();
    setFile(null);
    setInfo(null);
    setInspecting(false);
    setResult(null);
    setError(null);
  };

  const restrictionsOnly = Boolean(info?.encrypted && info.restrictionsOnly);
  const needsCurrentPassword = Boolean(info?.encrypted && !info.restrictionsOnly);

  const passwordMismatch = requireOpenPassword && confirm.length > 0 && password !== confirm;
  const ownerSameAsUser =
    restrict && requireOpenPassword && ownerPassword.length > 0 && ownerPassword === password;

  const protectError = (() => {
    if (!requireOpenPassword && !restrict) return t("pdfsec.err.nothing");
    if (requireOpenPassword && password.length === 0) return t("pdfsec.err.passwordRequired");
    if (requireOpenPassword && password !== confirm) return t("pdfsec.err.mismatch");
    if (ownerSameAsUser) return t("pdfsec.err.ownerSame");
    if (needsCurrentPassword && currentPassword.length === 0) return t("pdfsec.err.currentRequired");
    return null;
  })();

  const kindRef = useRef<ResultKind>("protect");

  /** Run one worker job with progress, cancellation and result landing guard. */
  const runJob = async (job: (signal: AbortSignal, onStage: (s: SecurityStage) => void) => Promise<Result>) => {
    jobRef.current?.abort();
    const controller = new AbortController();
    jobRef.current = controller;
    setBusy(true);
    setStage("open");
    setResult(null);
    setError(null);
    setWrongPassword(false);
    try {
      const next = await job(controller.signal, (s) => {
        if (!controller.signal.aborted) setStage(s);
      });
      if (controller.signal.aborted) return;
      setResult(next);
      toast.success(
        next.kind === "protect" ? t("pdfsec.protected") : next.kind === "unlock" ? t("pdfsec.unlocked") : t("pdfsec.v2.doneUnrestrict"),
      );
    } catch (e) {
      if (isAbort(e) || controller.signal.aborted) return;
      if (e instanceof PdfPasswordError) {
        if (kindRef.current === "unlock") setWrongPassword(true);
        else setError(t("pdfsec.err.currentWrong"));
      } else if (e instanceof PdfInvalidError) {
        setError(t("pdfsec.invalid"));
      } else {
        console.error(e);
        setError(t("pdfsec.err.generic"));
      }
    } finally {
      if (jobRef.current === controller) {
        jobRef.current = null;
        setBusy(false);
        setStage(null);
      }
    }
  };
  const cancelJob = () => {
    jobRef.current?.abort();
    jobRef.current = null;
    setBusy(false);
    setStage(null);
    toast(t("pdfsec.v2.cancelled"));
  };

  const handleProtect = (event?: FormEvent) => {
    event?.preventDefault();
    if (!file || protectError || busy) return;
    kindRef.current = "protect";
    void runJob(async (signal, onStage) => {
      const generatedOwner = restrict && !ownerPassword ? randomOwnerPassword() : undefined;
      const userPw = requireOpenPassword ? password : "";
      const owner = restrict ? ownerPassword || generatedOwner! : password || randomOwnerPassword();
      const bytes = await protectPdf(
        new Uint8Array(await file.arrayBuffer()),
        {
          userPassword: userPw,
          ownerPassword: owner,
          permissions: restrict ? permissions : FULL_PERMISSIONS,
          cipher,
          currentPassword: info?.encrypted ? (restrictionsOnly ? "" : currentPassword) : undefined,
        },
        { signal, onStage },
      );
      return {
        kind: "protect",
        blob: new Blob([bytes as BlobPart], { type: "application/pdf" }),
        name: `${getFileNameWithoutExtension(file.name)}-protected.pdf`,
        ownerPassword: generatedOwner,
      };
    });
  };

  const handleUnlock = (event?: FormEvent) => {
    event?.preventDefault();
    if (!file || busy) return;
    if (!restrictionsOnly && !unlockPassword) return;
    kindRef.current = restrictionsOnly ? "unrestrict" : "unlock";
    void runJob(async (signal, onStage) => {
      const bytes = await unlockPdf(new Uint8Array(await file.arrayBuffer()), restrictionsOnly ? "" : unlockPassword, {
        signal,
        onStage,
      });
      return {
        kind: restrictionsOnly ? "unrestrict" : "unlock",
        blob: new Blob([bytes as BlobPart], { type: "application/pdf" }),
        name: `${getFileNameWithoutExtension(file.name)}-unlocked.pdf`,
      };
    });
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("ui.copied"));
    } catch {
      toast.error(t("ui.copyFailed"));
    }
  };

  const strengthLabels = ["", t("pdfsec.strength.weak"), t("pdfsec.strength.fair"), t("pdfsec.strength.good"), t("pdfsec.strength.strong")];
  const strengthColors = ["bg-bg-tertiary", "bg-red-500", "bg-amber-500", "bg-emerald-500", "bg-emerald-600"];

  const permissionRows: { key: Exclude<keyof PdfPermissions, "printing">; label: string }[] = [
    { key: "copying", label: t("pdfsec.perm.copying") },
    { key: "modifying", label: t("pdfsec.perm.modifying") },
    { key: "annotating", label: t("pdfsec.perm.annotating") },
    { key: "fillingForms", label: t("pdfsec.perm.forms") },
    { key: "documentAssembly", label: t("pdfsec.perm.assembly") },
  ];

  /** Human list of what a restriction-only file blocks. */
  const blockedSummary = useMemo(() => {
    const p = info?.permissions;
    if (!p) return "";
    const items: string[] = [];
    if (p.printing === "none") items.push(t("pdfsec.perm.printing"));
    else if (p.printing === "low") items.push(t("pdfsec.v2.highQualityPrint"));
    for (const row of permissionRows) if (!p[row.key]) items.push(row.label);
    if (items.length === 0) return "";
    try {
      return new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(items);
    } catch {
      return items.join(", ");
    }
    // permissionRows is rebuilt from t on every render; t + locale cover it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info, t, locale]);

  const statusLabel = !info
    ? ""
    : !info.encrypted
      ? t("pdfsec.status.open")
      : info.restrictionsOnly
        ? t("pdfsec.v2.status.restricted")
        : t("pdfsec.status.locked");

  const stageLabel = stage ? t(`pdfsec.v2.stage.${stage}`) : "";

  const errorBox = error && (
    <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[14px] text-red-700 dark:text-red-300">
      {error}
    </p>
  );

  const progressBox = busy && (
    <div className="flex items-center gap-3" aria-live="polite">
      <div className="min-w-0 flex-1">
        <ProgressBar progress={stage ? STAGE_PROGRESS[stage] : 5} label={stageLabel} />
      </div>
      <button type="button" onClick={cancelJob} className={buttonSecondary}>
        {t("bg.cancel")}
      </button>
    </div>
  );

  const restrictionNotice = restrictionsOnly && (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-bg-secondary p-4">
      <ShieldOff className="mt-0.5 h-5 w-5 shrink-0 text-t-secondary" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-[14px] font-semibold text-t-primary">{t("pdfsec.v2.restrictedTitle")}</p>
        <p className="text-[13px] text-t-secondary">{t("pdfsec.v2.restrictedBody")}</p>
        {blockedSummary && (
          <p className="text-[13px] text-t-tertiary">{t("pdfsec.v2.blockedList", { list: blockedSummary })}</p>
        )}
      </div>
    </div>
  );

  return (
    <ToolLayout
      toolName="Protect PDF"
      toolDescription="Add or remove password protection on PDF files with AES-256 encryption."
    >
      <div className="space-y-5">
        <Segmented<Mode>
          label={t("pdfsec.mode")}
          value={mode}
          onChange={setMode}
          options={[
            { value: "protect", label: t("pdfsec.mode.protect"), icon: <LockKeyhole className="h-4 w-4" aria-hidden="true" /> },
            {
              value: "unlock",
              label: restrictionsOnly ? t("pdfsec.v2.removeRestrictions") : t("pdfsec.mode.unlock"),
              icon: <LockKeyholeOpen className="h-4 w-4" aria-hidden="true" />,
            },
          ]}
        />

        {!file ? (
          <FileDropzone
            onFilesSelected={handleFiles}
            accept={{ "application/pdf": [".pdf"] }}
            formats={["PDF"]}
            label={t("pdfsec.drop")}
          />
        ) : (
          <div className="glass flex items-center gap-3 p-4">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                info?.encrypted && !info.restrictionsOnly ? "volt-mark" : "bg-bg-secondary text-t-primary"
              }`}
            >
              {inspecting ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : info?.encrypted ? (
                <FileLock2 className="h-5 w-5" aria-hidden="true" />
              ) : (
                <FileText className="h-5 w-5" aria-hidden="true" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-t-primary">{file.name}</p>
              <p className="text-[13px] text-t-tertiary" aria-live="polite">
                {formatFileSize(file.size)}
                {info?.pageCount ? ` · ${t("pdfsec.pages", { count: info.pageCount })}` : ""}
                {inspecting ? ` · ${t("pdfsec.v2.inspecting")}` : statusLabel ? ` · ${statusLabel}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={clearFile}
              className="flex h-10 w-10 items-center justify-center rounded-full text-t-tertiary hover:bg-bg-secondary hover:text-t-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-volt/60"
              aria-label={t("pdfsec.removeFile")}
            >
              <X className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </div>
        )}

        {file && info && mode === "protect" && (
          <form className="glass space-y-6 p-5 sm:p-6" onSubmit={handleProtect} noValidate>
            <fieldset disabled={busy} className="space-y-6">
              {restrictionsOnly && (
                <div className="space-y-3">
                  {restrictionNotice}
                  <p className="text-[13px] text-t-tertiary">{t("pdfsec.v2.reprotectHint")}</p>
                </div>
              )}
              {needsCurrentPassword && (
                <div className="rounded-xl border border-border bg-bg-secondary p-4">
                  <PasswordField
                    id="current-pw"
                    label={t("pdfsec.currentPassword")}
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    hint={t("pdfsec.currentHint")}
                  />
                </div>
              )}

              <Toggle
                checked={requireOpenPassword}
                onChange={setRequireOpenPassword}
                label={t("pdfsec.requireOpen")}
                description={t("pdfsec.requireOpenDesc")}
              />

              {requireOpenPassword && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <PasswordField id="pw" label={t("pdfsec.password")} value={password} onChange={setPassword} autoFocus={!needsCurrentPassword} />
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex h-1.5 flex-1 gap-1" aria-hidden="true">
                        {[1, 2, 3, 4].map((i) => (
                          <span
                            key={i}
                            className={`h-full flex-1 rounded-full ${strength.score >= i ? strengthColors[strength.score] : "bg-bg-tertiary"}`}
                          />
                        ))}
                      </div>
                      <span className="w-16 text-end text-[12px] text-t-tertiary" aria-live="polite">
                        {strengthLabels[strength.score]}
                      </span>
                    </div>
                  </div>
                  <PasswordField
                    id="pw-confirm"
                    label={t("pdfsec.confirm")}
                    value={confirm}
                    onChange={setConfirm}
                    invalid={passwordMismatch}
                    hint={passwordMismatch ? t("pdfsec.err.mismatch") : undefined}
                  />
                  <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
                    <button
                      type="button"
                      onClick={() => {
                        const pw = generatePassword();
                        setPassword(pw);
                        setConfirm(pw);
                        void copyText(pw);
                      }}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-t-secondary hover:bg-bg-secondary hover:text-t-primary"
                    >
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("pdfsec.generate")}
                    </button>
                    <span className="text-[12.5px] text-t-tertiary">{t("pdfsec.generateHint")}</span>
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-6">
                <Toggle checked={restrict} onChange={setRestrict} label={t("pdfsec.restrict")} description={t("pdfsec.restrictDesc")} />
                {restrict && (
                  <div className="mt-5 space-y-5 sm:ps-[52px]">
                    <div>
                      <p className="mb-2 text-[13px] font-medium text-t-secondary">{t("pdfsec.perm.printing")}</p>
                      <Segmented<PrintPermission>
                        size="sm"
                        label={t("pdfsec.perm.printing")}
                        value={permissions.printing}
                        onChange={(level) => setPermissions((p) => ({ ...p, printing: level }))}
                        options={(["none", "low", "high"] as PrintPermission[]).map((level) => ({
                          value: level,
                          label: t(`pdfsec.print.${level}`),
                        }))}
                      />
                    </div>
                    <fieldset>
                      <legend className="mb-2 text-[13px] font-medium text-t-secondary">{t("pdfsec.allow")}</legend>
                      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                        {permissionRows.map(({ key, label }) => (
                          <label key={key} className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-[14px] text-t-primary">
                            <input
                              type="checkbox"
                              checked={permissions[key]}
                              onChange={(e) => setPermissions((p) => ({ ...p, [key]: e.target.checked }))}
                              className="h-4 w-4 rounded accent-accent"
                            />
                            {label}
                          </label>
                        ))}
                      </div>
                    </fieldset>
                    <PasswordField
                      id="owner-pw"
                      label={t("pdfsec.ownerPassword")}
                      value={ownerPassword}
                      onChange={setOwnerPassword}
                      placeholder={t("pdfsec.ownerPlaceholder")}
                      invalid={ownerSameAsUser}
                      hint={ownerSameAsUser ? t("pdfsec.err.ownerSame") : t("pdfsec.ownerHint")}
                    />
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-6">
                <p className="mb-2 text-[13px] font-medium text-t-secondary">{t("pdfsec.cipher")}</p>
                <Segmented<PdfCipher>
                  size="sm"
                  label={t("pdfsec.cipher")}
                  value={cipher}
                  onChange={setCipher}
                  options={(["AES-256", "AES-128"] as PdfCipher[]).map((c) => ({ value: c, label: c }))}
                />
                <p className="mt-2 text-[12.5px] text-t-tertiary">
                  {cipher === "AES-256" ? t("pdfsec.cipher256") : t("pdfsec.cipher128")}
                </p>
              </div>
            </fieldset>

            {errorBox}

            {busy ? (
              progressBox
            ) : (
              <>
                <button type="submit" disabled={Boolean(protectError)} className={`${buttonPrimary} w-full`}>
                  <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                  {t("pdfsec.protectButton")}
                </button>
                {protectError && <p className="-mt-3 text-center text-[13px] text-t-tertiary">{protectError}</p>}
              </>
            )}
          </form>
        )}

        {file && info && mode === "unlock" && (
          <form className="glass space-y-5 p-5 sm:p-6" onSubmit={handleUnlock} noValidate>
            {!info.encrypted ? (
              <p className="text-[14px] text-t-secondary">{t("pdfsec.notEncrypted")}</p>
            ) : restrictionsOnly ? (
              <>
                {restrictionNotice}
                {errorBox}
                {busy ? (
                  progressBox
                ) : (
                  <button type="submit" className={`${buttonPrimary} w-full`}>
                    <LockKeyholeOpen className="h-4 w-4" aria-hidden="true" />
                    {t("pdfsec.v2.removeRestrictions")}
                  </button>
                )}
              </>
            ) : (
              <>
                <fieldset disabled={busy}>
                  <PasswordField
                    id="unlock-pw"
                    label={t("pdfsec.password")}
                    value={unlockPassword}
                    onChange={setUnlockPassword}
                    autoFocus
                    invalid={wrongPassword}
                    hint={wrongPassword ? t("pdfsec.err.wrongPassword") : t("pdfsec.unlockHint")}
                  />
                </fieldset>
                {errorBox}
                {busy ? (
                  progressBox
                ) : (
                  <button type="submit" disabled={!unlockPassword} className={`${buttonPrimary} w-full`}>
                    <LockKeyholeOpen className="h-4 w-4" aria-hidden="true" />
                    {t("pdfsec.unlockButton")}
                  </button>
                )}
              </>
            )}
          </form>
        )}

        {result && (
          <div className="glass space-y-4 border-emerald-500/30 p-5 sm:p-6" aria-live="polite">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-t-primary">
                  {result.kind === "protect"
                    ? t("pdfsec.doneProtect")
                    : result.kind === "unlock"
                      ? t("pdfsec.doneUnlock")
                      : t("pdfsec.v2.doneUnrestrict")}
                </p>
                <p className="truncate text-[13px] text-t-tertiary">
                  {result.name} · {formatFileSize(result.blob.size)}
                </p>
              </div>
            </div>
            {result.ownerPassword && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-[13.5px] text-t-secondary">
                <p className="mb-2">{t("pdfsec.generatedOwner")}</p>
                <div className="flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-surface px-3 py-2 font-mono text-[13px] text-t-primary">
                    {result.ownerPassword}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyText(result.ownerPassword!)}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-t-secondary hover:text-t-primary"
                    aria-label={t("ui.copy")}
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
            <button type="button" onClick={() => downloadBlob(result.blob, result.name)} className={`${buttonPrimary} w-full`}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {t("pdfsec.download")}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-[12.5px] text-t-tertiary">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {t("pdfsec.verified")}
            </p>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
