export interface ConversionDef {
  slug: string;
  from: string;
  to: string;
  fromLabel: string;
  toLabel: string;
  fromExt: string | string[];
  toExt: string;
  fromMime: string;
  toMime: string;
  category: "image";
  outputFormat?: string;
  acceptMap?: Record<string, string[]>;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  description: string;
  fromDescription: string;
  toDescription: string;
  benefits: string[];
  faq: { q: string; a: string }[];
}

// ---------------------------------------------------------------------------
// Image conversions
// ---------------------------------------------------------------------------

const imageConversions: ConversionDef[] = [
  {
    slug: "jpg-to-png",
    from: "JPG",
    to: "PNG",
    fromLabel: "JPG",
    toLabel: "PNG",
    fromExt: ".jpg",
    toExt: ".png",
    fromMime: "image/jpeg",
    toMime: "image/png",
    category: "image",
    outputFormat: "png",
    acceptMap: { "image/jpeg": [".jpg", ".jpeg"] },
    metaTitle: "Convert JPG to PNG Online Free | ZapFile",
    metaDescription:
      "Convert JPG to PNG online for free. Get lossless PNG images with transparency support from your JPEG files. No upload limits, instant browser-based conversion.",
    h1: "Convert JPG to PNG Online",
    description:
      "Transform your JPG images into high-quality PNG files with full transparency support. PNG uses lossless compression, so every pixel from your original image is preserved without quality degradation. Ideal when you need crisp graphics with transparent backgrounds for logos, icons, or web design elements.",
    fromDescription:
      "JPG (JPEG) is the most widely used lossy image format, optimized for photographs with millions of colors and small file sizes.",
    toDescription:
      "PNG is a lossless image format that supports transparency (alpha channel) and preserves every detail of the original image without compression artifacts.",
    benefits: [
      "Add transparency support that JPG does not offer",
      "Preserve image quality with lossless compression",
      "Get sharper edges for text, logos, and graphics",
      "Create web-ready images with alpha channel support",
    ],
    faq: [
      {
        q: "Does converting JPG to PNG improve image quality?",
        a: "Converting JPG to PNG will not recover quality already lost during JPEG compression, but it prevents any further quality loss. The resulting PNG preserves the exact pixel data of the JPG file and adds support for transparency.",
      },
      {
        q: "Why is the PNG file larger than the original JPG?",
        a: "PNG uses lossless compression, which means it keeps every pixel exactly as-is. JPG achieves smaller files by discarding some visual information. The larger PNG size is the trade-off for zero quality loss and transparency support.",
      },
      {
        q: "Can I add a transparent background after converting to PNG?",
        a: "The conversion itself preserves the original background, but once your image is in PNG format you can use any image editor to remove the background and take advantage of PNG transparency support.",
      },
    ],
  },
  {
    slug: "jpg-to-webp",
    from: "JPG",
    to: "WEBP",
    fromLabel: "JPG",
    toLabel: "WEBP",
    fromExt: ".jpg",
    toExt: ".webp",
    fromMime: "image/jpeg",
    toMime: "image/webp",
    category: "image",
    outputFormat: "webp",
    acceptMap: { "image/jpeg": [".jpg", ".jpeg"] },
    metaTitle: "Convert JPG to WEBP Online Free | ZapFile",
    metaDescription:
      "Convert JPG to WEBP online for free. Reduce image file size by up to 30% while maintaining visual quality. Fast browser-based converter with no software needed.",
    h1: "Convert JPG to WEBP Online",
    description:
      "Convert your JPEG images to Google's modern WEBP format and dramatically reduce file sizes without visible quality loss. WEBP delivers superior compression compared to JPG, making it the preferred format for faster-loading websites. Shrink your images by 25-35% while keeping them looking sharp.",
    fromDescription:
      "JPG (JPEG) is the universal lossy image format used for photos, web images, and digital photography since 1992.",
    toDescription:
      "WEBP is a modern image format developed by Google that provides superior lossy and lossless compression for smaller file sizes and faster web performance.",
    benefits: [
      "Reduce file size by 25-35% compared to equivalent JPG quality",
      "Speed up website loading times with smaller images",
      "Improve Core Web Vitals and SEO performance scores",
      "Supported by all modern browsers including Chrome, Firefox, Safari, and Edge",
    ],
    faq: [
      {
        q: "How much smaller are WEBP files compared to JPG?",
        a: "WEBP files are typically 25-35% smaller than equivalent-quality JPEG images. The exact savings depend on the image content, but photos with lots of detail tend to see the greatest reduction.",
      },
      {
        q: "Do all browsers support WEBP images?",
        a: "Yes, all modern browsers now support WEBP including Chrome, Firefox, Safari (since version 14), Edge, and Opera. Only very old browser versions lack WEBP support.",
      },
      {
        q: "Will converting JPG to WEBP reduce image quality?",
        a: "When using a quality setting similar to the original JPG, the visual difference is virtually undetectable to the human eye. WEBP achieves smaller files through more efficient compression algorithms, not by removing more detail.",
      },
    ],
  },
  {
    slug: "png-to-jpg",
    from: "PNG",
    to: "JPG",
    fromLabel: "PNG",
    toLabel: "JPG",
    fromExt: ".png",
    toExt: ".jpg",
    fromMime: "image/png",
    toMime: "image/jpeg",
    category: "image",
    outputFormat: "jpeg",
    acceptMap: { "image/png": [".png"] },
    metaTitle: "Convert PNG to JPG Online Free | ZapFile",
    metaDescription:
      "Convert PNG to JPG online for free. Reduce image file sizes dramatically while keeping great visual quality. Fast, private, browser-based PNG to JPEG converter.",
    h1: "Convert PNG to JPG Online",
    description:
      "Convert your PNG images to JPG format to significantly reduce file sizes. JPG compression is especially effective for photographs and complex images where small compression artifacts are imperceptible. Perfect for preparing images for email, social media, or any platform where smaller file sizes matter.",
    fromDescription:
      "PNG is a lossless image format that supports transparency and preserves all image data, resulting in larger file sizes for complex images.",
    toDescription:
      "JPG (JPEG) is the most universally compatible image format, using lossy compression to achieve dramatically smaller file sizes ideal for photos.",
    benefits: [
      "Dramatically reduce file size, often by 50-80% for photographs",
      "Ensure universal compatibility across every device and platform",
      "Meet file size requirements for email attachments and uploads",
      "Optimize photos for social media sharing",
    ],
    faq: [
      {
        q: "What happens to transparency when converting PNG to JPG?",
        a: "JPG does not support transparency, so any transparent areas in your PNG will be filled with a solid background color (typically white). If you need to keep transparency, consider converting to WEBP instead.",
      },
      {
        q: "How much smaller will my JPG file be compared to PNG?",
        a: "For photographs, JPG files are typically 50-80% smaller than the PNG equivalent. The exact savings depend on image complexity and the quality setting used during conversion.",
      },
      {
        q: "Is there any quality loss when converting PNG to JPG?",
        a: "JPG uses lossy compression, so there is a small amount of quality reduction. However, at high quality settings the difference is barely noticeable for photographs. Graphics with sharp edges or text may show slight artifacts.",
      },
    ],
  },
  {
    slug: "png-to-webp",
    from: "PNG",
    to: "WEBP",
    fromLabel: "PNG",
    toLabel: "WEBP",
    fromExt: ".png",
    toExt: ".webp",
    fromMime: "image/png",
    toMime: "image/webp",
    category: "image",
    outputFormat: "webp",
    acceptMap: { "image/png": [".png"] },
    metaTitle: "Convert PNG to WEBP Online Free | ZapFile",
    metaDescription:
      "Convert PNG to WEBP online for free. Get smaller files with lossless quality and transparency support. Optimize your images for the web instantly.",
    h1: "Convert PNG to WEBP Online",
    description:
      "Transform your PNG images into the modern WEBP format for dramatically smaller files. WEBP supports both lossless compression and transparency, just like PNG, but with significantly better compression ratios. Reduce your image sizes by 26% or more while keeping every detail and the alpha channel intact.",
    fromDescription:
      "PNG is a widely used lossless format with transparency support, commonly used for graphics, screenshots, and images that require pixel-perfect accuracy.",
    toDescription:
      "WEBP supports lossless compression with transparency at significantly smaller file sizes than PNG, making it the modern choice for web-optimized images.",
    benefits: [
      "Reduce file size by 26% or more compared to PNG with lossless mode",
      "Keep full transparency and alpha channel support",
      "Serve faster-loading images for better website performance",
      "Maintain pixel-perfect quality with lossless WEBP compression",
    ],
    faq: [
      {
        q: "Does WEBP support transparency like PNG?",
        a: "Yes, WEBP fully supports transparency with an alpha channel, just like PNG. Your converted images will retain all transparent areas from the original PNG file.",
      },
      {
        q: "Is WEBP lossless conversion truly identical to PNG?",
        a: "Yes, lossless WEBP preserves every pixel exactly as the original PNG. The file is smaller because WEBP uses a more efficient compression algorithm, not because it discards any image data.",
      },
      {
        q: "Should I replace all my PNG images with WEBP?",
        a: "For web usage, yes. WEBP provides the same quality and features as PNG at smaller file sizes. For archival purposes or compatibility with older software, keeping PNG copies is still a good practice.",
      },
    ],
  },
  {
    slug: "webp-to-jpg",
    from: "WEBP",
    to: "JPG",
    fromLabel: "WEBP",
    toLabel: "JPG",
    fromExt: ".webp",
    toExt: ".jpg",
    fromMime: "image/webp",
    toMime: "image/jpeg",
    category: "image",
    outputFormat: "jpeg",
    acceptMap: { "image/webp": [".webp"] },
    metaTitle: "Convert WEBP to JPG Online Free | ZapFile",
    metaDescription:
      "Convert WEBP to JPG online for free. Turn WEBP images into universally compatible JPEG files. No software needed, instant conversion in your browser.",
    h1: "Convert WEBP to JPG Online",
    description:
      "Convert WEBP images to the universally supported JPG format for maximum compatibility. While WEBP is great for the web, many desktop applications, image editors, and older platforms still require JPG files. This converter lets you quickly turn any WEBP file into a standard JPEG that works everywhere.",
    fromDescription:
      "WEBP is Google's modern image format offering efficient compression, but it may not be supported by all image editing software and older applications.",
    toDescription:
      "JPG (JPEG) is the most widely supported image format in the world, compatible with virtually every device, application, and operating system.",
    benefits: [
      "Ensure compatibility with all image editors and applications",
      "Share photos on platforms that do not accept WEBP uploads",
      "Open images in older software that lacks WEBP support",
      "Create universally viewable files for email and document embedding",
    ],
    faq: [
      {
        q: "Why would I convert WEBP back to JPG?",
        a: "Many image editors, social platforms, and document tools still do not support WEBP. Converting to JPG ensures your images can be opened, edited, and shared on any platform or software.",
      },
      {
        q: "Will converting WEBP to JPG increase the file size?",
        a: "It depends on the quality setting. At comparable visual quality, JPG files are typically somewhat larger than WEBP. However, JPG at high quality settings produces excellent results with broad compatibility.",
      },
      {
        q: "Is there quality loss when converting WEBP to JPG?",
        a: "If the WEBP was lossless, converting to JPG introduces lossy compression. If the WEBP was already lossy, the additional quality loss is minimal at high JPG quality settings. For most practical uses the difference is negligible.",
      },
    ],
  },
  {
    slug: "webp-to-png",
    from: "WEBP",
    to: "PNG",
    fromLabel: "WEBP",
    toLabel: "PNG",
    fromExt: ".webp",
    toExt: ".png",
    fromMime: "image/webp",
    toMime: "image/png",
    category: "image",
    outputFormat: "png",
    acceptMap: { "image/webp": [".webp"] },
    metaTitle: "Convert WEBP to PNG Online Free | ZapFile",
    metaDescription:
      "Convert WEBP to PNG online for free. Get lossless PNG images with transparency from WEBP files. Fast, secure browser-based conversion with no uploads to a server.",
    h1: "Convert WEBP to PNG Online",
    description:
      "Convert your WEBP images to PNG format for lossless quality and broad software compatibility. PNG files work in every image editor and support transparency, making them ideal when you need to further edit a WEBP image or use it in applications that do not recognize the WEBP format.",
    fromDescription:
      "WEBP is a modern format with excellent compression but limited support in some image editing software and legacy systems.",
    toDescription:
      "PNG is a lossless image format supported by every major application, offering transparency and pixel-perfect accuracy for editing and archiving.",
    benefits: [
      "Preserve transparency from the original WEBP file",
      "Get a lossless copy for further editing without quality degradation",
      "Open images in any application including older image editors",
      "Create archival-quality copies of your WEBP images",
    ],
    faq: [
      {
        q: "Will the PNG file be larger than the WEBP?",
        a: "Yes, PNG files are typically larger than WEBP because PNG uses a less efficient (but universally supported) lossless compression algorithm. The increase ensures every pixel is perfectly preserved.",
      },
      {
        q: "Does the conversion preserve WEBP transparency?",
        a: "Absolutely. PNG fully supports alpha transparency, so any transparent regions in your WEBP file will be preserved exactly in the converted PNG.",
      },
      {
        q: "When should I use PNG instead of WEBP?",
        a: "Use PNG when you need to edit the image in software that does not support WEBP, when archiving images for long-term storage, or when sharing with people using older devices or applications.",
      },
    ],
  },
  {
    slug: "avif-to-png",
    from: "AVIF",
    to: "PNG",
    fromLabel: "AVIF",
    toLabel: "PNG",
    fromExt: ".avif",
    toExt: ".png",
    fromMime: "image/avif",
    toMime: "image/png",
    category: "image",
    outputFormat: "png",
    acceptMap: { "image/avif": [".avif"] },
    metaTitle: "Convert AVIF to PNG Online Free | ZapFile",
    metaDescription:
      "Convert AVIF to PNG online for free. Turn AVIF images into universally compatible lossless PNG files with transparency. Instant browser-based conversion.",
    h1: "Convert AVIF to PNG Online",
    description:
      "Convert AVIF images to the widely supported PNG format for universal compatibility. AVIF is a cutting-edge format with exceptional compression, but software support is still catching up. Converting to PNG ensures your images can be opened in any editor, embedded in documents, and shared without compatibility issues.",
    fromDescription:
      "AVIF is a next-generation image format based on the AV1 video codec, delivering exceptional compression but with limited software support.",
    toDescription:
      "PNG is a universally supported lossless format with transparency, compatible with every major operating system, browser, and image editor.",
    benefits: [
      "Open AVIF images in applications that lack native AVIF support",
      "Get a lossless, editable version of your AVIF image",
      "Preserve transparency from the original AVIF file",
      "Share images with anyone regardless of their software",
    ],
    faq: [
      {
        q: "Why can I not open my AVIF file in some apps?",
        a: "AVIF is a relatively new format and many applications have not yet added support for it. Converting to PNG gives you a universally compatible file that works everywhere.",
      },
      {
        q: "Will I lose quality converting AVIF to PNG?",
        a: "No quality is lost in the conversion. PNG is a lossless format, so it preserves the exact pixel data decoded from the AVIF file. The only quality limitation is whatever compression was applied when the AVIF was originally created.",
      },
      {
        q: "Is AVIF better than PNG for web use?",
        a: "AVIF offers much smaller file sizes than PNG for lossy compression, but browser support is not yet universal. PNG is a safer choice when you need guaranteed compatibility, while AVIF is ideal for performance-focused websites that serve fallback formats.",
      },
    ],
  },
  {
    slug: "avif-to-jpg",
    from: "AVIF",
    to: "JPG",
    fromLabel: "AVIF",
    toLabel: "JPG",
    fromExt: ".avif",
    toExt: ".jpg",
    fromMime: "image/avif",
    toMime: "image/jpeg",
    category: "image",
    outputFormat: "jpeg",
    acceptMap: { "image/avif": [".avif"] },
    metaTitle: "Convert AVIF to JPG Online Free | ZapFile",
    metaDescription:
      "Convert AVIF to JPG online for free. Transform AVIF images into universally compatible JPEG files. No downloads needed, works instantly in your browser.",
    h1: "Convert AVIF to JPG Online",
    description:
      "Convert AVIF images to the standard JPG format for maximum compatibility across all devices and platforms. While AVIF offers superior compression, JPG remains the most universally recognized image format. This tool lets you quickly turn any AVIF file into a JPEG that works in every email client, social network, and application.",
    fromDescription:
      "AVIF is an advanced image format using AV1 codec technology for excellent compression ratios, but it is not yet supported by all software and platforms.",
    toDescription:
      "JPG (JPEG) is the most universally compatible photo format, supported by every device, email client, social platform, and application in existence.",
    benefits: [
      "Ensure your images work on every platform and device",
      "Share photos via email without compatibility worries",
      "Upload to social media platforms that do not accept AVIF",
      "Edit images in any photo editing software",
    ],
    faq: [
      {
        q: "Why should I convert AVIF to JPG?",
        a: "While AVIF is a superior format technically, many applications, email clients, and platforms still do not support it. Converting to JPG ensures your images can be viewed and shared everywhere.",
      },
      {
        q: "Will the JPG file be larger than the AVIF?",
        a: "Yes, JPG files are typically larger than AVIF at equivalent visual quality because AVIF uses much more advanced compression. However, JPG files are still reasonably sized for sharing and everyday use.",
      },
      {
        q: "Can I batch convert multiple AVIF files to JPG?",
        a: "Yes, ZapFile supports converting multiple files at once. Simply select or drag all your AVIF files into the converter and they will each be processed and converted to JPG format.",
      },
    ],
  },
  {
    slug: "avif-to-webp",
    from: "AVIF",
    to: "WEBP",
    fromLabel: "AVIF",
    toLabel: "WEBP",
    fromExt: ".avif",
    toExt: ".webp",
    fromMime: "image/avif",
    toMime: "image/webp",
    category: "image",
    outputFormat: "webp",
    acceptMap: { "image/avif": [".avif"] },
    metaTitle: "Convert AVIF to WEBP Online Free | ZapFile",
    metaDescription:
      "Convert AVIF to WEBP online for free. Transform AVIF images into widely supported WEBP files with great compression. Fast, browser-based conversion.",
    h1: "Convert AVIF to WEBP Online",
    description:
      "Convert AVIF images to WEBP format for broader compatibility while retaining excellent compression. WEBP is supported by all modern browsers and offers a good balance between file size and quality. If your target audience or software does not yet support AVIF, WEBP is the next best choice for optimized web images.",
    fromDescription:
      "AVIF delivers the best compression ratios available but has limited support in older browsers and many desktop applications.",
    toDescription:
      "WEBP provides excellent compression with near-universal browser support, serving as a practical middle ground between AVIF efficiency and JPG/PNG compatibility.",
    benefits: [
      "Gain broader browser support while keeping efficient compression",
      "Maintain transparency support from the original AVIF file",
      "Serve optimized images to browsers that do not support AVIF",
      "Reduce compatibility issues without sacrificing much file size savings",
    ],
    faq: [
      {
        q: "Is WEBP as efficient as AVIF?",
        a: "AVIF generally achieves 20% smaller files than WEBP at equivalent quality. However, WEBP is supported by a wider range of browsers and applications, making it a practical choice when AVIF compatibility is a concern.",
      },
      {
        q: "When should I choose WEBP over AVIF?",
        a: "Choose WEBP when you need broader compatibility. While AVIF compresses better, WEBP is supported in all modern browsers including older versions of Safari, and in many more desktop applications and CMS platforms.",
      },
      {
        q: "Does the AVIF to WEBP conversion preserve transparency?",
        a: "Yes, both AVIF and WEBP support alpha transparency. Any transparent areas in your AVIF image will be preserved in the WEBP output.",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

export function getImageConversions(): ConversionDef[] {
  return imageConversions;
}

export function getAllConversions(): ConversionDef[] {
  return [...imageConversions];
}

export function getConversionBySlug(slug: string): ConversionDef | undefined {
  return getAllConversions().find((c) => c.slug === slug);
}
