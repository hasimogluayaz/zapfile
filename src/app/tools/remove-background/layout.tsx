import type { Metadata } from "next";
import { getToolBySlug } from "@/lib/tools";

const tool = getToolBySlug("remove-background");

export const metadata: Metadata = {
  title: tool?.metaTitle ?? "Remove Background | ZapFile",
  description:
    tool?.metaDescription ??
    "Remove image backgrounds instantly using AI. Free, private, browser-based.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
