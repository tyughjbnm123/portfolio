import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Soft cumulus clouds for the island (island.html, and through it island-pro.html).
// They replace the faceted clouds: puffs lit by the sun on top, cool blue-grey underneath, feathered at the edges.
// They ring the islands over the hills and open water and circle slowly, so they frame the view instead of
// sitting in front of it; one that drifts over the islands being looked at, or right in front of the lens, thins out.
export function createSoftClouds({ scene, clouds, sun, mobile, reduced }) {
  const cU = THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uSun: { value: new THREE.Vector3(1, 1, 0) }, uOp: { value: 1 }, uTarget: { value: new THREE.Vector2() } }]);
  cU.n = { value: 0 }; cU.dusk = { value: 0 }; cU.uSun = { value: sun.position };   // follows the sun as it moves
  const cMat = new THREE.ShaderMaterial({ uniforms: cU, transparent: true, depthWrite: false, fog: true,
    vertexShader: /* glsl */`
      attribute float aH; uniform vec2 uTarget; varying vec3 vN; varying vec3 vW; varying float vH; varying float vFade;
      #include <fog_pars_vertex>
      void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); vH=aH;
        // where the cloud sits over the ground as seen from the camera: over the islands you are looking at it thins out,
        // and so does one right in front of the lens
        vec3 c=modelMatrix[3].xyz, dir=c-cameraPosition; vec2 g=c.xz;
        if(dir.y<-.01) g=(cameraPosition+dir*(-cameraPosition.y/dir.y)).xz;
        vFade=smoothstep(88.,125.,length(g-uTarget))*smoothstep(40.,75.,length(dir));
        vec4 mvPosition=viewMatrix*w; gl_Position=projectionMatrix*mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 uSun; uniform float uOp, n, dusk; varying vec3 vN; varying vec3 vW; varying float vH; varying float vFade;
      #include <fog_pars_fragment>
      void main(){
        vec3 N=normalize(vN), V=normalize(cameraPosition-vW), L=normalize(uSun);
        float ndv=max(dot(N,V),0.);
        float wrap=dot(N,L)*.5+.5;                                   // soft, wrapped sunlight
        vec3 lit=vec3(1.,.99,.96), shade=vec3(.66,.74,.86);           // sunny tops, cool blue-grey undersides
        vec3 col=mix(shade, lit, smoothstep(.2,.95,wrap));
        col*=mix(.80,1.,smoothstep(0.,.75,vH));                        // flatter, darker base
        col+=vec3(1.,.96,.9)*pow(max(1.-ndv,1e-6),3.)*pow(max(dot(-V,L),1e-6),2.)*.5; // silver lining against the sun
        col=mix(col, col*vec3(1.,.72,.6)+vec3(.12,.03,.05), dusk);      // pink-gold at sunset
        col=mix(col, vec3(.30,.32,.44), n);                            // moonlit grey after dark
        float a=uOp*vFade*smoothstep(0.,.55,ndv);                            // feathered silhouette
        gl_FragColor=vec4(col,a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }` });
  const ball = new THREE.SphereGeometry(1, mobile ? 12 : 18, mobile ? 9 : 12);
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // the original faceted clouds are hidden; these ring the islands over the hills and open water and circle slowly,
  // so they frame the view instead of sitting in front of it
  clouds.forEach(c => c.o.visible = false);
  const ringG = new THREE.Group(); ringG.name = 'soft clouds'; scene.add(ringG);
  const COUNT = mobile ? 11 : 18;
  for (let i = 0; i < COUNT; i++) {
    const parts = [], len = 16 + rnd() * 14, puffs = 7 + Math.floor(rnd() * 5);
    const put = (x, y, z, r, sy = .82) => { const g = ball.clone(); g.scale(r, r * sy, r); g.translate(x, y, z);
      const pos = g.attributes.position, h = new Float32Array(pos.count); for (let k = 0; k < pos.count; k++) h[k] = THREE.MathUtils.clamp((pos.getY(k) + 1.5) / (len * .32), 0, 1);
      g.setAttribute('aH', new THREE.BufferAttribute(h, 1)); parts.push(g); };
    for (let k = 0; k < puffs; k++) { const t = k / (puffs - 1) - .5, r = 3.2 + (1 - Math.abs(t) * 1.6) * (2.6 + rnd() * 2);   // a flat-bottomed base row
      put(t * len, r * .35, (rnd() - .5) * 5, r); }
    for (let k = 0; k < 4 + Math.floor(rnd() * 4); k++) { const r = 2.4 + rnd() * 3;                                         // billowing tops
      put((rnd() - .5) * len * .6, 3 + rnd() * 4, (rnd() - .5) * 4, r, .92); }
    const m = new THREE.Mesh(mergeGeometries(parts, false), cMat); parts.forEach(g => g.dispose());
    const ang = (i + rnd() * .6) / COUNT * Math.PI * 2, rad = 98 + rnd() * 55;
    m.position.set(Math.cos(ang) * rad, 42 + rnd() * 26, Math.sin(ang) * rad);
    m.rotation.y = -ang + Math.PI / 2 + (rnd() - .5) * .8; m.scale.setScalar(.85 + rnd() * .45); m.renderOrder = 2; ringG.add(m);
  }

  return {
    u: cU, group: ringG,
    update(dt, n, target) {
      cU.n.value = n; cU.uTarget.value.set(target.x, target.z);
      cU.uOp.value = .95 * Math.pow(1 - n, 1.6);   // gone after dark (they read as grey blobs against the night sky)
      ringG.visible = cU.uOp.value > .01;
      if (!reduced) ringG.rotation.y += dt * .006;
    },
  };
}
