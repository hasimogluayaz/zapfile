"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";

export default function PrivacyClient() {
  const { t } = useI18n();

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl font-bold text-t-primary mb-8">{t("privacy.title")}</h1>

          <div className="prose max-w-none space-y-6 text-t-secondary">
            <p>{t("privacy.updated")}</p>

            <h2 className="text-xl font-semibold text-t-primary mt-8">
              {t("privacy.mattersTitle")}
            </h2>
            <p>{t("privacy.mattersBody")}</p>

            <h2 className="text-xl font-semibold text-t-primary mt-8">
              {t("privacy.noCollectTitle")}
            </h2>
            <ul className="list-disc ps-6 space-y-2">
              <li>{t("privacy.noCollect1")}</li>
              <li>{t("privacy.noCollect2")}</li>
              <li>{t("privacy.noCollect3")}</li>
            </ul>

            <h2 className="text-xl font-semibold text-t-primary mt-8">
              {t("privacy.mayCollectTitle")}
            </h2>
            <ul className="list-disc ps-6 space-y-2">
              <li>{t("privacy.mayCollect1")}</li>
              <li>{t("privacy.mayCollect2")}</li>
            </ul>

            <h2 className="text-xl font-semibold text-t-primary mt-8">
              {t("privacy.thirdPartyTitle")}
            </h2>
            <p>{t("privacy.thirdPartyBody")}</p>

            <h2 className="text-xl font-semibold text-t-primary mt-8">
              {t("privacy.contactTitle")}
            </h2>
            <p>{t("privacy.contactBody")}</p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
