import { getAllPosts } from "@/lib/blog";
import { BlogPostPage, blogPostMetadata } from "../blog-pages";

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  return blogPostMetadata(params.slug, "en");
}

export default function Page({ params }: { params: { slug: string } }) {
  return <BlogPostPage slug={params.slug} locale="en" />;
}
