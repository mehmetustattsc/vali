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
// --- 0.3: büyük yapılar, afetler, orman, demiryolu ---
{
  const H = V.newGame({ seed: 5 }), N2 = H.N, J = (x, y) => y * N2 + x, ry2 = H.entry.y;
  let g2 = 12; while (![[0, 0], [1, 0], [0, 1], [1, 1]].every(([a, b]) => H.t[J(g2 + a, ry2 - 2 + b)] === 0)) g2++;
  V.apply(H, 'gov', [J(g2, ry2 - 2)]); const rr = []; for (let x = 5; x < g2 + 14; x++) rr.push(J(x, ry2)); V.apply(H, 'road', rr);
  H.money = 1e6;
  // Nüfus şartı: 300 kişi olmadan yuvarlak meydan yok
  const q0 = V.quote(H, 'bigsq', [J(g2 + 4, ry2 + 1)]);
  assert(!q0.ok.length && /300/.test(q0.err), 'yuvarlak meydan nüfus şartı: ' + q0.err);
  // Konut ve tarla ile nüfusu büyüt
  const side = []; for (let y = ry2 - 8; y <= ry2 + 8; y++) if (y !== ry2) for (const x of [g2 + 3, g2 + 8, g2 - 2]) side.push(J(x, y));
  V.apply(H, 'road', side);
  const resZ = [], farmZ = [];
  for (let y = ry2 - 8; y <= ry2 + 8; y++) if (y !== ry2) for (const x of [g2 + 2, g2 + 4, g2 + 7, g2 + 9]) (Math.abs(y - ry2) < 6 ? resZ : farmZ).push(J(x, y));
  for (let y = ry2 - 8; y <= ry2 + 8; y++) if (y !== ry2) for (const x of [g2 - 3, g2 - 1]) farmZ.push(J(x, y));
  V.apply(H, 'res', resZ); V.apply(H, 'farm', farmZ);
  for (const i of resZ.filter((_, k) => k % 9 === 4)) { const n = V.neigh4(H, i).find(j => !H.z[j] && !H.r[j] && H.t[j] !== 1); }
  // Çeşmeler
  for (let y = ry2 - 5; y <= ry2 + 5; y += 5) V.apply(H, 'fountain', [J(g2 + 5, y === ry2 ? y + 1 : y)]);
  for (let d = 0; d < 30 * 36; d++) V.step(H);
  const P2 = V.totals(H).P;
  assert(P2 > 200, '3 yılda nüfus: ' + P2);
  // Değirmen kurulursa kişi başı verim artar
  const y0 = V.totals(H).yieldPP;
  const millSpot = farmZ.map(i => V.neigh4(H, i).find(j => V.quote(H, 'mill', [j]).ok.length)).find(j => j != null);
  assert(millSpot != null && V.apply(H, 'mill', [millSpot]).done, 'değirmen kurulmalı');
  assert(V.totals(H).yieldPP > y0, 'değirmen verimi artırmalı');
  // Yangın: itfaiye yokken yayılır
  const before = H.lv.filter(Boolean).length;
  V.disasters(H, V.totals(H), V.cache(H), 'fire');
  assert(Object.values(H.mark).some(m => m.k === 'burn') && H.lv.filter(Boolean).length < before, 'yangın bina yakmalı');
  // Salgın nüfusu azaltır
  const p0 = V.totals(H).P; V.disasters(H, V.totals(H), V.cache(H), 'plague'); assert(V.totals(H).P < p0, 'salgın');
  // Risk göstergesi
  V.riskOf(H, V.totals(H), V.cache(H)); assert(H.risk && H.risk.fire >= 0 && 'flood' in H.risk, 'risk');
  // Orman kendini yeniler
  { let k = 0; for (let i = 0; i < N2 * N2 && k < 40; i++) if (H.t[i] === V.T_FOREST && !H.z[i] && V.neigh4(H, i).filter(j => H.t[j] === V.T_FOREST).length >= 2) { H.t[i] = V.T_GRASS; k++; } }   // ormanı kes
  const f0 = H.t.filter(t => t === V.T_FOREST).length; for (let d = 0; d < 30 * 12; d++) V.step(H);
  assert(H.t.filter(t => t === V.T_FOREST).length > f0, 'orman yenilenmeli');
  // Kışla bütün haritada asayiş sağlar
  H.grp.i += 400; for (const i of resZ) H.pop[i] += 0;   // nüfus şartını zorla
  let bk = -1; for (let i = 0; i < N2 * N2 && bk < 0; i++) { const q = V.quote(H, 'barracks', [i]); if (q.ok.length === 6 && !q.bad.length) bk = i; }
  if (V.totals(H).P >= 500) { assert(bk >= 0 && V.apply(H, 'barracks', [bk]).done, 'kışla'); assert(V.cache(H).police.every(Boolean), 'kışla asayişi'); }
  // Demiryolu: görev bitince ray ve ana hat
  H.projNext = 1; H.proj = null; H.day = Math.max(H.day, (1861 - 1850) * 360);
  for (let d = 0; d < 60; d++) V.step(H);
  assert(H.proj && V.PROJECTS[H.proj.i].id === 'rail', 'demiryolu görevi');
  let st = -1; for (let i = 0; i < N2 * N2 && st < 0; i++) { const q = V.quote(H, 'site', [i]); if (q.ok.length === 4 && q.ok.some(j => V.cache(H).served[j])) st = i; }
  V.apply(H, 'site', [st]); H.res.demir = 600; H.res.kereste = 600; H.res.komur = 600;
  for (let d = 0; d < 30 * 6; d++) V.step(H);
  assert(H.fx.rail && H.railEntry && H.rl.some(r => r === 2), 'ana hat');
  assert(V.quote(H, 'rail', [J(g2 + 5, ry2 + 1)]).err !== 'Demiryolu görevi bitince açılır', 'ray aracı açılmalı');
  // İstasyondan ana hatta ray: BFS (kaya dışı)
  const m = H.multi.find(q => q.pid === 'rail'), tiles = V.multiTiles(H, m), goal = J(H.railEntry.x + 4, H.railEntry.y);
  const prev = new Map(), q = []; for (const t of tiles) for (const j of V.neigh4(H, t)) if (!prev.has(j) && !H.sv[j]) { prev.set(j, -1); q.push(j); }
  let hitI = -1; while (q.length && hitI < 0) { const i = q.shift(); if (V.neigh4(H, i).includes(goal) || i === goal) { hitI = i; break; } for (const j of V.neigh4(H, i)) if (!prev.has(j) && H.t[j] !== V.T_ROCK && !H.sv[j] && !(H.z[j] && H.lv[j] > 0) && !H.rl[j]) { prev.set(j, i); q.push(j); } }
  const path = []; for (let k = hitI; k !== -1 && k != null; k = prev.get(k)) path.push(k);
  const rr2 = V.apply(H, 'rail', path.filter(i => !H.rl[i])); assert(rr2.done, 'ray döşenmeli');
  assert(V.cache(H).railOut, 'istasyon ana hatta bağlı');
}
// v2 kaydı v3'e taşınır
{
  const o = JSON.parse(V.serialize(G)); o.v = 2; for (const k of ['rl', 'mark', 'opt', 'tv', 'ev', 'risk']) delete o[k];
  const u = V.deserialize(JSON.stringify(o)); assert(u.v === 3 && Array.isArray(u.rl) && u.opt.disasters, 'v2 → v3');
  for (let d = 0; d < 40; d++) V.step(u);
}
console.log('özellik testleri tamam · kömür', Math.round(G.res.komur), '· itibar', G.itibar);
