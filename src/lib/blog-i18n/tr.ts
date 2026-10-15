/* Turkish blog post bodies (markdown), keyed by post slug. Tool links are rewritten to /tr/... on render. */
const posts: Record<string, string> = {
  "how-to-compress-images-without-losing-quality": `# Kaliteyi Kaybetmeden Resimler Nasıl Sıkıştırılır?

Büyük resim dosyaları web sitelerini yavaşlatır, depolama alanını doldurur ve paylaşmayı zorlaştırır. İyi haber şu: doğru yöntemi seçerseniz dosya boyutunu, gözle görülür bir kalite kaybı olmadan ciddi ölçüde küçültebilirsiniz.

## Resim Sıkıştırmayı Anlamak

Sıkıştırmanın iki ana türü vardır:

- **Kayıpsız sıkıştırma**, hiçbir piksel bilgisini atmadan gereksiz veriyi kaldırır. Açılan resim orijinalin birebir aynısıdır. PNG varsayılan olarak kayıpsız sıkıştırma kullanır.
- **Kayıplı sıkıştırma**, insan gözünün fark etmesi zor olan verileri seçerek atar. JPEG ve WebP kayıplı sıkıştırmayı destekler; fotoğraflarda çok daha küçük dosyalar elde etmelerinin nedeni budur.

"Kaliteyi kaybetmeden" sıkıştırmanın püf noktası, atılan verinin fark edilmediği aralıkta kalmaktır. Çoğu fotoğrafta 75-85 arası JPEG kalitesi, normal boyutta bakıldığında hiçbir fark göstermeden orijinalden %60-80 daha küçük dosyalar üretir.

## Pratik Yöntemler

### 1. Doğru Formatı Seçin

Kullandığınız format, herhangi bir kaydırıcı ayarından daha önemlidir:

- **JPEG**, fotoğraflar ve çok renkli karmaşık görseller için en iyisidir.
- **PNG**, grafikler, logolar, ekran görüntüleri ve saydam resimler için en iyisidir.
- **WebP** iki durumu da iyi yönetir ve aynı kalitede genellikle JPEG'den %25-35 daha küçük dosyalar üretir. Modern tarayıcıların çoğu destekler.

Formatlar arasında dönüştürmeniz gerekirse [ZapFile'ın resim dönüştürücüsü](/tools/convert-image) bunu tarayıcınızda anında yapar.

### 2. Sıkıştırmadan Önce Boyutlandırın

Sık yapılan bir hata, yalnızca 800x600 gösterilecek 4000x3000'lik bir fotoğrafı sıkıştırmaktır. Önce gerçek gösterim boyutuna küçültmek, daha sıkıştırma yapılmadan dosya boyutunu %90 azaltabilir. Tam ölçü vermek veya yüzdeyle küçültmek için [ZapFile'ın resim boyutlandırıcısını](/tools/resize-image) kullanın.

### 3. Akıllı Kalite Ayarları Kullanın

JPEG veya WebP olarak kaydederken kalite ayarı, verinin ne kadar agresif atılacağını belirler:

- **90-100**: Neredeyse kayıpsız, büyük dosyalar. Arşiv veya baskı için.
- **75-85**: Web için ideal aralık. Normal boyutta orijinalden ayırt edilemez.
- **50-70**: Yakından bakınca hafif yumuşama fark edilir, ama küçük önizlemeler için yeterlidir.

### 4. Meta Verileri Silin

Fotoğraf makinesi ve telefon fotoğrafları EXIF meta verisi içerir: GPS koordinatları, kamera modeli, enstantane hızı ve daha fazlası. Bu veri her resme 50-100 KB ekleyebilir. Silmek hem boyutu küçültür hem de gizliliğinizi korur. Resimlerinizde hangi meta verilerin bulunduğunu [ZapFile'ın EXIF görüntüleyicisiyle](/tools/exif-viewer) inceleyebilirsiniz.

## Yükleme Yapmadan Toplu Sıkıştırma

Birçok çevrim içi araç resimlerinizi bir sunucuya yüklemenizi ister; bu da gizlilik endişesi ve dosya boyutu sınırları getirir. [ZapFile'ın resim sıkıştırıcısı](/tools/compress-image) gibi tarayıcı tabanlı araçlar her şeyi cihazınızda işler. Resimleriniz bilgisayarınızdan hiç çıkmaz, dosya boyutu kısıtlaması yoktur ve sonuç anında gelir.

## Hızlı Kontrol Listesi

- Doğru formatı seçin (fotoğraf için JPEG, grafik için PNG, ikisi için de WebP).
- Gerçekten ihtiyaç duyduğunuz boyuta küçültün.
- Web için kaliteyi 75-85 yapın.
- Gereksiz meta verileri silin.
- Kolaylık için gizliliğe saygılı, tarayıcı tabanlı bir sıkıştırıcı kullanın.

Bu adımları izlerseniz, fark edilir bir kalite kaybı olmadan her seferinde daha küçük dosyalar elde edersiniz.`,

  "jpg-vs-png-vs-webp-which-format-to-use": `# JPG mi, PNG mi, WebP mi? Hangi Resim Formatını Kullanmalısınız?

Yanlış resim formatını seçmek, görünür hiçbir fayda sağlamadan dosya boyutunu iki üç katına çıkarabilir. Bu rehber en yaygın üç formatı açıklıyor; böylece her seferinde hızlı ve bilinçli karar verebilirsiniz.

## JPEG (JPG)

JPEG, 1990'lardan beri webde fotoğrafların varsayılan formatıdır. Kayıplı sıkıştırma kullanır; yani daha küçük dosya için bazı verileri kalıcı olarak atar.

**En uygun olduğu yerler:**
- Fotoğraflar ve yumuşak renk geçişli görseller
- Sosyal medya paylaşımları
- Az miktarda kalite kaybının sorun olmadığı her resim

**Sınırlamaları:**
- Saydamlığı desteklemez
- Kayıplı kaliteyle her yeniden kaydetmede resim biraz daha bozulur
- Metin, çizim ve keskin kenarlar için ideal değildir

Yüksek kaliteli bir JPEG fotoğraf, aynı resmin PNG halinden genellikle 5-10 kat daha küçüktür.

## PNG

PNG kayıpsız sıkıştırma kullanır; açılan resim orijinalin kusursuz bir kopyasıdır. Tam saydamlığı da desteklediği için logolar, simgeler ve arayüz öğeleri için vazgeçilmezdir.

**En uygun olduğu yerler:**
- Logolar, simgeler ve keskin kenarlı grafikler
- Ekran görüntüleri ve metin içeren resimler
- Saydam arka plan gereken her resim
- Defalarca düzenlenip yeniden kaydedilecek resimler

**Sınırlamaları:**
- Fotoğraflarda çok daha büyük dosyalar (çoğu zaman JPEG'den 3-5 kat büyük)
- Yerleşik animasyon desteği yoktur (bu iş GIF ve APNG'nindir)

## WebP

Google'ın geliştirdiği WebP hem kayıplı hem kayıpsız sıkıştırmayı, ayrıca saydamlık ve animasyonu destekler. Aynı kalitede JPEG ve PNG'den sürekli daha küçük dosyalar üretir.

**En uygun olduğu yerler:**
- Mümkün olan en küçük dosyanın istendiği web yayınları
- Hem kalite hem saydamlık gereken resimler
- Progresif web uygulamaları ve performans odaklı siteler

**Sınırlamaları:**
- Bazı çok eski tarayıcılar desteklemez (yine de küresel destek %97'nin üzerinde)
- Bazı masaüstü resim görüntüleyici ve editörlerde WebP desteği sınırlıdır
- Baskı süreçlerinde daha az kabul görür

## Yan Yana Karşılaştırma

| Özellik | JPEG | PNG | WebP |
|---|---|---|---|
| Sıkıştırma | Kayıplı | Kayıpsız | İkisi de |
| Saydamlık | Yok | Var | Var |
| Animasyon | Yok | Yok | Var |
| En uygun | Fotoğraf | Grafik | İkisi de |
| Göreli boyut | Küçük | Büyük | En küçük |
| Tarayıcı desteği | Evrensel | Evrensel | %97+ |

## Nasıl Seçmeli?

Basit bir karar süreci:

1. **Fotoğraf mı?** 80 kalitede JPEG kullanın; kitleniz destekliyorsa WebP.
2. **Saydamlık gerekiyor mu?** En geniş uyumluluk için PNG, daha küçük dosya için WebP.
3. **Logo, simge veya ekran görüntüsü mü?** PNG kullanın.
4. **Web performansı için mi optimize ediyorsunuz?** JPEG yedekli WebP kullanın.

## Formatlar Arasında Dönüştürme

Resimleriniz yanlış formattaysa dönüştürmek kolaydır. [ZapFile'ın resim dönüştürücüsü](/tools/convert-image) bu formatların hepsini destekler ve dosyaları tamamen tarayıcınızda işler. Yükleme yok, bekleme yok, dosya boyutu sınırı yok.

Dönüştürdükten sonra kalite ayarını ince ayarlamak için [ZapFile'ın resim sıkıştırıcısını](/tools/compress-image) da kullanabilir, boyut ile netlik arasında en iyi dengeyi yakalayabilirsiniz.

## Özet

Tek bir "en iyi" format yoktur. JPEG fotoğraflarda öne çıkar, PNG keskin kenarlı veya saydam grafiklerde rakipsizdir, WebP ise en küçük dosyaları veren modern çok yönlü formattır. İçeriğinize ve kitlenize uyan formatı seçin, her seferinde en iyi sonucu alırsınız.`,

  "how-to-merge-pdf-files-online-free": `# PDF Dosyaları Ücretsiz Online Nasıl Birleştirilir?

Faturaları bir araya getirmek, ayrı bölümlerden bir rapor oluşturmak ya da bir müşteriye belgeleri tek pakette göndermek... PDF birleştirme, insanların en sık ihtiyaç duyduğu dosya işlerinden biridir. İşte bunu hızlıca, ücretsiz ve gizliliğinizden ödün vermeden yapmanın yolu.

## Neden PDF Birleştirilir?

Birden fazla PDF eki göndermek dağınıktır. Alıcı her dosyayı ayrı ayrı indirip açmak zorunda kalır ve sıralama karışabilir. Tek bir birleşik belge paylaşması da okuması da daha kolaydır ve daha profesyonel görünür.

Sık karşılaşılan durumlar:

- Taranmış sayfaları tek belgede toplamak
- Farklı ekiplerden gelen sözleşme bölümlerini bir araya getirmek
- Birden çok ek içeren bir portfolyo veya başvuru hazırlamak
- PDF'e aktarılmış birkaç sunumdan tek bir doküman oluşturmak

## Yöntem 1: Tarayıcı Tabanlı Araçlar (En Hızlı ve En Gizli)

Tarayıcı tabanlı PDF araçları dosyalarınızı doğrudan cihazınızda işler. Hiçbir şey sunucuya yüklenmez; belgeleriniz tamamen gizli kalır.

[ZapFile'ın PDF Birleştirme aracı](/tools/merge-pdf) böyle çalışır:

1. Aracı tarayıcınızda açın.
2. PDF dosyalarınızı yükleme alanına sürükleyip bırakın ya da tıklayıp seçin.
3. Dosyaları sürükleyerek istediğiniz sıraya koyun.
4. Birleştirilmiş PDF'i indirin.

Bütün işlem saniyeler sürer, istediğiniz kadar dosyayla çalışır ve her şey yerelde çalıştığı için dosya boyutu sınırı yoktur.

## Yöntem 2: Masaüstü Yazılımları

PDF'lerle sık sık çevrim dışı çalışıyorsanız Adobe Acrobat, PDF-XChange Editor veya ücretsiz PDFsam gibi masaüstü uygulamaları dosya birleştirebilir. Dezavantajı, tam özellikli PDF editörlerinin çoğunun ücretli lisans istemesi ve ücretsiz alternatiflerin kurulumunun zahmetli olabilmesidir.

## Yöntem 3: Komut Satırı Araçları

Teknik kullanıcılar için Ghostscript veya Python kütüphanesi PyPDF2 gibi araçlar, komut satırı betikleriyle PDF birleştirebilir. Otomasyon için kullanışlıdır ama tek seferlik işler için fazlasıdır.

## Gizlilik Önemlidir

Popüler çevrim içi PDF araçlarının çoğu dosyalarınızı işlemek için uzak sunuculara yükler. Yani belgeleriniz üçüncü taraf altyapısından geçer ve sonradan silindiğine güvenmeniz gerekir. Sözleşme, vergi belgesi veya sağlık kaydı gibi hassas belgelerde bu gerçek bir endişedir.

Tarayıcı tabanlı araçlar bu riski tamamen ortadan kaldırır. [ZapFile](/) ile PDF birleştirdiğinizde dosyalarınız cihazınızdan hiç çıkmaz. İşlem tarayıcı sekmenizde çalışan JavaScript ve WebAssembly ile yapılır. Sekmeyi kapattığınızda hiçbir sunucuda hiçbir şey kalmaz, çünkü hiçbir şey gönderilmemiştir.

## Temiz Bir Birleştirme İçin İpuçları

- Birleştirmeden önce **sayfa yönünü kontrol edin**. Bazı sayfalar yatay, bazıları dikeyse birleşik dosya tutarsız görünebilir.
- Önce **gereksiz sayfaları çıkarın**. Birleştirmeden önce yalnızca ihtiyacınız olan sayfaları almak için [PDF ayırıcıyı](/tools/split-pdf) kullanın.
- Birleştirdikten sonra belgeyi kaydırarak **son hali kontrol edin** ve sayfa sırasının doğru olduğundan emin olun.

## Özet

PDF birleştirmek pahalı yazılım ya da hassas belgeleri bilinmeyen sunuculara yüklemeyi gerektirmez. [ZapFile'ın PDF Birleştirme aracı](/tools/merge-pdf) gibi tarayıcı tabanlı bir araç anında sonuç verir, her dosya boyutunu kaldırır ve belgelerinizi gizli tutar. Aracı açın, dosyalarınızı bırakın; saniyeler içinde bitti.`,

  "best-free-online-file-tools-2025": `# 2025'in En İyi Ücretsiz Online Dosya Araçları

Web dosya araçlarıyla dolu, ama çoğu reklam doludur, ücretsiz sürümde sıkı sınırlar koyar ya da hassas belgeleri bilinmeyen sunuculara yüklemenizi ister. Bu rehber gerçekten ücretsiz, hızlı ve gizliliğinize saygılı araçları öne çıkarıyor.

## Bir Online Dosya Aracında Nelere Bakmalı?

Araçlara geçmeden önce önemli olan kriterler:

- **Hesap gerektirmemeli.** Bir resmi sıkıştırmak için bile üye olmanızı istiyorsa geçin.
- **Dosya boyutu sınırı olmamalı.** Yapay sınırlar sizi ücretli plana yönlendirmek içindir.
- **Gizliliği önceleyen işleme.** En iyi araçlar dosyaları tarayıcınızda işler, hiçbir şey yüklenmez.
- **Temiz arayüz.** İşinizi yapmak için açılır pencereler ve afişler arasında dolaşmanız gerekmemeli.

## PDF Araçları

### PDF Birleştirme, Ayırma ve Sıkıştırma

PDF evrensel belge formatıdır ve onunla çalışmak pahalı yazılım gerektirmemelidir. [ZapFile](/tools/merge-pdf), tamamen tarayıcıda çalışan eksiksiz bir PDF araç seti sunar:

- **PDF Birleştirme** - Birden fazla dosyayı sürükle-bırak sıralamayla tek belgede birleştirin.
- **PDF Ayırma** - Belirli sayfaları veya sayfa aralıklarını ayrı dosyalara çıkarın.
- **PDF'i Resme Çevirme** - PDF'in her sayfasını yüksek kaliteli PNG veya JPEG'e dönüştürün.

Tüm işlem yerelde yapıldığı için sözleşmeler, finansal belgeler ve diğer hassas dosyalarla güvenle çalışabilirsiniz.

## Resim Araçları

### Resim Sıkıştırma ve Dönüştürme

Resim optimizasyonu web performansı ve depolama tasarrufu için şarttır. Herkese aynı sıkıştırmayı uygulamak yerine kalite ayarını size bırakan araçları tercih edin.

[ZapFile'ın resim araçları](/tools/compress-image) şunları içerir:

- **Resim Sıkıştırıcı** - JPEG, PNG ve WebP dosyalarını ayarlanabilir kaliteyle küçültün.
- **Resim Dönüştürücü** - JPG, PNG, WebP ve AVIF arasında anında geçiş yapın.
- **Resim Boyutlandırıcı** - Tam ölçü verin veya yüzdeyle ölçekleyin.
- **EXIF Görüntüleyici** - Fotoğraflarınızın meta verilerini doğrudan tarayıcıda görün, inceleyin ve silin.

### Oluşturma ve Düzenleme

Temel sıkıştırmanın ötesinde işe yarayan resim araçları:

- **Kolaj Oluşturucu** - Birden çok fotoğrafı ızgara düzenlerinde yerleştirin.
- **Caps (Meme) Oluşturucu** - Resimlere yazı tipi ve konumu ayarlanabilir metinler ekleyin.
- **Favicon Oluşturucu** - Herhangi bir resimden doğru boyutlarda favicon dosyaları üretin.

ZapFile bunların hepsini [zapfile.xyz/tools](/tools) adresinde sunar.

## Yardımcı Araçlar

En çok zaman kazandıran araçlardan bazıları ara sıra başvurduğunuz küçük yardımcılardır:

- **QR Kod Oluşturucu** - Bağlantı, metin veya iletişim bilgisi için QR kod oluşturun. [ZapFile'ın QR oluşturucusu](/tools/qr-generator) renkleri özelleştirmenize ve farklı formatlarda indirmenize olanak tanır.
- **Şifre Oluşturucu** - Uzunluğu ve karakter türleri ayarlanabilen güçlü, rastgele şifreler üretin.
- **JSON Formatlayıcı** - Dağınık JSON'u yapıştırın, anında düzenlenmiş ve doğrulanmış olarak alın.
- **Fark Bulucu** - İki metni yan yana karşılaştırıp farkları görün.
- **Kelime Sayacı** - Kelime, karakter ve cümleleri sayın, okuma süresini tahmin edin.

## Tarayıcı Tabanlı Araçlar Neden Kazanıyor?

2025'te eğilim açıkça tarayıcıda işlemeye doğru. Modern tarayıcılar, eskiden masaüstü yazılımı ya da sunucu gerektiren işleri yapabiliyor. Avantajlar ortada:

- **Gizlilik** - Dosyalarınız cihazınızdan çıkmaz.
- **Hız** - Yükleme ve indirme beklemesi yoktur.
- **Sınır yok** - Yapay dosya boyutu sınırları yoktur.
- **Kurulum yok** - Modern tarayıcısı olan her cihazda çalışır.

## Özet

Abonelik ödemenize ya da dosyalarınızı rastgele sunuculara emanet etmenize gerek yok. [ZapFile](/) gibi araçlar PDF, resim, video, ses ve günlük yardımcı işleri kapsayan, gizliliği önceleyen kapsamlı bir araç seti sunar. En çok kullandıklarınızı yer imlerine ekleyin ve reklamla dolu alternatiflerle vakit kaybetmeyi bırakın.`,

  "why-browser-based-tools-are-more-private": `# Tarayıcı Tabanlı Araçlar Neden Bulut Alternatiflerinden Daha Gizlidir?

Bir resmi sıkıştırmak ya da PDF birleştirmek için tipik bir çevrim içi araç kullandığınızda dosyanız uzak bir sunucuya yüklenir, orada işlenir ve size geri gönderilir. O sunucunun verinizi sorumlu şekilde işleyeceğine, hemen sileceğine ve sızıntılara karşı koruyacağına güvenirsiniz. Tarayıcı tabanlı araçlar bu güven ihtiyacını tamamen ortadan kaldırır.

## Bulut Tabanlı Araçlar Nasıl Çalışır?

Çevrim içi dosya araçlarının geleneksel modeli şu adımları izler:

1. Cihazınızda bir dosya seçersiniz.
2. Dosya internet üzerinden aracın sunucusuna yüklenir.
3. Sunucu dosyayı işler (sıkıştırır, dönüştürür, birleştirir vb.).
4. İşlenen dosya indirmeniz için tarayıcınıza geri gönderilir.
5. Sunucunun dosyanızı silmesi gerekir, ama bunu doğrulamanın bir yolu yoktur.

Her aşamada dosyanız kontrol etmediğiniz bir altyapıda bulunur. Üçüncü tarafların işlettiği ağ yönlendiricileri, yük dengeleyiciler ve depolama sistemlerinden geçer. Hizmetin niyeti iyi olsa bile bir veri sızıntısı, yanlış yapılandırılmış bir sunucu ya da kötü niyetli bir çalışan dosyalarınızı açığa çıkarabilir.

## Tarayıcı Tabanlı Araçlar Nasıl Çalışır?

Tarayıcı tabanlı araçlar temelden farklı bir yaklaşım izler:

1. Aracı tarayıcınızda açarsınız.
2. Aracın kodu (JavaScript ve bazen WebAssembly) tarayıcınıza yüklenir.
3. Bir dosya seçersiniz; doğrudan cihazınızdan tarayıcının belleğine okunur.
4. İşlem tamamen tarayıcı sekmeniz içinde yapılır.
5. Sonuç yerelde oluşturulur ve kendi cihazınızdan indirirsiniz.

Dosyanız hiçbir uzak sunucuya dokunmaz. Ele geçirilecek, sızdırılacak ya da silinecek bir şey yoktur, çünkü veri makinenizden hiç çıkmamıştır.

## Bunu Mümkün Kılan Ne?

Modern tarayıcılar son derece güçlüdür. Yerel dosya işlemeyi mümkün kılan teknolojiler:

- Resim düzenleme, boyutlandırma ve format dönüştürme için **Canvas API**.
- Ses işleme ve dönüştürme için **Web Audio API**.
- Derlenmiş kodu neredeyse yerel hızda çalıştıran **WebAssembly (WASM)**. [ZapFile](/) gibi araçlar karmaşık PDF işlemlerini ve resim işlemeyi bu sayede tamamen tarayıcıda yapabilir.
- Sunucuya gerek kalmadan dosya okuyup yazmak için **File API ve Blob işleme**.

Bu API'ler son yıllarda çok olgunlaştı ve tarayıcıda işleme ile sunucuda işleme arasındaki performans farkını kapattı.

## Gerçek Hayatta Gizlilik Etkileri

İnsanların çevrim içi işlediği dosyalara bir bakın:

- Hesap numaraları ve gelir bilgileri içeren **vergi belgeleri ve finansal tablolar**.
- Gizli maddeler içeren **sözleşmeler ve hukuki belgeler**.
- Yasal düzenlemelerle korunan **sağlık kayıtları**.
- GPS koordinatı ve zaman damgası içeren EXIF verili **fotoğraflar**.
- Şirkete özel bilgi içeren **iş belgeleri**.

Bunlardan herhangi birini bulut tabanlı bir araca yüklemek, başkasının sunucusunda bir kopya oluşturur. [ZapFile](/) gibi tarayıcı tabanlı bir araçla bu dosyalar işlem boyunca cihazınızda kalır. (ZapFile'daki tek istisna, Word, Excel, PowerPoint ve HTML'den PDF'e araçlarının isteğe bağlı hızlı modudur: dosyayı sunucumuzda çevirir ve hemen siler. Bu araçların gizli modu ise dönüşümü tarayıcınızda yapar.)

## Bir Aracın Gerçekten Tarayıcı Tabanlı Olduğunu Nasıl Doğrularsınız?

"Gizli" olduğunu söyleyen her araç dosyaları gerçekten yerelde işlemez. Doğrulamanın yolları:

### Ağ Etkinliğini Kontrol Edin

Tarayıcınızın geliştirici araçlarını açın (F12), Ağ (Network) sekmesine geçin ve bir dosya işleyin. Aracın sunucusuna büyük yükleme istekleri görüyorsanız dosyanız buluta gönderiliyordur.

### Çevrim Dışı Çalışıp Çalışmadığına Bakın

Gerçekten tarayıcı tabanlı bir araç, sayfa yüklendikten sonra internet bağlantısı kesilse bile çalışmalıdır. Wi-Fi'ı kapatıp bir dosya işlemeyi deneyin. Hâlâ çalışıyorsa işlem gerçekten yereldir.

### Gizlilik Politikasını Okuyun

Gerçek tarayıcı tabanlı araçlar dosyaların yüklenmediğini açıkça belirtir. Ayrıntı vermeden "gizliliğinizi ciddiye alıyoruz" gibi belirsiz ifadelere şüpheyle yaklaşın.

## Ödünleşimler

Tarayıcıda işlemenin de sınırları vardır:

- **İşlem hızı** cihazınıza bağlıdır. Güçsüz bir telefon, özel donanımlı bir bulut sunucusundan daha yavaştır.
- **Çok büyük dosyalar** belleği az cihazları zorlayabilir.
- OCR veya yapay zekâyla arka plan kaldırma gibi **ağır işlemler** ilk seferde bir model ya da motor indirir, bu biraz zaman alır. ZapFile ikisini de tarayıcıda çalıştırır.

Yine de yaygın dosya işlerinin büyük çoğunluğunda tarayıcı tabanlı araçlar yeterince hızlıdır ve gizlilik faydaları büyüktür.

## Özet

Bulut alternatifleri yerine tarayıcı tabanlı araçları seçmek, dosya gizliliğinizi korumak için atabileceğiniz en basit adımlardan biridir. [ZapFile](/) gibi araçlar, gizlilik için kolaylıktan vazgeçmeniz gerekmediğini gösteriyor. Bir dahaki sefere resim sıkıştırırken, PDF birleştirirken ya da video dönüştürürken aracın dosyaları yerelde işleyip işlemediğine bakın. Verileriniz korunmaya değer.`,

  "how-to-compress-pdf-on-iphone": `# iPhone'da PDF Nasıl Sıkıştırılır?

iPhone'lar PDF'lerle her yerde karşılaşır: e-posta ekleri, indirmeler, taramalar. Bir dosya e-postayla göndermek ya da yüklemek için fazla büyükse çözüm sıkıştırmaktır. İşte gizliliğe saygılı pratik bir yol.

## Boyut neden önemli?

Büyük PDF'ler e-posta sınırlarına takılır, formlara yüklemeyi yavaşlatır ve depolama alanını boşa harcar. Sıkıştırma, belgeyi okunabilir tutarken boyutu küçültür.

## Tarayıcıda sıkıştırma

Safari, tarayıcıda çalışan **ZapFile** ve benzeri araçları açabilir. PDF'iniz cihazda kalır; işlem yerelde JavaScript ile yapılır. Böylece hassas sözleşmeleri bilinmeyen sunuculara yüklemekten kaçınırsınız.

## Adımlar

1. Safari'de [PDF Sıkıştır](/tools/pdf-compress) aracını veya benzerini açın.
2. PDF'inizi Dosyalar'dan veya Fotoğraflar'dan seçin.
3. Küçülen dosyayı indirin.

## İpuçları

- Taramalarda, uygulama izin veriyorsa dışa aktarmadan önce çözünürlüğü düşürmeyi deneyin.
- Sıkıştırmadan sonra yazılar bulanıklaşıyorsa sıkıştırma seviyesini azaltın ya da belgeyi bölün.

## Özet

**iPhone'da PDF sıkıştırma** için dosyaların tarayıcıda işlendiğini açıkça belirten araçları tercih edin. [ZapFile](/tools), yükleme yapmadan sıkıştırma ve diğer araçları sunar.`,

  "jpg-vs-webp-which-is-better": `# JPG mi WebP mi? Hangisi Daha İyi?

**JPEG** onlarca yıldır fotoğrafların varsayılan formatıdır. **WebP** ise daha iyi sıkıştırma ve isteğe bağlı saydamlık sunan, Google'ın modern formatıdır.

## Dosya boyutu

Benzer görsel kalitede WebP çoğu zaman JPEG'den **%25-35 daha küçük** dosyalar üretir. Bu, Core Web Vitals değerlerini ve SEO'yu iyileştirir.

## JPEG ne zaman kullanılmalı?

- Eski sistemlerle en geniş uyumluluk gerektiğinde.
- Varsayılan olarak JPEG kaydeden kameralar ve telefonlar için.

## WebP ne zaman kullanılmalı?

- Modern tarayıcıların beklendiği web siteleri ve uygulamalarda.
- Görünür kayıp olmadan daha küçük dosyalar istediğinizde.

## Dönüştürme

PNG veya JPEG'i tarayıcınızda WebP'ye çevirmek için [ZapFile'ın resim dönüştürücüsünü](/tools/convert-image) kullanın.

## Özet

Çoğu web projesinde boyut açısından **WebP daha iyidir**; evrensel uyumluluk için yedek format olarak **JPEG** kalır.`,

  "what-is-qr-code-how-to-create": `# QR Kod Nedir?

**QR kod**, telefon kamerasıyla okunabilen kare bir desen içinde metin saklar; çoğu zaman bir bağlantı, Wi-Fi ayarı ya da iletişim bilgisi.

## Yaygın kullanımlar

- Restoran menüleri ve el ilanları
- Uygulama indirme bağlantıları
- Etkinlik biletleri

## QR kod oluşturma

[ZapFile'ın QR kod oluşturucusunu](/tools/qr-generator) kullanın: bağlantınızı veya metninizi yazın, resmi indirin. Hesap gerekmez; kod tarayıcıda üretilir.

## Özet

QR kodlar basılı malzemeyle dijital dünyayı birleştirir. Ücretsiz ve gizli oluşturmak için verinizi buluta yüklemeyen bir oluşturucu kullanın.`,

  "how-to-merge-pdf-files-step-by-step": `# PDF Dosyaları Nasıl Birleştirilir?

Birleştirme, PDF'leri tek dosyada toplar; raporlar, başvurular ve arşivler için idealdir.

## Adımlar

1. Bütün PDF'leri toplayın ve sırasına karar verin.
2. Tarayıcınızda **PDF Birleştirme** aracını açın.
3. Dosyaları sırasıyla ekleyin.
4. Birleşik PDF'i indirin.

## Gizlilik

Sözleşmeleriniz ve kimlik belgeleriniz bilgisayarınızdan çıkmasın diye dosyaları yerelde işleyen [PDF birleştirme araçlarını](/tools/merge-pdf) seçin.

## Özet

Birleştirmek kolaydır; asıl seçim **güvendir**. Tarayıcıda işlemeyi tercih edin.`,

  "how-to-split-pdf-extract-pages": `# PDF Nasıl Ayrılır?

Ayırma, dosyanın tamamını göndermeden sayfaları ya da bölümleri çıkarmanızı sağlar.

## Kullanım alanları

- Yalnızca ilgili sayfaları e-postayla göndermek
- Boş veya hassas sayfaları çıkarmak

## Araç

Tarayıcınızda [PDF Ayırma](/tools/split-pdf) aracıyla sayfaları seçin; ayrı dosyalar ya da ZIP olarak indirin.

## Özet

Ayırma, iş akışlarının vazgeçilmez parçasıdır. Mümkün olduğunda dosyaları yerelde tutun.`,

  "free-pdf-tools-no-signup": `# Üyeliksiz Ücretsiz PDF Araçları

Birçok araç, analiz ya da satış amacıyla hesap açmanızı zorunlu kılar. **Üyelik gerektirmeyen** araçlar işi kolaylaştırır ve çoğu zaman gizlilikle de uyumludur.

## Uyarı işaretleri

- Basit işler için bile zorunlu bulut yüklemesi
- Verilerin ne kadar saklandığına dair belirsiz politikalar

## İyi işaretler

- Tarayıcıda işleme
- Açık gizlilik beyanları

## ZapFile

[ZapFile](/), hesap gerektirmeyen düzinelerce PDF ve resim aracı sunar. Neredeyse her şey tarayıcınızda çalışır; yalnızca Office'ten PDF'e araçlarının isteğe bağlı hızlı modu dosyayı sunucumuzda çevirir ve hemen siler.

## Özet

Bir şifre daha oluşturmadan PDF birleştirebilir, ayırabilir ve sıkıştırabilirsiniz.`,

  "compress-image-for-web-core-web-vitals": `# Resimler ve Core Web Vitals

**Largest Contentful Paint (LCP)** çoğu zaman sayfanın ana görseline bağlıdır. Ağır dosyalar görüntülenme süresini geciktirir ve sıralamayı düşürür.

## Strateji

1. Doğru formatı seçin (mümkünse WebP/AVIF).
2. Gösterim boyutuna küçültün.
3. Makul bir kaliteyle sıkıştırın.

## Araç

Kalite ve en büyük boyut kaydırıcılarıyla [Resim Sıkıştırma](/tools/compress-image) aracını kullanın.

## Özet

Daha küçük resimler SEO'yu ve kullanıcı deneyimini iyileştirir. Rekabetçi siteler için sıkıştırma isteğe bağlı değildir.`,

  "remove-pdf-metadata-privacy": `# Meta Veriler ve Gizlilik

PDF'ler ve resimler **meta veri** içerebilir: yazar, oluşturma tarihi, GPS koordinatları ve kamera modeli.

## Riskler

Dosyaları herkese açık paylaşmak, istediğinizden fazlasını açığa çıkarabilir.

## Önlemler

- Verileri incelemek için bir **EXIF görüntüleyici** kullanın.
- Gerektiğinde yayınlamadan önce meta verileri silin.

## Araçlar

[EXIF Görüntüleyici](/tools/exif-viewer) resimlerdeki gömülü verileri gösterir ve bu veriler olmadan temiz bir kopya kaydeder. Bir resmi [Resim Sıkıştırma](/tools/compress-image) ile yeniden kodlamak da EXIF verilerini siler.

## Özet

Meta veriler görünmez ama gerçektir. Paylaşmadan önce kontrol edin.`,

  "jwt-tokens-explained-developers": `# JWT Nedir?

Bir **JWT** üç bölümden oluşur: başlık (header), içerik (payload) ve imza (signature); hepsi **base64url** ile kodlanır.

## Çözme

Talepleri (claims) incelemek için tarayıcıda [JWT Çözücü](/tools/jwt-decoder) kullanın. Çözülmüş içeriğe, imzayı sunucuda doğrulamadan **asla** güvenmeyin.

## Özet

JWT'ler API'ler için kullanışlıdır; çözmek öğreticidir ama yetkilendirme değildir.`,

  "uuid-vs-nanoid": `# UUID mi Nanoid mi?

**UUID'ler**, standart bir metin biçimine sahip 128 bitlik kimliklerdir. **Nanoid** ise benzer rastgelelikte, daha kısa ve URL'de güvenle kullanılabilen kimlikler üretir.

## Üretme

Testler ve betikler için hızlı rastgele kimlikler üretmek üzere [UUID Oluşturucu](/tools/uuid-generator) aracını kullanın.

## Özet

Birlikte çalışabilirlik için UUID'yi, daha kısa metinler istediğinizde Nanoid'i seçin.`,

  "qr-code-scanner-vs-generator": `# Okuyucu mu, Oluşturucu mu?

- **Oluşturucu**: Metin veya bağlantıdan QR kod oluşturur.
- **Okuyucu**: Yüklenen bir resimden ya da kameradan QR kodu okur.

ZapFile hem [QR Kod Oluşturucu](/tools/qr-generator) hem de [QR Kod Okuyucu](/tools/qr-scanner) sunar.

## Özet

İş akışınızda her yön için doğru aracı kullanın.`,

  "browser-based-vs-cloud-pdf-tools": `# Tarayıcıda mı, Bulutta mı PDF?

**Bulut** araçları dosyanızı bir sunucuya yükler. **Tarayıcı tabanlı** araçlar ise sayfa yüklendikten sonra dosyayı yerelde işler.

## Yerelin kazandığı durumlar

- Hukuki, tıbbi veya finansal belgeler
- Zayıf ya da kotalı internet bağlantısı

## Bulutun kazandığı durumlar

- Çok büyük ölçekte OCR
- API'lerle yoğun otomasyon

## ZapFile

ZapFile, dosyalarınız cihazınızda kalacak şekilde tasarlandı: gizlilik baştan düşünüldü. OCR bile tarayıcıda çalışır. Tek istisna, Word, Excel, PowerPoint ve HTML'den PDF'e araçlarının isteğe bağlı hızlı modudur; dosyayı sunucumuzda çevirir ve hemen siler.

## Özet

Yöntemi belgenin hassasiyetine göre seçin.`,

  "resize-images-for-instagram-and-web": `# Her Platform İçin Resim Boyutlandırma

Her platformun farklı **en-boy oranı** ve **piksel** önerileri vardır.

## İş akışı

1. Hedef ölçüleri öğrenin.
2. [Resim Boyutlandırma](/tools/resize-image) aracında en-boy oranını kilitleyin.
3. Doğru formatta dışa aktarın.

## Özet

Doğru ölçüler, garip kırpmaları ve bulanık büyütmeleri önler.`,

  "json-formatter-why-developers-use-it": `# JSON Formatlayıcı

**JSON** API'lerin her yerinde. Küçültülmüş (minify) JSON'u okumak ise zordur.

## Formatlama

Girintilemek ve hataları bulmak için tarayıcınızda [JSON Formatlayıcı](/tools/json-formatter) aracını kullanın.

## Özet

Yanıtlar hassas veri içeriyorsa formatlamayı yerelde yapın.`,

  "hash-generator-sha256-md5-explained": `# Hash'in Temelleri

**Hash**, veriyi sabit uzunlukta bir parmak izine dönüştürür. **SHA-256** yaygın olarak kullanılır; **MD5** ise güvenlik için zayıftır.

## Kullanım alanları

- Dosya bütünlüğünü doğrulamak
- Kopyaları karşılaştırmak

## Araç

[Hash Oluşturucu](/tools/hash-generator) hash değerlerini tarayıcıda hesaplar.

## Özet

Yeni projelerde SHA-256 kullanın.`,

  "color-palette-from-image": `# Resimden Renk Paleti

Tasarımcılar arayüz renklerini çoğu zaman fotoğraflarla **uyumlu** hale getirir.

## İş akışı

[Renk Paleti](/tools/color-palette) aracına bir resim yükleyin ve HEX kodlarını kopyalayın.

## Özet

Elle renk seçmeden hızlı ve tutarlı paletler.`,

  "base-converter-decimal-hex-binary": `# Sayı Tabanı Dönüştürme

Programcılar sürekli **onluk**, **onaltılık**, **ikilik** ve **sekizlik** tabanlar arasında geçiş yapar.

## Araç

[Sayı Tabanı Dönüştürücü](/tools/base-converter) tarayıcınızda anında çevirir.

## Özet

Günlükleri (log) ve bellek dökümlerini okurken bir dönüştürücüyü elinizin altında tutun.`,

  "css-minifier-faster-websites": `# CSS Küçültme

**Küçültülmüş CSS**, aktarılan veri miktarını azaltır. Orijinal dosyaları her zaman sürüm kontrolünde saklayın.

## Araç

[CSS Küçültücü](/tools/css-minifier) tarayıcıda hem biçimlendirir hem küçültür.

## Özet

Küçültmeyi sunucuda gzip veya Brotli sıkıştırmayla birlikte kullanın.`,

  "password-generator-length-and-symbols": `# 2026'da Güçlü Şifreler

Uzunluk karmaşıklıktan önemlidir. Önemli hesaplar için karışık karakterli **16+ karakter** iyi bir başlangıçtır.

## Rastgele mi, parola cümlesi mi?

- **Rastgele** metinler tahmine karşı dayanıklıdır.
- **Parola cümleleri** (rastgele dört kelime) yazması daha kolay olabilir.

## Araç

[Şifre Oluşturucu](/tools/password-generator) aracını tarayıcınızda yerel olarak kullanın.

## Özet

Her site için ayrı bir şifre ve bir şifre yöneticisi kullanın.`,

  "regex-tester-debugging-patterns": `# Regex Testi

Düzenli ifadeler güçlüdür ve kolayca yanlış yazılır.

## Gizlilik

Hassas günlükler bilgisayarınızdan çıkmasın diye [Regex Test](/tools/regex-tester) aracını kullanın.

## Özet

Yerelde deneyin, sonra son deseni kodunuza yapıştırın.`,

  "how-to-convert-png-to-jpg-online-free": `# PNG'yi JPG'ye Ücretsiz Online Çevirme

Resimleri formatlar arasında dönüştürmek en yaygın dosya işlerinden biridir. E-postayla göndermek için daha küçük bir dosya, bir web formunun kabul ettiği bir format ya da resim arşivinizi standart hale getirmek için... Doğru araçla PNG'den JPG'ye geçmek saniyeler sürer.

## PNG mi JPG mi?

**PNG** (Portable Network Graphics):
- Kayıpsız sıkıştırma; hiçbir piksel verisi atılmaz
- Saydamlığı (alfa kanalı) destekler
- Logolar, ekran görüntüleri, grafikler ve çizimler için en iyisidir
- Fotoğraflarda JPG'den daha büyük dosyalar

**JPG** (JPEG):
- Kayıplı sıkıştırma; daha küçük boyut için bazı verileri atar
- Saydamlık desteği yoktur
- Fotoğraflar ve çok renkli karmaşık resimler için en iyisidir
- Fotoğraflarda genellikle PNG'den %60-80 daha küçüktür

**PNG → JPG ne zaman?** PNG'niz bir fotoğraf ya da karmaşık bir resimse ve saydamlığa ihtiyacınız yoksa. Görünür fark olmadan dosya boyutunu ciddi ölçüde azaltabilirsiniz.

**Ne zaman dönüştürmemeli?** PNG'niz saydam alanlar içeriyorsa ya da logo veya çizim türü bir grafikse. JPG saydamlığı desteklemez ve beyaz (veya renkli) bir arka plan ekler. Kayıplı sıkıştırma grafiklerdeki keskin kenarları da bozar.

## ZapFile ile PNG'yi JPG'ye Çevirme

1. [ZapFile'ın Resim Dönüştürücüsünü](/tools/convert-image) açın
2. PNG dosyanızı yükleme alanına bırakın (veya tıklayıp seçin)
3. Çıktı formatı olarak **JPG** seçin
4. **Dönüştür**'e tıklayın
5. JPG dosyanızı indirin

Dönüşüm tamamen tarayıcınızda yapılır; dosyanız hiçbir sunucuya yüklenmez.

## Doğru Kalite Ayarını Seçmek

JPG'ye çevirirken kalite ayarı önemlidir:

| Kalite | Dosya Boyutu | Kullanım |
|---------|-----------|----------|
| %90-100 | Büyük | Arşiv, profesyonel baskı |
| %75-85 | Orta | Web, e-posta, sosyal medya |
| %50-70 | Küçük | Küçük önizlemeler |

Çoğu kullanımda %80 kalite idealdir: dosyalar orijinal PNG'den %70-80 daha küçük olur ve normal ekran boyutunda görünür bir kayıp olmaz.

## Toplu Dönüştürme

Çok sayıda PNG dosyanız varsa ZapFile toplu işlemi destekler. Birden fazla dosyayı aynı anda yükleyin ve dönüştürülen tüm JPG'leri tek tıkla indirin.

## Geri Dönmek: JPG'den PNG'ye

Resmi daha sonra yeniden PNG olarak isterseniz (örneğin saydamlık eklemek için) aynı aracı kullanıp çıktı olarak PNG seçin. İlk PNG→JPG dönüşümünde kaybedilen kalite geri gelmez; ihtiyacınız olabilir diye orijinal PNG'yi saklayın.

## Özet

- Daha küçük bir dosyaya ihtiyacınız varsa ve saydamlık gerekmiyorsa PNG'yi JPG'ye çevirin
- Logolar, grafikler ve saydam arka planlı her şey için PNG'de kalın
- Web resimlerinde boyut ve kalite dengesi için %75-85 kalite kullanın
- [ZapFile'ın Resim Dönüştürücüsü](/tools/convert-image) dönüşümü tarayıcınızda anında ve gizli şekilde yapar`,

  "how-to-add-watermark-to-image-online": `# Resme Online Filigran Ekleme (Ücretsiz)

Filigran, fotoğrafları ve grafikleri izinsiz kullanıma karşı korumanın standart yoludur. Fotoğrafçı, tasarımcı ya da içerik üreticisi olun, filigran eklemek eserlerinizi internette paylaşmaya devam ederken hırsızlığı caydırır.

## Resimlerinize Neden Filigran Eklemelisiniz?

- **Telif hakkı koruması**: Eserin sahibi olarak sizi açıkça gösterir
- **Marka görünürlüğü**: Resim paylaşıldıkça adınız veya logonuz da yayılır
- **Hırsızlığı caydırma**: Resim toplayan botların çoğu belirgin filigranlı içeriği atlar
- **Portfolyo**: Tam çözünürlüklü dosyaları vermeden işinizi gösterirsiniz

## ZapFile ile Filigran Ekleme

1. [ZapFile'ın Filigran Aracını](/tools/watermark-image) açın
2. Resminizi yükleyin (JPG, PNG veya WebP)
3. Filigran metninizi yazın (adınız, web siteniz veya telif notunuz)
4. Konum, saydamlık, boyut ve rengi ayarlayın
5. Sonucu indirin

Hesap gerekmez. Resminiz tarayıcınızda yerel olarak işlenir ve hiçbir sunucuya gönderilmez.

## Filigran İçin En İyi Uygulamalar

### Konum
Filigranı resmin **ortasına** koymak, kırparak çıkarılmasını en zor hale getirir. Sağ alt köşe daha temiz görünür ama kırpmayla kolayca silinebilir.

### Saydamlık
Önerilen aralık **%30-50 saydamlıktır**. Tamamen opak bir filigran resmi bozar; fazla saydam olan ise görünmez. Yarı saydam bir filigran okunur ama işinizi tamamen örtmez.

### Metin İçeriği
Şunları ekleyin:
- Adınız veya stüdyonuzun adı
- Web sitenizin adresi
- Telif simgesi © ve yıl: © 2026 Adınız

### Renk
Hafif gölgeli beyaz metin çoğu resimde işe yarar. Siyahtan kaçının; koyu alanlarda kaybolur. Tipik fotoğraf tonlarınızla kontrast oluşturan bir renk düşünün.

## Toplu Filigran

Çok sayıda resme aynı ayarlarla filigran eklemeniz gerekiyorsa ZapFile toplu yüklemeyi destekler. Bütün çekiminizi tek seferde işleyin.

## Filigranın Yapamadıkları

Filigranlar gelişigüzel hırsızlığı caydırır ama kusursuz değildir. Kararlı biri yarı saydam bir filigranı silebilir. Değerli resimlerde telif hakkınızı da tescil ettirin ve ödeme onaylanana kadar yalnızca düşük çözünürlüklü önizlemeler gönderin.

## Özet

- Eserlerinizi korumak için fotoğrafları paylaşmadan önce filigran ekleyin
- Resmin ortasındaki yarı saydam metin en iyi korumayı sağlar
- [ZapFile'ın Filigran Aracı](/tools/watermark-image) ücretsizdir, gizlidir ve tarayıcınızda çalışır`,

  "how-to-crop-image-online-free": `# Resmi Ücretsiz Online Kırpma

Kırpma en temel fotoğraf düzenlemelerinden biridir. Dikkat dağıtan kenarları atmak, Instagram için mükemmel bir kare oluşturmak ya da web sitesi başlığı için 16:9 bir afiş kesmek... İyi bir online kırpma aracı bunu saniyeler içinde yapar.

## ZapFile ile Kırpma

1. [ZapFile'ın Resim Kırpma Aracını](/tools/crop-image) açın
2. Fotoğrafınızı yükleyin (JPG, PNG veya WebP)
3. Hazır bir oran seçin ya da tutamaçları serbestçe sürükleyin
4. Kırpılmış resmi indirin

Her şey tarayıcınızda olur: yükleme yok, üyelik yok.

## Yaygın Kırpma Oranları ve Kullanım Alanları

| Oran | Kullanım |
|-------|----------|
| 1:1 (kare) | Instagram gönderileri, profil fotoğrafları |
| 16:9 | YouTube küçük resimleri, web afişleri, geniş ekran video |
| 4:3 | Standart fotoğraf baskısı, sunumlar |
| 3:2 | Standart DSLR fotoğraf oranı, 10x15 baskılar |
| 9:16 | Instagram Hikâyeleri, TikTok, Reels |
| 2:1 | X (Twitter) kapağı, panoramik baskılar |

## Daha İyi Kırpma İçin İpuçları

### Üçler Kuralı
Kareyi 3×3'lük bir ızgaraya bölün. Öznenin gözlerini (veya ilgi noktasını) tam ortaya değil, dört kesişim noktasından birine yerleştirin. Kameraların çoğunun ızgara göstermesinin nedeni budur.

### Odağa Kırpın
"Ölü alanı", yani ilginç hiçbir şey olmayan boşlukları atın. Daha sıkı kırpmalar daha dinamik ve bilinçli görünür.

### Aşırı Kırpmayın
Kırpma çözünürlüğü azaltır. 2000 piksel genişliğindeki bir resmin %20'sini alırsanız 400 piksellik bir resim kalır. Web için çoğu zaman sorun olmaz; baskı için dikkatli olun.

### Profil Fotoğraflarında Merkeze Dikkat
Sosyal platformlar profil fotoğrafınızı daire şeklinde kırpar. Yüklemeden önce önemli kısmın ortada olduğundan emin olun.

## Kırpma mı, Boyutlandırma mı?

**Kırpma**, resmin bazı kısımlarını çıkararak kompozisyonu değiştirir. Ölçüler değişir ama kalan pikseller orijinal kalitesinde kalır.

**Boyutlandırma** ise resmin tamamını büyütür ya da küçültür. Hiçbir içerik çıkarılmaz, ama ciddi şekilde büyütürseniz netlik azalabilir.

Çoğu zaman ikisi birden gerekir: önce doğru kompozisyon için kırpın, sonra hedef ölçüye boyutlandırın.

## Özet

- Her platform için doğru kırpmayı hazır oranlarla yapın
- Daha etkileyici kompozisyonlar için üçler kuralını uygulayın
- [ZapFile'ın Kırpma Aracı](/tools/crop-image) ücretsizdir ve tamamen tarayıcınızda çalışır`,

  "image-to-pdf-converter-free-online": `# Resmi PDF'e Çevirme: Ücretsiz Online Araç

Bir resmi PDF'e çevirmek sık karşılaşılan bir ihtiyaçtır: bir fotoğrafı resmî belge olarak göndermek, birden fazla resmi e-posta için tek dosyada toplamak ya da yalnızca PDF kabul eden bir sisteme yükleme yapmak. Doğru araçla dönüşüm saniyeler sürer.

## ZapFile ile Resmi PDF'e Çevirme

1. [ZapFile'ın Resmi PDF'e Çevirme Aracını](/tools/image-to-pdf) açın
2. Bir veya daha fazla resim yükleyin (JPG, PNG veya WebP)
3. Birden fazla resmi birleştiriyorsanız sırasını ayarlayın
4. PDF'i oluşturun
5. PDF'inizi indirin

Resimleriniz tarayıcınızdan hiç çıkmaz; sunucuya yükleme yok, hesap gerekmez.

## Birden Fazla Resmi Tek PDF'te Birleştirmek

Ayrı resimler olarak fotoğraflanmış çok sayfalı bir belgeniz varsa (taranmış bir sözleşme, bir yığın fiş, bir fotoğraf albümü) hepsini tek adımda tek bir PDF'te toplayabilirsiniz:

1. Bütün resimlerinizi aynı anda yükleyin
2. Gerektiği gibi sürükleyerek sıralayın
3. Dönüştürün; her resim PDF'te bir sayfa olur

## Çıktı PDF'teki Resim Kalitesi

ZapFile, JPEG fotoğrafları mümkün olduğunda olduğu gibi korur ve PNG resimleri kayıpsız tutar; WebP ve AVIF ise yüksek kaliteli JPEG olarak eklenir. En net PDF'ler için:

- Resminizin en yüksek çözünürlüklü halinden başlayın
- Ekran görüntüleri ve metinli grafikler için PNG kullanın (kayıpsız)
- Fotoğraflar için yüksek kaliteli JPG (%80+) kullanın

## Resimleri Ne Zaman PDF'e Çevirmelisiniz?

- **E-posta ekleri**: PDF'ler her cihazda aynı düzende açılır
- **Resmî belgeler**: Birçok form ve portal PDF ister
- **Fotoğraf serisi paylaşmak**: Tek bir PDF, resim klasöründen daha kolay paylaşılır
- **Baskıya hazır düzenler**: Matbaaların tercih ettiği format PDF'tir

## Tersi: PDF'ten Resme

Tersine ihtiyacınız varsa, yani PDF'ten resim çıkarmak istiyorsanız [ZapFile'ın PDF'i Resme Çevirme aracını](/tools/pdf-to-images) kullanın. Her PDF sayfasını yüksek kaliteli PNG veya JPG'ye dönüştürür.

## Özet

- Tek resimleri çevirin ya da birden fazla resmi tek PDF'te birleştirin
- Kalite korunur: JPEG fotoğraflar olduğu gibi kalır, PNG kayıpsız kalır
- [ZapFile'ın Resmi PDF'e Çevirme Aracı](/tools/image-to-pdf) ücretsizdir, gizlidir ve tarayıcınızda çalışır`,

  "what-is-base64-encoding-and-how-to-use-it": `# Base64 Kodlama Nedir, Nasıl Kullanılır?

Base64 web geliştirmede sürekli karşımıza çıkar: gömülü resimler, JWT token'ları, e-posta ekleri, API yanıtları. Onu anlamak pek çok işi çok daha anlaşılır kılar.

## Base64 Nedir?

Base64, ikili veriyi metne çeviren bir kodlama yöntemidir. İkili veriyi (baytları) yalnızca 64 yazdırılabilir ASCII karakteriyle gösterir:

\`A–Z\`, \`a–z\`, \`0–9\`, \`+\`, \`/\` (dolgu için \`=\`)

"Base64" adı bu 64 karakterden gelir. Her 3 bayt ikili veri, 4 Base64 karakterine dönüşür.

## Base64 Neden Var?

Birçok sistem başlangıçta yalnızca metin işlemek için tasarlandı: e-posta (SMTP), HTML öznitelikleri, JSON alanları, URL'ler. Metin tabanlı bir sistemin içine ikili veri (bir resim, PDF ya da ham baytlar) koymanız gerektiğinde, bu veriyi güvenle metin olarak göstermenin bir yoluna ihtiyacınız olur.

Base64 bu sorunu, her türlü ikili içeriği metin ayrıştırıcıların yanlış yorumlamayacağı güvenli, yazdırılabilir karakterlerden oluşan bir dizeye çevirerek çözer.

## Yaygın Kullanım Alanları

### Resimleri HTML/CSS'e Gömmek
Bir resim dosyasına bağlantı vermek yerine:
\`\`\`html
<img src="data:image/png;base64,iVBORw0KGgo..." />
\`\`\`
Bu yöntem, tek dosyalık HTML dışa aktarımlarındaki ya da dış bağlantıların engellenebildiği e-posta şablonlarındaki küçük simgeler için kullanışlıdır.

### JSON Web Token'ları (JWT)
JWT'ler noktalarla ayrılmış, Base64 ile kodlanmış üç bölümden oluşur:
\`Header.Payload.Signature\`

Başlık ve içerik, Base64 ile kodlanmış JSON nesneleridir. Dikkat: şifrelenmiş değil, yalnızca kodlanmıştır; herkes çözebilir. Bir token'ın içeriğini incelemek için [ZapFile'ın JWT Çözücüsünü](/tools/jwt-decoder) kullanın.

### E-posta Ekleri (MIME)
E-posta ekleri, düz metin e-posta protokolünün içine gömülmüş, Base64 ile kodlanmış ikili dosyalardır. E-posta istemciniz bunu otomatik olarak halleder.

### API Yanıtları
JSON ikili veriyi doğrudan desteklemediği için bazı API'ler ikili verileri (resim, PDF) JSON yanıtlarının içinde Base64 dizeleri olarak döndürür.

### HTTP Basic Kimlik Doğrulama
\`Authorization: Basic\` başlığı, \`kullanıcıadı:şifre\` bilgisini Base64 ile kodlar. Bu şifreleme değildir, yalnızca kodlamadır. Her zaman HTTPS kullanın.

## Online Kodlama ve Çözme

[ZapFile'ın Base64 Kodlayıcı/Çözücüsünü](/tools/base64-encode) şunlar için kullanın:
- Metin veya dosyaları Base64 dizelerine kodlamak
- Base64 dizelerini metne ya da indirilebilir dosyalara geri çözmek
- Gömülü resim veri URL'lerini anında önizlemek

## Base64 Veriyi Sıkıştırır mı?

Hayır, tam tersi. Base64 veri boyutunu yaklaşık %33 artırır. Üç bayt dört karaktere dönüşür. Base64 uyumluluk içindir, sıkıştırma için değil.

## Base64 mi, Base64url mi?

Standart Base64, URL'lerde özel anlamı olan \`+\` ve \`/\` karakterlerini kullanır. **Base64url** bunları \`-\` ve \`_\` ile değiştirerek çıktıyı URL parametreleri ve JWT token'ları için güvenli hale getirir.

## Özet

- Base64, ikili veriyi metin tabanlı sistemlerde kullanmak için yazdırılabilir ASCII metne çevirir
- Gömülü resimlerde, JWT'lerde, e-posta eklerinde ve API yanıtlarında yaygındır
- Boyutu ~%33 artırır; uyumluluk içindir, sıkıştırma için değil
- Bir JWT'yi veya Base64 dizesini [ZapFile'ın araçlarıyla](/tools) anında çözün`,

  "how-to-create-favicon-for-website": `# Web Siteniz İçin Favicon Nasıl Oluşturulur (Tüm Boyutlar)

Favicon, tarayıcı sekmelerinde, yer imlerinde ve ana ekran kısayollarında görünen küçük simgedir. Doğru yapmak, birden fazla boyut üretmeyi ve bunları HTML'de doğru bağlamayı gerektirir; ama gereksinimleri bildiğinizde süreç basittir.

## Favicon Nedir?

"Favicon", "favorites icon" yani "sık kullanılanlar simgesi" demektir. Başlangıçta Internet Explorer yer imleri için 16×16 piksellik bir simgeydi. Modern tarayıcılar ve cihazlar ise birçok boyut ister:

| Dosya | Boyut | Kullanım |
|------|------|----------|
| favicon.ico | 16×16, 32×32 | Tarayıcı sekmeleri, Windows görev çubuğu |
| favicon-16x16.png | 16×16 | Küçük sekme simgeleri |
| favicon-32x32.png | 32×32 | Standart tarayıcı sekmeleri |
| apple-touch-icon.png | 180×180 | iOS ana ekran kısayolu |
| android-chrome-192x192.png | 192×192 | Android ana ekranı |
| android-chrome-512x512.png | 512×512 | Android açılış ekranı, PWA |

## ZapFile ile Tüm Favicon Boyutlarını Oluşturma

1. [ZapFile'ın Favicon Oluşturucusunu](/tools/favicon-generator) açın
2. Kare bir resim yükleyin (PNG önerilir, en az 512×512 piksel)
3. Boyutları oluşturun
4. Tüm boyutları ve \`.ico\` dosyasını içeren ZIP'i indirin

## Favicon'ları Web Sitenize Ekleme

HTML'inizin \`<head>\` bölümüne şu etiketleri ekleyin:

\`\`\`html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
\`\`\`

Progresif Web Uygulamaları (PWA) için bir \`site.webmanifest\` dosyası da ekleyin:

\`\`\`json
{
  "name": "Your App",
  "icons": [
    { "src": "/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/android-chrome-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
\`\`\`

## İyi Bir Favicon Tasarlamak

### Basit Tutun
16×16 pikselde karmaşık logolar tanınmaz hale gelir. Marka adınızın ilk harfini, sadeleştirilmiş bir simgeyi ya da düz bir renk bloğunu kullanın.

### Yüksek Kontrast Kullanın
Favicon hem açık hem koyu tarayıcı arayüzlerinde görünür. İkisini de test edin. Marka renginizde düz bir arka plan üzerinde beyaz bir sembol her iki modda da iyi okunur.

### 512×512'den Başlayın
En yüksek çözünürlüklü kaynaktan üretin. ZapFile 512 pikselden temiz şekilde küçültür, ama 16 pikselden büyütmek bulanık sonuç verir.

### SVG Favicon'lar (Modern Tarayıcılar)
Chromium tabanlı tarayıcılar, her boyuta kusursuz ölçeklenen SVG favicon'ları destekler. PNG/ICO yedeklerinizin yanına ekleyin:
\`\`\`html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
\`\`\`

## Sık Yapılan Favicon Hataları

- **Düşük çözünürlüklü kaynak resim kullanmak**: Her zaman 512 piksel veya daha büyükten başlayın
- **Yalnızca \`.ico\` vermek**: Modern cihazlar PNG boyutlarına ihtiyaç duyar; tek başına ICO, iOS ve Android'i düzgün bir simgeden yoksun bırakır
- **Önbelleği unutmak**: Favicon'u güncelledikten sonra tarayıcılar eskisini ısrarla önbellekte tutar. Geliştirme sırasında yenilemeyi zorlamak için bir sürüm parametresi ekleyin (\`favicon.ico?v=2\`)

## Özet

- Favicon'lar tarayıcılar, iOS, Android ve PWA için birden fazla boyut gerektirir
- 512×512 kare bir PNG ile başlayın ve tüm boyutları tek seferde üretin
- [ZapFile'ın Favicon Oluşturucusu](/tools/favicon-generator) gereken her boyutu ve ICO dosyasını saniyeler içinde üretir`,

  "how-to-convert-webp-to-jpg-or-png": `# WebP'yi JPG veya PNG'ye Online Çevirme

WebP, Google'ın geliştirdiği ve aynı kalitede JPG veya PNG'den belirgin şekilde küçük dosyalar üreten modern bir resim formatıdır. Ama her uygulama kabul etmez. Eski masaüstü yazılımları, bazı baskı hizmetleri ve bazı içerik yönetim sistemleri WebP'yi desteklemeyebilir. İşte hızlıca dönüştürmenin yolu.

## ZapFile ile WebP'yi JPG veya PNG'ye Çevirme

1. [ZapFile'ın Resim Dönüştürücüsünü](/tools/convert-image) açın
2. WebP dosyanızı yükleyin
3. Çıktı formatı olarak **JPG** veya **PNG** seçin
4. Dönüştürün ve indirin

Sunucuya yükleme yok; dönüşüm tarayıcınızda çalışır.

## JPG'ye mi, PNG'ye mi Çevirmeliyim?

Orijinal WebP resmin içeriğine göre seçin:

**WebP → JPG'ye çevirin:**
- Resim bir fotoğraf ya da çok renkli karmaşık bir sahneyse
- Mümkün olan en küçük dosya boyutuna ihtiyacınız varsa
- Saydamlık gerekmiyorsa

**WebP → PNG'ye çevirin:**
- Resmin saydam bir arka planı varsa
- Logo, ekran görüntüsü ya da metinli bir grafikse
- Kayıpsız kaliteye ihtiyacınız varsa (hiçbir piksel verisi atılmaz)

## WebP'yi Çevirmek Kaliteyi Düşürür mü?

**WebP → JPG**: Kayıplı yeniden sıkıştırma içerir. Özellikle düşük kalite ayarlarında WebP orijinaline göre bir miktar ek kalite kaybı olur. Bunu en aza indirmek için %85+ kalite kullanın.

**WebP → PNG**: Kayıpsız bir dönüşümdür. Hiçbir piksel verisi atılmaz. PNG, WebP'deki her pikseli aynen gösterir; ancak dosya boyutu daha büyük olur.

## Web Siteleri Neden WebP Kullanır?

WebP resimler genellikle:
- Aynı kalitede JPG'den %25-35 daha küçüktür
- Kayıpsız içerikte PNG'den %20-30 daha küçüktür

Bu, sayfa yükleme sürelerinde ve Core Web Vitals puanlarında ölçülebilir bir fark yaratır. Bir web sitesi yapıyorsanız modern tarayıcılar için doğru seçim WebP'dir.

## Birden Fazla WebP Dosyasını Toplu Çevirme

ZapFile birden fazla WebP dosyasını aynı anda dönüştürmeyi destekler. Dosyalarınızı yükleyin, hedef formatı seçin ve dönüştürülen tüm resimleri birlikte indirin.

## Özet

- Saydamlık gerekmeyen fotoğraflar için WebP'yi JPG'ye çevirin
- Grafikler, logolar ya da saydam alan içeren her şey için WebP'yi PNG'ye çevirin
- [ZapFile'ın Resim Dönüştürücüsü](/tools/convert-image) toplu WebP dönüşümünü tarayıcınızda anında yapar`,

  "pdf-vs-word-which-format-to-use": `# PDF mi Word mü? Hangi Formatı Kullanmalısınız?

PDF ve Word, iş hayatında en çok kullanılan iki belge formatıdır ve doğru seçim tamamen dosyayla ne yapacağınıza bağlıdır. İşte açık bir karşılaştırma.

## PDF'i Şu Durumlarda Kullanın…

### Biçimin Sabit Kalmasını İstiyorsanız
Bir PDF her cihazda, işletim sisteminde ve yazıcıda aynı görünür. Yazı tipleri, kenar boşlukları ve düzen kilitlidir. Bir Word belgesi ise okuyanın Word sürümüne, yüklü yazı tiplerine ve ekran boyutuna göre farklı akabilir.

### Son Hali Gönderiyorsanız
Sözleşmeler, faturalar, raporlar, özgeçmişler ve teklifler PDF olmalıdır. Alıcı içeriğinizi yanlışlıkla değiştirmeden görüntüleyebilir, yazdırabilir ve imzalayabilir.

### Baskı Yapıyorsanız
PDF baskının endüstri standardıdır. Matbaaların çoğu yazı tipleri gömülü ve taşma payları doğru tanımlanmış PDF bekler.

### Geniş Uyumluluk Gerekiyorsa
Her işletim sistemi, tarayıcı ve mobil cihaz bir PDF'i yazılım kurmadan açabilir. Herkesin bilgisayarında Microsoft Word yoktur.

### İmza veya Form Alanları Gerekiyorsa
PDF etkileşimli formları, dijital imzaları ve notları yerleşik olarak destekler. Word belgelerinde de form alanları olabilir ama deneyim uygulamadan uygulamaya tutarsızdır.

## Word'ü (.docx) Şu Durumlarda Kullanın…

### Siz ya da Başkası Düzenleyecekse
Word belgeleri düzenlenmek için vardır. Bir taslak üzerinde birlikte çalışıyorsanız, belgeyi gözden geçirenler arasında dolaştırıyorsanız ya da bir şablonu dolduruyorsanız doğru format Word'dür.

### Değişiklik İzleme ve Yorum Gerekiyorsa
Word'ün Değişiklikleri İzle ve yorum özellikleri, ortak düzenlemede PDF notlarından çok daha yeteneklidir.

### Şablon Kullanıyorsanız
İş şablonlarının çoğu (antetli kâğıtlar, raporlar, teklifler) doldurulmak üzere tasarlandığı için Word dosyası olarak dağıtılır.

## Formatlar Arasında Dönüştürme

### Word → PDF
Microsoft Word veya LibreOffice'te "PDF olarak kaydet"i kullanın ya da Word yüklü değilse [ZapFile'ın Word'den PDF'e aracını](/tools/word-to-pdf) kullanın. Yazı tipleri, tablolar ve sayfa sonları korunur.

### PDF → Resim
Bir PDF sayfasını resim olarak mı kullanmanız gerekiyor? Herhangi bir sayfayı PNG veya JPG olarak dışa aktarmak için [ZapFile'ın PDF'i Resme Çevirme aracını](/tools/pdf-to-images) kullanın.

### PDF → Word
PDF düzenlenmek için tasarlanmadığından Word'e geri dönüştürmek daha zordur. [ZapFile'ın PDF'den Word'e aracı](/tools/pdf-to-word) sıradan belgeleri başlık, liste ve tablolarıyla akan, düzenlenebilir metne çevirir; tasarımlı sayfaları (broşürler, teklifler) ise birebir düzeninde korur. Karmaşık belgelerde sonucu mutlaka kontrol edin.

## Hızlı Başvuru

| İş | Kullanın |
|------|-----|
| Son rapor, fatura, özgeçmiş | PDF |
| İnceleme ve düzenleme için taslak | Word |
| Matbaada baskı | PDF |
| Başkalarının dolduracağı şablon | Word |
| Word'ü olmayan birine göndermek | PDF |
| Sözleşme, hukuki belge | PDF |
| Üzerinde çalışılan iç taslak | Word |

## PDF Dosyalarını Korumak

İletilmemesi veya yazdırılmaması gereken bir PDF gönderiyorsanız, şifre eklemek ve izinleri kısıtlamak için [ZapFile'ın PDF Şifreleme aracını](/tools/pdf-encrypt) kullanın.

## Birden Fazla PDF'i Birleştirmek

İmzalı formları toplarken ya da birden fazla PDF'ten rapor derlerken, hepsini tek belgede birleştirmek için [ZapFile'ın PDF Birleştirme aracını](/tools/merge-pdf) kullanın.

## Özet

- Her yerde aynı görünmesi gereken, son haliyle biçimlendirilmiş belgeler için PDF kullanın
- Düzenleme, ortak çalışma veya doldurma gereken belgeler için Word kullanın
- Formatlar arasında doğru araçla dönüştürün ve PDF'ten Word'e geçerken sonucu kontrol edin`,
};

export default posts;
