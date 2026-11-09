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
