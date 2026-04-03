"use client";

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";

export type Locale = "en" | "tr";

// ─── Translations ───────────────────────────────────────────────
const translations: Record<Locale, Record<string, string>> = {
  en: {
    // Header
    "nav.allTools": "All Tools",
    "nav.browseAll": "Browse All",
    "nav.viewAll": "View all {count} tools",

    // Hero
    "hero.badge": "100% Free · No Sign-up · Browser-Based",
    "hero.title1": "The file tools you",
    "hero.title2": "actually want",
    "hero.title3": "to use",
    "hero.subtitle":
      "Fast, private, and free. Everything runs directly in your browser — no file uploads, no accounts, no limits.",
    "hero.cta": "Browse All Tools",
    "hero.toolCount": "{count} tools available",
    "hero.trust1": "Your files stay on your device",
    "hero.trust2": "Instant processing",
    "hero.trust3": "No limits, forever free",

    // Tool categories
    "cat.pdf": "PDF Tools",
    "cat.image": "Image Tools",
    "cat.video": "Video & Audio",
    "cat.utility": "Utility Tools",

    // Tool page
    "tool.home": "Home",
    "tool.tools": "Tools",
    "tool.privacy": "Your files never leave your browser",
    "tool.dropLabel": "Drop your file here or click to browse",
    "tool.dropSub": "or drag and drop",
    "tool.process": "Process File",
    "tool.processing": "Processing...",
    "tool.download": "Download",
    "tool.remove": "Remove",
    "tool.original": "Original",
    "tool.result": "Result",
    "tool.saved": "Saved",

    // CTA
    "cta.title": "Ready to get started?",
    "cta.subtitle":
      "{count} free tools at your fingertips. No sign-ups, no uploads, no hassle.",

    // Footer
    "footer.brand":
      "Fast, free, and private file tools. Everything runs in your browser — your files never leave your device.",
    "footer.product": "Product",
    "footer.legal": "Legal",
    "footer.popular": "Popular Tools",
    "footer.allTools": "All Tools",
    "footer.pdfTools": "PDF Tools",
    "footer.imageTools": "Image Tools",
    "footer.videoAudio": "Video & Audio",
    "footer.privacy": "Privacy Policy",
    "footer.terms": "Terms of Service",
    "footer.copyright": "All processing happens in your browser.",
    "footer.freeTools": "{count} Free Tools",
    "footer.noSignup": "No Sign-up Required",

    // Tools page
    "tools.title": "All Tools",
    "tools.subtitle": "{count} tools, all free and private.",
    "tools.search": "Search...",
    "tools.all": "All",
    "tools.noResults": 'No tools match "{query}"',

    // Tools Metadata
    "tool.compress-pdf.name": "Compress PDF",
    "tool.compress-pdf.desc": "Reduce PDF file size while maintaining quality",
    "tool.merge-pdf.name": "Merge PDF",
    "tool.merge-pdf.desc": "Combine multiple PDF files into one document",
    "tool.split-pdf.name": "Split PDF",
    "tool.split-pdf.desc": "Extract specific pages from a PDF file",
    "tool.pdf-to-images.name": "PDF to Images",
    "tool.pdf-to-images.desc": "Convert PDF pages to PNG or JPG images",
    "tool.rotate-pdf.name": "Rotate PDF",
    "tool.rotate-pdf.desc": "Rotate PDF pages individually or all at once",

    "tool.compress-image.name": "Compress Image",
    "tool.compress-image.desc": "Reduce image file size with quality control",
    "tool.resize-image.name": "Resize Image",
    "tool.resize-image.desc":
      "Change image dimensions with aspect ratio control",
    "tool.convert-image.name": "Convert Image",
    "tool.convert-image.desc":
      "Convert between PNG, JPG, WEBP and AVIF formats",
    "tool.crop-image.name": "Crop Image",
    "tool.crop-image.desc":
      "Crop images with preset ratios or custom selection",
    "tool.rotate-image.name": "Rotate Image",
    "tool.rotate-image.desc":
      "Rotate images 90, 180, 270 degrees or flip horizontally/vertically",
    "tool.watermark-image.name": "Add Watermark",
    "tool.watermark-image.desc": "Add text or image watermark to photos",
    "tool.remove-background.name": "Remove Background",
    "tool.remove-background.desc":
      "Remove image backgrounds instantly using AI",
    "tool.image-to-pdf.name": "Image to PDF",
    "tool.image-to-pdf.desc": "Convert JPG, PNG or WEBP images to PDF document",

    "tool.compress-video.name": "Compress Video",
    "tool.compress-video.desc": "Reduce video file size with quality options",
    "tool.extract-audio.name": "Extract Audio",
    "tool.extract-audio.desc": "Extract audio track from video as MP3 or WAV",
    "tool.video-to-gif.name": "Video to GIF",
    "tool.video-to-gif.desc": "Convert video clips to animated GIF images",

    "tool.qr-generator.name": "QR Code Generator",
    "tool.qr-generator.desc": "Generate QR codes with custom colors and logo",
    "tool.svg-to-png.name": "SVG to PNG",
    "tool.svg-to-png.desc": "Convert SVG vector files to PNG with custom size",
    "tool.base64-encode.name": "Base64 Encoder",
    "tool.base64-encode.desc": "Encode files or text to Base64 and decode back",
    "tool.color-picker.name": "Color Picker",
    "tool.color-picker.desc": "Pick colors and convert between HEX, RGB, HSL",
    "tool.json-formatter.name": "JSON Formatter",
    "tool.json-formatter.desc":
      "Format, minify, and validate JSON data instantly",
    "tool.hash-generator.name": "Hash Generator",
    "tool.hash-generator.desc":
      "Generate SHA-1, SHA-256, SHA-384, SHA-512 hashes",
    "tool.word-counter.name": "Word Counter",
    "tool.word-counter.desc":
      "Count words, characters, sentences and reading time",
    "tool.pdf-to-word.name": "PDF to Word",
    "tool.pdf-to-word.desc":
      "Convert PDF documents to editable Word (DOCX) files",
    "tool.pdf-to-excel.name": "PDF to Excel",
    "tool.pdf-to-excel.desc":
      "Extract tables from PDF to Excel (XLSX) spreadsheets",
    "tool.pdf-to-pptx.name": "PDF to PowerPoint",
    "tool.pdf-to-pptx.desc":
      "Convert PDF pages to PowerPoint (PPTX) presentations",
    "tool.word-to-pdf.name": "Word to PDF",
    "tool.word-to-pdf.desc": "Convert Word (DOCX) documents to PDF format",
    "tool.pdf-page-numbers.name": "PDF Page Numbers",
    "tool.pdf-page-numbers.desc": "Add page numbers to your PDF document",
    "tool.ocr.name": "OCR - Image to Text",
    "tool.ocr.desc": "Extract text from images using AI-powered OCR",

    // 404
    "404.title": "Page not found",
    "404.subtitle":
      "The page you're looking for doesn't exist or has been moved.",
    "404.cta": "Back to Home",
  },
  tr: {
    // Header
    "nav.allTools": "Tüm Araçlar",
    "nav.browseAll": "Hepsini Gör",
    "nav.viewAll": "Tüm {count} aracı gör",

    // Hero
    "hero.badge": "%100 Ücretsiz · Kayıt Yok · Tarayıcı Tabanlı",
    "hero.title1": "Kullanmak istediğiniz",
    "hero.title2": "dosya araçları",
    "hero.title3": "",
    "hero.subtitle":
      "Hızlı, gizli ve ücretsiz. Her şey tarayıcınızda çalışır — yükleme yok, hesap gerekmiyor.",
    "hero.cta": "Tüm Araçları Gör",
    "hero.toolCount": "{count} araç mevcut",
    "hero.trust1": "Dosyalarınız cihazınızda kalır",
    "hero.trust2": "Anında işleme",
    "hero.trust3": "Sınır yok, sonsuza kadar ücretsiz",

    // Tool categories
    "cat.pdf": "PDF Araçları",
    "cat.image": "Görüntü Araçları",
    "cat.video": "Video & Ses",
    "cat.utility": "Yardımcı Araçlar",

    // Tool page
    "tool.home": "Ana Sayfa",
    "tool.tools": "Araçlar",
    "tool.privacy": "Dosyalarınız tarayıcınızdan asla çıkmaz",
    "tool.dropLabel": "Dosyanızı buraya bırakın veya tıklayın",
    "tool.dropSub": "veya sürükleyip bırakın",
    "tool.process": "Dosyayı İşle",
    "tool.processing": "İşleniyor...",
    "tool.download": "İndir",
    "tool.remove": "Kaldır",
    "tool.original": "Orijinal",
    "tool.result": "Sonuç",
    "tool.saved": "Tasarruf",

    // CTA
    "cta.title": "Başlamaya hazır mısınız?",
    "cta.subtitle":
      "{count} ücretsiz araç parmaklarınızın ucunda. Kayıt yok, yükleme yok.",

    // Footer
    "footer.brand":
      "Hızlı, ücretsiz ve gizli dosya araçları. Her şey tarayıcınızda çalışır — dosyalarınız cihazınızdan asla çıkmaz.",
    "footer.product": "Ürün",
    "footer.legal": "Hukuk",
    "footer.popular": "Popüler Araçlar",
    "footer.allTools": "Tüm Araçlar",
    "footer.pdfTools": "PDF Araçları",
    "footer.imageTools": "Görüntü Araçları",
    "footer.videoAudio": "Video & Ses",
    "footer.privacy": "Gizlilik Politikası",
    "footer.terms": "Kullanım Şartları",
    "footer.copyright": "Tüm işlemler tarayıcınızda gerçekleşir.",
    "footer.freeTools": "{count} Ücretsiz Araç",
    "footer.noSignup": "Kayıt Gerekmiyor",

    // Tools page
    "tools.title": "Tüm Araçlar",
    "tools.subtitle": "{count} araç, hepsi ücretsiz ve gizli.",
    "tools.search": "Ara...",
    "tools.all": "Hepsi",
    "tools.noResults": '"{query}" ile eşleşen araç bulunamadı',

    // Tools Metadata
    "tool.compress-pdf.name": "PDF Küçültme",
    "tool.compress-pdf.desc": "Kaliteyi koruyarak PDF dosya boyutunu küçültün",
    "tool.merge-pdf.name": "PDF Birleştirme",
    "tool.merge-pdf.desc": "Birden fazla PDF dosyasını tek belgede birleştirin",
    "tool.split-pdf.name": "PDF Ayırma",
    "tool.split-pdf.desc": "PDF dosyasından belirli sayfaları çıkarın",
    "tool.pdf-to-images.name": "PDF'i Resme Çevirme",
    "tool.pdf-to-images.desc":
      "PDF sayfalarını PNG veya JPG resimlerine dönüştürün",
    "tool.rotate-pdf.name": "PDF Döndürme",
    "tool.rotate-pdf.desc": "PDF sayfalarını tek tek veya topluca döndürün",

    "tool.compress-image.name": "Resim Küçültme",
    "tool.compress-image.desc":
      "Resim dosya boyutunu kalite kontrolüyle küçültün",
    "tool.resize-image.name": "Resim Boyutlandırma",
    "tool.resize-image.desc":
      "Resim boyutlarını en boy oranını koruyarak değiştirin",
    "tool.convert-image.name": "Resim Çevirici",
    "tool.convert-image.desc":
      "Resimleri PNG, JPG, WEBP ve AVIF formatları arasında çevirin",
    "tool.crop-image.name": "Resim Kırpma",
    "tool.crop-image.desc": "Resimleri serbestçe veya belirli oranlarda kırpın",
    "tool.rotate-image.name": "Resim Döndürücü",
    "tool.rotate-image.desc":
      "Resimleri 90, 180, 270 derece döndürün veya aynalayın",
    "tool.watermark-image.name": "Filigran Ekleme",
    "tool.watermark-image.desc": "Resimlere yazı veya logo filigranı ekleyin",
    "tool.remove-background.name": "Arka Plan Silici",
    "tool.remove-background.desc":
      "Yapay zeka ile saniyeler içinde resim arka planını temizleyin",
    "tool.image-to-pdf.name": "Resmi PDF Yapma",
    "tool.image-to-pdf.desc":
      "JPG, PNG veya WEBP resimlerini PDF belgesine çevirin",

    "tool.compress-video.name": "Video Küçültme",
    "tool.compress-video.desc":
      "Kalite seçenekleriyle video dosya boyutunu küçültün",
    "tool.extract-audio.name": "Müzik Çıkartma",
    "tool.extract-audio.desc":
      "Videodaki sesi MP3 veya WAV olarak dışa aktarın",
    "tool.video-to-gif.name": "Videodan GIF Yapma",
    "tool.video-to-gif.desc":
      "Video kliplerini hareketli GIF resimlerine dönüştürün",

    "tool.qr-generator.name": "QR Kod Oluşturucu",
    "tool.qr-generator.desc": "Özel renk ve logolu QR kodlar oluşturun",
    "tool.svg-to-png.name": "SVG'den PNG'ye",
    "tool.svg-to-png.desc":
      "SVG vektörlerini istediğiniz boyutta PNG'ye dönüştürün",
    "tool.base64-encode.name": "Base64 Çevirici",
    "tool.base64-encode.desc":
      "Dosyaları veya metni Base64 olarak kodlayın ve çözün",
    "tool.color-picker.name": "Renk Seçici",
    "tool.color-picker.desc":
      "HEX, RGB, HSL arasında renkleri bulun ve dönüştürün",
    "tool.json-formatter.name": "JSON Formatlayıcı",
    "tool.json-formatter.desc":
      "JSON verilerini anında biçimlendirin, küçültün ve doğrulayın",
    "tool.hash-generator.name": "Hash Üretici",
    "tool.hash-generator.desc":
      "SHA-1, SHA-256, SHA-384, SHA-512 şifreleme özetleri hesaplayın",
    "tool.word-counter.name": "Kelime Sayacı",
    "tool.word-counter.desc":
      "Metindeki kelime, harf, cümle sayısını ve okuma süresini hesaplayın",
    "tool.pdf-to-word.name": "PDF'den Word'e",
    "tool.pdf-to-word.desc":
      "PDF belgelerini düzenlenebilir Word (DOCX) dosyalarına dönüştürün",
    "tool.pdf-to-excel.name": "PDF'den Excel'e",
    "tool.pdf-to-excel.desc":
      "PDF'deki tabloları Excel (XLSX) dosyasına aktarın",
    "tool.pdf-to-pptx.name": "PDF'den PowerPoint'e",
    "tool.pdf-to-pptx.desc":
      "PDF sayfalarını PowerPoint (PPTX) sunumuna dönüştürün",
    "tool.word-to-pdf.name": "Word'den PDF'e",
    "tool.word-to-pdf.desc": "Word (DOCX) belgelerini PDF formatına çevirin",
    "tool.pdf-page-numbers.name": "PDF Sayfa Numarası",
    "tool.pdf-page-numbers.desc": "PDF belgenize sayfa numaraları ekleyin",
    "tool.ocr.name": "OCR - Görüntüden Metin",
    "tool.ocr.desc": "Görüntülerden yapay zeka ile metin çıkarın",

    // 404
    "404.title": "Sayfa bulunamadı",
    "404.subtitle": "Aradığınız sayfa mevcut değil veya taşınmış olabilir.",
    "404.cta": "Ana Sayfaya Dön",
  },
};

// ─── Context ────────────────────────────────────────────────────
interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Read saved locale or detect from browser
    const saved = localStorage.getItem("zapfile-locale") as Locale | null;
    if (saved && (saved === "en" || saved === "tr")) {
      setLocaleState(saved);
    } else {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith("tr")) {
        setLocaleState("tr");
      }
    }
    setMounted(true);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("zapfile-locale", newLocale);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      let text = translations[locale]?.[key] || translations.en[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(`{${k}}`, String(v));
        });
      }
      return text;
    },
    [locale],
  );

  // Render with default locale until mounted to avoid hydration mismatch
  if (!mounted) {
    const defaultT = (
      key: string,
      params?: Record<string, string | number>,
    ) => {
      let text = translations.en[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(`{${k}}`, String(v));
        });
      }
      return text;
    };
    return (
      <I18nContext.Provider value={{ locale: "en", setLocale, t: defaultT }}>
        {children}
      </I18nContext.Provider>
    );
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
