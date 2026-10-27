import * as THREE from 'three';

// Night grading for the private city preview (2026-10-27).
// The base island lerps its lights toward a near-black night; that left facades unreadable. This runs right after
// the base lerp each frame and lifts night to a moonlit, violet-blue ambience: dark enough for neon and windows to
// carry the scene, bright enough to see walls, streets and depth. Daytime (n = 0) is untouched.
const SKY=new THREE.Color(0x7d86d8),GROUND=new THREE.Color(0x30284a),MOON=new THREE.Color(0xa9c8ff);
const FOG=new THREE.Color(0x1c1638);
export function nightLook(n,{hemi,sun,scene}){
  if(n<=0.001)return;
  const k=THREE.MathUtils.smoothstep(n,0,1);
  hemi.color.lerp(SKY,k);hemi.groundColor.lerp(GROUND,k);hemi.intensity+=k*.22;     // ~.5 → ~1.1
  sun.color.lerp(MOON,k);sun.intensity+=k*.3;                                       // a cool key light from above
  if(scene.fog){scene.fog.color.lerp(FOG,k*.85);}                                     // distant layers fade to violet, not black
}
