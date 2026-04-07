import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const toolsRoot = path.join(__dirname, "../src/app/tools");

const LAYOUT = (slug) => `import type { Metadata } from "next";
import { buildToolMetadata } from "@/lib/build-tool-metadata";

export const metadata: Metadata = buildToolMetadata("${slug}");

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
`;

const slugs = [
  "merge-pdf",
  "split-pdf",
  "pdf-to-images",
  "rotate-pdf",
  "pdf-page-numbers",
  "compress-image",
  "resize-image",
  "convert-image",
  "crop-image",
  "rotate-image",
  "watermark-image",
  "image-to-pdf",
  "blur-image",
  "remove-background",
  "favicon-generator",
  "exif-viewer",
  "image-collage",
  "meme-generator",
  "image-to-base64",
  "gif-maker",
  "compress-video",
  "extract-audio",
  "video-to-gif",
  "trim-video",
  "trim-audio",
  "audio-converter",
  "qr-generator",
  "svg-to-png",
  "base64-encode",
  "color-picker",
  "json-formatter",
  "hash-generator",
  "word-counter",
  "password-generator",
  "diff-checker",
  "markdown-editor",
  "url-encoder",
  "timestamp-converter",
  "lorem-ipsum",
  "regex-tester",
  "csv-json",
  "xml-formatter",
  "yaml-formatter",
  "unit-converter",
  "pomodoro-timer",
  "qr-scanner",
  "html-to-pdf",
  "jwt-decoder",
  "uuid-generator",
  "css-minifier",
  "base-converter",
  "typing-speed-test",
  "color-palette",
  "ascii-art",
  "audio-waveform",
  "image-pipeline",
  "color-contrast",
  "api-fetch",
  "csv-viewer",
];

for (const slug of slugs) {
  const dir = path.join(toolsRoot, slug);
  const pagePath = path.join(dir, "page.tsx");
  if (!fs.existsSync(pagePath)) {
    console.warn("skip (no page):", slug);
    continue;
  }
  fs.writeFileSync(path.join(dir, "layout.tsx"), LAYOUT(slug), "utf8");
  console.log("wrote layout:", slug);
}
