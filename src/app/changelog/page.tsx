import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Changelog",
  description: "ZapFile release history — new tools, improvements, and fixes.",
};

const releases = [
  {
    version: "v1.4.0",
    date: "April 2026",
    badge: "Latest",
    badgeColor: "bg-accent text-white",
    items: [
      { type: "new", text: "ASCII Art Generator & Audio Waveform tools — full pages and OG metadata" },
      { type: "new", text: "30+ SEO blog articles (guides for PDF, images, dev tools, comparisons)" },
      { type: "new", text: "ZapFile vs Smallpdf comparison page for branded search" },
      { type: "new", text: "Per-tool Open Graph images via /api/og and hreflang in metadata" },
      { type: "improved", text: "Compress Image: before/after slider, URL quality/maxDim params, share link, Ctrl+V paste on dropzones" },
      { type: "improved", text: "Pin favorite tools (localStorage), skip-to-content link, high-contrast mode, language radiogroup ARIA" },
      { type: "improved", text: "npm run analyze — bundle analyzer (ANALYZE=true)" },
      { type: "improved", text: "Catalog trim: removed FFmpeg video/audio tools, AI background removal, GIF maker (FFmpeg), and browser HTTP fetch demo — smaller bundles, fewer edge-case failures" },
    ],
  },
  {
    version: "v1.3.0",
    date: "April 2025",
    badge: null,
    badgeColor: "",
    items: [
      { type: "new", text: "Remove Background — AI-powered background removal, runs fully in-browser" },
      { type: "new", text: "German (DE) and French (FR) language support added — 783 keys each" },
      { type: "new", text: "Programmatic SEO pages for 20+ image and audio format conversions" },
      { type: "improved", text: "Language switcher in header now shows EN / TR / DE / FR" },
      { type: "improved", text: "Browser language auto-detection for German and French" },
    ],
  },
  {
    version: "v1.2.0",
    date: "March 2025",
    badge: null,
    badgeColor: "",
    items: [
      { type: "new", text: "Progressive Web App (PWA) — install ZapFile on any device" },
      { type: "new", text: "Blog — articles on file formats, privacy, and tool guides" },
      { type: "new", text: "Chrome Extension — access all 44 tools from your browser toolbar" },
      { type: "new", text: "Privacy & Trust section on homepage" },
      { type: "improved", text: "Service Worker caching for offline support" },
      { type: "improved", text: "Web App Manifest with shortcuts for 4 popular tools" },
    ],
  },
  {
    version: "v1.1.0",
    date: "February 2025",
    badge: null,
    badgeColor: "",
    items: [
      { type: "new", text: "Turkish (TR) language support — full i18n across all 44 tools" },
      { type: "new", text: "Pomodoro Timer, Regex Tester, YAML Formatter, Unit Converter" },
      { type: "new", text: "CSV ↔ JSON, XML Formatter, URL Encoder, Timestamp Converter" },
      { type: "new", text: "Diff Checker, Markdown Editor, Lorem Ipsum Generator" },
      { type: "new", text: "Trim Video, Trim Audio, Audio Converter tools" },
      { type: "improved", text: "Dynamic sitemap including all tool and conversion pages" },
      { type: "improved", text: "Structured data (JSON-LD) on all pages" },
      { type: "fixed", text: "FFmpeg WASM loading for video tools on Safari" },
    ],
  },
  {
    version: "v1.0.0",
    date: "January 2025",
    badge: "Initial Release",
    badgeColor: "bg-bg-secondary text-t-secondary border border-border",
    items: [
      { type: "new", text: "20 core tools: Merge PDF, Split PDF, Compress Image, Resize Image, Convert Image, and more" },
      { type: "new", text: "Compress Video, Extract Audio, Video to GIF" },
      { type: "new", text: "QR Generator, Base64 Encoder, JSON Formatter, Hash Generator" },
      { type: "new", text: "Color Picker, Word Counter, Password Generator" },
      { type: "new", text: "Dark / Light theme toggle" },
      { type: "new", text: "100% browser-based — no file uploads, no accounts" },
    ],
  },
];

const typeConfig: Record<string, { label: string; color: string }> = {
  new:      { label: "New",      color: "bg-green-500/10 text-green-600 dark:text-green-400" },
  improved: { label: "Improved", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  fixed:    { label: "Fixed",    color: "bg-orange-500/10 text-orange-600 dark:text-orange-400" },
};

export default function ChangelogPage() {
  return (
    <>
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <div className="max-w-2xl mx-auto px-5 py-16">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-3xl font-bold text-t-primary mb-3">Changelog</h1>
            <p className="text-t-secondary">
              New tools, improvements, and fixes — every release documented.
            </p>
          </div>

          {/* Timeline */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

            <div className="space-y-12">
              {releases.map((release) => (
                <div key={release.version} className="relative pl-8">
                  {/* Dot */}
                  <div className="absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full bg-accent border-2 border-bg" />

                  {/* Version header */}
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-lg font-bold text-t-primary">{release.version}</h2>
                    {release.badge && (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${release.badgeColor}`}>
                        {release.badge}
                      </span>
                    )}
                    <span className="text-sm text-t-tertiary ml-auto">{release.date}</span>
                  </div>

                  {/* Items */}
                  <ul className="space-y-2.5">
                    {release.items.map((item, i) => {
                      const cfg = typeConfig[item.type];
                      return (
                        <li key={i} className="flex items-start gap-3">
                          <span className={`mt-0.5 shrink-0 text-[11px] font-semibold px-1.5 py-0.5 rounded ${cfg.color}`}>
                            {cfg.label}
                          </span>
                          <span className="text-sm text-t-secondary leading-relaxed">{item.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          {/* Footer note */}
          <div className="mt-16 pt-8 border-t border-border text-center">
            <p className="text-sm text-t-tertiary">
              ZapFile is continuously updated.{" "}
              <a
                href="https://github.com/hasimogluayaz/zapfile"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                Follow on GitHub
              </a>{" "}
              for the latest changes.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
