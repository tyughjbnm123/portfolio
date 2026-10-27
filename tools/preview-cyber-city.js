import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {CYBER_PART_NAMES,findCyberPart} from './cyber-city-parts.js';

const $=s=>document.querySelector(s), params=new URLSearchParams(location.search);
let isNight=params.get('mode')==='night', mode='district', selected='all', template,report;
const canvas=$('#canvas'), viewer=$('#viewer'), scene=new THREE.Scene();
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const camera=new THREE.OrthographicCamera(-8,8,7,-7,.1,100);
const controls=new OrbitControls(camera,canvas);controls.enableDamping=false;controls.maxPolarAngle=Math.PI*.47;controls.minDistance=2;controls.maxDistance=45;
const ambient=new THREE.HemisphereLight(0xcce4ff,0x7e7463,2.0);scene.add(ambient);
const key=new THREE.DirectionalLight(0xffe4b9,3.2);key.position.set(-5,15,9);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-12,right:12,top:14,bottom:-10,near:.1,far:50});key.shadow.bias=-.0002;key.shadow.normalBias=.018;scene.add(key);
const fill=new THREE.DirectionalLight(0x8fc5e6,1.4);fill.position.set(10,8,-9);scene.add(fill);
const groundMat=new THREE.MeshStandardMaterial({color:0xd8d8cf,roughness:.95});
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),groundMat);ground.rotation.x=-Math.PI/2;ground.position.y=-.07;ground.receiveShadow=true;scene.add(ground);
const grid=new THREE.GridHelper(32,32,0x879198,0xb4bab9);grid.position.y=-.064;grid.material.opacity=.20;grid.material.transparent=true;scene.add(grid);
let display=new THREE.Group();scene.add(display);

function render(){renderer.render(scene,camera);}
function resize(){const w=viewer.clientWidth,h=viewer.clientHeight;renderer.setSize(w,h,false);const aspect=w/h;camera.left=-7.2*aspect;camera.right=7.2*aspect;camera.top=7.2;camera.bottom=-7.2;camera.updateProjectionMatrix();render();}
new ResizeObserver(resize).observe(viewer);controls.addEventListener('change',render);

function clone(name,x=0,y=0,z=0,turn=0){const obj=findCyberPart(template,name).clone(true);obj.position.set(x,y,z);obj.rotation.y=turn;obj.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});display.add(obj);return obj;}
function stack(base,variants,roof,floors,x,z=0){clone(base,x,0,z);for(let i=1;i<floors;i++)clone(variants[(i-1)%variants.length],x,i,z);clone(roof,x,floors,z);}
function reset(){
  if(mode==='district'){camera.position.set(9,11.2,24);controls.target.set(1,4.4,0);camera.zoom=1.04;}
  else if(selected==='all'){camera.position.set(8,10,12);controls.target.set(0,.45,0);camera.zoom=1.5;}
  else{camera.position.set(2,1.6,2.5);controls.target.set(0,.45,0);camera.zoom=5.8;}
  camera.updateProjectionMatrix();controls.update();render();
}
function populate(){
  scene.remove(display);display=new THREE.Group();scene.add(display);
  if(mode==='district'){
    stack('tower_walls',['tower_walls.001','tower_walls.002','tower_walls.001','tower_walls.003'],'tower_roof',10,-4.7);
    stack('slim_walls',['slim_walls.001'],'slim_roof',7,-2.25,-.1);
    stack('midrise_walls',['midrise_walls.001'],'midrise_roof',4,.15,.1);
    clone('corner',2.4,0,.2);clone('terrace',4.5,0,-.1,Math.PI/2);clone('podium',7.05,0,0);
  }else if(selected!=='all')clone(selected);
  else CYBER_PART_NAMES.forEach((name,i)=>clone(name,(i%7-3)*1.6,0,(Math.floor(i/7)-.5)*2.8));
  $('#district').setAttribute('aria-pressed',String(mode==='district'));$('#parts').setAttribute('aria-pressed',String(mode==='parts'));
  $('#view-caption').innerHTML=mode==='district'?'10 層高塔 · 4 層中樓 · 7 層細塔<br>轉角店屋、連棟街屋與商場裙樓':selected==='all'?'14 個模組 · 原點皆在底面中心<br>拖曳檢查窗面、切角與屋頂細節':selected+'<br>尺寸與三角形數見下方規格表';
  applyLight();reset();
}
function applyLight(){
  document.body.classList.toggle('night',isNight);
  scene.background=new THREE.Color(isNight?0x14202e:0xe6e6df);
  ambient.intensity=isNight?1.7:2.0;ambient.color.setHex(isNight?0xb2cce9:0xcce4ff);ambient.groundColor.setHex(isNight?0x465264:0x7e7463);
  key.intensity=isNight?1.8:3.2;key.color.setHex(isNight?0xb4c8df:0xffe4b9);fill.intensity=isNight?1.15:1.4;
  groundMat.color.setHex(isNight?0x182735:0xd8d8cf);grid.material.opacity=isNight?.08:.20;
  if(template)template.traverse(o=>{if(o.isMesh)for(const m of (Array.isArray(o.material)?o.material:[o.material]))m.emissiveIntensity=isNight?1:0;});
  $('#day').setAttribute('aria-pressed',String(!isNight));$('#night').setAttribute('aria-pressed',String(isNight));
  $('#view-title').textContent=(mode==='district'?'模組城市':'零件檢視')+' / '+(isNight?'夜晚':'白天');
  $('#emission-label').textContent='EMISSION '+(isNight?'1.0':'0.0');render();
}
$('#day').onclick=()=>{isNight=false;applyLight();};$('#night').onclick=()=>{isNight=true;applyLight();};
$('#reset').onclick=reset;$('#district').onclick=()=>{mode='district';populate();};$('#parts').onclick=()=>{mode='parts';populate();};
$('#part').onchange=e=>{selected=e.target.value;mode='parts';populate();};

function assert(condition,message){if(!condition)throw Error(message);}
function verifyLoadedKit(root){
  const lines=[];let total=0;
  for(const item of report.parts){
    const p=findCyberPart(root,item.name),alias=findCyberPart(root,item.loaderName);
    assert(p===alias,'Name alias mismatch: '+item.name);
    assert(p.position.length()<1e-7,'Pivot translation: '+item.name);
    const bounds=new THREE.Box3().setFromObject(p),size=bounds.getSize(new THREE.Vector3());
    assert(size.toArray().every((v,i)=>Math.abs(v-item.dimensions[i])<1e-5),'Dimension mismatch: '+item.name);
    assert(Math.abs(bounds.min.y)<1e-5 && Math.abs(bounds.min.x+bounds.max.x)<1e-5 && Math.abs(bounds.min.z+bounds.max.z)<1e-5,'Bottom-centre pivot: '+item.name);
    let triangles=0;const materials=new Set();
    p.traverse(o=>{if(!o.isMesh)return;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;for(const m of (Array.isArray(o.material)?o.material:[o.material])){
      materials.add(m);assert(!m.transparent&&!m.normalMap,'Unsupported material: '+item.name);assert(m.emissiveMap,'Missing emissiveMap: '+item.name);assert(m.emissive.toArray().every(x=>Math.abs(x-1)<1e-6),'Incorrect emissiveFactor: '+item.name);
      for(const t of [m.map,m.emissiveMap])if(t)assert(t.image.width<=512&&t.image.height<=512,'Texture budget: '+item.name);
    }});
    assert(triangles===item.triangles,'Triangle mismatch: '+item.name);assert(triangles<(item.name==='tower_roof'?1000:600),'Triangle budget: '+item.name);assert(materials.size<=2,'Material budget: '+item.name);total+=triangles;
    lines.push('PASS '+item.name+' ⇄ '+item.loaderName+' · '+triangles+' tris');
  }
  // Boundary contact tests, all middle-floor pairings at every height 3..12.
  let seams=0;
  for(const names of [['tower_walls.001','tower_walls.002','tower_walls.003'],['midrise_walls.001'],['slim_walls.001']]){
    for(let height=3;height<=12;height++)for(const a of names)for(const b of names){
      const lower=findCyberPart(root,a).clone(),upper=findCyberPart(root,b).clone();lower.position.y=height-1;upper.position.y=height;
      const lo=new THREE.Box3().setFromObject(lower),hi=new THREE.Box3().setFromObject(upper);
      assert(Math.abs(lo.max.y-hi.min.y)<1e-5,'Stack gap: '+a+' '+b);assert(Math.abs(lo.min.x-hi.min.x)<1e-5&&Math.abs(lo.max.z-hi.max.z)<1e-5,'Stack outline mismatch');seams++;
    }
  }
  $('#test-log').textContent=['Three.js revision: '+THREE.REVISION,...lines,'PASS '+seams+' stack boundary tests (floors 3–12)','PASS opaque materials / embedded image sizes / bottom pivots'].join('\n');
  $('#status').textContent=`GLTFLoader r${THREE.REVISION} 驗證通過：14／14 節點、兩種名稱查找、${seams} 組堆疊接縫、材質與尺寸。`;
  return {revision:THREE.REVISION,parts:report.parts.length,stackTests:seams,totalTriangles:total};
}

try{
  const [gltf,meta]=await Promise.all([new GLTFLoader().loadAsync('../assets/island-city/cyber-city-original.glb'),fetch('../assets/island-city/cyber-city-original.report.json').then(r=>{if(!r.ok)throw Error('Missing generated model report');return r.json();})]);
  template=gltf.scene;report=meta;
  verifyLoadedKit(template);
  $('#size').textContent=(report.glbBytes/1024).toFixed(1)+' KB';$('#triangles').textContent=report.triangleTotal.toLocaleString();
  for(const part of report.parts){
    const opt=document.createElement('option');opt.value=part.name;opt.textContent=part.name;$('#part').append(opt);
    const tr=document.createElement('tr');for(const value of [part.name,part.triangles,part.dimensions.join(' × '),part.materials,part.litWindows+'/'+part.windows]){const td=document.createElement('td');td.textContent=value;tr.append(td);}$('#report').append(tr);
  }
  populate();resize();
}catch(error){$('#status').textContent='載入或檢查失敗';$('#error').textContent=error.message;console.error(error);}
