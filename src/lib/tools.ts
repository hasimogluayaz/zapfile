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
    slug: "organize-pdf",
    name: "Organize PDF",
    description: "Reorder, delete, rotate, duplicate and extract PDF pages, or combine several PDFs",
    emoji: "🗂️",
    category: "pdf",
    acceptedFormats: [".pdf"],
    metaTitle: "Organize PDF Pages - Reorder, Delete, Extract | ZapFile",
    metaDescription:
      "Drag PDF pages into a new order, delete or rotate pages, insert blank pages, duplicate, extract a selection or combine pages from several PDFs. Free, private, in your browser.",
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
    slug: "sign-pdf",
    name: "Sign PDF",
    description: "Draw, type or upload your signature and place it on a PDF, with text, dates and checkmarks",
    emoji: "✍️",
    category: "pdf",
    acceptedFormats: [".pdf"],
    metaTitle: "Sign PDF Online - Free, No Account, Private | ZapFile",
    metaDescription:
      "Sign PDF documents in your browser: draw, type or upload a signature, drag it into place, add your name, the date or checkmarks, and download. No upload, no sign-up.",
  },
  {
    slug: "watermark-pdf",
    name: "Watermark PDF",
    description: "Stamp text or a logo on PDF pages: position, tiling, rotation and opacity",
    emoji: "💧",
    category: "pdf",
    acceptedFormats: [".pdf"],
    metaTitle: "Add Watermark to PDF - Text or Logo, Free | ZapFile",
    metaDescription:
      "Add a text or image watermark to PDF pages in your browser: CONFIDENTIAL stamps, logos, tiled patterns, any angle and opacity, chosen pages. Real text, no upload.",
  },
  {
    slug: "crop-pdf",
    name: "Crop PDF",
    description: "Crop PDF pages to an area, or trim white margins from every page automatically",
    emoji: "✂️",
    category: "pdf",
    acceptedFormats: [".pdf"],
    metaTitle: "Crop PDF - Trim Margins Online, Free | ZapFile",
    metaDescription:
      "Crop PDF pages in your browser: drag a crop box, apply it to all or some pages, or trim the white margins of every page automatically. No upload, no watermark.",
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
    description: "Arrange photos in grids, feature layouts or a mosaic; reframe, swap and export in high resolution",
    emoji: "\ud83d\uddbc\ufe0f",
    category: "image",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp", ".avif"],
    metaTitle: "Photo Collage Maker: Grid, Mosaic & Instagram Sizes - Free | ZapFile",
    metaDescription:
      "Make photo collages in your browser: grid, feature and mosaic layouts, 1:1, 4:5 and 9:16 sizes, drag to swap and reframe, rounded corners, up to 4096 px. Nothing is uploaded.",
  },
  {
    slug: "meme-generator",
    name: "Meme Generator",
    description: "Add meme text, caption bars and labels to any image; preview matches the download exactly",
    emoji: "\ud83d\ude02",
    category: "image",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"],
    metaTitle: "Meme Generator: Classic Meme Font, Caption Bars & Labels - Free | ZapFile",
    metaDescription:
      "Make memes in your browser: classic outlined meme text with auto wrapping, modern caption bars, labels and shadows. Drag, resize, rotate, undo, and download at full resolution. No watermark, no upload.",
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
    description: "Pick colors from a picker, the screen or an image; convert HEX, RGB, HSL, OKLCH and build scales",
    emoji: "\ud83c\udfa8",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "Color Picker: HEX, RGB, HSL, OKLCH & Image Picker - Free | ZapFile",
    metaDescription:
      "Pick colors with a precise picker, from your screen or from an image. Convert HEX, RGB, HSL, HWB, OKLCH and CMYK, check WCAG contrast, build 50–950 tint scales and harmonies.",
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
    description: "MD5, SHA-256, SHA-512, SHA3, BLAKE3 and CRC32 hashes for text and files, with HMAC and checksum verification",
    emoji: "\ud83d\udd10",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "Hash Generator (SHA-256, SHA-512) - Free Online Tool | ZapFile",
    metaDescription:
      "Generate secure hashes from text or files using SHA-1, SHA-256, SHA-384, SHA-512. Free and private.",
  },
  {
    slug: "word-counter",
    name: "Word & Character Counter",
    description: "Count words and characters, check X/Instagram limits",
    emoji: "\ud83d\udcdd",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "Word & Character Counter - X, Instagram Limits | ZapFile",
    metaDescription:
      "Count words, characters, sentences and paragraphs. Live X (Twitter), Instagram, LinkedIn and SMS limits plus reading time. Free and private.",
  },
  {
    slug: "password-generator",
    name: "Password Generator",
    description: "Generate strong passwords and test your own",
    emoji: "\ud83d\udd10",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "Password Generator & Strength Checker - Free | ZapFile",
    metaDescription:
      "Generate strong random passwords and test the strength of your own password. Everything runs locally in your browser.",
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
    description: "Convert Unix timestamps (s, ms, µs, ns) and dates across time zones",
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
    name: "CSV ↔ JSON",
    description: "Convert CSV and JSON, preview CSV as a sortable table",
    emoji: "\ud83d\udcca",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "CSV to JSON Converter & CSV Viewer - Free Online | ZapFile",
    metaDescription:
      "Convert CSV to JSON and back, and preview CSV as a sortable, searchable table. Free, private, runs in your browser.",
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
    description: "Convert length, weight, temperature, volume, area, speed, data, CSS units and more",
    emoji: "\ud83d\udccf",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "Unit Converter (px/rem/cm/inch) - Free Online Tool | ZapFile",
    metaDescription:
      "Convert between CSS units (px, rem, em, vw), length units (cm, mm, inch) and more. Free online tool.",
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
    description: "Generate UUID v4/v7, ULID and Nano IDs in bulk, and inspect any UUID",
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
    description: "Convert between binary, octal, decimal, hex and any base up to 36, with two's complement",
    emoji: "🔢",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "Number Base Converter - Free Online Tool | ZapFile",
    metaDescription:
      "Convert numbers between decimal, hexadecimal, binary, and octal. Instant results, no server needed.",
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
  // ── New Utility Tools ──
  {
    slug: "text-case",
    name: "Text Case Converter",
    description: "Convert text to UPPER, lower, Title or camelCase",
    emoji: "🔠",
    category: "utility",
    acceptedFormats: [],
    metaTitle: "Text Case Converter - UPPER, lower, Title, camelCase | ZapFile",
    metaDescription:
      "Convert text to UPPERCASE, lowercase, Title Case, camelCase, snake_case and more. Instant and free.",
  },
  // ── New Image Tools ──
  {
    slug: "background-remover",
    name: "Background Remover",
    description: "Remove image backgrounds with on-device AI and fine-tune edges with a brush",
    emoji: "✂️",
    category: "image",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp"],
    metaTitle: "Background Remover - Remove Image Background Free | ZapFile",
    metaDescription:
      "Remove image backgrounds with AI that runs entirely in your browser. Clean hair edges, erase/restore brush, new backgrounds, full-resolution PNG. No uploads, free.",
  },
  {
    slug: "color-dropper",
    name: "Color Dropper",
    description: "Pick colors from any image and get the HEX code",
    emoji: "💧",
    category: "image",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp", ".gif"],
    metaTitle: "Color Dropper - Pick Colors from Any Image | ZapFile",
    metaDescription:
      "Pick any pixel color from an image and copy it as HEX, RGB or HSL. Free, private, browser-based eyedropper.",
  },
  {
    slug: "photo-filter",
    name: "Photo Filter",
    description: "Apply vintage, grayscale and other CSS filters to photos",
    emoji: "🌈",
    category: "image",
    acceptedFormats: [".jpg", ".jpeg", ".png", ".webp"],
    metaTitle: "Photo Filter - Vintage, Grayscale & Sepia Effects | ZapFile",
    metaDescription:
      "Apply vintage, black & white, sepia and other filters to your photos. Free and private, right in your browser.",
  },
  // ── New PDF Tools ──
  {
    slug: "pdf-encrypt",
    name: "Protect PDF",
    description: "Add or remove a PDF password with AES-256 encryption",
    emoji: "🔒",
    category: "pdf",
    acceptedFormats: [".pdf"],
    metaTitle: "Protect PDF with Password & Unlock PDF - Free AES-256 | ZapFile",
    metaDescription:
      "Password-protect a PDF with AES-256, restrict printing and copying, or remove a password you know. Runs in your browser; your file is never uploaded.",
  },
  {
    slug: "pdf-to-word",
    name: "PDF to Word",
    description: "Convert PDF to an editable Word document (DOCX)",
    emoji: "📄",
    category: "pdf",
    acceptedFormats: [".pdf"],
    metaTitle: "PDF to Word Converter - Free, Editable DOCX | ZapFile",
    metaDescription:
      "Convert PDF to editable Word (DOCX) with headings, lists, tables, images and page layout kept. Free, private, runs in your browser.",
  },
  {
    slug: "pdf-to-excel",
    name: "PDF to Excel",
    description: "Extract PDF tables into an Excel spreadsheet (XLSX)",
    emoji: "📊",
    category: "pdf",
    acceptedFormats: [".pdf"],
    metaTitle: "PDF to Excel Converter - Tables to XLSX | ZapFile",
    metaDescription:
      "Convert PDF tables to Excel (XLSX) with real numbers, merged cells and one sheet per page or table. Free, private, no uploads.",
  },
  {
    slug: "pdf-to-markdown",
    name: "PDF to Markdown",
    description: "Turn a PDF into clean Markdown with headings, lists, tables and images",
    emoji: "📝",
    category: "pdf",
    acceptedFormats: [".pdf"],
    metaTitle: "PDF to Markdown Converter - Free, Tables & Headings | ZapFile",
    metaDescription:
      "Convert PDF to Markdown in your browser: headings, bold and italic, lists, GitHub tables and images kept. Ready for docs, wikis, notes and LLM prompts. No upload.",
  },
  {
    slug: "pdf-to-powerpoint",
    name: "PDF to PowerPoint",
    description: "Turn PDF pages into editable PowerPoint slides (PPTX)",
    emoji: "📽️",
    category: "pdf",
    acceptedFormats: [".pdf"],
    metaTitle: "PDF to PowerPoint Converter - Free, Editable PPTX | ZapFile",
    metaDescription:
      "Convert PDF to PowerPoint in your browser: every page becomes a slide with editable text boxes, pictures, shapes and charts in place. Free, private, no upload, no watermark.",
  },
  {
    slug: "word-to-pdf",
    name: "Word to PDF",
    description: "Convert Word documents (DOCX, DOC, ODT, RTF) to PDF with the layout intact",
    emoji: "📄",
    category: "pdf",
    acceptedFormats: [".docx", ".doc", ".odt", ".rtf", ".txt"],
    metaTitle: "Word to PDF Converter - Free, Exact Layout | ZapFile",
    metaDescription:
      "Convert DOCX, DOC, ODT and RTF to PDF in your browser with LibreOffice: fonts, tables, images, headers and page breaks kept. Batch convert, PDF/A, no upload, no watermark.",
  },
  {
    slug: "excel-to-pdf",
    name: "Excel to PDF",
    description: "Convert spreadsheets (XLSX, XLS, ODS, CSV) to PDF, every sheet and formula result",
    emoji: "📊",
    category: "pdf",
    acceptedFormats: [".xlsx", ".xls", ".ods", ".csv"],
    metaTitle: "Excel to PDF Converter - Free, All Sheets | ZapFile",
    metaDescription:
      "Convert XLSX, XLS, ODS and CSV spreadsheets to PDF in your browser: every sheet, calculated formulas, number formats, colors and print areas. Batch convert, no upload.",
  },
  {
    slug: "powerpoint-to-pdf",
    name: "PowerPoint to PDF",
    description: "Convert presentations (PPTX, PPT, ODP) to PDF, one page per slide",
    emoji: "📽️",
    category: "pdf",
    acceptedFormats: [".pptx", ".ppt", ".odp"],
    metaTitle: "PowerPoint to PDF Converter - Free, Slides Kept | ZapFile",
    metaDescription:
      "Convert PPTX, PPT and ODP presentations to PDF in your browser: one page per slide with shapes, images, text and themes kept. Batch convert, no upload, no watermark.",
  },
  {
    slug: "pdf-text-extractor",
    name: "PDF Text Extractor",
    description: "Extract and copy all text content from PDF files",
    emoji: "📝",
    category: "pdf",
    acceptedFormats: [".pdf"],
    metaTitle: "PDF Text Extractor - Copy Text from PDF | ZapFile",
    metaDescription:
      "Extract and copy all text from PDF files with columns and reading order kept. Free, browser-based, no uploads.",
  },
  {
    slug: "pdf-compress",
    name: "PDF Compressor",
    description: "Reduce PDF file size by compressing embedded images",
    emoji: "🗜️",
    category: "pdf",
    acceptedFormats: [".pdf"],
    metaTitle: "Compress PDF - Reduce PDF File Size | ZapFile",
    metaDescription:
      "Reduce PDF file size by recompressing embedded images. Free, private and fully browser-based.",
  },
  // ── New Video & Audio Tools ──
  {
    slug: "video-to-gif",
    name: "Video to GIF",
    description: "Convert short video clips to animated GIFs",
    emoji: "🎞️",
    category: "video",
    acceptedFormats: [".mp4", ".webm", ".mov"],
    metaTitle: "Video to GIF Converter - Free Online | ZapFile",
    metaDescription:
      "Convert short video clips to animated GIFs. Supports MP4, WebM and MOV. Free and runs in your browser.",
  },
  {
    slug: "audio-recorder",
    name: "Audio Recorder",
    description: "Record audio from your microphone and download as MP3/WAV",
    emoji: "🎙️",
    category: "video",
    acceptedFormats: [],
    metaTitle: "Online Audio Recorder - Record & Download MP3/WAV | ZapFile",
    metaDescription:
      "Record audio from your microphone and download it as MP3 or WAV. No sign-up, runs free in your browser.",
  },
  {
    slug: "text-to-speech",
    name: "Text to Speech",
    description: "Read text aloud with every voice your device offers",
    emoji: "🔊",
    category: "video",
    acceptedFormats: [],
    metaTitle: "Text to Speech - Free Online TTS | ZapFile",
    metaDescription:
      "Convert text to natural-sounding speech in many languages including English and Turkish. Free browser-based TTS.",
  },
];

export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}

export function getToolsByCategory(category: ToolCategory): Tool[] {
  return tools.filter((t) => t.category === category);
}
