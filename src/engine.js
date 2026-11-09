/* Vali — simülasyon motoru. DOM yok; tarayıcıda global, Node'da module.exports.
   Durum G düz JSON'dur (localStorage'a olduğu gibi yazılır): fonksiyon ve döngü yok.
   Önbellek (bağlantı, kapsama, toplamlar) G'nin dışında, WeakMap'te tutulur. */
'use strict';

const VERSION = 1;
const DAYS_PER_MONTH = 30;
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

// Arazi
const T_GRASS = 0, T_WATER = 1, T_FOREST = 2, T_ROCK = 3;
// Bölgeler
const Z_NONE = 0, Z_RES = 1, Z_FARM = 2, Z_COM = 3;
// Hizmet binaları
const S_NONE = 0, S_FOUNTAIN = 1, S_GOV = 9;

/* Denge tablosu: bütün sayılar burada, tek yerden ayarlanır.
   1850 dönemi için gerçeğe yakın oranlar: nüfusun ~%45'i tarımda, kişi başı ayda 1 birim gıda. */
const B = {
  startMoney: 4000,
  cost: { road: 12, roadForest: 20, bridge: 140, zone: 3, zoneForest: 10, fountain: 80, bulldoze: 3 },
  upkeep: { road: 0.6, bridge: 3, gov: 12, fountain: 3 },   // aylık
  // İş sayıları "geçindirdiği kişi" cinsindendir (çalışan + ailesi): 1850'de hane başına yaklaşık iki kişi
  resCap: [0, 6, 14, 28],            // konut seviyesine göre kişi
  farmJobs: [0, 6, 11],              // tarla seviyesine göre çiftçi aile
  comJobs: [0, 7, 16, 30],           // ticaret seviyesine göre işçi aile
  govJobs: 12,
  buildDays: { 1: 8, 2: 6, 3: 11 },  // bölge türüne göre inşaat süresi (gün)
  wage: { c: 2, i: 2.6 },            // kişi başı aylık kazanç, vergi bunun üzerinden
  comProfit: 1.0,                    // ticaretle geçinen kişi başına aylık kâr (müşteri doluluğuyla)
  foodPerFarmer: 1.6, foodPerPerson: 1.0,   // nüfusun ~%60'ı tarımla beslenir
  regStart: 10, regGrowth: 2.5,      // bölgenin şehrin ürünlerine talebi (dış yol bağlanınca başlar)
  exportPrice: 0.4,                  // fazla gıdanın birimi başına hazineye pazar resmi
  comShare: 0.17,                    // nüfusun ne kadarı ticaret ve zanaatta çalışır
  fountainRadius: 5,
  taxNeutral: 10,
  maxTax: 25,
};

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
const idx = (G, x, y) => y * G.N + x;
const inMap = (G, x, y) => x >= 0 && y >= 0 && x < G.N && y < G.N;
function neigh4(G, i) {
  const N = G.N, x = i % N, y = (i / N) | 0, r = [];
  if (x > 0) r.push(i - 1); if (x < N - 1) r.push(i + 1); if (y > 0) r.push(i - N); if (y < N - 1) r.push(i + N);
  return r;
}

/* ---------- yeni oyun ---------- */
function newGame(opts) {
  opts = opts || {};
  const N = opts.N || 64, seed = opts.seed != null ? opts.seed : (Date.now() % 100000);
  const n = N * N, z = () => new Array(n).fill(0);
  const G = {
    v: VERSION, seed, rs: seed * 7919 + 1, N, map: 'river', startYear: opts.year || 1850,
    day: 0, money: B.startMoney, taxRate: B.taxNeutral,
    t: z(), h: z(), r: z(), z: z(), lv: z(), pg: z(), pop: z(), sv: z(),
    gov: null, grp: { c: 0, i: 0 }, hap: { c: 60, i: 60 }, hf: { c: {}, i: {} },
    imm: 0, out: 0, born: 0, reg: B.regStart, food: { prod: 0, cons: 0, net: 0 },
    last: { inc: {}, exp: {}, net: 0 }, hist: [], flags: {}, msgs: [],
  };
  genRiverMap(G);
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
  // Batıdan gelen dış yol (ticaret ve göç bunun üzerinden)
  const ry = Math.round(N / 2 + (hash2(4, 5, s) - 0.5) * 8);
  for (let k = 0; k <= 4; k++) { const i = idx(G, k, ry); G.t[i] = T_GRASS; G.h[i] = 0; G.r[i] = 2; }
  // Dış yolun çevresi açık olsun
  for (let y = ry - 3; y <= ry + 3; y++) for (let k = 0; k < 10; k++) if (inMap(G, k, y)) { const i = idx(G, k, y); if (G.t[i] !== T_WATER) { G.t[i] = G.r[i] ? T_GRASS : (G.t[i] === T_ROCK ? T_GRASS : G.t[i]); G.h[i] = 0; } }
  G.entry = { x: 0, y: ry };
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
  const c = { dirty: false, net: new Uint8Array(n), served: new Uint8Array(n), water: new Uint8Array(n), outside: false, roads: 0, bridges: 0, fountains: 0, zones: { 1: [], 2: [], 3: [] } };
  // Yol ağı: Valiliğe değen yollardan başlayan arama
  const q = [];
  if (G.gov) for (const i of govTiles(G)) for (const j of neigh4(G, i)) if (G.r[j] && !c.net[j]) { c.net[j] = 1; q.push(j); }
  while (q.length) { const i = q.pop(); if (G.r[i] === 2) c.outside = true; for (const j of neigh4(G, i)) if (G.r[j] && !c.net[j]) { c.net[j] = 1; q.push(j); } }
  for (let i = 0; i < n; i++) {
    if (G.r[i] === 1) { if (G.t[i] === T_WATER) c.bridges++; else c.roads++; }
    if (G.sv[i] === S_FOUNTAIN) c.fountains++;
    if (!G.r[i] && G.t[i] !== T_WATER) for (const j of neigh4(G, i)) if (c.net[j]) { c.served[i] = 1; break; }
    if (G.z[i]) c.zones[G.z[i]].push(i);
  }
  // Su kapsaması: çeşme yarıçapı içindeki kareler
  const R = B.fountainRadius;
  for (let i = 0; i < n; i++) if (G.sv[i] === S_FOUNTAIN) {
    const fx = i % N, fy = (i / N) | 0;
    for (let y = fy - R; y <= fy + R; y++) for (let x = fx - R; x <= fx + R; x++) if (inMap(G, x, y) && (x - fx) ** 2 + (y - fy) ** 2 <= R * R + 1) c.water[idx(G, x, y)] = 1;
  }
  CACHE.set(G, c);
  return c;
}

function govTiles(G) { if (!G.gov) return []; const { x, y } = G.gov; return [idx(G, x, y), idx(G, x + 1, y), idx(G, x, y + 1), idx(G, x + 1, y + 1)]; }

/* Toplamlar her gün yeniden sayılır (4096 kare, ucuz) */
function totals(G) {
  const c = cache(G), n = G.N * G.N;
  let P = 0, cap = 0, farmJobs = 0, comJobs = 0, building = 0, watered = 0;
  for (let i = 0; i < n; i++) {
    const z = G.z[i]; if (!z) continue;
    if (G.pg[i] < 1 && G.lv[i] > 0) { building++; }
    const done = G.pg[i] >= 1 ? G.lv[i] : G.lv[i] - 1;   // inşaattaki seviye henüz sayılmaz
    if (z === Z_RES) { P += G.pop[i]; cap += B.resCap[Math.max(0, done)]; if (c.water[i]) watered += G.pop[i]; }
    else if (z === Z_FARM) farmJobs += B.farmJobs[Math.max(0, done)];
    else if (z === Z_COM) comJobs += B.comJobs[Math.max(0, done)];
  }
  const govJobs = G.gov ? B.govJobs : 0, workJobs = comJobs + govJobs;
  const vf = Math.max(0, farmJobs - G.grp.c), vw = Math.max(0, workJobs - G.grp.i);
  const uc = Math.max(0, G.grp.c - farmJobs), ui = Math.max(0, G.grp.i - workJobs);
  const free = Math.max(0, cap - P);
  const reg = c.outside ? G.reg : 0;
  const want = c.outside ? vf + vw + (avgHap(G) > 55 ? 2 : 0) : 0;     // gelmek isteyen
  const dRes = want - free;
  const dFarm = Math.ceil((P + want) * B.foodPerPerson / B.foodPerFarmer + reg * 0.6) - farmJobs;
  const dCom = P >= 20 ? Math.round((P + want) * B.comShare + reg * 0.4) - comJobs : -1;
  return { P, cap, free, farmJobs, comJobs, govJobs, workJobs, vf, vw, uc, ui, want, dRes, dFarm, dCom, building, watered, reg, outside: c.outside };
}

function avgHap(G) { const P = G.grp.c + G.grp.i; return P ? (G.hap.c * G.grp.c + G.hap.i * G.grp.i) / P : (G.hap.c + G.hap.i) / 2; }

/* ---------- oyuncu eylemleri ---------- */
const TOOLS = ['gov', 'road', 'res', 'farm', 'com', 'fountain', 'bulldoze'];

/* Bir aracın verilen kareler için maliyeti ve geçerliliği (önizleme ve uygulama aynı kuralı kullanır) */
function quote(G, tool, cells) {
  const res = { ok: [], bad: [], cost: 0, err: null };
  if (tool === 'gov') {
    if (G.gov) { res.err = 'Valilik zaten kurulu'; return res; }
    const i = cells[0], x = i % G.N, y = (i / G.N) | 0;
    const tiles = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]];
    for (const [a, b] of tiles) {
      const j = inMap(G, a, b) ? idx(G, a, b) : -1;
      if (j < 0 || G.t[j] === T_WATER || G.t[j] === T_ROCK || G.r[j] || G.sv[j]) res.bad.push(j); else res.ok.push(j);
    }
    if (res.bad.length) res.err = 'Valilik için 2×2 boş arazi gerekir';
    return res;
  }
  if (!G.gov) { res.err = 'Önce Valilik binasını kur'; res.bad = cells.slice(); return res; }
  for (const i of cells) {
    const t = G.t[i];
    let ok = true, cost = 0;
    if (tool === 'road') {
      if (G.r[i] || t === T_ROCK || G.sv[i] || (G.z[i] && G.lv[i] > 0)) ok = false;   // boş alanın üstünden geçer, binayı yıkmaz
      else cost = t === T_WATER ? B.cost.bridge : t === T_FOREST ? B.cost.roadForest : B.cost.road;
    } else if (tool === 'res' || tool === 'farm' || tool === 'com') {
      const zt = tool === 'res' ? 1 : tool === 'farm' ? 2 : 3;
      if (t === T_WATER || t === T_ROCK || G.r[i] || G.sv[i] || G.z[i] === zt) ok = false;
      else cost = t === T_FOREST ? B.cost.zoneForest : B.cost.zone;
    } else if (tool === 'fountain') {
      if (t === T_WATER || t === T_ROCK || G.r[i] || G.sv[i] || G.z[i]) ok = false; else cost = B.cost.fountain;
    } else if (tool === 'bulldoze') {
      if (G.r[i] === 2 || G.sv[i] === S_GOV || !(G.r[i] || G.z[i] || G.sv[i])) ok = false; else cost = B.cost.bulldoze;
    } else ok = false;
    if (ok) { res.ok.push(i); res.cost += cost; } else res.bad.push(i);
  }
  if (!res.ok.length && !res.err) res.err = 'Buraya yapılamaz';
  return res;
}

function apply(G, tool, cells) {
  const q = quote(G, tool, cells);
  if (!q.ok.length || (tool === 'gov' && q.bad.length)) return { done: false, err: q.err || 'Buraya yapılamaz' };
  if (q.cost > G.money) return { done: false, err: 'Hazinede yeterli para yok' };
  G.money -= q.cost;
  if (tool === 'gov') {
    const i = cells[0]; G.gov = { x: i % G.N, y: (i / G.N) | 0 };
    for (const j of q.ok) { G.t[j] = T_GRASS; G.sv[j] = S_GOV; }
    msg(G, 'gov', 'Valilik kuruldu. Şimdi batıdaki dış yola bir yol bağla.');
  }
  for (const i of q.ok) {
    if (tool === 'road') { clearTile(G, i); G.r[i] = 1; if (G.t[i] === T_FOREST) G.t[i] = T_GRASS; }
    else if (tool === 'res' || tool === 'farm' || tool === 'com') { clearTile(G, i); G.z[i] = tool === 'res' ? 1 : tool === 'farm' ? 2 : 3; if (G.t[i] === T_FOREST) G.t[i] = T_GRASS; }
    else if (tool === 'fountain') { G.sv[i] = S_FOUNTAIN; if (G.t[i] === T_FOREST) G.t[i] = T_GRASS; }
    else if (tool === 'bulldoze') { if (G.r[i] === 1) G.r[i] = 0; if (G.sv[i] === S_FOUNTAIN) G.sv[i] = 0; clearTile(G, i); }
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
    if (G.grp.c > G.grp.i * 1.2 && G.grp.c > 0) G.grp.c--; else if (G.grp.i > 0) G.grp.i--; else if (G.grp.c > 0) G.grp.c--;
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
  const maxBuild = 2 + Math.floor(T.P / 120);
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
  const tries = Math.min(3, Math.ceil(demand / (z === Z_RES ? 8 : z === Z_FARM ? 3 : 6)));
  for (let k = 0; k < tries; k++) {
    if (rng(G) > 0.55) continue;
    const i = list[(rng(G) * list.length) | 0];
    if (G.pg[i] < 1 && G.lv[i] > 0) continue;                 // inşaat sürüyor
    const lv = G.lv[i];
    if (lv === 0) { G.lv[i] = 1; G.pg[i] = 0; continue; }       // yeni bina
    if (canUpgrade(G, i, z, lv, c, T)) { G.lv[i] = lv + 1; G.pg[i] = 0; }
  }
}

function canUpgrade(G, i, z, lv, c, T) {
  if (z === Z_RES) {
    if (lv >= 3) return false;
    if (!c.water[i]) return false;                               // su yoksa ev büyümez
    if (lv === 2) return G.hap.i > 62 && G.hap.c > 55 && nearZone(G, i, Z_COM, 6);
    return true;
  }
  if (z === Z_FARM) return lv < 2 && T.P >= 80 && countAround(G, i, Z_FARM) >= 2;
  if (z === Z_COM) return (lv === 1 && T.P >= 120) || (lv === 2 && T.P >= 400 && avgHap(G) > 60);
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
    const monthly = Math.min(T.free, (T.vf + T.vw) * 0.45 + 1.5 + Math.max(0, avgHap(G) - 50) * 0.06 * Math.sqrt(P + 16));
    G.imm += monthly / DAYS_PER_MONTH;
  } else G.imm *= 0.9;
  // Doğal artış: 1850'de yılda yaklaşık %1
  G.born += P * 0.01 / 12 / DAYS_PER_MONTH;
  // Gidenler: işsizlik ve mutsuzluk
  const leave = ((T.uc + T.ui) * 0.25 + Math.max(0, 40 - avgHap(G)) * P * 0.004) / DAYS_PER_MONTH;
  G.out += leave;
  while (G.imm >= 1 || G.born >= 1) {
    const fromBirth = G.born >= 1;
    if (fromBirth) G.born -= 1; else G.imm -= 1;
    if (!settle(G, T)) { G.imm = 0; G.born = Math.min(G.born, 0.99); break; }
  }
  while (G.out >= 1 && P > 0) {
    G.out -= 1;
    // İşsiz grubun bir üyesi ayrılır
    let g = T.ui > T.uc ? 'i' : T.uc > 0 ? 'c' : (G.hap.i < G.hap.c ? 'i' : 'c');
    if (!G.grp[g]) g = g === 'i' ? 'c' : 'i';
    if (!G.grp[g]) break;
    const homes = []; for (let i = 0; i < G.N * G.N; i++) if (G.pop[i] > 0) homes.push(i);
    if (!homes.length) break;
    const h = homes[(rng(G) * homes.length) | 0];
    G.pop[h]--; G.grp[g]--;
    if (g === 'i') T.ui = Math.max(0, T.ui - 1); else T.uc = Math.max(0, T.uc - 1);
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
  const vf = Math.max(0, T.farmJobs - G.grp.c), vw = Math.max(0, T.workJobs - G.grp.i);
  if (vf > vw || (vf === vw && G.grp.c < G.grp.i)) G.grp.c++; else G.grp.i++;
  T.P++; T.free--;
  return true;
}

/* Ay sonu: bütçe, gıda, memnuniyet, kayıtlar */
function monthEnd(G) {
  const T = totals(G), c = cache(G), P = T.P;
  const ec = Math.min(G.grp.c, T.farmJobs), ei = Math.min(G.grp.i, T.workJobs);
  const r = G.taxRate / 100;
  // Gıda
  const prod = ec * B.foodPerFarmer, cons = P * B.foodPerPerson, net = prod - cons;
  G.food = { prod: Math.round(prod), cons: Math.round(cons), net: Math.round(net) };
  // Gelir
  const fill = T.comJobs ? Math.min(1, (P + G.reg) / (T.comJobs * 4)) : 0;   // müşteri: şehir + bölge
  const inc = {
    taxC: ec * B.wage.c * r,
    taxI: ei * B.wage.i * r,
    taxCom: Math.min(G.grp.i, T.comJobs) * B.comProfit * fill * r,
    trade: c.outside && net > 0 ? net * B.exportPrice : 0,
  };
  const exp = {
    roads: c.roads * B.upkeep.road,
    bridges: c.bridges * B.upkeep.bridge,
    gov: G.gov ? B.upkeep.gov : 0,
    fountains: c.fountains * B.upkeep.fountain,
  };
  const sum = o => Object.values(o).reduce((a, b) => a + b, 0);
  const netMoney = sum(inc) - sum(exp);
  if (G.gov) G.money += netMoney;
  // Bölge talebi: memnun ve bağlantılı şehir çevresinde ün kazanır, ürünlerine talep artar
  if (c.outside) G.reg = Math.max(0, G.reg + B.regGrowth * clamp((avgHap(G) - 35) / 30, -1, 1.5));
  G.last = { inc, exp, net: netMoney };
  // Memnuniyet
  if (P > 0) {
    const deficit = net < 0 ? -net / Math.max(1, cons) : 0;
    const waterCov = P ? T.watered / P : 0, earlyW = Math.min(1, P / 120);
    for (const g of ['c', 'i']) {
      const n = G.grp[g] || 0;
      const jobs = g === 'c' ? T.farmJobs : T.workJobs;
      const unemp = n ? Math.max(0, n - jobs) / n : 0;
      const f = {
        base: 50,
        water: Math.round((waterCov * 15 - (1 - waterCov) * 12) * earlyW),
        jobs: -Math.round(unemp * 45),
        tax: Math.round((B.taxNeutral - G.taxRate) * (G.taxRate > B.taxNeutral ? 2 : 1.4)),
        food: -Math.round(deficit * (c.outside ? 18 : 45)),
        market: g === 'i' ? (T.comJobs > 0 ? 6 : -Math.round(4 * Math.min(1, P / 60))) : (c.outside && net > 0 ? 4 : 0),
        gov: 3,
      };
      const target = clamp(Object.values(f).reduce((a, b) => a + b, 0), 0, 100);
      G.hf[g] = f;
      G.hap[g] = Math.round((G.hap[g] + (target - G.hap[g]) * 0.35) * 10) / 10;
    }
  }
  G.hist.push({ m: G.day / DAYS_PER_MONTH | 0, P, money: Math.round(G.money), net: Math.round(netMoney), hap: Math.round(avgHap(G)) });
  if (G.hist.length > 240) G.hist.shift();
  // Uyarılar
  if (P > 30 && net < -3 && !G.flags.foodWarn) { G.flags.foodWarn = 1; msg(G, 'food', 'Gıda yetmiyor. Daha fazla tarla alanı aç.'); }
  if (net >= 0) G.flags.foodWarn = 0;
  if (P >= 25 && !c.fountains && !G.flags.waterTip) { G.flags.waterTip = 1; msg(G, 'water', 'Evlerin büyümesi için su gerek: konutların yakınına çeşme kur.'); }
  if (G.money < 0 && !G.flags.debt) { G.flags.debt = 1; msg(G, 'debt', 'Hazine eksiye düştü. Vergiyi artır ya da harcamaları azalt.'); }
  if (G.money >= 0) G.flags.debt = 0;
  for (const m of [100, 250, 500, 1000, 2000, 5000]) if (P >= m && !G.flags['p' + m]) { G.flags['p' + m] = 1; msg(G, 'pop', `Nüfus ${m} kişiyi geçti.`); }
  msg(G, 'month', '');
}

/* ---------- tarih ---------- */
function dateOf(G) { const m = Math.floor(G.day / DAYS_PER_MONTH); return { year: G.startYear + Math.floor(m / 12), month: m % 12, day: G.day % DAYS_PER_MONTH }; }
function dateText(G) { const d = dateOf(G); return MONTHS[d.month] + ' ' + d.year; }

/* ---------- kayıt ---------- */
function serialize(G) { return JSON.stringify(Object.assign({}, G, { msgs: [] })); }
function deserialize(s) {
  const G = JSON.parse(s);
  if (!G || G.v !== VERSION || !Array.isArray(G.t)) return null;
  G.msgs = [];
  return G;
}

const API = { VERSION, B, MONTHS, DAYS_PER_MONTH, T_GRASS, T_WATER, T_FOREST, T_ROCK, Z_RES, Z_FARM, Z_COM, S_FOUNTAIN, S_GOV, TOOLS,
  newGame, step, quote, apply, totals, cache, touch, avgHap, dateOf, dateText, serialize, deserialize, govTiles, neigh4, idx, hash2, fbm };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
else self.Vali = API;
