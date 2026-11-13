import { notFound } from "next/navigation";
import { BlogIndexPage, blogIndexMetadata } from "@/app/(site)/blog/blog-pages";
import { isToolUrlLocale } from "@/lib/localized-routes";

// Prerendered for every language (the layout's generateStaticParams).

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return isToolUrlLocale(locale) ? blogIndexMetadata(locale) : {};
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isToolUrlLocale(locale)) notFound();
  return <BlogIndexPage />;
}
