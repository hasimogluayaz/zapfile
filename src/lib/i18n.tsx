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
