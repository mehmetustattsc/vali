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
  scene.fog = new THREE.Fog(sky, 60, 150);
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
    box: pool(geo.box, 9000), roof: pool(geo.roof, 6000), cyl: pool(geo.cyl, 1500), cone: pool(geo.cone, 1500), pyr: pool(geo.pyr, 200),
    agent: pool(geo.box, 300, false),
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
    build((x0, z0, x1, z1, y, color, u) => {
      pos.push(x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0);
      for (let k = 0; k < 6; k++) col.push(color.r, color.g, color.b);
      if (u) uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);    // döndürülmüş sıralar
      else uv.push(0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0);
    });
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

  function buildRoads() {
    const cc = new THREE.Color();
    flatMesh('road', roadMat, (q) => {
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const i = y * N + x; if (!G.r[i]) continue;
        const onWater = G.t[i] === V.T_WATER, yy = onWater ? 0.05 : 0.014;
        cc.set(onWater ? PAL.bridge : G.r[i] === 2 ? PAL.roadStone : PAL.roadDirt);
        const cx = W(x), cz = W(y), w = 0.29;
        q(cx - w, cz - w, cx + w, cz + w, yy, cc);
        const link = (nx, ny) => nx >= 0 && ny >= 0 && nx < N && ny < N && G.r[ny * N + nx];
        const edge = (nx, ny) => nx < 0 || ny < 0 || nx >= N || ny >= N;   // harita kenarına devam eder
        if (link(x, y - 1) || (G.r[i] === 2 && edge(x, y - 1))) q(cx - w, cz - 0.5, cx + w, cz - w, yy, cc);
        if (link(x, y + 1) || (G.r[i] === 2 && edge(x, y + 1))) q(cx - w, cz + w, cx + w, cz + 0.5, yy, cc);
        if (link(x - 1, y) || (G.r[i] === 2 && edge(x - 1, y))) q(cx - 0.5, cz - w, cx - w, cz + w, yy, cc);
        if (link(x + 1, y)) q(cx + w, cz - w, cx + 0.5, cz + w, yy, cc);
      }
    });
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
      const used = G.r[i] || G.z[i] || G.sv[i];
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
        const hgt = (z === V.Z_RES ? [0, 0.34, 0.55, 0.85] : [0, 0.42, 0.65, 1.1])[lv] * (0.15 + 0.85 * pg);
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
        } else {
          const wc = pick(PAL.wall3, r), rc = pick(PAL.roof3, r2);
          part(P.box, cx, cz, rot, 0, 0, 0.03, 0.86, 0.86, 0.72, wc);
          part(P.roof, cx, cz, rot, 0, 0.86, 0.03, 0.9, 0.24, 0.76, rc);
          part(P.box, cx, cz, rot, 0, 0, 0.39, 0.88, 0.07, 0.02, '#a08f75');
          part(P.box, cx, cz, rot, -0.24, 0.92, -0.1, 0.08, 0.24, 0.08, '#6e5d50');
        }
        continue;
      }
      if (z === V.Z_COM) {
        const wc = pick(PAL.comWall, r), rc = pick(PAL.comRoof, r2), ac = pick(PAL.awning, r * 7);
        const d = lv === 1 ? [0.6, 0.42, 0.52] : lv === 2 ? [0.8, 0.66, 0.68] : [0.88, 1.1, 0.8];
        part(P.box, cx, cz, rot, 0, 0, 0.02, d[0], d[1], d[2], wc);
        part(P.roof, cx, cz, rot, 0, d[1], 0.02, d[0] + 0.06, lv === 3 ? 0.2 : 0.24, d[2] + 0.06, rc);
        part(P.box, cx, cz, rot, 0, 0.26, d[2] / 2 + 0.1, d[0] * 0.9, 0.035, 0.2, ac);
        part(P.box, cx, cz, rot, 0, 0, d[2] / 2 + 0.03, d[0] * 0.5, 0.22, 0.02, '#4b3a2c');
        if (lv === 3) part(P.box, cx, cz, rot, 0, 0.62, d[2] / 2 + 0.1, d[0] * 0.9, 0.035, 0.16, ac);
      }
    }
    for (const k of ['box', 'roof', 'cyl', 'cone', 'pyr']) flush(P[k]);
  }

  /* ---------- hareket eden arabalar ve yayalar ---------- */
  let agents = [];
  function roadTiles() { const r = []; for (let i = 0; i < N * N; i++) if (G.r[i]) r.push(i); return r; }
  function syncAgents() {
    const T0 = V.totals(G), want = Math.min(140, Math.floor(3 + T0.P / 10));
    const roads = roadTiles();
    if (!roads.length) { agents = []; return; }
    while (agents.length > want) agents.pop();
    while (agents.length < want) {
      const a = roads[(Math.random() * roads.length) | 0];
      const cart = Math.random() < 0.35;
      agents.push({ a, b: a, t: 1, sp: cart ? 0.55 : 0.32 + Math.random() * 0.12, cart, col: cart ? '#6b4b2e' : pick(['#7a3b2e', '#2e4a7a', '#4a6b3a', '#6a5a7a', '#8a7a5a', '#3a3a3a'], Math.random()), side: Math.random() < 0.5 ? 1 : -1 });
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
      const rot = Math.atan2(dx, dz), onB = G.t[g.a] === V.T_WATER || G.t[g.b] === V.T_WATER ? 0.06 : 0.015;
      if (g.cart) { put(P.agent, x, onB, z, 0.12, 0.1, 0.2, rot, g.col); }
      else put(P.agent, x, onB, z, 0.045, 0.12, 0.045, rot, g.col);
    }
    flush(P.agent);
  }

  /* ---------- önizleme, kapsama katmanı, seçim ---------- */
  const prevMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, depthWrite: false });
  const ovMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.3, depthWrite: false });
  function setPreview(ok, bad) {
    const g = new THREE.Color('#5bd18a'), r = new THREE.Color('#e5533d');
    flatMesh('prev', prevMat, (q) => {
      for (const [list, c] of [[ok, g], [bad, r]]) for (const i of list || []) {
        if (i < 0) continue;
        const x = i % N, y = (i / N) | 0, x0 = x - N / 2, z0 = y - N / 2, h = G.t[i] === V.T_ROCK ? G.h[i] * 0.45 : G.t[i] === V.T_WATER ? 0.06 : 0;
        q(x0 + 0.02, z0 + 0.02, x0 + 0.98, z0 + 0.98, h + 0.03, c);
      }
    }).renderOrder = 3;
  }
  let overlay = null;
  function setOverlay(kind) { overlay = kind; buildOverlay(); }
  function buildOverlay() {
    const c = V.cache(G), blue = new THREE.Color('#2f8fe0'), red = new THREE.Color('#ff3b1f');
    flatMesh('ov', ovMat, (q) => {
      if (overlay !== 'water') return;
      for (let i = 0; i < N * N; i++) {
        if (G.t[i] === V.T_WATER || G.t[i] === V.T_ROCK) continue;
        const dry = !c.water[i] && G.z[i] === V.Z_RES && G.lv[i] > 0;
        if (!c.water[i] && !dry) continue;
        const x = i % N, y = (i / N) | 0, x0 = x - N / 2, z0 = y - N / 2;
        q(x0, z0, x0 + 1, z0 + 1, 0.02, dry ? red : blue);
      }
    }).renderOrder = 2;
  }
  const selGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 0.02, 1));
  const sel = new THREE.LineSegments(selGeo, new THREE.LineBasicMaterial({ color: '#ffd84a' }));
  sel.visible = false; world.add(sel);
  function select(i) {
    if (i == null || i < 0) { sel.visible = false; return; }
    const x = i % N, y = (i / N) | 0;
    const big = G.sv[i] === V.S_GOV;
    if (big) { sel.scale.set(2, 1, 2); sel.position.set(G.gov.x - N / 2 + 1, 0.03, G.gov.y - N / 2 + 1); }
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
    cam.dist = Math.max(5, Math.min(75, cam.dist * f)); placeCamera();
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
  function syncAll() { N = G.N; buildTerrain(); buildRoads(); buildTrees(); buildGov(); buildBuildings(); buildFlats(); buildOverlay(); syncAgents(); }
  function syncDay() {      // her oyun günü: binalar ve tarlalar
    buildBuildings();
    const m = V.dateOf(G).month;
    buildFlats(); if (m !== lastMonth) { lastMonth = m; syncAgents(); }
    if (overlay) buildOverlay();
  }
  function syncBuild() {    // oyuncu bir şey inşa ettiğinde
    buildRoads(); buildTrees(); buildBuildings(); buildFlats(); buildOverlay(); syncAgents();
    buildGov();
  }
  let clock = 0;
  function frame(dt, running) {
    clock += dt;
    if (running) stepAgents(dt * running);
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
