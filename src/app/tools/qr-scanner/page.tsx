"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import jsQR from "jsqr";
import ToolLayout from "@/components/ToolLayout";
import FileDropzone from "@/components/FileDropzone";
import { useI18n } from "@/lib/i18n";

type ScanMode = "upload" | "camera";

export default function QrScannerPage() {
  const { t } = useI18n();
  const [scanMode, setScanMode] = useState<ScanMode>("upload");
  const [result, setResult] = useState<string>("");
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [hasCameraSupport, setHasCameraSupport] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    setHasCameraSupport(
      typeof navigator !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia
    );
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopCamera = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const scanFrameFromVideo = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameRef.current = requestAnimationFrame(scanFrameFromVideo);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code) {
      setResult(code.data);
      toast.success(t("qrscan.success"));
      stopCamera();
      return;
    }
    animFrameRef.current = requestAnimationFrame(scanFrameFromVideo);
  }, [t, stopCamera]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      animFrameRef.current = requestAnimationFrame(scanFrameFromVideo);
    } catch {
      toast.error("Camera access denied or unavailable.");
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);
    if (code) {
      setResult(code.data);
      toast.success(t("qrscan.success"));
      stopCamera();
    } else {
      toast.error(t("qrscan.noQR"));
    }
  };

  const handleFilesSelected = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setIsScanning(true);
    setResult("");
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        URL.revokeObjectURL(url);
        setIsScanning(false);
        return;
      }
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        setIsScanning(false);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      URL.revokeObjectURL(url);
      setIsScanning(false);
      if (code) {
        setResult(code.data);
        toast.success(t("qrscan.success"));
      } else {
        toast.error(t("qrscan.noQR"));
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setIsScanning(false);
      toast.error("Failed to load image.");
    };
    img.src = url;
  };

  const copyResult = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      toast.success(t("qrscan.copy"));
    } catch {
      toast.error("Failed to copy.");
    }
  };

  const handleModeSwitch = (mode: ScanMode) => {
    if (mode !== scanMode) {
      stopCamera();
      setResult("");
      setScanMode(mode);
    }
  };

  return (
    <ToolLayout
      toolName={t("tool.qr-scanner.name")}
      toolDescription={t("tool.qr-scanner.desc")}
    >
      <div className="space-y-6">
        {/* Mode Tabs */}
        <div className="glass rounded-2xl p-6">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => handleModeSwitch("upload")}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                scanMode === "upload"
                  ? "bg-accent-muted border border-accent text-t-primary"
                  : "bg-bg-secondary border border-border text-t-secondary hover:border-accent/40"
              }`}
            >
              {t("qrscan.upload")}
            </button>
            {hasCameraSupport && (
              <button
                onClick={() => handleModeSwitch("camera")}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  scanMode === "camera"
                    ? "bg-accent-muted border border-accent text-t-primary"
                    : "bg-bg-secondary border border-border text-t-secondary hover:border-accent/40"
                }`}
              >
                {t("qrscan.camera")}
              </button>
            )}
          </div>

          {/* Upload Mode */}
          {scanMode === "upload" && (
            <FileDropzone
              onFilesSelected={handleFilesSelected}
              accept={{
                "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"],
              }}
              formats={["PNG", "JPG", "JPEG", "WEBP", "GIF", "BMP"]}
              label={t("qrscan.upload")}
            />
          )}

          {/* Camera Mode */}
          {scanMode === "camera" && (
            <div className="space-y-4">
              <div className="relative w-full aspect-video bg-bg-secondary rounded-xl overflow-hidden border border-border flex items-center justify-center">
                <video
                  ref={videoRef}
                  className={`w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
                  playsInline
                  muted
                />
                {!cameraActive && (
                  <div className="flex flex-col items-center gap-3 text-t-tertiary">
                    <svg
                      className="w-10 h-10"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                      />
                    </svg>
                    <span className="text-sm">{t("qrscan.camera")}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                {!cameraActive ? (
                  <button
                    onClick={startCamera}
                    className="px-6 py-3 rounded-xl font-semibold text-white bg-accent hover:bg-accent-hover transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {t("qrscan.scan")}
                  </button>
                ) : (
                  <>
                    <button
                      onClick={captureFrame}
                      className="px-6 py-3 rounded-xl font-semibold text-white bg-accent hover:bg-accent-hover transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {t("qrscan.scan")}
                    </button>
                    <button
                      onClick={stopCamera}
                      className="px-6 py-3 rounded-xl font-semibold text-t-primary bg-bg-secondary border border-border hover:bg-bg-tertiary transition-all"
                    >
                      Stop
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Hidden canvas for processing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanning indicator */}
          {isScanning && (
            <div className="flex items-center gap-2 mt-4 text-t-secondary text-sm">
              <svg
                className="w-4 h-4 animate-spin text-accent"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              {t("qrscan.scan")}...
            </div>
          )}
        </div>

        {/* Result Section */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-t-primary">
              {t("qrscan.result")}
            </h3>
            {result && (
              <button
                onClick={copyResult}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-t-secondary bg-bg-secondary border border-border hover:bg-bg-tertiary hover:text-t-primary transition-all"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                {t("qrscan.copy")}
              </button>
            )}
          </div>
          <textarea
            readOnly
            value={result}
            placeholder={t("qrscan.placeholder")}
            rows={5}
            className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border text-t-primary placeholder:text-t-tertiary focus:outline-none focus:border-accent/40 resize-none font-mono text-sm select-all"
          />
        </div>
      </div>
    </ToolLayout>
  );
}
