/* Yeni özelliklerin işlevsel testi: üretim, hizmet kapsaması, görev akışı, eski kayıt taşıma. */
const V = require('../src/engine.js');
const assert = (c, m) => { if (!c) { console.error('HATA: ' + m); process.exit(1); } };
const G = V.newGame({ seed: 11 });
const N = G.N, I = (x, y) => y * N + x, ry = G.entry.y;
// Valilik ve dış yola bağlantı
let gx = 12; const land = (x, y) => G.t[I(x, y)] === 0 || G.t[I(x, y)] === 2;
while (![[0, 0], [1, 0], [0, 1], [1, 1]].every(([a, b]) => land(gx + a, ry - 2 + b))) gx++;
assert(V.apply(G, 'gov', [I(gx, ry - 2)]).done, 'valilik');
const road = []; for (let x = 5; x < gx + 3; x++) road.push(I(x, ry)); V.apply(G, 'road', road);
assert(V.cache(G).outside, 'dış yol bağlantısı');
// Yatak sayısı
const coal = G.dep.filter(d => d === V.D_COAL).length, iron = G.dep.filter(d => d === V.D_IRON).length;
assert(coal >= 4 && iron >= 3, 'yataklar: ' + coal + '/' + iron);
// Bir yatağa yol çek: BFS ile karadan bir kömür yatağının yanına
function pathTo(target) {
  const prev = new Map([[I(gx + 2, ry), -1]]), q = [I(gx + 2, ry)];
  while (q.length) { const i = q.shift(); if (V.neigh4(G, i).some(j => target(j))) { const p = []; let k = i; while (k !== -1) { p.push(k); k = prev.get(k); } return p; }
    for (const j of V.neigh4(G, i)) if (!prev.has(j) && G.t[j] !== V.T_ROCK && G.t[j] !== V.T_WATER || (!prev.has(j) && G.t[j] === V.T_WATER)) { if (G.t[j] === V.T_ROCK) continue; prev.set(j, i); q.push(j); } }
  return null;
}
G.money = 1e6;
const p = pathTo(j => G.dep[j] === V.D_COAL);
assert(p, 'kömüre yol bulunmalı');
V.apply(G, 'road', p.filter(i => !G.r[i]));
const end = p[0], spot = V.neigh4(G, end).find(j => G.t[j] !== V.T_ROCK && G.t[j] !== V.T_WATER && !G.r[j] && V.resourceFactor(G, j, 'coal') > 0)
  || [end - N - 1, end - N + 1, end + N - 1, end + N + 1].find(j => j >= 0 && G.t[j] !== V.T_ROCK && G.t[j] !== V.T_WATER && !G.r[j] && V.resourceFactor(G, j, 'coal') > 0);
assert(spot != null, 'kömür ocağı yeri');
const r = V.apply(G, 'coal', [spot]); assert(r.done, 'kömür ocağı kurulmalı: ' + JSON.stringify(V.quote(G, 'coal', [spot])));
// Yerleşim: işçi gelsin
const res = []; for (let y = ry - 3; y <= ry + 3; y++) for (const x of [gx - 2, gx - 3]) if (y !== ry) res.push(I(x, y));
const side = []; for (let y = ry - 4; y <= ry + 4; y++) if (y !== ry) side.push(I(gx - 1, y), I(gx - 4, y));
V.apply(G, 'road', side); V.apply(G, 'res', res);
for (let d = 0; d < 30 * 14; d++) V.step(G);
assert(G.res.komur > 0, 'kömür üretilmeli: ' + JSON.stringify(G.made));
assert(G.proj && V.PROJECTS[G.proj.i].id === 'aqueduct', '1851 görevi başlamalı');
// Karakol kapsaması memnuniyete girer
assert('safety' in G.hf.i, 'asayiş etkeni');
// Şantiye ve teslimat
let s2 = -1; for (let i = 0; i < N * N && s2 < 0; i++) { const q = V.quote(G, 'site', [i]); if (!q.bad.length && q.ok.length === 4 && q.ok.some(j => V.cache(G).served[j])) s2 = i; }
assert(s2 >= 0, 'şantiye yeri');
assert(V.apply(G, 'site', [s2]).done, 'şantiye kurulmalı');
G.res.tas = 600; G.res.kereste = 600;
for (let d = 0; d < 30 * 6; d++) V.step(G);
assert(G.done.length === 1 && G.fx.aqueduct, 'su kemeri bitmeli: ' + JSON.stringify(G.proj));
assert(G.sv[s2] === V.S_LANDMARK, 'anıt yerinde');
// Kayıt: eski sürüm taşınır
const old = JSON.parse(V.serialize(G)); old.v = 1; delete old.dep; delete old.res; delete old.multi; delete old.proj; delete old.projNext; delete old.done; delete old.itibar; delete old.fx;
const up = V.deserialize(JSON.stringify(old));
assert(up && up.v === V.VERSION && Array.isArray(up.dep) && up.res && up.multi && up.projNext === 0, 'v1 kayıt taşınmalı');
for (let d = 0; d < 60; d++) V.step(up);
assert(up.proj, 'taşınan kayıtta görev başlamalı');
console.log('özellik testleri tamam · kömür', Math.round(G.res.komur), '· itibar', G.itibar);
