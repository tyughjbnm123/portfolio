// The web page's floating companion drawn in 3D: a small transparent three.js stage holding the same VRM model
// as the island (fairy3d.js). companion-player-3d.js mounts it inside the widget's sprite box.
import * as THREE from 'three';
import { createFairy3D } from './fairy3d.js?v=20261124-1';

export async function mountFairy(el) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none';

  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb9b3c9, 1.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.9); sun.position.set(1.2, 2.6, 3); scene.add(sun);

  // full body, a little head room for raised arms and the drag pose
  const camera = new THREE.PerspectiveCamera(24, 1, .1, 30);
  camera.position.set(0, .92, 4.4); camera.lookAt(0, .86, 0);

  const fairy = await createFairy3D({ parent: scene, feetY: 0, height: 1.6 });
  el.replaceChildren(canvas);

  const size = () => { const w = el.clientWidth || 1, h = el.clientHeight || 1; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  const ro = new ResizeObserver(size); ro.observe(el); size();

  let last = performance.now(), raf = 0, alive = true;
  const frame = now => {
    if (!alive) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    if (document.hidden || !el.isConnected || !el.getClientRects().length) return;   // closed or off screen: skip drawing
    fairy.update(dt, camera, 0);
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  return { fairy, dispose() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); } };
}
