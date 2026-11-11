# Vali

Telefonda **yatay ekranda** oynanan, 1850'den başlayan şehir kurma oyunu. Bir valinin yerine geçip boş bir arazide Valilik binasını kurar, kasabanı yollarla, konutlarla, tarlalarla ve çarşılarla büyütürsün. İlham: City Life (şehrin yaşayan dokusu) ve Transport Giant (ekonomi ve lojistik).

**Oyna:** https://mehmetustattsc.github.io/vali/
Telefonda tarayıcı menüsünden "Ana ekrana ekle" ile uygulama gibi kurulur, ilk açılıştan sonra internetsiz de çalışır.

Tasarım belgesi: Claude Docs'taki "Vali — Oyun Tasarım Belgesi".

## Durum (prototip 1, sürüm 0.1)
- Nehir kenarı haritası (her yeni şehirde farklı), 1850 başlangıcı. Diğer haritalar ve yıllar menüde "Yakında".
- Stilize 3D (Three.js): gölgeler, kıvrılan nehir, doğuda dağlar, ormanlar, yollarda gidip gelen arabalar ve yayalar, mevsime göre renk değiştiren tarlalar.
- Kamera: tek parmakla kaydır (Gez aracı), iki parmakla yakınlaştır, döndür ve kaydır. Bilgisayarda sağ tık döndürür, tekerlek yakınlaştırır.
- Araçlar: Valilik, Yol (nehirde köprü), Konut, Tarla, Ticaret alanı, Çeşme, Yık. Sürükleyince önizleme ve maliyet görünür.
- Simülasyon: binalar talebe göre kendiliğinden yapılır ve seviye atlar (kulübe → ev → konak, tarla → çiftlik, dükkân → çarşı → han).
- İki nüfus grubu: çiftçiler ve işçiler. Her grubun memnuniyeti su, iş, vergi, gıda ve pazar etkenlerinden oluşur; şehir panelinde hepsi görünür.
- Bütçe: vergi geliri, gıda satışı, bakım giderleri, ayarlanabilir vergi oranı.
- Zaman: duraklat, 1x, 2x, 4x. 1x'te bir ay 1 dakika sürer. Her ay ve uygulamadan çıkarken otomatik kayıt.

## Sürüm 0.2
- Tempo: 1x'te bir ay 45 saniye; en hızlı ayarda (5x) bir yıl yaklaşık 1,8 dakika. Binalar daha çabuk yapılır, göç daha hızlı.
- Hizmet menüsü: Çeşme, Meydan (2×2), Karakol, Mektep, Hekimhane. Her biri bir yarıçapı kapsar; seçince kapsama haritada renkle görünür.
- Yeni memnuniyet etkenleri şehir büyüdükçe belirir: asayiş (150 kişiden sonra), eğitim (200), sağlık (250), meydan, maden tozu.
- Üretim menüsü: Oduncu (ormanın yanı), Taş ocağı (dağın dibi), Kömür ocağı (kara kayalar), Demir madeni (pas renkli kayalar). İşçilere iş verir; ambar 600 birimi geçince fazlası satılır.
- On yıllık görevler: 1851 Su kemeri, 1861 Demiryolu, 1871 Taş köprü ve rıhtım, 1881 Saat kulesi. Şantiye kurulur, kaynaklar yol ağıyla her ay taşınır; bitince anıt yükselir, ödül ve itibar gelir.
- Eski kayıtlar yeni sürümde açılır (maden yatakları haritaya eklenir, ilk görev hemen başlar).

## Sürüm 0.3
- Yollar ve raylar köşelerde yuvarlak çizilir; yola çapraz sürüklenince merdiven biçiminde çapraz yol olur.
- Ulaşım menüsü: Yol, Ray (demiryolu görevinden sonra), Set (sele karşı).
- Meydanlar: Köşe meydanı (1×1), Meydan (2×2), Yuvarlak meydan (3×3, havuzlu). Hipodrom (4×3), Kışla (3×2, bütün haritada asayiş; yüksek gider, gıda ve kömür tüketir), İtfaiye, Değirmen (tarla verimini artırır).
- Afetler (menüden kapatılabilir): yangın (itfaiye önler), ilkbahar seli (set önler), salgın (su, hekimhane ve su kemeri önler). Şehir panelinde risk göstergeleri.
- Orman, haritanın ilk orman miktarına kadar kendini yeniler.
- Demiryolu görevinden sonra batıda ana hat açılır; istasyon raylarla bağlanınca tren gelip gider, raya yakın ocak ve madenlerin malı %50'ye kadar pahalı satılır, şantiye teslimatı iki katına çıkar.

## Sürüm 0.4
- Demiryolundan sonra Yolcu istasyonu (ulaşım: memnuniyet, dükkânlara müşteri, bölge talebi) ve Yük istasyonu (kapsadığı ocak ve madenler demiryoluyla daha pahalı satar). İkisi de raya bitişik kurulur.
- Nehir limanı (2×2, kıyıya, 250 nüfus): gıda ve kaynak satışı daha kârlı, nehirde mavnalar gider gelir. Limandan sonra İskele: kıyıya bitişik suya, her ay balık.
- Köprüler gerçek köprü: taş ayaklar, tabla, korkuluk, iki yanda rampa; demiryolu köprüsü demir korkuluklu. Arabalar ve tren köprünün üstünden geçer.
- Değirmenin etkisi %75'e, yarıçapı 5 kareye çıktı.
- Görevler zorlaştı: yaklaşık iki kat kaynak, hazine payı, daha kısa süre, şantiyeye ayda en çok 45 birim (demiryoluyla 90).
- Büyük konut, tarla ya da ticaret alanı çizilince araya kendiliğinden sokak yerleşir: her iki sırada bir sokak ve ağa bağlanan bir ara yol. Menüden kapatılabilir.

## Sürüm 0.4.1
- Görev anıtları çalışır: Su idaresi (10 kişiye iş, çevresinde sağlık), Gar (16 kişiye iş, yolcu ve yük istasyonu gibi), Rıhtım (14 kişiye iş, hazır nehir limanı, iskeleyi açar), Saat kulesi (6 kişiye iş, geniş meydan etkisi, aylık ziyaretçi geliri). Çalışmaları için yola bağlı olmaları gerekir.

## Sürüm 0.4.2
- Hipodrom her ay bilet geliri getirir (nüfus ve bölge talebiyle artar, 600 nüfusta yaklaşık ayda 70–80); mayısta büyük yarış günü: o ay üç kat gelir ve iki ay boyunca ek memnuniyet.

## Sürüm 0.5: Elektrik çağı (1890–1930) ve haritalar
- Beş harita: nehir kenarı, geniş ova, dağlık, büyük göl, deniz kıyısı.
- 1890'dan sonra: kömür santrali, su santrali, fabrika (gelir, kömür ve demir işler), tramvay durağı (1895), çöp alanı. Elektrik ve çöp şehir geneli kapasiteyle hesaplanır; şehir panelinde Altyapı bölümü.
- Konaklar elektrik ve ulaşım varsa apartmana dönüşür (56 kişi). 1908'den sonra yollarda otomobil, tramvay durağı varsa tramvaylar.
- Yeni görevler: 1891 Belediye elektrik santrali, 1901 Kanalizasyon, 1911 Darülfünun, 1921 Zafer anıtı.
- Yol ile ray kesişince üst geçit.

## Sürüm 0.6: beş nüfus grubu
- Çiftçiler (tarla), işçiler (ocak, maden, fabrika, liman, hizmet), esnaf ve tüccarlar (dükkân), eğitimliler (valilik, mektep, hekimhane, istasyon; mektep olmadan gelmez), varlıklılar (çalışmaz, en yüksek vergi; meydan ya da eğlence yakınındaki temiz konak ve apartmanlar).
- Her grubun duyarlılığı farklı (`GW` tablosu): esnaf asayiş ve ulaşım, eğitimliler eğitim ve meydan, varlıklılar vergi, kirlilik ve eğlence.
- Üretim tesislerinde ve çöp alanında 3 seviye yükseltme; hayvan çiftliği; değirmen +%300.

## Sürüm 0.9: Bilgi çağı (1970–2010) ve yeşil çağ (2010–2100)
- Yeni binalar: metro istasyonu ve nükleer santral (1975), geri dönüşüm tesisi (1985), teknopark (1990), güneş tarlası ve rüzgâr türbini (2010), dikey tarım kulesi (2030), füzyon santrali (2060).
- 1980'den sonra gökdelen (konut) ve ofis kulesi (ticaret).
- On yeni görev (1971–2061): metro hattı, OSB, teknik üniversite, fuar merkezi, akıllı şehir merkezi, hızlı tren, iklim parkı, yenilenebilir enerji, araştırma merkezi, kent ormanı.
- 2000 ve 2026 başlangıç yılları açıldı.

## Sürüm 0.9.1
- Her haritada başlangıç tarafında, kendi arazinde ve karadan ulaşılan küçük bir tepe var (taş ocağı, kömür ve demir için). Büyük göl ve deniz kıyısında artık gölü aşmak gerekmez.
- Banka kredisi (Bütçe paneli): sınır gelire ve itibara bağlı, 10 yıl eşit taksit, faiz dönemle düşer (%9 → %4). Aynı anda bir kredi; erken kapatınca itibar +2.

## Denge
Bütün sayılar `src/engine.js` içindeki `B` tablosundadır. Oranlar 1850'ye yakın tutuldu: nüfusun yaklaşık %60'ı tarımla geçinir, kişi başı ayda bir birim gıda tüketilir. Şehrin büyüme motoru "bölge talebi"dir: dış yola bağlı ve memnun bir şehrin ürünlerine çevreden talep zamanla artar.

## Proje yapısı
| Yol | İçerik |
|---|---|
| `src/engine.js` | Simülasyon, kurallar, harita üretimi (DOM yok, Node'da da çalışır) |
| `src/view.js` | 3D görünüm (Three.js) |
| `src/ui.js`, `src/style.css`, `src/index.html` | Arayüz, dokunma, oyun döngüsü |
| `vendor/three/` | Three.js r187 (MIT) |
| `public/` | Manifest, service worker, simgeler |
| `tools/build.py` | Oyunu `web/` klasörüne derler |
| `tests/` | Denge simülasyonu ve tarayıcı testi |

## Geliştirme
```bash
npm test               # denge kontrolü (bot şehir kurar, 10 yıl)
node tests/sim.js 15   # 15 yıllık denge tablosu
npm run build          # web/index.html
npm run test:browser   # tarayıcıda menü, inşa, zaman, paneller, kayıt
npm run serve          # http://localhost:8080
```
Her `main` gönderiminde testler çalışır, geçerse oyun GitHub Pages'e yayınlanır.

## Lisans
Kod © Mehmet. Three.js © three.js yazarları, MIT lisansı (`vendor/three/LICENSE`).
