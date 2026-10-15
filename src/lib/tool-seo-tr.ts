/**
 * Search titles and descriptions for the Turkish tool pages (`/tr/...`).
 * Written for what people type into Google in Turkish ("pdf birleştir",
 * "word pdf çevir"); keep titles under ~60 characters and descriptions under
 * ~155. Office → PDF pages must not promise "no upload": their fast mode
 * converts on our server.
 */
export const toolSeoTr: Record<string, { title: string; description: string }> = {
  "merge-pdf": {
    title: "PDF Birleştir – Ücretsiz Online PDF Birleştirme",
    description:
      "PDF dosyalarını saniyeler içinde tek dosyada birleştirin. Sürükleyip sıralayın, ücretsiz indirin. Üyelik yok, filigran yok; dosyalarınız cihazınızdan çıkmaz.",
  },
  "split-pdf": {
    title: "PDF Ayır – PDF Sayfalarını Ücretsiz Bölme",
    description:
      "PDF'i sayfalara ayırın veya istediğiniz sayfaları ayrı dosya olarak çıkarın. Ücretsiz, üyeliksiz ve tamamen tarayıcınızda çalışır.",
  },
  "pdf-to-images": {
    title: "PDF'i JPG'ye Çevir – PDF'den Resme Ücretsiz",
    description:
      "PDF sayfalarını yüksek kaliteli JPG veya PNG resimlere dönüştürün. Tüm sayfaları ZIP olarak indirin. Ücretsiz, hızlı ve gizli.",
  },
  "organize-pdf": {
    title: "PDF Sayfa Düzenle – Sırala, Sil, Döndür",
    description:
      "PDF sayfalarını sürükleyerek yeniden sıralayın, gereksiz sayfaları silin veya döndürün. Ücretsiz, üyeliksiz, dosyanız yüklenmez.",
  },
  "rotate-pdf": {
    title: "PDF Döndür – PDF Sayfalarını Ücretsiz Çevir",
    description:
      "Ters veya yan duran PDF sayfalarını 90°, 180° ya da 270° döndürün; tek sayfa veya tüm belge. Ücretsiz ve tarayıcınızda.",
  },
  "fill-pdf": {
    title: "PDF Form Doldur – Online ve Ücretsiz",
    description:
      "Doldurulabilir PDF formlarını tarayıcınızda doldurun: metin alanları, onay kutuları, seçenekler. Türkçe karakter destekli, yüklemesiz.",
  },
  "sign-pdf": {
    title: "PDF İmzala – Ücretsiz Online E-İmza Ekle",
    description:
      "PDF'e imzanızı çizin, yazın veya resim olarak ekleyin; sayfada istediğiniz yere yerleştirin. Ücretsiz, üyeliksiz ve gizli.",
  },
  "watermark-pdf": {
    title: "PDF'e Filigran Ekle – Yazı veya Logo",
    description:
      "PDF sayfalarına yazı ya da logo filigranı ekleyin; saydamlık, açı ve konumu ayarlayın. Ücretsiz, tarayıcınızda çalışır.",
  },
  "crop-pdf": {
    title: "PDF Kırp – PDF Kenar Boşluklarını Kes",
    description:
      "PDF sayfalarının kenar boşluklarını kırpın veya istediğiniz alanı seçin. Tüm sayfalara ya da tek sayfaya uygulayın. Ücretsiz ve gizli.",
  },
  "compare-pdf": {
    title: "PDF Karşılaştır – İki PDF Arasındaki Farklar",
    description:
      "İki PDF belgesini yan yana karşılaştırın; eklenen, silinen ve değişen metinleri renkli olarak görün. Ücretsiz, dosyalar yüklenmez.",
  },
  "pdf-page-numbers": {
    title: "PDF Sayfa Numarası Ekle – Ücretsiz Online",
    description:
      "PDF'e sayfa numarası ekleyin; konumu ve biçimi seçin. Ücretsiz, üyeliksiz ve tarayıcınızda çalışır.",
  },
  "compress-image": {
    title: "Resim Boyutu Küçült – Fotoğraf Sıkıştırma",
    description:
      "JPG, PNG ve WebP resimlerin dosya boyutunu kalite ayarıyla küçültün. Toplu sıkıştırma destekli. Ücretsiz, resimleriniz yüklenmez.",
  },
  "resize-image": {
    title: "Resim Boyutlandır – Fotoğraf Piksel Değiştir",
    description:
      "Resimleri istediğiniz piksel ölçüsüne getirin, en-boy oranını kilitleyin. Ücretsiz, gizli ve tamamen tarayıcınızda çalışır.",
  },
  "convert-image": {
    title: "Resim Formatı Dönüştür – JPG, PNG, WebP",
    description:
      "Resimleri JPG, PNG, WebP ve AVIF arasında dönüştürün. Toplu dönüştürme, kalite ayarı. Ücretsiz, dosyalarınız cihazınızda kalır.",
  },
  "crop-image": {
    title: "Resim Kırp – Online Fotoğraf Kırpma",
    description:
      "Fotoğrafları serbestçe veya 1:1, 16:9, 4:3 gibi hazır oranlarla kırpın. Ücretsiz, üyeliksiz ve tamamen tarayıcınızda.",
  },
  "rotate-image": {
    title: "Resim Döndür – Fotoğraf Çevir ve Aynala",
    description:
      "Fotoğrafları 90°, 180° veya 270° döndürün, yatay ya da dikey aynalayın. Ücretsiz, resminiz yüklenmez.",
  },
  "watermark-image": {
    title: "Resme Filigran Ekle – Ücretsiz Online",
    description:
      "Fotoğraflarınıza yazı filigranı ekleyin; konum, saydamlık, boyut ve rengi ayarlayın. Ücretsiz, resimleriniz yüklenmez.",
  },
  "image-to-pdf": {
    title: "JPG'den PDF'e Çevir – Resmi PDF Yapma",
    description:
      "JPG, PNG ve diğer resimleri tek PDF dosyasında birleştirin. Sayfa boyutu ve kenar boşluğu seçin. Ücretsiz, üyeliksiz, yüklemesiz.",
  },
  "blur-image": {
    title: "Resim Bulanıklaştır – Yüz ve Plaka Gizle",
    description:
      "Fotoğrafın tamamını veya seçtiğiniz alanları bulanıklaştırın ya da pikselleştirin. Yüz, plaka ve kişisel bilgileri gizleyin. Ücretsiz.",
  },
  "favicon-generator": {
    title: "Favicon Oluştur – Resimden ICO ve PNG",
    description:
      "Tek bir resimden web siteniz için tüm favicon boyutlarını (16'dan 512 piksele) oluşturun, ZIP olarak indirin. Ücretsiz.",
  },
  "exif-viewer": {
    title: "EXIF Görüntüleyici – Fotoğraf Bilgilerini Gör",
    description:
      "Fotoğrafın EXIF verilerini görün ve silin: kamera bilgisi, çekim ayarları ve GPS konumu. Dosyanız yüklenmez, ücretsizdir.",
  },
  "image-collage": {
    title: "Kolaj Yap – Ücretsiz Online Fotoğraf Kolajı",
    description:
      "Fotoğrafları ızgara ve mozaik düzenleriyle tek kolajda birleştirin; 1:1, 4:5 ve 9:16 boyutları. Ücretsiz, fotoğraflarınız yüklenmez.",
  },
  "meme-generator": {
    title: "Caps Oluştur – Online Meme Yapma",
    description:
      "Kendi fotoğrafınıza üst ve alt yazı ekleyerek caps (meme) yapın, PNG olarak indirin. Ücretsiz, filigransız.",
  },
  "image-to-base64": {
    title: "Resmi Base64'e Çevir – Data URI Oluştur",
    description:
      "Resimleri Base64 metnine veya data URI'ye dönüştürün; HTML ve CSS için hazır kodu kopyalayın. Ücretsiz ve tarayıcınızda.",
  },
  "qr-generator": {
    title: "QR Kod Oluştur – Ücretsiz QR Kod Yapma",
    description:
      "Link, metin veya telefon numarası için QR kod oluşturun; renk ve logo ekleyin, PNG ya da SVG indirin. Ücretsiz, süresiz.",
  },
  "svg-to-png": {
    title: "SVG'yi PNG'ye Çevir – Ücretsiz Online",
    description:
      "SVG dosyalarını istediğiniz ölçüde yüksek kaliteli PNG'ye dönüştürün. Ücretsiz, dosyanız yüklenmez.",
  },
  "base64-encode": {
    title: "Base64 Encode / Decode – Online Çevirici",
    description:
      "Metin veya dosyaları Base64'e kodlayın ya da Base64'ü çözün. Ücretsiz ve tamamen tarayıcınızda çalışır.",
  },
  "color-picker": {
    title: "Renk Seçici – HEX, RGB, HSL Kodları",
    description:
      "Ekrandan veya resimden renk seçin; HEX, RGB, HSL, OKLCH ve CMYK kodlarına çevirin, kontrastı kontrol edin. Ücretsiz.",
  },
  "json-formatter": {
    title: "JSON Düzenleyici – Formatla ve Doğrula",
    description:
      "JSON verisini okunaklı hale getirin, küçültün ve hataları satır numarasıyla bulun. Ücretsiz, veriniz tarayıcınızdan çıkmaz.",
  },
  "hash-generator": {
    title: "Hash Oluştur – SHA-256, SHA-512, SHA-1",
    description:
      "Metin veya dosyalar için SHA-1, SHA-256, SHA-384 ve SHA-512 hash değerleri üretin, dosya bütünlüğünü kontrol edin. Ücretsiz.",
  },
  "word-counter": {
    title: "Kelime Sayacı – Karakter ve Kelime Sayma",
    description:
      "Kelime, karakter, cümle ve paragraf sayısını anında görün; X, Instagram ve SMS sınırları ile okuma süresi. Ücretsiz sayaç.",
  },
  "password-generator": {
    title: "Şifre Oluştur – Güçlü ve Rastgele Şifre",
    description:
      "Güçlü, rastgele şifreler oluşturun; uzunluk, rakam ve sembolleri seçin. Şifreler cihazınızda üretilir, hiçbir yere gönderilmez.",
  },
  "diff-checker": {
    title: "Metin Karşılaştır – İki Metin Arasındaki Fark",
    description:
      "İki metni karşılaştırın, eklenen ve silinen satırları renkli olarak görün. Kod ve belgeler için ücretsiz fark bulucu.",
  },
  "markdown-editor": {
    title: "Markdown Editörü – Canlı Önizlemeli",
    description:
      "Markdown yazın, canlı önizlemeyi görün ve HTML olarak dışa aktarın. Ücretsiz online editör, metniniz yüklenmez.",
  },
  "url-encoder": {
    title: "URL Encode / Decode – Online Kodlayıcı",
    description:
      "URL'leri ve parametreleri kodlayın ya da çözün; Türkçe karakterler doğru çevrilir. Ücretsiz ve tarayıcınızda çalışır.",
  },
  "timestamp-converter": {
    title: "Zaman Damgası Çevir – Unix Timestamp",
    description:
      "Unix zaman damgasını okunabilir tarihe, tarihi zaman damgasına çevirin; farklı tarih biçimleri. Ücretsiz geliştirici aracı.",
  },
  "lorem-ipsum": {
    title: "Lorem Ipsum Oluştur – Örnek Metin",
    description:
      "Tasarımlarınız için istediğiniz uzunlukta lorem ipsum örnek metni oluşturun: paragraf, cümle veya kelime. Ücretsiz.",
  },
  "regex-tester": {
    title: "Regex Test – Düzenli İfade Deneme",
    description:
      "Düzenli ifadelerinizi canlı test edin; eşleşmeleri ve grupları anında görün. Geliştiriciler için ücretsiz regex aracı.",
  },
  "csv-json": {
    title: "CSV'yi JSON'a Çevir – ve JSON'dan CSV'ye",
    description:
      "CSV'yi JSON'a, JSON'u CSV'ye dönüştürün; CSV'yi sıralanabilir tablo olarak önizleyin. Ücretsiz, veriniz yüklenmez.",
  },
  "xml-formatter": {
    title: "XML Düzenleyici – Formatla ve Doğrula",
    description:
      "XML'i okunaklı hale getirin, küçültün ve hataları bulun. Ücretsiz online XML formatlayıcı, veriniz tarayıcınızda kalır.",
  },
  "yaml-formatter": {
    title: "YAML Düzenleyici – Doğrula ve JSON'a Çevir",
    description:
      "YAML dosyalarını doğrulayın, düzenleyin ve JSON'a dönüştürün. Ücretsiz online YAML aracı, veriniz yüklenmez.",
  },
  "unit-converter": {
    title: "Birim Çevirici – px, rem, cm, inç",
    description:
      "CSS birimlerini (px, rem, em, vw) ve uzunluk birimlerini (cm, mm, inç) anında çevirin. Ücretsiz online birim dönüştürücü.",
  },
  "qr-scanner": {
    title: "QR Kod Okuyucu – Resimden veya Kameradan",
    description:
      "QR kodları kameranızla veya bir resimden okuyun, içeriği kopyalayın. Ücretsiz, uygulama gerekmez, resminiz yüklenmez.",
  },
  "jwt-decoder": {
    title: "JWT Çözücü – Token İçeriğini Gör",
    description:
      "JWT token'ın başlık, içerik ve imza bölümlerini çözün. Token'ınız tarayıcınızdan çıkmaz. Ücretsiz geliştirici aracı.",
  },
  "uuid-generator": {
    title: "UUID Oluştur – Rastgele GUID Üretici",
    description:
      "Rastgele UUID v4 (GUID) ve Nano ID değerlerini toplu üretin, tek tek veya hepsini kopyalayın. Ücretsiz geliştirici aracı.",
  },
  "css-minifier": {
    title: "CSS Küçült – Online CSS Minify",
    description:
      "CSS kodunuzu küçülterek sitenizi hızlandırın veya okunaklı biçimde düzenleyin. Ücretsiz, kodunuz yüklenmez.",
  },
  "base-converter": {
    title: "Sayı Tabanı Çevir – İkilik, Onluk, Onaltılık",
    description:
      "Sayıları ikilik, sekizlik, onluk ve onaltılık tabanlar arasında anında çevirin. Ücretsiz online taban dönüştürücü.",
  },
  "color-palette": {
    title: "Renk Paleti Oluştur – Uyumlu Renkler",
    description:
      "Uyumlu renk paletleri oluşturun veya fotoğraftan palet çıkarın; HEX kodlarını kopyalayın. Ücretsiz tasarım aracı.",
  },
  "color-contrast": {
    title: "Renk Kontrastı Kontrol – WCAG Testi",
    description:
      "Yazı ve arka plan renklerinin kontrast oranını ölçün, WCAG AA ve AAA erişilebilirlik uyumunu kontrol edin. Ücretsiz.",
  },
  "text-case": {
    title: "Büyük Küçük Harf Çevir – Online",
    description:
      "Metni BÜYÜK HARF, küçük harf, Başlık Düzeni, camelCase veya snake_case biçimine anında çevirin. Ücretsiz.",
  },
  "background-remover": {
    title: "Arka Plan Kaldır – Ücretsiz Fotoğraf Dekupe",
    description:
      "Fotoğrafın arka planını yapay zekâyla otomatik silin, şeffaf PNG indirin. Filigran yok, ücretsiz; fotoğrafınız yüklenmez.",
  },
  "color-dropper": {
    title: "Resimden Renk Seç – Renk Kodu Bul",
    description:
      "Bir resim açın, herhangi bir noktaya tıklayarak rengin HEX ve RGB kodunu alın. Ücretsiz, resminiz yüklenmez.",
  },
  "photo-filter": {
    title: "Fotoğraf Filtresi – Online Efekt Ekle",
    description:
      "Fotoğraflarınıza vintage, siyah-beyaz, sepya ve diğer filtreleri uygulayın. Ücretsiz, fotoğrafınız yüklenmez.",
  },
  "redact-pdf": {
    title: "PDF Karart – Gizli Bilgileri Kalıcı Sil",
    description:
      "PDF'teki kişisel ve gizli bilgileri siyah kutularla kalıcı olarak karartın; alttaki metin dosyada kalmaz. Ücretsiz, yüklemesiz.",
  },
  "pdf-encrypt": {
    title: "PDF Şifrele – PDF'e Şifre Koy veya Kaldır",
    description:
      "PDF'e AES-256 ile şifre koyun, yazdırma ve kopyalamayı kısıtlayın ya da bildiğiniz şifreyi kaldırın. Ücretsiz, dosyanız yüklenmez.",
  },
  "html-to-pdf": {
    title: "HTML'den PDF'e Çevir – Ücretsiz Online",
    description:
      "HTML dosyalarını düzenini koruyarak PDF'e dönüştürün. Ücretsiz ve üyeliksiz; dosyalar dönüştürüldükten hemen sonra silinir.",
  },
  "pdf-to-word": {
    title: "PDF'i Word'e Çevir – Ücretsiz PDF Word Dönüştürme",
    description:
      "PDF'i düzenlenebilir Word (DOCX) dosyasına çevirin; tablolar, resimler ve düzen korunur. Ücretsiz, üyeliksiz, dosyanız yüklenmez.",
  },
  "pdf-to-excel": {
    title: "PDF'i Excel'e Çevir – PDF Tabloları XLSX",
    description:
      "PDF'teki tabloları düzenlenebilir Excel (XLSX) dosyasına aktarın; Türkçe sayı ve para birimleri doğru okunur. Ücretsiz ve gizli.",
  },
  "pdf-to-markdown": {
    title: "PDF'i Markdown'a Çevir – Ücretsiz",
    description:
      "PDF'i başlıkları, listeleri ve tablolarıyla Markdown metnine dönüştürün; yapay zekâ araçları ve notlar için ideal. Ücretsiz.",
  },
  "pdf-to-powerpoint": {
    title: "PDF'i PowerPoint'e Çevir – PDF PPTX",
    description:
      "PDF sayfalarını düzenlenebilir PowerPoint (PPTX) slaytlarına dönüştürün; metin, resim ve şekiller yerinde kalır. Ücretsiz.",
  },
  "word-to-pdf": {
    title: "Word'ü PDF'e Çevir – Ücretsiz Word PDF Dönüştürme",
    description:
      "Word belgelerini (DOCX, DOC) düzeni bozulmadan saniyeler içinde PDF'e çevirin. Ücretsiz, üyeliksiz; dosyanız işlemden hemen sonra silinir.",
  },
  "excel-to-pdf": {
    title: "Excel'i PDF'e Çevir – Ücretsiz XLSX PDF",
    description:
      "Excel tablolarını (XLSX, XLS) PDF'e dönüştürün; sayfa düzeni korunur. Ücretsiz, üyeliksiz; dosyanız işlemden hemen sonra silinir.",
  },
  "powerpoint-to-pdf": {
    title: "PowerPoint'i PDF'e Çevir – PPTX PDF",
    description:
      "PowerPoint sunumlarını (PPTX, PPT) PDF'e çevirin; slaytlar birebir korunur. Ücretsiz, üyeliksiz; dosyanız işlemden hemen sonra silinir.",
  },
  "ocr-pdf": {
    title: "PDF OCR – Taranmış PDF'i Aranabilir Yap",
    description:
      "Taranmış PDF ve belgelerdeki yazıları tanıyın, metni seçilebilir ve aranabilir yapın. Türkçe dahil birçok dil. Ücretsiz, yüklemesiz.",
  },
  "pdf-text-extractor": {
    title: "PDF'ten Metin Çıkar – Yazıları Kopyala",
    description:
      "PDF'teki tüm metni sütun ve okuma sırasını koruyarak çıkarın ve kopyalayın. Ücretsiz, dosyanız tarayıcınızdan çıkmaz.",
  },
  "repair-pdf": {
    title: "PDF Onar – Bozuk PDF Dosyasını Kurtar",
    description:
      "Açılmayan veya hasarlı PDF dosyalarını onarın, kurtarılabilen sayfaları yeni bir PDF'e kaydedin. Ücretsiz ve gizli.",
  },
  "pdf-compress": {
    title: "PDF Sıkıştır – PDF Boyutu Küçültme",
    description:
      "PDF içindeki resimleri yeniden sıkıştırarak dosya boyutunu küçültün; e-posta ve e-Devlet için ideal. Ücretsiz, dosyanız yüklenmez.",
  },
  "video-to-gif": {
    title: "Videoyu GIF Yap – Ücretsiz Online",
    description:
      "Kısa video kliplerini (MP4, WebM, MOV) hareketli GIF'e çevirin. Ücretsiz, filigransız ve tarayıcınızda çalışır.",
  },
  "audio-recorder": {
    title: "Ses Kaydedici – Online Ses Kaydı",
    description:
      "Mikrofonunuzla tarayıcıda ses kaydedin, MP3 veya WAV olarak indirin. Ücretsiz, üyelik ve kurulum gerekmez.",
  },
  "text-to-speech": {
    title: "Metni Sese Çevir – Türkçe Seslendirme",
    description:
      "Yazdığınız metni Türkçe, İngilizce ve diğer dillerde doğal bir sesle okutun. Ücretsiz, üyelik gerekmez.",
  },
};
