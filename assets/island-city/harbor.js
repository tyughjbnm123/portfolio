import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Harbour sea and lighthouse (after the user's "new harbour" concept), for the island page.
//  · sea: calm and glassy, a deep teal by day and ink-navy at night, mirroring piers, towers and neon with a slight ripple.
//    Desktop gets a real mirror (drawn at most every other frame while the camera is still, little people left out,
//    switched off if the frame rate stays low); phones get the same water with a soft sky tint instead of the mirror.
//  · lighthouse: the hub beacon becomes a slim steel lighthouse with a glass lantern; after dark two soft beams sweep the water.
// Every pow() base in the shaders is kept strictly positive: pow(0.,y) is NaN on Direct3D GPUs (Windows, through ANGLE),
// and one NaN pixel is enough for the night bloom to turn the whole frame black.
export function createHarbor({ scene, camera, renderer, water, hub, beacon, beam, neonObjs, sun, mobile, reduced }) {
  const U = { time: { value: 0 }, n: { value: 0 } };

  /* ---------------- sea ---------------- */
  const shader = {
    name: 'HarbourSea',
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      color: { value: new THREE.Color(0xffffff) }, tDiffuse: { value: null }, textureMatrix: { value: new THREE.Matrix4() },
      uReflect: { value: 1 }, uSun: { value: new THREE.Vector3() }, uEye: { value: new THREE.Vector3() }, uSky: { value: new THREE.Color() },
      time: { value: 0 }, n: { value: 0 },
    }]),
    vertexShader: /* glsl */`
      uniform mat4 textureMatrix; varying vec4 vUvR; varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vUvR=textureMatrix*vec4(position,1.);
        vec4 mvPosition=viewMatrix*w; gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse; uniform float uReflect, time, n; uniform vec3 uSun, uEye, uSky;
      varying vec4 vUvR; varying vec3 vW;
      #include <fog_pars_fragment>
      void main(){
        vec2 p=vW.xz; vec3 V=uEye-vW; V*=inversesqrt(max(dot(V,V),1e-8));
        vec3 base=mix(vec3(.075,.23,.25),vec3(.008,.027,.043),n);
        // slow crossing swells: a gentle normal for the sheen and a slight wobble in the mirror
        float a1=p.x*.43+p.y*.21+time*.62, a2=p.y*.66-p.x*.17-time*.43, a3=p.x*.19-p.y*.51+time*.35;
        vec3 N=normalize(vec3(cos(a1)*.06-cos(a2)*.02, 1., cos(a1)*.03+cos(a2)*.05+cos(a3)*.03));
        vec2 rip=vec2(sin(a1)+sin(a2)*.5, sin(a3))*.0018+N.xz*.01;
        vec3 refl=mix(base*1.25,uSky,.35);                         // no mirror: a soft sky tint
        if(uReflect>.5) refl=texture2DProj(tDiffuse, vUvR+vec4(rip*vUvR.w,0.,0.)).rgb;
        float f=pow(max(1.-abs(V.y),1e-4),2.);
        vec3 col=mix(base,refl,mix(.28,.48,n)+.25*f);
        float r=pow(max(sin(p.x*.9+p.y*.17+time*.8)*sin(p.y*.8-time*.6),1e-4),14.);
        col+=r*mix(vec3(.02,.04,.04),vec3(.004,.012,.016),n);
        vec3 L=uSun*inversesqrt(max(dot(uSun,uSun),1e-8)), H=normalize(L+V);
        col+=mix(vec3(1.,.95,.85),vec3(.55,.75,1.),n)*pow(max(dot(N,H),1e-4),160.)*mix(.5,.2,n);
        col=mix(col,base,(1.-exp(-length(p)*.004))*.4);
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  };
  const geo = new THREE.CircleGeometry(420, 96);
  const mirror = !mobile && !reduced;
  let sea;
  if (mirror) { sea = new Reflector(geo, { shader, textureWidth: 1024, textureHeight: 1024, clipBias: .003 }); sea.material.fog = true; }
  else { sea = new THREE.Mesh(geo, new THREE.ShaderMaterial({ ...shader, uniforms: THREE.UniformsUtils.clone(shader.uniforms), fog: true })); sea.material.uniforms.uReflect.value = 0; }
  const su = sea.material.uniforms; su.time = U.time; su.n = U.n;
  sea.rotation.x = -Math.PI / 2; sea.position.y = .02; sea.name = 'harbour sea';
  scene.add(sea); water.visible = false;

  // the mirror is a second render of the scene: once a frame at most, every other frame while the camera is still
  let frame = 0, mirrorOn = mirror; const lastPos = new THREE.Vector3(1e9, 0, 0), lastQ = new THREE.Quaternion();
  if (mirror) {
    const render = sea.onBeforeRender; let drawn = -1;
    sea.onBeforeRender = function (r, s, c, ...rest) {
      if (!mirrorOn || c !== camera || drawn === frame) return;
      const moved = lastPos.distanceToSquared(c.position) > 1e-4 || lastQ.angleTo(c.quaternion) > 1e-4;
      if (!moved && frame % 2) return;
      drawn = frame; lastPos.copy(c.position); lastQ.copy(c.quaternion); render.call(this, r, s, c, ...rest);
    };
  }
  const fps = { t: 0, n: 0, wait: 3 };
  const SKY_DAY = new THREE.Color(0x9fc6cf), SKY_NIGHT = new THREE.Color(0x0d1830);

  /* ---------------- lighthouse ---------------- */
  const TAU = Math.PI * 2;
  const std = (c, r, m) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const glowM = c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: .2, roughness: .35, metalness: .25 });
  const steel = std(0x1b2e3e, .7, .4), silver = std(0x849aa5, .38, .7), glass = std(0x20414f, .26, .65);
  const warm = glowM(0xffc985), cyan = glowM(0x72dce8), white = glowM(0xc2f5ff), glows = [warm, cyan, white];
  const tower = new THREE.Group(); tower.name = 'harbour lighthouse'; tower.position.y = 2; tower.scale.setScalar(.72); hub.add(tower);
  const add = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); tower.add(o); return o; };
  const cyl = (rt, rb, h, m, y, seg = 24) => add(new THREE.CylinderGeometry(rt, rb, h, seg), m, 0, y, 0);
  const box = (w, h, d, m, x, y, z) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z);
  cyl(2.7, 3.9, 17, steel, 8.5, 16); cyl(3.6, 3.6, .6, silver, 17.3);                   // shaft and gallery
  cyl(2.2, 2.7, 5.7, glass, 20.3, 16);                                                      // lantern room
  for (let k = 0; k < 12; k++) { const a = k * TAU / 12;                                     // steel ribs, a warm light strip every third
    box(.14, 16, .14, silver, Math.cos(a) * 2.8, 8.7, Math.sin(a) * 2.8);
    if (k % 3 === 0) box(.065, 11, .065, warm, Math.cos(a) * 2.95, 9.5, Math.sin(a) * 2.95); }
  for (const y of [.6, 4.3, 12.3, 17.1, 18.4, 23]) {                                       // light bands
    const r = y > 17 ? 3.1 : 3.5, o = add(new THREE.RingGeometry(r - .06, r + .06, 96), y > 17 ? white : cyan, 0, y, 0); o.rotation.x = -Math.PI / 2; }
  cyl(0, 3.7, 2.3, silver, 24.4, 16); cyl(.08, .08, 3.5, warm, 26.5, 8);                   // roof and mast
  add(new THREE.SphereGeometry(.85, 16, 12), white, 0, 21.3, 0);                            // the lamp itself
  cyan.side = white.side = THREE.DoubleSide;
  const bins = new Map();                                                                    // one draw per material
  for (const o of [...tower.children]) { o.updateMatrix(); const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrix);
    g.deleteAttribute('uv'); if (!bins.has(o.material)) bins.set(o.material, []); bins.get(o.material).push(g); tower.remove(o); o.geometry.dispose(); }
  for (const [m, gs] of bins) { const o = new THREE.Mesh(mergeGeometries(gs, false), m); gs.forEach(g => g.dispose()); o.castShadow = o.receiveShadow = m !== white; tower.add(o); }
  const lamp = new THREE.PointLight(0xa0e8ff, 0, 45, 2); lamp.position.y = 17.5; hub.add(lamp);
  const sweep = new THREE.Group(); sweep.position.y = 17.4; hub.add(sweep);                  // two soft beams after dark
  const bGeo = new THREE.ConeGeometry(3.2, 64, 24, 1, true); bGeo.translate(0, -32, 0); bGeo.rotateZ(Math.PI / 2);
  const bMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { n: U.n },
    vertexShader: 'varying float vX; void main(){ vX=position.x; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float n; varying float vX; void main(){ float t=clamp(vX/64.,0.,.9999); gl_FragColor=vec4(.55,.84,1.,pow(1.-t,1.5)*.05*n); }' });
  for (const a of [0, Math.PI]) { const b = new THREE.Mesh(bGeo, bMat); b.rotation.y = a; b.renderOrder = 4; sweep.add(b); }
  for (const o of hub.children) if (o.isCSS2DObject) o.position.y = 25.5;                 // IDEAS IN MOTION sits above the new roof
  beacon.visible = false;
  if (beam) { const i = neonObjs.indexOf(beam); if (i >= 0) neonObjs.splice(i, 1); beam.visible = false; }  // the old sky beam is retired

  return {
    sea,
    update(dt, n) {
      frame++; U.time.value += dt; U.n.value = n;
      su.uEye.value.copy(camera.position); su.uSun.value.copy(sun.position);
      su.uSky.value.copy(SKY_DAY).lerp(SKY_NIGHT, n);
      glows.forEach(m => m.emissiveIntensity = .2 + n * 1.5); lamp.intensity = 12 + n * 68;
      sweep.visible = n > .02; if (!reduced) sweep.rotation.y = U.time.value * .11;
      // a slow computer keeps the water, drops the mirror
      if (mirrorOn && !window.__keepMirror) {
        if (fps.wait > 0) fps.wait -= dt;
        else { fps.t += dt; fps.n++; if (fps.t > 3) { if (fps.n / fps.t < 40) { mirrorOn = false; su.uReflect.value = 0; } fps.t = 0; fps.n = 0; } }
      }
    },
  };
}
