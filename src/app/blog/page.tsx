import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Articles about file processing, tips and tricks, and privacy-first tools.",
};

const placeholderArticles = [
  {
    title: "How to Compress PDF Files Without Losing Quality",
    excerpt:
      "Learn the best techniques for reducing PDF file size while maintaining readable text and sharp images.",
  },
  {
    title: "Image Formats Explained: PNG vs JPG vs WEBP",
    excerpt:
      "A practical guide to choosing the right image format for your use case, from web publishing to print.",
  },
  {
    title: "Privacy-First File Processing: Why Browser-Based Tools Matter",
    excerpt:
      "Discover why processing files locally in your browser is safer and faster than uploading to cloud services.",
  },
];

export default function BlogPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-5 py-16">
          <h1 className="text-3xl font-bold text-t-primary mb-4">Blog</h1>
          <p className="text-t-secondary leading-relaxed mb-10">
            We&apos;re working on helpful articles about file processing, tips
            and tricks.
          </p>

          <div className="grid grid-cols-1 gap-6">
            {placeholderArticles.map((article) => (
              <div
                key={article.title}
                className="glass rounded-xl p-6 relative overflow-hidden"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-[15px] font-semibold text-t-primary mb-2">
                      {article.title}
                    </h2>
                    <p className="text-t-secondary text-[13px] leading-relaxed">
                      {article.excerpt}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-medium text-accent bg-accent-light px-2.5 py-1 rounded-full">
                    Coming Soon
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link
              href="/"
              className="text-[13px] font-medium text-accent hover:text-accent-hover transition-colors"
            >
              &larr; Back to Home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
