export interface Tool {
  slug: string;
  name: string;
  description: string;
  emoji: string;
  category: ToolCategory;
  acceptedFormats: string[];
  metaTitle: string;
  metaDescription: string;
}

export type ToolCategory = "pdf" | "image" | "video" | "utility";

export const categoryLabels: Record<ToolCategory, string> = {
  pdf: "PDF Tools",
  image: "Image Tools",
  video: "Video & Audio",
  utility: "Utility Tools",
};

export const categoryEmojis: Record<ToolCategory, string> = {
  pdf: "\ud83d\udcc4",
  image: "\ud83d\uddbc\ufe0f",
  video: "\ud83c\udfac",
  utility: "\u2699\ufe0f",
};

export const tools: Tool[] = [
  // PDF Tools
  {
    slug: "compress-pdf",
    name: "Compress PDF",
    description: "Reduce PDF file size while maintaining quality",
    emoji: "\ud83d\uddc3\ufe0f",
    category: "pdf",
    acceptedFormats: [".pdf"],
    metaTitle: "Compress PDF - Free Online Tool | ZapFile",
    metaDescription:
      "Compress PDF files instantly in your browser. No uploads, no limits. Reduce file size while maintaining quality.",
  },
  {
    slug: "merge-pdf",
    name: "Merge PDF",
    description: "Combine multiple PDF files into one document",
    emoji: "\ud83d\udcc2",
    category: "pdf",
    acceptedFormats: [".pdf"],
    metaTitle: "Merge PDF - Free Online Tool | ZapFile",
    metaDescription:
      "Merge multiple PDF files into one document instantly. Drag and drop to reorder. 100% private, browser-based.",
  },
  {
    slug: "split-pdf",
    name: "Split PDF",
    description: "Extract specific pages from a PDF file",
    emoji: "\u2702\ufe0f",
    category: "pdf",
    acceptedFormats: [".pdf"],
    metaTitle: "Split PDF - Free Online Tool | ZapFile",
    metaDescription:
      "Split PDF files by selecting specific pages. Download as separate files or ZIP. Free and private.",
  },
  {
    slug: "pdf-to-images",
    name: "PDF to Images",
    description: "Convert PDF pages to PNG or JPG images",
    emoji: "\ud83d\uddbc\ufe0f",
    category: "pdf",
    acceptedFormats: [".pdf"],
    metaTitle: "PDF to Images - Free Online Tool | ZapFile",
    metaDescription:
      "Convert PDF pages to high-quality PNG or JPG images. Batch download as ZIP. No uploads required.",
  },
  {
    slug: "rotate-pdf",
    name: "Rotate PDF",
    description: "Rotate PDF pages individually or all at once",
    emoji: "\ud83d\udd04",
    category: "pdf",
    acceptedFormats: [".pdf"],
    metaTitle: "Rotate PDF - Free Online Tool | ZapFile",
    metaDescription:
      "Rotate PDF pages 90, 180 or 270 degrees. Rotate individual pages or all at once. Free online tool.",
  },
  {
    slug: "pdf-to-word",
    name: "PDF to Word",
    description: "Convert PDF documents to editable Word (DOCX) files",
    emoji: "\ud83d\udcdd",
    category: "pdf",
    acceptedFormats: [".pdf"],
    metaTitle: "PDF to Word Converter - Free Online Tool | ZapFile",
    metaDescription:
      "Convert PDF files to editable Word documents (DOCX). Fast, free, and 100% private.",
  },
  {
    slug: "pdf-to-excel",
    name: "PDF to Excel",
    description: "Extract tables from PDF to Excel (XLSX) spreadsheets",
    emoji: "\ud83d\udcca",
    category: "pdf",
    acceptedFormats: [".pdf"],
    metaTitle: "PDF to Excel Converter - Free Online Tool | ZapFile",
    metaDescription:
      "Extract tables and data from PDF files to Excel spreadsheets. Browser-based, no uploads.",
  },
  {
    slug: "pdf-to-pptx",
    name: "PDF to PowerPoint",
    description: "Convert PDF pages to PowerPoint (PPTX) presentations",
    emoji: "\ud83d\udcfd\ufe0f",
    category: "pdf",
    acceptedFormats: [".pdf"],
    metaTitle: "PDF to PowerPoint Converter - Free Online Tool | ZapFile",
    metaDescription:
      "Convert PDF files to PowerPoint presentations. Each page becomes a slide. Free and private.",
  },
  {
    slug: "word-to-pdf",
    name: "Word to PDF",
    description: "Convert Word (DOCX) documents to PDF format",
    emoji: "\ud83d\udcc4",
    category: "pdf",
    acceptedFormats: [".docx"],
    metaTitle: "Word to PDF Converter - Free Online Tool | ZapFile",
    metaDescription:
      "Convert Word documents to PDF format. Preserves formatting. Free, private, browser-based.",
  },
  {
    slug: "pdf-page-numbers",
    name: "PDF Page Numbers",
    description: "Add page numbers to your PDF document",
    emoji: "\ud83d\udd22",
    category: "pdf",
    acceptedFormats: [".pdf"],
    metaTitle: "Add Page Numbers to PDF - Free Online Tool | ZapFile",
    metaDescription:
      "Add page numbers to PDF documents. Choose position and format. Free, browser-based tool.",
  },
  // Image Tools
  {
    slug: "ocr",
    name: "OCR - Image to Text",
    description: "Extract text from images using AI-powered OCR",
    emoji: "\ud83d\udd0d",
    category: "image",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp"],
    metaTitle: "OCR Image to Text - Free Online Tool | ZapFile",
    metaDescription:
      "Extract text from images using OCR. Supports multiple languages. Free, private, browser-based.",
  },
  // Image Tools
  {
    slug: "compress-image",
    name: "Compress Image",
    description: "Reduce image file size with quality control",
    emoji: "\ud83d\udddc\ufe0f",
    category: "image",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp"],
    metaTitle: "Compress Image - Free Online Tool | ZapFile",
    metaDescription:
      "Compress images with adjustable quality. Batch processing supported. 100% private, no uploads.",
  },
  {
    slug: "resize-image",
    name: "Resize Image",
    description: "Change image dimensions with aspect ratio control",
    emoji: "\ud83d\udcd0",
    category: "image",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp"],
    metaTitle: "Resize Image - Free Online Tool | ZapFile",
    metaDescription:
      "Resize images to any dimension. Lock aspect ratio option. Free, private, browser-based tool.",
  },
  {
    slug: "convert-image",
    name: "Convert Image",
    description: "Convert between PNG, JPG, WEBP and AVIF formats",
    emoji: "\ud83d\udd04",
    category: "image",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp", ".avif"],
    metaTitle: "Convert Image Format - Free Online Tool | ZapFile",
    metaDescription:
      "Convert images between PNG, JPG, WEBP, and AVIF formats. Fast, free, and private.",
  },
  {
    slug: "crop-image",
    name: "Crop Image",
    description: "Crop images with preset ratios or custom selection",
    emoji: "\u2702\ufe0f",
    category: "image",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp"],
    metaTitle: "Crop Image - Free Online Tool | ZapFile",
    metaDescription:
      "Crop images with preset aspect ratios (1:1, 16:9, 4:3) or free-form selection. Free online tool.",
  },
  {
    slug: "rotate-image",
    name: "Rotate Image",
    description:
      "Rotate images 90, 180, 270 degrees or flip horizontally/vertically",
    emoji: "\ud83d\udd04",
    category: "image",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp"],
    metaTitle: "Rotate Image - Free Online Tool | ZapFile",
    metaDescription:
      "Rotate images 90, 180, 270 degrees or flip horizontally and vertically. Free, private, browser-based tool.",
  },
  {
    slug: "watermark-image",
    name: "Add Watermark",
    description: "Add text or image watermark to photos",
    emoji: "\ud83d\udcdd",
    category: "image",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp"],
    metaTitle: "Add Watermark to Image - Free Online Tool | ZapFile",
    metaDescription:
      "Add custom text watermarks to images. Control position, opacity, size and color. Free and private.",
  },
  {
    slug: "remove-background",
    name: "Remove Background",
    description: "Remove image backgrounds instantly using AI",
    emoji: "\u2728",
    category: "image",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp"],
    metaTitle: "Remove Background - Free Online AI Tool | ZapFile",
    metaDescription:
      "Remove image backgrounds instantly using AI. Works with photos, portraits, and product images. 100% private, browser-based.",
  },
  {
    slug: "image-to-pdf",
    name: "Image to PDF",
    description: "Convert JPG, PNG or WEBP images to PDF document",
    emoji: "\ud83d\udcc4",
    category: "image",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp"],
    metaTitle: "Image to PDF - Free Online Tool | ZapFile",
    metaDescription:
      "Convert JPG, PNG, or WEBP images to PDF. Combine multiple images into one PDF. Free, private, browser-based.",
  },
  // Video & Audio Tools
  {
    slug: "compress-video",
    name: "Compress Video",
    description: "Reduce video file size with quality options",
    emoji: "\ud83d\udcf9",
    category: "video",
    acceptedFormats: [".mp4", ".webm", ".mov", ".avi"],
    metaTitle: "Compress Video - Free Online Tool | ZapFile",
    metaDescription:
      "Compress video files in your browser. Choose quality level. No uploads, no limits.",
  },
  {
    slug: "extract-audio",
    name: "Extract Audio",
    description: "Extract audio track from video as MP3 or WAV",
    emoji: "\ud83c\udfa7",
    category: "video",
    acceptedFormats: [".mp4", ".webm", ".mov", ".avi"],
    metaTitle: "Extract Audio from Video - Free Online Tool | ZapFile",
    metaDescription:
      "Extract audio from video files as MP3 or WAV. Fast, free, and 100% private.",
  },
  {
    slug: "video-to-gif",
    name: "Video to GIF",
    description: "Convert video clips to animated GIF images",
    emoji: "\ud83c\udfac",
    category: "video",
    acceptedFormats: [".mp4", ".webm", ".mov"],
    metaTitle: "Video to GIF - Free Online Tool | ZapFile",
    metaDescription:
      "Convert video clips to GIF. Set start/end time and quality. Browser-based, no uploads.",
  },
  // Utility Tools
  {
    slug: "qr-generator",
    name: "QR Code Generator",
    description: "Generate QR codes with custom colors and logo",
    emoji: "\ud83d\udcf1",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "QR Code Generator - Free Online Tool | ZapFile",
    metaDescription:
      "Generate custom QR codes for URLs, text, phone numbers. Add colors and logos. Download as PNG or SVG.",
  },
  {
    slug: "svg-to-png",
    name: "SVG to PNG",
    description: "Convert SVG vector files to PNG with custom size",
    emoji: "\ud83c\udfa8",
    category: "utility",
    acceptedFormats: [".svg"],
    metaTitle: "SVG to PNG Converter - Free Online Tool | ZapFile",
    metaDescription:
      "Convert SVG files to PNG with custom dimensions. High-quality rendering. Free and private.",
  },
  // Bonus tools
  {
    slug: "base64-encode",
    name: "Base64 Encoder",
    description: "Encode files or text to Base64 and decode back",
    emoji: "\ud83d\udd10",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "Base64 Encoder/Decoder - Free Online Tool | ZapFile",
    metaDescription:
      "Encode and decode Base64 strings or files. Fast, free, browser-based tool.",
  },
  {
    slug: "color-picker",
    name: "Color Picker",
    description: "Pick colors and convert between HEX, RGB, HSL",
    emoji: "\ud83c\udfa8",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "Color Picker & Converter - Free Online Tool | ZapFile",
    metaDescription:
      "Pick colors and convert between HEX, RGB, and HSL formats. Copy to clipboard instantly.",
  },
  {
    slug: "json-formatter",
    name: "JSON Formatter",
    description: "Format, minify, and validate JSON data instantly",
    emoji: "\uD83D\uDCCB",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "JSON Formatter & Validator - Free Online Tool | ZapFile",
    metaDescription:
      "Format, beautify, minify, and validate JSON data. Free, private, browser-based tool.",
  },
  {
    slug: "hash-generator",
    name: "Hash Generator",
    description: "Generate SHA-1, SHA-256, SHA-384, SHA-512 hashes",
    emoji: "\uD83D\uDD10",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "Hash Generator (SHA-256, SHA-512) - Free Online Tool | ZapFile",
    metaDescription:
      "Generate secure hashes from text or files using SHA-1, SHA-256, SHA-384, SHA-512. Free and private.",
  },
  {
    slug: "word-counter",
    name: "Word Counter",
    description: "Count words, characters, sentences and reading time",
    emoji: "\uD83D\uDCDD",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "Word Counter & Text Analyzer - Free Online Tool | ZapFile",
    metaDescription:
      "Count words, characters, sentences, paragraphs and estimate reading time. Free online tool.",
  },
];

export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}

export function getToolsByCategory(category: ToolCategory): Tool[] {
  return tools.filter((t) => t.category === category);
}
