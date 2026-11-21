// 3D web companion (小精靈): the KKS character exported as VRM 1.0, with motions baked to VRM Animation (.vrma).
// The island loads this module after the scene is up; until it is ready (or if it fails) the drawn companion stays.
// Motions: idle 等待 / welcome 輕揮手 / drag DGK Drag / dance 舞04 / yawn 伸懶腰 / bye 飛吻.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';

const DIR = new URL('./3d/', import.meta.url);
const FILES = { idle: 'idle_waiting', welcome: 'welcome_wave', drag: 'drag_dgk', dance: 'dance_04', yawn: 'yawn_stretch', bye: 'bye_kiss' };
const EXPR = { idle: null, welcome: 'happy', drag: 'surprised', dance: 'happy', yawn: 'aa', bye: 'relaxed' };
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

  // size: bind pose (T pose) height from feet to the top of the hair -> scene units
  vrm.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(vrm.scene), k = height / Math.max(.1, box.max.y);
  const root = new THREE.Group(); root.name = 'fairy3d'; root.position.set(0, feetY, 0); root.scale.setScalar(k);
  root.add(vrm.scene); parent.add(root); root.updateMatrixWorld(true);

  // three-vrm runs the springs in world units: bone lengths grow with the model, but stiffness, gravity and radii
  // do not, so scale those too or the hair turns soft and floats when she is drawn this large
  const ws = root.getWorldScale(new THREE.Vector3()).x, sb = vrm.springBoneManager;
  if (sb) {
    for (const j of sb.joints) { j.settings.stiffness *= ws; j.settings.gravityPower *= ws; j.settings.hitRadius *= ws; }
    for (const c of sb.colliders) if (c.shape && typeof c.shape.radius === 'number') c.shape.radius *= ws;
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
    const loop = kind === 'idle' || kind === 'drag', a = mixer.clipAction(c);
    a.reset(); a.enabled = true; a.setEffectiveTimeScale(1); a.setEffectiveWeight(1);
    a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity); a.clampWhenFinished = !loop;
    if (cur && cur !== a) a.crossFadeFrom(cur, .35, false);
    a.play(); cur = a; curKind = kind; exprTarget = EXPR[kind];
    return c.duration;
  }
  mixer.addEventListener('finished', e => { if (e.action === cur && curKind !== 'idle' && curKind !== 'drag') play('idle'); });

  // drag: lifted by the pointer, then dropped back onto the islet
  let fall = null;
  const drop = () => { fall = { v: 0 }; };

  const _cam = new THREE.Vector3();
  let yaw = 0;
  function update(dt, camera, night = 0) {
    setNight(night);
    if (fall) {
      fall.v += 30 * dt; root.position.y = Math.max(feetY, root.position.y - fall.v * dt);
      if (root.position.y <= feetY) { fall = null; play('idle'); }
    }
    // turn to the camera, only around the vertical axis
    if (camera) {
      camera.getWorldPosition(_cam); root.parent.worldToLocal(_cam);
      const want = Math.atan2(_cam.x - root.position.x, _cam.z - root.position.z);
      let d = want - yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); yaw += d * (1 - Math.exp(-dt * 4)); root.rotation.y = yaw;
    }
    for (const n in exprW) { const goal = n === exprTarget ? 1 : 0; exprW[n] += (goal - exprW[n]) * (1 - Math.exp(-dt * 10)); em.setValue(n, exprW[n]); }
    if (!NO_BLINK[exprTarget]) {
      blinkT -= dt; if (blinkT < 0) { blinkK = .16; blinkT = 2.5 + Math.random() * 3.5; }
      if (blinkK > 0) { blinkK -= dt; em.setValue('blink', Math.sin(Math.max(0, blinkK) / .16 * Math.PI)); }
    }
    mixer.update(dt);
    vrm.update(dt);
  }

  vrm.update(0); if (sb) { sb.setInitState(); sb.reset(); }
  return {
    root, vrm, scale: k,
    play, update, drop,
    preload: kind => clip(kind).catch(() => null),
    get kind() { return curKind; },
    get falling() { return !!fall; },
  };
}
