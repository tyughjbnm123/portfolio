import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Public night city: "Cyber City" by papptimus, CC BY 4.0 (see ATTRIBUTION.txt), modified.
// Same interface as the private preview's city module, so island.html is identical apart from the import path.
// Loaded the first time the island turns to night; nothing here runs during the day.
//
// - Height comes from stacking one-storey wall sections, so towers are tall without stretching any texture.
// - Each district gets a composed skyline: a landmark tower where the main view sees it unobstructed,
//   a secondary high-rise, then mid and low blocks.
// - No text boards on buildings: the five district LEDs (placeLED) are the only signs.

const MAIN_VIEW = new THREE.Vector3(0, 134, 183);   // HOME camera in island.html

export async function createNightCity({ renderer, plans, work, pick, districts = [] }) {
  const gltf = await new GLTFLoader().loadAsync(new URL('./cyber-city.glb', import.meta.url).href);
  // GLTFLoader strips '.' from node names (tower_walls.001 → tower_walls001)
  const src = n => gltf.scene.getObjectByName(n) || gltf.scene.getObjectByName(n.replace(/\./g, ''));
  const facades = new Set(), lit = [], lights = [], accents = [];
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material;
    for (const t of [m.map, m.emissiveMap]) if (t) t.anisotropy = aniso;
    if (m.emissiveMap) { m.emissiveIntensity = 0; facades.add(m); }
  });

  const MIDS = { tower: ['tower_walls.001', 'tower_walls.002', 'tower_walls.003'], midrise: ['midrise_walls.001'] };
  function make(kind, levels = 1) {
    const g = new THREE.Group();
    if (MIDS[kind]) {
      g.add(src(kind + '_walls').clone());
      for (let k = 1; k < levels; k++) { const s = src(MIDS[kind][(k - 1) % MIDS[kind].length]).clone(); s.position.set(0, k - 1, 0); g.add(s); }
      const roof = src(kind + '_roof').clone(); roof.position.set(0, levels - 2, 0); g.add(roof);
    } else g.add(src(kind).clone(true));
    g.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
    return g;
  }
  // footprint of each part at scale 1: tower/midrise/corner 1×1, terrace 1×2; height in storeys
  const FOOT = { tower: [1, 1], midrise: [1, 1], corner: [1, 1], terrace: [1, 2] };

  const metal = new THREE.MeshStandardMaterial({ color: 0x263446, metalness: .45, roughness: .58 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x101825, roughness: .6, metalness: .25 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0x424c63, roughness: .8 });
  const glow = color => { const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0, roughness: .4 }); lit.push(m); return m; };
  const cyan = glow(0x29e7ff), pink = glow(0xff488b), amber = glow(0xffc263);

  // Skyline tiers per district; storeys differ so the four city islands never share a silhouette.
  const LANDMARK = { tools: { w: 3.1, levels: 10 }, work: { w: 3.2, levels: 9 }, lab: { w: 3.2, levels: 8 }, about: { w: 3.1, levels: 8 } };
  const CROWN = { about: 0xff9a6a, work: 0x5fb4ff, tools: 0xffd25a, lab: 0x38ffe0 };
  const _w = new THREE.Vector3();
  for (const plan of plans) {
    plan.group.updateMatrixWorld(true);
    const dist = plan.items.map(it => { _w.set(it.x, 0, it.z); plan.group.localToWorld(_w); return Math.hypot(_w.x - MAIN_VIEW.x, _w.z - MAIN_VIEW.z); });
    const order = plan.items.map((_, i) => i).sort((a, b) => dist[b] - dist[a]);
    plan.items.forEach(it => { it.beacon = false; });
    order.forEach((i, rank) => {
      const it = plan.items[i], L = LANDMARK[plan.key] || { w: 3.1, levels: 8 };
      const spec = rank === 0 ? { kind: 'tower', w: L.w, levels: L.levels }
        : rank === 1 ? { kind: 'midrise', w: 3, levels: 4 }
        : rank === 2 ? { kind: 'midrise', w: 2.7, levels: 3 }
        : { kind: rank % 2 ? 'terrace' : 'corner', w: rank % 2 ? 2 : 2.5, levels: 1 };
      if (rank === 0) it.beacon = true;
      const b = make(spec.kind, spec.levels); b.scale.setScalar(spec.w); b.position.set(it.x, 0, it.z); b.rotation.y = it.rot; plan.group.add(b);
      b.traverse(o => { if (o.isMesh) pick(o, plan.key); });
      const [fx, fz] = FOOT[spec.kind];
      it.renderBounds = { halfX: fx * spec.w / 2, halfZ: fz * spec.w / 2, height: spec.w * spec.levels, host: b };
      const d = districts.find(x => x.key === plan.key); if (d?.towers?.[i]) d.towers[i].r = Math.hypot(it.renderBounds.halfX, it.renderBounds.halfZ) + .15;
    });
    // landmark: a thin lit crown and a coloured wash at its foot, so it reads as a lit volume against the sky
    const it = plan.items.find(x => x.beacon), col = CROWN[plan.key] || 0x7fe8ff;
    if (it) {
      const b = it.renderBounds, crownMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0, roughness: .4 }); accents.push({ m: crownMat, k: 1.15 });
      const crown = new THREE.Mesh(new THREE.BoxGeometry(b.halfX * 2 + .16, .14, b.halfZ * 2 + .16), crownMat); crown.position.set(it.x, b.height - .3, it.z); crown.rotation.y = it.rot; plan.group.add(crown);
      const wash = new THREE.PointLight(col, 0, b.height * 1.1, 1.6); wash.position.set(it.x, b.height * .35, it.z); plan.group.add(wash); lights.push({ l: wash, k: 26 });
    }
  }

  // The work island trades its daytime buildings for a designed block at night (no text boards).
  let block = null;
  if (work) {
    block = new THREE.Group(); block.name = 'work night block';
    const box = (w, h, d, x, y, z, m = metal) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; block.add(o); return o; };
    const building = (name, width, x, z, angle = 0) => { const r = src(name).clone(true); r.scale.setScalar(width); r.position.set(x, .12, z); r.rotation.y = angle; block.add(r); return r; };
    // every footprint stays inside the island's central collision area (radius 6.3)
    box(9.8, .12, 8.6, 0, 0, 0, concrete);
    const tw = make('tower', 6); tw.scale.setScalar(3.25); tw.position.set(-2.25, .12, -1.65); block.add(tw);
    building('midrise', 3.1, 2, -2.55, Math.PI / 2);
    building('terrace', 2.15, 3.35, 1.8, 0);
    building('corner', 2.4, -3.25, 2.5, Math.PI / 2);
    building('corner', 1.75, -.3, 3.55, Math.PI);
    const tTop = .12 + 3.25 * 6;
    box(1.4, .8, 1.3, -2.25, tTop, -1.65, dark); box(.08, 2, .08, -2.25, tTop + .8, -1.65, metal); box(.18, .18, .18, -2.25, tTop + 2.8, -1.65, pink);
    box(.75, .55, .85, 2.2, 6.32, -2.45, dark); box(.25, 1.5, .25, 2.65, 6.32, -2.9, metal);
    // elevated walkway between the two towers
    box(4.25, .2, 1.05, -.1, 5.05, -1.6, metal);
    for (const z of [-2.1, -1.1]) { box(4.25, .06, .06, -.1, 5.3, z, cyan); box(4.25, .06, .06, -.1, 6, z, metal); for (let x = -2; x <= 2; x += .8) box(.04, .75, .04, x, 5.25, z, metal); }
    // street canopies and doorway lights
    box(2.6, .14, .9, -3.25, 2.12, 3.92, metal); box(2.5, .06, .08, -3.25, 2.24, 4.32, amber);
    box(2.2, .12, .8, 3.35, 2.15, 4.02, metal); box(2.15, .06, .06, 3.35, 2.28, 4.4, pink);
    box(.09, .04, 5.4, .75, .15, 1, cyan); box(2.1, .04, .09, -.7, .15, 4.7, amber);
    for (const [x, z, c] of [[-2, 1, 0x25ceff], [3, 2.8, 0xff4b91]]) { const l = new THREE.PointLight(c, 0, 9, 2); l.position.set(x, 2, z); block.add(l); lights.push({ l, k: 9 }); }
    block.position.y = 2; work.parent.add(block);
    block.traverse(o => { if (o.isMesh) pick(o, 'work'); });
  }

  // The other city islands swap their daytime centre for a small night block, so no cottage sits under the towers.
  const centres = [];
  for (const d of districts) {
    if (d.key === 'games' || d.key === 'work' || !d.g?.userData?.dayBuild) continue;
    const root = new THREE.Group(); root.position.y = 2; root.name = 'night centre / ' + d.key; root.visible = false; d.g.add(root);
    const put = (kind, levels, w, x, z, a = 0) => { const b = make(kind, levels); b.scale.setScalar(w); b.position.set(x, .12, z); b.rotation.y = a; root.add(b); };
    const plate = new THREE.Mesh(new THREE.BoxGeometry(9.4, .12, 8.2), concrete); plate.position.y = .06; plate.receiveShadow = true; root.add(plate);
    put('midrise', d.key === 'tools' ? 4 : 3, 3, -1.6, -1.4);
    put('corner', 1, 2.4, 2.4, -1.8, Math.PI / 2);
    put('terrace', 1, 2, 2.5, 2.1);
    put('corner', 1, 2, -2.6, 2.4, Math.PI);
    root.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; pick(o, d.key); } });
    centres.push({ root, day: d.g.userData.dayBuild });
  }

  // Mount a district LED on the landmark face that looks toward the main view, mid-height, clear of the roof.
  const _q = new THREE.Quaternion(), _p = new THREE.Quaternion(), _d = new THREE.Vector3();
  function placeLED(tower, sign) {
    // island.html passes its TOWERS entries ({T,key,items})
    const group = tower.group || tower.T, it = tower.items.find(x => x.beacon); if (!it || !group || !it.renderBounds) return false;
    const b = it.renderBounds;
    group.add(sign); group.updateMatrixWorld(true);
    _w.set(it.x, 0, it.z); group.localToWorld(_w);
    _d.set(MAIN_VIEW.x - _w.x, 0, MAIN_VIEW.z - _w.z).normalize();
    group.getWorldQuaternion(_p); _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(_d.x, _d.z));
    sign.quaternion.copy(_p.clone().invert().multiply(_q));
    const local = _d.clone().applyQuaternion(_p.clone().invert());
    const c = Math.cos(-it.rot), s = Math.sin(-it.rot), lx = local.x * c - local.z * s, lz = local.x * s + local.z * c;
    const edge = Math.min(b.halfX / Math.max(1e-3, Math.abs(lx)), b.halfZ / Math.max(1e-3, Math.abs(lz)));
    const h = sign.userData.displaySize?.height ?? 8, y = Math.min(b.height - h / 2 - .8, Math.max(h / 2 + 2.2, b.height * .5));
    sign.position.set(it.x + local.x * (edge + .32), y, it.z + local.z * (edge + .32));
    return true;
  }

  const skylineTex = src('tower_walls.001').material.emissiveMap.clone();
  skylineTex.wrapS = skylineTex.wrapT = THREE.RepeatWrapping; skylineTex.needsUpdate = true;

  let last = -1;
  return {
    block, skylineTex, placeLED,
    update(n) {
      if (Math.abs(n - last) < .003) return; last = n;
      const mix = THREE.MathUtils.smoothstep(n, .05, .92);
      for (const c of centres) { c.root.visible = n > .08; c.root.scale.y = Math.max(.001, mix); c.day.visible = mix < .98; c.day.scale.y = Math.max(.001, 1 - mix); }
      facades.forEach(m => m.emissiveIntensity = n * .8);
      lit.forEach(m => m.emissiveIntensity = n * 1.6);
      accents.forEach(({ m, k }) => m.emissiveIntensity = n * k);
      lights.forEach(({ l, k }) => l.intensity = n * k);
    }
  };
}
