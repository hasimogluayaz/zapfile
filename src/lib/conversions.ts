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
  category: "image" | "audio";
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
// Audio conversions
// ---------------------------------------------------------------------------

const audioConversions: ConversionDef[] = [
  {
    slug: "mp3-to-wav",
    from: "MP3",
    to: "WAV",
    fromLabel: "MP3",
    toLabel: "WAV",
    fromExt: [".mp3"],
    toExt: ".wav",
    fromMime: "audio/mpeg",
    toMime: "audio/wav",
    category: "audio",
    outputFormat: "wav",
    acceptMap: { "audio/mpeg": [".mp3"] },
    metaTitle: "Convert MP3 to WAV Online Free | ZapFile",
    metaDescription:
      "Convert MP3 to WAV online for free. Get uncompressed audio files for editing, production, and professional use. Instant browser-based MP3 to WAV converter.",
    h1: "Convert MP3 to WAV Online",
    description:
      "Convert your MP3 audio files to uncompressed WAV format for editing, music production, and professional workflows. WAV files are the standard for audio editing software and provide lossless playback. Essential when you need to import audio into a DAW or editing suite that works best with uncompressed formats.",
    fromDescription:
      "MP3 is the most popular compressed audio format, using lossy compression to reduce file sizes while maintaining good listening quality.",
    toDescription:
      "WAV is an uncompressed audio format that provides full-fidelity playback and is the standard format for professional audio editing and production.",
    benefits: [
      "Get uncompressed audio ready for professional editing in any DAW",
      "Avoid re-encoding artifacts when applying effects or processing",
      "Ensure compatibility with all audio editing software",
      "Create a stable working format for audio production workflows",
    ],
    faq: [
      {
        q: "Does converting MP3 to WAV improve audio quality?",
        a: "Converting MP3 to WAV will not restore quality lost during MP3 compression. The WAV file will contain the same audio fidelity as the MP3 but in an uncompressed container. The benefit is avoiding further quality loss during editing.",
      },
      {
        q: "Why is the WAV file so much larger than the MP3?",
        a: "WAV files store audio without any compression, so a typical song will be about 10 times larger than the MP3 version. This is normal and expected for uncompressed audio.",
      },
      {
        q: "When should I convert MP3 to WAV?",
        a: "Convert to WAV when you need to edit audio in software like Audacity, Adobe Audition, or a DAW. Working with uncompressed audio prevents stacking compression artifacts during the editing process.",
      },
    ],
  },
  {
    slug: "mp3-to-ogg",
    from: "MP3",
    to: "OGG",
    fromLabel: "MP3",
    toLabel: "OGG",
    fromExt: [".mp3"],
    toExt: ".ogg",
    fromMime: "audio/mpeg",
    toMime: "audio/ogg",
    category: "audio",
    outputFormat: "ogg",
    acceptMap: { "audio/mpeg": [".mp3"] },
    metaTitle: "Convert MP3 to OGG Online Free | ZapFile",
    metaDescription:
      "Convert MP3 to OGG Vorbis online for free. Get better audio quality at the same file size with the open-source OGG format. Browser-based, no software needed.",
    h1: "Convert MP3 to OGG Online",
    description:
      "Convert MP3 files to OGG Vorbis, the open-source audio format that delivers better quality at equivalent bitrates. OGG is royalty-free, widely used in game development, and supported by most media players. Ideal when you need a patent-free audio format for web applications, games, or open-source projects.",
    fromDescription:
      "MP3 is the ubiquitous compressed audio format, supported virtually everywhere but encumbered by historical patent considerations.",
    toDescription:
      "OGG Vorbis is a free, open-source audio codec that provides quality comparable to or better than MP3 at similar bitrates, popular in gaming and web applications.",
    benefits: [
      "Use a completely royalty-free and open-source audio format",
      "Get better audio quality per kilobyte compared to MP3",
      "Native support in Firefox, Chrome, and many game engines",
      "Ideal format for game development and web-based audio",
    ],
    faq: [
      {
        q: "Is OGG better quality than MP3?",
        a: "At the same bitrate, OGG Vorbis generally provides better audio quality than MP3. Independent listening tests consistently show OGG outperforming MP3, especially at lower bitrates around 128 kbps.",
      },
      {
        q: "Can I play OGG files on my phone?",
        a: "Android natively supports OGG Vorbis playback. On iOS, you can use third-party players like VLC. Most desktop media players including VLC, Foobar2000, and Winamp also support OGG.",
      },
      {
        q: "Why is OGG popular for game audio?",
        a: "OGG Vorbis is royalty-free, which means game developers do not need to pay licensing fees. It is also natively supported by popular game engines like Unity and Unreal Engine, and offers good compression for in-game music and sound effects.",
      },
    ],
  },
  {
    slug: "mp3-to-aac",
    from: "MP3",
    to: "AAC",
    fromLabel: "MP3",
    toLabel: "AAC",
    fromExt: [".mp3"],
    toExt: ".aac",
    fromMime: "audio/mpeg",
    toMime: "audio/aac",
    category: "audio",
    outputFormat: "aac",
    acceptMap: { "audio/mpeg": [".mp3"] },
    metaTitle: "Convert MP3 to AAC Online Free | ZapFile",
    metaDescription:
      "Convert MP3 to AAC online for free. Get superior audio quality with Apple's preferred audio format. Instant conversion, no software download required.",
    h1: "Convert MP3 to AAC Online",
    description:
      "Convert your MP3 files to AAC format for better audio quality at smaller file sizes. AAC is the default audio format for Apple devices, YouTube, and many streaming platforms. It provides noticeably cleaner sound than MP3 at the same bitrate, making it the preferred choice for modern audio distribution.",
    fromDescription:
      "MP3 is the legacy standard for compressed audio, offering wide compatibility but less efficient compression than modern codecs.",
    toDescription:
      "AAC (Advanced Audio Coding) is a modern codec that delivers superior sound quality compared to MP3 at equivalent bitrates, used by Apple, YouTube, and most streaming services.",
    benefits: [
      "Get better sound quality than MP3 at the same file size",
      "Use the native format for Apple devices and iTunes",
      "Create files optimized for YouTube and streaming platforms",
      "Enjoy more efficient compression with the modern AAC codec",
    ],
    faq: [
      {
        q: "Is AAC better than MP3?",
        a: "Yes, AAC provides better audio quality than MP3 at equivalent bitrates. AAC was designed as the successor to MP3 and uses more advanced compression techniques, resulting in cleaner sound especially at lower bitrates.",
      },
      {
        q: "Can all devices play AAC files?",
        a: "AAC is supported by all Apple devices, most Android devices, modern web browsers, and popular media players. Compatibility is very broad, though some older dedicated MP3 players may not support it.",
      },
      {
        q: "What bitrate should I use for AAC?",
        a: "128 kbps AAC provides quality roughly equivalent to 160 kbps MP3. For high-quality music listening, 256 kbps AAC is excellent and is the standard used by Apple Music and the iTunes Store.",
      },
    ],
  },
  {
    slug: "wav-to-mp3",
    from: "WAV",
    to: "MP3",
    fromLabel: "WAV",
    toLabel: "MP3",
    fromExt: [".wav"],
    toExt: ".mp3",
    fromMime: "audio/wav",
    toMime: "audio/mpeg",
    category: "audio",
    outputFormat: "mp3",
    acceptMap: { "audio/wav": [".wav"] },
    metaTitle: "Convert WAV to MP3 Online Free | ZapFile",
    metaDescription:
      "Convert WAV to MP3 online for free. Compress large WAV audio files to MP3 for easy sharing and storage. Fast browser-based WAV to MP3 converter.",
    h1: "Convert WAV to MP3 Online",
    description:
      "Convert large WAV audio files to compact MP3 format for easy sharing, storage, and playback. MP3 compression reduces file sizes by up to 90% while maintaining good listening quality. Perfect for preparing recordings, podcasts, or music for distribution on any platform.",
    fromDescription:
      "WAV is an uncompressed audio format that captures full audio fidelity but results in very large file sizes, typically around 10 MB per minute of audio.",
    toDescription:
      "MP3 is the universal compressed audio format, reducing file sizes by up to 90% while preserving good listening quality, playable on every device imaginable.",
    benefits: [
      "Reduce file size by up to 90% for easy sharing and storage",
      "Create files playable on every device and media player",
      "Prepare audio for podcast hosting, streaming, and distribution",
      "Save storage space while maintaining good listening quality",
    ],
    faq: [
      {
        q: "How much smaller will my MP3 be compared to WAV?",
        a: "At 128 kbps, an MP3 file is roughly 10% the size of the original WAV. A 50 MB WAV file would compress to about 5 MB as an MP3. Higher bitrates like 320 kbps produce larger files but better quality.",
      },
      {
        q: "What bitrate should I choose for WAV to MP3 conversion?",
        a: "For general listening and sharing, 192 kbps offers a good balance of quality and size. For high-quality music, use 320 kbps. For voice recordings and podcasts, 128 kbps is usually sufficient.",
      },
      {
        q: "Is there quality loss when converting WAV to MP3?",
        a: "Yes, MP3 is a lossy format so some audio information is discarded during compression. However, at 192 kbps and above, most listeners cannot distinguish MP3 from the original WAV in casual listening.",
      },
    ],
  },
  {
    slug: "wav-to-ogg",
    from: "WAV",
    to: "OGG",
    fromLabel: "WAV",
    toLabel: "OGG",
    fromExt: [".wav"],
    toExt: ".ogg",
    fromMime: "audio/wav",
    toMime: "audio/ogg",
    category: "audio",
    outputFormat: "ogg",
    acceptMap: { "audio/wav": [".wav"] },
    metaTitle: "Convert WAV to OGG Online Free | ZapFile",
    metaDescription:
      "Convert WAV to OGG Vorbis online for free. Compress uncompressed audio with the high-quality open-source OGG codec. No software installation needed.",
    h1: "Convert WAV to OGG Online",
    description:
      "Convert your uncompressed WAV audio to OGG Vorbis for efficient, high-quality compressed audio. OGG Vorbis delivers excellent fidelity from uncompressed sources and is the ideal choice for game developers, web audio, and open-source projects that need compact, royalty-free audio files.",
    fromDescription:
      "WAV stores raw uncompressed audio at full fidelity, making it the best source for high-quality conversions to any compressed format.",
    toDescription:
      "OGG Vorbis is an open, patent-free audio format that achieves excellent compression quality, widely used in gaming, web apps, and open-source ecosystems.",
    benefits: [
      "Compress large WAV files while preserving excellent quality",
      "Use a completely royalty-free format with no licensing costs",
      "Create optimized audio assets for game engines and web apps",
      "Get better quality-per-byte than MP3 from your WAV source",
    ],
    faq: [
      {
        q: "Why convert WAV to OGG instead of MP3?",
        a: "OGG Vorbis offers better audio quality than MP3 at the same file size, is completely royalty-free, and is the preferred format for many game engines and web applications. It is an excellent modern alternative.",
      },
      {
        q: "How much compression does OGG provide?",
        a: "At a quality setting equivalent to 192 kbps, OGG files are roughly 85-90% smaller than the original WAV while maintaining very high audio fidelity. The exact ratio depends on the audio content.",
      },
      {
        q: "Is OGG supported in web browsers?",
        a: "OGG Vorbis is natively supported in Chrome, Firefox, Edge, and Opera via the HTML5 audio element. Safari support requires the WebM container or a fallback format.",
      },
    ],
  },
  {
    slug: "wav-to-aac",
    from: "WAV",
    to: "AAC",
    fromLabel: "WAV",
    toLabel: "AAC",
    fromExt: [".wav"],
    toExt: ".aac",
    fromMime: "audio/wav",
    toMime: "audio/aac",
    category: "audio",
    outputFormat: "aac",
    acceptMap: { "audio/wav": [".wav"] },
    metaTitle: "Convert WAV to AAC Online Free | ZapFile",
    metaDescription:
      "Convert WAV to AAC online for free. Compress uncompressed audio to AAC for high-quality playback on Apple devices and streaming platforms. Browser-based converter.",
    h1: "Convert WAV to AAC Online",
    description:
      "Convert uncompressed WAV audio to AAC for the best possible compressed audio quality. Since WAV contains the full original audio data, encoding to AAC from WAV produces superior results compared to transcoding from another lossy format. Ideal for creating high-quality audio files for Apple devices, streaming, and podcasts.",
    fromDescription:
      "WAV provides uncompressed full-fidelity audio, serving as the ideal source material for encoding to any compressed format without stacking compression artifacts.",
    toDescription:
      "AAC is a high-efficiency audio codec that produces studio-quality compressed audio, used as the default format by Apple Music, YouTube, and major streaming platforms.",
    benefits: [
      "Achieve the highest quality AAC encoding from uncompressed source audio",
      "Reduce large WAV files to manageable sizes for distribution",
      "Create Apple-optimized audio files for iTunes and iOS",
      "Prepare professional audio for streaming and podcast platforms",
    ],
    faq: [
      {
        q: "Is encoding WAV to AAC better than MP3 to AAC?",
        a: "Yes, encoding from WAV (uncompressed) always produces better results than transcoding from MP3 (already compressed). Starting with uncompressed source audio means the AAC encoder has the full original data to work with.",
      },
      {
        q: "What is the best AAC bitrate for music?",
        a: "256 kbps AAC is considered transparent quality for most listeners, matching the standard used by Apple Music. For spoken content like podcasts, 96-128 kbps AAC provides excellent clarity at very small file sizes.",
      },
      {
        q: "Can I use AAC files on non-Apple devices?",
        a: "Yes, AAC is supported on Android, Windows, and all modern web browsers. While it is closely associated with Apple, AAC is an open standard supported across virtually all modern platforms.",
      },
    ],
  },
  {
    slug: "ogg-to-mp3",
    from: "OGG",
    to: "MP3",
    fromLabel: "OGG",
    toLabel: "MP3",
    fromExt: [".ogg"],
    toExt: ".mp3",
    fromMime: "audio/ogg",
    toMime: "audio/mpeg",
    category: "audio",
    outputFormat: "mp3",
    acceptMap: { "audio/ogg": [".ogg"] },
    metaTitle: "Convert OGG to MP3 Online Free | ZapFile",
    metaDescription:
      "Convert OGG to MP3 online for free. Turn OGG Vorbis audio into universally compatible MP3 files. Instant browser-based conversion with no software needed.",
    h1: "Convert OGG to MP3 Online",
    description:
      "Convert OGG Vorbis audio files to the universally compatible MP3 format. While OGG offers superior compression, MP3 remains the most widely supported audio format across all devices and platforms. Convert your OGG files to MP3 for guaranteed playback on any music player, phone, or car stereo.",
    fromDescription:
      "OGG Vorbis is a high-quality open-source audio format popular in gaming and web applications, but not supported by all consumer devices.",
    toDescription:
      "MP3 is the most universally recognized audio format, guaranteed to play on every music player, smartphone, car stereo, and audio device ever made.",
    benefits: [
      "Play your audio on any device with guaranteed MP3 compatibility",
      "Share music files without worrying about format support",
      "Upload to platforms and services that only accept MP3",
      "Transfer audio to older devices and car stereos",
    ],
    faq: [
      {
        q: "Why convert OGG to MP3?",
        a: "While OGG is technically superior, MP3 has universal device support. Some car stereos, older portable players, and certain software only support MP3. Converting ensures your audio works everywhere.",
      },
      {
        q: "Is there quality loss converting OGG to MP3?",
        a: "Yes, converting between two lossy formats does result in some quality reduction. For best results, use a high bitrate like 256 or 320 kbps for the MP3 output to minimize additional compression artifacts.",
      },
      {
        q: "What MP3 bitrate should I use?",
        a: "Use 320 kbps if quality is your priority, or 192 kbps for a good balance of quality and file size. Since you are transcoding from an already compressed format, using a higher bitrate helps preserve the audio fidelity.",
      },
    ],
  },
  {
    slug: "ogg-to-wav",
    from: "OGG",
    to: "WAV",
    fromLabel: "OGG",
    toLabel: "WAV",
    fromExt: [".ogg"],
    toExt: ".wav",
    fromMime: "audio/ogg",
    toMime: "audio/wav",
    category: "audio",
    outputFormat: "wav",
    acceptMap: { "audio/ogg": [".ogg"] },
    metaTitle: "Convert OGG to WAV Online Free | ZapFile",
    metaDescription:
      "Convert OGG to WAV online for free. Decode OGG Vorbis audio to uncompressed WAV for editing and production. Fast browser-based conversion, no installation needed.",
    h1: "Convert OGG to WAV Online",
    description:
      "Convert OGG Vorbis audio to uncompressed WAV format for editing, mixing, and professional audio production. WAV files work in every audio editor and DAW without compatibility issues. Decode your OGG files to WAV when you need a standard uncompressed format for your workflow.",
    fromDescription:
      "OGG Vorbis is a compressed open-source audio format that may not be directly supported by all professional audio editing tools.",
    toDescription:
      "WAV is the universal uncompressed audio format accepted by every audio editor, DAW, and professional production tool on every platform.",
    benefits: [
      "Get uncompressed audio files compatible with every audio editor",
      "Prepare OGG audio for professional mixing and mastering workflows",
      "Import audio into DAWs that do not natively read OGG files",
      "Create a stable uncompressed base for further format conversions",
    ],
    faq: [
      {
        q: "Will converting OGG to WAV improve the audio quality?",
        a: "No, converting to WAV will not restore audio data lost during OGG compression. The WAV file will contain the decoded OGG audio in an uncompressed container, preventing further quality degradation during editing.",
      },
      {
        q: "Why not just edit the OGG file directly?",
        a: "Many professional DAWs and audio editors prefer or require uncompressed WAV files for import. Working in WAV also avoids re-encoding the audio every time you save, which would gradually degrade quality.",
      },
      {
        q: "How large will the WAV file be?",
        a: "WAV files are roughly 10 MB per minute of stereo audio at CD quality (44.1 kHz, 16-bit). A 4-minute song will produce approximately a 40 MB WAV file regardless of the original OGG size.",
      },
    ],
  },
  {
    slug: "ogg-to-aac",
    from: "OGG",
    to: "AAC",
    fromLabel: "OGG",
    toLabel: "AAC",
    fromExt: [".ogg"],
    toExt: ".aac",
    fromMime: "audio/ogg",
    toMime: "audio/aac",
    category: "audio",
    outputFormat: "aac",
    acceptMap: { "audio/ogg": [".ogg"] },
    metaTitle: "Convert OGG to AAC Online Free | ZapFile",
    metaDescription:
      "Convert OGG to AAC online for free. Switch from OGG Vorbis to AAC for better device compatibility on Apple platforms. Instant browser-based audio conversion.",
    h1: "Convert OGG to AAC Online",
    description:
      "Convert OGG Vorbis audio to AAC format for broad compatibility across Apple devices and streaming platforms. AAC is the default audio format for iPhone, iPad, Apple Music, and YouTube. Switching from OGG to AAC ensures your audio plays natively on the widest range of modern devices.",
    fromDescription:
      "OGG Vorbis is an open-source codec with excellent quality but limited native support on Apple devices and some mainstream platforms.",
    toDescription:
      "AAC is a high-efficiency audio codec supported natively by Apple devices, Android, all major browsers, and most streaming services.",
    benefits: [
      "Play your audio natively on all Apple devices",
      "Use the preferred format for streaming and podcast platforms",
      "Get wide compatibility across both mobile and desktop platforms",
      "Maintain good audio quality with efficient AAC compression",
    ],
    faq: [
      {
        q: "Is AAC better than OGG?",
        a: "Quality-wise, OGG Vorbis and AAC are comparable at similar bitrates. The main advantage of AAC is far broader device support, especially on Apple products. Choose AAC when compatibility matters more than using an open-source format.",
      },
      {
        q: "Will my iPhone play AAC files?",
        a: "Yes, AAC is the native audio format for all Apple devices. Your iPhone, iPad, Mac, and Apple Watch all play AAC files without any additional apps or configuration needed.",
      },
      {
        q: "Does converting OGG to AAC reduce quality?",
        a: "Transcoding between two lossy formats does cause some quality reduction. To minimize this, use a higher bitrate for the AAC output (192-256 kbps) than the original OGG source.",
      },
    ],
  },
  {
    slug: "flac-to-mp3",
    from: "FLAC",
    to: "MP3",
    fromLabel: "FLAC",
    toLabel: "MP3",
    fromExt: [".flac"],
    toExt: ".mp3",
    fromMime: "audio/flac",
    toMime: "audio/mpeg",
    category: "audio",
    outputFormat: "mp3",
    acceptMap: { "audio/flac": [".flac"] },
    metaTitle: "Convert FLAC to MP3 Online Free | ZapFile",
    metaDescription:
      "Convert FLAC to MP3 online for free. Compress lossless FLAC audio to compact MP3 files for portable players and easy sharing. Browser-based, no software needed.",
    h1: "Convert FLAC to MP3 Online",
    description:
      "Convert your lossless FLAC audio files to compact MP3 format for portable listening, sharing, and storage. FLAC files sound amazing but are too large for many devices and everyday use. Converting to MP3 gives you files that play everywhere and fit easily on phones, USB drives, and portable players.",
    fromDescription:
      "FLAC is a lossless audio format that preserves perfect CD-quality audio, but produces large files that are impractical for portable devices and sharing.",
    toDescription:
      "MP3 is the universal audio format for portable listening, offering dramatic compression from lossless sources with quality that satisfies most listeners.",
    benefits: [
      "Shrink lossless FLAC files by 70-80% for portable use",
      "Play your music on any device with universal MP3 support",
      "Fit more music on your phone, USB drive, or portable player",
      "Encode directly from lossless source for the best possible MP3 quality",
    ],
    faq: [
      {
        q: "What bitrate should I use for FLAC to MP3?",
        a: "Since FLAC is lossless, you have the best possible source material. Use 320 kbps for near-transparent quality, 256 kbps for an excellent balance, or 192 kbps if storage is a concern. The MP3 will sound better than converting from any lossy source.",
      },
      {
        q: "Can I hear the difference between FLAC and 320 kbps MP3?",
        a: "Most listeners cannot distinguish between FLAC and 320 kbps MP3 in blind tests with typical listening equipment. Differences may be detectable with high-end audiophile gear and trained ears, but for everyday listening the quality is virtually identical.",
      },
      {
        q: "Should I keep my original FLAC files after converting?",
        a: "Yes, always keep your original FLAC files as a lossless archive. You can always re-encode from FLAC to any format in the future, but you cannot recover lossless quality once you only have an MP3 copy.",
      },
    ],
  },
  {
    slug: "flac-to-wav",
    from: "FLAC",
    to: "WAV",
    fromLabel: "FLAC",
    toLabel: "WAV",
    fromExt: [".flac"],
    toExt: ".wav",
    fromMime: "audio/flac",
    toMime: "audio/wav",
    category: "audio",
    outputFormat: "wav",
    acceptMap: { "audio/flac": [".flac"] },
    metaTitle: "Convert FLAC to WAV Online Free | ZapFile",
    metaDescription:
      "Convert FLAC to WAV online for free. Decode lossless FLAC audio to uncompressed WAV for maximum compatibility in DAWs and audio editors. Instant conversion.",
    h1: "Convert FLAC to WAV Online",
    description:
      "Convert FLAC files to uncompressed WAV for complete compatibility with every audio editor, DAW, and CD burning application. Both formats are lossless, so the conversion is perfectly transparent with zero quality loss. WAV is the standard import format for professional audio tools that may not natively support FLAC.",
    fromDescription:
      "FLAC is a lossless compressed audio format that preserves perfect audio quality at roughly half the size of WAV, but is not supported by all audio software.",
    toDescription:
      "WAV is the standard uncompressed audio format for professional audio production, supported by every DAW, editor, and CD burning application.",
    benefits: [
      "Get a perfectly lossless conversion with zero quality difference",
      "Import audio into DAWs and editors that require WAV format",
      "Prepare files for CD burning which typically requires WAV input",
      "Ensure compatibility with all professional audio workflows",
    ],
    faq: [
      {
        q: "Is there any quality loss converting FLAC to WAV?",
        a: "No, absolutely none. Both FLAC and WAV are lossless formats. FLAC is simply a compressed version of the same audio data. Converting to WAV decompresses it back to the identical original audio, bit for bit.",
      },
      {
        q: "Why is the WAV file larger than the FLAC?",
        a: "FLAC uses lossless compression to reduce file size by about 50-60% compared to WAV. When you convert to WAV, the audio is decompressed back to its full uncompressed size. No information is lost in either direction.",
      },
      {
        q: "When should I use WAV instead of FLAC?",
        a: "Use WAV when your audio software does not support FLAC, when burning audio CDs, or when you need the fastest possible processing in a DAW without any decompression overhead.",
      },
    ],
  },
  {
    slug: "aac-to-mp3",
    from: "AAC",
    to: "MP3",
    fromLabel: "AAC",
    toLabel: "MP3",
    fromExt: [".aac"],
    toExt: ".mp3",
    fromMime: "audio/aac",
    toMime: "audio/mpeg",
    category: "audio",
    outputFormat: "mp3",
    acceptMap: { "audio/mp4": [".aac", ".m4a"] },
    metaTitle: "Convert AAC to MP3 Online Free | ZapFile",
    metaDescription:
      "Convert AAC to MP3 online for free. Turn AAC audio files into universally compatible MP3 format. No software needed, instant browser-based conversion.",
    h1: "Convert AAC to MP3 Online",
    description:
      "Convert AAC audio files to the universally supported MP3 format for maximum compatibility. While AAC offers better compression, some older devices, car stereos, and portable players only support MP3. This converter quickly transforms your AAC files into MP3 that plays on absolutely everything.",
    fromDescription:
      "AAC is a modern compressed audio format with excellent quality, but some legacy devices and portable players do not support it.",
    toDescription:
      "MP3 is the most universally supported audio format, guaranteed to work on every device from modern smartphones to vintage portable players and car stereos.",
    benefits: [
      "Guarantee playback on every audio device in existence",
      "Transfer music to older MP3 players and car stereos",
      "Share audio files without worrying about format compatibility",
      "Upload to platforms and services that only accept MP3",
    ],
    faq: [
      {
        q: "Why convert AAC to MP3 if AAC is better quality?",
        a: "The main reason is compatibility. Some car stereos, older portable players, and certain software only support MP3. Converting ensures your audio plays everywhere, even if there is a slight quality trade-off.",
      },
      {
        q: "Is there noticeable quality loss?",
        a: "At high bitrates like 256 or 320 kbps, the quality difference is minimal and most listeners will not notice. Since you are transcoding from one lossy format to another, using a higher bitrate helps preserve fidelity.",
      },
      {
        q: "What is the difference between AAC and M4A?",
        a: "M4A is simply a file container (MPEG-4 Part 14) that typically holds AAC-encoded audio. The actual audio codec inside an M4A file is usually AAC, so converting M4A and AAC to MP3 produces the same result.",
      },
    ],
  },
  {
    slug: "aac-to-wav",
    from: "AAC",
    to: "WAV",
    fromLabel: "AAC",
    toLabel: "WAV",
    fromExt: [".aac"],
    toExt: ".wav",
    fromMime: "audio/aac",
    toMime: "audio/wav",
    category: "audio",
    outputFormat: "wav",
    acceptMap: { "audio/mp4": [".aac", ".m4a"] },
    metaTitle: "Convert AAC to WAV Online Free | ZapFile",
    metaDescription:
      "Convert AAC to WAV online for free. Decode AAC audio to uncompressed WAV for editing and production. Fast, browser-based converter with no software installation.",
    h1: "Convert AAC to WAV Online",
    description:
      "Convert AAC audio files to uncompressed WAV format for editing, mixing, and professional audio work. Decoding AAC to WAV gives you an uncompressed file that works in every audio editor and prevents further quality degradation during processing. Essential for importing AAC recordings into professional production environments.",
    fromDescription:
      "AAC is a compressed audio format used widely on Apple devices and streaming platforms, but requires decoding for some professional audio workflows.",
    toDescription:
      "WAV is the uncompressed standard for audio editing, fully compatible with every DAW, audio editor, and professional production tool available.",
    benefits: [
      "Get uncompressed files ready for professional audio editing",
      "Import Apple-sourced audio into any DAW or editing tool",
      "Prevent additional quality loss during editing and processing",
      "Create a universal format from iOS voice memos and recordings",
    ],
    faq: [
      {
        q: "Will converting AAC to WAV restore the original quality?",
        a: "No, converting AAC to WAV decompresses the audio but cannot restore data lost during AAC encoding. The WAV will faithfully represent the AAC audio in an uncompressed container, which is ideal for editing without introducing further compression artifacts.",
      },
      {
        q: "Can I import AAC to WAV for editing voice memos?",
        a: "Yes, this is a common use case. iPhone voice memos are recorded in AAC format, and converting them to WAV makes them easy to edit in professional audio software like Audacity, Adobe Audition, or any DAW.",
      },
      {
        q: "How much larger is the WAV compared to AAC?",
        a: "WAV files are typically 8-12 times larger than AAC files depending on the AAC bitrate. A 5 MB AAC file might produce a 40-60 MB WAV. This is normal for uncompressed audio and is the trade-off for universal editor compatibility.",
      },
    ],
  },
  {
    slug: "m4a-to-mp3",
    from: "M4A",
    to: "MP3",
    fromLabel: "M4A",
    toLabel: "MP3",
    fromExt: [".m4a"],
    toExt: ".mp3",
    fromMime: "audio/mp4",
    toMime: "audio/mpeg",
    category: "audio",
    outputFormat: "mp3",
    acceptMap: { "audio/mp4": [".m4a"] },
    metaTitle: "Convert M4A to MP3 Online Free | ZapFile",
    metaDescription:
      "Convert M4A to MP3 online for free. Turn Apple M4A audio files into universally compatible MP3. Works with iTunes downloads, voice memos, and audiobooks.",
    h1: "Convert M4A to MP3 Online",
    description:
      "Convert M4A files to MP3 for universal playback on any device. M4A is Apple's preferred audio container and is used for iTunes purchases, voice memos, and iPhone recordings. Converting to MP3 ensures your audio works on every music player, car stereo, and application regardless of platform or age.",
    fromDescription:
      "M4A is an Apple audio container format using AAC codec, commonly produced by iTunes, Apple Music downloads, iPhone voice memos, and GarageBand exports.",
    toDescription:
      "MP3 is the most universally compatible audio format, playable on every device from the newest smartphones to the oldest portable music players.",
    benefits: [
      "Play Apple Music downloads and voice memos on any device",
      "Transfer iPhone recordings to devices that do not support M4A",
      "Share audio files without worrying about Apple format restrictions",
      "Upload to platforms and websites that require MP3 format",
    ],
    faq: [
      {
        q: "Why can I not play M4A files on my device?",
        a: "M4A is an Apple-centric format that some devices and older music players do not recognize. While Android and modern computers support M4A, many car stereos, vintage MP3 players, and certain apps only work with MP3 files.",
      },
      {
        q: "Can I convert M4A audiobooks to MP3?",
        a: "Yes, standard M4A audio files can be converted to MP3. Note that DRM-protected audiobooks (M4B files from Apple Books) cannot be converted due to copy protection. Unprotected M4A files convert without any issues.",
      },
      {
        q: "Will my voice memos lose quality?",
        a: "There is a small quality reduction when converting from M4A (AAC) to MP3, but at 192 kbps or higher the difference is imperceptible for voice recordings. Voice memos will sound virtually identical after conversion.",
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

export function getAudioConversions(): ConversionDef[] {
  return audioConversions;
}

export function getAllConversions(): ConversionDef[] {
  return [...imageConversions, ...audioConversions];
}

export function getConversionBySlug(slug: string): ConversionDef | undefined {
  return getAllConversions().find((c) => c.slug === slug);
}
