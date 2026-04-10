import type { Metadata } from "next";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAllPosts } from "@/lib/blog";
import { SITE_URL } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "Blog | ZapFile",
  description:
    "Tips, guides, and comparisons about image compression, PDF tools, file formats, and online privacy. Learn how to work with files faster and more privately.",
  openGraph: {
    title: "Blog | ZapFile",
    description:
      "Tips, guides, and comparisons about image compression, PDF tools, file formats, and online privacy.",
    url: `${SITE_URL}/blog`,
    type: "website",
  },
  alternates: {
    canonical: `${SITE_URL}/blog`,
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
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <div className="max-w-4xl mx-auto px-5 py-16">
          {/* Page header */}
          <h1 className="text-3xl font-bold text-t-primary mb-3">Blog</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-10 max-w-2xl">
            <p className="text-t-secondary leading-relaxed">
              Guides, comparisons, and tips about working with files online.
              Everything from image compression to PDF merging to staying private
              on the web.
            </p>
            <a
              href="/feed.xml"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path d="M6.503 20.752c0 1.794-1.456 3.248-3.251 3.248-1.796 0-3.252-1.454-3.252-3.248 0-1.794 1.456-3.248 3.252-3.248 1.794 0 3.251 1.454 3.251 3.248zm-3.251-12.438c6.351 0 11.511 5.158 11.511 11.509h-3.251c0-4.55-3.69-8.258-8.26-8.258v-3.251zm0-5.772c9.537 0 17.283 7.745 17.283 17.281h-3.251c0-7.74-6.29-14.03-14.032-14.03v-3.251z" />
              </svg>
              RSS feed
            </a>
          </div>

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
