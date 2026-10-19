"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Illustration from "@/components/Illustration";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { t, homeHref } = useI18n();
  return (
    <>
      <Header />
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-5 py-16">
        <Illustration name="not-found" size={200} className="mb-4" />
        <p className="mb-2 text-[13px] font-semibold tabular-nums text-t-tertiary">404</p>
        <h1 className="text-[28px] font-semibold tracking-[-0.03em] text-t-primary mb-2">
          {t("404.title")}
        </h1>
        <p className="text-t-secondary text-[15px] mb-8 text-center max-w-md">
          {t("404.subtitle")}
        </p>
        <div className="flex items-center gap-3">
          <Link
            href={homeHref()}
            className="px-5 py-2.5 rounded-lg text-[13px] font-medium text-on-accent bg-accent hover:opacity-90 transition-opacity"
          >
            {t("404.cta")}
          </Link>
          <Link
            href="/tools"
            className="px-5 py-2.5 rounded-lg text-[13px] font-medium text-t-secondary bg-bg-secondary border border-border hover:text-t-primary hover:bg-bg-tertiary transition-colors"
          >
            {t("nav.allTools")}
          </Link>
        </div>
      </div>
      <Footer />
    </>
  );
}
