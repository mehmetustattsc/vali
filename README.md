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
