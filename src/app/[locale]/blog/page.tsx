import { notFound } from "next/navigation";
import { BlogIndexPage, blogIndexMetadata } from "@/app/blog/blog-pages";
import { isToolUrlLocale } from "@/lib/localized-routes";

// Rendered per request like every page; see the note in ../[toolSlug]/page.tsx.
export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { locale: string } }) {
  return isToolUrlLocale(params.locale) ? blogIndexMetadata(params.locale) : {};
}

export default function Page({ params }: { params: { locale: string } }) {
  if (!isToolUrlLocale(params.locale)) notFound();
  return <BlogIndexPage />;
}
