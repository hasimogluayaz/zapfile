export interface FaqItem {
  question: string;
  answer: string;
}

const toolFaqs: Record<string, FaqItem[]> = {
  "merge-pdf": [
    {
      question: "Is this PDF merge tool free?",
      answer: "Yes, ZapFile's PDF merge tool is completely free with no usage limits, no sign-up required, and no watermarks added to your output.",
    },
    {
      question: "Is it safe to merge PDF files online?",
      answer: "Yes. All processing happens entirely in your browser using JavaScript. Your PDF files are never uploaded to any server, so your data stays private.",
    },
    {
      question: "How many PDF files can I merge at once?",
      answer: "You can merge as many PDF files as your browser's memory allows. There is no artificial limit imposed by ZapFile.",
    },
    {
      question: "Can I reorder pages before merging?",
      answer: "Yes. After adding your files you can drag and drop them to reorder before merging into the final document.",
    },
  ],
  "split-pdf": [
    {
      question: "How do I split a PDF for free?",
      answer: "Upload your PDF to ZapFile's Split PDF tool, select the page ranges you want, and click Split. Download the resulting files individually or as a ZIP archive.",
    },
    {
      question: "Does splitting a PDF reduce quality?",
      answer: "No. Splitting only rearranges existing pages without re-encoding them, so image and text quality is preserved perfectly.",
    },
    {
      question: "Can I extract a single page from a PDF?",
      answer: "Yes. Enter the specific page number in the page range selector to extract just that one page as a standalone PDF.",
    },
  ],
  "compress-image": [
    {
      question: "How do I compress an image without losing quality?",
      answer: "Use ZapFile's Image Compressor, set the quality slider to 75-85%, and choose JPEG or WebP format. This typically reduces file size by 60-80% with no visible quality loss.",
    },
    {
      question: "What image formats can I compress?",
      answer: "ZapFile supports JPEG, PNG, and WebP compression. PNG files are compressed losslessly; JPEG and WebP support adjustable quality settings.",
    },
    {
      question: "Is there a file size limit for image compression?",
      answer: "There is no server-imposed file size limit since all processing happens in your browser. Very large images may be slow depending on your device's memory.",
    },
    {
      question: "Can I compress multiple images at once?",
      answer: "Yes. ZapFile supports batch image compression — drag and drop multiple images to process them all at once.",
    },
  ],
  "resize-image": [
    {
      question: "How do I resize an image online for free?",
      answer: "Upload your image to ZapFile's Resize Image tool, enter your target width and height (or percentage), then download the resized image. It's free and requires no account.",
    },
    {
      question: "Can I resize an image without distorting it?",
      answer: "Yes. Enable the 'Lock Aspect Ratio' option and only enter one dimension — the other will be calculated automatically to preserve proportions.",
    },
    {
      question: "What is the best size to resize images for websites?",
      answer: "For most web uses, 1200px wide at 85% JPEG quality is a good balance. Profile photos work well at 400×400px, and thumbnails at 200×200px.",
    },
  ],
  "convert-image": [
    {
      question: "How do I convert PNG to JPG online for free?",
      answer: "Open ZapFile's Image Converter, upload your PNG file, select JPG as the output format, and download. The conversion happens instantly in your browser.",
    },
    {
      question: "What is the difference between PNG and JPG?",
      answer: "PNG uses lossless compression and supports transparency, making it ideal for logos and graphics. JPG uses lossy compression optimized for photographs, producing much smaller files.",
    },
    {
      question: "Should I use WebP instead of JPG?",
      answer: "WebP offers 25-35% smaller file sizes than JPG at the same quality and is supported by all modern browsers. It's a great choice for web images.",
    },
    {
      question: "Can I convert multiple images at once?",
      answer: "Yes. ZapFile's image converter supports batch conversion — upload multiple images and convert them all in one click.",
    },
  ],
  "crop-image": [
    {
      question: "How do I crop an image online for free?",
      answer: "Upload your image to ZapFile's Crop Image tool, drag the crop handles to your desired area, and click Download. No software installation needed.",
    },
    {
      question: "Can I crop to a specific aspect ratio?",
      answer: "Yes. ZapFile offers preset ratios including 1:1 (square), 16:9 (widescreen), 4:3, and 3:2, or you can use free-form selection for any custom crop.",
    },
    {
      question: "Does cropping reduce image quality?",
      answer: "No. Cropping only removes pixels outside the selected area. The remaining area retains its original quality without any re-encoding unless you choose to export as JPEG.",
    },
  ],
  "pdf-to-images": [
    {
      question: "How do I convert a PDF to images online?",
      answer: "Upload your PDF to ZapFile's PDF to Images tool, choose PNG or JPG format, and click Convert. Download individual pages or all pages as a ZIP file.",
    },
    {
      question: "What resolution are the output images?",
      answer: "PDF pages are rendered at 150 DPI by default, which produces clear images suitable for screen viewing and most printing needs.",
    },
    {
      question: "Is there a page limit for PDF to image conversion?",
      answer: "There is no hard page limit. Very large PDFs may take longer to process depending on your device's speed and available memory.",
    },
  ],
  "rotate-pdf": [
    {
      question: "How do I rotate a PDF for free?",
      answer: "Upload your PDF to ZapFile's Rotate PDF tool, click the rotate buttons for individual pages or use 'Rotate All', then download the corrected PDF.",
    },
    {
      question: "Can I rotate only specific pages in a PDF?",
      answer: "Yes. ZapFile shows a thumbnail for every page, so you can rotate individual pages independently or rotate all pages at once.",
    },
  ],
  "pdf-page-numbers": [
    {
      question: "How do I add page numbers to a PDF for free?",
      answer: "Upload your PDF, choose the position (bottom center, bottom right, etc.) and number format, then click Apply and download your numbered PDF.",
    },
    {
      question: "Can I choose where page numbers appear?",
      answer: "Yes. ZapFile lets you place page numbers at the bottom center, bottom right, bottom left, top center, top right, or top left of each page.",
    },
  ],
  "qr-generator": [
    {
      question: "How do I create a QR code for free?",
      answer: "Enter your URL or text in ZapFile's QR Code Generator, customize the size and colors if desired, then download as PNG. No sign-up required.",
    },
    {
      question: "Can QR codes expire?",
      answer: "Static QR codes (like those generated by ZapFile) never expire. The encoded data is stored directly in the code's pattern, not on a server.",
    },
    {
      question: "What can I encode in a QR code?",
      answer: "You can encode URLs, plain text, email addresses, phone numbers, Wi-Fi credentials, and more. ZapFile's generator works for any text input.",
    },
    {
      question: "How large should a QR code be for printing?",
      answer: "For reliable scanning, print QR codes at least 2cm × 2cm (about 0.8 inches). For large-format printing like posters, generate at 1000px or higher.",
    },
  ],
  "hash-generator": [
    {
      question: "What is a hash and what is it used for?",
      answer: "A hash is a fixed-length string generated from input data using an algorithm like MD5 or SHA-256. It's used to verify file integrity, store passwords securely, and create unique identifiers.",
    },
    {
      question: "What is the difference between MD5 and SHA-256?",
      answer: "MD5 produces a 32-character hash and is fast but no longer considered cryptographically secure. SHA-256 produces a 64-character hash and is the modern standard for security applications.",
    },
    {
      question: "Is this hash generator safe to use for passwords?",
      answer: "For verifying file integrity, yes. For password storage, you should use a purpose-built password hashing algorithm like bcrypt or Argon2, not MD5 or plain SHA-256.",
    },
  ],
  "json-formatter": [
    {
      question: "How do I format JSON online?",
      answer: "Paste your JSON into ZapFile's JSON Formatter and it will instantly format it with proper indentation and syntax highlighting. You can also minify, validate, and copy the result.",
    },
    {
      question: "Why is my JSON invalid?",
      answer: "Common JSON errors include trailing commas, single quotes instead of double quotes, unquoted keys, and missing brackets. ZapFile's formatter highlights the exact line with the error.",
    },
    {
      question: "What is the difference between JSON formatting and minification?",
      answer: "Formatting (pretty-print) adds indentation and line breaks for readability. Minification removes all whitespace to reduce file size for production use.",
    },
  ],
  "password-generator": [
    {
      question: "How do I generate a strong password?",
      answer: "Use ZapFile's Password Generator to create a random password with at least 16 characters including uppercase, lowercase, numbers, and symbols.",
    },
    {
      question: "Is this password generator truly random?",
      answer: "Yes. ZapFile uses the browser's cryptographically secure random number generator (crypto.getRandomValues), which is suitable for security-critical use.",
    },
    {
      question: "How long should a strong password be?",
      answer: "Security experts recommend at least 16 characters for most accounts and 20+ for critical accounts like banking or email. Length matters more than complexity.",
    },
  ],
  "url-encoder": [
    {
      question: "What is URL encoding?",
      answer: "URL encoding converts special characters (spaces, &, #, etc.) into a percent-encoded format (e.g., space becomes %20) so they can be safely transmitted in URLs.",
    },
    {
      question: "When do I need to URL encode?",
      answer: "You need URL encoding when passing parameters in query strings, building API requests, or including user-supplied text in URLs where special characters could break the URL structure.",
    },
  ],
  "base64-encode": [
    {
      question: "What is Base64 encoding?",
      answer: "Base64 is a binary-to-text encoding scheme that represents binary data using only 64 ASCII characters. It's commonly used to embed images in HTML/CSS, encode email attachments, and pass data in URLs.",
    },
    {
      question: "How do I encode a file to Base64?",
      answer: "Upload your file or paste your text into ZapFile's Base64 Encoder and click Encode. The tool instantly produces the Base64 string you can copy and use.",
    },
    {
      question: "Does Base64 encoding compress data?",
      answer: "No. Base64 encoding actually increases data size by approximately 33%. It's used for compatibility, not compression.",
    },
  ],
  "watermark-image": [
    {
      question: "How do I add a watermark to an image online for free?",
      answer: "Upload your image to ZapFile's Watermark tool, type your watermark text, adjust the position, opacity, and size, then download the watermarked image.",
    },
    {
      question: "Can I watermark multiple images at once?",
      answer: "Yes. ZapFile's watermark tool supports batch processing — upload multiple images and apply the same watermark settings to all of them.",
    },
    {
      question: "Is the watermark permanent?",
      answer: "The watermark is burned into the downloaded image. ZapFile does not store originals or watermarked versions anywhere.",
    },
  ],
  "favicon-generator": [
    {
      question: "How do I create a favicon from an image?",
      answer: "Upload a square image (PNG or SVG recommended) to ZapFile's Favicon Generator. It produces all necessary sizes (16x16, 32x32, 180x180, 192x192, 512x512) plus the ICO file.",
    },
    {
      question: "What size should a favicon be?",
      answer: "Modern websites need multiple favicon sizes. The core ones are 16×16 and 32×32 for browser tabs, 180×180 for Apple touch icon, and 192×192 and 512×512 for Android and PWA.",
    },
    {
      question: "How do I add a favicon to my website?",
      answer: 'Add <link rel="icon" href="/favicon.ico"> and <link rel="apple-touch-icon" href="/apple-touch-icon.png"> to the <head> of your HTML. ZapFile generates all the files you need.',
    },
  ],
  "image-to-pdf": [
    {
      question: "How do I convert an image to PDF online for free?",
      answer: "Upload your JPG, PNG, or WebP image to ZapFile's Image to PDF tool and click Convert. Download the PDF instantly with no sign-up required.",
    },
    {
      question: "Can I combine multiple images into one PDF?",
      answer: "Yes. Upload multiple images and they will all be combined into a single PDF, with each image on its own page.",
    },
    {
      question: "Will the image quality be preserved in the PDF?",
      answer: "Yes. ZapFile embeds your images into the PDF without re-encoding them, preserving the original quality.",
    },
  ],
  "exif-viewer": [
    {
      question: "What is EXIF data in an image?",
      answer: "EXIF (Exchangeable Image File Format) data is metadata stored inside image files containing information like camera model, exposure settings, GPS location, and date/time taken.",
    },
    {
      question: "Does my photo contain GPS location data?",
      answer: "Photos taken on smartphones often include GPS coordinates in their EXIF data unless location services were disabled. Use ZapFile's EXIF Viewer to check your images.",
    },
    {
      question: "How do I remove EXIF data for privacy?",
      answer: "ZapFile's EXIF Viewer shows the data; to remove it you can re-export the image using ZapFile's Image Converter or Compressor, which strips EXIF metadata from the output.",
    },
  ],
  "blur-image": [
    {
      question: "How do I blur part of an image online?",
      answer: "Upload your image to ZapFile's Blur Image tool, select the area to blur, adjust the blur intensity, and download the result. Your image never leaves your browser.",
    },
    {
      question: "What is the difference between blur and pixelate?",
      answer: "Blur applies a Gaussian smoothing effect that fades details gradually. Pixelate creates a mosaic of large square pixels, giving a more pronounced censoring effect.",
    },
  ],
  "diff-checker": [
    {
      question: "How do I compare two text files online?",
      answer: "Paste your two texts into ZapFile's Diff Checker side by side and it instantly highlights additions, deletions, and unchanged lines.",
    },
    {
      question: "Can I compare code with Diff Checker?",
      answer: "Yes. ZapFile's Diff Checker works with any plain text including source code, configuration files, and documents.",
    },
  ],
  "regex-tester": [
    {
      question: "How do I test a regular expression online?",
      answer: "Enter your regex pattern and test string into ZapFile's Regex Tester. It instantly highlights all matches and shows captured groups.",
    },
    {
      question: "What regex flavors does ZapFile support?",
      answer: "ZapFile's Regex Tester uses JavaScript's built-in regular expression engine, supporting standard regex syntax including lookaheads, capture groups, and all common flags.",
    },
  ],
};

export function getToolFaqs(slug: string): FaqItem[] | null {
  return toolFaqs[slug] ?? null;
}
