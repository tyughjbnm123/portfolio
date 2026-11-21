// 3D web companion (小精靈): the KKS character exported as VRM 1.0, with motions baked to VRM Animation (.vrma).
// The island loads this module after the scene is up; until it is ready (or if it fails) the drawn companion stays.
// Motions: idle 等待 / welcome 輕揮手 / drag DGK Drag / dance 舞04 / yawn 伸懶腰 / bye 飛吻 / walk walk_fwd / run runNew_fwd / jump Jump / sit KA_Sit_LookingAround / cheer Chair_Pose (rides).
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

const DIR = new URL('./3d/', import.meta.url);
const FILES = { idle: 'idle_waiting', welcome: 'welcome_wave', drag: 'drag_dgk', dance: 'dance_04', yawn: 'yawn_stretch', bye: 'bye_kiss', walk: 'walk_fwd', run: 'run_new', jump: 'jump', sit: 'sit_lookaround', cheer: 'chair_pose' };
const EXPR = { idle: null, welcome: 'happy', drag: 'surprised', dance: 'happy', yawn: 'aa', bye: 'relaxed', walk: null, run: null, jump: null, sit: 'relaxed', cheer: 'happy' };
const LOOP = { idle: 1, drag: 1, walk: 1, run: 1, sit: 1, cheer: 1 };
// walk/run clips are in place; these are the ground speeds (in her own body heights per second) their steps match
const STEP = { walk: .78, run: 2.3 };
const NO_BLINK = { happy: 1, surprised: 1, aa: 1 };
// the .vrma tracks use Unity humanoid names; VRM 1.0 adds a thumb metacarpal, so the thumb shifts by one
const THUMB = { LeftThumbProximal: 'leftThumbMetacarpal', LeftThumbIntermediate: 'leftThumbProximal', LeftThumbDistal: 'leftThumbDistal',
  RightThumbProximal: 'rightThumbMetacarpal', RightThumbIntermediate: 'rightThumbProximal', RightThumbDistal: 'rightThumbDistal' };
const vrmBone = n => THUMB[n] || n.charAt(0).toLowerCase() + n.slice(1);

export async function createFairy3D({ parent, feetY = 0, height = 5, onProgress } = {}) {
  const loader = new GLTFLoader(); loader.register(p => new VRMLoaderPlugin(p));
  const gltf = await loader.loadAsync(new URL('fairy.vrm', DIR).href, onProgress);
  const vrm = gltf.userData.vrm;
  VRMUtils.combineSkeletons(gltf.scene);
  vrm.scene.traverse(o => { if (o.isMesh) { o.frustumCulled = false; o.castShadow = true; } });
  // a few hair vertices carry zero-length normals; normalising them gives NaN in the shader, and at night the bloom
  // pass smears that NaN into a flickering black box around her. Point them outward from the mesh centre instead.
  vrm.scene.traverse(o => {
    const g = o.isMesh && o.geometry, n = g && g.attributes.normal, p = g && g.attributes.position; if (!n || !p) return;
    if (!g.boundingBox) g.computeBoundingBox(); const c = g.boundingBox.getCenter(new THREE.Vector3()), v = new THREE.Vector3(); let fixed = 0;
    for (let i = 0; i < n.count; i++) {
      const x = n.getX(i), y = n.getY(i), z = n.getZ(i);
      if (isFinite(x + y + z) && x * x + y * y + z * z > 1e-10) continue;
      v.set(p.getX(i), p.getY(i), p.getZ(i)).sub(c); if (v.lengthSq() < 1e-10) v.set(0, 1, 0); v.normalize(); n.setXYZ(i, v.x, v.y, v.z); fixed++;
    }
    if (fixed) n.needsUpdate = true;
  });

  // size: bind pose (T pose) height from feet to the top of the hair -> scene units
  vrm.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(vrm.scene), k = height / Math.max(.1, box.max.y);
  const root = new THREE.Group(); root.name = 'fairy3d'; root.position.set(0, feetY, 0); root.scale.setScalar(k);
  root.add(vrm.scene); parent.add(root); root.updateMatrixWorld(true);

  // three-vrm runs the springs in world units: bone lengths grow with the model, but stiffness, gravity and radii
  // do not, so scale those too or the hair turns soft and floats when she is drawn this large
  const sb = vrm.springBoneManager;
  let ws = 1;
  function scaleSprings() {
    const w = root.getWorldScale(new THREE.Vector3()).x, r = w / ws; ws = w; if (!sb || Math.abs(r - 1) < 1e-6) return;
    for (const j of sb.joints) { j.settings.stiffness *= r; j.settings.gravityPower *= r; j.settings.hitRadius *= r; }
    for (const c of sb.colliders) if (c.shape && typeof c.shape.radius === 'number') c.shape.radius *= r;
  }
  scaleSprings();
  const bodyH = Math.max(.1, box.max.y);   // her height in model units
  // move her under another parent at another height (e.g. walking among the island's people); springs follow
  function place(newParent, h, pos) {
    newParent.add(root); root.scale.setScalar(h / bodyH); if (pos) root.position.copy(pos);
    root.updateMatrixWorld(true); scaleSprings(); vrm.update(0); if (sb) { sb.setInitState(); sb.reset(); }
  }

  // night: the island goes dark blue; her own textures glow a little so her face stays readable (no extra scene light)
  const glow = [];
  vrm.scene.traverse(o => { if (!o.isMesh) return; for (const m of [].concat(o.material)) if (m && m.map && m.emissive && !m.emissiveMap && !glow.includes(m)) { m.emissiveMap = m.map; m.emissive.setRGB(0, 0, 0); m.needsUpdate = true; glow.push(m); } });
  let glowN = -1;
  const setNight = n => { n = Math.round(n * 50) / 50; if (n === glowN) return; glowN = n; for (const m of glow) m.emissive.setScalar(.3 * n); };
  setNight(0);

  const em = vrm.expressionManager, mixer = new THREE.AnimationMixer(vrm.scene), clips = {}, anim = new GLTFLoader();
  function clip(kind) {
    return clips[kind] ||= anim.loadAsync(new URL(FILES[kind] + '.vrma', DIR).href).then(g => {
      const src = g.animations[0], tracks = [];
      for (const t of src.tracks) {
        const dot = t.name.lastIndexOf('.'), bone = vrmBone(t.name.slice(0, dot)), prop = t.name.slice(dot + 1);
        const node = vrm.humanoid.getNormalizedBoneNode(bone);
        if (!node || (prop === 'position' && bone !== 'hips')) continue;
        const T = prop === 'quaternion' ? THREE.QuaternionKeyframeTrack : THREE.VectorKeyframeTrack;
        tracks.push(new T(node.name + '.' + prop, t.times, t.values));
      }
      return new THREE.AnimationClip(FILES[kind], src.duration, tracks);
    }).catch(e => { delete clips[kind]; throw e; });
  }

  // expressions fade instead of snapping
  const exprW = {}; let exprTarget = null;
  for (const e of em.expressions) exprW[e.expressionName] = 0;
  let blinkT = 2 + Math.random() * 3, blinkK = 0;

  let cur = null, curKind = null, token = 0;
  async function play(kind) {
    const my = ++token, c = await clip(kind); if (my !== token) return c.duration;
    const loop = !!LOOP[kind], a = mixer.clipAction(c);
    a.reset(); a.enabled = true; a.setEffectiveTimeScale(1); a.setEffectiveWeight(1);
    a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); a.clampWhenFinished = !loop;
    if (cur && cur !== a) a.crossFadeFrom(cur, .35, false);
    a.play(); cur = a; curKind = kind; exprTarget = EXPR[kind];
    return c.duration;
  }
  mixer.addEventListener('finished', e => { if (e.action === cur && !LOOP[curKind]) { want = null; play('idle'); } });

  // walking under control: speed in parent units per second picks idle / walk / run and sets the step rate
  let want = null;
  function locomote(speed) {
    if (curKind === 'jump') return;   // the jump plays out, then walking picks up again
    const h = bodyH * root.scale.x, v = Math.abs(speed) / h;
    const kind = v < .12 ? 'idle' : v < 1.35 ? 'walk' : 'run';
    if (kind !== want) { want = kind; if (curKind !== kind) play(kind); }
    if (cur && (curKind === 'walk' || curKind === 'run')) cur.timeScale = Math.min(1.6, Math.max(.55, v / STEP[curKind])) * Math.sign(speed || 1);
  }
  const stopLocomote = () => { want = null; if (cur) cur.timeScale = 1; };
  const jump = () => { if (curKind !== 'jump' && !fall) { want = 'jump'; play('jump'); } };

  // drag: lifted by the pointer, then dropped back onto the islet; the fall runs on the wall clock so a slow
  // frame rate can't leave her hanging in the air
  let fall = null;
  const drop = () => { fall = { t0: performance.now(), y0: root.position.y }; };

  // lip sync: her voice is fed through an analyser; loudness opens the mouth, the vowel shape changes every few
  // frames. 'happy' blocks the mouth shapes, so while she talks a non-blocking smile stands in for it.
  const VIS = ['aa', 'ih', 'ou', 'ee', 'oh'], VIS_PICK = ['aa', 'aa', 'oh', 'ih', 'ee', 'aa', 'ou'];
  const visW = {}; for (const v of VIS) visW[v] = 0;
  let an = null, abuf = null, speakUntil = 0, mouth = 0, vis = 'aa', visT = 0;
  function listen(node, seconds) {
    if (!node) { speakUntil = 0; return; }
    const ac = node.context;
    if (!an || an.context !== ac) { an = ac.createAnalyser(); an.fftSize = 1024; abuf = new Float32Array(an.fftSize); }
    node.connect(an); speakUntil = ac.currentTime + (seconds || 0);
  }
  const talking = () => !!an && an.context.currentTime < speakUntil;

  const _cam = new THREE.Vector3();
  let yaw = 0;
  function update(dt, camera, night = 0) {
    setNight(night);
    if (fall) {
      const t = (performance.now() - fall.t0) / 1000; root.position.y = Math.max(feetY, fall.y0 - 15 * t * t);
      if (root.position.y <= feetY) { fall = null; play('idle'); }
    }
    // under control she faces where she walks; otherwise she turns to the camera, only around the vertical axis
    if (api.heading != null) { yaw = api.heading; root.rotation.y = yaw; }
    else if (camera) {
      camera.getWorldPosition(_cam); root.parent.worldToLocal(_cam);
      const want = Math.atan2(_cam.x - root.position.x, _cam.z - root.position.z);
      let d = want - yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); yaw += d * (1 - Math.exp(-dt * 4)); root.rotation.y = yaw;
    }
    const talk = talking();
    let level = 0;
    if (talk) {
      an.getFloatTimeDomainData(abuf); let s = 0; for (let i = 0; i < abuf.length; i++) s += abuf[i] * abuf[i];
      level = Math.min(1, Math.max(0, (Math.sqrt(s / abuf.length) - .012) * 9));
    }
    mouth += (level - mouth) * (1 - Math.exp(-dt * (level > mouth ? 30 : 14)));
    visT -= dt; if (visT <= 0) { visT = .09 + Math.random() * .08; if (mouth > .15) vis = VIS_PICK[Math.random() * VIS_PICK.length | 0]; }
    for (const v of VIS) visW[v] += ((v === vis ? mouth * (v === 'aa' ? .8 : .9) : 0) - visW[v]) * (1 - Math.exp(-dt * 18));
    const want = talk && exprTarget === 'happy' ? 'relaxed' : exprTarget;
    for (const n in exprW) { const goal = n === want ? 1 : 0; exprW[n] += (goal - exprW[n]) * (1 - Math.exp(-dt * 10)); em.setValue(n, n in visW ? Math.min(1, exprW[n] + visW[n]) : exprW[n]); }
    if (!NO_BLINK[want]) {
      blinkT -= dt; if (blinkT < 0) { blinkK = .16; blinkT = 2.5 + Math.random() * 3.5; }
      if (blinkK > 0) { blinkK -= dt; em.setValue('blink', Math.sin(Math.max(0, blinkK) / .16 * Math.PI)); }
    }
    mixer.update(dt);
    vrm.update(dt);
  }

  vrm.update(0); if (sb) { sb.setInitState(); sb.reset(); }
  const api = {
    root, vrm, scale: k, heading: null,
    play, update, drop, listen, place, locomote, stopLocomote, jump, bodyH,
    preload: kind => clip(kind).catch(() => null),
    get kind() { return curKind; },
    get falling() { return !!fall; },
  };
  return api;
}
