"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useI18n();

  return (
    <>
      <Header />
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center px-5 py-20">
          <p className="text-7xl font-extrabold gradient-text mb-4">404</p>
          <h1 className="text-2xl font-bold text-t-primary mb-2">
            {t("404.title")}
          </h1>
          <p className="text-t-secondary text-[14px] mb-8 max-w-sm mx-auto">
            {t("404.subtitle")}
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-semibold bg-accent text-white hover:bg-accent-hover transition-all hover:shadow-lg hover:shadow-accent/20"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            {t("404.cta")}
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
