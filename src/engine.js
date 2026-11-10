/* Vali — simülasyon motoru. DOM yok; tarayıcıda global, Node'da module.exports.
   Durum G düz JSON'dur (localStorage'a olduğu gibi yazılır): fonksiyon ve döngü yok.
   Önbellek (bağlantı, kapsama, toplamlar) G'nin dışında, WeakMap'te tutulur. */
'use strict';

const VERSION = 3;
const DAYS_PER_MONTH = 30;
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

// Arazi
const T_GRASS = 0, T_WATER = 1, T_FOREST = 2, T_ROCK = 3;
// Bölgeler
const Z_NONE = 0, Z_RES = 1, Z_FARM = 2, Z_COM = 3;
// Tekil binalar (G.sv). 9 = Valilik (eski kayıtlarla uyum için değişmez)
const S_NONE = 0, S_FOUNTAIN = 1, S_POLICE = 2, S_SCHOOL = 3, S_CLINIC = 4, S_LUMBER = 5, S_QUARRY = 6, S_COAL = 7, S_IRON = 8,
  S_GOV = 9, S_SQUARE = 10, S_SITE = 11, S_LANDMARK = 12, S_SMALLSQ = 13, S_BIGSQ = 14, S_HIPPO = 15, S_FIRE = 16, S_LEVEE = 17,
  S_MILL = 18, S_BARRACKS = 19, S_PSTATION = 20, S_FSTATION = 21, S_PORT = 22, S_PIER = 23, S_POWER = 24, S_HYDRO = 25, S_FACTORY = 26, S_TRAM = 27, S_DUMP = 28, S_RANCH = 29;
// Maden yatakları (G.dep)
const D_COAL = 1, D_IRON = 2;
const RES = ['kereste', 'tas', 'komur', 'demir'];
const RES_NAME = { kereste: 'Kereste', tas: 'Taş', komur: 'Kömür', demir: 'Demir', para: 'Hazine payı' };

/* Denge tablosu: bütün sayılar burada, tek yerden ayarlanır.
   1850 dönemi için gerçeğe yakın oranlar: nüfusun ~%60'ı tarımla geçinir, kişi başı ayda 1 birim gıda. */
const B = {
  startMoney: 4000,
  cost: { road: 12, roadForest: 20, bridge: 140, zone: 3, zoneForest: 10, bulldoze: 3, rail: 30, railBridge: 220, levee: 25, overpass: 90 },
  upkeep: { road: 0.6, bridge: 3, gov: 12, rail: 0.8, levee: 0.2 },   // aylık
  ranchFood: 480,                    // hayvan çiftliği: yaklaşık 50 tarla karesinin gıdası
  millBoost: 3,                   // değirmenin çevresindeki tarlalarda verim artışı
  pierFood: 20,                      // iskele başına aylık balık (gıda)
  port: { food: 1.4, res: 1.25, reg: 1 },   // nehir limanı: gıda ve kaynak satışında çarpan, bölge talebine aylık ek
  barracks: { food: 40, coal: 8 },   // kışlanın aylık tüketimi
  hippo: { base: 25, perRoot: 1.6, perReg: 0.1, raceMonth: 5, raceMul: 3, raceHap: 4 },   // bilet geliri; mayıs sonunda büyük yarış (ay sonu hesabında tarih hazirana geçmiş olur)
  railPrice: 0.5,                    // demiryoluna bağlı üretimin satış fiyatına ek
  regrow: 0.02,                      // ormanın yanındaki boş çayırın aylık ağaçlanma olasılığı (başlangıçtaki orman miktarına kadar)
  // İş sayıları "geçindirdiği kişi" cinsindendir (çalışan + ailesi): 1850'de hane başına yaklaşık iki kişi
  power: { plant: 900, hydro: 450, landmark: 1500, coal: 20, factoryUse: 150, tramUse: 30 },   // elektrik birimi yaklaşık bir kişinin tüketimi
  factory: { income: 220, coal: 8, iron: 8 },
  dumpCap: 2500,                      // bir çöp alanının hizmet ettiği kişi
  resCap: [0, 6, 14, 28, 56],            // konut seviyesine göre kişi
  farmJobs: [0, 6, 11],              // tarla seviyesine göre çiftçi aile
  comJobs: [0, 7, 16, 30],           // ticaret seviyesine göre işçi aile
  govJobs: 12,
  buildDays: { 1: 5, 2: 4, 3: 8 },   // bölge türüne göre inşaat süresi (gün)
  wage: { c: 2, i: 2.6, e: 3.2, o: 4, v: 9 },            // kişi başı aylık kazanç, vergi bunun üzerinden
  comProfit: 1.0,                    // ticaretle geçinen kişi başına aylık kâr (müşteri doluluğuyla)
  foodPerFarmer: 1.6, foodPerPerson: 1.0,
  regStart: 12, regGrowth: 3.5,      // bölgenin şehrin ürünlerine talebi (dış yol bağlanınca başlar)
  exportPrice: 0.4,                  // fazla gıdanın birimi başına hazineye pazar resmi
  comShare: 0.17,                    // nüfusun ne kadarı ticaret ve zanaatta çalışır
  stockCap: 600,                     // ambarda tutulan en çok kaynak; fazlası kendiliğinden satılır
  price: { kereste: 0.9, tas: 0.6, komur: 1.3, demir: 2.2 },   // birim satış fiyatı (hazineye giren pay)
  deliverPerMonth: 45,               // şantiyeye ayda taşınan en çok kaynak (her tür için; demiryoluyla iki katı)
  deliverMoney: 500,                 // görevin hazine payından ayda aktarılan en çok para
  taxNeutral: 10,
  maxTax: 25,
};

/* Tekil binalar: maliyet, bakım, kapsama yarıçapı, iş, üretim */
const SVD = {
  fountain: { code: S_FOUNTAIN, name: 'Çeşme', cost: 80, upkeep: 3, radius: 5, cover: 'water' },
  smallsq: { code: S_SMALLSQ, name: 'Köşe meydanı', cost: 90, upkeep: 1.5, radius: 3, cover: 'square' },
  square: { code: S_SQUARE, name: 'Meydan', cost: 260, upkeep: 4, radius: 6, cover: 'square', w: 2, h: 2 },
  bigsq: { code: S_BIGSQ, name: 'Yuvarlak meydan', cost: 650, upkeep: 8, radius: 9, cover: 'square', w: 3, h: 3, minP: 300 },
  fire: { code: S_FIRE, name: 'İtfaiye', cost: 300, upkeep: 9, radius: 8, cover: 'fire', jobs: 8 },
  hippo: { code: S_HIPPO, name: 'Hipodrom', cost: 1800, upkeep: 26, radius: 16, cover: 'fun', jobs: 12, w: 4, h: 3, minP: 600 },
  barracks: { code: S_BARRACKS, name: 'Kışla', cost: 2500, upkeep: 55, w: 3, h: 2, minP: 500 },
  levee: { code: S_LEVEE, name: 'Set', cost: 25, radius: 2, cover: 'flood', line: true },
  mill: { code: S_MILL, name: 'Değirmen', cost: 240, upkeep: 2, radius: 5, cover: 'mill', jobs: 4 },
  pstation: { code: S_PSTATION, name: 'Yolcu istasyonu', edu: true, cost: 400, upkeep: 6, radius: 8, cover: 'transit', jobs: 6, w: 2, h: 1, needRail: true },
  fstation: { code: S_FSTATION, name: 'Yük istasyonu', cost: 450, upkeep: 6, radius: 7, cover: 'freight', jobs: 10, w: 2, h: 1, needRail: true },
  port: { code: S_PORT, name: 'Liman', cost: 900, upkeep: 10, jobs: 14, w: 2, h: 2, minP: 250, needWater: true },
  pier: { code: S_PIER, name: 'İskele', cost: 120, upkeep: 1, jobs: 4, onWater: true },
  ranch: { code: S_RANCH, name: 'Hayvan çiftliği', cost: 2500, upkeep: 15, jobs: 30, w: 3, h: 2, minP: 300, needFarm: true },
  // 1890 sonrası
  power: { code: S_POWER, name: 'Kömür santrali', cost: 1500, upkeep: 20, jobs: 14, w: 2, h: 2, year: 1890, dirty: 3 },
  hydro: { code: S_HYDRO, name: 'Su santrali', cost: 2200, upkeep: 10, jobs: 6, onWater: true, year: 1890 },
  factory: { code: S_FACTORY, name: 'Fabrika', cost: 1200, upkeep: 10, jobs: 40, w: 2, h: 2, year: 1890, dirty: 4 },
  tram: { code: S_TRAM, name: 'Tramvay durağı', cost: 350, upkeep: 5, radius: 6, cover: 'transit', jobs: 4, year: 1895 },
  dump: { code: S_DUMP, name: 'Çöp alanı', cost: 400, upkeep: 8, jobs: 6, w: 2, h: 2, year: 1890, dirty: 3 },
  police: { code: S_POLICE, name: 'Karakol', cost: 320, upkeep: 10, radius: 8, cover: 'police', jobs: 8 },
  school: { code: S_SCHOOL, name: 'Mektep', edu: true, cost: 380, upkeep: 12, radius: 7, cover: 'school', jobs: 8 },
  clinic: { code: S_CLINIC, name: 'Hekimhane', edu: true, cost: 420, upkeep: 14, radius: 7, cover: 'clinic', jobs: 10 },
  lumber: { code: S_LUMBER, name: 'Oduncu', cost: 150, jobs: 10, out: 'kereste', rate: 30, need: 'forest' },
  quarry: { code: S_QUARRY, name: 'Taş ocağı', cost: 220, jobs: 12, out: 'tas', rate: 32, need: 'rock' },
  coal: { code: S_COAL, name: 'Kömür ocağı', cost: 360, jobs: 14, out: 'komur', rate: 32, need: 'coal' },
  iron: { code: S_IRON, name: 'Demir madeni', cost: 420, jobs: 14, out: 'demir', rate: 28, need: 'iron' },
  site: { code: S_SITE, name: 'Şantiye', cost: 0, w: 2, h: 2 },
};
const dims = (d) => [d.w || 1, d.h || 1];
/* Üretim tesislerinin seviyeleri: çıktı, iş ve yükseltme maliyeti (ilk kurulum maliyetinin katı) */
const UP = { out: [0, 1, 1.75, 2.5], jobs: [0, 1, 1.4, 1.8], cost: [0, 0, 1.5, 2.5], max: 3 };
/* Nüfus grupları ve duyarlılıkları (1 = ortalama) */
const GRP = ['c', 'i', 'e', 'o', 'v'];
const GRP_NAME = { c: 'Çiftçiler', i: 'İşçiler', e: 'Esnaf ve tüccarlar', o: 'Eğitimliler', v: 'Varlıklılar' };
const GW = {
  c: { edu: 0.6 },
  i: { fun: 1.2 },
  e: { safety: 1.5, power: 1.3, transit: 1.3 },
  o: { edu: 1.6, tax: 1.2, square: 1.2, power: 1.3 },
  v: { tax: 1.6, safety: 1.5, square: 1.6, fun: 1.5, dirt: 2.5, edu: 1.2, power: 1.3 },
};
const UPGRADABLE = ['lumber', 'quarry', 'coal', 'iron', 'ranch', 'power', 'hydro', 'factory', 'dump'];
/* Biten görevlerin anıtları: iş ve işlev */
const LANDMARK = {
  aqueduct: { name: 'Su idaresi', jobs: 10, text: 'Geniş bir alana su verir; 9 kare çevresinde sağlık hizmeti gibi çalışır, salgın riskini yarıya indirir.' },
  rail: { name: 'Gar', jobs: 16, text: 'Yolcu ve yük istasyonu gibi çalışır: çevresinde ulaşım kolaylaşır, yakındaki ocak ve madenler demiryoluyla satar.' },
  quay: { name: 'Rıhtım', jobs: 14, text: 'Hazır bir nehir limanıdır: gıda ve kaynaklar daha kârlı satılır, iskele kurulabilir.' },
  power: { name: 'Belediye santrali', jobs: 20, text: 'Kömür istemeden 1500 birim elektrik üretir.' },
  sewer: { name: 'Pompa istasyonu', jobs: 12, text: 'Kanalizasyon şebekesi: salgın riski büyük ölçüde düşer, sağlık artar.' },
  univ: { name: 'Darülfünun', jobs: 30, text: 'Bütün şehir eğitim kapsamına girer.' },
  victory: { name: 'Zafer anıtı', jobs: 4, text: 'Şehir genelinde kalıcı memnuniyet; geniş meydan etkisi ve ziyaretçi geliri.' },
  tower: { name: 'Saat kulesi', jobs: 6, text: 'Geniş bir alanda meydan etkisi verir; ziyaretçiler her ay hazineye gelir bırakır.' },
};
const isMultiCode = (code) => code === S_SQUARE || code === S_BIGSQ || code === S_HIPPO || code === S_BARRACKS || code === S_SITE || code === S_LANDMARK ||
  code === S_PSTATION || code === S_FSTATION || code === S_PORT || code === S_POWER || code === S_FACTORY || code === S_DUMP || code === S_RANCH;
const CODE2KEY = {}; for (const k in SVD) CODE2KEY[SVD[k].code] = k;

/* On yıllık görevler: merkezden gelir, şehirden kaynak toplanıp şantiyeye taşınır */
const PROJECTS = [
  { id: 'aqueduct', year: 1851, name: 'Su kemeri', desc: 'Dağlardaki kaynaktan şehre temiz su getir.', needs: { tas: 600, kereste: 250, para: 2000 }, years: 5,
    reward: 'Kemerin çevresindeki geniş bir alan suya kavuşur, salgın riski azalır.' },
  { id: 'rail', year: 1861, name: 'Demiryolu bağlantısı', desc: 'Şehri ana demiryolu hattına bağla.', needs: { demir: 500, kereste: 400, komur: 300, para: 5000 }, years: 6,
    reward: 'Bölgenin talebi büyük ölçüde artar, kaynaklar daha pahalıya satılır.' },
  { id: 'quay', year: 1871, name: 'Taş köprü ve rıhtım', desc: 'Nehir ticareti için sağlam bir köprü ve rıhtım yap.', needs: { tas: 900, demir: 260, para: 4000 }, years: 5,
    reward: 'Bölge talebi artar, halk memnun olur.' },
  { id: 'tower', year: 1881, name: 'Saat kulesi ve meydan', desc: 'Şehrin simgesi olacak bir saat kulesi dik.', needs: { tas: 700, demir: 180, kereste: 140, para: 4500 }, years: 4,
    reward: 'Şehir genelinde kalıcı memnuniyet artışı.' },
  // Elektrik çağı (1890–1930)
  { id: 'power', year: 1891, name: 'Belediye elektrik santrali', desc: 'Şehri elektrikle aydınlatacak büyük santrali kur.', needs: { tas: 700, demir: 400, komur: 400, para: 8000 }, years: 5,
    reward: 'Kömür istemeyen büyük bir santral: 1500 birim elektrik.' },
  { id: 'sewer', year: 1901, name: 'Kanalizasyon şebekesi', desc: 'Büyüyen şehrin atık suyunu yer altına al.', needs: { tas: 900, demir: 500, para: 10000 }, years: 6,
    reward: 'Salgın riski büyük ölçüde düşer, sağlık artar.' },
  { id: 'univ', year: 1911, name: 'Darülfünun', desc: 'Şehre bir üniversite kazandır.', needs: { tas: 1000, kereste: 400, demir: 300, para: 12000 }, years: 6,
    reward: 'Bütün şehir eğitim kapsamına girer.' },
  { id: 'victory', year: 1921, name: 'Zafer anıtı ve meydanı', desc: 'Şehrin kalbine büyük bir anıt ve tören meydanı yap.', needs: { tas: 1200, demir: 300, para: 10000 }, years: 5,
    reward: 'Şehir genelinde kalıcı memnuniyet ve ziyaretçi geliri.' },
];

/* ---------- yardımcılar ---------- */
function rng(G) { // mulberry32, durum G.rs içinde: kayıt yeniden yüklenince aynı sonuçlar
  let t = (G.rs = (G.rs + 0x6D2B79F5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function hash2(x, y, s) { let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function vnoise(x, y, s) { // değer gürültüsü 0..1
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, s), b = hash2(xi + 1, yi, s), c = hash2(xi, yi + 1, s), d = hash2(xi + 1, yi + 1, s);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, s) { return vnoise(x, y, s) * 0.55 + vnoise(x * 2.1, y * 2.1, s + 7) * 0.3 + vnoise(x * 4.3, y * 4.3, s + 13) * 0.15; }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const ramp = (P, a, b) => clamp((P - a) / (b - a), 0, 1);     // ihtiyaç şehir büyüdükçe belirir
const idx = (G, x, y) => y * G.N + x;
const inMap = (G, x, y) => x >= 0 && y >= 0 && x < G.N && y < G.N;
function neigh4(G, i) {
  const N = G.N, x = i % N, y = (i / N) | 0, r = [];
  if (x > 0) r.push(i - 1); if (x < N - 1) r.push(i + 1); if (y > 0) r.push(i - N); if (y < N - 1) r.push(i + N);
  return r;
}
function around(G, i, R, fn) {   // yarıçap içindeki kareler (daire)
  const N = G.N, x0 = i % N, y0 = (i / N) | 0;
  for (let y = y0 - R; y <= y0 + R; y++) for (let x = x0 - R; x <= x0 + R; x++)
    if (inMap(G, x, y) && (x - x0) ** 2 + (y - y0) ** 2 <= R * R + 1) fn(y * N + x);
}
const yearOf = (G) => G.startYear + Math.floor(G.day / DAYS_PER_MONTH / 12);

/* ---------- yeni oyun ---------- */
function newGame(opts) {
  opts = opts || {};
  const N = opts.N || 64, seed = opts.seed != null ? opts.seed : (Date.now() % 100000);
  const n = N * N, z = () => new Array(n).fill(0);
  const G = {
    v: VERSION, seed, rs: seed * 7919 + 1, N, map: opts.map || 'river', startYear: opts.year || 1850,
    day: 0, money: B.startMoney, taxRate: B.taxNeutral,
    t: z(), h: z(), r: z(), z: z(), lv: z(), pg: z(), pop: z(), sv: z(), dep: z(),
    gov: null, multi: [], grp: { c: 0, i: 0, e: 0, o: 0, v: 0 }, hap: { c: 60, i: 60, e: 60, o: 60, v: 60 }, hf: { c: {}, i: {}, e: {}, o: {}, v: {} },
    imm: 0, out: 0, born: 0, reg: B.regStart, food: { prod: 0, cons: 0, net: 0 },
    res: { kereste: 0, tas: 0, komur: 0, demir: 0 }, made: {}, sold: {},
    proj: null, projNext: 0, done: [], itibar: 50, fx: {}, rl: z(), mark: {}, opt: { disasters: true }, tv: 0, ev: null, risk: {},
    last: { inc: {}, exp: {}, net: 0 }, hist: [], flags: {}, msgs: [],
  };
  genMap(G);
  genDeposits(G);
  G.forest0 = G.t.filter(t => t === T_FOREST).length;
  return G;
}

function genRiverMap(G) {
  const N = G.N, s = G.seed;
  // Nehir: kuzeyden güneye kıvrılarak akar, iki kare genişliğinde
  let x = Math.round(N * 0.58 + (hash2(1, 2, s) - 0.5) * 6);
  let prev = x;
  for (let y = 0; y < N; y++) {
    const drift = Math.sin(y / 9 + s) * 0.9 + (fbm(y / 7, 3, s) - 0.5) * 2.2;
    x = Math.round(clamp(x + drift * 0.55, N * 0.42, N * 0.74));
    const a = Math.min(prev, x), b = Math.max(prev, x) + 1;   // dönüşlerde kesintisiz
    for (let k = a; k <= b; k++) G.t[idx(G, k, y)] = T_WATER;
    prev = x;
  }
  for (let y = 0; y < N; y++) for (let x2 = 0; x2 < N; x2++) {
    const i = idx(G, x2, y);
    if (G.t[i] === T_WATER) continue;
    // Doğuda dağlar, kuzeybatıda tepeler
    const e = (x2 - (N - 9)) / 6 + (fbm(x2 / 6, y / 6, s + 3) - 0.5) * 1.6;
    const nw = (fbm(x2 / 8, y / 8, s + 11) - 0.68) * 4 - (x2 + y) / N * 0.6;
    if (e > 0.15 || nw > 0.3) { G.t[i] = T_ROCK; G.h[i] = Math.round(clamp(Math.max(e, nw) * 3 + fbm(x2 / 3, y / 3, s) * 2, 1, 6)); continue; }
    // Ormanlar
    if (fbm(x2 / 7, y / 7, s + 5) > 0.6) G.t[i] = T_FOREST;
  }
  entryRoad(G);
}

function entryRoad(G) {
  const N = G.N, s = G.seed;
  // Batıdan gelen dış yol (ticaret ve göç bunun üzerinden)
  const ry = Math.round(N / 2 + (hash2(4, 5, s) - 0.5) * 8);
  for (let k = 0; k <= 4; k++) { const i = idx(G, k, ry); G.t[i] = T_GRASS; G.h[i] = 0; G.r[i] = 2; }
  // Dış yolun çevresi açık olsun
  for (let y = ry - 3; y <= ry + 3; y++) for (let k = 0; k < 10; k++) if (inMap(G, k, y)) { const i = idx(G, k, y); if (G.t[i] !== T_WATER) { G.t[i] = G.r[i] ? T_GRASS : (G.t[i] === T_ROCK ? T_GRASS : G.t[i]); G.h[i] = 0; } }
  G.entry = { x: 0, y: ry };
}

/* Diğer haritalar: ova, dağlık, büyük göl, deniz kıyısı. Hepsinde dış yol batıdan gelir. */
function genMap(G) {
  const kind = G.map;
  if (!kind || kind === 'river') return genRiverMap(G);
  const N = G.N, s = G.seed, ry = Math.round(N / 2 + (hash2(4, 5, s) - 0.5) * 8);
  const W = (x, y) => { if (inMap(G, x, y)) G.t[idx(G, x, y)] = T_WATER; };
  // Su
  if (kind === 'lake') {
    const cx = N * 0.6, cy = N * 0.5;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const d = Math.hypot((x - cx) / (N * 0.2), (y - cy) / (N * 0.25)) + (fbm(x / 6, y / 6, s + 21) - 0.5) * 0.5;
      if (d < 1) W(x, y);
    }
  } else if (kind === 'sea') {
    for (let y = 0; y < N; y++) { const sh = N * 0.72 + (fbm(y / 8, 1, s + 21) - 0.5) * 10; for (let x = Math.round(sh); x < N; x++) W(x, y); }
  } else {      // ova ve dağlık: tek kare genişliğinde dere
    let x = Math.round(N * (kind === 'flat' ? 0.78 : 0.55)), prev = x;
    for (let y = 0; y < N; y++) {
      x = Math.round(clamp(x + Math.sin(y / 7 + s) * 0.8 + (fbm(y / 6, 2, s) - 0.5) * 1.6, N * 0.4, N - 4));
      for (let k = Math.min(prev, x); k <= Math.max(prev, x); k++) W(k, y);
      prev = x;
    }
  }
  // Dağ ve orman
  const forestAt = { flat: 0.67, mount: 0.55, lake: 0.6, sea: 0.6 }[kind];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = idx(G, x, y); if (G.t[i] === T_WATER) continue;
    let r = -1;                                                   // >0 ise kaya, büyüdükçe yüksek
    if (kind === 'flat') r = (9 + (fbm(x / 5, y / 5, s + 3) - 0.5) * 7 - Math.hypot(x - (N - 5), y - 5)) / 4;       // kuzeydoğuda tek tepe
    else if (kind === 'lake') r = (x - (N - 7)) / 6 + (fbm(x / 6, y / 6, s + 3) - 0.5) * 1.6;
    else if (kind === 'sea') r = (8 - y) / 6 + (fbm(x / 6, y / 6, s + 3) - 0.5) * 1.6;                              // kuzeyde sıradağ
    else {                                                        // dağlık: vadi ve ortada bir düzlük dışında her yer dağ
      const valley = Math.abs(y - ry - Math.sin(x / 8 + s) * 4) - 3.5 - fbm(x / 5, y / 5, s + 9) * 3;
      const basin = Math.hypot(x - N * 0.36, y - ry) - 12, basin2 = Math.hypot(x - N * 0.74, y - ry + 6) - 8;
      r = Math.min((fbm(x / 7, y / 7, s + 3) - 0.4) * 5, valley / 2, basin / 3, basin2 / 3);
    }
    if (r > 0.15) { G.t[i] = T_ROCK; G.h[i] = Math.round(clamp(r * 3 + fbm(x / 3, y / 3, s) * 2, 1, 6)); continue; }
    if (fbm(x / 7, y / 7, s + 5) > forestAt) G.t[i] = T_FOREST;
  }
  entryRoad(G);
}

/* Kömür ve demir yatakları: dağların ova kenarındaki kayalarında, ulaşılabilir yerlerde.
   Her haritada en az birkaç yatak olur; tohumdan üretildiği için eski kayıtlarda da aynı çıkar. */
function genDeposits(G) {
  const N = G.N, s = G.seed, edge = [];
  G.dep = new Array(N * N).fill(0);
  for (let i = 0; i < N * N; i++) if (G.t[i] === T_ROCK && neigh4(G, i).some(j => G.t[j] === T_GRASS || G.t[j] === T_FOREST)) edge.push(i);
  const score = (i, k) => fbm((i % N) / 4, ((i / N) | 0) / 4, s + k);
  const pickTop = (k, n, code) => edge.filter(i => !G.dep[i]).sort((a, b) => score(b, k) - score(a, k)).slice(0, n).forEach(i => { G.dep[i] = code; });
  const n = Math.min(12, Math.max(4, Math.round(edge.length * 0.07)));
  pickTop(41, n, D_COAL);
  pickTop(53, Math.max(3, Math.round(n * 0.8)), D_IRON);
}

/* Eski (v1) kayıtları yeni sürüme taşır: şehir olduğu gibi kalır, yeni alanlar eklenir */
function upgradeSave(G) {
  if (G.v === 1) {
    genDeposits(G);
    Object.assign(G, { multi: [], res: { kereste: 0, tas: 0, komur: 0, demir: 0 }, made: {}, sold: {}, proj: null, projNext: 0, done: [], itibar: 50, fx: {} });
    G.v = 2;
  }
  if (G.v === 2) {
    Object.assign(G, { rl: new Array(G.N * G.N).fill(0), mark: {}, opt: { disasters: true }, tv: 0, ev: null, risk: {} });
    const H = { N: G.N, seed: G.seed, t: new Array(G.N * G.N).fill(0), h: new Array(G.N * G.N).fill(0), r: new Array(G.N * G.N).fill(0) };
    genRiverMap(H); G.forest0 = H.t.filter(t => t === T_FOREST).length;      // haritanın ilk ormanı
    for (const m of G.multi) { m.w = m.w || 2; m.h = m.h || 2; }
    if (G.fx.rail) addRailStub(G);
    G.v = 3;
  }
  return G;
}

/* ---------- önbellek: bağlantı, kapsama, toplamlar ---------- */
const CACHE = new WeakMap();
function cache(G) {
  let c = CACHE.get(G);
  if (!c || c.dirty) c = rebuild(G);
  return c;
}
function touch(G) { const c = CACHE.get(G); if (c) c.dirty = true; }

function rebuild(G) {
  const N = G.N, n = N * N;
  const U = () => new Uint8Array(n);
  const c = { dirty: false, net: U(), served: U(), water: U(), police: U(), school: U(), clinic: U(), square: U(), dirt: U(),
    fire: U(), fun: U(), flood: U(), mill: U(), transit: U(), freight: U(), rnet: U(), railOut: false, station: -1,
    outside: false, roads: 0, bridges: 0, rails: 0, levees: 0, cnt: {}, svcJobs: 0, eduJobs: 0, ind: [], zones: { 1: [], 2: [], 3: [] } };
  // Yol ağı: Valiliğe değen yollardan başlayan arama
  const q = [];
  if (G.gov) for (const i of govTiles(G)) for (const j of neigh4(G, i)) if (G.r[j] && !c.net[j]) { c.net[j] = 1; q.push(j); }
  while (q.length) { const i = q.pop(); if (G.r[i] === 2) c.outside = true; for (const j of neigh4(G, i)) if (G.r[j] && !c.net[j]) { c.net[j] = 1; q.push(j); } }
  for (let i = 0; i < n; i++) {
    if (G.r[i] === 1) { if (G.t[i] === T_WATER) c.bridges++; else c.roads++; }
    if (!G.r[i] && G.t[i] !== T_WATER) for (const j of neigh4(G, i)) if (c.net[j]) { c.served[i] = 1; break; }
    if (G.z[i]) c.zones[G.z[i]].push(i);
  }
  // Demiryolu ağı: istasyona (demiryolu anıtı) değen raylardan
  const st = G.multi.find(m => m.k === S_LANDMARK && m.pid === 'rail');
  if (st) {
    const rq = [];
    c.station = idx(G, st.x, st.y);
    for (const i of multiTiles(G, st)) for (const j of neigh4(G, i)) if (G.rl[j] && !c.rnet[j]) { c.rnet[j] = 1; rq.push(j); }
    while (rq.length) { const i = rq.pop(); if (G.rl[i] === 2) c.railOut = true; for (const j of neigh4(G, i)) if (G.rl[j] && !c.rnet[j]) { c.rnet[j] = 1; rq.push(j); } }
  }
  for (let i = 0; i < n; i++) if (G.rl[i] === 1) c.rails++;
  // Tekil binalar: kapsama, iş, üretim
  c.upExtra = 0;
  c.act = {};      // yola bağlı, çalışan santral, fabrika, durak ve çöp alanları
  const unit = (key, i, ok, center) => {
    const d = SVD[key];
    c.cnt[key] = (c.cnt[key] || 0) + 1;
    if (d.cover && d.radius) around(G, center, d.radius, j => { c[d.cover][j] = 1; });
    const lv = lvOf(G, i), mul = UP.out[lv];
    if (d.jobs && ok) c[d.edu ? 'eduJobs' : 'svcJobs'] += Math.round(d.jobs * UP.jobs[lv]);
    if (d.upkeep && lv > 1) c.upExtra += d.upkeep * (lv - 1);
    if (d.dirty) around(G, center, d.dirty, j => { c.dirt[j] = 1; });
    if ((d.year || key === 'ranch') && ok) c.act[key] = (c.act[key] || 0) + mul;
    if (d.out) {
      const f = ok ? resourceFactor(G, i, d.need) : 0;
      c.ind.push({ i, key, f: f * mul, rail: false });
      around(G, i, 3, j => { c.dirt[j] = 1; });                  // toz ve gürültü
    }
  };
  for (let i = 0; i < n; i++) {
    const code = G.sv[i]; if (!code || code === S_GOV || isMultiCode(code)) continue;
    const key = CODE2KEY[code]; if (!key) continue;
    if (code === S_LEVEE) { c.levees++; around(G, i, 2, j => { c.flood[j] = 1; }); continue; }
    unit(key, i, c.served[i] || !!SVD[key].onWater, i);
  }
  for (const m of G.multi) {
    const key = CODE2KEY[m.k]; if (!key || m.k === S_SITE) continue;
    const tiles = multiTiles(G, m);
    unit(key, tiles[0], tiles.some(j => c.served[j]), idx(G, m.x + (m.w >> 1), m.y + (m.h >> 1)));
  }
  // Görev anıtları da çalışır: iş verir ve şehre hizmet eder
  c.tourism = 0;
  c.hippos = G.multi.filter(m => m.k === S_HIPPO && multiTiles(G, m).some(j => c.served[j])).length;
  for (const m of G.multi) {
    if (m.k !== S_LANDMARK) continue;
    const tiles = multiTiles(G, m), ok = tiles.some(j => c.served[j]), ctr = idx(G, m.x + 1, m.y + 1), L = LANDMARK[m.pid];
    if (!L) continue;
    if (ok) c[m.pid === 'univ' ? 'eduJobs' : 'svcJobs'] += L.jobs;
    if (m.pid === 'aqueduct') around(G, ctr, 9, j => { c.clinic[j] = 1; });                 // su idaresi: temiz su, sağlık
    if (m.pid === 'rail') { around(G, ctr, 9, j => { c.transit[j] = 1; }); around(G, ctr, 8, j => { c.freight[j] = 1; }); }
    if (m.pid === 'quay') c.cnt.port = (c.cnt.port || 0) + 1;                                 // hazır nehir limanı
    if (m.pid === 'tower') { around(G, ctr, 10, j => { c.square[j] = 1; }); if (ok) c.tourism = 1; }
    if (m.pid === 'victory') { around(G, ctr, 12, j => { c.square[j] = 1; }); if (ok) c.tourism = 1; }
    if (m.pid === 'univ') c.school.fill(1);
    if (m.pid === 'power' && ok) c.act.lmPower = 1;
  }
  if (c.cnt.barracks) c.police.fill(1);                          // ordu bütün haritada asayişi sağlar
  // Raya ya da yük istasyonunun kapsamına yakın ocak ve madenler demiryoluyla satar
  for (const b of c.ind) b.rail = c.railOut && (neigh8(G, b.i).some(j => c.rnet[j]) || !!c.freight[b.i]);
  // Tamamlanmış su kemeri geniş bir alana su verir
  for (const m of G.multi) if (m.k === S_LANDMARK && m.pid === 'aqueduct') around(G, idx(G, m.x, m.y) + G.N + 1, 16, j => { c.water[j] = 1; });
  CACHE.set(G, c);
  return c;
}

function govTiles(G) { if (!G.gov) return []; const { x, y } = G.gov; return [idx(G, x, y), idx(G, x + 1, y), idx(G, x, y + 1), idx(G, x + 1, y + 1)]; }
function multiAt(G, i) { const x = i % G.N, y = (i / G.N) | 0; return G.multi.find(m => x >= m.x && x < m.x + (m.w || 2) && y >= m.y && y < m.y + (m.h || 2)); }
function multiTiles(G, m) { const r = []; for (let y = m.y; y < m.y + (m.h || 2); y++) for (let x = m.x; x < m.x + (m.w || 2); x++) r.push(idx(G, x, y)); return r; }
function neigh8(G, i) { const r = []; around(G, i, 1, j => { if (j !== i) r.push(j); }); return r; }

/* Üretim binasının çevresindeki kaynak: 0..1 */
function resourceFactor(G, i, need) {
  let k = 0;
  if (need === 'forest') { around(G, i, 2, j => { if (j !== i && G.t[j] === T_FOREST) k++; }); /* kendi karesi sayılmaz */ return k >= 3 ? Math.min(1, k / 6) : 0; }
  around(G, i, 1, j => {
    if (need === 'rock' && G.t[j] === T_ROCK) k++;
    if (need === 'coal' && G.dep[j] === D_COAL) k++;
    if (need === 'iron' && G.dep[j] === D_IRON) k++;
  });
  return k ? Math.min(1, 0.6 + k * 0.2) : 0;
}

/* Toplamlar her gün yeniden sayılır (4096 kare, ucuz) */
function totals(G) {
  const c = cache(G), n = G.N * G.N;
  const soil = G.map === 'flat' ? 1.2 : G.map === 'mount' ? 0.9 : 1;      // ovada toprak verimli, dağda zayıf
  let vSlots = 0, P = 0, cap = 0, farmJobs = 0, farmFood = 0, comJobs = 0, building = 0, cov = { water: 0, police: 0, school: 0, clinic: 0, square: 0, dirt: 0, fire: 0, fun: 0, transit: 0 };
  for (let i = 0; i < n; i++) {
    const z = G.z[i]; if (!z) continue;
    if (G.pg[i] < 1 && G.lv[i] > 0) { building++; }
    const done = G.pg[i] >= 1 ? G.lv[i] : G.lv[i] - 1;   // inşaattaki seviye henüz sayılmaz
    if (z === Z_RES) {
      const p = G.pop[i]; P += p; cap += B.resCap[Math.max(0, done)];
      if (done >= 3 && (c.square[i] || c.fun[i]) && !c.dirt[i]) vSlots += B.resCap[done] * 0.2;      // varlıklılar için uygun konak ve apartmanlar
      if (p) for (const k in cov) if (c[k][i]) cov[k] += p;
    }
    else if (z === Z_FARM) { const j = B.farmJobs[Math.max(0, done)]; farmJobs += j; farmFood += j * B.foodPerFarmer * soil * (c.mill[i] ? 1 + B.millBoost : 1); }
    else if (z === Z_COM) comJobs += B.comJobs[Math.max(0, done)];
  }
  const govJobs = G.gov ? B.govJobs : 0, svcJobs = c.svcJobs;
  regroup(G, comJobs, govJobs + c.eduJobs);
  // Her grubun geçim kaynağı: çiftçi tarla, işçi üretim ve hizmet, esnaf dükkân, eğitimli kamu görevi, varlıklı uygun konut
  const jobs = { c: farmJobs, i: svcJobs, e: comJobs, o: govJobs + c.eduJobs, v: Math.round(vSlots) };
  const vac = {}, un = {}; let vacAll = 0, unAll = 0;
  for (const g of GRP) { vac[g] = Math.max(0, jobs[g] - G.grp[g]); un[g] = Math.max(0, G.grp[g] - jobs[g]); if (g !== 'v') vacAll += vac[g]; unAll += un[g]; }
  const workJobs = jobs.i;
  const free = Math.max(0, cap - P);
  const reg = c.outside ? G.reg : 0;
  const want = c.outside ? vacAll + (avgHap(G) > 55 ? 3 : 0) : 0;     // gelmek isteyen
  const dRes = want - free;
  const yieldPP = farmJobs ? farmFood / farmJobs : B.foodPerFarmer;      // değirmenler kişi başı verimi artırır
  const army = c.cnt.barracks ? B.barracks.food * c.cnt.barracks : 0;
  const fish = (c.cnt.pier || 0) * B.pierFood + ((c.act || {}).ranch || 0) * B.ranchFood;      // balık ve hayvancılık
  // Elektrik ve çöp (1890 sonrası): şehir geneli kapasite ve tüketim
  const yr = yearOf(G), A = c.act || {};
  const pcap = yr < 1890 ? 0 : (A.power || 0) * B.power.plant * (G.flags.noCoal ? 0.3 : 1) + (A.hydro || 0) * B.power.hydro + (A.lmPower ? B.power.landmark : 0);
  const puse = yr < 1890 ? 0 : Math.round(P * ramp(yr, 1890, 1915) + (A.factory || 0) * B.power.factoryUse + (A.tram || 0) * B.power.tramUse);
  const power = puse ? Math.min(1, pcap / puse) : (pcap ? 1 : 0);
  const waste = P ? Math.min(1, (A.dump || 0) * B.dumpCap / P) : 1;
  const dFarm = Math.ceil(((P + want) * B.foodPerPerson + army - fish + reg * 0.6 * B.foodPerFarmer) / yieldPP) - farmJobs;
  const dCom = P >= 20 ? Math.round((P + want) * B.comShare + reg * 0.4) - comJobs : -1;
  for (const k in cov) cov[k] = P ? cov[k] / P : 0;
  return { yr, pcap, puse, power, waste, P, cap, free, farmJobs, yieldPP, army, fish, comJobs, govJobs, svcJobs, workJobs, jobs, vac, un, vacAll, unAll, want, dRes, dFarm, dCom, building, cov, watered: cov.water * P, reg, outside: c.outside };
}

function avgHap(G) { let P = 0, s = 0; for (const g of GRP) { const n = G.grp[g] || 0; P += n; s += n * (G.hap[g] == null ? 60 : G.hap[g]); } return P ? s / P : 60; }
/* Eski kayıtlar: iki gruplu nüfusu beş gruba dağıtır (işçilerin bir kısmı esnaf ve eğitimli olur) */
function regroup(G, comJobs, eduJobs) {
  if (G.grp.e != null) return;
  const g = G.grp, e = Math.min(g.i, comJobs); g.i -= e;
  const o = Math.min(g.i, eduJobs); g.i -= o;
  g.e = e; g.o = o; g.v = 0;
  for (const k of ['e', 'o', 'v']) { G.hap[k] = k === 'v' ? 60 : G.hap.i; G.hf[k] = {}; }
}

/* ---------- oyuncu eylemleri ---------- */
const TOOLS = ['gov', 'road', 'res', 'farm', 'com', 'bulldoze', ...Object.keys(SVD)];

const isLand = (t) => t === T_GRASS || t === T_FOREST;
const freeTile = (G, i) => i >= 0 && isLand(G.t[i]) && !G.r[i] && !G.rl[i] && !G.sv[i] && !(G.z[i] && G.lv[i] > 0);

/* Bir aracın verilen kareler için maliyeti ve geçerliliği (önizleme ve uygulama aynı kuralı kullanır) */
function quote(G, tool, cells) {
  const res = { ok: [], bad: [], cost: 0, err: null };
  const d = SVD[tool];
  if (d && d.year && yearOf(G) < d.year) { res.err = `${d.name} ${d.year} yılında açılır`; res.bad = cells.slice(0, 1); return res; }
  if (tool === 'gov' || (d && (d.w > 1 || d.h > 1))) {
    if (tool === 'gov' && G.gov) { res.err = 'Valilik zaten kurulu'; return res; }
    if (tool !== 'gov' && !G.gov) { res.err = 'Önce Valilik binasını kur'; res.bad = cells.slice(0, 1); return res; }
    if (tool === 'site' && !(G.proj && !G.proj.site)) { res.err = G.proj ? 'Şantiye zaten kurulu' : 'Şu an görev yok'; res.bad = cells.slice(0, 1); return res; }
    const [w, h] = tool === 'gov' ? [2, 2] : dims(d);
    const i = cells[0], x = i % G.N, y = (i / G.N) | 0;
    for (let b = y; b < y + h; b++) for (let a = x; a < x + w; a++) {
      const j = inMap(G, a, b) ? idx(G, a, b) : -1;
      if (j < 0 || !freeTile(G, j)) res.bad.push(j); else res.ok.push(j);
    }
    const P = tool === 'gov' ? 0 : totals(G).P;
    const edge = []; for (const j of res.ok) for (const k of neigh4(G, j)) if (!res.ok.includes(k)) edge.push(k);
    const cc = cache(G);
    if (d && d.minP && P < d.minP) { res.err = `${d.name} için en az ${d.minP} nüfus gerekir`; res.bad = res.ok.concat(res.bad); res.ok = []; }
    else if (d && d.needRail && !G.fx.rail) { res.err = 'Demiryolu görevi bitince açılır'; res.bad = res.ok.concat(res.bad); res.ok = []; }
    else if (d && d.needRail && !res.bad.length && !edge.some(k => cc.rnet[k])) { res.err = `${d.name} istasyona bağlı bir rayın yanına kurulur`; res.bad = res.ok; res.ok = []; }
    else if (d && d.needWater && !res.bad.length && edge.filter(k => G.t[k] === T_WATER).length < 2) { res.err = 'Liman su kıyısına kurulur'; res.bad = res.ok; res.ok = []; }
    else if (d && d.needFarm && !res.bad.length && !edge.some(k => G.z[k] === Z_FARM)) { res.err = d.name + ' bir tarlanın yanına kurulur'; res.bad = res.ok; res.ok = []; }
    else if (res.bad.length) res.err = (tool === 'gov' ? 'Valilik' : d.name) + ` için ${w}×${h} boş arazi gerekir`;
    else res.cost = tool === 'gov' ? 0 : d.cost;
    return res;
  }
  if (!G.gov) { res.err = 'Önce Valilik binasını kur'; res.bad = cells.slice(); return res; }
  for (const i of cells) {
    const t = G.t[i];
    let ok = true, cost = 0;
    if (tool === 'road') {
      if (G.r[i] || t === T_ROCK || G.sv[i] || (G.z[i] && G.lv[i] > 0)) ok = false;   // boş alanın üstünden geçer, binayı yıkmaz
      else cost = t === T_WATER ? B.cost.bridge : G.rl[i] ? B.cost.overpass : t === T_FOREST ? B.cost.roadForest : B.cost.road;
    } else if (tool === 'rail') {
      if (!G.fx.rail) { ok = false; res.err = 'Demiryolu görevi bitince açılır'; }
      else if (G.rl[i] || t === T_ROCK || G.sv[i] || (G.z[i] && G.lv[i] > 0)) ok = false;     // yolla kesişebilir (hemzemin geçit)
      else cost = t === T_WATER ? B.cost.railBridge : G.r[i] ? B.cost.overpass : B.cost.rail;
    } else if (tool === 'res' || tool === 'farm' || tool === 'com') {
      const zt = tool === 'res' ? 1 : tool === 'farm' ? 2 : 3;
      if (!isLand(t) || G.r[i] || G.rl[i] || G.sv[i] || G.z[i] === zt) ok = false;
      else cost = t === T_FOREST ? B.cost.zoneForest : B.cost.zone;
    } else if (d && d.onWater) {
      if (d.code === S_PIER && !cache(G).cnt.port) { ok = false; res.err = 'İskele için önce nehir limanı kur'; }
      else if (t !== T_WATER || G.r[i] || G.rl[i] || G.sv[i] || !neigh4(G, i).some(j => isLand(G.t[j]))) { ok = false; res.err = d.name + ' kıyıya bitişik suya kurulur'; }
      else cost = d.cost;
    } else if (d) {
      if (!isLand(t) || G.r[i] || G.rl[i] || G.sv[i] || (G.z[i] && (d.line ? G.lv[i] > 0 : true))) ok = false;
      else if (d.need && !resourceFactor(G, i, d.need)) { ok = false; res.err = needText(d.need); }
      else cost = d.cost;
    } else if (tool === 'bulldoze') {
      const s = G.sv[i];
      if (G.r[i] === 2 || G.rl[i] === 2 || s === S_GOV || s === S_SITE || s === S_LANDMARK || !(G.r[i] || G.rl[i] || G.z[i] || s)) ok = false; else cost = B.cost.bulldoze;
    } else ok = false;
    if (ok) { res.ok.push(i); res.cost += cost; } else res.bad.push(i);
  }
  if (!res.ok.length && !res.err) res.err = 'Buraya yapılamaz';
  return res;
}
/* Büyük bir alan çizildiğinde araya sokak yerleşimi: her iki sıra binadan sonra bir sokak.
   Sokaklar uzun kenara paralel uzanır; mevcut yola değen kenardan başlanır ve uçtan bir ara yolla ağa bağlanır. */
function autoRoads(G, x0, y0, x1, y1) {
  const N = G.N, w = x1 - x0 + 1, h = y1 - y0 + 1, out = [];
  const horiz = w >= h, depth = horiz ? h : w;
  if (depth < 3) return out;
  const road = (x, y) => inMap(G, x, y) && !!G.r[idx(G, x, y)];
  let before = false, after = false, sideA = false, sideB = false;     // kenarlarda yol var mı
  if (horiz) { for (let x = x0; x <= x1; x++) { before = before || road(x, y0 - 1); after = after || road(x, y1 + 1); } for (let y = y0; y <= y1; y++) { sideA = sideA || road(x0 - 1, y); sideB = sideB || road(x1 + 1, y); } }
  else { for (let y = y0; y <= y1; y++) { before = before || road(x0 - 1, y); after = after || road(x1 + 1, y); } for (let x = x0; x <= x1; x++) { sideA = sideA || road(x, y0 - 1); sideB = sideB || road(x, y1 + 1); } }
  const fromEnd = !before && after;                 // yola değen kenardan başla
  const lines = [];
  for (let k = 0; k < depth; k++) {
    const d = fromEnd ? depth - 1 - k : k;
    if ((before || after) ? k % 3 === 2 : k % 3 === 0) lines.push(d);
  }
  // Uzak kenarda iki sıra kaldıysa ve orada yol yoksa en dış sıra da sokak olur, yoksa o sıra yola değmez
  const far = fromEnd ? before : after, lastK = depth - 1 - (fromEnd ? depth - 1 - lines[lines.length - 1] : lines[lines.length - 1]);
  if (!far && lines.length && lastK === 2) lines.push(fromEnd ? 0 : depth - 1);
  for (const d of lines) {
    if (horiz) for (let x = x0; x <= x1; x++) out.push(idx(G, x, y0 + d));
    else for (let y = y0; y <= y1; y++) out.push(idx(G, x0 + d, y));
  }
  // Ara yol: yandaki yol varsa oradan zaten bağlanır, yoksa bir kenar boyunca
  if (!sideA && !sideB) {
    if (horiz) for (let y = y0; y <= y1; y++) out.push(idx(G, x0, y));
    else for (let x = x0; x <= x1; x++) out.push(idx(G, x, y0));
  }
  return [...new Set(out)];
}

/* Hipodromun aylık bilet geliri: şehir ve çevre büyüdükçe artar */
function hippoIncome(G, c, P) { const h = B.hippo; return c.hippos ? c.hippos * (h.base + Math.sqrt(P) * h.perRoot + G.reg * h.perReg) : 0; }

/* Seviye: tek kareli yapıda karenin, çok karelide sol üst karenin numarasıyla tutulur */
function lvOf(G, i) { return (G.up && G.up[i]) || 1; }
function upInfo(G, i) {
  const m = isMultiCode(G.sv[i]) ? multiAt(G, i) : null, a = m ? idx(G, m.x, m.y) : i, key = CODE2KEY[G.sv[i]];
  if (!key || !UPGRADABLE.includes(key)) return null;
  const lv = lvOf(G, a), d = SVD[key];
  return { key, anchor: a, lv, mul: UP.out[lv], jmul: UP.jobs[lv], cost: lv < UP.max ? Math.round(d.cost * UP.cost[lv + 1]) : 0, nextMul: UP.out[lv + 1], max: UP.max };
}
function upgrade(G, i) {
  const u = upInfo(G, i);
  if (!u || u.lv >= UP.max) return { done: false, err: 'Daha fazla yükseltilemez' };
  if (G.money < u.cost) return { done: false, err: 'Hazinede yeterli para yok' };
  G.money -= u.cost; G.up = G.up || {}; G.up[u.anchor] = u.lv + 1; touch(G);
  return { done: true, cost: u.cost, lv: u.lv + 1 };
}

function needText(need) {
  return { forest: 'Oduncu için çevrede en az 3 kare orman gerekir', rock: 'Taş ocağı dağın dibine kurulur', coal: 'Kömür ocağı kömür yatağının (kara kayalar) yanına kurulur', iron: 'Demir madeni demir yatağının (pas renkli kayalar) yanına kurulur' }[need];
}

function apply(G, tool, cells) {
  const q = quote(G, tool, cells);
  const d = SVD[tool];
  const whole = tool === 'gov' || (d && (d.w > 1 || d.h > 1));
  if (!q.ok.length || (whole && q.bad.length)) return { done: false, err: q.err || 'Buraya yapılamaz' };
  if (q.cost > G.money) return { done: false, err: 'Hazinede yeterli para yok' };
  G.money -= q.cost;
  if (tool === 'gov') {
    const i = cells[0]; G.gov = { x: i % G.N, y: (i / G.N) | 0 };
    for (const j of q.ok) { clearTile(G, j); G.t[j] = T_GRASS; G.sv[j] = S_GOV; }
    msg(G, 'gov', 'Valilik kuruldu. Şimdi batıdaki dış yola bir yol bağla.');
  } else if (whole) {
    const i = cells[0], [w, h] = dims(d), m = { k: d.code, x: i % G.N, y: (i / G.N) | 0, w, h };
    if (tool === 'site') { m.pid = PROJECTS[G.proj.i].id; G.proj.site = 1; msg(G, 'site', 'Şantiye kuruldu. Kaynaklar yol ağıyla her ay buraya taşınır.'); }
    G.multi.push(m);
    for (const j of q.ok) { clearTile(G, j); G.t[j] = T_GRASS; G.sv[j] = d.code; }
  } else for (const i of q.ok) {
    if (tool === 'road') { clearTile(G, i); G.r[i] = 1; if (G.t[i] === T_FOREST) G.t[i] = T_GRASS; }
    else if (tool === 'rail') { clearTile(G, i); G.rl[i] = 1; if (G.t[i] === T_FOREST) G.t[i] = T_GRASS; }
    else if (tool === 'res' || tool === 'farm' || tool === 'com') { clearTile(G, i); G.z[i] = tool === 'res' ? 1 : tool === 'farm' ? 2 : 3; if (G.t[i] === T_FOREST) G.t[i] = T_GRASS; }
    else if (d) { clearTile(G, i); G.sv[i] = d.code; if (G.t[i] === T_FOREST) G.t[i] = T_GRASS; }
    else if (tool === 'bulldoze') {
      if (G.r[i] === 1) G.r[i] = 0;
      else if (G.rl[i] === 1) G.rl[i] = 0;
      if (G.up) delete G.up[i];
      if (isMultiCode(G.sv[i])) { const m = multiAt(G, i); if (m) { if (G.up) delete G.up[idx(G, m.x, m.y)]; for (const j of multiTiles(G, m)) G.sv[j] = 0; G.multi.splice(G.multi.indexOf(m), 1); } }
      else if (G.sv[i] && G.sv[i] !== S_GOV) G.sv[i] = 0;
      clearTile(G, i);
    }
  }
  const wasOut = cache(G).outside;
  touch(G);
  if (!wasOut && cache(G).outside && !G.flags.connected) { G.flags.connected = 1; msg(G, 'conn', 'Şehir dış yola bağlandı. Yolların yanına konut ve tarla alanı çiz.'); }
  return { done: true, cost: q.cost, n: q.ok.length };
}

/* Bölgeyi ve üzerindeki binayı kaldırır; sakinler şehirden ayrılır */
function clearTile(G, i) {
  if (G.pop[i]) evict(G, G.pop[i], i);
  G.z[i] = 0; G.lv[i] = 0; G.pg[i] = 0; G.pop[i] = 0;
}
function evict(G, k, i) {
  // Giden kişiler gruplardan düşülür (gruplar şehir geneli sayılır, evler kişi sayısı tutar)
  for (let n = 0; n < k; n++) {
    let b = 'c'; for (const g of GRP) if ((G.grp[g] || 0) > (G.grp[b] || 0)) b = g;
    if (G.grp[b] > 0) G.grp[b]--;
  }
  if (i != null) G.pop[i] = Math.max(0, G.pop[i] - k);
}

/* ---------- simülasyon ---------- */
function msg(G, k, text) { G.msgs.push({ k, text, d: G.day }); }

/* Bir oyun günü */
function step(G) {
  if (!G.gov) { G.day++; if (G.day % DAYS_PER_MONTH === 0) monthEnd(G); return; }
  const c = cache(G), N = G.N;
  // 1) İnşaatlar ilerler
  for (let i = 0; i < N * N; i++) if (G.z[i] && G.lv[i] > 0 && G.pg[i] < 1) {
    G.pg[i] = Math.min(1, G.pg[i] + 1 / B.buildDays[G.z[i]]);
  }
  // 2) Bölgeler talebe göre gelişir (aynı anda sınırlı inşaat: ustalar ve malzeme)
  let T = totals(G);
  const maxBuild = 3 + Math.floor(T.P / 80);
  if (T.building < maxBuild) {
    develop(G, Z_FARM, T.dFarm, c, T);
    develop(G, Z_RES, T.dRes, c, T);
    develop(G, Z_COM, T.dCom, c, T);
  }
  // 3) Göç ve nüfus
  T = totals(G);
  migrate(G, T);
  G.day++;
  if (G.day % DAYS_PER_MONTH === 0) monthEnd(G);
}

function develop(G, z, demand, c, T) {
  if (demand <= 0) return;
  const list = c.zones[z].filter(i => c.served[i]);
  if (!list.length) return;
  // Talebin büyüklüğüne göre bugün kaç deneme
  const tries = Math.min(4, Math.ceil(demand / (z === Z_RES ? 6 : z === Z_FARM ? 3 : 5)));
  for (let k = 0; k < tries; k++) {
    if (rng(G) > 0.65) continue;
    const i = list[(rng(G) * list.length) | 0];
    if (G.pg[i] < 1 && G.lv[i] > 0) continue;                 // inşaat sürüyor
    const lv = G.lv[i];
    if (lv === 0) { G.lv[i] = 1; G.pg[i] = 0; continue; }       // yeni bina
    if (canUpgrade(G, i, z, lv, c, T)) { G.lv[i] = lv + 1; G.pg[i] = 0; }
  }
}

function canUpgrade(G, i, z, lv, c, T) {
  if (z === Z_RES) {
    if (lv >= 4) return false;
    if (lv === 3) return T.yr >= 1890 && T.power >= 0.9 && c.transit[i] && c.water[i] && !c.dirt[i] && avgHap(G) > 58;   // apartman: elektrik ve ulaşım ister
    if (!c.water[i] || c.dirt[i]) return false;                   // su yoksa ya da maden dibindeyse ev büyümez
    if (lv === 2) return avgHap(G) > 56 && (c.square[i] || c.school[i]) && nearZone(G, i, Z_COM, 6);
    return true;
  }
  if (z === Z_FARM) return lv < 2 && T.P >= 80 && countAround(G, i, Z_FARM) >= 2;
  if (z === Z_COM) return (lv === 1 && T.P >= 120) || (lv === 2 && T.P >= 400 && avgHap(G) > 58);
  return false;
}
function nearZone(G, i, z, r) {
  const N = G.N, x0 = i % N, y0 = (i / N) | 0;
  for (let y = y0 - r; y <= y0 + r; y++) for (let x = x0 - r; x <= x0 + r; x++) if (inMap(G, x, y) && G.z[idx(G, x, y)] === z && G.lv[idx(G, x, y)] > 0) return true;
  return false;
}
function countAround(G, i, z) { let k = 0; for (const j of neigh4(G, i)) if (G.z[j] === z) k++; return k; }

function migrate(G, T) {
  const P = T.P;
  // Gelenler: dış bağlantı, boş konut ve iş ya da toprak arayan aileler
  if (T.outside && T.free > 0 && avgHap(G) > 30) {
    const monthly = Math.min(T.free, T.vacAll * 0.7 + 2.5 + Math.max(0, avgHap(G) - 50) * 0.08 * Math.sqrt(P + 16));
    G.imm += monthly / DAYS_PER_MONTH;
  } else G.imm *= 0.9;
  // Doğal artış: 1850'de yılda yaklaşık %1
  G.born += P * 0.01 / 12 / DAYS_PER_MONTH;
  // Gidenler: işsizlik ve mutsuzluk
  const leave = (T.unAll * 0.25 + Math.max(0, 40 - avgHap(G)) * P * 0.004) / DAYS_PER_MONTH;
  G.out += leave;
  while (G.imm >= 1 || G.born >= 1) {
    const fromBirth = G.born >= 1;
    if (fromBirth) G.born -= 1; else G.imm -= 1;
    if (!settle(G, T)) { G.imm = 0; G.born = Math.min(G.born, 0.99); break; }
  }
  while (G.out >= 1 && P > 0) {
    G.out -= 1;
    // İşsiz grubun bir üyesi ayrılır
    let g = null;
    for (const k of GRP) if (T.un[k] > 0 && (!g || T.un[k] > T.un[g])) g = k;                 // önce geçimi olmayanlar
    if (!g) for (const k of GRP) if (G.grp[k] > 0 && (!g || G.hap[k] < G.hap[g])) g = k;       // yoksa en mutsuz grup
    if (!g || !G.grp[g]) break;
    const homes = []; for (let i = 0; i < G.N * G.N; i++) if (G.pop[i] > 0) homes.push(i);
    if (!homes.length) break;
    const h = homes[(rng(G) * homes.length) | 0];
    G.pop[h]--; G.grp[g]--;
    T.un[g] = Math.max(0, T.un[g] - 1);
  }
  if (G.out > 3) G.out = 3;
}

/* Yeni bir kişiyi boş bir eve yerleştirir ve mesleğini işe göre seçer */
function settle(G, T) {
  const c = cache(G), homes = [];
  for (const i of c.zones[Z_RES]) if (G.pg[i] >= 1 && G.lv[i] > 0 && G.pop[i] < B.resCap[G.lv[i]]) homes.push(i);
  if (!homes.length) return false;
  const h = homes[(rng(G) * homes.length) | 0];
  G.pop[h]++;
  let g = null;
  const can = (k) => k !== 'o' || G.grp.o < B.govJobs || T.cov.school > 0.15;      // eğitimliler mektebi olan şehre gelir
  for (const k of ['c', 'i', 'e', 'o']) if (T.vac[k] > 0 && can(k) && (!g || T.vac[k] > T.vac[g])) g = k;
  if (T.vac.v > 0 && avgHap(G) > 55 && rng(G) < 0.3) g = 'v';                       // varlıklılar memnun şehre yerleşir
  if (!g) { g = 'c'; for (const k of ['i', 'e']) if (T.jobs[k] && G.grp[k] / T.jobs[k] < (T.jobs[g] ? G.grp[g] / T.jobs[g] : 9)) g = k; }
  G.grp[g]++; if (T.vac[g] > 0) T.vac[g]--;
  T.P++; T.free--;
  return true;
}

/* Ay sonu: üretim, bütçe, gıda, memnuniyet, görevler, kayıtlar */
function monthEnd(G) {
  const T = totals(G), c = cache(G), P = T.P;
  const emp = {}; for (const g of GRP) emp[g] = g === 'v' ? G.grp.v : Math.min(G.grp[g], T.jobs[g]);
  const ec = emp.c, ei = emp.i;
  const r = G.taxRate / 100;
  // Gıda
  const prod = ec * T.yieldPP + T.fish, cons = P * B.foodPerPerson + T.army, net = prod - cons;
  G.food = { prod: Math.round(prod), cons: Math.round(cons), net: Math.round(net) };
  // Kaynak üretimi: işçi bulunduğu ölçüde
  const staff = T.workJobs ? Math.min(1, G.grp.i / T.workJobs) : 0;
  const made = {}, sold = {};
  let sales = 0;
  const pm = (G.fx.rail ? 1.3 : 1) * (c.cnt.port ? B.port.res * (G.map === 'sea' ? 1.2 : 1) : 1);
  const railMade = {};
  for (const b of c.ind) { const d = SVD[b.key], k = d.out, a = d.rate * b.f * staff; made[k] = (made[k] || 0) + a; G.res[k] += a; if (b.rail) railMade[k] = (railMade[k] || 0) + a; }
  const before = { komur: G.res.komur, demir: G.res.demir };
  if (c.cnt.barracks) { const need = B.barracks.coal * c.cnt.barracks; G.res.komur = Math.max(0, G.res.komur - need); }
  // Santraller kömür yakar; fabrikalar kömür ve demir işler
  const A = c.act || {};
  if (A.power) {
    const need = B.power.coal * A.power, had = G.res.komur >= need;
    G.res.komur = Math.max(0, G.res.komur - need);
    if (!had && !G.flags.noCoal) msg(G, 'nocoal', 'Santrale kömür yetişmiyor, şehirde karartma var. Kömür üretimini artır.');
    G.flags.noCoal = had ? 0 : 1;
  } else G.flags.noCoal = 0;
  // Fabrikalar, görev şantiyesinin bu ay alacağı payı ambarda bırakır: önce görev, sonra fabrika
  const pj = G.proj && G.proj.site ? PROJECTS[G.proj.i] : null;
  const rsv = (k) => pj && pj.needs[k] ? Math.max(0, Math.min(pj.needs[k] - (G.proj.got[k] || 0), B.deliverPerMonth * (c.railOut ? 2 : 1))) : 0;
  // Fabrikalar (seviyeye göre ağırlıklı birim): hammadde yettiği oranda tam gelir
  const fu = A.factory || 0, needC = B.factory.coal * fu, needI = B.factory.iron * fu;
  const frac = fu ? clamp(Math.min((G.res.komur - rsv('komur')) / needC, (G.res.demir - rsv('demir')) / needI), 0, 1) : 0;
  G.res.komur -= needC * frac; G.res.demir -= needI * frac;
  const facInc = B.factory.income * fu * staff * (0.3 + 0.7 * T.power) * (0.4 + 0.6 * frac);
  G.used = { komur: Math.round(before.komur - G.res.komur), demir: Math.round(before.demir - G.res.demir), fed: frac, fac: fu };
  for (const k of RES) {
    if (G.res[k] > B.stockCap) {
      const over = G.res[k] - B.stockCap; G.res[k] = B.stockCap;
      // Demiryoluna bağlı ocak ve madenlerin malı daha pahalıya satılır
      const share = made[k] ? Math.min(1, (railMade[k] || 0) / made[k]) : 0;
      if (c.outside || c.railOut) { sold[k] = over; sales += over * B.price[k] * pm * (1 + share * B.railPrice); }
    }
  }
  for (const k of RES) { made[k] = Math.round(made[k] || 0); sold[k] = Math.round(sold[k] || 0); }
  G.made = made; G.sold = sold;
  // Gelir
  const race = c.hippos > 0 && dateOf(G).month === B.hippo.raceMonth;   // ayın sonunda tarih bir sonraki aya geçmiş olur
  const fill = T.comJobs ? Math.min(1, (P * (1 + 0.3 * T.cov.transit) + G.reg) / (T.comJobs * 4)) : 0;   // müşteri: şehir (istasyon yakınında daha çok) + bölge
  const inc = {
    taxC: ec * B.wage.c * r,
    taxI: ei * B.wage.i * r,
    taxE: emp.e * B.wage.e * r, taxO: emp.o * B.wage.o * r, taxV: emp.v * B.wage.v * r,
    taxCom: emp.e * B.comProfit * fill * r,
    trade: c.outside && net > 0 ? net * B.exportPrice * (c.cnt.port ? B.port.food * (G.map === 'sea' ? 1.2 : 1) : 1) : 0,
    sales,
    tourism: c.tourism ? 40 + G.reg * 0.15 : 0,               // saat kulesine gelen ziyaretçiler
    tickets: hippoIncome(G, c, P) * (race ? B.hippo.raceMul : 1),
    factory: facInc,
  };
  const svcUp = Object.keys(c.cnt).reduce((a, k) => a + (SVD[k].upkeep || 0) * c.cnt[k], 0) + c.upExtra;
  const exp = {
    roads: c.roads * B.upkeep.road + c.rails * B.upkeep.rail + c.levees * B.upkeep.levee,
    bridges: c.bridges * B.upkeep.bridge,
    gov: G.gov ? B.upkeep.gov : 0,
    services: svcUp,
  };
  if (race) { G.raceUntil = G.day + 2 * DAYS_PER_MONTH; msg(G, 'race', `Büyük yarış günü! Hipodrom bu ay ${Math.round(inc.tickets)} bilet geliri getirdi, halk bayram ediyor.`); }
  const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
  const netMoney = sum(inc) - sum(exp);
  if (G.gov) G.money += netMoney;
  // Bölge talebi: memnun, itibarlı ve bağlantılı şehir çevresinde ün kazanır
  if (c.outside) G.reg = Math.max(0, G.reg + B.regGrowth * clamp((avgHap(G) - 35) / 30, -1, 1.5) * (0.75 + G.itibar / 200) * (G.fx.rail ? 1.4 : 1) + (c.railOut ? 1.5 : 0) + (c.cnt.port ? B.port.reg : 0) + Math.min(3, c.cnt.pstation || 0) * 0.5 + (A.factory || 0) * 0.8);
  G.last = { inc, exp, net: netMoney };
  // Memnuniyet: ihtiyaçlar şehir büyüdükçe belirir
  if (P > 0) {
    const deficit = net < 0 ? -net / Math.max(1, cons) : 0;
    const cv = T.cov, earlyW = Math.min(1, P / 120);
    for (const g of GRP) {
      const n = G.grp[g] || 0;
      const jobs = T.jobs[g], w = (k) => (GW[g] && GW[g][k]) || 1;
      const unemp = n ? Math.max(0, n - jobs) / n : 0;
      const f = {
        base: 50,
        water: Math.round((cv.water * 15 - (1 - cv.water) * 12) * earlyW),
        jobs: -Math.round(unemp * 45),
        tax: Math.round((B.taxNeutral - G.taxRate) * (G.taxRate > B.taxNeutral ? 2 : 1.4) * w('tax')),
        food: -Math.round(deficit * (c.outside ? 18 : 45)),
        market: g === 'e' ? Math.round(fill * 10 - 3) : g === 'c' ? (c.outside && net > 0 ? 4 : 0) : (T.comJobs > 0 ? 5 : -Math.round(4 * Math.min(1, P / 60))),
        safety: Math.round((cv.police * 5 - (1 - cv.police) * 12 * ramp(P, 150, 600)) * w('safety')),
        health: Math.round(cv.clinic * 6 - (1 - cv.clinic) * 10 * ramp(P, 250, 900)) + (G.fx.aqueduct ? 3 : 0) + (G.fx.sewer ? 4 : 0),
        edu: Math.round((cv.school * 6 - (1 - cv.school) * 8 * ramp(P, 200, 800)) * w('edu')),
        square: Math.round(cv.square * 6 * w('square')) + (G.fx.tower ? 6 : 0) + (G.fx.quay ? 2 : 0),
        dirt: -Math.round(cv.dirt * 10 * w('dirt')),
        fun: Math.round(cv.fun * 6 * w('fun')) + (G.raceUntil > G.day ? B.hippo.raceHap : 0),
        transit: Math.round(cv.transit * 5 * w('transit')),
        power: T.yr >= 1890 ? Math.round((T.power * 6 - (1 - T.power) * 10 * ramp(T.yr, 1895, 1910)) * w('power')) : 0,
        waste: -Math.round((1 - T.waste) * 10 * ramp(T.yr, 1900, 1912)),
        army: c.cnt.barracks ? 3 : 0,
        event: G.ev && G.day < G.ev.until ? -G.ev.hit : 0,
        gov: 3 + (G.fx.victory ? 5 : 0),
      };
      const target = clamp(Object.values(f).reduce((a, b) => a + b, 0), 0, 100);
      G.hf[g] = f;
      G.hap[g] = Math.round((G.hap[g] + (target - G.hap[g]) * 0.35) * 10) / 10;
    }
  }
  projects(G, c);
  regrow(G);
  if (G.opt.disasters) disasters(G, T, c);
  riskOf(G, T, c);
  for (const k in G.mark) if (G.mark[k].until <= G.day) delete G.mark[k];
  G.hist.push({ m: G.day / DAYS_PER_MONTH | 0, P, money: Math.round(G.money), net: Math.round(netMoney), hap: Math.round(avgHap(G)) });
  if (G.hist.length > 240) G.hist.shift();
  // Uyarılar
  if (P > 30 && net < -3 && !G.flags.foodWarn) { G.flags.foodWarn = 1; msg(G, 'food', 'Gıda yetmiyor. Daha fazla tarla alanı aç.'); }
  if (net >= 0) G.flags.foodWarn = 0;
  if (P >= 25 && !c.cnt.fountain && !G.flags.waterTip) { G.flags.waterTip = 1; msg(G, 'water', 'Evlerin büyümesi için su gerek: konutların yakınına çeşme kur.'); }
  if (P >= 200 && !c.cnt.police && !G.flags.policeTip) { G.flags.policeTip = 1; msg(G, 'police', 'Kasaba büyüdükçe asayiş önem kazanıyor. Bir karakol kur.'); }
  if (P >= 300 && !c.cnt.school && !G.flags.schoolTip) { G.flags.schoolTip = 1; msg(G, 'school', 'Aileler çocukları için mektep istiyor.'); }
  if (P >= 400 && !c.cnt.clinic && !G.flags.clinicTip) { G.flags.clinicTip = 1; msg(G, 'clinic', 'Kalabalık arttıkça hastalık riski büyüyor. Bir hekimhane kur.'); }
  if (G.money < 0 && !G.flags.debt) { G.flags.debt = 1; msg(G, 'debt', 'Hazine eksiye düştü. Vergiyi artır ya da harcamaları azalt.'); }
  if (G.money >= 0) G.flags.debt = 0;
  for (const m of [100, 250, 500, 1000, 2000, 5000]) if (P >= m && !G.flags['p' + m]) { G.flags['p' + m] = 1; msg(G, 'pop', `Nüfus ${m} kişiyi geçti.`); }
  if (T.yr >= 1890 && !G.flags.era2) { G.flags.era2 = 1; msg(G, 'era', 'Yeni dönem: Elektrik çağı (1890–1930). Üretim menüsünde santral ve fabrika, Hizmet menüsünde tramvay durağı ve çöp alanı açıldı.'); }
  if (T.yr >= 1896 && T.power < 0.5 && !G.flags.powerTip) { G.flags.powerTip = 1; msg(G, 'power', 'Halk elektrik istiyor: Üretim menüsünden santral kur.'); }
  if (T.yr >= 1901 && T.waste < 0.5 && !G.flags.wasteTip) { G.flags.wasteTip = 1; msg(G, 'waste', 'Çöpler birikiyor: Hizmet menüsünden çöp alanı kur.'); }
  msg(G, 'month', '');
}

/* ---------- on yıllık görevler ---------- */
function projects(G, c) {
  const y = yearOf(G);
  // Yeni görev: yılı geldiyse ve şehir dış yola bağlıysa
  if (!G.proj && G.projNext < PROJECTS.length && y >= PROJECTS[G.projNext].year && c.outside) {
    const p = PROJECTS[G.projNext];
    G.proj = { i: G.projNext, start: G.day, due: G.day + p.years * 12 * DAYS_PER_MONTH, got: {}, site: 0, late: 0 };
    for (const k in p.needs) G.proj.got[k] = 0;
    msg(G, 'proj', `Merkezden yeni görev: ${p.name}. ${p.years} yıl içinde ${needsText(p.needs)} topla ve şantiyeye taşı.`);
  }
  const P = G.proj; if (!P) return;
  const p = PROJECTS[P.i];
  // Teslimat: şantiye yol ağına bağlıysa ambardan her ay taşınır
  if (P.site) {
    const m = G.multi.find(q => q.k === S_SITE);
    const linked = m && multiTiles(G, m).some(j => c.served[j]);
    P.linked = linked ? 1 : 0;
    for (const k in p.needs) P.got[k] = P.got[k] || 0;      // eski kayıtlarda yeni kalemler
    if (linked) for (const k in p.needs) {
      if (k === 'para') { const a = Math.min(Math.max(0, G.money), p.needs[k] - P.got[k], B.deliverMoney); if (a > 0) { G.money -= a; P.got[k] += a; } continue; }
      const a = Math.min(G.res[k], p.needs[k] - P.got[k], B.deliverPerMonth * (c.railOut ? 2 : 1));
      if (a > 0) { G.res[k] -= a; P.got[k] += a; }
    }
    if (Object.keys(p.needs).every(k => P.got[k] >= p.needs[k] - 0.01)) return finishProject(G, m);
  }
  if (G.day > P.due && !P.late) {
    P.late = 1; G.itibar = Math.max(0, G.itibar - 15);
    msg(G, 'late', `${p.name} için verilen süre doldu. İtibar düştü; görevi yine de bitirebilirsin.`);
  }
}
function finishProject(G, m) {
  const P = G.proj, p = PROJECTS[P.i];
  if (m) { m.k = S_LANDMARK; for (const j of multiTiles(G, m)) G.sv[j] = S_LANDMARK; }
  const early = G.day < P.start + (P.due - P.start) / 2;
  G.itibar = clamp(G.itibar + (P.late ? 5 : 15) + (early ? 5 : 0), 0, 100);
  const half = P.late ? 0.5 : 1;
  G.fx[p.id] = 1;
  if (p.id === 'rail') { G.reg += 60 * half; addRailStub(G); }
  if (p.id === 'quay') G.reg += 30 * half;
  G.done.push({ id: p.id, year: yearOf(G), late: P.late });
  G.proj = null; G.projNext++;
  touch(G);
  msg(G, 'projDone', `${p.name} tamamlandı! ${p.reward}`);
  if (p.id === 'rail') msg(G, 'rail', 'Ulaşım menüsünde Ray açıldı. İstasyondan batıdaki ana hatta ray döşe; trenler gelip gitmeye başlar, ocak ve madenler malını daha pahalıya satar.');
}

/* Batı kenarından gelen ana demiryolu hattı (dış yolun iki sıra güneyi) */
function addRailStub(G) {
  const N = G.N; let y = G.entry.y + 2;
  for (const dy of [0, 1, -4, 2, 3]) { const yy = G.entry.y + 2 + dy; if (inMap(G, 0, yy) && [0, 1, 2, 3, 4].every(k => G.t[idx(G, k, yy)] !== T_WATER && !G.r[idx(G, k, yy)])) { y = yy; break; } }
  for (let k = 0; k <= 4; k++) { const i = idx(G, k, y); clearTile(G, i); if (G.sv[i] && !isMultiCode(G.sv[i]) && G.sv[i] !== S_GOV) G.sv[i] = 0; G.t[i] = T_GRASS; G.h[i] = 0; G.rl[i] = 2; }
  G.railEntry = { x: 0, y }; G.tv++;
  touch(G);
}

/* ---------- orman yenilenmesi ---------- */
function regrow(G) {
  const N = G.N; let n = 0, have = 0;
  for (let i = 0; i < N * N; i++) if (G.t[i] === T_FOREST) have++;
  if (have >= (G.forest0 || 0)) return;                 // orman ilk hâlinden fazla büyümez
  for (let i = 0; i < N * N; i++) {
    if (G.t[i] !== T_GRASS || G.r[i] || G.rl[i] || G.sv[i] || G.z[i]) continue;
    let f = 0; for (const j of neigh4(G, i)) if (G.t[j] === T_FOREST) f++;
    if (f >= 2 && rng(G) < B.regrow * (f - 1)) { G.t[i] = T_FOREST; n++; }
  }
  if (n) { G.tv++; touch(G); }
}

/* ---------- afetler ve önlemler ----------
   Yangın: itfaiye kapsamı dışındaki mahallelerde yayılır.  Sel: ilkbaharda nehir kenarında, setler korur.
   Salgın: su ve hekimhane eksik kalabalık şehirlerde. Su kemeri riski yarıya indirir. */
function riskOf(G, T, c) {
  const P = T.P, near = floodTiles(G, c);
  G.risk = {
    fire: P < 60 ? 0 : clamp(Math.round((0.015 + P / 40000) * (1 - T.cov.fire * 0.85) * 1200), 0, 100),
    flood: Math.min(100, near.exposed * 3),
    plague: P < 120 ? 0 : clamp(Math.round(((1 - T.cov.water) * 0.03 + (1 - T.cov.clinic) * 0.025 * ramp(P, 200, 800)) * (G.fx.aqueduct ? 0.5 : 1) * (G.fx.sewer ? 0.3 : 1) * (1 + (1 - T.waste) * ramp(T.yr, 1900, 1912)) * 1200), 0, 100),
  };
}
function floodTiles(G, c) {
  const N = G.N, list = []; let exposed = 0;
  for (let i = 0; i < N * N; i++) {
    if (!(G.z[i] && G.lv[i] > 0)) continue;
    let w = false; around(G, i, 2, j => { if (G.t[j] === T_WATER) w = true; });
    if (w) { list.push(i); if (!c.flood[i]) exposed++; }
  }
  return { list, exposed };
}
function disasters(G, T, c, force) {
  const P = T.P, m = dateOf(G).month;
  const roll = (p) => force || rng(G) < p;
  const hit = (k, h, months) => { G.ev = { k, hit: h, until: G.day + months * DAYS_PER_MONTH }; };
  if ((force === 'fire' || !force) && P >= 60 && roll((0.015 + P / 40000) * (1 - T.cov.fire * 0.85))) {
    const built = []; for (let i = 0; i < G.N * G.N; i++) if ((G.z[i] === Z_RES || G.z[i] === Z_COM) && G.lv[i] > 0) built.push(i);
    if (built.length) {
      const s = built[(rng(G) * built.length) | 0];
      if (c.fire[s]) { G.lv[s] = Math.max(1, G.lv[s] - 1); G.pg[s] = 1; if (G.z[s] === Z_RES) G.pop[s] = Math.min(G.pop[s], B.resCap[G.lv[s]]); msg(G, 'fire', 'Bir evde yangın çıktı; itfaiye yayılmadan söndürdü.'); }
      else {
        const burn = [s], seen = new Set([s]), max = 3 + ((rng(G) * 5) | 0);
        for (let k = 0; k < burn.length && burn.length < max; k++) for (const j of neigh8(G, burn[k])) if (!seen.has(j) && G.z[j] && G.lv[j] > 0 && G.z[j] !== Z_FARM && burn.length < max) { seen.add(j); burn.push(j); }
        for (const i of burn) { const z = G.z[i]; clearTile(G, i); G.z[i] = z; G.mark[i] = { k: 'burn', until: G.day + 90 }; }
        hit('fire', 6, 6);
        msg(G, 'fire', `Büyük yangın! ${burn.length} bina yandı. İtfaiye kur: kapsadığı yerde yangın yayılmaz.`);
      }
      touch(G);
    }
  }
  if ((force === 'flood' || (!force && (G.map === 'sea' ? m >= 8 && m <= 10 : m >= 2 && m <= 4))) && roll(0.07)) {
    const { list } = floodTiles(G, c);
    let n = 0;
    for (const i of list) {
      if (c.flood[i]) continue;
      n++; G.mark[i] = { k: 'wet', until: G.day + 45 };
      if (G.z[i] === Z_RES && G.lv[i] > 1) { G.lv[i]--; if (G.pop[i] > B.resCap[G.lv[i]]) evict(G, G.pop[i] - B.resCap[G.lv[i]], i); }
      else if (G.z[i] === Z_COM && G.lv[i] > 1) G.lv[i]--;
    }
    if (n) { G.food.net -= n * 3; hit('flood', 4, 4); msg(G, 'flood', `${{ lake: 'Göl taştı', sea: 'Fırtına kıyıyı vurdu', flat: 'Dere taştı', mount: 'Dere taştı' }[G.map] || 'Nehir taştı'}: ${n} kare sular altında kaldı. Kıyıya Set çek (Ulaşım menüsü).`); touch(G); }
  }
  const pp = ((1 - T.cov.water) * 0.03 + (1 - T.cov.clinic) * 0.025 * ramp(P, 200, 800)) * (G.fx.aqueduct ? 0.5 : 1) * (G.fx.sewer ? 0.3 : 1) * (1 + (1 - T.waste) * ramp(T.yr, 1900, 1912));
  if ((force === 'plague' || !force) && P >= 120 && roll(pp)) {
    const k = Math.round(P * (0.03 + 0.05 * (1 - T.cov.clinic)));
    for (let n = 0; n < k; n++) {
      const homes = []; for (let i = 0; i < G.N * G.N; i++) if (G.pop[i] > 0) homes.push(i);
      if (!homes.length) break;
      evict(G, 1, homes[(rng(G) * homes.length) | 0]);
    }
    hit('plague', 8, 6);
    msg(G, 'plague', `Salgın! ${k} kişi hayatını kaybetti ya da kenti terk etti. Temiz su ve hekimhane salgını önler.`);
  }
}
function needsText(needs) { return Object.keys(needs).map(k => needs[k] + ' ' + RES_NAME[k].toLocaleLowerCase('tr')).join(', '); }

/* ---------- tarih ---------- */
function dateOf(G) { const m = Math.floor(G.day / DAYS_PER_MONTH); return { year: G.startYear + Math.floor(m / 12), month: m % 12, day: G.day % DAYS_PER_MONTH }; }
function dateText(G) { const d = dateOf(G); return MONTHS[d.month] + ' ' + d.year; }

/* ---------- kayıt ---------- */
function serialize(G) { return JSON.stringify(Object.assign({}, G, { msgs: [] })); }
function deserialize(s) {
  const G = JSON.parse(s);
  if (!G || !Array.isArray(G.t) || !(G.v >= 1 && G.v <= VERSION)) return null;
  upgradeSave(G);
  G.msgs = [];
  return G;
}

const API = { GRP, GRP_NAME, UP, upInfo, upgrade, lvOf, S_RANCH, S_POWER, S_HYDRO, S_FACTORY, S_TRAM, S_DUMP, genMap, VERSION, B, SVD, PROJECTS, hippoIncome, LANDMARK, autoRoads, S_PSTATION, S_FSTATION, S_PORT, S_PIER, S_SMALLSQ, S_BIGSQ, S_HIPPO, S_FIRE, S_LEVEE, S_MILL, S_BARRACKS, isMultiCode, multiTiles, disasters, riskOf, RES, RES_NAME, MONTHS, DAYS_PER_MONTH, T_GRASS, T_WATER, T_FOREST, T_ROCK, Z_RES, Z_FARM, Z_COM,
  S_FOUNTAIN, S_POLICE, S_SCHOOL, S_CLINIC, S_LUMBER, S_QUARRY, S_COAL, S_IRON, S_GOV, S_SQUARE, S_SITE, S_LANDMARK, D_COAL, D_IRON, CODE2KEY, TOOLS,
  newGame, step, quote, apply, totals, cache, touch, avgHap, dateOf, dateText, yearOf, serialize, deserialize, upgradeSave, govTiles, multiAt, neigh4, idx, hash2, fbm,
  resourceFactor, needsText };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else self.Vali = API;
