"use client";

import { useState, useRef } from "react";
import toast from "react-hot-toast";
import ToolLayout from "@/components/ToolLayout";
import { useI18n } from "@/lib/i18n";

const DEFAULT_HTML = `<!DOCTYPE html>
<html>
<head><style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #1a1d2e; }
  h1 { color: #6366f1; border-bottom: 2px solid #e0e3eb; padding-bottom: 12px; }
  p { line-height: 1.7; color: #555a6e; }
  table { border-collapse: collapse; width: 100%; margin-top: 20px; }
  th, td { border: 1px solid #e0e3eb; padding: 10px 14px; text-align: left; }
  th { background: #f7f8fc; font-weight: 600; }
</style></head>
<body>
  <h1>Sample Document</h1>
  <p>Paste your HTML here to convert it to a PDF. Styles, tables, and most HTML elements are supported.</p>
  <table>
    <tr><th>Name</th><th>Value</th></tr>
    <tr><td>Example A</td><td>100</td></tr>
    <tr><td>Example B</td><td>200</td></tr>
  </table>
</body>
</html>`;

export default function HtmlToPdfPage() {
  const { t } = useI18n();
  const [html, setHtml] = useState(DEFAULT_HTML);
  const [isConverting, setIsConverting] = useState(false);
  const hiddenRef = useRef<HTMLDivElement>(null);

  /** Fetch an external image URL and return it as a data-URL (base64).
   *  Returns null if the request fails (CORS or network error). */
  const fetchImageAsDataUrl = async (src: string): Promise<string | null> => {
    try {
      const res = await fetch(src, { mode: "cors", cache: "force-cache" });
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  /** Replace all external <img src="…"> with inline data-URLs so html2canvas
   *  can render them without CORS errors. Returns the patched HTML string. */
  const inlineExternalImages = async (rawHtml: string): Promise<string> => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, "text/html");
    const imgs = Array.from(doc.querySelectorAll("img[src]"));

    await Promise.all(
      imgs.map(async (img) => {
        const src = img.getAttribute("src") ?? "";
        // Only process absolute http(s) URLs — skip data: and relative paths
        if (!/^https?:\/\//i.test(src)) return;
        const dataUrl = await fetchImageAsDataUrl(src);
        if (dataUrl) img.setAttribute("src", dataUrl);
        else img.removeAttribute("src"); // remove broken images instead of showing broken icon
      })
    );

    return doc.documentElement.outerHTML;
  };

  const convertToPdf = async () => {
    if (!html.trim()) {
      toast.error(t("html2pdf.hint"));
      return;
    }
    setIsConverting(true);
    try {
      // Dynamic imports to avoid SSR issues
      const [html2canvasModule, jsPDFModule] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const html2canvas = html2canvasModule.default;
      const { jsPDF } = jsPDFModule;

      // Pre-process: inline external images as base64 data-URLs to bypass CORS
      const processedHtml = await inlineExternalImages(html);

      // Create a temporary container rendered off-screen
      const container = document.createElement("div");
      container.style.cssText = [
        "position:fixed",
        "left:-9999px",
        "top:0",
        "width:794px", // A4 at 96 dpi ≈ 794px
        "background:#ffffff",
        "color:#000000",
        "font-family:Arial,sans-serif",
        "font-size:14px",
        "line-height:1.6",
        "padding:40px",
        "box-sizing:border-box",
        "z-index:-1",
      ].join(";");
      container.innerHTML = processedHtml;
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: container.offsetWidth,
        height: container.scrollHeight,
      });

      document.body.removeChild(container);

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Scale image to fit page width, paginate if tall
      const imgAspect = canvas.height / canvas.width;
      const imgDisplayWidth = pdfWidth;
      const imgDisplayHeight = imgDisplayWidth * imgAspect;
      let yPosition = 0;
      let remainingHeight = imgDisplayHeight;

      while (remainingHeight > 0) {
        const pageContentHeight = Math.min(remainingHeight, pdfHeight);
        const srcY = (yPosition / imgDisplayHeight) * canvas.height;
        const srcH = (pageContentHeight / imgDisplayHeight) * canvas.height;

        // Create a slice canvas for this page
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = Math.round(srcH);
        const sliceCtx = sliceCanvas.getContext("2d");
        if (sliceCtx) {
          sliceCtx.drawImage(
            canvas,
            0, srcY, canvas.width, srcH,
            0, 0, canvas.width, Math.round(srcH)
          );
        }
        const sliceData = sliceCanvas.toDataURL("image/png");
        pdf.addImage(sliceData, "PNG", 0, 0, imgDisplayWidth, pageContentHeight);

        yPosition += pageContentHeight;
        remainingHeight -= pageContentHeight;
        if (remainingHeight > 0) pdf.addPage();
      }

      pdf.save("document.pdf");
      toast.success(t("html2pdf.success"));
    } catch (err) {
      console.error(err);
      toast.error(t("html2pdf.fail"));
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <ToolLayout
      toolName={t("tool.html-to-pdf.name")}
      toolDescription={t("tool.html-to-pdf.desc")}
    >
      <div className="space-y-6">
        {/* Editor */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-semibold text-t-primary">
              HTML
            </label>
            <span className="text-xs text-t-tertiary">{t("html2pdf.hint")}</span>
          </div>
          <textarea
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder={t("html2pdf.placeholder")}
            rows={18}
            spellCheck={false}
            className="w-full px-4 py-3 rounded-xl bg-bg-secondary border border-border text-t-primary placeholder:text-t-tertiary focus:outline-none focus:border-accent/40 resize-y font-mono text-xs leading-relaxed"
          />

          <div className="flex gap-3 mt-4">
            <button
              onClick={convertToPdf}
              disabled={isConverting}
              className="px-6 py-3 rounded-xl font-semibold text-white bg-accent hover:bg-accent-hover transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {isConverting ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4 animate-spin"
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
                  {t("html2pdf.convert")}...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  {t("html2pdf.download")}
                </span>
              )}
            </button>
            <button
              onClick={() => setHtml("")}
              className="px-6 py-3 rounded-xl font-semibold text-t-primary bg-bg-secondary border border-border hover:bg-bg-tertiary transition-all"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Info card */}
        <div className="glass rounded-2xl p-5">
          <div className="flex gap-3">
            <svg
              className="w-5 h-5 text-accent shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-t-primary mb-1">Tips</p>
              <ul className="text-xs text-t-secondary space-y-1 list-disc list-inside">
                <li>External images are automatically fetched and inlined — most load correctly</li>
                <li>Images on servers that block cross-origin requests may still be skipped</li>
                <li>Inline styles and embedded CSS work best for consistent results</li>
                <li>Conversion runs entirely in your browser — nothing is uploaded</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden render target */}
      <div ref={hiddenRef} className="hidden" />
    </ToolLayout>
  );
}
