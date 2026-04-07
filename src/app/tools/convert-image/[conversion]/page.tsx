import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getImageConversions,
  getConversionBySlug,
} from "@/lib/conversions";
import ConversionClient from "./ConversionClient";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdPlaceholder from "@/components/AdPlaceholder";

const BASE_URL = "https://zapfile.xyz";

/* ---------- static params ---------- */

export function generateStaticParams() {
  return getImageConversions().map((c) => ({ conversion: c.slug }));
}

/* ---------- dynamic metadata ---------- */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ conversion: string }>;
}): Promise<Metadata> {
  const { conversion: slug } = await params;
  const conv = getConversionBySlug(slug);
  if (!conv) return {};

  const title = `${conv.fromLabel} to ${conv.toLabel} Converter - Free Online Tool | ZapFile`;
  const description = `Convert ${conv.fromLabel} images to ${conv.toLabel} format online for free. Fast, private, browser-based ${conv.fromLabel} to ${conv.toLabel} conversion with no upload required.`;
  const canonicalUrl = `${BASE_URL}/tools/convert-image/${conv.slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: "ZapFile",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

/* ---------- page component ---------- */

export default async function ConversionPage({
  params,
}: {
  params: Promise<{ conversion: string }>;
}) {
  const { conversion: slug } = await params;
  const conv = getConversionBySlug(slug);
  if (!conv) notFound();

  const allConversions = getImageConversions().filter(
    (c) => c.slug !== conv.slug
  );

  const faqItems = [
    {
      q: `Is this ${conv.fromLabel} to ${conv.toLabel} converter free?`,
      a: `Yes, this tool is completely free to use. There are no limits on the number of files you can convert, and no account or sign-up is required.`,
    },
    {
      q: `Is it safe to convert my ${conv.fromLabel} files here?`,
      a: `Absolutely. Your files never leave your browser. All conversion happens locally on your device using browser APIs, so your images are never uploaded to any server.`,
    },
    {
      q: `Can I convert multiple ${conv.fromLabel} files to ${conv.toLabel} at once?`,
      a: `Yes, batch conversion is fully supported. Simply select or drop multiple ${conv.fromLabel} files and they will all be converted to ${conv.toLabel} format. You can download them individually or as a ZIP archive.`,
    },
    {
      q: `What is the maximum file size I can convert?`,
      a: `Since all processing is done in your browser, there is no strict file size limit imposed by the server. However, very large files may take longer to process depending on your device's capabilities.`,
    },
    {
      q: `Will the image quality be preserved during conversion?`,
      a: conv.outputFormat === "png"
        ? `PNG is a lossless format, so the visual quality of your image will be fully preserved during conversion.`
        : `You can adjust the quality slider to balance between file size and image quality. Higher quality settings preserve more detail but produce larger files.`,
    },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <div className="max-w-2xl mx-auto px-5 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-[12px] text-t-tertiary mb-6">
            <Link href="/" className="hover:text-accent transition-colors">
              Home
            </Link>
            <BreadcrumbArrow />
            <Link
              href="/tools"
              className="hover:text-accent transition-colors"
            >
              Tools
            </Link>
            <BreadcrumbArrow />
            <Link
              href="/tools/convert-image"
              className="hover:text-accent transition-colors"
            >
              Convert Image
            </Link>
            <BreadcrumbArrow />
            <span className="text-t-secondary font-medium">
              {conv.fromLabel} to {conv.toLabel}
            </span>
          </nav>

          <AdPlaceholder position="top" />

          {/* SEO Hero Section */}
          <section className="mb-8">
            <h1 className="text-2xl font-bold text-t-primary">
              Convert {conv.fromLabel} to {conv.toLabel} Online - Free &amp;
              Private
            </h1>
            <p className="text-[14px] text-t-secondary mt-2 leading-relaxed">
              Instantly convert your {conv.fromLabel} images to {conv.toLabel}{" "}
              format right in your browser. No uploads, no sign-ups, no
              watermarks. Your files stay on your device for complete privacy.
              Batch conversion is supported.
            </p>
          </section>

          {/* Converter Tool */}
          <div className="animate-fade-up">
            <ConversionClient conversion={conv} />
          </div>

          {/* How It Works */}
          <section className="mt-16">
            <h2 className="text-xl font-semibold text-t-primary mb-6">
              How It Works
            </h2>
            <div className="grid gap-4">
              {[
                {
                  step: "1",
                  title: "Upload Your Files",
                  desc: `Drag and drop your ${conv.fromLabel} files or click to browse. You can select multiple files for batch conversion.`,
                },
                {
                  step: "2",
                  title: "Adjust Settings",
                  desc:
                    conv.outputFormat === "png"
                      ? `Your files will be converted to lossless ${conv.toLabel} format with full quality preservation.`
                      : `Optionally adjust the quality slider to balance file size and image quality for your ${conv.toLabel} output.`,
                },
                {
                  step: "3",
                  title: "Download Results",
                  desc: `Click convert and download your ${conv.toLabel} files instantly. For multiple files, download them all as a single ZIP archive.`,
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="glass rounded-2xl p-6 flex gap-4 items-start"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-sm font-bold text-accent">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-medium text-t-primary">
                      {item.title}
                    </h3>
                    <p className="text-sm text-t-secondary mt-1">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Benefits */}
          <section className="mt-16">
            <h2 className="text-xl font-semibold text-t-primary mb-6">
              Why Use Our {conv.fromLabel} to {conv.toLabel} Converter
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  title: "100% Private",
                  desc: "All conversion happens in your browser. Your images are never uploaded to any server.",
                },
                {
                  title: "Completely Free",
                  desc: "No hidden fees, no premium tiers, no file count limits. Convert as many images as you need.",
                },
                {
                  title: "Batch Conversion",
                  desc: `Convert multiple ${conv.fromLabel} files to ${conv.toLabel} at once and download them as a ZIP.`,
                },
                {
                  title: "Lightning Fast",
                  desc: "Browser-based processing means no waiting for server uploads or downloads. Conversion is instant.",
                },
              ].map((benefit) => (
                <div
                  key={benefit.title}
                  className="glass rounded-2xl p-6"
                >
                  <h3 className="font-medium text-t-primary">
                    {benefit.title}
                  </h3>
                  <p className="text-sm text-t-secondary mt-1">
                    {benefit.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="mt-16 mb-8">
            <h2 className="text-xl font-semibold text-t-primary mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {faqItems.map((item, index) => (
                <details
                  key={index}
                  className="glass rounded-xl overflow-hidden group"
                >
                  <summary className="w-full px-6 py-4 flex items-center justify-between text-left cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <span className="font-medium text-t-primary">
                      {item.q}
                    </span>
                    <svg
                      className="w-4 h-4 text-t-tertiary shrink-0 ml-4 transition-transform duration-200 group-open:rotate-180"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </summary>
                  <div className="px-6 pb-4 text-t-secondary text-sm">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(faqSchema),
              }}
            />
          </section>

          {/* Other Conversions */}
          <section className="mt-12 mb-8">
            <h2 className="text-xl font-semibold text-t-primary mb-6">
              Other Image Conversions
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {allConversions.map((c) => (
                <Link
                  key={c.slug}
                  href={`/tools/convert-image/${c.slug}`}
                  className="glass rounded-xl p-4 hover:border-accent/50 border border-transparent transition-all group text-center"
                >
                  <span className="text-sm font-medium text-t-primary group-hover:text-accent transition-colors">
                    {c.fromLabel} to {c.toLabel}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* Privacy badge */}
          <div className="mt-12 flex items-center justify-center gap-2 text-[12px] text-t-tertiary">
            <svg
              className="w-3.5 h-3.5 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            Your files never leave your browser. 100% private.
          </div>

          <AdPlaceholder position="bottom" />
        </div>
      </main>
      <Footer />
    </>
  );
}

/* ---------- small helper component ---------- */

function BreadcrumbArrow() {
  return (
    <svg
      className="w-3 h-3 text-t-tertiary/40"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5l7 7-7 7"
      />
    </svg>
  );
}
