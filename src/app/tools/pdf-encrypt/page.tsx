"use client";

import { useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileLock2,
  FileText,
  LockKeyhole,
  LockKeyholeOpen,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
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
} from "@/lib/pdf-security";

type Mode = "protect" | "unlock";

interface Result {
  blob: Blob;
  name: string;
  ownerPassword?: string;
}

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

const fieldClass =
  "w-full rounded-xl border border-border bg-bg-secondary px-3.5 py-2.5 text-[14px] text-t-primary placeholder:text-t-tertiary focus:border-t-primary/40 focus:outline-none";

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
          className={`${fieldClass} pe-11 font-mono ${invalid ? "border-red-500/60" : ""}`}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute end-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-t-tertiary hover:bg-bg-tertiary hover:text-t-primary"
          aria-label={visible ? t("pdfsec.hide") : t("pdfsec.show")}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
        </button>
      </div>
      {hint && <p className={`mt-1.5 text-[12.5px] ${invalid ? "text-red-600 dark:text-red-400" : "text-t-tertiary"}`}>{hint}</p>}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-10 rounded-full bg-bg-tertiary transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-volt" />
        <span className="absolute start-0.5 top-0.5 h-5 w-5 rounded-full bg-surface shadow transition-transform peer-checked:translate-x-4 rtl:peer-checked:-translate-x-4" />
      </span>
      <span>
        <span className="block text-[14px] font-medium text-t-primary">{label}</span>
        {description && <span className="mt-0.5 block text-[13px] text-t-tertiary">{description}</span>}
      </span>
    </label>
  );
}

export default function PdfEncryptPage() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>("protect");
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<PdfInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const resetOutput = () => {
    setResult(null);
    setError(null);
    setWrongPassword(false);
  };

  const handleFiles = useCallback(
    async (files: File[]) => {
      const pdf = files[0];
      if (!pdf) return;
      resetOutput();
      setFile(pdf);
      setInfo(null);
      setCurrentPassword("");
      setUnlockPassword("");
      try {
        const inspected = await inspectPdf(new Uint8Array(await pdf.arrayBuffer()));
        setInfo(inspected);
        // An already-protected file most likely needs unlocking.
        setMode(inspected.encrypted ? "unlock" : "protect");
      } catch {
        setFile(null);
        toast.error(t("pdfsec.invalid"));
      }
    },
    [t],
  );

  const clearFile = () => {
    setFile(null);
    setInfo(null);
    resetOutput();
  };

  const passwordMismatch = requireOpenPassword && confirm.length > 0 && password !== confirm;
  const ownerSameAsUser = restrict && ownerPassword.length > 0 && ownerPassword === password;

  const protectError = (() => {
    if (!requireOpenPassword && !restrict) return t("pdfsec.err.nothing");
    if (requireOpenPassword && password.length === 0) return t("pdfsec.err.passwordRequired");
    if (requireOpenPassword && password !== confirm) return t("pdfsec.err.mismatch");
    if (ownerSameAsUser) return t("pdfsec.err.ownerSame");
    if (info?.encrypted && currentPassword.length === 0) return t("pdfsec.err.currentRequired");
    return null;
  })();

  const handleProtect = async () => {
    if (!file || protectError) return;
    setBusy(true);
    resetOutput();
    try {
      const generatedOwner = restrict && !ownerPassword ? randomOwnerPassword() : undefined;
      const userPw = requireOpenPassword ? password : "";
      const owner = restrict ? ownerPassword || generatedOwner! : password || randomOwnerPassword();
      const bytes = await protectPdf(new Uint8Array(await file.arrayBuffer()), {
        userPassword: userPw,
        ownerPassword: owner,
        permissions: restrict ? permissions : FULL_PERMISSIONS,
        cipher,
        currentPassword: info?.encrypted ? currentPassword : undefined,
      });
      setResult({
        blob: new Blob([bytes as BlobPart], { type: "application/pdf" }),
        name: `${getFileNameWithoutExtension(file.name)}-protected.pdf`,
        ownerPassword: generatedOwner,
      });
      toast.success(t("pdfsec.protected"));
    } catch (e) {
      if (e instanceof PdfPasswordError) {
        setError(t("pdfsec.err.currentWrong"));
      } else if (e instanceof PdfInvalidError) {
        setError(t("pdfsec.invalid"));
      } else {
        console.error(e);
        setError(t("pdfsec.err.generic"));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleUnlock = async () => {
    if (!file || !unlockPassword) return;
    setBusy(true);
    resetOutput();
    try {
      const bytes = await unlockPdf(new Uint8Array(await file.arrayBuffer()), unlockPassword);
      setResult({
        blob: new Blob([bytes as BlobPart], { type: "application/pdf" }),
        name: `${getFileNameWithoutExtension(file.name)}-unlocked.pdf`,
      });
      toast.success(t("pdfsec.unlocked"));
    } catch (e) {
      if (e instanceof PdfPasswordError) {
        setWrongPassword(true);
      } else {
        console.error(e);
        setError(t("pdfsec.err.generic"));
      }
    } finally {
      setBusy(false);
    }
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

  const primaryButton =
    "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 text-[15px] font-semibold text-on-accent transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <ToolLayout
      toolName="Protect PDF"
      toolDescription="Add or remove password protection on PDF files with AES-256 encryption."
    >
      <div className="space-y-5">
        <div className="segmented" role="tablist" aria-label={t("pdfsec.mode")}>
          {(["protect", "unlock"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                resetOutput();
              }}
              className={`inline-flex items-center gap-2 rounded-[9px] px-4 py-2 text-[14px] font-medium transition-colors ${
                mode === m ? "bg-surface text-t-primary shadow-sm" : "text-t-secondary hover:text-t-primary"
              }`}
            >
              {m === "protect" ? <LockKeyhole className="h-4 w-4" aria-hidden="true" /> : <LockKeyholeOpen className="h-4 w-4" aria-hidden="true" />}
              {m === "protect" ? t("pdfsec.mode.protect") : t("pdfsec.mode.unlock")}
            </button>
          ))}
        </div>

        {!file ? (
          <FileDropzone
            onFilesSelected={handleFiles}
            accept={{ "application/pdf": [".pdf"] }}
            formats={["PDF"]}
            label={t("pdfsec.drop")}
          />
        ) : (
          <div className="glass flex items-center gap-3 p-4">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${info?.encrypted ? "volt-mark" : "bg-bg-secondary text-t-primary"}`}>
              {info?.encrypted ? <FileLock2 className="h-5 w-5" aria-hidden="true" /> : <FileText className="h-5 w-5" aria-hidden="true" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold text-t-primary">{file.name}</p>
              <p className="text-[13px] text-t-tertiary">
                {formatFileSize(file.size)}
                {info?.pageCount ? ` · ${t("pdfsec.pages", { count: info.pageCount })}` : ""}
                {info ? ` · ${info.encrypted ? t("pdfsec.status.locked") : t("pdfsec.status.open")}` : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={clearFile}
              className="flex h-9 w-9 items-center justify-center rounded-full text-t-tertiary hover:bg-bg-secondary hover:text-t-primary"
              aria-label={t("pdfsec.removeFile")}
            >
              <X className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
          </div>
        )}

        {file && info && mode === "protect" && (
          <div className="glass space-y-6 p-5 sm:p-6">
            {info.encrypted && (
              <div className="rounded-xl border border-border bg-bg-secondary p-4">
                <PasswordField
                  id="current-pw"
                  label={t("pdfsec.currentPassword")}
                  value={currentPassword}
                  onChange={(v) => {
                    setCurrentPassword(v);
                    setError(null);
                  }}
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
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <PasswordField
                    id="pw"
                    label={t("pdfsec.password")}
                    value={password}
                    onChange={setPassword}
                    autoFocus
                  />
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
                <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const pw = generatePassword();
                      setPassword(pw);
                      setConfirm(pw);
                      void copyText(pw);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[13px] font-medium text-t-secondary hover:bg-bg-secondary hover:text-t-primary"
                  >
                    <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("pdfsec.generate")}
                  </button>
                  <span className="text-[12.5px] text-t-tertiary">{t("pdfsec.generateHint")}</span>
                </div>
              </div>
            )}

            <div className="border-t border-border pt-6">
              <Toggle
                checked={restrict}
                onChange={setRestrict}
                label={t("pdfsec.restrict")}
                description={t("pdfsec.restrictDesc")}
              />
              {restrict && (
                <div className="mt-5 space-y-5 ps-[52px]">
                  <div>
                    <p className="mb-2 text-[13px] font-medium text-t-secondary">{t("pdfsec.perm.printing")}</p>
                    <div className="segmented">
                      {(["none", "low", "high"] as PrintPermission[]).map((level) => (
                        <button
                          key={level}
                          type="button"
                          aria-pressed={permissions.printing === level}
                          onClick={() => setPermissions((p) => ({ ...p, printing: level }))}
                          className={`rounded-[9px] px-3 py-1.5 text-[13px] font-medium ${
                            permissions.printing === level ? "bg-surface text-t-primary shadow-sm" : "text-t-secondary hover:text-t-primary"
                          }`}
                        >
                          {t(`pdfsec.print.${level}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <fieldset>
                    <legend className="mb-2 text-[13px] font-medium text-t-secondary">{t("pdfsec.allow")}</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {permissionRows.map(({ key, label }) => (
                        <label key={key} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1 text-[14px] text-t-primary">
                          <input
                            type="checkbox"
                            checked={permissions[key]}
                            onChange={(e) => setPermissions((p) => ({ ...p, [key]: e.target.checked }))}
                            className="h-4 w-4 rounded"
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
              <div className="segmented">
                {(["AES-256", "AES-128"] as PdfCipher[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={cipher === c}
                    onClick={() => setCipher(c)}
                    className={`rounded-[9px] px-3 py-1.5 text-[13px] font-medium ${
                      cipher === c ? "bg-surface text-t-primary shadow-sm" : "text-t-secondary hover:text-t-primary"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[12.5px] text-t-tertiary">
                {cipher === "AES-256" ? t("pdfsec.cipher256") : t("pdfsec.cipher128")}
              </p>
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[14px] text-red-700 dark:text-red-300">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={handleProtect}
              disabled={busy || Boolean(protectError)}
              className={primaryButton}
            >
              <LockKeyhole className="h-4 w-4" aria-hidden="true" />
              {busy ? t("pdfsec.working") : t("pdfsec.protectButton")}
            </button>
            {protectError && !busy && (
              <p className="-mt-3 text-center text-[13px] text-t-tertiary">{protectError}</p>
            )}
          </div>
        )}

        {file && info && mode === "unlock" && (
          <div className="glass space-y-5 p-5 sm:p-6">
            {!info.encrypted ? (
              <p className="text-[14px] text-t-secondary">{t("pdfsec.notEncrypted")}</p>
            ) : (
              <>
                <PasswordField
                  id="unlock-pw"
                  label={t("pdfsec.password")}
                  value={unlockPassword}
                  onChange={(v) => {
                    setUnlockPassword(v);
                    setWrongPassword(false);
                  }}
                  autoFocus
                  invalid={wrongPassword}
                  hint={wrongPassword ? t("pdfsec.err.wrongPassword") : t("pdfsec.unlockHint")}
                />
                {error && (
                  <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-[14px] text-red-700 dark:text-red-300">
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleUnlock}
                  disabled={busy || !unlockPassword}
                  className={primaryButton}
                >
                  <LockKeyholeOpen className="h-4 w-4" aria-hidden="true" />
                  {busy ? t("pdfsec.working") : t("pdfsec.unlockButton")}
                </button>
              </>
            )}
          </div>
        )}

        {result && (
          <div className="glass space-y-4 border-emerald-500/30 p-5 sm:p-6" aria-live="polite">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold text-t-primary">
                  {mode === "protect" ? t("pdfsec.doneProtect") : t("pdfsec.doneUnlock")}
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
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-t-secondary hover:text-t-primary"
                    aria-label={t("ui.copy")}
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => downloadBlob(result.blob, result.name)}
              className={primaryButton}
            >
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
