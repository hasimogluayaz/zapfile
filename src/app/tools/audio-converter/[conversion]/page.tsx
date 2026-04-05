import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getAudioConversions,
  getConversionBySlug,
} from "@/lib/conversions";
import AudioConversionClient from "./AudioConversionClient";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export function generateStaticParams() {
  return getAudioConversions().map((c) => ({ conversion: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ conversion: string }>;
}): Promise<Metadata> {
  const { conversion } = await params;
  const conv = getConversionBySlug(conversion);
  if (!conv) return {};

  return {
    title: conv.metaTitle,
    description: conv.metaDescription,
    openGraph: {
      title: conv.metaTitle,
      description: conv.metaDescription,
      url: `https://zapfile.xyz/tools/audio-converter/${conv.slug}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: conv.metaTitle,
      description: conv.metaDescription,
    },
    alternates: {
      canonical: `https://zapfile.xyz/tools/audio-converter/${conv.slug}`,
    },
  };
}

export default async function ConversionPage({
  params,
}: {
  params: Promise<{ conversion: string }>;
}) {
  const { conversion } = await params;
  const conv = getConversionBySlug(conversion);
  if (!conv) notFound();

  const allConversions = getAudioConversions();
  const otherConversions = allConversions.filter((c) => c.slug !== conv.slug);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: conv.faq.map((item) => ({
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
      <main className="flex-1">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="max-w-2xl mx-auto px-5 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-t-tertiary mb-6">
          <Link href="/" className="hover:text-accent transition-colors">
            Home
          </Link>
          <ChevronIcon />
          <Link href="/tools" className="hover:text-accent transition-colors">
            Tools
          </Link>
          <ChevronIcon />
          <Link
            href="/tools/audio-converter"
            className="hover:text-accent transition-colors"
          >
            Audio Converter
          </Link>
          <ChevronIcon />
          <span className="text-t-secondary font-medium">{conv.h1}</span>
        </nav>

        {/* H1 + description */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-t-primary">{conv.h1}</h1>
          <p className="text-[14px] text-t-secondary mt-2 leading-relaxed">
            {conv.description}
          </p>
        </div>

        {/* Converter */}
        <section className="mb-12">
          <AudioConversionClient conversion={conv} />
        </section>

        {/* How it works */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-t-primary mb-4">
            How It Works
          </h2>
          <div className="glass rounded-2xl p-6">
            <ol className="space-y-4">
              {[
                `Drop your ${conv.fromLabel} file into the upload area or click to browse.`,
                `The converter will process your file in the browser using FFmpeg — nothing is uploaded.`,
                `Download your converted ${conv.toLabel} file instantly.`,
              ].map((step, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-accent/20 text-accent flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>
                  <p className="text-t-secondary text-sm leading-relaxed pt-0.5">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Benefits */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-t-primary mb-4">
            Benefits of Converting {conv.fromLabel} to {conv.toLabel}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {conv.benefits.map((benefit, i) => (
              <div key={i} className="glass rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <p className="text-t-secondary text-sm">{benefit}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-t-primary mb-4">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {conv.faq.map((item, i) => (
              <details key={i} className="glass rounded-2xl group">
                <summary className="px-6 py-4 cursor-pointer font-medium text-t-primary list-none flex items-center justify-between">
                  {item.q}
                  <svg
                    className="w-4 h-4 text-t-tertiary flex-shrink-0 ml-4 transition-transform duration-200 group-open:rotate-180"
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
        </section>

        {/* Other audio conversions */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-t-primary mb-4">
            Other Audio Conversions
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {otherConversions.map((c) => (
              <Link
                key={c.slug}
                href={`/tools/audio-converter/${c.slug}`}
                className="glass rounded-xl p-4 hover:border-accent/50 border border-transparent transition-all group text-center"
              >
                <p className="font-medium text-t-primary text-sm group-hover:text-accent transition-colors">
                  {c.fromLabel} to {c.toLabel}
                </p>
                <p className="text-[11px] text-t-tertiary mt-1">
                  Free online converter
                </p>
              </Link>
            ))}
          </div>
        </section>

        {/* Privacy badge */}
        <div className="flex items-center justify-center gap-2 text-[12px] text-t-tertiary">
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
          100% private. All processing happens in your browser.
        </div>
      </div>
      </main>
      <Footer />
    </>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="w-3 h-3 text-t-tertiary/40"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
