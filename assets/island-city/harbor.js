import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Harbour sea and lighthouse (after the user's "new harbour" concept), for the island page.
//  · sea: calm, clear water: clear shallows near land fading to deep teal, fine ripples, a soft blurred mirror on desktop.
//  · lighthouse: the hub beacon becomes a tall white lighthouse with a silver band and a glass lantern; after dark two soft beams sweep the water.
// Every pow() base in the shaders is kept strictly positive: pow(0.,y) is NaN on Direct3D GPUs (Windows, through ANGLE),
// and one NaN pixel is enough for the night bloom to turn the whole frame black.
export function createHarbor({ scene, camera, renderer, water, hub, beacon, beam, neonObjs, sun, mobile, reduced, maskSkip = () => [] }) {
  const U = { time: { value: 0 }, n: { value: 0 } };

  /* ---------------- sea ---------------- */
  // Calm, clear harbour water. Colour runs smoothly from clear shallows near land to deep teal in open water
  // (a top-down mask of everything above the waterline, rendered once, tells the shader where land is).
  // Fine ripples come from smooth procedural noise in the shader; desktop adds a soft, blurred mirror,
  // phones a sky tint. No foam or sparkle dots: the only highlight is a sun glint.
  const EXT = 112;                                                    // mask covers x,z in [-EXT, EXT]; the shore starts near r = 95
  const MR = mobile ? 512 : 1024;
  const maskRT = new THREE.WebGLRenderTarget(MR, MR, { depthBuffer: true });
  const maskCam = new THREE.OrthographicCamera(-EXT, EXT, EXT, -EXT, 0, 40.25);
  maskCam.position.set(0, 40, 0); maskCam.up.set(0, 0, -1); maskCam.lookAt(0, 0, 0); maskCam.updateMatrixWorld(true);
  const maskMat = new THREE.Matrix4().multiplyMatrices(maskCam.projectionMatrix, maskCam.matrixWorldInverse);
  const shader = {
    name: 'HarbourSea',
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      color: { value: new THREE.Color(0xffffff) }, tDiffuse: { value: null }, textureMatrix: { value: new THREE.Matrix4() },
      uReflect: { value: 1 }, tMask: { value: null }, uMaskMat: { value: new THREE.Matrix4() }, uTexel: { value: 2 / MR },
      uSun: { value: new THREE.Vector3() }, uEye: { value: new THREE.Vector3() }, uSky: { value: new THREE.Color() },
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
      uniform sampler2D tDiffuse, tMask; uniform mat4 uMaskMat; uniform float uReflect, uTexel, time, n; uniform vec3 uSun, uEye, uSky;
      varying vec4 vUvR; varying vec3 vW;
      #include <fog_pars_fragment>
      float land(vec2 uv){ return (uv.x<0.||uv.y<0.||uv.x>1.||uv.y>1.) ? 0. : texture2D(tMask,uv).r; }
      // ripple slope from smooth value noise (analytic gradient), so no texture has to be loaded
      float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      vec2 wn(vec2 p){ vec2 i=floor(p), f=fract(p), u=f*f*(3.-2.*f), du=6.*f*(1.-f);
        float a=h2(i), b=h2(i+vec2(1,0)), c=h2(i+vec2(0,1)), d=h2(i+vec2(1,1));
        return du*vec2((b-a)+(a-b-c+d)*u.y, (c-a)+(a-b-c+d)*u.x); }
      void main(){
        vec2 p=vW.xz; vec3 V=uEye-vW; float dist=length(V); V/=max(dist,1e-4);
        // ripples: two slow layers of the normal map, flattened with distance so far water stays calm
        vec2 sw=wn(p*.11+vec2(time*.045,time*.03))+wn(p*.19-vec2(time*.03,-time*.05))*.6;   // slow broad swell you can watch roll
        vec2 r=sw*.45+wn(p*.42+vec2(time*.12,time*.07))*.5+wn(p*1.1-vec2(time*.09,-time*.13))*.3+wn(p*2.6+vec2(-time*.2,time*.15))*.15;
        float calm=mix(.26,.06,clamp(dist/260.,0.,1.));
        vec3 N=normalize(vec3(r.x*calm,1.,r.y*calm));
        // how close the land is: a wide soft blur of the mask (no hard edges, so no rings)
        vec2 uv=(uMaskMat*vec4(vW,1.)).xy*.5+.5; float near=0., mid=0.;
        for(int i=0;i<8;i++){ float a=float(i)*.785398+.39; vec2 d=vec2(cos(a),sin(a))*uTexel;
          near+=land(uv+d*5.)+land(uv+d*9.); mid+=land(uv+d*16.)+land(uv+d*26.); }
        float shallow=clamp((near/16.)*.9+(mid/16.)*1.3,0.,1.);
        shallow=smoothstep(0.,.85,shallow);
        vec3 deep=mix(vec3(.018,.130,.165),vec3(.004,.016,.030),n);
        vec3 shal=mix(vec3(.105,.380,.385),vec3(.010,.045,.062),n);
        vec3 body=mix(deep,shal,shallow);
        // reflection: soft blurred mirror on desktop, sky tint elsewhere; stronger at grazing angles
        vec3 refl=uSky;
        if(uReflect>.5){ vec4 q=vUvR; vec2 o=N.xz*.055*q.w; float b=.006*q.w; refl=vec3(0.);
          refl+=texture2DProj(tDiffuse,q+vec4(o,0.,0.)).rgb*.28;
          refl+=texture2DProj(tDiffuse,q+vec4(o+vec2( b, b),0.,0.)).rgb*.18;
          refl+=texture2DProj(tDiffuse,q+vec4(o+vec2(-b, b),0.,0.)).rgb*.18;
          refl+=texture2DProj(tDiffuse,q+vec4(o+vec2( b,-b),0.,0.)).rgb*.18;
          refl+=texture2DProj(tDiffuse,q+vec4(o+vec2(-b,-b),0.,0.)).rgb*.18;
          refl=mix(refl,uSky,.25); }
        float fres=.04+.96*pow(max(1.-max(dot(N,V),0.),1e-4),5.);
        vec3 col=mix(body,refl,clamp(fres*1.6+mix(.10,.30,n),0.,.85));
        // one sun glint, no scattered sparkles
        vec3 L=uSun*inversesqrt(max(dot(uSun,uSun),1e-8)), H=normalize(L+V);
        // ripples catch the light even seen from above: faces tilted to the sun a touch brighter, away a touch darker
        float lit=clamp(dot(r,normalize(L.xz+vec2(1e-4))),-1.2,1.2)*(1.-clamp(dist/340.,0.,1.));
        col*=1.+lit*mix(.13,.08,n);
        col+=mix(vec3(1.,.95,.84),vec3(.50,.70,1.),n)*pow(max(dot(N,H),1e-4),400.)*mix(1.2,.3,n);
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
  const su = sea.material.uniforms; su.time = U.time; su.n = U.n; su.uMaskMat.value = maskMat; su.tMask.value = maskRT.texture;
  sea.rotation.x = -Math.PI / 2; sea.position.y = .02; sea.name = 'harbour sea';
  scene.add(sea); water.visible = false;

  // the mirror is a second render of the scene: once a frame at most, every other frame while the camera is still
  let mirrorOn = mirror; const lastPos = new THREE.Vector3(1e9, 0, 0), lastQ = new THREE.Quaternion();
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
  // the land mask: everything between y = -0.25 and y = 40 seen from straight above, drawn white
  const white1 = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  function drawMask() {
    const prev = { o: scene.overrideMaterial, bg: scene.background, fog: scene.fog, rt: renderer.getRenderTarget(), au: renderer.shadowMap.autoUpdate, cc: renderer.getClearColor(new THREE.Color()), ca: renderer.getClearAlpha() };
    const skip = maskSkip().filter(o => o && o.visible); skip.forEach(o => o.visible = false);
    sea.visible = false; scene.overrideMaterial = white1; scene.background = null; scene.fog = null; renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(maskRT); renderer.setClearColor(0x000000, 1); renderer.clear(); renderer.render(scene, maskCam);
    renderer.setRenderTarget(prev.rt); renderer.setClearColor(prev.cc, prev.ca);
    scene.overrideMaterial = prev.o; scene.background = prev.bg; scene.fog = prev.fog; renderer.shadowMap.autoUpdate = prev.au; sea.visible = true; skip.forEach(o => o.visible = true);
  }
  let frame = 0; const maskAt = [2, 240];                                   // once the scene is built, and again after late-loading pieces
  const SKY_DAY = new THREE.Color(0xb4d8dc), SKY_NIGHT = new THREE.Color(0x0d1830);
  /* ---------------- lighthouse ---------------- */
  const TAU = Math.PI * 2;
  const std = (c, r, m) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const glowM = c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: .2, roughness: .35, metalness: .25 });
  // a tall white tower: stepped stone plinth, tapered shaft with one wide silver band, white gallery and dome
  const stone = std(0xe4ded2, .85, 0), chalk = std(0xf6f4ee, .5, 0), band = std(0xaab6bd, .26, .45), glass = std(0x20414f, .26, .65), slit = std(0x2a3b46, .4, .3);
  const warm = glowM(0xffc985), cyan = glowM(0x72dce8), white = glowM(0xc2f5ff), glows = [warm, cyan, white];
  const tower = new THREE.Group(); tower.name = 'harbour lighthouse'; tower.position.y = 2; hub.add(tower);
  const add = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); tower.add(o); return o; };
  const cyl = (rt, rb, h, m, y, seg = 32) => add(new THREE.CylinderGeometry(rt, rb, h, seg), m, 0, y, 0);
  const box = (w, h, d, m, x, y, z) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z);
  const ring = (r, m, y, w = .06) => { const o = add(new THREE.RingGeometry(r - w, r + w, 96), m, 0, y, 0); o.rotation.x = -Math.PI / 2; };
  const S = .95, LAMP = 24.2, TOP = 30;                                   // scale, lamp height and top in tower units
  const rAt = y => 2.45 - (y - 1.8) * .0434;                                // shaft radius at a height
  cyl(2.85, 3.0, .3, stone, .15); cyl(2.6, 2.7, 1.5, stone, 1.05); ring(2.72, warm, 1.82, .04);   // low plinth, inside the original footprint so people still walk round it
  cyl(1.6, 2.45, 19.6, chalk, 11.6);                                       // tapered shaft
  cyl(rAt(12.6) + .06, rAt(10.6) + .06, 2, band, 11.6);                    // the wide silver band, with a crisp lip top and bottom
  for (const y of [10.55, 12.65]) cyl(rAt(y) + .11, rAt(y) + .11, .14, band, y);
  for (let k = 0; k < 9; k++) { const a = k * 2.1, y = 4 + k * 1.8, r = rAt(y) - .05; if (y > 9.9 && y < 13.3) continue;   // windows spiralling up, none on the band
    const w = box(.3, .7, .16, slit, Math.cos(a) * r, y, Math.sin(a) * r); w.rotation.y = -a + Math.PI / 2; }
  cyl(2.5, 2.05, .7, chalk, 21.6); ring(2.5, white, 22.05, .05);            // gallery with a glowing rail
  for (let k = 0; k < 16; k++) { const a = k * TAU / 16; box(.07, .9, .07, chalk, Math.cos(a) * 2.38, 22.4, Math.sin(a) * 2.38); }
  cyl(1.3, 1.3, 4.2, glass, LAMP, 16);                                   // lantern room
  for (let k = 0; k < 8; k++) { const a = k * TAU / 8; box(.12, 4.2, .12, chalk, Math.cos(a) * 1.34, LAMP, Math.sin(a) * 1.34); }
  cyl(1.55, 1.55, .35, chalk, 26.4, 24);
  add(new THREE.SphereGeometry(1.5, 24, 12, 0, TAU, 0, Math.PI / 2), chalk, 0, 26.55, 0);   // dome
  add(new THREE.SphereGeometry(.26, 12, 8), chalk, 0, 28.15, 0); cyl(.05, .05, 1.4, warm, 28.9, 8);
  tower.scale.setScalar(S);
  add(new THREE.SphereGeometry(.55, 16, 12), white, 0, LAMP, 0);            // the lamp itself
  cyan.side = white.side = THREE.DoubleSide;
  const bins = new Map();                                                                    // one draw per material
  for (const o of [...tower.children]) { o.updateMatrix(); const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrix);
    g.deleteAttribute('uv'); if (!bins.has(o.material)) bins.set(o.material, []); bins.get(o.material).push(g); tower.remove(o); o.geometry.dispose(); }
  for (const [m, gs] of bins) { const o = new THREE.Mesh(mergeGeometries(gs, false), m); gs.forEach(g => g.dispose()); o.castShadow = o.receiveShadow = m !== white; tower.add(o); }
  const lamp = new THREE.PointLight(0xa0e8ff, 0, 45, 2); lamp.position.y = 2 + LAMP * S; hub.add(lamp);
  const sweep = new THREE.Group(); sweep.position.y = 2 + LAMP * S; hub.add(sweep);                  // two soft beams after dark
  const bGeo = new THREE.ConeGeometry(3.2, 64, 24, 1, true); bGeo.translate(0, -32, 0); bGeo.rotateZ(Math.PI / 2);
  const bMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { n: U.n },
    vertexShader: 'varying float vX; void main(){ vX=position.x; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float n; varying float vX; void main(){ float t=clamp(vX/64.,0.,.9999); gl_FragColor=vec4(.55,.84,1.,pow(1.-t,1.5)*.05*n); }' });
  for (const a of [0, Math.PI]) { const b = new THREE.Mesh(bGeo, bMat); b.rotation.y = a; b.renderOrder = 4; sweep.add(b); }
  for (const o of hub.children) if (o.isCSS2DObject) o.position.y = 2 + TOP * S;                 // IDEAS IN MOTION sits above the new roof
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
      if (frame === maskAt[0] || frame === maskAt[1]) drawMask();
      // a slow computer keeps the water, drops the mirror
      if (mirrorOn && !window.__keepMirror) {
        if (fps.wait > 0) fps.wait -= dt;
        else { fps.t += dt; fps.n++; if (fps.t > 3) { if (fps.n / fps.t < 40) { mirrorOn = false; su.uReflect.value = 0; } fps.t = 0; fps.n = 0; } }
      }
    },
  };
}
