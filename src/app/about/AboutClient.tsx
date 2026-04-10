"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";

export default function AboutClient() {
  const { t } = useI18n();

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <div className="max-w-3xl mx-auto px-5 py-16">
          <h1 className="text-3xl font-bold text-t-primary mb-4">{t("about.title")}</h1>
          <p className="text-t-secondary leading-relaxed mb-4">{t("about.intro")}</p>

          <h2 className="text-xl font-semibold text-t-primary mt-12 mb-4">
            {t("about.missionTitle")}
          </h2>
          <p className="text-t-secondary leading-relaxed mb-4">{t("about.missionBody")}</p>

          <h2 className="text-xl font-semibold text-t-primary mt-12 mb-4">
            {t("about.howTitle")}
          </h2>
          <p className="text-t-secondary leading-relaxed mb-4">{t("about.howBody")}</p>

          <h2 className="text-xl font-semibold text-t-primary mt-12 mb-4">
            {t("about.privacyTitle")}
          </h2>
          <p className="text-t-secondary leading-relaxed mb-4">{t("about.privacyBody")}</p>

          <h2 className="text-xl font-semibold text-t-primary mt-12 mb-4">
            {t("about.builtTitle")}
          </h2>
          <p className="text-t-secondary leading-relaxed mb-4">{t("about.builtBody")}</p>

          <h2 className="text-xl font-semibold text-t-primary mt-12 mb-4">
            {t("about.opensourceTitle")}
          </h2>
          <p className="text-t-secondary leading-relaxed mb-4">{t("about.opensourceBody")}</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
