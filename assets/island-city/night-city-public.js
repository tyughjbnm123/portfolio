import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Public night city: original procedural city kit (cyber-city-original.glb, built by tools/build-cyber-city.py).
// Same interface as the private preview's city module, so island.html is identical apart from the import path.
// Loaded the first time the island turns to night; nothing here runs during the day.
//
// - Height comes from stacking one-storey wall sections, so towers are tall without stretching any texture.
// - Each district gets a composed skyline: a landmark tower on the island's outer side, a secondary
//   high-rise, then mid and low blocks.
// - No text boards on buildings: the five district LEDs (placeLED) are the only signs.

export async function createNightCity({ renderer, plans, work, pick, districts = [] }) {
  const loader = new GLTFLoader();
  // Tool-room landmark: a bespoke original tower (tools/build-tool-tower.py). Optional — the kit is used if it fails.
  const [gltf, toolTower] = await Promise.all([
    loader.loadAsync(new URL('./cyber-city-original.glb', import.meta.url).href),
    loader.loadAsync(new URL('./tool-room-tower-v1.glb', import.meta.url).href).catch(() => null)]);
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

  // Every part has a bottom-centre pivot and is one storey (1 unit) tall: storey k sits at y = k, the roof on top.
  const MIDS = { tower: ['tower_walls.001', 'tower_walls.002', 'tower_walls.001', 'tower_walls.003'], midrise: ['midrise_walls.001'], slim: ['slim_walls.001'] };
  const ROOF_H = { tower: .4, midrise: .3, slim: .4 };
  function make(kind, levels = 1) {
    const g = new THREE.Group();
    if (MIDS[kind]) {
      g.add(src(kind + '_walls').clone());
      for (let k = 1; k < levels; k++) { const s = src(MIDS[kind][(k - 1) % MIDS[kind].length]).clone(); s.position.set(0, k, 0); g.add(s); }
      const roof = src(kind + '_roof').clone(); roof.position.set(0, levels, 0); g.add(roof);
    } else g.add(src(kind).clone(true));
    g.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
    return g;
  }
  // footprint of each part at scale 1: tower/midrise/corner 1×1, terrace 1×2; height in storeys
  const FOOT = { tower: [1, 1], midrise: [1, 1], slim: [.7, .7], corner: [1, 1], terrace: [1, 2], podium: [1.6, 1.6] };

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
    // island.html already ranks the spots: the first one is on the island's outer side, away from the bridge.
    const order = plan.items.map((_, i) => i);
    plan.items.forEach(it => { it.beacon = false; });
    order.forEach((i, rank) => {
      const it = plan.items[i], L = LANDMARK[plan.key] || { w: 3.1, levels: 8 };
      const bespoke = toolTower && plan.key === 'tools';
      const spec = rank === 0 && bespoke ? { kind: 'midrise', w: 3, levels: 5 }
        : rank === 0 ? { kind: 'tower', w: L.w, levels: L.levels }
        : rank === 1 ? (plan.key === 'tools' || plan.key === 'lab' ? { kind: 'slim', w: 3.2, levels: 7 } : { kind: 'midrise', w: 3, levels: 5 })
        : rank === 2 ? { kind: 'midrise', w: 2.7, levels: 3 }
        : { kind: rank % 2 ? 'terrace' : 'corner', w: rank % 2 ? 2 : 2.5, levels: 1 };
      if (rank === 0) { it.beacon = true; it.bespoke = bespoke; }   // island.html mounts the LED on the beacon item
      const b = make(spec.kind, spec.levels); b.scale.setScalar(spec.w); b.position.set(it.x, 0, it.z); b.rotation.y = it.rot; plan.group.add(b);
      b.traverse(o => { if (o.isMesh) pick(o, plan.key); });
      const [fx, fz] = FOOT[spec.kind];
      it.renderBounds = { halfX: fx * spec.w / 2, halfZ: fz * spec.w / 2, height: spec.w * (spec.levels + (ROOF_H[spec.kind] || 0)), host: b };
      const d = districts.find(x => x.key === plan.key); if (d?.towers?.[i]) d.towers[i].r = Math.hypot(it.renderBounds.halfX, it.renderBounds.halfZ) + .15;
    });
    // landmark: a thin lit crown and a coloured wash at its foot, so it reads as a lit volume against the sky
    const it = plan.items.find(x => x.beacon), col = CROWN[plan.key] || 0x7fe8ff;
    if (it && it.renderBounds && !it.bespoke) {
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
    { const mr = make('midrise', 2); mr.scale.setScalar(3.1); mr.position.set(2, .12, -2.55); mr.rotation.y = Math.PI / 2; block.add(mr); }
    building('terrace', 2.15, 3.35, 1.8, 0);
    building('corner', 2.4, -3.25, 2.5, Math.PI / 2);
    building('corner', 1.75, -.3, 3.55, Math.PI);
    const tTop = .12 + 3.25 * 6.4;
    box(1.4, .8, 1.3, -2.25, tTop, -1.65, dark); box(.08, 2, .08, -2.25, tTop + .8, -1.65, metal); box(.18, .18, .18, -2.25, tTop + 2.8, -1.65, pink);
    box(.75, .55, .85, 2.2, 7.25, -2.45, dark); box(.25, 1.5, .25, 2.65, 7.25, -2.9, metal);
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
  const centres = [], TOOL_SCALE = .82; let toolLED = null;
  for (const d of districts) {
    if (d.key === 'games' || d.key === 'work' || !d.g?.userData?.dayBuild) continue;
    const root = new THREE.Group(); root.position.y = 2; root.name = 'night centre / ' + d.key; root.visible = false; d.g.add(root);
    const put = (kind, levels, w, x, z, a = 0) => { const b = make(kind, levels); b.scale.setScalar(w); b.position.set(x, .12, z); b.rotation.y = a; root.add(b); };
    const plate = new THREE.Mesh(new THREE.BoxGeometry(9.4, .12, 8.2), concrete); plate.position.y = .06; plate.receiveShadow = true; root.add(plate);
    if (d.key === 'tools' && toolTower) {
      const T = toolTower.scene, S = TOOL_SCALE;
      T.getObjectByName('vertical_led')?.removeFromParent();          // the shared district LED replaces its own panel
      T.traverse(o => { if (o.isMesh) { for (const t of [o.material.map, o.material.emissiveMap]) if (t) t.anisotropy = aniso; if (o.material.emissiveMap) { o.material.emissiveIntensity = 0; facades.add(o.material); } } });
      T.scale.setScalar(S);
      d.g.updateMatrixWorld(true);
      const out = d.g.worldToLocal(d.g.getWorldPosition(new THREE.Vector3()).multiplyScalar(2)); out.y = 0; out.normalize();
      T.rotation.y = Math.atan2(out.x, out.z); root.add(T);
      // where the LED goes: the old panel's spot on the main tower's front face, in island-local space
      const face = new THREE.Vector3(-2.36 * S, 16.2 * S, 2.69 * S + .32).applyAxisAngle(new THREE.Vector3(0, 1, 0), T.rotation.y);
      toolLED = { root, pos: face, yaw: T.rotation.y, height: 28 * S };
      root.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; pick(o, d.key); } });
      centres.push({ root, day: d.g.userData.dayBuild });
      continue;
    }
    put('midrise', d.key === 'tools' ? 4 : 3, 3, -1.6, -1.4);
    put('corner', 1, 2.4, 2.4, -1.8, Math.PI / 2);
    put('terrace', 1, 2, 2.5, 2.1);
    put('corner', 1, 2, -2.6, 2.4, Math.PI);
    root.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; pick(o, d.key); } });
    centres.push({ root, day: d.g.userData.dayBuild });
  }

  // Mount a district LED on the landmark face that looks outward, away from the island centre, mid-height.
  const _q = new THREE.Quaternion(), _p = new THREE.Quaternion(), _d = new THREE.Vector3();
  function placeLED(tower, sign) {
    if (tower.key === 'tools' && toolLED) {
      // the root grows with the night like the rest of the centre; the sign rides on it
      toolLED.root.add(sign); sign.position.copy(toolLED.pos); sign.rotation.set(0, toolLED.yaw, 0); return true;
    }
    // island.html passes its TOWERS entries ({T,key,items})
    const group = tower.group || tower.T, it = tower.items.find(x => x.beacon); if (!it || !group || !it.renderBounds) return false;
    const b = it.renderBounds;
    group.add(sign); group.updateMatrixWorld(true);
    _w.set(it.x, 0, it.z); group.localToWorld(_w);
    const centre = new THREE.Vector3(0, 0, 0); group.localToWorld(centre);
    _d.set(_w.x - centre.x, 0, _w.z - centre.z).normalize();
    group.getWorldQuaternion(_p); _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(_d.x, _d.z));
    sign.quaternion.copy(_p.clone().invert().multiply(_q));
    const local = _d.clone().applyQuaternion(_p.clone().invert());
    const c = Math.cos(-it.rot), s = Math.sin(-it.rot), lx = local.x * c - local.z * s, lz = local.x * s + local.z * c;
    const edge = Math.min(b.halfX / Math.max(1e-3, Math.abs(lx)), b.halfZ / Math.max(1e-3, Math.abs(lz)));
    const h = sign.userData.displaySize?.height ?? 8, y = Math.min(b.height - h / 2 - .8, Math.max(h / 2 + 2.2, b.height * .5));
    sign.position.set(it.x + local.x * (edge + .32), y, it.z + local.z * (edge + .32));
    return true;
  }

  let skylineTex = null; src('tower_walls.001').traverse(o => { if (!skylineTex && o.isMesh && o.material.emissiveMap) skylineTex = o.material.emissiveMap.clone(); });
  if (skylineTex) { skylineTex.wrapS = skylineTex.wrapT = THREE.RepeatWrapping; skylineTex.needsUpdate = true; }

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
