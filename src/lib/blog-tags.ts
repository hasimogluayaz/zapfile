import type { Locale } from "./locales";

const ORDER: Locale[] = ["en", "tr", "de", "fr", "es", "pt", "it", "ja", "ar"];

/** Blog tag labels per language, in ORDER. Names of formats and products stay as they are. */
const TAGS: Record<string, string[]> = {
  api: ["api", "api", "api", "api", "api", "api", "api", "API", "واجهة برمجة"],
  colors: ["colors", "renkler", "Farben", "couleurs", "colores", "cores", "colori", "色", "الألوان"],
  comparison: ["comparison", "karşılaştırma", "Vergleich", "comparatif", "comparativa", "comparação", "confronto", "比較", "مقارنة"],
  compression: ["compression", "sıkıştırma", "Komprimierung", "compression", "compresión", "compressão", "compressione", "圧縮", "الضغط"],
  conversion: ["conversion", "dönüştürme", "Umwandlung", "conversion", "conversión", "conversão", "conversione", "変換", "التحويل"],
  crop: ["crop", "kırpma", "Zuschneiden", "recadrage", "recorte", "recorte", "ritaglio", "切り抜き", "القص"],
  css: ["css", "css", "css", "css", "css", "css", "css", "CSS", "CSS"],
  design: ["design", "tasarım", "Design", "design", "diseño", "design", "design", "デザイン", "التصميم"],
  developer: ["developer", "geliştirici", "Entwickler", "développeur", "desarrolladores", "desenvolvedores", "sviluppatori", "開発者", "المطوّرون"],
  documents: ["documents", "belgeler", "Dokumente", "documents", "documentos", "documentos", "documenti", "文書", "المستندات"],
  encoding: ["encoding", "kodlama", "Kodierung", "encodage", "codificación", "codificação", "codifica", "エンコード", "الترميز"],
  exif: ["exif", "exif", "exif", "exif", "exif", "exif", "exif", "EXIF", "EXIF"],
  explainer: ["explainer", "açıklama", "Erklärt", "explication", "explicación", "explicação", "spiegazione", "解説", "شرح"],
  favicon: ["favicon", "favicon", "Favicon", "favicon", "favicon", "favicon", "favicon", "ファビコン", "favicon"],
  formats: ["formats", "formatlar", "Formate", "formats", "formatos", "formatos", "formati", "形式", "الصيغ"],
  guide: ["guide", "rehber", "Anleitung", "guide", "guía", "guia", "guida", "ガイド", "دليل"],
  hash: ["hash", "hash", "Hash", "hash", "hash", "hash", "hash", "ハッシュ", "التجزئة"],
  "how-to": ["how-to", "nasıl yapılır", "Anleitung", "tutoriel", "cómo hacerlo", "passo a passo", "come fare", "使い方", "كيفية"],
  images: ["images", "resimler", "Bilder", "images", "imágenes", "imagens", "immagini", "画像", "الصور"],
  iphone: ["iphone", "iphone", "iPhone", "iphone", "iphone", "iphone", "iphone", "iPhone", "iPhone"],
  jpeg: ["jpeg", "jpeg", "JPEG", "jpeg", "jpeg", "jpeg", "jpeg", "JPEG", "JPEG"],
  json: ["json", "json", "JSON", "json", "json", "json", "json", "JSON", "JSON"],
  jwt: ["jwt", "jwt", "JWT", "jwt", "jwt", "jwt", "jwt", "JWT", "JWT"],
  marketing: ["marketing", "pazarlama", "Marketing", "marketing", "marketing", "marketing", "marketing", "マーケティング", "التسويق"],
  math: ["math", "matematik", "Mathematik", "maths", "matemáticas", "matemática", "matematica", "数学", "الرياضيات"],
  merge: ["merge", "birleştirme", "Zusammenfügen", "fusion", "unir", "juntar", "unione", "結合", "الدمج"],
  mobile: ["mobile", "mobil", "Mobil", "mobile", "móvil", "celular", "mobile", "モバイル", "الجوال"],
  passwords: ["passwords", "şifreler", "Passwörter", "mots de passe", "contraseñas", "senhas", "password", "パスワード", "كلمات المرور"],
  pdf: ["pdf", "pdf", "PDF", "pdf", "pdf", "pdf", "pdf", "PDF", "PDF"],
  performance: ["performance", "performans", "Leistung", "performance", "rendimiento", "desempenho", "prestazioni", "パフォーマンス", "الأداء"],
  privacy: ["privacy", "gizlilik", "Datenschutz", "confidentialité", "privacidad", "privacidade", "privacy", "プライバシー", "الخصوصية"],
  productivity: ["productivity", "verimlilik", "Produktivität", "productivité", "productividad", "produtividade", "produttività", "生産性", "الإنتاجية"],
  qr: ["qr", "qr", "QR", "qr", "qr", "qr", "qr", "QR", "QR"],
  regex: ["regex", "regex", "Regex", "regex", "regex", "regex", "regex", "正規表現", "التعبيرات النمطية"],
  resize: ["resize", "boyutlandırma", "Größe ändern", "redimensionnement", "redimensionar", "redimensionar", "ridimensionamento", "リサイズ", "تغيير الحجم"],
  roundup: ["roundup", "derleme", "Übersicht", "sélection", "recopilación", "seleção", "raccolta", "まとめ", "تجميعة"],
  scanner: ["scanner", "tarayıcı", "Scanner", "lecteur", "escáner", "leitor", "scanner", "スキャナー", "الماسح"],
  security: ["security", "güvenlik", "Sicherheit", "sécurité", "seguridad", "segurança", "sicurezza", "セキュリティ", "الأمان"],
  seo: ["seo", "seo", "SEO", "seo", "seo", "seo", "seo", "SEO", "SEO"],
  social: ["social", "sosyal medya", "Social Media", "réseaux sociaux", "redes sociales", "redes sociais", "social", "SNS", "التواصل الاجتماعي"],
  split: ["split", "ayırma", "Teilen", "division", "dividir", "dividir", "divisione", "分割", "التقسيم"],
  tools: ["tools", "araçlar", "Werkzeuge", "outils", "herramientas", "ferramentas", "strumenti", "ツール", "الأدوات"],
  tutorial: ["tutorial", "eğitim", "Tutorial", "tutoriel", "tutorial", "tutorial", "tutorial", "チュートリアル", "درس"],
  uuid: ["uuid", "uuid", "UUID", "uuid", "uuid", "uuid", "uuid", "UUID", "UUID"],
  watermark: ["watermark", "filigran", "Wasserzeichen", "filigrane", "marca de agua", "marca d'água", "filigrana", "透かし", "العلامة المائية"],
  web: ["web", "web", "Web", "web", "web", "web", "web", "Web", "الويب"],
  "web-development": ["web development", "web geliştirme", "Webentwicklung", "développement web", "desarrollo web", "desenvolvimento web", "sviluppo web", "Web 開発", "تطوير الويب"],
  webp: ["webp", "webp", "WebP", "webp", "webp", "webp", "webp", "WebP", "WebP"],
};

export function blogTagLabel(tag: string, locale: Locale): string {
  return TAGS[tag]?.[ORDER.indexOf(locale)] ?? tag;
}
