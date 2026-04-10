import type { Locale } from "./locales";
import type { BlogLocaleEntry } from "./blog-post-locales-a";

/** Second half of blog posts — localized titles & descriptions. */
export const BLOG_LOCALE_B: Record<
  string,
  Partial<Record<Exclude<Locale, "en">, BlogLocaleEntry>>
> = {
  "html-to-pdf-from-url-or-snippet": {
    tr: {
      title: "HTML’den PDF: Parçalardan Faturaya",
      description:
        "Arşiv, makbuz ve dokümantasyon için HTML veya yapıştırılmış işaretlemeden PDF üretme.",
    },
    de: {
      title: "HTML zu PDF: von Snippets bis Rechnungen",
      description:
        "HTML oder eingefügtes Markup zuverlässig als PDF sichern — direkt im Browser.",
    },
    fr: {
      title: "HTML vers PDF : extraits et factures",
      description:
        "Convertir du HTML ou du code collé en PDF pour archivage et documentation.",
    },
    es: {
      title: "De HTML a PDF: fragmentos y facturas",
      description:
        "Convierte HTML o fragmentos pegados a PDF para archivo y documentación.",
    },
    pt: {
      title: "HTML para PDF: trechos e faturas",
      description:
        "Converter HTML ou trechos colados em PDF para arquivo e documentação.",
    },
    it: {
      title: "Da HTML a PDF: snippet e fatture",
      description:
        "Convertire HTML o markup incollato in PDF per archiviazione e documentazione.",
    },
    ja: {
      title: "HTML から PDF：スニペットから請求書まで",
      description:
        "貼り付けた HTML をブラウザで PDF にし、保存や共有に使う流れを紹介します。",
    },
  },
  "qr-code-scanner-vs-generator": {
    tr: {
      title: "QR Okuyucu ve QR Oluşturucu: Ne Zaman Hangisi?",
      description:
        "Kod üretmek ile görüntüden okumak arasındaki fark ve tipik iş akışları.",
    },
    de: {
      title: "QR-Scanner vs. QR-Generator: wann was?",
      description:
        "Codes erzeugen oder aus Bildern lesen — typische Workflows im Überblick.",
    },
    fr: {
      title: "Scanner QR vs générateur : quel usage ?",
      description:
        "Créer un code ou le lire depuis une image — workflows courants.",
    },
    es: {
      title: "Escáner QR frente a generador: cuándo usar cada uno",
      description:
        "Crear códigos o leerlos desde una imagen: flujos típicos.",
    },
    pt: {
      title: "Leitor de QR x gerador: quando usar cada um",
      description:
        "Criar códigos ou ler a partir de imagem — fluxos típicos.",
    },
    it: {
      title: "Scanner QR vs generatore: quando usare cosa",
      description:
        "Creare codici o leggerli da immagine: flussi tipici.",
    },
    ja: {
      title: "QR スキャナと QR 生成：使い分け",
      description:
        "コードを作る場合と画像から読み取る場合の典型ワークフローを整理します。",
    },
  },
  "browser-based-vs-cloud-pdf-tools": {
    tr: {
      title: "Tarayıcı Tabanlı ve Bulut PDF Araçları: 2026 Rehberi",
      description:
        "İşlemin nerede yapıldığı gizlilik, hız ve uyumluluk için ne anlama gelir?",
    },
    de: {
      title: "Browser- vs. Cloud-PDF-Tools: Guide 2026",
      description:
        "Wo Daten verarbeitet werden: Auswirkungen auf Privatsphäre, Tempo und Compliance.",
    },
    fr: {
      title: "Outils PDF navigateur vs cloud : guide 2026",
      description:
        "Lieu de traitement, confidentialité, vitesse et conformité.",
    },
    es: {
      title: "Herramientas PDF en el navegador frente a la nube (2026)",
      description:
        "Dónde se procesa el archivo y qué implica para privacidad y cumplimiento.",
    },
    pt: {
      title: "PDF no navegador x nuvem: guia 2026",
      description:
        "Onde o arquivo é processado e o impacto em privacidade e conformidade.",
    },
    it: {
      title: "PDF nel browser vs cloud: guida 2026",
      description:
        "Dove avviene l’elaborazione e cosa significa per privacy e conformità.",
    },
    ja: {
      title: "ブラウザ型とクラウド型の PDF ツール（2026年版）",
      description:
        "処理の場所がプライバシー・速度・コンプライアンスに与える違いを整理します。",
    },
  },
  "resize-images-for-instagram-and-web": {
    tr: {
      title: "Instagram, Web ve E-posta İçin Görüntü Boyutlandırma",
      description:
        "En-boy oranları, piksel boyutları ve Photoshop olmadan toplu yeniden boyutlandırma.",
    },
    de: {
      title: "Bilder für Instagram, Web und E-Mail skalieren",
      description:
        "Seitenverhältnisse, Pixelmaße und Batch-Resize ohne Photoshop.",
    },
    fr: {
      title: "Redimensionner pour Instagram, le web et l’e-mail",
      description:
        "Ratios, dimensions en pixels et redimensionnement sans Photoshop.",
    },
    es: {
      title: "Redimensionar imágenes para Instagram, web y correo",
      description:
        "Relaciones de aspecto, píxeles y cambios de tamaño sin Photoshop.",
    },
    pt: {
      title: "Redimensionar imagens para Instagram, web e e-mail",
      description:
        "Proporções, pixels e redimensionamento sem Photoshop.",
    },
    it: {
      title: "Ridimensionare immagini per Instagram, web ed e-mail",
      description:
        "Proporzioni, pixel e ridimensionamento senza Photoshop.",
    },
    ja: {
      title: "Instagram・Web・メール向けに画像サイズを合わせる",
      description:
        "アスペクト比・推奨ピクセル・一括リサイズの考え方をまとめます。",
    },
  },
  "json-formatter-why-developers-use-it": {
    tr: {
      title: "Geliştiriciler JSON Biçimlendiricileri Neden Kullanır?",
      description:
        "Güzel yazdırma, yapı doğrulama ve API yanıtlarını hızlıca hata ayıklama.",
    },
    de: {
      title: "Warum Entwickler JSON-Formatter nutzen",
      description:
        "Pretty-Print, Validierung und schnelles Debuggen von API-Antworten.",
    },
    fr: {
      title: "Pourquoi les développeurs utilisent des formateurs JSON",
      description:
        "Indentation, validation et débogage rapide des réponses API.",
    },
    es: {
      title: "Por qué los desarrolladores usan formateadores JSON",
      description:
        "Impresión legible, validación y depuración rápida de respuestas API.",
    },
    pt: {
      title: "Por que desenvolvedores usam formatadores JSON",
      description:
        "Pretty-print, validação e depuração rápida de respostas de API.",
    },
    it: {
      title: "Perché gli sviluppatori usano i formattatori JSON",
      description:
        "Indentazione, validazione e debug rapido delle risposte API.",
    },
    ja: {
      title: "開発者が JSON フォーマッタを使う理由",
      description:
        "整形・検証・API レスポンスの素早いデバッグに役立つ点を整理します。",
    },
  },
  "hash-generator-sha256-md5-explained": {
    tr: {
      title: "SHA-256 ve MD5: Dosya ve Metin İçin Hash",
      description:
        "İndirmeler için sağlama toplamları, tekilleştirme ve güvenlikte neden MD5 eskidi.",
    },
    de: {
      title: "SHA-256 vs. MD5: Hashes für Dateien und Text",
      description:
        "Prüfsummen, Duplikate erkennen und warum MD5 für Sicherheit veraltet ist.",
    },
    fr: {
      title: "SHA-256 et MD5 : hachage pour fichiers et texte",
      description:
        "Sommes de contrôle, déduplication et limites de MD5 pour la sécurité.",
    },
    es: {
      title: "SHA-256 frente a MD5: hashing para archivos y texto",
      description:
        "Checksums, deduplicación y por qué MD5 está obsoleto para seguridad.",
    },
    pt: {
      title: "SHA-256 x MD5: hashing para arquivos e texto",
      description:
        "Checksums, deduplicação e por que MD5 está ultrapassado para segurança.",
    },
    it: {
      title: "SHA-256 vs MD5: hash per file e testo",
      description:
        "Checksum, deduplicazione e perché MD5 non è adatto alla sicurezza.",
    },
    ja: {
      title: "SHA-256 と MD5：ファイルと文字列のハッシュ",
      description:
        "改ざん検知・重複検出と、セキュリティ用途で MD5 が不適切な理由を説明します。",
    },
  },
  "typing-speed-test-wpm-explained": {
    tr: {
      title: "Dakikadaki Kelime (WPM): İyi Sonuçlar Ne Anlama Gelir?",
      description:
        "Dakika başına kelime, doğruluk ve tarayıcı tabanlı pratik ile geliştirme.",
    },
    de: {
      title: "Tippgeschwindigkeit (WPM): was sind gute Werte?",
      description:
        "Wörter pro Minute, Genauigkeit und Training direkt im Browser.",
    },
    fr: {
      title: "Vitesse de frappe (WPM) : bons scores",
      description:
        "Mots par minute, précision et entraînement dans le navigateur.",
    },
    es: {
      title: "Velocidad de mecanografía (WPM): qué es un buen resultado",
      description:
        "Palabras por minuto, precisión y práctica en el navegador.",
    },
    pt: {
      title: "Velocidade de digitação (WPM): o que é um bom resultado",
      description:
        "Palavras por minuto, precisão e prática no navegador.",
    },
    it: {
      title: "Velocità di battitura (WPM): cos’è un buon punteggio",
      description:
        "Parole al minuto, precisione e pratica nel browser.",
    },
    ja: {
      title: "タイピング速度（WPM）：目安と練習法",
      description:
        "語数・精度の見方と、ブラウザでできる練習のヒントをまとめます。",
    },
  },
  "color-palette-from-image": {
    tr: {
      title: "Herhangi Bir Görüntüden Renk Paleti Çıkarma",
      description:
        "Fotoğraf ve ekran görüntülerinden baskın renkleri örnekleyerek tutarlı tasarımlar.",
    },
    de: {
      title: "Farbpaletten aus jedem Bild extrahieren",
      description:
        "Dominante Farben aus Fotos und Screenshots für konsistente Designs.",
    },
    fr: {
      title: "Extraire une palette de couleurs d’une image",
      description:
        "Échantillonner les couleurs dominantes pour des designs cohérents.",
    },
    es: {
      title: "Extraer una paleta de colores de cualquier imagen",
      description:
        "Muestrear colores dominantes para diseños coherentes.",
    },
    pt: {
      title: "Extrair paleta de cores de qualquer imagem",
      description:
        "Amostrar cores dominantes para designs coerentes.",
    },
    it: {
      title: "Estrarre una tavolozza da qualsiasi immagine",
      description:
        "Campionare i colori dominanti per design coerenti.",
    },
    ja: {
      title: "画像からカラーパレットを抽出する",
      description:
        "写真やスクショから主要色を拾い、統一感のある配色に活かす方法です。",
    },
  },
  "base-converter-decimal-hex-binary": {
    tr: {
      title: "Sayı Tabanı Dönüştürücü: Ondalık, Onaltılık, İkili, Sekizlik",
      description:
        "Programlama, hata ayıklama ve gömülü sistemler için tabanlar arası dönüşüm.",
    },
    de: {
      title: "Zahlenbasen umrechnen: Dezimal, Hex, Binär, Oktal",
      description:
        "Für Programmierung, Debugging und eingebettete Systeme — direkt im Browser.",
    },
    fr: {
      title: "Convertisseur de bases : décimal, hex, binaire, octal",
      description:
        "Pour le code, le débogage et l’embarqué — dans le navigateur.",
    },
    es: {
      title: "Conversor de bases: decimal, hexadecimal, binario, octal",
      description:
        "Para programación, depuración y sistemas embebidos en el navegador.",
    },
    pt: {
      title: "Conversor de bases: decimal, hex, binário, octal",
      description:
        "Para programação, depuração e sistemas embarcados no navegador.",
    },
    it: {
      title: "Convertitore di basi: decimale, hex, binario, ottale",
      description:
        "Per programmazione, debug e sistemi embedded nel browser.",
    },
    ja: {
      title: "基数変換：10・16・2・8 進数",
      description:
        "開発・デバッグ・組み込みで頻出する変換をブラウザですぐ行う用途向けです。",
    },
  },
  "css-minifier-faster-websites": {
    tr: {
      title: "Daha Hızlı Sayfalar İçin CSS Küçültme",
      description:
        "Üretim için CSS’ten boşluk ve yorumları kaldırma; kaynak kontrolünde orijinalleri saklama.",
    },
    de: {
      title: "CSS minifizieren für schnellere Ladezeiten",
      description:
        "Whitespace und Kommentare für Produktion entfernen — Originale versionieren.",
    },
    fr: {
      title: "Minification CSS pour des pages plus rapides",
      description:
        "Réduire CSS pour la production tout en gardant les sources propres.",
    },
    es: {
      title: "Minificar CSS para sitios más rápidos",
      description:
        "Quitar espacios y comentarios en producción y mantener fuentes bajo control de versiones.",
    },
    pt: {
      title: "Minificação de CSS para sites mais rápidos",
      description:
        "Remover espaços e comentários em produção e versionar os originais.",
    },
    it: {
      title: "Minificare il CSS per pagine più veloci",
      description:
        "Rimuovere spazi e commenti in produzione e tenere i sorgenti in repository.",
    },
    ja: {
      title: "高速化のための CSS ミニファイ",
      description:
        "本番向けに余白やコメントを削り、元ファイルはソース管理で管理する考え方です。",
    },
  },
  "audio-waveform-for-podcasts": {
    tr: {
      title: "Podcast ve Video İçin Ses Dalgası Görselleri",
      description:
        "Küçük resimler, sosyal klipler ve şov notları için PNG dalga formları üretin.",
    },
    de: {
      title: "Audio-Wellenformen für Podcasts und Video",
      description:
        "Wellenform-PNGs für Thumbnails, Social Clips und Shownotes erzeugen.",
    },
    fr: {
      title: "Images de forme d’onde pour podcasts et vidéo",
      description:
        "Générer des PNG de waveform pour vignettes et réseaux sociaux.",
    },
    es: {
      title: "Imágenes de forma de onda para podcasts y vídeo",
      description:
        "Generar PNG de onda para miniaturas y clips sociales.",
    },
    pt: {
      title: "Formas de onda de áudio para podcasts e vídeo",
      description:
        "Gerar PNG de waveform para thumbnails e redes sociais.",
    },
    it: {
      title: "Forme d’onda audio per podcast e video",
      description:
        "Creare PNG di waveform per miniature e clip social.",
    },
    ja: {
      title: "ポッドキャスト・動画向け波形画像",
      description:
        "サムネやSNS用に、音声から波形PNGを作る用途と手順を紹介します。",
    },
  },
  "ascii-art-from-photos": {
    tr: {
      title: "Fotoğraflardan ASCII Sanatı: Hafif ve Yaratıcı Grafikler",
      description:
        "Parlaklığı karakterlere eşleyerek terminal, README ve yaratıcı projeler için metin sanatı.",
    },
    de: {
      title: "ASCII-Kunst aus Fotos: leicht und kreativ",
      description:
        "Helligkeit in Zeichen umsetzen — für Terminal, READMEs und Retro-Optik.",
    },
    fr: {
      title: "ASCII art à partir de photos",
      description:
        "Mapper la luminosité vers des caractères pour README et projets créatifs.",
    },
    es: {
      title: "Arte ASCII desde fotos: gráficos ligeros",
      description:
        "Convertir brillo en caracteres para terminales, README y estética retro.",
    },
    pt: {
      title: "Arte ASCII a partir de fotos",
      description:
        "Mapear brilho para caracteres — README e estética retrô.",
    },
    it: {
      title: "ASCII art dalle foto: grafica leggera",
      description:
        "Mappare la luminosità sui caratteri per terminali, README e look retro.",
    },
    ja: {
      title: "写真から ASCII アートを作る",
      description:
        "明るさを文字に割り当て、README やターミナ表示向けの表現に使う例です。",
    },
  },
  "password-generator-length-and-symbols": {
    tr: {
      title: "Parola Oluşturucu: Uzunluk, Semboller ve Akılda Kalırlık",
      description:
        "2026’da parolalar ne kadar uzun olmalı; rastgele dizeler ile parola öbeği ne zaman tercih edilir?",
    },
    de: {
      title: "Passwortgenerator: Länge, Symbole, Merkbarkeit",
      description:
        "Wie lang Passwörter 2026 sein sollten und wann Passphrases sinnvoll sind.",
    },
    fr: {
      title: "Générateur de mots de passe : longueur et symboles",
      description:
        "Longueur recommandée en 2026 et phrases de passe vs chaînes aléatoires.",
    },
    es: {
      title: "Generador de contraseñas: longitud y símbolos",
      description:
        "Qué longitud usar en 2026 y cuándo preferir frases de contraseña.",
    },
    pt: {
      title: "Gerador de senhas: tamanho e símbolos",
      description:
        "Quão longas em 2026 e quando usar frases em vez de strings aleatórias.",
    },
    it: {
      title: "Generatore di password: lunghezza e simboli",
      description:
        "Lunghezze consigliate nel 2026 e quando usare passphrase casuali.",
    },
    ja: {
      title: "パスワード生成：長さ・記号・覚えやすさ",
      description:
        "2026年時点の長さの目安と、ランダム文字列とパスフレーズの使い分けです。",
    },
  },
  "regex-tester-debugging-patterns": {
    tr: {
      title: "Regex Test Aracı: Desenleri Güvenle Hata Ayıklama",
      description:
        "Örnek metin üzerinde düzenli ifadeleri deneyin; hassas günlükleri sunucuya göndermeden.",
    },
    de: {
      title: "Regex-Tester: Muster sicher ausprobieren",
      description:
        "Reguläre Ausdrücke an Beispieltext testen — ohne sensible Logs hochzuladen.",
    },
    fr: {
      title: "Testeur regex : déboguer sans envoyer de données",
      description:
        "Tester des motifs sur du texte d’exemple localement.",
    },
    es: {
      title: "Probador de regex: depura patrones con seguridad",
      description:
        "Prueba expresiones regulares en texto de ejemplo sin subir registros sensibles.",
    },
    pt: {
      title: "Testador de regex: depurar com segurança",
      description:
        "Teste expressões em texto de exemplo sem enviar logs sensíveis.",
    },
    it: {
      title: "Tester regex: debug in sicurezza",
      description:
        "Provare pattern su testo di esempio senza caricare log sensibili.",
    },
    ja: {
      title: "正規表現テスター：安全に試す",
      description:
        "サンプル文字列でパターンを検証し、機密ログをサーバーに送らない運用向けです。",
    },
  },
};
