import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Original compact coupe, kept inside the existing driving collider (1.24 x 2.36).
// The car faces local -Z, exactly like the original steering and chase camera.
export function createCyberVehicle(parent){
  const shell=new THREE.Group();parent.add(shell);shell.name='霓虹街車';
  const paint=new THREE.MeshStandardMaterial({color:0x86a6a7,emissive:0x101d22,emissiveIntensity:.35,metalness:.62,roughness:.37});
  const dark=new THREE.MeshStandardMaterial({color:0x15202b,roughness:.58,metalness:.6});
  const glass=new THREE.MeshStandardMaterial({color:0x132e3c,emissive:0x204b60,emissiveIntensity:.45,roughness:.18,metalness:.7});
  const rubber=new THREE.MeshStandardMaterial({color:0x12151c,roughness:.86});
  const cyan=new THREE.MeshStandardMaterial({color:0x90eef6,emissive:0x58d7eb,emissiveIntensity:1.5});
  const red=new THREE.MeshStandardMaterial({color:0xff536b,emissive:0xff2648,emissiveIntensity:1.2});
  const metal=new THREE.MeshStandardMaterial({color:0x8b9ca5,metalness:.75,roughness:.38});
  const add=(geometry,material,x,y,z,into=shell)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;into.add(m);return m;};
  const box=(w,h,d,x,y,z,m)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z);
  // Side profile extrusion gives the bonnet and rear deck sloped silhouettes.
  function profile(points,width,material){const shape=new THREE.Shape();points.forEach(([z,y],i)=>i?shape.lineTo(z,y):shape.moveTo(z,y));shape.closePath();const g=new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelSize:.025,bevelThickness:.015,bevelSegments:1,steps:1});g.translate(0,0,-width/2);g.rotateY(-Math.PI/2);return add(g,material,0,0,0);}
  profile([[-1.1,.27],[-1.12,.43],[-.85,.58],[.68,.57],[1.1,.43],[1.1,.27]],1.06,paint);
  box(1.1,.14,2.21,0,.22,0,dark);
  profile([[-.61,.56],[-.29,.98],[.42,1.01],[.77,.57]],.84,glass);
  box(.87,.065,.75,0,1.015,.075,paint);
  for(const side of [-1,1]){
    box(.055,.43,.06,side*.44,.78,.2,paint);
    box(.065,.045,1.57,side*.553,.49,-.08,cyan);
    box(.075,.17,1.2,side*.55,.31,0,dark);
    box(.12,.08,.16,side*.56,.72,-.31,paint);
    box(.02,.04,.18,side*.457,.75,.28,metal);
  }
  for(let i=0;i<5;i++)box(.71,.018,.045,0,.586,.62+i*.075,dark);
  box(.92,.055,.055,0,.44,-1.13,cyan);box(.91,.06,.055,0,.43,1.13,red);
  box(.72,.09,.04,0,.29,-1.13,dark);for(const x of [-.38,.38])box(.14,.06,.07,x,.27,1.11,metal);
  box(.94,.035,1.7,0,.16,0,new THREE.MeshBasicMaterial({color:0x248fbb,transparent:true,opacity:.38}));
  const tires=[];
  for(const x of [-.51,.51])for(const z of [-.72,.72]){
    const axle=new THREE.Group();axle.position.set(x,.23,z);shell.add(axle);
    const tire=add(new THREE.CylinderGeometry(.23,.23,.17,16),rubber,0,0,0,axle);tire.rotation.z=Math.PI/2;
    const rim=add(new THREE.CylinderGeometry(.145,.145,.185,10),metal,0,0,0,axle);rim.rotation.z=Math.PI/2;
    const ring=add(new THREE.TorusGeometry(.155,.019,5,20),cyan,Math.sign(x)*.09,0,0,axle);ring.rotation.y=Math.PI/2;
    const spoke=add(new THREE.BoxGeometry(.193,.042,.28),dark,0,0,0,axle);tires.push({axle,z,spoke});
  }
  // Merge static panels by material; steering wheels stay separate.
  const batches=new Map();for(const m of [...shell.children])if(m.isMesh){m.updateMatrix();let g=m.geometry.clone().applyMatrix4(m.matrix);if(g.index){const indexed=g;g=g.toNonIndexed();indexed.dispose();}if(!batches.has(m.material))batches.set(m.material,[]);batches.get(m.material).push(g);shell.remove(m);m.geometry.dispose();}
  for(const [m,geos] of batches){const g=mergeGeometries(geos,false);add(g,m,0,0,0);geos.forEach(g=>g.dispose());}
  const light=new THREE.SpotLight(0xc9f2ff,0,22,.6,.5,1.2),target=new THREE.Object3D();light.position.set(0,.57,-1.08);target.position.set(0,0,-8);parent.add(light,target);light.target=target;parent.userData.hl=light;
  return {update(dt,speed,steer){tires.forEach(({axle,z,spoke})=>{if(z<0)axle.rotation.y=-steer*.3;spoke.rotation.x-=speed*dt/.23;});red.emissiveIntensity=speed<-.05?1.9:1.2;}};
}
