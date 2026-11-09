/* Vali — arayüz: üst şerit, araçlar, paneller, dokunma ve oyun döngüsü.
   view.js ile aynı modülde derlenir (createView aynı kapsamda). */
const VL = self.Vali;
const $ = (s) => document.querySelector(s);
const fmt = (n) => Math.round(n).toLocaleString('tr-TR');
const sgn = (n) => (n >= 0 ? '+' : '−') + fmt(Math.abs(n));
const SAVE_KEY = 'vali.save.v1';

const ICON = {
  pan: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11.5V4a1.5 1.5 0 0 1 3 0v7.5M14 11.5V5.5a1.5 1.5 0 0 1 3 0v8M17 13v-4.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-1.5a6 6 0 0 1-4.6-2.2L4.4 15a1.6 1.6 0 0 1 2.4-2.1L8 14"/>',
  gov: '<path d="M3 21h18M5 21V10M19 21V10M9 21v-6h6v6M3 10l9-6 9 6M12 4V1.5M12 1.5h3.5v2H12"/>',
  road: '<path d="M7 21 10 3M17 21 14 3M12 6v2M12 11v2M12 16v2"/>',
  res: '<path d="M3 11 12 4l9 7M5 10v10h14V10M10 20v-5h4v5"/>',
  farm: '<path d="M3 20h18M4 20c1-4 3-7 8-7s7 3 8 7M8 13c0-3 1.8-5 4-5s4 2 4 5M12 8V4M12 4c-1.5 0-2.5-1-2.5-2M12 4c1.5 0 2.5-1 2.5-2"/>',
  com: '<path d="M3 9h18l-1.5-5h-15zM4 9v11h16V9M3 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 3 3s3-1.3 3-3M10 20v-5h4v5"/>',
  fountain: '<path d="M4 17h16M6 17v3h12v-3M12 17V9M12 9c-3 0-5 2-5.5 4M12 9c3 0 5 2 5.5 4M9 6c0-2 1.3-3 3-3s3 1 3 3"/>',
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
};
const ico = (k, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;

const TOOL_INFO = {
  pan: { name: 'Gez', tip: 'Haritada gezin, bir yere dokunup bilgisini gör.' },
  gov: { name: 'Valilik', tip: 'Şehrin merkezi. 2×2 alan kaplar, bir kez kurulur.' },
  road: { name: 'Yol', tip: 'Başlangıca, sonra bitişe dokun ya da basılı tutup sürükle. Nehirde köprü olur.' },
  res: { name: 'Konut', tip: 'İki köşeye dokun ya da basılı tutup sürükle. Evler talebe göre kendiliğinden yapılır.' },
  farm: { name: 'Tarla', tip: 'Tarla alanı: şehri besler, fazlası satılır.' },
  com: { name: 'Ticaret', tip: 'Dükkân ve atölyeler: işçilere iş, şehre ticaret vergisi.' },
  fountain: { name: 'Çeşme', tip: 'Çevresine su verir. Su olmadan evler büyümez.' },
  bulldoze: { name: 'Yık', tip: 'Yolu, alanı ya da binayı kaldırır.' },
};
const LV_NAME = { 1: ['', 'Kulübe', 'Ev', 'Konak'], 2: ['', 'Tarla', 'Çiftlik'], 3: ['', 'Dükkân', 'Çarşı', 'Han'] };
const ZONE_NAME = { 1: 'Konut alanı', 2: 'Tarla alanı', 3: 'Ticaret alanı' };
const SPEEDS = [0, 1, 2, 4];

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
function save() { try { if (G && G.gov) localStorage.setItem(SAVE_KEY, VL.serialize(G)); } catch (e) { /* depolama kapalı olabilir */ } }
function loadSave() { try { const s = localStorage.getItem(SAVE_KEY); return s ? VL.deserialize(s) : null; } catch (e) { return null; } }

/* ---------- arayüz iskeleti ---------- */
function buildChrome() {
  $('#tools').innerHTML = ['pan', 'gov', 'road', 'res', 'farm', 'com', 'fountain', 'bulldoze'].map(k =>
    `<button class="tool t-${k}" data-tool="${k}" aria-label="${TOOL_INFO[k].name}">${ico(k)}<span>${TOOL_INFO[k].name}</span></button>`).join('');
  $('#tools').addEventListener('click', e => { const b = e.target.closest('[data-tool]'); if (b) setTool(b.dataset.tool === tool && tool !== 'pan' ? 'pan' : b.dataset.tool); });
  $('#speeds').innerHTML = SPEEDS.map((s, k) => `<button data-s="${k}" aria-label="${s ? s + ' kat hız' : 'Duraklat'}">${s ? '<i></i>'.repeat(s === 4 ? 3 : s) : ico('pause')}</button>`).join('');
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
}

function setTool(t) {
  if (t === 'gov' && G.gov) t = 'pan';
  tool = t;
  document.querySelectorAll('#tools .tool').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  $('#tools .t-gov').hidden = !!G.gov;
  clearPlan();
  view.setOverlay(t === 'fountain' || t === 'res' ? 'water' : (overlayPinned ? 'water' : null));
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
  if (T.P >= 25 && !c.fountains) return 'Konutların arasına bir Çeşme kur: su olmadan evler büyümez.';
  if (T.P >= 60 && !c.zones[3].length) return 'Kasaba büyüyor: yol kenarına Ticaret (mavi) alanı çiz.';
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
  $('#tools .t-gov').hidden = !!G.gov;
  $('#money b').textContent = fmt(G.money);
  const net = G.last.net || 0;
  const sm = $('#money small'); sm.textContent = G.gov ? sgn(net) + '/ay' : ''; sm.className = net < 0 ? 'neg' : 'pos';
  $('#money').classList.toggle('debt', G.money < 0);
  $('#popb b').textContent = fmt(T.P);
  const h = Math.round(VL.avgHap(G)); $('#hapb b').textContent = T.P ? '%' + h : '—';
  $('#hapb').dataset.mood = !T.P ? '' : h >= 65 ? 'good' : h >= 45 ? 'ok' : 'bad';
  const bar = (d) => Math.max(-1, Math.min(1, Math.tanh(d / 12)));
  const set = (sel, d) => { const el = $(sel), v = bar(d); el.style.setProperty('--v', Math.abs(v)); el.classList.toggle('neg', v < 0); };
  set('#dR i', T.dRes); set('#dF i', T.dFarm); set('#dC i', T.dCom);
  if (panelKind === 'budget' || panelKind === 'city') renderPanel();
  if (panelKind === 'tile' && selected >= 0) renderPanel();
}

/* ---------- paneller ---------- */
let overlayPinned = false;
function togglePanel(kind) { if (panelKind === kind) closePanel(); else { panelKind = kind; renderPanel(); $('#panel').hidden = false; $('#app').classList.add('with-panel'); } }
function closePanel() { panelKind = null; $('#panel').hidden = true; $('#app').classList.remove('with-panel'); if (selected >= 0) { selected = -1; view.select(-1); } }

function renderPanel() {
  const head = $('#panel h2'), body = $('#panel .body');
  if (panelKind === 'budget') { head.textContent = 'Bütçe'; body.innerHTML = budgetHtml(); bindBudget(); }
  else if (panelKind === 'city') { head.textContent = 'Şehir'; body.innerHTML = cityHtml(); }
  else if (panelKind === 'game') { head.textContent = 'Menü'; body.innerHTML = gameHtml(); bindGame(); }
  else if (panelKind === 'tile') { const t = tileInfo(selected); head.textContent = t.title; body.innerHTML = t.html; }
}

function row(label, val, cls = '') { return `<div class="row ${cls}"><span>${label}</span><b>${val}</b></div>`; }

function budgetHtml() {
  const L = G.last, i = L.inc || {}, e = L.exp || {};
  const v = (x) => x ? sgn(x) : '0';
  return `<p class="lead">Geçen ayın hesabı. Vergi oranını buradan değiştirebilirsin.</p>
  <h3>Gelir</h3>
  ${row('Çiftçilerden vergi', v(i.taxC || 0))}${row('İşçilerden vergi', v(i.taxI || 0))}${row('Ticaret vergisi', v(i.taxCom || 0))}${row('Gıda satışı', v(i.trade || 0))}
  <h3>Gider</h3>
  ${row('Yolların bakımı', v(-(e.roads || 0)))}${row('Köprüler', v(-(e.bridges || 0)))}${row('Valilik', v(-(e.gov || 0)))}${row('Çeşmeler', v(-(e.fountains || 0)))}
  ${row('Aylık net', sgn(L.net || 0) + ' ', (L.net || 0) < 0 ? 'total neg' : 'total')}
  <h3>Vergi oranı <output id="taxOut">%${G.taxRate}</output></h3>
  <input id="tax" type="range" min="0" max="${VL.B.maxTax}" step="1" value="${G.taxRate}">
  <p class="note" id="taxNote">${taxNote()}</p>`;
}
function taxNote() {
  const d = G.taxRate - VL.B.taxNeutral;
  if (d === 0) return 'Halk bu orandan memnun.';
  return d > 0 ? `Yüksek vergi memnuniyeti yaklaşık ${d * 2} puan düşürür.` : `Düşük vergi memnuniyeti yaklaşık ${Math.round(-d * 1.4)} puan artırır, gelir azalır.`;
}
function bindBudget() {
  const r = $('#tax'); if (!r) return;
  r.oninput = () => { G.taxRate = +r.value; $('#taxOut').textContent = '%' + G.taxRate; $('#taxNote').textContent = taxNote(); };
}

const FACTOR = { base: 'Temel', water: 'Su', jobs: 'İş', tax: 'Vergi', food: 'Gıda', market: 'Pazar', gov: 'Valilik' };
function cityHtml() {
  const T = VL.totals(G);
  const grp = (g, name, jobs) => {
    const n = G.grp[g], un = Math.max(0, n - jobs), f = G.hf[g] || {};
    const fs = Object.keys(FACTOR).filter(k => f[k] != null && k !== 'base').map(k => `<span class="chip ${f[k] < 0 ? 'neg' : f[k] > 0 ? 'pos' : ''}">${FACTOR[k]} ${f[k] > 0 ? '+' : ''}${f[k]}</span>`).join('');
    return `<div class="grp"><div class="grp-h"><b>${name}</b><span>${fmt(n)} kişi</span><span class="mood">%${Math.round(G.hap[g])}</span></div>
      ${row('Geçindiren iş', fmt(jobs))}${row('İşsiz', fmt(un), un > 0 ? 'neg' : '')}
      <div class="chips">${fs || '<span class="note">Ay sonunda hesaplanır</span>'}</div></div>`;
  };
  const dem = (d) => d > 2 ? 'Yüksek' : d > 0 ? 'Var' : d > -6 ? 'Dengede' : 'Yok';
  return `${grp('c', 'Çiftçiler', T.farmJobs)}${grp('i', 'İşçiler', T.workJobs)}
  <h3>Gıda (aylık)</h3>${row('Üretim', fmt(G.food.prod))}${row('Tüketim', fmt(G.food.cons))}${row(G.food.net >= 0 ? 'Fazla (satılır)' : 'Açık', sgn(G.food.net), G.food.net < 0 ? 'neg' : '')}
  <h3>Talep</h3>${row('Konut', dem(T.dRes))}${row('Tarla', dem(T.dFarm))}${row('Ticaret', dem(T.dCom))}
  ${row('Bölgenin talebi', T.outside ? fmt(G.reg) : 'Dış yol yok', T.outside ? '' : 'neg')}
  <p class="note">Bölge talebi, çevredeki köy ve kasabaların ürünlerine ilgisidir. Memnun bir şehirde zamanla artar.</p>`;
}

function gameHtml() {
  return `${canFull() && !installed() ? `<button class="wide" id="gFull">${ico('full')} ${isFull() ? 'Tam ekrandan çık' : 'Tam ekran'}</button>` : ''}
  <button class="wide" id="gSave">Kaydet</button>
  <button class="wide ${overlayPinned ? 'on' : ''}" id="gWater">${ico('layers')} Su kapsama katmanı</button>
  <button class="wide" id="gMenu">Ana menü</button>
  <p class="note">Oyun her ay ve uygulamadan çıkarken kendiliğinden kaydedilir.</p>
  <p class="note">Tek parmakla haritayı kaydır, iki parmakla yakınlaştır ve döndür. İnşa ederken iki noktaya dokun ya da basılı tutup sürükle, sonra ✓ ile onayla. Bilgisayarda sürükleyerek çiz, Enter ile onayla, sağ tıkla döndür.</p>
  <p class="note small">Vali · prototip 1 · ${VL.dateText(G)}</p>`;
}
function bindGame() {
  $('#gSave').onclick = () => { save(); toast('Kaydedildi.'); };
  if ($('#gFull')) $('#gFull').onclick = () => { fullscreen(!isFull()); setTimeout(renderPanel, 400); };
  $('#gWater').onclick = () => { overlayPinned = !overlayPinned; setTool(tool); renderPanel(); };
  $('#gMenu').onclick = () => { save(); closePanel(); setSpeed(0); showMenu(!!loadSave()); };
}

function tileInfo(i) {
  const N = G.N, c = VL.cache(G), x = i % N, y = (i / N) | 0;
  const t = G.t[i], z = G.z[i], lv = G.lv[i];
  const yes = (b) => b ? 'Var' : '<span class="neg">Yok</span>';
  if (G.sv[i] === VL.S_GOV) return { title: 'Valilik', html: `${row('İş', VL.B.govJobs + ' kişiyi geçindirir')}${row('Aylık gider', fmt(VL.B.upkeep.gov))}${row('Dış yola bağlantı', yes(c.outside))}<p class="note">Şehrin yönetim merkezi. Bütün yollar buraya bağlı olmalı.</p>` };
  if (G.sv[i] === VL.S_FOUNTAIN) return { title: 'Çeşme', html: `${row('Su yarıçapı', VL.B.fountainRadius + ' kare')}${row('Aylık gider', fmt(VL.B.upkeep.fountain))}<p class="note">Çevresindeki evler suya kavuşur ve büyüyebilir.</p>` };
  if (G.r[i]) {
    if (G.r[i] === 2) return { title: 'Dış yol', html: '<p class="note">Kasabaya göçmenler ve tüccarlar bu yoldan gelir. Şehrin yol ağını buraya bağla.</p>' };
    return { title: t === VL.T_WATER ? 'Köprü' : 'Yol', html: `${row('Aylık bakım', fmt(t === VL.T_WATER ? VL.B.upkeep.bridge : VL.B.upkeep.road))}${row('Ağa bağlı', yes(c.net[i]))}` };
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
    return { title: (building ? name + ' (yapılıyor)' : name), html: h };
  }
  const tn = ['Çayır', 'Nehir', 'Orman', 'Dağ'][t];
  const note = t === VL.T_FOREST ? 'Ormanı açmak biraz daha pahalıdır.' : t === VL.T_ROCK ? 'Dağlık arazide yapı yapılamaz.' : t === VL.T_WATER ? 'Yol aracıyla köprü kurulabilir.' : 'Boş arazi.';
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
      }, 320);
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
    else if (e.key === '1' || e.key === '2' || e.key === '3') setSpeed(+e.key === 3 ? 3 : +e.key);
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
const single = () => tool === 'gov' || tool === 'fountain';
function tapBuild(t) {
  if (t < 0) return;
  if (single()) { setPlan(t, t); return; }
  if (plan && anchor < 0) { anchor = t; plan = null; showDraft(t, t, 'Bitiş noktasına dokun · aynı kareye dokunursan tek kare'); return; }
  if (anchor < 0) { anchor = t; showDraft(t, t, 'Bitiş noktasına dokun · aynı kareye dokunursan tek kare'); return; }
  const a = anchor; anchor = -1; setPlan(a, t);
}
function showDraft(a, b, msg) {
  const cells = paintCells(a, b); if (!cells.length) return;
  const q = VL.quote(G, tool, cells);
  view.setPreview(q.ok, q.bad);
  hintOverride = msg || quoteText(q); showHint();
  $('#plan').hidden = true;
}
function quoteText(q) {
  const cant = q.cost > G.money;
  return q.ok.length && !(tool === 'gov' && q.bad.length)
    ? `${TOOL_INFO[tool].name} · ${q.ok.length} kare · <b class="${cant ? 'neg' : ''}">${fmt(q.cost)}</b>${cant ? ' · para yetmiyor' : ''}`
    : `<span class="neg">${q.err || 'Buraya yapılamaz'}</span>`;
}
function setPlan(a, b) {
  if (a < 0 || b < 0) { clearPlan(); return; }
  plan = { a, b, tool };
  const q = VL.quote(G, tool, paintCells(a, b));
  view.setPreview(q.ok, q.bad);
  const ok = q.ok.length && !(tool === 'gov' && q.bad.length) && q.cost <= G.money;
  $('#plan .cost').innerHTML = quoteText(q);
  $('#plan .yes').disabled = !ok;
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
  const { a, b } = plan, t = tool, r = VL.apply(G, t, paintCells(a, b));
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
  if (tool === 'gov' || tool === 'fountain') return [b];
  const ax = a % N, ay = (a / N) | 0, bx = b % N, by = (b / N) | 0, out = [];
  if (tool === 'road') {
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
  const maps = [['river', 'Nehir kenarı', true], ['flat', 'Geniş ova'], ['mount', 'Dağlık'], ['lake', 'Büyük göl'], ['sea', 'Deniz kıyısı']];
  const years = [[1850, true], [1900], [1950], [2000], [2026]];
  m.innerHTML = `<div class="menu-card">
    <h1>Vali</h1><p class="sub">Şehrini 1850'den kur, büyüt, yönet.</p>
    <div class="menu-actions">
      ${hasSave ? '<button class="primary" id="mCont">Devam et</button>' : ''}
      <button class="${hasSave ? '' : 'primary'}" id="mNew">Yeni şehir</button>
    </div>
    <div class="setup" hidden>
      <h3>Harita</h3><div class="cards">${maps.map(([k, n, ok]) => `<button class="card ${ok ? 'on' : ''}" ${ok ? '' : 'disabled'} data-map="${k}"><i class="map-${k}"></i><span>${n}</span>${ok ? '' : '<em>Yakında</em>'}</button>`).join('')}</div>
      <h3>Başlangıç yılı</h3><div class="chips">${years.map(([y, ok]) => `<button class="chip ${ok ? 'on' : ''}" ${ok ? '' : 'disabled'}>${y}${ok ? '' : ' · yakında'}</button>`).join('')}</div>
      <button class="primary" id="mGo">Şehri kur</button>
    </div></div>`;
  if (hasSave) $('#mCont').onclick = () => { fullscreen(true); startGame(loadSave() || G); };
  $('#mNew').onclick = () => { m.querySelector('.setup').hidden = false; m.querySelector('.menu-actions').hidden = true; };
  $('#mGo').onclick = () => { fullscreen(true); startGame(VL.newGame({ seed: (Date.now() % 9973) + 1 })); };
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
    const dayMs = 2000;   // 1x: bir gün 2 saniye, bir ay 1 dakika
    let n = 0;
    while (acc >= dayMs && n < 6) { VL.step(G); acc -= dayMs; n++; }
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
