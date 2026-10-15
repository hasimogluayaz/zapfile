import type { Locale } from "./locales";

/** Blog index title and description per language (server metadata). */
export const blogIndexSeo: Record<Locale, { title: string; description: string }> = {
  en: { title: "Blog: PDF, Image & File Format Guides | ZapFile", description: "Tips, guides, and comparisons about image compression, PDF tools, file formats, and online privacy. Learn how to work with files faster and more privately." },
  tr: { title: "Blog: PDF, Görsel ve Dosya Formatı Rehberleri | ZapFile", description: "Resim sıkıştırma, PDF araçları, dosya formatları ve çevrim içi gizlilik üzerine ipuçları, rehberler ve karşılaştırmalar." },
  de: { title: "Blog: Anleitungen zu PDF, Bildern & Dateiformaten | ZapFile", description: "Tipps, Anleitungen und Vergleiche zu Bildkomprimierung, PDF-Werkzeugen, Dateiformaten und Datenschutz im Netz." },
  fr: { title: "Blog : guides PDF, images et formats de fichiers | ZapFile", description: "Conseils, guides et comparatifs sur la compression d'images, les outils PDF, les formats de fichiers et la confidentialité en ligne." },
  es: { title: "Blog: guías de PDF, imágenes y formatos de archivo | ZapFile", description: "Consejos, guías y comparativas sobre compresión de imágenes, herramientas PDF, formatos de archivo y privacidad online." },
  pt: { title: "Blog: guias de PDF, imagens e formatos de arquivo | ZapFile", description: "Dicas, guias e comparações sobre compressão de imagens, ferramentas de PDF, formatos de arquivo e privacidade online." },
  it: { title: "Blog: guide su PDF, immagini e formati di file | ZapFile", description: "Consigli, guide e confronti su compressione delle immagini, strumenti PDF, formati di file e privacy online." },
  ja: { title: "ブログ：PDF・画像・ファイル形式のガイド | ZapFile", description: "画像圧縮、PDF ツール、ファイル形式、オンラインのプライバシーに関するヒント・ガイド・比較記事。" },
  ar: { title: "المدونة: أدلة PDF والصور وصيغ الملفات | ZapFile", description: "نصائح وأدلة ومقارنات حول ضغط الصور وأدوات PDF وصيغ الملفات والخصوصية على الإنترنت." },
};
