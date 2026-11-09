import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Island PRO look (island-pro.html only). Nothing here changes what can be clicked, walked, ridden or driven,
// and no model is replaced or rescaled: it is light, air, water and a camera lens laid over the same island.
//
//  · mirror sea: a stylised water shader with a live reflection, wave normals, sun glints, shallows
//    round every island and a darker, glassier surface after dark (phones: same shader, no mirror)
//  · sky: a soft blue zenith, a sun halo, drifting clouds; a golden-pink band at dusk; stars, a moon glow
//    and the odd shooting star at night
//  · dusk: switching day ↔ night now passes through a slow sunset — the sun drops, goes amber, the sky blushes
//  · air: pollen motes that catch the sun by day, fireflies by night; both swirl round the cursor
//  · lamp light cones after dark, a lantern that follows the cursor, a flock of birds by day
//  · lens: ambient occlusion (desktop), bloom, a tilt-shift miniature focus, colour grade, vignette, grain
//  · a frame-rate guard steps the extras down on slower machines
export function createProLook(ctx) {
  const { renderer, scene, camera, controls, sun, hemi, skyDome, water, lampMat, islands, state, mobile, reduced, canvas } = ctx;
  const lite = mobile;
  let quality = lite ? 1 : 2;              // 2 = everything, 1 = no AO / smaller mirror, 0 = no mirror
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  if (!lite) { sun.shadow.mapSize.set(4096, 4096); sun.shadow.map?.dispose(); sun.shadow.map = null; }
  const SUN0 = sun.position.clone();
  const U = { time: { value: 0 }, n: { value: 0 }, dusk: { value: 0 } };   // shared by every shader below
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

  /* ---------------- islands, for shallows and particles ---------------- */
  const centres = [{ x: 0, z: 0, r: 9.8 }];
  for (const k in islands) { islands[k].g.getWorldPosition(tmp); centres.push({ x: tmp.x, z: tmp.z, r: 23.6 }); }
  const SHORE = centres.slice(0, 8).map(c => new THREE.Vector3(c.x, c.z, c.r));
  while (SHORE.length < 8) SHORE.push(new THREE.Vector3(9999, 9999, 0));

  /* ---------------- sea ---------------- */
  const NOISE_GLSL = /* glsl */`
    vec2 h2(vec2 p){ p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))); return -1.+2.*fract(sin(p)*43758.5453); }
    float gn(vec2 p){ vec2 i=floor(p), f=fract(p), u=f*f*(3.-2.*f);
      return mix(mix(dot(h2(i),f),dot(h2(i+vec2(1,0)),f-vec2(1,0)),u.x), mix(dot(h2(i+vec2(0,1)),f-vec2(0,1)),dot(h2(i+vec2(1,1)),f-vec2(1,1)),u.x),u.y); }
    float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*gn(p); p=mat2(1.6,1.2,-1.2,1.6)*p; a*=.5; } return s; }`;
  const seaShader = {
    name: 'ProSea',
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      color: { value: new THREE.Color(0xffffff) }, tDiffuse: { value: null }, textureMatrix: { value: new THREE.Matrix4() },
      uReflect: { value: 1 }, uSun: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color() }, uEye: { value: new THREE.Vector3() },
      uSky: { value: new THREE.Color() }, uShore: { value: SHORE },
      time: U.time, n: U.n, dusk: U.dusk,
    }]),
    vertexShader: /* glsl */`
      uniform mat4 textureMatrix; varying vec4 vUvR; varying vec3 vW;
      #include <fog_pars_vertex>
      void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vUvR=textureMatrix*vec4(position,1.);
        vec4 mvPosition=viewMatrix*w; gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse; uniform float uReflect, time, n, dusk; uniform vec3 uSun, uSunCol, uEye, uSky; uniform vec3 uShore[8];
      varying vec4 vUvR; varying vec3 vW;
      #include <fog_pars_fragment>
      ${NOISE_GLSL}
      vec3 waveN(vec2 p){ float e=.18;
        float t=time*.35; vec2 q=p*.09;
        float h =fbm(q+vec2(t*.6,t*.25))+.5*fbm(q*2.3-vec2(t*.4,-t*.7));
        float hx=fbm(q+vec2(e,0)+vec2(t*.6,t*.25))+.5*fbm((q+vec2(e,0))*2.3-vec2(t*.4,-t*.7));
        float hz=fbm(q+vec2(0,e)+vec2(t*.6,t*.25))+.5*fbm((q+vec2(0,e))*2.3-vec2(t*.4,-t*.7));
        return normalize(vec3((h-hx)*1.15,1.,(h-hz)*1.15)); }
      void main(){
        vec3 N=waveN(vW.xz); vec3 V=normalize(uEye-vW); float dist=length(uEye-vW);
        // shallows: lighter, greener water hugging every island, with a slow shimmering edge
        float shallow=0.; float shoreLine=0.;
        for(int i=0;i<8;i++){ float d=length(vW.xz-uShore[i].xy)-uShore[i].z; shallow=max(shallow,1.-smoothstep(0.,14.,d));
          shoreLine=max(shoreLine,(1.-smoothstep(0.,1.6,abs(d-1.2-.6*sin(time*.9+d*.7))))*(1.-smoothstep(0.,6.,d))); }
        vec3 deepD=vec3(.09,.36,.44), shalD=vec3(.30,.70,.64);
        vec3 deepN=vec3(.010,.014,.045), shalN=vec3(.02,.05,.09);
        vec3 base=mix(mix(deepD,shalD,shallow), mix(deepN,shalN,shallow), n);
        base=mix(base, vec3(.36,.16,.20), dusk*.75);
        // reflection
        vec2 dist2=N.xz*(.012+6./max(dist,1.))*.55;
        vec3 refl=mix(base*1.15, uSky, .3);   // phones have no mirror: a soft sky tint over the water colour
        if(uReflect>.5) refl=texture2DProj(tDiffuse, vUvR+vec4(dist2*vUvR.w,0.,0.)).rgb;
        refl*=mix(vec3(1.),vec3(1.,.62,.48),dusk);
        float fres=.04+.96*pow(1.-max(dot(N,V),0.),5.);
        float rAmt=(mix(.07,.55,n)+fres*mix(.38,.45,n))*(1.-.45*dusk);
        vec3 col=mix(base, refl, clamp(rAmt,0.,.92));
        // sun / moon glint with sparkle
        vec3 H=normalize(normalize(uSun)+V); float spec=pow(max(dot(N,H),0.),mix(260.,120.,n));
        float sparkle=step(.986,fract(sin(dot(floor(vW.xz*3.),vec2(12.9898,78.233))+floor(time*6.))*43758.5453));
        col+=uSunCol*(spec*mix(2.2,.9,n)+sparkle*spec*6.);
        col+=vec3(1.)*shoreLine*mix(.25,.04,n)*(1.-dusk*.6);
        col=mix(col,col*vec3(.78,.52,.48),dusk*.55);
        gl_FragColor=vec4(col,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  };
  const seaGeo = new THREE.CircleGeometry(420, 96);
  let sea;
  if (!lite) {
    sea = new Reflector(seaGeo, { shader: seaShader, textureWidth: 1024, textureHeight: 1024, clipBias: .003, multisample: 2 });
    sea.material.fog = true;
  } else {
    sea = new THREE.Mesh(seaGeo, new THREE.ShaderMaterial({ ...seaShader, uniforms: THREE.UniformsUtils.clone(seaShader.uniforms), fog: true }));
    sea.material.uniforms.uReflect.value = 0;
  }
  // the material cloned its uniforms: point the shared ones back at the live values
  Object.assign(sea.material.uniforms, { time: U.time, n: U.n, dusk: U.dusk, uShore: { value: SHORE } });
  sea.rotation.x = -Math.PI / 2; sea.position.y = .02; sea.name = 'pro sea';
  scene.add(sea); water.visible = false;
  const seaU = sea.material.uniforms;
  // a mirror needs its own render each frame: allow switching it off when the frame rate drops
  const mirrorRender = sea.onBeforeRender;
  function setMirror(on) { if (lite) return; sea.onBeforeRender = on ? mirrorRender : () => {}; seaU.uReflect.value = on ? 1 : 0; }

  /* ---------------- sky ---------------- */
  const skyMat = skyDome.material;
  skyMat.uniforms.uSun = { value: new THREE.Vector3() };
  skyMat.uniforms.time = U.time; skyMat.uniforms.dusk = U.dusk;
  skyMat.fragmentShader = /* glsl */`
    uniform vec3 uDay,uHor,uTop,uSun; uniform float uN,time,dusk; varying vec3 vP;
    ${NOISE_GLSL}
    float star(vec3 d){ vec3 p=floor(d*260.); float h=fract(sin(dot(p,vec3(12.99,78.23,37.71)))*43758.55);
      float tw=.6+.4*sin(time*2.+h*40.); return step(.9965,h)*tw*smoothstep(.0,.25,d.y); }
    void main(){
      vec3 d=normalize(vP); float h=d.y;
      // day: pale horizon (matches the fog) to a soft blue zenith, a warm halo round the sun, slow clouds
      vec3 zen=vec3(.42,.62,.86);
      vec3 day=mix(uDay, zen, smoothstep(.02,.65,h));
      float sd=max(dot(d,normalize(uSun)),0.);
      day+=vec3(1.,.86,.62)*(pow(sd,12.)*.35+pow(sd,600.)*1.6);
      vec2 cuv=d.xz/max(h+.12,.06)*.9+vec2(time*.004,time*.0015);
      float cl=smoothstep(.08,.55,fbm(cuv*1.3)+.25*fbm(cuv*4.));
      vec3 cloudCol=mix(vec3(1.,.99,.97), vec3(1.,.72,.55), dusk);
      day=mix(day, cloudCol, cl*smoothstep(.03,.25,h)*.7);
      // dusk: a golden-pink band along the horizon, the zenith deepening
      vec3 duskSky=mix(vec3(1.,.55,.38), vec3(.36,.30,.62), smoothstep(-.02,.5,h));
      duskSky+=vec3(1.,.6,.3)*pow(sd,6.)*.8;
      day=mix(day, duskSky, dusk);
      // night: the original violet city glow, plus stars, a moon glow and a rare shooting star
      vec3 night=mix(uHor,uTop,smoothstep(-.02,.42,h)); night+=vec3(.25,.02,.3)*exp(-abs(h-.03)*28.)*.6;
      night+=vec3(.9,.95,1.)*star(d)*1.4;
      vec3 md=normalize(vec3(.45,.55,-.7)); float mg=max(dot(d,md),0.);
      night+=vec3(.55,.75,1.)*(pow(mg,40.)*.25+smoothstep(.9994,.9997,mg)*1.4);
      float ss=fract(time*.07); vec3 sp=normalize(vec3(-.8+1.6*ss,.55-.25*ss,-.6));
      night+=vec3(1.)*smoothstep(.9996,1.,dot(d,sp))*step(.82,fract(time*.07*.31))*2.;
      gl_FragColor=vec4(mix(day,night,uN),1.);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`;
  skyMat.needsUpdate = true;

  /* ---------------- air: pollen by day, fireflies by night ---------------- */
  const COUNT = lite ? 420 : 1400;
  const P = new Float32Array(COUNT * 3), S = new Float32Array(COUNT * 4);
  for (let i = 0; i < COUNT; i++) {
    const c = centres[i % centres.length], a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * (c.r + 4);
    P[i * 3] = c.x + Math.cos(a) * r; P[i * 3 + 1] = 2.6 + Math.pow(Math.random(), 1.6) * 9; P[i * 3 + 2] = c.z + Math.sin(a) * r;
    S[i * 4] = Math.random() * 100; S[i * 4 + 1] = .5 + Math.random(); S[i * 4 + 2] = Math.random(); S[i * 4 + 3] = Math.random();
  }
  const airGeo = new THREE.BufferGeometry();
  airGeo.setAttribute('position', new THREE.BufferAttribute(P, 3)); airGeo.setAttribute('seed', new THREE.BufferAttribute(S, 4));
  const airU = { uPtr: { value: new THREE.Vector3(0, -999, 0) }, uPtrOn: { value: 0 }, uPx: { value: renderer.getPixelRatio() }, time: U.time, n: U.n, dusk: U.dusk };
  const air = new THREE.Points(airGeo, new THREE.ShaderMaterial({
    uniforms: airU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec4 seed; uniform vec3 uPtr; uniform float uPtrOn, uPx, time, n; varying float vA; varying vec3 vC;
      void main(){
        float t=time*(.25+.25*seed.y)+seed.x;
        vec3 p=position+vec3(sin(t*1.3)*1.4+sin(t*.37)*2., sin(t*.9+seed.z*6.)*.7, cos(t*1.1)*1.4+cos(t*.29)*2.);
        // swirl round the cursor
        vec3 d=uPtr-p; float k=uPtrOn*exp(-dot(d.xz,d.xz)/36.);
        float ang=time*1.6+seed.x; p+=d*k*.55+vec3(cos(ang),.3*sin(ang*1.7),sin(ang))*k*2.2;
        vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
        float blink=mix(.55+.45*sin(t*3.+seed.w*20.), smoothstep(.2,1.,sin(t*2.+seed.w*30.)), n);
        float sz=mix(.9+seed.z*.8, 2.2+seed.z*1.8, n);
        gl_PointSize=sz*uPx*42./-mv.z*(1.+k*.6);
        vA=blink*mix(.45,1.,n)*(1.+k);
        vC=mix(vec3(1.,.95,.78), mix(vec3(1.,.82,.35), vec3(.55,1.,.6), step(.72,seed.w)), n);
      }`,
    fragmentShader: /* glsl */`
      varying float vA; varying vec3 vC;
      void main(){ vec2 q=gl_PointCoord-.5; float r=length(q); float a=smoothstep(.5,0.,r); a=a*a; gl_FragColor=vec4(vC*a*vA*1.6, 1.); }`,
  }));
  air.frustumCulled = false; air.name = 'pro air'; scene.add(air);

  /* ---------------- lamp light cones (after dark) ---------------- */
  const beamMat = new THREE.ShaderMaterial({
    uniforms: { n: U.n }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; varying float vF; void main(){ vUv=uv; vec4 w=modelMatrix*vec4(position,1.); vec3 Nw=normalize(mat3(modelMatrix)*normal);
      vF=abs(dot(Nw,normalize(cameraPosition-w.xyz))); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float n; varying vec2 vUv; varying float vF; void main(){ float a=pow(vUv.y,1.6)*pow(vF,1.5)*n*.32; gl_FragColor=vec4(vec3(1.,.82,.5)*a,1.); }`,
  });
  const beamGeo = new THREE.CylinderGeometry(.26, 1.7, 2.45, 20, 1, true); beamGeo.translate(0, -1.225, 0);
  const beams = [];
  scene.traverse(o => { if (o.isMesh && o.material === lampMat && o.geometry.type === 'SphereGeometry' && Math.abs(o.geometry.parameters.radius - .32) < .01) beams.push(o); });
  for (const o of beams) { const b = new THREE.Mesh(beamGeo, beamMat); b.position.copy(o.position); b.position.y -= .2; b.renderOrder = 3; b.name = 'lamp beam'; o.parent.add(b); }

  /* ---------------- cursor lantern (after dark) ---------------- */
  const lantern = new THREE.PointLight(0xffc98a, 0, 22, 1.6); lantern.position.set(0, -50, 0); scene.add(lantern);
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), -2);
  let ptrOn = 0, ptrWant = 0, dragging = false;
  const hit = new THREE.Vector3(), ptrPos = new THREE.Vector3(0, -999, 0);
  canvas.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); ptr.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    ray.setFromCamera(ptr, camera); ptrWant = ray.ray.intersectPlane(ground, hit) && e.pointerType === 'mouse' ? 1 : 0; });
  canvas.addEventListener('pointerleave', () => { ptrWant = 0; });
  canvas.addEventListener('pointerdown', () => { dragging = true; }); addEventListener('pointerup', () => { dragging = false; });

  /* ---------------- birds (by day) ---------------- */
  const BIRDS = lite ? 0 : 14;
  let birds = null;
  if (BIRDS) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, .25, -1, 0, -.15, 0, 0, -.1, 0, 0, .25, 0, 0, -.1, 1, 0, -.15], 3));
    g.setAttribute('wing', new THREE.Float32BufferAttribute([0, 1, 0, 0, 0, 1], 1));
    g.computeVertexNormals();
    birds = new THREE.InstancedMesh(g, new THREE.ShaderMaterial({
      uniforms: { time: U.time, n: U.n }, side: THREE.DoubleSide, transparent: true, depthWrite: false,
      vertexShader: `attribute float wing; uniform float time; varying float vF; void main(){ vec3 p=position; float ph=float(gl_InstanceID)*1.7;
        p.y+=wing*sin(time*9.+ph)*.55; vec4 mv=modelViewMatrix*instanceMatrix*vec4(p,1.); vF=1.; gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `uniform float n; void main(){ gl_FragColor=vec4(vec3(.16,.18,.22),(1.-n)*.85); }`,
    }), BIRDS);
    birds.frustumCulled = false; birds.name = 'pro birds'; scene.add(birds);
  }
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(1.4, 1.4, 1.4), _e = new THREE.Euler();

  /* ---------------- lens ---------------- */
  const W = () => innerWidth, H = () => innerHeight;
  const rt = new THREE.WebGLRenderTarget(W() * renderer.getPixelRatio(), H() * renderer.getPixelRatio(), { type: THREE.HalfFloatType, samples: lite ? 2 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(W(), H());
  composer.addPass(new RenderPass(scene, camera));
  let gtao = null;
  if (!lite) {
    gtao = new GTAOPass(scene, camera, W(), H());
    gtao.output = GTAOPass.OUTPUT.Default; gtao.blendIntensity = .85;
    gtao.updateGtaoMaterial({ radius: 1.6, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 12 });
    gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
    composer.addPass(gtao);
  }
  const bloom = new UnrealBloomPass(new THREE.Vector2(W(), H()), .2, .45, .86);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const lens = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uRes: { value: new THREE.Vector2() }, uFocus: { value: .5 }, uBlur: { value: 1 }, time: U.time, n: U.n, dusk: U.dusk },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: /* glsl */`
      uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uFocus, uBlur, time, n, dusk; varying vec2 vUv;
      vec3 grade(vec3 c){
        float l=dot(c,vec3(.2126,.7152,.0722));
        // split tone: cool teal shadows, warm highlights (violet / cyan at night), amber at dusk
        vec3 sh=mix(vec3(-.012,.004,.02), vec3(.01,-.004,.03), n), hi=mix(vec3(.03,.012,-.02), vec3(-.01,.015,.03), n);
        c+=sh*(1.-l)+hi*l; c+=vec3(.05,.015,-.03)*dusk*l;
        c=mix(vec3(l),c,1.2+.05*n);
        c=(c-.5)*1.07+.5;
        return c; }
      void main(){
        // tilt-shift: sharp across the band the camera looks at, softening above and below — the miniature look
        float d=abs(vUv.y-uFocus); float amt=smoothstep(.12,.5,d)*uBlur;
        vec3 c=texture2D(tDiffuse,vUv).rgb;
        if(amt>.01){ vec3 acc=c; float w=1.; vec2 px=1./uRes*amt*7.;
          for(int i=0;i<16;i++){ float a=float(i)*2.39996; float r=sqrt((float(i)+.5)/16.); vec2 o=vec2(cos(a),sin(a))*r*px;
            acc+=texture2D(tDiffuse,vUv+o).rgb; w+=1.; }
          c=acc/w; }
        c=grade(c);
        vec2 q=vUv-.5; c*=1.-dot(q,q)*mix(.55,.85,n);
        float g=fract(sin(dot(vUv*uRes+time*60.,vec2(12.9898,78.233)))*43758.5453); c+=(g-.5)*.018;
        gl_FragColor=vec4(clamp(c,0.,1.),1.);
      }`,
  });
  composer.addPass(lens);
  function resize() {
    const pr = renderer.getPixelRatio(); composer.setPixelRatio(pr); composer.setSize(W(), H());
    lens.uniforms.uRes.value.set(W() * pr, H() * pr); if (gtao) gtao.setSize(W(), H()); airU.uPx.value = pr;
  }
  resize(); addEventListener('resize', resize);

  /* ---------------- frame-rate guard ---------------- */
  const fps = { t: 0, n: 0, wait: 3 };
  function guard(raw) {
    if (reduced) return;
    if (fps.wait > 0) { fps.wait -= raw; return; }
    fps.t += raw; fps.n++;
    if (fps.t < 3) return;
    const f = fps.n / fps.t; fps.t = 0; fps.n = 0;
    if (f < 40 && quality > 0) {
      quality--; fps.wait = 2;
      if (quality === 1 && gtao) { gtao.enabled = false; }
      if (quality === 0) setMirror(false);
    }
  }
  if (window.__keepPro) guard.off = true;

  /* ---------------- per frame ---------------- */
  const SUN_DUSK = new THREE.Color(0xff7a3a), SKY_DUSK = new THREE.Color(0xc8705e), HEMI_DUSK = new THREE.Color(0xf6a98a);
  const proj = new THREE.Vector3();
  let last = performance.now();
  return {
    sea, composer,
    render(reading) {
      const now = performance.now(), raw = Math.min(.1, (now - last) / 1000); last = now;
      if (!reduced) U.time.value += raw;
      const n = state.nightT; U.n.value = n;
      const dusk = Math.pow(Math.sin(Math.PI * THREE.MathUtils.clamp(n, 0, 1)), .7); U.dusk.value = dusk;
      // the sun sinks, warms and swings west through the change of light
      tmp.copy(SUN0); tmp.y *= 1 - .72 * dusk; tmp.x -= 60 * dusk; sun.position.copy(tmp);
      sun.color.lerp(SUN_DUSK, dusk * .85); sun.intensity *= 1 - .25 * dusk;
      hemi.color.lerp(HEMI_DUSK, dusk * .5);
      scene.background.lerp(SKY_DUSK, dusk * .4); scene.fog.color.copy(scene.background);
      skyMat.uniforms.uSun.value.copy(sun.position).normalize();
      renderer.toneMappingExposure = 1.0 - .06 * n;
      // sea
      seaU.uSun.value.copy(sun.position).normalize(); seaU.uSunCol.value.copy(sun.color).multiplyScalar(n > .5 ? .6 : 1);
      seaU.uEye.value.copy(camera.position); seaU.uSky.value.copy(scene.background);
      // cursor: fireflies / pollen swirl, lantern after dark
      ptrOn += ((ptrWant && !dragging ? 1 : 0) - ptrOn) * Math.min(1, raw * 5);
      if (ptrWant) ptrPos.lerp(hit, Math.min(1, raw * 10));
      airU.uPtr.value.copy(ptrPos).setY(ptrPos.y + 2.6); airU.uPtrOn.value = ptrOn;
      lantern.position.copy(ptrPos).setY(5.5); lantern.intensity = ptrOn * n * 26;
      // birds: two loose flocks circling the islands by day
      if (birds) {
        birds.visible = n < .95;
        for (let i = 0; i < BIRDS; i++) {
          const f = i < BIRDS / 2 ? 0 : 1, t = U.time.value * (.05 + f * .02) + f * 2.6, k = i % 7;
          const r = 60 + f * 22 + Math.sin(k * 2.1) * 4, a = t + k * .045;
          tmp2.set(Math.cos(a) * r + Math.sin(k * 1.3) * 2.5, 34 + f * 8 + Math.sin(t * 3 + k) * 1.5 + k * .4, Math.sin(a) * r + Math.cos(k * 1.7) * 2.5);
          _e.set(0, -a, Math.sin(t * 2 + k) * .2); _q.setFromEuler(_e); _m.compose(tmp2, _q, _s); birds.setMatrixAt(i, _m);
        }
        birds.instanceMatrix.needsUpdate = true;
      }
      // lens: focus on what the camera looks at; the further out, the stronger the miniature effect
      proj.copy(controls.target).project(camera);
      lens.uniforms.uFocus.value = THREE.MathUtils.clamp(proj.y * .5 + .5, .25, .75);
      const far = camera.position.distanceTo(controls.target);
      lens.uniforms.uBlur.value = THREE.MathUtils.smoothstep(far, 40, 220) * (lite ? .7 : 1);
      bloom.strength = .16 + .42 * n + .12 * dusk; bloom.threshold = .86 - .3 * n; bloom.radius = .45;
      if (gtao) gtao.blendIntensity = .85 * (1 - .6 * n);
      if (!guard.off) guard(raw);
      if (reading) renderer.render(scene, camera); else composer.render();
    },
    resize,
  };
}
