/* Denge simülasyonu: basit bir "vali botu" şehri kurar, yıllara göre tablo basar.
   Kullanım: node tests/sim.js [yıl] [tohum]   CI_CHECK=1 ile denge sınırlarını doğrular. */
const V = require('../src/engine.js');
const years = +(process.argv[2] || 10), seed = +(process.argv[3] || 7);

function play(seed, years, log) {
  const G = V.newGame({ seed });
  const N = G.N, ry = G.entry.y, I = (x, y) => y * N + x;
  const free = (x, y) => x >= 0 && y >= 0 && x < N && y < N && G.t[I(x, y)] !== V.T_WATER && G.t[I(x, y)] !== V.T_ROCK;
  // Valilik: ana caddenin kuzeyine
  let gx = 13; while (!(free(gx, ry - 2) && free(gx + 1, ry - 2) && free(gx, ry - 1) && free(gx + 1, ry - 1))) gx++;
  V.apply(G, 'gov', [I(gx, ry - 2)]);
  // Ana cadde dış yoldan doğuya, sonra yan sokaklar (her 4 sütunda bir)
  const road = [];
  for (let x = 5; x < 34; x++) road.push(I(x, ry));
  V.apply(G, 'road', road);
  const streets = [];
  const side = (x) => { const c = []; for (let y = ry - 9; y <= ry + 9; y++) if (y !== ry) c.push(I(x, y)); return c; };
  for (let x = 8; x <= 32; x += 4) streets.push(x);
  let built = 0;
  const addStreet = () => { if (built < streets.length) { V.apply(G, 'road', side(streets[built])); built++; } };
  addStreet(); addStreet();
  // Bir sokağın iki yanındaki boş kareler
  const lots = () => {
    const c = V.cache(G), r = [];
    for (let i = 0; i < N * N; i++) if (c.served[i] && !G.z[i] && !G.sv[i] && free(i % N, (i / N) | 0)) r.push(i);
    return r;
  };
  const zoneSome = (tool, k, pick) => { const l = lots().sort(pick).slice(0, k); if (l.length) V.apply(G, tool, l); return l.length; };
  const byX = (a, b) => (a % N) - (b % N);
  const byDist = (a, b) => Math.abs(((a / N) | 0) - ry) - Math.abs(((b / N) | 0) - ry) || byX(a, b);
  zoneSome('res', 10, byDist); zoneSome('farm', 8, (a, b) => byDist(b, a));
  const rows = [];
  for (let m = 0; m < years * 12; m++) {
    for (let d = 0; d < V.DAYS_PER_MONTH; d++) V.step(G);
    const T = V.totals(G), c = V.cache(G);
    const emptyOf = z => c.zones[z].filter(i => c.served[i] && G.lv[i] === 0).length;
    if (T.dFarm > 0 && emptyOf(2) < 2) zoneSome('farm', 6, (a, b) => byDist(b, a));
    if (T.dRes > 0 && emptyOf(1) < 3) zoneSome('res', 6, byDist);
    if (T.dCom > 0 && emptyOf(3) < 2) zoneSome('com', 3, byDist);
    if (lots().length < 12) addStreet();
    // Su: kapsanmayan konutların ortasına çeşme
    const dry = c.zones[1].filter(i => !c.water[i] && G.lv[i] > 0);
    if (dry.length >= 4 && G.money > 300) {
      const i = dry[(dry.length / 2) | 0], x = i % N, y = (i / N) | 0;
      for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0], [1, 1], [2, 0]]) { const r = V.apply(G, 'fountain', [I(x + dx, y + dy)]); if (r.done) break; }
    }
    // Vergi ayarı: borçtaysa yükselt, rahatsa indir
    if (G.money < 500 && G.taxRate < 14) G.taxRate++; else if (G.money > 6000 && G.taxRate > 9) G.taxRate--;
    if ((m + 1) % 12 === 0) {
      const row = { yil: V.dateOf(G).year - 1, nufus: T.P, ciftci: G.grp.c, isci: G.grp.i, issiz: T.uc + T.ui, konut: T.cap, hazine: Math.round(G.money), ayNet: Math.round(G.last.net), gida: G.food.net, mutlu: Math.round(V.avgHap(G)), vergi: G.taxRate };
      rows.push(row);
    }
  }
  if (log) console.table(rows);
  return { G, rows };
}

const { rows } = play(seed, years, true);
if (process.env.CI_CHECK) {
  const last = rows[rows.length - 1], y5 = rows[Math.min(4, rows.length - 1)];
  const fail = [];
  if (y5.nufus < 150) fail.push('5 yılda nüfus çok düşük: ' + y5.nufus);
  if (last.nufus > 6000) fail.push('büyüme çok hızlı: ' + last.nufus);
  if (last.hazine < -500) fail.push('hazine batmış: ' + last.hazine);
  if (last.mutlu < 40) fail.push('memnuniyet çok düşük: ' + last.mutlu);
  if (last.issiz > last.nufus * 0.15) fail.push('işsizlik yüksek: ' + last.issiz);
  // Birkaç farklı haritada da çalışmalı
  for (const s of [1, 2, 3]) { const r = play(s, 5, false).rows; if (r[r.length - 1].nufus < 100) fail.push('tohum ' + s + ' büyümedi: ' + r[r.length - 1].nufus); }
  if (fail.length) { console.error('DENGE HATASI:\n- ' + fail.join('\n- ')); process.exit(1); }
  console.log('denge kontrolü tamam');
}
