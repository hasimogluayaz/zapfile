import type { Locale } from "./locales";

/** Home page title/description per language (`/`, `/tr`, `/de`, …). */
export const homeSeo: Record<Locale, { title: string; description: string }> = {
  en: {
    title: "ZapFile - Free Online File Tools | Fast, Private, Browser-Based",
    description:
      "Fast, free, and private file tools. Compress PDFs, convert images, generate QR codes and more. All processing happens in your browser — no uploads, no limits.",
  },
  tr: {
    title: "ZapFile – Ücretsiz Online PDF, Resim ve Dosya Araçları",
    description:
      "PDF birleştir, sıkıştır ve Word'e çevir; resim sıkıştır, dönüştür, arka planını sil; QR kod oluştur. 70 ücretsiz araç, üyelik yok. Araçların çoğu dosyanı yüklemeden tarayıcında çalışır.",
  },
  de: {
    title: "ZapFile – Kostenlose Online-Tools für PDF, Bilder und Dateien",
    description:
      "PDFs zusammenfügen, komprimieren und in Word umwandeln; Bilder komprimieren, konvertieren und freistellen; QR-Codes erstellen. 70 kostenlose Tools ohne Anmeldung. Die meisten laufen direkt im Browser, ohne Upload.",
  },
  fr: {
    title: "ZapFile – Outils en ligne gratuits pour PDF, images et fichiers",
    description:
      "Fusionnez, compressez et convertissez vos PDF en Word ; compressez, convertissez et détourez vos images ; créez des QR codes. 70 outils gratuits, sans inscription. La plupart fonctionnent dans votre navigateur, sans envoi de fichier.",
  },
  es: {
    title: "ZapFile – Herramientas online gratis para PDF, imágenes y archivos",
    description:
      "Une, comprime y convierte PDF a Word; comprime, convierte y quita el fondo de imágenes; crea códigos QR. 70 herramientas gratis y sin registro. La mayoría funcionan en tu navegador, sin subir archivos.",
  },
  pt: {
    title: "ZapFile – Ferramentas online grátis para PDF, imagens e arquivos",
    description:
      "Junte, comprima e converta PDF em Word; comprima, converta e remova o fundo de imagens; crie QR codes. 70 ferramentas grátis, sem cadastro. A maioria funciona no seu navegador, sem enviar arquivos.",
  },
  it: {
    title: "ZapFile – Strumenti online gratuiti per PDF, immagini e file",
    description:
      "Unisci, comprimi e converti PDF in Word; comprimi, converti e scontorna immagini; crea codici QR. 70 strumenti gratuiti, senza registrazione. La maggior parte funziona nel browser, senza caricare file.",
  },
  ja: {
    title: "ZapFile – 無料のオンライン PDF・画像・ファイルツール",
    description:
      "PDF の結合・圧縮・Word 変換、画像の圧縮・変換・背景削除、QR コード作成など 70 の無料ツール。登録不要。ほとんどのツールはファイルをアップロードせずブラウザ内で動作します。",
  },
  ar: {
    title: "ZapFile – أدوات مجانية عبر الإنترنت لملفات PDF والصور",
    description:
      "دمج ملفات PDF وضغطها وتحويلها إلى Word، وضغط الصور وتحويلها وإزالة خلفيتها، وإنشاء رموز QR. 70 أداة مجانية بلا تسجيل، ومعظمها يعمل في متصفحك دون رفع الملفات.",
  },
};

export const OG_LOCALE: Record<Locale, string> = {
  en: "en_US",
  tr: "tr_TR",
  de: "de_DE",
  fr: "fr_FR",
  es: "es_ES",
  pt: "pt_BR",
  it: "it_IT",
  ja: "ja_JP",
  ar: "ar_AR",
};
