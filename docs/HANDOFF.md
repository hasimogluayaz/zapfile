# Devir notu (yeni Claude oturumu için)

> Önceki Claude oturumlarında yapılanları, kararları ve sıradaki işleri anlatır.
> Yeni oturumda önce bunu, sonra `AGENTS.md`'yi oku. Son güncelleme: 2026-10-19.

## Kullanıcı ve çalışma kuralları

- **Dil:** Kullanıcıya kısa, samimi, Türkçe cevap ver ("knk" diye hitap ediyor).
- **Teknik seviye:** Kullanıcı teknik değil. Her adımı tıklanacak yer ve kopyalanacak komutla, tek tek anlat; ekran görüntüsü atıyor.
- **Ortam:** Windows + PowerShell kullanıyor.
- **Branch:** `claude/vibrant-euler-lw0gi5`. Commit + push buraya.
  - PR #2 (https://github.com/hasimogluayaz/zapfile/pull/2) kullanıcının onayıyla 2026-10-14'te **merge edildi**; her şey `main`'de ve canlıda.
  - Yeni iş için branch `main`'den yeniden başlatılır; gerekirse **yeni PR** açılır. Kullanıcı açıkça onay vermeden merge etme.
  - `main` = canlı site (Vercel otomatik yayınlar).
- **Önizleme** (her push'ta güncellenir): https://zapfile-git-claude-vibrant-euler-lw0gi5-hasimogluayazs-projects.vercel.app
- **Hedef:** ZapFile en az iLovePDF kadar iyi, hızlı ve kusursuz olsun.
- **Para:** Kullanıcı maliyete çok hassas. Kullanıcı sayısıyla büyüyen maliyet istemiyor (Vercel bant genişliği reddedildi). Sabit aylık VPS kabul edildi.
  - **Fiyatları ezberden söyleme.** Bir kez yanlış fiyat verildi (Hetzner'i "5 €" dedik, gerçekte daha pahalı), kullanıcı "kandırdın" dedi.
  - Emin değilsen "kontrol edelim" de.
- **İletişim e-postası** (sitede): `ayvexdevelopment@gmail.com`.

## Altyapı (nerede ne var)

| Parça | Nerede |
|---|---|
| Kod | GitHub `hasimogluayaz/zapfile` (public) |
| Site | Vercel (Hobby), `main` → zapfile.xyz; `NEXT_PUBLIC_SITE_URL` / `SITE_URL` = https://www.zapfile.xyz |
| Domain kaydı | Natro (zapfile.xyz), ama nameserver'lar Vercel'de (`ns1/ns2.vercel-dns.com`). **DNS kayıtları Vercel → Domains → zapfile.xyz'den yönetilir**, Natro'dan değil. |
| Dönüştürme sunucusu | Hetzner Cloud, proje "Default", sunucu `zapfile-api` |
| Hetzner bakiyesi | Kullanıcı doğrulama için 25 $ kredi yükledi; sunucu bundan düşüyor. İade sorulmadı ya da cevabı bilinmiyor. Hetzner 2FA açık. |

**Dönüştürme sunucusunun ayrıntıları:**
- Tip: CPX02 (1 vCPU / 1 GB RAM / 20 GB), Nuremberg, Ubuntu 26.04. Fiyat: ~7,49 $ + 0,60 $ IPv4 / ay.
- Adres: IPv4 `2.31.6.195`, IPv6 `2a01:4f8:1c18:dba::1`.
- DNS: `api.zapfile.xyz` → A `2.31.6.195` (Vercel DNS). `https://api.zapfile.xyz/health` → `{"ok":true,...}` ✅
- SSH: `ssh root@2.31.6.195` (kullanıcının bilgisayarındaki ed25519 anahtarıyla).
  - Kullanıcının ev ağı bu IP'ye ulaşamıyor ("Destination net unreachable"); **telefon hotspot'uyla bağlanıyor**.
- Kurulum dosyaları ve ayarlar:
  - Kod: `/opt/zapfile` (sparse clone, sadece `server/`).
  - Ayarlar: `/opt/zapfile/server/office-api/.env`. `CONCURRENCY=1`, 2 GB swap var.
  - Docker: `office-api` (LibreOffice, internet erişimi yok) + `caddy` (HTTPS, Let's Encrypt).
- Güncelleme / yeniden kurulum (sunucuda root olarak):
  ```bash
  curl -fsSL https://raw.githubusercontent.com/hasimogluayaz/zapfile/<BRANCH>/server/office-api/setup.sh | bash -s api.zapfile.xyz <BRANCH>
  ```
  - PR #2 merge edildi: artık `<BRANCH>` = `main` (kullanıcıya bir kez `main` ile çalıştırması söylendi).
- Loglar:
  ```bash
  cd /opt/zapfile/server/office-api && docker compose logs -f
  ```
- Büyütmek gerekirse: Hetzner → sunucu → Rescale (ör. CPX12 2 GB), sonra `.env`'de `CONCURRENCY=2`.

## Bu branch'te yapılanlar (özet)

Ayrıntı: `git log --oneline origin/main..HEAD`.

- **Tasarım:**
  - "Voltage" tasarım sistemi (bkz. `AGENTS.md`).
  - Header, Home (DropPad), /tools, ToolCard, ToolLayout, Footer, arama, favoriler ve dosya devri baştan yazıldı.
- **Araçlar:**
  - 18 araç kaldırıldı ya da birleştirildi (301 yönlendirmeleri `next.config.mjs`'de).
  - Neredeyse tüm araçlar yeniden yazıldı (resim motoru, PDF, metin, dönüştürücüler).
- **Yeni PDF araçları:**
  - PDF → Word / Excel / PowerPoint / Markdown
  - Word / Excel / PowerPoint / HTML → PDF
  - Organize, Watermark, Sign, Crop, Compare, Redact, Fill Form, OCR, Repair
- **Dil:** 9 dil. Tam sözlükler EN/TR/DE/FR; ES/PT/IT/JA kısmi, eksikler İngilizce. Kontrol: `npm run verify:i18n`.
- **İletişim e-postaları** `ayvexdevelopment@gmail.com` yapıldı.

## Office → PDF: hikâye ve son durum

1. **Başlangıç:** LibreOffice WASM tarayıcıda çalışıyordu. İlk kullanımda ~77 MB indiriyor; kullanıcı çok yavaş buldu.
2. **Motoru Vercel'den servis etmek** (`bf4728d`): hızlıydı ama bant genişliği maliyeti yüzünden **geri alındı** (`f3ec816`).
3. **Tarayıcı motorunun indirmesi iyileştirildi:**
   - Ücretsiz CDN'ler: jsDelivr, 2,5 sn içinde başlamazsa raw.githubusercontent de devreye giriyor (`fetchPart`).
   - Parçalar paralel iniyor.
   - İndirme sayfa açılışında değil, kullanıcı niyet gösterince başlıyor (dosya sürükleme ya da seçici açma).
4. **Sunucuda dönüştürme ("iLovePDF gibi")**, kullanıcının kararıyla kuruldu:
   - **Sunucu:** `server/office-api/`
     - Bağımlılıksız Node servisi (`server.mjs`), Dockerfile, docker-compose, Caddyfile, `setup.sh`, README.
     - Kuyruk, IP başına sınır, 50 MB sınırı, 90 sn zaman aşımı, CORS izin listesi (zapfile + Vercel önizlemeleri), makrolar kapalı, geçici dosyalar hemen silinir.
   - **Site:** `src/lib/office/server.ts` + `OfficeToPdfTool.tsx`.
     - "Hızlı" (sunucu, varsayılan) / "Gizli" (tarayıcı) modları; seçim localStorage'da hatırlanır.
     - Sunucu hatasında tarayıcı motoruna otomatik geçer.
     - Şifreli belgeler hep tarayıcıda çevrilir.
     - API adresi varsayılan olarak `https://api.zapfile.xyz` (env: `NEXT_PUBLIC_OFFICE_API_URL`).
   - **Dürüst metinler:**
     - Bu 4 sayfada "cihazında çalışır" paneli gizlendi.
     - Dropzone notu değiştirildi.
     - Gizlilik politikasına bölüm eklendi (EN/TR/DE/FR).
     - `tools.ts` meta açıklamaları güncellendi.
   - **Test edilenler:**
     - Sunucu yerelde: docx, xlsx, pptx, csv, html ve PDF/A ~2 sn.
     - Site hızlı mod: yerel API ile ~3 sn, motor indirmesi yok.

### Kullanıcının örnek belgesiyle düzeltmeler (2026-10-14)
- **Örnek belge:** "ÇINAR APT … DIŞ CEPHE FİLELİ SIVA" teklif dosyası; Montserrat fontu, çok sayıda metin kutusu, formüllü tablo.
- **Montserrat sunucuda yoktu:** Yerine daha geniş Noto Sans geliyordu, yazılar kutulardan taşıyordu. Dockerfile'a Montserrat, Open Sans, Roboto ve Lato fontları ile `fonts.conf` eşlemeleri eklendi.
  - **Sunucuda `setup.sh` tekrar çalıştırılmalı.**
- **`=PRODUCT(LEFT)` / `=SUM(LEFT)` tablo formülleri:** LibreOffice "1.150"yi 1,15 sanıyordu, toplam "0₺" çıkıyordu. `src/lib/office/prepare.ts` artık Word'ün kaydettiği sonucu kullanıyor.
- **Sayfa başlıkları önceki sayfanın altına kayıyordu:** `prepare.ts` Word'ün sayfa başlangıcını koruyor.
- **Kalan küçük farklar:**
  - 2. sayfadaki "NEDEN HAŞİMOĞLU" kutusunda son madde sığmıyor (başlık 2 satıra bölünüyor).
  - 6. sayfada logo, REFERANSLARIMIZ kutusunun beyaz zemini altında kalıyor; Word'de de böyle olabilir, kullanıcıya soruldu.

### PDF → Word / Excel / PowerPoint denetimi (2026-10-14)
Kullanıcının teklif PDF'i ve düz metin bir raporla test edildi. Bulunan ve düzeltilen hatalar:
- **JPEG fotoğraflar ve logolar hiç çıkmıyordu (en büyük hata):** pdf.js 5 JPEG'leri `VideoFrame` olarak veriyor, `.width` yok, kod çöküyordu. `extract.ts` düzeltildi.
- **Gölge resimleri kartların üstünde siyah leke oluyordu:** Bu yumuşak gölgeler artık atlanıyor.
- **Tasarımlı PDF'ler Word'de dağılıyordu (6 sayfa → 13):**
  - Yeni `docx-layout.ts` ile birebir düzen modu eklendi.
  - Otomatik seçim (`prefersExactLayout`) ve arayüzde "Düzen" seçeneği var: Otomatik / Akan metin / Birebir.
- **Excel'de Türkçe sayılar yanlış okunuyordu:** "1.150" → 1,15; "18.000₺" → 18 çıkıyordu. Ondalık tespiti düzeltildi; PUA madde işaretleri • yapıldı.
- **PowerPoint ve Word birebir modunda madde işareti metne yapışıktı:** Araya boşluk eklendi.
- **Kalan farklar:** Yuvarlak köşeli kart çerçeveleri (vektör şekiller) taşınmıyor; metinler ve resimler doğru yerde.

## Kullanıcı getirme (2026-10-15)

- **Search Console:** 115 sayfadan sadece 12'si dizindeydi. Site haritası 2 Mayıs'tan beri "Getirilemedi" durumundaydı. Kullanıcı 15 Ekim'de `sitemap.xml`'i yeniden gönderdi; canlı URL testi "Google tarafından kullanılabilir" sonucunu verdi. Kullanıcı yanlışlıkla `/tools/pdf-to-word` ve `/tools/merge-pdf` adreslerini site haritası diye ekledi, bunları silmesi söylendi. Birkaç gün sonra "Sayfa sayısı" ekranına tekrar bakılacak.
- **Dil adresleri** (PR #3 ile `main`'e alındı, canlıda): 70 aracın hepsi 8 dilde kendi adresinde (`/tr/pdf-birlestir`, `/de/…`, `/fr/…`, `/es/unir-pdf`, `/pt/…`, `/it/…`, `/ja/merge-pdf`, `/ar/merge-pdf`), o dilde başlık/açıklama, hreflang ve site haritasıyla (679 adres). Vercel'de 404 hatası yaşandı: `dynamicParams = false` kullanma (nedeni sayfa dosyasında yazıyor).
- **Çeviriler tamamlandı (2026-10-15):** Arayüzde 9 dilde de İngilizce metin kalmadı. Eksikler `src/lib/i18n-completions/<dil>.json`'da; `npm run verify:i18n` eksik kalırsa hata veriyor. Bütün sayfalar her dilde Playwright ile tarandı. Değişiklik Günlüğü yeniden yazıldı ve 9 dile çevrildi; blog etiketleri ve özetleri de çevrildi.
- **Blog çevrildi (2026-10-15):** 33 yazının hepsi 8 dilde kendi adresinde (`/tr/blog`, `/de/blog/<yazı>` …), içindeki araç linkleri o dilin araç adresine gidiyor, hreflang + site haritası (951 adres) var. Çevirilerde iddialar İngilizce yazılarla aynı (İngilizce yazılardaki hatalı iddialar da düzeltildi: dönüştürücü formatları, Office hızlı modu sunucuya yükler, OCR/arka plan silme tarayıcıda). Yazı gövdesindeki tekrar eden başlık (iki h1) kaldırıldı.
- **Dil ana sayfaları (2026-10-15):** `/tr`, `/de`, `/fr`, `/es`, `/pt`, `/it`, `/ja`, `/ar`; o dilde başlık/açıklama, hreflang, site haritası (959 adres). Logo ve "Ana sayfa" linkleri dilin ana sayfasına gidiyor.
- **IndexNow (2026-10-15):** `main`'e her push'tan 5 dk sonra GitHub Action site haritasındaki tüm adresleri Bing/Yandex'e bildiriyor. Sonuç: GitHub → Actions → IndexNow.
- **Tanıtım metinleri:** `docs/TANITIM.md` (Reddit, AlternativeTo, Product Hunt, Türkçe forumlar). Kullanıcı paylaşacak.
- **Sonraki adımlar:** Search Console'da yeni dil sayfaları için dizine ekleme isteği; `/tools` sayfasının dil adresleri (şu an `?lang=`).

## Detaylı tarama ve düzeltmeler (2026-10-19)

Branch `main`'den yeniden başlatıldı (PR #3–#6 merge edilmişti). Kullanıcı "detaylı tara, eksikleri gider" dedi. Yapılanlar (hepsi branch'te, **henüz PR yok / main'de değil**):
- **Sayfa başına tek dil:** Her sayfa 9 dilin sözlüğünü (~480 KB gzip) indiriyordu. Sözlükler `src/lib/i18n-dicts/<dil>.ts`'e bölündü; sayfa yalnız kendi dilini ayrı bir JS parçası olarak yüklüyor.
- **Bütün sayfalar statik (CDN):** Kök layout çerez okuduğu için her ziyaret ve her link ön yüklemesi (sayfa başına 32–53) Vercel'de bir sunucu render'ıydı. Artık 967 sayfa build'de üretiliyor. Yapı: `app/(site)/` (İngilizce, kendi kök layout'u) + `app/[locale]/layout.tsx`; ortak kabuk `app/root-shell.tsx`. Ayrıntı: AGENTS.md "Static rendering". Bir sayfa ziyaretinin trafiği ~2,2–3,3 MB → ~580 KB (yerel ölçüm).
- **Google Fonts kaldırıldı:** Arapça font `@fontsource` ile kendi sunucumuzdan, sadece Arapça metinde iniyor. Hiçbir sayfa dış siteye istek atmıyor.
- **JSON-LD:** 70 aracın 48'inde SoftwareApplication/FAQ yapılandırılmış verisi yoktu; hepsine eklendi.
- **OCR:** `.tif/.tiff` kabul ediliyordu ama Chrome/Firefox çözemediği için hep hata veriyordu; `utif2` ile çözülüyor (çok sayfalı TIFF → çok sayfalı PDF).
- **Mobil:** Almanca Lorem Ipsum butonları taşıyordu; "içeriğe atla" linki RTL'de yana itiliyordu. Düzeltildi.
- Küçükler: varsayılan `SITE_URL` www; eski Windows log dosyaları, bozuk/tehlikeli eski betikler (`compare-i18n-keys`, `generate-tool-layouts`) silindi; geçersiz `serverExternalPackages` ayarı kaldırıldı.
- **Test edilenler:** 959 site haritası adresi 200; 398 sayfa tarayıcıda (JS hatası, hydration, çevrilmemiş anahtar, h1, lang) temiz; telefon genişliğinde taşma yok; ~45 dosya aracı gerçek dosyalarla uçtan uca (indirilen çıktılar kontrol edildi: karartılan metin dosyada yok, şifreli PDF şifreyle açılıyor, form Türkçe karakterle dolu); Office → PDF yerel API ile; dönüştürme sunucusuna dosya sızdırma denemeleri (ODT bağlı bölüm, Word INCLUDETEXT, HTML iframe) başarısız = güvenli.
- **Bilinen sınır:** Bilinmeyen adresler 404 kodu dönüyor ve 404 sayfası tarayıcıda çiziliyor (Next 14'te iki kök layout ile sunucuda çizilemiyor).

## El Yazısını Metne Çevir (2026-11-01)

PR #7 merge edilmişti; branch `main`'den yeniden başlatıldı. Kullanıcı "el yazısını metne dönüştürme getirelim" dedi.
- **Yeni araç:** `/tools/handwriting-to-text` (TR: `/tr/el-yazisini-metne-cevir`). Görüntü kategorisinde, 71. araç. Ayrıntı: AGENTS.md "Handwriting to Text".
- **Model:** PP-OCRv6 small (PaddleOCR, Apache-2.0), fp16, ~15,7 MB, `models/ppocrv6-small/`, commit `4493eca` üzerinden jsDelivr. Tarayıcıda çalışır (WebGPU / WASM), sunucu maliyeti yok, dosya yüklenmez. Türkçe harflerin hepsi var; Arapça/Kiril yok.
- **Neden bu model:** Bu ortamda Hugging Face engelli (TrOCR indirilemedi; zaten sadece İngilizce). PP-OCRv6 npm'den alındı; el yazısı fontlarıyla üretilen test sayfalarında (telefon fotoğrafı bozulmaları dahil) ~%2–6 karakter hatası. **Gerçek el yazısıyla henüz denenmedi**: kullanıcıdan örnek fotoğraf istendi.
- Hız (headless Chromium, GPU yok, tek çekirdek): ilk kullanımda indirme dahil ~5 sn/sayfa.
- Changelog v2.2.0, 9 dilde metinler, SEO başlıkları, SSS (EN).
- **Kullanıcı testi (önizleme, Windows Chrome):** "Yapay zekâ modeli başlatılıyor %100"de takıldı → WebGPU fp16 oturumu açılmıyordu. Düzeltme: yalnız WASM + sayfaya COOP/COEP (çok çekirdek) + algılama 960 px. Headless'ta 4 sayfa 20 → 10 sn; tek fotoğraf ilk açılışta 5 sn, sonra ~3 sn. Kullanıcının gerçek el yazısı örneği (ekran görüntüsünden kırpılmış) büyük ölçüde doğru okundu.
- **2. kullanıcı testi:** yine "başlatılıyor"da kaldı (deploy'un yetişip yetişmediği belli değil; önizlemeye bu ortamdan erişilemiyor). Sebep bulunamadı (başlıkları silerek ve gecikme ile taklit edildi). Önlem: `client.ts` bekçisi — 20 sn (okurken 45 sn) ses yoksa worker'ı tek çekirdekli güvenli modda yeniden başlatır, sayfaları yeniden yollar; yine olmazsa hata nedeni ekranda küçük yazıyla görünür (`errorDetail`). Konsolda `[handwriting]` uyarısı. Kullanıcıdan güncel ekran görüntüsü beklendi.
- Eski logo: COEP'li sayfalarda favicon CORP'suz yüklenemiyor, Chrome eski önbellekteki ikonu gösteriyordu → favicon dosyalarına CORP eklendi.
- **3. tur (kullanıcı: "çok daha iyi olabilir, MB azalsın, performans düşmesin, Apple gibi"):** Kullanıcının 2. testi çalıştı (gerçek defter fotoğrafı `images/7.webp`, Türkçe+İngilizce el yazısı). Ölçümle yapılanlar: kutu gövdesi piksel merkezinden (gerçek fotoğrafta hata %28,8 → %22,4), kalınlık ×0,9 (→ %20,9); tanıma modeli Latin'e budandı (10,6 → 6,2 MB, doğruluk aynı; Japonca/Çince seçilince tam model); yan/ters fotoğraf otomatik düzeltme; yapıştırma, niyet görünce indirme, kutuya tıklayınca satır seçimi, süre. Toplam indirme 15,7 → ~11 MB; 4 sayfa 9,9 → ~8,9 sn. Kelime listesiyle düzeltme denendi, gerçek yazıda kazanç yok ve "stoy→toy" gibi makul görünen hatalar ürettiği için konmadı.
- **4. tur (kullanıcı: "I do'daki o'yu 0 okudu, bu böyledir diye düzeltmeli, detaylı senaryo"):** 2. gerçek defter fotoğrafı (`images/9.webp`: iki sütun, oklar, ↳ işaretleri, kırmızı kenar notları). Eklenenler: kelime içi harf/rakam tutarlılığı (modelin olasılıklarıyla), I zamiri kuralları, ok/↳ normalizasyonu, sütun okuma (satır içi büyük boşluk, hizalı sağ sütun, gerekirse karakter konumundan bölme). Bu fotoğrafta hata %36,0 → %21,1. Testler: `npm run test:handwriting` (bozulmaması gereken örnekler dahil). Bilerek yapılmayanlar: satır başı tek tireyi ok yapmak ("- süt" maddeleri bozulur), boşluk ağırlığını artırmak (bir fotoğrafta iyi, diğerinde kötü).
- **5. tur – "Sayfa yanıt vermiyor" (kullanıcı ekran görüntüsü):** Yeniden üretildi: Ctrl+V ile yapıştırınca hem `FileDropzone`'un hem sayfanın paste dinleyicisi çalışıyordu (2 aynı sayfa). İkinci ekleme eski bir sayfa listesi kopyasını yazınca okunmuş (bitmap'i kapatılmış) sayfa tekrar "waiting" oluyor, `pump` onu alıp anında hata alıyor ve render beklemeden aynı sayfayı tekrar seçiyordu → mikro görev sonsuz döngüsü (CDP ile donmuş anda yakalandı: React setState döngüsü). Düzeltme: sayfa dinleyicisi `defaultPrevented` olayları atlıyor; `update` `pagesRef`'i eşzamanlı güncelliyor; kapalı bitmap önizlemeden yeniden çözülüyor; her hatadan sonra `setTimeout(0)` ile render'a izin. Ayrıca ORT iş parçacığı sayısı en fazla çekirdeklerin yarısı ve 4 (sayfaya CPU payı). Test: yapıştırma, okuma sürerken dosya ekleme + tekrar yapıştırma → 3 sayfa, kilitlenme yok.
- Kullanıcı Hetzner sunucusunu büyütüp OCR'ı sunucuda yapmayı önerdi; önerilmedi: OCR kullanıcının cihazında bedava ve 1 vCPU sunucudan hızlı. Sunucu sadece Office → PDF için.
- **PR açılmadı**; kullanıcı onay verirse PR + merge.

## Sıradaki işler

0. **Bu oturumun branch'i önizlemede kontrol edilip `main`'e alınmalı** (kullanıcı onayıyla PR). Önizlemede dil değiştirme, `/tr/...` sayfaları, 404 ve Word → PDF denenmeli.

1. **Kullanıcı önizlemede test edecek** (Word to PDF): hızlı mod ve gizli mod. Sonucu bekle.
2. **Gizli mod / tarayıcı motoru şüpheli:**
   - Bu geliştirme ortamının headless Chromium'unda dönüşüm adımında takılıyor; eski sürüm (`bf4728d`) de takıldığı için yeni bir regresyon değil.
   - Kullanıcı gerçek tarayıcıda da takıldığını söylerse araştır: `officeToPdf` içindeki `c.convert`, `@matbee/libreoffice-converter` worker'ı.
3. PR #2 merge edildi (2026-10-14). Sunucuda `setup.sh` `main` ile çalıştırılmalı (kullanıcıya söylendi).
6. **Kullanıcının istediği sistemli test:** Bütün dönüştürücüleri farklı gerçek belgelerle (fatura, CV, rapor, Excel, sunum, taranmış PDF) deneyip hataları düzelt. Kullanıcıdan örnek dosya istendi.
4. İsteğe bağlı: sunucu tarafında şifreli belge desteği (Python UNO, `Password`).
5. Kullanıcı aynı sunucuyu başka projeleri için de kullanmak istiyor: Caddyfile'a yeni domain bloğu + yeni servis eklenir. RAM 1 GB, dikkat.

## Faydalı komutlar

```bash
npx tsc --noEmit -p . && npx eslint src   # tip + lint
npm run build                             # vendor kopyalama + next build
npm run verify:i18n
PORT=8099 node server/office-api/server.mjs   # API'yi yerelde çalıştır (soffice gerekli)
```

Notlar:
- Bu geliştirme ortamında `soffice` (LibreOffice 24.2) ve Playwright var: `/opt/node22/lib/node_modules/playwright/index.mjs`.
- Dışarıya (api.zapfile.xyz, jsDelivr) bağlantı proxy tarafından engelli olabilir.
- `pkill -f` kullanma: kendi kabuğunu da öldürüyor. PID ile `kill` yap.
