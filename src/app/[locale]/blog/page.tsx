import { notFound } from "next/navigation";
import { BlogIndexPage, blogIndexMetadata } from "@/app/(site)/blog/blog-pages";
import { isToolUrlLocale } from "@/lib/localized-routes";

// Prerendered for every language (the layout's generateStaticParams).

export function generateMetadata({ params }: { params: { locale: string } }) {
  return isToolUrlLocale(params.locale) ? blogIndexMetadata(params.locale) : {};
}

export default function Page({ params }: { params: { locale: string } }) {
  if (!isToolUrlLocale(params.locale)) notFound();
  return <BlogIndexPage />;
}
