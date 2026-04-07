import type { Metadata, Viewport } from "next";
import { Toaster } from "react-hot-toast";
import ClientProviders from "@/components/ClientProviders";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://zapfile.xyz"),
  title: {
    default: "ZapFile - Free Online File Tools | Fast, Private, Browser-Based",
    template: "%s | ZapFile",
  },
  description:
    "Fast, free, and private file tools. Compress PDFs, convert images, extract audio and more. All processing happens in your browser — no uploads, no limits.",
  keywords: [
    "file tools",
    "compress pdf",
    "merge pdf",
    "image converter",
    "image compressor",
    "video compressor",
    "online tools",
    "free",
    "private",
    "browser-based",
    "no upload",
    "pdf tools",
    "resize image",
    "qr code generator",
    "remove background",
  ],
  authors: [{ name: "ZapFile", url: "https://zapfile.xyz" }],
  creator: "ZapFile",
  publisher: "ZapFile",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://zapfile.xyz",
    siteName: "ZapFile",
    title: "ZapFile - Free Online File Tools",
    description:
      "Fast, free, and private file tools. All processing happens in your browser.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ZapFile - Free Online File Tools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ZapFile - Free Online File Tools",
    description:
      "Fast, free, and private file tools. All processing happens in your browser.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://zapfile.xyz",
    languages: {
      en: "https://zapfile.xyz/?lang=en",
      tr: "https://zapfile.xyz/?lang=tr",
      de: "https://zapfile.xyz/?lang=de",
      fr: "https://zapfile.xyz/?lang=fr",
      es: "https://zapfile.xyz/?lang=es",
      pt: "https://zapfile.xyz/?lang=pt",
      it: "https://zapfile.xyz/?lang=it",
      ja: "https://zapfile.xyz/?lang=ja",
      ar: "https://zapfile.xyz/?lang=ar",
      he: "https://zapfile.xyz/?lang=he",
      "x-default": "https://zapfile.xyz",
    },
  },
  verification: {
    google: "4k5LW57dXwNJkEYKplc4-IM_6uM5vskgXOZKLZRtGto",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#6366f1" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1c25" },
  ],
  colorScheme: "light dark",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "ZapFile",
  url: "https://zapfile.xyz",
  description:
    "Fast, free, and private file tools. Compress PDFs, convert images, extract audio and more. All processing happens in your browser.",
  applicationCategory: "UtilityApplication",
  operatingSystem: "Any",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  browserRequirements: "Requires a modern web browser with JavaScript enabled",
  featureList: [
    "Merge PDF",
    "Split PDF",
    "PDF to Images",
    "Image Compression",
    "Image Conversion",
    "Image Blur & Pixelate",
    "Favicon Generator",
    "EXIF Viewer",
    "Image Collage Maker",
    "Meme Generator",
    "GIF Maker",
    "Video Compression",
    "Video Trimming",
    "Audio Extraction",
    "Audio Conversion",
    "QR Code Generator",
    "Password Generator",
    "Regex Tester",
    "Diff Checker",
    "Markdown Editor",
    "JSON Formatter",
    "XML Formatter",
    "CSV to JSON",
    "Hash Generator",
    "Word Counter",
    "Unit Converter",
    "Pomodoro Timer",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning translate="no">
      <head>
        <meta name="google" content="notranslate" />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} />
            <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}');` }} />
          </>
        )}
        <link rel="manifest" href="/site.webmanifest" />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="ZapFile Blog"
          href="https://zapfile.xyz/feed.xml"
        />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <a
          href="#main-content"
          className="skip-link"
        >
          Skip to content
        </a>
        <ClientProviders>
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: "var(--surface)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "13px",
              },
              success: {
                iconTheme: {
                  primary: "#10b981",
                  secondary: "var(--surface)",
                },
              },
              error: {
                iconTheme: {
                  primary: "#ef4444",
                  secondary: "var(--surface)",
                },
              },
            }}
          />
          {children}
          <SpeedInsights />
          <Analytics />
        </ClientProviders>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
