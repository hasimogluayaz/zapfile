import { BlogIndexPage, blogIndexMetadata } from "./blog-pages";

export const metadata = blogIndexMetadata("en");

export default function BlogPage() {
  return <BlogIndexPage />;
}
