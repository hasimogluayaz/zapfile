import type { Metadata } from "next";
import type { Locale } from "./locales";
import { SITE_URL } from "./site-url";
import { toolsIndexHref, toolsIndexLanguagePaths } from "./localized-routes";
import { OG_LOCALE } from "./home-seo";
import { tools } from "./tools";

/** Title/description of the tool list per language (`/tools`, `/tr/tools`, …). */
const toolsIndexSeo: Record<Locale, { title: string; description: string }> = {
  en: {
    title: "All Free Online File Tools | ZapFile",
    description:
      "Browse all {count} free online file tools: PDF, image, video, audio and everyday utilities. Fast, private and no sign-up. Most run in your browser without uploading files.",
  },
  tr: {
    title: "Tüm Ücretsiz Online Dosya Araçları | ZapFile",
    description:
      "{count} ücretsiz online araç: PDF, resim, video, ses ve günlük işler için. Hızlı, gizli, üyelik yok. Çoğu dosyanı yüklemeden tarayıcında çalışır.",
  },
  de: {
    title: "Alle kostenlosen Online-Datei-Tools | ZapFile",
    description:
      "Alle {count} kostenlosen Online-Tools für PDF, Bilder, Video, Audio und den Alltag. Schnell, privat, ohne Anmeldung. Die meisten laufen im Browser, ohne Upload.",
  },
  fr: {
    title: "Tous les outils en ligne gratuits pour fichiers | ZapFile",
    description:
      "Les {count} outils en ligne gratuits : PDF, images, vidéo, audio et utilitaires du quotidien. Rapides, privés, sans inscription. La plupart fonctionnent dans votre navigateur, sans envoi de fichier.",
  },
  es: {
    title: "Todas las herramientas online gratis para archivos | ZapFile",
    description:
      "Las {count} herramientas online gratis: PDF, imágenes, vídeo, audio y utilidades del día a día. Rápidas, privadas y sin registro. La mayoría funcionan en tu navegador, sin subir archivos.",
  },
  pt: {
    title: "Todas as ferramentas online grátis para arquivos | ZapFile",
    description:
      "As {count} ferramentas online grátis: PDF, imagens, vídeo, áudio e utilidades do dia a dia. Rápidas, privadas e sem cadastro. A maioria funciona no seu navegador, sem enviar arquivos.",
  },
  it: {
    title: "Tutti gli strumenti online gratuiti per i file | ZapFile",
    description:
      "Tutti i {count} strumenti online gratuiti: PDF, immagini, video, audio e utilità quotidiane. Veloci, privati, senza registrazione. La maggior parte funziona nel browser, senza caricare file.",
  },
  ja: {
    title: "無料オンラインファイルツール一覧 | ZapFile",
    description:
      "PDF・画像・動画・音声・便利ツールなど {count} の無料オンラインツール。高速・プライベート・登録不要。ほとんどのツールはファイルをアップロードせずブラウザ内で動作します。",
  },
  ar: {
    title: "جميع أدوات الملفات المجانية عبر الإنترنت | ZapFile",
    description:
      "جميع الأدوات المجانية عبر الإنترنت ({count} أداة): PDF والصور والفيديو والصوت وأدوات يومية. سريعة وخاصة وبلا تسجيل، ومعظمها يعمل في متصفحك دون رفع الملفات.",
  },
};

/** Metadata for the tool list in `locale`: own canonical and hreflang for every language. */
export function toolsIndexMetadata(locale: Locale): Metadata {
  const { title } = toolsIndexSeo[locale];
  const description = toolsIndexSeo[locale].description.replace("{count}", String(tools.length));
  const url = `${SITE_URL}${toolsIndexHref(locale)}`;
  const languages = Object.fromEntries(
    Object.entries(toolsIndexLanguagePaths()).map(([lang, path]) => [lang, `${SITE_URL}${path}`]),
  );
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url, languages },
    openGraph: {
      type: "website",
      locale: OG_LOCALE[locale],
      url,
      siteName: "ZapFile",
      title,
      description,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: ["/og-image.png"] },
  };
}
