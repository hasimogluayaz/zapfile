import type { Locale } from "./locales";

export type BlogLocaleEntry = { title: string; description: string };

/** First half of blog posts — localized titles & descriptions (article body stays EN). */
export const BLOG_LOCALE_A: Record<
  string,
  Partial<Record<Exclude<Locale, "en">, BlogLocaleEntry>>
> = {
  "how-to-compress-images-without-losing-quality": {
    tr: {
      title: "Kaliteyi Kaybetmeden Görüntüleri Nasıl Sıkıştırırsınız?",
      description:
        "Dosya boyutunu düşürürken görüntüyü net tutmanın pratik yolları: kayıplı/kayıpsız sıkıştırma, format seçimi ve tarayıcı tabanlı araçlar.",
    },
    de: {
      title: "Bilder komprimieren ohne sichtbaren Qualitätsverlust",
      description:
        "Praktische Techniken zur Dateigröße: verlustfrei vs. verlustbehaftet, Formate und browserbasierte Tools — ohne Upload.",
    },
    fr: {
      title: "Compresser des images sans perte visible de qualité",
      description:
        "Techniques pour réduire la taille tout en gardant une image nette : compression, formats et outils dans le navigateur.",
    },
    es: {
      title: "Cómo comprimir imágenes sin perder calidad",
      description:
        "Técnicas prácticas para reducir el tamaño manteniendo nitidez: compresión con y sin pérdida, formatos y herramientas en el navegador.",
    },
    pt: {
      title: "Como comprimir imagens sem perder qualidade",
      description:
        "Técnicas para reduzir o tamanho mantendo nitidez: compressão, formatos e ferramentas no navegador, com foco em privacidade.",
    },
    it: {
      title: "Come comprimere le immagini senza perdere qualità",
      description:
        "Tecniche pratiche per ridurre le dimensioni mantenendo nitidezza: compressione, formati e strumenti nel browser.",
    },
    ja: {
      title: "画質を落とさず画像を圧縮する方法",
      description:
        "可逆・非可逆圧縮、適した形式、ブラウザで完結するツールなど、実践的な画像最適化のコツを解説します。",
    },
  },
  "jpg-vs-png-vs-webp-which-format-to-use": {
    tr: {
      title: "JPG, PNG ve WebP: Hangi Görüntü Formatını Seçmelisiniz?",
      description:
        "Üç yaygın formatın karşılaştırması: ne zaman hangisini kullanmalı, tarayıcı desteği ve kalite ihtiyaçları.",
    },
    de: {
      title: "JPG vs. PNG vs. WebP: Welches Bildformat passt?",
      description:
        "Klare Entscheidungshilfe für Fotos, Grafiken und Web: Kompression, Transparenz und Browser-Support.",
    },
    fr: {
      title: "JPG, PNG ou WebP : quel format d’image choisir ?",
      description:
        "Comparaison claire : photos, graphismes, transparence et performances web.",
    },
    es: {
      title: "JPG frente a PNG y WebP: qué formato usar",
      description:
        "Cuándo conviene cada formato según el tipo de imagen, la transparencia y el rendimiento web.",
    },
    pt: {
      title: "JPG x PNG x WebP: qual formato usar",
      description:
        "Comparação prática para fotos, gráficos e web: transparência, tamanho e compatibilidade.",
    },
    it: {
      title: "JPG, PNG e WebP: quale formato scegliere",
      description:
        "Confronto pratico per foto, grafica e web: trasparenza, dimensioni e compatibilità.",
    },
    ja: {
      title: "JPG・PNG・WebP：どの画像形式を使うべきか",
      description:
        "写真・イラスト・透過の必要性に応じた選び方と、Web 表示でのトレードオフを整理します。",
    },
  },
  "how-to-merge-pdf-files-online-free": {
    tr: {
      title: "PDF Dosyalarını Ücretsiz ve Çevrimiçi Nasıl Birleştirirsiniz?",
      description:
        "Birden fazla PDF’yi tek dosyada birleştirme: ücretsiz yöntemler, gizlilik ve en hızlı tarayıcı tabanlı yaklaşım.",
    },
    de: {
      title: "PDFs kostenlos online zusammenführen",
      description:
        "Schritt für Schritt: mehrere PDFs verbinden, Reihenfolge prüfen und datenschutzfreundlich im Browser erledigen.",
    },
    fr: {
      title: "Fusionner des PDF en ligne gratuitement",
      description:
        "Guide étape par étape : combiner plusieurs fichiers, bonnes pratiques et outils dans le navigateur.",
    },
    es: {
      title: "Cómo unir PDF gratis en línea",
      description:
        "Guía paso a paso para combinar documentos, cuidar el orden y usar herramientas privadas en el navegador.",
    },
    pt: {
      title: "Como mesclar PDFs online grátis",
      description:
        "Passo a passo para juntar arquivos, conferir a ordem e priorizar ferramentas que processam localmente.",
    },
    it: {
      title: "Unire PDF online gratis",
      description:
        "Guida pratica: combinare documenti, controllare l’ordine e usare strumenti che elaborano nel browser.",
    },
    ja: {
      title: "PDF を無料でオンライン結合する方法",
      description:
        "複数の PDF を1つにまとめる手順、並べ替えのコツ、ブラウザ内で完結するプライバシー重視の方法を紹介します。",
    },
  },
  "best-free-online-file-tools-2025": {
    tr: {
      title: "2025’te En İyi Ücretsiz Çevrimiçi Dosya Araçları",
      description:
        "PDF, görüntü ve daha fazlası için seçilmiş ücretsiz araçlar: gizlilik, hız ve kullanım kolaylığı odaklı.",
    },
    de: {
      title: "Die besten kostenlosen Online-Dateitools 2025",
      description:
        "Kuratierte Liste für PDF, Bilder und mehr — mit Fokus auf Privatsphäre, Geschwindigkeit und ohne Zwang zur Anmeldung.",
    },
    fr: {
      title: "Meilleurs outils de fichiers gratuits en ligne en 2025",
      description:
        "PDF, images et utilitaires : critères de confidentialité, rapidité et simplicité.",
    },
    es: {
      title: "Mejores herramientas de archivos gratis en línea (2025)",
      description:
        "PDF, imágenes y utilidades: privacidad, velocidad y experiencia sin registros innecesarios.",
    },
    pt: {
      title: "Melhores ferramentas de arquivos online grátis em 2025",
      description:
        "PDF, imagens e utilitários com foco em privacidade, rapidez e pouca fricção.",
    },
    it: {
      title: "Migliori strumenti file online gratuiti nel 2025",
      description:
        "PDF, immagini e utilità: privacy, velocità e uso senza registrazioni forzate.",
    },
    ja: {
      title: "2025年版：無料のオンラインファイルツールおすすめ",
      description:
        "PDF・画像・ユーティリティを、プライバシーと速度の観点から厳選して紹介します。",
    },
  },
  "why-browser-based-tools-are-more-private": {
    tr: {
      title: "Tarayıcı Tabanlı Araçlar Bulut Alternatiflerinden Neden Daha Gizlidir?",
      description:
        "Dosya işleminin tarayıcıda nasıl yürüdüğü, buluta kıyasla gizlilik avantajı ve araç seçerken nelere bakmalısınız.",
    },
    de: {
      title: "Warum Browser-Tools datenschutzfreundlicher sind",
      description:
        "So funktioniert lokale Verarbeitung, welche Risiken Cloud-Tools mit sich bringen und woran Sie seriöse Anbieter erkennen.",
    },
    fr: {
      title: "Pourquoi les outils dans le navigateur protègent mieux la vie privée",
      description:
        "Traitement local, limites du cloud et critères pour choisir un outil sérieux.",
    },
    es: {
      title: "Por qué las herramientas en el navegador son más privadas",
      description:
        "Procesamiento local frente a la nube y señales de confianza al elegir una herramienta.",
    },
    pt: {
      title: "Por que ferramentas no navegador são mais privadas",
      description:
        "Processamento local versus nuvem e sinais de confiança na escolha da ferramenta.",
    },
    it: {
      title: "Perché gli strumenti nel browser sono più privati",
      description:
        "Elaborazione locale rispetto al cloud e criteri per scegliere strumenti affidabili.",
    },
    ja: {
      title: "ブラウザ型ツールがクラウドよりプライバシーに有利な理由",
      description:
        "ローカル処理の仕組み、クラウドのリスク、信頼できるサービスの見分け方を整理します。",
    },
  },
  "how-to-compress-pdf-on-iphone": {
    tr: {
      title: "iPhone’da PDF Nasıl Sıkıştırılır? (Ücretsiz ve Gizlilik Dostu)",
      description:
        "Safari uyumlu yöntemler, çevrimdışı seçenekler ve dosya boyutunu küçültürken nelere dikkat etmelisiniz.",
    },
    de: {
      title: "PDF auf dem iPhone komprimieren (kostenlos & privat)",
      description:
        "Safari-freundliche Wege, was offline geht und worauf Sie bei der Dateigröße achten sollten.",
    },
    fr: {
      title: "Compresser un PDF sur iPhone (gratuit et confidentiel)",
      description:
        "Options compatibles Safari, pièges à éviter et conseils confidentialité.",
    },
    es: {
      title: "Cómo comprimir un PDF en iPhone (gratis y privado)",
      description:
        "Opciones compatibles con Safari, qué evitar y cómo reducir el tamaño con tranquilidad.",
    },
    pt: {
      title: "Como comprimir PDF no iPhone (grátis e privado)",
      description:
        "Caminhos compatíveis com o Safari, armadilhas comuns e foco em privacidade.",
    },
    it: {
      title: "Come comprimere un PDF su iPhone (gratis e in privato)",
      description:
        "Percorsi adatti a Safari, errori da evitare e riduzione del peso del file in sicurezza.",
    },
    ja: {
      title: "iPhone で PDF を圧縮する方法（無料・プライバシー重視）",
      description:
        "Safari で使いやすい方法、オフラインの可否、サイズ削減時の注意点をまとめます。",
    },
  },
  "jpg-vs-webp-which-is-better": {
    tr: {
      title: "JPG mi WEBP mi: Web İçin Hangisi Daha İyi?",
      description:
        "JPEG ve WebP karşılaştırması: kalite, şeffaflık, tarayıcı desteği ve dönüştürme ipuçları.",
    },
    de: {
      title: "JPEG oder WebP: Was ist besser fürs Web?",
      description:
        "Vergleich von Qualität, Transparenz, Browser-Support und wann sich Konvertieren lohnt.",
    },
    fr: {
      title: "JPEG ou WebP : lequel choisir pour le web ?",
      description:
        "Qualité, transparence, compatibilité et conversion pratique.",
    },
    es: {
      title: "JPG frente a WebP: cuál es mejor para la web",
      description:
        "Calidad, transparencia, compatibilidad y cuándo conviene convertir.",
    },
    pt: {
      title: "JPG ou WebP: o que é melhor para a web",
      description:
        "Qualidade, transparência, compatibilidade e quando converter.",
    },
    it: {
      title: "JPEG o WebP: cosa è meglio per il web",
      description:
        "Qualità, trasparenza, compatibilità e quando conviene convertire.",
    },
    ja: {
      title: "JPG と WebP、Web ではどちらが良い？",
      description:
        "画質・透過・ブラウザ対応と、変換が有効な場面を比較します。",
    },
  },
  "what-is-qr-code-how-to-create": {
    tr: {
      title: "QR Kod Nedir ve Ücretsiz Nasıl Oluşturulur?",
      description:
        "QR kodların çalışma şekli, kullanım alanları ve uygulama yüklemeden güvenli oluşturma.",
    },
    de: {
      title: "Was ist ein QR-Code – und wie erstellt man ihn gratis?",
      description:
        "Funktionsweise, typische Einsätze und sichere Erstellung direkt im Browser.",
    },
    fr: {
      title: "Qu’est-ce qu’un QR code et comment le créer gratuitement ?",
      description:
        "Principe, usages courants et génération sans installation d’application.",
    },
    es: {
      title: "Qué es un código QR y cómo crearlo gratis",
      description:
        "Cómo funcionan, usos habituales y creación segura en el navegador.",
    },
    pt: {
      title: "O que é um QR Code e como criar um grátis",
      description:
        "Como funcionam, usos comuns e geração segura no navegador.",
    },
    it: {
      title: "Cos’è un codice QR e come crearlo gratis",
      description:
        "Funzionamento, casi d’uso e generazione sicura nel browser.",
    },
    ja: {
      title: "QRコードとは？無料で作る方法",
      description:
        "仕組み・用途・ブラウザで安全に作成する流れをわかりやすく説明します。",
    },
  },
  "how-to-merge-pdf-files-step-by-step": {
    tr: {
      title: "PDF Dosyalarını Çevrimiçi Birleştirme (Adım Adım)",
      description:
        "Birden fazla PDF’yi tek dosyada birleştirme: sıra, kontroller ve gizlilik odaklı araçlar.",
    },
    de: {
      title: "PDFs online zusammenführen – Schritt für Schritt",
      description:
        "Reihenfolge festlegen, Qualität prüfen und Tools wählen, die lokal arbeiten.",
    },
    fr: {
      title: "Fusionner des PDF en ligne (étape par étape)",
      description:
        "Ordre des fichiers, vérifications et outils respectueux de la confidentialité.",
    },
    es: {
      title: "Unir PDF en línea paso a paso",
      description:
        "Orden de archivos, comprobaciones y herramientas que priorizan la privacidad.",
    },
    pt: {
      title: "Mesclar PDFs online passo a passo",
      description:
        "Ordem dos arquivos, checagens e ferramentas com foco em privacidade.",
    },
    it: {
      title: "Unire PDF online passo dopo passo",
      description:
        "Ordine dei file, controlli e strumenti che elaborano in locale.",
    },
    ja: {
      title: "PDF をオンラインで結合する手順",
      description:
        "並べ替え、最終確認、ブラウザ内処理を選ぶ理由を整理します。",
    },
  },
  "how-to-split-pdf-extract-pages": {
    tr: {
      title: "PDF Bölme ve Sayfa Çıkarma",
      description:
        "Belirli sayfaları ayırma, e-posta ve arşiv için en iyi uygulamalar ve araçlar.",
    },
    de: {
      title: "PDF teilen und Seiten extrahieren",
      description:
        "Seiten gezielt ausgeben, vor dem Teilen prüfen und datenschutzfreundliche Tools nutzen.",
    },
    fr: {
      title: "Diviser un PDF et extraire des pages",
      description:
        "Isoler des pages pour l’e-mail ou l’archivage, bonnes pratiques et outils.",
    },
    es: {
      title: "Cómo dividir un PDF y extraer páginas",
      description:
        "Extraer páginas concretas para correo o archivo: buenas prácticas y herramientas.",
    },
    pt: {
      title: "Como dividir um PDF e extrair páginas",
      description:
        "Separar páginas para e-mail ou arquivo: boas práticas e ferramentas.",
    },
    it: {
      title: "Come dividere un PDF ed estrarre pagine",
      description:
        "Estrarre pagine per email o archiviazione: buone pratiche e strumenti.",
    },
    ja: {
      title: "PDF を分割してページを取り出す方法",
      description:
        "必要なページだけ送る・保存する際のコツと、ブラウザで使える手段を紹介します。",
    },
  },
  "free-pdf-tools-no-signup": {
    tr: {
      title: "Kayıt Gerektirmeyen Ücretsiz PDF Araçları: Nelere Dikkat Etmeli?",
      description:
        "Hesap zorunluluğu olmadan birleştirme, bölme ve sıkıştırma — gizlilik dostu siteleri nasıl ayırt edersiniz?",
    },
    de: {
      title: "Kostenlose PDF-Tools ohne Anmeldung",
      description:
        "Merge, Split und Kompression ohne Konto — woran Sie seriöse, datenschutzfreundliche Angebote erkennen.",
    },
    fr: {
      title: "Outils PDF gratuits sans inscription",
      description:
        "Fusion, division et compression sans compte : repères pour choisir des services sérieux.",
    },
    es: {
      title: "Herramientas PDF gratis sin registro",
      description:
        "Unir, dividir y comprimir sin cuenta: señales de sitios que respetan la privacidad.",
    },
    pt: {
      title: "Ferramentas PDF grátis sem cadastro",
      description:
        "Mesclar, dividir e comprimir sem conta: como identificar opções confiáveis.",
    },
    it: {
      title: "Strumenti PDF gratuiti senza registrazione",
      description:
        "Unire, dividere e comprimere senza account: come riconoscere servizi affidabili.",
    },
    ja: {
      title: "登録不要の無料 PDF ツールの選び方",
      description:
        "結合・分割・圧縮をアカウントなしで使う際、プライバシー面で見るべきポイントを整理します。",
    },
  },
  "compress-image-for-web-core-web-vitals": {
    tr: {
      title: "Core Web Vitals ve SEO İçin Görüntü Sıkıştırma",
      description:
        "Görüntü ağırlığının LCP üzerindeki etkisi ve kaliteyi koruyarak sıkıştırma stratejileri.",
    },
    de: {
      title: "Bilder für Core Web Vitals und SEO komprimieren",
      description:
        "Warum Bildgewicht LCP und Rankings beeinflusst und wie Sie Qualität und Größe balancieren.",
    },
    fr: {
      title: "Compresser les images pour le SEO et les Core Web Vitals",
      description:
        "Poids des images, impact sur le LCP et bonnes pratiques sans sacrifier la qualité.",
    },
    es: {
      title: "Comprimir imágenes para Core Web Vitals y SEO",
      description:
        "Peso de las imágenes, impacto en el LCP y buenas prácticas sin arruinar la calidad.",
    },
    pt: {
      title: "Comprimir imagens para Core Web Vitals e SEO",
      description:
        "Peso das imagens, impacto no LCP e boas práticas sem perder qualidade.",
    },
    it: {
      title: "Comprimere le immagini per Core Web Vitals e SEO",
      description:
        "Peso delle immagini, impatto sul LCP e buone pratiche senza rovinare la qualità.",
    },
    ja: {
      title: "Core Web Vitals と SEO のための画像圧縮",
      description:
        "画像の重さが LCP に与える影響と、品質を保ちながら軽量化する考え方をまとめます。",
    },
  },
  "remove-pdf-metadata-privacy": {
    tr: {
      title: "PDF ve Görsellerden Üst Veriyi Kaldırmalı mısınız?",
      description:
        "Yazar adları, yazılım sürümleri ve EXIF: ne sızar ve üst veriyi nasıl temizlersiniz?",
    },
    de: {
      title: "Metadaten aus PDFs und Bildern entfernen?",
      description:
        "Autoren, EXIF und Softwareinfos: welche Risiken bestehen und wie Sie Daten bereinigen.",
    },
    fr: {
      title: "Faut-il supprimer les métadonnées des PDF et images ?",
      description:
        "Auteurs, EXIF et fuites possibles : comment inspecter et nettoyer avant partage.",
    },
    es: {
      title: "¿Debes quitar metadatos de PDF e imágenes?",
      description:
        "Autores, EXIF y riesgos al compartir: cómo inspeccionar y limpiar antes de publicar.",
    },
    pt: {
      title: "Remover metadados de PDFs e imagens?",
      description:
        "Autores, EXIF e riscos ao compartilhar: como inspecionar e limpar antes de publicar.",
    },
    it: {
      title: "Rimuovere i metadati da PDF e immagini?",
      description:
        "Autori, EXIF e rischi di condivisione: come controllare e ripulire prima di pubblicare.",
    },
    ja: {
      title: "PDF や画像からメタデータを消すべき？",
      description:
        "著者名・EXIF などの漏えいリスクと、公開前に確認・削除する手順を解説します。",
    },
  },
  "jwt-tokens-explained-developers": {
    tr: {
      title: "JWT Jetonları (Geliştiriciler İçin)",
      description:
        "JSON Web Token yapısı, yerel çözümleme ve güvenlik için dikkat edilmesi gerekenler.",
    },
    de: {
      title: "JWTs erklärt (für Entwickler)",
      description:
        "Aufbau von JSON Web Tokens, lokales Dekodieren und warum Signaturprüfung entscheidend ist.",
    },
    fr: {
      title: "Les JWT expliqués (pour développeurs)",
      description:
        "Structure, décodage local et pièges de sécurité courants.",
    },
    es: {
      title: "Tokens JWT explicados (para desarrolladores)",
      description:
        "Estructura, decodificación local y advertencias de seguridad habituales.",
    },
    pt: {
      title: "JWT explicado (para desenvolvedores)",
      description:
        "Estrutura, decodificação local e armadilhas comuns de segurança.",
    },
    it: {
      title: "JWT spiegati (per sviluppatori)",
      description:
        "Struttura, decodifica locale e errori di sicurezza frequenti.",
    },
    ja: {
      title: "JWT を解説（開発者向け）",
      description:
        "構造・ローカルでのデコード・署名検証の重要性について整理します。",
    },
  },
  "uuid-vs-nanoid": {
    tr: {
      title: "UUID ve Nanoid: Uygulama ve API’ler İçin Kimlikler",
      description:
        "Standart UUID ne zaman kullanılır, URL güvenli kısa kimlikler ne zaman tercih edilir ve yerel üretim.",
    },
    de: {
      title: "UUID vs. Nanoid: IDs für Apps und APIs",
      description:
        "Wann Standard-UUIDs passen, wann kürzere URL-sichere IDs sinnvoll sind und lokale Generierung.",
    },
    fr: {
      title: "UUID vs Nanoid : identifiants pour apps et API",
      description:
        "Interopérabilité, IDs courts et génération locale.",
    },
    es: {
      title: "UUID frente a Nanoid: IDs para apps y APIs",
      description:
        "Cuándo usar UUID estándar, cuándo IDs cortos y generación local.",
    },
    pt: {
      title: "UUID x Nanoid: IDs para apps e APIs",
      description:
        "Quando usar UUID padrão, quando IDs curtos e geração local.",
    },
    it: {
      title: "UUID vs Nanoid: ID per app e API",
      description:
        "Quando usare UUID standard, quando ID corti e generazione locale.",
    },
    ja: {
      title: "UUID と Nanoid：アプリと API の ID 設計",
      description:
        "標準 UUID を使う場面、短い URL 安全 ID が向く場面、ローカル生成の利点を整理します。",
    },
  },
};
