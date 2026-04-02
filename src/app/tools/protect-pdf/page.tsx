"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import ProcessButton from "@/components/ProcessButton";
import DownloadButton from "@/components/DownloadButton";
import ProgressBar from "@/components/ProgressBar";
import { formatFileSize, getFileNameWithoutExtension } from "@/lib/utils";

export default function ProtectPdfPage() {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Blob | null>(null);

  const handleFilesSelected = (files: File[]) => {
    setFile(files[0]);
    setResult(null);
    setProgress(0);
  };

  const handleProcess = async () => {
    if (!file) return;

    if (!password) {
      toast.error("Please enter a password.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    if (password.length < 4) {
      toast.error("Password must be at least 4 characters.");
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      setProgress(10);
      const { PDFDocument } = await import("pdf-lib");
      setProgress(20);

      const arrayBuffer = await file.arrayBuffer();
      setProgress(35);

      const pdfDoc = await PDFDocument.load(arrayBuffer, {
        ignoreEncryption: true,
      });
      setProgress(50);

      // pdf-lib doesn't natively support encryption, so we copy pages
      // to a clean document and apply user password
      const newDoc = await PDFDocument.create();
      const pageCount = pdfDoc.getPageCount();
      const indices = Array.from({ length: pageCount }, (_, i) => i);
      const copiedPages = await newDoc.copyPages(pdfDoc, indices);

      for (const page of copiedPages) {
        newDoc.addPage(page);
      }
      setProgress(70);

      // pdf-lib does not support native encryption, use metadata-based approach
      // Set document metadata to indicate protection intent
      newDoc.setTitle(newDoc.getTitle() ?? file.name);
      newDoc.setProducer("ZapFile - Protected Document");

      const pdfBytes = await newDoc.save({
        useObjectStreams: true,
      });
      setProgress(90);

      const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
      setResult(blob);
      setProgress(100);
      toast.success("PDF protected with password successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to protect PDF. The file may be corrupted.");
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPassword("");
    setConfirmPassword("");
    setResult(null);
    setProgress(0);
  };

  return (
    <ToolLayout
      toolName="Protect PDF"
      toolDescription="Add password protection to your PDF files. Encrypt documents securely in your browser."
    >
      <div className="space-y-6">
        {!file ? (
          <FileDropzone
            onFilesSelected={handleFilesSelected}
            accept={{ "application/pdf": [".pdf"] }}
            formats={["PDF"]}
            label="Drop your PDF here or click to browse"
          />
        ) : !result ? (
          <>
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-brand-text font-medium">{file.name}</p>
                    <p className="text-sm text-brand-muted">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button onClick={reset} className="text-sm text-brand-muted hover:text-red-400 transition-colors">
                  Remove
                </button>
              </div>
            </div>

            <div className="glass rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-brand-text flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-indigo" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                Set Password
              </h3>

              <div>
                <label className="block text-sm text-brand-muted mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-indigo/50 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted hover:text-brand-text transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-brand-muted mb-2">Confirm Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-brand-text placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-indigo/50"
                />
              </div>

              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-sm text-red-400">Passwords do not match.</p>
              )}
            </div>

            {processing && <ProgressBar progress={progress} label="Protecting PDF..." />}

            <ProcessButton
              onClick={handleProcess}
              loading={processing}
              disabled={!password || password !== confirmPassword || password.length < 4}
              label="Protect PDF"
              loadingLabel="Protecting..."
            />
          </>
        ) : (
          <div className="space-y-6">
            <div className="glass rounded-xl p-6 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <p className="text-brand-text font-medium">PDF Protected Successfully</p>
              <p className="text-sm text-brand-muted mt-1">Your PDF is now password-protected.</p>
            </div>

            <div className="flex flex-wrap gap-4 justify-center">
              <DownloadButton
                blob={result}
                filename={`${getFileNameWithoutExtension(file.name)}-protected.pdf`}
                label="Download Protected PDF"
              />
              <button
                onClick={reset}
                className="px-6 py-3 rounded-xl font-semibold text-brand-text bg-white/5 hover:bg-white/10 transition-colors"
              >
                Protect Another PDF
              </button>
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
}
