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
  {
    slug: "blur-image",
    name: "Blur Image",
    description: "Blur or pixelate areas of an image for privacy",
    emoji: "\ud83c\udf2b\ufe0f",
    category: "image",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp"],
    metaTitle: "Blur & Pixelate Image - Free Online Tool | ZapFile",
    metaDescription:
      "Blur or pixelate areas of images to hide sensitive information. Free, private, browser-based.",
  },
  {
    slug: "favicon-generator",
    name: "Favicon Generator",
    description: "Generate all favicon sizes from a single image",
    emoji: "\u2b50",
    category: "image",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp", ".svg"],
    metaTitle: "Favicon Generator - Free Online Tool | ZapFile",
    metaDescription:
      "Generate all favicon sizes (16x16, 32x32, 180x180, 192x192, 512x512) from one image. Download as ZIP.",
  },
  {
    slug: "exif-viewer",
    name: "EXIF Viewer",
    description: "View and remove image metadata (EXIF data)",
    emoji: "\ud83d\udcf7",
    category: "image",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp"],
    metaTitle: "EXIF Viewer & Remover - Free Online Tool | ZapFile",
    metaDescription:
      "View and remove EXIF metadata from images. See camera info, GPS data, and more. Free and private.",
  },
  {
    slug: "image-collage",
    name: "Image Collage",
    description: "Create photo collages with multiple layout options",
    emoji: "\ud83d\uddbc\ufe0f",
    category: "image",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp"],
    metaTitle: "Image Collage Maker - Free Online Tool | ZapFile",
    metaDescription:
      "Create beautiful photo collages. Multiple layouts, adjustable spacing. Free, private, browser-based.",
  },
  {
    slug: "meme-generator",
    name: "Meme Generator",
    description: "Add text to images to create memes",
    emoji: "\ud83d\ude02",
    category: "image",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp"],
    metaTitle: "Meme Generator - Free Online Tool | ZapFile",
    metaDescription:
      "Create memes by adding text to images. Customize font, size, and position. Free online meme maker.",
  },
  {
    slug: "image-to-base64",
    name: "Image to Base64",
    description: "Convert images to Base64 encoded strings",
    emoji: "\ud83d\udd24",
    category: "image",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp", ".svg", ".gif"],
    metaTitle: "Image to Base64 Converter - Free Online Tool | ZapFile",
    metaDescription:
      "Convert images to Base64 strings for embedding in HTML/CSS. Free, private, browser-based.",
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
    emoji: "\ud83d\udccb",
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
    emoji: "\ud83d\udd10",
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
    emoji: "\ud83d\udcdd",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "Word Counter & Text Analyzer - Free Online Tool | ZapFile",
    metaDescription:
      "Count words, characters, sentences, paragraphs and estimate reading time. Free online tool.",
  },
  {
    slug: "password-generator",
    name: "Password Generator",
    description: "Generate strong, secure random passwords",
    emoji: "\ud83d\udd10",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "Password Generator - Free Secure Tool | ZapFile",
    metaDescription:
      "Generate strong, secure random passwords with customizable length and character types. Free and private.",
  },
  {
    slug: "diff-checker",
    name: "Diff Checker",
    description: "Compare two texts and highlight differences",
    emoji: "\ud83d\udcca",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "Diff Checker - Compare Text Online | ZapFile",
    metaDescription:
      "Compare two texts side by side and find differences. Highlight additions and deletions. Free online tool.",
  },
  {
    slug: "markdown-editor",
    name: "Markdown Editor",
    description: "Write and preview Markdown with live rendering",
    emoji: "\u270d\ufe0f",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "Markdown Editor & Preview - Free Online Tool | ZapFile",
    metaDescription:
      "Write Markdown with live preview. Export as HTML. Free, private, browser-based.",
  },
  {
    slug: "url-encoder",
    name: "URL Encoder/Decoder",
    description: "Encode or decode URL strings instantly",
    emoji: "\ud83d\udd17",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "URL Encoder/Decoder - Free Online Tool | ZapFile",
    metaDescription:
      "Encode and decode URL strings instantly. Supports full URL and component encoding. Free online tool.",
  },
  {
    slug: "timestamp-converter",
    name: "Timestamp Converter",
    description: "Convert between Unix timestamps and human dates",
    emoji: "\ud83d\udd50",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "Unix Timestamp Converter - Free Online Tool | ZapFile",
    metaDescription:
      "Convert Unix timestamps to human-readable dates and vice versa. Multiple formats supported. Free online tool.",
  },
  {
    slug: "lorem-ipsum",
    name: "Lorem Ipsum Generator",
    description: "Generate placeholder text for designs and layouts",
    emoji: "\ud83d\udcdd",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "Lorem Ipsum Generator - Free Online Tool | ZapFile",
    metaDescription:
      "Generate Lorem Ipsum placeholder text. Choose paragraphs, sentences, or words. Copy to clipboard instantly.",
  },
  {
    slug: "regex-tester",
    name: "Regex Tester",
    description: "Test and debug regular expressions with live matching",
    emoji: "\ud83d\udd0d",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "Regex Tester - Free Online Tool | ZapFile",
    metaDescription:
      "Test regular expressions with live matching and highlighting. Supports flags. Free online regex tool.",
  },
  {
    slug: "csv-json",
    name: "CSV \u2194 JSON",
    description: "Convert between CSV and JSON formats",
    emoji: "\ud83d\udcca",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "CSV to JSON Converter - Free Online Tool | ZapFile",
    metaDescription:
      "Convert CSV to JSON and JSON to CSV instantly. Free, private, browser-based tool.",
  },
  {
    slug: "xml-formatter",
    name: "XML Formatter",
    description: "Format, minify, and validate XML data",
    emoji: "\ud83d\udccb",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "XML Formatter & Validator - Free Online Tool | ZapFile",
    metaDescription:
      "Format, beautify, and validate XML data. Free, private, browser-based tool.",
  },
  {
    slug: "yaml-formatter",
    name: "YAML Formatter",
    description: "Format and validate YAML data with JSON conversion",
    emoji: "\ud83d\udccb",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "YAML Formatter & Validator - Free Online Tool | ZapFile",
    metaDescription:
      "Format, beautify, and validate YAML data. Convert YAML to JSON. Free online tool.",
  },
  {
    slug: "unit-converter",
    name: "Unit Converter",
    description: "Convert between px, rem, cm, inches and more",
    emoji: "\ud83d\udccf",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "Unit Converter (px/rem/cm/inch) - Free Online Tool | ZapFile",
    metaDescription:
      "Convert between CSS units (px, rem, em, vw), length units (cm, mm, inch) and more. Free online tool.",
  },
  {
    slug: "pomodoro-timer",
    name: "Pomodoro Timer",
    description: "Focus timer with work and break intervals",
    emoji: "\ud83c\udf45",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "Pomodoro Timer - Free Online Tool | ZapFile",
    metaDescription:
      "Stay focused with the Pomodoro technique. Customizable work and break intervals. Free online timer.",
  },
  // High-traffic new tools
  {
    slug: "qr-scanner",
    name: "QR Code Scanner",
    description: "Scan QR codes from images or your camera",
    emoji: "📷",
    category: "utility",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"],
    metaTitle: "QR Code Scanner - Free Online Tool | ZapFile",
    metaDescription:
      "Scan and decode QR codes from any image file or your camera. Free, instant, no upload required.",
  },
  {
    slug: "html-to-pdf",
    name: "HTML to PDF",
    description: "Convert pasted HTML markup into a PDF document in your browser",
    emoji: "🌐",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "HTML to PDF - Free Online Tool | ZapFile",
    metaDescription:
      "Convert HTML markup to PDF in your browser. Paste your HTML; rendering uses canvas (see on-page tips for images/fonts).",
  },
  {
    slug: "jwt-decoder",
    name: "JWT Decoder",
    description: "Decode and inspect JSON Web Tokens instantly",
    emoji: "🔑",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "JWT Decoder - Free Online Tool | ZapFile",
    metaDescription:
      "Decode JWT tokens to inspect header, payload, and signature. Instant, private, no server needed.",
  },
  {
    slug: "uuid-generator",
    name: "UUID Generator",
    description: "Generate UUIDs v4 and Nano IDs in bulk",
    emoji: "🎲",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "UUID Generator - Free Online Tool | ZapFile",
    metaDescription:
      "Generate UUID v4 and Nano ID strings in bulk. Copy single or all at once. 100% browser-based.",
  },
  {
    slug: "css-minifier",
    name: "CSS Minifier",
    description: "Minify or beautify CSS code instantly",
    emoji: "🎨",
    category: "utility",
    acceptedFormats: [".css"],
    metaTitle: "CSS Minifier & Formatter - Free Online Tool | ZapFile",
    metaDescription:
      "Minify CSS to reduce file size or beautify/format CSS code. Free, instant, browser-based.",
  },
  {
    slug: "base-converter",
    name: "Number Base Converter",
    description: "Convert numbers between decimal, hex, binary and octal",
    emoji: "🔢",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "Number Base Converter - Free Online Tool | ZapFile",
    metaDescription:
      "Convert numbers between decimal, hexadecimal, binary, and octal. Instant results, no server needed.",
  },
  {
    slug: "typing-speed-test",
    name: "Typing Speed Test",
    description: "Test your typing speed and accuracy in WPM",
    emoji: "⌨️",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "Typing Speed Test - Free Online Tool | ZapFile",
    metaDescription:
      "Test your typing speed in WPM and accuracy. Multiple difficulty levels. Free online typing test.",
  },
  {
    slug: "color-palette",
    name: "Color Palette Generator",
    description: "Extract color palettes from images or create your own",
    emoji: "🎨",
    category: "image",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
    metaTitle: "Color Palette Generator - Free Online Tool | ZapFile",
    metaDescription:
      "Extract dominant colors from any image or generate harmonious color palettes. Free, instant, browser-based.",
  },
  {
    slug: "ascii-art",
    name: "ASCII Art Generator",
    description: "Convert images to ASCII character art",
    emoji: "🖼️",
    category: "image",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
    metaTitle: "ASCII Art Generator - Free Online Tool | ZapFile",
    metaDescription:
      "Convert any image into ASCII art. Adjust resolution and character sets. Copy or download as text.",
  },
  {
    slug: "audio-waveform",
    name: "Audio Waveform",
    description: "Visualize audio files as waveform images",
    emoji: "🎵",
    category: "video",
    acceptedFormats: [".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a"],
    metaTitle: "Audio Waveform Visualizer - Free Online Tool | ZapFile",
    metaDescription:
      "Generate waveform visualizations from audio files. Download as PNG. Free, browser-based, no upload.",
  },
  {
    slug: "image-pipeline",
    name: "Image Pipeline",
    description: "Compress, resize, and download in one guided flow",
    emoji: "⚡",
    category: "image",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp"],
    metaTitle: "Image Pipeline — Compress & Resize in One Flow | ZapFile",
    metaDescription:
      "Upload once: adjust compression, set dimensions, export. All steps in your browser with no uploads.",
  },
  {
    slug: "color-contrast",
    name: "Color Contrast Checker",
    description: "Check WCAG contrast ratios for text and UI colors",
    emoji: "♿",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "WCAG Color Contrast Checker — Free Online | ZapFile",
    metaDescription:
      "Test foreground and background colors for WCAG AA and AAA compliance. Instant results in your browser.",
  },
  {
    slug: "csv-viewer",
    name: "CSV Table Viewer",
    description: "Paste CSV and browse it as a sortable table",
    emoji: "📋",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "CSV Table Viewer — Free Online | ZapFile",
    metaDescription:
      "Paste CSV text and preview rows in a table. Search, sort columns, and copy cells. Private, in-browser.",
  },
];

export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}

export function getToolsByCategory(category: ToolCategory): Tool[] {
  return tools.filter((t) => t.category === category);
}
