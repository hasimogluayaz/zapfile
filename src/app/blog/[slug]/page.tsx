import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getAllPosts, getPostBySlug } from "@/lib/blog";
import { renderMarkdown } from "@/lib/markdown";

// ---------------------------------------------------------------------------
// Static params — pre-render every blog post at build time
// ---------------------------------------------------------------------------
export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

// ---------------------------------------------------------------------------
// Dynamic metadata for SEO
// ---------------------------------------------------------------------------
export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const post = getPostBySlug(params.slug);
  if (!post) return { title: "Post Not Found" };

  return {
    title: `${post.title} | ZapFile Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      url: `https://zapfile.xyz/blog/${post.slug}`,
      type: "article",
      publishedTime: post.date,
      authors: ["ZapFile"],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
    alternates: {
      canonical: `https://zapfile.xyz/blog/${post.slug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------
export default function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  // Render markdown to HTML
  const contentHtml = renderMarkdown(post.content);

  // Related posts: same tags, excluding the current post, max 3
  const related = getAllPosts()
    .filter(
      (p) =>
        p.slug !== post.slug && p.tags.some((t) => post.tags.includes(t)),
    )
    .slice(0, 3);

  // Schema.org BlogPosting structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: {
      "@type": "Organization",
      name: "ZapFile",
      url: "https://zapfile.xyz",
    },
    publisher: {
      "@type": "Organization",
      name: "ZapFile",
      url: "https://zapfile.xyz",
      logo: {
        "@type": "ImageObject",
        url: "https://zapfile.xyz/android-chrome-192x192.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://zapfile.xyz/blog/${post.slug}`,
    },
    keywords: post.tags.join(", "),
  };

  return (
    <>
      <Header />

      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="flex-1">
        <div className="max-w-3xl mx-auto px-5 py-12">
          {/* Breadcrumb */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-[12px] text-t-tertiary mb-8"
          >
            <Link
              href="/"
              className="hover:text-t-primary transition-colors"
            >
              Home
            </Link>
            <span>/</span>
            <Link
              href="/blog"
              className="hover:text-t-primary transition-colors"
            >
              Blog
            </Link>
            <span>/</span>
            <span className="text-t-secondary truncate max-w-[200px] sm:max-w-none">
              {post.title}
            </span>
          </nav>

          {/* Post header */}
          <header className="mb-10">
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] font-medium text-accent bg-accent-light px-2.5 py-0.5 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-t-primary mb-4 leading-tight">
              {post.title}
            </h1>

            <div className="flex items-center gap-3 text-[13px] text-t-tertiary">
              <time dateTime={post.date}>{formatDate(post.date)}</time>
              <span className="w-1 h-1 rounded-full bg-border" />
              <span>{post.readTime}</span>
            </div>
          </header>

          {/* Article content */}
          <article
            className="blog-prose"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />

          {/* Divider */}
          <hr className="border-border my-12" />

          {/* Related posts */}
          {related.length > 0 && (
            <section>
              <h2 className="text-xl font-semibold text-t-primary mb-6">
                Related Posts
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {related.map((rp) => (
                  <Link
                    key={rp.slug}
                    href={`/blog/${rp.slug}`}
                    className="glass rounded-2xl p-5 hover:shadow-[var(--shadow-card-hover)] transition-all duration-200 group"
                  >
                    <h3 className="text-[14px] font-semibold text-t-primary mb-2 group-hover:text-accent transition-colors leading-snug">
                      {rp.title}
                    </h3>
                    <p className="text-[12px] text-t-tertiary">
                      {formatDate(rp.date)} &middot; {rp.readTime}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Back to blog */}
          <div className="mt-12 text-center">
            <Link
              href="/blog"
              className="text-[13px] font-medium text-accent hover:text-accent-hover transition-colors"
            >
              &larr; Back to Blog
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
