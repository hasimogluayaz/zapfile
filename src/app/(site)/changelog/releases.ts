import type { Locale } from "@/lib/locales";

type Text = Record<Locale, string>;
export type ReleaseItem = { type: "new" | "improved" | "fixed"; text: Text };
export type Release = { version: string; date: Text; latest?: boolean; items: ReleaseItem[] };

export const changelogCopy: Record<"title" | "subtitle" | "latest" | "new" | "improved" | "fixed" | "footer" | "github", Text> = {
  title: { en: "Changelog", tr: "Yenilikler", de: "Änderungsprotokoll", fr: "Nouveautés", es: "Novedades", pt: "Novidades", it: "Novità", ja: "更新履歴", ar: "سجل التغييرات" },
  subtitle: {
    en: "New tools, improvements and fixes in every release.",
    tr: "Her sürümdeki yeni araçlar, iyileştirmeler ve düzeltmeler.",
    de: "Neue Werkzeuge, Verbesserungen und Fehlerbehebungen in jeder Version.",
    fr: "Nouveaux outils, améliorations et corrections de chaque version.",
    es: "Nuevas herramientas, mejoras y correcciones en cada versión.",
    pt: "Novas ferramentas, melhorias e correções em cada versão.",
    it: "Nuovi strumenti, miglioramenti e correzioni in ogni versione.",
    ja: "各リリースの新機能、改善点、修正点。",
    ar: "الأدوات الجديدة والتحسينات والإصلاحات في كل إصدار.",
  },
  latest: { en: "Latest", tr: "En yeni", de: "Neueste", fr: "Dernière", es: "Última", pt: "Mais recente", it: "Ultima", ja: "最新", ar: "الأحدث" },
  new: { en: "New", tr: "Yeni", de: "Neu", fr: "Nouveau", es: "Nuevo", pt: "Novo", it: "Nuovo", ja: "新機能", ar: "جديد" },
  improved: { en: "Improved", tr: "İyileştirme", de: "Verbessert", fr: "Amélioré", es: "Mejorado", pt: "Melhorado", it: "Migliorato", ja: "改善", ar: "تحسين" },
  fixed: { en: "Fixed", tr: "Düzeltme", de: "Behoben", fr: "Corrigé", es: "Corregido", pt: "Corrigido", it: "Corretto", ja: "修正", ar: "إصلاح" },
  footer: {
    en: "ZapFile is updated continuously. The full history is on",
    tr: "ZapFile sürekli güncellenir. Tüm geçmiş:",
    de: "ZapFile wird laufend aktualisiert. Die vollständige Historie gibt es auf",
    fr: "ZapFile est mis à jour en continu. L'historique complet est sur",
    es: "ZapFile se actualiza continuamente. El historial completo está en",
    pt: "O ZapFile é atualizado continuamente. O histórico completo está no",
    it: "ZapFile viene aggiornato di continuo. La cronologia completa è su",
    ja: "ZapFile は継続的に更新されています。すべての履歴は次の場所で確認できます：",
    ar: "يُحدَّث ZapFile باستمرار. السجل الكامل متاح على",
  },
  github: { en: "GitHub", tr: "GitHub", de: "GitHub", fr: "GitHub", es: "GitHub", pt: "GitHub", it: "GitHub", ja: "GitHub", ar: "GitHub" },
};

const october2026: Text = { en: "October 2026", tr: "Ekim 2026", de: "Oktober 2026", fr: "Octobre 2026", es: "Octubre de 2026", pt: "Outubro de 2026", it: "Ottobre 2026", ja: "2026年10月", ar: "أكتوبر 2026" };

export const releases: Release[] = [
  {
    version: "v2.1.0",
    date: october2026,
    latest: true,
    items: [
      {
        type: "new",
        text: {
          en: "Every tool now has its own page in Turkish, German and French, and the whole interface is fully translated into all 9 languages",
          tr: "Her aracın artık Türkçe, Almanca ve Fransızca kendi sayfası var; arayüzün tamamı 9 dilin hepsine eksiksiz çevrildi",
          de: "Jedes Werkzeug hat jetzt eine eigene Seite auf Deutsch, Türkisch und Französisch, und die gesamte Oberfläche ist vollständig in alle 9 Sprachen übersetzt",
          fr: "Chaque outil a désormais sa propre page en français, turc et allemand, et toute l'interface est entièrement traduite dans les 9 langues",
          es: "Cada herramienta tiene ahora su propia página en turco, alemán y francés, y toda la interfaz está traducida por completo a los 9 idiomas",
          pt: "Cada ferramenta agora tem sua própria página em turco, alemão e francês, e toda a interface está totalmente traduzida para os 9 idiomas",
          it: "Ogni strumento ha ora una propria pagina in turco, tedesco e francese, e l'intera interfaccia è tradotta completamente in tutte le 9 lingue",
          ja: "すべてのツールにトルコ語・ドイツ語・フランス語の専用ページができ、画面表示が 9 言語すべてに完全翻訳されました",
          ar: "أصبح لكل أداة صفحة خاصة بالتركية والألمانية والفرنسية، وتُرجمت الواجهة بالكامل إلى اللغات التسع جميعها",
        },
      },
      {
        type: "new",
        text: {
          en: "Word, Excel, PowerPoint and HTML to PDF in seconds: fast mode converts on our server and deletes the file right after; private mode converts in your browser",
          tr: "Word, Excel, PowerPoint ve HTML'den PDF'e saniyeler içinde: hızlı mod sunucumuzda çevirip dosyayı hemen siler, gizli mod tarayıcınızda çevirir",
          de: "Word, Excel, PowerPoint und HTML in Sekunden zu PDF: Der schnelle Modus wandelt auf unserem Server um und löscht die Datei sofort, der private Modus wandelt im Browser um",
          fr: "Word, Excel, PowerPoint et HTML en PDF en quelques secondes : le mode rapide convertit sur notre serveur et supprime le fichier aussitôt, le mode privé convertit dans votre navigateur",
          es: "Word, Excel, PowerPoint y HTML a PDF en segundos: el modo rápido convierte en nuestro servidor y borra el archivo al momento; el modo privado convierte en tu navegador",
          pt: "Word, Excel, PowerPoint e HTML para PDF em segundos: o modo rápido converte no nosso servidor e apaga o arquivo logo em seguida; o modo privado converte no seu navegador",
          it: "Da Word, Excel, PowerPoint e HTML a PDF in pochi secondi: la modalità veloce converte sul nostro server ed elimina subito il file, quella privata converte nel browser",
          ja: "Word・Excel・PowerPoint・HTML を数秒で PDF に。高速モードは当社サーバーで変換して直後にファイルを削除、プライベートモードはブラウザ内で変換します",
          ar: "تحويل Word وExcel وPowerPoint وHTML إلى PDF في ثوانٍ: الوضع السريع يحوّل على خادمنا ويحذف الملف فورًا، والوضع الخاص يحوّل داخل متصفحك",
        },
      },
      {
        type: "improved",
        text: {
          en: "PDF to Word keeps designed pages exactly as they are (new \"Layout\" option) and now carries over photos and logos",
          tr: "PDF'den Word'e tasarımlı sayfaları olduğu gibi korur (yeni \"Düzen\" seçeneği), fotoğraf ve logolar da artık aktarılıyor",
          de: "PDF zu Word behält gestaltete Seiten exakt bei (neue Option „Layout“) und übernimmt jetzt auch Fotos und Logos",
          fr: "PDF en Word conserve les pages mises en forme à l'identique (nouvelle option « Mise en page ») et reprend désormais photos et logos",
          es: "PDF a Word conserva tal cual las páginas diseñadas (nueva opción «Diseño») y ahora incluye fotos y logotipos",
          pt: "PDF para Word mantém as páginas com design exatamente como são (nova opção \"Layout\") e agora inclui fotos e logos",
          it: "PDF in Word mantiene identiche le pagine grafiche (nuova opzione «Layout») e ora riporta anche foto e loghi",
          ja: "PDF→Word でデザインされたページをそのまま再現（新しい「レイアウト」オプション）。写真やロゴも引き継がれるようになりました",
          ar: "تحويل PDF إلى Word يحافظ على الصفحات المصمَّمة كما هي (خيار «التخطيط» الجديد)، وينقل الآن الصور والشعارات",
        },
      },
      {
        type: "fixed",
        text: {
          en: "PDF to Excel reads numbers like 1.150,50 and 18.000 ₺ correctly",
          tr: "PDF'den Excel'e 1.150,50 ve 18.000 ₺ gibi sayıları doğru okuyor",
          de: "PDF zu Excel liest Zahlen wie 1.150,50 und 18.000 € korrekt",
          fr: "PDF en Excel lit correctement les nombres comme 1.150,50 ou 18.000 €",
          es: "PDF a Excel lee correctamente números como 1.150,50 y 18.000 €",
          pt: "PDF para Excel lê corretamente números como 1.150,50 e R$ 18.000",
          it: "PDF in Excel legge correttamente numeri come 1.150,50 e 18.000 €",
          ja: "PDF→Excel で 1.150,50 や 18.000 € のような数値を正しく読み取るようになりました",
          ar: "تحويل PDF إلى Excel يقرأ الأرقام مثل 1.150,50 و18.000 € بشكل صحيح",
        },
      },
    ],
  },
  {
    version: "v2.0.0",
    date: october2026,
    items: [
      {
        type: "new",
        text: {
          en: "New PDF tools: PDF to Word, Excel, PowerPoint and Markdown, Organize, Watermark, Sign, Crop, Compare, Redact, Fill Form, OCR and Repair",
          tr: "Yeni PDF araçları: PDF'den Word, Excel, PowerPoint ve Markdown'a; Düzenle, Filigran, İmzala, Kırp, Karşılaştır, Karart, Form Doldur, OCR ve Onar",
          de: "Neue PDF-Werkzeuge: PDF zu Word, Excel, PowerPoint und Markdown, Organisieren, Wasserzeichen, Unterschreiben, Zuschneiden, Vergleichen, Schwärzen, Formulare, OCR und Reparieren",
          fr: "Nouveaux outils PDF : PDF en Word, Excel, PowerPoint et Markdown, Organiser, Filigrane, Signer, Rogner, Comparer, Caviarder, Remplir un formulaire, OCR et Réparer",
          es: "Nuevas herramientas PDF: PDF a Word, Excel, PowerPoint y Markdown, Organizar, Marca de agua, Firmar, Recortar, Comparar, Censurar, Rellenar formularios, OCR y Reparar",
          pt: "Novas ferramentas de PDF: PDF para Word, Excel, PowerPoint e Markdown, Organizar, Marca d'água, Assinar, Recortar, Comparar, Ocultar dados, Preencher formulário, OCR e Reparar",
          it: "Nuovi strumenti PDF: da PDF a Word, Excel, PowerPoint e Markdown, Organizza, Filigrana, Firma, Ritaglia, Confronta, Oscura, Compila modulo, OCR e Ripara",
          ja: "新しい PDF ツール：PDF→Word・Excel・PowerPoint・Markdown、整理、透かし、署名、切り抜き、比較、墨消し、フォーム入力、OCR、修復",
          ar: "أدوات PDF جديدة: من PDF إلى Word وExcel وPowerPoint وMarkdown، والتنظيم، والعلامة المائية، والتوقيع، والقص، والمقارنة، والتنقيح، وتعبئة النماذج، وOCR، والإصلاح",
        },
      },
      {
        type: "new",
        text: {
          en: "Background remover with AI that runs entirely in your browser, with brushes to fix edges and new backgrounds",
          tr: "Tamamen tarayıcınızda çalışan yapay zekâlı arka plan kaldırıcı; kenarları düzeltmek için fırçalar ve yeni arka planlar",
          de: "Hintergrundentferner mit KI, der komplett im Browser läuft, mit Pinseln zum Nachbessern und neuen Hintergründen",
          fr: "Suppression d'arrière-plan par IA entièrement dans votre navigateur, avec pinceaux de retouche et nouveaux arrière-plans",
          es: "Quitar fondo con IA que funciona por completo en tu navegador, con pinceles para retocar bordes y nuevos fondos",
          pt: "Removedor de fundo com IA que roda inteiramente no seu navegador, com pincéis para ajustar bordas e novos fundos",
          it: "Rimozione dello sfondo con IA che funziona interamente nel browser, con pennelli per ritoccare i bordi e nuovi sfondi",
          ja: "ブラウザ内だけで動く AI 背景削除。境界を直すブラシや新しい背景にも対応",
          ar: "إزالة الخلفية بالذكاء الاصطناعي تعمل بالكامل داخل متصفحك، مع فُرَش لتصحيح الحواف وخلفيات جديدة",
        },
      },
      {
        type: "new",
        text: {
          en: "New design with light and dark themes; drop any file on the home page to see which tools can open it",
          tr: "Açık ve koyu temalı yeni tasarım; ana sayfaya herhangi bir dosyayı bırakınca onu açabilen araçlar listelenir",
          de: "Neues Design mit hellem und dunklem Modus; Datei auf die Startseite ziehen und sehen, welche Werkzeuge sie öffnen können",
          fr: "Nouveau design avec thèmes clair et sombre ; déposez un fichier sur la page d'accueil pour voir quels outils peuvent l'ouvrir",
          es: "Nuevo diseño con temas claro y oscuro; suelta cualquier archivo en la página de inicio para ver qué herramientas pueden abrirlo",
          pt: "Novo design com temas claro e escuro; solte qualquer arquivo na página inicial para ver quais ferramentas podem abri-lo",
          it: "Nuovo design con tema chiaro e scuro; trascina un file nella home per vedere quali strumenti possono aprirlo",
          ja: "ライト／ダークテーマの新デザイン。ホームにファイルをドロップすると、開けるツールが表示されます",
          ar: "تصميم جديد بسمتين فاتحة وداكنة؛ أفلت أي ملف في الصفحة الرئيسية لترى الأدوات التي يمكنها فتحه",
        },
      },
      {
        type: "improved",
        text: {
          en: "Faster, sharper image engine for compressing, resizing and converting, and real AES-256 password protection for PDFs",
          tr: "Sıkıştırma, boyutlandırma ve dönüştürme için daha hızlı ve net resim motoru; PDF'ler için gerçek AES-256 şifreleme",
          de: "Schnellere, schärfere Bild-Engine zum Komprimieren, Skalieren und Umwandeln sowie echter AES-256-Passwortschutz für PDFs",
          fr: "Moteur d'images plus rapide et plus net pour compresser, redimensionner et convertir, et vraie protection AES-256 des PDF",
          es: "Motor de imágenes más rápido y nítido para comprimir, redimensionar y convertir, y protección real AES-256 para PDF",
          pt: "Motor de imagens mais rápido e nítido para comprimir, redimensionar e converter, e proteção real AES-256 para PDFs",
          it: "Motore immagini più veloce e nitido per comprimere, ridimensionare e convertire, e vera protezione AES-256 per i PDF",
          ja: "圧縮・リサイズ・変換のための、より速く鮮明な画像エンジン。PDF には本格的な AES-256 パスワード保護",
          ar: "محرك صور أسرع وأوضح للضغط وتغيير الحجم والتحويل، وحماية حقيقية بكلمة مرور AES-256 لملفات PDF",
        },
      },
    ],
  },
  {
    version: "v1.0 – v1.4",
    date: { en: "2025 – 2026", tr: "2025 – 2026", de: "2025 – 2026", fr: "2025 – 2026", es: "2025 – 2026", pt: "2025 – 2026", it: "2025 – 2026", ja: "2025年 – 2026年", ar: "2025 – 2026" },
    items: [
      {
        type: "new",
        text: {
          en: "First release: free file tools for PDF, images, text and developers, all without sign-up",
          tr: "İlk sürüm: PDF, resim, metin ve geliştiriciler için üyeliksiz ücretsiz dosya araçları",
          de: "Erste Version: kostenlose Datei-Werkzeuge für PDF, Bilder, Text und Entwickler, ohne Anmeldung",
          fr: "Première version : outils de fichiers gratuits pour PDF, images, texte et développeurs, sans inscription",
          es: "Primera versión: herramientas gratuitas para PDF, imágenes, texto y desarrolladores, sin registro",
          pt: "Primeira versão: ferramentas gratuitas para PDF, imagens, texto e desenvolvedores, sem cadastro",
          it: "Prima versione: strumenti gratuiti per PDF, immagini, testo e sviluppatori, senza registrazione",
          ja: "最初のリリース：PDF・画像・テキスト・開発者向けの無料ツール。登録不要",
          ar: "الإصدار الأول: أدوات ملفات مجانية لملفات PDF والصور والنصوص والمطوّرين، دون تسجيل",
        },
      },
      {
        type: "new",
        text: {
          en: "Turkish, German and French, then Spanish, Portuguese, Italian, Japanese and Arabic",
          tr: "Önce Türkçe, Almanca ve Fransızca; ardından İspanyolca, Portekizce, İtalyanca, Japonca ve Arapça",
          de: "Türkisch, Deutsch und Französisch, danach Spanisch, Portugiesisch, Italienisch, Japanisch und Arabisch",
          fr: "Turc, allemand et français, puis espagnol, portugais, italien, japonais et arabe",
          es: "Turco, alemán y francés, y después español, portugués, italiano, japonés y árabe",
          pt: "Turco, alemão e francês, depois espanhol, português, italiano, japonês e árabe",
          it: "Turco, tedesco e francese, poi spagnolo, portoghese, italiano, giapponese e arabo",
          ja: "トルコ語・ドイツ語・フランス語、続いてスペイン語・ポルトガル語・イタリア語・日本語・アラビア語に対応",
          ar: "التركية والألمانية والفرنسية، ثم الإسبانية والبرتغالية والإيطالية واليابانية والعربية",
        },
      },
      {
        type: "new",
        text: {
          en: "Blog with guides on file formats and privacy; install ZapFile as an app on any device",
          tr: "Dosya formatları ve gizlilik üzerine rehberler içeren blog; ZapFile'ı her cihaza uygulama olarak yükleyebilme",
          de: "Blog mit Anleitungen zu Dateiformaten und Datenschutz; ZapFile lässt sich auf jedem Gerät als App installieren",
          fr: "Blog avec des guides sur les formats de fichiers et la confidentialité ; ZapFile s'installe comme une application sur tout appareil",
          es: "Blog con guías sobre formatos de archivo y privacidad; instala ZapFile como app en cualquier dispositivo",
          pt: "Blog com guias sobre formatos de arquivo e privacidade; instale o ZapFile como app em qualquer dispositivo",
          it: "Blog con guide su formati di file e privacy; ZapFile si installa come app su qualsiasi dispositivo",
          ja: "ファイル形式やプライバシーに関するガイドを掲載したブログ。ZapFile はどの端末にもアプリとしてインストール可能",
          ar: "مدونة بأدلة حول صيغ الملفات والخصوصية؛ ويمكن تثبيت ZapFile كتطبيق على أي جهاز",
        },
      },
    ],
  },
];
