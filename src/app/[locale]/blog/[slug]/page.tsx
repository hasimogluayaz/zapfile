import { notFound } from "next/navigation";
import { BlogPostPage, blogPostMetadata } from "@/app/(site)/blog/blog-pages";
import { getAllPosts } from "@/lib/blog";
import { isToolUrlLocale } from "@/lib/localized-routes";

/** Every post in every language (the layout supplies the languages). */
export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

type Params = { locale: string; slug: string };

export function generateMetadata({ params }: { params: Params }) {
  return isToolUrlLocale(params.locale) ? blogPostMetadata(params.slug, params.locale) : {};
}

export default function Page({ params }: { params: Params }) {
  if (!isToolUrlLocale(params.locale)) notFound();
  return <BlogPostPage slug={params.slug} locale={params.locale} />;
}
