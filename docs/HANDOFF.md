# Devir notu (yeni Claude oturumu için)

> Bu dosya, önceki Claude oturumunda neler yapıldığını ve kaldığımız yeri anlatır.
> Yeni oturumda önce bunu ve `AGENTS.md`'yi oku. Son güncelleme: 2026-10-14.

## Çalışma kuralları (kullanıcının tercihleri)

- **Kullanıcıya kısa, Türkçe cevap ver.**
- **Branch:** `claude/vibrant-euler-lw0gi5`; buraya commit + push.
  - PR zaten açık: https://github.com/hasimogluayaz/zapfile/pull/2. Yeni PR açma.
  - **Kullanıcı onay vermeden PR'ı merge etme.** `main` = canlı site; Vercel otomatik yayınlar.
- **Önizleme:** Her push'ta Vercel önizlemesi güncellenir:
  https://zapfile-git-claude-vibrant-euler-lw0gi5-hasimogluayazs-projects.vercel.app
- **Hedef:** ZapFile'ı en az iLovePDF kadar iyi yapmak, kusursuz ve hızlı.
- **Maliyet hassasiyeti:** Kullanıcı sayısıyla büyüyen maliyetten kaçın. Örnek: Vercel bant genişliği.
  Sabit aylık ücret (VPS) kabul edildi.
- **İletişim e-postası:** `ayvexdevelopment@gmail.com`. Sitedeki bütün adresler bununla değiştirildi.

## Bu branch'te yapılanlar (özet)

Ayrıntı için: `git log --oneline origin/main..HEAD` (66+ commit).

### Görsel tasarım
- "Voltage" tasarım sistemi kuruldu (bkz. `AGENTS.md`). Arayüz bu sistemle baştan yazıldı:
  - Header, Home (DropPad), /tools, ToolCard, ToolLayout, Footer
  - arama
  - favoriler
  - dosya devri (file handoff)

### Araç seti
- v2.0'da 18 araç kaldırıldı ya da birleştirildi; eski adresler 301 ile yönlendiriliyor (`next.config.mjs`).
- Neredeyse bütün araçlar yeniden yazıldı (resim motoru, PDF araçları, metin ve dönüştürücü araçları).

### Yeni PDF araçları
- PDF → Word / Excel / PowerPoint / Markdown
- Word / Excel / PowerPoint / HTML → PDF (LibreOffice WASM)
- Organize, Watermark, Sign, Crop, Compare, Redact, Fill Form, OCR, Repair

### Dil desteği
- 9 dil var. Tam sözlükler EN/TR/DE/FR; ES/PT/IT/JA kısmi çeviriyle, eksik metinler İngilizce gösteriliyor.
- `npm run verify:i18n` çeviri anahtarlarını kontrol eder.

## Office → PDF: hız sorunu ve kaldığımız yer

### Sorun
- Tarayıcıda çalışan LibreOffice motoru ilk kullanımda ~77 MB indiriyor.
- Kullanıcı ilk dönüşümün çok yavaş olduğunu söyledi (ekranda "2 MB / 77 MB").
- iLovePDF hızlı, çünkü dosyayı kendi sunucusunda dönüştürüyor.

### Denenenler

**1. Motor parçalarını Vercel'den servis etmek** (commit `bf4728d`)
- Hızlıydı, ama her yeni ziyaretçi Vercel'e 77 MB trafik yazıyor.
- Kullanıcı maliyet yüzünden istemedi; `f3ec816` ile geri alındı.

**2. Şu anki durum** (commit `f3ec816`, `src/lib/office/engine.ts` ve `OfficeToPdfTool.tsx`)
- Motor parçaları ücretsiz CDN'lerden geliyor: önce jsDelivr; bir parça 2,5 sn içinde başlamazsa raw.githubusercontent'ten de isteniyor ("hedged" indirme), önce cevap veren kullanılıyor (`fetchPart`).
- Parçalar paralel iniyor.
- İndirme sayfa açılışında değil, kullanıcı dosya sürüklediğinde (`dragenter`) ya da dosya seçiciyi açtığında (`pointerdown`/`keydown`) başlıyor (`warmUp`).
- Açık soru (araştırılmadı): headless Chromium testlerinde dönüşüm bazen "Starting LibreOffice…" ya da "converting…" aşamasında takıldı.
  - Bu, Vercel'den servis edilen eski sürümde de bir kez oldu.
  - Gerçek hata mı, test ortamı mı, belli değil. Tekrarlı test henüz yapılmadı.

### Sunucuda dönüştürme: YAPILDI (2026-10-14)

- **Sunucu:** Hetzner Cloud, proje "Default"; CPX02 (1 vCPU / 1 GB), Nuremberg, Ubuntu 26.04, ~8 $/ay.
  - IPv4 `2.31.6.195`
  - Kullanıcı SSH'a sadece telefon hotspot'uyla bağlanabildi; ev ağı bu IP'ye "Destination net unreachable" veriyor.
- **DNS:** Domain Natro'da kayıtlı ama DNS Vercel'de. Vercel → Domains → zapfile.xyz altına `api` A kaydı `2.31.6.195` eklendi.
  - `https://api.zapfile.xyz/health` → `{"ok":true}` (HTTPS çalışıyor).
- **Kurulum:** `server/office-api/setup.sh` (branch `claude/vibrant-euler-lw0gi5` ile) çalıştırıldı.
  - Kod `/opt/zapfile` altında; ayarlar `/opt/zapfile/server/office-api/.env`.
  - Güncellemek için aynı curl komutu tekrar çalıştırılır (README'de).
  - PR merge edildikten sonra branch argümanı `main` olmalı.
- **Site tarafı:**
  - `src/lib/office/server.ts`
  - `OfficeToPdfTool.tsx`: Hızlı/Gizli mod; sunucu hatasında tarayıcı motoruna düşer; şifreli belgeler yerelde çevrilir.
  - Gizlilik sayfası ve `tools.ts` meta açıklamaları güncellendi.
  - Varsayılan API adresi kodda `https://api.zapfile.xyz`, Vercel'de env değişkeni gerekmiyor.
- **Bilinen sorun:** Tarayıcı içi LibreOffice motoru bu geliştirme ortamındaki headless Chromium'da dönüştürme sırasında takılıyor.
  - Eski sürümde de takıldığı için bugünkü değişikliklerden kaynaklanmıyor.
  - Gerçek tarayıcıda gizli mod ayrıca test edilmeli.

### (Arşiv) Sunucu planı


Kullanıcı bunu istedi; maliyet ve alan adı sorularını da sordu, cevaplandı. Son mesajında "başlayayım mı?" sorusuna henüz evet demedi, ama yön bu.

**Maliyet**
- Hetzner VPS, 2 vCPU / 4 GB, yaklaşık 5 €/ay (fiyatlar yaklaşık; güncel fiyata bakılmalı).
- ~20 TB trafik dahil. HTTPS (Let's Encrypt) ücretsiz.
- Alt alan adı: `api.zapfile.xyz`.

**Plan (henüz kod yazılmadı)**

1. **`server/office-api/`** (repoda yeni klasör)
   - Bağımlılıksız Node `http` servisi; LibreOffice'i (`soffice --headless`) çağırır.
   - `POST /convert`:
     - gövde: ham dosya
     - başlıklar: `X-Filename`, isteğe bağlı `X-Password`
     - sorgu: `?pdfa=1`
     - cevap: PDF
   - Eşzamanlı çalışma:
     - en fazla çekirdek sayısı kadar dönüşüm; fazlası kuyruğa girer
     - her slotun kendi LibreOffice profili var (`-env:UserInstallation=file:///tmp/lo-slot-N`)
   - Sınırlar ve temizlik:
     - 60 sn zaman aşımı (süreci öldür)
     - 50 MB dosya sınırı
     - IP başına istek sınırı
     - geçici dosyalar `finally` içinde silinir
     - dosya adı veya içerik loglanmaz
   - CORS: yalnızca zapfile alan adları ve `*.vercel.app` önizlemeleri (env ile ayarlanır).
   - PDF/A ve filtre seçimi:
     - PDF/A, LibreOffice 7.4+ JSON filtre seçenekleriyle (`SelectPdfVersion = 2`).
     - Filtre uzantıya göre seçilir: `writer_pdf_Export` / `calc_pdf_Export` / `impress_pdf_Export`; HTML için `writer_web_pdf_Export`.
   - Şifreli belgeler:
     - `soffice` CLI şifre almıyor; Python UNO betiği (MediaDescriptor `Password`) gerekir.
     - Alternatif: sunucu `422 {code:"password"}` döner, istemci o dosyayı tarayıcıdaki motorla çevirir.
   - Güvenlik:
     - LibreOffice profilinde makrolar kapalı.
     - Converter container'ı `internal: true` Docker ağında olmalı (dışarı çıkışı yok; belgelerdeki uzak bağlantılar üzerinden SSRF engellenir).
     - Önünde Caddy (HTTPS) iki ağa bağlı.
   - Dosyalar:
     - `Dockerfile` (debian + `libreoffice-nogui` + fontlar: `fonts-dejavu`, `fonts-liberation`, `fonts-noto` vb.)
     - `docker-compose.yml` (api + caddy)
     - `Caddyfile`
     - `README.md`: Hetzner'de adım adım kurulum, DNS A kaydı, tek komut `docker compose up -d`.

2. **İstemci:** `src/lib/office/server.ts`
   - `serverToPdf(file, {pdfa, password}, signal)`; adres `NEXT_PUBLIC_OFFICE_API_URL` env değişkeninden okunur.
   - Yükleme ilerlemesi için XHR kullanılabilir.

3. **`OfficeToPdfTool.tsx`**
   - Env ayarlıysa varsayılan "Hızlı mod (sunucu)", yanında "Gizli mod (cihazda)" seçeneği (Segmented, `localStorage`'da hatırlanır).
   - Hızlı modda cross-origin isolation gerekmez, sayfa yeniden yüklenmez.
   - Sunucu hatası, ağ hatası veya şifreli belgede otomatik olarak tarayıcı motoruna düşer.

4. **Metinler**
   - `FileDropzone` ve Office araçlarındaki "dosyaların cihazından çıkmaz" metni hızlı modda değiştirilmeli.
   - Yeni metin: dosya HTTPS ile sunucuya gider, çevrilir, hemen silinir, saklanmaz.
   - i18n: EN/TR/DE/FR eklenecek.
   - Gizlilik politikası (`src/app/privacy/page.tsx` ve i18n metinleri) güncellenecek.
   - `tools.ts` ve SSS'deki yerel işlem iddiaları kontrol edilecek.

5. **`AGENTS.md`'deki "Office → PDF" bölümüne** sunucu modu eklenecek.

6. **Kullanıcının yapacakları** (ona adım adım anlatılacak)
   - Hetzner hesabı açıp sunucu kiralamak.
   - DNS'te `api.zapfile.xyz` için A kaydı eklemek.
   - Sunucuda kurulum komutunu çalıştırmak.
   - Vercel'de `NEXT_PUBLIC_OFFICE_API_URL=https://api.zapfile.xyz` ayarını eklemek.

**Yerel test**
- Bu geliştirme ortamında `soffice` (LibreOffice 24.2), `python3-uno` ve `docker` var.
- Örnek docx: `/tmp/claude-0/pw/v/pdf-to-word__complex.docx`. Bu dosya geçici dizinde, yeni ortamda olmayabilir.
- Playwright: `/opt/node22/lib/node_modules/playwright/index.mjs`.

## Faydalı komutlar

```bash
npx tsc --noEmit -p . && npx eslint src   # tip + lint
npm run build                             # vendor kopyalama + next build
npm run verify:i18n
```
