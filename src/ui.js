/* Vali — arayüz: üst şerit, araçlar, paneller, dokunma ve oyun döngüsü.
   view.js ile aynı modülde derlenir (createView aynı kapsamda). */
const VL = self.Vali;
const $ = (s) => document.querySelector(s);
const fmt = (n) => Math.round(n).toLocaleString('tr-TR');
const sgn = (n) => (n >= 0 ? '+' : '−') + fmt(Math.abs(n));
// Üst çubuk için kısa sayı: 152.300 → 152 B, 1.001.662 → 1,00 Mn (genişlik sabit kalsın)
const short = (n) => { const a = Math.abs(n), s = n < 0 ? '−' : ''; return a >= 1e6 ? s + (a / 1e6).toLocaleString('tr-TR', { minimumFractionDigits: a < 1e7 ? 2 : 1, maximumFractionDigits: a < 1e7 ? 2 : 1 }) + ' Mn' : a >= 1e5 ? s + Math.round(a / 1e3) + ' B' : s + fmt(a); };
const sgnS = (n) => (n >= 0 ? '+' : '−') + (Math.abs(n) >= 1e4 ? (Math.abs(n) / 1e3).toLocaleString('tr-TR', { maximumFractionDigits: 1 }) + ' B' : fmt(Math.abs(n)));
const SAVE_KEY = 'vali.save.v1';

const ICON = {
  pan: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11.5V4a1.5 1.5 0 0 1 3 0v7.5M14 11.5V5.5a1.5 1.5 0 0 1 3 0v8M17 13v-4.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.5a6 6 0 0 1-4.6-2.2L4.4 15a1.6 1.6 0 0 1 2.4-2.1L8 14"/>',
  gov: '<path d="M3 21h18M5 21V10M19 21V10M9 21v-6h6v6M3 10l9-6 9 6M12 4V1.5M12 1.5h3.5v2H12"/>',
  road: '<path d="M7 21 10 3M17 21 14 3M12 6v2M12 11v2M12 16v2"/>',
  res: '<path d="M3 11 12 4l9 7M5 10v10h14V10M10 20v-5h4v5"/>',
  farm: '<path d="M3 20h18M4 20c1-4 3-7 8-7s7 3 8 7M8 13c0-3 1.8-5 4-5s4 2 4 5M12 8V4M12 4c-1.5 0-2.5-1-2.5-2M12 4c1.5 0 2.5-1 2.5-2"/>',
  com: '<path d="M3 9h18l-1.5-5h-15zM4 9v11h16V9M3 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3M10 20v-5h4v5"/>',
  fountain: '<path d="M4 17h16M6 17v3h12v-3M12 17V9M12 9c-3 0-5 2-5.5 4M12 9c3 0 5 2 5.5 4M9 6c0-2 1.3-3 3-3s3 1 3 3"/>',
  buy: '<path d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3zM9 4v13M15 7v13"/>',
  bulldoze: '<path d="M3 17h11l3-6h-6l-2 3H3zM7 20.5a1.5 1.5 0 1 0 0-.01M13 20.5a1.5 1.5 0 1 0 0-.01M17 11l4-6M19 3l3 3"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="M5 12.5 10 17.5 19 7"/>',
  full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  coin: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5v9M9.5 9.5c0-1 1-1.6 2.5-1.6s2.5.7 2.5 1.7-1 1.4-2.5 1.7-2.5.8-2.5 1.8 1 1.7 2.5 1.7 2.5-.6 2.5-1.6"/>',
  people: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 11a3 3 0 1 0 0-6M17 14c2.5.4 4 2.8 4 6"/>',
  smile: '<circle cx="12" cy="12" r="9"/><path d="M8.5 14.5c.9 1.2 2.1 1.8 3.5 1.8s2.6-.6 3.5-1.8M9 9.5h.01M15 9.5h.01"/>',
  layers: '<path d="M12 3 2 8l10 5 10-5zM2 13l10 5 10-5"/>',
  svc: '<path d="M3 21h18M4 10h16M12 3 3 8h18zM6 10v8M10 10v8M14 10v8M18 10v8"/>',
  ind: '<path d="M3 21V11l5 3V11l5 3V11l5 3V5h3v16zM7 17h2M12 17h2M17 17h2"/>',
  police: '<path d="M12 3 4 6v5c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6z"/><path d="M9 12l2 2 4-4"/>',
  school: '<path d="M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M22 9v6"/>',
  clinic: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>',
  square: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M9 16h6M10 8h4"/><circle cx="6.5" cy="6.5" r="1"/><circle cx="17.5" cy="6.5" r="1"/><circle cx="6.5" cy="17.5" r="1"/><circle cx="17.5" cy="17.5" r="1"/>',
  lumber: '<path d="M14 4l6 6-3 1-4-4zM13.5 7.5 4 17l3 3 9.5-9.5M3 21h8"/>',
  quarry: '<path d="M3 20h18l-3-7-4 3-3-6-5 10zM15 4l4 4M14 9l5-5"/>',
  coal: '<path d="M4 14h16l-2 5H6zM7 14l2-5h6l2 5M8 21a1 1 0 1 0 0-.01M16 21a1 1 0 1 0 0-.01"/>',
  iron: '<path d="M4 10h12c0 2.5 2 4 4 4v2H4zM8 16v4h8v-4M4 10V7h9"/>',
  site: '<path d="M4 21V4h11M4 7h14l-3 4M15 4v7M18 7v8M16 15h4v4h-4zM2 21h20"/>',
  way: '<path d="M7 21 10 3M17 21 14 3M12 6v2M12 11v2M12 16v2"/>',
  rail: '<path d="M8 3 6 21M16 3l2 18M6.5 7h11M6 12h12M5.5 17h13"/>',
  levee: '<path d="M2 18c3 0 3-2 6-2s3 2 6 2 3-2 6-2M4 13l4-6h8l4 6z"/>',
  smallsq: '<rect x="5" y="5" width="14" height="14" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  bigsq: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M12 3v5.5M12 15.5V21M3 12h5.5M15.5 12H21"/>',
  fire: '<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z"/>',
  hippo: '<ellipse cx="12" cy="12" rx="9.5" ry="6.5"/><ellipse cx="12" cy="12" rx="5.5" ry="2.8"/>',
  barracks: '<path d="M3 21V9l9-5 9 5v12M3 21h18M8 21v-5h8v5M12 4V1M12 1h4v2h-4"/>',
  mill: '<path d="M9 21l1.5-10h3L15 21zM12 11 6 5M12 11l6-6M12 11 6 17M12 11l6 6"/>',
  pstation: '<path d="M3 20h18M5 20V10h14v10M3 10l9-5 9 5M9 14h2M13 14h2M8 20v-3h8v3"/>',
  fstation: '<path d="M3 20h18M4 20V9l8-4 8 4v11M7 20v-6h10v6M7 17h10"/>',
  port: '<path d="M2 19c2 0 2-1.5 4-1.5S8 19 10 19s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M5 15V8h8v7M13 15V4l6 3-6 3"/>',
  ranch: '<path d="M3 20h18M3 20v-7l4-3 4 3v7M7 20v-4M13 20v-5h8v5M13 17h8M17 15v5"/>',
  power: '<path d="M13 2 5 13h6l-1 9 8-12h-6z"/>',
  hydro: '<path d="M3 8h18v4H3zM6 12v8M10 12v8M14 12v8M18 12v8M2 20c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1"/>',
  factory: '<path d="M3 21V11l5 3V11l5 3V11l5 3V5h3v16zM18 5V2"/>',
  tram: '<rect x="5" y="6" width="14" height="12" rx="2"/><path d="M5 12h14M9 18l-2 3M15 18l2 3M12 6V3M8 3h8"/>',
  dump: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  pier: '<path d="M3 11h18M6 11v9M12 11v9M18 11v9M2 18c2 0 2-1 4-1s2 1 4 1 2-1 4-1 2 1 4 1 2-1 4-1M9 11V6l5 2.5L9 11"/>',
  bus: '<rect x="4" y="4" width="16" height="13" rx="2"/><path d="M4 11h16M7 17v3M17 17v3M8 14h.01M16 14h.01"/>',
  lyceum: '<path d="M2 9l10-5 10 5-10 5zM6 11v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5M12 14v7"/>',
  hospital: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M12 9v8M8 13h8M9 5V3h6v2"/>',
  cement: '<path d="M3 21h18M5 21V11h7v10M15 21V6h4v15M5 11l3.5-4L12 11"/>',
  gas: '<path d="M12 3c2 3 6 6 6 11a6 6 0 0 1-12 0c0-5 4-8 6-11zM12 21v-5"/>',
  metro: '<rect x="5" y="3" width="14" height="14" rx="3"/><path d="M5 11h14M8 21l2-4M16 21l-2-4M9 14h.01M15 14h.01"/>',
  nuclear: '<path d="M6 21c1-6 1-10-1-16h14c-2 6-2 10-1 16zM9 9h6"/>',
  recycle: '<path d="M7 19H4l3-5M17 19h3l-3-5M9 6l3-3 3 3M12 3v8M7 14l5 5 5-5"/>',
  tech: '<rect x="3" y="9" width="6" height="12"/><rect x="10" y="4" width="6" height="17"/><rect x="17" y="12" width="4" height="9"/>',
  solar: '<path d="M3 18 6 8h12l3 10zM9 8l-1 10M15 8l1 10M4.5 13h15M12 4V2M5 5 4 4M19 5l1-1"/>',
  wind: '<path d="M12 21V10M12 10 7 3M12 10l7 2M12 10l-4 6M9 21h6"/>',
  vfarm: '<rect x="7" y="3" width="10" height="18" rx="1"/><path d="M7 8h10M7 13h10M7 18h10M10 6c1-1 3-1 4 0M10 11c1-1 3-1 4 0"/>',
  fusion: '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="9" ry="4"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(120 12 12)"/>',
  fun: '<circle cx="12" cy="12" r="9"/><path d="M8 14c1 2 2.4 3 4 3s3-1 4-3M9 9h.01M15 9h.01"/>',
  fayton: '<circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/><path d="M4 12h12l2-5h3M10 12V7h6"/>',
  atolye: '<path d="M4 21V9l8-5 8 5v12zM8 21v-6h8v6M8 12h8"/>',
  han: '<path d="M3 21V8h18v13M3 8l9-5 9 5M9 21v-5a3 3 0 0 1 6 0v5M6 11h2M16 11h2"/>',
  tiyatro: '<path d="M5 4h9v6a4.5 4.5 0 0 1-9 0zM10 9h5v5a4.5 4.5 0 0 0 9 0V9h-4M7 7h.01M12 7h.01"/>',
  saha: '<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M12 5v14M3 9h3v6H3M21 9h-3v6h3"/><circle cx="12" cy="12" r="2.5"/>',
  sinema: '<rect x="3" y="7" width="13" height="12" rx="1"/><path d="m16 11 5-3v10l-5-3M6 4l3 3M11 4l3 3"/>',
  sanayi: '<path d="M3 21V12l6-3v3l6-3v3l6-3v12zM6 17h2M11 17h2M16 17h2"/>',
  avm: '<path d="M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2"/>',
  lojistik: '<rect x="2" y="7" width="12" height="10"/><path d="M14 10h4l3 3v4h-7M6 20a2 2 0 1 0 0-4M17 20a2 2 0 1 0 0-4"/>',
  gozcu: '<path d="M9 21V9h6v12M8 9h8l-4-6zM7 21h10M11 13h2"/>',
  kizkule: '<path d="M10 17V8h4v9M9 8h6l-3-4zM3 20c2 0 2-1.5 4.5-1.5S10 20 12 20s2-1.5 4.5-1.5S19 20 21 20M8 17h8"/>',
  saray: '<path d="M2 21h20M4 21V11h16v10M12 11V7M9 7a3 3 0 0 1 6 0M7 14v4M11 14v4M15 14v4M19 14v4M4 11l2-3M20 11l-2-3"/>',
  tapinak: '<path d="M3 21h18M4 9h16L12 3zM6 9v9M10 9v9M14 9v9M18 9v9M4 18h16"/>',
  rotate: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  scroll: '<path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7"/><path d="M6 4a2 2 0 0 0-2 2v1h4V6a2 2 0 0 0-2-2zM7 20a2 2 0 0 1-2-2V7M10 9h6M10 13h6"/>',
};
const ico = (k, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;

const TOOL_INFO = {
  pan: { name: 'Gez', tip: 'Haritada gezin, bir yere dokunup bilgisini gör.' },
  gov: { name: 'Valilik', tip: 'Şehrin merkezi. 2×2 alan kaplar, bir kez kurulur.' },
  road: { name: 'Yol', tip: 'Başlangıca, sonra bitişe dokun ya da basılı tutup sürükle. Nehirde köprü, rayın üstünde üst geçit, dağda tünel olur.' },
  res: { name: 'Konut', tip: 'İki köşeye dokun ya da basılı tutup sürükle. Evler talebe göre kendiliğinden yapılır.' },
  farm: { name: 'Tarla', tip: 'Tarla alanı: şehri besler, fazlası satılır.' },
  com: { name: 'Ticaret', tip: 'Dükkân ve atölyeler: işçilere iş, şehre ticaret vergisi.' },
  fountain: { name: 'Çeşme', tip: 'Çevresine su verir. Su olmadan evler büyümez.' },
  square: { name: 'Meydan', tip: '2×2 meydan: çevresindeki halkı mutlu eder, konaklar için gerekir.' },
  police: { name: 'Karakol', tip: 'Asayiş: 150 kişiden sonra halk güvenlik ister.' },
  school: { name: 'Mektep', tip: 'Eğitim: 200 kişiden sonra aileler mektep ister.' },
  clinic: { name: 'Hekimhane', tip: 'Sağlık: 250 kişiden sonra hastalık riski büyür.' },
  lumber: { name: 'Oduncu', tip: 'Ormanın yanına kur (çevrede en az 3 kare orman). Kereste üretir.' },
  quarry: { name: 'Taş ocağı', tip: 'Dağın dibine kur. Taş üretir.' },
  coal: { name: 'Kömür ocağı', tip: 'Kara kayaların (kömür yatağı) yanına kur.' },
  iron: { name: 'Demir madeni', tip: 'Pas renkli kayaların (demir yatağı) yanına kur.' },
  rail: { name: 'Ray', tip: 'Demiryolu görevinden sonra açılır. İstasyonu batıdaki ana hatta bağla; ocak ve madenleri raya yanaştır.' },
  levee: { name: 'Set', tip: 'Nehir kenarına çek: 2 kare içindeki evleri ve tarlaları selden korur.' },
  smallsq: { name: 'Köşe meydanı', tip: 'Küçük, ucuz meydan: yakın çevresini güzelleştirir.' },
  bigsq: { name: 'Yuvarlak meydan', tip: '3×3 havuzlu meydan: geniş çevreyi mutlu eder. 300 nüfustan sonra.' },
  fire: { name: 'İtfaiye', tip: 'Kapsadığı yerde yangın yayılmaz, çoğu hemen söndürülür.' },
  hippo: { name: 'Hipodrom', tip: '4×3 at yarışı pisti: geniş bir alanda eğlence ve her ay bilet geliri; mayısta büyük yarış günü. 600 nüfustan sonra.' },
  barracks: { name: 'Kışla', tip: '3×2 kışla: bütün haritada asayiş. Gideri yüksek, ayda 40 gıda ve 8 kömür tüketir. 500 nüfustan sonra.' },
  mill: { name: 'Değirmen', tip: 'Çevresindeki tarlaların verimini artırır; daha az tarla yeter.' },
  pstation: { name: 'Yolcu istasyonu', tip: '2×1, raya bitişik: çevresinde ulaşım kolaylaşır, halk memnun olur, dükkânlara daha çok müşteri gelir.' },
  fstation: { name: 'Yük istasyonu', tip: '2×1, raya bitişik: kapsadığı ocak ve madenler malını demiryoluyla daha pahalıya satar.' },
  port: { name: 'Liman', tip: '2×2, su kıyısına: gıda ve kaynaklar daha pahalıya satılır, bölge talebi artar. İskeleyi açar. 250 nüfustan sonra.' },
  ranch: { name: 'Hayvan çiftliği', tip: '3×2, bir tarlanın yanına: ayda 480 gıda (yaklaşık 50 tarla karesi) ve 30 kişiye iş. 300 nüfustan sonra.' },
  power: { name: 'Kömür santrali', tip: '2×2: 900 birim elektrik, ayda 20 kömür yakar. Çevresi kirlenir, mahallelerden uzak tut.' },
  hydro: { name: 'Su santrali', tip: 'Kıyıya bitişik suya kurulur: 450 birim temiz elektrik, kömür istemez.' },
  factory: { name: 'Fabrika', tip: '2×2: 40 kişiye iş ve her ay gelir. Elektrik ister, ayda 8 kömür ve 8 demir işler.' },
  bus: { name: 'Otobüs durağı', tip: 'Geniş bir çevrede ulaşım sağlar. Blok apartmanlar için ulaşım ve hastane gerekir.' },
  lyceum: { name: 'Lise', tip: 'Geniş bir alanda eğitim; eğitimlilere iş verir.' },
  hospital: { name: 'Hastane', tip: 'Geniş bir alanda sağlık; eğitimlilere iş verir.' },
  cement: { name: 'Çimento fabrikası', tip: 'Dağın dibine kurulur, çimento üretir. 1930 sonrası görevler çimento ister.' },
  metro: { name: 'Metro istasyonu', tip: 'Çok geniş bir alanda ulaşım. Gökdelen ve ofis kuleleri için ulaşım gerekir.' },
  nuclear: { name: 'Nükleer santral', tip: '2×2: 6000 birim temiz elektrik, gideri çok yüksek.' },
  recycle: { name: 'Geri dönüşüm tesisi', tip: '2×2: 7000 kişinin çöpünü işler.' },
  tech: { name: 'Teknopark', tip: '3×2: 120 eğitimliye iş, her ay gelir; çok elektrik ister.' },
  solar: { name: 'Güneş tarlası', tip: '2×2: 1500 birim temiz elektrik, düşük gider.' },
  wind: { name: 'Rüzgâr türbini', tip: '450 birim temiz elektrik, az yer kaplar.' },
  vfarm: { name: 'Dikey tarım kulesi', tip: 'Tek karede ayda 600 gıda; elektrik ister.' },
  fusion: { name: 'Füzyon santrali', tip: '2×2: 25.000 birim elektrik; çok pahalı.' },
  fun: { name: 'Eğlence' },
  fayton: { name: 'Fayton durağı', tip: 'Atlı faytonlar. Aynı yol üzerinde 12 kare içinde ikinci bir fayton durağı olunca aradaki yol hat olur, hattın iki yanı ulaşıma kavuşur.' },
  atolye: { name: 'Dokuma atölyesi', tip: '24 işçiye iş, her ay küçük bir gelir. İlk dönemin fabrikası.' },
  han: { name: 'Han', tip: '2×2 kervansaray: tüccarları çeker, bölge talebi ve dolayısıyla ticaret talebi artar; az da olsa ziyaretçi geliri. 150 nüfustan sonra.' },
  tiyatro: { name: 'Tiyatro', tip: 'Çevresinde eğlence. 400 nüfustan sonra.' },
  saha: { name: 'Futbol sahası', tip: '3×2: geniş bir alanda eğlence, maç günleri bilet geliri. 800 nüfustan sonra.' },
  sinema: { name: 'Sinema', tip: 'Çevresinde eğlence; biraz elektrik ister.' },
  sanayi: { name: 'Sanayi sitesi', tip: '3×2: 90 işçiye iş, her ay gelir; elektrik ister, çevresini kirletir.' },
  avm: { name: 'Alışveriş merkezi', tip: '3×2: 180 esnafa iş, geniş bir alanda eğlence, bölge talebi artar. 5000 nüfustan sonra.' },
  lojistik: { name: 'Lojistik merkezi', tip: '3×2: 110 işçiye iş ve gelir; otoyola bağlı şehirde bölge talebi çok artar.' },
  gozcu: { name: 'Gözcü kulesi', tip: 'Şehirde bir tane. Ziyaretçi geliri ve meydan etkisi. Ambardan 250 taş ister.' },
  kizkule: { name: 'Kız kulesi', tip: 'Şehirde bir tane, kıyıya yakın suya kurulur. Ziyaretçi geliri. Ambardan 300 taş ister.' },
  saray: { name: 'Sahil sarayı', tip: '3×2, şehirde bir tane, su kıyısına kurulur. Büyük ziyaretçi geliri, 40 kişiye iş, geniş meydan etkisi. Ambardan 600 taş ve 300 kereste ister.' },
  tapinak: { name: 'Antik tapınak', tip: '2×2 kazı ve müze, şehirde bir tane. Ziyaretçi geliri ve iş. Ambardan 150 kereste ister.' },
  gas: { name: 'Doğalgaz santrali', tip: '2×2: 2000 birim elektrik, kömür istemez ama gideri yüksektir.' },
  tram: { name: 'Tramvay durağı', tip: 'Çevresinde ulaşım sağlar. Apartmanlar için elektrikle birlikte ulaşım gerekir.' },
  dump: { name: 'Çöp alanı', tip: '2×2: 2.500 kişinin çöpünü toplar, yükseltilince 6.250 kişiye kadar. 1900 sonrası çöp toplanmazsa memnuniyet düşer, salgın riski artar.' },
  pier: { name: 'İskele', tip: 'Kıyıya bitişik suya kurulur: balıkçılık her ay gıda verir.' },
  site: { name: 'Şantiye', tip: 'Görev için 2×2 şantiye. Yola bağlı olmalı; kaynaklar her ay buraya taşınır.' },
  buy: { name: 'Arazi', tip: 'Koyu renkli alanlara dokun: o bölgeyi satın al. Her yeni arazi bir öncekinden pahalıdır.' },
  bulldoze: { name: 'Yık', tip: 'Yolu, alanı ya da binayı kaldırır.' },
  svc: { name: 'Hizmet' }, ind: { name: 'Üretim' }, way: { name: 'Ulaşım' },
};
const GROUPS = { way: ['road', 'rail', 'pstation', 'fstation', 'levee', 'port', 'pier'], svc: ['fountain', 'police', 'fire', 'school', 'clinic', 'barracks', 'fayton', 'tram', 'bus', 'metro', 'dump', 'lyceum', 'hospital', 'recycle'], fun: ['smallsq', 'square', 'bigsq', 'hippo', 'tiyatro', 'sinema', 'saha', 'avm', 'gozcu', 'kizkule', 'saray', 'tapinak'], ind: ['lumber', 'quarry', 'coal', 'iron', 'mill', 'ranch', 'atolye', 'han', 'sanayi', 'lojistik', 'power', 'hydro', 'factory', 'cement', 'gas', 'nuclear', 'tech', 'solar', 'wind', 'vfarm', 'fusion'] };
const LINE = { road: 1, rail: 1, levee: 1 };
const groupOf = (t) => Object.keys(GROUPS).find(g => GROUPS[g].includes(t));
const COVER = { fayton: 'transit', tiyatro: 'fun', sinema: 'fun', saha: 'fun', avm: 'fun', gozcu: 'square', saray: 'square', tapinak: 'square', metro: 'transit', bus: 'transit', lyceum: 'school', hospital: 'clinic', tram: 'transit', pstation: 'transit', fstation: 'freight', fountain: 'water', res: 'water', square: 'square', smallsq: 'square', bigsq: 'square', police: 'police', school: 'school', clinic: 'clinic', fire: 'fire', hippo: 'fun', levee: 'flood', mill: 'mill', farm: 'mill' };
const LV_NAME = { 1: ['', 'Kulübe', 'Ev', 'Konak', 'Apartman', 'Blok apartman', 'Gökdelen'], 2: ['', 'Tarla', 'Çiftlik'], 3: ['', 'Dükkân', 'Çarşı', 'Han', 'İş hanı', 'Mağazalar', 'Ofis kulesi'] };
const ZONE_NAME = { 1: 'Konut alanı', 2: 'Tarla alanı', 3: 'Ticaret alanı' };
const SPEEDS = [0, 1, 2, 5];
const DAY_MS = 1500;   // 1x: bir gün 1,5 saniye, bir ay 45 saniye; en hızlıda bir yıl yaklaşık 1,8 dakika

let G = null, view = null, tool = 'pan', speed = 1, lastSpeed = 1, acc = 0, selected = -1, panelKind = null;

/* ---------- başlangıç ---------- */
function boot() {
  buildChrome();
  const saved = loadSave();
  G = saved || VL.newGame({ seed: 7 });
  view = createView($('#map'), G);
  addEventListener('resize', () => view.resize());
  bindInput();
  showMenu(!!saved);
  requestAnimationFrame(loop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });
  addEventListener('pagehide', save);
}

function startGame(g) {
  G = g; view.setGame(G); selected = -1; view.select(-1); closePanel();
  $('#menu').hidden = true;
  if (!G.gov) {
    // Kamerayı dış yolun yakınına getir
    view.focus(G.entry.y * G.N + 12, 26);
    setTool('gov');
  } else { view.focus(G.gov.y * G.N + G.gov.x, 24); setTool('pan'); }
  setSpeed(G.gov ? 1 : 0);
  updateHud(true);
}

/* ---------- kayıt ---------- */
/* Kayıt yuvaları: her şehir ayrı anahtarda, liste 'vali.saves' içinde. Eski tek kayıt ilk açılışta yuvaya taşınır. */
const IDX_KEY = 'vali.saves', SLOT = (id) => 'vali.slot.' + id, MAX_SLOTS = 10;
const MAP_NAME = { river: 'Nehir kenarı', flat: 'Geniş ova', mount: 'Dağlık', lake: 'Büyük göl', sea: 'Deniz kıyısı' };
function readIdx() { try { return JSON.parse(localStorage.getItem(IDX_KEY) || '[]'); } catch (e) { return []; } }
function writeIdx(l) { try { localStorage.setItem(IDX_KEY, JSON.stringify(l)); } catch (e) { /* depolama kapalı */ } }
function slotMeta(g) {
  const P = VL.totals(g).P;
  return { id: g.slot, name: g.name || (MAP_NAME[g.map] || 'Şehir'), map: g.map, date: VL.dateText(g), pop: P, t: Date.now() };
}
function newSlotId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
function migrateLegacy() {
  try {
    const s = localStorage.getItem(SAVE_KEY); if (!s) return;
    const g = VL.deserialize(s);
    if (g) { g.slot = g.slot || newSlotId(); localStorage.setItem(SLOT(g.slot), VL.serialize(g)); writeIdx([slotMeta(g)].concat(readIdx().filter(x => x.id !== g.slot))); }
    localStorage.removeItem(SAVE_KEY);
  } catch (e) { /* bozuk eski kayıt */ }
}
function save() {
  if (!G || !G.gov) return true;
  if (!G.slot) G.slot = newSlotId();
  try {
    localStorage.setItem(SLOT(G.slot), VL.serialize(G));
    writeIdx([slotMeta(G)].concat(readIdx().filter(x => x.id !== G.slot)));
    return true;
  } catch (e) { toast('Kayıt yeri doldu: menüden eski bir şehri sil.'); return false; }
}
function loadSlot(id) { try { const s = localStorage.getItem(SLOT(id)); const g = s ? VL.deserialize(s) : null; if (g) g.slot = id; return g; } catch (e) { return null; } }
function deleteSlot(id) { try { localStorage.removeItem(SLOT(id)); } catch (e) { /* */ } writeIdx(readIdx().filter(x => x.id !== id)); }
function loadSave() { migrateLegacy(); const l = readIdx().sort((a, b) => b.t - a.t); for (const m of l) { const g = loadSlot(m.id); if (g) return g; } return null; }

/* ---------- arayüz iskeleti ---------- */
function buildChrome() {
  $('#tools').innerHTML = ['pan', 'gov', 'way', 'res', 'farm', 'com', 'svc', 'fun', 'ind', 'bulldoze', 'buy'].map(k =>
    `<button class="tool t-${k}" data-tool="${k}" aria-label="${TOOL_INFO[k].name}">${ico(k)}<span>${TOOL_INFO[k].name}</span></button>`).join('');
  $('#tools').addEventListener('click', e => {
    const b = e.target.closest('[data-tool]'); if (!b) return;
    const k = b.dataset.tool;
    if (GROUPS[k]) { openFlyout(k, b); return; }
    closeFlyout(); setTool(k === tool && tool !== 'pan' ? 'pan' : k);
  });
  $('#flyout').addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (b) { closeFlyout(); setTool(b.dataset.tool); } });
  $('#speeds').innerHTML = SPEEDS.map((s, k) => `<button data-s="${k}" aria-label="${s ? s + ' kat hız' : 'Duraklat'}">${s ? '<i></i>'.repeat(k) : ico('pause')}</button>`).join('');
  $('#projb').innerHTML = ico('scroll') + '<b></b>';
  $('#projb').onclick = () => togglePanel('proj');
  $('#speeds').addEventListener('click', e => { const b = e.target.closest('[data-s]'); if (b) setSpeed(+b.dataset.s); });
  $('#money').innerHTML = ico('coin') + '<b></b><small></small>';
  $('#popb').innerHTML = ico('people') + '<b></b>';
  $('#hapb').innerHTML = ico('smile') + '<b></b>';
  $('#menuBtn').innerHTML = ico('menu');
  $('#money').onclick = () => togglePanel('budget');
  $('#popb').onclick = () => togglePanel('city');
  $('#hapb').onclick = () => togglePanel('city');
  $('#demand').onclick = () => togglePanel('city');
  $('#menuBtn').onclick = () => togglePanel('game');
  $('#panel .x').innerHTML = ico('close');
  $('#panel .x').onclick = closePanel;
  $('#plan .no').innerHTML = ico('close'); $('#plan .yes').innerHTML = ico('check');
  $('#plan .no').onclick = clearPlan; $('#plan .yes').onclick = confirmPlan;
  $('#plan .rot').innerHTML = ico('rotate');
  $('#plan .rot').onclick = () => { G.prot = G.prot ? 0 : 1; if (plan) setPlan(plan.a, plan.b); };
}

function setTool(t) {
  if (t === 'gov' && G.gov) t = 'pan';
  tool = t;
  const grp = groupOf(t);
  document.querySelectorAll('#tools .tool').forEach(b => {
    const k = b.dataset.tool, on = k === t || k === grp;
    b.classList.toggle('on', on);
    if (GROUPS[k]) b.innerHTML = ico(on ? t : k) + `<span>${on ? TOOL_INFO[t].name : TOOL_INFO[k].name}</span>`;
  });
  $('#tools .t-gov').hidden = !!G.gov;
  clearPlan();
  view.setOverlay(COVER[t] || overlayPinned || null);
  if (t !== 'pan') { selected = -1; view.select(-1); if (panelKind === 'tile') closePanel(); }
  showHint();
}

function setSpeed(k) {
  if (!G.gov && k > 0) { toast('Önce Valilik binasını kur.'); k = 0; }
  speed = k; if (k) lastSpeed = k;
  document.querySelectorAll('#speeds button').forEach(b => b.classList.toggle('on', +b.dataset.s === k));
}

/* ---------- ipuçları ---------- */
let hintOverride = null;
function tutorialHint() {
  if (!G.gov) return 'Valilik binasını kurmak için bir yere dokun. Batıdaki taş yola yakın olsun.';
  const c = VL.cache(G), T = VL.totals(G);
  if (!c.outside) return 'Yol aracıyla Valilikten batıdaki taş yola bir yol çek. Göçmenler ve ticaret oradan gelir.';
  if (!c.zones[1].length || !c.zones[2].length) return 'Yolların yanına Konut (yeşil) ve Tarla (sarı) alanı çiz.';
  if (T.P >= 25 && !c.cnt.fountain) return 'Hizmet menüsünden konutların arasına bir Çeşme kur: su olmadan evler büyümez.';
  if (T.P >= 60 && !c.zones[3].length) return 'Kasaba büyüyor: yol kenarına Ticaret (mavi) alanı çiz.';
  if (G.motorEntry && !c.motorOut) return 'Batı kenarındaki otoyolu şehrin yollarına bağla.';
  if (G.fx && G.fx.rail && !c.railOut) return 'Ulaşım menüsünden Ray seç: istasyonu batıdaki ana demiryolu hattına bağla.';
  if (G.proj && !G.proj.site) return `Görev: ${VL.PROJECTS[G.proj.i].name}. Üretim menüsünden kaynak topla ve Görev panelinden şantiye kur.`;
  return '';
}
function showHint() {
  const h = $('#hint');
  const text = hintOverride || (tool !== 'pan' && G.gov ? TOOL_INFO[tool].tip : '') || tutorialHint();
  h.innerHTML = text; h.hidden = !text;
}

/* ---------- üst şerit ---------- */
let hudCache = '';
function updateHud(force) {
  const T = VL.totals(G);
  const key = [G.day, Math.round(G.money), T.P, Math.round(VL.avgHap(G)), speed].join('|');
  if (!force && key === hudCache) return; hudCache = key;
  $('#date').textContent = VL.dateText(G);
  const pj = $('#projb'); pj.hidden = !G.proj && !G.done.length;
  if (G.proj) { const p = VL.PROJECTS[G.proj.i]; let a = 0, b = 0; for (const k in p.needs) { a += G.proj.got[k]; b += p.needs[k]; } pj.querySelector('b').textContent = '%' + Math.floor(a / b * 100); pj.classList.toggle('alert', !G.proj.site || !!G.proj.late); }
  else { pj.querySelector('b').textContent = G.done.length + '✓'; pj.classList.remove('alert'); }
  $('#tools .t-gov').hidden = !!G.gov;
  $('#money b').textContent = short(G.money);
  const net = G.last.net || 0;
  const sm = $('#money small'); sm.textContent = G.gov ? sgnS(net) + '/ay' : ''; sm.className = net < 0 ? 'neg' : 'pos';
  $('#money').classList.toggle('debt', G.money < 0);
  $('#popb b').textContent = fmt(T.P);
  const h = Math.round(VL.avgHap(G)); $('#hapb b').textContent = T.P ? '%' + h : '—';
  $('#hapb').dataset.mood = !T.P ? '' : h >= 65 ? 'good' : h >= 45 ? 'ok' : 'bad';
  const sc = Math.max(12, T.P * 0.012), bar = (d) => Math.max(-1, Math.min(1, Math.tanh(d / sc)));      // büyük şehirde ölçek büyür
  const set = (sel, d) => { const el = $(sel), v = bar(d); el.style.setProperty('--v', Math.abs(v)); el.classList.toggle('neg', v < 0); };
  set('#dR i', T.dRes); set('#dF i', T.dFarm); set('#dC i', T.dCom);
  if (panelKind === 'budget') { if (budgetMonth !== G.last && !taxDrag) { budgetMonth = G.last; renderPanel(); } }
  else if (panelKind === 'city' || panelKind === 'proj') renderPanel();
  if (panelKind === 'tile' && selected >= 0) renderPanel();
}

/* ---------- paneller ---------- */
let overlayPinned = false, cityTab = 'pop', budgetMonth = null, taxDrag = false;
function togglePanel(kind) { if (panelKind === kind) closePanel(); else { panelKind = kind; renderPanel(); $('#panel').hidden = false; $('#app').classList.add('with-panel'); } }
function closePanel() { panelKind = null; $('#panel').hidden = true; $('#app').classList.remove('with-panel'); if (selected >= 0) { selected = -1; view.select(-1); } }

function renderPanel() {
  const head = $('#panel h2'), body = $('#panel .body'), keep = body.scrollTop, same = body.dataset.kind === panelKind + (panelKind === 'city' ? cityTab : '');
  if (panelKind === 'budget') { head.textContent = 'Bütçe'; body.innerHTML = budgetHtml(); bindBudget(); }
  else if (panelKind === 'city') { head.textContent = 'Şehir'; body.innerHTML = cityHtml(); body.querySelector('.tabs').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (b) { cityTab = b.dataset.tab; renderPanel(); } }; const j = $('#gJam'); if (j) j.onclick = () => { overlayPinned = overlayPinned === 'traffic' ? false : 'traffic'; setTool(tool); renderPanel(); }; }
  else if (panelKind === 'game') { head.textContent = 'Menü'; body.innerHTML = gameHtml(); bindGame(); }
  else if (panelKind === 'proj') { head.textContent = 'Görev ve kaynaklar'; body.innerHTML = projHtml(); const b = $('#gSite'); if (b) b.onclick = () => { closePanel(); setTool('site'); }; }
  else if (panelKind === 'tile') { const t = tileInfo(selected); head.textContent = t.title; body.innerHTML = t.html; const b = $('#gUp'); if (b) b.onclick = () => { const r = VL.upgrade(G, selected); if (!r.done) toast(r.err); else { view.syncBuild(); updateHud(true); renderPanel(); } }; }
  body.scrollTop = same ? keep : 0; body.dataset.kind = panelKind + (panelKind === 'city' ? cityTab : '');
}

function jamText(i) { const c = VL.cache(G); if (!c.jam) VL.traffic(G, c); const g = c.jam[i] || 0; return `<span class="${g > 1 ? 'neg' : ''}">%${Math.round(g * 100)}${g > 1.4 ? ' · tıkalı' : g > 1 ? ' · sıkışık' : ''}</span>`; }
function row(label, val, cls = '') { return `<div class="row ${cls}"><span>${label}</span><b>${val}</b></div>`; }

function budgetHtml() {
  const L = G.last, i = L.inc || {}, e = L.exp || {};
  const v = (x) => x ? sgn(x) : '0';
  return `<p class="lead">Geçen ayın hesabı. Vergi oranını buradan değiştirebilirsin.</p>
  <h3>Gelir</h3>
  ${row('Çiftçilerden vergi', v(i.taxC || 0))}${row('İşçilerden vergi', v(i.taxI || 0))}${row('Esnaf, eğitimli ve varlıklılardan', v((i.taxE || 0) + (i.taxO || 0) + (i.taxV || 0)))}${row('Ticaret vergisi', v(i.taxCom || 0))}${row('Gıda satışı', v(i.trade || 0))}${row('Kaynak satışı', v(i.sales || 0))}${row('Ziyaretçi geliri', v(i.tourism || 0))}${row('Hipodrom ve stadyum biletleri', v(i.tickets || 0))}${row('Fabrika ve teknopark geliri', v(i.factory || 0))}
  <h3>Gider</h3>
  ${row('Yol, ray ve set bakımı', v(-(e.roads || 0)))}${row('Köprüler', v(-(e.bridges || 0)))}${row('Valilik', v(-(e.gov || 0)))}${row('Hizmet binaları', v(-((e.services || 0) + (e.fountains || 0))))}${e.loan ? row('Kredi taksiti', v(-e.loan)) : ''}
  ${row('Aylık net', sgn(L.net || 0) + ' ', (L.net || 0) < 0 ? 'total neg' : 'total')}
  <h3>Vergi oranı <output id="taxOut">%${G.taxRate}</output></h3>
  <div class="taxrow"><button class="taxb" data-d="-1" aria-label="Azalt">−</button><input id="tax" type="range" min="0" max="${VL.B.maxTax}" step="1" value="${G.taxRate}"><button class="taxb" data-d="1" aria-label="Artır">+</button></div>
  <p class="note" id="taxNote">${taxNote()}</p>
  ${loanHtml()}`;
}
function loanHtml() {
  const L = G.loan, pct = (r) => '%' + Math.round(r * 100);
  if (L) return `<h3>Banka kredisi</h3>${row('Kalan borç', fmt(Math.ceil(L.bal)))}${row('Aylık taksit', fmt(L.pay))}${row('Kalan süre', Math.ceil(L.left / 12) + ' yıl (' + L.left + ' ay)')}${row('Faiz', pct(L.rate) + ' yıllık')}
    <button class="wide" id="loanPay">Krediyi erken kapat (${fmt(Math.ceil(L.bal))})</button><p class="note">Erken kapatırsan itibar +2.</p>`;
  const lim = VL.loanLimit(G), opts = [0.25, 0.5, 1].map(f => Math.round(lim * f / 100) * 100).filter((a, k, A) => a >= 500 && A.indexOf(a) === k);
  return `<h3>Banka kredisi</h3><p class="note">Sınır ${fmt(lim)} (gelirine ve itibarına göre). 10 yıl eşit taksit, faiz ${pct(VL.loanRate(G))} yıllık. Aynı anda bir kredi.</p>
    <div class="loans">${opts.map(a => `<button class="wide" data-loan="${a}">${fmt(a)}<small>ayda ${fmt(VL.loanPay(G, a))}</small></button>`).join('')}</div>`;
}
function taxNote() {
  const d = G.taxRate - VL.B.taxNeutral;
  if (d === 0) return 'Halk bu orandan memnun.';
  return d > 0 ? `Yüksek vergi memnuniyeti yaklaşık ${d * 2} puan düşürür.` : `Düşük vergi memnuniyeti yaklaşık ${Math.round(-d * 1.4)} puan artırır, gelir azalır.`;
}
function bindBudget() {
  const r = $('#tax'); if (!r) return;
  const setTax = (v) => { G.taxRate = Math.max(0, Math.min(VL.B.maxTax, v)); r.value = G.taxRate; $('#taxOut').textContent = '%' + G.taxRate; $('#taxNote').textContent = taxNote(); };
  r.oninput = () => setTax(+r.value);
  r.onpointerdown = () => { taxDrag = true; }; const up = () => { taxDrag = false; }; r.onpointerup = up; r.onpointercancel = up; r.onblur = up;
  for (const b of document.querySelectorAll('.taxb')) b.onclick = () => setTax(G.taxRate + +b.dataset.d);
  const done = (res) => { if (res.err) toast(res.err); else { updateHud(true); renderPanel(); } };
  for (const b of document.querySelectorAll('[data-loan]')) b.onclick = () => done(VL.takeLoan(G, +b.dataset.loan));
  const p = $('#loanPay'); if (p) p.onclick = () => done(VL.payLoan(G));
}

const FACTOR = { base: 'Temel', water: 'Su', jobs: 'İş', tax: 'Vergi', food: 'Gıda', market: 'Pazar', safety: 'Asayiş', health: 'Sağlık', edu: 'Eğitim', square: 'Meydan', fun: 'Eğlence', transit: 'Ulaşım', traffic: 'Trafik', power: 'Elektrik', waste: 'Çöp', army: 'Ordu', dirt: 'Maden tozu', event: 'Afet', gov: 'Valilik' };
const GDESC = {
  c: 'Tarlalarda çalışır.',
  i: 'Ocak, maden, fabrika, liman ve hizmet binalarında çalışır.',
  e: 'Dükkân ve çarşılarda çalışır. Asayişe ve ulaşıma önem verir.',
  o: 'Valilik, mektep, hekimhane ve istasyonlarda çalışır. Mektebi olmayan şehre gelmez; eğitime ve meydanlara önem verir.',
  v: 'Çalışmaz, en yüksek vergiyi öder. Meydan ya da eğlence yakınındaki temiz konak ve apartmanlara yerleşir; kirlilikten ve yüksek vergiden kaçar.',
};
function cityHtml() {
  const T = VL.totals(G);
  const grp = (g, name, jobs) => {
    const n = G.grp[g] || 0, un = Math.max(0, n - jobs), f = G.hf[g] || {};
    const fs = Object.keys(FACTOR).filter(k => f[k] != null && k !== 'base').map(k => `<span class="chip ${f[k] < 0 ? 'neg' : f[k] > 0 ? 'pos' : ''}">${FACTOR[k]} ${f[k] > 0 ? '+' : ''}${f[k]}</span>`).join('');
    return `<div class="grp"><div class="grp-h"><b>${name}</b><span>${fmt(n)} kişi</span><span class="mood">%${Math.round(G.hap[g] == null ? 60 : G.hap[g])}</span></div>
      <p class="note small">${GDESC[g]}</p>${row(g === 'v' ? 'Uygun konak ve apartman yeri' : 'Geçindiren iş', fmt(jobs))}${row(g === 'v' ? 'Yersiz' : 'İşsiz', fmt(un), un > 0 ? 'neg' : '')}
      <div class="chips">${fs || '<span class="note">Ay sonunda hesaplanır</span>'}</div></div>`;
  };
  const dem = (d) => d > 2 ? 'Yüksek' : d > 0 ? 'Var' : d > -6 ? 'Dengede' : 'Yok';
  const tabs = [['pop', 'Nüfus'], ['prod', 'Üretim'], ['infra', 'Altyapı'], ['dem', 'Talep']];
  let h = `<div class="tabs">${tabs.map(([k, n]) => `<button data-tab="${k}" class="${k === cityTab ? 'on' : ''}">${n}</button>`).join('')}</div>`;
  if (cityTab === 'pop') h += row('Toplam nüfus', fmt(T.P)) + row('Ortalama memnuniyet', '%' + Math.round(VL.avgHap(G))) + row('Boş konut', fmt(T.free)) +
    VL.GRP.filter(g => G.grp[g] || T.jobs[g]).map(g => grp(g, VL.GRP_NAME[g], T.jobs[g])).join('');
  else if (cityTab === 'prod') h += `<h3>Gıda (aylık)</h3>${row('Üretim', fmt(G.food.prod))}${T.fish ? row('Balık ve hayvancılık', fmt(T.fish)) : ''}${row('Tüketim', fmt(G.food.cons))}${row(G.food.net >= 0 ? 'Fazla (satılır)' : 'Açık', sgn(G.food.net), G.food.net < 0 ? 'neg' : '')}` + storeHtml();
  else if (cityTab === 'infra') h += (T.yr >= 1890 ? '<h3>Elektrik ve çöp</h3>' + row('Elektrik (üretim / tüketim)', fmt(T.pcap) + ' / ' + fmt(T.puse), T.power < 0.9 ? 'neg' : '') + row('Çöp toplama', '%' + Math.round(T.waste * 100), T.waste < 0.9 && T.yr >= 1900 ? 'neg' : '') : '<p class="note">Elektrik ve çöp 1890’dan sonra önem kazanır.</p>') +
    '<h3>Hizmet kapsamı (halkın yüzde kaçı)</h3>' + [['water', 'Su'], ['police', 'Asayiş'], ['fire', 'İtfaiye'], ['school', 'Eğitim'], ['clinic', 'Sağlık'], ['transit', 'Ulaşım'], ['square', 'Meydan'], ['fun', 'Eğlence']].map(([k, n]) => row(n, '%' + Math.round((T.cov[k] || 0) * 100), (T.cov[k] || 0) < 0.6 ? 'neg' : '')).join('') +
    '<h3>Trafik</h3>' + row('Sıkışık yollar', '%' + Math.round(((G.tr || {}).jammed || 0) * 100), ((G.tr || {}).jammed || 0) > 0.15 ? 'neg' : '') + row('Trafikten etkilenen halk', '%' + Math.round(((G.tr || {}).pen || 0) * 100)) + `<button class="wide ${overlayPinned === 'traffic' ? 'on' : ''}" id="gJam">${ico('layers')} Trafik katmanı</button><p class="note">Yoğunluğu ara yollar, toplu taşıma hatları (iki durak arası) ve metro azaltır. Otomobil 1910’dan sonra yayılır.</p>` + riskHtml();
  else h += `<h3>Talep</h3>${row('Konut', dem(T.dRes))}${row('Tarla', dem(T.dFarm))}${row('Ticaret', dem(T.dCom))}${row('Bölgenin talebi', T.outside ? fmt(G.reg) : 'Dış yol yok', T.outside ? '' : 'neg')}
    <p class="note">Bölge talebi, çevredeki köy ve kasabaların ürünlerine ilgisidir. Memnun ve iyi bağlantılı bir şehirde zamanla artar.</p>`;
  return h;
}

/* Görev paneli: aktif görev, teslimat, ambar ve üretim */
function projHtml() {
  let h = '';
  if (G.proj) {
    const P = G.proj, p = VL.PROJECTS[P.i];
    const left = Math.max(0, P.due - G.day), ly = Math.floor(left / 360), lm = Math.floor((left % 360) / 30);
    h += `<div class="grp"><div class="grp-h"><b>${p.name}</b><span class="mood ${P.late ? 'neg' : ''}">${P.late ? 'Süre doldu' : ly + ' yıl ' + lm + ' ay'}</span></div>
      <p class="note">${p.desc}</p>`;
    for (const k in p.needs) {
      const f = Math.min(1, P.got[k] / p.needs[k]);
      h += `<div class="bar"><span>${VL.RES_NAME[k]}</span><i style="--f:${f}"></i><b>${fmt(P.got[k])} / ${fmt(p.needs[k])}</b></div>`;
    }
    if (!P.site) h += `<button class="wide primary" id="gSite">${ico('site')} Şantiye kur</button><p class="note">Şantiye yola bağlı olmalı. Ambardaki kaynaklar her ay en çok ${VL.B.deliverPerMonth} birim taşınır.</p>`;
    else if (!P.linked) h += '<p class="note neg">Şantiye yol ağına bağlı değil, taşıma yapılamıyor.</p>';
    else h += `<p class="note">Kaynaklar her ay ambardan şantiyeye taşınıyor (türü başına en çok ${VL.B.deliverPerMonth}).</p>`;
    h += `<p class="note"><b>Ödül:</b> ${p.reward}</p></div>`;
  } else if (G.projNext < VL.PROJECTS.length) {
    const p = VL.PROJECTS[G.projNext];
    h += `<p class="lead">Sıradaki görev ${p.year}${VL.yearOf(G) >= p.year ? ' (şehir dış yola bağlanınca)' : ''}: <b>${p.name}</b>. ${p.desc}</p>`;
  } else h += '<p class="lead">Bu dönemin bütün görevleri bitti.</p>';
  h += storeHtml();
  if (G.done.length) h += '<h3>Biten görevler</h3>' + G.done.map(d => row(VL.PROJECTS.find(p => p.id === d.id).name, d.pre ? 'önceki dönem' : d.year + (d.late ? ' · geç' : ''))).join('');
  return h;
}

function storeHtml() {
  let h = `<h3>Ambar <span>itibar ${G.itibar}</span></h3>`;
  const U = G.used || {}, Tw = VL.totals(G), staff = Tw.workJobs ? Math.min(1, G.grp.i / Tw.workJobs) : 0;
  for (const k of VL.RES) h += row(VL.RES_NAME[k], `${fmt(G.res[k])}<small class="${(G.made[k] || 0) > 0 ? 'pos' : ''}"> +${fmt(G.made[k] || 0)}</small>${U[k] ? `<small class="neg"> −${fmt(U[k])}</small>` : ''}<small>/ay</small>`);
  h += row('İşçi doluluğu', '%' + Math.round(staff * 100), staff < 0.8 ? 'neg' : '');
  if (staff < 0.8) h += '<p class="note neg">İş sayısı işçiden fazla: ocaklar, madenler ve fabrikalar tam kapasite çalışamıyor. Daha fazla konut aç.</p>';
  if (U.fac) h += row('Fabrikaların hammaddesi', '%' + Math.round(U.fed * 100), U.fed < 1 ? 'neg' : '');
  h += '<p class="note">Kömürü santraller, fabrikalar ve kışla; demiri fabrikalar kullanır. Görev şantiyesinin payı her zaman önce ayrılır, fabrikalar kalanı işler.</p>';
  const sold = VL.RES.filter(k => (G.sold[k] || 0) > 0);
  h += `<p class="note">Ambar her kaynaktan en çok ${VL.B.stockCap} birim tutar, fazlası kendiliğinden satılır${sold.length ? ' (geçen ay: ' + sold.map(k => VL.RES_NAME[k] + ' ' + fmt(G.sold[k])).join(', ') + ')' : ''}.</p>`;
  return h;
}

/* Hizmet ve Üretim alt menüsü */
function openFlyout(g, btn) {
  const f = $('#flyout');
  if (!f.hidden && f.dataset.g === g) { closeFlyout(); return; }
  f.dataset.g = g;
  const P = VL.totals(G).P;
  f.classList.toggle('two', GROUPS[g].length > 5);
  f.innerHTML = GROUPS[g].map(k => {
    const d = VL.SVD[k], railLock = (k === 'rail' || (d && d.needRail)) && !(G.fx && G.fx.rail), portLock = k === 'pier' && !VL.cache(G).cnt.port;
    const yearLock = d && d.year && VL.yearOf(G) < d.year;
    const have = d && d.unique && VL.cache(G).cnt[k];
    const locked = have || yearLock || railLock || portLock || (d && d.minP && P < d.minP);
    const cost = k === 'road' ? VL.B.cost.road + '/kare' : k === 'rail' ? VL.B.cost.rail + '/kare' : d.line ? d.cost + '/kare' : fmt(d.cost);
    const resTxt = d && d.res ? Object.keys(d.res).map(r => ' + ' + d.res[r] + ' ' + VL.RES_NAME[r].toLocaleLowerCase('tr')).join('') : '';
    const sub = have ? 'Şehirde var' : locked ? (yearLock ? d.year + ' yılında açılır' : railLock ? 'Demiryolu görevinden sonra' : portLock ? 'Önce liman' : d.minP + ' nüfustan sonra') : cost + resTxt;
    return `<button data-tool="${k}" class="${k === tool ? 'on' : ''}" ${locked ? 'disabled' : ''}>${ico(k)}<span><b>${TOOL_INFO[k].name}</b><small>${sub}</small></span></button>`;
  }).join('');
  f.hidden = false;
  const r = btn.getBoundingClientRect();
  f.style.top = Math.max(52, Math.min(innerHeight - f.offsetHeight - 6, r.top - 4)) + 'px';
}
function closeFlyout() { $('#flyout').hidden = true; }

function riskHtml() {
  const r = G.risk || {}, off = G.opt && !G.opt.disasters;
  const bar = (name, v, tip) => `<div class="bar"><span>${name}</span><i style="--f:${(v || 0) / 100}" class="${v > 50 ? 'hot' : ''}"></i><b>%${v || 0}</b></div><p class="note small">${tip}</p>`;
  return `<h3>Afet riskleri${off ? ' <span>kapalı</span>' : ''}</h3>
  ${bar('Yangın', r.fire, 'İtfaiye kur: kapsadığı yerde yangın yayılmaz.')}
  ${bar('Sel', r.flood, 'Nehrin 2 kare yakınındaki binalar risk altında. Kıyıya Set çek (Ulaşım).')}
  ${bar('Salgın', r.plague, 'Çeşme ve hekimhane kapsamı ile su kemeri salgın riskini düşürür.')}`;
}

function gameHtml() {
  return `${canFull() && !installed() ? `<button class="wide" id="gFull">${ico('full')} ${isFull() ? 'Tam ekrandan çık' : 'Tam ekran'}</button>` : ''}
  <button class="wide" id="gSave">Kaydet</button>
  <button class="wide" id="gName">Şehrin adı: ${G.name || MAP_NAME[G.map] || 'Şehir'}</button>
  <button class="wide ${overlayPinned === 'water' ? 'on' : ''}" id="gWater">${ico('layers')} Su kapsama katmanı</button>
  <button class="wide ${autoOn() ? 'on' : ''}" id="gAuto">Alan çizerken otomatik sokak: ${autoOn() ? 'açık' : 'kapalı'}</button>
  <button class="wide ${G.opt && G.opt.disasters ? 'on' : ''}" id="gDis">Doğal afetler: ${G.opt && G.opt.disasters ? 'açık' : 'kapalı'}</button>
  <button class="wide" id="gMenu">Ana menü</button>
  <p class="note">Oyun her ay ve uygulamadan çıkarken kendiliğinden kaydedilir.</p>
  <p class="note">Tek parmakla haritayı kaydır, iki parmakla yakınlaştır ve döndür. İnşa ederken iki noktaya dokun ya da basılı tutup sürükle, sonra ✓ ile onayla. Bilgisayarda sürükleyerek çiz, Enter ile onayla, sağ tıkla döndür.</p>
  <p class="note small">Vali · prototip 1 · ${VL.dateText(G)}</p>`;
}
function bindGame() {
  $('#gSave').onclick = () => { if (save()) toast('Kaydedildi.'); };
  $('#gName').onclick = () => { const n = prompt('Şehrin adı', G.name || MAP_NAME[G.map] || ''); if (n && n.trim()) { G.name = n.trim().slice(0, 24); save(); renderPanel(); } };
  if ($('#gFull')) $('#gFull').onclick = () => { fullscreen(!isFull()); setTimeout(renderPanel, 400); };
  $('#gWater').onclick = () => { overlayPinned = overlayPinned === 'water' ? false : 'water'; setTool(tool); renderPanel(); };
  $('#gAuto').onclick = () => { G.opt = G.opt || {}; G.opt.autoRoads = !autoOn(); renderPanel(); };
  $('#gDis').onclick = () => { G.opt.disasters = !G.opt.disasters; renderPanel(); };
  $('#gMenu').onclick = () => { save(); closePanel(); setSpeed(0); showMenu(!!readIdx().length); };
}

function tileInfo(i) {
  const N = G.N, c = VL.cache(G), x = i % N, y = (i / N) | 0;
  const t = G.t[i], z = G.z[i], lv = G.lv[i];
  const yes = (b) => b ? 'Var' : '<span class="neg">Yok</span>';
  if (G.sv[i] === VL.S_GOV) return { title: 'Valilik', html: `${row('İş', VL.B.govJobs + ' kişiyi geçindirir')}${row('Aylık gider', fmt(VL.B.upkeep.gov))}${row('Dış yola bağlantı', yes(c.outside))}<p class="note">Şehrin yönetim merkezi. Bütün yollar buraya bağlı olmalı.</p>` };
  const sv = G.sv[i];
  if (sv === VL.S_SITE || sv === VL.S_LANDMARK) {
    const m = VL.multiAt(G, i), p = m && VL.PROJECTS.find(q => q.id === m.pid);
    if (sv === VL.S_SITE) return { title: 'Şantiye · ' + (p ? p.name : ''), html: `${row('Yola bağlı', yes(G.proj && G.proj.linked))}<p class="note">İlerlemeyi Görev panelinde görebilirsin.</p>` };
    const L = m && VL.LANDMARK[m.pid];
    if (!L) return { title: p ? p.name : 'Anıt', html: `<p class="note">${p ? p.reward : ''}</p>` };
    const ok = VL.multiTiles(G, m).some(j => c.served[j]);
    return { title: `${p.name} · ${L.name}`, html: `${row('Yola bağlı', yes(ok))}${row('Geçindirdiği kişi', ok ? L.jobs : 0)}${m.pid === 'tower' && ok ? row('Ziyaretçi geliri', '≈' + fmt(40 + G.reg * 0.15) + '/ay') : ''}<p class="note">${L.text}</p>${ok ? '' : '<p class="note neg">Çalışması için yola bağla.</p>'}` };
  }
  const key = VL.CODE2KEY[sv];
  if (key && VL.SVD[key]) {
    const d = VL.SVD[key];
    const served = (d.w || 1) > 1 || d.onWater ? true : c.served[i];
    const up = VL.upInfo(G, i);
    let h = row('Yola bağlı', yes(served));
    if (up) h += row('Seviye', up.lv + ' / ' + up.max) + (up.lv > 1 ? row('Üretim çarpanı', '×' + up.mul) : '');
    if (d.radius) h += row('Etki yarıçapı', Math.round(d.radius * VL.RADM[up ? up.lv : 1]) + ' kare');
    if (d.route) { const n = c.stopLink[i] || 0; h += row('Hat menzili', Math.round(d.route * VL.RADM[up ? up.lv : 1]) + ' kare') + row('Bağlı durak', n ? n : '<span class="neg">Yok</span>'); if (!n) h += `<p class="note neg">Tek başına durak işe yaramaz: aynı yol ağında ${Math.round(d.route * VL.RADM[up ? up.lv : 1])} kare içine ikinci bir ${d.name.toLocaleLowerCase('tr')} kur.</p>`; }
    if (d.jobs) h += row('Geçindirdiği kişi', Math.round(d.jobs * (up ? up.jmul : 1)));
    if (d.com) h += row('Esnafa iş', Math.round(d.com * (up ? up.mul : 1)));
    if (d.inc) h += row('Gelir', '≈' + fmt(d.inc * (up ? up.mul : 1)) + '/ay');
    if (d.tour) h += row('Ziyaretçi geliri', '≈' + fmt(d.tour[0] + G.reg * d.tour[1]) + '/ay');
    if (key === 'han') h += row('Ziyaretçi geliri', '≈12/ay') + row('Bölge talebine', '+1/ay');
    if (key === 'saha') h += row('Bilet geliri', '≈' + fmt(20 + Math.sqrt(VL.totals(G).P) * 0.8) + '/ay');
    if (key === 'ranch') h += row('Aylık gıda', VL.B.ranchFood);
    if (key === 'power') h += row('Elektrik', VL.B.power.plant + ' birim') + row('Kömür tüketimi', VL.B.power.coal + '/ay' + (G.flags.noCoal ? ' · <span class="neg">kömür yok</span>' : ''));
    if (key === 'hydro') h += row('Elektrik', VL.B.power.hydro + ' birim');
    const PW = { gas: 2000, nuclear: 6000, solar: 1500, wind: 450, fusion: 25000 };
    if (PW[key]) h += row('Elektrik', fmt(PW[key] * (up ? up.mul : 1)) + ' birim');
    if (key === 'vfarm') h += row('Aylık gıda', fmt(600 * (up ? up.mul : 1)));
    if (key === 'recycle') h += row('Kapasite', fmt(7000 * (up ? up.mul : 1)) + ' kişi');
    if (key === 'tech') h += row('Gelir', '≈' + fmt(500 * (up ? up.mul : 1)) + '/ay');
    if (key === 'factory') h += row('Gelir', '≈' + VL.B.factory.income + '/ay') + row('Elektrik tüketimi', VL.B.power.factoryUse + ' birim');
    if (key === 'dump') h += row('Kapasite', fmt(VL.B.dumpCap * (up ? up.mul : 1)) + ' kişi');
    if (key === 'pier') h += row('Aylık balık', VL.B.pierFood + ' gıda');
    if (key === 'mill') h += row('Tarla verimi', '+%' + Math.round(VL.B.millBoost * 100));
    if (key === 'hippo') { const one = VL.hippoIncome(G, { hippos: served ? 1 : 0 }, VL.totals(G).P); h += row('Bilet geliri', '≈' + fmt(one) + '/ay') + row('Büyük yarış (Mayıs)', '≈' + fmt(one * VL.B.hippo.raceMul)); }
    if (d.upkeep) h += row('Aylık gider', fmt(d.upkeep));
    if (d.out) {
      const f = served ? VL.resourceFactor(G, i, d.need) : 0;
      h += row('Üretim', `≈${Math.round(d.rate * f * (up ? up.mul : 1))} ${VL.RES_NAME[d.out].toLocaleLowerCase('tr')}/ay`) + row('Ambarda', fmt(G.res[d.out]));
      const rail = (c.ind.find(b => b.i === i) || {}).rail;
      h += row('Demiryoluyla satış', rail ? 'Var' : '<span class="neg">Yok</span>');
      h += '<p class="note">Tam üretim için yeterince işçi gerekir. Yakınındaki evler toz ve gürültüden dolayı büyüyemez. Raya ya da yük istasyonuna yakın olursa malı daha pahalıya satılır.</p>';
    }
    h += `<p class="note">${TOOL_INFO[key].tip}</p>`;
    if (up && up.lv < up.max) h = `<button class="wide primary" id="gUp" ${G.money < up.cost ? 'disabled' : ''}>Seviye ${up.lv + 1}'e yükselt · ${fmt(up.cost)}</button><p class="note">${d.out || key === 'ranch' || key === 'power' || key === 'hydro' || key === 'gas' || key === 'factory' ? 'Üretim ×' + up.nextMul : key === 'dump' ? 'Kapasite ×' + up.nextMul : d.radius ? 'Etki yarıçapı ' + Math.round(d.radius * VL.RADM[up.lv + 1]) + ' kare' : d.route ? 'Hat menzili ' + Math.round(d.route * VL.RADM[up.lv + 1]) + ' kare' : 'Üretim ×' + up.nextMul} olur; daha çok işçi ister, gideri artar.</p>` + h;
    return { title: d.name + (up && up.lv > 1 ? ' · seviye ' + up.lv : ''), html: h };
  }
  const mk = G.mark && G.mark[i];
  const markNote = mk ? `<p class="note neg">${mk.k === 'burn' ? 'Yangın yeri: binalar zamanla yeniden yapılır.' : 'Sel suları çekiliyor.'}</p>` : '';
  if (G.rl && G.rl[i] && !G.r[i]) {
    if (G.rl[i] === 2) return { title: 'Ana demiryolu hattı', html: '<p class="note">Komşu şehre giden hat. İstasyonu buraya raylarla bağla.</p>' };
    return { title: t === VL.T_WATER ? 'Demiryolu köprüsü' : t === VL.T_ROCK ? 'Demiryolu tüneli' : 'Ray', html: `${row('Aylık bakım', VL.B.upkeep.rail)}${row('İstasyona bağlı', yes(c.rnet[i]))}${row('Ana hatta bağlı', yes(c.railOut))}` };
  }
  if (G.r[i]) {
    if (G.r[i] === 3) return { title: 'Otoyol', html: `${row('Şehre bağlı', yes(c.motorOut))}<p class="note">Komşu şehirlere giden otoyol. Şehrin yollarını buraya bağla; bağlanınca bölge talebi her ay çok daha hızlı artar.</p>` };
    if (G.r[i] === 2) return { title: 'Dış yol', html: '<p class="note">Kasabaya göçmenler ve tüccarlar bu yoldan gelir. Şehrin yol ağını buraya bağla.</p>' };
    return { title: t === VL.T_WATER ? 'Köprü' : t === VL.T_ROCK ? 'Tünel' : 'Yol', html: `${row('Aylık bakım', fmt(t === VL.T_WATER ? VL.B.upkeep.bridge : VL.B.upkeep.road))}${row('Ağa bağlı', yes(c.net[i]))}${c.net[i] ? row('Trafik yoğunluğu', jamText(i)) : ''}${c.line[i] ? row('Toplu taşıma hattı', 'Var') : ''}` };
  }
  if (z) {
    const building = lv > 0 && G.pg[i] < 1, name = lv ? LV_NAME[z][lv] : ZONE_NAME[z];
    let h = building ? row('İnşaat', '%' + Math.round(G.pg[i] * 100)) : '';
    h += row('Yola bağlı', yes(c.served[i]));
    if (z === VL.Z_RES) {
      const cap = VL.B.resCap[building ? lv - 1 : lv];
      h += row('Sakin', `${G.pop[i]} / ${cap}`) + row('Su', yes(c.water[i]));
      if (!lv) h += '<p class="note">Konut talebi olduğunda ev yapılır.</p>';
      else if (lv === 1 && !c.water[i]) h += '<p class="note">Büyümesi için yakınına çeşme gerekir.</p>';
      else if (lv === 2) h += '<p class="note">Konağa dönüşmesi için su, yakında ticaret ve memnun halk gerekir.</p>';
    } else if (z === VL.Z_FARM) {
      const f = VL.B.farmJobs[building ? lv - 1 : lv] || 0;
      h += row('Geçindirdiği kişi', f) + row('Aylık ürün', '≈' + Math.round(f * VL.B.foodPerFarmer));
      if (!lv) h += '<p class="note">Gıda ya da bölge talebi olduğunda ekilir.</p>';
    } else {
      const f = VL.B.comJobs[building ? lv - 1 : lv] || 0;
      h += row('Geçindirdiği kişi', f);
      if (!lv) h += '<p class="note">Nüfus 20 kişiyi geçince dükkânlar açılır.</p>';
    }
    return { title: (building ? name + ' (yapılıyor)' : name), html: h + markNote };
  }
  const dep = G.dep && G.dep[i];
  const tn = dep ? (dep === VL.D_COAL ? 'Kömür yatağı' : 'Demir yatağı') : ['Çayır', 'Nehir', 'Orman', 'Dağ'][t];
  const note = dep ? `Yanındaki boş kareye ${dep === VL.D_COAL ? 'kömür ocağı' : 'demir madeni'} kurabilirsin (Üretim menüsü).` : t === VL.T_FOREST ? 'Ormanı açmak biraz daha pahalıdır. Yanına oduncu kurulabilir.' : t === VL.T_ROCK ? 'Dağlık arazide yapı yapılamaz; dibine taş ocağı kurulabilir.' : t === VL.T_WATER ? 'Yol aracıyla köprü kurulabilir.' : 'Boş arazi.';
  return { title: tn, html: `<p class="note">${note}</p><p class="note small">Kare ${x}, ${y}</p>` };
}

/* ---------- bildirimler ---------- */
function toast(text) {
  const el = document.createElement('div'); el.className = 'toast'; el.textContent = text;
  $('#toasts').appendChild(el);
  setTimeout(() => el.classList.add('out'), 4200); setTimeout(() => el.remove(), 4800);
  while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove();
}
function drainMessages() {
  let month = false;
  for (const m of G.msgs) { if (m.k === 'month') month = true; else toast(m.text); }
  G.msgs.length = 0;
  if (month) { save(); showHint(); }
}

/* ---------- dokunma ve fare ---------- */
const pts = new Map();
let gesture = null;   // {mode:'pan'|'paint'|'multi'|'rotate', ...}
function bindInput() {
  const cv = $('#map');
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) {
      if (e.button === 2 || e.button === 1) { gesture = { mode: 'rotate', x: e.clientX, y: e.clientY }; return; }
      const tile = view.tileAt(e.clientX, e.clientY);
      // Tek parmakla sürüklemek her zaman haritayı kaydırır. İnşa araçlarında:
      // dokun = başlangıç/bitiş noktası, basılı tut ve sürükle = alan çiz. Fareyle doğrudan çizilir.
      const build = tool !== 'pan', mouse = e.pointerType === 'mouse';
      gesture = { mode: build && mouse ? 'paint' : 'pan', build, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, moved: false, a: tile, b: tile, t0: performance.now() };
      if (gesture.mode === 'paint') showDraft(tile, tile);
      else if (build) gesture.timer = setTimeout(() => {
        if (gesture && gesture.mode === 'pan' && !gesture.moved && pts.size === 1 && tile >= 0) {
          gesture.mode = 'paint'; anchor = -1; if (navigator.vibrate) navigator.vibrate(12); showDraft(tile, tile);
        }
      }, 450);
    } else if (pts.size === 2) {
      if (gesture && gesture.timer) clearTimeout(gesture.timer);
      if (gesture && gesture.mode === 'paint') restorePlan();
      gesture = { mode: 'multi', ...pair() };
    }
  });
  cv.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId); if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    if (!gesture) return;
    if (gesture.mode === 'rotate') { view.rotate(-(e.clientX - gesture.x) * 0.008); gesture.x = e.clientX; return; }
    if (gesture.mode === 'multi' && pts.size >= 2) {
      const n = pair();
      view.zoomAt(gesture.d / Math.max(10, n.d), n.mx, n.my);
      view.rotate(n.ang - gesture.ang);
      view.pan(n.mx - gesture.mx, n.my - gesture.my);
      gesture = { mode: 'multi', ...n };
      return;
    }
    if (Math.hypot(e.clientX - gesture.x0, e.clientY - gesture.y0) > 6) gesture.moved = true;
    if (gesture.mode === 'pan' && gesture.moved) { view.pan(e.clientX - gesture.x, e.clientY - gesture.y); }
    if (gesture.mode === 'paint') { const t = view.tileAt(e.clientX, e.clientY); if (t >= 0 && t !== gesture.b) { gesture.b = t; showDraft(gesture.a, t); } }
    gesture.x = e.clientX; gesture.y = e.clientY;
  });
  const end = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    closeFlyout();
    if (gesture && gesture.timer) clearTimeout(gesture.timer);
    const up = e.type === 'pointerup' && pts.size === 0 && gesture;
    if (up && gesture.mode === 'paint') setPlan(gesture.a, gesture.b);
    else if (up && gesture.mode === 'pan' && !gesture.moved) {
      const t = view.tileAt(e.clientX, e.clientY);
      if (gesture.build) tapBuild(t); else inspect(t);
    }
    if (pts.size === 0) gesture = null;
    else if (gesture && gesture.mode === 'multi' && pts.size === 1) gesture = null;
  };
  cv.addEventListener('pointerup', end);
  cv.addEventListener('pointercancel', end);
  cv.addEventListener('wheel', e => { e.preventDefault(); view.zoomAt(Math.exp(e.deltaY * 0.0012), e.clientX, e.clientY); }, { passive: false });
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    if (e.code === 'Space') { setSpeed(speed ? 0 : lastSpeed); e.preventDefault(); }
    else if (e.key === '1' || e.key === '2' || e.key === '3') setSpeed(+e.key);
    else if (e.key === 'q' || e.key === 'Q') view.rotate(0.25);
    else if (e.key === 'e' || e.key === 'E') view.rotate(-0.25);
    else if (e.key === 'Enter' && plan) confirmPlan();
    else if (e.key === 'Escape') { if (plan || anchor >= 0) clearPlan(); else { setTool('pan'); closePanel(); } }
  });
}
function pair() {
  const [a, b] = [...pts.values()];
  return { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
}

/* Plan: çizilen ama henüz yapılmamış iş. Ancak ✓ ile inşa edilir. */
let plan = null, anchor = -1;
const single = () => tool === 'gov' || tool === 'buy' || (!!VL.SVD[tool] && !LINE[tool]);
function tapBuild(t) {
  if (t < 0) return;
  if (single()) { setPlan(t, t); return; }
  if (plan && anchor < 0) { anchor = t; plan = null; showDraft(t, t, 'Bitiş noktasına dokun · aynı kareye dokunursan tek kare'); return; }
  if (anchor < 0) { anchor = t; showDraft(t, t, 'Bitiş noktasına dokun · aynı kareye dokunursan tek kare'); return; }
  const a = anchor; anchor = -1; setPlan(a, t);
}
/* Bölge çizimi: büyük alanda araya kendiliğinden sokak (Menü'den kapatılabilir) */
const ZONES = { res: 1, farm: 1, com: 1 };
const autoOn = () => !(G.opt && G.opt.autoRoads === false);
function planQuote(a, b) {
  const cells = paintCells(a, b);
  if (!ZONES[tool] || !autoOn() || cells.length < 6) { const q = VL.quote(G, tool, cells); q.roads = []; return q; }
  const N = G.N, ax = a % N, ay = (a / N) | 0, bx = b % N, by = (b / N) | 0;
  const cand = VL.autoRoads(G, Math.min(ax, bx), Math.min(ay, by), Math.max(ax, bx), Math.max(ay, by));
  const rq = VL.quote(G, 'road', cand), skip = new Set(cand);
  const q = VL.quote(G, tool, cells.filter(i => !skip.has(i)));
  q.roads = rq.ok; q.cost += rq.cost; q.roadCost = rq.cost;
  if (!q.ok.length && rq.ok.length) q.err = null;
  return q;
}
function showDraft(a, b, msg) {
  const cells = paintCells(a, b); if (!cells.length) return;
  const q = planQuote(a, b);
  view.setPreview(q.ok, q.bad, q.roads);
  hintOverride = msg || quoteText(q); showHint();
  $('#plan').hidden = true;
}
function quoteText(q) {
  const cant = q.cost > G.money;
  return q.ok.length && !(tool === 'gov' && q.bad.length)
    ? `${TOOL_INFO[tool].name} · ${q.ok.length} kare${q.roads && q.roads.length ? ' + ' + q.roads.length + ' yol' : ''} · <b class="${cant ? 'neg' : ''}">${fmt(q.cost)}</b>${cant ? ' · para yetmiyor' : ''}`
    : `<span class="neg">${q.err || 'Buraya yapılamaz'}</span>`;
}
function setPlan(a, b) {
  if (a < 0 || b < 0) { clearPlan(); return; }
  plan = { a, b, tool };
  const q = planQuote(a, b);
  view.setPreview(q.ok, q.bad, q.roads);
  const ok = q.ok.length && !(tool === 'gov' && q.bad.length) && q.cost <= G.money;
  $('#plan .cost').innerHTML = quoteText(q);
  $('#plan .yes').disabled = !ok;
  const d = VL.SVD[tool]; $('#plan .rot').hidden = !(d && (d.w || 1) !== (d.h || 1));
  $('#plan').hidden = false;
  hintOverride = null; showHint();
  placePlanBar();
}
function restorePlan() { if (plan) setPlan(plan.a, plan.b); else { view.setPreview([], []); hintOverride = null; showHint(); } }
function clearPlan() { plan = null; anchor = -1; view.setPreview([], []); $('#plan').hidden = true; hintOverride = null; showHint(); }
function placePlanBar() {
  if (!plan) return;
  const el = $('#plan'), p = view.screenOf(plan.b), w = el.offsetWidth, h = el.offsetHeight;
  const x = Math.max(76, Math.min(innerWidth - w - 8, p.x - w / 2)), y = Math.max(52, Math.min(innerHeight - h - 8, p.y - h - 22));
  el.style.transform = `translate(${x}px,${y}px)`;
}
function confirmPlan() {
  if (!plan) return;
  const { a, b } = plan, t = tool, q = planQuote(a, b);
  if (q.cost > G.money) { clearPlan(); toast('Hazinede yeterli para yok'); return; }
  if (q.roads.length) VL.apply(G, 'road', q.roads);
  const skip = new Set(q.roads), r = VL.apply(G, t, q.roads.length ? paintCells(a, b).filter(i => !skip.has(i)) : paintCells(a, b));
  clearPlan();
  if (!r.done) { toast(r.err); return; }
  view.syncBuild(); drainMessages();
  if (t === 'gov') { setTool('road'); setSpeed(1); }
  updateHud(true); showHint();
}

/* Plan alanını karelere çevirir: yol L biçimli, bölgeler dikdörtgen, tekil yapılar tek kare */
function paintCells(a, b) {
  const N = G.N;
  if (a < 0 || b < 0) return [];
  if (single()) return [b];
  const ax = a % N, ay = (a / N) | 0, bx = b % N, by = (b / N) | 0, out = [];
  if (LINE[tool]) {
    const dx = bx - ax, dy = by - ay, r = Math.abs(dy) / Math.max(1, Math.abs(dx));
    if (dx && dy && r > 0.4 && r < 2.5) {        // çapraz: merdiven biçiminde kare kare (köşeler yuvarlak çizilir)
      const sx = Math.sign(dx), sy = Math.sign(dy); let x = ax, y = ay;
      out.push(y * N + x);
      while (x !== bx || y !== by) {
        const ex = Math.abs((x + sx - ax) * dy - (y - ay) * dx), ey = Math.abs((x - ax) * dy - (y + sy - ay) * dx);
        if (x !== bx && (y === by || ex <= ey)) x += sx; else y += sy;
        out.push(y * N + x);
      }
      return out;
    }
    const hFirst = Math.abs(bx - ax) >= Math.abs(by - ay);
    const cx = hFirst ? bx : ax, cy = hFirst ? ay : by;
    const line = (x0, y0, x1, y1) => { const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0); let x = x0, y = y0; for (;;) { const i = y * N + x; if (!out.includes(i)) out.push(i); if (x === x1 && y === y1) break; x += dx; y += dy; } };
    line(ax, ay, cx, cy); line(cx, cy, bx, by);
    return out;
  }
  const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), y0 = Math.min(ay, by), y1 = Math.max(ay, by);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push(y * N + x);
  return out;
}
function inspect(i) {
  if (i < 0) { closePanel(); return; }
  selected = i; view.select(i); panelKind = 'tile'; renderPanel(); $('#panel').hidden = false; $('#app').classList.add('with-panel');
}

/* ---------- ana menü ve yeni şehir ---------- */
function showMenu(hasSave) {
  const m = $('#menu'); m.hidden = false;
  const maps = [['river', 'Nehir kenarı', 'Dengeli başlangıç: su, orman ve maden bir arada.'], ['flat', 'Geniş ova', 'Verimli toprak (+%20 tarla verimi), bol yer. Taş ve maden yalnızca kuzeydoğudaki tepede.'], ['mount', 'Dağlık', 'Maden ve taş bol, düz arazi dar bir vadi. Toprak zayıf (−%10).'], ['lake', 'Büyük göl', 'Şehir gölün çevresine yayılır. Liman ve iskeleler için uzun kıyı.'], ['sea', 'Deniz kıyısı', 'Liman ticareti %20 daha kârlı. Sonbaharda fırtına kıyıyı vurur.']];
  let mapSel = 'river';
  const years = [[1850, 1, 'Kasaba kuruluyor: at arabaları, tarlalar, ilk görev su kemeri.'], [1900, 1, 'Elektrik çağı: demiryolu ve su kemeri hazır, 12.000 hazine. Sıradaki görev kanalizasyon.'], [1950, 1, 'Motor çağı: otoyol bağlantısı dahil önceki görevler hazır, 30.000 hazine. Sıradaki görev havalimanı.'], [2000, 1, 'Bilgi çağı: metro hattı dahil önceki görevler hazır, 80.000 hazine. Sıradaki görev fuar merkezi.'], [2026, 1, 'Bugün: hızlı tren dahil önceki görevler hazır, 150.000 hazine. İklim ve yenilenebilir enerji görevleri seni bekliyor.']];
  let yearSel = 1850;
  m.innerHTML = `<div class="menu-card">
    <h1>Vali</h1><p class="sub">Şehrini kur, büyüt, yönet.</p>
    <div class="menu-actions">
      ${hasSave ? '<button class="primary" id="mCont">Devam et</button>' : ''}
      <button class="${hasSave ? '' : 'primary'}" id="mNew">Yeni şehir</button>
      ${hasSave ? '<button id="mLoad">Kayıtlar</button>' : ''}
    </div>
    <div class="saves" hidden></div>
    <div class="setup" hidden>
      <h3>Harita</h3><div class="cards">${maps.map(([k, n]) => `<button class="card ${k === mapSel ? 'on' : ''}" data-map="${k}"><i class="map-${k}"></i><span>${n}</span></button>`).join('')}</div><p class="note" id="mapNote">${maps[0][2]}</p>
      <h3>Başlangıç yılı</h3><div class="chips years">${years.map(([y, ok]) => `<button class="chip ${y === yearSel ? 'on' : ''}" data-year="${y}" ${ok ? '' : 'disabled'}>${y}${ok ? '' : ' · yakında'}</button>`).join('')}</div><p class="note" id="yearNote">${years[0][2]}</p>
      <button class="primary" id="mGo">Şehri kur</button>
    </div></div>`;
  if (hasSave) $('#mCont').onclick = () => { fullscreen(true); startGame(loadSave() || G); };
  const list = () => {
    migrateLegacy();
    const box = m.querySelector('.saves'), l = readIdx().sort((a, b) => b.t - a.t);
    box.innerHTML = `<h3>Kayıtlı şehirler <span>${l.length} / ${MAX_SLOTS}</span></h3>` + (l.length ? l.map(x => `<div class="slot" data-id="${x.id}">
      <i class="map-${x.map || 'river'}"></i><span><b>${(x.name || 'Şehir').replace(/</g, '&lt;')}</b><small>${MAP_NAME[x.map] || ''} · ${x.date} · ${fmt(x.pop || 0)} kişi</small></span>
      <button class="go" data-act="open">Aç</button><button class="del" data-act="del" aria-label="Sil">${ico('close')}</button></div>`).join('') : '<p class="note">Kayıtlı şehir yok.</p>') +
      '<button class="wide" data-act="back">Geri</button>';
  };
  if (hasSave) $('#mLoad').onclick = () => { list(); m.querySelector('.saves').hidden = false; m.querySelector('.menu-actions').hidden = true; };
  m.querySelector('.saves').onclick = (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const row = b.closest('.slot'), id = row && row.dataset.id;
    if (b.dataset.act === 'back') { m.querySelector('.saves').hidden = true; m.querySelector('.menu-actions').hidden = false; return; }
    if (b.dataset.act === 'open') { const g = loadSlot(id); if (g) { fullscreen(true); startGame(g); } else toast('Bu kayıt açılamadı.'); return; }
    if (b.dataset.act === 'del') {
      if (b.dataset.sure) { deleteSlot(id); if (G && G.slot === id) G.slot = null; list(); if (!readIdx().length) showMenu(false); }
      else { b.dataset.sure = 1; b.classList.add('sure'); b.innerHTML = 'Emin misin?'; }
    }
  };
  $('#mNew').onclick = () => { m.querySelector('.setup').hidden = false; m.querySelector('.menu-actions').hidden = true; };
  $('#mGo').onclick = () => {
    if (readIdx().length >= MAX_SLOTS) { toast(`En çok ${MAX_SLOTS} şehir kaydedilebilir. Kayıtlar'dan birini sil.`); return; }
    save();      // açık şehri kaybetme
    const g = VL.newGame({ seed: (Date.now() % 9973) + 1, map: mapSel, year: yearSel }); g.slot = newSlotId();
    fullscreen(true); startGame(g);
  };
  m.querySelector('.years').onclick = (e) => { const b = e.target.closest('[data-year]'); if (!b || b.disabled) return; yearSel = +b.dataset.year; m.querySelectorAll('.years .chip').forEach(c => c.classList.toggle('on', c === b)); $('#yearNote').textContent = years.find(x => x[0] === yearSel)[2]; };
  m.querySelector('.cards').onclick = (e) => { const b = e.target.closest('[data-map]'); if (!b) return; mapSel = b.dataset.map; m.querySelectorAll('.card').forEach(c => c.classList.toggle('on', c === b)); $('#mapNote').textContent = maps.find(x => x[0] === mapSel)[2]; };
}

/* Tam ekran: tarayıcı sadece bir dokunuşla izin verir. Ana ekrana eklenmiş uygulama zaten tam ekran açılır. */
const canFull = () => !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
const installed = () => matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches;
const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
function fullscreen(on) {
  try {
    const el = document.documentElement;
    if (on && !isFull() && !installed() && canFull()) {
      const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen();
      if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
    } else if (!on && isFull()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  } catch (e) { /* izin verilmezse sorun değil */ }
}

/* ---------- oyun döngüsü ---------- */
let lastT = 0;
function loop(t) {
  const dt = Math.min(0.1, (t - (lastT || t)) / 1000); lastT = t;
  const mul = SPEEDS[speed];
  if (mul && $('#menu').hidden && G.gov) {
    acc += dt * 1000 * mul;
    const dayMs = DAY_MS;
    let n = 0;
    while (acc >= dayMs && n < 8) { VL.step(G); acc -= dayMs; n++; }
    if (n) { view.syncDay(); drainMessages(); updateHud(); }
  }
  if (!$('#menu').hidden) view.rotate(dt * 0.04);   // menü arkasında harita yavaşça döner
  if (plan) placePlanBar();
  view.frame(dt, $('#menu').hidden ? mul : 0.6);
  requestAnimationFrame(loop);
}

/* Testler ve hata ayıklama için */
self.__vali = {
  G: () => G, view: () => view, setTool, setSpeed, startGame, inspect, save, togglePanel,
  step(n) { for (let k = 0; k < n; k++) VL.step(G); view.syncDay(); view.syncBuild(); drainMessages(); updateHud(true); },
  plan: () => plan, confirmPlan, tapBuild,
  paint(t, cells) { const r = VL.apply(G, t, cells); view.syncBuild(); drainMessages(); updateHud(true); showHint(); return r; },
};

boot();
