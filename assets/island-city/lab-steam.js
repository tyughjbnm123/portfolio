import * as THREE from 'three';

// Lab steam: procedural 3D noise ray-marched in a box over the left tank's roof hatch (lab-steam-trial-20261031,
// confirmed by the owner). On the island it runs on desktop at night only; island.html calls renderDepth()
// before its normal render (or bloom composer) so the plume stops at buildings in front of it.

const fragmentShader = /* glsl */`
precision highp float;
precision highp sampler3D;
uniform sampler3D uNoise;
uniform sampler2D uSceneDepth;
uniform vec2 uResolution;
uniform mat4 uInverseWorld;
uniform mat4 uInverseProjection;
uniform mat4 uCameraWorld;
uniform float uTime;
uniform float uDensity;
uniform vec3 uTint;
uniform float uNight;
uniform float uNear;
uniform float uFar;
uniform int uSteps;
varying vec3 vLocalCamera;
varying vec3 vLocalPosition;
const vec3 BOX_MIN=vec3(-3.5,0.,-3.5);
const vec3 BOX_MAX=vec3(4.5,9.,3.5);

float noise3(vec3 p){return texture(uNoise,p/8.).r;}
float densityAt(vec3 p){
  float h=p.y;
  if(h<=0. || h>=8.8)return 0.;
  // A brief pressure release rises through the plume instead of all pixels fading together.
  float age=mod(uTime-h/2.0+16.,8.);
  float pulse=smoothstep(0.,.28,age)*(1.-smoothstep(1.7,2.55,age));
  if(pulse<.001)return 0.;
  vec3 flow=p*1.13-vec3(.18,.98,.10)*uTime;
  vec3 warp=vec3(noise3(flow+vec3(1.3,4.2,2.1)),noise3(flow+vec3(6.1,1.2,3.4)),noise3(flow+vec3(2.4,5.1,6.2)))-.5;
  float spread=.13+h*.19;
  vec2 center=vec2(h*.105+sin(h*.85-uTime*.40)*h*.045,sin(h*.64-uTime*.32)*h*.045);
  vec2 radial=(p.xz-center)+warp.xz*(.08+h*.25);
  float dist=length(radial/vec2(spread,spread*.84));
  float shape=1.-smoothstep(.35,1.4,dist);
  float n=noise3(flow*1.1+warp*1.7);
  float detail=noise3(flow*2.9+vec3(3.1,2.,5.));
  float wisps=smoothstep(.27,.67,n*.80+detail*.20);
  float core=exp(-dist*dist*4.)*(1.-smoothstep(.4,1.9,h))*.24;
  float heightFade=smoothstep(0.,.17,h)*(1.-smoothstep(5.3,8.8,h));
  return (shape*wisps+core)*pulse*heightFade*exp(-h*.085)*uDensity;
}
void main(){
  vec3 direction=normalize(vLocalPosition-vLocalCamera);
  vec3 inv=1./direction;
  vec3 a=(BOX_MIN-vLocalCamera)*inv,b=(BOX_MAX-vLocalCamera)*inv;
  vec3 t0=min(a,b),t1=max(a,b);
  float start=max(max(t0.x,t0.y),max(t0.z,0.));
  float end=min(min(t1.x,t1.y),t1.z);
  // Stop at opaque scene depth, including buildings in front of the plume.
  vec2 screenUV=gl_FragCoord.xy/uResolution;
  float depth=texture2D(uSceneDepth,screenUV).x;
  if(depth<.999999){
    vec4 point=uInverseProjection*vec4(screenUV*2.-1.,depth*2.-1.,1.);
    point/=point.w;
    vec3 local=(uInverseWorld*uCameraWorld*point).xyz;
    end=min(end,dot(local-vLocalCamera,direction));
  }
  if(end<=start)discard;
  float stepSize=(end-start)/float(uSteps);
  float t=start+stepSize*.5;
  float transmittance=1.;vec3 sum=vec3(0.);
  vec3 lightDir=normalize(vec3(-.55,1.,.48));
  for(int i=0;i<80;i++){
    if(i>=uSteps || transmittance<.015)break;
    vec3 p=vLocalCamera+direction*t;
    float density=densityAt(p);
    if(density>.002){
      float shadow=exp(-densityAt(p+lightDir*.45)*.85-densityAt(p+lightDir*1.0)*.48);
      vec3 shade=uTint*(.54+.46*shadow);
      shade+=vec3(.015,.05,.06)*uNight*(1.-shadow);
      // Soften contact with solid geometry without glowing/additive smoke.
      density*=smoothstep(0.,.30,end-t);
      float opacity=1.-exp(-density*stepSize*1.28);
      sum+=transmittance*opacity*shade;
      transmittance*=1.-opacity;
    }
    t+=stepSize;
  }
  float alpha=1.-transmittance;
  if(alpha<.003)discard;
  gl_FragColor=vec4(sum/max(alpha,.0001),alpha);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export async function createLabSteam({renderer,scene,camera,parent,noiseURL,anchor=[-6.3,15.92,-2.5]}){
  if(!renderer.capabilities.isWebGL2)throw new Error('立體蒸氣試樣需要 WebGL 2。');
  const response=await fetch(noiseURL);if(!response.ok)throw new Error('蒸氣資料載入失敗');
  const bytes=new Uint8Array(await response.arrayBuffer());if(bytes.length!==64**3)throw new Error('蒸氣資料不完整');
  const noise=new THREE.Data3DTexture(bytes,64,64,64);
  noise.format=THREE.RedFormat;noise.type=THREE.UnsignedByteType;
  noise.minFilter=noise.magFilter=THREE.LinearFilter;
  noise.wrapS=noise.wrapT=noise.wrapR=THREE.RepeatWrapping;noise.unpackAlignment=1;noise.needsUpdate=true;
  const target=new THREE.WebGLRenderTarget(1,1,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
  target.depthTexture=new THREE.DepthTexture(1,1,THREE.UnsignedIntType);
  const uniforms={uNoise:{value:noise},uSceneDepth:{value:target.depthTexture},uResolution:{value:new THREE.Vector2(1,1)},
    uInverseWorld:{value:new THREE.Matrix4()},uInverseProjection:{value:new THREE.Matrix4()},uCameraWorld:{value:new THREE.Matrix4()},
    uTime:{value:0},uDensity:{value:1.4},uTint:{value:new THREE.Color(.90,.94,.95)},uNight:{value:0},
    uNear:{value:camera.near},uFar:{value:camera.far},uSteps:{value:64}};
  const material=new THREE.ShaderMaterial({uniforms,fragmentShader,
    vertexShader:/* glsl */`varying vec3 vLocalCamera;varying vec3 vLocalPosition;uniform mat4 uInverseWorld;
      void main(){vLocalCamera=(uInverseWorld*vec4(cameraPosition,1.)).xyz;vLocalPosition=position;
      gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    transparent:true,depthWrite:false,depthTest:false,side:THREE.BackSide});
  const geometry=new THREE.BoxGeometry(8,9,7);geometry.translate(.5,4.5,0);
  const volume=new THREE.Mesh(geometry,material);volume.name='lab_steam_trial_volume';volume.position.fromArray(anchor);volume.renderOrder=100;
  parent.add(volume);
  let enabled=true,disposed=false,depthPasses=0;
  const bufferSize=new THREE.Vector2();
  return {volume,uniforms,
    setTime(time){uniforms.uTime.value=time;},
    setEnabled(value){enabled=Boolean(value);volume.visible=enabled;},
    setNight(value){uniforms.uNight.value=value?1:0;uniforms.uTint.value.setRGB(...(value?[.57,.78,.81]:[.90,.94,.95]));},
    setDensity(value){uniforms.uDensity.value=THREE.MathUtils.clamp(value,.1,3);},
    setQuality(steps){uniforms.uSteps.value=steps===40?40:64;},
    render(){
      if(disposed)return;
      if(!enabled){renderer.setRenderTarget(null);renderer.render(scene,camera);return;}
      renderer.getDrawingBufferSize(bufferSize);
      if(target.width!==bufferSize.x||target.height!==bufferSize.y){target.setSize(bufferSize.x,bufferSize.y);uniforms.uResolution.value.copy(bufferSize);}
      scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
      uniforms.uInverseWorld.value.copy(volume.matrixWorld).invert();
      uniforms.uInverseProjection.value.copy(camera.projectionMatrixInverse);uniforms.uCameraWorld.value.copy(camera.matrixWorld);
      volume.visible=false;renderer.setRenderTarget(target);renderer.render(scene,camera);depthPasses++;
      volume.visible=true;renderer.setRenderTarget(null);renderer.render(scene,camera);
    },
    // depth of everything but the plume, at half resolution and without re-rendering shadow maps
    renderDepth(){
      if(disposed||!enabled)return;
      renderer.getDrawingBufferSize(bufferSize);
      const w=Math.max(1,bufferSize.x>>1),h=Math.max(1,bufferSize.y>>1);
      if(target.width!==w||target.height!==h)target.setSize(w,h);
      uniforms.uResolution.value.copy(bufferSize);
      camera.updateMatrixWorld(true);volume.updateMatrixWorld(true);
      uniforms.uInverseWorld.value.copy(volume.matrixWorld).invert();
      uniforms.uInverseProjection.value.copy(camera.projectionMatrixInverse);uniforms.uCameraWorld.value.copy(camera.matrixWorld);
      const prev=renderer.getRenderTarget(),auto=renderer.shadowMap.autoUpdate;renderer.shadowMap.autoUpdate=false;
      volume.visible=false;renderer.setRenderTarget(target);renderer.render(scene,camera);depthPasses++;
      volume.visible=true;renderer.setRenderTarget(prev);renderer.shadowMap.autoUpdate=auto;
    },
    metrics(){return {time:uniforms.uTime.value,enabled,steps:uniforms.uSteps.value,depthPasses,noiseBytes:bytes.length};},
    dispose(){if(disposed)return;disposed=true;volume.removeFromParent();geometry.dispose();material.dispose();noise.dispose();target.dispose();}
  };
}

// The exhaust nozzle from the confirmed preview, fitted to the left tank's roof hatch (model coordinates).
export function addLabNozzle(parent,anchor=[-6.3,15.92,-2.5]){
  const [x,,z]=anchor,g=new THREE.Group();g.name='lab_steam_nozzle';
  const metal=new THREE.MeshStandardMaterial({color:0x778a88,metalness:.6,roughness:.48});
  const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.25,.25,1.05,16,1,true),metal);pipe.position.set(x,15.395,z);g.add(pipe);
  for(const y of [14.92,15.84]){const c=new THREE.Mesh(new THREE.TorusGeometry(.265,.065,8,20),metal);c.rotation.x=Math.PI/2;c.position.set(x,y,z);g.add(c);}
  const o=new THREE.Mesh(new THREE.CircleGeometry(.2,16),new THREE.MeshBasicMaterial({color:0x0a171b}));o.rotation.x=-Math.PI/2;o.position.set(x,15.88,z);g.add(o);
  parent.add(g);return g;
}
