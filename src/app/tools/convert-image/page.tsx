"use client";

import ToolLayout from "@/components/ToolLayout";
import ConvertImageTool from "./ConvertImageTool";

export default function ConvertImagePage() {
  return (
    <ToolLayout
      toolName="Convert Image"
      toolDescription="Convert between PNG, JPG, and WebP formats. Batch conversion supported."
    >
      <ConvertImageTool />
    </ToolLayout>
  );
}
