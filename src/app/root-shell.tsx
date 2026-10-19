import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "react-hot-toast";
import ClientProviders from "@/components/ClientProviders";
import type { Locale } from "@/lib/locales";
import { isRtlLocale } from "@/lib/locales";
import SkipToContent from "@/components/SkipToContent";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { SITE_URL } from "@/lib/site-url";
import "@fontsource/noto-sans-arabic/arabic-400.css";
import "@fontsource/noto-sans-arabic/arabic-500.css";
import "@fontsource/noto-sans-arabic/arabic-600.css";
import "@fontsource/noto-sans-arabic/arabic-700.css";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-mono",
  weight: "100 900",
  display: "swap",
});

/*
 * The <html> shell shared by the two root layouts: `(site)/layout.tsx`
 * (English pages) and `[locale]/layout.tsx` (/tr, /de, …). Neither reads
 * cookies or headers, so every page is prerendered and served from the CDN;
 * the visitor's preferred language is applied in the browser (I18nProvider).
 */

export const rootMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ZapFile - Free Online File Tools | Fast, Private, Browser-Based",
    template: "%s | ZapFile",
  },
  description:
    "Fast, free, and private file tools. Compress PDFs, convert images, generate QR codes and more. Almost every tool runs in your browser without uploading your files.",
  keywords: [
    "file tools",
    "compress pdf",
    "merge pdf",
    "image converter",
    "image compressor",
    "online tools",
    "free",
    "private",
    "browser-based",
    "no upload",
    "pdf tools",
    "resize image",
    "qr code generator",
    "crop image",
    "json formatter",
  ],
  authors: [{ name: "ZapFile", url: SITE_URL }],
  creator: "ZapFile",
  publisher: "ZapFile",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "ZapFile",
    title: "ZapFile - Free Online File Tools",
    description:
      "Fast, free, and private file tools. Almost every tool runs in your browser.",
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
      "Fast, free, and private file tools. Almost every tool runs in your browser.",
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
    canonical: SITE_URL,
  },
  verification: {
    google: "4k5LW57dXwNJkEYKplc4-IM_6uM5vskgXOZKLZRtGto",
  },
  appleWebApp: {
    capable: true,
    title: "ZapFile",
    statusBarStyle: "default",
  },
};

export const rootViewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7f9" },
    { media: "(prefers-color-scheme: dark)", color: "#101114" },
  ],
  colorScheme: "light dark",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "ZapFile",
  url: SITE_URL,
  description:
    "Fast, free, and private file tools. Compress PDFs, convert images, generate QR codes and more. Almost every tool runs in your browser.",
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
    "QR Code Generator",
    "QR Code Scanner",
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
    "Color Palette Generator",
  ],
};

export default function RootShell({
  locale,
  children,
}: Readonly<{
  locale: Locale;
  children: React.ReactNode;
}>) {
  return (
    <html className={`${geistSans.variable} ${geistMono.variable}`} lang={locale} dir={isRtlLocale(locale) ? "rtl" : "ltr"} suppressHydrationWarning translate="no">
      <head>
        <meta name="google" content="notranslate" />
        {/* Apply saved/system theme before first paint to avoid a light flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("zapfile-theme");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.setAttribute("data-theme",t)}catch(e){}})();`,
          }}
        />
        {process.env.NEXT_PUBLIC_GA_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`} />
            <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}');` }} />
          </>
        )}
        <link rel="manifest" href="/site.webmanifest?v=3" />
        <link
          rel="alternate"
          type="application/rss+xml"
          title="ZapFile Blog"
          href={`${SITE_URL}/feed.xml`}
        />
        <link rel="icon" href="/favicon.ico?v=3" sizes="any" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=3" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png?v=3"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png?v=3"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png?v=3"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="antialiased min-h-screen flex flex-col">
        <ClientProviders initialLocale={locale} pageLocale={locale}>
          <SkipToContent />
          <Toaster
            position="bottom-right"
            toastOptions={{
              duration: 5500,
              style: {
                background: "var(--surface)",
                color: "var(--text-primary)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                fontSize: "13px",
                boxShadow: "var(--shadow-lg)",
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
