import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// District annexes: 15 original GLB buildings (tools/build-annexes-refined.py), three styles per island.
// Each one replaces the small zone hall in front of a category's pins. Bottom-centre origin, +Y up,
// front +Z, authored at the people's scale before HUMAN_SCALE — the same units as the main buildings,
// so they share their scale. No boards or text on any annex; the district LEDs stay on the main
// buildings. Night only: by day the zone halls (and their icons) stay exactly as they were; after dark
// each hall shrinks away and its annex grows in, with the rest of the night city.
//
// Where each annex stands comes from island.html (ANNEX_LAYOUT): the zone's original spot, nudged
// outward or around the island only as far as needed to clear the main building (day and night),
// the arcade rides and the ring road. One tools annex overlaps the night factory's apron and
// stands on a plinth at the apron's height.
const PREFIX = { about: '01-about', work: '02-work', tools: '03-tools', lab: '04-lab', games: '05-games' };
const PLINTH_H = .21;

export async function createAnnexes({ spots, scale, pick, animate = true, base = new URL('./annexes/', import.meta.url).href }) {
  const loader = new GLTFLoader();
  const plan = spots.filter(s => s.place && PREFIX[s.key]).map(s => ({ ...s, file: `${PREFIX[s.key]}-annex-${s.place[0]}` }));
  const loaded = {};
  await Promise.all([...new Set(plan.map(s => s.file))].map(f =>
    loader.loadAsync(base + f + '.glb').then(g => { loaded[f] = g; }).catch(e => console.warn('annex unavailable', f, e))));

  const lit = new Set(), mixers = [], placed = [], swaps = [];
  const plinthMat = new THREE.MeshStandardMaterial({ color: 0x9aa1a4, roughness: .92 });
  for (const s of plan) {
    const g = loaded[s.file]; if (!g) continue;            // keep the original hall if a file failed
    const [, x, z, yaw, x0, x1, z0, z1, plinth] = s.place;
    const root = g.scene.clone(true);
    root.name = 'annex / ' + s.file; root.scale.setScalar(scale);
    root.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = o.receiveShadow = true;
      // own material per annex so night glow can be driven without touching the GLB cache
      const m = o.material = o.material.clone();
      // the island has no environment map (the asset preview does), so metal reads as black here: keep it matte
      m.metalness = Math.min(m.metalness, .04);
      if (m.emissive && (m.emissiveMap || m.emissive.getHex() !== 0)) { m.userData.glow = m.emissiveIntensity || 1; m.emissiveIntensity = 0; lit.add(m); }
    });
    // the annex stands on its own spot next to the hall; update() swaps the two with the night
    const hall = s.parent, L = new THREE.Group(); L.name = 'night annex / ' + s.key + ' ' + s.zone;
    L.position.set(x, hall.position.y, z); L.rotation.y = yaw; L.visible = false; hall.parent.add(L);
    if (plinth) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + .3, PLINTH_H, z1 - z0 + .3), plinthMat);
      p.position.set((x0 + x1) / 2, PLINTH_H / 2, (z0 + z1) / 2); p.receiveShadow = p.castShadow = true; p.name = 'annex plinth'; L.add(p); pick(p, s);
      root.position.y = PLINTH_H;
    }
    L.add(root);
    root.traverse(o => { if (o.isMesh) pick(o, s); });
    const anim = g.animations.find(a => a.name === 'AnnexGearDrive');
    if (anim) { const mixer = new THREE.AnimationMixer(root); mixer.clipAction(anim).play(); mixers.push(mixer); mixer.update(0); }
    swaps.push({ hall, annex: L });
    placed.push({ key: s.key, zone: s.zone, root, x, z, radius: Math.hypot(Math.max(-x0, x1), Math.max(-z0, z1)) });
  }

  let last = -1;
  return {
    placed,
    // night: windows and trims glow with the rest of the city
    update(n) {
      if (Math.abs(n - last) < .003) return; last = n;
      const mix = THREE.MathUtils.smoothstep(n, .05, .92);
      for (const { hall, annex } of swaps) { annex.visible = n > .08; annex.scale.y = Math.max(.001, mix); hall.visible = mix < .98; hall.scale.y = Math.max(.001, 1 - mix); }
      lit.forEach(m => m.emissiveIntensity = m.userData.glow * n * 1.2);
    },
    // gears turn on desktop only; phones and reduced motion keep them still
    tick(dt) { if (animate) for (const m of mixers) m.update(dt); }
  };
}
