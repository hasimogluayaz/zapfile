"use client";

import Link from "next/link";
import Header from "./Header";
import Footer from "./Footer";
import AdPlaceholder from "./AdPlaceholder";
import { useI18n } from "@/lib/i18n";
import { usePathname } from "next/navigation";

interface ToolLayoutProps {
  children: React.ReactNode;
  toolName: string;
  toolDescription: string;
}

export default function ToolLayout({
  children,
  toolName,
  toolDescription,
}: ToolLayoutProps) {
  const { t } = useI18n();
  const pathname = usePathname();
  const slug = pathname?.split("/").pop() || "";

  const finalName =
    slug && t(`tool.${slug}.name`) !== `tool.${slug}.name`
      ? t(`tool.${slug}.name`)
      : toolName;
  const finalDesc =
    slug && t(`tool.${slug}.desc`) !== `tool.${slug}.desc`
      ? t(`tool.${slug}.desc`)
      : toolDescription;

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-2xl mx-auto px-5 py-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-[12px] text-t-tertiary mb-6">
            <Link href="/" className="hover:text-accent transition-colors">
              {t("tool.home")}
            </Link>
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
            <Link href="/tools" className="hover:text-accent transition-colors">
              {t("tool.tools")}
            </Link>
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
            <span className="text-t-secondary font-medium">{finalName}</span>
          </nav>

          <AdPlaceholder position="top" />

          {/* Tool header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-t-primary">{finalName}</h1>
            <p className="text-[14px] text-t-secondary mt-2 leading-relaxed">
              {finalDesc}
            </p>
          </div>

          {/* Tool content */}
          <div className="animate-fade-up">{children}</div>

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
            {t("tool.privacy")}
          </div>

          <AdPlaceholder position="bottom" />
        </div>
      </main>
      <Footer />
    </>
  );
}
