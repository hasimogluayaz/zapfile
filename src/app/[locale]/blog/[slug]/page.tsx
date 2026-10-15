import { notFound } from "next/navigation";
import { BlogPostPage, blogPostMetadata } from "@/app/blog/blog-pages";
import { isToolUrlLocale } from "@/lib/localized-routes";

// Rendered per request like every page; see the note in ../../[toolSlug]/page.tsx.
export const dynamic = "force-dynamic";

type Params = { locale: string; slug: string };

export function generateMetadata({ params }: { params: Params }) {
  return isToolUrlLocale(params.locale) ? blogPostMetadata(params.slug, params.locale) : {};
}

export default function Page({ params }: { params: Params }) {
  if (!isToolUrlLocale(params.locale)) notFound();
  return <BlogPostPage slug={params.slug} locale={params.locale} />;
}
