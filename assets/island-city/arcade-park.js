import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {createDistrictLED,DISTRICT_TITLES} from './city-signage.js';

// Original procedural rides. No game extraction is needed for these moving mechanisms.
export function rideStateAt(seconds){
  return {wheel:seconds*Math.PI*2/105,ship:Math.sin(seconds*Math.PI*2/8.8)*.64,train:((seconds/24)%1+1)%1};
}

// faceView: the main overview camera (HOME in island.html)
export function createArcadePark({parent,pick,reduced=false,faceView=[0,134,183]}){
  const park=new THREE.Group();park.name='霓虹遊樂園';parent.add(park);
  const metal=new THREE.MeshStandardMaterial({color:0x263949,emissive:0x11242f,emissiveIntensity:.28,roughness:.47,metalness:.55});
  const silver=new THREE.MeshStandardMaterial({color:0x8496a2,roughness:.48,metalness:.6});
  const dark=new THREE.MeshStandardMaterial({color:0x111c2d,roughness:.65,metalness:.3});
  const plum=new THREE.MeshStandardMaterial({color:0x98466e,emissive:0x43122d,emissiveIntensity:.32,roughness:.42,metalness:.4});
  const cabinPaint=new THREE.MeshStandardMaterial({color:0x9aafbb,emissive:0x244656,emissiveIntensity:.32,roughness:.4,metalness:.4});
  const gold=new THREE.MeshStandardMaterial({color:0xc7a06c,roughness:.5,metalness:.45});
  const glass=new THREE.MeshStandardMaterial({color:0x193c56,emissive:0x235878,emissiveIntensity:.22,roughness:.22,metalness:.35});
  const glowing=[];
  const glow=(color,k=1)=>{const m=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.4,roughness:.35});glowing.push({m,k});return m;};
  const cyan=glow(0x37ddeb,.75),pink=glow(0xf459b3,.9),amber=glow(0xffc68c,.7);
  const mesh=(g,m,pos,into=park)=>{const o=new THREE.Mesh(g,m);if(pos)o.position.set(...pos);o.castShadow=o.receiveShadow=true;into.add(o);return o;};
  const box=(w,h,d,x,y,z,m,into=park)=>mesh(new THREE.BoxGeometry(w,h,d),m,[x,y,z],into);
  const rod=(a,b,r,m,into=park)=>{const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),delta=B.clone().sub(A);const o=mesh(new THREE.CylinderGeometry(r,r,delta.length(),6),m,null,into);o.position.copy(A.add(B).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;};
  const batch=group=>{
    const sets=new Map();for(const o of [...group.children])if(o.isMesh){o.updateMatrix();const g=o.geometry.clone().applyMatrix4(o.matrix);let entry=sets.get(o.material);if(!entry)sets.set(o.material,entry=[]);entry.push(g);group.remove(o);}
    for(const [material,geos] of sets){const geometry=mergeGeometries(geos,false);const o=mesh(geometry,material,null,group);o.name='Batched ride structure';geos.forEach(g=>g.dispose());}
  };
  const board=(title,subtitle,w,h,into,x,y,z)=>{
    const cv=document.createElement('canvas');cv.width=1024;cv.height=512;const ctx=cv.getContext('2d');
    ctx.fillStyle='#080e1b';ctx.fillRect(0,0,1024,512);ctx.strokeStyle='#f48eca';ctx.lineWidth=7;ctx.strokeRect(20,20,984,472);
    ctx.fillStyle='#63e5ed';ctx.fillRect(35,34,148,5);ctx.fillRect(841,473,148,5);
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='#e64cba';ctx.shadowBlur=22;ctx.fillStyle='#fff2fc';ctx.font='900 180px "Microsoft JhengHei",sans-serif';ctx.fillText(title,512,220,920);
    ctx.shadowBlur=0;ctx.fillStyle='#80dfe6';ctx.font='600 45px monospace';ctx.fillText(subtitle,512,385,870);
    ctx.fillStyle='rgba(0,0,0,.16)';for(let i=0;i<512;i+=5)ctx.fillRect(24,i,976,1);
    const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
    const material=new THREE.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:0xffffff,emissiveIntensity:.7,roughness:.35});glowing.push({m:material,k:.72});
    box(w+.3,h+.3,.36,x,y,z,dark,into);mesh(new THREE.PlaneGeometry(w,h),material,[x,y,z+.19],into);
  };

  // Giant wheel: a stationary axle and LED sign, rotating trusses, independently upright gondolas.
  const ferris=new THREE.Group();ferris.name='超大摩天輪';ferris.position.set(-1.6,16.2,-4.2);park.add(ferris);
  const wheelRadius=10.8,wheel=new THREE.Group();ferris.add(wheel);
  for(const z of [-.68,.68]){
    mesh(new THREE.TorusGeometry(wheelRadius,.13,6,112),silver,[0,0,z],wheel);
    mesh(new THREE.TorusGeometry(wheelRadius-.31,.065,5,112),z>0?pink:cyan,[0,0,z],wheel);
    mesh(new THREE.TorusGeometry(2.2,.11,6,48),metal,[0,0,z],wheel);
    for(let i=0;i<16;i++){const a=i*Math.PI/8;rod([Math.cos(a)*1.25,Math.sin(a)*1.25,z],[Math.cos(a)*wheelRadius,Math.sin(a)*wheelRadius,z],.065,silver,wheel);}
  }
  for(let i=0;i<48;i++){const a=i*Math.PI/24;rod([Math.cos(a)*10.78,Math.sin(a)*10.78,-.68],[Math.cos(a)*10.78,Math.sin(a)*10.78,.68],.075,metal,wheel);}
  batch(wheel);
  for(const z of [-1.6,1.6])for(const x of [-5.1,5.1]){
    rod([x,-13.85,z*1.3],[0,0,z],.23,metal,ferris);
    box(1.4,.45,1.4,x,-13.85,z*1.3,dark,ferris);
    rod([x,-13.4,z*1.3],[0,-.25,z],.045,z>0?cyan:pink,ferris);
  }
  rod([0,0,-2.1],[0,0,2.1],.64,silver,ferris);
  // The billboard is fixed to the axle, so the text stays upright while the wheel rotates.
  const districtSign=createDistrictLED({title:DISTRICT_TITLES.games[0],subtitle:DISTRICT_TITLES.games[1],color:'#f48eca'});
  districtSign.position.set(0,0,2.25);ferris.add(districtSign);
  const cabinShell=new THREE.Group();
  box(1.2,.32,1.04,0,-1.16,0,plum,cabinShell);box(1.32,.14,1.14,0,-.05,0,plum,cabinShell);
  for(const x of [-.54,.54])for(const z of [-.44,.44])box(.09,.94,.09,x,-.6,z,plum,cabinShell);
  batch(cabinShell);const shellGeo=cabinShell.children[0].geometry;
  const cabinTrim=new THREE.Group();box(1.29,.07,1.1,0,1.26,0,cyan,cabinTrim);box(1.1,.06,.98,0,0,0,cyan,cabinTrim);for(const x of [-.56,.56])box(.05,.98,.05,x,.63,.52,cyan,cabinTrim);batch(cabinTrim);
  const cabinCount=16,shells=new THREE.InstancedMesh(shellGeo,cabinPaint,cabinCount),windows=new THREE.InstancedMesh(new THREE.BoxGeometry(.99,.76,.82),glass,cabinCount),underlights=new THREE.InstancedMesh(cabinTrim.children[0].geometry,cyan,cabinCount);
  for(const o of [shells,windows,underlights]){o.instanceMatrix.setUsage(THREE.DynamicDrawUsage);o.castShadow=true;o.frustumCulled=false;ferris.add(o);}
  const personGeo=new THREE.SphereGeometry(.15,6,4),riders=new THREE.InstancedMesh(personGeo,gold,cabinCount);riders.frustumCulled=false;ferris.add(riders);
  box(5.8,.22,2.8,-1.6,2.2,-4.2,metal);

  // Compact coaster with a high bank and a low station return; the track is a closed 3D curve.
  const points=[[5.1,3.15,-1.9],[5.4,4.1,-4.1],[8.1,8.8,-5.4],[11.4,10.8,-3.2],[12.2,7.8,.2],[10.5,3.8,4.6],[7.1,2.9,6.5],[4.9,4.5,4.0],[4.6,5.3,1.0]].map(v=>new THREE.Vector3(...v));
  const curve=new THREE.CatmullRomCurve3(points,true,'centripetal');curve.arcLengthDivisions=1000;curve.updateArcLengths();const length=curve.getLength();
  const curveFrames=u=>{const p=curve.getPointAt(((u%1)+1)%1),t=curve.getTangentAt(((u%1)+1)%1).normalize();const side=new THREE.Vector3().crossVectors(t,new THREE.Vector3(0,1,0)).normalize();const up=new THREE.Vector3().crossVectors(side,t).normalize();return {p,t,side,up};};
  const rails=[[],[],[]];for(let i=0;i<320;i++){const f=curveFrames(i/320);rails[0].push(f.p.clone().addScaledVector(f.side,-.47));rails[1].push(f.p.clone().addScaledVector(f.side,.47));rails[2].push(f.p.clone().addScaledVector(f.up,-.3));}
  const track=new THREE.Group();track.name='雲霄飛車軌道';park.add(track);
  rails.forEach((r,i)=>mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(r,true),320,i===2?.16:.095,6,true),i===2?metal:cyan,null,track));
  for(let i=0;i<108;i++){const f=curveFrames(i/108);rod(f.p.clone().addScaledVector(f.side,-.64).toArray(),f.p.clone().addScaledVector(f.side,.64).toArray(),.055,silver,track);}
  for(let i=0;i<16;i++){const f=curveFrames(i/16);rod([f.p.x,2.2,f.p.z],[f.p.x,f.p.y-.33,f.p.z],.14,metal,track);box(.6,.22,.6,f.p.x,2.2,f.p.z,dark,track);if(i%2===0){const side=f.side.clone().multiplyScalar(.7);rod([f.p.x+side.x,2.2,f.p.z+side.z],[f.p.x,f.p.y-1,f.p.z],.08,silver,track);}}
  batch(track);
  const cars=[];
  for(let c=0;c<3;c++){
    const car=new THREE.Group();car.name='雲霄飛車車廂 '+(c+1);park.add(car);
    box(1.13,.3,1.28,0,.2,0,plum,car);box(1.22,.12,1.32,0,.03,0,metal,car);
    box(1.11,.65,.17,0,.56,-.52,plum,car);for(const x of [-.51,.51])box(.12,.49,1.13,x,.43,0,plum,car);
    for(const x of [-.25,.25]){box(.37,.15,.49,x,.44,0,dark,car);box(.34,.5,.12,x,.67,-.3,dark,car);rod([x-.16,.77,.18],[x+.16,.77,.18],.04,gold,car);mesh(new THREE.SphereGeometry(.15,7,5),gold,[x,1.04,-.06],car);box(.24,.27,.18,x,.8,-.06,metal,car);}
    box(.82,.075,.06,0,.32,.67,cyan,car);batch(car);cars.push(car);
  }
  box(3,.18,2.2,5.25,2.3,-1.4,metal);

  // Swinging pirate ship, balanced about the upper axle. The supporting frame stays still.
  const shipFrame=new THREE.Group();shipFrame.name='海盜船';shipFrame.position.set(-6,9.5,5.3);park.add(shipFrame);
  for(const z of [-1.6,1.6])for(const x of [-3.35,3.35]){rod([x,-7.2,z*1.5],[0,0,z],.2,metal,shipFrame);rod([x,-7.1,z*1.5],[0,-.3,z],.045,pink,shipFrame);box(1.0,.25,1.0,x,-7.2,z*1.5,dark,shipFrame);}
  rod([0,0,-1.9],[0,0,1.9],.3,silver,shipFrame);
  const pendulum=new THREE.Group();shipFrame.add(pendulum);
  for(const z of [-.78,.78])for(const x of [-2.6,2.6])rod([0,0,z],[x,-4.8,z],.07,gold,pendulum);
  const boat=new THREE.Group();boat.position.y=-4.85;pendulum.add(boat);
  const hull=new THREE.Shape();hull.moveTo(-3.5,.48);hull.lineTo(-2.95,-.7);hull.quadraticCurveTo(0,-1.22,2.95,-.7);hull.lineTo(3.5,.48);hull.lineTo(2.45,.17);hull.lineTo(-2.45,.17);hull.closePath();
  const hullGeo=new THREE.ExtrudeGeometry(hull,{depth:1.7,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.08,bevelThickness:.08,curveSegments:12});hullGeo.translate(0,0,-.85);mesh(hullGeo,plum,null,boat);
  box(5.2,.12,1.64,0,.2,0,gold,boat);
  for(let i=0;i<5;i++){const x=-1.9+i*.95;box(.42,.18,1.4,x,.4,0,dark,boat);box(.16,.42,1.4,x-.21,.66,0,dark,boat);rod([x+.1,.83,-.65],[x+.1,.83,.65],.045,silver,boat);}
  for(const z of [-.93,.93]){rod([-3.3,.5,z],[3.3,.5,z],.07,amber,boat);rod([-2.7,-.5,z],[2.7,-.5,z],.055,cyan,boat);}
  batch(boat);
  box(8.4,.22,5.7,-6,2.2,5.3,dark);

  const matrix=new THREE.Matrix4(),rot=new THREE.Matrix4();let time=0,lastNight=-1;
  const update=(dt,night,{paused=false}={})=>{
    if(!reduced&&!paused)time+=Math.max(0,Math.min(dt,.05));
    const s=rideStateAt(time);wheel.rotation.z=s.wheel;pendulum.rotation.z=s.ship;
    for(let i=0;i<cabinCount;i++){const a=i*Math.PI*2/cabinCount+s.wheel,x=Math.cos(a)*wheelRadius,y=Math.sin(a)*wheelRadius;matrix.makeTranslation(x,y,0);shells.setMatrixAt(i,matrix);matrix.makeTranslation(x,y-.6,0);windows.setMatrixAt(i,matrix);matrix.makeTranslation(x,y-1.34,0);underlights.setMatrixAt(i,matrix);matrix.makeTranslation(x,y-.44,.32);riders.setMatrixAt(i,matrix);}
    for(const o of [shells,windows,underlights,riders])o.instanceMatrix.needsUpdate=true;
    cars.forEach((car,i)=>{const f=curveFrames(s.train-i*1.43/length);car.position.copy(f.p).addScaledVector(f.up,.09);rot.makeBasis(f.side,f.up,f.t.clone().negate());car.quaternion.setFromRotationMatrix(rot);});
    if(Math.abs(lastNight-night)>.004){lastNight=night;glowing.forEach(({m,k})=>m.emissiveIntensity=.22+night*k*1.12);glass.emissiveIntensity=.15+night*.32;districtSign.userData.update(night);}
  };
  // Turn the whole ride layout about the island centre so the wheel — and its district LED — faces the main view
  // instead of being seen edge-on. The rides keep their relative layout; all of them stay inside the ring road.
  {const view=new THREE.Vector3(...faceView),w=new THREE.Vector3();parent.updateMatrixWorld(true);
   for(let k=0;k<3;k++){park.updateMatrixWorld(true);ferris.getWorldPosition(w);const d=parent.worldToLocal(view.clone()).sub(parent.worldToLocal(w.clone()));
     park.rotation.y+=Math.atan2(d.x,d.z)-(park.rotation.y+0);park.rotation.y=Math.atan2(d.x,d.z);}}
  update(0,0);park.traverse(o=>{if(o.isMesh)pick(o);});
  return {group:park,update,curveFrames,curveLength:length,
    portal(name,x,z,face){const g=new THREE.Group();g.position.set(x,2,z);g.rotation.y=face;parent.add(g);for(const sx of [-1.5,1.5])box(.12,2.6,.12,sx,1.3,0,metal,g);box(3.12,.1,.12,0,2.62,0,name==='排行榜遊戲'?cyan:pink,g);g.name='遊戲入口 / '+name;return g;}
  };
}
