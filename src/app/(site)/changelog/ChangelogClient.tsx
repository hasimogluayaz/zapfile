"use client";

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useI18n } from "@/lib/i18n";
import { changelogCopy, releases } from "./releases";

const typeColor: Record<string, string> = {
  new: "bg-green-500/10 text-green-700 dark:text-green-400",
  improved: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  fixed: "bg-orange-500/10 text-orange-800 dark:text-orange-400",
};

export default function ChangelogClient() {
  const { locale } = useI18n();
  const c = (key: keyof typeof changelogCopy) => changelogCopy[key][locale];

  return (
    <>
      <Header />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <div className="max-w-2xl mx-auto px-5 py-16">
          <div className="mb-12">
            <h1 className="text-3xl font-bold text-t-primary mb-3">{c("title")}</h1>
            <p className="text-t-secondary">{c("subtitle")}</p>
          </div>

          <div className="relative">
            <div className="absolute start-[7px] top-2 bottom-2 w-px bg-border" />

            <div className="space-y-12">
              {releases.map((release) => (
                <div key={release.version} className="relative ps-8">
                  <div className="absolute start-0 top-1.5 w-3.5 h-3.5 rounded-full bg-accent border-2 border-bg" />

                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-lg font-bold text-t-primary">{release.version}</h2>
                    {release.latest && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent text-on-accent">
                        {c("latest")}
                      </span>
                    )}
                    <span className="text-sm text-t-tertiary ms-auto">{release.date[locale]}</span>
                  </div>

                  <ul className="space-y-2.5">
                    {release.items.map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className={`mt-0.5 shrink-0 text-[11px] font-semibold px-1.5 py-0.5 rounded ${typeColor[item.type]}`}>
                          {c(item.type)}
                        </span>
                        <span className="text-sm text-t-secondary leading-relaxed">{item.text[locale]}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-16 pt-8 border-t border-border text-center">
            <p className="text-sm text-t-tertiary">
              {c("footer")}{" "}
              <a
                href="https://github.com/hasimogluayaz/zapfile"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                {c("github")}
              </a>
              .
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
