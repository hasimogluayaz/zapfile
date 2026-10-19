import type { Metadata } from "next";
import { SITE_URL } from "@/lib/site-url";
import WorkflowsClient from "./WorkflowsClient";

export const metadata: Metadata = {
  title: "Workflows — chain ZapFile tools in your browser",
  description:
    "Ready-made step-by-step flows: compress and merge PDFs, prepare web images, strip metadata, and more. Everything runs locally in your browser.",
  alternates: {
    canonical: `${SITE_URL}/workflows`,
  },
};

export default function WorkflowsPage() {
  return <WorkflowsClient />;
}
