"use client";

import Link from "next/link";
import type { ConversionDef } from "@/lib/conversions";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AdPlaceholder from "@/components/AdPlaceholder";
import ConversionClient from "./ConversionClient";
import { useI18n } from "@/lib/i18n";
import { useMemo } from "react";

function BreadcrumbArrow() {
  return (
    <svg
      className="w-3 h-3 text-t-tertiary/40 rtl:rotate-180"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

export default function ConversionMarketingClient({
  conversion: conv,
  allConversions,
}: {
  conversion: ConversionDef;
  allConversions: ConversionDef[];
}) {
  const { t } = useI18n();
  const from = conv.fromLabel;
  const to = conv.toLabel;

  const faqItems = useMemo(
    () => [
      { q: t("conversion.faq1q", { from, to }), a: t("conversion.faq1a") },
      { q: t("conversion.faq2q", { from }), a: t("conversion.faq2a") },
      { q: t("conversion.faq3q", { from, to }), a: t("conversion.faq3a", { from, to }) },
      { q: t("conversion.faq4q"), a: t("conversion.faq4a") },
      {
        q: t("conversion.faq5q"),
        a:
          conv.outputFormat === "png"
            ? t("conversion.faq5aPng")
            : t("conversion.faq5aOther"),
      },
    ],
    [t, from, to, conv.outputFormat],
  );

  const faqSchema = useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    }),
    [faqItems],
  );

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <div className="max-w-2xl mx-auto px-5 py-8">
          <nav className="flex items-center gap-1.5 text-[12px] text-t-tertiary mb-6 flex-wrap">
            <Link href="/" className="hover:text-accent transition-colors">
              {t("tool.home")}
            </Link>
            <BreadcrumbArrow />
            <Link href="/tools" className="hover:text-accent transition-colors">
              {t("tool.tools")}
            </Link>
            <BreadcrumbArrow />
            <Link
              href="/tools/convert-image"
              className="hover:text-accent transition-colors"
            >
              {t("tool.convert-image.name")}
            </Link>
            <BreadcrumbArrow />
            <span className="text-t-secondary font-medium">
              {from} → {to}
            </span>
          </nav>

          <AdPlaceholder position="top" />

          <section className="mb-8">
            <h1 className="text-2xl font-bold text-t-primary">
              {t("conversion.heroTitle", { from, to })}
            </h1>
            <p className="text-[14px] text-t-secondary mt-2 leading-relaxed">
              {t("conversion.heroSubtitle", { from, to })}
            </p>
          </section>

          <div className="animate-fade-up">
            <ConversionClient conversion={conv} />
          </div>

          <section className="mt-16">
            <h2 className="text-xl font-semibold text-t-primary mb-6">
              {t("conversion.howTitle")}
            </h2>
            <div className="grid gap-4">
              {[
                {
                  step: "1",
                  title: t("conversion.step1Title"),
                  desc: t("conversion.step1Desc", { from }),
                },
                {
                  step: "2",
                  title: t("conversion.step2Title"),
                  desc:
                    conv.outputFormat === "png"
                      ? t("conversion.step2DescPng", { to })
                      : t("conversion.step2DescOther", { to }),
                },
                {
                  step: "3",
                  title: t("conversion.step3Title"),
                  desc: t("conversion.step3Desc", { to }),
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
                    <h3 className="font-medium text-t-primary">{item.title}</h3>
                    <p className="text-sm text-t-secondary mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-16">
            <h2 className="text-xl font-semibold text-t-primary mb-6">
              {t("conversion.benefitsTitle", { from, to })}
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  title: t("conversion.benefitPrivateTitle"),
                  desc: t("conversion.benefitPrivateDesc"),
                },
                {
                  title: t("conversion.benefitFreeTitle"),
                  desc: t("conversion.benefitFreeDesc"),
                },
                {
                  title: t("conversion.benefitBatchTitle"),
                  desc: t("conversion.benefitBatchDesc", { from, to }),
                },
                {
                  title: t("conversion.benefitFastTitle"),
                  desc: t("conversion.benefitFastDesc"),
                },
              ].map((benefit) => (
                <div key={benefit.title} className="glass rounded-2xl p-6">
                  <h3 className="font-medium text-t-primary">{benefit.title}</h3>
                  <p className="text-sm text-t-secondary mt-1">{benefit.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-16 mb-8">
            <h2 className="text-xl font-semibold text-t-primary mb-6">
              {t("faq.title")}
            </h2>
            <div className="space-y-3">
              {faqItems.map((item, index) => (
                <details
                  key={index}
                  className="glass rounded-xl overflow-hidden group"
                >
                  <summary className="w-full px-6 py-4 flex items-center justify-between text-start cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <span className="font-medium text-t-primary">{item.q}</span>
                    <svg
                      className="w-4 h-4 text-t-tertiary shrink-0 ms-4 transition-transform duration-200 group-open:rotate-180"
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
                  <div className="px-6 pb-4 text-t-secondary text-sm">{item.a}</div>
                </details>
              ))}
            </div>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
            />
          </section>

          <section className="mt-12 mb-8">
            <h2 className="text-xl font-semibold text-t-primary mb-6">
              {t("conversion.otherConversions")}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {allConversions.map((c) => (
                <Link
                  key={c.slug}
                  href={`/tools/convert-image/${c.slug}`}
                  className="glass rounded-xl p-4 hover:border-accent/50 border border-transparent transition-all group text-center"
                >
                  <span className="text-sm font-medium text-t-primary group-hover:text-accent transition-colors">
                    {c.fromLabel} → {c.toLabel}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <div className="mt-12 flex items-center justify-center gap-2 text-[12px] text-t-tertiary">
            <svg
              className="w-3.5 h-3.5 text-emerald-500 shrink-0"
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
            {t("conversion.privacyLine")}
          </div>

          <AdPlaceholder position="bottom" />
        </div>
      </main>
      <Footer />
    </>
  );
}
