"use client";

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { getToolBySlug } from "@/lib/tools";
import { toolField } from "@/lib/tool-i18n";

type FlowDef = {
  titleKey: string;
  descKey: string;
  slugs: readonly string[];
  highlight?: boolean;
};

const FLOWS: FlowDef[] = [
  {
    titleKey: "workflow.bundle0.title",
    descKey: "workflow.bundle0.desc",
    slugs: ["image-pipeline"],
    highlight: true,
  },
  {
    titleKey: "workflow.bundle1.title",
    descKey: "workflow.bundle1.desc",
    slugs: ["pdf-compress", "merge-pdf"],
  },
  {
    titleKey: "workflow.bundle2.title",
    descKey: "workflow.bundle2.desc",
    slugs: ["crop-image", "compress-image", "convert-image"],
  },
  {
    titleKey: "workflow.bundle3.title",
    descKey: "workflow.bundle3.desc",
    slugs: ["exif-viewer", "crop-image", "compress-image"],
  },
  {
    titleKey: "workflow.bundle4.title",
    descKey: "workflow.bundle4.desc",
    slugs: ["image-to-pdf", "pdf-compress"],
  },
];

export default function WorkflowsClient() {
  const { t } = useI18n();

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <div className="max-w-3xl mx-auto px-5 py-10 sm:py-14">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-accent mb-2">
            {t("workflows.eyebrow")}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-t-primary tracking-tight">
            {t("workflows.heroTitle")}
          </h1>
          <p className="mt-4 text-[15px] text-t-secondary leading-relaxed max-w-2xl">
            {t("workflows.heroSubtitle")}
          </p>

          <div className="mt-10 space-y-6">
            {FLOWS.map((flow, idx) => (
              <article
                key={idx}
                className={`rounded-2xl border p-5 sm:p-6 ${
                  flow.highlight
                    ? "border-accent/40 bg-accent/[0.07] shadow-[0_0_0_1px_rgba(99,102,241,0.12)]"
                    : "border-border bg-surface/50"
                }`}
              >
                <h2 className="text-lg font-semibold text-t-primary">{t(flow.titleKey)}</h2>
                <p className="mt-2 text-[13px] text-t-secondary leading-relaxed">{t(flow.descKey)}</p>
                <ol className="mt-4 space-y-2">
                  {flow.slugs.map((slug, si) => {
                    const tool = getToolBySlug(slug);
                    if (!tool) return null;
                    const name = toolField(t, slug, tool, "name");
                    return (
                      <li key={slug} className="flex flex-wrap items-center gap-2 text-[13px]">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-secondary border border-border text-[11px] font-mono text-t-tertiary">
                          {si + 1}
                        </span>
                        <Link
                          href={`/tools/${slug}`}
                          className="font-medium text-accent hover:text-accent-hover transition-colors"
                        >
                          {name}
                        </Link>
                        <span className="text-t-tertiary hidden sm:inline">—</span>
                        <Link
                          href={`/tools/${slug}`}
                          className="text-[12px] text-t-tertiary hover:text-t-secondary transition-colors sm:ms-0"
                        >
                          {t("workflows.openTool")} →
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </article>
            ))}
          </div>

          <p className="mt-10 text-[12px] text-t-tertiary leading-relaxed border-t border-border pt-8">
            {t("workflows.footnote")}
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
