"use client";

import Link from "next/link";
import Image from "next/image";
import { tools } from "@/lib/tools";
import { useI18n } from "@/lib/i18n";

export default function Footer() {
  const { t } = useI18n();

  const footerLinks = [
    {
      title: t("footer.product"),
      links: [
        { label: t("footer.allTools"), href: "/tools" },
        { label: t("footer.pdfTools"), href: "/tools#pdf" },
        { label: t("footer.imageTools"), href: "/tools#image" },
        { label: t("footer.videoAudio"), href: "/tools#video" },
      ],
    },
    {
      title: t("footer.legal"),
      links: [
        { label: t("footer.privacy"), href: "/privacy" },
        { label: t("footer.terms"), href: "/terms" },
      ],
    },
  ];

  return (
    <footer className="border-t border-border mt-auto bg-bg-secondary">
      <div className="max-w-6xl mx-auto px-5 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <Image
                src="/android-chrome-192x192.png"
                alt="ZapFile"
                width={28}
                height={28}
                className="rounded-sm"
              />
              <span className="text-[15px] font-bold text-t-primary">
                ZapFile
              </span>
            </div>
            <p className="text-[12px] text-t-tertiary leading-relaxed max-w-[220px]">
              {t("footer.brand")}
            </p>
          </div>

          {/* Link sections */}
          {footerLinks.map((section) => (
            <div key={section.title}>
              <p className="text-[12px] font-semibold text-t-primary uppercase tracking-wider mb-3">
                {section.title}
              </p>
              <div className="space-y-2">
                {section.links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="block text-[13px] text-t-tertiary hover:text-accent transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {/* Popular Tools */}
          <div>
            <p className="text-[12px] font-semibold text-t-primary uppercase tracking-wider mb-3">
              {t("footer.popular")}
            </p>
            <div className="space-y-2">
              {tools.slice(0, 5).map((tool) => (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="block text-[13px] text-t-tertiary hover:text-accent transition-colors"
                >
                  {tool.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[12px] text-t-tertiary">
            &copy; {new Date().getFullYear()} ZapFile. {t("footer.copyright")}
          </p>
          <div className="flex items-center gap-4 text-[12px] text-t-tertiary">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {t("footer.freeTools", { count: tools.length })}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              {t("footer.noSignup")}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
