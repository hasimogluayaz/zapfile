# Devir notu (yeni Claude oturumu için)

> Önceki Claude oturumlarında yapılanları, kararları ve sıradaki işleri anlatır.
> Yeni oturumda önce bunu, sonra `AGENTS.md`'yi oku. Son güncelleme: 2026-10-14.

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
- **Dil adresleri** (bu branch'te, `main`'e henüz alınmadı): 70 aracın hepsi `/tr/…`, `/de/…`, `/fr/…` adreslerinde, o dilde başlık/açıklama, hreflang ve site haritasıyla. ES/PT/IT/JA (~%65 çeviri) ve AR (~%72) için önce çeviriler tamamlanmalı. Ayrıntı `AGENTS.md` → "Localized tool URLs".
- **Kullanıcıya önerilen diğer işler:** Bing Webmaster (GSC'den import), AlternativeTo / SaaSHub / Uneed listeleri, Türkçe sayfalar yayına girince Reddit/Ekşi/DonanımHaber paylaşımları, Product Hunt en sona. Ofis → PDF hızlı modu sunucu kullandığı için tanıtımda "hiçbir dosya yüklenmez" denmemeli.
- **Sonraki adımlar:** ES/PT/IT/JA/AR çevirilerini tamamlayıp adres açmak; dil ana sayfaları ve `/tr` araç listesi; blog yazılarının Türkçe adresleri; IndexNow.

## Sıradaki işler

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
