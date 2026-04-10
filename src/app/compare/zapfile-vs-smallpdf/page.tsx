import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "ZapFile vs Smallpdf & ILovePDF — Privacy-first comparison",
  description:
    "Compare ZapFile with Smallpdf and ILovePDF: browser-based processing, no uploads, free tools, and how to choose the right PDF and image tool.",
  alternates: {
    canonical: `${SITE_URL}/compare/zapfile-vs-smallpdf`,
  },
  openGraph: {
    title: "ZapFile vs Smallpdf & ILovePDF",
    description:
      "Why browser-based tools win on privacy — feature comparison and when to use ZapFile.",
    url: `${SITE_URL}/compare/zapfile-vs-smallpdf`,
    siteName: "ZapFile",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "ZapFile vs Smallpdf comparison",
  url: `${SITE_URL}/compare/zapfile-vs-smallpdf`,
  description:
    "Comparison of ZapFile with popular online PDF tools from a privacy and pricing perspective.",
};

export default function ComparePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <article className="max-w-3xl mx-auto px-5 py-14">
          <h1 className="text-3xl font-bold text-t-primary mb-2">
            ZapFile vs Smallpdf vs ILovePDF
          </h1>
          <p className="text-t-secondary text-lg mb-10">
            A practical comparison for anyone searching{" "}
            <strong>zapfile vs smallpdf</strong> or{" "}
            <strong>free pdf tools without upload</strong>.
          </p>

          <section className="space-y-4 text-t-secondary">
            <h2 className="text-xl font-semibold text-t-primary">Privacy model</h2>
            <p>
              <strong className="text-t-primary">ZapFile</strong> runs entirely in your browser.
              Files are not uploaded to our servers for processing — they stay on your device.
              That is different from many cloud PDF services where your document transits a remote
              API even for &quot;simple&quot; tasks.
            </p>
            <p>
              <strong className="text-t-primary">Smallpdf</strong> and{" "}
              <strong className="text-t-primary">ILovePDF</strong> are established brands with
              large feature sets and paid tiers. They typically process files on their
              infrastructure, which means you must trust their security practices and retention
              policies.
            </p>
          </section>

          <section className="space-y-4 text-t-secondary mt-10">
            <h2 className="text-xl font-semibold text-t-primary">When ZapFile is a great fit</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>You want merge, split, compress, image, or utility tools without an account.</li>
              <li>You work with sensitive drafts and prefer local-only processing.</li>
              <li>You need a fast, free workflow for occasional PDF and image tasks.</li>
            </ul>
          </section>

          <section className="space-y-4 text-t-secondary mt-10">
            <h2 className="text-xl font-semibold text-t-primary">Quick links</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <Link href="/tools/merge-pdf" className="text-accent hover:underline">
                  Merge PDF
                </Link>
              </li>
              <li>
                <Link href="/tools/compress-image" className="text-accent hover:underline">
                  Compress images
                </Link>
              </li>
              <li>
                <Link href="/tools/qr-generator" className="text-accent hover:underline">
                  QR code generator
                </Link>
              </li>
            </ul>
          </section>

          <p className="text-sm text-t-tertiary mt-12">
            Trademarks belong to their owners. This page is an independent comparison and not
            affiliated with Smallpdf or ILovePDF.
          </p>
        </article>
      </main>
      <Footer />
    </div>
  );
}
