import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAllPosts } from "@/lib/blog";

export const metadata: Metadata = {
  title: "Blog | ZapFile",
  description:
    "Tips, guides, and comparisons about image compression, PDF tools, file formats, and online privacy. Learn how to work with files faster and more privately.",
  openGraph: {
    title: "Blog | ZapFile",
    description:
      "Tips, guides, and comparisons about image compression, PDF tools, file formats, and online privacy.",
    url: "https://zapfile.xyz/blog",
    type: "website",
  },
  alternates: {
    canonical: "https://zapfile.xyz/blog",
  },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-5 py-16">
          {/* Page header */}
          <h1 className="text-3xl font-bold text-t-primary mb-3">Blog</h1>
          <p className="text-t-secondary leading-relaxed mb-10 max-w-2xl">
            Guides, comparisons, and tips about working with files online.
            Everything from image compression to PDF merging to staying private
            on the web.
          </p>

          {/* Post grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="glass rounded-2xl p-6 hover:shadow-[var(--shadow-card-hover)] transition-all duration-200 group"
              >
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[11px] font-medium text-accent bg-accent-light px-2 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Title */}
                <h2 className="text-[16px] font-semibold text-t-primary mb-2 group-hover:text-accent transition-colors">
                  {post.title}
                </h2>

                {/* Description */}
                <p className="text-t-secondary text-[13px] leading-relaxed mb-4 line-clamp-3">
                  {post.description}
                </p>

                {/* Meta */}
                <div className="flex items-center gap-3 text-[12px] text-t-tertiary">
                  <span>{formatDate(post.date)}</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span>{post.readTime}</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Back link */}
          <div className="mt-12 text-center">
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
