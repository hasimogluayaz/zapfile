export interface FaqItem {
  question: string;
  answer: string;
}

const toolFaqs: Record<string, FaqItem[]> = {
  "background-remover": [
    {
      question: "Is the background remover really free and private?",
      answer: "Yes. The AI model (BiRefNet, MIT licensed) runs entirely in your browser using WebGPU or WebAssembly. Your photo is never uploaded, and there are no watermarks or limits.",
    },
    {
      question: "Why does the first run take longer?",
      answer: "The first time, your browser downloads the AI model once (about 94 MB) and stores it in its cache. After that it starts instantly, even offline.",
    },
    {
      question: "How do I fix an area the AI got wrong?",
      answer: "Pick the Erase or Restore brush below the preview and paint over the area. Zoom in with the scroll wheel or a pinch for precise work, and use Undo (Ctrl+Z) at any time.",
    },
    {
      question: "Can I put a new background behind the subject?",
      answer: "Yes. Choose a solid color, a blurred version of the original photo, or your own image, then download as PNG, WebP or JPG at full resolution.",
    },
  ],
  "pdf-encrypt": [
    {
      question: "How do I password-protect a PDF for free?",
      answer: "Drop your PDF into ZapFile's Protect PDF tool, enter a password twice and click Protect PDF. The file is encrypted with AES-256 in your browser and is never uploaded.",
    },
    {
      question: "Will the protected PDF open in Adobe Reader and on phones?",
      answer: "Yes. ZapFile uses the standard PDF encryption built into the PDF format (AES-256, revision 6), which opens in Adobe Acrobat and Reader X or newer, Chrome, Edge, Firefox, macOS Preview, iOS and Android. Choose AES-128 only for very old readers.",
    },
    {
      question: "Can I remove a password from a PDF?",
      answer: "Yes, if you know the password. Switch to Remove password, enter it, and download an unlocked copy. ZapFile cannot recover or bypass passwords you don't know.",
    },
    {
      question: "Can I stop people from printing or copying my PDF?",
      answer: "Yes. Turn on Restrict printing, copying and editing to choose what readers may do. Keep the permissions password so you can lift the restrictions later.",
    },
  ],
  "word-to-pdf": [
    {
      question: "How do I convert Word to PDF for free?",
      answer: "Drop one or more DOCX, DOC, ODT or RTF files into ZapFile's Word to PDF tool. LibreOffice, running inside your browser, lays out every page and you download the PDFs one by one, as a ZIP, or combined into a single PDF. Nothing is uploaded and there is no watermark.",
    },
    {
      question: "Will the PDF look the same as in Word?",
      answer: "The document is laid out by LibreOffice, the same engine many converters run on their servers: fonts, tables, images, headers, footers, footnotes, page numbers and page breaks are kept. Common Microsoft fonts are replaced by metric-compatible ones (for example Carlito for Calibri), so lines and pages break in the same places.",
    },
    {
      question: "Why is there a download the first time?",
      answer: "The conversion engine is about 77 MB. It is downloaded once, checked and stored in your browser, so later visits start instantly and even work offline. Your documents themselves never leave your device.",
    },
    {
      question: "Can I convert a password-protected document or make a PDF/A?",
      answer: "Yes. Enter the document's password when asked and it is opened locally. Turn on PDF/A to get an archival PDF/A-2b file with every font embedded.",
    },
  ],
  "excel-to-pdf": [
    {
      question: "How do I convert Excel to PDF?",
      answer: "Drop XLSX, XLS, ODS or CSV files into ZapFile's Excel to PDF tool. Each workbook is converted in your browser with LibreOffice and you download the PDF. Nothing is uploaded.",
    },
    {
      question: "Are all sheets and formulas included?",
      answer: "Yes. Every sheet is printed in order, formulas are recalculated so the PDF shows their results, and number formats, colors, borders, merged cells, print areas and page setup from the workbook are respected.",
    },
    {
      question: "Why is a wide sheet split across pages?",
      answer: "The PDF follows the workbook's page setup, like printing from Excel. To keep a sheet on one page, set its scaling to fit one page wide (Page Layout → Fit to) before converting.",
    },
  ],
  "powerpoint-to-pdf": [
    {
      question: "How do I convert PowerPoint to PDF?",
      answer: "Drop PPTX, PPT or ODP presentations into ZapFile's PowerPoint to PDF tool. Each slide becomes one PDF page, converted in your browser with LibreOffice. Nothing is uploaded and there is no watermark.",
    },
    {
      question: "Are images, shapes and slide designs kept?",
      answer: "Yes. Backgrounds, themes, shapes, pictures, tables, charts and text formatting are rendered as on the slide. Animations and embedded videos can't play in a PDF, so their first frame or poster is shown.",
    },
    {
      question: "Can I convert several presentations at once?",
      answer: "Yes. Drop as many files as you like: they are converted one after another and you can download each PDF, all of them as a ZIP, or combine them into one PDF.",
    },
  ],
  "pdf-to-markdown": [
    {
      question: "How do I convert a PDF to Markdown?",
      answer: "Drop the PDF into ZapFile's PDF to Markdown tool. Headings, paragraphs, bold and italic text, lists and tables are rebuilt as GitHub-flavored Markdown in your browser. Copy it or download the .md file.",
    },
    {
      question: "Are tables and images kept?",
      answer: "Tables become Markdown pipe tables. Turn on Include images to get a ZIP with the Markdown file and an images folder it links to; charts and diagrams are saved as pictures too.",
    },
    {
      question: "Is it good for ChatGPT, Claude or other AI tools?",
      answer: "Yes. Markdown keeps the document's structure with far fewer tokens than raw PDF text, so models read headings, lists and tables correctly. Nothing is uploaded while converting.",
    },
  ],
  "crop-pdf": [
    {
      question: "How do I crop a PDF?",
      answer: "Open the PDF in ZapFile's Crop PDF tool, drag the yellow frame (or its handles) around the area you want to keep and download. The same area is applied to every page, or only to the pages you choose.",
    },
    {
      question: "Can it remove white margins automatically?",
      answer: "Yes. Choose Trim margins on each page: every page is checked for its printed area and cropped to it, with the padding you set. Ideal for scanned books or slides with wide borders.",
    },
    {
      question: "Is the cropped content deleted?",
      answer: "No. Cropping sets the visible page area (crop box and media box), like other PDF editors do. The parts outside are hidden in every viewer and when printing, but not erased from the file. To remove sensitive content, redact it instead.",
    },
  ],
  "sign-pdf": [
    {
      question: "How do I sign a PDF for free?",
      answer: "Open the PDF in ZapFile's Sign PDF tool, create your signature by drawing it, typing your name in a handwriting font or uploading a photo of it, then drag it where it belongs and download the signed PDF. Everything happens in your browser.",
    },
    {
      question: "Can I add the date, my name or checkmarks?",
      answer: "Yes. Add text boxes, today's date and ✓ or ✗ marks, move and resize them, and copy an item to every page (for example initials on each page).",
    },
    {
      question: "Is this a legally binding signature?",
      answer: "It is a visual electronic signature, like signing a printout: accepted for many everyday agreements, but some documents require a qualified digital signature with a certificate. Check what the recipient needs.",
    },
    {
      question: "Is my signature stored anywhere?",
      answer: "No. The signature exists only in this browser tab while you work and is never uploaded.",
    },
  ],
  "watermark-pdf": [
    {
      question: "How do I add a watermark to a PDF?",
      answer: "Drop the PDF into ZapFile's Watermark PDF tool, type your text (for example CONFIDENTIAL) or choose a logo, and adjust size, color, opacity, angle and position while the preview updates. Then download the stamped PDF. Nothing is uploaded.",
    },
    {
      question: "Can the watermark repeat across the page?",
      answer: "Yes. Turn on Tile to repeat the text or logo in a staggered pattern over the whole page, which is harder to crop out. You can also stamp only some pages, for example 2-end or odd.",
    },
    {
      question: "Is the watermark text real text?",
      answer: "Yes. Text is written with an embedded font (DejaVu, covering Turkish, Greek and Cyrillic letters), so it stays sharp at any zoom and is searchable.",
    },
  ],
  "organize-pdf": [
    {
      question: "How do I rearrange pages in a PDF?",
      answer: "Drop the PDF into ZapFile's Organize PDF tool and drag the page thumbnails into the order you want. You can also move a page with its arrow buttons or with Alt + arrow keys. Download the result when you're done. Nothing is uploaded.",
    },
    {
      question: "Can I delete or extract pages?",
      answer: "Yes. Select pages (Ctrl or Shift + click to select several) and delete them, or use Extract to download only the selected pages as a new PDF. Rotate, duplicate and blank-page insertion work the same way, and every change can be undone.",
    },
    {
      question: "Can I combine pages from several PDFs?",
      answer: "Yes. Add more PDFs and their pages join the grid, numbered by file, so you can mix and reorder pages from different documents into one PDF.",
    },
  ],
  "pdf-to-powerpoint": [
    {
      question: "How do I convert a PDF to PowerPoint?",
      answer: "Drop the PDF into ZapFile's PDF to PowerPoint tool. Each page becomes one slide in a PPTX file, built in your browser in a few seconds. Nothing is uploaded and there is no watermark.",
    },
    {
      question: "Can I edit the slides?",
      answer: "Yes. Text is placed in real text boxes with its fonts, sizes, colors and line breaks, so you can change the wording right away. Pictures, colored boxes and lines are separate objects you can move or delete. Charts and diagrams are kept as sharp pictures.",
    },
    {
      question: "What happens with scanned PDFs?",
      answer: "A scanned page has no text layer, so it becomes a full-slide picture. If the scan already contains an OCR text layer, that text is used and becomes editable.",
    },
  ],
  "pdf-to-word": [
    {
      question: "How do I convert a PDF to Word for free?",
      answer: "Drop your PDF into ZapFile's PDF to Word tool. It is converted in your browser in a few seconds and you download an editable DOCX file. Nothing is uploaded and there is no sign-up or watermark.",
    },
    {
      question: "Does the Word file keep the layout?",
      answer: "ZapFile rebuilds real Word structure rather than placing text boxes: headings, paragraphs with their fonts, sizes, colors and alignment, bulleted and numbered lists, tables with merged cells and shading, images, headers, footers and page numbers. Multi-column pages flow into one column so the text stays easy to edit, and charts or diagrams are kept as sharp pictures.",
    },
    {
      question: "Can it convert a scanned PDF?",
      answer: "A scanned page has no text layer, so it is placed in the document as a high-resolution picture. If the scan already contains an OCR text layer, that text is used and becomes editable.",
    },
    {
      question: "What about password-protected PDFs?",
      answer: "Remove the password first with the Protect PDF tool (you need to know it), then convert the unlocked copy.",
    },
  ],
  "pdf-to-excel": [
    {
      question: "How do I convert a PDF table to Excel?",
      answer: "Drop the PDF into ZapFile's PDF to Excel tool. Tables are detected from their ruling lines or from aligned columns of text and written to an XLSX file in your browser. Nothing is uploaded.",
    },
    {
      question: "Are numbers converted to real Excel numbers?",
      answer: "Yes. Amounts with thousands separators, decimal commas, currency signs, percentages, negatives in parentheses and ISO dates become numeric cells you can sum and sort. Leading-zero codes such as postcodes stay text. You can turn number detection off to keep everything as text.",
    },
    {
      question: "Can I get one sheet per table?",
      answer: "Yes. Choose one sheet per page, everything on one sheet, or one sheet per table. You can also leave out the text around the tables so only the data is exported.",
    },
    {
      question: "Are merged cells and header rows kept?",
      answer: "Merged cells in ruled tables become merged cells in Excel, header rows stay bold, and in the one-sheet-per-table layout the header row is frozen so it stays visible while you scroll.",
    },
  ],
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
