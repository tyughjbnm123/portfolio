import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Original procedural scenery: batched by material, without additional point lights.
// Above-ground props stay inside the existing central building collision footprint.
export function createHarborCity({ islands, bridges, pick }) {
  const roots = [], surfaces = [], emissions = [], signs = [];
  const steel = new THREE.MeshStandardMaterial({ color: 0x304650, roughness: .64, metalness: .62 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x15222b, roughness: .73, metalness: .4 });
  const worn = new THREE.MeshStandardMaterial({ color: 0x748080, roughness: .88, metalness: .28 });
  const rust = new THREE.MeshStandardMaterial({ color: 0x79523b, roughness: .95, metalness: .2 });
  const amber = glow(0xe5b76c, .8), cyan = glow(0x62cbd4, .7), red = glow(0xd96a63, .55);
  const glass = new THREE.MeshStandardMaterial({ color: 0x25515b, roughness: .16, metalness: .78 });
  const palettes = { about: 0xe7a97c, work: 0x73cbd4, tools: 0xd9b86c, lab: 0x7ac4ad, games: 0xcd81a1 };
  const names = { about: '01 / ARCHIVE', work: '02 / WORK DISTRICT', tools: '03 / FABRICATION', lab: '04 / LABORATORY', games: '05 / ARCADE' };
  function glow(color, power) {
    const m = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0, roughness: .48 });
    emissions.push({ m, power }); return m;
  }
  function repaint(mesh, color, roughness = .7, metalness = .5) {
    if (!mesh?.isMesh || Array.isArray(mesh.material)) return;
    const m = mesh.material.clone(); mesh.material = m;
    surfaces.push({ m, day: m.color.clone(), night: new THREE.Color(color), rough: m.roughness, metal: m.metalness, roughness, metalness });
  }
  function batch(parent, key) {
    const items = new Map();
    function add(geometry, material, position, rotation) {
      const o = new THREE.Object3D(); o.position.set(...position);
      if (rotation) o.rotation.set(...rotation); o.updateMatrix(); geometry.applyMatrix4(o.matrix);
      if (!items.has(material)) items.set(material, []); items.get(material).push(geometry);
    }
    return {
      box(w, h, d, x, y, z, m = steel, ry = 0) { add(new THREE.BoxGeometry(w, h, d), m, [x, y + h / 2, z], [0, ry, 0]); },
      beam(a, b, width, height, material = steel) {
        const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
        const geometry = new THREE.BoxGeometry(width, height, delta.length());
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), delta.normalize());
        geometry.applyMatrix4(new THREE.Matrix4().compose(start.add(end).multiplyScalar(.5), q, new THREE.Vector3(1, 1, 1)));
        if (!items.has(material)) items.set(material, []); items.get(material).push(geometry);
      },
      tube(a, b, radius, m = steel) {
        const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
        const geo = new THREE.CylinderGeometry(radius, radius, delta.length(), 6);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
        geo.applyMatrix4(new THREE.Matrix4().compose(start.add(end).multiplyScalar(.5), q, new THREE.Vector3(1, 1, 1)));
        if (!items.has(m)) items.set(m, []); items.get(m).push(geo);
      },
      cable(points, radius = .035) {
        add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 16, radius, 5, false), dark, [0, 0, 0]);
      },
      finish() {
        for (const [material, geos] of items) {
          const geometry = mergeGeometries(geos, false); geos.forEach(g => g.dispose());
          if (!geometry) throw new Error('Harbor geometry could not be merged');
          const mesh = new THREE.Mesh(geometry, material); mesh.receiveShadow = true;
          mesh.name = 'harbor details'; parent.add(mesh); if (key) pick(mesh, key);
        }
      }
    };
  }
  function label(parent, text, sub, w, h, x, y, z, color = '#9ed1cf', angle = 0, vertical = false) {
    const c = document.createElement('canvas'); c.width = vertical ? 128 : 512; c.height = vertical ? 512 : 128;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#14232b'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = color; ctx.fillRect(0, 0, 6, c.height); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '700 54px "Microsoft JhengHei","PingFang TC",sans-serif';
    if (vertical) [...text].forEach((s, i) => ctx.fillText(s, 66, 65 + i * 94));
    else { ctx.fillText(text, 256, 49, 470); ctx.font = '21px monospace'; ctx.fillText(sub, 256, 99, 465); }
    const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: 0xffffff, emissiveIntensity: 0, roughness: .6, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); mesh.position.set(x, y, z); mesh.rotation.y = angle;
    parent.add(mesh); signs.push(m); return mesh;
  }
  function nightRoot(parent, name) { const g = new THREE.Group(); g.name = name; g.visible = false; parent.add(g); roots.push(g); return g; }

  for (const [key, island] of Object.entries(islands)) {
    const parent = island.g, root = nightRoot(parent, key + ' harbor infrastructure'), B = batch(root, key);
    const accent = glow(palettes[key], .8);
    [0x23343d, 0x3b4d55, 0x3e5154, 0x46595f].forEach((color, i) => repaint(parent.children[i], color, i === 2 ? .42 : .78, i === 2 ? .48 : .35));
    // Sheet-pile seawall, bracing and service conduits, all below the road surface.
    for (let s = 0; s < 6; s++) {
      const a = (s + .5) * Math.PI / 3, nx = Math.sin(a), nz = Math.cos(a), tx = Math.cos(a), tz = -Math.sin(a);
      const at = (along, radius, y) => [nx * radius + tx * along, y, nz * radius + tz * along];
      B.box(20.8, 1.58, .18, nx * 18.55, .22, nz * 18.55, steel, a);
      B.box(20.95, .12, .3, nx * 18.55, 1.83, nz * 18.55, worn, a);
      B.tube(at(-10.2, 18.79, .46), at(10.2, 18.79, .46), .1, rust);
      B.tube(at(-10.2, 18.77, .71), at(10.2, 18.77, .71), .065, dark);
      for (let j = -9; j <= 9; j += 3) {
        B.box(.15, 1.65, .24, nx * 18.71 + tx * j, .18, nz * 18.71 + tz * j, worn, a);
        B.box(.53, 2.7, .5, nx * 18.8 + tx * j, -2.5, nz * 18.8 + tz * j, dark, a);
      }
      B.box(2.1, .08, .05, nx * 18.84, 1.35, nz * 18.84, accent, a);
      for (const u of [-7.2, 7.2]) for (let j = 0; j < 4; j++) B.box(.15, .42, .035, nx * 18.86 + tx * (u + j * .23), 1.02, nz * 18.86 + tz * (u + j * .23), j % 2 ? dark : amber, a);
    }
    // Drain grilles sit flush, never obstructing the driving ring.
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, x = Math.sin(a) * 7.2, z = Math.cos(a) * 7.2;
      B.box(1.4, .018, .32, x, 2.015, z, dark, a);
      for (let q = 0; q < 5; q++) B.box(.06, .024, .3, x + Math.cos(a) * (q - 2) * .25, 2.02, z - Math.sin(a) * (q - 2) * .25, worn, a);
    }
    B.finish();
  }
  for (const { group, length } of bridges) {
    group.userData.harborStructure.forEach(o => repaint(o, 0x40535a, .62, .6));
    const root = nightRoot(group, 'steel service bridge'), B = batch(root);
    for (const s of [-1, 1]) {
      B.box(.17, .18, length, s * 1.82, 1.58, 0, steel);
      B.tube([s * 1.92, 1.28, -length / 2], [s * 1.92, 1.28, length / 2], .09, rust);
      for (let z = -length / 2 + .6; z < length / 2 - 1.6; z += 2.2) B.tube([s * 1.73, 2.15, z], [s * 1.73, 3.07, z + 1.9], .035, worn);
    }
    for (let z = -length / 2 + 1; z < length / 2; z += 2.2) B.box(3.2, .015, .045, 0, 2.005, z, worn);
    B.finish();
  }

  // Lived-in work district. All shop equipment is inside the original central collision radius.
  const street = nightRoot(islands.work.g, 'work harbor street'); street.position.y = 2;
  const B = batch(street, 'work');
  function ac(x, y, z) {
    B.box(.7, .48, .36, x, y, z, worn); B.box(.5, .32, .04, x, y + .08, z + .2, dark);
    for (let k = 0; k < 5; k++) B.box(.47, .025, .035, x, y + .09 + k * .06, z + .23, steel);
    B.tube([x + .3, y, z], [x + .3, y - 1, z], .035, rust);
  }
  ac(-3.32, 4.4, 3.7); ac(-1.3, 8.7, -.02); ac(-3.75, 10.2, -.02); ac(3.4, 3.9, 3.2);
  B.box(1.6, 1.72, .08, -.4, .15, 4.5, steel);
  for (let j = 0; j < 13; j++) B.box(1.58, .035, .04, -.4, .2 + j * .12, 4.56, worn);
  B.box(1.95, .13, .9, -.4, 2.1, 4.5, dark); B.box(1.9, .05, .045, -.4, 2.08, 4.95, amber);
  B.box(1.6, .78, .6, -2.7, .1, 4.45, rust); B.box(1.8, .1, .75, -2.7, .87, 4.45, worn);
  B.box(1.9, .12, 1, -2.7, 2.13, 4.45, steel); B.box(1.85, .06, .04, -2.7, 2.12, 4.98, amber);
  for (const x of [-3.53, -1.87]) B.tube([x, .1, 4.65], [x, 2.15, 4.65], .045, worn);
  for (const x of [-3.2, -2.8, -2.4]) { B.box(.2, .17, .2, x, .97, 4.45, dark); B.box(.21, .03, .21, x, 1.14, 4.45, amber); }
  B.box(.6, 1.25, .22, 3.92, .2, 2.9, dark); B.box(.42, .42, .04, 3.92, .83, 3.03, glass);
  B.box(.34, .08, .05, 3.92, .48, 3.04, cyan);
  for (const x of [-4, -3.82]) B.tube([x, .2, .1], [x, 11.8, .1], .045, rust);
  B.cable([[-3.7, 5.4, 2.8], [-.4, 4.45, 3.7], [3.6, 5.1, 2.8]]);
  B.cable([[-3.7, 5.55, 2.65], [-.4, 4.55, 3.55], [3.6, 5.25, 2.65]]);
  B.cable([[-2.2, 12.5, -.1], [.4, 9.3, .6], [2.9, 7.5, -.9]], .045);
  for (let i = 0; i < 7; i++) { const x = -2.5 + i * .8; B.box(.08, .13, .08, x, 4.53 + .045 * x * x, 3.55, i % 3 ? amber : red); }
  B.box(.12, 4.8, .16, -3.95, 6.2, -.1, dark);
  B.box(1.6, .45, 1.25, -2.25, 20.45, -1.65, steel);
  for (let k = 0; k < 5; k++) B.box(1.45, .035, .04, -2.25, 20.5 + k * .07, -.99, dark);
  // Glossy paving accents, not simulated screen-space reflections.
  B.box(1.15, .014, .45, -2.6, .14, 5.1, glass, -.14); B.box(.36, .014, 1.35, 1.1, .14, 3.3, glass, .2);

  // Two connected pedestrian levels wrap around the buildings, leaving the ground road clear.
  // Heights are relative to the island ground (world y = 2). These are scenery, not drivable lanes.
  function skyway(points, width, light) {
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1], dx = b[0] - a[0], dz = b[2] - a[2], length = Math.hypot(dx, dz);
      if (length < .01) continue;
      const nx = dz / length, nz = -dx / length;
      B.beam([a[0], a[1] - .13, a[2]], [b[0], b[1] - .13, b[2]], width, .26, steel);
      for (const side of [-1, 1]) {
        const edge = p => [p[0] + nx * width * .47 * side, p[1], p[2] + nz * width * .47 * side];
        const aa = edge(a), bb = edge(b);
        B.tube([aa[0], aa[1] + .92, aa[2]], [bb[0], bb[1] + .92, bb[2]], .042, worn);
        B.tube([aa[0], aa[1] + .16, aa[2]], [bb[0], bb[1] + .16, bb[2]], .035, light);
        B.tube([aa[0], aa[1] + .5, aa[2]], [bb[0], bb[1] + .5, bb[2]], .018, steel);
        const count = Math.ceil(length / 1.05);
        for (let k = 0; k <= count; k++) {
          const t = k / count, p = aa.map((v, j) => v + (bb[j] - v) * t);
          B.tube(p, [p[0], p[1] + .94, p[2]], .032, worn);
        }
      }
    }
    for (const p of points.slice(0, -1)) B.box(width * 1.08, .26, width * 1.08, p[0], p[1] - .26, p[2], steel);
  }
  const lower = [[-5.6,6.4,-3.4],[-4.1,6.4,-4.9],[4.1,6.4,-4.9],[5.6,6.4,-3.4],[5.6,6.4,3.6],[4.1,6.4,5.1],[-4.1,6.4,5.1],[-5.6,6.4,3.6],[-5.6,6.4,-3.4]];
  const upper = [[-5,10.5,2.2],[-5,10.5,-3.4],[-3.5,10.5,-4.9],[3.7,10.5,-4.9],[5.2,10.5,-3.4],[5.2,10.5,-2.3]];
  skyway(lower, 1.12, cyan);
  skyway(upper, 1.02, amber);
  // Short connectors meet the tower facade and a rooftop landing.
  skyway([[-5,10.5,-1.65],[-3.8,10.5,-1.65]], .96, amber);
  skyway([[2,6.4,-4.9],[2,6.4,-3.9]], 1.05, cyan);
  skyway([[-3.25,6.4,5.1],[-3.25,6.4,3.5]], 1.05, cyan);
  // A real sequence of treads connects the two levels, with rails following its slope.
  const stairA = [5.2,10.5,-2.3], stairB = [5.6,6.4,3.6], steps = 25;
  skyway([stairA, stairB], 1.02, amber);
  const stairAngle = Math.atan2(stairB[0] - stairA[0], stairB[2] - stairA[2]);
  const run = Math.hypot(stairB[0] - stairA[0], stairB[2] - stairA[2]);
  for (let k = 0; k < steps; k++) {
    const t = (k + .5) / steps, x = stairA[0] + (stairB[0] - stairA[0]) * t, z = stairA[2] + (stairB[2] - stairA[2]) * t;
    const y = stairA[1] + (stairB[1] - stairA[1]) * k / steps;
    B.box(.96, .09, run / steps + .035, x, y - .08, z, worn, stairAngle);
  }
  // Supports are inside the established building collision disk, never in the ring road.
  for (const [x,z] of [[-4.2,-3.4],[4.2,-3.4],[-4.2,3.5],[4.2,3.5]]) {
    B.box(.16, 6.4, .16, x, 0, z, steel);
    B.tube([x,4.7,z], [Math.sign(x)*5.6,6.17,z], .065, worn);
  }
  B.tube([-3.8,8.8,-1.65],[-5,10.25,-1.65],.065,worn);
  B.tube([3.3,8.9,-3.4],[5.2,10.25,-3.4],.065,worn);
  // Widened corners read as overlooks, while the bridge decks remain visually light.
  B.box(1.6,.25,1.4,-4.1,6.15,5.1,steel);
  B.box(1.5,.25,1.4,3.7,10.25,-4.9,steel);
  B.finish();
  let last = -1;
  return { roots, update(n) {
    if (Math.abs(n - last) < .001) return; last = n;
    const mix = THREE.MathUtils.smoothstep(n, .05, .92);
    for (const r of roots) { r.visible = n > .12; r.scale.y = Math.max(.001, mix); }
    for (const s of surfaces) { s.m.color.copy(s.day).lerp(s.night, mix); s.m.roughness = THREE.MathUtils.lerp(s.rough, s.roughness, mix); s.m.metalness = THREE.MathUtils.lerp(s.metal, s.metalness, mix); }
    emissions.forEach(({ m, power }) => m.emissiveIntensity = n * power); signs.forEach(m => m.emissiveIntensity = n * .65);
  } };
}
