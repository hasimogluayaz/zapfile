"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";

export default function TermsClient() {
  const { t } = useI18n();

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-t-primary mb-8">{t("terms.title")}</h1>

          <div className="prose max-w-none space-y-6 text-t-secondary">
            <p>{t("terms.updated")}</p>

            <h2 className="text-xl font-semibold text-t-primary mt-8">
              {t("terms.acceptanceTitle")}
            </h2>
            <p>{t("terms.acceptanceBody")}</p>

            <h2 className="text-xl font-semibold text-t-primary mt-8">
              {t("terms.serviceTitle")}
            </h2>
            <p>{t("terms.serviceBody")}</p>

            <h2 className="text-xl font-semibold text-t-primary mt-8">
              {t("terms.disclaimerTitle")}
            </h2>
            <p>{t("terms.disclaimerBody")}</p>

            <h2 className="text-xl font-semibold text-t-primary mt-8">
              {t("terms.liabilityTitle")}
            </h2>
            <p>{t("terms.liabilityBody")}</p>

            <h2 className="text-xl font-semibold text-t-primary mt-8">
              {t("terms.changesTitle")}
            </h2>
            <p>{t("terms.changesBody")}</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
