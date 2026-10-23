// 凌晨牛肉麵 3D：在凌晨的城市裡自由開車回家，再煮一碗麵。
// 開車階段由這支程式處理；煮麵與計分沿用 noodle-core.js 的 Session。
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as CANNON from 'cannon-es';

const G = window.NoodleGame, game = new G.Session();
const $ = id => document.getElementById(id);
const tr = (zh, en) => window.YKLanguage?.language === 'en' ? en : zh;
const put = (id, v) => { const el = $(id); if (el && el.textContent !== String(v)) el.textContent = String(v); };
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(any-pointer: coarse)').matches;
const bestKey = 'yichi-noodle-best-v1';
let best = 0; try { const v = Number(localStorage.getItem(bestKey)); if (Number.isInteger(v) && v >= 0 && v <= 10000) best = v; } catch {}

const scene3d = $('night-3d'), panel = document.querySelector('.night-game'), sceneBox = $('night-scene');
const cookCanvas = $('night-canvas'), ctx = cookCanvas.getContext('2d');

/* ================= city layout ================= */
const NB = 7, BS = 56, RW = 16, P = BS + RW, LANE = 4, MAX = NB * P;
const M_PER_UNIT = 4.2;
const road = i => i * P;
const START = { node: [1, 7], heading: 0 }; // heading 0 faces north (-z)
const HOME = { a: [5, 1], b: [6, 1] };
const homePos = new THREE.Vector3((road(5) + road(6)) / 2, 0, road(1));
const key = (i, j) => i + ',' + j;
const ekey = (a, b) => { const [p, q] = [key(...a), key(...b)].sort(); return p + '|' + q; };

// construction zones close some street segments; pick a set that keeps home reachable and forces at least one turn
const CANDIDATES = [[[1, 4], [1, 5]], [[1, 2], [1, 3]], [[2, 6], [3, 6]], [[3, 3], [3, 4]], [[4, 1], [5, 1]], [[2, 2], [3, 2]], [[5, 3], [5, 4]], [[3, 5], [4, 5]], [[4, 2], [4, 3]], [[6, 4], [6, 5]], [[2, 4], [3, 4]], [[5, 5], [6, 5]]];
let blocked = new Set();
const neighbors = (i, j) => [[i + 1, j], [i - 1, j], [i, j + 1], [i, j - 1]].filter(([a, b]) => a >= 0 && b >= 0 && a <= NB && b <= NB);
let dist = new Map(), next = new Map();
function solve() {
  dist = new Map(); next = new Map();
  const q = [[key(...HOME.a), P / 2, null], [key(...HOME.b), P / 2, null]];
  while (q.length) {
    q.sort((x, y) => x[1] - y[1]); const [k, d, n] = q.shift();
    if (dist.has(k)) continue; dist.set(k, d); next.set(k, n);
    const [i, j] = k.split(',').map(Number);
    for (const nb of neighbors(i, j)) { const nk = key(...nb); if (dist.has(nk) || blocked.has(ekey([i, j], nb)) || ekey([i, j], nb) === ekey(HOME.a, HOME.b)) continue; q.push([nk, d + P, k]); }
  }
}
function pickBlocked() {
  for (let tries = 0; tries < 40; tries++) {
    const pool = CANDIDATES.slice().sort(() => Math.random() - .5).slice(0, 5);
    blocked = new Set(pool.map(([a, b]) => ekey(a, b)));
    solve(); const d = dist.get(key(...START.node));
    if (d && d >= 10 * P && d <= 12 * P) return;
  }
  blocked = new Set([ekey([1, 4], [1, 5]), ekey([3, 3], [3, 4]), ekey([2, 2], [3, 2])]); solve();
}

/* ================= renderer ================= */
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: scene3d, antialias: !touch, powerPreference: 'high-performance' }); }
catch (e) { sceneBox.insertAdjacentHTML('beforeend', `<p class="night-nogl">${tr('這台裝置無法顯示 3D 畫面，請改用其他瀏覽器或裝置。', 'This device cannot show 3D graphics. Try another browser or device.')}</p>`); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio, touch ? 1.4 : 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
const scene = new THREE.Scene();
const SKY = new THREE.Color(0x0c1426);
scene.background = SKY; scene.fog = new THREE.FogExp2(SKY, .0062);
const camera = new THREE.PerspectiveCamera(62, 1, .5, 900);
scene.add(new THREE.HemisphereLight(0x51608f, 0x1a1a24, .85));
const moon = new THREE.DirectionalLight(0x9bb0e8, .55); moon.position.set(-120, 200, 80); scene.add(moon);

/* textures drawn once on canvases */
function canvasTex(w, h, draw, repeat) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; } return t; }
const windowTex = canvasTex(256, 256, (x, w, h) => {
  x.fillStyle = '#1a2133'; x.fillRect(0, 0, w, h);
  for (let r = 0; r < 16; r++) for (let c = 0; c < 8; c++) {
    const lit = Math.random(); x.fillStyle = lit > .78 ? ['#ffd99a', '#ffe9c2', '#ffc77a', '#bfe3ff'][Math.floor(Math.random() * 4)] : lit > .7 ? '#3b4766' : '#121826';
    x.fillRect(c * 32 + 7, r * 16 + 4, 18, 9);
  }
  x.fillStyle = '#10141f'; x.fillRect(0, 0, 6, 6); // roof colour sample
}, true);
const windowMatEmissive = new THREE.MeshStandardMaterial({ map: windowTex, emissiveMap: windowTex, emissive: 0xffffff, emissiveIntensity: .85, roughness: .9 });

/* ground and roads */
const ground = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshStandardMaterial({ color: 0x1b2130, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.set(MAX / 2, -.02, MAX / 2); scene.add(ground);
const asphalt = new THREE.MeshStandardMaterial({ color: 0x23293a, roughness: .82, metalness: .05 });
{
  const geos = [];
  for (let i = 0; i <= NB; i++) {
    const g1 = new THREE.PlaneGeometry(RW, MAX + RW); g1.rotateX(-Math.PI / 2); g1.translate(road(i), 0, MAX / 2); geos.push(g1);
    const g2 = new THREE.PlaneGeometry(MAX + RW, RW); g2.rotateX(-Math.PI / 2); g2.translate(MAX / 2, .001, road(i)); geos.push(g2);
  }
  scene.add(new THREE.Mesh(mergeGeometries(geos), asphalt));
}
// lane markings: centre double line + dashed lane dividers + crosswalks
{
  const yellow = [], white = [];
  const strip = (arr, w, l, x, z, rotY) => { const g = new THREE.PlaneGeometry(w, l); g.rotateX(-Math.PI / 2); if (rotY) g.rotateY(rotY); g.translate(x, .02, z); arr.push(g); };
  for (let i = 0; i <= NB; i++) for (let j = 0; j < NB; j++) {
    const a = road(j) + RW / 2 + 3, b = road(j + 1) - RW / 2 - 3, mid = (a + b) / 2, len = b - a;
    strip(yellow, .25, len, road(i) - .25, mid); strip(yellow, .25, len, road(i) + .25, mid);
    strip(yellow, len, .25, mid, road(i) - .25); strip(yellow, len, .25, mid, road(i) + .25);
    for (let z = a; z < b - 3; z += 7) { strip(white, .18, 3, road(i) - LANE, z + 1.5); strip(white, .18, 3, road(i) + LANE, z + 1.5); strip(white, 3, .18, z + 1.5, road(i) - LANE); strip(white, 3, .18, z + 1.5, road(i) + LANE); }
  }
  for (let i = 0; i <= NB; i++) for (let j = 0; j <= NB; j++) for (let s = -1; s <= 1; s += 2) for (let k = -3; k <= 3; k++) {
    strip(white, .8, 3.4, road(i) + k * 2, road(j) + s * (RW / 2 + 1.6)); strip(white, 3.4, .8, road(i) + s * (RW / 2 + 1.6), road(j) + k * 2);
  }
  scene.add(new THREE.Mesh(mergeGeometries(yellow), new THREE.MeshBasicMaterial({ color: 0xd9a441 })));
  scene.add(new THREE.Mesh(mergeGeometries(white), new THREE.MeshBasicMaterial({ color: 0x8c93a3 })));
}

/* buildings, merged into one mesh */
const SOLIDS = []; // axis-aligned blocks the car cannot enter: {x0,x1,z0,z1}
const SIGNS = ['牛肉麵', '便利商店', '滷味', 'KTV', '藥局', '豆漿', '火鍋', '24H', '洗衣', '鹽酥雞', '咖啡', '診所', '夾娃娃', '麵包'];
const SIGN_COLORS = ['#ff5d8f', '#39d7e6', '#ffd447', '#9b7bff', '#ff8a3d', '#5cff9d'];
function signTex(text, color) {
  return canvasTex(64, 64 * Math.max(2, text.length), (x, w, h) => {
    x.fillStyle = '#0c0f18'; x.fillRect(0, 0, w, h); x.strokeStyle = color; x.lineWidth = 4; x.strokeRect(3, 3, w - 6, h - 6);
    x.fillStyle = color; x.shadowColor = color; x.shadowBlur = 12; x.font = 'bold 40px "Microsoft JhengHei","PingFang TC",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    [...text].forEach((ch, i) => x.fillText(ch, w / 2, 34 + i * 60 * (h - 8) / (60 * text.length)));
  });
}
{
  const geos = [], slabs = [];
  const boxUV = (w, h, d) => {
    const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv;
    // side faces repeat the window grid by size; top and bottom use the dark roof sample
    for (let f = 0; f < 6; f++) for (let v = 0; v < 4; v++) {
      const idx = f * 4 + v; const u = uv.getX(idx), vv = uv.getY(idx);
      if (f === 2 || f === 3) uv.setXY(idx, .005, .995);
      else { const span = (f < 2 ? d : w) / 16; uv.setXY(idx, u * span, vv * h / 16); }
    }
    return g;
  };
  for (let bi = -1; bi <= NB; bi++) for (let bj = -1; bj <= NB; bj++) {
    const x0 = road(bi) + RW / 2, z0 = road(bj) + RW / 2, x1 = x0 + BS, z1 = z0 + BS;
    SOLIDS.push({ x0: x0 + 1.2, x1: x1 - 1.2, z0: z0 + 1.2, z1: z1 - 1.2 });
    const slab = new THREE.BoxGeometry(BS, .35, BS); slab.translate(x0 + BS / 2, .17, z0 + BS / 2); slabs.push(slab);
    const isHome = bi === 5 && bj === 0;
    const lots = [[0, 0], [1, 0], [0, 1], [1, 1]];
    for (const [lx, lz] of lots) {
      if (isHome && lz === 1) continue; // home building added separately
      const w = 18 + Math.random() * 6, d = 18 + Math.random() * 6;
      const edge = (bi < 0 || bj < 0 || bi === NB || bj === NB);
      const h = (edge ? 22 : 9) + Math.random() * (edge ? 46 : 38);
      const cx = x0 + 4 + lx * (BS - 8) / 2 + (BS - 8) / 4, cz = z0 + 4 + lz * (BS - 8) / 2 + (BS - 8) / 4;
      const g = boxUV(w, h, d); g.translate(cx, h / 2 + .35, cz); geos.push(g);
      if (!edge && Math.random() < .55) {
        // vertical shop sign on the street-facing side
        const text = SIGNS[Math.floor(Math.random() * SIGNS.length)], col = SIGN_COLORS[Math.floor(Math.random() * SIGN_COLORS.length)];
        const sh = 2.2 * Math.max(2, text.length) * .9;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, sh), new THREE.MeshBasicMaterial({ map: signTex(text, col), toneMapped: false }));
        const sideX = lx === 0 ? -1 : 1, sideZ = lz === 0 ? -1 : 1;
        if (Math.random() < .5) { m.position.set(cx + sideX * (w / 2 + .9), 4 + Math.random() * 5 + sh / 2, cz); m.rotation.y = sideX > 0 ? Math.PI / 2 : -Math.PI / 2; }
        else { m.position.set(cx, 4 + Math.random() * 5 + sh / 2, cz + sideZ * (d / 2 + .9)); m.rotation.y = sideZ > 0 ? 0 : Math.PI; }
        const back = m.clone(); back.rotation.y += Math.PI; back.position.add(new THREE.Vector3(0, 0, 0)); scene.add(m, back);
      }
    }
  }
  const city = new THREE.Mesh(mergeGeometries(geos), windowMatEmissive); scene.add(city);
  scene.add(new THREE.Mesh(mergeGeometries(slabs), new THREE.MeshStandardMaterial({ color: 0x3a4050, roughness: .95 })));
}

/* home: a warm apartment with a beacon you can see from far away */
const homeGroup = new THREE.Group(); scene.add(homeGroup);
{
  const bx = homePos.x, bz = homePos.z - RW / 2 - 14;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(22, 16, 20), new THREE.MeshStandardMaterial({ color: 0x584a4a, roughness: .9 }));
  wall.position.set(bx, 8.35, bz); homeGroup.add(wall);
  const win = new THREE.Mesh(new THREE.PlaneGeometry(4.5, 3), new THREE.MeshBasicMaterial({ color: 0xffc77a, toneMapped: false }));
  win.position.set(bx - 4, 11, bz + 10.05); homeGroup.add(win);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 5), new THREE.MeshBasicMaterial({ color: 0xffb46b, toneMapped: false }));
  door.position.set(bx + 3, 2.9, bz + 10.05); homeGroup.add(door);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0xffb27a, transparent: true, opacity: .28, depthWrite: false, blending: THREE.AdditiveBlending });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 140, 24, 1, true), beamMat); beam.position.set(homePos.x, 70, homePos.z); homeGroup.add(beam);
  const ring = new THREE.Mesh(new THREE.RingGeometry(5, 6.4, 40), new THREE.MeshBasicMaterial({ color: 0xffc091, transparent: true, opacity: .85, side: THREE.DoubleSide, toneMapped: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.set(homePos.x, .08, homePos.z); homeGroup.add(ring); homeGroup.userData.ring = ring;
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(256, 96, (x, w, h) => { x.fillStyle = '#572c37'; x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, 18); x.fill(); x.strokeStyle = '#ffcba4'; x.lineWidth = 3; x.stroke(); x.fillStyle = '#ffe3c8'; x.font = 'bold 44px "Microsoft JhengHei",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('🍜 家', w / 2, h / 2 + 2); }), depthTest: false, toneMapped: false }));
  label.scale.set(12, 4.5, 1); label.position.set(homePos.x, 22, homePos.z); homeGroup.add(label);
  const pl = new THREE.PointLight(0xffb070, 60, 40, 1.6); pl.position.set(homePos.x, 6, homePos.z - 2); homeGroup.add(pl);
}

/* street lamps + light pools */
let LAMP;
{
  const pts = [];
  for (let i = 0; i <= NB; i++) for (let j = 0; j < NB; j++) {
    for (let t = .25; t < 1; t += .5) {
      const z = road(j) + RW / 2 + t * BS; pts.push([road(i) - RW / 2 - .2, z], [road(i) + RW / 2 + .2, z + BS / 4]);
      const x = road(j) + RW / 2 + t * BS; pts.push([x, road(i) - RW / 2 - .2], [x + BS / 4, road(i) + RW / 2 + .2]);
    }
  }
  const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(.12, .16, 6.5, 6), new THREE.MeshStandardMaterial({ color: 0x5b6070 }), pts.length);
  const head = new THREE.InstancedMesh(new THREE.SphereGeometry(.45, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false }), pts.length);
  const pool = new THREE.InstancedMesh(new THREE.CircleGeometry(6, 20), new THREE.MeshBasicMaterial({ map: canvasTex(64, 64, (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,200,130,.55)'); g.addColorStop(1, 'rgba(255,200,130,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }), pts.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), one = new THREE.Vector3(1, 1, 1);
  pts.forEach(([x, z], k) => {
    m.compose(new THREE.Vector3(x, 3.6, z), q, one); pole.setMatrixAt(k, m);
    m.compose(new THREE.Vector3(x, 6.9, z), q, one); head.setMatrixAt(k, m);
    m.compose(new THREE.Vector3(x, .05, z), flat, one); pool.setMatrixAt(k, m);
  });
  scene.add(pole, head, pool);
  LAMP = { pts, pole, head, pool };
}

/* construction barriers on blocked segments */
const barrierGroup = new THREE.Group(); scene.add(barrierGroup);
const BARRIERS = []; // {x,z,r}
const stripeTex = canvasTex(128, 32, (x, w, h) => { for (let i = -2; i < 10; i++) { x.fillStyle = i % 2 ? '#f3f0e6' : '#e2572d'; x.beginPath(); x.moveTo(i * 16, h); x.lineTo(i * 16 + 16, 0); x.lineTo(i * 16 + 32, 0); x.lineTo(i * 16 + 16, h); x.fill(); } });
function buildBarriers() {
  barrierGroup.clear(); BARRIERS.length = 0;
  for (const e of blocked) {
    const [a, b] = e.split('|').map(s => s.split(',').map(Number));
    const mx = (road(a[0]) + road(b[0])) / 2, mz = (road(a[1]) + road(b[1])) / 2, vertical = a[0] === b[0];
    const g = new THREE.Group(); g.position.set(mx, 0, mz); if (!vertical) g.rotation.y = Math.PI / 2; barrierGroup.add(g);
    const concrete = new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: .95 });
    for (let k = -1; k <= 1; k++) { const jb = new THREE.Mesh(new THREE.BoxGeometry(RW / 3 - .3, 1.1, .9), concrete); jb.position.set(k * RW / 3, .55, 0); g.add(jb); }
    const board = new THREE.Mesh(new THREE.BoxGeometry(RW - 1, .7, .2), new THREE.MeshBasicMaterial({ map: stripeTex, toneMapped: false })); board.position.y = 1.55; g.add(board);
    const blink = new THREE.Mesh(new THREE.SphereGeometry(.3, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffb000, toneMapped: false })); blink.position.set(0, 2.3, 0); g.add(blink); g.userData.blink = blink;
    BARRIERS.push({ x: mx, z: mz, vertical });
  }
}

/* cars */
const carGeo = { body: new THREE.BoxGeometry(2.2, .9, 4.4), cabin: new THREE.BoxGeometry(1.9, .75, 2.2), wheel: new THREE.CylinderGeometry(.42, .42, .3, 12), lamp: new THREE.BoxGeometry(.5, .22, .08) };
const glass = new THREE.MeshStandardMaterial({ color: 0x1c2638, roughness: .2, metalness: .4 });
const tyre = new THREE.MeshStandardMaterial({ color: 0x0d0d10, roughness: .9 });
const headMat = new THREE.MeshBasicMaterial({ color: 0xfff3d6, toneMapped: false }), tailMat = new THREE.MeshBasicMaterial({ color: 0xff3a3a, toneMapped: false });
function makeCar(color, opts = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(carGeo.body, new THREE.MeshStandardMaterial({ color, roughness: .45, metalness: .25 })); body.position.y = .85; g.add(body);
  const cab = new THREE.Mesh(carGeo.cabin, glass); cab.position.set(0, 1.6, .25); g.add(cab);
  for (const [x, z] of [[-1.05, 1.4], [1.05, 1.4], [-1.05, -1.4], [1.05, -1.4]]) { const w = new THREE.Mesh(carGeo.wheel, tyre); w.rotation.z = Math.PI / 2; w.position.set(x, .42, z); g.add(w); }
  for (const x of [-.7, .7]) { const h = new THREE.Mesh(carGeo.lamp, headMat); h.position.set(x, .95, -2.22); g.add(h); const t = new THREE.Mesh(carGeo.lamp, tailMat); t.position.set(x, .95, 2.22); g.add(t); }
  if (opts.taxi) { const sign = new THREE.Mesh(new THREE.BoxGeometry(.9, .3, .4), new THREE.MeshBasicMaterial({ color: 0xfff1a8, toneMapped: false })); sign.position.set(0, 2.15, .3); g.add(sign); }
  return g;
}
function makeScooter(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(.6, .7, 1.9), new THREE.MeshStandardMaterial({ color, roughness: .5 })); body.position.y = .7; g.add(body);
  const rider = new THREE.Mesh(new THREE.CapsuleGeometry(.32, .7, 4, 8), new THREE.MeshStandardMaterial({ color: 0x2c3344 })); rider.position.set(0, 1.55, .2); g.add(rider);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(.3, 10, 8), new THREE.MeshStandardMaterial({ color: [0xffffff, 0xf5c542, 0xe85d5d][Math.floor(Math.random() * 3)] })); helmet.position.set(0, 2.25, .15); g.add(helmet);
  const h = new THREE.Mesh(carGeo.lamp, headMat); h.position.set(0, 1, -.98); g.add(h); const t = new THREE.Mesh(carGeo.lamp, tailMat); t.position.set(0, .9, .98); g.add(t);
  return g;
}

// player: the apricot car from the 2D version, with headlights
const player = makeCar(0xf0b580); scene.add(player);
player.children[0].material.emissive = new THREE.Color(0x4a2a14); // keep your own car readable in the dark
{ const glow = new THREE.PointLight(0xffd2a8, 18, 12, 1.5); glow.position.set(0, 5, 2); player.add(glow); }
const head = new THREE.SpotLight(0xfff0d0, 140, 70, .55, .45, 1.4); head.position.set(0, 1.2, -1.5); player.add(head);
const headTarget = new THREE.Object3D(); headTarget.position.set(0, 0, -20); player.add(headTarget); head.target = headTarget;
const beam = new THREE.Mesh(new THREE.PlaneGeometry(8, 22), new THREE.MeshBasicMaterial({ map: canvasTex(64, 128, (x, w, h) => { const g = x.createLinearGradient(0, h, 0, 0); g.addColorStop(0, 'rgba(255,235,190,.42)'); g.addColorStop(1, 'rgba(255,235,190,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(w * .38, h); x.lineTo(0, 0); x.lineTo(w, 0); x.lineTo(w * .62, h); x.fill(); }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
beam.rotation.x = -Math.PI / 2; beam.position.set(0, .06, -13); player.add(beam);
const you = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(128, 64, (x, w, h) => { x.fillStyle = '#ffc091'; x.beginPath(); x.roundRect(8, 8, w - 16, h - 22, 12); x.fill(); x.beginPath(); x.moveTo(w / 2 - 8, h - 14); x.lineTo(w / 2 + 8, h - 14); x.lineTo(w / 2, h - 4); x.fill(); x.fillStyle = '#30252d'; x.font = 'bold 26px sans-serif'; x.textAlign = 'center'; x.fillText('YOU', w / 2, 37); }), depthTest: false, toneMapped: false }));
you.scale.set(3.2, 1.6, 1); you.position.set(0, 3.8, 0); player.add(you);

// AI traffic drives straight along a road and respawns when it reaches the edge or a closed segment
const traffic = [];
const CAR_COLORS = [0xa6b8ba, 0xad858f, 0x8694b0, 0xd7d9de, 0x4f5868, 0x7a2f37];
function spawnTraffic() {
  traffic.forEach(t => scene.remove(t.o)); traffic.length = 0;
  const N = touch ? 16 : 26;
  for (let k = 0; k < N; k++) {
    const vertical = k % 2 === 0, idx = 1 + Math.floor(Math.random() * (NB - 1)), dir = Math.random() < .5 ? 1 : -1;
    const kind = Math.random(); const o = kind < .18 ? makeCar(0xf2c230, { taxi: true }) : kind < .38 ? makeScooter(CAR_COLORS[k % CAR_COLORS.length]) : makeCar(CAR_COLORS[k % CAR_COLORS.length]);
    const t = { o, vertical, idx, dir, s: Math.random() * MAX, speed: (kind >= .18 && kind < .38 ? 9 : 7) + Math.random() * 6, r: kind >= .18 && kind < .38 ? 1.3 : 2.3 };
    scene.add(o); traffic.push(t); placeTraffic(t);
  }
}
function placeTraffic(t) {
  // right-hand traffic: northbound (-z) keeps to x+LANE, eastbound (+x) keeps to z+LANE
  const lane = LANE * (t.vertical ? -t.dir : t.dir) * (t.vertical ? 1 : 1);
  if (t.vertical) { t.o.position.set(road(t.idx) + (t.dir < 0 ? LANE : -LANE), 0, t.s); t.o.rotation.y = t.dir < 0 ? 0 : Math.PI; }
  else { t.o.position.set(t.s, 0, road(t.idx) + (t.dir > 0 ? LANE : -LANE)); t.o.rotation.y = t.dir > 0 ? -Math.PI / 2 : Math.PI / 2; }
}
function trafficBlockedAt(t) {
  for (const b of BARRIERS) {
    if (b.vertical !== t.vertical) continue;
    if (t.vertical ? Math.abs(b.x - road(t.idx)) < 1 && Math.abs(b.z - t.s) < 5 : Math.abs(b.z - road(t.idx)) < 1 && Math.abs(b.x - t.s) < 5) return true;
  }
  return false;
}

/* ================= physics: things you can knock over ================= */
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -24, 0) });
world.broadphase = new CANNON.SAPBroadphase(world); world.allowSleep = true;
world.defaultContactMaterial.friction = .5; world.defaultContactMaterial.restitution = .18;
{ const g = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() }); g.quaternion.setFromEuler(-Math.PI / 2, 0, 0); world.addBody(g); }
for (const b of SOLIDS) world.addBody(new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Box(new CANNON.Vec3((b.x1 - b.x0) / 2 + .6, 20, (b.z1 - b.z0) / 2 + .6)), position: new CANNON.Vec3((b.x0 + b.x1) / 2, 20, (b.z0 + b.z1) / 2) }));
const playerBody = new CANNON.Body({ type: CANNON.Body.KINEMATIC, shape: new CANNON.Box(new CANNON.Vec3(1.15, .9, 2.3)) }); world.addBody(playerBody);
const barrierBodies = [];
const PROPS = []; // { mesh, body, kind, hit }
let knocked = 0, shake = 0, propToastCool = 0, physMs = 0;
const KIND = {
  cone:   { mass: 3,  slow: .985, name: ['三角錐', 'cone'] },
  fence:  { mass: 22, slow: .93,  name: ['水馬', 'water barrier'] },
  bin:    { mass: 12, slow: .95,  name: ['垃圾桶', 'bin'] },
  news:   { mass: 26, slow: .9,   name: ['報紙箱', 'news box'] },
  sign:   { mass: 7,  slow: .98,  name: ['立牌', 'sign'] },
  scooter:{ mass: 95, slow: .72,  name: ['機車', 'scooter'] },
  lamp:   { mass: 70, slow: .55,  name: ['路燈', 'street lamp'] }
};
const propMat = {
  cone: new THREE.MeshStandardMaterial({ color: 0xff6a2c, emissive: 0x5a1c00, roughness: .6 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf2f0e8, emissive: 0x222222 }),
  fence: new THREE.MeshStandardMaterial({ color: 0xff8a3d, emissive: 0x3a1600, roughness: .5 }),
  bin: new THREE.MeshStandardMaterial({ color: 0x3f6b55, roughness: .7 }),
  news: new THREE.MeshStandardMaterial({ color: 0x2f5fa8, roughness: .5 }),
  pole: new THREE.MeshStandardMaterial({ color: 0x5b6070 }),
  lampHead: new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false })
};
const signMat = new THREE.MeshStandardMaterial({ map: canvasTex(64, 96, (x, w, h) => { x.fillStyle = '#f7f1e3'; x.fillRect(0, 0, w, h); x.fillStyle = '#b53a2c'; x.font = 'bold 20px "Microsoft JhengHei",sans-serif'; x.textAlign = 'center'; ['營', '業', '中'].forEach((c, i) => x.fillText(c, w / 2, 28 + i * 26)); }), emissive: 0x333333 });
function propMesh(kind) {
  const g = new THREE.Group();
  if (kind === 'cone') { const c = new THREE.Mesh(new THREE.ConeGeometry(.4, 1.15, 10), propMat.cone); g.add(c); const band = new THREE.Mesh(new THREE.CylinderGeometry(.22, .28, .18, 10), propMat.white); band.position.y = .05; g.add(band); const base = new THREE.Mesh(new THREE.BoxGeometry(.9, .08, .9), propMat.cone); base.position.y = -.56; g.add(base); }
  else if (kind === 'fence') { const b = new THREE.Mesh(new THREE.BoxGeometry(1.8, .9, .5), propMat.fence); g.add(b); const s = new THREE.Mesh(new THREE.BoxGeometry(1.82, .16, .52), propMat.white); s.position.y = .15; g.add(s); }
  else if (kind === 'bin') { g.add(new THREE.Mesh(new THREE.CylinderGeometry(.4, .36, 1.1, 12), propMat.bin)); const lid = new THREE.Mesh(new THREE.CylinderGeometry(.44, .44, .1, 12), propMat.white); lid.position.y = .58; g.add(lid); }
  else if (kind === 'news') { g.add(new THREE.Mesh(new THREE.BoxGeometry(.7, 1.1, .6), propMat.news)); }
  else if (kind === 'sign') { g.add(new THREE.Mesh(new THREE.BoxGeometry(.9, 1.2, .5), signMat)); }
  else if (kind === 'scooter') { const col = [0xd94c4c, 0xf2f0e8, 0x3a75c4, 0x8dbf5a, 0x222326][Math.floor(Math.random() * 5)]; const b = new THREE.Mesh(new THREE.BoxGeometry(.64, 1.0, 1.9), new THREE.MeshStandardMaterial({ color: col, roughness: .45 })); g.add(b); const seat = new THREE.Mesh(new THREE.BoxGeometry(.5, .12, .8), tyre); seat.position.set(0, .56, .3); g.add(seat); const bar = new THREE.Mesh(new THREE.BoxGeometry(.9, .08, .08), propMat.pole); bar.position.set(0, .7, -.8); g.add(bar); const h = new THREE.Mesh(carGeo.lamp, headMat); h.position.set(0, .2, -.96); g.add(h); }
  else if (kind === 'lamp') { const pole = new THREE.Mesh(new THREE.CylinderGeometry(.12, .16, 6.5, 6), propMat.pole); g.add(pole); const head = new THREE.Mesh(new THREE.SphereGeometry(.45, 8, 6), propMat.lampHead); head.position.y = 3.3; g.add(head); }
  return g;
}
function propShape(kind) {
  if (kind === 'cone') return [new CANNON.Cylinder(.1, .42, 1.15, 8)];
  if (kind === 'fence') return [new CANNON.Box(new CANNON.Vec3(.9, .45, .25))];
  if (kind === 'bin') return [new CANNON.Cylinder(.4, .36, 1.1, 10)];
  if (kind === 'news') return [new CANNON.Box(new CANNON.Vec3(.35, .55, .3))];
  if (kind === 'sign') return [new CANNON.Box(new CANNON.Vec3(.45, .6, .25))];
  if (kind === 'scooter') return [new CANNON.Box(new CANNON.Vec3(.32, .5, .95))];
  if (kind === 'lamp') return [new CANNON.Cylinder(.16, .2, 6.5, 8)];
}
const HALF_H = { cone: .58, fence: .45, bin: .55, news: .55, sign: .6, scooter: .5, lamp: 3.25 };
function addProp(kind, x, z, rotY = 0, opts = {}) {
  const body = new CANNON.Body({ mass: KIND[kind].mass, position: new CANNON.Vec3(x, HALF_H[kind] + .01, z), sleepSpeedLimit: .25, sleepTimeLimit: .6, linearDamping: .08, angularDamping: .2 });
  propShape(kind).forEach(sh => body.addShape(sh)); body.quaternion.setFromEuler(0, rotY, 0);
  body.userData = { prop: true, kind }; body.sleep();
  const mesh = opts.instanced ? null : propMesh(kind); if (mesh) { mesh.position.copy(body.position); mesh.quaternion.copy(body.quaternion); scene.add(mesh); }
  const p = { mesh, body, kind, hit: false, lampIndex: opts.lampIndex, inWorld: false };
  body.userData.p = p; PROPS.push(p); return p;
}
function clearProps() {
  for (const p of PROPS) { if (p.inWorld) world.removeBody(p.body); if (p.mesh) scene.remove(p.mesh); }
  PROPS.length = 0; knocked = 0;
  // put every street lamp back on its post
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), flat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)), one = new THREE.Vector3(1, 1, 1);
  LAMP.pts.forEach(([x, z], k) => { m.compose(new THREE.Vector3(x, 3.6, z), q, one); LAMP.pole.setMatrixAt(k, m); m.compose(new THREE.Vector3(x, 6.9, z), q, one); LAMP.head.setMatrixAt(k, m); m.compose(new THREE.Vector3(x, .05, z), flat, one); LAMP.pool.setMatrixAt(k, m); });
  LAMP.pole.instanceMatrix.needsUpdate = LAMP.head.instanceMatrix.needsUpdate = LAMP.pool.instanceMatrix.needsUpdate = true;
}
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
function detachLamp(p) {
  // a lamp only gets its own mesh once it has been hit; until then it is drawn with the instanced street lamps
  if (p.mesh || p.lampIndex == null) return;
  const k = p.lampIndex; LAMP.pole.setMatrixAt(k, ZERO); LAMP.head.setMatrixAt(k, ZERO); LAMP.pool.setMatrixAt(k, ZERO);
  LAMP.pole.instanceMatrix.needsUpdate = LAMP.head.instanceMatrix.needsUpdate = LAMP.pool.instanceMatrix.needsUpdate = true;
  p.mesh = propMesh('lamp'); scene.add(p.mesh);
}
function buildProps() {
  clearProps();
  barrierBodies.forEach(b => world.removeBody(b)); barrierBodies.length = 0;
  const R = Math.random;
  // lamps along every street (heavy; they topple when you drive into them)
  LAMP.pts.forEach(([x, z], k) => addProp('lamp', x, z, 0, { instanced: true, lampIndex: k }));
  // roadworks: concrete blocks are fixed, the cones and water barriers in front of them fly
  for (const b of BARRIERS) {
    const body = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Box(b.vertical ? new CANNON.Vec3(RW / 2, .8, .45) : new CANNON.Vec3(.45, .8, RW / 2)), position: new CANNON.Vec3(b.x, .8, b.z) }); world.addBody(body); barrierBodies.push(body);
    for (const side of [-1, 1]) for (let k = -3; k <= 3; k++) {
      const off = side * (2.4 + (k % 2 ? .6 : 0)), along = k * 2.1;
      if (b.vertical) addProp('cone', b.x + along, b.z + off); else addProp('cone', b.x + off, b.z + along);
    }
    for (const side of [-1, 1]) for (let k = -1; k <= 1; k += 2) { if (b.vertical) addProp('fence', b.x + k * 3.4, b.z + side * 4.4); else addProp('fence', b.x + side * 4.4, b.z + k * 3.4, Math.PI / 2); }
  }
  // street furniture: parked scooters at the kerb, bins, news boxes and shop signs
  const curb = RW / 2 - .9;
  for (let i = 0; i <= NB; i++) for (let j = 0; j < NB; j++) for (const vertical of [true, false]) {
    if (R() > .55) continue;
    const a = road(j) + RW / 2 + 4, span = BS - 8, side = R() < .5 ? -1 : 1, base = a + R() * (span - 12);
    const at = (along, off) => vertical ? [road(i) + side * off, along] : [along, road(i) + side * off];
    const pick = R();
    if (pick < .5) { const n = 3 + Math.floor(R() * 5); for (let k = 0; k < n; k++) { const [x, z] = at(base + k * 1.5, curb); addProp('scooter', x, z, (vertical ? Math.PI / 2 : 0) + (R() - .5) * .3); } }
    else if (pick < .7) { const [x, z] = at(base, curb + .3); addProp('bin', x, z); const [x2, z2] = at(base + 1.2, curb + .3); addProp('bin', x2, z2); }
    else if (pick < .85) { const [x, z] = at(base, curb + .2); addProp('news', x, z, vertical ? Math.PI / 2 : 0); }
    else { const [x, z] = at(base, curb + .1); addProp('sign', x, z, vertical ? Math.PI / 2 : 0); }
  }
}
playerBody.addEventListener('collide', e => {
  const p = e.body.userData?.p; if (!p || game.phase !== 'drive') return;
  if (p.kind === 'lamp') detachLamp(p);
  const v = Math.abs(e.contact.getImpactVelocityAlongNormal());
  if (!p.hit && v > 1.2) {
    p.hit = true; knocked++;
    car.v *= KIND[p.kind].slow; shake = Math.min(1, shake + (KIND[p.kind].mass / 70) * .8 + .15);
    if (propToastCool <= 0 && KIND[p.kind].mass >= 20) { toast(tr(`撞倒${KIND[p.kind].name[0]}了！`, `Knocked over a ${KIND[p.kind].name[1]}!`)); propToastCool = 1.4; }
  }
});
// props hit by other props or traffic still get their own meshes (lamps)
world.addEventListener('beginContact', e => { for (const b of [e.bodyA, e.bodyB]) { const p = b?.userData?.p; if (p && p.kind === 'lamp' && !p.mesh) detachLamp(p); } });
const trafficBodies = new Map();
// only things near the car are simulated, which keeps physics cheap on phones
let activateTimer = 0;
function activateNearby() {
  for (const p of PROPS) {
    const d = Math.hypot(p.body.position.x - car.x, p.body.position.z - car.z);
    if (!p.inWorld && d < 30) { world.addBody(p.body); p.inWorld = true; }
    else if (p.inWorld && d > 44 && p.body.sleepState === CANNON.Body.SLEEPING) { world.removeBody(p.body); p.inWorld = false; }
  }
}
function syncTrafficBodies() {
  for (const t of traffic) {
    const near = Math.hypot(t.o.position.x - car.x, t.o.position.z - car.z) < 40;
    let b = trafficBodies.get(t);
    if (!near) { if (b) { world.removeBody(b); trafficBodies.delete(t); } continue; }
    if (!b) { b = new CANNON.Body({ type: CANNON.Body.KINEMATIC, shape: new CANNON.Box(new CANNON.Vec3(t.r > 2 ? 1.1 : .35, .9, t.r > 2 ? 2.2 : .95)) }); world.addBody(b); trafficBodies.set(t, b); }
    const vx = t.vertical ? 0 : t.dir * t.speed, vz = t.vertical ? t.dir * t.speed : 0;
    b.position.set(t.o.position.x, .9, t.o.position.z); b.velocity.set(vx, 0, vz); b.quaternion.setFromEuler(0, t.o.rotation.y, 0);
  }
}
function resetTrafficBodies() { trafficBodies.forEach(b => world.removeBody(b)); trafficBodies.clear(); }
function stepPhysics(dt) {
  const fx = -Math.sin(car.h), fz = -Math.cos(car.h);
  playerBody.position.set(car.x, .9, car.z); playerBody.velocity.set(fx * car.v, 0, fz * car.v); playerBody.quaternion.setFromEuler(0, car.h, 0);
  syncTrafficBodies();
  activateTimer -= dt; if (activateTimer <= 0) { activateNearby(); activateTimer = .15; }
  const t0 = performance.now(); world.step(1 / 60, dt, 4); physMs = physMs * .9 + (performance.now() - t0) * .1;
  for (const p of PROPS) {
    if (!p.mesh || p.body.sleepState === CANNON.Body.SLEEPING) continue;
    p.mesh.position.copy(p.body.position); p.mesh.quaternion.copy(p.body.quaternion);
  }
  propToastCool -= dt; shake = Math.max(0, shake - dt * 2.4);
}

/* route guide chevrons */
const CHEV_N = 40;
const chevGeo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-1.1, 0, .5, 0, 0, -.9, 1.1, 0, .5, 1.1, 0, .5, 0, 0, -.9, 0, 0, -.2, -1.1, 0, .5, 0, 0, -.2, 0, 0, -.9], 3));
const chevrons = new THREE.InstancedMesh(chevGeo, new THREE.MeshBasicMaterial({ color: 0xffa35c, transparent: true, opacity: .9, toneMapped: false, side: THREE.DoubleSide }), CHEV_N);
chevrons.frustumCulled = false; scene.add(chevrons);
let routePts = [];

/* ================= driving state ================= */
const car = { x: 0, z: 0, h: 0, v: 0, steer: 0 };
const input = { left: 0, right: 0, gas: 0, brake: 0 };
let camMode = 'chase', startRemain = 1, remain = 1, frame = 0, last = 0, hitFlash = 0, bumpCool = 0, lastHits = 0, lastPhase = 'ready', stored = false, feedback = '', routeTimer = 0;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();

function resetDrive() {
  pickBlocked(); buildBarriers(); resetTrafficBodies(); spawnTraffic(); buildProps();
  car.x = road(START.node[0]) + LANE; car.z = road(START.node[1]) - 2; car.h = START.heading; car.v = 0; car.steer = 0;
  remain = startRemain = remaining(); updateRoute(true); snapCamera();
}
function onRoad(x, z) {
  // which road segment the car is on: returns { vertical, idx, t } along the axis
  const vi = Math.round(x / P), hj = Math.round(z / P);
  const nearV = Math.abs(x - road(vi)) <= RW / 2 + 1, nearH = Math.abs(z - road(hj)) <= RW / 2 + 1;
  return { vi, hj, nearV, nearH };
}
function remaining() {
  const { vi, hj, nearV, nearH } = onRoad(car.x, car.z);
  // on the home street: straight-line distance
  if (Math.abs(car.z - homePos.z) <= RW / 2 + 1 && car.x > road(HOME.a[0]) - 1 && car.x < road(HOME.b[0]) + 1) return Math.abs(car.x - homePos.x);
  const cand = [];
  if (nearV) { const j0 = Math.floor(car.z / P), j1 = j0 + 1; for (const j of [j0, j1]) if (j >= 0 && j <= NB) { const mid = (road(j0) + road(j1)) / 2; const sideOK = !blocked.has(ekey([vi, j0], [vi, j1])) || (j === j0 ? car.z < mid : car.z > mid); if (sideOK) cand.push([Math.abs(car.z - road(j)), key(vi, j)]); } }
  if (nearH) { const i0 = Math.floor(car.x / P), i1 = i0 + 1; for (const i of [i0, i1]) if (i >= 0 && i <= NB) { const mid = (road(i0) + road(i1)) / 2; const sideOK = !blocked.has(ekey([i0, hj], [i1, hj])) || (i === i0 ? car.x < mid : car.x > mid); if (sideOK) cand.push([Math.abs(car.x - road(i)), key(i, hj)]); } }
  let bestD = Infinity, bestK = null;
  for (const [d, k] of cand) { const total = d + (dist.get(k) ?? Infinity); if (total < bestD) { bestD = total; bestK = k; } }
  car.routeNode = bestK;
  return isFinite(bestD) ? bestD : Math.hypot(car.x - homePos.x, car.z - homePos.z);
}
function updateRoute(force) {
  const pts = [[car.x, car.z]]; let k = car.routeNode, guard = 0;
  while (k && guard++ < 40) { const [i, j] = k.split(',').map(Number); pts.push([road(i), road(j)]); k = next.get(k); }
  pts.push([homePos.x, homePos.z]);
  routePts = pts;
  // chevrons every 6 units along the route, starting a little ahead of the car
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0);
  let n = 0, carry = 8;
  for (let s = 0; s < pts.length - 1 && n < CHEV_N; s++) {
    const [ax, az] = pts[s], [bx, bz] = pts[s + 1], len = Math.hypot(bx - ax, bz - az); if (len < .01) continue;
    const ang = Math.atan2(-(bx - ax), -(bz - az));
    q.setFromAxisAngle(up, ang);
    for (let d = carry; d < len && n < CHEV_N; d += 6) { const f = d / len; m.compose(new THREE.Vector3(ax + (bx - ax) * f, .09, az + (bz - az) * f), q, one); chevrons.setMatrixAt(n++, m); }
    carry = Math.max(0, carry - len) || 3;
  }
  chevrons.count = n; chevrons.instanceMatrix.needsUpdate = true;
}

/* collisions */
function collide() {
  let bumped = false;
  for (const b of SOLIDS) {
    const r = 1.6;
    if (car.x > b.x0 - r && car.x < b.x1 + r && car.z > b.z0 - r && car.z < b.z1 + r) {
      const dx0 = car.x - (b.x0 - r), dx1 = (b.x1 + r) - car.x, dz0 = car.z - (b.z0 - r), dz1 = (b.z1 + r) - car.z;
      const mn = Math.min(dx0, dx1, dz0, dz1);
      if (mn === dx0) car.x = b.x0 - r; else if (mn === dx1) car.x = b.x1 + r; else if (mn === dz0) car.z = b.z0 - r; else car.z = b.z1 + r;
      bumped = true;
    }
  }
  const lim = -RW / 2 + 1.5, limMax = MAX + RW / 2 - 1.5;
  if (car.x < lim || car.x > limMax || car.z < lim || car.z > limMax) { car.x = clamp(car.x, lim, limMax); car.z = clamp(car.z, lim, limMax); bumped = true; }
  if (bumped && Math.abs(car.v) > 4) { car.v *= .45; if (bumpCool <= 0) { toast(tr('擦到路邊了，小心開。', 'Scraped the kerb. Easy now.')); bumpCool = 1.2; } }
  // barriers and traffic cost time, like the 2D version
  // roadworks always block the street; hitting them costs time unless just recovering from a bump
  for (const b of BARRIERS) {
    const dx = car.x - b.x, dz = car.z - b.z, along = b.vertical ? Math.abs(dz) : Math.abs(dx), across = b.vertical ? Math.abs(dx) : Math.abs(dz);
    if (along < 3 && across < RW / 2) { const n = (b.vertical ? Math.sign(dz) : Math.sign(dx)) || 1; if (b.vertical) car.z = b.z + n * 3.2; else car.x = b.x + n * 3.2; if (game.invincible <= 0) hit(tr('撞到施工路障！−4 秒', 'Hit the roadworks! −4 s')); car.v = -car.v * .3; return; }
  }
  if (game.invincible <= 0) {
    for (const t of traffic) {
      const dx = car.x - t.o.position.x, dz = car.z - t.o.position.z, d = Math.hypot(dx, dz);
      if (d < t.r + 1.5) { hit(tr('碰撞！減速，倒數 −4 秒', 'Bump! Slowed down, −4 s')); car.x += dx / d * 1.5; car.z += dz / d * 1.5; car.v *= .2; return; }
    }
  }
}
function hit(msg) {
  if (game.phase !== 'drive') return;
  game.hits++; game.elapsed = Math.min(G.LIMIT, game.elapsed + G.PENALTY); game.invincible = 1.8; game.slow = 1.2; hitFlash = .6;
  toast(msg, true);
  if (game.elapsed >= G.LIMIT) { game.phase = 'late'; }
}

/* ================= main loop ================= */
function stepDrive(dt) {
  game.elapsed += dt; if (game.elapsed >= G.LIMIT) { game.elapsed = G.LIMIT; game.phase = 'late'; return; }
  game.invincible = Math.max(0, game.invincible - dt); game.slow = Math.max(0, game.slow - dt); bumpCool -= dt;
  const steerIn = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  car.steer += (steerIn - car.steer) * Math.min(1, dt * 9);
  const top = game.slow > 0 ? 10 : 26;
  if (input.gas) car.v += 15 * dt; else if (input.brake) car.v -= (car.v > 0 ? 30 : 9) * dt; else car.v -= Math.sign(car.v) * Math.min(Math.abs(car.v), 6 * dt);
  car.v = clamp(car.v, -8, top);
  const turn = car.steer * clamp(Math.abs(car.v) / 7, 0, 1) * (1.55 - Math.min(.6, Math.abs(car.v) / 50));
  car.h -= turn * dt * Math.sign(car.v || 1);
  car.x += -Math.sin(car.h) * car.v * dt; car.z += -Math.cos(car.h) * car.v * dt;
  collide();
  for (const t of traffic) {
    t.s += t.dir * t.speed * dt;
    if (t.s < -RW || t.s > MAX + RW || trafficBlockedAt(t)) { t.s = t.dir > 0 ? -RW / 2 : MAX + RW / 2; if (trafficBlockedAt(t)) t.s += t.dir * 20; }
    placeTraffic(t);
  }
  remain = remaining();
  game.distance = clamp(G.DISTANCE * (1 - remain / startRemain), 0, G.DISTANCE);
  routeTimer -= dt; if (routeTimer <= 0) { updateRoute(); routeTimer = .2; }
  if (Math.hypot(car.x - homePos.x, car.z - homePos.z) < 6.5) { game.phase = 'arrived'; game.arrival = game.elapsed; car.v = 0; }
}
function snapCamera() { placeCamera(1); camera.position.copy(camPos); camera.lookAt(camLook); }
function placeCamera(k) {
  const fx = -Math.sin(car.h), fz = -Math.cos(car.h);
  if (camMode === 'chase') { camPos.lerp(new THREE.Vector3(car.x - fx * 12, 6.2 + Math.abs(car.v) * .05, car.z - fz * 12), k); camLook.lerp(new THREE.Vector3(car.x + fx * 10, 1.5, car.z + fz * 10), k); }
  else { camPos.lerp(new THREE.Vector3(car.x + 2, 95, car.z + 55), k); camLook.lerp(new THREE.Vector3(car.x, 0, car.z - 4), k); }
}
function render3d(dt, t) {
  player.position.set(car.x, 0, car.z); player.rotation.y = car.h;
  player.visible = !(game.invincible > 0 && Math.floor(t * 10) % 2);
  you.visible = camMode === 'aerial' || game.phase !== 'drive';
  placeCamera(Math.min(1, dt * (camMode === 'chase' ? 6 : 3)));
  camera.position.copy(camPos); camera.lookAt(camLook);
  if (shake > 0 && !reduced) { camera.position.x += (Math.random() - .5) * shake * .9; camera.position.y += (Math.random() - .5) * shake * .6; }
  homeGroup.userData.ring.scale.setScalar(1 + .12 * Math.sin(t * 3));
  barrierGroup.children.forEach((g, i) => { g.userData.blink.visible = Math.floor(t * 2.5 + i) % 2 === 0; });
  chevrons.material.opacity = .55 + .35 * Math.sin(t * 5);
  renderer.render(scene, camera);
  drawMap();
}

/* minimap */
const map = $('night-map'), mctx = map.getContext('2d');
function drawMap() {
  const W = map.width, S = W / (MAX + RW * 2), o = RW;
  const X = x => (x + o) * S, Z = z => (z + o) * S;
  mctx.clearRect(0, 0, W, W);
  mctx.fillStyle = 'rgba(12,18,32,.82)'; mctx.beginPath(); mctx.roundRect(0, 0, W, W, 16); mctx.fill();
  mctx.strokeStyle = '#47506a'; mctx.lineWidth = RW * S * .7; mctx.lineCap = 'square';
  for (let i = 0; i <= NB; i++) { mctx.beginPath(); mctx.moveTo(X(road(i)), Z(0)); mctx.lineTo(X(road(i)), Z(MAX)); mctx.stroke(); mctx.beginPath(); mctx.moveTo(X(0), Z(road(i))); mctx.lineTo(X(MAX), Z(road(i))); mctx.stroke(); }
  mctx.strokeStyle = '#ff6b4a'; mctx.lineWidth = 3;
  for (const b of BARRIERS) { const x = X(b.x), z = Z(b.z), s = 5; mctx.beginPath(); mctx.moveTo(x - s, z - s); mctx.lineTo(x + s, z + s); mctx.moveTo(x + s, z - s); mctx.lineTo(x - s, z + s); mctx.stroke(); }
  if (routePts.length) { mctx.strokeStyle = '#ffa35c'; mctx.lineWidth = 3.5; mctx.lineJoin = 'round'; mctx.beginPath(); routePts.forEach(([x, z], i) => i ? mctx.lineTo(X(x), Z(z)) : mctx.moveTo(X(x), Z(z))); mctx.stroke(); }
  mctx.fillStyle = '#ffc091'; mctx.beginPath(); mctx.arc(X(homePos.x), Z(homePos.z), 7, 0, Math.PI * 2); mctx.fill();
  mctx.fillStyle = '#30252d'; mctx.font = 'bold 9px sans-serif'; mctx.textAlign = 'center'; mctx.fillText('家', X(homePos.x), Z(homePos.z) + 3);
  mctx.save(); mctx.translate(X(car.x), Z(car.z)); mctx.rotate(-car.h); mctx.fillStyle = '#fff'; mctx.beginPath(); mctx.moveTo(0, -8); mctx.lineTo(5.5, 6); mctx.lineTo(0, 3); mctx.lineTo(-5.5, 6); mctx.closePath(); mctx.fill(); mctx.restore();
  mctx.fillStyle = '#c8cde0'; mctx.font = '600 10px sans-serif'; mctx.textAlign = 'left'; mctx.fillText('N ↑', 10, 16);
}

/* cooking scene: the 2D bowl from the original game */
const rect = (x, y, w, h, r, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); };
const line = (x, y, x2, y2, color, width = 1) => { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x2, y2); ctx.stroke(); };
const ellipse = (x, y, rx, ry, color) => { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); };
const text = (value, x, y, color, size = 12) => { ctx.fillStyle = color; ctx.font = `600 ${size}px "Segoe UI","Microsoft JhengHei",sans-serif`; ctx.textAlign = 'center'; ctx.fillText(value, x, y); };
function drawBowl() {
  ctx.setTransform(2, 0, 0, 2, 0, 0); ctx.clearRect(0, 0, 480, 440);
  const done = game.phase === 'served', step = done ? 3 : game.cookStage;
  rect(0, 0, 480, 440, 0, '#293043');
  for (let x = 0; x < 480; x += 40) for (let y = 0; y < 245; y += 40) rect(x + 1, y + 1, 38, 38, 2, (x + y) % 80 === 0 ? '#303a49' : '#343e4d');
  rect(0, 245, 480, 195, 0, '#936c56'); for (let i = 0; i < 5; i++) line(0, 248 + i * 40, 480, 248 + i * 40, '#654c46', 2);
  ellipse(244, 288, 111, 17, '#281d2a55');
  ctx.fillStyle = '#ebe0cc'; ctx.beginPath(); ctx.moveTo(142, 225); ctx.bezierCurveTo(154, 312, 328, 312, 338, 225); ctx.fill();
  ellipse(240, 225, 98, 39, '#f6ecd8'); ellipse(240, 225, 86, 31, step >= 1 ? '#9f4e30' : '#d0b66b');
  ctx.strokeStyle = '#ebc972'; ctx.lineWidth = 3;
  for (let n = 0; n < 9; n++) { ctx.beginPath(); ctx.ellipse(220 + n * 4, 223 + (n % 3) * 3, 46 - n * 2, 12, Math.sin(n) * .12, 0, Math.PI * 1.8); ctx.stroke(); }
  if (game.garnishes.includes('beef') || done) for (let n = 0; n < 3; n++) { rect(243 + n * 11, 206 + n * 9, 23, 15, 4, '#63362d'); line(247 + n * 11, 210 + n * 9, 262 + n * 11, 210 + n * 9, '#b87950', 2); }
  if (game.garnishes.includes('greens') || done) for (let n = 0; n < 3; n++) { ellipse(192 + n * 11, 215 - n * 3, 7, 14, '#79a477'); line(192 + n * 11, 210 - n * 3, 203 + n * 11, 231 - n * 3, '#b5c49a', 3); }
  line(357, 179, 378, 269, '#e9c993', 4); line(369, 178, 390, 268, '#e9c993', 4);
  line(180, 265, 300, 265, '#b8755c', 3); text('夜食', 240, 286, '#885645', 13);
  ctx.strokeStyle = '#e8e2d166'; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) { const x = 213 + i * 26; ctx.beginPath(); ctx.moveTo(x, 177); ctx.bezierCurveTo(x + 17, 165, x - 14, 149, x + 6, 132); ctx.stroke(); }
  rect(23, 160, 52, 55, 5, '#686c6d'); ellipse(49, 161, 26, 9, '#8a8c82'); line(22, 165, 24, 205, '#c0b99c', 3);
  ellipse(435, 233, 20, 9, '#cbaf88'); ellipse(435, 233, 15, 6, '#784838');
}

/* ================= HUD + UI ================= */
let toastTimer = 0;
function toast(msg, bad) { const el = $('night-toast'); el.textContent = msg; el.classList.toggle('bad', !!bad); el.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('on'), 1600); put('night-live', msg); }
function updateHUD() {
  put('night-clock', G.clock(game.phase === 'ready' ? 0 : game.elapsed));
  put('distance-label', tr('距離家裡', 'DISTANCE HOME'));
  const km = game.phase === 'ready' ? (startRemain * M_PER_UNIT / 1000) : (remain * M_PER_UNIT / 1000);
  put('night-distance', ['arrived', 'cook', 'served'].includes(game.phase) ? tr('已到家', 'HOME') : `${km.toFixed(2)} km`);
  const pct = game.phase === 'ready' ? 0 : game.distance / G.DISTANCE * 100;
  $('night-progress').style.width = pct + '%'; document.querySelector('.night-route').setAttribute('aria-valuenow', Math.floor(pct));
  const driving = game.phase === 'drive' && !game.paused;
  for (const id of ['night-left', 'night-right', 'night-boost', 'night-brake']) $(id).disabled = !driving;
  $('night-pause').disabled = !['drive', 'cook'].includes(game.phase);
  put('night-pause', game.paused ? tr('繼續 ▷', 'Resume ▷') : tr('暫停 Ⅱ', 'Pause Ⅱ'));
  put('night-best', best || '—');
  put('night-speed', `${Math.round(Math.abs(car.v) * M_PER_UNIT * 3.6 * .38)}`);
  put('night-timer', `${Math.max(0, Math.ceil(G.LIMIT - game.elapsed))}`);
  $('night-hud').hidden = !driving;
  put('night-cam', camMode === 'chase' ? tr('空拍 ⌖', 'Aerial ⌖') : tr('跟車 ⌖', 'Chase ⌖'));
}
function render() {
  panel.dataset.phase = game.phase; updateHUD();
  const cooking = ['cook', 'served'].includes(game.phase);
  scene3d.hidden = cooking; cookCanvas.hidden = !cooking; $('night-cam').hidden = cooking; $('night-map').hidden = cooking || game.phase === 'ready';
  $('night-cooking').hidden = !(game.phase === 'cook' && !game.paused);
  const overlay = game.paused || ['ready', 'arrived', 'late', 'served'].includes(game.phase);
  $('night-overlay').hidden = !overlay; $('overlay-result').hidden = game.phase !== 'served' || game.paused;
  for (const [id, active] of [['step-drive', !cooking], ['step-cook', cooking]]) { if (active) $(id).setAttribute('aria-current', 'step'); else $(id).removeAttribute('aria-current'); }
  if (overlay) {
    let title, copy, label, kicker;
    if (game.paused) { kicker = 'TAKE A LITTLE BREAK'; title = tr('先停一下。', 'Take a breath.'); copy = tr('時間和進度都停在這裡，準備好再繼續。', 'Your time and progress are paused. Continue when you are ready.'); label = tr('繼續這趟旅程 →', 'Continue →'); }
    else if (game.phase === 'ready') { kicker = 'THE LAST BOWL OF THE NIGHT'; title = tr('夜路的盡頭，\n有一碗熱湯。', 'A late-night drive.\nA warm bowl awaits.'); copy = tr(`凌晨 2:50，距離家裡還有 ${(startRemain * M_PER_UNIT / 1000).toFixed(1)} 公里。\n照著橘色箭頭開回家，3 點前到家，親手煮一碗牛肉麵。`, `It's 2:50 AM and home is ${(startRemain * M_PER_UNIT / 1000).toFixed(1)} km away.\nFollow the orange arrows, get home before 3 AM and cook a bowl of beef noodles.`); label = tr('開車回家 →', 'Drive home →'); }
    else if (game.phase === 'arrived') { kicker = 'HOME SWEET HOME'; title = tr('到家了，準備開火。', 'Home in time. Let\'s cook.'); copy = tr(`你在 ${G.clock(game.arrival)} 回到家，路上碰撞 ${game.hits} 次${knocked ? `，沿路撞倒 ${knocked} 樣東西` : ''}。\n走進廚房，為自己煮一碗熱騰騰的牛肉麵。`, `You got home at ${G.clock(game.arrival)}, with ${game.hits} bumps${knocked ? ` and ${knocked} things knocked over` : ''}.\nHead into the kitchen and cook a warm bowl of beef noodles.`); label = tr('進廚房煮麵 →', 'Into the kitchen →'); }
    else if (game.phase === 'late') { kicker = 'THE CITY HAS FALLEN ASLEEP'; title = tr('差一點，沒趕上三點。', 'A little too late.'); copy = tr('已經凌晨 3 點，還沒回到家。\n再試一次：照著橘色箭頭，避開施工路段和車輛。', 'It\'s 3 AM and you are not home yet.\nTry again: follow the orange arrows and avoid roadworks and traffic.'); label = tr('再開一趟 →', 'Try another drive →'); }
    else { const r = game.result; kicker = 'YOUR MIDNIGHT SPECIAL'; title = r.stars === 3 ? tr('這碗，值得這趟夜路。', 'Worth the midnight drive.') : tr('熱騰騰的宵夜，上桌。', 'Your midnight meal is served.'); copy = tr(`準時到家，完成 ${r.stars} 星牛肉麵。\n${r.stars === 3 ? '火候與湯量都剛剛好。' : '下次抓準綠色區域，挑戰更好口感。'}`, `Home on time, with a ${r.stars}-star bowl.\n${r.stars === 3 ? 'Perfect noodles. Just enough broth.' : 'Aim for the green zones for a tastier bowl.'}`); label = tr('再煮一碗 ↻', 'One more bowl ↻'); put('overlay-result', `${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}  ·  ${r.score} ${tr('分', 'PTS')}`); }
    put('overlay-title', title); $('overlay-title').style.whiteSpace = 'pre-line'; put('overlay-copy', copy); $('overlay-copy').style.whiteSpace = 'pre-line'; put('overlay-kicker', kicker); put('night-primary', label);
  }
  if (game.phase === 'cook' && !game.paused) {
    const step = game.cookStage;
    put('cook-kicker', `STEP 0${step + 1} / 03`);
    put('cook-title', [tr('先把麵煮好', 'Noodles first'), tr('再來一勺熱湯', 'Add the hot broth'), tr('最後，加上好料', 'The finishing touches')][step]);
    put('cook-hint', step < 2 ? tr('指針進入綠色區域時按下按鈕。', 'Press the button when the needle is in the green zone.') : tr('放入牛肉和青菜，就可以上桌了。', 'Add beef and greens, then serve your bowl.'));
    $('cook-meter').hidden = step === 2; $('cook-garnishes').hidden = step !== 2;
    put('cook-action', [tr('起鍋！', 'Lift the noodles!'), tr('湯夠了！', 'Enough broth!'), tr('上桌 →', 'Serve →')][step]);
    $('cook-action').disabled = step === 2 && game.garnishes.length < 2;
    document.querySelectorAll('[data-garnish]').forEach(b => { const added = game.garnishes.includes(b.dataset.garnish); b.disabled = added; b.setAttribute('aria-pressed', added); b.textContent = `${added ? '✓' : '＋'} ${b.dataset.garnish === 'beef' ? tr('牛肉', 'Beef') : tr('青菜', 'Greens')}`; });
    put('cook-feedback', feedback);
  }
  if (cooking) drawBowl();
}
function checkTransition() {
  if (game.phase !== lastPhase) { clearInput(); lastPhase = game.phase; render(); if (['arrived', 'late', 'served'].includes(game.phase)) $('night-primary').focus({ preventScroll: true }); }
}
function loop(now) {
  const raw = last ? (now - last) / 1000 : 0, dt = Math.min(raw, .12); last = now;
  const t = now / 1000;
  if (!game.paused) {
    // small fixed steps keep steering and collisions stable on slow devices
    if (game.phase === 'drive') { let left = dt; while (left > 1e-6 && game.phase === 'drive') { const st = Math.min(left, 1 / 60); stepDrive(st); left -= st; } stepPhysics(dt); }
    else if (game.phase === 'cook') { game.tick(dt); $('cook-needle').style.left = `${game.meter}%`; }
  }
  checkTransition();
  if (!['cook', 'served'].includes(game.phase)) render3d(dt, t);
  if (hitFlash > 0) { hitFlash -= dt; sceneBox.classList.toggle('hit', hitFlash > 0); }
  updateHUD();
  frame = requestAnimationFrame(loop);
}
function startLoop() { if (!frame) { last = 0; frame = requestAnimationFrame(loop); } }
function stopLoop() { cancelAnimationFrame(frame); frame = 0; }
function clearInput() { input.left = input.right = input.gas = input.brake = 0; document.querySelectorAll('.night-controls button[aria-pressed]').forEach(b => b.setAttribute('aria-pressed', 'false')); }
function pause() { if (!game.pause()) return; clearInput(); render(); $('night-primary').focus({ preventScroll: true }); }
function resume() { if (!game.resume()) return; last = 0; render(); sceneBox.focus({ preventScroll: true }); }
function start() {
  clearInput(); game.reset(); resetDrive(); game.start(); lastPhase = 'drive'; stored = false; feedback = '';
  toast(tr('出發！照著橘色箭頭開回家。', 'Go! Follow the orange arrows home.'));
  render(); sceneBox.focus({ preventScroll: true }); panel.scrollIntoView({ block: 'center', behavior: 'instant' });
}
$('night-primary').addEventListener('click', () => {
  if (game.paused) { resume(); return; }
  if (game.phase === 'arrived') { game.beginCooking(); lastPhase = 'cook'; render(); $('cook-action').focus({ preventScroll: true }); return; }
  if (['ready', 'late', 'served'].includes(game.phase)) start();
});
// hold-to-drive buttons (pointer events allow steering and gas with two fingers at once)
for (const [id, k] of [['night-left', 'left'], ['night-right', 'right'], ['night-boost', 'gas'], ['night-brake', 'brake']]) {
  const b = $(id), on = e => { if (b.disabled) return; e.preventDefault(); input[k] = 1; b.setAttribute('aria-pressed', 'true'); try { b.setPointerCapture(e.pointerId); } catch {} }, off = () => { input[k] = 0; b.setAttribute('aria-pressed', 'false'); };
  b.addEventListener('pointerdown', on); for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(ev, off);
  b.addEventListener('contextmenu', e => e.preventDefault());
}
$('night-pause').addEventListener('click', () => game.paused ? resume() : pause());
$('night-cam').addEventListener('click', () => { camMode = camMode === 'chase' ? 'aerial' : 'chase'; updateHUD(); sceneBox.focus({ preventScroll: true }); });
$('night-full').addEventListener('click', async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await panel.requestFullscreen(); } catch { toast(tr('這個瀏覽器不支援全螢幕。', 'Fullscreen is not available here.')); } });
document.addEventListener('fullscreenchange', () => { panel.classList.toggle('is-full', !!document.fullscreenElement); put('night-full', document.fullscreenElement ? tr('離開全螢幕', 'Exit fullscreen') : tr('全螢幕 ⤢', 'Fullscreen ⤢')); resize(); });
function cookingAction() {
  if (game.cookStage < 2) { const q = game.cook(); if (q === null) return; feedback = q === 100 ? tr('剛剛好！＋100', 'Perfect! +100') : q === 65 ? tr('還不錯！＋65', 'Pretty good! +65') : tr('下次再抓準一點。＋30', 'A little early or late. +30'); render(); }
  else if (game.serve()) {
    if (!stored) { stored = true; if (game.result.score > best) { best = game.result.score; try { localStorage.setItem(bestKey, String(best)); } catch {} } }
    checkTransition(); render();
  }
}
$('cook-action').addEventListener('click', cookingAction);
document.querySelectorAll('[data-garnish]').forEach(b => b.addEventListener('click', () => { game.garnish(b.dataset.garnish); render(); if (game.garnishes.length === 2) $('cook-action').focus({ preventScroll: true }); }));
const KEYS = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'gas', KeyW: 'gas', ArrowDown: 'brake', KeyS: 'brake', Space: 'brake' };
document.addEventListener('keydown', e => {
  if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest('input,textarea,select,[contenteditable]')) return;
  if (KEYS[e.code] && game.phase === 'drive' && !game.paused && !(e.code === 'Space' && e.target.closest('button'))) { e.preventDefault(); input[KEYS[e.code]] = 1; }
  else if (e.code === 'KeyP' && ['drive', 'cook'].includes(game.phase)) { e.preventDefault(); if (!e.repeat) game.paused ? resume() : pause(); }
  else if (e.code === 'KeyC' && game.phase === 'drive') { e.preventDefault(); if (!e.repeat) $('night-cam').click(); }
  else if (e.code === 'Space' && game.phase === 'cook' && !game.paused && !e.target.closest('button,a')) { e.preventDefault(); if (!e.repeat) cookingAction(); }
});
document.addEventListener('keyup', e => { if (KEYS[e.code]) input[KEYS[e.code]] = 0; });
document.addEventListener('visibilitychange', () => { if (document.hidden && game.phase === 'drive') pause(); });
window.addEventListener('blur', () => { if (game.phase === 'drive') pause(); });
window.addEventListener('yk:language', () => { feedback = ''; render(); });

function resize() {
  const w = sceneBox.clientWidth, h = sceneBox.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < 560 ? 70 : 62; camera.updateProjectionMatrix();
  const m = Math.round(clamp(w * .24, 96, 170) * Math.min(devicePixelRatio, 2)); if (map.width !== m) { map.width = map.height = m; }
}
new ResizeObserver(resize).observe(sceneBox); resize();

// idle preview: the city is visible behind the start card, slowly orbiting
resetDrive(); camMode = 'chase';
render(); startLoop();
if (/[?&]debug\b/.test(location.search)) window.__noodle = { car, game, homePos, world, PROPS, get physMs() { return physMs; }, get knocked() { return knocked; } };
if (!reduced) { const idle = () => { if (game.phase === 'ready') { car.h += .0025; } requestAnimationFrame(idle); }; idle(); }
