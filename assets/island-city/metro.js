import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Deterministic five-stop loop. Quintic easing gives zero speed/acceleration at stations.
export function metroStateAt(seconds, count = 5, dwell = 3, travel = 14) {
  const period = dwell + travel, time = ((seconds % (period * count)) + period * count) % (period * count);
  const from = Math.floor(time / period), phase = time - from * period;
  const moving = phase >= dwell, u = moving ? Math.min(1, (phase - dwell) / travel) : 0;
  const progress = u * u * u * (u * (u * 6 - 15) + 10);
  return { from, to: (from + 1) % count, moving, progress, stop: moving ? null : from };
}

// Six persistent travellers swap places at each stop; nobody is cloned or reset between laps.
export function createPassengerSchedule(count = 5) {
  const waiting=Array.from({length:count},(_,i)=>i), sides=Array(count).fill(1);
  let rider=count, visit=-1, exchange=null;
  return { at(seconds) {
    const target=Math.floor(Math.max(0,seconds)/17);
    while(visit<target){
      if(exchange){waiting[exchange.stop]=exchange.outgoing;sides[exchange.stop]=exchange.outgoingSide;rider=exchange.incoming;}
      const stop=++visit%count;
      exchange={stop,incoming:waiting[stop],outgoing:rider,incomingSide:sides[stop],outgoingSide:-sides[stop]};
      waiting[stop]=null;
    }
    return {...exchange,waiting,sides,phase:Math.max(0,seconds)%17};
  }};
}

export function createMetro({ scene, islands, host, onStation, onOverview, pick, createPassenger, reduced = false }) {
  const radius = 75, trackY = 10.2, platformY=trackY+.66, keys = ['about', 'work', 'tools', 'lab', 'games'];
  const stops = keys.map((key, i) => ({ key, no: String(i + 1).padStart(2, '0'), name: islands[key].data.name,
    angle: Math.atan2(islands[key].pos.z, islands[key].pos.x), color: [0xe7a97c,0x73b9de,0xe0c06d,0x77c5b3,0xd588ae][i] }));
  const root = new THREE.Group(); root.name = 'five-island metro'; scene.add(root);
  const lit = [], colors = [];
  const metal = new THREE.MeshStandardMaterial({ color: 0x81918e, metalness: .55, roughness: .65 });
  const body = new THREE.MeshStandardMaterial({ color: 0xe2e7db, metalness: .32, roughness: .45 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x253b42, metalness: .45, roughness: .72 });
  const trackBed = new THREE.MeshStandardMaterial({ color: 0x59696c, metalness: .35, roughness: .65 });
  const sleeper = new THREE.MeshStandardMaterial({ color: 0x526569, metalness: .48, roughness: .78 });
  const glass = emissive(0x244f5a, 0x78d7df, .85);
  const carriageGlass=emissive(0x315865,0x8ae3ea,.3);carriageGlass.transparent=true;carriageGlass.opacity=.28;carriageGlass.depthWrite=false;
  const cyan = emissive(0x4f9f9d, 0x7ae2df, 1.1), warm = emissive(0xd5bb82, 0xffd58b, .9);
  const red = emissive(0xb15e56, 0xf08775, .65);
  const trackLight = emissive(0x5d9eaa, 0x62cde6, 1.6);
  colors.push({ m:metal, day:metal.color.clone(), night:new THREE.Color(0x52666c) }, { m:body, day:body.color.clone(), night:new THREE.Color(0xb8ccca) });
  function emissive(color, emission, power) {
    const m = new THREE.MeshStandardMaterial({ color, emissive: emission, emissiveIntensity: 0, metalness: .25, roughness: .4 });
    lit.push({m, power}); return m;
  }
  function mesh(geo, material, parent, x=0, y=0, z=0) {
    const o = new THREE.Mesh(geo,material); o.position.set(x,y,z); o.receiveShadow=true; parent.add(o); return o;
  }
  // Merge fixed scenery once, so pylons, sleepers and station details do not add a draw call each.
  function batch(parent) {
    const grouped = new Map();
    function add(geo, mat, local, x,y,z, ry=0) {
      const dummy=new THREE.Object3D(); dummy.position.set(x,y,z); dummy.rotation.y=ry; dummy.updateMatrix();
      if(local){local.updateMatrix(); dummy.matrix.premultiply(local.matrix);} geo.applyMatrix4(dummy.matrix);
      if(!grouped.has(mat))grouped.set(mat,[]); grouped.get(mat).push(geo);
    }
    return {
      box(w,h,d,x,y,z,mat=metal,ry=0,local=null){add(new THREE.BoxGeometry(w,h,d),mat,local,x,y+h/2,z,ry);},
      cylinder(r,h,x,y,z,mat=metal,local=null){add(new THREE.CylinderGeometry(r,r,h,6),mat,local,x,y+h/2,z);},
      finish(){for(const [mat,parts] of grouped){const geo=mergeGeometries(parts,false); parts.forEach(p=>p.dispose()); if(!geo)throw new Error('Metro geometry merge failed'); mesh(geo,mat,parent);}}
    };
  }
  const fixed=batch(root), segments=240;
  const deck=mesh(new THREE.RingGeometry(radius-1.6,radius+1.6,segments),trackBed,root,0,trackY,0); deck.rotation.x=-Math.PI/2;
  for(const r of [radius-1.6,radius+1.6])mesh(new THREE.CylinderGeometry(r,r,.42,segments,1,true),metal,root,0,trackY-.22,0);
  for(const r of [radius-.68,radius+.68]){const rail=mesh(new THREE.TorusGeometry(r,.065,5,segments),metal,root,0,trackY+.16,0);rail.rotation.x=-Math.PI/2;}
  const edge=mesh(new THREE.TorusGeometry(radius+1.61,.075,4,segments),trackLight,root,0,trackY-.04,0);edge.rotation.x=-Math.PI/2;
  for(let i=0;i<144;i++){
    const a=i*Math.PI*2/144; fixed.box(2.8,.1,.2,Math.cos(a)*radius,trackY+.01,Math.sin(a)*radius,sleeper,-a);
  }
  // Fifteen longer spans keep the waterfront open; station foundations remain in place.
  for(let i=0;i<15;i++){
    const a=(i+.5)*Math.PI*2/15, x=Math.cos(a)*radius,z=Math.sin(a)*radius;
    fixed.cylinder(.44,trackY+1,x,-1,z,metal); fixed.box(3.3,.6,.8,x,trackY-.9,z,metal,-a);
    fixed.cylinder(.7,.4,x,-.4,z,dark);
  }

  const panel=document.createElement('details'); panel.className='metro-panel';
  const summary=document.createElement('summary');
  summary.innerHTML='<span class="metro-mark" aria-hidden="true">M</span><span><b>環島線</b><small class="metro-status"></small></span><span class="metro-chevron" aria-hidden="true">⌃</span>';
  panel.append(summary);
  const nav=document.createElement('nav'); nav.setAttribute('aria-label','環島捷運車站'); panel.append(nav);
  const overview=document.createElement('button'); overview.type='button'; overview.className='metro-overview'; overview.textContent='查看環線全景 ↗';
  overview.addEventListener('click',()=>{panel.open=false; onOverview();}); panel.append(overview); host.append(panel);
  let manualPause=false;
  const pauseButton=document.createElement('button');pauseButton.type='button';pauseButton.className='metro-pause';pauseButton.textContent=reduced?'已依系統設定減少動態':'暫停列車';pauseButton.disabled=reduced;pauseButton.setAttribute('aria-pressed','false');panel.append(pauseButton);
  pauseButton.addEventListener('click',()=>{manualPause=!manualPause;pauseButton.textContent=manualPause?'繼續行駛':'暫停列車';pauseButton.setAttribute('aria-pressed',String(manualPause));});
  const status=summary.querySelector('.metro-status'), buttons=[], indicators=[], screenMaterials=[];
  let lastStatus='', lastFocus=undefined;

  stops.forEach((stop,i)=>{
    const g=new THREE.Group(); g.position.set(Math.cos(stop.angle)*72.65,0,Math.sin(stop.angle)*72.65);
    // x = radial, z = tangent; inward edge and access gangway face the associated island.
    g.rotation.y=-stop.angle; root.add(g);
    const tint=emissive(stop.color,stop.color,.65);
    fixed.box(2, .4, 16, 0,platformY-.4,0,body,0,g);
    fixed.box(.08,.03,15.5,.94,platformY+.02,0,warm,0,g);
    fixed.box(2.65,.2,16.2,-.3,platformY+3.1,0,metal,0,g);
    fixed.box(.07,.06,15.6,-1.58,platformY+3,0,tint,0,g);
    for(const z of [-6.6,-2.2,2.2,6.6]){
      fixed.box(.12,3.1,.12,-.9,platformY,z,metal,0,g);
      fixed.box(.08,.08,3.6,-.95,platformY+1,z,metal,0,g);
    }
    fixed.box(.2,1.35,3,-.95,platformY+1.1,-5.2,glass,0,g);
    fixed.box(.6,.1,2,-.55,platformY+.45,5.2,metal,0,g);
    // An offshore lift and short gangway meet the island beyond the drivable ring.
    fixed.box(4.3,.2,1.45,-3.1,2.05,0,metal,0,g);
    fixed.box(1.5,platformY-2,1.7,-1.9,2.1,0,dark,0,g);
    fixed.box(.06,7.6,1.2,-2.68,2.55,0,glass,0,g);
    fixed.box(.06,7.6,1.2,-1.12,2.55,0,glass,0,g);
    fixed.box(1.4,.15,2,-1.8,platformY-.15,0,body,0,g);
    for(const sign of [-1,1]){
      fixed.box(4.1,.07,.07,-3.15,3.05,sign*.69,metal,0,g);
      for(let x=-5.1;x<-1.1;x+=.8)fixed.box(.04,1,.04,x,2.15,sign*.69,metal,0,g);
    }
    fixed.cylinder(.3,12,-.4,-1,-6,metal,g); fixed.cylinder(.3,12,-.4,-1,6,metal,g);
    const indicator=mesh(new THREE.BoxGeometry(.1,.1,14),tint,g,.97,platformY+.08,0);indicators.push(indicator);
    const hit=mesh(new THREE.BoxGeometry(2.4,3.8,16.5),new THREE.MeshBasicMaterial({visible:false}),g,0,platformY+1.7,0);
    pick(hit,stop.key);
    const button=document.createElement('button');button.type='button';button.dataset.metroStation=stop.key;
    button.innerHTML='<span class="metro-number"></span><span></span>';button.firstChild.textContent=stop.no;button.lastChild.textContent=stop.name;
    button.style.setProperty('--station-color','#'+stop.color.toString(16).padStart(6,'0'));
    button.addEventListener('click',()=>{panel.open=false;onStation(stop.key);});nav.append(button);buttons.push(button);
    const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');
    ctx.fillStyle='#182c33';ctx.fillRect(0,0,512,128);ctx.fillStyle='#d9edda';ctx.font='700 55px "Microsoft JhengHei",sans-serif';ctx.textAlign='center';ctx.fillText(stop.name,256,78,490);
    const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;
    const signMat=new THREE.MeshStandardMaterial({map,emissiveMap:map,emissive:0xffffff,emissiveIntensity:0,side:THREE.DoubleSide});screenMaterials.push(signMat);
    const stationSign=mesh(new THREE.PlaneGeometry(5.4,1.35),signMat,g,-1.58,platformY+2.15,0);stationSign.rotation.y=-Math.PI/2;
  });
  fixed.finish();

  // Three short cars follow the curved rails separately; shared materials keep them inexpensive.
  const cars=[],doors=[];
  for(let i=0;i<3;i++){
    const g=new THREE.Group();g.name='metro car '+(i+1);root.add(g);const b=batch(g);
    // Hollow carriage: passengers are visible through real openings, with sliding doors at the centre.
    b.box(1.9,.12,4.1,0,.32,0,body);b.box(1.95,.12,4.1,0,1.92,0,metal);
    b.box(1.45,.2,3.8,0,.12,0,dark);
    for(const s of [-1,1]){
      for(const z of [-1.19,1.19]){b.box(.08,.56,1.66,s*.92,.44,z,body);b.box(.04,.08,1.66,s*.968,.61,z,cyan);}
      for(const z of [-1.99,-.36,.36,1.99])b.box(.09,1.48,.075,s*.92,.44,z,metal);
      for(const z of [-1.56,-.8,.8,1.56])b.box(.04,.68,.63,s*.964,1.05,z,carriageGlass);
      for(const z of [-1.3,1.3])b.box(.2,.2,.5,s*.65,.03,z,dark);
      const door=new THREE.Group();door.position.set(s*.97,1.1,0);g.add(door);doors.push(door);
      mesh(new THREE.BoxGeometry(.055,1.32,.65),body,door);
      mesh(new THREE.BoxGeometry(.06,.58,.48),carriageGlass,door,s*.005,.25,0);
    }
    for(const z of [-2.04,2.04]){b.box(1.9,.58,.06,0,.44,z,body);b.box(1.5,.66,.04,0,1.04,z,carriageGlass);}
    for(const s of [-1,1]){
      b.box(.22,.14,.06,s*.55,.7,2.08,i===0?warm:dark);
      b.box(.22,.14,.06,s*.55,.7,-2.08,i===2?red:dark);
    }
    b.finish();cars.push(g);
  }
  const passengers=createPassenger?Array.from({length:6},(_,i)=>createPassenger(root,i)):[];
  const schedule=createPassengerSchedule(), smooth=u=>{const x=THREE.MathUtils.clamp(u,0,1);return x*x*(3-2*x);};
  function point(a,r,tangent=0){return new THREE.Vector3(Math.cos(a)*r-Math.sin(a)*tangent,platformY,Math.sin(a)*r+Math.cos(a)*tangent);}
  function pose(id,position,heading,walking,dt){const p=passengers[id];p.root.position.copy(position);p.root.rotation.y=heading;p.animate(walking,dt);}
  function walk(id,path,u,dt){
    const t=smooth(u)*(path.length-1),segment=Math.min(path.length-2,Math.floor(t)),fraction=t-segment;
    const a=path[segment],b=path[segment+1];pose(id,a.clone().lerp(b,fraction),Math.atan2(b.x-a.x,b.z-a.z),u>0&&u<1,dt);
  }
  let elapsed=0, lastNight=-1;
  return {root, panel, stops, update(dt,n,{focus=null,paused=false}={}){
    const liveDt=!reduced&&!paused&&!manualPause?dt:0;elapsed+=liveDt;
    const state=metroStateAt(elapsed,stops.length), angle=stops[0].angle-(state.from+state.progress)*Math.PI*2/stops.length;
    cars.forEach((car,i)=>{const a=angle+(i-1)*4.75/radius;car.position.set(Math.cos(a)*radius,trackY+.22,Math.sin(a)*radius);car.rotation.y=Math.PI-a;});
    const phase=elapsed%17, doorOpen=state.moving?0:smooth(Math.min(phase/.2,(3-phase)/.2));doors.forEach(door=>door.position.z=-.78*doorOpen);
    if(passengers.length){
      const ex=schedule.at(elapsed), a=stops[ex.stop].angle, seat=point(a,radius-.15), threshold=point(a,72.7), queued=side=>point(a,72.45,side*2.7);
      ex.waiting.forEach((id,i)=>{if(id!==null)pose(id,point(stops[i].angle,72.45,ex.sides[i]*2.7),Math.PI/2-stops[i].angle,false,liveDt);});
      if(!state.moving){
        walk(ex.outgoing,[seat,threshold,queued(ex.outgoingSide)],(phase-.2)/1.15,liveDt);
        walk(ex.incoming,[queued(ex.incomingSide),threshold,seat],(phase-1.4)/1.3,liveDt);
      }else{
        pose(ex.outgoing,queued(ex.outgoingSide),Math.PI/2-a,false,liveDt);
        pose(ex.incoming,point(angle,radius-.15),Math.PI-angle,false,liveDt);
      }
    }
    if(Math.abs(n-lastNight)>.001){lastNight=n;lit.forEach(({m,power})=>m.emissiveIntensity=.08+n*power);colors.forEach(({m,day,night})=>m.color.copy(day).lerp(night,n));screenMaterials.forEach(m=>m.emissiveIntensity=.08+n*.7);}
    const activity=passengers.length?(phase<1.4?'・乘客下車':'・乘客上車'):'';
    const text=reduced?'減少動態：列車靜止':manualPause?'列車已暫停':state.moving?'前往 '+stops[state.to].no+' '+stops[state.to].name:'停靠 '+stops[state.from].no+' '+stops[state.from].name+activity;
    if(text!==lastStatus){lastStatus=text;status.textContent=text;panel.dataset.metroPhase=state.moving?'moving':'stopped';
      indicators.forEach((el,i)=>el.scale.z=state.stop===i?1:.25);
    }
    if(focus!==lastFocus){lastFocus=focus;buttons.forEach((el,i)=>{if(stops[i].key===focus)el.setAttribute('aria-current','location');else el.removeAttribute('aria-current');});}
  }};
}
