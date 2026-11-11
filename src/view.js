/* Vali — 3D görünüm (Three.js). Durumu değiştirmez; G'yi okuyup çizer.
   Kare (x,y) dünyada (x - N/2 + .5, 0, y - N/2 + .5) noktasına düşer. */
import * as THREE from 'three';

const V = self.Vali;
const C = (h) => new THREE.Color(h);
const pick = (arr, r) => arr[Math.floor(r * arr.length) % arr.length];

const PAL = {
  grass: ['#86b55e', '#80af58', '#8cba63', '#7caa55'], forestFloor: '#5d8c43',
  bed: '#43605f', bank: '#8c7552', skirt: '#6b5a44', skirtDark: '#4e4132',
  rock: ['#9a9188', '#8e857b', '#a59c90'], snow: '#eef1f2',
  roadDirt: '#b4936a', roadStone: '#a39a86', bridge: '#8a6845', rail: '#6d5134',
  wall: ['#ece0c4', '#e6d4b3', '#dccaa6', '#f0e7d3'], roof: ['#a9553a', '#9b4a33', '#b8673f', '#7f4b3a'],
  wall3: ['#dac5a7', '#cbb391', '#e2cfb2', '#c1ab8c'], roof3: ['#5f5852', '#6c4b3b', '#555e66'],
  comWall: ['#d9cba9', '#cfbc98', '#e3d6ba'], comRoof: ['#5b6b78', '#4f5d68', '#66717a'],
  awning: ['#c0392b', '#2e86c1', '#27ae60', '#d4ac0d', '#8e44ad'],
  timber: '#c9a56f', barn: '#9c3b2e', barnRoof: '#4a3b34', silo: '#c7c2b8', hay: '#d8b85a',
  stone: '#bdb5a5', waterLit: '#5aa6d6', crimson: '#b0262f', govWall: '#efe6d2', govRoof: '#7b3f2e',
  leaf: ['#3f7a3a', '#4c8a3f', '#356b35', '#5a9446', '#2f6431'], trunk: '#6e4f33',
  zone: { 1: '#4cbf6a', 2: '#e6c445', 3: '#4a90e2' },
};
// Mevsime göre tarla rengi (ay 0 = Ocak)
const FIELD = ['#7d6a4c', '#7d6a4c', '#8a8f4e', '#7fa84a', '#79b048', '#a6b84c', '#cdb756', '#d9b24f', '#c99f4a', '#9a7d4c', '#86704c', '#7d6a4c'];

export function createView(canvas, G0) {
  let G = G0, N = G.N;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const scene = new THREE.Scene();
  const sky = C('#cfe2ec');
  scene.background = sky;
  scene.fog = new THREE.Fog(sky, 80, 210);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.3, 400);

  const hemi = new THREE.HemisphereLight('#e6f1ff', '#8a7a5a', 1.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff0d4', 2.1);
  sun.castShadow = true;
  const small = Math.min(innerWidth, innerHeight) < 600;
  sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02;
  scene.add(sun); scene.add(sun.target);
  const SUN_DIR = new THREE.Vector3(-0.55, 1, 0.35).normalize();

  const world = new THREE.Group(); scene.add(world);
  const W = (x) => x - N / 2 + 0.5;               // kare -> dünya

  /* ---------- ortak geometri ---------- */
  const geo = {
    box: new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    roof: prismGeometry(),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10).translate(0, 0.5, 0),
    cone: new THREE.ConeGeometry(0.5, 1, 6).translate(0, 0.5, 0),
    blob: new THREE.IcosahedronGeometry(0.5, 0).translate(0, 0.5, 0),
    pyr: new THREE.ConeGeometry(0.71, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0),
  };
  const lam = (o) => new THREE.MeshLambertMaterial(Object.assign({ flatShading: true }, o));
  function pool(g, cap, shadow = true) {
    const m = new THREE.InstancedMesh(g, lam({}), cap);
    m.count = 0; m.frustumCulled = false; m.castShadow = shadow; m.receiveShadow = true;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    world.add(m); return m;
  }
  // Statik (ağaçlar) ve dinamik (binalar) havuzlar ayrı: binalar her gün yenilenir, ağaçlar sadece değişince
  const P = {
    tCone: pool(geo.cone, 9000), tBlob: pool(geo.blob, 4000), tTrunk: pool(geo.box, 13000),
    box: pool(geo.box, 16000), roof: pool(geo.roof, 10000), cyl: pool(geo.cyl, 1500), cone: pool(geo.cone, 1500), pyr: pool(geo.pyr, 200),
    agent: pool(geo.box, 300, false), train: pool(geo.box, 60, true), bridge: pool(geo.box, 3000, true), boat: pool(geo.box, 40, true),
  };
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), T = new THREE.Vector3(), E = new THREE.Euler(), COL = new THREE.Color();
  const UP = new THREE.Vector3(0, 1, 0);
  function put(p, x, y, z, sx, sy, sz, rot, color) {
    const k = p.count; if (k >= p.instanceMatrix.count) return;
    Q.setFromAxisAngle(UP, rot); T.set(x, y, z); S.set(sx, sy, sz);
    M.compose(T, Q, S); p.setMatrixAt(k, M);
    p.setColorAt(k, COL.set(color)); p.count = k + 1;
  }
  function flush(p) { p.instanceMatrix.needsUpdate = true; if (p.instanceColor) p.instanceColor.needsUpdate = true; }

  /* Bina parçası: kare merkezine göre yerel (lx, lz), yönle döndürülmüş */
  function part(p, cx, cz, rot, lx, ly, lz, sx, sy, sz, color) {
    const c = Math.cos(rot), s = Math.sin(rot);
    put(p, cx + lx * c + lz * s, ly, cz - lx * s + lz * c, sx, sy, sz, rot, color);
  }

  /* ---------- arazi ---------- */
  let terrain = null, water = null;
  function buildTerrain() {
    if (terrain) { world.remove(terrain); terrain.geometry.dispose(); }
    if (water) { world.remove(water); water.geometry.dispose(); }
    const pos = [], col = [], wpos = [];
    const quad = (ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, color) => {
      pos.push(ax, ay, az, bx, by, bz, cx, cy, cz, ax, ay, az, cx, cy, cz, dx, dy, dz);
      for (let k = 0; k < 6; k++) col.push(color.r, color.g, color.b);
    };
    const hOf = (x, y) => {
      if (x < 0 || y < 0 || x >= N || y >= N) return -1.4;
      const i = y * N + x, t = G.t[i];
      return t === V.T_WATER ? -0.42 : t === V.T_ROCK ? G.h[i] * 0.45 : 0;
    };
    const cc = new THREE.Color();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, t = G.t[i], h = hOf(x, y), r = V.hash2(x, y, G.seed);
      const x0 = x - N / 2, x1 = x0 + 1, z0 = y - N / 2, z1 = z0 + 1;
      if (t === V.T_WATER) { cc.set(PAL.bed); wpos.push(x0, -0.13, z0, x0, -0.13, z1, x1, -0.13, z1, x0, -0.13, z0, x1, -0.13, z1, x1, -0.13, z0); }
      else if (t === V.T_ROCK && G.dep && G.dep[i]) cc.set(G.dep[i] === V.D_COAL ? '#3a3735' : '#a25a36').offsetHSL(0, 0, (r - 0.5) * 0.05);
      else if (t === V.T_ROCK) cc.set(G.h[i] >= 5 ? PAL.snow : pick(PAL.rock, r)).offsetHSL(0, 0, (r - 0.5) * 0.05);
      else if (t === V.T_FOREST) cc.set(PAL.forestFloor).offsetHSL(0, 0, (r - 0.5) * 0.02);
      else cc.set(PAL.grass[0]).offsetHSL((V.fbm(x / 9, y / 9, G.seed + 31) - 0.5) * 0.04, 0, (V.fbm(x / 6, y / 6, G.seed + 17) - 0.5) * 0.09 + (r - 0.5) * 0.012);
      quad(x0, h, z0, x0, h, z1, x1, h, z1, x1, h, z0, cc);
      // Yan duvarlar: komşu daha alçaksa aşağı iner
      const side = (nx, ny, ax, az, bx, bz) => {
        const nh = hOf(nx, ny); if (nh >= h) return;
        const wc = new THREE.Color(t === V.T_ROCK ? '#7d746a' : nh < -1 ? PAL.skirt : PAL.bank);
        if (t === V.T_ROCK) wc.offsetHSL(0, 0, -0.04);
        quad(bx, h, bz, ax, h, az, ax, nh, az, bx, nh, bz, wc);
        if (nh < -1) { const dc = new THREE.Color(PAL.skirtDark); quad(bx, -0.9, bz, ax, -0.9, az, ax, -1.4, az, bx, -1.4, bz, dc); }
      };
      side(x, y - 1, x1, z0, x0, z0); side(x, y + 1, x0, z1, x1, z1);
      side(x - 1, y, x0, z0, x0, z1); side(x + 1, y, x1, z1, x1, z0);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.computeVertexNormals();
    terrain = new THREE.Mesh(g, lam({ vertexColors: true }));
    terrain.receiveShadow = true; world.add(terrain);
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute(wpos, 3)); wg.computeVertexNormals();
    water = new THREE.Mesh(wg, new THREE.MeshPhongMaterial({ color: PAL.waterLit, transparent: true, opacity: 0.84, shininess: 90, specular: '#cfe8ff' }));
    water.receiveShadow = true; world.add(water);
  }

  /* ---------- düz katmanlar: yol, bölge, tarla ---------- */
  const flat = {};
  function flatMesh(key, mat, build) {
    if (flat[key]) { world.remove(flat[key]); flat[key].geometry.dispose(); }
    const pos = [], col = [], uv = [];
    // Serbest dörtgen (a,b,c,d çevre sırasıyla), yüzü yukarı bakacak şekilde
    const quad4 = (ax, az, bx, bz, cx, cz, dx, dz, y, color) => {
      if ((bz - az) * (cx - ax) - (bx - ax) * (cz - az) < 0) { [bx, bz, dx, dz] = [dx, dz, bx, bz]; }
      pos.push(ax, y, az, bx, y, bz, cx, y, cz, ax, y, az, cx, y, cz, dx, y, dz);
      for (let k = 0; k < 6; k++) col.push(color.r, color.g, color.b);
      uv.push(0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0);
    };
    build((x0, z0, x1, z1, y, color, u) => {
      pos.push(x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0);
      for (let k = 0; k < 6; k++) col.push(color.r, color.g, color.b);
      if (u) uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);    // döndürülmüş sıralar
      else uv.push(0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0);
    }, quad4);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.frustumCulled = false;
    flat[key] = m; world.add(m); return m;
  }
  const roadMat = lam({ vertexColors: true, flatShading: false });
  const zoneMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.38, depthWrite: false });
  const fieldTex = makeFieldTexture();
  const fieldMat = lam({ vertexColors: true, map: fieldTex, flatShading: false });

  /* Şerit çizici: bir karedeki bağlantılara göre düz kollar ya da iki dik bağlantıda yuvarlak köşe.
     DIRS: kuzey, doğu, güney, batı. offs: şeridin ekseninden kaymalar (raylar için ±). */
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  function band(q, quad4, cx, cz, links, w, y, color, offs = [0]) {
    const on = links.map(Boolean), n = on.filter(Boolean).length;
    const corner = n === 2 && ((on[0] && on[1]) || (on[1] && on[2]) || (on[2] && on[3]) || (on[3] && on[0]));
    if (corner) {
      const p = [0, 1, 2, 3].find(k => on[k] && on[(k + 1) % 4]), A = DIRS[p], Bd = DIRS[(p + 1) % 4];
      const ox = cx + (A[0] + Bd[0]) * 0.5, oz = cz + (A[1] + Bd[1]) * 0.5;      // köşe noktası
      const t0 = Math.atan2(-Bd[1], -Bd[0]), t1 = Math.atan2(-A[1], -A[0]);
      let d = t1 - t0; if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
      for (const o of offs) for (let k = 0; k < 8; k++) {
        const u0 = t0 + d * k / 8, u1 = t0 + d * (k + 1) / 8, r0 = 0.5 + o - w, r1 = 0.5 + o + w;
        quad4(ox + Math.cos(u0) * r0, oz + Math.sin(u0) * r0, ox + Math.cos(u0) * r1, oz + Math.sin(u0) * r1,
          ox + Math.cos(u1) * r1, oz + Math.sin(u1) * r1, ox + Math.cos(u1) * r0, oz + Math.sin(u1) * r0, y, color);
      }
      return;
    }
    for (const o of offs) {
      if (o === 0) {           // tek şerit: merkez kare ve bağlantı kolları
        q(cx - w, cz - w, cx + w, cz + w, y, color);
        if (on[0]) q(cx - w, cz - 0.5, cx + w, cz - w, y, color);
        if (on[2]) q(cx - w, cz + w, cx + w, cz + 0.5, y, color);
        if (on[3]) q(cx - 0.5, cz - w, cx - w, cz + w, y, color);
        if (on[1]) q(cx + w, cz - w, cx + 0.5, cz + w, y, color);
        continue;
      }
      // ray çifti: her eksende ayrı
      const v = on[0] || on[2], h = on[1] || on[3] || !v;
      if (v) q(cx + o - w, cz - (on[0] ? 0.5 : 0.22), cx + o + w, cz + (on[2] ? 0.5 : 0.22), y, color);
      if (h) q(cx - (on[3] ? 0.5 : 0.22), cz + o - w, cx + (on[1] ? 0.5 : 0.22), cz + o + w, y, color);
    }
  }
  function linksOf(arr, x, y, extEdge) {
    const L = (nx, ny) => (nx >= 0 && ny >= 0 && nx < N && ny < N) ? !!arr[ny * N + nx] : extEdge && nx < 0;
    return [L(x, y - 1), L(x + 1, y), L(x, y + 1), L(x - 1, y)];
  }
  const DECK = 0.2;   // köprü tablası yüksekliği
  function buildRoads() {
    const cc = new THREE.Color(), rail = new THREE.Color('#8e877b'), steel = new THREE.Color('#4b4846'), wood = new THREE.Color('#7a5a3a');
    P.bridge.count = 0;
    flatMesh('road', roadMat, (q, quad4) => {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const i = y * N + x, onWater = G.t[i] === V.T_WATER, over = !onWater && G.t[i] !== V.T_ROCK && G.r[i] && G.rl && G.rl[i];   // ray üstünden üst geçit
        if (G.r[i]) {
          cc.set(onWater || over ? '#b3a68b' : G.r[i] === 2 ? PAL.roadStone : PAL.roadDirt);
          const L = linksOf(G.r, x, y, G.r[i] === 2);
          band(q, quad4, W(x), W(y), L, 0.29, onWater || over ? DECK + 0.002 : 0.014, cc);
          if (onWater) bridgeTile(x, y, L, 'stone');
          else if (over) overpass(x, y, L);
          else rampTo(q, x, y, G.r, 0.29, 0.014, cc);
        }
        portals(x, y);
        if (G.rl && G.rl[i]) {
          const L = linksOf(G.rl, x, y, G.rl[i] === 2), y0 = onWater ? DECK + 0.012 : 0.022;
          band(q, quad4, W(x), W(y), L, 0.22, y0, onWater ? wood : rail);
          band(q, quad4, W(x), W(y), L, 0.022, y0 + 0.012, steel, [-0.11, 0.11]);
          if (onWater && !G.r[i]) bridgeTile(x, y, L, 'iron');
        }
      }
    });
    flush(P.bridge);
  }
  /* Köprü: taş ayaklar, tabla ve korkuluk; demiryolu köprüsü demir kafesli */
  function bridgeTile(x, y, L, kind) {
    const cx = W(x), cz = W(y), along = (L[1] || L[3]) && !(L[0] || L[2]) ? 0 : Math.PI / 2;   // 0: doğu-batı
    const stone = '#c2b69c', dark = '#8f8470', iron = '#55504a';
    put(P.bridge, cx, DECK - 0.07, cz, 1.0, 0.07, 0.72, along, kind === 'iron' ? '#6e655a' : stone);          // tabla
    for (const s of [-0.36, 0.36]) {
      const ox = Math.sin(along) * s, oz = Math.cos(along) * s;
      put(P.bridge, cx + ox, DECK, cz + oz, 1.0, 0.1, 0.05, along, kind === 'iron' ? iron : dark);            // korkuluk
      if (kind === 'iron') put(P.bridge, cx + ox, DECK + 0.1, cz + oz, 1.0, 0.03, 0.03, along, iron);
    }
    if ((x + y) % 2 === 0) put(P.bridge, cx, -0.42, cz, 0.24, DECK + 0.35, 0.6, along, kind === 'iron' ? '#7d7366' : stone);   // ayak
  }
  /* Tünel ağzı: dağın içine giren yol ya da rayın kayaya değdiği kenarda taş kemerli kapı */
  function portals(x, y) {
    const i = y * N + x; if (G.t[i] === V.T_ROCK || !(G.r[i] || (G.rl && G.rl[i]))) return;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      const j = ny * N + nx; if (G.t[j] !== V.T_ROCK || !((G.r[i] && G.r[j]) || (G.rl && G.rl[i] && G.rl[j]))) continue;
      const ex = W(x) + dx * 0.47, ez = W(y) + dy * 0.47, rot = dx ? Math.PI / 2 : 0;
      put(P.bridge, ex, 0, ez, 0.82, 0.46, 0.08, rot, '#8f8470');
      put(P.bridge, ex - dx * 0.01, 0, ez - dy * 0.01, 0.56, 0.36, 0.09, rot, '#1e1b18');
    }
  }
  /* Üst geçit: yol, rayın üstünden taş ayaklı bir köprüyle geçer; ray altından akar */
  function overpass(x, y, L) {
    const cx = W(x), cz = W(y), along = (L[1] || L[3]) && !(L[0] || L[2]) ? 0 : Math.PI / 2;
    put(P.bridge, cx, DECK - 0.07, cz, 1.0, 0.07, 0.72, along, '#c2b69c');
    for (const s of [-0.36, 0.36]) put(P.bridge, cx + Math.sin(along) * s, DECK, cz + Math.cos(along) * s, 1.0, 0.1, 0.05, along, '#8f8470');
    for (const e of [-0.46, 0.46]) put(P.bridge, cx + Math.cos(along) * e, 0, cz - Math.sin(along) * e, 0.08, DECK - 0.07, 0.72, along, '#a89c84');   // yan ayaklar
  }
  const elevated = (j) => G.t[j] === V.T_WATER || (G.r[j] && G.rl && G.rl[j]);
  /* Köprüye ve üst geçide çıkan yolun karada kısa bir rampası olur */
  function rampTo(q, x, y, arr, w, y0, cc) {
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      const j = ny * N + nx; if (!arr[j] || !elevated(j)) continue;
      const cx = W(x), cz = W(y);
      for (let k = 0; k < 4; k++) {    // basamaklı rampa: kenara doğru yükselir
        const a = 0.1 + k * 0.1, b = a + 0.1, yy = y0 + (DECK - y0) * (k + 1) / 5;
        if (dx) q(Math.min(cx + dx * a, cx + dx * b), cz - w, Math.max(cx + dx * a, cx + dx * b), cz + w, yy, cc);
        else q(cx - w, Math.min(cz + dy * a, cz + dy * b), cx + w, Math.max(cz + dy * a, cz + dy * b), yy, cc);
      }
    }
  }

  const ownMat = new THREE.MeshBasicMaterial({ color: '#1d2326', transparent: true, opacity: 0.32, depthWrite: false });
  function buildOwn() {      // satın alınmamış arazi koyu görünür
    if (!G.own) return;
    flatMesh('own', ownMat, (q) => {
      const black = new THREE.Color('#000');
      for (let i = 0; i < N * N; i++) {
        if (G.own[i]) continue;
        const x = i % N, y = (i / N) | 0, x0 = x - N / 2, z0 = y - N / 2, h = G.t[i] === V.T_ROCK ? G.h[i] * 0.45 : G.t[i] === V.T_WATER ? -0.1 : 0;
        q(x0, z0, x0 + 1, z0 + 1, h + 0.04, black);
      }
    }).renderOrder = 4;
  }
  function buildFlats() {
    const cc = new THREE.Color(), month = V.dateOf(G).month;
    flatMesh('zone', zoneMat, (q) => {
      for (let i = 0; i < N * N; i++) {
        const z = G.z[i]; if (!z) continue;
        if (z === V.Z_FARM && G.lv[i] > 0) continue;
        if (z !== V.Z_FARM && G.lv[i] > 0 && G.pg[i] >= 1) continue;
        cc.set(PAL.zone[z]);
        const x = i % N, y = (i / N) | 0, x0 = x - N / 2, z0 = y - N / 2;
        q(x0 + 0.04, z0 + 0.04, x0 + 0.96, z0 + 0.96, 0.008, cc);
      }
    });
    const ash = new THREE.Color('#3a332c'), wet = new THREE.Color('#3d7fc0');
    flatMesh('marks', zoneMat, (q) => {
      for (const k in G.mark || {}) {
        const i = +k, x = i % N, y = (i / N) | 0, x0 = x - N / 2, z0 = y - N / 2;
        q(x0 + 0.02, z0 + 0.02, x0 + 0.98, z0 + 0.98, 0.03, G.mark[k].k === 'burn' ? ash : wet);
      }
    }).renderOrder = 2;
    flatMesh('field', fieldMat, (q) => {
      for (let i = 0; i < N * N; i++) {
        if (G.z[i] !== V.Z_FARM || G.lv[i] === 0) continue;
        const x = i % N, y = (i / N) | 0, x0 = x - N / 2, z0 = y - N / 2, r = V.hash2(x, y, 9);
        const ready = G.lv[i] > 1 || G.pg[i] >= 1;
        cc.set(ready ? FIELD[month] : '#8a7550').offsetHSL((r - 0.5) * 0.03, 0, (r - 0.5) * 0.06);
        q(x0 + 0.03, z0 + 0.03, x0 + 0.97, z0 + 0.97, 0.01, cc, r < 0.5);
      }
    });
  }

  /* ---------- ağaçlar (statik) ---------- */
  function buildTrees() {
    for (const k of ['tCone', 'tBlob', 'tTrunk']) P[k].count = 0;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, t = G.t[i];
      const used = G.r[i] || (G.rl && G.rl[i]) || G.z[i] || G.sv[i];
      let n = 0;
      if (t === V.T_FOREST && !used) n = 3;
      else if (t === V.T_GRASS && !used && V.hash2(x, y, G.seed + 3) < 0.045) n = 1;
      else if (t === V.T_ROCK && G.h[i] <= 2 && V.hash2(x, y, G.seed + 4) < 0.25) n = 1;
      for (let k = 0; k < n; k++) {
        const r1 = V.hash2(x * 3 + k, y, 21), r2 = V.hash2(x, y * 3 + k, 22), r3 = V.hash2(x + k, y + k, 23);
        const base = t === V.T_ROCK ? G.h[i] * 0.45 : 0;
        const px = W(x) + (r1 - 0.5) * 0.62, pz = W(y) + (r2 - 0.5) * 0.62, s = 0.7 + r3 * 0.6;
        put(P.tTrunk, px, base, pz, 0.06 * s, 0.2 * s, 0.06 * s, 0, PAL.trunk);
        if (r3 < 0.62 || t === V.T_ROCK) put(P.tCone, px, base + 0.14 * s, pz, 0.46 * s, 0.75 * s, 0.46 * s, r1 * 6, pick(PAL.leaf, r2));
        else put(P.tBlob, px, base + 0.15 * s, pz, 0.5 * s, 0.5 * s, 0.5 * s, r1 * 6, pick(PAL.leaf, r1));
      }
    }
    for (const k of ['tCone', 'tBlob', 'tTrunk']) flush(P[k]);
  }

  /* ---------- binalar (her gün) ---------- */
  function facing(i) {
    // Binanın önü yola bakar: +z yerel yön. Döndürme açısı.
    const x = i % N, y = (i / N) | 0;
    const R = (a, b) => a >= 0 && b >= 0 && a < N && b < N && G.r[b * N + a];
    if (R(x, y + 1)) return 0; if (R(x + 1, y)) return Math.PI / 2; if (R(x, y - 1)) return Math.PI; if (R(x - 1, y)) return -Math.PI / 2;
    return 0;
  }
  let govGroup = null;
  function buildGov() {
    if (govGroup) { world.remove(govGroup); govGroup.traverse(o => o.material && o.material.dispose()); govGroup = null; }
    if (!G.gov) return;
    const g = new THREE.Group(), add = (gg, color, x, y, z, sx, sy, sz) => {
      const m = new THREE.Mesh(gg, lam({ color })); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = m.receiveShadow = true; g.add(m); return m;
    };
    add(geo.box, PAL.stone, 0, 0, 0, 1.9, 0.12, 1.9);
    add(geo.box, PAL.govWall, 0, 0.12, -0.15, 1.5, 0.7, 1.0);
    add(geo.roof, PAL.govRoof, 0, 0.82, -0.15, 1.6, 0.34, 1.1);
    add(geo.box, PAL.stone, 0, 0.12, 0.47, 0.9, 0.06, 0.3);
    for (const cx of [-0.36, -0.12, 0.12, 0.36]) add(geo.cyl, '#f4eee2', cx, 0.18, 0.55, 0.08, 0.56, 0.08);
    add(geo.box, PAL.govWall, 0, 0.74, 0.52, 0.94, 0.08, 0.2);
    add(geo.roof, PAL.govRoof, 0, 0.82, 0.52, 0.94, 0.2, 0.2);
    add(geo.box, PAL.govWall, 0, 0.82, -0.2, 0.36, 0.75, 0.36);
    add(geo.cyl, '#2d3a40', 0, 1.25, -0.01, 0.2, 0.02, 0.2).rotation.x = Math.PI / 2;
    add(geo.pyr, PAL.govRoof, 0, 1.57, -0.2, 0.44, 0.38, 0.44);
    add(geo.cyl, '#5b5b5b', 0.62, 0.12, 0.62, 0.03, 1.25, 0.03);
    const flag = add(geo.box, PAL.crimson, 0.77, 1.17, 0.62, 0.3, 0.18, 0.012);
    flag.userData.flag = true;
    const tiles = V.govTiles(G), x = G.gov.x + 0.5, y = G.gov.y + 0.5;
    // Önü yola baksın
    let rot = 0; const R = (a, b) => G.r[b * N + a];
    if (G.gov.y + 2 < N && (R(G.gov.x, G.gov.y + 2) || R(G.gov.x + 1, G.gov.y + 2))) rot = 0;
    else if (G.gov.x + 2 < N && (R(G.gov.x + 2, G.gov.y) || R(G.gov.x + 2, G.gov.y + 1))) rot = Math.PI / 2;
    else if (G.gov.y > 0 && (R(G.gov.x, G.gov.y - 1) || R(G.gov.x + 1, G.gov.y - 1))) rot = Math.PI;
    else if (G.gov.x > 0 && (R(G.gov.x - 1, G.gov.y) || R(G.gov.x - 1, G.gov.y + 1))) rot = -Math.PI / 2;
    g.rotation.y = rot;
    g.position.set(x - N / 2 + 0.5, 0, y - N / 2 + 0.5);
    govGroup = g; world.add(g);
    void tiles;
  }

  function buildBuildings() {
    for (const k of ['box', 'roof', 'cyl', 'cone', 'pyr']) P[k].count = 0;
    for (let i = 0; i < N * N; i++) {
      const z = G.z[i], lv = G.lv[i], sv = G.sv[i];
      if (sv === V.S_FOUNTAIN) {
        const x = i % N, y = (i / N) | 0, cx = W(x), cz = W(y);
        put(P.cyl, cx, 0, cz, 0.52, 0.1, 0.52, 0, PAL.stone);
        put(P.cyl, cx, 0.02, cz, 0.42, 0.1, 0.42, 0, PAL.waterLit);
        put(P.cyl, cx, 0.1, cz, 0.08, 0.36, 0.08, 0, PAL.stone);
        put(P.cyl, cx, 0.42, cz, 0.18, 0.05, 0.18, 0, PAL.stone);
        continue;
      }
      if (V.isMultiCode(sv)) continue;   // çok kareli yapılar aşağıda
      if (sv && sv !== V.S_GOV) { drawService(i, sv); continue; }
      if (!z || !lv) continue;
      const x = i % N, y = (i / N) | 0, cx = W(x), cz = W(y), r = V.hash2(x, y, G.seed + 1), r2 = V.hash2(y, x, 5);
      const rot = facing(i), pg = G.pg[i], building = pg < 1;
      if (z === V.Z_FARM) {
        if (building) { put(P.box, cx + 0.2, 0, cz + 0.2, 0.08, 0.3 * pg + 0.05, 0.08, 0, PAL.timber); continue; }
        if (lv >= 2) {
          part(P.box, cx, cz, rot, -0.22, 0, -0.18, 0.36, 0.28, 0.3, PAL.barn);
          part(P.roof, cx, cz, rot, -0.22, 0.28, -0.18, 0.4, 0.18, 0.34, PAL.barnRoof);
          part(P.cyl, cx, cz, rot, 0.08, 0, -0.26, 0.14, 0.5, 0.14, PAL.silo);
          part(P.cone, cx, cz, rot, 0.08, 0.5, -0.26, 0.16, 0.12, 0.16, PAL.barnRoof);
        } else if (r < 0.45) {
          part(P.cone, cx, cz, rot, (r2 - 0.5) * 0.5, 0, (r - 0.5) * 0.5, 0.2, 0.2, 0.2, PAL.hay);
        }
        continue;
      }
      if (building) {   // iskele: ahşap çatkı yükselir
        const hgt = (z === V.Z_RES ? [0, 0.34, 0.55, 0.85, 1.5, 2.6] : [0, 0.42, 0.65, 1.1, 1.7, 2.6])[lv] * (0.15 + 0.85 * pg);
        const w = lv === 1 ? 0.5 : lv === 2 ? 0.66 : 0.84;
        part(P.box, cx, cz, rot, 0, 0, 0.05, w, hgt, w * 0.85, PAL.timber);
        for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) part(P.box, cx, cz, rot, a * w * 0.55, 0, 0.05 + b * w * 0.48, 0.03, hgt + 0.12, 0.03, '#8a6a42');
        continue;
      }
      if (z === V.Z_RES) {
        if (lv === 1) {
          const wc = pick(PAL.wall, r), rc = pick(PAL.roof, r2);
          part(P.box, cx, cz, rot, 0, 0, 0.1, 0.46, 0.32, 0.38, wc);
          part(P.roof, cx, cz, rot, 0, 0.32, 0.1, 0.52, 0.22, 0.44, rc);
          if (r > 0.55) { part(P.box, cx, cz, rot, 0.26, 0, -0.22, 0.2, 0.18, 0.18, pick(PAL.wall, r2)); part(P.roof, cx, cz, rot, 0.26, 0.18, -0.22, 0.24, 0.1, 0.22, rc); }
        } else if (lv === 2) {
          const wc = pick(PAL.wall, r), rc = pick(PAL.roof, r2);
          part(P.box, cx, cz, rot, 0, 0, 0.06, 0.64, 0.56, 0.52, wc);
          part(P.roof, cx, cz, rot, 0, 0.56, 0.06, 0.7, 0.28, 0.58, rc);
          part(P.box, cx, cz, rot, 0.18, 0.62, -0.06, 0.08, 0.26, 0.08, '#7a5a48');
        } else if (lv === 3) {
          const wc = pick(PAL.wall3, r), rc = pick(PAL.roof3, r2);
          part(P.box, cx, cz, rot, 0, 0, 0.03, 0.86, 0.86, 0.72, wc);
          part(P.roof, cx, cz, rot, 0, 0.86, 0.03, 0.9, 0.24, 0.76, rc);
          part(P.box, cx, cz, rot, 0, 0, 0.39, 0.88, 0.07, 0.02, '#a08f75');
          part(P.box, cx, cz, rot, -0.24, 0.92, -0.1, 0.08, 0.24, 0.08, '#6e5d50');
        } else if (lv === 5) {      // blok apartman
          const wc = pick(['#cfcac0', '#bfb9ae', '#d8d2c4', '#b5b0a8'], r);
          part(P.box, cx, cz, rot, 0, 0, 0.02, 0.9, 2.6, 0.82, wc); part(P.box, cx, cz, rot, 0, 2.6, 0.02, 0.94, 0.05, 0.86, '#55504a');
          for (let k = 0; k < 7; k++) part(P.box, cx, cz, rot, 0, 0.32 + k * 0.33, 0.43, 0.82, 0.14, 0.012, '#4d6a80');
          part(P.box, cx, cz, rot, 0, 0, 0.43, 0.24, 0.24, 0.012, '#3b3a38');
        } else {      // apartman
          const wc = pick(['#d9c7a8', '#c9b7a0', '#b9a48c', '#cfbfae'], r);
          part(P.box, cx, cz, rot, 0, 0, 0.02, 0.88, 1.5, 0.78, wc);
          part(P.box, cx, cz, rot, 0, 1.5, 0.02, 0.93, 0.06, 0.83, '#5a534d');
          for (const yy of [0.36, 0.74, 1.12]) part(P.box, cx, cz, rot, 0, yy, 0.415, 0.9, 0.035, 0.02, '#8d7c68');
          for (const yy of [0.5, 0.88, 1.26]) for (const xx of [-0.27, 0, 0.27]) part(P.box, cx, cz, rot, xx, yy, 0.415, 0.13, 0.17, 0.012, '#4d6a80');
          part(P.box, cx, cz, rot, 0, 0, 0.415, 0.2, 0.26, 0.012, '#4b3a2c');
        }
        continue;
      }
      if (z === V.Z_COM) {
        const wc = pick(PAL.comWall, r), rc = pick(PAL.comRoof, r2), ac = pick(PAL.awning, r * 7);
        const d = lv === 1 ? [0.6, 0.42, 0.52] : lv === 2 ? [0.8, 0.66, 0.68] : lv === 3 ? [0.88, 1.1, 0.8] : lv === 4 ? [0.9, 1.7, 0.84] : [0.94, 2.6, 0.88];
        if (lv >= 4) for (let k = 0; k < (lv === 4 ? 3 : 6); k++) part(P.box, cx, cz, rot, 0, 0.55 + k * 0.33, d[2] / 2 + 0.012, d[0] * 0.86, 0.13, 0.012, '#4d6a80');
        part(P.box, cx, cz, rot, 0, 0, 0.02, d[0], d[1], d[2], wc);
        part(P.roof, cx, cz, rot, 0, d[1], 0.02, d[0] + 0.06, lv === 3 ? 0.2 : 0.24, d[2] + 0.06, rc);
        part(P.box, cx, cz, rot, 0, 0.26, d[2] / 2 + 0.1, d[0] * 0.9, 0.035, 0.2, ac);
        part(P.box, cx, cz, rot, 0, 0, d[2] / 2 + 0.03, d[0] * 0.5, 0.22, 0.02, '#4b3a2c');
        if (lv === 3) part(P.box, cx, cz, rot, 0, 0.62, d[2] / 2 + 0.1, d[0] * 0.9, 0.035, 0.16, ac);
      }
    }
    for (const m of G.multi || []) drawMulti(m);
    for (const k of ['box', 'roof', 'cyl', 'cone', 'pyr']) flush(P[k]);
  }

  /* Hizmet ve üretim binaları (1×1) */
  function drawService(i, sv) {
    const x = i % N, y = (i / N) | 0, cx = W(x), cz = W(y), rot = facing(i), r = V.hash2(x, y, 77);
    const B_ = (lx, ly, lz, sx, sy, sz, c) => part(P.box, cx, cz, rot, lx, ly, lz, sx, sy, sz, c);
    const R_ = (lx, ly, lz, sx, sy, sz, c) => part(P.roof, cx, cz, rot, lx, ly, lz, sx, sy, sz, c);
    if (sv === V.S_POLICE) {
      B_(0, 0, 0.05, 0.72, 0.5, 0.6, '#d8d1c2'); B_(0, 0.5, 0.05, 0.78, 0.06, 0.66, '#3d4f6b');
      B_(-0.26, 0, -0.2, 0.22, 0.82, 0.22, '#cfc7b6'); part(P.pyr, cx, cz, rot, -0.26, 0.82, -0.2, 0.3, 0.22, 0.3, '#3d4f6b');
      B_(0, 0, 0.36, 0.16, 0.26, 0.02, '#2c3440'); B_(0.22, 0.3, 0.36, 0.1, 0.1, 0.02, '#e8c66a');
    } else if (sv === V.S_SCHOOL) {
      B_(0, 0, 0.04, 0.84, 0.46, 0.56, '#efe2c4'); R_(0, 0.46, 0.04, 0.9, 0.26, 0.62, '#a9553a');
      B_(0, 0.62, 0.04, 0.14, 0.2, 0.14, '#efe2c4'); part(P.pyr, cx, cz, rot, 0, 0.82, 0.04, 0.2, 0.16, 0.2, '#7f4b3a');
      for (const a of [-0.28, -0.1, 0.1, 0.28]) B_(a, 0.2, 0.33, 0.1, 0.14, 0.02, '#5d7d95');
    } else if (sv === V.S_CLINIC) {
      B_(0, 0, 0.02, 0.82, 0.56, 0.62, '#f4f1ea'); R_(0, 0.56, 0.02, 0.88, 0.24, 0.68, '#4f7f7a');
      part(P.cyl, cx, cz, rot, -0.18, 0, 0.38, 0.06, 0.4, 0.06, '#f8f6f0'); part(P.cyl, cx, cz, rot, 0.18, 0, 0.38, 0.06, 0.4, 0.06, '#f8f6f0');
      B_(0, 0.4, 0.4, 0.5, 0.05, 0.16, '#4f7f7a');
    } else if (sv === V.S_LUMBER) {
      B_(-0.2, 0, -0.15, 0.4, 0.3, 0.34, '#8b6a45'); R_(-0.2, 0.3, -0.15, 0.44, 0.16, 0.38, '#5b4636');
      for (const [a, b] of [[0, 0], [0.09, 0], [0.045, 0.08]]) B_(0.22 + a - 0.04, b, 0.18, 0.08, 0.08, 0.5, '#a07a4c');
    } else if (sv === V.S_QUARRY) {
      for (const [a, b, h] of [[-0.2, -0.15, 0.16], [0.05, -0.2, 0.22], [-0.1, 0.15, 0.12], [0.22, 0.12, 0.18]]) B_(a, 0, b, 0.2, h, 0.2, pick(PAL.rock, r + a));
      B_(0.3, 0, -0.3, 0.05, 0.8, 0.05, '#6d5134'); B_(0.15, 0.78, -0.3, 0.4, 0.04, 0.04, '#6d5134');
    } else if (sv === V.S_BUS) {
      put(P.box, cx, 0, cz, 0.8, 0.04, 0.4, rot, '#bdb5a5'); B_(0, 0.38, -0.1, 0.7, 0.03, 0.3, '#2e6fb0');
      for (const a of [-0.3, 0.3]) part(P.cyl, cx, cz, rot, a, 0.04, -0.22, 0.03, 0.34, 0.03, '#3a3a3a');
      B_(0, 0.04, -0.2, 0.5, 0.07, 0.08, '#6b6b6b'); B_(0.36, 0.04, 0.16, 0.03, 0.7, 0.03, '#3a3a3a'); B_(0.36, 0.7, 0.16, 0.14, 0.14, 0.02, '#2e6fb0');
    } else if (sv === V.S_LYCEUM) {
      B_(0, 0, 0, 0.9, 0.7, 0.66, '#e3d5b8'); R_(0, 0.7, 0, 0.94, 0.2, 0.7, '#8a4a36');
      for (const a of [-0.3, -0.1, 0.1, 0.3]) for (const yy of [0.18, 0.44]) B_(a, yy, 0.335, 0.11, 0.14, 0.012, '#4d6a80');
      B_(0, 0, 0.335, 0.18, 0.26, 0.012, '#4b3a2c');
    } else if (sv === V.S_HOSPITAL) {
      B_(0, 0, 0, 0.92, 0.9, 0.7, '#f2efe8'); B_(0, 0.9, 0, 0.95, 0.05, 0.73, '#8d8a84');
      for (const a of [-0.3, 0, 0.3]) for (const yy of [0.2, 0.5]) B_(a, yy, 0.355, 0.14, 0.16, 0.012, '#5d7d95');
      B_(0, 0.62, 0.36, 0.22, 0.06, 0.012, '#c0392b'); B_(0, 0.56, 0.36, 0.06, 0.18, 0.012, '#c0392b');
    } else if (sv === V.S_CEMENT) {
      B_(-0.18, 0, 0.1, 0.5, 0.42, 0.5, '#b7b2a8'); R_(-0.18, 0.42, 0.1, 0.54, 0.14, 0.54, '#6f6c66');
      part(P.cyl, cx, cz, rot, 0.25, 0, -0.2, 0.22, 0.75, 0.22, '#c9c5bc'); part(P.cone, cx, cz, rot, 0.25, 0.75, -0.2, 0.24, 0.12, 0.24, '#8d8a84');
      B_(0.28, 0, 0.28, 0.06, 0.95, 0.06, '#8d8a84');
    } else if (sv === V.S_TRAM) {
      put(P.box, cx, 0, cz, 0.9, 0.05, 0.5, rot, '#bdb5a5');
      B_(0, 0.42, -0.08, 0.8, 0.04, 0.34, '#3f6b5a');
      for (const a of [-0.34, 0.34]) part(P.cyl, cx, cz, rot, a, 0.05, -0.2, 0.035, 0.38, 0.035, '#3a3a3a');
      B_(0, 0.05, -0.18, 0.5, 0.08, 0.1, '#8a6845'); B_(0.4, 0.05, 0.18, 0.03, 0.75, 0.03, '#3a3a3a'); B_(0.4, 0.72, 0.18, 0.12, 0.1, 0.02, '#e8c66a');
    } else if (sv === V.S_HYDRO) {
      put(P.box, cx, -0.42, cz, 1.0, 0.62, 0.5, rot, '#b9b1a2'); put(P.box, cx, 0.2, cz, 0.5, 0.36, 0.42, rot, '#d8ccb0');
      put(P.roof, cx, 0.56, cz, 0.56, 0.16, 0.48, rot, '#5f5852'); put(P.box, cx, -0.2, cz, 0.9, 0.06, 0.62, rot, PAL.waterLit);
    } else if (sv === V.S_PIER) {
      // Kıyıya bakan yönü bul
      let d = [0, 1]; for (const [a, b] of DIRS) { const j = (y + b) * N + (x + a); if (x + a >= 0 && x + a < N && y + b >= 0 && y + b < N && G.t[j] !== V.T_WATER) { d = [a, b]; break; } }
      const ang = Math.atan2(d[0], d[1]);
      put(P.box, cx, 0.04, cz, 0.36, 0.05, 1.0, ang, '#8a6a42');
      for (const s of [-0.35, 0.05, 0.4]) for (const t of [-0.15, 0.15]) put(P.box, cx + Math.sin(ang) * s + Math.cos(ang) * t, -0.35, cz + Math.cos(ang) * s - Math.sin(ang) * t, 0.05, 0.42, 0.05, ang, '#5b4636');
      const bx = cx - Math.sin(ang) * 0.1 + Math.cos(ang) * 0.32, bz = cz - Math.cos(ang) * 0.1 - Math.sin(ang) * 0.32;
      put(P.box, bx, -0.08, bz, 0.18, 0.08, 0.5, ang, '#7a4a2a'); put(P.box, bx, 0, bz, 0.02, 0.4, 0.02, ang, '#5b4636'); put(P.box, bx, 0.12, bz + 0.0, 0.01, 0.22, 0.18, ang, '#f1ece0');
    } else if (sv === V.S_SMALLSQ) {
      put(P.box, cx, 0, cz, 0.96, 0.025, 0.96, 0, '#cdbf9e');
      put(P.box, cx - 0.22, 0, cz - 0.22, 0.06, 0.18, 0.06, 0, PAL.trunk); put(P.blob || P.cone, cx - 0.22, 0.12, cz - 0.22, 0.4, 0.45, 0.4, 0, PAL.leaf[3]);
      B_(0.1, 0.025, 0.25, 0.36, 0.07, 0.1, '#8a6845');
      put(P.cyl, cx + 0.3, 0, cz - 0.3, 0.03, 0.5, 0.03, 0, '#3a3a3a'); put(P.box, cx + 0.3, 0.5, cz - 0.3, 0.08, 0.08, 0.08, 0, '#f2d27a');
    } else if (sv === V.S_FIRE) {
      B_(0, 0, 0.05, 0.74, 0.5, 0.6, '#9e3b2b'); B_(0, 0.5, 0.05, 0.8, 0.06, 0.66, '#3d3532');
      B_(-0.24, 0, -0.2, 0.22, 1.0, 0.22, '#8e3527'); part(P.pyr, cx, cz, rot, -0.24, 1.0, -0.2, 0.3, 0.2, 0.3, '#3d3532');
      B_(0.1, 0, 0.36, 0.34, 0.34, 0.02, '#4a2a20'); B_(-0.24, 0.8, -0.08, 0.1, 0.1, 0.02, '#e8c66a');
    } else if (sv === V.S_MILL) {
      part(P.cyl, cx, cz, rot, 0, 0, 0, 0.42, 0.72, 0.42, '#ece4d2'); part(P.cone, cx, cz, rot, 0, 0.72, 0, 0.5, 0.3, 0.5, '#6b4b3b');
      B_(0, 0.72, 0.26, 0.07, 0.95, 0.03, '#8a6a42'); B_(0, 1.16, 0.26, 0.95, 0.07, 0.03, '#8a6a42');
      B_(0, 0, 0.22, 0.14, 0.24, 0.02, '#4b3a2c');
    } else if (sv === V.S_LEVEE) {
      put(P.box, cx, 0, cz, 0.98, 0.2, 0.98, 0, '#7f8f55'); put(P.box, cx, 0.2, cz, 0.7, 0.06, 0.7, 0, '#8ea05f');
    } else if (sv === V.S_COAL || sv === V.S_IRON) {
      const pile = sv === V.S_COAL ? '#262524' : '#8a4b2e';
      B_(-0.2, 0, 0.12, 0.44, 0.3, 0.36, sv === V.S_COAL ? '#55504a' : '#6b5040'); R_(-0.2, 0.3, 0.12, 0.48, 0.14, 0.4, '#3a3532');
      B_(0.14, 0, -0.26, 0.04, 0.9, 0.04, '#5a4430'); B_(0.34, 0, -0.26, 0.04, 0.9, 0.04, '#5a4430'); B_(0.24, 0.88, -0.26, 0.28, 0.06, 0.06, '#5a4430');
      part(P.cyl, cx, cz, rot, 0.24, 0.8, -0.26, 0.14, 0.03, 0.14, '#3a3532');
      part(P.cone, cx, cz, rot, 0.24, 0, 0.18, 0.3, 0.18, 0.3, pile);
    }
  }

  /* 2×2 yapılar: meydan, şantiye, tamamlanmış görev anıtları */
  function drawMulti(m) {
    const cx = m.x - N / 2 + (m.w || 2) / 2, cz = m.y - N / 2 + (m.h || 2) / 2;
    const Bx = (x, y, z, sx, sy, sz, c) => put(P.box, cx + x, y, cz + z, sx, sy, sz, 0, c);
    if (m.k === V.S_SQUARE) {
      Bx(0, 0, 0, 1.94, 0.03, 1.94, '#cdbf9e');
      Bx(0, 0.03, 0, 0.42, 0.22, 0.42, PAL.stone); put(P.cyl, cx, 0.25, cz, 0.16, 0.5, 0.16, 0, '#7d6b48'); put(P.cone, cx, 0.75, cz, 0.12, 0.14, 0.12, 0, '#7d6b48');
      for (const [a, b] of [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]]) {
        put(P.box, cx + a, 0, cz + b, 0.06, 0.2, 0.06, 0, PAL.trunk); put(P.cone, cx + a, 0.14, cz + b, 0.42, 0.6, 0.42, 0, PAL.leaf[1]);
      }
      for (const [a, b, w, d] of [[0, -0.42, 0.5, 0.1], [0, 0.42, 0.5, 0.1], [-0.42, 0, 0.1, 0.5], [0.42, 0, 0.1, 0.5]]) Bx(a, 0.03, b, w, 0.08, d, '#8a6845');
      return;
    }
    if (m.k === V.S_GAS) {
      Bx(0, 0, 0, 1.94, 0.04, 1.94, '#a39a86');
      Bx(-0.35, 0.04, 0.3, 1.1, 0.6, 0.9, '#c8c2b6'); Bx(-0.35, 0.64, 0.3, 1.14, 0.05, 0.94, '#5f6f78');
      for (const [a, b] of [[0.55, -0.5], [0.55, 0.35]]) { put(P.cyl, cx + a, 0.04, cz + b, 0.5, 0.55, 0.5, 0, '#dcd8d0'); put(P.cone, cx + a, 0.59, cz + b, 0.52, 0.1, 0.52, 0, '#b9b4aa'); }
      put(P.cyl, cx - 0.6, 0.04, cz - 0.6, 0.14, 1.6, 0.14, 0, '#d8d2c4'); put(P.cyl, cx - 0.6, 1.5, cz - 0.6, 0.16, 0.12, 0.16, 0, '#c0392b');
      return;
    }
    if (m.k === V.S_RANCH) {
      Bx(0, 0, 0, 2.94, 0.02, 1.94, '#8fae5e');
      for (const [a, b, w, d] of [[0, -0.95, 2.9, 0.03], [0, 0.95, 2.9, 0.03], [-1.45, 0, 0.03, 1.9], [1.45, 0, 0.03, 1.9], [-0.3, 0.2, 0.03, 1.5]]) Bx(a, 0.02, b, w, 0.14, d, '#8a6a42');
      Bx(-0.9, 0.02, -0.35, 0.9, 0.5, 0.7, PAL.barn); put(P.roof, cx - 0.9, 0.52, cz - 0.35, 0.96, 0.28, 0.76, 0, PAL.barnRoof);
      put(P.cyl, cx - 0.9, 0.02, cz + 0.5, 0.26, 0.7, 0.26, 0, PAL.silo); put(P.cone, cx - 0.9, 0.72, cz + 0.5, 0.3, 0.16, 0.3, 0, PAL.barnRoof);
      for (const [a, b, c2] of [[0.1, -0.5, '#f1ece0'], [0.5, -0.2, '#6b4b2e'], [0.9, -0.6, '#f1ece0'], [0.3, 0.4, '#3a3028'], [0.8, 0.5, '#f1ece0'], [1.2, 0.1, '#6b4b2e'], [1.15, 0.65, '#d8c9a8']]) {
        Bx(a, 0.08, b, 0.2, 0.11, 0.1, c2); Bx(a + 0.11, 0.13, b, 0.07, 0.08, 0.07, c2);
      }
      put(P.cone, cx + 0.05, 0.02, cz + 0.75, 0.24, 0.2, 0.24, 0, PAL.hay); Bx(1.0, 0.02, -0.85, 0.5, 0.07, 0.1, '#7a5a3a');
      return;
    }
    if (m.k === V.S_POWER) {
      Bx(0, 0, 0, 1.94, 0.04, 1.94, '#9a8f7c');
      Bx(-0.2, 0.04, 0.1, 1.3, 0.75, 1.1, '#8e4a36'); put(P.roof, cx - 0.2, 0.79, cz + 0.1, 1.36, 0.26, 1.16, 0, '#4a4440');
      for (const a of [-0.55, 0.0]) { put(P.cyl, cx + a, 0.79, cz - 0.25, 0.2, 1.1, 0.2, 0, '#6e3a2c'); put(P.cyl, cx + a, 1.89, cz - 0.25, 0.24, 0.06, 0.24, 0, '#3a3532'); }
      put(P.cone, cx + 0.7, 0.04, cz - 0.55, 0.5, 0.3, 0.5, 0, '#262524'); for (const b of [-0.1, 0.25, 0.6]) Bx(0.46, 0.3, b, 0.02, 0.22, 0.2, '#f2d27a');
      return;
    }
    if (m.k === V.S_FACTORY) {
      Bx(0, 0, 0, 1.94, 0.04, 1.94, '#a39a86');
      Bx(0, 0.04, 0.1, 1.7, 0.6, 1.3, '#a5694a');
      for (const a of [-0.57, 0, 0.57]) put(P.roof, cx + a, 0.64, cz + 0.1, 0.57, 0.22, 1.3, 0, '#5b6b78');
      put(P.cyl, cx + 0.6, 0.04, cz - 0.72, 0.22, 1.5, 0.22, 0, '#7a4634'); put(P.cyl, cx + 0.6, 1.54, cz - 0.72, 0.26, 0.06, 0.26, 0, '#3a3532');
      for (const a of [-0.6, -0.2, 0.2, 0.6]) Bx(a, 0.26, 0.76, 0.22, 0.2, 0.012, '#4d6a80');
      return;
    }
    if (m.k === V.S_DUMP) {
      Bx(0, 0, 0, 1.94, 0.03, 1.94, '#7d6f55');
      for (const [a, b, w, d] of [[0, -0.95, 1.9, 0.04], [0, 0.95, 1.9, 0.04], [-0.95, 0, 0.04, 1.9], [0.95, 0, 0.04, 1.9]]) Bx(a, 0, b, w, 0.18, d, '#6b5a44');
      for (const [a, b, s2, c2] of [[-0.4, -0.3, 0.8, '#6f6a5e'], [0.35, 0.2, 0.7, '#7a6a52'], [-0.2, 0.5, 0.5, '#5e5a50'], [0.5, -0.5, 0.45, '#857a66']]) put(P.cone, cx + a, 0.03, cz + b, s2, s2 * 0.45, s2, 0, c2);
      Bx(0.6, 0.03, 0.65, 0.3, 0.16, 0.2, '#6b4b2e');
      return;
    }
    if (m.k === V.S_PSTATION) {
      Bx(0, 0, 0, 1.94, 0.06, 0.94, '#bdb5a5');
      Bx(0, 0.06, -0.12, 1.3, 0.48, 0.5, '#d6b98c'); put(P.roof, cx, 0.54, cz - 0.12, 1.36, 0.22, 0.56, 0, '#5b4b44');
      Bx(0, 0.5, 0.28, 1.9, 0.04, 0.34, '#4f5d68');
      for (const a of [-0.8, -0.27, 0.27, 0.8]) put(P.cyl, cx + a, 0.06, cz + 0.4, 0.04, 0.44, 0.04, 0, '#3a3a3a');
      Bx(0, 0.62, -0.12, 0.18, 0.18, 0.04, '#f4efe2');
      for (const a of [-0.5, 0.1, 0.55]) Bx(a, 0.06, 0.22, 0.05, 0.12, 0.05, ['#7a3b2e', '#2e4a7a', '#4a6b3a'][Math.abs(Math.round(a * 10)) % 3]);
      return;
    }
    if (m.k === V.S_FSTATION) {
      Bx(0, 0, 0, 1.94, 0.04, 0.94, '#a89a80');
      Bx(-0.35, 0.04, -0.1, 1.1, 0.55, 0.6, '#9c6b4a'); put(P.roof, cx - 0.35, 0.59, cz - 0.1, 1.16, 0.2, 0.66, 0, '#4a4440');
      for (const [a, b] of [[0.5, 0.15], [0.68, 0.15], [0.5, -0.05], [0.68, 0.3]]) Bx(a, 0.04, b, 0.15, 0.15, 0.15, '#a07a4c');
      Bx(0.75, 0.04, -0.3, 0.05, 0.95, 0.05, '#5a4430'); Bx(0.55, 0.95, -0.3, 0.45, 0.04, 0.04, '#5a4430');
      return;
    }
    if (m.k === V.S_PORT) {
      // Suya bakan kenar
      let sx = 0, sz = 1;
      for (const [a, b] of DIRS) { const tx = m.x + (a > 0 ? 2 : a < 0 ? -1 : 0), ty = m.y + (b > 0 ? 2 : b < 0 ? -1 : 0); if (tx >= 0 && ty >= 0 && tx < N && ty < N && G.t[ty * N + tx] === V.T_WATER) { sx = a; sz = b; break; } }
      Bx(0, 0, 0, 1.94, 0.1, 1.94, '#b8ac94');
      Bx(-sx * 0.4, 0.1, -sz * 0.4, sx ? 0.8 : 1.6, 0.6, sz ? 0.8 : 1.6, '#a9553a');
      put(P.roof, cx - sx * 0.4, 0.7, cz - sz * 0.4, sx ? 0.86 : 1.66, 0.24, sz ? 0.86 : 1.66, sx ? Math.PI / 2 : 0, '#5f5852');
      Bx(sx * 0.7, 0.1, sz * 0.7, 0.07, 1.4, 0.07, '#6d5134'); Bx(sx * 0.95, 1.45, sz * 0.95, sx ? 0.6 : 0.05, 0.05, sz ? 0.6 : 0.05, '#6d5134');
      for (const [a, b] of [[0.25, 0.25], [0.45, 0.1], [0.1, 0.45]]) put(P.cyl, cx + a * (sz ? 1 : sx) + sx * 0.3, 0.1, cz + b * (sx ? 1 : sz) + sz * 0.3, 0.14, 0.18, 0.14, 0, '#7a5a3a');
      return;
    }
    if (m.k === V.S_BIGSQ) {
      put(P.cyl, cx, 0, cz, 2.9, 0.03, 2.9, 0, '#cdbf9e');
      put(P.cyl, cx, 0.03, cz, 2.0, 0.02, 2.0, 0, '#86b55e');
      put(P.cyl, cx, 0.05, cz, 1.2, 0.03, 1.2, 0, '#d9cdb2');
      put(P.cyl, cx, 0.05, cz, 0.95, 0.16, 0.95, 0, PAL.stone); put(P.cyl, cx, 0.08, cz, 0.8, 0.14, 0.8, 0, PAL.waterLit);
      put(P.cyl, cx, 0.2, cz, 0.12, 0.6, 0.12, 0, PAL.stone); put(P.cyl, cx, 0.78, cz, 0.36, 0.06, 0.36, 0, PAL.stone);
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + 0.39, x = cx + Math.cos(a) * 1.15, z = cz + Math.sin(a) * 1.15;
        put(P.box, x, 0, z, 0.06, 0.2, 0.06, 0, PAL.trunk); put(P.cone, x, 0.14, z, 0.36, 0.55, 0.36, 0, PAL.leaf[k % 5]); }
      for (const [a, b] of [[1.3, 0], [-1.3, 0], [0, 1.3], [0, -1.3]]) { put(P.cyl, cx + a, 0, cz + b, 0.03, 0.55, 0.03, 0, '#3a3a3a'); put(P.box, cx + a, 0.55, cz + b, 0.09, 0.09, 0.09, 0, '#f2d27a'); }
      return;
    }
    if (m.k === V.S_HIPPO) {
      put(P.cyl, cx, 0, cz, 3.8, 0.04, 2.7, 0, '#a98861');
      put(P.cyl, cx, 0.04, cz, 2.9, 0.02, 1.8, 0, '#7fae58');
      for (const a of [-1, 1]) put(P.box, cx + a * 0.5, 0.06, cz, 0.04, 0.04, 1.2, 0, '#f4efe2');
      Bx(0, 0, -1.3, 2.9, 0.36, 0.34, '#d8ccb0'); put(P.roof, cx, 0.36, cz - 1.3, 2.95, 0.22, 0.4, 0, '#7b3f2e');
      for (let k = -1.2; k <= 1.2; k += 0.4) Bx(k, 0.36, -1.1, 0.04, 0.05, 0.08, k % 0.8 === 0 ? PAL.crimson : '#efe6d2');
      for (const [a, b, c] of [[1.35, 0.6, '#5a3a24'], [1.1, 0.75, '#2e2a26'], [-1.4, -0.4, '#8a5a34']]) { Bx(a, 0.04, b, 0.22, 0.12, 0.07, c); Bx(a + 0.1, 0.1, b, 0.06, 0.1, 0.06, c); }
      for (const a of [-1.7, 1.7]) { put(P.cyl, cx + a, 0, cz - 1.25, 0.03, 0.9, 0.03, 0, '#5b5b5b'); Bx(a + 0.12, 0.78, -1.25, 0.22, 0.12, 0.01, PAL.crimson); }
      return;
    }
    if (m.k === V.S_BARRACKS) {
      Bx(0, 0, 0, 2.94, 0.02, 1.94, '#b9a98a');
      for (const [a, b, w, d] of [[0, -0.95, 2.94, 0.06], [0, 0.95, 2.94, 0.06], [-1.45, 0, 0.06, 1.94], [1.45, 0, 0.06, 1.94]]) Bx(a, 0, b, w, 0.3, d, '#c9b48a');
      Bx(0, 0, -0.45, 2.1, 0.62, 0.7, '#cdb88f'); put(P.roof, cx, 0.62, cz - 0.45, 2.16, 0.26, 0.76, 0, '#6b4b3b');
      for (let k = -0.8; k <= 0.8; k += 0.32) Bx(k, 0.25, -0.09, 0.1, 0.14, 0.02, '#5d7d95');
      Bx(0, 0, 0.95, 0.4, 0.42, 0.1, '#8e7a58');
      put(P.cyl, cx + 1.1, 0, cz + 0.5, 0.03, 1.3, 0.03, 0, '#5b5b5b'); Bx(1.25, 1.12, 0.5, 0.3, 0.18, 0.012, PAL.crimson);
      for (let k = 0; k < 6; k++) Bx(-0.8 + k * 0.18, 0, 0.45, 0.05, 0.13, 0.05, '#3e4a5a');
      return;
    }
    if (m.k === V.S_SITE) {
      const P0 = G.proj, p = P0 && V.PROJECTS[P0.i];
      let f = 0; if (p) { let a = 0, b = 0; for (const k in p.needs) { a += P0.got[k] || 0; b += p.needs[k]; } f = b ? a / b : 0; }
      for (const [a, b, w, d] of [[0, -0.95, 1.9, 0.04], [0, 0.95, 1.9, 0.04], [-0.95, 0, 0.04, 1.9], [0.95, 0, 0.04, 1.9]]) Bx(a, 0, b, w, 0.16, d, '#8a6a42');
      Bx(0, 0, 0, 1.5, 0.04, 1.5, '#a89a80');
      Bx(0, 0.04, 0, 1.2, 0.05 + f * 0.9, 0.9, '#c9c0ad');
      for (const [a, b] of [[-0.6, -0.45], [0.6, -0.45], [-0.6, 0.45], [0.6, 0.45]]) Bx(a, 0, b, 0.04, 0.2 + f * 1.1, 0.04, '#8a6a42');
      Bx(0.75, 0, -0.75, 0.06, 1.6, 0.06, '#b5482f'); Bx(0.45, 1.56, -0.75, 0.7, 0.05, 0.05, '#b5482f');
      for (const [a, b] of [[-0.7, 0.7], [-0.45, 0.72]]) Bx(a, 0, b, 0.2, 0.14, 0.2, '#9b7348');
      return;
    }
    // Anıtlar
    if (m.pid === 'aqueduct') {
      for (const a of [-0.78, -0.26, 0.26, 0.78]) Bx(a, 0, 0, 0.2, 0.95, 0.3, '#cfc4ab');
      Bx(0, 0.95, 0, 1.96, 0.22, 0.34, '#d8ceb6'); Bx(0, 1.17, 0, 1.96, 0.04, 0.16, PAL.waterLit);
      Bx(-0.55, 0, 0.62, 0.6, 0.28, 0.5, '#bfb39a'); Bx(-0.55, 0.28, 0.62, 0.5, 0.02, 0.4, PAL.waterLit);
    } else if (m.pid === 'rail') {
      Bx(0, 0, -0.25, 1.6, 0.55, 0.7, '#b9895f'); put(P.roof, cx, 0.55, cz - 0.25, 1.66, 0.3, 0.76, 0, '#4f4a48');
      Bx(0, 0, 0.3, 1.9, 0.1, 0.4, '#bdb5a5');
      for (const b of [0.62, 0.78]) Bx(0, 0, b, 1.96, 0.04, 0.03, '#4a4a4a');
      for (let a = -0.9; a <= 0.9; a += 0.2) Bx(a, 0, 0.7, 0.06, 0.02, 0.3, '#6b4b2e');
      Bx(0, 0.86, -0.25, 0.2, 0.2, 0.2, PAL.govWall);
    } else if (m.pid === 'quay') {
      Bx(0, 0, 0, 1.9, 0.18, 1.9, '#b8ac94');
      Bx(-0.5, 0.18, -0.4, 0.6, 0.4, 0.5, '#a9553a'); put(P.roof, cx - 0.5, 0.58, cz - 0.4, 0.66, 0.2, 0.56, 0, '#5f5852');
      Bx(0.6, 0.18, 0.5, 0.06, 1.2, 0.06, '#6d5134'); Bx(0.35, 1.36, 0.5, 0.55, 0.05, 0.05, '#6d5134');
      for (const [a, b] of [[0.2, 0.3], [0.35, 0.45], [0.1, 0.55]]) put(P.cyl, cx + a, 0.18, cz + b, 0.14, 0.18, 0.14, 0, '#7a5a3a');
    } else if (m.pid === 'power') {
      Bx(0, 0, 0, 1.94, 0.05, 1.94, '#a39a86'); Bx(0, 0.05, 0.2, 1.7, 0.9, 1.2, '#93503a'); put(P.roof, cx, 0.95, cz + 0.2, 1.76, 0.3, 1.26, 0, '#4a4440');
      for (const a of [-0.6, 0, 0.6]) { put(P.cyl, cx + a, 0.05, cz - 0.65, 0.24, 2.0, 0.24, 0, '#7a4634'); put(P.cyl, cx + a, 2.05, cz - 0.65, 0.28, 0.07, 0.28, 0, '#3a3532'); }
      for (const a of [-0.55, 0, 0.55]) Bx(a, 0.3, 0.81, 0.3, 0.45, 0.012, '#f2d27a');
    } else if (m.pid === 'sewer') {
      Bx(0, 0, 0, 1.94, 0.05, 1.94, '#b3aa98'); put(P.cyl, cx - 0.3, 0.05, cz, 1.1, 0.7, 1.1, 0, '#c9bfa8'); put(P.cone, cx - 0.3, 0.75, cz, 1.2, 0.35, 1.2, 0, '#5f6f6a');
      put(P.cyl, cx + 0.6, 0.05, cz + 0.4, 0.5, 0.22, 0.5, 0, '#8f8470'); put(P.cyl, cx + 0.6, 0.1, cz + 0.4, 0.4, 0.2, 0.4, 0, PAL.waterLit); Bx(0.3, 0.2, 0.4, 0.6, 0.1, 0.1, '#55504a');
    } else if (m.pid === 'univ') {
      Bx(0, 0, 0, 1.94, 0.08, 1.94, '#cdbf9e'); Bx(0, 0.08, -0.2, 1.7, 0.8, 1.0, '#efe6d2'); put(P.roof, cx, 0.88, cz - 0.2, 1.76, 0.24, 1.06, 0, '#7b3f2e');
      for (const a of [-0.6, -0.3, 0, 0.3, 0.6]) put(P.cyl, cx + a, 0.08, cz + 0.42, 0.1, 0.72, 0.1, 0, '#f8f4ea');
      Bx(0, 0.8, 0.42, 1.5, 0.1, 0.24, '#efe6d2'); put(P.cyl, cx, 1.0, cz - 0.2, 0.6, 0.25, 0.6, 0, '#efe6d2'); put(P.cone, cx, 1.25, cz - 0.2, 0.66, 0.42, 0.66, 0, '#5f8f8a');
    } else if (m.pid === 'dam') {
      Bx(0, 0, 0, 1.94, 0.1, 1.94, '#9aa0a0'); Bx(0, 0.1, -0.3, 1.94, 0.9, 0.5, '#c5c7c2');
      Bx(0, 1.0, -0.3, 1.94, 0.06, 0.6, '#8d8f8a'); Bx(0, 0.1, 0.35, 1.9, 0.04, 1.1, PAL.waterLit);
      for (const a of [-0.6, 0, 0.6]) Bx(a, 0.3, -0.04, 0.2, 0.5, 0.02, '#e8eef2');
      Bx(0.6, 0.1, 0.6, 0.6, 0.45, 0.5, '#b7b2a8'); put(P.roof, cx + 0.6, 0.55, cz + 0.6, 0.64, 0.16, 0.54, 0, '#5f6f78');
    } else if (m.pid === 'motorway') {
      put(P.cyl, cx, 0, cz, 1.9, 0.03, 1.9, 0, '#7f8f55');
      Bx(0, 0.03, 0, 1.96, 0.04, 0.5, '#5e5c59'); Bx(0, 0.25, 0, 0.5, 0.04, 1.96, '#5e5c59');
      for (const a of [-0.6, 0.6]) Bx(0, 0.03, a * 0.3, 0.02, 0.22, 0.02, '#a8a49c');
      for (const b of [-0.3, 0.3]) Bx(b, 0.03, 0, 0.08, 0.22, 0.4, '#a8a49c');
      Bx(0, 0.08, 0, 1.9, 0.01, 0.03, '#f2d27a'); Bx(0, 0.3, 0, 0.03, 0.01, 1.9, '#f2d27a');
    } else if (m.pid === 'airport') {
      Bx(0, 0, 0, 1.96, 0.02, 1.96, '#8fae5e'); Bx(0.25, 0.02, 0, 0.5, 0.02, 1.96, '#5e5c59');
      for (let k = -0.8; k <= 0.8; k += 0.4) Bx(0.25, 0.04, k, 0.04, 0.005, 0.18, '#f4efe2');
      Bx(-0.55, 0.02, 0.3, 0.7, 0.4, 1.0, '#d8d2c4'); Bx(-0.55, 0.42, 0.3, 0.74, 0.04, 1.04, '#5f6f78');
      put(P.cyl, cx - 0.55, 0.02, cz - 0.6, 0.14, 0.95, 0.14, 0, '#d8d2c4'); put(P.cyl, cx - 0.55, 0.97, cz - 0.6, 0.26, 0.16, 0.26, 0, '#4d6a80');
      Bx(0.25, 0.05, -0.45, 0.12, 0.08, 0.55, '#eef0f2'); Bx(0.25, 0.08, -0.45, 0.55, 0.02, 0.12, '#eef0f2'); Bx(0.25, 0.09, -0.7, 0.2, 0.08, 0.04, '#c0392b');
    } else if (m.pid === 'stadium') {
      put(P.cyl, cx, 0, cz, 1.96, 0.45, 1.6, 0, '#cfc9bd'); put(P.cyl, cx, 0.3, cz, 1.5, 0.18, 1.14, 0, '#7fae58');
      for (const a of [-0.25, 0.25]) Bx(a, 0.48, 0, 0.02, 0.01, 0.6, '#f4efe2');
      for (const [a, b] of [[0.9, 0.7], [-0.9, 0.7], [0.9, -0.7], [-0.9, -0.7]]) { put(P.cyl, cx + a, 0, cz + b, 0.03, 1.2, 0.03, 0, '#5b5b5b'); Bx(a, 1.2, b, 0.16, 0.1, 0.04, '#f2d27a'); }
    } else if (m.pid === 'victory') {
      put(P.cyl, cx, 0, cz, 1.94, 0.04, 1.94, 0, '#cdbf9e'); put(P.cyl, cx, 0.04, cz, 1.0, 0.1, 1.0, 0, '#bdb5a5'); put(P.cyl, cx, 0.14, cz, 0.7, 0.1, 0.7, 0, '#c9c0ad');
      Bx(0, 0.24, 0, 0.36, 0.5, 0.36, '#d9cdb2'); Bx(0, 0.74, 0, 0.24, 1.7, 0.24, '#e6dcc4'); put(P.pyr, cx, 2.44, cz, 0.3, 0.3, 0.3, 0, '#d4ac0d');
      for (const [a, b] of [[0.8, 0], [-0.8, 0], [0, 0.8], [0, -0.8]]) { put(P.cyl, cx + a, 0, cz + b, 0.03, 0.9, 0.03, 0, '#5b5b5b'); put(P.box, cx + a + 0.1, 0.78, cz + b, 0.2, 0.12, 0.01, 0, PAL.crimson); }
    } else if (m.pid === 'tower') {
      Bx(0, 0, 0, 1.94, 0.03, 1.94, '#cdbf9e');
      Bx(0, 0.03, 0, 0.56, 2.1, 0.56, '#d9cdb2'); part(P.pyr, cx, cz, 0, 0, 2.13, 0, 0.66, 0.5, 0.66, '#5f5852');
      for (const [a, b] of [[0, 0.29], [0, -0.29], [0.29, 0], [-0.29, 0]]) put(P.box, cx + a, 1.62, cz + b, a ? 0.02 : 0.3, 0.3, a ? 0.3 : 0.02, 0, '#f4efe2');
    }
  }

  /* ---------- hareket eden arabalar ve yayalar ---------- */
  let agents = [], agentEra = '';
  function roadTiles() { const r = []; for (let i = 0; i < N * N; i++) if (G.r[i]) r.push(i); return r; }
  function syncAgents() {
    const T0 = V.totals(G), want = Math.min(140, Math.floor(3 + T0.P / 10)), tramOn = !!V.cache(G).cnt.tram, busOn = !!V.cache(G).cnt.bus, carOn = T0.yr >= 1908;
    if (agentEra !== tramOn + '|' + carOn + '|' + busOn) { agentEra = tramOn + '|' + carOn + '|' + busOn; agents = []; }
    const roads = roadTiles();
    if (!roads.length) { agents = []; return; }
    while (agents.length > want) agents.pop();
    while (agents.length < want) {
      const a = roads[(Math.random() * roads.length) | 0];
      const cart = Math.random() < 0.35;
      agents.push({ a, b: a, t: 1, sp: cart ? 0.55 : 0.32 + Math.random() * 0.12, cart, col: cart ? '#6b4b2e' : pick(['#7a3b2e', '#2e4a7a', '#4a6b3a', '#6a5a7a', '#8a7a5a', '#3a3a3a'], Math.random()), side: Math.random() < 0.5 ? 1 : -1 });
      const g = agents[agents.length - 1];
      if (busOn && Math.random() < 0.1) { g.bus = 1; g.sp = 0.8; } else if (tramOn && Math.random() < 0.12) { g.tram = 1; g.sp = 0.7; } else if (g.cart && carOn && Math.random() < (T0.yr >= 1930 ? 0.85 : 0.5)) { g.car = 1; g.sp = 0.95; }
    }
  }
  function stepAgents(dt) {
    P.agent.count = 0;
    for (const g of agents) {
      g.t += dt * g.sp;
      if (g.t >= 1) {
        g.t = 0; g.a = g.b;
        const opts = V.neigh4(G, g.a).filter(j => G.r[j]);
        if (!opts.length || !G.r[g.a]) { g.b = g.a; continue; }
        const fwd = opts.filter(j => j !== g.prev);
        g.prev = g.a; g.b = pick(fwd.length ? fwd : opts, Math.random());
      }
      const ax = W(g.a % N), az = W((g.a / N) | 0), bx = W(g.b % N), bz = W((g.b / N) | 0);
      const dx = bx - ax, dz = bz - az, x = ax + dx * g.t + dz * 0.13 * g.side, z = az + dz * g.t - dx * 0.13 * g.side;
      const wa = elevated(g.a), wb = elevated(g.b), onB = wa && wb ? DECK + 0.005 : wa || wb ? 0.015 + (DECK - 0.01) * (wa ? 1 - g.t : g.t) : 0.015;
      const rot = Math.atan2(dx, dz);
      if (g.bus) put(P.agent, x, onB, z, 0.13, 0.16, 0.4, rot, '#2e6fb0');
      else if (g.tram) put(P.agent, x, onB, z, 0.13, 0.17, 0.42, rot, '#c9a227');
      else if (g.cart) put(P.agent, x, onB, z, g.car ? 0.11 : 0.12, 0.1, g.car ? 0.24 : 0.2, rot, g.car ? '#22262b' : g.col);
      else put(P.agent, x, onB, z, 0.045, 0.12, 0.045, rot, g.col);
    }
    flush(P.agent);
  }

  /* ---------- önizleme, kapsama katmanı, seçim ---------- */
  const prevMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false });
  const ovMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.3, depthWrite: false });
  function setPreview(ok, bad, roads) {
    const g = new THREE.Color('#5bd18a'), r = new THREE.Color('#e5533d'), rd = new THREE.Color('#c9a46a');
    flatMesh('prev', prevMat, (q) => {
      for (const [list, c] of [[ok, g], [bad, r], [roads, rd]]) for (const i of list || []) {
        if (i < 0) continue;
        const x = i % N, y = (i / N) | 0, x0 = x - N / 2, z0 = y - N / 2, h = G.t[i] === V.T_ROCK ? G.h[i] * 0.45 : G.t[i] === V.T_WATER ? 0.06 : 0;
        q(x0 + 0.02, z0 + 0.02, x0 + 0.98, z0 + 0.98, h + 0.03, c);
      }
    }).renderOrder = 3;
  }
  let overlay = null;
  function setOverlay(kind) { overlay = kind; buildOverlay(); }
  function buildOverlay() {
    const c = V.cache(G), red = new THREE.Color('#ff3b1f');
    const tint = new THREE.Color({ transit: '#e07a3a', freight: '#8a6a42', water: '#2f8fe0', police: '#5a6fd6', school: '#e0a030', clinic: '#2fbf9f', square: '#c46ad6', fire: '#e8562c', fun: '#d6b13a', flood: '#3fa36a', mill: '#d9c24a' }[overlay] || '#2f8fe0');
    flatMesh('ov', ovMat, (q) => {
      const cov = overlay && c[overlay]; if (!cov) return;
      for (let i = 0; i < N * N; i++) {
        if (G.t[i] === V.T_WATER || G.t[i] === V.T_ROCK) continue;
        const dry = !cov[i] && G.z[i] === V.Z_RES && G.lv[i] > 0;
        if (!cov[i] && !dry) continue;
        const x = i % N, y = (i / N) | 0, x0 = x - N / 2, z0 = y - N / 2;
        q(x0, z0, x0 + 1, z0 + 1, 0.02, dry ? red : tint);
      }
    }).renderOrder = 2;
  }
  const selGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 0.02, 1));
  const sel = new THREE.LineSegments(selGeo, new THREE.LineBasicMaterial({ color: '#ffd84a' }));
  sel.visible = false; world.add(sel);
  function select(i) {
    if (i == null || i < 0) { sel.visible = false; return; }
    const x = i % N, y = (i / N) | 0;
    const big = G.sv[i] === V.S_GOV, m = !big && V.multiAt(G, i);
    if (big) { sel.scale.set(2, 1, 2); sel.position.set(G.gov.x - N / 2 + 1, 0.03, G.gov.y - N / 2 + 1); }
    else if (m) { sel.scale.set(2, 1, 2); sel.position.set(m.x - N / 2 + 1, 0.03, m.y - N / 2 + 1); }
    else { sel.scale.set(1, 1, 1); sel.position.set(W(x), 0.03, W(y)); }
    sel.visible = true;
  }

  /* ---------- kamera ---------- */
  const cam = { tx: 0, tz: 0, dist: 30, yaw: 0.65 };
  function pitch() { return 0.62 + Math.min(1, Math.max(0, (cam.dist - 6) / 60)) * 0.42; }
  function placeCamera() {
    const p = pitch(), d = cam.dist;
    cam.tx = Math.max(-N / 2, Math.min(N / 2, cam.tx)); cam.tz = Math.max(-N / 2, Math.min(N / 2, cam.tz));
    camera.position.set(cam.tx + Math.sin(cam.yaw) * Math.cos(p) * d, Math.sin(p) * d, cam.tz + Math.cos(cam.yaw) * Math.cos(p) * d);
    camera.lookAt(cam.tx, 0, cam.tz);
    // Gölge kamerası görülen alanı izler
    const span = Math.min(42, cam.dist * 0.95 + 6);
    sun.position.set(cam.tx + SUN_DIR.x * 60, SUN_DIR.y * 60, cam.tz + SUN_DIR.z * 60);
    sun.target.position.set(cam.tx, 0, cam.tz);
    const sc = sun.shadow.camera; sc.left = -span; sc.right = span; sc.top = span; sc.bottom = -span; sc.near = 1; sc.far = 160; sc.updateProjectionMatrix();
  }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  function ground(sx, sy) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((sx - r.left) / r.width) * 2 - 1, -((sy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.ray.intersectPlane(plane, hit) ? hit.clone() : null;
  }
  const prj = new THREE.Vector3();
  function screenOf(i) {        // karenin ekran konumu (piksel)
    const r = canvas.getBoundingClientRect();
    prj.set(W(i % N), 0.2, W((i / N) | 0)).project(camera);
    return { x: r.left + (prj.x + 1) / 2 * r.width, y: r.top + (1 - prj.y) / 2 * r.height, behind: prj.z > 1 };
  }
  function tileAt(sx, sy) {
    const p = ground(sx, sy); if (!p) return -1;
    const x = Math.floor(p.x + N / 2), y = Math.floor(p.z + N / 2);
    return x >= 0 && y >= 0 && x < N && y < N ? y * N + x : -1;
  }
  function pan(dx, dy) {
    const r = canvas.getBoundingClientRect();
    const s = (2 * Math.tan((camera.fov * Math.PI) / 360) * cam.dist) / r.height;
    const c = Math.cos(cam.yaw), si = Math.sin(cam.yaw);
    cam.tx -= (dx * c + dy * si / Math.sin(pitch())) * s;
    cam.tz -= (-dx * si + dy * c / Math.sin(pitch())) * s;
    placeCamera();
  }
  function zoomAt(f, sx, sy) {
    const a = sx != null ? ground(sx, sy) : null;
    cam.dist = Math.max(5, Math.min(105, cam.dist * f)); placeCamera();
    if (a) { const b = ground(sx, sy); if (b) { cam.tx += a.x - b.x; cam.tz += a.z - b.z; placeCamera(); } }
  }
  function rotate(d) { cam.yaw += d; placeCamera(); }
  function focus(i, dist) { cam.tx = W(i % N); cam.tz = W((i / N) | 0); if (dist) cam.dist = dist; placeCamera(); }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix();
  }

  /* ---------- güncelleme ---------- */
  let lastMonth = -1;
  /* Tren: istasyon ana hatta bağlıysa aralıklarla batıdan gelir, istasyonda bekler, geri döner */
  let train = null;
  function syncTrain() {
    const c = V.cache(G);
    if (!c.railOut || !G.railEntry) { train = null; P.train.count = 0; flush(P.train); return; }
    const st = G.multi.find(m => m.k === V.S_LANDMARK && m.pid === 'rail');
    const stTiles = new Set(V.multiTiles(G, st));
    const start = G.railEntry.y * N + G.railEntry.x, prev = new Map([[start, -1]]), q = [start];
    let end = -1;
    while (q.length) { const i = q.shift(); if (V.neigh4(G, i).some(j => stTiles.has(j))) { end = i; break; } for (const j of V.neigh4(G, i)) if (G.rl[j] && !prev.has(j)) { prev.set(j, i); q.push(j); } }
    if (end < 0) { train = null; return; }
    const path = []; for (let k = end; k !== -1; k = prev.get(k)) path.unshift(k);
    const pts = [];
    for (let k = 6; k >= 1; k--) pts.push([W(-k), W(G.railEntry.y), 0.05]);     // haritanın dışından gelir
    for (const i of path) pts.push([W(i % N), W((i / N) | 0), G.t[i] === V.T_WATER ? DECK + 0.03 : 0.05]);
    train = { pts, s: 0, dir: 1, wait: 3, len: pts.length - 1 };
  }
  function at(t, s) { const k = Math.max(0, Math.min(t.len - 1e-6, s)), i = Math.floor(k), f = k - i, a = t.pts[i], b = t.pts[i + 1]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, Math.atan2(b[0] - a[0], b[1] - a[1]), a[2] + (b[2] - a[2]) * f]; }
  function stepTrain(dt) {
    if (!train) return;
    const t = train;
    if (t.wait > 0) t.wait -= dt;
    else {
      t.s += dt * 1.6 * t.dir;
      if (t.dir > 0 && t.s >= t.len) { t.s = t.len; t.dir = -1; t.wait = 5; }          // istasyonda bekler
      else if (t.dir < 0 && t.s <= 0) { t.s = 0; t.dir = 1; t.wait = 14; }             // hat dışında, sonraki sefer
    }
    P.train.count = 0;
    const cols = ['#2b2b2b', '#7a3b2e', '#3e5b7a', '#6b6b3a'];
    for (let k = 0; k < 4; k++) {
      const [x, z, rot, yb] = at(t, t.s - k * 0.62 * t.dir);
      if (k === 0) { put(P.train, x, yb, z, 0.3, 0.26, 0.5, rot, cols[0]); put(P.train, x + Math.sin(rot) * 0.15 * t.dir, yb + 0.26, z + Math.cos(rot) * 0.15 * t.dir, 0.07, 0.14, 0.07, rot, '#1e1e1e'); }
      else put(P.train, x, yb, z, 0.28, 0.24, 0.52, rot, cols[k]);
    }
    flush(P.train);
  }

  /* Nehir limanı varken nehirde yelkenli mavnalar gider gelir */
  let boats = [], river = null;
  function syncBoats() {
    const c = V.cache(G);
    if (!c.cnt.port) { boats = []; P.boat.count = 0; flush(P.boat); return; }
    river = [];
    for (let y = 0; y < N; y++) { let s = 0, k = 0; for (let x = 0; x < N; x++) if (G.t[y * N + x] === V.T_WATER) { s += x; k++; } river.push(k ? s / k : null); }
    if (river.some(v => v == null)) { boats = []; return; }
    if (!boats.length) boats = [{ s: 5, dir: 1, col: '#7a4a2a' }, { s: N - 12, dir: -1, col: '#6b5040' }, { s: N / 2, dir: 1, col: '#80583a' }];
  }
  function stepBoats(dt) {
    if (!boats.length || !river) return;
    P.boat.count = 0;
    for (const b of boats) {
      b.s += dt * 0.5 * b.dir;
      if (b.s > N + 3) b.s = -3; if (b.s < -3) b.s = N + 3;
      const y = Math.max(0, Math.min(N - 1.001, b.s)), i = Math.floor(y), f = y - i;
      const a = river[i], c = river[Math.min(N - 1, i + 1)], x = a + (c - a) * f + 0.5 + 0.28 * b.dir;
      const rot = Math.atan2((c - a), 1) * b.dir + (b.dir < 0 ? Math.PI : 0);
      const wx = x - N / 2, wz = b.s - N / 2 + 0.5;
      put(P.boat, wx, -0.13, wz, 0.22, 0.1, 0.6, rot, b.col);
      put(P.boat, wx, -0.03, wz, 0.02, 0.5, 0.02, rot, '#5b4636');
      put(P.boat, wx + Math.cos(rot) * 0.02, 0.05, wz - Math.sin(rot) * 0.02, 0.015, 0.36, 0.3, rot, '#f1ece0');
    }
    flush(P.boat);
  }

  function syncAll() { N = G.N; lastTv = G.tv; buildTerrain(); buildRoads(); buildTrees(); buildGov(); buildBuildings(); buildFlats(); buildOverlay(); syncAgents(); syncTrain(); syncBoats(); buildOwn(); }
  let lastTv = -1;
  function syncDay() {      // her oyun günü: binalar ve tarlalar
    if (G.tv !== lastTv) { lastTv = G.tv; buildTerrain(); buildTrees(); buildRoads(); syncTrain(); }
    buildBuildings();
    const m = V.dateOf(G).month;
    buildFlats(); if (m !== lastMonth) { lastMonth = m; syncAgents(); }
    if (overlay) buildOverlay();
  }
  function syncBuild() {    // oyuncu bir şey inşa ettiğinde
    buildRoads(); buildTrees(); buildBuildings(); buildFlats(); buildOverlay(); syncAgents(); syncTrain(); syncBoats(); buildOwn();
    buildGov();
  }
  let clock = 0;
  function frame(dt, running) {
    clock += dt;
    if (running) { stepAgents(dt * running); stepTrain(dt * running); stepBoats(dt * running); }
    if (govGroup) govGroup.traverse(o => { if (o.userData.flag) o.rotation.y = Math.sin(clock * 2.2) * 0.25; });
    water && (water.material.opacity = 0.8 + Math.sin(clock * 0.9) * 0.04);
    renderer.render(scene, camera);
  }
  function setGame(g) { G = g; N = G.N; syncAll(); cam.tx = 0; cam.tz = 0; placeCamera(); }

  resize(); syncAll(); placeCamera();
  return { setGame, syncAll, syncDay, syncBuild, frame, resize, tileAt, screenOf, pan, zoomAt, rotate, focus, setPreview, setOverlay, select, cam, renderer,
    get overlay() { return overlay; }, placeCamera };
}

/* Üçgen prizma çatı: x -0.5..0.5, y 0..1 (sırt), z -0.5..0.5 */
function prismGeometry() {
  const a = [-0.5, 0, -0.5], b = [0.5, 0, -0.5], c = [0, 1, -0.5], d = [-0.5, 0, 0.5], e = [0.5, 0, 0.5], f = [0, 1, 0.5];
  const tri = [a, c, b, d, e, f, a, d, f, a, f, c, b, c, f, b, f, e, a, b, e, a, e, d];
  // Sırt z ekseni boyunca değil x boyunca uzasın diye döndür: çatı cepheye paralel
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tri.flat(), 3));
  g.rotateY(Math.PI / 2);
  g.computeVertexNormals();
  return g;
}

function makeFieldTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 64, 64);
  for (let k = 0; k < 64; k += 8) { x.fillStyle = 'rgba(60,40,20,0.28)'; x.fillRect(0, k, 64, 3); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
