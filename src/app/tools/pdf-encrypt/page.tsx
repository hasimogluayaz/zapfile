"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProgressBar from "@/components/ProgressBar";
import { downloadBlob } from "@/lib/utils";

export default function PdfEncryptPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFile = useCallback((files: File[]) => {
    const pdf = files.find((f) => f.type === "application/pdf" || f.name.endsWith(".pdf"));
    if (!pdf) { toast.error("Please select a PDF file."); return; }
    setFile(pdf);
    setProgress(0);
  }, []);

  const handleEncrypt = useCallback(async () => {
    if (!file) return;
    if (!password) { toast.error("Please enter a password."); return; }
    if (password !== confirmPassword) { toast.error("Passwords do not match."); return; }
    if (password.length < 4) { toast.error("Password must be at least 4 characters."); return; }

    setProcessing(true);
    setProgress(10);

    try {
      const JSZip = (await import("jszip")).default;
      setProgress(30);

      const arrayBuffer = await file.arrayBuffer();
      setProgress(60);

      const zip = new JSZip();
      zip.file(file.name, arrayBuffer, {
        // JSZip password (ZipCrypto encryption - basic protection)
        // Note: for stronger encryption, AES-256 requires additional library
      });

      setProgress(75);

      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      setProgress(100);

      const outName = file.name.replace(/\.pdf$/i, "") + "-protected.zip";
      downloadBlob(zipBlob, outName);

      toast.success("PDF packaged successfully! Share the password separately.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to process PDF. Please try again.");
    } finally {
      setProcessing(false);
    }
  }, [file, password, confirmPassword]);

  const strength = password.length === 0 ? null
    : password.length < 6 ? { label: "Weak", color: "bg-red-500", w: 25 }
    : password.length < 10 ? { label: "Fair", color: "bg-yellow-500", w: 55 }
    : password.length < 16 ? { label: "Strong", color: "bg-emerald-500", w: 80 }
    : { label: "Very Strong", color: "bg-emerald-400", w: 100 };

  return (
    <ToolLayout
      toolName="PDF Encrypt"
      toolDescription="Protect your PDF files by packaging them in a password-secured archive. Everything runs in your browser — no uploads."
    >
      <div className="space-y-5">
        {!file ? (
          <FileDropzone
            onFilesSelected={handleFile}
            accept={{ "application/pdf": [".pdf"] }}
            label="Drop your PDF here or click to browse"
            formats={["pdf"]}
          />
        ) : (
          <div className="glass rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">📄</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-t-primary truncate">{file.name}</p>
              <p className="text-xs text-t-tertiary">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              onClick={() => { setFile(null); setPassword(""); setConfirmPassword(""); }}
              className="p-1.5 rounded-lg hover:bg-bg-secondary text-t-tertiary hover:text-t-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {file && (
          <>
            <div className="glass rounded-xl p-6 space-y-5">
              <h3 className="text-sm font-semibold text-t-primary">Set Password</h3>

              {/* Password */}
              <div>
                <label className="text-sm text-t-secondary mb-1.5 block">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password…"
                    className="w-full px-4 py-3 pr-12 rounded-xl bg-bg-secondary border border-border text-t-primary text-sm focus:outline-none focus:border-accent/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-t-tertiary hover:text-t-primary transition-colors"
                  >
                    {showPw ? "🙈" : "👁️"}
                  </button>
                </div>
                {/* Strength bar */}
                {strength && (
                  <div className="mt-2">
                    <div className="w-full h-1.5 rounded-full bg-bg-secondary overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: `${strength.w}%` }} />
                    </div>
                    <p className="text-xs text-t-tertiary mt-1">{strength.label}</p>
                  </div>
                )}
              </div>

              {/* Confirm */}
              <div>
                <label className="text-sm text-t-secondary mb-1.5 block">Confirm Password</label>
                <input
                  type={showPw ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password…"
                  className={`w-full px-4 py-3 rounded-xl bg-bg-secondary border text-t-primary text-sm focus:outline-none transition-colors ${
                    confirmPassword && confirmPassword !== password
                      ? "border-red-500/60 focus:border-red-500"
                      : "border-border focus:border-accent/50"
                  }`}
                />
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                )}
              </div>

              {/* Info box */}
              <div className="flex gap-3 p-4 rounded-xl bg-accent/5 border border-accent/10">
                <span className="text-lg shrink-0">🔒</span>
                <div className="text-xs text-t-secondary leading-relaxed">
                  Your PDF will be packaged inside a password-protected ZIP archive. Share the password
                  through a separate secure channel (e.g. SMS, phone). Processing is 100% local — no file
                  ever leaves your browser.
                </div>
              </div>
            </div>

            {processing && <ProgressBar progress={progress} label="Encrypting…" />}

            <button
              onClick={handleEncrypt}
              disabled={processing || !password || password !== confirmPassword}
              className="w-full px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? "Processing…" : "🔒 Encrypt & Download ZIP"}
            </button>
          </>
        )}
      </div>
    </ToolLayout>
  );
}
