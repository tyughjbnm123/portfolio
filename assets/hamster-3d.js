// 倉鼠跑滾輪的 3D 倉鼠與滾輪（Meshy 生成的模型）。
// hamster.js 仍然畫背景、特效和 HUD；這裡只負責把 3D 滾輪和倉鼠畫進一張透明的 WebGL 畫布，
// 由 hamster.js 每一幀呼叫 render() 後貼進 2D 畫布。載入失敗時 ready 保持 false，遊戲自動退回 2D 畫法。
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const api = window.HamsterThree = { ready: false, canvas: null, render: () => null };

const WHEEL_R = 0.933;        // outer rim radius of wheel.glb, in model units
const WHEEL_INNER = 0.86;     // where the hamster's feet touch the inside of the rim
const HAMSTER_H = 0.85;    // hamster nose-to-tail length, as a fraction of the wheel radius

async function init() {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xfff4e2, 0xd9b27e, 0.9));
  const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(-2, 3, 4); scene.add(sun);

  // orthographic camera in CSS pixels: x right, y down (we place things at -y)
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -5000, 5000);
  camera.position.z = 1000;

  const loader = new GLTFLoader();
  const base = new URL('hamster/', import.meta.url);
  const [wheelGltf, hamsterGltf] = await Promise.all([
    loader.loadAsync(new URL('wheel.glb', base).href),
    loader.loadAsync(new URL('hamster-run.glb', base).href),   // four-legged hamster with a baked trot cycle
  ]);

  // wheel: a group turned a little toward the viewer so the rim shows its depth
  const wheel = new THREE.Group(); scene.add(wheel);
  wheel.add(wheelGltf.scene);
  const spin = wheelGltf.scene.getObjectByName('wheel_spin');
  const stand = wheelGltf.scene.getObjectByName('wheel_stand');
  if (!spin || !stand) throw new Error('wheel.glb is missing wheel_spin / wheel_stand');
  // both parts have their origin on the hub; move the hub to the group's origin
  const hub = spin.position.clone();
  wheelGltf.scene.position.copy(hub).multiplyScalar(-1);
  // spread the A-frame legs front/back (along the wheel axis) so the hamster never runs through them
  stand.scale.z = 1.7;

  // hamster: model faces +Z; turn it to run toward screen-right (+X), with its face a little toward the viewer
  const hamsterPivot = new THREE.Group(); wheel.add(hamsterPivot);   // lives in the wheel's plane, does not spin
  const hamsterBody = new THREE.Group(); hamsterPivot.add(hamsterBody);
  const h = hamsterGltf.scene; hamsterBody.add(h);
  h.rotation.y = Math.PI / 2 - 0.25;
  // feet on the pivot point, longest side (nose to tail) normalised to 1 unit
  h.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(h);
  const size = box.getSize(new THREE.Vector3()), hh = Math.max(size.x, size.y, size.z);
  h.scale.setScalar(1 / hh);
  h.position.set(-(box.min.x + box.max.x) / 2 / hh, -box.min.y / hh, -(box.min.z + box.max.z) / 2 / hh);
  // running clip: one cycle = two steps (left + right). G.phase advances by PI per step,
  // so the clip time follows the player's taps and each foot lands on its button press.
  const mixer = new THREE.AnimationMixer(h);
  const clip = hamsterGltf.animations[0];
  const runAction = clip ? mixer.clipAction(clip) : null;
  if (runAction) runAction.play();

  for (const [root, env] of [[wheelGltf.scene, 0.45], [h, 0.8]]) root.traverse(o => { if (o.isMesh) { o.frustumCulled = false; if (o.material) o.material.envMapIntensity = env; } });

  let lastW = 0, lastH = 0, lastDPR = 0;
  api.canvas = canvas;
  api.render = ({ W, H, DPR, cx, cy, R, G }) => {
    if (W !== lastW || H !== lastH || DPR !== lastDPR) {
      renderer.setPixelRatio(DPR); renderer.setSize(W, H, false);
      camera.left = 0; camera.right = W; camera.top = 0; camera.bottom = -H; camera.updateProjectionMatrix();
      lastW = W; lastH = H; lastDPR = DPR;
    }
    const ws = R / WHEEL_R;
    wheel.position.set(cx, -cy, 0);
    wheel.scale.setScalar(ws);
    wheel.rotation.set(0.06, -0.38, 0);
    spin.rotation.z = -G.wheel;                       // clockwise on screen as the hamster runs right

    // hamster stands on the inside of the rim at the bottom; "climb" lifts it up the back of the wheel
    // (wheel-local units, y up: the bottom of the rim is at -WHEEL_INNER)
    // same convention as the 2D drawing: climb > 0 runs up the front (right), a fall slides back (left)
    const a = -Math.PI / 2 + G.climb;
    hamsterPivot.position.set(Math.cos(a) * WHEEL_INNER, Math.sin(a) * WHEEL_INNER, 0);
    hamsterPivot.rotation.set(0, 0, G.climb + (G.fall > 0 ? G.fall * 0.6 : 0));
    hamsterPivot.scale.setScalar(WHEEL_R * HAMSTER_H);
    if (runAction) {
      const d = clip.duration, t = ((G.phase / (Math.PI * 2)) * d) % d;
      runAction.time = t < 0 ? t + d : t;
      mixer.update(0);
    }
    // a little extra lean when fast, gentle breathing when idle
    hamsterBody.position.y = G.mode === 'run' ? 0 : Math.sin(G.idle * 3) * 0.006;
    hamsterBody.rotation.z = -Math.min(G.v / 12, 1) * 0.08;

    renderer.render(scene, camera);
    return canvas;
  };
  api.ready = true;
  window.dispatchEvent(new Event('hamster3d:ready'));
}

init().catch(err => { console.warn('[hamster] 3D models unavailable, using the 2D drawing.', err); });
