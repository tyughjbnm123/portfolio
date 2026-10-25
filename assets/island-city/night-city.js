import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Night-city buildings: "Cyber City" by papptimus, CC BY 4.0 (see ATTRIBUTION.txt).
// Loaded the first time the island turns to night; nothing here runs during the day.
//
// plans: [{ group, items:[{kind,x,z,rot,w,levels,pick}] }]  buildings to place inside each island
// work:  { parent }                                        the work island, which gets a designed block
// pick:  (mesh, key) => void                               makes the new meshes clickable
export async function createNightCity({ renderer, plans, work, pick }) {
  const gltf = await new GLTFLoader().loadAsync(new URL('./cyber-city.glb', import.meta.url).href);
  // GLTFLoader strips '.' from node names (tower_walls.001 → tower_walls001)
  const src = n => gltf.scene.getObjectByName(n) || gltf.scene.getObjectByName(n.replace(/\./g, ''));
  const facades = new Set(), lit = [], signs = [], lights = [];
  const aniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  gltf.scene.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material;
    for (const t of [m.map, m.emissiveMap]) if (t) t.anisotropy = aniso;
    if (m.emissiveMap) { m.emissiveIntensity = 0; facades.add(m); }
  });

  // Tower and midrise walls are one-storey sections: stack them to any height so windows never stretch.
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

  const metal = new THREE.MeshStandardMaterial({ color: 0x263446, metalness: .45, roughness: .58 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x101825, roughness: .6, metalness: .25 });
  const concrete = new THREE.MeshStandardMaterial({ color: 0x424c63, roughness: .8 });
  const glow = color => { const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0, roughness: .4 }); lit.push(m); return m; };
  const cyan = glow(0x29e7ff), pink = glow(0xff488b), amber = glow(0xffc263);

  // island skylines
  for (const plan of plans) {
    for (const it of plan.items) {
      const b = make(it.kind, it.levels); b.scale.setScalar(it.w); b.position.set(it.x, 0, it.z); b.rotation.y = it.rot; plan.group.add(b);
      if (it.beacon) { const top = it.w * (it.levels || 1); const ant = new THREE.Mesh(new THREE.BoxGeometry(.08, 2.2, .08), metal); ant.position.set(it.x, top + 1.1, it.z); plan.group.add(ant);
        const tip = new THREE.Mesh(new THREE.BoxGeometry(.2, .2, .2), pink); tip.position.set(it.x, top + 2.25, it.z); plan.group.add(tip); }
      b.traverse(o => { if (o.isMesh) pick(o, plan.key); });
    }
  }

  // The work island trades its daytime buildings for a designed block at night.
  let block = null;
  if (work) {
    block = new THREE.Group(); block.name = 'work night block';
    const box = (w, h, d, x, y, z, m = metal) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; block.add(o); return o; };
    const building = (name, width, x, z, angle = 0) => { const r = src(name).clone(true); r.scale.setScalar(width); r.position.set(x, .12, z); r.rotation.y = angle; block.add(r); return r; };
    // every footprint stays inside the island's central collision area (radius 6.3); heights are relative to the ground (y = 2 in island space)
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
    const sign = (text, sub, w, h, x, y, z, color, angle = 0) => {
      const c = document.createElement('canvas'); c.width = 512; c.height = 256; const ctx = c.getContext('2d');
      ctx.fillStyle = '#0a121e'; ctx.fillRect(0, 0, 512, 256); ctx.strokeStyle = color; ctx.lineWidth = 6; ctx.strokeRect(7, 7, 498, 242);
      ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.font = '700 76px "Microsoft JhengHei","PingFang TC",sans-serif'; ctx.fillText(text, 256, 115);
      ctx.font = '500 27px monospace'; ctx.fillText(sub, 256, 183);
      const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
      const m = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0, roughness: .4, side: THREE.DoubleSide }); signs.push(m);
      const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); s.position.set(x, y, z); s.rotation.y = angle; block.add(s);
    };
    sign('創作', 'IDEAS INTO REALITY', 3.15, 1.58, -2.25, 13, -.01, '#6eeaff');
    sign('WORK', '02 / PROJECT DISTRICT', 3.35, 1.68, 2, 6, -.96, '#fdb759');
    sign('系統', 'BUILD · CONNECT', 1.9, .95, 3.35, 2.9, 4.02, '#ff76ae');
    sign('STUDIO', 'CRAFT & COLLABORATE', 2.3, 1.15, -3.25, 3, 3.73, '#79e8ff');
    sign('作品', 'WORKS', 1.55, 2.8, -3.91, 7.2, -1.1, '#ff76ae', -Math.PI / 2);
    for (const [x, z, col] of [[-2, 1, 0x25ceff], [3, 2.8, 0xff4b91]]) { const l = new THREE.PointLight(col, 0, 9, 2); l.position.set(x, 2, z); block.add(l); lights.push(l); }
    block.position.y = 2; work.parent.add(block);
    block.traverse(o => { if (o.isMesh) pick(o, 'work'); });
  }

  // a facade texture the far skyline can share, so the whole city reads as one place
  const skylineTex = src('tower_walls.001').material.emissiveMap.clone();
  skylineTex.wrapS = skylineTex.wrapT = THREE.RepeatWrapping; skylineTex.needsUpdate = true;

  let last = -1;
  return {
    block, skylineTex,
    update(n) {
      if (Math.abs(n - last) < .003) return; last = n;
      facades.forEach(m => m.emissiveIntensity = n * 1.05);
      lit.forEach(m => m.emissiveIntensity = n * 1.6);
      signs.forEach(m => m.emissiveIntensity = .2 + n * .75);
      lights.forEach(l => l.intensity = n * 9);
    }
  };
}
